begin;

alter table public.employees
  add column if not exists resignation_reason text;

create index if not exists employees_resignation_lookup_idx
  on public.employees (employment_status, team_id, left_date desc);

comment on column public.employees.resignation_reason is '퇴사 사유. employment_status가 퇴사일 때 HTML에서 필수 입력';

commit;

select pg_notify('pgrst', 'reload schema');
