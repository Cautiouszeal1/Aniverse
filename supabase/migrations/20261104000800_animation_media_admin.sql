-- =====================================================================
-- Milestone 5 + remaining blueprint features
--   * animation clips (per scene, versioned) + private video storage
--   * AI prices (admin-editable, shown to users before they spend)
--   * admin console helpers: credit adjustments with audit, job overview
--   * content (copyright) reports, account deletion requests
-- Requires 000500 (storyboards), 000600 (admins) and 000700 (paid jobs).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Private video storage: animations/<user id>/<job id>.mp4
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('animations', 'animations', false, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;

drop policy if exists "animations: read own" on storage.objects;
drop policy if exists "animations: delete own" on storage.objects;

create policy "animations: read own"
  on storage.objects for select to authenticated
  using (bucket_id = 'animations' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "animations: delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'animations' and (storage.foldername(name))[1] = auth.uid()::text);
-- No user upload policy: only the server (service role) writes videos.

-- ---------------------------------------------------------------------
-- Prices. 1 credit = $0.01 paid by the user.
-- ---------------------------------------------------------------------
create table public.ai_prices (
  id               text primary key,          -- 'motion-standard', 'motion-pro'
  label            text not null,
  description      text not null default '',
  credits_per_clip integer not null check (credits_per_clip > 0),
  max_seconds      integer not null check (max_seconds between 1 and 10),
  enabled          boolean not null default true,
  sort_order       integer not null default 0,
  updated_at       timestamptz not null default now()
);

insert into public.ai_prices (id, label, description, credits_per_clip, max_seconds, sort_order) values
  ('motion-standard', 'Standard', 'Fast, good-looking motion. Starts from your character''s picture.', 100, 5, 1),
  ('motion-pro', 'Premium', 'Cinematic quality with richer motion and lighting.', 750, 8, 2)
on conflict (id) do nothing;

alter table public.ai_prices enable row level security;
create policy "prices: anyone signed in can read" on public.ai_prices for select to authenticated using (true);
create policy "prices: admins edit" on public.ai_prices for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Animation clips. One row per generation; versions per scene.
-- Status lives on the linked generation job.
-- ---------------------------------------------------------------------
create table public.animation_clips (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  scene_id         uuid references public.storyboard_scenes (id) on delete set null,
  job_id           uuid not null unique references public.generation_jobs (id) on delete cascade,
  version          integer not null check (version > 0),
  quality          text not null references public.ai_prices (id),
  prompt           text not null check (char_length(prompt) between 1 and 2000),
  duration_seconds integer not null check (duration_seconds between 1 and 10),
  aspect_ratio     text not null check (aspect_ratio in ('16:9', '9:16')),
  is_demo          boolean not null default false,
  video_path       text,
  bytes            bigint,
  created_at       timestamptz not null default now()
);

create unique index animation_clips_scene_version_idx on public.animation_clips (scene_id, version) where scene_id is not null;
create index animation_clips_project_idx on public.animation_clips (project_id, created_at desc);
create index animation_clips_owner_idx on public.animation_clips (owner_id, created_at desc);

alter table public.animation_clips enable row level security;
create policy "clips: read own" on public.animation_clips for select to authenticated using (owner_id = auth.uid());
create policy "clips: delete own" on public.animation_clips for delete to authenticated using (owner_id = auth.uid());

-- Server-only: create the clip row with the next version number for the scene.
create or replace function public.create_animation_clip(
  p_owner uuid, p_project uuid, p_scene uuid, p_job uuid, p_quality text,
  p_prompt text, p_duration integer, p_aspect text, p_is_demo boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_version integer;
begin
  select id into v_id from public.animation_clips where job_id = p_job;
  if found then return v_id; end if;

  if p_scene is not null and not exists (
    select 1 from public.storyboard_scenes sc
      join public.storyboards b on b.id = sc.storyboard_id
     where sc.id = p_scene and b.project_id = p_project and b.owner_id = p_owner
  ) then
    raise exception 'not_found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(coalesce(p_scene, p_project)::text, 1));
  select coalesce(max(version), 0) + 1 into v_version
    from public.animation_clips
   where (p_scene is not null and scene_id = p_scene)
      or (p_scene is null and project_id = p_project and scene_id is null);

  insert into public.animation_clips
    (owner_id, project_id, scene_id, job_id, version, quality, prompt, duration_seconds, aspect_ratio, is_demo)
  values
    (p_owner, p_project, p_scene, p_job, v_version, p_quality, p_prompt, p_duration, p_aspect, p_is_demo)
  returning id into v_id;
  return v_id;
end;
$$;

-- Server-only: record where the finished video is stored.
create or replace function public.attach_clip_video(p_job uuid, p_path text, p_bytes bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.animation_clips set video_path = p_path, bytes = p_bytes where job_id = p_job;
$$;

revoke all on function public.create_animation_clip(uuid, uuid, uuid, uuid, text, text, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.attach_clip_video(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.create_animation_clip(uuid, uuid, uuid, uuid, text, text, integer, text, boolean) to service_role;
grant execute on function public.attach_clip_video(uuid, text, bigint) to service_role;

-- ---------------------------------------------------------------------
-- Admin console helpers
-- ---------------------------------------------------------------------

-- Admins can read every job (for the jobs and costs views).
create policy "jobs: admins read all" on public.generation_jobs for select to authenticated
  using (public.is_admin());
create policy "audit: admins read" on public.audit_events for select to authenticated
  using (public.is_admin());

-- Add or remove credits with a written reason. Always audited.
create or replace function public.admin_adjust_credits(p_user_id uuid, p_delta integer, p_note text)
returns integer   -- new balance
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_delta = 0 or abs(p_delta) > 1000000 then raise exception 'invalid_amount'; end if;
  if char_length(coalesce(trim(p_note), '')) < 3 then raise exception 'reason_required'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'not_found'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select coalesce(sum(delta), 0) into v_balance from public.credit_ledger where user_id = p_user_id;
  if v_balance + p_delta < 0 then raise exception 'would_go_negative'; end if;

  insert into public.credit_ledger (user_id, delta, reason, reference_type, idempotency_key, note, created_by)
  values (p_user_id, p_delta, 'adjustment', 'admin', 'adj:' || gen_random_uuid(), left(trim(p_note), 300), auth.uid());

  insert into public.audit_events (actor_id, action, target_type, target_id, details)
  values (auth.uid(), 'credits.adjust', 'user', p_user_id::text,
          jsonb_build_object('delta', p_delta, 'note', left(trim(p_note), 300)));

  return v_balance + p_delta;
end;
$$;

-- User lookup by email (partial match) with balance and activity.
create or replace function public.admin_find_users(p_query text)
returns table (user_id uuid, email text, display_name text, created_at timestamptz,
               balance integer, projects bigint, jobs bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select u.id, u.email::text, p.display_name, u.created_at,
           coalesce((select sum(delta) from public.credit_ledger l where l.user_id = u.id), 0)::integer,
           (select count(*) from public.projects pr where pr.owner_id = u.id),
           (select count(*) from public.generation_jobs j where j.owner_id = u.id)
      from auth.users u
      left join public.profiles p on p.id = u.id
     where p_query is null or trim(p_query) = '' or u.email ilike '%' || trim(p_query) || '%'
     order by u.created_at desc
     limit 25;
end;
$$;

-- Usage report: credits spent and refunded per job kind over N days.
create or replace function public.admin_usage_report(p_days integer default 30)
returns table (kind text, jobs bigint, completed bigint, failed bigint,
               credits_charged bigint, credits_refunded bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select j.kind, count(*), count(*) filter (where j.status = 'completed'),
           count(*) filter (where j.status = 'failed'),
           coalesce(sum(j.charged_credits), 0)::bigint, coalesce(sum(j.refunded_credits), 0)::bigint
      from public.generation_jobs j
     where j.created_at > now() - make_interval(days => p_days)
     group by j.kind
     order by j.kind;
end;
$$;

revoke all on function public.admin_adjust_credits(uuid, integer, text) from public, anon;
revoke all on function public.admin_find_users(text) from public, anon;
revoke all on function public.admin_usage_report(integer) from public, anon;
grant execute on function public.admin_adjust_credits(uuid, integer, text) to authenticated;
grant execute on function public.admin_find_users(text) to authenticated;
grant execute on function public.admin_usage_report(integer) to authenticated;

-- ---------------------------------------------------------------------
-- Copyright / content reports (anyone signed in can file; admins handle)
-- ---------------------------------------------------------------------
create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  category    text not null check (category in ('copyright', 'harmful', 'impersonation', 'other')),
  target      text not null check (char_length(target) between 1 and 500),
  details     text not null check (char_length(details) between 10 and 4000),
  status      text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger content_reports_updated_at before update on public.content_reports
  for each row execute function public.set_updated_at();
alter table public.content_reports enable row level security;
create policy "reports: file own" on public.content_reports for insert to authenticated
  with check (reporter_id = auth.uid() and status = 'open' and admin_note is null);
create policy "reports: read own or admin" on public.content_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());
create policy "reports: admins update" on public.content_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Account deletion requests (handled by an admin within 30 days)
-- ---------------------------------------------------------------------
create table public.account_deletion_requests (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  reason       text check (char_length(reason) <= 1000),
  status       text not null default 'pending' check (status in ('pending', 'cancelled', 'completed')),
  requested_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger account_deletion_requests_updated_at before update on public.account_deletion_requests
  for each row execute function public.set_updated_at();
alter table public.account_deletion_requests enable row level security;
create policy "deletion: read own or admin" on public.account_deletion_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "deletion: request own" on public.account_deletion_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "deletion: cancel own" on public.account_deletion_requests for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check ((user_id = auth.uid() and status in ('pending', 'cancelled')) or public.is_admin());
