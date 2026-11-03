\set ON_ERROR_STOP on
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000b1','b1@test'),
 ('00000000-0000-0000-0000-0000000000b2','b2@test');
insert into projects (id, owner_id, title) values
 ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','B1 film'),
 ('50000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000b2','B2 film');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
insert into storyboards (id, owner_id, project_id) values ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','50000000-0000-0000-0000-000000000001');
-- one storyboard per project
do $$ begin
  insert into storyboards (owner_id, project_id) values ('00000000-0000-0000-0000-0000000000b1','50000000-0000-0000-0000-000000000001');
  raise exception 'second storyboard should fail';
exception when unique_violation then null; end $$;
-- storyboard on someone else's project: blocked
do $$ begin
  insert into storyboards (owner_id, project_id) values ('00000000-0000-0000-0000-0000000000b1','50000000-0000-0000-0000-000000000002');
  raise exception 'should be blocked';
exception when insufficient_privilege then null; end $$;
insert into storyboard_scenes (id, storyboard_id, owner_id, position, title, duration_seconds) values
 ('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1',0,'Opening',5),
 ('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1',1,'Middle',4),
 ('70000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1',2,'End',3);
-- bad shot type / duration rejected
do $$ begin
  insert into storyboard_scenes (storyboard_id, owner_id, position, shot_type) values ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1',3,'dolly-zoom-ish');
  raise exception 'bad shot type accepted';
exception when check_violation then null; end $$;
-- reorder
select reorder_scenes('60000000-0000-0000-0000-000000000001', array['70000000-0000-0000-0000-000000000003','70000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000002']::uuid[]);
do $$ begin assert (select string_agg(title, ',' order by position) from storyboard_scenes) = 'End,Opening,Middle', 'reorder failed'; end $$;
-- reorder with a missing id rejected
do $$ begin
  perform reorder_scenes('60000000-0000-0000-0000-000000000001', array['70000000-0000-0000-0000-000000000003']::uuid[]);
  raise exception 'partial reorder accepted';
exception when others then assert sqlerrm = 'scene_list_mismatch', sqlerrm; end $$;
-- snapshot + restore
insert into storyboard_revisions (id, storyboard_id, owner_id, label, scenes, scene_count)
select '80000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','v1',
  jsonb_agg(to_jsonb(s) order by position), count(*) from storyboard_scenes s;
delete from storyboard_scenes where title = 'Middle';
do $$ begin assert restore_storyboard_revision('80000000-0000-0000-0000-000000000001') = 3; end $$;
do $$ begin assert (select string_agg(title, ',' order by position) from storyboard_scenes) = 'End,Opening,Middle', 'restore failed'; end $$;
-- other user sees nothing, cannot reorder or restore
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
do $$ begin
  assert (select count(*) from storyboards) = 0;
  assert (select count(*) from storyboard_scenes) = 0;
  assert (select count(*) from storyboard_revisions) = 0;
end $$;
do $$ begin
  perform reorder_scenes('60000000-0000-0000-0000-000000000001', array[]::uuid[]);
  raise exception 'foreign reorder accepted';
exception when others then assert sqlerrm = 'not_found', sqlerrm; end $$;
do $$ begin
  perform restore_storyboard_revision('80000000-0000-0000-0000-000000000001');
  raise exception 'foreign restore accepted';
exception when others then assert sqlerrm = 'not_found', sqlerrm; end $$;
do $$ begin
  insert into storyboard_scenes (storyboard_id, owner_id, position) values ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b2',9);
  raise exception 'foreign scene insert accepted';
exception when insufficient_privilege then null; end $$;
reset role;
\echo ALL STORYBOARD TESTS PASSED
