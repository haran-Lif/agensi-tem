begin;

alter table public.projects
  add column if not exists parent_project_id text;

alter table public.projects
  drop constraint if exists projects_parent_project_id_fkey;

alter table public.projects
  add constraint projects_parent_project_id_fkey
  foreign key (parent_project_id)
  references public.projects(project_id)
  on update cascade
  on delete set null;

alter table public.projects
  drop constraint if exists projects_parent_project_not_self_check;

alter table public.projects
  add constraint projects_parent_project_not_self_check
  check (parent_project_id is null or parent_project_id <> project_id);

create index if not exists projects_parent_project_id_idx
  on public.projects(parent_project_id);

comment on column public.projects.parent_project_id is
  '운영·구축 추가/확장 계약을 기존 기준 프로젝트와 묶는 프로젝트 ID';

commit;

notify pgrst, 'reload schema';

-- 적용 확인
-- select project_id, client_name, project_name, direction, parent_project_id
-- from public.projects
-- order by client_name, coalesce(parent_project_id, project_id), start_date;
