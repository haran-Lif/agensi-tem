import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const read = p => fs.readFile(new URL(p, import.meta.url), 'utf8');
const db = new PGlite({extensions:{pgcrypto}});
try {
 await db.exec(await read('platform.sql'));
 await db.exec(await read('../../supabase/bootstrap/001_schema.sql'));
 await db.exec(await read('../../supabase/bootstrap/002_defaults.sql'));
 await db.exec(await read('../../supabase/bootstrap/002_defaults.sql'));
 const scalar = async sql => Object.values((await db.query(sql)).rows[0])[0];
 assert.equal(await scalar("select count(*)::int from pg_tables where schemaname='public'"),23);
 assert.equal(await scalar("select count(*)::int from pg_policies where schemaname in ('public','storage')"),46);
 assert.equal(await scalar("select count(*)::int from public.app_settings"),4);
 assert.equal(await scalar("select count(*)::int from storage.buckets where public=false"),2);
 await assert.rejects(db.exec(await read('../../supabase/bootstrap/001_schema.sql')),/Existing app objects/);
 await db.exec('rollback;');
 await assert.rejects(db.exec(await read('../../supabase/bootstrap/003_first_admin.sql')),/UUID/);
 await db.exec('rollback;');
 const admin='10000000-0000-0000-0000-000000000001';
 await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${admin}','admin@users.agency-ops.app',now());`);
 await db.exec((await read('../../supabase/bootstrap/003_first_admin.sql')).replaceAll('00000000-0000-0000-0000-000000000000\'; -- Auth',`${admin}'; -- Auth`).replace("admin_login_id text := 'CHANGE_ME'","admin_login_id text := 'admin'"));
 await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
 assert.equal(await scalar('select public.current_user_is_app_admin()'),true);
 // Exercise current RPC, including generated confirmed_at and operator_output_admin role.
 const user=(await db.query("select * from public.app_admin_upsert_auth_account('worker01','test-only-password','테스트 작업자','','','operator_output_admin','사용','{}')")).rows[0];
 assert.ok(user.account_user_id);
 await db.query("select * from public.app_admin_upsert_auth_account('worker01','','테스트 작업자','','','operator_output_admin','사용','{}')");
 await db.exec("select public.app_save_setting('branding','{\"companyName\":\"새 프로젝트\"}');");
 await db.exec('reset role;');
 await db.exec(await read('../../supabase/bootstrap/002_defaults.sql'));
 assert.equal(await scalar("select setting_value->>'companyName' from app_settings where setting_key='branding'"),'새 프로젝트');
 await db.exec("set role anon; select set_config('request.jwt.claim.sub','',false);");
 assert.deepEqual(await scalar('select public.get_public_daily_status()'),[]);
 await assert.rejects(db.query('select * from employees'),/permission denied/);
 await assert.rejects(db.query("select public.app_save_setting('branding','{}')"),/permission denied/);
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${user.account_user_id}',false);`);
 assert.equal(await scalar('select count(*)::int from employee_review_entries'),0);
 await assert.rejects(db.query("select public.app_save_setting('branding','{}')"),/관리자/);
 await assert.rejects(db.query("select * from public.app_admin_upsert_auth_account('bad','badpass','bad','','','admin','사용','{}')"),/관리자/);
 // Exercise empty-project setup, completion-date aggregate and private Storage policies.
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${admin}',false);
 insert into teams(team_id,team_name) values('t','테스트팀');
 insert into positions(position_id,position_name) values('p','디자이너');
 insert into employees(employee_id,employee_name,team_id,position_id,grade,employment_status)
 values('e','테스트 작업자','t','p','초급','재직');
 insert into projects(project_id,client_name,project_name,direction,status,start_date)
 values('pr','테스트 고객','테스트 프로젝트','운영','진행','2026-11-01');
 insert into project_members(assignment_id,project_id,employee_id,role,assigned_from)
 values('pm','pr','e','작업자','2026-11-01');
 insert into task_history(task_id,project_id,request_date,task_title,task_type,request_channel,difficulty,owner_employee_id,status,due_date)
 values('task','pr','2026-11-01','테스트 업무','일반','수기','일반','e','요청','2026-11-27');
 insert into output_history(output_id,task_id,project_id,deliverable_name,quantity,standard_hours_per_unit)
 values('o','task','pr','테스트 산출물',2,3);
 insert into employee_review_entries(entry_id,employee_id,project_id,entry_kind,effective_month,title,content)
 values('20000000-0000-0000-0000-000000000001','e','pr','feedback','2026-11-01','테스트 피드백','내용');
 insert into employee_review_entries(entry_id,employee_id,project_id,entry_kind,source_id,effective_month,title,content,points)
 values('20000000-0000-0000-0000-000000000002','e','pr','score','20000000-0000-0000-0000-000000000001','2026-11-01','테스트 점수','내용',1);
 insert into storage.objects(bucket_id,name) values('employee-review-images','pr/test.png');`);
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
 assert.deepEqual(await scalar('select get_public_daily_status()'),[]);
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${admin}',false);
 update projects set public_daily_enabled=true where project_id='pr';`);
 await db.exec("reset role;set role anon;select set_config('request.jwt.claim.sub','',false);");
 const aggregate=await scalar('select get_public_daily_status()');
 assert.equal(aggregate[0].hours,6);
 assert.equal(aggregate[0].dueDate,'2026-11-27');
 await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${user.account_user_id}',false);`);
 assert.equal(await scalar('select count(*)::int from task_history'),1);
 assert.equal(await scalar('select count(*)::int from employee_review_entries'),0);
 assert.equal(await scalar('select count(*)::int from storage.objects'),0);
 await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values('employee-review-images','pr/denied.png');"),/row-level security/);
 await db.exec('reset role;');
 const snapshot=JSON.parse(await read('../../backups/schema/2026-11-24-public-schema.json'));
 for (const t of snapshot.tables) {
   const columns=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",[t.name])).rows.map(r=>r.column_name);
   assert.deepEqual(columns,t.columns.map(c=>c.name));
   assert.equal(await scalar(`select count(*)::int from pg_constraint where conrelid='public."${t.name}"'::regclass and contype <> 'n'`),(t.constraints||[]).length);
 }
 const checks=(await db.exec(await read('../../supabase/bootstrap/004_verify.sql'))).flatMap(r=>r.rows||[]);
 assert.ok(checks.length>=28);
 assert.ok(checks.every(r=>r.ok),JSON.stringify(checks.filter(r=>!r.ok)));
 console.log('PASS: CRUD, review trigger, Storage policy, public opt-in/date/hour aggregate, table-column/constraint parity.');
 console.log('PASS: fresh install, seeds/idempotency, re-install guard, admin setup, account RPC create/update, settings RPC, anon isolation, non-admin restrictions.');
 console.log('Scope: PostgreSQL WASM with Auth/Storage SQL fixtures; hosted GoTrue/PostgREST/Storage HTTP not tested.');
} finally { await db.close(); }
