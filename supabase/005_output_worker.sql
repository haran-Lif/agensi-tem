begin;

alter table public.output_history
  add column if not exists owner_employee_id text;

create index if not exists output_history_owner_employee_id_idx
  on public.output_history (owner_employee_id);

comment on column public.output_history.owner_employee_id is
  '산출물 상세 작업자 ID. 같은 업무를 여러 작업자가 나누어 수행한 경우 작업자별 집계에 사용';

commit;
