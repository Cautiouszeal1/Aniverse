\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000e1','e1@test'),
 ('00000000-0000-0000-0000-0000000000e2','e2@test'),
 ('00000000-0000-0000-0000-0000000000ad','admin@test');
insert into app_admins (user_id) values ('00000000-0000-0000-0000-0000000000ad');

-- user creates an order with a unique amount
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
create temp table o1 as select * from create_crypto_order('starter');
grant select on o1 to public;
do $$ declare o record; begin
  select * into o from o1;
  assert o.amount_units > 10000000 and o.amount_units < 10010000, 'amount not in range: ' || o.amount_units;
  assert o.receive_address = '0x14a15a119f2bec1f09cc6261050ded87db3ddd38', 'wrong wallet';
  assert o.status = 'pending';
end $$;
-- users cannot write orders or confirm payments directly
do $$ begin
  update crypto_orders set status = 'paid';
  assert (select count(*) from crypto_orders where status='paid') = 0, 'user marked paid';
end $$;
do $$ begin
  perform confirm_crypto_payment('base', '0x'||repeat('a',64), 0, 1, '0x'||repeat('1',40), '0x14a15a119f2bec1f09cc6261050ded87db3ddd38', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 1, now());
  raise exception 'user could confirm';
exception when insufficient_privilege then null; end $$;
-- second user cannot see the order
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
do $$ begin assert (select count(*) from crypto_orders) = 0, 'e2 sees e1 order'; end $$;
create temp table o2 as select * from create_crypto_order('starter');
grant select on o2 to public;
reset role;
do $$ begin assert (select amount_units from o1) <> (select amount_units from o2), 'amounts collide'; end $$;

-- server confirms a matching payment -> credited once
set role service_role;
do $$ declare a bigint; r text; begin
  select amount_units into a from o1;
  r := confirm_crypto_payment('base', '0x'||repeat('b',64), 3, 100, '0x'||repeat('2',40), '0x14A15A119f2bec1f09cC6261050dEd87Db3DDD38', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', a, now());
  assert r = 'credited', 'first: ' || r;
  r := confirm_crypto_payment('base', '0x'||repeat('b',64), 3, 100, '0x'||repeat('2',40), '0x14A15A119f2bec1f09cC6261050dEd87Db3DDD38', '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', a, now());
  assert r = 'duplicate', 'replay: ' || r;
  -- wrong amount -> unmatched (never credited)
  r := confirm_crypto_payment('base', '0x'||repeat('c',64), 0, 101, '0x'||repeat('3',40), '0x14a15a119f2bec1f09cc6261050ded87db3ddd38', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 10000000, now());
  assert r = 'unmatched', 'rounded: ' || r;
end $$;
-- an OLD transfer (before the order existed) must not pay a new order
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
create temp table o3 as select * from create_crypto_order('starter');
grant select on o3 to public;
set role service_role;
do $$ declare r text; begin
  r := confirm_crypto_payment('base', '0x'||repeat('e',64), 0, 50, '0x'||repeat('4',40), '0x14a15a119f2bec1f09cc6261050ded87db3ddd38', '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', (select amount_units from o3), now() - interval '1 hour');
  assert r = 'unmatched', 'old transfer matched a newer order: ' || r;
end $$;
reset role;
update crypto_orders set status = 'cancelled' where id = (select id from o3);
set role service_role;
-- payment to another wallet or token is rejected
do $$ begin
  perform confirm_crypto_payment('base', '0x'||repeat('d',64), 0, 102, '0x'||repeat('3',40), '0x'||repeat('9',40), '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', 5, now());
  raise exception 'foreign wallet accepted';
exception when others then assert sqlerrm = 'not_our_payment', sqlerrm; end $$;
reset role;
do $$ begin
  assert (select sum(delta) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000e1') = 500, 'e1 credits';
  assert (select status from crypto_orders where id = (select id from o1)) = 'paid';
  assert (select count(*) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000e2') = 0, 'e2 got credits';
end $$;

-- admin resolves the rounded payment onto e2's order
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e2';
do $$ begin
  perform resolve_crypto_payment((select id from crypto_payments limit 1), (select id from o2));
  raise exception 'non-admin resolved';
exception when others then assert sqlerrm in ('not_admin', 'permission denied for table crypto_payments'), sqlerrm; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad';
do $$ begin
  perform resolve_crypto_payment((select id from crypto_payments where status='unmatched' and units = 10000000), (select id from o2));
end $$;
reset role;
do $$ begin
  assert (select sum(delta) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000e2') = 500, 'e2 not credited after resolve';
  assert (select status from crypto_orders where id = (select id from o2)) = 'paid';
end $$;

-- open-order limit
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000e1';
select create_crypto_order('starter'); select create_crypto_order('starter'); select create_crypto_order('starter');
do $$ begin
  perform create_crypto_order('starter');
  raise exception 'limit not enforced';
exception when others then assert sqlerrm = 'too_many_open_orders', sqlerrm; end $$;
reset role;
\echo ALL CRYPTO TESTS PASSED
