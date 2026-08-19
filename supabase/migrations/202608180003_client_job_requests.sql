begin;

create table if not exists public.client_job_requests (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null
    references public.clients(id)
    on delete cascade,

  submitted_by uuid not null
    references public.profiles(id)
    on delete cascade,

  job_url text not null
    check (
      char_length(btrim(job_url)) between 8 and 2000
    ),

  comment text
    check (
      comment is null
      or char_length(comment) <= 2000
    ),

  status text not null default 'new'
    check (
      status in (
        'new',
        'in_review',
        'converted',
        'dismissed'
      )
    ),

  converted_application_id uuid
    references public.applications(id)
    on delete set null,

  reviewed_by uuid
    references public.profiles(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists
  client_job_requests_client_idx
on public.client_job_requests(
  client_id,
  created_at desc
);

create index if not exists
  client_job_requests_status_idx
on public.client_job_requests(status);

alter table public.client_job_requests
  enable row level security;

revoke all
  on public.client_job_requests
  from anon;

revoke all
  on public.client_job_requests
  from authenticated;

grant select, insert
  on public.client_job_requests
  to authenticated;

grant all
  on public.client_job_requests
  to service_role;


drop policy if exists
  "Clients can view their job requests"
on public.client_job_requests;

create policy
  "Clients can view their job requests"
on public.client_job_requests
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can submit job requests"
on public.client_job_requests;

create policy
  "Clients can submit job requests"
on public.client_job_requests
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and public.user_owns_client(client_id)
);


drop policy if exists
  "Assigned applicants can view job requests"
on public.client_job_requests;

create policy
  "Assigned applicants can view job requests"
on public.client_job_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.client_staff_assignments
    where client_staff_assignments.client_id =
      client_job_requests.client_id

      and client_staff_assignments.staff_user_id =
        (select auth.uid())

      and client_staff_assignments.assignment_role =
        'applicant'

      and client_staff_assignments.is_active = true
  )
);


drop policy if exists
  "Leadership can view job requests"
on public.client_job_requests;

create policy
  "Leadership can view job requests"
on public.client_job_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status = 'active'
      and profiles.role in (
        'chief_applicant',
        'admin',
        'owner'
      )
  )
);


drop trigger if exists
  set_client_job_requests_updated_at
on public.client_job_requests;

create trigger
  set_client_job_requests_updated_at
before update
on public.client_job_requests
for each row
execute function public.set_updated_at();

commit;
