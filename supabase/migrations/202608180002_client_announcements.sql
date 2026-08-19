begin;

create table if not exists public.client_announcements (
  id uuid primary key default gen_random_uuid(),

  title text not null
    check (
      char_length(btrim(title)) between 1 and 200
    ),

  message text not null
    check (
      char_length(btrim(message)) between 1 and 3000
    ),

  is_active boolean not null default true,

  published_at timestamptz not null default now(),

  expires_at timestamptz,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    expires_at is null
    or expires_at > published_at
  )
);

create index if not exists
  client_announcements_published_idx
on public.client_announcements(
  is_active,
  published_at desc
);

alter table public.client_announcements
  enable row level security;

revoke all
  on public.client_announcements
  from anon;

revoke all
  on public.client_announcements
  from authenticated;

grant select
  on public.client_announcements
  to authenticated;

grant all
  on public.client_announcements
  to service_role;

drop policy if exists
  "Active clients can view announcements"
on public.client_announcements;

create policy
  "Active clients can view announcements"
on public.client_announcements
for select
to authenticated
using (
  is_active = true
  and published_at <= now()
  and (
    expires_at is null
    or expires_at > now()
  )
  and exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'user_client'
      and profiles.account_status = 'active'
  )
);

drop trigger if exists
  set_client_announcements_updated_at
on public.client_announcements;

create trigger
  set_client_announcements_updated_at
before update
on public.client_announcements
for each row
execute function public.set_updated_at();

commit;
