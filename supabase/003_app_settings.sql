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
values ('productivity', '{"workingDays": 21, "buffer": 15}'::jsonb)
on conflict (setting_key) do nothing;

commit;
