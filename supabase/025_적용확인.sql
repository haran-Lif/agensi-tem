select
  to_regclass('public.upload_batches') is not null as upload_batches_exists,
  to_regclass('public.upload_batch_items') is not null as upload_batch_items_exists,
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('upload_batches', 'upload_batch_items')
  ) as policy_count;

-- 정상 기준: 두 exists 값이 true이고 policy_count가 2입니다.
