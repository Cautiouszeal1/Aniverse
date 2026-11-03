-- AniVerse core schema — Milestone 2
-- Profiles, projects, credit packs and an append-only credit ledger.
-- Every user-owned table has row-level security keyed to auth.uid().

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text check (char_length(display_name) <= 60),
  creator_type      text check (creator_type in
                      ('beginner', 'content_creator', 'independent_animator', 'studio', 'other')),
  terms_version     text,
  terms_accepted_at timestamptz,
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Create the profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, terms_version, terms_accepted_at)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60), ''),
    nullif(new.raw_user_meta_data ->> 'terms_version', ''),
    case when coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> '' then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "projects: read own"
  on public.projects for select to authenticated
  using (owner_id = auth.uid());

create policy "projects: insert own"
  on public.projects for insert to authenticated
  with check (owner_id = auth.uid());

create policy "projects: update own"
  on public.projects for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "projects: delete own"
  on public.projects for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- Credit packs (what users can buy)
--   1 credit = US$0.01 of AI provider cost.
--   Starter: user pays $10.00, receives 500 credits ($5.00 of AI usage);
--   AniVerse keeps $5.00 before payment-processor fees.
-- ---------------------------------------------------------------------
create table public.credit_packs (
  id                text primary key,
  name              text not null,
  price_usd_cents   integer not null check (price_usd_cents > 0),
  credits           integer not null check (credits > 0),
  active            boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  -- the platform margin can never be negative
  constraint credit_packs_margin_check check (price_usd_cents >= credits)
);

alter table public.credit_packs enable row level security;

create policy "credit_packs: anyone signed in can read active packs"
  on public.credit_packs for select to authenticated
  using (active);

insert into public.credit_packs (id, name, price_usd_cents, credits, sort_order)
values ('starter', 'Starter', 1000, 500, 1);

-- ---------------------------------------------------------------------
-- Credit ledger (append-only; balance = sum of deltas)
-- ---------------------------------------------------------------------
create table public.credit_ledger (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users (id) on delete cascade,
  delta            integer not null check (delta <> 0),
  reason           text not null check (reason in
                     ('purchase', 'generation', 'refund', 'adjustment', 'welcome')),
  reference_type   text,          -- e.g. 'payment', 'generation_job'
  reference_id     text,          -- provider / internal id
  idempotency_key  text not null unique,
  note             text,
  created_by       uuid,          -- admin id for manual adjustments
  created_at       timestamptz not null default now()
);

create index credit_ledger_user_created_idx on public.credit_ledger (user_id, created_at desc);

alter table public.credit_ledger enable row level security;

-- Users may read their own history. There are deliberately NO insert,
-- update or delete policies: only server code using the service role
-- (through the functions below) can write.
create policy "credit_ledger: read own"
  on public.credit_ledger for select to authenticated
  using (user_id = auth.uid());

-- Hard guarantee that history is never rewritten, even by mistake.
create or replace function public.credit_ledger_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'credit_ledger is append-only';
end;
$$;

create trigger credit_ledger_no_update
  before update or delete on public.credit_ledger
  for each row execute function public.credit_ledger_immutable();

-- Current user's balance.
create or replace function public.my_credit_balance()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_ledger
  where user_id = auth.uid();
$$;

-- Server-only: add credits (purchase, refund, welcome, adjustment).
-- Idempotent: replaying the same key (e.g. a webhook retry) does nothing
-- and returns false.
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_idempotency_key text,
  p_reference_type text default null,
  p_reference_id text default null,
  p_note text default null,
  p_created_by uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows integer;
begin
  if p_amount <= 0 then
    raise exception 'grant amount must be positive';
  end if;
  if p_reason not in ('purchase', 'refund', 'adjustment', 'welcome') then
    raise exception 'invalid grant reason %', p_reason;
  end if;

  insert into public.credit_ledger
    (user_id, delta, reason, reference_type, reference_id, idempotency_key, note, created_by)
  values
    (p_user_id, p_amount, p_reason, p_reference_type, p_reference_id, p_idempotency_key, p_note, p_created_by)
  on conflict (idempotency_key) do nothing;

  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;

-- Server-only: spend credits for a generation. Serialised per user so two
-- simultaneous jobs can't overdraw. Idempotent on the key, so a retried
-- job is never charged twice. Raises 'insufficient_credits' if short.
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_idempotency_key text,
  p_reference_type text default 'generation_job',
  p_reference_id text default null
)
returns integer   -- remaining balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'spend amount must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if exists (select 1 from public.credit_ledger where idempotency_key = p_idempotency_key) then
    select coalesce(sum(delta), 0) into v_balance
    from public.credit_ledger where user_id = p_user_id;
    return v_balance;
  end if;

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_ledger where user_id = p_user_id;

  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_ledger
    (user_id, delta, reason, reference_type, reference_id, idempotency_key)
  values
    (p_user_id, -p_amount, 'generation', p_reference_type, p_reference_id, p_idempotency_key);

  return v_balance - p_amount;
end;
$$;

-- Only the server (service_role) may call the write functions.
revoke all on function public.grant_credits(uuid, integer, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.spend_credits(uuid, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, integer, text, text, text, text, text, uuid) to service_role;
grant execute on function public.spend_credits(uuid, integer, text, text, text) to service_role;
grant execute on function public.my_credit_balance() to authenticated;

-- ---------------------------------------------------------------------
-- Audit events (server-written)
-- ---------------------------------------------------------------------
create table public.audit_events (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,
  target_type text,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_events enable row level security;
-- No policies: readable/writable only with the service role.
