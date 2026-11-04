\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000d1','d1@test'),
 ('00000000-0000-0000-0000-0000000000d2','d2@test'),
 ('00000000-0000-0000-0000-0000000000da','dadmin@test');
insert into app_admins (user_id) values ('00000000-0000-0000-0000-0000000000da');
insert into projects (id, owner_id, title) values
 ('d0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1','D1 film'),
 ('d0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000d2','D2 film');
insert into storyboards (id, owner_id, project_id) values
 ('d1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1','d0000000-0000-0000-0000-000000000001');
insert into storyboard_scenes (id, storyboard_id, owner_id, position, title, duration_seconds) values
 ('d2000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000d1',0,'Open',5);

-- prices are seeded and readable
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d1';
do $$ begin
  assert (select credits_per_clip from ai_prices where id='motion-pro') = 750;
  update ai_prices set credits_per_clip = 1 where id = 'motion-pro';
  assert (select credits_per_clip from ai_prices where id='motion-pro') = 750, 'user edited price';
end $$;
reset role;

-- clip versions per scene, via paid job (earlier suite paused video on purpose)
update ai_service_status set paused = false, auto_paused = false, reason = null;
set role service_role;
select grant_credits('00000000-0000-0000-0000-0000000000d1', 2000, 'purchase', 'd_buy');
create temp table cj as select
  start_paid_job('00000000-0000-0000-0000-0000000000d1','d0000000-0000-0000-0000-000000000001','scene_video','video','aniverse-video','av-motion-1','{}',100,'dk1') as j1,
  start_paid_job('00000000-0000-0000-0000-0000000000d1','d0000000-0000-0000-0000-000000000001','scene_video','video','aniverse-video','av-motion-1','{}',100,'dk2') as j2;
grant select on cj to public;
do $$ declare a uuid; b uuid; c1 uuid; begin
  select j1, j2 into a, b from cj;
  c1 := create_animation_clip('00000000-0000-0000-0000-0000000000d1','d0000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',a,'motion-standard','hero waves',5,'16:9',false);
  assert create_animation_clip('00000000-0000-0000-0000-0000000000d1','d0000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',a,'motion-standard','hero waves',5,'16:9',false) = c1, 'idempotent';
  perform create_animation_clip('00000000-0000-0000-0000-0000000000d1','d0000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',b,'motion-standard','hero waves 2',5,'16:9',false);
  assert (select array_agg(version order by version) from animation_clips) = array[1,2], 'versions';
  perform attach_clip_video(a, '00000000-0000-0000-0000-0000000000d1/' || a || '.mp4', 1234);
  assert (select bytes from animation_clips where job_id = a) = 1234;
end $$;
-- someone else's scene is rejected
do $$ begin
  perform create_animation_clip('00000000-0000-0000-0000-0000000000d2','d0000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000001',gen_random_uuid(),'motion-standard','x',5,'16:9',false);
  raise exception 'should fail';
exception when others then assert sqlerrm in ('not_found'), sqlerrm; end $$;
reset role;

-- clip RLS
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d2';
do $$ begin assert (select count(*) from animation_clips) = 0, 'd2 sees d1 clips'; end $$;
do $$ begin
  perform create_animation_clip('00000000-0000-0000-0000-0000000000d2','d0000000-0000-0000-0000-000000000002',null,(select j1 from cj),'motion-standard','x',5,'16:9',false);
  raise exception 'user called server fn';
exception when insufficient_privilege then null; end $$;
-- non-admins can't use admin tools
do $$ begin perform admin_adjust_credits('00000000-0000-0000-0000-0000000000d2', 9999, 'free money'); raise exception 'x';
exception when others then assert sqlerrm = 'not_admin', sqlerrm; end $$;
do $$ begin perform * from admin_find_users(''); raise exception 'x';
exception when others then assert sqlerrm = 'not_admin', sqlerrm; end $$;
-- reports and deletion requests
insert into content_reports (reporter_id, category, target, details) values
 ('00000000-0000-0000-0000-0000000000d2','copyright','clip 123','This uses my artwork without permission.');
do $$ begin
  insert into content_reports (reporter_id, category, target, details, status) values
   ('00000000-0000-0000-0000-0000000000d2','other','x','sneaky resolved one','resolved');
  raise exception 'x';
exception when insufficient_privilege then null; end $$;
insert into account_deletion_requests (user_id, reason) values ('00000000-0000-0000-0000-0000000000d2','leaving');
update account_deletion_requests set status = 'cancelled';
do $$ begin
  update account_deletion_requests set status = 'completed';
  raise exception 'x';
exception when insufficient_privilege then null; end $$;
reset role;

-- admin tools work and are audited
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000da';
do $$ begin
  assert admin_adjust_credits('00000000-0000-0000-0000-0000000000d2', 300, 'beta tester grant') = 300;
  assert admin_adjust_credits('00000000-0000-0000-0000-0000000000d2', -100, 'correction') = 200;
  assert (select count(*) from audit_events where action='credits.adjust') = 2, 'audited';
  assert (select count(*) from admin_find_users('d2@')) = 1;
  assert (select balance from admin_find_users('d2@')) = 200;
  assert (select credits_charged from admin_usage_report(30) where kind='scene_video') >= 200, 'usage report';
  assert (select count(*) from content_reports) = 1, 'admin sees reports';
  assert (select count(*) from generation_jobs) >= 2, 'admin sees jobs';
  update ai_prices set credits_per_clip = 120 where id = 'motion-standard';
  assert (select credits_per_clip from ai_prices where id='motion-standard') = 120, 'admin edits price';
end $$;
do $$ begin perform admin_adjust_credits('00000000-0000-0000-0000-0000000000d2', -5000, 'too much'); raise exception 'x';
exception when others then assert sqlerrm = 'would_go_negative', sqlerrm; end $$;
do $$ begin perform admin_adjust_credits('00000000-0000-0000-0000-0000000000d2', 5, ''); raise exception 'x';
exception when others then assert sqlerrm = 'reason_required', sqlerrm; end $$;
reset role;
select 'ALL ANIMATION/ADMIN TESTS PASSED' as result;
