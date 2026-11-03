-- AniVerse — Brick 9: USDC payments on Base, verified on-chain.
--
-- How it works
--   1. A user starts a checkout: create_crypto_order() gives the order a
--      UNIQUE amount (e.g. 10.004213 USDC) so the payment identifies itself.
--   2. The server watches the receiving wallet on Base. For every USDC
--      transfer it finds, it calls confirm_crypto_payment() (service role only).
--   3. That function records the transfer once (no double counting), matches
--      it to the order with the same amount, marks it paid and adds credits
--      through grant_credits() — all in one transaction.
--   Transfers that match no order are kept as "unmatched" for an admin.

-- ---------------------------------------------------------------------
-- Settings (one row). Change the wallet / network here, never in code.
-- ---------------------------------------------------------------------
create table public.payment_settings (
  id               boolean primary key default true check (id),
  chain            text not null check (chain in ('base', 'base-sepolia')),
  chain_id         integer not null,
  token_symbol     text not null default 'USDC',
  token_address    text not null check (token_address ~ '^0x[0-9a-f]{40}$'),
  token_decimals   integer not null default 6,
  receive_address  text not null check (receive_address ~ '^0x[0-9a-f]{40}$'),
  order_minutes    integer not null default 60 check (order_minutes between 10 and 1440),
  confirmations    integer not null default 5 check (confirmations between 1 and 100),
  enabled          boolean not null default true,
  updated_at       timestamptz not null default now()
);

