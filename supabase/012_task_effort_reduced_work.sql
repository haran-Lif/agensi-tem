begin;

alter table public.task_history
  add column if not exists effort_buffer_pct numeric not null default 0,
  add column if not exists photo_type text not null default '일반';

alter table public.employees
  add column if not exists reduced_work_yn char(1) not null default 'N',
  add column if not exists reduced_work_start_date date,
  add column if not exists reduced_work_end_date date,
  add column if not exists reduced_work_start_time time,
  add column if not exists reduced_work_end_time time,
  add column if not exists reduced_daily_hours numeric;

update public.task_history
set effort_buffer_pct = coalesce(effort_buffer_pct, 0),
    photo_type = case when photo_type in ('일반', '화보컷', '비화보컷') then photo_type else '일반' end;

update public.employees
set reduced_work_yn = case when reduced_work_yn = 'Y' then 'Y' else 'N' end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'task_history_effort_buffer_pct_check'
      and conrelid = 'public.task_history'::regclass
  ) then
    alter table public.task_history
      add constraint task_history_effort_buffer_pct_check
      check (effort_buffer_pct >= -100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'task_history_photo_type_check'
      and conrelid = 'public.task_history'::regclass
  ) then
    alter table public.task_history
      add constraint task_history_photo_type_check
      check (photo_type in ('일반', '화보컷', '비화보컷'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_reduced_work_yn_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_reduced_work_yn_check
      check (reduced_work_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'employees_reduced_work_period_check'
      and conrelid = 'public.employees'::regclass
  ) then
    alter table public.employees
      add constraint employees_reduced_work_period_check
      check (
        reduced_work_yn = 'N'
        or (
          reduced_work_start_date is not null
          and reduced_work_end_date is not null
          and reduced_work_start_date <= reduced_work_end_date
          and reduced_work_start_time is not null
          and reduced_work_end_time is not null
          and reduced_work_start_time < reduced_work_end_time
          and reduced_daily_hours > 0
        )
      );
  end if;
end
$$;

comment on column public.task_history.effort_buffer_pct is '업무 건별 공수 가감 버퍼율. -100 이상 양수/음수 허용';
comment on column public.task_history.photo_type is '일반=100%, 화보컷=50%, 비화보컷=150% 공수 배율';
comment on column public.employees.reduced_work_yn is '단축근무 적용 여부';
comment on column public.employees.reduced_daily_hours is '점심시간을 제외한 단축근무 1일 실근무시간';

commit;

select pg_notify('pgrst', 'reload schema');
