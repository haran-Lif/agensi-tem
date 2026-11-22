begin;

alter table public.projects
  add column if not exists absolute_daily_hours numeric(3, 1);

update public.projects
set absolute_daily_hours = 7
where absolute_daily_hours is null
   or absolute_daily_hours not in (7, 8);

alter table public.projects
  alter column absolute_daily_hours set default 7,
  alter column absolute_daily_hours set not null;

alter table public.projects
  drop constraint if exists projects_absolute_daily_hours_check;

alter table public.projects
  add constraint projects_absolute_daily_hours_check
  check (absolute_daily_hours in (7, 8));

insert into public.app_settings (setting_key, setting_value)
values (
  'work_calendar',
  jsonb_build_object(
    'mode', 'manual',
    'apiUrl', '',
    'months', '{}'::jsonb
  )
)
on conflict (setting_key) do nothing;

notify pgrst, 'reload schema';

commit;
