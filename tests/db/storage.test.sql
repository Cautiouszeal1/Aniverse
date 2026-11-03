\set ON_ERROR_STOP on
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1','s1@test'), ('00000000-0000-0000-0000-0000000000a2','s2@test');
do $$ begin assert (select public from storage.buckets where id = 'character-images') = false, 'bucket must be private'; end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into storage.objects (bucket_id, name) values ('character-images', '00000000-0000-0000-0000-0000000000a1/j/1.jpg');
do $$ begin
  insert into storage.objects (bucket_id, name) values ('character-images', '00000000-0000-0000-0000-0000000000a2/j/1.jpg');
  raise exception 'upload into another user folder should be blocked';
exception when insufficient_privilege then null; end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
do $$ begin assert (select count(*) from storage.objects) = 0, 's2 sees s1 images'; end $$;
reset role;
\echo ALL STORAGE TESTS PASSED
