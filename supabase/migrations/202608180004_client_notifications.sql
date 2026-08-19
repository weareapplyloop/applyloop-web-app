begin;

create table if not exists public.client_notifications (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null
    references public.clients(id)
    on delete cascade,

  application_id uuid
    references public.applications(id)
    on delete cascade,

  type text not null
    check (
      type in (
        'application_created',
        'application_status',
        'feedback',
        'system'
      )
    ),

  title text not null
    check (
      char_length(btrim(title))
      between 1 and 200
    ),

  message text not null
    check (
      char_length(btrim(message))
      between 1 and 3000
    ),

  href text,

  read_at timestamptz,

  created_at timestamptz
    not null default now()
);

create index if not exists
  client_notifications_client_created_idx
on public.client_notifications(
  client_id,
  created_at desc
);

create index if not exists
  client_notifications_unread_idx
on public.client_notifications(
  client_id,
  read_at,
  created_at desc
);

alter table public.client_notifications
  enable row level security;

revoke all
  on public.client_notifications
  from anon;

revoke all
  on public.client_notifications
  from authenticated;

grant select
  on public.client_notifications
  to authenticated;

grant all
  on public.client_notifications
  to service_role;


drop policy if exists
  "Clients can view their notifications"
on public.client_notifications;

create policy
  "Clients can view their notifications"
on public.client_notifications
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


create or replace function
  public.notify_client_application_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.client_notifications (
      client_id,
      application_id,
      type,
      title,
      message,
      href
    )
    values (
      new.client_id,
      new.id,
      'application_created',
      'New application added',
      new.company || ' - ' ||
        new.position ||
        ' was added to your applications.',
      '/applications/' || new.id
    );

    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.client_notifications (
      client_id,
      application_id,
      type,
      title,
      message,
      href
    )
    values (
      new.client_id,
      new.id,
      'application_status',
      'Application status updated',
      new.company || ' - ' ||
        new.position ||
        ' is now ' ||
        new.status || '.',
      '/applications/' || new.id
    );
  end if;

  return new;
end;
$$;

revoke all
  on function
    public.notify_client_application_change()
  from public;


drop trigger if exists
  notify_client_application_change
on public.applications;

create trigger
  notify_client_application_change
after insert or update of status
on public.applications
for each row
execute function
  public.notify_client_application_change();


create or replace function
  public.notify_client_feedback()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_client_id uuid;
  client_user_id uuid;
  application_company text;
  application_position text;
begin
  if new.visibility <> 'client' then
    return new;
  end if;

  select
    applications.client_id,
    clients.user_id,
    applications.company,
    applications.position
  into
    target_client_id,
    client_user_id,
    application_company,
    application_position
  from public.applications
  join public.clients
    on clients.id =
      applications.client_id
  where applications.id =
    new.application_id;

  if target_client_id is null then
    return new;
  end if;

  if new.sender_user_id
    is not distinct from client_user_id
  then
    return new;
  end if;

  insert into public.client_notifications (
    client_id,
    application_id,
    type,
    title,
    message,
    href
  )
  values (
    target_client_id,
    new.application_id,
    'feedback',
    'New application feedback',
    'New feedback is available for ' ||
      application_company || ' - ' ||
      application_position || '.',
    '/applications/' ||
      new.application_id
  );

  return new;
end;
$$;

revoke all
  on function
    public.notify_client_feedback()
  from public;


drop trigger if exists
  notify_client_feedback
on public.application_messages;

create trigger
  notify_client_feedback
after insert
on public.application_messages
for each row
execute function
  public.notify_client_feedback();

commit;
