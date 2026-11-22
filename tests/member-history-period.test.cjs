const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
let selected = Array.from({length: 9}, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
const ctx = vm.createContext({
  selectedPeriodBounds: () => ({months: selected}),
  taskAssignedToMember: (task, member) => task.owner === member.name,
  taskCompletionDate: task => task.completedDate || '',
  workingDaysForMonth: month => month === '2026-02' ? 18 : 20,
  memberCapacityForMonths: (member, months, daily) => months.reduce((n, month) => n + (month === '2026-02' ? 18 : 20) * daily, 0),
});
const start = source.indexOf('function memberHistoryPeriod(');
vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), ctx);
const member = {name: 'A'};
const rows = selected.slice(0, 7).map(month => ({owner: 'A', completedDate: `${month}-15`}));
rows.push({...rows[0]}, {owner: 'B', completedDate: '2026-08-15'}, {owner: 'A', completedDate: ''});
let result = ctx.memberHistoryPeriod(member, rows, 8);
assert.equal(result.months.length, 7);
assert.equal(result.workingDays, 138);
assert.equal(result.capacityHours, 1104);
assert.equal(1104 / result.workingDays, 8);
selected = ['2026-07'];
assert.equal(ctx.memberHistoryPeriod(member, rows, 8).workingDays, 20);
selected = ['2026-08'];
assert.equal(ctx.memberHistoryPeriod(member, rows, 8).capacityHours, 0);
selected = ['2026-01', '2026-03'];
assert.equal(ctx.memberHistoryPeriod(member, rows, 7).capacityHours, 280);
console.log('개인 이력 월·W/D·가용공수·단일 월·이력 없음 검증 통과');
