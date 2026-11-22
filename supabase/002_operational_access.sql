begin;

alter table public.projects add column if not exists unit_price numeric default 0;
alter table public.projects add column if not exists assigned_team_id text;
alter table public.projects add column if not exists sla_days integer default 0;
alter table public.teams add column if not exists base_group text;
alter table public.teams add column if not exists subgroup_name text;
alter table public.teams add column if not exists subgroups jsonb not null default '[]'::jsonb;
alter table public.employees add column if not exists subgroup_name text;

create or replace function public.current_user_project_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select p.project_id
  from public.projects p
  join public.app_user_projects aup
    on aup.project_name = p.project_name
  where aup.user_id = auth.uid();
$$;

revoke all on function public.current_user_project_ids() from public;
grant execute on function public.current_user_project_ids() to authenticated;

grant select on public.projects, public.teams, public.positions, public.employees,
  public.project_members, public.task_history, public.output_history,
  public.output_rules, public.project_changes, public.code_master
to authenticated;

grant insert, update, delete on public.projects, public.teams, public.positions,
  public.employees, public.project_members, public.task_history,
  public.output_history, public.output_rules, public.project_changes
to authenticated;

alter table public.projects enable row level security;
alter table public.teams enable row level security;
alter table public.positions enable row level security;
alter table public.employees enable row level security;
alter table public.project_members enable row level security;
alter table public.task_history enable row level security;
alter table public.output_history enable row level security;
alter table public.output_rules enable row level security;
alter table public.project_changes enable row level security;
alter table public.code_master enable row level security;

drop policy if exists projects_read_scope on public.projects;
create policy projects_read_scope on public.projects
for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

drop policy if exists teams_read_authenticated on public.teams;
create policy teams_read_authenticated on public.teams
for select to authenticated using (true);

drop policy if exists positions_read_authenticated on public.positions;
create policy positions_read_authenticated on public.positions
for select to authenticated using (true);

drop policy if exists employees_read_authenticated on public.employees;
create policy employees_read_authenticated on public.employees
for select to authenticated using (true);

drop policy if exists code_master_read_authenticated on public.code_master;
create policy code_master_read_authenticated on public.code_master
for select to authenticated using (true);

drop policy if exists project_members_read_scope on public.project_members;
create policy project_members_read_scope on public.project_members
for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

drop policy if exists task_history_read_scope on public.task_history;
create policy task_history_read_scope on public.task_history
for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

drop policy if exists output_history_read_scope on public.output_history;
create policy output_history_read_scope on public.output_history
for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

drop policy if exists output_rules_read_scope on public.output_rules;
create policy output_rules_read_scope on public.output_rules
for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

drop policy if exists project_changes_read_scope on public.project_changes;
create policy project_changes_read_scope on public.project_changes
for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write on public.projects
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists teams_admin_write on public.teams;
create policy teams_admin_write on public.teams
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists positions_admin_write on public.positions;
create policy positions_admin_write on public.positions
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists employees_admin_write on public.employees;
create policy employees_admin_write on public.employees
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists project_members_admin_write on public.project_members;
create policy project_members_admin_write on public.project_members
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists output_rules_admin_write on public.output_rules;
create policy output_rules_admin_write on public.output_rules
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists project_changes_admin_write on public.project_changes;
create policy project_changes_admin_write on public.project_changes
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists task_history_write_scope on public.task_history;
create policy task_history_write_scope on public.task_history
for all to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
)
with check (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

drop policy if exists output_history_write_scope on public.output_history;
create policy output_history_write_scope on public.output_history
for all to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
)
with check (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_project_ids())
);

commit;
