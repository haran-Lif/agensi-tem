begin;

alter table public.app_profiles
  drop constraint if exists app_profiles_role_check;

alter table public.app_profiles
  add constraint app_profiles_role_check
  check (role in (
    'admin',
    'operator_all',
    'operator_no_profit',
    'operator_output_admin',
    'portal',
    'worker'
  ));

comment on constraint app_profiles_role_check on public.app_profiles is
  '앱 로그인 권한. operator_output_admin은 운영자 메뉴와 관리자 업무 템플릿만 허용';

commit;
