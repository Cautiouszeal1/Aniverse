\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000c1','c1@test'),
 ('00000000-0000-0000-0000-0000000000c2','c2@test');
insert into projects (id, owner_id, title) values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','C1 film'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c2','C2 film');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
-- demo job in own project: ok
insert into generation_jobs (id, owner_id, project_id, kind, status, provider, model, is_demo, input, idempotency_key)
values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','character_image','completed','test','demo-v1',true,'{}','k1');
-- free (0-credit) real-provider job: ok
insert into generation_jobs (owner_id, project_id, kind, status, provider, model, is_demo, input, idempotency_key)
values ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','character_image','completed','pollinations','flux',false,'{}','k-free');
-- paid job written by user: blocked
do $$ begin
  insert into generation_jobs (owner_id, project_id, kind, provider, model, is_demo, input, estimated_credits, idempotency_key)
  values ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','character_image','fal','x',false,'{}',35,'k2');
  raise exception 'paid job should be blocked';
exception when insufficient_privilege then null; end $$;
-- job in someone else's project: blocked
do $$ begin
  insert into generation_jobs (owner_id, project_id, kind, provider, model, is_demo, input, idempotency_key)
  values ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000002','character_image','test','demo-v1',true,'{}','k3');
  raise exception 'foreign project job should be blocked';
exception when insufficient_privilege then null; end $$;
-- character + versions
insert into characters (id, owner_id, project_id, name) values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000001','Lantern Girl');
insert into character_versions (character_id, owner_id, version, prompt, style, mood, aspect_ratio, provider, model, is_demo, seed, job_id)
values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1',1,'a brave girl','3d','heroic','1:1','test','demo-v1',true,'s1','20000000-0000-0000-0000-000000000001');
do $$ begin
  insert into character_versions (character_id, owner_id, version, prompt, style, mood, aspect_ratio, provider, model, is_demo, seed)
  values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1',1,'dup','3d','heroic','1:1','test','demo-v1',true,'s2');
  raise exception 'duplicate version should fail';
exception when unique_violation then null; end $$;
-- character in other user's project: blocked
do $$ begin
  insert into characters (owner_id, project_id, name) values ('00000000-0000-0000-0000-0000000000c1','10000000-0000-0000-0000-000000000002','Spy');
  raise exception 'should be blocked';
exception when insufficient_privilege then null; end $$;
-- user 2 sees nothing of user 1
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c2';
do $$ begin
  assert (select count(*) from characters) = 0, 'c2 sees c1 characters';
  assert (select count(*) from character_versions) = 0, 'c2 sees versions';
  assert (select count(*) from generation_jobs) = 0, 'c2 sees jobs';
end $$;
-- user 2 cannot attach a version to user 1's character
do $$ begin
  insert into character_versions (character_id, owner_id, version, prompt, style, mood, aspect_ratio, provider, model, is_demo, seed)
  values ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c2',2,'hijack','3d','heroic','1:1','test','demo-v1',true,'s3');
  raise exception 'should be blocked';
exception when insufficient_privilege then null; end $$;
reset role;
-- deleting project cascades
delete from projects where id='10000000-0000-0000-0000-000000000001';
do $$ begin assert (select count(*) from characters where project_id='10000000-0000-0000-0000-000000000001') = 0; end $$;
\echo ALL CHARACTER TESTS PASSED
