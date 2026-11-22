const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const start = source.indexOf('  if (type === "groupRanking") {');
const end = source.indexOf('  if (type === "teamRanking") {', start);
const shared = {};
const other = {};
const elements = {};
const person = (team, subgroup, hours, days, outputs, rows) => ({person: {team, subgroup}, standardHours: hours, workingDays: days, data: {outputs}, rows});
const ctx = vm.createContext({
  type: 'groupRanking',
  allPeople: [person('A', '디자인', 100, 20, 5, [shared]), person('A', '디자인', 50, 10, 3, [shared]), person('B', '디자인', 60, 20, 4, [other]), person('A', '', 0, 0, 0, [])],
  $: selector => elements[selector] ||= {},
  currentPeriodLabel: () => '7월',
  escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
  effortLabel: value => `${value}H`,
  modal: {classList: {add() {}}, setAttribute() {}},
});
const run = () => vm.runInContext(`(function(){${source.slice(start, end)}})()`, ctx);
run();
const html = elements['#operatorDetailModalBody'].innerHTML;
assert.equal((html.match(/data-detail-type="groupPeople"/g) || []).length, 3);
assert.ok(html.includes('<td>2명</td><td>1건</td><td>8개</td><td>150H</td><td>75H</td><td>5H</td>'));
assert.ok(html.includes('미지정'));
assert.ok(!html.includes('NaN') && !html.includes('Infinity'));
ctx.allPeople = [];
run();
assert.ok(elements['#operatorDetailModalBody'].innerHTML.includes('조회할 그룹이 없습니다'));
console.log('그룹 분리·공유 업무 중복 제거·가중 일평균·미지정·빈 결과 검증 통과');
