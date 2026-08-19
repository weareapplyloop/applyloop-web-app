begin;

create or replace function public.user_owns_client(
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.clients
    where clients.id = target_client_id
      and clients.user_id = (select auth.uid())
  );
$function$;

revoke all
  on function public.user_owns_client(uuid)
  from public;

grant execute
  on function public.user_owns_client(uuid)
  to authenticated;

grant execute
  on function public.user_owns_client(uuid)
  to service_role;


create table if not exists public.client_staff_assignments (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null
    references public.clients(id)
    on delete cascade,

  staff_user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  assignment_role text not null
    default 'applicant'
    check (
      assignment_role in (
        'applicant',
        'chief_applicant'
      )
    ),

  is_active boolean not null default true,

  assigned_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (
    client_id,
    staff_user_id,
    assignment_role
  )
);

create index if not exists
  client_staff_assignments_client_idx
on public.client_staff_assignments(client_id);

create index if not exists
  client_staff_assignments_staff_idx
on public.client_staff_assignments(staff_user_id);


alter table public.applications
  add column if not exists client_approval_status text
    not null default 'not_required';

alter table public.applications
  add column if not exists client_approved_at timestamptz;

alter table public.applications
  add column if not exists resume_path text;

alter table public.applications
  add column if not exists cover_letter_path text;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'applications_client_approval_status_check'
      and conrelid =
        'public.applications'::regclass
  ) then
    alter table public.applications
      add constraint
        applications_client_approval_status_check
      check (
        client_approval_status in (
          'not_required',
          'pending',
          'approved',
          'changes_requested'
        )
      );
  end if;
end;
$$;


create index if not exists
  applications_created_by_idx
on public.applications(created_by);


create table if not exists public.application_messages (
  id uuid primary key default gen_random_uuid(),

  application_id uuid not null
    references public.applications(id)
    on delete cascade,

  sender_user_id uuid
    references public.profiles(id)
    on delete set null,

  subject text,

  message text not null
    check (
      char_length(btrim(message)) between 1 and 5000
    ),

  visibility text not null
    default 'client'
    check (
      visibility in (
        'client',
        'internal'
      )
    ),

  created_at timestamptz not null default now()
);

create index if not exists
  application_messages_application_idx
on public.application_messages(
  application_id,
  created_at
);


alter table public.client_staff_assignments
  enable row level security;

alter table public.applications
  enable row level security;

alter table public.application_messages
  enable row level security;


revoke all
  on public.client_staff_assignments
  from anon;

revoke all
  on public.client_staff_assignments
  from authenticated;

grant select
  on public.client_staff_assignments
  to authenticated;

grant all
  on public.client_staff_assignments
  to service_role;


revoke all
  on public.applications
  from anon;

revoke all
  on public.applications
  from authenticated;

grant select, insert, update
  on public.applications
  to authenticated;

grant all
  on public.applications
  to service_role;


revoke all
  on public.application_messages
  from anon;

revoke all
  on public.application_messages
  from authenticated;

grant select, insert
  on public.application_messages
  to authenticated;

grant all
  on public.application_messages
  to service_role;


drop policy if exists
  "Staff can view relevant client assignments"
on public.client_staff_assignments;

create policy
  "Staff can view relevant client assignments"
on public.client_staff_assignments
for select
to authenticated
using (
  staff_user_id = (select auth.uid())

  or exists (
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


drop policy if exists
  "Clients can view their own applications"
on public.applications;

create policy
  "Clients can view their own applications"
on public.applications
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Assigned applicants can view applications"
on public.applications;

create policy
  "Assigned applicants can view applications"
on public.applications
for select
to authenticated
using (
  exists (
    select 1
    from public.client_staff_assignments
    where client_staff_assignments.client_id =
      applications.client_id

      and client_staff_assignments.staff_user_id =
        (select auth.uid())

      and client_staff_assignments.assignment_role =
        'applicant'

      and client_staff_assignments.is_active = true
  )
);


drop policy if exists
  "Application leadership can view applications"
on public.applications;

create policy
  "Application leadership can view applications"
on public.applications
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
        'team_auditor',
        'chief_auditor',
        'admin',
        'owner'
      )
  )
);


drop policy if exists
  "Assigned applicants can create applications"
on public.applications;

create policy
  "Assigned applicants can create applications"
