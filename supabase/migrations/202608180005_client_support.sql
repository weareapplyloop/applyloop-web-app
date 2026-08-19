begin;

create table if not exists public.client_support_tickets (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null
    references public.clients(id)
    on delete cascade,

  created_by uuid not null
    references public.profiles(id)
    on delete cascade,

  category text not null default 'general'
    check (
      category in (
        'general',
        'account',
        'applications',
        'technical',
        'other'
      )
    ),

  subject text not null
    check (
      char_length(btrim(subject))
      between 1 and 200
    ),

  status text not null default 'open'
    check (
      status in (
        'open',
        'in_progress',
        'resolved',
        'closed'
      )
    ),

  priority text not null default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high'
      )
    ),

  resolved_at timestamptz,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);

create index if not exists
  client_support_tickets_client_idx
on public.client_support_tickets(
  client_id,
  created_at desc
);

create index if not exists
  client_support_tickets_status_idx
on public.client_support_tickets(
  status,
  created_at desc
);


create table if not exists public.client_support_messages (
  id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null
    references public.client_support_tickets(id)
    on delete cascade,

  sender_user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  message text not null
    check (
      char_length(btrim(message))
      between 1 and 5000
    ),

  created_at timestamptz
    not null default now()
);

create index if not exists
  client_support_messages_ticket_idx
on public.client_support_messages(
  ticket_id,
  created_at asc
);


alter table public.client_support_tickets
  enable row level security;

alter table public.client_support_messages
  enable row level security;


revoke all
  on public.client_support_tickets
  from anon;

revoke all
  on public.client_support_messages
  from anon;

revoke all
  on public.client_support_tickets
  from authenticated;

revoke all
  on public.client_support_messages
  from authenticated;

grant select, insert
  on public.client_support_tickets
  to authenticated;

grant select, insert
  on public.client_support_messages
  to authenticated;

grant all
  on public.client_support_tickets
  to service_role;

grant all
  on public.client_support_messages
  to service_role;


drop policy if exists
  "Clients can view their support tickets"
on public.client_support_tickets;

create policy
  "Clients can view their support tickets"
on public.client_support_tickets
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can create support tickets"
on public.client_support_tickets;

create policy
  "Clients can create support tickets"
on public.client_support_tickets
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can view support messages"
on public.client_support_messages;

create policy
  "Clients can view support messages"
on public.client_support_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.client_support_tickets
    where client_support_tickets.id =
      client_support_messages.ticket_id
      and public.user_owns_client(
        client_support_tickets.client_id
      )
  )
);


drop policy if exists
  "Clients can send support messages"
on public.client_support_messages;

create policy
  "Clients can send support messages"
on public.client_support_messages
for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())
  and exists (
    select 1
    from public.client_support_tickets
    where client_support_tickets.id =
      client_support_messages.ticket_id
      and public.user_owns_client(
        client_support_tickets.client_id
      )
      and client_support_tickets.status
        <> 'closed'
  )
);


drop policy if exists
  "Leadership can view support tickets"
on public.client_support_tickets;

create policy
  "Leadership can view support tickets"
on public.client_support_tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id =
      (select auth.uid())
      and profiles.account_status =
        'active'
      and profiles.role in (
        'admin',
        'owner',
        'operations'
      )
  )
);


drop policy if exists
  "Leadership can view support messages"
on public.client_support_messages;

create policy
  "Leadership can view support messages"
on public.client_support_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id =
      (select auth.uid())
      and profiles.account_status =
        'active'
      and profiles.role in (
        'admin',
        'owner',
        'operations'
      )
  )
);


drop trigger if exists
  set_client_support_tickets_updated_at
on public.client_support_tickets;

create trigger
  set_client_support_tickets_updated_at
before update
on public.client_support_tickets
for each row
execute function public.set_updated_at();

commit;
