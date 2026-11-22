begin;

-- 운영자/실무자의 프로젝트 권한은 계정별 수동 지정 대신
-- app_profiles.team_name -> teams.team_name -> projects.assigned_team_id로 계산합니다.
-- 고객 포털 계정만 기존 app_user_projects의 명시적 프로젝트 지정을 유지합니다.
create or replace function public.current_user_project_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  with current_profile as (
    select p.user_id, p.role, p.team_name
    from public.app_profiles p
    where p.user_id = auth.uid()
      and p.status = '사용'
    limit 1
  )
  select pr.project_id
  from current_profile cp
  join public.teams t
    on t.team_name = cp.team_name
  join public.projects pr
    on pr.assigned_team_id = t.team_id
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

comment on function public.current_user_project_ids() is
  '운영자/실무자는 직원 팀과 프로젝트 진행 팀 매칭으로, 포털은 app_user_projects로 접근 프로젝트를 계산';

commit;

select pg_notify('pgrst', 'reload schema');

-- 적용 확인
-- HTML 로그인 세션에서는 현재 계정의 팀 매칭 프로젝트가 반환됩니다.
-- DBeaver 직접 연결에서는 auth.uid()가 없으므로 0행일 수 있습니다.
-- select * from public.current_user_project_ids();
