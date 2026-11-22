const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
function fn(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
const context = vm.createContext({
  tasks: [], members: [{ name: 'A', _id: 'E1', team: 'T' }], workers: {}, projectAssignments: {},
  state: { year: '전체', project: 'P' }, PHOTO_TYPES: ['일반', '화보컷', '비화보컷'],
  deliverables: [{ name: '배너', project: 'P', standardHours: 2 }],
  activeProjectConfigs: () => [{ project: 'P', client: 'C' }],
  projectUsesStages: () => false,
  findDeliverableMatch: () => ({ deliverable: {name:'배너',standardHours:2},score:1,matchType:'일치' }),
  normalizeSlaResponsibility: () => '미확인', scheduleChangeResponsibility: () => '',
  appendTaskScheduleChange: () => {}, taskSlaRule: () => ({ configured:false,limit:0 }), syncTaskSlaViolations: () => {},
  effortLabel: (n) => `${n}H`, monthlyCapacity: () => ({totalHours:160}),
  memberSelectedPeriodCapacity: () => 160,
  productivityBufferForRows: (_,type) => type==='project'?120:150,
  productivityBuffersForProject: () => ({projectBuffer:120,companyBuffer:150}),
  clamp: (v,min,max) => Math.min(max,Math.max(min,v)),
});
const names = ['pct','formatNumber','normalizeImportKey','normalizeDeliverableKey','importCompositeKey',
  'parseOutputText','aggregateOutputDetails','taskOutputDetails','outputImportScope','outputResourceMultiplier',
  'outputResourceHours','outputScopeNote','readOutputScope','mergeTaskOutputDetails','normalizePhotoType',
  'photoTypeMultiplier','normalizeEffortBufferPct','importedEffortMultiplier','importedEffortBufferPct',
  'isValidImportedEffortMultiplier','adjustedEffortHours','outputEffortHours','resourceEffortHours',
  'taskBaseStandardHours','recalculateTaskHours','taskResourceHours','taskEffortAdjustmentLabel',
  'emptyExcelCountSummary','excelDateToIso','importExcelTaskRows','normalizeDbTaskOutputs',
  'assignedOutputDetails','memberStandardHours','memberResourceHours','taskOutputDetailsForRows',
  'parseProductivityBuffer','bufferedUtilizationRate','productivityLoadForTasks','renderTeamDetailRankingCharts'];
vm.runInContext(names.map(fn).join('\n'),context);
const row=(sub,count,factor)=>({'業務':'',業務番号:'', '업무번호':'T1','보조번호':sub,'업무명':'테스트','프로젝트':'P','결과물 분류':'배너','Count':count,'작업자':'A','팀명':'T','접수일':'2026-07-01','완료일':'2026-08-01','개별 버퍼(배수)':factor});
context.importExcelTaskRows([row('1',10,3),row('20',2,2),row('20',1,1.5),row('1',10,3)],'test.xlsx');
assert.equal(context.tasks.length,1);
const task=context.tasks[0];
assert.equal(task.standardHours,26); // 13 × 2H, 배수 미적용 실적
assert.equal(context.taskResourceHours(task),31); // 20 + 8 + 3, 일반 행의 3배는 무시
assert.equal(context.state.excelImport.duplicate,1);
assert.equal(context.memberResourceHours(task,context.members[0]),31);
const persisted=task.outputDetails.map((d,i)=>({output_id:`O${i}`,deliverable_name:d.name,owner_employee_id:'E1',quantity:d.count,standard_hours_per_unit:2,note:context.outputScopeNote(d)}));
const restored=context.normalizeDbTaskOutputs('P',persisted);
assert.equal(restored.rows.length,3); // 같은 산출물도 보조번호/배수 구분 보존
const loaded={...task,outputDetails:restored.rows.map(r=>({name:r.deliverable_name,count:r.quantity,standardHoursPerUnit:r.standard_hours_per_unit,ownerEmployeeId:r.owner_employee_id,...context.readOutputScope(r.note)}))};
assert.equal(context.taskResourceHours(loaded),31);
assert.equal(context.bufferedUtilizationRate(192,160,120),100);
assert.equal(context.bufferedUtilizationRate(192,160,150),80);
assert.equal(context.parseProductivityBuffer('120%'),120);
assert.equal(context.parseProductivityBuffer(-50),100);
assert.equal(context.parseOutputText('배너\n예시(12)').count,12);
const html=context.renderTeamDetailRankingCharts([]);
const titles=[...html.matchAll(/<header><strong>(.*?)<\/strong>/g)].map(m=>m[1]);
assert.deepEqual(titles.map(title=>title.replace(/ · \d+명$/, '')),['절대 가동률 순위','인당 생산량 순위','건수 기준 순위','1일 평균 H 순위','프로젝트 기준 순위','회사 기준 순위']);
assert.ok(html.includes('목표 120%')); assert.ok(html.includes('목표 150%'));
console.log('PASS: import scope, normal duplicates, 20 accumulation, DB metadata roundtrip, member hours, 120/150 targets, newline quantities, six-chart order');
