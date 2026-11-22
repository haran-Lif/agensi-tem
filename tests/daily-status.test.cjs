const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({members:[{_id:'a',name:'가'},{_id:'b',name:'나'}],taskOutputDetails:t=>t.outputDetails||[],deliverableRuleFor:()=>({standardHours:9}),outputEffortHours:h=>h});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../daily-status.js'),'utf8'),ctx);
const api=ctx.DailyStatus;
const items=[
{dueDate:'2026-11-10',completedDate:'2026-11-11',ownerEmployeeId:'a',standardHours:3,effortBufferPct:100},
{dueDate:'2026-11-10',ownerEmployeeId:'a',outputDetails:[{ownerEmployeeId:'b',count:2,standardHoursPerUnit:0.35},{count:3,standardHoursPerUnit:1},{ownerEmployeeId:'b',count:1,standardHoursPerUnit:0}]},
{dueDate:'2026-11-11',ownerEmployeeId:'a',standardHours:100},
{completedDate:'2026-11-10',ownerEmployeeId:'a',standardHours:100},
{dueDate:'2026-11-10',standardHours:2}
];
const rows=api.totals(items,'2026-11-10');
assert.equal(rows.find(r=>r.name==='가').hours,6);
assert.equal(rows.find(r=>r.name==='나').hours,.7);
assert.equal(rows.find(r=>r.name==='미배정').hours,2);
assert.equal(api.dateOf({dueDate:'2026-02-30'}),'');
assert.equal(api.dateOf({dueDate:'2028-02-29'}),'2028-02-29');
assert.equal(api.totals(items,'2026-11-12').length,0);
console.log('일간 완료예정일·담당자별 배분·수동공수·0단가·버퍼 제외·날짜 검증 통과');
const calendar=[{dueDate:'2026-07-02'},{dueDate:'2026-07-17'},{dueDate:'2026-07-17'},{dueDate:'2026-09-04'},{dueDate:'2025-12-31'},{dueDate:'2026-02-30'},{}];
let options=api.dateOptions(calendar,{year:'2026',month:'07',day:'10'});
assert.deepEqual(Array.from(options.months),['07','09']);
assert.deepEqual(Array.from(options.days),['02','17']);
assert.equal(options.date,'2026-07-17');
assert.equal(api.dateOptions(calendar,{year:'2026',month:'08',day:'10'}).date,'2026-09-04');
assert.equal(api.dateOptions(calendar,{year:'2026',month:'07',day:'02'}).date,'2026-07-02');
options=api.dateOptions([],{year:'2026',month:'07',day:'02'});
assert.equal(options.date,'');
assert.equal(options.years.length,0);
assert.equal(options.months.length,0);
assert.equal(options.days.length,0);
console.log('등록된 연월일만 표시·중복 제거·유효 선택 유지·자동 변경·빈 목록 검증 통과');
