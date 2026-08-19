begin;

create table if not exists public.client_product_tour_progress (
  client_id uuid primary key
    references public.clients(id)
    on delete cascade,

  completed_at timestamptz,
  dismissed_at timestamptz,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);

alter table public.client_product_tour_progress
  enable row level security;

revoke all
  on public.client_product_tour_progress
  from anon;

revoke all
  on public.client_product_tour_progress
  from authenticated;

grant select, insert, update
  on public.client_product_tour_progress
  to authenticated;

grant all
  on public.client_product_tour_progress
  to service_role;


drop policy if exists
  "Clients can view their product tour progress"
on public.client_product_tour_progress;

create policy
  "Clients can view their product tour progress"
on public.client_product_tour_progress
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can create their product tour progress"
on public.client_product_tour_progress;

create policy
  "Clients can create their product tour progress"
on public.client_product_tour_progress
for insert
to authenticated
with check (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can update their product tour progress"
on public.client_product_tour_progress;

create policy
  "Clients can update their product tour progress"
on public.client_product_tour_progress
for update
to authenticated
using (
  public.user_owns_client(client_id)
)
with check (
  public.user_owns_client(client_id)
);


drop trigger if exists
  set_client_product_tour_progress_updated_at
on public.client_product_tour_progress;

create trigger
  set_client_product_tour_progress_updated_at
before update
on public.client_product_tour_progress
for each row
execute function public.set_updated_at();

commit;
