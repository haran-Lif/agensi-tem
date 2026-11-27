-- Read-only installation checks. Run after 001-003 in the new project's SQL Editor.
-- Every row should report ok=true. Does not verify hosted Auth/Storage HTTP behavior.
with expected(name) as (values
 ('Project'),('app_profiles'),('app_settings'),('app_user_projects'),('code_master'),
 ('employee_review_entries'),('employees'),('notification_states'),('output_history'),
 ('output_rules'),('positions'),('project_changes'),('project_members'),('projects'),
 ('task_history'),('teams'),('upload_batch_items'),('upload_batches'),('upload_history'),
 ('upload_output_rule_raw'),('upload_task_raw'),('work_resources'),('worker_task_status')
)
select 'table + RLS: ' || e.name as check_name, coalesce(c.relrowsecurity,false) as ok
from expected e
left join pg_namespace n on n.nspname='public'
left join pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind='r'
union all
select 'initial admin',exists(select 1 from public.app_profiles where role='admin' and status='사용')
union all
select 'default settings',count(*)=4 from public.app_settings
where setting_key in ('branding','productivity','work_calendar','notification_rules')
union all
select 'private image buckets',count(*)=2 from storage.buckets
where id in ('work-resource-images','employee-review-images') and public=false and file_size_limit=10485760
union all
select 'anonymous daily RPC',has_function_privilege('anon','public.get_public_daily_status()','EXECUTE')
union all
select 'anonymous task table blocked',not has_table_privilege('anon','public.task_history','SELECT')
order by check_name;
