begin;
alter table public.projects add column if not exists assignment_daily_target numeric check (assignment_daily_target > 0);
alter table public.projects add column if not exists assignment_monthly_target numeric check (assignment_monthly_target > 0);
alter table public.projects add column if not exists public_daily_enabled boolean not null default false;

-- Public access is deliberately limited to aggregates from explicitly enabled projects.
create or replace function public.guard_public_daily_setting()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Upserts run INSERT triggers before conflict resolution; unchanged public rows remain saveable.
  if (tg_op = 'INSERT' and new.public_daily_enabled and not exists (
      select 1 from public.projects p where p.project_id = new.project_id and p.public_daily_enabled = true))
     or (tg_op = 'UPDATE' and new.public_daily_enabled is distinct from old.public_daily_enabled) then
    if auth.uid() is not null and not public.current_user_is_app_admin() then
      raise exception '일간 현황 공개 설정은 관리자만 변경할 수 있습니다.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_public_daily_setting on public.projects;
create trigger guard_public_daily_setting before insert or update on public.projects
for each row execute function public.guard_public_daily_setting();

create or replace function public.get_public_daily_status()
returns jsonb language sql stable security definer
set search_path = pg_catalog, public
set statement_timeout = '15s'
as $$
  with eligible as (
    select t.*, p.client_name, p.project_name
    from public.task_history t join public.projects p on p.project_id = t.project_id
    where p.public_daily_enabled = true and coalesce(p.status, '') <> '종료' and t.due_date is not null
  ), allocations as (
    select t.client_name, t.project_name, t.due_date, coalesce(o.owner_employee_id, t.owner_employee_id) as employee_id,
      greatest(0, coalesce(o.quantity,0) * coalesce(o.standard_hours_per_unit,0) *
        case t.photo_type when '화보컷' then 0.5 when '비화보컷' then 1.5 else 1 end) as hours
    from eligible t join public.output_history o on o.task_id = t.task_id
    union all
    select t.client_name, t.project_name, t.due_date, t.owner_employee_id, coalesce(t.planned_hours,0)
    from eligible t where not exists (select 1 from public.output_history o where o.task_id = t.task_id)
  ), grouped as (
    select a.client_name as client, a.project_name as project, a.due_date::date as "dueDate",
      md5(coalesce(a.employee_id,'__unassigned__')) as key,
      coalesce(e.employee_name,'미배정') as name, sum(a.hours) as hours
    from allocations a left join public.employees e on e.employee_id = a.employee_id
    group by a.client_name,a.project_name,a.due_date,a.employee_id,e.employee_name
  )
  select coalesce(jsonb_agg(to_jsonb(g) order by g."dueDate",g.project,g.name),'[]'::jsonb) from grouped g;
$$;
revoke all on function public.get_public_daily_status() from public;
grant execute on function public.get_public_daily_status() to anon, authenticated;
-- Do not grant anon SELECT access to employees, tasks, outputs, or projects.
commit;
notify pgrst, 'reload schema';
