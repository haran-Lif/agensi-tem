begin;

create table if not exists public.work_resources (
  resource_id text primary key,
  project_id text not null references public.projects(project_id) on update cascade on delete cascade,
  category text not null default '공통사항'
    check (category in ('공지사항', '공통사항', '작업 가이드', '참고 자료')),
  title text not null,
  content text not null,
  reference_url text,
  image_paths jsonb not null default '[]'::jsonb,
  pinned_yn char(1) not null default 'N' check (pinned_yn in ('Y', 'N')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  active_yn char(1) not null default 'Y' check (active_yn in ('Y', 'N'))
);

alter table public.work_resources
  add column if not exists image_paths jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'work-resource-images',
  'work-resource-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists work_resources_project_updated_idx
  on public.work_resources (project_id, pinned_yn desc, updated_at desc);

alter table public.work_resources enable row level security;
grant select, insert, update, delete on public.work_resources to authenticated;

create or replace function public.current_user_explicit_project_ids()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select p.project_id
  from public.app_user_projects aup
  join public.projects p
    on p.project_name = aup.project_name
  where aup.user_id = auth.uid()
    and coalesce(p.status, '진행') <> '종료';
$$;

revoke all on function public.current_user_explicit_project_ids() from public;
grant execute on function public.current_user_explicit_project_ids() to authenticated;

drop policy if exists work_resources_read_scope on public.work_resources;
create policy work_resources_read_scope
on public.work_resources for select to authenticated
using (
  public.current_user_is_app_admin()
  or project_id in (select public.current_user_explicit_project_ids())
);

drop policy if exists work_resources_write_scope on public.work_resources;
create policy work_resources_write_scope
on public.work_resources for all to authenticated
using (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
    and project_id in (select public.current_user_explicit_project_ids())
  )
)
with check (
  public.current_user_is_app_admin()
  or (
    public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
    and project_id in (select public.current_user_explicit_project_ids())
  )
);

drop policy if exists work_resource_images_read_scope on storage.objects;
create policy work_resource_images_read_scope
on storage.objects for select to authenticated
using (
  bucket_id = 'work-resource-images'
  and (
    public.current_user_is_app_admin()
    or (storage.foldername(name))[1] in (select public.current_user_explicit_project_ids())
  )
);

drop policy if exists work_resource_images_write_scope on storage.objects;
create policy work_resource_images_write_scope
on storage.objects for all to authenticated
using (
  bucket_id = 'work-resource-images'
  and (
    public.current_user_is_app_admin()
    or (
      public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
      and (storage.foldername(name))[1] in (select public.current_user_explicit_project_ids())
    )
  )
)
with check (
  bucket_id = 'work-resource-images'
  and (
    public.current_user_is_app_admin()
    or (
      public.current_user_app_role() in ('operator_all', 'operator_no_profit', 'operator_output_admin')
      and (storage.foldername(name))[1] in (select public.current_user_explicit_project_ids())
    )
  )
);

commit;

-- Make the newly created table available to PostgREST immediately.
notify pgrst, 'reload schema';
