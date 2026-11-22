begin;

create table if not exists public.upload_batches (
  batch_id text primary key,
  file_name text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_name text,
  uploaded_at timestamptz not null default now(),
  total_rows integer not null default 0 check (total_rows >= 0),
  added_rows integer not null default 0 check (added_rows >= 0),
  updated_rows integer not null default 0 check (updated_rows >= 0),
  duplicate_rows integer not null default 0 check (duplicate_rows >= 0),
  error_rows integer not null default 0 check (error_rows >= 0),
  status text not null default '반영완료' check (status in ('반영완료', '되돌림')),
  rolled_back_at timestamptz,
  rolled_back_by uuid references auth.users(id) on delete set null
);

create table if not exists public.upload_batch_items (
  item_id text primary key,
  batch_id text not null references public.upload_batches(batch_id) on delete cascade,
  task_id text,
  row_number integer,
  sub_number text,
  action text not null check (action in ('신규 추가', '기존 갱신', '중복 제외', '형식 오류')),
  reason text,
  before_task jsonb,
  after_task jsonb
);

create index if not exists upload_batches_uploaded_at_idx on public.upload_batches(uploaded_at desc);
create index if not exists upload_batch_items_batch_id_idx on public.upload_batch_items(batch_id);
create index if not exists upload_batch_items_task_id_idx on public.upload_batch_items(task_id);

alter table public.upload_batches enable row level security;
alter table public.upload_batch_items enable row level security;

drop policy if exists upload_batches_admin_all on public.upload_batches;
create policy upload_batches_admin_all on public.upload_batches
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

drop policy if exists upload_batch_items_admin_all on public.upload_batch_items;
create policy upload_batch_items_admin_all on public.upload_batch_items
for all to authenticated
using (public.current_user_is_app_admin())
with check (public.current_user_is_app_admin());

grant select, insert, update, delete on public.upload_batches to authenticated;
grant select, insert, update, delete on public.upload_batch_items to authenticated;

commit;
