begin;

alter table public.output_rules
  add column if not exists sla_days integer;

alter table public.output_rules
  add column if not exists sla_enabled boolean not null default false;

alter table public.output_rules
  drop constraint if exists output_rules_sla_days_check;

alter table public.output_rules
  add constraint output_rules_sla_days_check
  check (sla_days >= 0);

comment on column public.output_rules.sla_days is
  '프로젝트 기본 SLA보다 우선 적용할 업무/산출물 유형별 영업일 기준. null이면 프로젝트 기본값, 0이면 당일 완료 기준.';

comment on column public.output_rules.sla_enabled is
  'true일 때만 sla_days를 유형별 SLA로 적용. 기존 0 기본값과 의도적으로 설정한 당일 SLA를 구분.';

commit;
