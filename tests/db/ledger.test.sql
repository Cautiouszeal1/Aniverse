\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','a@test','{"display_name":"Ada","terms_version":"2026-11-03"}'),
 ('00000000-0000-0000-0000-00000000000b','b@test','{}');
-- profile trigger
do $$ begin assert (select display_name from profiles where id='00000000-0000-0000-0000-00000000000a')='Ada', 'profile trigger';
  assert (select terms_accepted_at is not null from profiles where id='00000000-0000-0000-0000-00000000000a'), 'terms recorded';
  assert (select terms_accepted_at is null from profiles where id='00000000-0000-0000-0000-00000000000b'), 'no terms'; end $$;
-- purchase is idempotent (webhook replay)
set role service_role;
do $$ begin
  assert grant_credits('00000000-0000-0000-0000-00000000000a',500,'purchase','pay_1') = true;
  assert grant_credits('00000000-0000-0000-0000-00000000000a',500,'purchase','pay_1') = false, 'replay must not double-credit';
  assert spend_credits('00000000-0000-0000-0000-00000000000a',35,'job_1') = 465;
  assert spend_credits('00000000-0000-0000-0000-00000000000a',35,'job_1') = 465, 'retry must not double-charge';
end $$;
-- insufficient credits
do $$ begin
  perform spend_credits('00000000-0000-0000-0000-00000000000b',1,'job_2');
  raise exception 'should have failed';
exception when others then
  assert sqlerrm = 'insufficient_credits', sqlerrm;
end $$;
reset role;
-- ledger immutable
do $$ begin update credit_ledger set delta = 9999; raise exception 'should have failed';
exception when others then assert sqlerrm = 'credit_ledger is append-only', sqlerrm; end $$;
-- RLS: user B cannot see A's data or call grant
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
insert into projects (owner_id,title) values ('00000000-0000-0000-0000-00000000000b','B film');
do $$ begin
  assert (select count(*) from credit_ledger) = 0, 'B sees A ledger';
  assert my_credit_balance() = 0;
  assert (select count(*) from projects) = 1;
end $$;
do $$ begin
  insert into projects (owner_id,title) values ('00000000-0000-0000-0000-00000000000a','hijack');
  raise exception 'should have failed';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform grant_credits('00000000-0000-0000-0000-00000000000b',999,'adjustment','hack');
  raise exception 'should have failed';
exception when insufficient_privilege then null; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert my_credit_balance() = 465;
  assert (select count(*) from projects) = 0, 'A sees B project';
  assert (select count(*) from credit_packs) = 1;
end $$;
reset role;
\echo ALL DB TESTS PASSED
