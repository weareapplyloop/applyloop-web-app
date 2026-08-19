begin;

create table if not exists public.growth_courses (
  id uuid primary key default gen_random_uuid(),

  title text not null
    check (
      char_length(btrim(title))
      between 1 and 200
    ),

  provider text not null
    check (
      char_length(btrim(provider))
      between 1 and 200
    ),

  description text not null default '',

  course_url text not null
    check (
      char_length(btrim(course_url))
      between 8 and 2000
    ),

  course_type text not null default 'free'
    check (
      course_type in (
        'free',
        'paid'
      )
    ),

  hours numeric(7,2)
    check (
      hours is null or hours >= 0
    ),

  level text
    check (
      level is null
      or level in (
        'Beginner',
        'Intermediate',
        'Advanced',
        'All Levels'
      )
    ),

  rating numeric(3,2)
    check (
      rating is null
      or (
        rating >= 0
        and rating <= 5
      )
    ),

  is_active boolean
    not null default true,

  created_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create table if not exists public.client_growth_courses (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null
    references public.clients(id)
    on delete cascade,

  course_id uuid not null
    references public.growth_courses(id)
    on delete cascade,

  relevance_score integer
    not null default 0
    check (
      relevance_score
      between 0 and 100
    ),

  is_saved boolean
    not null default false,

  is_completed boolean
    not null default false,

  completed_at timestamptz,

  assigned_by uuid
    references public.profiles(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  unique (
    client_id,
    course_id
  )
);


create table if not exists public.client_skill_gaps (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null
    references public.clients(id)
    on delete cascade,

  skill text not null
    check (
      char_length(btrim(skill))
      between 1 and 150
    ),

  priority text not null default 'medium'
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  current_score integer
    not null default 0
    check (
      current_score
      between 0 and 100
    ),

  target_score integer
    not null default 100
    check (
      target_score
      between 0 and 100
    ),

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now(),

  unique (
    client_id,
    skill
  ),

  check (
    target_score >= current_score
  )
);


create table if not exists public.client_certification_recommendations (
  id uuid primary key default gen_random_uuid(),

  client_id uuid not null
    references public.clients(id)
    on delete cascade,

  certification_name text not null
    check (
      char_length(
        btrim(certification_name)
      ) between 1 and 200
    ),

  provider text,

  certification_url text,

  sort_order integer
    not null default 0,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


create index if not exists
  client_growth_courses_client_idx
on public.client_growth_courses(
  client_id,
  created_at desc
);

create index if not exists
  client_skill_gaps_client_idx
on public.client_skill_gaps(
  client_id
);

create index if not exists
  client_certifications_client_idx
on public.client_certification_recommendations(
  client_id,
  sort_order
);


alter table public.growth_courses
  enable row level security;

alter table public.client_growth_courses
  enable row level security;

alter table public.client_skill_gaps
  enable row level security;

alter table public.client_certification_recommendations
  enable row level security;


revoke all
  on public.growth_courses
  from anon;

revoke all
  on public.client_growth_courses
  from anon;

revoke all
  on public.client_skill_gaps
  from anon;

revoke all
  on public.client_certification_recommendations
  from anon;


revoke all
  on public.growth_courses
  from authenticated;

revoke all
  on public.client_growth_courses
  from authenticated;

revoke all
  on public.client_skill_gaps
  from authenticated;

revoke all
  on public.client_certification_recommendations
  from authenticated;


grant select
  on public.growth_courses
  to authenticated;

grant select, update
  on public.client_growth_courses
  to authenticated;

grant select
  on public.client_skill_gaps
  to authenticated;

grant select
  on public.client_certification_recommendations
  to authenticated;

grant all
  on public.growth_courses,
     public.client_growth_courses,
     public.client_skill_gaps,
     public.client_certification_recommendations
  to service_role;


drop policy if exists
  "Clients can view assigned growth courses"
on public.client_growth_courses;

create policy
  "Clients can view assigned growth courses"
on public.client_growth_courses
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can update growth progress"
on public.client_growth_courses;

create policy
  "Clients can update growth progress"
on public.client_growth_courses
for update
to authenticated
using (
  public.user_owns_client(client_id)
)
with check (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can view active growth courses"
on public.growth_courses;

create policy
  "Clients can view active growth courses"
on public.growth_courses
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.client_growth_courses
    where client_growth_courses.course_id =
      growth_courses.id
      and public.user_owns_client(
        client_growth_courses.client_id
      )
  )
);


drop policy if exists
  "Clients can view their skill gaps"
on public.client_skill_gaps;

create policy
  "Clients can view their skill gaps"
on public.client_skill_gaps
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


drop policy if exists
  "Clients can view certification recommendations"
on public.client_certification_recommendations;

create policy
  "Clients can view certification recommendations"
on public.client_certification_recommendations
for select
to authenticated
using (
  public.user_owns_client(client_id)
);


drop trigger if exists
  set_growth_courses_updated_at
on public.growth_courses;

create trigger
  set_growth_courses_updated_at
before update
on public.growth_courses
for each row
execute function public.set_updated_at();


drop trigger if exists
  set_client_growth_courses_updated_at
on public.client_growth_courses;

create trigger
  set_client_growth_courses_updated_at
before update
on public.client_growth_courses
for each row
execute function public.set_updated_at();


drop trigger if exists
  set_client_skill_gaps_updated_at
on public.client_skill_gaps;

create trigger
  set_client_skill_gaps_updated_at
before update
on public.client_skill_gaps
for each row
execute function public.set_updated_at();


drop trigger if exists
  set_client_certifications_updated_at
on public.client_certification_recommendations;

create trigger
  set_client_certifications_updated_at
before update
on public.client_certification_recommendations
for each row
execute function public.set_updated_at();

commit;
