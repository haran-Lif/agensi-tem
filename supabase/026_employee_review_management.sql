begin;
create table if not exists public.employee_review_entries (
  entry_id uuid primary key,
  employee_id text not null references public.employees(employee_id),
  project_id text not null references public.projects(project_id),
  entry_kind text not null check (entry_kind in ('feedback', 'score')),
  source_id uuid references public.employee_review_entries(entry_id),
  effective_month date not null check (extract(day from effective_month) = 1),
  category text not null default '피드백',
  title text not null check (length(trim(title)) > 0),
  content text not null check (length(trim(content)) > 0),
  reference_url text not null default '' check (reference_url = '' or reference_url ~* '^https?://'),
  image_paths jsonb not null default '[]'::jsonb check (jsonb_typeof(image_paths) = 'array' and jsonb_array_length(image_paths) <= 20),
  pinned boolean not null default false,
  points numeric(6,2) not null default 0 check (points between -120 and 120),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  check ((entry_kind = 'feedback' and points = 0 and source_id is null)
    or (entry_kind = 'score' and points <> 0 and source_id is not null))
);
create index if not exists employee_review_period_idx on public.employee_review_entries(employee_id, effective_month, project_id);
alter table public.employee_review_entries enable row level security;
revoke all on public.employee_review_entries from anon, authenticated;
grant select, insert on public.employee_review_entries to authenticated;
drop policy if exists employee_review_admin_read on public.employee_review_entries;
create policy employee_review_admin_read on public.employee_review_entries for select to authenticated
using (public.current_user_is_app_admin());
drop policy if exists employee_review_admin_insert on public.employee_review_entries;
create policy employee_review_admin_insert on public.employee_review_entries for insert to authenticated
with check (public.current_user_is_app_admin() and created_by = auth.uid());
create or replace function public.validate_employee_review_entry()
returns trigger language plpgsql set search_path = public as $$
declare source_record public.employee_review_entries;
begin
  new.created_by := auth.uid();
  new.created_at := now();
  if new.entry_kind = 'score' then
    select * into source_record from public.employee_review_entries where entry_id = new.source_id;
    if not found or source_record.entry_kind <> 'feedback'
      or source_record.employee_id <> new.employee_id or source_record.project_id <> new.project_id then
      raise exception '점수 조정은 동일 직원 및 프로젝트의 피드백 자료와 연결해야 합니다.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists validate_employee_review_entry on public.employee_review_entries;
create trigger validate_employee_review_entry before insert on public.employee_review_entries
for each row execute function public.validate_employee_review_entry();

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('employee-review-images', 'employee-review-images', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
drop policy if exists employee_review_images_admin_read on storage.objects;
create policy employee_review_images_admin_read on storage.objects for select to authenticated
using (bucket_id = 'employee-review-images' and public.current_user_is_app_admin());
drop policy if exists employee_review_images_admin_insert on storage.objects;
create policy employee_review_images_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'employee-review-images' and public.current_user_is_app_admin());
drop policy if exists employee_review_images_admin_delete on storage.objects;
create policy employee_review_images_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'employee-review-images' and public.current_user_is_app_admin());
commit;
notify pgrst, 'reload schema';
