begin;

create table if not exists public.app_settings (
  setting_key text primary key,
  setting_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read_authenticated on public.app_settings;
create policy app_settings_read_authenticated
on public.app_settings for select
to authenticated
using (true);

drop policy if exists app_settings_write_admin on public.app_settings;
create policy app_settings_write_admin
on public.app_settings for all
to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

grant select, insert, update, delete on public.app_settings to authenticated;

insert into public.app_settings (setting_key, setting_value)
values ('productivity', '{"workingDays": 21, "projectBuffer": 15, "companyBuffer": 15, "buffer": 15}'::jsonb)
on conflict (setting_key) do update set
  setting_value = public.app_settings.setting_value || jsonb_build_object(
    'workingDays', coalesce((public.app_settings.setting_value->>'workingDays')::numeric, 21),
    'projectBuffer', coalesce(
      (public.app_settings.setting_value->>'projectBuffer')::numeric,
      (public.app_settings.setting_value->>'buffer')::numeric,
      15
    ),
    'companyBuffer', coalesce(
      (public.app_settings.setting_value->>'companyBuffer')::numeric,
      (public.app_settings.setting_value->>'buffer')::numeric,
      15
    ),
    'buffer', coalesce(
      (public.app_settings.setting_value->>'projectBuffer')::numeric,
      (public.app_settings.setting_value->>'buffer')::numeric,
      15
    )
  ),
  updated_at = now();

create or replace function public.app_save_setting(
  p_setting_key text,
  p_setting_value jsonb
)
returns public.app_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.app_settings;
begin
  if not public.current_user_is_app_admin() then
    raise exception '관리자 권한이 필요합니다.' using errcode = '42501';
  end if;

  insert into public.app_settings (
    setting_key,
    setting_value,
    updated_at,
    updated_by
  )
  values (
    p_setting_key,
    p_setting_value,
    now(),
    auth.uid()
  )
  on conflict (setting_key) do update set
    setting_value = excluded.setting_value,
    updated_at = now(),
    updated_by = auth.uid()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.app_save_setting(text, jsonb) from public;
grant execute on function public.app_save_setting(text, jsonb) to authenticated;

commit;
