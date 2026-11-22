begin;

create table if not exists public.app_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_id text not null unique,
  display_name text not null,
  team_name text,
  subgroup_name text,
  role text not null default 'operator_no_profit'
    check (role in ('admin', 'operator_all', 'operator_no_profit', 'operator_output_admin', 'portal', 'worker')),
  status text not null default '사용'
    check (status in ('사용', '중지')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_user_projects (
  user_id uuid not null references public.app_profiles(user_id) on delete cascade,
  project_name text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, project_name)
);

create or replace function public.current_user_is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_profiles
    where user_id = auth.uid()
      and role = 'admin'
      and status = '사용'
  );
$$;

revoke all on function public.current_user_is_app_admin() from public;
grant execute on function public.current_user_is_app_admin() to authenticated;

alter table public.app_profiles enable row level security;
alter table public.app_user_projects enable row level security;

drop policy if exists "profile_select_self_or_admin" on public.app_profiles;
create policy "profile_select_self_or_admin"
on public.app_profiles for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_app_admin());

drop policy if exists "profile_write_admin" on public.app_profiles;
create policy "profile_write_admin"
on public.app_profiles for all
to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists "project_select_self_or_admin" on public.app_user_projects;
create policy "project_select_self_or_admin"
on public.app_user_projects for select
to authenticated
using (user_id = auth.uid() or public.current_user_is_app_admin());

drop policy if exists "project_write_admin" on public.app_user_projects;
create policy "project_write_admin"
on public.app_user_projects for all
to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

grant select on public.app_profiles to authenticated;
grant select on public.app_user_projects to authenticated;
grant insert, update, delete on public.app_profiles to authenticated;
grant insert, update, delete on public.app_user_projects to authenticated;

commit;

-- 최초 관리자 계정 생성 순서
-- 1) Supabase Dashboard > Authentication > Users에서 아래 이메일로 사용자를 생성합니다.
--    admin@users.agency-ops.app
-- 2) 사용자를 만든 다음 아래 SQL의 주석을 해제해 실행합니다.
--
-- insert into public.app_profiles
--   (user_id, login_id, display_name, team_name, subgroup_name, role, status)
-- select
--   id, 'admin', '관리자', '관리팀', null, 'admin', '사용'
-- from auth.users
-- where email = 'admin@users.agency-ops.app'
-- on conflict (user_id) do update set
--   login_id = excluded.login_id,
--   display_name = excluded.display_name,
--   team_name = excluded.team_name,
--   subgroup_name = excluded.subgroup_name,
--   role = excluded.role,
--   status = excluded.status,
--   updated_at = now();
--
-- insert into public.app_user_projects (user_id, project_name)
-- select id, project_name
-- from auth.users
-- cross join (values
--   ('롯데 홈쇼핑 운영'),
--   ('멤버십 앱 구축'),
--   ('롯데손해보험')
-- ) as assigned(project_name)
-- where email = 'admin@users.agency-ops.app'
-- on conflict do nothing;
