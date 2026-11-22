const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
let config={assignmentDailyTarget:8,assignmentMonthlyTarget:100};
const members=Array.from({length:12},(_,i)=>({_id:`e${i}`,name:`직원${i}`,employmentStatus:'재직'}));
members[8].position="관리자";
members[6].employmentStatus="퇴사";
const ctx=vm.createContext({members,projectAssignments:{P:members.map(m=>m.name)},assignedProjectManagers:()=>["직원7"],projectConfig:()=>config,absoluteDailyHoursForProject:()=>7,workingDaysForMonth:()=>20,taskOutputDetails:t=>t.outputDetails||[],deliverableRuleFor:()=>null,outputEffortHours:h=>h,tasks:[
 {project:'P',dueDate:'2026-11-10',ownerEmployeeId:'e0',standardHours:8},
 {project:'P',dueDate:'2026-11-10',ownerEmployeeId:'e1',standardHours:10},
 {project:'P',dueDate:'2026-11-11',ownerEmployeeId:'e1',standardHours:95},
 {project:'Q',dueDate:'2026-11-10',ownerEmployeeId:'e0',standardHours:1000},
 {project:'P',dueDate:'2026-10-10',ownerEmployeeId:'e0',standardHours:1000}
]});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../daily-status.js'),'utf8'),ctx);
vm.runInContext(source.slice(source.indexOf('function taskRecommendationRows('),source.indexOf('function renderTaskAssigneeRecommendations(')),ctx);
let rows=ctx.taskRecommendationRows('P','2026-11-10');
assert.equal(rows.length,9); // excludes resigned, position manager and project-designated manager
assert.ok(rows.every(r=>!["e6","e7","e8"].includes(r.member._id)));
assert.equal(ctx.taskRecommendationRows("P","2026-11-01").length,9);
let a=rows.find(r=>r.member._id==='e0'),b=rows.find(r=>r.member._id==='e1');
assert.equal(a.dayRemaining,0);assert.equal(a.dayLevel,'equal');assert.equal(a.monthRemaining,92);
assert.equal(b.dayRemaining,-2);assert.equal(b.monthRemaining,-5);assert.equal(b.monthLevel,'over');
assert.equal(rows[0].dayLevel,'under');
config={assignmentDailyTarget:6,assignmentMonthlyTarget:null};
rows=ctx.taskRecommendationRows('P','2026-11-10');assert.equal(rows[0].monthTarget,120);
assert.equal(ctx.taskRecommendationRows('P','').length,0);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
assert.ok(html.indexOf('id="taskOwnerInput"')<html.indexOf('추천대상자 펼치기'));
assert.ok(html.indexOf('추천대상자 펼치기')<html.indexOf('id="taskTitleInput"'));
console.log('전체 추천 대상·프로젝트/완료예정일 범위·일/월 잔여 음수·목표 도달·월 W/D 기본값 검증 통과');
