-- Run as database owner in the NEW project's SQL Editor after creating an Auth user.
-- Edit these three values. No password belongs in this SQL or Git.
begin;
do $bootstrap_admin$
declare
  admin_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- Auth > Users UUID
  admin_login_id text := 'CHANGE_ME'; -- e.g. admin (lowercase)
  admin_display_name text := '관리자';
  expected_email text;
begin
  if admin_user_id = '00000000-0000-0000-0000-000000000000'::uuid
     or admin_login_id = 'CHANGE_ME' then
    raise exception '먼저 새 Auth 사용자 UUID와 로그인 ID를 입력하세요.';
  end if;
  if admin_login_id !~ '^[a-z0-9._-]{2,50}$' or length(trim(admin_display_name)) = 0 then
    raise exception '로그인 ID 또는 표시 이름을 확인하세요.';
  end if;
  expected_email := admin_login_id || '@users.agency-ops.app';
  if not exists(select 1 from auth.users where id=admin_user_id and lower(email)=expected_email and email_confirmed_at is not null) then
    raise exception '이 UUID의 Auth 사용자 이메일이 %이고 이메일 확인이 완료되어야 합니다.', expected_email;
  end if;
  if exists(select 1 from public.app_profiles where role='admin' and user_id<>admin_user_id) then
    raise exception '최초 관리자 전용 스크립트입니다. 이후 계정은 앱에서 관리하세요.';
  end if;
  insert into public.app_profiles(user_id,login_id,display_name,role,status)
  values(admin_user_id,admin_login_id,admin_display_name,'admin','사용')
  on conflict (user_id) do update set login_id=excluded.login_id,display_name=excluded.display_name,
    role='admin',status='사용',updated_at=now();
end;
$bootstrap_admin$;
commit;