on public.applications
for insert
to authenticated
with check (
  created_by = (select auth.uid())

  and exists (
    select 1
    from public.client_staff_assignments
    where client_staff_assignments.client_id =
      applications.client_id

      and client_staff_assignments.staff_user_id =
        (select auth.uid())

      and client_staff_assignments.assignment_role =
        'applicant'

      and client_staff_assignments.is_active = true
  )
);


drop policy if exists
  "Application leadership can create applications"
on public.applications;

create policy
  "Application leadership can create applications"
on public.applications
for insert
to authenticated
with check (
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


drop policy if exists
  "Assigned applicants can update applications"
on public.applications;

create policy
  "Assigned applicants can update applications"
on public.applications
for update
to authenticated
using (
  exists (
    select 1
    from public.client_staff_assignments
    where client_staff_assignments.client_id =
      applications.client_id

      and client_staff_assignments.staff_user_id =
        (select auth.uid())

      and client_staff_assignments.assignment_role =
        'applicant'

      and client_staff_assignments.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.client_staff_assignments
    where client_staff_assignments.client_id =
      applications.client_id

      and client_staff_assignments.staff_user_id =
        (select auth.uid())

      and client_staff_assignments.assignment_role =
        'applicant'

      and client_staff_assignments.is_active = true
  )
);


drop policy if exists
  "Application leadership can update applications"
on public.applications;

create policy
  "Application leadership can update applications"
on public.applications
for update
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
)
with check (
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


drop policy if exists
  "Clients can view their application messages"
on public.application_messages;

create policy
  "Clients can view their application messages"
on public.application_messages
for select
to authenticated
using (
  visibility = 'client'

  and exists (
    select 1
    from public.applications
    where applications.id =
      application_messages.application_id

      and public.user_owns_client(
        applications.client_id
      )
  )
);


drop policy if exists
  "Clients can send application feedback"
on public.application_messages;

create policy
  "Clients can send application feedback"
on public.application_messages
for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())
  and visibility = 'client'

  and exists (
    select 1
    from public.applications
    where applications.id =
      application_messages.application_id

      and public.user_owns_client(
        applications.client_id
      )
  )
);


drop policy if exists
  "Assigned applicants can view application messages"
on public.application_messages;

create policy
  "Assigned applicants can view application messages"
on public.application_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.applications
    join public.client_staff_assignments
      on client_staff_assignments.client_id =
        applications.client_id

    where applications.id =
      application_messages.application_id

      and client_staff_assignments.staff_user_id =
        (select auth.uid())

      and client_staff_assignments.assignment_role =
        'applicant'

      and client_staff_assignments.is_active = true
  )
);


drop policy if exists
  "Assigned applicants can send application messages"
on public.application_messages;

create policy
  "Assigned applicants can send application messages"
on public.application_messages
for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())

  and exists (
    select 1
    from public.applications
    join public.client_staff_assignments
      on client_staff_assignments.client_id =
        applications.client_id

    where applications.id =
      application_messages.application_id

      and client_staff_assignments.staff_user_id =
        (select auth.uid())

      and client_staff_assignments.assignment_role =
        'applicant'

      and client_staff_assignments.is_active = true
  )
);


drop policy if exists
  "Application leadership can view messages"
on public.application_messages;

create policy
  "Application leadership can view messages"
on public.application_messages
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
        'team_auditor',
        'chief_auditor',
        'admin',
        'owner'
      )
  )
);


drop policy if exists
  "Application leadership can send messages"
on public.application_messages;

create policy
  "Application leadership can send messages"
on public.application_messages
for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())

  and exists (
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


drop policy if exists
  "Auditors can send internal application messages"
on public.application_messages;

create policy
  "Auditors can send internal application messages"
on public.application_messages
for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())
  and visibility = 'internal'

  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.account_status = 'active'
      and profiles.role in (
        'team_auditor',
        'chief_auditor'
      )
  )
);


drop trigger if exists
  set_client_staff_assignments_updated_at
on public.client_staff_assignments;

create trigger
  set_client_staff_assignments_updated_at
before update
on public.client_staff_assignments
for each row
execute function public.set_updated_at();


drop trigger if exists
  set_applications_updated_at
on public.applications;

create trigger
  set_applications_updated_at
before update
on public.applications
for each row
execute function public.set_updated_at();

commit;
