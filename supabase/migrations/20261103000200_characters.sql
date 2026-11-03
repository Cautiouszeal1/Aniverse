-- AniVerse — Milestone 3: Character Studio
-- Generation jobs, characters and character versions.
-- All rows are owned by a user and scoped to one of that user's projects.

-- ---------------------------------------------------------------------
-- Helper: does the current user own this project?
-- ---------------------------------------------------------------------
create or replace function public.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = auth.uid()
  );
$$;

grant execute on function public.owns_project(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Generation jobs (one per "Generate" click)
-- ---------------------------------------------------------------------
create table public.generation_jobs (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null references auth.users (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  kind                text not null check (kind in ('character_image')),
  status              text not null default 'queued'
                        check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  provider            text not null,
  model               text not null,
  is_demo             boolean not null default false,
  input               jsonb not null,
  output              jsonb,
  estimated_credits   integer not null default 0 check (estimated_credits >= 0),
  charged_credits     integer not null default 0 check (charged_credits >= 0),
  idempotency_key     text not null unique,
  provider_request_id text,
  error               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index generation_jobs_owner_created_idx on public.generation_jobs (owner_id, created_at desc);
create index generation_jobs_project_idx on public.generation_jobs (project_id, created_at desc);

create trigger generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.set_updated_at();

alter table public.generation_jobs enable row level security;

create policy "jobs: read own"
  on public.generation_jobs for select to authenticated
  using (owner_id = auth.uid());

-- Users may only create demo jobs directly (they cost nothing). Paid jobs
-- are created and updated by the server with the service role, which
-- bypasses RLS, so a user can never write a "completed, 0 credits" paid job.
create policy "jobs: insert own demo jobs"
  on public.generation_jobs for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.owns_project(project_id)
    and is_demo = true
    and charged_credits = 0
  );

-- ---------------------------------------------------------------------
-- Characters
-- ---------------------------------------------------------------------
create table public.characters (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index characters_project_idx on public.characters (project_id, updated_at desc);
create index characters_owner_idx on public.characters (owner_id, updated_at desc);

create trigger characters_updated_at
  before update on public.characters
  for each row execute function public.set_updated_at();

alter table public.characters enable row level security;

create policy "characters: read own"
  on public.characters for select to authenticated
  using (owner_id = auth.uid());

create policy "characters: insert own"
  on public.characters for insert to authenticated
  with check (owner_id = auth.uid() and public.owns_project(project_id));

create policy "characters: update own"
  on public.characters for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and public.owns_project(project_id));

create policy "characters: delete own"
  on public.characters for delete to authenticated
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- Character versions (each saved look; never edited, only added/removed)
-- ---------------------------------------------------------------------
create table public.character_versions (
  id            uuid primary key default gen_random_uuid(),
  character_id  uuid not null references public.characters (id) on delete cascade,
  owner_id      uuid not null references auth.users (id) on delete cascade,
  version       integer not null check (version >= 1),
  prompt        text not null check (char_length(prompt) between 3 and 1000),
  style         text not null,
  mood          text not null,
  aspect_ratio  text not null check (aspect_ratio in ('1:1', '3:4', '16:9')),
  provider      text not null,
  model         text not null,
  is_demo       boolean not null default false,
  seed          text not null,
  image_path    text,          -- private storage path (real providers)
  job_id        uuid references public.generation_jobs (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (character_id, version)
);

create index character_versions_character_idx on public.character_versions (character_id, version desc);

alter table public.character_versions enable row level security;

create policy "versions: read own"
  on public.character_versions for select to authenticated
  using (owner_id = auth.uid());

create policy "versions: insert own"
  on public.character_versions for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.characters c
      where c.id = character_id and c.owner_id = auth.uid()
    )
  );

create policy "versions: delete own"
  on public.character_versions for delete to authenticated
  using (owner_id = auth.uid());

-- Touch the parent character when a version is added, so "recently
-- updated" ordering stays correct.
create or replace function public.touch_character()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.characters set updated_at = now() where id = new.character_id;
  update public.projects p set updated_at = now()
    from public.characters c
    where c.id = new.character_id and p.id = c.project_id;
  return new;
end;
$$;

create trigger character_versions_touch
  after insert on public.character_versions
  for each row execute function public.touch_character();
