begin;

alter table public.projects
  add column if not exists management_people integer not null default 0;

alter table public.projects
  drop constraint if exists projects_management_people_check;

alter table public.projects
  add constraint projects_management_people_check
  check (management_people >= 0);

commit;
