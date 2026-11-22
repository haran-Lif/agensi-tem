const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname,'../employee-review-management.js'),'utf8');
const ctx = vm.createContext({});
vm.runInContext(source,ctx);
const api = ctx.EmployeeReviewManagement;
api.hydrate([
  {entry_kind:'feedback',employee_id:'E1',project_id:'P1',effective_month:'2026-08-01',points:0},
  {entry_kind:'score',employee_id:'E1',project_id:'P1',effective_month:'2026-08-01',points:-3},
  {entry_kind:'score',employee_id:'E1',project_id:'P1',effective_month:'2026-09-01',points:2},
  {entry_kind:'score',employee_id:'E1',project_id:'P2',effective_month:'2026-08-01',points:5},
  {entry_kind:'score',employee_id:'E2',project_id:'P1',effective_month:'2026-08-01',points:10},
],true);
assert.equal(api.adjustment('E1','P1','2026','08'),-3);
assert.equal(api.adjustment('E1','','2026','전체'),4);
assert.equal(api.adjustment('E1','P1','2025','전체'),0);
assert.equal(api.finalScore(80,-3),77);
assert.equal(api.finalScore(119,5),120);
assert.equal(api.finalScore(2,-5),0);
assert.equal(api.finalScore(80.1,.2),80.3);
assert.throws(()=>api.validateImages(Array(21).fill({type:'image/png',size:1})));
assert.throws(()=>api.validateImages([{type:'image/svg+xml',size:1,name:'bad'}]));
assert.throws(()=>api.validateImages([{type:'image/png',size:10485761,name:'large'}]));
api.validateImages(Array(20).fill({type:'image/png',size:10485760}));
api.hydrate([],false);
assert.equal(api.isAvailable(),false);
console.log('평가 자료·가감점 기간/직원/프로젝트 필터·점수 한도·첨부 제한 검증 통과');
