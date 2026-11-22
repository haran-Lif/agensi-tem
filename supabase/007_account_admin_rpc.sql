begin;

create extension if not exists pgcrypto with schema extensions;

drop function if exists public.app_admin_upsert_auth_account(text, text, text, text, text, text, text, text[]);

create or replace function public.app_admin_upsert_auth_account(
  p_login_id text,
  p_password text,
  p_display_name text,
  p_team_name text,
  p_subgroup_name text,
  p_role text,
  p_status text,
  p_projects text[] default '{}'
)
returns table(account_user_id uuid, account_email text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_login_id text := lower(trim(p_login_id));
  v_email text;
  v_user_id uuid;
  v_now timestamptz := now();
begin
  if not public.current_user_is_app_admin() then
    raise exception '관리자 권한이 필요합니다.';
  end if;

  if v_login_id !~ '^[a-z0-9._-]{2,50}$' then
    raise exception '아이디는 영문, 숫자, 마침표, 밑줄, 하이픈만 사용할 수 있습니다.';
  end if;

  if coalesce(trim(p_display_name), '') = '' then
    raise exception '직원명을 입력하세요.';
  end if;

  if p_role not in ('admin', 'operator_all', 'operator_no_profit', 'operator_output_admin', 'portal', 'worker') then
    raise exception '올바르지 않은 권한입니다.';
  end if;

  if p_status not in ('사용', '중지') then
    raise exception '올바르지 않은 상태입니다.';
  end if;

  v_email := v_login_id || '@users.agency-ops.app';

  select p.user_id
    into v_user_id
  from public.app_profiles p
  where lower(p.login_id) = v_login_id
  limit 1;

  if v_user_id is null then
    select u.id
      into v_user_id
    from auth.users u
    where lower(u.email) = v_email
    limit 1;
  end if;

  if v_user_id is null then
    if coalesce(p_password, '') = '' or length(p_password) < 6 then
      raise exception '신규 계정의 초기 비밀번호는 6자 이상 입력하세요.';
    end if;

    v_user_id := extensions.gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      v_now,
      v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false,
      v_now,
      v_now
    );
  elsif coalesce(p_password, '') <> '' then
    if length(p_password) < 6 then
      raise exception '변경 비밀번호는 6자 이상 입력하세요.';
    end if;

    update auth.users
      set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, v_now),
          updated_at = v_now
    where id = v_user_id;
  end if;

  insert into public.app_profiles (
    user_id,
    login_id,
    display_name,
    team_name,
    subgroup_name,
    role,
    status
  )
  values (
    v_user_id,
    v_login_id,
    trim(p_display_name),
    nullif(trim(coalesce(p_team_name, '')), ''),
    nullif(trim(coalesce(p_subgroup_name, '')), ''),
    p_role,
    p_status
  )
  on conflict on constraint app_profiles_pkey do update set
    login_id = excluded.login_id,
    display_name = excluded.display_name,
    team_name = excluded.team_name,
    subgroup_name = excluded.subgroup_name,
    role = excluded.role,
    status = excluded.status,
    updated_at = now();

  delete from public.app_user_projects
  where app_user_projects.user_id = v_user_id;

  insert into public.app_user_projects (user_id, project_name)
  select v_user_id, trim(assigned.project_name)
  from unnest(coalesce(p_projects, '{}')) as assigned(project_name)
  where nullif(trim(assigned.project_name), '') is not null
  on conflict do nothing;

  return query select v_user_id, v_email;
end;
$$;

revoke all on function public.app_admin_upsert_auth_account(text, text, text, text, text, text, text, text[]) from public;
grant execute on function public.app_admin_upsert_auth_account(text, text, text, text, text, text, text, text[]) to authenticated;

commit;
