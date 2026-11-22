begin;

create table if not exists public.notification_states (
  state_id text primary key,
  notification_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint notification_states_user_key_unique unique (user_id, notification_key)
);

create index if not exists notification_states_user_updated_idx
  on public.notification_states (user_id, updated_at desc);

alter table public.notification_states enable row level security;

drop policy if exists notification_states_read_scope on public.notification_states;
create policy notification_states_read_scope
on public.notification_states
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_app_admin()
);

drop policy if exists notification_states_write_scope on public.notification_states;
create policy notification_states_write_scope
on public.notification_states
for all
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_is_app_admin()
)
with check (
  user_id = auth.uid()
  or public.current_user_is_app_admin()
);

grant select, insert, update, delete on public.notification_states to authenticated;

notify pgrst, 'reload schema';

commit;