insert into public.payment_settings (chain, chain_id, token_address, receive_address)
values (
  'base',
  8453,
  lower('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),  -- native USDC on Base
  lower('0x14A15A119f2bec1f09cC6261050dEd87Db3DDD38')   -- AniVerse receiving wallet
);

alter table public.payment_settings enable row level security;
create policy "payment settings: readable by signed-in users"
  on public.payment_settings for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Admins (add yourself with the SQL in docs/SETUP.md)
-- ---------------------------------------------------------------------
create table public.app_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.app_admins enable row level security;
create policy "admins: see own admin row" on public.app_admins for select to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------
create table public.crypto_orders (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  pack_id          text not null references public.credit_packs (id),
  credits          integer not null check (credits > 0),
  price_usd_cents  integer not null check (price_usd_cents > 0),
  chain            text not null,
  chain_id         integer not null,
  token_symbol     text not null,
  token_address    text not null,
  token_decimals   integer not null,
  receive_address  text not null,
  amount_units     bigint not null check (amount_units > 0),
  status           text not null default 'pending'
                     check (status in ('pending', 'paid', 'expired', 'cancelled')),
  tx_hash          text,
  from_address     text,
  paid_units       bigint,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  paid_at          timestamptz
);

-- No two open orders can share an amount on the same token.
create unique index crypto_orders_open_amount_uidx
  on public.crypto_orders (chain, token_address, amount_units)
  where status = 'pending';
create index crypto_orders_owner_idx on public.crypto_orders (owner_id, created_at desc);
create index crypto_orders_match_idx on public.crypto_orders (chain, token_address, amount_units, status);

alter table public.crypto_orders enable row level security;
create policy "crypto orders: read own" on public.crypto_orders for select to authenticated
  using (owner_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: only the functions below write orders.

-- ---------------------------------------------------------------------
-- Every USDC transfer seen to the receiving wallet (recorded once)
-- ---------------------------------------------------------------------
create table public.crypto_payments (
  id             uuid primary key default gen_random_uuid(),
  chain          text not null,
  tx_hash        text not null check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  log_index      integer not null check (log_index >= 0),
  block_number   bigint not null,
  from_address   text not null,
  to_address     text not null,
  token_address  text not null,
  units          bigint not null check (units > 0),
  order_id       uuid references public.crypto_orders (id),
  status         text not null check (status in ('credited', 'unmatched', 'resolved')),
  note           text,
  created_at     timestamptz not null default now(),
  unique (chain, tx_hash, log_index)
);

alter table public.crypto_payments enable row level security;
create policy "crypto payments: admins read" on public.crypto_payments for select to authenticated
  using (public.is_admin());

-- Watcher progress (last fully scanned block per chain).
create table public.crypto_scan_state (
  chain       text primary key,
  last_block  bigint not null,
  updated_at  timestamptz not null default now()
);
alter table public.crypto_scan_state enable row level security;

-- ---------------------------------------------------------------------
-- create_crypto_order: called by the signed-in user
-- ---------------------------------------------------------------------
create or replace function public.create_crypto_order(p_pack_id text)
returns public.crypto_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pack public.credit_packs;
  v_set public.payment_settings;
  v_order public.crypto_orders;
  v_base bigint;
  v_try integer := 0;
  v_open integer;
begin
  if v_user is null then raise exception 'not_signed_in'; end if;

  select * into v_set from public.payment_settings where id;
  if v_set.id is null or not v_set.enabled then raise exception 'payments_disabled'; end if;

  select * into v_pack from public.credit_packs where id = p_pack_id and active;
  if v_pack.id is null then raise exception 'pack_not_found'; end if;

  -- Expire stale orders first, then limit open orders per user.
  update public.crypto_orders set status = 'expired'
    where status = 'pending' and expires_at < now();
  select count(*) into v_open from public.crypto_orders
    where owner_id = v_user and status = 'pending';
  if v_open >= 3 then raise exception 'too_many_open_orders'; end if;

  -- price in token units, e.g. $10.00 -> 10_000_000 (USDC has 6 decimals)
  v_base := (v_pack.price_usd_cents::bigint * power(10, v_set.token_decimals)::bigint) / 100;

  loop
    v_try := v_try + 1;
    begin
      insert into public.crypto_orders
        (owner_id, pack_id, credits, price_usd_cents, chain, chain_id, token_symbol,
         token_address, token_decimals, receive_address, amount_units, expires_at)
      values
        (v_user, v_pack.id, v_pack.credits, v_pack.price_usd_cents, v_set.chain, v_set.chain_id,
         v_set.token_symbol, v_set.token_address, v_set.token_decimals, v_set.receive_address,
         -- unique tail between 0.000001 and 0.009999 USDC
         v_base + 1 + floor(random() * 9999)::bigint,
         now() + make_interval(mins => v_set.order_minutes))
      returning * into v_order;
      return v_order;
    exception when unique_violation then
      if v_try >= 25 then raise exception 'busy_try_again'; end if;
    end;
  end loop;
end;
$$;

revoke all on function public.create_crypto_order(text) from public, anon;
grant execute on function public.create_crypto_order(text) to authenticated;

create or replace function public.cancel_crypto_order(p_order_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.crypto_orders set status = 'cancelled'
    where id = p_order_id and owner_id = auth.uid() and status = 'pending';
$$;
revoke all on function public.cancel_crypto_order(uuid) from public, anon;
grant execute on function public.cancel_crypto_order(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- confirm_crypto_payment: SERVER ONLY (service role)
-- Returns 'credited', 'unmatched' or 'duplicate'.
-- ---------------------------------------------------------------------
create or replace function public.confirm_crypto_payment(
  p_chain text,
  p_tx_hash text,
  p_log_index integer,
  p_block_number bigint,
  p_from text,
  p_to text,
  p_token text,
  p_units bigint,
  p_block_time timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_set public.payment_settings;
  v_payment_id uuid;
  v_order public.crypto_orders;
  v_tx text := lower(p_tx_hash);
begin
  select * into v_set from public.payment_settings where id;
  if lower(p_to) <> v_set.receive_address or lower(p_token) <> v_set.token_address or p_chain <> v_set.chain then
    raise exception 'not_our_payment';
  end if;

  insert into public.crypto_payments
    (chain, tx_hash, log_index, block_number, from_address, to_address, token_address, units, status)
  values
    (p_chain, v_tx, p_log_index, p_block_number, lower(p_from), lower(p_to), lower(p_token), p_units, 'unmatched')
  on conflict (chain, tx_hash, log_index) do nothing
  returning id into v_payment_id;

  if v_payment_id is null then
    return 'duplicate';
  end if;

  -- Match: same exact amount, still open (or expired within 3 days).
  select * into v_order from public.crypto_orders
    where chain = p_chain
      and token_address = lower(p_token)
      and amount_units = p_units
      and status in ('pending', 'expired')
      and created_at > now() - interval '3 days'
      -- the order must exist before the payment was made (2 min clock slack)
      and created_at <= p_block_time + interval '2 minutes'
    order by (status = 'pending') desc, created_at desc
    limit 1
    for update;

  if v_order.id is null then
    return 'unmatched';
  end if;

  update public.crypto_orders
    set status = 'paid', tx_hash = v_tx, from_address = lower(p_from),
        paid_units = p_units, paid_at = now()
    where id = v_order.id;

  update public.crypto_payments set status = 'credited', order_id = v_order.id where id = v_payment_id;

  perform public.grant_credits(
    v_order.owner_id, v_order.credits, 'purchase',
    'crypto:' || p_chain || ':' || v_tx || ':' || p_log_index,
    'crypto_order', v_order.id::text,
    v_order.credits || ' credits · ' || v_order.token_symbol || ' payment'
  );
  return 'credited';
end;
$$;

revoke all on function public.confirm_crypto_payment(text, text, integer, bigint, text, text, text, bigint, timestamptz) from public, anon, authenticated;
grant execute on function public.confirm_crypto_payment(text, text, integer, bigint, text, text, text, bigint, timestamptz) to service_role;

-- Admin: credit an unmatched payment to a chosen order (e.g. user rounded the amount).
create or replace function public.resolve_crypto_payment(p_payment_id uuid, p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay public.crypto_payments;
  v_order public.crypto_orders;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  select * into v_pay from public.crypto_payments where id = p_payment_id for update;
  if v_pay.id is null or v_pay.status <> 'unmatched' then raise exception 'payment_not_unmatched'; end if;
  select * into v_order from public.crypto_orders where id = p_order_id for update;
  if v_order.id is null or v_order.status = 'paid' then raise exception 'order_not_open'; end if;

  update public.crypto_orders
    set status = 'paid', tx_hash = v_pay.tx_hash, from_address = v_pay.from_address,
        paid_units = v_pay.units, paid_at = now()
    where id = v_order.id;
  update public.crypto_payments set status = 'resolved', order_id = v_order.id,
    note = 'Resolved by admin ' || auth.uid()::text where id = v_pay.id;

  perform public.grant_credits(
    v_order.owner_id, v_order.credits, 'purchase',
    'crypto:' || v_pay.chain || ':' || v_pay.tx_hash || ':' || v_pay.log_index,
    'crypto_order', v_order.id::text,
    v_order.credits || ' credits · ' || v_order.token_symbol || ' payment (resolved)',
    auth.uid()
  );
end;
$$;
revoke all on function public.resolve_crypto_payment(uuid, uuid) from public, anon;
grant execute on function public.resolve_crypto_payment(uuid, uuid) to authenticated;

-- Watcher helpers (service role only).
create or replace function public.expire_crypto_orders()
returns integer
language sql
security definer
set search_path = public
as $$
  with e as (
    update public.crypto_orders set status = 'expired'
      where status = 'pending' and expires_at < now()
      returning 1
  )
  select count(*)::integer from e;
$$;
revoke all on function public.expire_crypto_orders() from public, anon, authenticated;
grant execute on function public.expire_crypto_orders() to service_role;

grant select, insert, update on public.crypto_scan_state to service_role;
