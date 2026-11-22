begin;

-- 운영자/실무자는 최종 프로젝트 투입 인원(project_members)을 기준으로 접근합니다.
-- 여러 팀을 선택하면 해당 팀원들이 project_members에 저장되고,
-- 팀 외 개별 인원도 같은 테이블에 추가되어 동일한 프로젝트 권한을 받습니다.
create or replace function public.current_user_project_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  with current_profile as (
    select p.user_id, p.role, p.display_name
    from public.app_profiles p
    where p.user_id = auth.uid()
      and p.status = '사용'
    limit 1
  )
  select distinct pm.project_id
  from current_profile cp
  join public.employees e
    on e.employee_name = cp.display_name
   and coalesce(e.employment_status, '재직') <> '퇴사'
  join public.project_members pm
    on pm.employee_id = e.employee_id
   and pm.active_yn = 'Y'
  join public.projects pr
    on pr.project_id = pm.project_id
  where cp.role <> 'portal'
    and coalesce(pr.status, '진행') <> '종료'

  union

  select pr.project_id
  from current_profile cp
  join public.app_user_projects aup
    on aup.user_id = cp.user_id
  join public.projects pr
    on pr.project_name = aup.project_name
  where cp.role = 'portal'
    and coalesce(pr.status, '진행') <> '종료';
$$;

revoke all on function public.current_user_project_ids() from public;
grant execute on function public.current_user_project_ids() to authenticated;

-- 업무 자료도 동일한 최종 프로젝트 지정자를 사용합니다.
create or replace function public.current_user_explicit_project_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select * from public.current_user_project_ids();
$$;

revoke all on function public.current_user_explicit_project_ids() from public;
grant execute on function public.current_user_explicit_project_ids() to authenticated;

comment on function public.current_user_project_ids() is
  '운영자/실무자는 project_members 최종 투입 인원, 포털은 app_user_projects 기준으로 접근 프로젝트를 계산';

commit;

notify pgrst, 'reload schema';

-- 적용 후 로그인 계정에서 확인:
-- select * from public.current_user_project_ids();
