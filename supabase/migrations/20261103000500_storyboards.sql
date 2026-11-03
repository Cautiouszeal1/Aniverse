-- AniVerse — Milestone 4: Storyboard editor
-- One storyboard per project, ordered scenes, and saved versions (snapshots).

create table public.storyboards (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  project_id  uuid not null unique references public.projects (id) on delete cascade,
  title       text not null default 'Storyboard' check (char_length(title) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger storyboards_updated_at
  before update on public.storyboards
  for each row execute function public.set_updated_at();

alter table public.storyboards enable row level security;

create policy "storyboards: read own" on public.storyboards for select to authenticated
  using (owner_id = auth.uid());
create policy "storyboards: insert own" on public.storyboards for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_project(project_id));
create policy "storyboards: update own" on public.storyboards for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.owns_project(project_id));
create policy "storyboards: delete own" on public.storyboards for delete to authenticated
  using (owner_id = auth.uid());

-- Helper: does the current user own this storyboard?
create or replace function public.owns_storyboard(p_storyboard_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.storyboards
    where id = p_storyboard_id and owner_id = auth.uid()
  );
$$;

grant execute on function public.owns_storyboard(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Scenes
-- ---------------------------------------------------------------------
create table public.storyboard_scenes (
  id                uuid primary key default gen_random_uuid(),
  storyboard_id     uuid not null references public.storyboards (id) on delete cascade,
  owner_id          uuid not null references auth.users (id) on delete cascade,
  position          integer not null check (position >= 0),
  title             text not null default '' check (char_length(title) <= 120),
  description       text not null default '' check (char_length(description) <= 2000),
  dialogue          text not null default '' check (char_length(dialogue) <= 2000),
  shot_type         text not null default 'medium'
                      check (shot_type in ('wide', 'medium', 'close-up', 'extreme-close-up', 'over-the-shoulder', 'aerial', 'pov')),
  camera_notes      text not null default '' check (char_length(camera_notes) <= 500),
  duration_seconds  numeric(5, 1) not null default 4 check (duration_seconds > 0 and duration_seconds <= 120),
  character_ids     uuid[] not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index storyboard_scenes_order_idx on public.storyboard_scenes (storyboard_id, position);

create trigger storyboard_scenes_updated_at
  before update on public.storyboard_scenes
  for each row execute function public.set_updated_at();

alter table public.storyboard_scenes enable row level security;

create policy "scenes: read own" on public.storyboard_scenes for select to authenticated
  using (owner_id = auth.uid());
create policy "scenes: insert own" on public.storyboard_scenes for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_storyboard(storyboard_id));
create policy "scenes: update own" on public.storyboard_scenes for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.owns_storyboard(storyboard_id));
create policy "scenes: delete own" on public.storyboard_scenes for delete to authenticated
  using (owner_id = auth.uid());

-- Keep the storyboard's "updated" time fresh when scenes change.
create or replace function public.touch_storyboard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.storyboards
    set updated_at = now()
    where id = coalesce(new.storyboard_id, old.storyboard_id);
  return null;
end;
$$;

create trigger storyboard_scenes_touch
  after insert or update or delete on public.storyboard_scenes
  for each row execute function public.touch_storyboard();

-- Reorder all scenes in one step. Runs as the caller, so RLS still applies;
-- the ids must be exactly the storyboard's current scenes.
create or replace function public.reorder_scenes(p_storyboard_id uuid, p_scene_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.owns_storyboard(p_storyboard_id) then
    raise exception 'not_found';
  end if;
  select count(*) into v_count from public.storyboard_scenes where storyboard_id = p_storyboard_id;
  if v_count <> coalesce(array_length(p_scene_ids, 1), 0)
     or v_count <> (select count(distinct x) from unnest(p_scene_ids) x)
     or exists (
       select 1 from unnest(p_scene_ids) x
       where not exists (
         select 1 from public.storyboard_scenes s where s.id = x and s.storyboard_id = p_storyboard_id
       )
     ) then
    raise exception 'scene_list_mismatch';
  end if;

  update public.storyboard_scenes s
    set position = o.ord - 1
    from unnest(p_scene_ids) with ordinality as o(id, ord)
    where s.id = o.id and s.storyboard_id = p_storyboard_id;
end;
$$;

grant execute on function public.reorder_scenes(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- Saved versions (snapshots of all scenes)
-- ---------------------------------------------------------------------
create table public.storyboard_revisions (
  id             uuid primary key default gen_random_uuid(),
  storyboard_id  uuid not null references public.storyboards (id) on delete cascade,
  owner_id       uuid not null references auth.users (id) on delete cascade,
  label          text not null check (char_length(label) between 1 and 80),
  scenes         jsonb not null,
  scene_count    integer not null default 0,
  created_at     timestamptz not null default now()
);

create index storyboard_revisions_idx on public.storyboard_revisions (storyboard_id, created_at desc);

alter table public.storyboard_revisions enable row level security;

create policy "revisions: read own" on public.storyboard_revisions for select to authenticated
  using (owner_id = auth.uid());
create policy "revisions: insert own" on public.storyboard_revisions for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_storyboard(storyboard_id));
create policy "revisions: delete own" on public.storyboard_revisions for delete to authenticated
  using (owner_id = auth.uid());

-- Restore a saved version in one transaction (replaces the current scenes).
create or replace function public.restore_storyboard_revision(p_revision_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rev public.storyboard_revisions;
  v_count integer;
begin
  select * into v_rev from public.storyboard_revisions where id = p_revision_id;
  if v_rev.id is null or v_rev.owner_id <> auth.uid() then
    raise exception 'not_found';
  end if;

  delete from public.storyboard_scenes where storyboard_id = v_rev.storyboard_id;

  insert into public.storyboard_scenes
    (storyboard_id, owner_id, position, title, description, dialogue,
     shot_type, camera_notes, duration_seconds, character_ids)
  select
    v_rev.storyboard_id,
    auth.uid(),
    (s.ord - 1)::integer,
    coalesce(s.elem ->> 'title', ''),
    coalesce(s.elem ->> 'description', ''),
    coalesce(s.elem ->> 'dialogue', ''),
    coalesce(s.elem ->> 'shot_type', 'medium'),
    coalesce(s.elem ->> 'camera_notes', ''),
    coalesce((s.elem ->> 'duration_seconds')::numeric, 4),
    coalesce(
      (select array_agg(x::uuid) from jsonb_array_elements_text(s.elem -> 'character_ids') x),
      '{}'
    )
  from jsonb_array_elements(v_rev.scenes) with ordinality as s(elem, ord);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.restore_storyboard_revision(uuid) to authenticated;
