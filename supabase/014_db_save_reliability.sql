begin;

-- HTML이 현재 저장하는 확장 칼럼을 누락된 DB에도 안전하게 보강합니다.
alter table public.projects
  add column if not exists unit_price numeric default 0,
  add column if not exists assigned_team_id text,
  add column if not exists sla_days integer default 0;

alter table public.teams
  add column if not exists base_group text,
  add column if not exists subgroup_name text,
  add column if not exists subgroups jsonb not null default '[]'::jsonb;

alter table public.employees
  add column if not exists subgroup_name text,
  add column if not exists resignation_reason text,
  add column if not exists reduced_work_yn char(1) not null default 'N',
  add column if not exists reduced_work_start_date date,
  add column if not exists reduced_work_end_date date,
  add column if not exists reduced_work_start_time time,
  add column if not exists reduced_work_end_time time,
  add column if not exists reduced_daily_hours numeric;

alter table public.task_history
  add column if not exists effort_buffer_pct numeric not null default 0,
  add column if not exists photo_type text not null default '일반';

alter table public.output_history
  add column if not exists owner_employee_id text;

alter table public.output_rules
  add column if not exists sla_days integer,
  add column if not exists sla_enabled boolean not null default false;

update public.task_history
set effort_buffer_pct = coalesce(effort_buffer_pct, 0),
    photo_type = case
      when photo_type in ('일반', '화보컷', '비화보컷') then photo_type
      else '일반'
    end;

update public.employees
set reduced_work_yn = case when reduced_work_yn = 'Y' then 'Y' else 'N' end;

alter table public.output_rules
  drop constraint if exists output_rules_sla_days_check;
alter table public.output_rules
  add constraint output_rules_sla_days_check
  check (sla_days is null or sla_days >= 0);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'task_history_effort_buffer_pct_check'
      and conrelid = 'public.task_history'::regclass
  ) then
    alter table public.task_history
      add constraint task_history_effort_buffer_pct_check
      check (effort_buffer_pct >= -100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'task_history_photo_type_check'
      and conrelid = 'public.task_history'::regclass
  ) then
    alter table public.task_history
      add constraint task_history_photo_type_check
      check (photo_type in ('일반', '화보컷', '비화보컷'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_reduced_work_yn_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_reduced_work_yn_check
      check (reduced_work_yn in ('Y', 'N'));
  end if;
end
$$;

create index if not exists output_history_owner_employee_id_idx
  on public.output_history (owner_employee_id);
create index if not exists employees_resignation_lookup_idx
  on public.employees (employment_status, team_id, left_date desc);

grant select, insert, update, delete on public.projects, public.teams,
  public.positions, public.employees, public.project_members,
  public.task_history, public.output_history, public.output_rules,
  public.project_changes, public.worker_task_status
to authenticated;

-- 업무 템플릿 전용 운영자는 지정된 프로젝트의 기준과 변경 이력만 저장합니다.
drop policy if exists output_rules_admin_write on public.output_rules;
create policy output_rules_admin_write on public.output_rules
for all to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() = 'operator_output_admin'
    and project_id in (select public.current_user_project_ids())
  )
)
with check (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() = 'operator_output_admin'
    and project_id in (select public.current_user_project_ids())
  )
);

drop policy if exists project_changes_admin_write on public.project_changes;
create policy project_changes_admin_write on public.project_changes
for all to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
    and project_id in (select public.current_user_project_ids())
  )
)
with check (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
    and project_id in (select public.current_user_project_ids())
  )
);

commit;

select pg_notify('pgrst', 'reload schema');
