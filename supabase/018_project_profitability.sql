begin;

alter table public.projects
  add column if not exists monthly_person_cost numeric not null default 0;

alter table public.projects
  drop constraint if exists projects_monthly_person_cost_check;

alter table public.projects
  add constraint projects_monthly_person_cost_check
  check (monthly_person_cost >= 0);

comment on column public.projects.monthly_person_cost is
  '1인 월 원가. 프로젝트 계약금과 동일한 원 단위로 저장';

commit;
