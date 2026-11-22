begin;

alter table public.app_profiles
  drop constraint if exists app_profiles_role_check;

alter table public.app_profiles
  add constraint app_profiles_role_check
  check (role in ('admin', 'operator_all', 'operator_no_profit', 'operator_output_admin', 'portal', 'worker'));

create table if not exists public.worker_task_status (
  assignment_id text primary key,
  task_id text not null references public.task_history(task_id) on delete cascade,
  employee_id text not null references public.employees(employee_id) on delete cascade,
  user_id uuid not null references public.app_profiles(user_id) on delete cascade,
  status text not null default '미처리'
    check (status in ('미처리', '처리중', '보류', '완료')),
  started_at date,
  completed_at date,
  updated_at timestamptz not null default now(),
  unique (task_id, employee_id)
);

create index if not exists worker_task_status_user_id_idx
  on public.worker_task_status (user_id);
create index if not exists worker_task_status_task_id_idx
  on public.worker_task_status (task_id);

create or replace function public.current_user_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.app_profiles
  where user_id = auth.uid()
    and status = '사용'
  limit 1;
$$;

create or replace function public.current_user_employee_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select e.employee_id
  from public.app_profiles p
  join public.employees e on e.employee_name = p.display_name
  where p.user_id = auth.uid()
    and p.status = '사용'
  limit 1;
$$;

create or replace function public.current_user_can_access_task(target_task_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_history t
    left join public.output_history o on o.task_id = t.task_id
    where t.task_id = target_task_id
      and (
        t.owner_employee_id = public.current_user_employee_id()
        or o.owner_employee_id = public.current_user_employee_id()
      )
  );
$$;

revoke all on function public.current_user_app_role() from public;
revoke all on function public.current_user_employee_id() from public;
revoke all on function public.current_user_can_access_task(text) from public;
grant execute on function public.current_user_app_role() to authenticated;
grant execute on function public.current_user_employee_id() to authenticated;
grant execute on function public.current_user_can_access_task(text) to authenticated;

alter table public.worker_task_status enable row level security;
grant select, insert, update, delete on public.worker_task_status to authenticated;

drop policy if exists worker_task_status_self_or_admin on public.worker_task_status;
create policy worker_task_status_self_or_admin
on public.worker_task_status for all
to authenticated
using (user_id = auth.uid() or public.current_user_is_app_admin())
with check (
  (user_id = auth.uid() and employee_id = public.current_user_employee_id())
  or public.current_user_is_app_admin()
);

drop policy if exists task_history_read_scope on public.task_history;
create policy task_history_read_scope on public.task_history
for select to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() <> 'worker'
    and project_id in (select public.current_user_project_ids())
  )
  or (
    public.current_user_app_role() = 'worker'
    and public.current_user_can_access_task(task_id)
  )
);

drop policy if exists output_history_read_scope on public.output_history;
create policy output_history_read_scope on public.output_history
for select to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() <> 'worker'
    and project_id in (select public.current_user_project_ids())
  )
  or (
    public.current_user_app_role() = 'worker'
    and owner_employee_id = public.current_user_employee_id()
  )
);

drop policy if exists task_history_write_scope on public.task_history;
create policy task_history_write_scope on public.task_history
for all to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() <> 'worker'
    and project_id in (select public.current_user_project_ids())
  )
)
with check (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() <> 'worker'
    and project_id in (select public.current_user_project_ids())
  )
);

drop policy if exists output_history_write_scope on public.output_history;
create policy output_history_write_scope on public.output_history
for all to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() <> 'worker'
    and project_id in (select public.current_user_project_ids())
  )
)
with check (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() <> 'worker'
    and project_id in (select public.current_user_project_ids())
  )
);

commit;
