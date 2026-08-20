begin;

create table if not exists public.client_onboarding_forms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique
    references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  current_question smallint not null default 1
    check (current_question between 1 and 15),
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'submitted')),
  started_at timestamptz,
  last_saved_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.client_onboarding_forms
  enable row level security;

grant select, insert, update
  on public.client_onboarding_forms
  to authenticated;

grant all
  on public.client_onboarding_forms
  to service_role;

drop policy if exists
  "Clients can view their own onboarding form"
  on public.client_onboarding_forms;

create policy "Clients can view their own onboarding form"
on public.client_onboarding_forms
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists
  "Clients can create their own onboarding form"
  on public.client_onboarding_forms;

create policy "Clients can create their own onboarding form"
on public.client_onboarding_forms
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists
  "Clients can update their own onboarding form"
  on public.client_onboarding_forms;

create policy "Clients can update their own onboarding form"
on public.client_onboarding_forms
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_client_onboarding_form_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists
  set_client_onboarding_form_updated_at
  on public.client_onboarding_forms;

create trigger set_client_onboarding_form_updated_at
before update on public.client_onboarding_forms
for each row
execute function public.set_client_onboarding_form_updated_at();

commit;
