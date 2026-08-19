begin;

alter table public.clients
  add column if not exists address text,
  add column if not exists state_province text,
  add column if not exists disability text,
  add column if not exists veteran text;

commit;
