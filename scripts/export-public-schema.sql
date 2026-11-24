-- Read-only schema evidence export; no business rows or authentication credentials.
-- Execute in the source DB. Export the single schema_snapshot cell as UTF-8 JSON.
-- This is an inspection snapshot, not a directly executable pg_dump restore file.
select jsonb_pretty(jsonb_build_object(
  'exported_at', current_timestamp,
  'schema', 'public',
  'tables', (select coalesce(jsonb_agg(jsonb_build_object(
    'name',c.relname,'kind',c.relkind,'rls_enabled',c.relrowsecurity,'rls_forced',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated) order by a.attnum)
      from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',(select jsonb_agg(jsonb_build_object('name',co.conname,'definition',pg_get_constraintdef(co.oid,true))) from pg_constraint co where co.conrelid=c.oid),
    'indexes',(select jsonb_agg(pg_get_indexdef(i.indexrelid)) from pg_index i where i.indrelid=c.oid),
    'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid,true)) from pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal)
  ) order by c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')),
  'views',(select coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'definition',pg_get_viewdef(c.oid,true))),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m')),
  'routines',(select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid),'acl',p.proacl::text)),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind in ('f','p') and not exists(select 1 from pg_depend dep where dep.classid='pg_proc'::regclass and dep.objid=p.oid and dep.deptype='e')),
  'policies',(select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) from pg_policies p where schemaname in ('public','storage')),
  'sequences',(select coalesce(jsonb_agg(to_jsonb(s)-'last_value'),'[]'::jsonb) from pg_sequences s where schemaname='public'),
  'enum_values',(select coalesce(jsonb_agg(jsonb_build_object('name',t.typname,'label',e.enumlabel,'sort_order',e.enumsortorder)),'[]'::jsonb) from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where n.nspname='public'),
  'table_grants',(select coalesce(jsonb_agg(to_jsonb(g)),'[]'::jsonb) from information_schema.role_table_grants g where table_schema='public'),
  'extensions',(select coalesce(jsonb_agg(jsonb_build_object('name',extname,'version',extversion)),'[]'::jsonb) from pg_extension)
)) as schema_snapshot;
