const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../app.js'), 'utf8');
const member = { name: '복구자', team: '팀A', employmentStatus: '퇴사' };
const context = vm.createContext({
  members: [member, { name: '동료', team: '팀A', employmentStatus: '재직' }],
  projectWorkSettings: [
    { project: '팀프로젝트', teams: ['팀A'] },
    { project: '개별프로젝트', extraMembers: ['복구자'] },
    { project: '관리프로젝트', managerMembers: ['복구자'] },
    { project: '다른프로젝트', teams: ['팀B'] },
  ],
  projectAssignments: { 팀프로젝트: ['동료'], 다른프로젝트: ['별도인원'] },
  syncProjectManagementCount() {},
  appendProjectHistory() { throw new Error('중복 이력 생성'); },
});
for (const name of ['projectSettingTeams', 'projectSettingExtraMembers', 'projectSettingManagers', 'syncProjectAssignments', 'syncAssignmentsForMember']) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
}
member.employmentStatus = '재직';
context.syncAssignmentsForMember(member);
for (const project of ['팀프로젝트', '개별프로젝트', '관리프로젝트']) {
  assert.ok(context.projectAssignments[project].includes(member.name));
}
assert.deepEqual(context.projectAssignments.다른프로젝트, ['별도인원']);
context.syncAssignmentsForMember(member);
assert.equal(context.projectAssignments.팀프로젝트.filter(name => name === member.name).length, 1);
member.employmentStatus = '퇴사';
context.syncAssignmentsForMember(member);
for (const project of ['팀프로젝트', '개별프로젝트', '관리프로젝트']) {
  assert.ok(!context.projectAssignments[project].includes(member.name));
}
member.employmentStatus = '재직';
member.team = '팀C';
context.syncAssignmentsForMember(member, '팀A');
assert.ok(!context.projectAssignments.팀프로젝트.includes(member.name));
assert.ok(context.projectAssignments.개별프로젝트.includes(member.name));
console.log('재직 복구·퇴사·팀 변경 프로젝트 배정 회귀 검증 통과');
