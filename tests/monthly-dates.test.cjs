const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const ctx = vm.createContext({ currentAccount: () => null, isManagerPosition: name => name === '팀관리자', escapeHtml: text => text });
for (const name of ['canViewMonthlyActualCompletion', 'monthlyTaskDateCells']) {
  const start = source.indexOf(`function ${name}(`);
  vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), ctx);
}
assert.equal(ctx.canViewMonthlyActualCompletion(), false);
assert.equal(ctx.canViewMonthlyActualCompletion({ role: 'admin' }), true);
assert.equal(ctx.canViewMonthlyActualCompletion({ role: 'operator_all', name: '팀관리자' }), true);
assert.equal(ctx.canViewMonthlyActualCompletion({ role: 'operator_all', name: '실무자' }), false);
assert.equal(ctx.canViewMonthlyActualCompletion({ role: 'portal', name: '팀관리자' }), false);
const task = { start: '2026-07-01', dueDate: '2026-07-03', completedDate: '2026-07-04' };
assert.ok(!ctx.monthlyTaskDateCells(task, false).includes(task.completedDate));
assert.ok(ctx.monthlyTaskDateCells(task, true).includes(task.completedDate));
assert.ok(ctx.monthlyTaskDateCells({}, true).includes('미입력'));
console.log('월간 날짜 표시 및 실제 완료일 권한 검증 통과');
