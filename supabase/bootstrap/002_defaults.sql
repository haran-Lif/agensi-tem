-- Neutral defaults only; safe to repeat without overwriting configured values.
begin;
insert into public.app_settings(setting_key,setting_value) values
('branding', '{"companyName":"회사명","subtitle":"프로젝트 운영 관제","logoDataUrl":""}'::jsonb),
('productivity', '{"targetVersion":2,"workingDays":21,"projectBuffer":100,"companyBuffer":100,"projectBuffers":{}}'::jsonb),
('work_calendar', '{"mode":"manual","apiUrl":"","months":{}}'::jsonb),
('notification_rules', '{"overdueEnabled":true,"dueSoonEnabled":true,"dueSoonDays":1,"reviewEnabled":true,"reviewDays":2,"ownerEnabled":true,"outputEnabled":true,"templateEnabled":true,"contractEnabled":true,"contractDays":30}'::jsonb)
on conflict (setting_key) do nothing;
commit;
