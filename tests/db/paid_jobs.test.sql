\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000f1','f1@test'),
 ('00000000-0000-0000-0000-0000000000f2','f2@test'),
 ('00000000-0000-0000-0000-0000000000fa','fadmin@test');
insert into app_admins (user_id) values ('00000000-0000-0000-0000-0000000000fa');
insert into projects (id, owner_id, title) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000f1','Paid film');

set role service_role;
select grant_credits('00000000-0000-0000-0000-0000000000f1', 1000, 'purchase', 'pj_buy');

-- 1. successful job: charged once, even when retried with the same key
create temp table j1 as select start_paid_job('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1',
  'scene_video','video','aniverse-video','av-video-1','{"p":1}',750,'k1') as id;
grant select on j1 to public;
do $$ declare a uuid; b uuid; begin
  select id into a from j1;
  b := start_paid_job('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1',
    'scene_video','video','aniverse-video','av-video-1','{"p":1}',750,'k1');
  assert a = b, 'retry must return same job';
  assert (select sum(delta) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000f1') = 250, 'charged once';
  assert finish_paid_job(a, '{"url":"x"}') = true;
  assert fail_paid_job(a, 'late error') = 0, 'completed job is never refunded';
  assert (select status from generation_jobs where id=a) = 'completed';
end $$;

-- 2. not enough credits: nothing charged, no job left behind
do $$ begin
  perform start_paid_job('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1',
    'scene_video','video','aniverse-video','av-video-1','{}',750,'k2');
  raise exception 'should fail';
exception when others then assert sqlerrm = 'insufficient_credits', sqlerrm; end $$;
do $$ begin assert not exists (select 1 from generation_jobs where idempotency_key='k2'), 'orphan job'; end $$;

-- 3. failed job: full refund, exactly once
select grant_credits('00000000-0000-0000-0000-0000000000f1', 600, 'purchase', 'pj_buy2');
create temp table j3 as select start_paid_job('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1',
  'scene_video','video','aniverse-video','av-video-1','{}',750,'k3') as id;
grant select on j3 to public;
do $$ declare a uuid; begin
  select id into a from j3;
  assert (select sum(delta) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000f1') = 100;
  assert fail_paid_job(a, 'provider error') = 750;
  assert fail_paid_job(a, 'provider error again') = 0, 'double refund';
  assert (select sum(delta) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000f1') = 850, 'refunded';
  assert (select refunded_credits from generation_jobs where id=a) = 750;
end $$;

-- 4. stuck job is refunded by the safety net
create temp table j4 as select start_paid_job('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1',
  'scene_video','video','aniverse-video','av-video-1','{}',750,'k4') as id;
grant select on j4 to public;
reset role;
alter table generation_jobs disable trigger generation_jobs_updated_at;
update generation_jobs set updated_at = now() - interval '30 minutes' where id = (select id from j4);
alter table generation_jobs enable trigger generation_jobs_updated_at;
set role service_role;
do $$ begin
  assert refund_stuck_jobs(20) = 1, 'stuck job not refunded';
  assert refund_stuck_jobs(20) = 0, 'refunded twice';
  assert (select sum(delta) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000f1') = 850;
end $$;

-- 5. low balance auto-pauses: user is NOT charged; top-up auto-resumes
do $$ begin
  assert report_ai_balance('video', 2.50) = false;
  perform start_paid_job('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1',
    'scene_video','video','aniverse-video','av-video-1','{}',750,'k5');
  raise exception 'should fail';
exception when others then assert sqlerrm = 'service_unavailable', sqlerrm; end $$;
do $$ begin
  assert (select sum(delta) from credit_ledger where user_id='00000000-0000-0000-0000-0000000000f1') = 850, 'charged while paused';
  assert report_ai_balance('video', 40) = true, 'auto resume';
end $$;

-- 6. a manual pause is never undone by a balance report
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000fa';
select set_ai_service_paused('video', true, 'maintenance');
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000f2';
do $$ begin
  perform set_ai_service_paused('video', false);
  raise exception 'non-admin could resume';
exception when others then assert sqlerrm = 'not_admin', sqlerrm; end $$;
-- users can read status but cannot call server functions
do $$ begin assert (select paused from ai_service_status where service='video'); end $$;
do $$ begin
  perform fail_paid_job((select id from generation_jobs limit 1), 'x');
  raise exception 'user could refund';
exception when insufficient_privilege then null; end $$;
reset role;
set role service_role;
do $$ begin assert report_ai_balance('video', 100) = false, 'manual pause overridden'; end $$;
reset role;
select 'paid_jobs tests passed' as result;
