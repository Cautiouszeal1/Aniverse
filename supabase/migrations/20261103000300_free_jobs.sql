-- AniVerse — allow users to record FREE generation jobs (0 credits), such as
-- the free Pollinations image tier, not only demo jobs. Paid jobs (any
-- credits) can still only be written by the server with the service role.

drop policy if exists "jobs: insert own demo jobs" on public.generation_jobs;

create policy "jobs: insert own free jobs"
  on public.generation_jobs for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.owns_project(project_id)
    and estimated_credits = 0
    and charged_credits = 0
  );
