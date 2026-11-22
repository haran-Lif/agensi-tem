begin;

-- 실무자는 본인에게 배정된 업무의 상태와 결과물만 수정할 수 있습니다.
create or replace function public.current_user_can_edit_task_output(
  target_task_id text,
  target_project_id text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.task_history t
    where t.task_id = target_task_id
      and t.project_id = target_project_id
      and public.current_user_can_access_task(t.task_id)
  );
$$;

revoke all on function public.current_user_can_edit_task_output(text, text) from public;
grant execute on function public.current_user_can_edit_task_output(text, text) to authenticated;

drop policy if exists worker_task_history_update on public.task_history;
create policy worker_task_history_update
on public.task_history for update
to authenticated
using (
  public.current_user_app_role() = 'worker'
  and public.current_user_can_access_task(task_id)
)
with check (
  public.current_user_app_role() = 'worker'
  and public.current_user_can_access_task(task_id)
);

drop policy if exists worker_output_history_insert on public.output_history;
create policy worker_output_history_insert
on public.output_history for insert
to authenticated
with check (
  public.current_user_app_role() = 'worker'
  and owner_employee_id = public.current_user_employee_id()
  and public.current_user_can_edit_task_output(task_id, project_id)
);

drop policy if exists worker_output_history_update on public.output_history;
create policy worker_output_history_update
on public.output_history for update
to authenticated
using (
  public.current_user_app_role() = 'worker'
  and public.current_user_can_edit_task_output(task_id, project_id)
)
with check (
  public.current_user_app_role() = 'worker'
  and public.current_user_can_edit_task_output(task_id, project_id)
);

drop policy if exists worker_output_history_delete on public.output_history;
create policy worker_output_history_delete
on public.output_history for delete
to authenticated
using (
  public.current_user_app_role() = 'worker'
  and public.current_user_can_edit_task_output(task_id, project_id)
);

drop policy if exists worker_project_change_insert on public.project_changes;
create policy worker_project_change_insert
on public.project_changes for insert
to authenticated
with check (
  public.current_user_app_role() = 'worker'
  and exists (
    select 1
    from public.task_history t
    where t.project_id = project_changes.project_id
      and public.current_user_can_access_task(t.task_id)
  )
);

commit;

select pg_notify('pgrst', 'reload schema');
