-- =====================================================================
-- Brick 10a: pay-safe generation
--
-- Guarantee to users: a paid generation either delivers a result or the
-- credits come back automatically. Nobody is ever charged while the AI
-- service is paused (e.g. its prepaid balance is low).
--
--   start_paid_job  -> checks service, charges credits, creates job (atomic)
--   finish_paid_job -> marks completed
--   fail_paid_job   -> marks failed + refunds in full (idempotent)
--   refund_stuck_jobs -> safety net: refunds jobs stuck in processing
-- =====================================================================

-- Allow future paid job kinds.
alter table public.generation_jobs drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs
  add constraint generation_jobs_kind_check
  check (kind in ('character_image', 'scene_image', 'scene_video'));

alter table public.generation_jobs
  add column if not exists refunded_credits integer not null default 0
    check (refunded_credits >= 0),
  add column if not exists started_at timestamptz;

create index if not exists generation_jobs_processing_idx
  on public.generation_jobs (updated_at)
  where status in ('queued', 'processing') and charged_credits > 0;

-- ---------------------------------------------------------------------
-- AI service status (one row per service). Users can read it so the UI can
-- say "temporarily unavailable" BEFORE they spend anything. No vendor names.
-- ---------------------------------------------------------------------
create table public.ai_service_status (
  service          text primary key check (service in ('image', 'video')),
  paused           boolean not null default false,
  reason           text,                         -- shown to admins only
  balance_usd      numeric(12, 4),               -- last known prepaid balance
  min_balance_usd  numeric(12, 4) not null default 5,
  auto_paused      boolean not null default false, -- paused by the system, not by hand
  updated_at       timestamptz not null default now()
);

insert into public.ai_service_status (service) values ('image'), ('video')
on conflict do nothing;

alter table public.ai_service_status enable row level security;

create policy "ai status: anyone signed in can read"
  on public.ai_service_status for select to authenticated using (true);

-- Server-only: report the provider balance. Auto-pauses below the minimum
-- and auto-resumes (only if the system paused it) once topped up.
create or replace function public.report_ai_balance(p_service text, p_balance_usd numeric)
returns boolean   -- true = service available
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_service_status;
begin
  select * into v_row from public.ai_service_status where service = p_service for update;
  if not found then raise exception 'unknown service %', p_service; end if;

  -- A manual pause by the admin always wins; only record the balance.
  if v_row.paused and not v_row.auto_paused then
    update public.ai_service_status
       set balance_usd = p_balance_usd, updated_at = now()
     where service = p_service;
    return false;
  end if;

  if p_balance_usd < v_row.min_balance_usd then
    update public.ai_service_status
       set balance_usd = p_balance_usd, paused = true, auto_paused = true,
           reason = 'low_balance', updated_at = now()
     where service = p_service;
    return false;
  end if;

  update public.ai_service_status
     set balance_usd = p_balance_usd, paused = false, auto_paused = false,
         reason = null, updated_at = now()
   where service = p_service;
  return true;
end;
$$;

-- Admin: pause / resume by hand.
create or replace function public.set_ai_service_paused(p_service text, p_paused boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.ai_service_status
     set paused = p_paused,
         auto_paused = false,
         reason = case when p_paused then coalesce(p_reason, 'manual') else null end,
         updated_at = now()
   where service = p_service;
  if not found then raise exception 'unknown service %', p_service; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- start_paid_job: atomic "check service + charge + create job".
-- Idempotent on p_key: a double-click or retry returns the same job and
-- never charges twice.
-- ---------------------------------------------------------------------
create or replace function public.start_paid_job(
  p_user_id    uuid,
  p_project_id uuid,
  p_kind       text,
  p_service    text,
  p_provider   text,
  p_model      text,
  p_input      jsonb,
  p_credits    integer,
  p_key        text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if p_credits <= 0 then raise exception 'credits must be positive'; end if;

  select id into v_job_id from public.generation_jobs where idempotency_key = p_key;
  if found then return v_job_id; end if;

  if not exists (select 1 from public.projects where id = p_project_id and owner_id = p_user_id) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  if coalesce((select paused from public.ai_service_status where service = p_service), true) then
    raise exception 'service_unavailable' using errcode = 'P0001';
  end if;

  v_job_id := gen_random_uuid();

  -- Raises insufficient_credits; the whole transaction (incl. job) rolls back.
  perform public.spend_credits(p_user_id, p_credits, 'job:' || p_key, 'generation_job', v_job_id::text);

  insert into public.generation_jobs
    (id, owner_id, project_id, kind, status, provider, model, is_demo, input,
     estimated_credits, charged_credits, idempotency_key, started_at)
  values
    (v_job_id, p_user_id, p_project_id, p_kind, 'processing', p_provider, p_model, false, p_input,
     p_credits, p_credits, p_key, now());

  return v_job_id;
end;
$$;

create or replace function public.finish_paid_job(
  p_job_id uuid,
  p_output jsonb,
  p_provider_request_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.generation_jobs
     set status = 'completed', output = p_output,
         provider_request_id = coalesce(p_provider_request_id, provider_request_id),
         completed_at = now(), error = null
   where id = p_job_id and status in ('queued', 'processing');
  return found;
end;
$$;

-- Marks failed and refunds everything charged. Safe to call many times;
-- the refund is keyed to the job so it is paid exactly once. A job that
-- already completed is never refunded.
create or replace function public.fail_paid_job(p_job_id uuid, p_error text)
returns integer   -- credits refunded by this call
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs;
  v_amount integer;
begin
  select * into v_job from public.generation_jobs where id = p_job_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_job.status = 'completed' then return 0; end if;

  v_amount := v_job.charged_credits - v_job.refunded_credits;

  if v_amount > 0 then
    perform public.grant_credits(v_job.owner_id, v_amount, 'refund', 'refund:' || p_job_id::text,
                                 'generation_job', p_job_id::text, left(p_error, 200));
  end if;

  update public.generation_jobs
     set status = 'failed', error = left(p_error, 500),
         refunded_credits = charged_credits, completed_at = now()
   where id = p_job_id;

  return greatest(v_amount, 0);
end;
$$;

-- Safety net, run every minute by the scheduler: any paid job that has
-- been processing too long (server crash, timeout) is failed and refunded.
create or replace function public.refund_stuck_jobs(p_minutes integer default 20)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select id from public.generation_jobs
     where status in ('queued', 'processing')
       and charged_credits > refunded_credits
       and updated_at < now() - make_interval(mins => p_minutes)
  loop
    perform public.fail_paid_job(v_id, 'timed_out');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.report_ai_balance(text, numeric) from public, anon, authenticated;
revoke all on function public.start_paid_job(uuid, uuid, text, text, text, text, jsonb, integer, text) from public, anon, authenticated;
revoke all on function public.finish_paid_job(uuid, jsonb, text) from public, anon, authenticated;
revoke all on function public.fail_paid_job(uuid, text) from public, anon, authenticated;
revoke all on function public.refund_stuck_jobs(integer) from public, anon, authenticated;
revoke all on function public.set_ai_service_paused(text, boolean, text) from public, anon;

grant execute on function public.report_ai_balance(text, numeric) to service_role;
grant execute on function public.start_paid_job(uuid, uuid, text, text, text, text, jsonb, integer, text) to service_role;
grant execute on function public.finish_paid_job(uuid, jsonb, text) to service_role;
grant execute on function public.fail_paid_job(uuid, text) to service_role;
grant execute on function public.refund_stuck_jobs(integer) to service_role;
grant execute on function public.set_ai_service_paused(text, boolean, text) to authenticated, service_role;
