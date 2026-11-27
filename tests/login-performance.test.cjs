const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../supabase-data.js'), 'utf8');
const appSource = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
function client(request) {
  const context = vm.createContext({ SupabaseAuth: { authenticatedRequest: request }, console: { info() {} } });
  vm.runInContext(source, context);
  return context.SupabaseData;
}
(async () => {
  let active = 0, peak = 0;
  const calls = [];
  const data = client(async url => {
    active++; peak = Math.max(peak, active); calls.push(url);
    await new Promise(resolve => setImmediate(resolve));
    active--;
    const u = new URL(url, 'https://test.invalid');
    const table = u.pathname.split('/').pop();
    if (table === 'work_resources' || table === 'employee_review_entries') throw new Error('optional missing');
    if (table === 'task_history') {
      const start = Number(u.searchParams.get('offset'));
      return Array.from({length: Math.max(0, Math.min(1000, 2501-start))}, (_,i)=>({task_id:start+i}));
    }
    return [{ table }];
  });
  const loaded = await data.loadAll();
  assert.equal(loaded.task_history.length,2501);
  assert.equal(new Set(loaded.task_history.map(r=>r.task_id)).size,2501);
  assert.equal(loaded.task_history.at(-1).task_id,2500);
  assert.equal(loaded.employee_review_ready,false);
  assert.equal(loaded.work_resources.length,0);
  assert.equal(loaded.projects[0].table,'projects');
  assert.ok(peak > 1 && peak <= 6, `data concurrency ${peak}`);
  assert.equal(calls.filter(x=>x.includes('/task_history?')).length,3);
  const ready = await client(async()=>[]).loadAll();
  assert.equal(ready.employee_review_ready,true);
  await assert.rejects(client(async url=>{
    if(url.includes('/projects?')) throw new Error('required unavailable'); return [];
  }).loadAll(), /required unavailable/);
  active=0; peak=0;
  const checked=[];
  const checkData=client(async url=>{
    active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setImmediate(resolve));active--;
    const table=new URL(url,'https://test.invalid').pathname.split('/').pop();checked.push(table);
    if(['projects','task_history'].includes(table))throw new Error('column missing');
    return [];
  });
  const issues=await checkData.validateSchema();
  assert.equal(checked.length,Object.keys(checkData.requiredColumns).length);
  assert.deepEqual(Array.from(issues,x=>x.table),['projects','task_history']);
  assert.ok(peak > 1 && peak <=4);
  // Render on 10k tasks must build scope once and skip hidden staffing computation.
  let scopeCalls=0,staffingCalls=0;
  const node={};
  const ctx={state:{view:'dashboard'},tasks:Array.from({length:10000},()=>({project:'p'})),
    PROJECT_REQUIRED_VIEWS:new Set(),$:(s)=>node,
    accessibleProjectNames:()=>{scopeCalls++;return new Set(['p']);},
    currentPeriodLabel:()=>'',filteredTasks:()=>[],renderStaffing:()=>{staffingCalls++;}};
  const start=appSource.indexOf('function renderAll()');
  const render=appSource.slice(start,appSource.indexOf('\n}',start)+2);
  for(const name of render.matchAll(/\b((?:render|sync|apply|update|schedule)\w+)\(/g)){
    if(!ctx[name[1]])ctx[name[1]]=()=>{};
  }
  vm.createContext(ctx);vm.runInContext(render,ctx);ctx.renderAll();
  assert.equal(scopeCalls,1);assert.equal(staffingCalls,0);
  ctx.state.view='staffing';ctx.renderAll();assert.equal(staffingCalls,1);
  // Login still waits for validation before mapping data / enabling persistence.
  let releaseData,releaseCheck,applied=false;
  const loginCtx={remoteAuth:{loadCurrentProfile:async()=>({role:'worker'})},
    remoteData:{loadAll:()=>new Promise(r=>{releaseData=r;}),validateSchema:()=>new Promise(r=>{releaseCheck=r;})},
    applyRemoteProfile(){},showLogin(){},applyOperationalDb(){applied=true;},
    dbRelationshipRepairNeeded:false,dbOutputRepairNeeded:false,
    initializeOperationalSignatures(){}, document:{body:{classList:{remove(){}}}},
    $:()=>({}), state:{},syncActiveViewDom(){},renderAll(){}};
  const loginStart=appSource.indexOf('async function completeRemoteLogin()');
  vm.createContext(loginCtx);vm.runInContext(appSource.slice(loginStart,appSource.indexOf('\n}',loginStart)+2),loginCtx);
  const login=loginCtx.completeRemoteLogin();await new Promise(r=>setImmediate(r));
  assert.equal(typeof releaseData,'function');assert.equal(typeof releaseCheck,'function');
  releaseData({});await new Promise(r=>setImmediate(r));assert.equal(applied,false);
  releaseCheck([]);await login;assert.equal(applied,true);
  console.log('PASS: bounded concurrent reads, full pagination, optional/required failures, all schema checks, login gate, render scope and hidden view.');
})().catch(e=>{console.error(e);process.exitCode=1;});
