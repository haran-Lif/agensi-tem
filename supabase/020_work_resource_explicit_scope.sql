begin;

-- 업무 자료는 팀 매칭이 아니라 계정에 직접 지정한 프로젝트만 접근합니다.
create or replace function public.current_user_explicit_project_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select p.project_id
  from public.app_user_projects aup
  join public.projects p
    on p.project_name = aup.project_name
  where aup.user_id = auth.uid()
    and coalesce(p.status, '진행') <> '종료';
$$;

revoke all on function public.current_user_explicit_project_ids() from public;
grant execute on function public.current_user_explicit_project_ids() to authenticated;

drop policy if exists work_resources_read_scope on public.work_resources;
create policy work_resources_read_scope
on public.work_resources for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_explicit_project_ids())
);

drop policy if exists work_resources_write_scope on public.work_resources;
create policy work_resources_write_scope
on public.work_resources for all to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
    and project_id in (select public.current_user_explicit_project_ids())
  )
)
with check (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
    and project_id in (select public.current_user_explicit_project_ids())
  )
);

drop policy if exists work_resource_images_read_scope on storage.objects;
create policy work_resource_images_read_scope
on storage.objects for select to authenticated
using (
  bucket_id = 'work-resource-images'
  and (
    public.current_user_is_app_admin()
    or (storage.foldername(name))[1] in (select public.current_user_explicit_project_ids())
  )
);

drop policy if exists work_resource_images_write_scope on storage.objects;
create policy work_resource_images_write_scope
on storage.objects for all to authenticated
using (
  bucket_id = 'work-resource-images'
  and (
    public.current_user_is_app_admin()
    or (
      public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
      and (storage.foldername(name))[1] in (select public.current_user_explicit_project_ids())
    )
  )
)
with check (
  bucket_id = 'work-resource-images'
  and (
    public.current_user_is_app_admin()
    or (
      public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
      and (storage.foldername(name))[1] in (select public.current_user_explicit_project_ids())
    )
  )
);

commit;

notify pgrst, 'reload schema';

-- 적용 확인: DBeaver 직접 연결에서는 auth.uid()가 없어 0행일 수 있습니다.
-- select * from public.current_user_explicit_project_ids();
