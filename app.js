const sampleData = null;
const remoteAuth = globalThis.SupabaseAuth || null;
const remoteAuthEnabled = Boolean(remoteAuth?.isConfigured?.());
const remoteData = globalThis.SupabaseData || null;
const isImageEffortSample = false;
const DEFAULT_MONTH = new Date().toISOString().slice(0, 7);
const DAILY_WORK_HOURS = 8;
const PRODUCTIVE_RATE = 0.85;
const DAILY_PRODUCTIVE_HOURS = DAILY_WORK_HOURS * PRODUCTIVE_RATE;
const DAILY_ABSOLUTE_HOURS = 7;
const PHOTO_TYPES = ["일반", "화보컷", "비화보컷"];
const DEFAULT_GRADES = ["초급", "중급", "고급"];
const TASK_STATUSES = ["요청", "진행", "검수", "완료", "반려", "보류"];
const PROJECT_REQUIRED_VIEWS = new Set([
  "monthly", "gantt", "standard", "workResourceCreate",
  "workResources", "resource", "health", "profit", "portal",
]);
const SCHEDULE_CHANGE_REASONS = [
  { value: "작업자 일정 지연", responsibility: "우리측" },
  { value: "작업 누락 또는 오류 수정", responsibility: "우리측" },
  { value: "내부 검수 지연", responsibility: "우리측" },
  { value: "내부 커뮤니케이션 지연", responsibility: "우리측" },
  { value: "내부 리소스 부족", responsibility: "우리측" },
  { value: "고객 요청사항 변경", responsibility: "고객측" },
  { value: "고객 자료 전달 지연", responsibility: "고객측" },
  { value: "고객 검수 또는 승인 지연", responsibility: "고객측" },
  { value: "작업 범위 추가 합의", responsibility: "공동" },
  { value: "양측 일정 재협의", responsibility: "공동" },
  { value: "천재지변 또는 외부 시스템 장애", responsibility: "해당 없음" },
];
const KOREAN_PUBLIC_HOLIDAYS = new Set([
  "2026-01-01",
  "2026-02-16", "2026-02-17", "2026-02-18",
  "2026-03-02",
  "2026-05-05", "2026-05-25",
  "2026-06-03",
  "2026-08-17",
  "2026-09-24", "2026-09-25", "2026-09-26",
  "2026-10-05", "2026-10-09",
  "2026-12-25",
]);

const tasks = [];
const workers = {};
const teams = [];
const positions = [];
const grades = [...DEFAULT_GRADES];
let members = [];
const contracts = {};
const projectConfigs = [];
const projectHistories = [];
const projectTeamHistories = [];
const ownerHistories = [];
const deliverables = [];
const workerTaskStatuses = [];
const workResources = [];
const notificationStates = [];
const uploadBatches = [];
const uploadBatchItems = [];
let projectAssignments = {};

const firstActiveProject = projectConfigs.find((project) => project.status !== "closed")?.project || "";
const firstDeliverable = deliverables.find((deliverable) => deliverable.project === firstActiveProject);
const state = { view: "dashboard", tab: "monthWork", client: "전체", project: "전체", year: "전체", month: "", dashboardDirection: "전체", mode: "operator", adminTeam: "전체", adminGrade: "전체", adminPosition: "전체", resignedTeam: "전체", resignedFrom: "", resignedTo: "", resignedPage: 1, configProject: firstActiveProject, slaRuleProject: firstActiveProject, slaRuleDeliverable: firstDeliverable?.name || "", productivityProject: isImageEffortSample ? firstActiveProject : "전체", productivityWorkingDays: 21, productivityProjectBuffer: 100, productivityCompanyBuffer: 100, deliverableProject: firstActiveProject, conversionSource: firstDeliverable?.name || "", conversionTarget: firstDeliverable?.conversionTarget || firstDeliverable?.name || "", memberSearch: "", memberEditMode: "add", taskSearch: "", registeredTaskSearch: "", registeredTaskPage: 1, resourceSearch: "", resourceUnderloadPage: 1, ganttSearch: "", ganttViewMode: "period", ganttType: "전체", ganttSortOrder: "startAsc", portalWbsViewMode: "type", portalWbsType: "전체", portalWbsSortOrder: "startAsc", taskDeliverableSearch: "", myWorkStatus: "전체", myWorkSearch: "", myWorkPage: 1, workResourceProject: "전체", workResourceCategory: "전체", workResourceSearch: "", workResourcePage: 1, workResourceDetailIndex: null, operatorDetail: null, operatorDetailPage: 1, recordEdit: null, editingMemberIndex: null, memberModalIndex: null, editingProjectName: null, projectHistoryProject: null, projectHistoryPage: 1, teamHistoryProject: "전체", reviewProject: "전체", reviewYear: "전체", reviewMonth: "전체", reviewSearch: "" };
state.taskShowAllDeliverables = false;
state.recordEditSaving = false;
state.taskDetailIndex = null;
state.taskDetailPage = 1;
state.taskDetailSaving = false;
state.workSettingDraftProject = "";
state.workSettingDraftTeams = [];
state.workSettingDraftMembers = [];
state.workSettingDraftManagers = [];
state.workSettingTeamSearch = "";
state.workSettingMemberSearch = "";
state.workSettingManagerSearch = "";
state.editSettingDraftTeams = [];
state.editSettingDraftMembers = [];
state.editSettingDraftManagers = [];
state.editSettingTeamSearch = "";
state.editSettingMemberSearch = "";
state.editSettingManagerSearch = "";
state.taskStatusDirection = "전체";
state.myWorkDirection = "전체";
state.myWorkMemberId = "";
state.branding = { companyName: "회사명", subtitle: "프로젝트 운영 관제", logoDataUrl: "" };
state.productivityBuffersByProject = {};
state.workCalendar = { mode: "manual", apiUrl: "", months: {} };
state.resourceRemainingPeriod = "month";
state.resourceRemainingDate = "";
state.resourceRemainingPage = 1;
state.notificationStatus = "active";
state.notificationSeverity = "전체";
state.notificationProject = "전체";
state.notificationSearch = "";
state.notificationPage = 1;
state.notificationRules = {
  overdueEnabled: true,
  dueSoonEnabled: true,
  dueSoonDays: 1,
  reviewEnabled: true,
  reviewDays: 2,
  ownerEnabled: true,
  outputEnabled: true,
  templateEnabled: true,
  contractEnabled: true,
  contractDays: 30,
};
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const projectWorkSettings = [];
projectWorkSettings.forEach((setting) => {
  setting.sla = Number(String(setting.sla ?? "").match(/\d+/)?.[0] || 0);
});

const accountRoleLabels = {
  worker: "실무자 작업함만",
  operator_no_profit: "운영자 메뉴(수익성 제외)",
  operator_output_admin: "운영자 메뉴 + 업무 템플릿",
  admin: "관리자 메뉴 포함 전체",
  portal: "고객 포털만",
  operator_all: "운영자 메뉴 전체",
};
const employeeReviewCriteria = [
  { title: "순수점수 최대 85점", body: "디자이너 개인이 순수하게 낼 수 있는 최대 퍼포먼스는 85점입니다. 생산성 35점, 안정성 20점, 품질 20점, 운영평가 10점으로 계산합니다." },
  { title: "생산성 35점", body: "평가기간 가능 공수 대비 처리량을 봅니다. 프로젝트 작업 세팅의 7H 또는 8H 절대 기준으로 가동률을 계산합니다." },
  { title: "프로젝트/회사 기준 가동률", body: "인당 생산량 기준의 결과물별 월 기준값에 프로젝트 목표와 회사 목표를 각각 적용합니다. 양수는 기준 차감, 음수는 기준 확대 방식으로 프로젝트 내부 평가와 회사 전체 평가를 분리합니다." },
  { title: "안정성 20점", body: "일정 준수와 일정 지연건을 봅니다. 우리측 이슈로 지연된 건만 차감하고, 고객측/공동/해당 없음 이슈는 차감하지 않습니다." },
  { title: "품질 20점", body: "재작업률, 반려율, 수정 요청 비율을 봅니다. 단순 업무량보다 다시 하는 일이 얼마나 적었는지를 봅니다." },
  { title: "운영평가 10점", body: "고객만족도와 프로젝트 재계약 여부가 별도 데이터로 들어오기 전까지 프로젝트 건강도와 진행/종료 상태를 참고 지표로 사용합니다." },
  { title: "가산점 최대 35점", body: "가동율 120% 초과 보너스는 최대 +5점입니다. 중복 프로젝트는 2개 수행 시 +5점, 이후 프로젝트 1개 추가마다 +5점씩 더해 전체 최대 120점까지 인정합니다." },
  { title: "평가 보류", body: "업무 5건 미만 또는 누적 환산공수 8H 미만은 데이터 부족으로 평가 보류 처리합니다." },
];
let accounts = [];
state.currentAccountId = accounts[0]?.id || "";
state.accountSearch = "";
state.selectedMemberAccount = accounts[0]?.id || "";
state.excelUploadTab = "excelUploadInputPane";
state.excelResultPage = 1;
state.excelErrorPage = 1;
state.deliverableExcelImport = { status: "idle", fileName: "", count: 0, previousCount: 0, message: "" };
state.excelImport = {
  fileName: "",
  read: 0,
  added: 0,
  updated: 0,
  duplicate: 0,
  error: 0,
  results: [],
  countSummary: [],
};
state.pendingExcelImport = null;
state.taskDeliverableSelections = {};
state.operatorDetailStack = [];

let historySequence = 0;
let operationalDbReady = false;
let dbPersistTimer = null;
let dbPersistChain = Promise.resolve();
let emptyOutputConfirmResolver = null;
let assignmentConflictResolver = null;
let dbTableSignatures = {};
let dbKnownIds = {};
let dbRowSnapshots = {};
let dbRemoteSnapshots = {};
let systemAlertAction = null;
let dbAssignmentMeta = new Map();
let dbLastError = "";
let dbSchemaIssues = [];
let dbSaveState = "idle";
let dbMutationVersion = 0;
let dbSavedMutationVersion = 0;
let dbRelationshipRepairNeeded = false;
let dbOutputRepairNeeded = false;
let dbObsoleteOutputIds = [];
let modalLayerSequence = 30;
const layeredModals = new WeakSet();

function bringModalToFront(modal) {
  if (!modal) return;
  modalLayerSequence += 1;
  modal.style.zIndex = String(modalLayerSequence);
  layeredModals.add(modal);
}

function syncModalLayerState(modal) {
  if (!(modal instanceof HTMLElement) || !modal.classList.contains("modal-backdrop") || modal.classList.contains("operator-detail-stack-parent")) return;
  if (modal.classList.contains("active") && !layeredModals.has(modal)) bringModalToFront(modal);
  if (!modal.classList.contains("active") && layeredModals.has(modal)) {
    layeredModals.delete(modal);
    modal.style.zIndex = "";
  }
}

function stripModalSnapshotIds(snapshot) {
  snapshot.removeAttribute("id");
  snapshot.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
  snapshot.querySelectorAll("button, input, select, textarea, a").forEach((element) => {
    element.setAttribute("tabindex", "-1");
    element.setAttribute("aria-hidden", "true");
    if ("disabled" in element) element.disabled = true;
  });
}

function syncOperatorDetailStackLayers() {
  const modal = $("#operatorDetailModal");
  if (modal && state.operatorDetail) bringModalToFront(modal);
}

function openOperatorDetail(detail) {
  const modal = $("#operatorDetailModal");
  if (state.operatorDetail && modal?.classList.contains("active")) {
    const snapshot = modal.cloneNode(true);
    stripModalSnapshotIds(snapshot);
    snapshot.classList.add("operator-detail-stack-parent", "active");
    snapshot.setAttribute("aria-hidden", "true");
    snapshot.style.zIndex = modal.style.zIndex || String(modalLayerSequence);
    document.body.appendChild(snapshot);
    state.operatorDetailStack.push({ detail: { ...state.operatorDetail }, page: state.operatorDetailPage });
  }
  state.operatorDetail = detail;
  state.operatorDetailPage = 1;
  renderAll();
  syncOperatorDetailStackLayers();
}

function closeOperatorDetail() {
  const previous = state.operatorDetailStack.pop();
  const snapshots = $$(".operator-detail-stack-parent");
  snapshots.at(-1)?.remove();
  if (previous) {
    state.operatorDetail = previous.detail;
    state.operatorDetailPage = previous.page;
  } else {
    state.operatorDetail = null;
    state.operatorDetailPage = 1;
  }
  renderAll();
  syncOperatorDetailStackLayers();
}

function clearOperatorDetailStack() {
  state.operatorDetail = null;
  state.operatorDetailPage = 1;
  state.operatorDetailStack = [];
  $$(".operator-detail-stack-parent").forEach((snapshot) => snapshot.remove());
  const modal = $("#operatorDetailModal");
  if (modal) modal.style.zIndex = "";
}

let modalLayerObserver = null;
if (typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.body) {
  modalLayerObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") syncModalLayerState(mutation.target);
      mutation.addedNodes?.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        syncModalLayerState(node);
        node.querySelectorAll?.(".modal-backdrop").forEach(syncModalLayerState);
      });
    });
  });
  modalLayerObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
  $$('.modal-backdrop').forEach(syncModalLayerState);
}

function localDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function localDateTimeString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 19).replace("T", " ");
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
function safeHttpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
function calculatedUnitPrice(monthly, people) {
  const count = Number(people || 0);
  return count > 0 ? Number((Number(monthly || 0) / count).toFixed(2)) : 0;
}
function normalizedContractAmounts(options) {
  const { total, monthly, startDate, endDate, source = "total" } = options || {};
  const contractMonths = monthsBetween(startDate, endDate);
  let normalizedTotal = Number(total || 0);
  let normalizedMonthly = Number(monthly || 0);
  if (contractMonths > 0) {
    if (source === "monthly" && normalizedMonthly > 0) normalizedTotal = Number((normalizedMonthly * contractMonths).toFixed(2));
    else if (normalizedTotal > 0) normalizedMonthly = Number((normalizedTotal / contractMonths).toFixed(2));
    else if (normalizedMonthly > 0) normalizedTotal = Number((normalizedMonthly * contractMonths).toFixed(2));
  }
  return { total: normalizedTotal, monthly: normalizedMonthly, contractMonths };
}
function syncProjectContractAmounts(prefix = "projectConfig", source = "") {
  const total = $(`#${prefix}Total`);
  const monthly = $(`#${prefix}Monthly`);
  const people = $(`#${prefix}People`);
  const unitPrice = $(`#${prefix}UnitPrice`);
  const startDate = $(`#${prefix}StartDate`);
  const endDate = $(`#${prefix}EndDate`);
  if (!total || !monthly) return;
  if (source) total.dataset.amountSource = source;
  const resolvedSource = total.dataset.amountSource || (Number(total.value || 0) > 0 ? "total" : "monthly");
  const amounts = normalizedContractAmounts({ total: total.value, monthly: monthly.value, startDate: startDate?.value, endDate: endDate?.value, source: resolvedSource });
  total.value = amounts.total || "";
  monthly.value = amounts.monthly || "";
  if (unitPrice) unitPrice.value = calculatedUnitPrice(amounts.monthly, people?.value);
}
function historyDate(entry) {
  const value = entry.date || entry.changedAt || entry.month || "0000-00-00";
  return value.length === 7 ? `${value}-01` : value.slice(0, 10);
}
function appendProjectHistory(project, field, before, after, reason, category = "프로젝트 구성") {
  const date = localDateString();
  const actor = currentAccount?.();
  const changedAt = localDateTimeString();
  projectHistories.push({
    project,
    date,
    changedAt,
    month: date.slice(0, 7),
    field,
    before,
    after,
    reason: reason || "관리자 변경",
    category,
    changedBy: actor?.name || actor?.id || "미확인",
    changedByLoginId: actor?.id || "",
    sequence: ++historySequence,
  });
}
function combinedProjectHistories(project) {
  const normalize = (entry, category, index) => ({
    ...entry,
    category: entry.category || category,
    date: historyDate(entry),
    sortIndex: entry.sequence || index,
  });
  return [
    ...projectHistories.filter((entry) => entry.project === project).map((entry, index) => normalize(entry, "프로젝트 구성", index)),
    ...projectTeamHistories.filter((entry) => entry.project === project).map((entry, index) => normalize(entry, "팀 매칭", index)),
    ...ownerHistories.filter((entry) => entry.project === project).map((entry, index) => normalize(entry, "담당자", index)),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.sortIndex - a.sortIndex);
}
function projectNamesForTeam(team, memberName = "") {
  return projectConfigs.filter((project) => {
    const setting = projectWorkSettings.find((item) => item.project === project.project);
    const hasRecordedWork = memberName && tasks.some((task) => task.project === project.project && task.owner === memberName);
    const individuallyAssigned = memberName && projectSettingExtraMembers(setting).includes(memberName);
    return projectSettingTeams(setting).includes(team) || individuallyAssigned || hasRecordedWork;
  }).map((project) => project.project);
}
function recordMemberTeamTransition(memberName, beforeTeam, afterTeam) {
  if (!memberName || beforeTeam === afterTeam) return;
  const departedProjects = new Set(projectNamesForTeam(beforeTeam, memberName));
  const joinedProjects = new Set(projectNamesForTeam(afterTeam));
  departedProjects.forEach((project) => {
    appendProjectHistory(project, "구성원", `${memberName} 포함`, `${memberName} 이탈`, `팀 이동: ${beforeTeam} → ${afterTeam}`, "구성원");
  });
  joinedProjects.forEach((project) => {
    if (departedProjects.has(project)) return;
    appendProjectHistory(project, "구성원", `${memberName} 미포함`, `${memberName} 합류`, `팀 이동: ${beforeTeam} → ${afterTeam}`, "구성원");
  });
}
function recordMemberDeparture(memberName, team, reason = "인원 정보 삭제") {
  new Set(projectNamesForTeam(team, memberName)).forEach((project) => {
    appendProjectHistory(project, "구성원", `${memberName} 포함`, `${memberName} 이탈`, reason, "구성원");
  });
}
function recordMemberEmploymentTransition(member, beforeStatus, afterStatus) {
  if (!member || beforeStatus === afterStatus) return;
  const date = member.leftDate || localDateString();
  if (afterStatus === "퇴사") {
    recordMemberDeparture(member.name, member.team, `퇴사 처리: ${date}${member.resignationReason ? ` · ${member.resignationReason}` : ""}`);
    return;
  }
  if (beforeStatus === "퇴사") {
    new Set(projectNamesForTeam(member.team, member.name)).forEach((project) => {
      appendProjectHistory(project, "구성원", `${member.name} 퇴사`, `${member.name} ${afterStatus}`, `인원 상태 복구: ${date}`, "구성원");
    });
  }
}
function resetProjectForm() {
  state.editingProjectName = null;
  $("#projectConfigReason").value = "";
  $("#projectConfigTotal").dataset.amountSource = "total";
}
function populateProjectForm(project) {
  $("#projectConfigClient").value = project.client;
  $("#projectConfigName").value = project.project;
  $("#projectConfigDirection").value = project.direction;
  if ($("#projectConfigParent")) $("#projectConfigParent").value = project.parentProjectId || "";
  $("#projectConfigMonthly").value = project.monthly;
  $("#projectConfigTotal").value = project.total;
  $("#projectConfigStartDate").value = project.startDate || "";
  $("#projectConfigEndDate").value = project.endDate || "";
  $("#projectConfigPeople").value = project.contractPeople || 0;
  $("#projectConfigUnitPrice").value = calculatedUnitPrice(project.monthly, project.contractPeople);
  $("#projectConfigTotal").dataset.amountSource = project.total ? "total" : "monthly";
  $("#projectConfigMonthlyPersonCost").value = project.monthlyPersonCost || 0;
  $("#projectConfigReason").value = "";
  state.editingProjectName = project.project;
}
function readProjectForm() {
  const amounts = normalizedContractAmounts({
    total: $("#projectConfigTotal").value,
    monthly: $("#projectConfigMonthly").value,
    startDate: $("#projectConfigStartDate").value,
    endDate: $("#projectConfigEndDate").value,
    source: $("#projectConfigTotal").dataset.amountSource || "total",
  });
  const contractPeople = Number($("#projectConfigPeople").value || 0);
  const direction = $("#projectConfigDirection").value;
  return {
    client: $("#projectConfigClient").value.trim(),
    project: $("#projectConfigName").value.trim(),
    direction,
    parentProjectId: direction === "이커머스" ? "" : ($("#projectConfigParent")?.value || ""),
    monthly: amounts.monthly,
    total: amounts.total,
    startDate: $("#projectConfigStartDate").value,
    endDate: $("#projectConfigEndDate").value,
    contractPeople,
    managementPeople: state.editingProjectName ? assignedProjectManagers(state.editingProjectName).length : 0,
    unitPrice: calculatedUnitPrice(amounts.monthly, contractPeople),
    monthlyPersonCost: Number($("#projectConfigMonthlyPersonCost").value || 0),
  };
}
function renameProjectReferences(beforeName, afterName) {
  if (!afterName || beforeName === afterName) return;
  tasks.forEach((task) => { if (task.project === beforeName) task.project = afterName; });
  deliverables.forEach((deliverable) => { if (deliverable.project === beforeName) deliverable.project = afterName; });
  workResources.forEach((resource) => { if (resource.project === beforeName) resource.project = afterName; });
  projectWorkSettings.forEach((setting) => { if (setting.project === beforeName) setting.project = afterName; });
  projectHistories.forEach((entry) => { if (entry.project === beforeName) entry.project = afterName; });
  projectTeamHistories.forEach((entry) => { if (entry.project === beforeName) entry.project = afterName; });
  ownerHistories.forEach((entry) => { if (entry.project === beforeName) entry.project = afterName; });
  if (projectAssignments[beforeName]) {
    projectAssignments[afterName] = projectAssignments[beforeName];
    delete projectAssignments[beforeName];
  }
  if (contracts[beforeName]) {
    contracts[afterName] = contracts[beforeName];
    delete contracts[beforeName];
  }
  if (state.productivityBuffersByProject?.[beforeName]) {
    state.productivityBuffersByProject[afterName] = state.productivityBuffersByProject[beforeName];
    delete state.productivityBuffersByProject[beforeName];
  }
}

function pct(part, total) { return total ? Math.round((part / total) * 100) : 0; }
function money(n) { return `${Math.round(n).toLocaleString()}만원`; }
function groupBy(items, key) { return items.reduce((a, x) => ((a[x[key]] ||= []).push(x), a), {}); }
function parseOutputText(value) {
  const text = String(value || "").trim();
  const match = text.match(/^([\s\S]*)\(([\d,.]+)\)$/);
  return {
    name: match?.[1]?.trim() || text,
    count: match ? Number(match[2].replace(/,/g, "")) : 1,
  };
}
function aggregateOutputDetails(details) {
  const merged = new Map();
  (details || []).forEach((detail) => {
    const name = String(detail.name || detail.deliverable_name || "").trim();
    if (!name) return;
    merged.set(name, (merged.get(name) || 0) + Number(detail.count ?? detail.quantity ?? 0));
  });
  return [...merged.entries()].map(([name, count]) => `${name}(${formatNumber(count, 2)})`);
}
function taskOutputDetails(task) {
  if (Array.isArray(task.outputDetails) && task.outputDetails.length) return task.outputDetails;
  return (task.outputs || []).map((text, index) => {
    const parsed = parseOutputText(text);
    const existing = task._outputs?.[index];
    return {
      outputId: existing?.output_id,
      name: parsed.name,
      count: parsed.count,
      owner: task.owner,
      ownerEmployeeId: existing?.owner_employee_id || task.ownerEmployeeId || "",
      standardHoursPerUnit: Number(existing?.standard_hours_per_unit || 0),
      inspectionStatus: existing?.inspection_status || null,
      fileLink: existing?.file_link || null,
      note: existing?.note || null,
    };
  });
}
function outputImportScope(detail) {
  return `${detail.importSubNumber ?? "legacy"}::${detail.resourceMultiplier ?? "legacy"}`;
}
function outputResourceMultiplier(task, detail) {
  return detail.importSubNumber !== undefined
    ? (detail.importSubNumber === "20" ? Number(detail.resourceMultiplier ?? 1) : 1)
    : Math.max(0, 1 + normalizeEffortBufferPct(task.effortBufferPct) / 100);
}
function outputResourceHours(task, detail) {
  return outputEffortHours(Number(detail.count || 0) * Number(detail.standardHoursPerUnit || 0), task.photoType)
    * outputResourceMultiplier(task, detail);
}
function outputScopeNote(detail) {
  if (detail.importSubNumber === undefined) return detail.note || null;
  return `OUTPUT_SCOPE:${JSON.stringify({ subNumber: detail.importSubNumber, multiplier: detail.resourceMultiplier ?? 1, note: detail.note || null })}`;
}
function readOutputScope(note) {
  if (!String(note || "").startsWith("OUTPUT_SCOPE:")) return { note: note || null };
  try {
    const meta = JSON.parse(note.slice(13));
    return { importSubNumber: String(meta.subNumber), resourceMultiplier: Number(meta.multiplier), note: meta.note || null };
  } catch { return { note }; }
}
function mergeTaskOutputDetails(task, additions, ownerMember, scope = null) {
  const details = taskOutputDetails(task).map((detail) => ({ ...detail }));
  additions.forEach((item) => {
    const name = item.deliverable.name;
    const ownerEmployeeId = ownerMember?._id || "";
    const key = `${normalizeDeliverableKey(name)}::${ownerEmployeeId || normalizeImportKey(ownerMember?.name)}`;
    const existing = details.find((detail) => `${normalizeDeliverableKey(detail.name)}::${detail.ownerEmployeeId || normalizeImportKey(detail.owner)}` === key
      && outputImportScope(detail) === outputImportScope(scope || {}));
    if (existing) {
      existing.count = Number(existing.count || 0) + Number(item.count || 0);
      return;
    }
    details.push({
      ...(scope || {}),
      name,
      count: Number(item.count || 0),
      owner: ownerMember?.name || task.owner,
      ownerEmployeeId,
      standardHoursPerUnit: Number(item.deliverable.standardHours || 0),
    });
  });
  task.outputDetails = details;
  task.outputs = aggregateOutputDetails(details);
}
function outputCount(task) {
  return task.outputs.reduce((sum, item) => sum + parseOutputText(item).count, 0);
}
function workerEntriesFor(items) {
  const activeWorkers = new Set(items.map((task) => task.owner));
  const activeMembers = new Set(members.filter((member) => member.employmentStatus !== "퇴사").map((member) => member.name));
  return Object.entries(workers).filter(([name]) => activeWorkers.has(name) && activeMembers.has(name));
}
function formatNumber(value, digits = 1) {
  return Number(value).toLocaleString("ko-KR", { maximumFractionDigits: digits });
}
function normalizePhotoType(value) {
  return PHOTO_TYPES.includes(String(value || "").trim()) ? String(value).trim() : "일반";
}
function photoTypeMultiplier(value) {
  const type = normalizePhotoType(value);
  return type === "화보컷" ? 0.5 : type === "비화보컷" ? 1.5 : 1;
}
function normalizeEffortBufferPct(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.max(-100, number) : 0;
}
function importedEffortMultiplier(value) {
  const text = String(value ?? "").trim();
  if (!text || Number(text) === 0) return 1;
  const number = Number(text.endsWith("%") ? text.slice(0, -1).trim() : text);
  return text.endsWith("%") ? number / 100 : number;
}
function importedEffortBufferPct(value) {
  const multiplier = importedEffortMultiplier(value);
  const percent = (multiplier - 1) * 100;
  return Number.isFinite(percent) ? Math.round(percent * 1000000) / 1000000 : 0;
}
function isValidImportedEffortMultiplier(value) {
  const multiplier = importedEffortMultiplier(value);
  return Number.isFinite(multiplier) && multiplier > 0;
}
function adjustedEffortHours(baseHours, photoType = "일반", bufferPct = 0) {
  return Math.max(0, Number(baseHours || 0) * photoTypeMultiplier(photoType) * (1 + normalizeEffortBufferPct(bufferPct) / 100));
}
function outputEffortHours(baseHours, photoType = "일반") {
  return adjustedEffortHours(baseHours, photoType, 0);
}
function resourceEffortHours(baseHours, photoType = "일반", bufferPct = 0) {
  return adjustedEffortHours(baseHours, photoType, bufferPct);
}
function taskBaseStandardHours(task) {
  const detailHours = taskOutputDetails(task).reduce((sum, detail) => sum + Number(detail.count || 0) * Number(detail.standardHoursPerUnit || 0), 0);
  return detailHours > 0 ? detailHours : Number(task.manualStandardHours ?? task.baseStandardHours ?? task.standardHours ?? 0);
}
function recalculateTaskHours(task) {
  task.photoType = normalizePhotoType(task.photoType);
  task.effortBufferPct = normalizeEffortBufferPct(task.effortBufferPct);
  task.baseStandardHours = taskBaseStandardHours(task);
  // 결과물 공수는 개별 버퍼와 분리한다. 개별 버퍼는 리소스 관제 계산에서만 사용한다.
  task.standardHours = outputEffortHours(task.baseStandardHours, task.photoType);
  return task.standardHours;
}
function taskResourceHours(task) {
  const details = taskOutputDetails(task);
  if (details.some((detail) => detail.importSubNumber !== undefined)) return details.reduce((sum, detail) => sum + outputResourceHours(task, detail), 0);
  return resourceEffortHours(taskBaseStandardHours(task), task.photoType, task.effortBufferPct);
}
function taskEffortAdjustmentLabel(task) {
  const scoped = taskOutputDetails(task).filter((detail) => detail.importSubNumber !== undefined);
  if (scoped.length) {
    const factors = [...new Set(scoped.filter((detail) => detail.importSubNumber === "20").map((detail) => detail.resourceMultiplier ?? 1))];
    return `${normalizePhotoType(task.photoType)} · ${factors.length ? `보조20 ${factors.join(" / ")}배` : "기본 1배"}`;
  }
  const photoLabel = normalizePhotoType(task.photoType);
  const buffer = normalizeEffortBufferPct(task.effortBufferPct);
  return `${photoLabel} · 버퍼 ${buffer > 0 ? "+" : ""}${formatNumber(buffer, 1)}%`;
}
function workingDaysInMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return 0;
  const lastDay = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (weekday !== 0 && weekday !== 6 && !KOREAN_PUBLIC_HOLIDAYS.has(dateKey)) workingDays += 1;
  }
  return workingDays;
}
function taskCompletionDate(task) {
  return /^\d{4}-\d{2}-\d{2}$/.test(task.completedDate || "") ? task.completedDate : "";
}
function taskMatchesWorkPeriod(task, year, month) {
  const date = taskCompletionDate(task);
  if (month === "other") return !date;
  return (year === "전체" || date.slice(0, 4) === year)
    && (!month || date.slice(0, 7) === month);
}
function availableTaskMonths(items = tasks) {
  return [...new Set(items.map((task) => taskCompletionDate(task).slice(0, 7)).filter((value) => /^\d{4}-\d{2}$/.test(value)))]
    .sort();
}
function selectableTaskMonths(availableMonths, year) {
  return year === "전체"
    ? [...availableMonths]
    : availableMonths.filter((value) => value.startsWith(`${year}-`));
}
function selectedPeriodMonths(items = tasks) {
  const months = availableTaskMonths(items);
  if (state.month) return months.includes(state.month) ? [state.month] : [];
  if (state.year !== "전체") return months.filter((month) => month.startsWith(`${state.year}-`));
  return months;
}
function currentPeriodLabel() {
  if (state.month === "other") return "기타(완료일 미입력)";
  if (state.month) {
    const [year, month] = state.month.split("-");
    return `${year}년 ${Number(month)}월`;
  }
  if (state.year !== "전체") return `${state.year}년 전체`;
  return "누적 전체";
}
function selectedPeriodBounds(items = tasks) {
  const months = selectedPeriodMonths(items);
  const fallback = (state.month !== "other" && state.month) || (state.year !== "전체" ? `${state.year}-01` : DEFAULT_MONTH);
  const first = months[0] || fallback;
  const last = months.at(-1) || fallback;
  const [lastYear, lastMonth] = last.split("-").map(Number);
  return {
    start: `${first}-01`,
    end: `${last}-${String(new Date(lastYear, lastMonth, 0).getDate()).padStart(2, "0")}`,
    months: months.length ? months : [fallback],
  };
}
function configuredWorkingDays(monthKey) {
  const value = Number(state.workCalendar?.months?.[monthKey]?.workingDays);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
function workingDaysForMonth(monthKey, config = null) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  if (!year || !month) return 0;
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
  const start = config?.startDate && config.startDate > monthStart ? config.startDate : monthStart;
  const end = config?.endDate && config.endDate < monthEnd ? config.endDate : monthEnd;
  if (start > end) return 0;
  const configured = configuredWorkingDays(monthKey);
  return configured !== null && start === monthStart && end === monthEnd
    ? configured
    : workingDaysBetween(start, end);
}
function selectedPeriodWorkingDays(config = null) {
  return selectedPeriodBounds().months.reduce((sum, monthKey) => sum + workingDaysForMonth(monthKey, config), 0);
}
function workingDaysBetween(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  let workingDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (weekday !== 0 && weekday !== 6 && !KOREAN_PUBLIC_HOLIDAYS.has(dateKey)) workingDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return workingDays;
}
function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
function reducedDailyHours(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  const lunchOverlap = Math.max(0, Math.min(end, 13 * 60) - Math.max(start, 12 * 60));
  return Math.max(0, (end - start - lunchOverlap) / 60);
}
function memberDailyHoursOnDate(member, dateKey, dailyHours = DAILY_ABSOLUTE_HOURS) {
  if (!member?.reducedWork) return dailyHours;
  const inPeriod = (!member.reducedWorkStartDate || dateKey >= member.reducedWorkStartDate)
    && (!member.reducedWorkEndDate || dateKey <= member.reducedWorkEndDate);
  return inPeriod ? Number(member.reducedDailyHours || reducedDailyHours(member.reducedWorkStartTime, member.reducedWorkEndTime) || dailyHours) : dailyHours;
}
function memberCapacityBetween(member, startValue, endValue, dailyHours = DAILY_ABSOLUTE_HOURS) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  let hours = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (weekday !== 0 && weekday !== 6 && !KOREAN_PUBLIC_HOLIDAYS.has(dateKey)) hours += memberDailyHoursOnDate(member, dateKey, dailyHours);
    cursor.setDate(cursor.getDate() + 1);
  }
  return hours;
}
function memberCapacityForMonths(member, months, dailyHours = DAILY_ABSOLUTE_HOURS) {
  return (months || []).reduce((sum, monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
    const start = `${monthKey}-01`;
    const end = `${monthKey}-${lastDay}`;
    const rawDays = workingDaysBetween(start, end);
    const configuredDays = workingDaysForMonth(monthKey);
    const rawHours = memberCapacityBetween(member, start, end, dailyHours);
    return sum + (rawDays > 0 ? rawHours * configuredDays / rawDays : 0);
  }, 0);
}
function memberSelectedPeriodCapacity(member, projectName = state.project) {
  const period = selectedPeriodBounds();
  const dailyHours = absoluteDailyHoursForProject(projectName);
  return memberCapacityForMonths(member, period.months, dailyHours);
}
function membersSelectedPeriodCapacity(memberList, projectName = state.project) {
  return (memberList || []).reduce((sum, member) => sum + memberSelectedPeriodCapacity(member, projectName), 0);
}
function addWorkingDays(startValue, days) {
  const start = new Date(`${startValue}T00:00:00`);
  if (Number.isNaN(start.getTime())) return "";
  let remaining = Math.max(0, Number(days || 0));
  const cursor = new Date(start);
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + 1);
    const weekday = cursor.getDay();
    const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (weekday !== 0 && weekday !== 6 && !KOREAN_PUBLIC_HOLIDAYS.has(dateKey)) remaining -= 1;
  }
  return `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
}
function dateDiffDays(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end - start) / 86400000);
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function taskSlaElapsedDays(task) {
  if (!task.start || !task.end) return 0;
  return Math.max(workingDaysBetween(task.start, task.end) - 1, 0);
}
function taskSlaRule(task, ignoreStored = false) {
  if (!ignoreStored && task.slaRuleStored === true) {
    const storedLabel = String(task.slaRuleLabel || "저장된 일정 기준").replace(new RegExp(["S", "L", "A"].join(""), "g"), "일정 기준");
    return {
      limit: Number(task.slaLimit || 0),
      source: storedLabel,
      type: task.slaRuleType || "stored",
      configured: task.slaConfigured === true,
    };
  }
  const outputKeys = new Set((task.outputs || []).map((item) => normalizeDeliverableKey(parseOutputText(item).name)));
  const typeKey = normalizeDeliverableKey(task.type);
  const overrides = deliverables
    .filter((deliverable) => deliverable.project === task.project && deliverable.slaEnabled === true)
    .filter((deliverable) => {
      const key = normalizeDeliverableKey(deliverable.name);
      return outputKeys.has(key) || (typeKey && key && (typeKey.includes(key) || key.includes(typeKey)));
    })
    .sort((a, b) => Number(a.slaDays) - Number(b.slaDays));
  if (overrides.length) {
    return {
      limit: Number(overrides[0].slaDays),
      source: overrides[0].name,
      type: "deliverable",
      configured: true,
    };
  }
  return {
    limit: 0,
    source: "결과물 기준 없음",
    type: "none",
    configured: false,
  };
}
function taskSlaLimit(task) {
  return taskSlaRule(task).limit;
}
function normalizeSlaResponsibility(value) {
  const text = String(value || "").trim();
  return ["우리측", "고객측", "공동", "해당 없음"].includes(text) ? text : "미확인";
}
function scheduleChangeResponsibility(reason) {
  return SCHEDULE_CHANGE_REASONS.find((item) => item.value === String(reason || "").trim())?.responsibility || "";
}
function scheduleChangeReasonOptions(selected = "") {
  return [
    `<option value="" ${!selected ? "selected" : ""}>일정 변경 사유 선택</option>`,
    ...SCHEDULE_CHANGE_REASONS.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === selected ? "selected" : ""}>${escapeHtml(item.value)} (${item.responsibility})</option>`),
  ].join("");
}
function taskOriginalDueDate(task) {
  return task?.originalDueDate || task?.scheduleChanges?.[0]?.beforeDate || task?.dueDate || "";
}
function appendTaskScheduleChange(task, beforeDate, afterDate, reason, responsibility) {
  if (!task || !beforeDate || !afterDate || beforeDate === afterDate) return;
  task.scheduleChanges ||= [];
  const change = {
    changedAt: localDateString(),
    beforeDate,
    afterDate,
    reason: String(reason || "").trim() || "완료 일정 변경",
    responsibility: normalizeSlaResponsibility(responsibility),
  };
  const duplicate = task.scheduleChanges.some((item) => item.beforeDate === change.beforeDate && item.afterDate === change.afterDate && item.reason === change.reason);
  if (!duplicate) task.scheduleChanges.push(change);
}
function taskSlaDueDate(task, rule = taskSlaRule(task)) {
  return task.slaDueDate || (rule.configured ? addWorkingDays(task.start, rule.limit) : "");
}
function syncTaskSlaViolations() {
  tasks.forEach((task) => {
    const rule = taskSlaRule(task);
    const limit = rule.limit;
    const slaDueDate = taskSlaDueDate(task, rule);
    const completedDate = task.completedDate || "";
    const originalDueDate = taskOriginalDueDate(task);
    const latestReason = task.scheduleChanges?.at(-1)?.reason || task.scheduleChangeReason || "";
    const reasonResponsibility = scheduleChangeResponsibility(latestReason);
    const comparisonDate = completedDate || (task.scheduleChanges?.length ? task.dueDate : "");
    const missed = Boolean(originalDueDate && comparisonDate && comparisonDate > originalDueDate);
    const completedPastCurrentDue = Boolean(completedDate && task.dueDate && completedDate > task.dueDate);
    const responsibility = completedPastCurrentDue
      ? "우리측"
      : reasonResponsibility || (completedDate && missed ? "우리측" : normalizeSlaResponsibility(task.slaResponsibility));
    const requestUrgent = Boolean(rule.configured && slaDueDate && originalDueDate && originalDueDate < slaDueDate);
    task.slaElapsedDays = completedDate && task.start ? Math.max(workingDaysBetween(task.start, completedDate) - 1, 0) : 0;
    task.slaDueDate = slaDueDate;
    task.originalDueDate = originalDueDate;
    task.slaMissed = missed;
    task.slaResponsibility = responsibility;
    task.requestUrgent = requestUrgent;
    task.urgent = Boolean(task.urgent || requestUrgent);
    task.delayed = missed && responsibility === "우리측";
    task.slaPending = missed && responsibility === "미확인";
    task.slaExcluded = missed && ["고객측", "공동"].includes(responsibility);
    task.slaConfigured = rule.configured;
    task.slaAssessment = !originalDueDate
      ? "기준 없음"
      : !missed
        ? "준수"
        : task.delayed
          ? "위반"
          : task.slaPending
            ? "판정 보류"
            : "귀책 제외";
    task.slaRuleLabel = rule.source;
  });
}
function taskScheduleLabel(task) {
  if (task.delayed) return "작업자 일정 지연";
  if (task.slaPending) return "귀책 확인 필요";
  if (task.slaExcluded) return "외부 귀책 지연";
  if (task.requestUrgent) return "요청자 긴급요청";
  if (!taskOriginalDueDate(task)) return "기준 없음";
  return "정상 일정";
}
function taskScheduleClass(task) {
  if (task.delayed) return "danger";
  if (task.slaPending || task.requestUrgent) return "warn";
  return "good";
}
function projectContractWorkingDays(config) {
  if (!config?.startDate || !config?.endDate) return selectedPeriodWorkingDays();
  return workingDaysBetween(config.startDate, config.endDate);
}
function projectMonthWorkingDays(config) {
  return selectedPeriodWorkingDays(config);
}
function assignedProjectPeople(projectName) {
  const activeNames = new Set(members.filter((member) => member.employmentStatus !== "퇴사").map((member) => member.name));
  const assignedNames = projectAssignments[projectName]?.length
    ? projectAssignments[projectName]
    : tasks.filter((task) => task.project === projectName).map((task) => task.owner);
  return [...new Set(assignedNames)].filter((name) => activeNames.has(name));
}
function projectSettingTeams(setting) {
  return [...new Set([...(setting?.teams || []), setting?.team].filter((name) => name && name !== "미지정"))];
}
function projectSettingExtraMembers(setting) {
  return [...new Set((setting?.extraMembers || []).filter(Boolean))];
}
function projectSettingManagers(setting) {
  return [...new Set((setting?.managerMembers || []).filter(Boolean))];
}
function assignedProjectManagers(projectName) {
  const setting = projectWorkSettings.find((item) => item.project === projectName);
  const activeMembers = new Map(members.filter((member) => member.employmentStatus !== "퇴사").map((member) => [member.name, member]));
  const explicitManagers = projectSettingManagers(setting);
  const positionManagers = assignedProjectPeople(projectName)
    .filter((name) => activeMembers.get(name)?.position === "관리자");
  return [...new Set([...explicitManagers, ...positionManagers])].filter((name) => activeMembers.has(name));
}
function assignedProjectWorkers(projectName) {
  const managers = new Set(assignedProjectManagers(projectName));
  return assignedProjectPeople(projectName).filter((name) => !managers.has(name));
}
function syncProjectManagementCount(projectName) {
  const config = projectConfig(projectName);
  if (!config) return;
  config.managementPeople = assignedProjectManagers(projectName).length;
  if (contracts[projectName]) contracts[projectName].managementPeople = config.managementPeople;
}
function assignmentSelectedMarkup(values, kind, labelForValue = (value) => value) {
  return values.length ? values.map((value) => `<span class="assignment-selected-item"><span>${escapeHtml(labelForValue(value))}</span><button class="secondary icon-button assignment-selected-remove" data-assignment-kind="${kind}" data-assignment-value="${escapeHtml(value)}" type="button" aria-label="삭제" title="삭제">×</button></span>`).join("") : `<span class="assignment-empty">추가된 항목이 없습니다.</span>`;
}
function projectMemberCandidates(selectedTeams, selectedMembers, keyword = "") {
  const teamSet = new Set(selectedTeams || []);
  const memberSet = new Set(selectedMembers || []);
  const query = String(keyword || "").trim().toLowerCase();
  return members.filter((member) => {
    if (member.employmentStatus === "퇴사" || teamSet.has(member.team) || memberSet.has(member.name)) return false;
    return !query || [member.name, member.team, member.subgroup, member.position].join(" ").toLowerCase().includes(query);
  });
}
function projectManagerCandidates(selectedManagers, keyword = "") {
  const managerSet = new Set(selectedManagers || []);
  const query = String(keyword || "").trim().toLowerCase();
  return members.filter((member) => {
    if (member.employmentStatus === "퇴사" || member.position !== "관리자" || managerSet.has(member.name)) return false;
    return !query || [member.name, member.team, member.subgroup, member.position].join(" ").toLowerCase().includes(query);
  }).sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
function ensureWorkSettingDraft(project, setting) {
  if (state.workSettingDraftProject === project) return;
  state.workSettingDraftProject = project;
  state.workSettingDraftTeams = projectSettingTeams(setting);
  state.workSettingDraftMembers = projectSettingExtraMembers(setting);
  state.workSettingDraftManagers = projectSettingManagers(setting);
  state.workSettingTeamSearch = "";
  state.workSettingMemberSearch = "";
  state.workSettingManagerSearch = "";
}
function renderWorkSettingPickers() {
  const teamQuery = state.workSettingTeamSearch.trim().toLowerCase();
  const availableTeams = teams.map((team) => team.name).filter((name) => !state.workSettingDraftTeams.includes(name) && (!teamQuery || name.toLowerCase().includes(teamQuery)));
  if ($("#workSettingTeamSearch")) $("#workSettingTeamSearch").value = state.workSettingTeamSearch;
  if ($("#workSettingTeamSelect")) $("#workSettingTeamSelect").innerHTML = availableTeams.length ? optionList(availableTeams, availableTeams[0]) : `<option value="">추가 가능한 팀 없음</option>`;
  if ($("#workSettingSelectedTeams")) $("#workSettingSelectedTeams").innerHTML = assignmentSelectedMarkup(state.workSettingDraftTeams, "team");
  if ($("#workSettingMemberSearch")) $("#workSettingMemberSearch").value = state.workSettingMemberSearch;
  const candidates = projectMemberCandidates(state.workSettingDraftTeams, state.workSettingDraftMembers, state.workSettingMemberSearch);
  if ($("#workSettingMemberSelect")) $("#workSettingMemberSelect").innerHTML = candidates.length
    ? candidates.map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} · ${escapeHtml(member.team)}${member.subgroup ? ` · ${escapeHtml(member.subgroup)}` : ""}</option>`).join("")
    : `<option value="">검색 결과 없음</option>`;
  if ($("#workSettingSelectedMembers")) $("#workSettingSelectedMembers").innerHTML = assignmentSelectedMarkup(
    state.workSettingDraftMembers,
    "member",
    (name) => {
      const member = members.find((item) => item.name === name);
      return member ? `${member.name} · ${member.team}` : name;
    },
  );
}
function renderEditSettingPickers() {
  const teamQuery = state.editSettingTeamSearch.trim().toLowerCase();
  const availableTeams = teams.map((team) => team.name).filter((name) => !state.editSettingDraftTeams.includes(name) && (!teamQuery || name.toLowerCase().includes(teamQuery)));
  if ($("#editSettingTeamSearch")) $("#editSettingTeamSearch").value = state.editSettingTeamSearch;
  if ($("#editSettingTeamSelect")) $("#editSettingTeamSelect").innerHTML = availableTeams.length ? optionList(availableTeams, availableTeams[0]) : `<option value="">추가 가능한 팀 없음</option>`;
  if ($("#editSettingSelectedTeams")) $("#editSettingSelectedTeams").innerHTML = assignmentSelectedMarkup(state.editSettingDraftTeams, "edit-team");
  if ($("#editSettingMemberSearch")) $("#editSettingMemberSearch").value = state.editSettingMemberSearch;
  const managerSet = new Set(state.editSettingDraftManagers);
  const candidates = projectMemberCandidates(state.editSettingDraftTeams, state.editSettingDraftMembers, state.editSettingMemberSearch)
    .filter((member) => !managerSet.has(member.name));
  if ($("#editSettingMemberSelect")) $("#editSettingMemberSelect").innerHTML = candidates.length
    ? candidates.map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} · ${escapeHtml(member.team)}${member.subgroup ? ` · ${escapeHtml(member.subgroup)}` : ""}</option>`).join("")
    : `<option value="">검색 결과 없음</option>`;
  if ($("#editSettingSelectedMembers")) $("#editSettingSelectedMembers").innerHTML = assignmentSelectedMarkup(
    state.editSettingDraftMembers,
    "edit-member",
    (name) => {
      const member = members.find((item) => item.name === name);
      return member ? `${member.name} · ${member.team}` : name;
    },
  );
  if ($("#editSettingManagerSearch")) $("#editSettingManagerSearch").value = state.editSettingManagerSearch;
  const managerCandidates = projectManagerCandidates(state.editSettingDraftManagers, state.editSettingManagerSearch)
    .filter((member) => !state.editSettingDraftMembers.includes(member.name));
  if ($("#editSettingManagerSelect")) $("#editSettingManagerSelect").innerHTML = managerCandidates.length
    ? managerCandidates.map((member) => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} · ${escapeHtml(member.team)} · ${escapeHtml(member.position || "포지션 미지정")}</option>`).join("")
    : `<option value="">검색 결과 없음</option>`;
  if ($("#editSettingSelectedManagers")) $("#editSettingSelectedManagers").innerHTML = assignmentSelectedMarkup(
    state.editSettingDraftManagers,
    "edit-manager",
    (name) => {
      const member = members.find((item) => item.name === name);
      return member ? `${member.name} · ${member.team} · 관리자` : `${name} · 관리자`;
    },
  );
}
function syncProjectAssignments(projectName, teamNames = [], extraMemberNames = [], managerMemberNames = [], reason = "프로젝트 투입 구성 변경", recordHistory = true) {
  if (!projectName) return;
  const before = new Set(projectAssignments[projectName] || []);
  const selectedTeams = new Set(teamNames);
  const next = new Set(
    members
      .filter((member) => member.employmentStatus !== "퇴사" && selectedTeams.has(member.team))
      .map((member) => member.name),
  );
  extraMemberNames.forEach((name) => {
    if (members.some((member) => member.name === name && member.employmentStatus !== "퇴사")) next.add(name);
  });
  managerMemberNames.forEach((name) => {
    if (members.some((member) => member.name === name && member.employmentStatus !== "퇴사")) next.add(name);
  });
  if (recordHistory) {
    before.forEach((name) => {
      if (!next.has(name)) appendProjectHistory(projectName, "구성원", `${name} 포함`, `${name} 이탈`, reason, "구성원");
    });
    next.forEach((name) => {
      if (!before.has(name)) appendProjectHistory(projectName, "구성원", `${name} 미포함`, `${name} 합류`, reason, "구성원");
    });
  }
  projectAssignments[projectName] = [...next];
  syncProjectManagementCount(projectName);
}
function syncProjectAssignmentsFromTeam(projectName, teamName, reason = "프로젝트-팀 매칭 변경", recordHistory = true) {
  const setting = projectWorkSettings.find((item) => item.project === projectName);
  const teamNames = setting ? projectSettingTeams(setting) : [teamName].filter(Boolean);
  const extraMembers = setting ? projectSettingExtraMembers(setting) : [];
  const managerMembers = setting ? projectSettingManagers(setting) : [];
  syncProjectAssignments(projectName, teamNames, extraMembers, managerMembers, reason, recordHistory);
}
function syncAssignmentsForMember(member, beforeTeam = member.team) {
  projectWorkSettings
    .filter((setting) => projectSettingTeams(setting).some((team) => team === beforeTeam || team === member.team)
      || projectSettingExtraMembers(setting).includes(member.name)
      || projectSettingManagers(setting).includes(member.name))
    .forEach((setting) => syncProjectAssignments(setting.project, projectSettingTeams(setting), projectSettingExtraMembers(setting), projectSettingManagers(setting), `구성원 정보 변경: ${member.name}`, false));
}
function syncAssignmentsForTeam(teamName, reason, recordHistory = true) {
  projectWorkSettings
    .filter((setting) => projectSettingTeams(setting).includes(teamName))
    .forEach((setting) => syncProjectAssignments(setting.project, projectSettingTeams(setting), projectSettingExtraMembers(setting), projectSettingManagers(setting), reason, recordHistory));
}
function absoluteDailyHoursForProject(projectName) {
  const configured = Number(projectConfig(projectName)?.absoluteDailyHours);
  return configured === 8 ? 8 : 7;
}
function absoluteDailyHoursForRows(rows, fallbackProject = state.project) {
  const weighted = (rows || []).reduce((result, task) => {
    const weight = Math.max(Number(task.standardHours || 0), 1);
    return {
      hours: result.hours + absoluteDailyHoursForProject(task.project) * weight,
      weight: result.weight + weight,
    };
  }, { hours: 0, weight: 0 });
  return weighted.weight ? weighted.hours / weighted.weight : absoluteDailyHoursForProject(fallbackProject);
}
function monthlyCapacity(workerCount, memberList = null, projectName = state.project) {
  const workingDays = selectedPeriodWorkingDays(projectConfig(projectName));
  const dailyHours = absoluteDailyHoursForProject(projectName);
  const totalHours = memberList?.length
    ? membersSelectedPeriodCapacity(memberList, projectName)
    : workerCount * workingDays * dailyHours;
  return {
    workingDays,
    dailyHours,
    totalHours,
  };
}
function resourceMetrics(items, workerCount, memberList = null, applyIndividualBuffer = false, projectName = state.project) {
  const usedHours = items.reduce((sum, task) => sum + (applyIndividualBuffer ? taskResourceHours(task) : Number(task.standardHours || 0)), 0);
  const capacity = monthlyCapacity(workerCount, memberList, projectName);
  const averageDailyHours = workerCount && capacity.workingDays ? usedHours / workerCount / capacity.workingDays : 0;
  return {
    ...capacity,
    usedHours,
    remainingHours: Math.max(capacity.totalHours - usedHours, 0),
    averageDailyHours,
    productivityRate: pct(averageDailyHours, capacity.dailyHours),
  };
}
function renderCapacityMetric(selector, metrics) {
  const element = $(selector);
  const exceededHours = Math.max(metrics.usedHours - metrics.totalHours, 0);
  element.textContent = exceededHours > 0
    ? `초과 ${formatNumber(exceededHours)}H / ${formatNumber(metrics.totalHours)}H`
    : `${formatNumber(metrics.remainingHours)}H / ${formatNumber(metrics.totalHours)}H`;
  element.closest(".metric")?.classList.toggle("danger", exceededHours > 0);
  const note = element.nextElementSibling;
  if (note) note.textContent = exceededHours > 0
    ? "선택 기간 초과 공수 / 전체 공수 · 상세 보기"
    : "선택 기간 남은 공수 / 전체 공수 · 상세 보기";
}
function resetTopLevelFilters(mode) {
  if (mode === "admin") {
    state.adminTeam = "전체";
    state.adminGrade = "전체";
    state.adminPosition = "전체";
    state.resignedTeam = "전체";
    state.resignedFrom = "";
    state.resignedTo = "";
    state.resignedPage = 1;
    state.reviewProject = "전체";
    state.reviewYear = "전체";
    state.reviewMonth = "전체";
    state.reviewSearch = "";
    return;
  }
  state.client = "전체";
  state.project = "전체";
  state.year = "전체";
  state.month = "";
  state.ganttSearch = "";
  state.registeredTaskSearch = "";
  state.registeredTaskPage = 1;
  state.ganttViewMode = "period";
  state.ganttType = "전체";
  state.ganttSortOrder = "startAsc";
  state.portalWbsViewMode = "type";
  state.portalWbsType = "전체";
  state.portalWbsSortOrder = "startAsc";
}
function effortLabel(value) {
  if (isImageEffortSample) return `${formatNumber(value)} 공수`;
  const hours = Number(value || 0);
  const hoursLabel = `${formatNumber(hours)}H`;
  return hours >= 8 ? `${hoursLabel} (${formatNumber(hours / 8, 2)} W/D)` : hoursLabel;
}
function dailyConversionCount(sourceHours, targetHours) {
  const source = Number(sourceHours || 0);
  const target = Number(targetHours || 0);
  const sourceWorkingDays = source / 8;
  return sourceWorkingDays && target ? (source / target) / sourceWorkingDays : 0;
}
function parseProductivityBuffer(value, fallback = 100) {
  const number = Number(String(value ?? fallback).replace(/%$/, "").trim());
  return Number.isFinite(number) && number > 0 ? number : fallback;
}
function productivityBuffersForProject(projectName) {
  const saved = state.productivityBuffersByProject?.[projectName] || {};
  const periodMonths = state.month
    ? [state.month]
    : state.year !== "전체"
      ? Array.from({ length: 12 }, (_, index) => `${state.year}-${String(index + 1).padStart(2, "0")}`)
      : [];
  const calendarValues = periodMonths
    .map((monthKey) => workingDaysForMonth(monthKey, projectConfig(projectName)))
    .filter((value) => value > 0);
  const calendarWorkingDays = calendarValues.length
    ? calendarValues.reduce((sum, value) => sum + value, 0) / calendarValues.length
    : Number(saved.workingDays ?? state.productivityWorkingDays ?? 21);
  return {
    workingDays: Math.max(0, Number(Number.isFinite(calendarWorkingDays) ? calendarWorkingDays : (saved.workingDays ?? state.productivityWorkingDays ?? 21))),
    projectBuffer: parseProductivityBuffer(saved.projectBuffer, state.productivityProjectBuffer),
    companyBuffer: parseProductivityBuffer(saved.companyBuffer, state.productivityCompanyBuffer),
  };
}
function productivityBufferForRows(rows, bufferType = "project") {
  const key = bufferType === "company" ? "companyBuffer" : "projectBuffer";
  if (!rows.length) return productivityBuffersForProject(state.project)[key];
  const weighted = rows.reduce((result, task) => {
    const weight = Math.max(Number(task.standardHours || 0), 1);
    return { total: result.total + productivityBuffersForProject(task.project)[key] * weight, weight: result.weight + weight };
  }, { total: 0, weight: 0 });
  const average = parseProductivityBuffer(weighted.total / Math.max(weighted.weight, 1));
  return Math.round(average * 100) / 100;
}
function bufferedUtilizationRate(hours, capacityHours, buffer) {
  const bufferedCapacity = Math.max(1, Number(capacityHours || 0) * (parseProductivityBuffer(buffer) / 100));
  return pct(Number(hours || 0), bufferedCapacity);
}
function productivityTargetFor(deliverable) {
  if (!deliverable) return null;
  return deliverables.find((item) => item.project === deliverable.project && item.name === deliverable.conversionTarget)
    || deliverables.find((item) => item.name === deliverable.conversionTarget)
    || deliverable;
}
function deliverableRuleFor(projectName, outputName) {
  const key = normalizeDeliverableKey(outputName);
  return deliverables.find((item) => item.project === projectName && normalizeDeliverableKey(item.name) === key)
    || deliverables.find((item) => normalizeDeliverableKey(item.name) === key)
    || null;
}
function productivityMonthlyStandard(deliverable, buffer) {
  const target = productivityTargetFor(deliverable);
  const dailyCount = dailyConversionCount(deliverable?.standardHours, target?.standardHours);
  const monthlyStandard = dailyCount * productivityBuffersForProject(deliverable?.project).workingDays;
  const parsedBuffer = parseProductivityBuffer(buffer);
  const bufferedStandard = Math.max(0, monthlyStandard * (parsedBuffer / 100));
  return { target, dailyCount, monthlyStandard, bufferedStandard };
}
function productivityLoadForTasks(rows, bufferType = "project", member = null, applyIndividualBuffer = false) {
  const hours = rows.reduce((sum, task) => sum + (member
    ? (applyIndividualBuffer ? memberResourceHours(task, member) : memberStandardHours(task, member))
    : (applyIndividualBuffer ? taskResourceHours(task) : Number(task.standardHours || 0))), 0);
  const capacity = member ? memberSelectedPeriodCapacity(member) : monthlyCapacity(1).totalHours;
  const buffer = productivityBufferForRows(rows, bufferType);
  const matchedCount = taskOutputDetailsForRows(rows, member).reduce((sum, { detail }) => sum + Number(detail.count || 0), 0);
  return { rate: bufferedUtilizationRate(hours, capacity, buffer), equivalentMonths: capacity ? hours / capacity : 0, matchedCount, buffer };
}
function taskOutputDetailsForRows(rows, member = null) {
  return rows.flatMap((task) => {
    const details = member ? assignedOutputDetails(task, member) : taskOutputDetails(task);
    return details.map((detail) => ({ task, detail }));
  });
}
function requesterName(task) {
  return task.requester || "-";
}
function monthlyTaskRows(items) {
  const keyword = state.taskSearch.trim().toLowerCase();
  return items.filter((task) => !keyword || [task.id, task.relatedTaskId, task.client, task.project, task.type, task.stage, task.stageDetail, requesterName(task), task.owner, task.title].some((value) => String(value || "").toLowerCase().includes(keyword)));
}
function monthlyWorkbookData(items, applySearch = true) {
  const taskRows = applySearch ? monthlyTaskRows(items) : items;
  const projectNames = new Set(taskRows.map((task) => task.project));
  const configuredNames = deliverables
    .filter((deliverable) => projectNames.has(deliverable.project))
    .map((deliverable) => deliverable.name);
  const actualNames = taskRows.flatMap((task) => task.outputs.map((output) => parseOutputText(output).name));
  const outputColumns = [...new Set([...configuredNames, ...actualNames])].sort((a, b) => a.localeCompare(b, "ko"));
  const headers = ["번호", "연결 업무번호", "고객사", "프로젝트", "유형", "종합 단계", "단계 상세", "요청자", "상태", "담당자", "기본 결과물 공수(H)", "촬영 유형", "적용 배수(업무 가중평균)", "결과물 집계 공수(H)", "접수일", "완료 예정일", "실제 완료일", "일정 판정", "지연 귀책", "일정 변경 횟수", "최근 일정 변경 사유", ...outputColumns];
  const rows = taskRows.map((task) => {
    const counts = new Map();
    task.outputs.forEach((output) => {
      const parsed = parseOutputText(output);
      counts.set(parsed.name, (counts.get(parsed.name) || 0) + parsed.count);
    });
    return [
      task.id,
      task.relatedTaskId || "",
      task.client,
      task.project,
      task.type,
      task.stage || "",
      task.stageDetail || "",
      requesterName(task),
      task.status,
      task.owner,
      Number(taskBaseStandardHours(task) || 0),
      normalizePhotoType(task.photoType),
      task.standardHours > 0 ? Math.round(taskResourceHours(task) / task.standardHours * 10000) / 10000 : 1,
      Number(task.standardHours || 0),
      task.start || "",
      task.dueDate || "",
      task.completedDate || "",
      taskScheduleLabel(task),
      task.slaResponsibility || "미확인",
      task.scheduleChanges?.length || 0,
      task.scheduleChanges?.at(-1)?.reason || task.scheduleChangeReason || "",
      ...outputColumns.map((name) => Number(counts.get(name) || 0)),
    ];
  });
  return { headers, rows };
}
function createMonthlyWorkbook(items) {
  const sheet = monthlyWorkbookData(items);
  return XlsxExporter.createWorkbook(sheet.headers, sheet.rows, "월간 작업 현황");
}
function deliverableDimensions(name) {
  const matches = [...String(name || "").matchAll(/(\d{2,5})\s*[x×＊*]\s*(\d{2,5})/gi)];
  const match = matches.at(-1);
  if (!match) return { width: "", height: "", resolution: "" };
  const width = Number(match[1]);
  const height = Number(match[2]);
  return { width, height, resolution: `${width}x${height}` };
}
function outputAggregateRows(items, includeWorker = false, applySearch = true) {
  const groups = new Map();
  (applySearch ? monthlyTaskRows(items) : items).forEach((task) => {
    taskOutputDetails(task).forEach((detail) => {
      const name = detail.name;
      const rule = deliverables.find((item) => item.project === task.project && normalizeDeliverableKey(item.name) === normalizeDeliverableKey(name));
      const ownerMember = members.find((member) => member._id === detail.ownerEmployeeId)
        || members.find((member) => member.name === detail.owner)
        || members.find((member) => member.name === task.owner);
      const owner = ownerMember?.name || detail.owner || task.owner || "미지정";
      const month = taskCompletionDate(task).slice(0, 7) || "기타(완료일 미입력)";
      const key = [month, task.project, normalizeDeliverableKey(rule?.name || name), includeWorker ? owner : ""].join("::");
      const current = groups.get(key) || {
        month,
        project: task.project,
        name: rule?.name || name,
        owner,
        team: ownerMember?.team || task.team || "미지정",
        subgroup: ownerMember?.subgroup || "",
        count: 0,
        effortPerItem: Number(rule?.standardHours ?? detail.standardHoursPerUnit ?? 0),
        totalEffort: 0,
      };
      current.count += Number(detail.count || 0);
      current.totalEffort += outputEffortHours(Number(detail.count || 0) * current.effortPerItem, task.photoType);
      groups.set(key, current);
    });
  });
  return [...groups.values()].sort((a, b) =>
    a.month.localeCompare(b.month)
    || a.project.localeCompare(b.project, "ko")
    || (includeWorker ? a.owner.localeCompare(b.owner, "ko") : 0)
    || a.name.localeCompare(b.name, "ko"));
}
function createOutputAggregateWorkbook(items, includeWorker = false) {
  const headers = includeWorker
    ? ["Month", "Worker", "Team", "Subgroup", "Project", "TaskName", "Keywords", "Width", "Height", "Resolution", "Count", "EffortPerItem", "TotalEffort"]
    : ["Month", "Project", "TaskName", "Keywords", "Width", "Height", "Resolution", "Count", "EffortPerItem", "TotalEffort"];
  const rows = outputAggregateRows(items, includeWorker).map((item) => {
    const dimensions = deliverableDimensions(item.name);
    const common = [
      item.project,
      item.name,
      item.name,
      dimensions.width,
      dimensions.height,
      dimensions.resolution,
      item.count,
      item.effortPerItem,
      item.totalEffort,
    ];
    return includeWorker
      ? [item.month, item.owner, item.team, item.subgroup, ...common]
      : [item.month, ...common];
  });
  return XlsxExporter.createWorkbook(headers, rows, includeWorker ? "작업자별 결과물 집계" : "결과물 누적 집계");
}
function outputAggregateWorkbookData(items, includeWorker = false, applySearch = true) {
  const headers = includeWorker
    ? ["Month", "Worker", "Team", "Subgroup", "Project", "TaskName", "Keywords", "Width", "Height", "Resolution", "Count", "EffortPerItem", "TotalEffort"]
    : ["Month", "Project", "TaskName", "Keywords", "Width", "Height", "Resolution", "Count", "EffortPerItem", "TotalEffort"];
  const rows = outputAggregateRows(items, includeWorker, applySearch).map((item) => {
    const dimensions = deliverableDimensions(item.name);
    const common = [item.project, item.name, item.name, dimensions.width, dimensions.height, dimensions.resolution, item.count, item.effortPerItem, item.totalEffort];
    return includeWorker ? [item.month, item.owner, item.team, item.subgroup, ...common] : [item.month, ...common];
  });
  return { headers, rows };
}
function createCombinedMonthlyWorkbook(items) {
  const tasksSheet = monthlyWorkbookData(items, false);
  const aggregateSheet = outputAggregateWorkbookData(items, false, false);
  const workerSheet = outputAggregateWorkbookData(items, true, false);
  return XlsxExporter.createMultiSheetWorkbook([
    { name: "업무 목록", ...tasksSheet },
    { name: "결과물 누적", ...aggregateSheet },
    { name: "작업자별 결과물", ...workerSheet },
  ]);
}
function downloadWorkbookFile(workbook, filename, button) {
  const url = URL.createObjectURL(new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  const original = button?.textContent;
  if (button) {
    button.textContent = "Excel 생성 완료";
    setTimeout(() => { button.textContent = original; }, 1400);
  }
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadMonthlyWorkbook() {
  const workbook = createMonthlyWorkbook(filteredTasks());
  const suffix = state.month || (state.year !== "전체" ? `${state.year}-전체` : "누적-전체");
  const filename = `월간_작업_현황_${suffix}.xlsx`;
  downloadWorkbookFile(workbook, filename, $("#downloadMonthlyExcel"));
}
function downloadOutputAggregateWorkbook(includeWorker = false) {
  const workbook = createOutputAggregateWorkbook(filteredTasks(), includeWorker);
  const suffix = state.month || (state.year !== "전체" ? `${state.year}-전체` : "누적-전체");
  const filename = includeWorker ? `작업자별_결과물_집계_${suffix}.xlsx` : `결과물_누적_집계_${suffix}.xlsx`;
  downloadWorkbookFile(workbook, filename, includeWorker ? $("#downloadWorkerOutputExcel") : $("#downloadOutputAggregateExcel"));
}
function tasksForDownloadRange(from, to) {
  normalizeScopedFilters();
  const activeNames = accessibleProjectNames();
  return tasks.filter((task) => activeNames.has(task.project)
    && (state.client === "전체" || task.client === state.client)
    && (state.project === "전체" || task.project === state.project)
    && taskCompletionDate(task) && taskCompletionDate(task) >= from && taskCompletionDate(task) <= to);
}
function downloadCombinedMonthlyWorkbook() {
  if (!state.month) {
    const button = $("#downloadMonthlyBundle");
    if (button) button.textContent = "월을 선택하세요";
    setTimeout(() => { if (button) button.textContent = "월 데이터 통합"; }, 1400);
    return;
  }
  const items = filteredTasks();
  const workbook = createCombinedMonthlyWorkbook(items);
  downloadWorkbookFile(workbook, `월간_통합_데이터_${state.month}.xlsx`, $("#downloadMonthlyBundle"));
}
function downloadCombinedRangeWorkbook() {
  const from = $("#monthlyDownloadFrom")?.value || "";
  const to = $("#monthlyDownloadTo")?.value || "";
  const button = $("#downloadRangeBundle");
  if (!from || !to || from > to) {
    if (button) button.textContent = "날짜를 확인하세요";
    setTimeout(() => { if (button) button.textContent = "기간 데이터 통합"; }, 1400);
    return;
  }
  const workbook = createCombinedMonthlyWorkbook(tasksForDownloadRange(from, to));
  downloadWorkbookFile(workbook, `기간_통합_데이터_${from}_${to}.xlsx`, button);
}
function createDeliverableSettingsWorkbook(project = "") {
  const headers = ["프로젝트", "결과물 명칭", "기준공수", "평균 작업일", "일정 기준 사용 여부", "환산 기준 결과물"];
  const rows = deliverables
    .filter((item) => !project || item.project === project)
    .sort((a, b) => a.project.localeCompare(b.project, "ko") || a.name.localeCompare(b.name, "ko"))
    .map((item) => [
      item.project,
      item.name,
      Number(item.standardHours || 0),
      item.slaEnabled === true ? Number(item.slaDays || 0) : "",
      item.slaEnabled === true ? "사용" : "미설정",
      item.conversionTarget || item.name,
    ]);
  return XlsxExporter.createWorkbook(headers, rows, "결과물업로드");
}
function downloadDeliverableSettingsWorkbook() {
  if (!state.deliverableProject) return;
  const workbook = createDeliverableSettingsWorkbook(state.deliverableProject);
  const date = localDateString().replace(/-/g, "");
  downloadWorkbookFile(workbook, `업무템플릿_${state.deliverableProject}_${date}.xlsx`, $("#downloadDeliverableSettings"));
}
function createExcelCountSummaryWorkbook() {
  const headers = ["프로젝트", "업무 템플릿값", "업로드 Key Name", "매칭 기준", "Count", "환산공수(H)"];
  const rows = (state.excelImport.countSummary || []).map((item) => [
    item.project,
    item.classification,
    item.keyNames.length ? item.keyNames.join(", ") : "-",
    item.matchTypes?.length ? item.matchTypes.join(", ") : "-",
    formatNumber(item.count, 2),
    formatNumber(item.hours, 2),
  ]);
  return XlsxExporter.createWorkbook(headers, rows, "결과물 Count 취합");
}
function downloadExcelCountSummary() {
  if (!state.excelImport.fileName) return;
  const workbook = createExcelCountSummaryWorkbook();
  const date = localDateString().replace(/-/g, "");
  const url = URL.createObjectURL(new Blob([workbook], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `결과물_Count_취합_${date}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  const button = $("#downloadExcelCountSummary");
  const original = button.textContent;
  button.textContent = "Excel 생성 완료";
  setTimeout(() => { button.textContent = original; }, 1400);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function activeProjectConfigs() { return projectConfigs.filter((p) => p.status !== "closed"); }
function closedProjectConfigs() { return projectConfigs.filter((p) => p.status === "closed"); }
function activeProjectNames() { return new Set(activeProjectConfigs().map((p) => p.project)); }
function accountTeamProjectNames(account) {
  if (!account) return [];
  const member = members.find((item) => item.name === account.name && item.employmentStatus !== "퇴사");
  const teamName = member?.team || account.team || "";
  const teamProjects = !teamName || teamName === "미지정" ? [] : projectWorkSettings
    .filter((setting) => [...new Set([...(setting.teams || []), setting.team].filter(Boolean))].includes(teamName) && projectConfig(setting.project)?.status !== "closed")
    .map((setting) => setting.project);
  const individualProjects = member ? Object.entries(projectAssignments)
    .filter(([project, names]) => names.includes(member.name) && projectConfig(project)?.status !== "closed")
    .map(([project]) => project) : [];
  return [...new Set([...teamProjects, ...individualProjects])];
}
function accountAssignedProjectNames(account) {
  if (!account) return [];
  const member = members.find((item) => item.name === account.name && item.employmentStatus !== "퇴사");
  if (!member) return [];
  return Object.entries(projectAssignments)
    .filter(([project, names]) => names.includes(member.name) && projectConfig(project)?.status !== "closed")
    .map(([project]) => project);
}
function accessibleProjectConfigs(account = currentAccount()) {
  const activeConfigs = activeProjectConfigs();
  if (!account || account.role === "admin") return activeConfigs;
  const assigned = new Set(account.role === "portal" ? (account.projects || []) : accountAssignedProjectNames(account));
  return activeConfigs.filter((project) => assigned.has(project.project));
}
function canAccessView(view, account = currentAccount()) {
  if (!account) return false;
  const operatorViews = new Set(["myWork", "notifications", "dashboard", "monthly", "daily", "gantt", "standard", "taskStatus", "workResourceCreate", "workResources", "resource", "health", "profit", "portal"]);
  const adminViews = new Set(["projectConfig", "companyGroup", "accountSetting", "excelUpload", "projectSetting", "deliverableSetting", "employeeReview", "employeeReviewManagement", "systemSetting", "notificationSetting"]);
  if (operatorViews.has(view)) {
    if (account.role === "worker") return view === "myWork" || view === "workResources" || view === "notifications";
    if (account.role === "portal") return view === "portal";
    if (account.role === "operator_no_profit") return view !== "myWork" && view !== "profit" && view !== "portal";
    if (account.role === "operator_output_admin") return view !== "myWork" && view !== "portal";
    if (account.role === "operator_all") return view !== "myWork";
    if (account.role === "admin") return true;
    return false;
  }
  if (adminViews.has(view)) {
    if (account.role === "admin") return true;
    if (account.role === "operator_output_admin") return view === "deliverableSetting";
  }
  return false;
}
function firstAllowedView(mode, account = currentAccount()) {
  const selector = `.nav-mode[data-menu-mode="${mode}"] .nav-item`;
  return $$(selector).find((button) => canAccessView(button.dataset.view, account));
}
function accessibleProjectNames(account = currentAccount()) {
  return new Set(accessibleProjectConfigs(account).map((project) => project.project));
}
function workResourceProjectConfigs(account = currentAccount()) {
  const activeConfigs = activeProjectConfigs();
  if (!account) return [];
  if (account.role === "admin") return activeConfigs;
  const explicitlyAssigned = new Set(account.role === "portal" ? (account.assignedProjects || account.projects || []) : accountAssignedProjectNames(account));
  return activeConfigs.filter((project) => explicitlyAssigned.has(project.project));
}
function canAccessWorkResource(resource, account = currentAccount()) {
  if (!resource || !account) return false;
  return workResourceProjectConfigs(account).some((project) => project.project === resource.project);
}
function normalizeScopedFilters() {
  const scopedConfigs = accessibleProjectConfigs();
  const scopedProjects = new Set(scopedConfigs.map((project) => project.project));
  const scopedClients = new Set(scopedConfigs.map((project) => project.client));
  if (state.project !== "전체" && !scopedProjects.has(state.project)) state.project = "전체";
  if (state.client !== "전체" && !scopedClients.has(state.client)) {
    state.client = "전체";
    state.project = "전체";
  }
}
function filteredTasks() {
  normalizeScopedFilters();
  const activeNames = accessibleProjectNames();
  return tasks.filter((t) => activeNames.has(t.project)
    && (state.client === "전체" || t.client === state.client)
    && (state.project === "전체" || t.project === state.project)
    && taskMatchesWorkPeriod(t, state.year, state.month));
}
function isManagerPosition(memberOrName) {
  const member = typeof memberOrName === "string" ? members.find((item) => item.name === memberOrName) : memberOrName;
  return member?.position === "관리자";
}
function memberHasAssignedWork(member, items = []) {
  return Boolean(member) && items.some((task) => taskAssignedToMember(task, member));
}
function isWorkforceMember(member, items = []) {
  return Boolean(member) && member.employmentStatus !== "퇴사" && (!isManagerPosition(member) || memberHasAssignedWork(member, items));
}
function scopedWorkerNames(items) {
  const activeMembers = members.filter((member) => isWorkforceMember(member, items));
  const activeNames = new Set(activeMembers.map((member) => member.name));
  const scopedConfigs = accessibleProjectConfigs();
  if (state.project === "전체" && state.client === "전체") {
    const assignedNames = new Set(scopedConfigs.flatMap((project) => projectAssignments[project.project] || []));
    items.forEach((task) => assignedNames.add(task.owner));
    return new Set([...assignedNames].filter((name) => activeNames.has(name)));
  }
  const scopedProjects = scopedConfigs
    .filter((project) => (state.client === "전체" || project.client === state.client) && (state.project === "전체" || project.project === state.project))
    .map((project) => project.project);
  const assignments = projectAssignments;
  const assignedNames = new Set(scopedProjects.flatMap((project) => assignments[project] || []));
  items.forEach((task) => assignedNames.add(task.owner));
  return new Set([...assignedNames].filter((name) => activeNames.has(name)));
}
function cls(rate, danger = 35, warn = 18) { return rate >= danger ? "danger" : rate >= warn ? "warn" : "good"; }
function projectConfig(project) { return projectConfigs.find((p) => p.project === project); }
function projectDirection(project) { return projectConfig(project)?.direction || "-"; }
const PROJECT_STAGE_OPTIONS = {
  구축: ["요구사항·범위 정의", "기획 구성", "기획 추가·보완", "디자인", "퍼블리싱", "개발", "내부 검수", "고객 검수", "오픈 준비", "오픈·안정화", "운영 이관"],
  운영: ["요청 접수", "기획 구성", "기획 추가·보완", "제작", "내부 검수", "고객 검수", "반영·배포", "완료"],
};
function projectUsesStages(projectName) {
  return ["구축", "운영"].includes(projectDirection(projectName));
}
function projectStageOptions(projectName) {
  return PROJECT_STAGE_OPTIONS[projectDirection(projectName)] || [];
}
function taskStageValue(context = "register") {
  const prefix = context === "edit" ? "editTask" : "task";
  return $(`#${prefix}StageInput`)?.value.trim() || $(`#${prefix}StageSelect`)?.value || "";
}
function syncTaskStageFields(projectName, context = "register", preserveValue = false) {
  const prefix = context === "edit" ? "editTask" : "task";
  const select = $(`#${prefix}StageSelect`);
  const input = $(`#${prefix}StageInput`);
  const detailInput = $(`#${prefix}StageDetailInput`);
  const stageField = $(`#${prefix}StageField`);
  const customField = $(`#${prefix}StageCustomField`);
  const detailField = $(`#${prefix}StageDetailField`);
  const enabled = projectUsesStages(projectName);
  const options = projectStageOptions(projectName);
  const currentValue = preserveValue ? taskStageValue(context) : "";
  stageField?.classList.toggle("hidden", !enabled);
  customField?.classList.toggle("hidden", !enabled);
  detailField?.classList.toggle("hidden", !enabled);
  if (select) {
    select.innerHTML = `<option value="">단계를 선택하세요</option>${options.map((stage) => `<option value="${escapeHtml(stage)}">${escapeHtml(stage)}</option>`).join("")}`;
  }
  if (!enabled) {
    if (select) select.value = "";
    if (input) input.value = "";
    if (detailInput) detailInput.value = "";
  } else if (preserveValue && currentValue) {
    if (options.includes(currentValue)) {
      if (select) select.value = currentValue;
      if (input) input.value = "";
    } else {
      if (select) select.value = "";
      if (input) input.value = currentValue;
    }
  } else if (!preserveValue) {
    if (select) select.value = "";
    if (input) input.value = "";
    if (detailInput) detailInput.value = "";
  }
  if (select) select.dataset.project = projectName;
  if (input) input.dataset.project = projectName;
}
function projectContract(project) {
  const config = projectConfig(project);
  const fallback = contracts[project] || {};
  const assignedWorkers = assignedProjectWorkers(project);
  const namedManagers = assignedProjectManagers(project);
  const managementPeople = namedManagers.length || Number(config?.managementPeople || fallback.managementPeople || 0);
  return {
    client: config?.client || fallback.client || "-",
    total: config?.total || fallback.total || 0,
    monthly: config?.monthly || fallback.monthly || 0,
    unitPrice: config?.unitPrice || fallback.unitPrice || 0,
    contractPeople: config?.contractPeople || fallback.contractPeople || 0,
    workerPeople: assignedWorkers.length || fallback.workerPeople || fallback.inputPeople || 0,
    managementPeople,
    inputPeople: (assignedWorkers.length || fallback.workerPeople || fallback.inputPeople || 0) + managementPeople,
    monthlyPersonCost: config?.monthlyPersonCost || fallback.monthlyPersonCost || 0,
    startDate: config?.startDate || fallback.startDate || "",
    endDate: config?.endDate || fallback.endDate || "",
    costPerHour: fallback.costPerHour || 8
  };
}
function summarize(items) {
  const total = items.length;
  const completed = items.filter((t) => t.status === "완료").length;
  const urgent = items.filter((t) => t.urgent).length;
  const delayed = items.filter((t) => t.delayed).length;
  const slaPending = items.filter((t) => t.slaPending).length;
  const slaExcluded = items.filter((t) => t.slaExcluded).length;
  const slaAssessed = items.filter((t) => ["준수", "위반"].includes(t.slaAssessment)).length;
  const slaCompliant = items.filter((t) => t.slaAssessment === "준수").length;
  const revision = items.filter((t) => t.revision).length;
  const rejected = items.filter((t) => t.rejected || t.status === "반려").length;
  const outputs = items.reduce((s, t) => s + outputCount(t), 0);
  const standardHours = items.reduce((s, t) => s + t.standardHours, 0);
  const checkedFiles = items.reduce((s, t) => s + (t.checkedCount ?? outputCount(t)), 0);
  const unmatched = items.reduce((s, t) => s + (t.unmatchedCount || 0), 0);
  const owners = new Set(items.map((t) => t.owner)).size;
  const delta = total ? Math.round(items.reduce((s, t) => s + t.monthDelta, 0) / total) : 0;
  return { total, completed, urgent, delayed, slaPending, slaExcluded, slaAssessed, slaCompliant, revision, rejected, outputs, standardHours, checkedFiles, unmatched, owners, delta, completionRate: pct(completed, total), checkRate: pct(checkedFiles, outputs), unmatchedRate: pct(unmatched, outputs), urgentRate: pct(urgent, total), delayRate: pct(delayed, total), slaRate: pct(slaCompliant, slaAssessed), revisionRate: pct(revision, total), rejectedRate: pct(rejected, total) };
}
function projectSummaries(items = filteredTasks()) {
  return accessibleProjectConfigs()
    .filter((project) => (state.client === "전체" || project.client === state.client) && (state.project === "전체" || project.project === state.project))
    .map((project) => {
      const rows = items.filter((task) => task.project === project.project);
      return {
        project: project.project,
        client: project.client,
        rows,
        data: summarize(rows),
        contract: projectContract(project.project),
      };
    });
}

function renderFilters() {
  normalizeScopedFilters();
  const activeConfigs = accessibleProjectConfigs();
  const activeNames = accessibleProjectNames();
  const clients = ["전체", ...new Set([...activeConfigs.map((p) => p.client), ...tasks.filter((t) => activeNames.has(t.project)).map((t) => t.client)])];
  const projects = ["전체", ...new Set([
    ...activeConfigs.filter((p) => state.client === "전체" || p.client === state.client).map((p) => p.project),
    ...tasks.filter((t) => activeNames.has(t.project) && (state.client === "전체" || t.client === state.client)).map((t) => t.project)
  ])];
  $("#clientFilter").innerHTML = clients.map((x) => `<option ${x === state.client ? "selected" : ""}>${x}</option>`).join("");
  $("#projectFilter").innerHTML = projects.map((x) => `<option value="${escapeHtml(x)}" ${x === state.project ? "selected" : ""}>${x === "전체" && PROJECT_REQUIRED_VIEWS.has(state.view) ? "프로젝트 선택" : escapeHtml(x)}</option>`).join("");
  const availableMonths = availableTaskMonths(tasks.filter((task) => activeNames.has(task.project)));
  const years = ["전체", ...new Set(availableMonths.map((month) => month.slice(0, 4)))];
  if (!years.includes(state.year)) {
    state.year = "전체";
    state.month = "";
  }
  if ($("#yearFilter")) {
    $("#yearFilter").innerHTML = optionList(years, state.year);
  }
  if ($("#monthFilter")) {
    const months = selectableTaskMonths(availableMonths, state.year);
    if (state.month && state.month !== "other" && !months.includes(state.month)) state.month = "";
    $("#monthFilter").innerHTML = [
      `<option value="" ${!state.month ? "selected" : ""}>전체</option>`,
      `<option value="other" ${state.month === "other" ? "selected" : ""}>기타(완료일 미입력)</option>`,
      ...months.map((value) => {
        const year = value.slice(0, 4);
        const month = value.slice(5, 7);
        const label = state.year === "전체" ? `${year}년 ${Number(month)}월` : `${Number(month)}월`;
        return `<option value="${value}" ${value === state.month ? "selected" : ""}>${label}</option>`;
      }),
    ].join("");
    $("#monthFilter").disabled = false;
  }
  const awaitingProject = PROJECT_REQUIRED_VIEWS.has(state.view) && state.project === "전체";
  if ($("#yearFilter")) $("#yearFilter").disabled = awaitingProject;
  if ($("#monthFilter")) $("#monthFilter").disabled = awaitingProject || $("#monthFilter").disabled;
  if ($("#adminTeamFilter")) {
    $("#adminTeamFilter").innerHTML = ["전체", ...teams.map((t) => t.name)].map((x) => `<option ${x === state.adminTeam ? "selected" : ""}>${x}</option>`).join("");
    $("#adminGradeFilter").innerHTML = ["전체", ...grades].map((x) => `<option ${x === state.adminGrade ? "selected" : ""}>${x}</option>`).join("");
    $("#adminPositionFilter").innerHTML = ["전체", ...positions.map((p) => p.name)].map((x) => `<option ${x === state.adminPosition ? "selected" : ""}>${x}</option>`).join("");
  }
}

function optionList(values, selected) {
  return values.map((x) => `<option ${x === selected ? "selected" : ""}>${x}</option>`).join("");
}

function subgroupOptionsForTeam(teamName, selected = "") {
  const subgroups = teams.find((team) => team.name === teamName)?.subgroups || [];
  return optionList(["미지정", ...subgroups], selected || "미지정");
}

function taskStatusClass(status) {
  if (status === "완료") return "good";
  if (status === "반려") return "danger";
  if (["요청", "진행", "검수", "보류"].includes(status)) return "warn";
  return "";
}

function currentAccount() {
  return accounts.find((account) => account.id === state.currentAccountId) || accounts[0] || null;
}

function renamePersonReferences(beforeName, afterName) {
  if (!beforeName || !afterName || beforeName === afterName) return;
  if (workers[beforeName] && !workers[afterName]) workers[afterName] = workers[beforeName];
  if (workers[beforeName]) delete workers[beforeName];
  tasks.forEach((task) => {
    if (task.owner === beforeName) task.owner = afterName;
    if (Array.isArray(task.importOwners)) {
      task.importOwners = [...new Set(task.importOwners.map((name) => (name === beforeName ? afterName : name)))];
    }
    if (Array.isArray(task.outputDetails)) {
      task.outputDetails.forEach((detail) => {
        if (detail.owner === beforeName) detail.owner = afterName;
      });
    }
  });
  Object.keys(projectAssignments).forEach((project) => {
    projectAssignments[project] = [...new Set(projectAssignments[project].map((name) => (name === beforeName ? afterName : name)))];
  });
}

function ensureAccountMember(account) {
  if (!account?.name) return null;
  let member = members.find((item) => item.name === account.name);
  const loginIdMember = members.find((item) => item.name === account.id);
  if (!member && loginIdMember) {
    renamePersonReferences(loginIdMember.name, account.name);
    loginIdMember.name = account.name;
    member = loginIdMember;
  }
  if (!member) {
    member = {
      name: account.name,
      team: account.team || "미지정",
      subgroup: account.subgroup || "",
      position: "미지정",
      grade: "미지정",
      employmentStatus: "재직",
    };
    members.unshift(member);
  } else {
    member.team = account.team || member.team || "미지정";
    member.subgroup = account.subgroup || member.subgroup || "";
  }
  workers[account.name] = {
    ...(workers[account.name] || { capacity: 100, vacation: 0, convertible: ["운영"] }),
    team: member.team,
    subgroup: member.subgroup,
  };
  return member;
}

function authMessage(error) {
  const message = String(error?.message || error || "");
  if (/invalid login credentials/i.test(message)) return "아이디 또는 비밀번호가 올바르지 않습니다.";
  if (/email not confirmed/i.test(message)) return "Supabase에서 확인 처리되지 않은 계정입니다.";
  if (/failed to fetch|networkerror/i.test(message)) return "Supabase에 연결할 수 없습니다. 인터넷 연결을 확인하세요.";
  return message || "로그인 처리 중 오류가 발생했습니다.";
}

function showLogin(message = "", isError = false) {
  document.body.classList.add("auth-pending");
  const gate = $("#authGate");
  if (gate) gate.hidden = false;
  const messageNode = $("#loginMessage");
  if (messageNode) {
    messageNode.textContent = message;
    messageNode.classList.toggle("error", isError);
  }
}

function applyBranding() {
  const companyName = String(state.branding?.companyName || "회사명").trim() || "회사명";
  const subtitle = String(state.branding?.subtitle || "프로젝트 운영 관제").trim() || "프로젝트 운영 관제";
  const logoDataUrl = String(state.branding?.logoDataUrl || "");
  $$(".brand-company-name").forEach((node) => { node.textContent = companyName; });
  $$(".brand-subtitle").forEach((node) => { node.textContent = subtitle; });
  $$(".brand-logo").forEach((image) => {
    image.hidden = !logoDataUrl;
    if (logoDataUrl) image.src = logoDataUrl;
    else image.removeAttribute("src");
    image.closest(".brand-mark")?.classList.toggle("has-logo", Boolean(logoDataUrl));
  });
  document.title = `${companyName} | ${subtitle}`;
}

function renderSystemSettings() {
  const companyName = String(state.branding?.companyName || "회사명");
  const subtitle = String(state.branding?.subtitle || "프로젝트 운영 관제");
  const logoDataUrl = String(state.branding?.logoDataUrl || "");
  if ($("#systemCompanyName") && document.activeElement !== $("#systemCompanyName")) $("#systemCompanyName").value = companyName;
  if ($("#systemBrandSubtitle") && document.activeElement !== $("#systemBrandSubtitle")) $("#systemBrandSubtitle").value = subtitle;
  if ($("#systemBrandPreviewName")) $("#systemBrandPreviewName").textContent = companyName || "회사명";
  if ($("#systemBrandPreviewSubtitle")) $("#systemBrandPreviewSubtitle").textContent = subtitle || "프로젝트 운영 관제";
  const preview = $("#systemBrandPreviewLogo");
  if (preview) {
    preview.hidden = !logoDataUrl;
    if (logoDataUrl) preview.src = logoDataUrl;
    else preview.removeAttribute("src");
  }
  $("#systemBrandPreviewMark")?.classList.toggle("has-logo", Boolean(logoDataUrl));
  const calendar = state.workCalendar || { mode: "manual", apiUrl: "", months: {} };
  if ($("#workCalendarMode")) $("#workCalendarMode").value = calendar.mode === "api" ? "api" : "manual";
  if ($("#workCalendarMonth") && !$("#workCalendarMonth").value) $("#workCalendarMonth").value = DEFAULT_MONTH;
  if ($("#workCalendarApiUrl") && document.activeElement !== $("#workCalendarApiUrl")) $("#workCalendarApiUrl").value = calendar.apiUrl || "";
  const isApi = calendar.mode === "api";
  $$(".work-calendar-api-field").forEach((node) => node.classList.toggle("hidden", !isApi));
  const rows = Object.entries(calendar.months || {}).sort(([a], [b]) => b.localeCompare(a));
  if ($("#workCalendarRows")) $("#workCalendarRows").innerHTML = rows.map(([monthKey, entry]) => {
    const [year, month] = monthKey.split("-").map(Number);
    const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
    const defaultDays = workingDaysBetween(`${monthKey}-01`, `${monthKey}-${lastDay}`);
    return `<tr><td><strong>${monthKey}</strong></td><td>${formatNumber(entry.workingDays, 1)} W/D</td><td>${defaultDays} W/D</td><td><span class="pill ${entry.source === "api" ? "good" : ""}">${entry.source === "api" ? "API 자동" : "수동"}</span></td><td><button class="danger-button small work-calendar-delete" data-month="${monthKey}" type="button">삭제</button></td></tr>`;
  }).join("") || `<tr><td colspan="5">등록된 월별 W/D가 없습니다. 기본 영업일 계산값을 사용합니다.</td></tr>`;
}

function normalizeWorkCalendarApiPayload(payload) {
  const result = {};
  const add = (month, workingDays) => {
    const key = String(month || "").slice(0, 7);
    const value = Number(workingDays);
    if (/^\d{4}-\d{2}$/.test(key) && Number.isFinite(value) && value >= 0 && value <= 31) result[key] = value;
  };
  const source = payload?.months ?? payload?.data ?? payload;
  if (Array.isArray(source)) {
    source.forEach((entry) => add(entry?.month ?? entry?.yearMonth ?? entry?.year_month, entry?.workingDays ?? entry?.working_days ?? entry?.wd));
  } else if (source && typeof source === "object") {
    Object.entries(source).forEach(([month, entry]) => add(month, entry?.workingDays ?? entry?.working_days ?? entry?.wd ?? entry));
  }
  return result;
}

async function persistWorkCalendar(message) {
  if (!operationalDbReady || !remoteData?.saveSetting) throw new Error("로그인 후 Supabase DB에 연결해야 저장할 수 있습니다.");
  setDbSaveStatus("saving", "월별 W/D 저장 중");
  await remoteData.saveSetting("work_calendar", state.workCalendar);
  setDbSaveStatus("saved", message);
}

function applyRemoteProfile(profile) {
  if (!profile || profile.status !== "사용") throw new Error("사용이 중지된 계정입니다.");
  const account = {
    id: profile.login_id,
    name: profile.display_name,
    team: profile.team_name || "미지정",
    subgroup: profile.subgroup_name || "",
    role: profile.role || "operator_no_profit",
    projects: [...(profile.projects || [])],
    assignedProjects: [...(profile.projects || [])],
    status: profile.status,
    remote: true,
    _userId: profile.user_id,
  };
  accounts = [account, ...accounts.filter((item) => item.id !== account.id)];
  state.currentAccountId = account.id;
  state.selectedMemberAccount = account.id;
}

function replaceArray(target, values) {
  target.splice(0, target.length, ...values);
}

function clearObject(target) {
  Object.keys(target).forEach((key) => delete target[key]);
}

function dbDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function parseTaskDbMeta(value) {
  const text = String(value || "");
  if (!text.startsWith("APP_META:")) return {};
  try {
    return JSON.parse(text.slice(9));
  } catch {
    return {};
  }
}

function taskDbNote(task) {
  const meta = {
    importKeys: task.importKeys,
    importSource: task.importSource,
    importOwners: task.importOwners,
    importBatchId: task.importBatchId || undefined,
    uploadSubNumber: task.uploadSubNumber,
    stage: task.stage || undefined,
    stageDetail: task.stageDetail || undefined,
    relatedTaskId: task.relatedTaskId || undefined,
    manualStandardHours: task.manualStandardHours ?? undefined,
    slaResponsibility: task.slaRuleStored || task.scheduleChanges?.length ? task.slaResponsibility : undefined,
    scheduleChangeReason: task.slaRuleStored || task.scheduleChanges?.length ? task.scheduleChangeReason : undefined,
    originalDueDate: task.originalDueDate || undefined,
    slaDueDate: task.slaRuleStored ? task.slaDueDate : undefined,
    slaLimit: task.slaRuleStored ? task.slaLimit : undefined,
    slaRuleLabel: task.slaRuleStored ? task.slaRuleLabel : undefined,
    slaRuleType: task.slaRuleStored ? task.slaRuleType : undefined,
    slaConfigured: task.slaRuleStored ? task.slaConfigured : undefined,
    slaRuleStored: task.slaRuleStored || undefined,
    scheduleChanges: task.scheduleChanges?.length ? task.scheduleChanges : undefined,
    detailNotes: task.detailNotes?.length ? task.detailNotes : undefined,
    statusUpdatedAt: task.statusUpdatedAt || undefined,
  };
  const hasMeta = Object.values(meta).some((value) => Array.isArray(value) ? value.length : value);
  return hasMeta ? `APP_META:${JSON.stringify(meta)}` : null;
}

function yn(value) {
  return String(value || "").toUpperCase() === "Y";
}

function uiMoney(value) {
  return Number(value || 0) / 10000;
}

function dbMoney(value) {
  return Math.round(Number(value || 0) * 10000);
}

function idNumber(value) {
  return Number(String(value || "").match(/(\d+)$/)?.[1] || 0);
}

function nextRecordId(prefix, values, width = 4) {
  const next = Math.max(0, ...values.map(idNumber)) + 1;
  return `${prefix}-${String(next).padStart(width, "0")}`;
}

function applyOperationalDb(data) {
  dbRelationshipRepairNeeded = false;
  dbOutputRepairNeeded = false;
  dbObsoleteOutputIds = [];
  const projectRows = data.projects || [];
  const teamRows = data.teams || [];
  const positionRows = data.positions || [];
  const employeeRows = data.employees || [];
  const assignmentRows = data.project_members || [];
  const taskRows = data.task_history || [];
  const outputRows = data.output_history || [];
  const ruleRows = data.output_rules || [];
  const changeRows = data.project_changes || [];
  const workerStatusRows = data.worker_task_status || [];
  const workResourceRows = data.work_resources || [];
  EmployeeReviewManagement.hydrate(data.employee_review_entries, data.employee_review_ready);
  const notificationStateRows = data.notification_states || [];
  const uploadBatchRows = data.upload_batches || [];
  const uploadBatchItemRows = data.upload_batch_items || [];
  const profileRows = data.app_profiles || [];
  const profileProjectRows = data.app_user_projects || [];
  const settingRows = data.app_settings || [];

  const projectById = new Map(projectRows.map((row) => [row.project_id, row]));
  const teamById = new Map(teamRows.map((row) => [row.team_id, row]));
  const positionById = new Map(positionRows.map((row) => [row.position_id, row]));
  const employeeById = new Map(employeeRows.map((row) => [row.employee_id, row]));

  replaceArray(teams, teamRows.map((row) => ({
    _id: row.team_id,
    name: row.team_name,
    baseGroup: row.base_group || row.team_name,
    subgroups: Array.isArray(row.subgroups) ? row.subgroups : (row.subgroup_name ? [row.subgroup_name] : []),
    activeYn: row.active_yn || "Y",
  })));
  replaceArray(positions, positionRows.map((row) => ({
    _id: row.position_id,
    name: row.position_name,
    activeYn: row.active_yn || "Y",
  })));
  if (!positions.some((position) => position.name === "관리자")) {
    positions.push({ _id: nextRecordId("POS", positions.map((position) => position._id), 3), name: "관리자", activeYn: "Y" });
  }
  replaceArray(members, employeeRows.map((row) => {
    const team = teamById.get(row.team_id);
    const position = positionById.get(row.position_id);
    return {
      _id: row.employee_id,
      name: row.employee_name,
      team: team?.team_name || "미지정",
      subgroup: row.subgroup_name || "",
      position: position?.position_name || "미지정",
      grade: row.grade || "미지정",
      employmentStatus: row.employment_status || "재직",
      joinedDate: dbDate(row.joined_date),
      leftDate: dbDate(row.left_date),
      resignationReason: row.resignation_reason || "",
      reducedWork: yn(row.reduced_work_yn),
      reducedWorkStartDate: dbDate(row.reduced_work_start_date),
      reducedWorkEndDate: dbDate(row.reduced_work_end_date),
      reducedWorkStartTime: String(row.reduced_work_start_time || "10:00").slice(0, 5),
      reducedWorkEndTime: String(row.reduced_work_end_time || "16:00").slice(0, 5),
      reducedDailyHours: Number(row.reduced_daily_hours || 0),
    };
  }));
  replaceArray(grades, [...new Set([...DEFAULT_GRADES, ...employeeRows.map((row) => row.grade).filter(Boolean)])]);

  clearObject(workers);
  members.forEach((member) => {
    workers[member.name] = { team: member.team, subgroup: member.subgroup, capacity: 100, vacation: 0, convertible: ["운영"] };
  });

  replaceArray(projectConfigs, projectRows.map((row) => {
    const startDate = dbDate(row.start_date);
    const endDate = dbDate(row.end_date);
    const storedTotal = uiMoney(row.total_contract_amount);
    const storedMonthly = uiMoney(row.monthly_contract_amount);
    const amounts = normalizedContractAmounts({ total: storedTotal, monthly: storedMonthly, startDate, endDate, source: storedTotal ? "total" : "monthly" });
    const contractPeople = Number(row.planned_people || 0);
    return {
      _id: row.project_id,
      client: row.client_name,
      project: row.project_name,
      direction: row.direction || "운영",
      monthly: amounts.monthly,
      total: amounts.total,
      unitPrice: calculatedUnitPrice(amounts.monthly, contractPeople),
      contractPeople,
      managementPeople: Number(row.management_people || 0),
      monthlyPersonCost: uiMoney(row.monthly_person_cost),
      parentProjectId: row.parent_project_id || "",
      startDate,
      endDate,
      status: row.status === "종료" ? "closed" : "active",
      closedMonth: row.status === "종료" ? endDate.slice(0, 7) : "",
      closeReason: row.note || "",
      assignedTeamId: row.assigned_team_id || "",
      slaDays: row.sla_days === null || row.sla_days === undefined ? null : Number(row.sla_days),
      absoluteDailyHours: Number(row.absolute_daily_hours) === 8 ? 8 : 7,
      assignmentDailyTarget: row.assignment_daily_target == null ? null : Number(row.assignment_daily_target),
      assignmentMonthlyTarget: row.assignment_monthly_target == null ? null : Number(row.assignment_monthly_target),
      publicDailyEnabled: row.public_daily_enabled === true,
    };
  }));

  clearObject(contracts);
  projectConfigs.forEach((project) => {
    contracts[project.project] = {
      client: project.client,
      total: project.total,
      monthly: project.monthly,
      unitPrice: project.unitPrice,
      contractPeople: project.contractPeople,
      managementPeople: project.managementPeople,
      monthlyPersonCost: project.monthlyPersonCost,
      startDate: project.startDate,
      endDate: project.endDate,
      costPerHour: 0,
    };
  });

  dbAssignmentMeta = new Map();
  projectAssignments = {};
  assignmentRows.forEach((row) => {
    const project = projectById.get(row.project_id)?.project_name;
    const employee = employeeById.get(row.employee_id)?.employee_name;
    if (!project || !employee) return;
    dbAssignmentMeta.set(`${project}::${employee}`, row);
    if (row.active_yn !== "N") {
      projectAssignments[project] ||= [];
      projectAssignments[project].push(employee);
    }
  });
  const settingMonthByProjectId = new Map();
  const managerNamesByProjectId = new Map();
  assignmentRows.filter((row) => row.active_yn !== "N" && row.role === "관리자").forEach((row) => {
    const employeeName = employeeById.get(row.employee_id)?.employee_name;
    if (!employeeName) return;
    managerNamesByProjectId.set(row.project_id, [...(managerNamesByProjectId.get(row.project_id) || []), employeeName]);
  });
  changeRows
    .filter((row) => row.field_name === "적용월" && row.after_value)
    .sort((a, b) => {
      const dateOrder = String(a.changed_at || "").localeCompare(String(b.changed_at || ""));
      return dateOrder || idNumber(a.change_id) - idNumber(b.change_id);
    })
    .forEach((row) => settingMonthByProjectId.set(row.project_id, row.after_value));

  replaceArray(projectWorkSettings, projectConfigs.map((project) => {
    const assignedTeam = teamById.get(project.assignedTeamId)?.team_name;
    const assignedNames = new Set(projectAssignments[project.project] || []);
    const managerMembers = [...new Set(managerNamesByProjectId.get(project._id) || [])];
    const managerSet = new Set(managerMembers);
    const workerAssignedNames = new Set([...assignedNames].filter((name) => !managerSet.has(name)));
    const memberTeams = [...workerAssignedNames].map((name) => members.find((member) => member.name === name)?.team).filter(Boolean);
    const teamCounts = memberTeams.reduce((counts, teamName) => counts.set(teamName, (counts.get(teamName) || 0) + 1), new Map());
    const dominantMemberTeam = [...teamCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const effectiveTeam = assignedTeam && (!memberTeams.length || teamCounts.has(assignedTeam))
      ? assignedTeam
      : dominantMemberTeam || assignedTeam || "미지정";
    const fullyAssignedTeams = teams.filter((team) => {
      const activeTeamMembers = members.filter((member) => member.employmentStatus !== "퇴사" && member.team === team.name);
      return activeTeamMembers.length > 0 && activeTeamMembers.every((member) => workerAssignedNames.has(member.name));
    }).map((team) => team.name);
    const selectedTeams = [...new Set([assignedTeam, ...fullyAssignedTeams].filter(Boolean))];
    const selectedTeamMembers = new Set(members.filter((member) => selectedTeams.includes(member.team)).map((member) => member.name));
    const extraMembers = [...workerAssignedNames].filter((name) => !selectedTeamMembers.has(name));
    if (dominantMemberTeam && effectiveTeam !== (assignedTeam || "미지정")) dbRelationshipRepairNeeded = true;
    const task = {
      project: project.project,
      team: selectedTeams[0] || effectiveTeam,
      teams: selectedTeams.length ? selectedTeams : [effectiveTeam].filter((name) => name !== "미지정"),
      extraMembers,
      managerMembers,
      sla: project.slaDays,
      absoluteDailyHours: project.absoluteDailyHours || 7,
      month: settingMonthByProjectId.get(project._id) || project.startDate.slice(0, 7),
    };
    return task;
  }));
  projectConfigs.forEach((project) => {
    const namedManagers = projectSettingManagers(projectWorkSettings.find((setting) => setting.project === project.project));
    if (namedManagers.length) project.managementPeople = namedManagers.length;
  });

  const ruleById = new Map(ruleRows.map((row) => [row.rule_id, row]));
  replaceArray(deliverables, ruleRows.map((row) => ({
    _id: row.rule_id,
    project: projectById.get(row.project_id)?.project_name || "",
    name: row.deliverable_name,
    standardHours: Number(row.standard_hours || 0),
    slaDays: row.sla_days === null || row.sla_days === undefined ? null : Number(row.sla_days),
    slaEnabled: row.sla_enabled === true,
    conversionTarget: ruleById.get(row.conversion_target_rule_id)?.deliverable_name || row.deliverable_name,
    activeFrom: dbDate(row.active_from),
    activeTo: dbDate(row.active_to),
  })).filter((item) => item.project));

  const outputsByTask = new Map();
  outputRows.forEach((row) => {
    outputsByTask.set(row.task_id, [...(outputsByTask.get(row.task_id) || []), row]);
  });
  replaceArray(tasks, taskRows.map((row) => {
    const project = projectById.get(row.project_id);
    const employee = employeeById.get(row.owner_employee_id);
    const ownerMember = members.find((member) => member._id === row.owner_employee_id);
    const rawTaskOutputs = outputsByTask.get(row.task_id) || [];
    const normalizedOutputs = normalizeDbTaskOutputs(project?.project_name || "", rawTaskOutputs);
    const taskOutputs = normalizedOutputs.rows;
    if (normalizedOutputs.repaired) {
      dbOutputRepairNeeded = true;
      dbObsoleteOutputIds.push(...normalizedOutputs.obsoleteIds);
    }
    const completed = dbDate(row.completed_date);
    const due = dbDate(row.due_date);
    const taskMeta = parseTaskDbMeta(row.note);
    const outputDetails = taskOutputs.map((output) => {
      const outputOwnerId = output.owner_employee_id || row.owner_employee_id || "";
      if (!output.owner_employee_id && outputOwnerId) dbOutputRepairNeeded = true;
      return {
        outputId: output.output_id,
        name: output.deliverable_name,
        count: Number(output.quantity || 0),
        ownerEmployeeId: outputOwnerId,
        owner: employeeById.get(outputOwnerId)?.employee_name || employee?.employee_name || "",
        standardHoursPerUnit: Number(output.standard_hours_per_unit || 0),
        inspectionStatus: output.inspection_status || null,
        fileLink: output.file_link || null,
        ...readOutputScope(output.note),
      };
    });
    const task = {
      id: row.task_id,
      client: project?.client_name || "",
      project: project?.project_name || "",
      team: ownerMember?.team || "",
      type: row.task_type || "",
      channel: row.request_channel || "",
      difficulty: row.difficulty || "",
      start: dbDate(row.request_date),
      end: completed || due,
      dueDate: due,
      completedDate: completed,
      status: row.status || "대기",
      title: row.task_title || "",
      requester: row.requester_name || "",
      owner: employee?.employee_name || "",
      ownerEmployeeId: row.owner_employee_id,
      urgent: yn(row.urgent_yn),
      delayed: Boolean(completed && due && completed > due),
      revision: yn(row.rework_yn),
      rejected: yn(row.rejected_yn),
      approvalDelay: yn(row.approval_delay_yn),
      night: yn(row.night_weekend_yn),
      standardHours: Number(row.planned_hours || 0),
      baseStandardHours: outputDetails.reduce((sum, detail) => sum + Number(detail.count || 0) * Number(detail.standardHoursPerUnit || 0), 0)
        || Number(taskMeta.manualStandardHours ?? row.planned_hours ?? 0),
      manualStandardHours: taskMeta.manualStandardHours ?? null,
      effortBufferPct: Number(row.effort_buffer_pct || 0),
      photoType: normalizePhotoType(row.photo_type),
      outputs: aggregateOutputDetails(outputDetails),
      outputDetails,
      _outputs: taskOutputs,
      monthDelta: 0,
      importKeys: Array.isArray(taskMeta.importKeys) ? taskMeta.importKeys : undefined,
      importSource: taskMeta.importSource || "",
      importOwners: Array.isArray(taskMeta.importOwners) ? taskMeta.importOwners : undefined,
      importBatchId: taskMeta.importBatchId || "",
      uploadSubNumber: taskMeta.uploadSubNumber || "",
      stage: taskMeta.stage || "",
      stageDetail: taskMeta.stageDetail || "",
      relatedTaskId: taskMeta.relatedTaskId || "",
      slaResponsibility: normalizeSlaResponsibility(taskMeta.slaResponsibility),
      scheduleChangeReason: taskMeta.scheduleChangeReason || "",
      originalDueDate: taskMeta.originalDueDate || taskMeta.scheduleChanges?.[0]?.beforeDate || due,
      slaDueDate: taskMeta.slaDueDate || "",
      slaLimit: taskMeta.slaLimit,
      slaRuleLabel: taskMeta.slaRuleLabel || "",
      slaRuleType: taskMeta.slaRuleType || "",
      slaConfigured: taskMeta.slaConfigured === true,
      slaRuleStored: taskMeta.slaRuleStored === true,
      scheduleChanges: Array.isArray(taskMeta.scheduleChanges) ? taskMeta.scheduleChanges : [],
      detailNotes: Array.isArray(taskMeta.detailNotes) ? taskMeta.detailNotes : [],
      statusUpdatedAt: taskMeta.statusUpdatedAt || "",
    };
    recalculateTaskHours(task);
    return task;
  }).filter((task) => task.project));

  replaceArray(projectHistories, changeRows.map((row) => ({
    _id: row.change_id,
    project: projectById.get(row.project_id)?.project_name || "",
    date: dbDate(row.changed_at),
    month: dbDate(row.changed_at).slice(0, 7),
    category: row.category,
    field: row.field_name,
    before: row.before_value || "",
    after: row.after_value || "",
    reason: row.reason || "",
    changedByEmployeeId: row.changed_by_employee_id || null,
    sequence: idNumber(row.change_id),
  })).filter((entry) => entry.project));
  replaceArray(projectTeamHistories, []);
  replaceArray(ownerHistories, []);
  replaceArray(workerTaskStatuses, workerStatusRows.map((row) => ({
    _id: row.assignment_id,
    taskId: row.task_id,
    employeeId: row.employee_id,
    userId: row.user_id,
    status: row.status || "미처리",
    startedAt: dbDate(row.started_at),
    completedAt: dbDate(row.completed_at),
    updatedAt: row.updated_at || "",
  })));
  replaceArray(workResources, workResourceRows.map((row) => ({
    _id: row.resource_id,
    project: projectById.get(row.project_id)?.project_name || "",
    category: row.category || "공통사항",
    title: row.title || "",
    content: row.content || "",
    referenceUrl: row.reference_url || "",
    imagePaths: Array.isArray(row.image_paths) ? row.image_paths.filter(Boolean) : [],
    pinned: yn(row.pinned_yn),
    createdBy: row.created_by || "미확인",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  })).filter((resource) => resource.project));
  replaceArray(notificationStates, notificationStateRows.map((row) => ({
    stateId: row.state_id,
    key: row.notification_key,
    userId: row.user_id,
    readAt: row.read_at || "",
    resolvedAt: row.resolved_at || "",
    updatedAt: row.updated_at || "",
  })));

  const projectsByUser = new Map();
  profileProjectRows.forEach((row) => {
    projectsByUser.set(row.user_id, [...(projectsByUser.get(row.user_id) || []), row.project_name]);
  });
  if (profileRows.length) {
    accounts = profileRows.map((row) => ({
      id: row.login_id,
      name: row.display_name,
      team: row.team_name || "미지정",
      subgroup: row.subgroup_name || "",
      role: row.role,
      projects: projectsByUser.get(row.user_id) || [],
      assignedProjects: projectsByUser.get(row.user_id) || [],
      status: row.status,
      remote: true,
      _userId: row.user_id,
    }));
    accounts.forEach((account) => {
      if (account.role !== "portal" && account.role !== "admin") account.projects = accountTeamProjectNames(account);
    });
  }

  const productivitySetting = settingRows.find((row) => row.setting_key === "productivity");
  if (productivitySetting?.setting_value) {
    const legacyBuffer = Number(productivitySetting.setting_value.buffer ?? 15);
    const targetVersion = productivitySetting.setting_value.targetVersion === 2;
    const readTarget = (value, fallback) => targetVersion
      ? parseProductivityBuffer(value, fallback)
      : parseProductivityBuffer(100 - Number(value ?? legacyBuffer), 100);
    state.productivityWorkingDays = Math.max(1, Number(productivitySetting.setting_value.workingDays || 21));
    state.productivityProjectBuffer = readTarget(productivitySetting.setting_value.projectBuffer, 100);
    state.productivityCompanyBuffer = readTarget(productivitySetting.setting_value.companyBuffer, 100);
    const savedProjectBuffers = productivitySetting.setting_value.projectBuffers;
    state.productivityBuffersByProject = savedProjectBuffers && typeof savedProjectBuffers === "object" && !Array.isArray(savedProjectBuffers)
      ? Object.fromEntries(Object.entries(savedProjectBuffers).map(([project, values]) => [project, {
        workingDays: Math.max(1, Number(values?.workingDays || state.productivityWorkingDays)),
        projectBuffer: values?.projectBuffer == null ? state.productivityProjectBuffer : readTarget(values.projectBuffer, 100),
        companyBuffer: values?.companyBuffer == null ? state.productivityCompanyBuffer : readTarget(values.companyBuffer, 100),
      }]))
      : {};
  }
  const brandingSetting = settingRows.find((row) => row.setting_key === "branding");
  if (brandingSetting?.setting_value) {
    state.branding = {
      companyName: String(brandingSetting.setting_value.companyName || "회사명"),
      subtitle: String(brandingSetting.setting_value.subtitle || "프로젝트 운영 관제"),
      logoDataUrl: String(brandingSetting.setting_value.logoDataUrl || ""),
    };
  }
  const workCalendarSetting = settingRows.find((row) => row.setting_key === "work_calendar");
  if (workCalendarSetting?.setting_value) {
    const savedMonths = workCalendarSetting.setting_value.months;
    state.workCalendar = {
      mode: workCalendarSetting.setting_value.mode === "api" ? "api" : "manual",
      apiUrl: String(workCalendarSetting.setting_value.apiUrl || ""),
      months: savedMonths && typeof savedMonths === "object" && !Array.isArray(savedMonths)
        ? Object.fromEntries(Object.entries(savedMonths)
          .filter(([month, entry]) => /^\d{4}-\d{2}$/.test(month) && Number.isFinite(Number(entry?.workingDays ?? entry)))
          .map(([month, entry]) => [month, {
            workingDays: Math.max(0, Number(entry?.workingDays ?? entry)),
            source: entry?.source === "api" ? "api" : "manual",
            updatedAt: String(entry?.updatedAt || ""),
          }]))
        : {},
    };
  }
  const notificationRuleSetting = settingRows.find((row) => row.setting_key === "notification_rules");
  if (notificationRuleSetting?.setting_value) {
    const saved = notificationRuleSetting.setting_value;
    state.notificationRules = {
      overdueEnabled: saved.overdueEnabled !== false,
      dueSoonEnabled: saved.dueSoonEnabled !== false,
      dueSoonDays: Math.min(30, Math.max(0, Number(saved.dueSoonDays ?? 1))),
      reviewEnabled: saved.reviewEnabled !== false,
      reviewDays: Math.min(30, Math.max(0, Number(saved.reviewDays ?? 2))),
      ownerEnabled: saved.ownerEnabled !== false,
      outputEnabled: saved.outputEnabled !== false,
      templateEnabled: saved.templateEnabled !== false,
      contractEnabled: saved.contractEnabled !== false,
      contractDays: Math.min(180, Math.max(1, Number(saved.contractDays ?? 30))),
    };
  }
  replaceArray(uploadBatches, uploadBatchRows.map((row) => ({
    batchId: row.batch_id,
    fileName: row.file_name,
    uploadedBy: row.uploaded_by || "",
    uploadedByName: row.uploaded_by_name || "",
    uploadedAt: row.uploaded_at || "",
    totalRows: Number(row.total_rows || 0),
    addedRows: Number(row.added_rows || 0),
    updatedRows: Number(row.updated_rows || 0),
    duplicateRows: Number(row.duplicate_rows || 0),
    errorRows: Number(row.error_rows || 0),
    status: row.status || "반영완료",
    rolledBackAt: row.rolled_back_at || "",
    rolledBackBy: row.rolled_back_by || "",
  })));
  replaceArray(uploadBatchItems, uploadBatchItemRows.map((row) => ({
    itemId: row.item_id,
    batchId: row.batch_id,
    taskId: row.task_id || "",
    rowNumber: Number(row.row_number || 0),
    subNumber: row.sub_number || "",
    action: row.action || "",
    reason: row.reason || "",
    beforeTask: row.before_task || null,
    afterTask: row.after_task || null,
  })));
  applyBranding();

  state.year = "전체";
  state.month = "";
  state.configProject = activeProjectConfigs()[0]?.project || "";
  state.slaRuleProject = state.configProject;
  state.slaRuleDeliverable = deliverables.find((item) => item.project === state.slaRuleProject)?.name || "";
  state.deliverableProject = state.configProject;
  state.productivityProject = "전체";
  state.conversionSource = deliverables.find((item) => item.project === state.deliverableProject)?.name || "";
  state.conversionTarget = state.conversionSource;
}

function operationalRows() {
  const teamIds = new Map(teams.map((team, index) => {
    team._id ||= nextRecordId("TEAM", teams.map((item) => item._id), 3);
    return [team.name, team._id];
  }));
  const positionIds = new Map(positions.map((position) => {
    position._id ||= nextRecordId("POS", positions.map((item) => item._id), 3);
    return [position.name, position._id];
  }));
  const employeeIds = new Map(members.map((member) => {
    member._id ||= nextRecordId("EMP", members.map((item) => item._id), 3);
    return [member.name, member._id];
  }));
  const projectIds = new Map(projectConfigs.map((project) => {
    project._id ||= nextRecordId("PRJ", projectConfigs.map((item) => item._id), 3);
    return [project.project, project._id];
  }));
  const ruleIds = new Map(deliverables.map((deliverable) => {
    deliverable._id ||= nextRecordId("RULE", deliverables.map((item) => item._id), 3);
    return [`${deliverable.project}::${deliverable.name}`, deliverable._id];
  }));

  const projectRows = projectConfigs.map((project) => {
    const setting = projectWorkSettings.find((item) => item.project === project.project);
    return {
      project_id: project._id,
      client_name: project.client,
      project_name: project.project,
      direction: project.direction,
      status: project.status === "closed" ? "종료" : "진행",
      start_date: project.startDate || null,
      end_date: project.endDate || null,
      monthly_contract_amount: dbMoney(project.monthly),
      total_contract_amount: dbMoney(project.total),
      planned_people: Number(project.contractPeople || 0),
      management_people: Number(project.managementPeople || 0),
      monthly_person_cost: dbMoney(project.monthlyPersonCost),
      parent_project_id: project.parentProjectId || null,
      note: project.closeReason || null,
      unit_price: dbMoney(project.unitPrice),
      assigned_team_id: teamIds.get(setting?.team) || null,
      sla_days: Number(setting?.sla || 0),
      absolute_daily_hours: absoluteDailyHoursForProject(project.project),
      assignment_daily_target: project.assignmentDailyTarget ?? null,
      assignment_monthly_target: project.assignmentMonthlyTarget ?? null,
      public_daily_enabled: project.publicDailyEnabled === true,
    };
  });

  const teamRows = teams.map((team) => ({
    team_id: team._id,
    team_name: team.name,
    base_group: team.baseGroup || team.name,
    subgroup_name: team.subgroups?.[0] || null,
    subgroups: [...(team.subgroups || [])],
    active_yn: team.activeYn || "Y",
    note: null,
  }));
  const positionRows = positions.map((position) => ({
    position_id: position._id,
    position_name: position.name,
    active_yn: position.activeYn || "Y",
    note: null,
  }));
  const employeeRows = members.map((member) => ({
    employee_id: member._id,
    employee_name: member.name,
    team_id: teamIds.get(member.team),
    position_id: positionIds.get(member.position),
    grade: member.grade,
    employment_status: member.employmentStatus || "재직",
    joined_date: member.joinedDate || null,
    left_date: member.leftDate || null,
    resignation_reason: member.resignationReason || null,
    subgroup_name: member.subgroup || null,
    reduced_work_yn: member.reducedWork ? "Y" : "N",
    reduced_work_start_date: member.reducedWork ? (member.reducedWorkStartDate || null) : null,
    reduced_work_end_date: member.reducedWork ? (member.reducedWorkEndDate || null) : null,
    reduced_work_start_time: member.reducedWork ? (member.reducedWorkStartTime || "10:00") : null,
    reduced_work_end_time: member.reducedWork ? (member.reducedWorkEndTime || "16:00") : null,
    reduced_daily_hours: member.reducedWork ? Number(member.reducedDailyHours || reducedDailyHours(member.reducedWorkStartTime, member.reducedWorkEndTime) || 0) : null,
    note: null,
  }));

  const assignmentRows = [];
  Object.entries(projectAssignments).forEach(([project, names]) => {
    const managerNames = new Set(assignedProjectManagers(project));
    names.forEach((name) => {
      const existing = dbAssignmentMeta.get(`${project}::${name}`);
      assignmentRows.push({
        assignment_id: existing?.assignment_id || nextRecordId("ASN", [...dbAssignmentMeta.values()].map((item) => item.assignment_id).concat(assignmentRows.map((item) => item.assignment_id)), 4),
        project_id: projectIds.get(project),
        employee_id: employeeIds.get(name),
        role: managerNames.has(name) ? "관리자" : (existing?.role === "관리자" ? "담당" : existing?.role || "담당"),
        assigned_from: existing?.assigned_from || localDateString(),
        assigned_to: null,
        active_yn: "Y",
        change_reason: existing?.change_reason || "HTML에서 배정",
      });
    });
  });

  const taskRows = tasks.map((task) => ({
    task_id: task.id,
    project_id: projectIds.get(task.project),
    request_date: task.start || null,
    task_title: task.title,
    task_type: task.type || "운영",
    request_channel: task.channel || "직접 등록",
    difficulty: task.difficulty || "보통",
    urgent_yn: task.urgent ? "Y" : "N",
    requester_name: task.requester || null,
    owner_employee_id: employeeIds.get(task.owner),
    planned_hours: Number(task.standardHours || 0),
    effort_buffer_pct: normalizeEffortBufferPct(task.effortBufferPct),
    photo_type: normalizePhotoType(task.photoType),
    status: task.status || "대기",
    due_date: task.dueDate || task.end || task.start || null,
    completed_date: task.status === "완료" ? (task.completedDate || null) : null,
    rework_yn: task.revision ? "Y" : "N",
    rejected_yn: task.rejected ? "Y" : "N",
    approval_delay_yn: task.approvalDelay ? "Y" : "N",
    night_weekend_yn: task.night ? "Y" : "N",
    note: taskDbNote(task),
  }));

  const outputRows = [];
  tasks.forEach((task) => {
    const parsed = taskOutputDetails(task).map((detail, index) => {
      const name = detail.name;
      const quantity = Number(detail.count || 0);
      const existing = task._outputs?.find((row) => row.output_id === detail.outputId) || task._outputs?.[index];
      const rule = deliverables.find((item) => item.project === task.project && item.name === name);
      return {
        output_id: detail.outputId || existing?.output_id || `${task.id}-OUT-${String(index + 1).padStart(2, "0")}`,
        task_id: task.id,
        project_id: projectIds.get(task.project),
        deliverable_name: name,
        quantity,
        standard_hours_per_unit: Number(detail.standardHoursPerUnit ?? existing?.standard_hours_per_unit ?? rule?.standardHours ?? (task.standardHours / Math.max(quantity, 1)) ?? 0),
        owner_employee_id: detail.ownerEmployeeId || employeeIds.get(detail.owner) || employeeIds.get(task.owner) || null,
        inspection_status: detail.inspectionStatus ?? existing?.inspection_status ?? null,
        file_link: detail.fileLink ?? existing?.file_link ?? null,
        note: outputScopeNote(detail),
      };
    });
    outputRows.push(...parsed);
  });

  const ruleRows = deliverables.map((deliverable) => ({
    rule_id: deliverable._id,
    project_id: projectIds.get(deliverable.project),
    deliverable_name: deliverable.name,
    standard_hours: Number(deliverable.standardHours || 0),
    sla_days: deliverable.slaDays === null || deliverable.slaDays === undefined ? null : Number(deliverable.slaDays),
    sla_enabled: deliverable.slaEnabled === true,
    conversion_target_rule_id: ruleIds.get(`${deliverable.project}::${deliverable.conversionTarget}`) || deliverable._id,
    active_from: deliverable.activeFrom || localDateString(),
    active_to: deliverable.activeTo || null,
    active_yn: "Y",
    note: null,
  }));

  const changeRows = projectHistories.map((entry) => {
    entry._id ||= nextRecordId("CHG", projectHistories.map((item) => item._id), 6);
    const auditReason = [
      entry.reason || "HTML에서 변경",
      `변경자=${entry.changedBy || "미확인"}`,
      `변경일시=${entry.changedAt || entry.date || localDateTimeString()}`,
    ].join(" · ");
    return {
      change_id: entry._id,
      project_id: projectIds.get(entry.project),
      changed_at: entry.date || entry.month || localDateString(),
      category: entry.category || "프로젝트 구성",
      field_name: entry.field,
      before_value: entry.before || null,
      after_value: entry.after || null,
      reason: auditReason,
      changed_by_employee_id: employeeIds.get(currentAccount()?.name) || null,
    };
  });
  const workerStatusRows = workerTaskStatuses.map((entry) => {
    entry._id ||= nextRecordId("WTS", workerTaskStatuses.map((item) => item._id), 6);
    return {
      assignment_id: entry._id,
      task_id: entry.taskId,
      employee_id: entry.employeeId,
      user_id: entry.userId,
      status: entry.status || "미처리",
      started_at: entry.startedAt || null,
      completed_at: entry.completedAt || null,
      updated_at: entry.updatedAt || new Date().toISOString(),
    };
  });
  const workResourceRows = workResources.map((resource) => {
    resource._id ||= nextRecordId("RES", workResources.map((item) => item._id), 6);
    return {
      resource_id: resource._id,
      project_id: projectIds.get(resource.project),
      category: resource.category || "공통사항",
      title: resource.title,
      content: resource.content,
      reference_url: resource.referenceUrl || null,
      image_paths: [...(resource.imagePaths || [])],
      pinned_yn: resource.pinned ? "Y" : "N",
      created_by: resource.createdBy || currentAccount()?.id || "미확인",
      created_at: resource.createdAt || new Date().toISOString(),
      updated_at: resource.updatedAt || new Date().toISOString(),
      active_yn: "Y",
    };
  });

  return {
    projects: projectRows,
    teams: teamRows,
    positions: positionRows,
    employees: employeeRows,
    project_members: assignmentRows,
    task_history: taskRows,
    output_history: outputRows,
    output_rules: ruleRows,
    project_changes: changeRows,
    worker_task_status: workerStatusRows,
    work_resources: workResourceRows,
  };
}

function validateOperationalRows(rows, changedTables) {
  const issues = [];
  const changed = (table) => changedTables.has(table);
  const projectIds = new Set(rows.projects.map((row) => row.project_id).filter(Boolean));
  const teamIds = new Set(rows.teams.map((row) => row.team_id).filter(Boolean));
  const positionIds = new Set(rows.positions.map((row) => row.position_id).filter(Boolean));
  const employeeIds = new Set(rows.employees.map((row) => row.employee_id).filter(Boolean));
  const taskIds = new Set(rows.task_history.map((row) => row.task_id).filter(Boolean));
  const ruleIds = new Set(rows.output_rules.map((row) => row.rule_id).filter(Boolean));
  const requireValue = (table, row, key, label) => {
    if (row[key] === null || row[key] === undefined || row[key] === "") issues.push(`${table}.${key}: ${label}`);
  };

  if (changed("projects")) rows.projects.forEach((row) => {
    requireValue("projects", row, "project_id", "프로젝트 ID 누락");
    requireValue("projects", row, "project_name", "프로젝트명 누락");
  });
  if (changed("employees")) rows.employees.forEach((row) => {
    requireValue("employees", row, "employee_id", `${row.employee_name || "직원"} ID 누락`);
    requireValue("employees", row, "employee_name", "직원명 누락");
    if (row.team_id && !teamIds.has(row.team_id)) issues.push(`employees.team_id: ${row.employee_name}의 팀 연결 누락`);
    if (row.position_id && !positionIds.has(row.position_id)) issues.push(`employees.position_id: ${row.employee_name}의 포지션 연결 누락`);
  });
  if (changed("project_members")) rows.project_members.forEach((row) => {
    if (!projectIds.has(row.project_id)) issues.push(`project_members.project_id: ${row.assignment_id}의 프로젝트 연결 누락`);
    if (!employeeIds.has(row.employee_id)) issues.push(`project_members.employee_id: ${row.assignment_id}의 직원 연결 누락`);
  });
  if (changed("task_history")) rows.task_history.forEach((row) => {
    if (!projectIds.has(row.project_id)) issues.push(`task_history.project_id: ${row.task_id}의 프로젝트 연결 누락`);
    if (row.owner_employee_id && !employeeIds.has(row.owner_employee_id)) issues.push(`task_history.owner_employee_id: ${row.task_id}의 담당자 연결 누락`);
  });
  if (changed("output_history")) rows.output_history.forEach((row) => {
    if (!taskIds.has(row.task_id)) issues.push(`output_history.task_id: ${row.output_id}의 업무 연결 누락`);
    if (!projectIds.has(row.project_id)) issues.push(`output_history.project_id: ${row.output_id}의 프로젝트 연결 누락`);
  });
  if (changed("output_rules")) rows.output_rules.forEach((row) => {
    requireValue("output_rules", row, "rule_id", `${row.deliverable_name || "결과물"} 기준 ID 누락`);
    requireValue("output_rules", row, "deliverable_name", "결과물 명칭 누락");
    if (!projectIds.has(row.project_id)) issues.push(`output_rules.project_id: ${row.deliverable_name}의 프로젝트 연결 누락`);
    if (row.conversion_target_rule_id && !ruleIds.has(row.conversion_target_rule_id)) issues.push(`output_rules.conversion_target_rule_id: ${row.deliverable_name}의 환산 기준 연결 누락`);
  });
  if (changed("project_changes")) rows.project_changes.forEach((row) => {
    if (!projectIds.has(row.project_id)) issues.push(`project_changes.project_id: ${row.change_id}의 프로젝트 연결 누락`);
  });
  if (changed("worker_task_status")) rows.worker_task_status.forEach((row) => {
    if (!taskIds.has(row.task_id)) issues.push(`worker_task_status.task_id: ${row.assignment_id}의 업무 연결 누락`);
    if (!employeeIds.has(row.employee_id)) issues.push(`worker_task_status.employee_id: ${row.assignment_id}의 직원 연결 누락`);
    requireValue("worker_task_status", row, "user_id", `${row.assignment_id}의 사용자 연결 누락`);
  });
  if (changed("work_resources")) rows.work_resources.forEach((row) => {
    if (!projectIds.has(row.project_id)) issues.push(`work_resources.project_id: ${row.resource_id}의 프로젝트 연결 누락`);
    requireValue("work_resources", row, "title", `${row.resource_id}의 제목 누락`);
  });
  return [...new Set(issues)];
}

function stableDbJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableDbJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableDbJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

function updateRemoteSnapshots(data, names = Object.keys(remoteData?.tableKeys || {})) {
  names.forEach((table) => {
    const key = remoteData?.tableKeys?.[table];
    if (!key) return;
    dbRemoteSnapshots[table] = new Map((data?.[table] || [])
      .map((row) => [row[key], stableDbJson(row)])
      .filter(([id]) => id));
  });
}

async function detectRemoteOperationalConflicts(changedTables) {
  const names = changedTables.map(([table]) => table);
  if (!names.length || !remoteData?.loadTables) return [];
  const latest = await remoteData.loadTables(names);
  const conflicts = [];
  names.forEach((table) => {
    const key = remoteData.tableKeys[table];
    const baseline = dbRemoteSnapshots[table] || new Map();
    const current = new Map((latest[table] || [])
      .map((row) => [row[key], stableDbJson(row)])
      .filter(([id]) => id));
    const ids = new Set([...baseline.keys(), ...current.keys()]);
    ids.forEach((id) => {
      if (baseline.get(id) !== current.get(id)) conflicts.push({ table, id });
    });
  });
  return conflicts;
}

function closeSystemAlert() {
  const modal = $("#systemAlertModal");
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
  systemAlertAction = null;
}

function showSystemAlert({ title, message, detail, actionLabel = "확인", onAction }) {
  const modal = $("#systemAlertModal");
  if (!modal) return;
  $("#systemAlertTitle").textContent = title;
  $("#systemAlertMessage").textContent = message;
  $("#systemAlertDetail").textContent = detail || "화면의 변경 내용은 아직 DB에 반영되지 않았습니다.";
  $("#systemAlertAction").textContent = actionLabel;
  systemAlertAction = onAction || closeSystemAlert;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  $("#systemAlertAction")?.focus();
}

function initializeOperationalSignatures(remoteRows = null) {
  const rows = operationalRows();
  dbTableSignatures = {};
  dbKnownIds = {};
  dbRowSnapshots = {};
  dbRemoteSnapshots = {};
  Object.entries(rows).forEach(([table, values]) => {
    // "관리자"처럼 화면에서 보정 생성한 기준정보는 DB에 실제 저장되기 전까지
    // 원격 스냅샷을 기준으로 변경 상태를 유지해야 FK 기준 테이블이 먼저 저장됩니다.
    const baselineValues = table === "positions" && remoteRows?.positions
      ? remoteRows.positions
      : values;
    dbTableSignatures[table] = JSON.stringify(baselineValues);
    const key = remoteData.tableKeys[table];
    dbKnownIds[table] = new Set(baselineValues.map((row) => row[key]).filter(Boolean));
    dbRowSnapshots[table] = new Map(baselineValues.map((row) => [row[key], JSON.stringify(row)]).filter(([id]) => id));
  });
  updateRemoteSnapshots(remoteRows || rows);
  operationalDbReady = true;
  dbSavedMutationVersion = dbMutationVersion;
  setDbSaveStatus("saved", "DB 연결 완료");
}

function markOperationalDirty() {
  dbMutationVersion += 1;
}

function setDbSaveStatus(status, message = "") {
  dbSaveState = status;
  const node = $("#dbSaveStatus");
  if (!node) return;
  const labels = {
    idle: "DB 연결 대기",
    queued: "저장 대기",
    saving: "저장 중...",
    saved: "DB 저장 완료",
    error: "DB 저장 실패 · 재시도",
    conflict: "새 데이터 확인 필요",
  };
  node.className = `db-save-status ${status}`;
  const errorStep = status === "error" && message ? String(message).split(":")[0].trim() : "";
  node.textContent = errorStep ? `DB 저장 실패 · ${errorStep}` : (labels[status] || message || "DB 상태");
  node.title = message || (status === "error" ? "클릭하면 다시 저장합니다." : "클릭하면 변경 내용을 즉시 저장합니다.");
  const detail = $("#dbSaveErrorDetail");
  if (detail) {
    detail.hidden = !["error", "conflict"].includes(status) || !message;
    detail.textContent = ["error", "conflict"].includes(status) ? message : "";
  }
}

function resetDbStateAfterAccountFailure() {
  clearTimeout(dbPersistTimer);
  dbPersistChain = Promise.resolve();
  dbLastError = "";
  if (!operationalDbReady || !remoteData) {
    setDbSaveStatus("idle", "로그인 후 DB 저장을 사용할 수 있습니다.");
    return;
  }
  const changed = changedOperationalTables();
  if (changed.length) {
    setDbSaveStatus("queued", "계정 처리는 실패했지만 운영 데이터 변경은 다시 저장할 수 있습니다.");
  } else {
    dbSavedMutationVersion = dbMutationVersion;
    setDbSaveStatus("saved", "계정 처리 실패 상태를 초기화했습니다.");
  }
}

function changedOperationalTables(rows = operationalRows()) {
  return Object.entries(rows).filter(([table, values]) => JSON.stringify(values) !== dbTableSignatures[table]);
}

function withSaveTimeout(promise, timeoutMs = 20000, message = "DB 저장 응답 시간이 초과되었습니다. 다시 저장해 주세요.") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error(message);
      error.code = "DB_SAVE_TIMEOUT";
      reject(error);
    }, timeoutMs);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timeoutId));
}

async function performOperationalPersist() {
  if (!operationalDbReady || !remoteData) throw new Error("Supabase DB 연결이 준비되지 않았습니다.");
  const rows = operationalRows();
  const savingMutationVersion = dbMutationVersion;
  const changed = changedOperationalTables(rows);
  if (!changed.length) {
    dbSavedMutationVersion = savingMutationVersion;
    setDbSaveStatus("saved", "DB와 화면 데이터가 같습니다.");
    return [];
  }
  setDbSaveStatus("saving", `${changed.map(([table]) => table).join(", ")} 저장 중`);
  try {
    const changedMap = new Map(changed);
    if (dbSchemaIssues.length) {
      throw new Error(`DB 스키마 보완 필요: ${dbSchemaIssues.map((issue) => issue.table).join(", ")} · 014_db_save_reliability.sql을 적용하세요.`);
    }
    const validationIssues = validateOperationalRows(rows, new Set(changedMap.keys()));
    if (validationIssues.length) throw new Error(`저장 데이터 연결 오류: ${validationIssues.slice(0, 3).join(" / ")}${validationIssues.length > 3 ? ` 외 ${validationIssues.length - 3}건` : ""}`);
    const conflicts = await detectRemoteOperationalConflicts(changed);
    if (conflicts.length) {
      const error = new Error("다른 사용자가 동일한 데이터를 먼저 변경했습니다.");
      error.code = "REMOTE_DATA_CHANGED";
      error.conflicts = conflicts;
      throw error;
    }
    const removedIdsByTable = new Map();
    const changedRowsByTable = new Map();
    for (const [table, values] of changed) {
      const key = remoteData.tableKeys[table];
      const nextIds = new Set(values.map((row) => row[key]).filter(Boolean));
      removedIdsByTable.set(table, [...(dbKnownIds[table] || [])].filter((id) => !nextIds.has(id)));
      const previousRows = dbRowSnapshots[table] || new Map();
      changedRowsByTable.set(table, values.filter((row) => previousRows.get(row[key]) !== JSON.stringify(row)));
    }
    const runStep = async (table, action, operation) => {
      try {
        await operation();
      } catch (error) {
        throw new Error(`${table} ${action} 실패: ${authMessage(error)}`);
      }
    };
    const saveTable = async (table) => {
      if (!changedMap.has(table)) return;
      await runStep(table, "저장", () => remoteData.upsert(table, changedRowsByTable.get(table)));
    };

    // 외래키의 기준이 되는 테이블을 먼저 저장해 팀 이동과 신규 기준정보 연결을 안정화합니다.
    for (const table of ["teams", "positions", "projects", "employees"]) await saveTable(table);

    // output_rules는 자기참조 FK가 있으므로 남은 행의 환산 기준을 먼저 갱신한 뒤 삭제합니다.
    if (changedMap.has("output_rules")) {
      await runStep("output_rules", "저장", () => remoteData.upsert("output_rules", changedRowsByTable.get("output_rules")));
      await runStep("output_rules", "삭제", () => remoteData.removeIds("output_rules", removedIdsByTable.get("output_rules")));
    }

    const deleteOrder = ["worker_task_status", "work_resources", "output_history", "task_history", "project_members", "project_changes", "employees", "positions", "teams", "projects"];
    for (const table of deleteOrder) {
      const values = changedMap.get(table);
      if (!values) continue;
      await runStep(table, "삭제", () => remoteData.removeIds(table, removedIdsByTable.get(table)));
    }
    for (const table of ["project_members", "task_history", "output_history", "project_changes", "worker_task_status", "work_resources"]) await saveTable(table);
    const savedNames = changed.map(([table]) => table);
    const latestRows = await remoteData.loadTables(savedNames);
    updateRemoteSnapshots(latestRows, savedNames);
    changed.forEach(([table, values]) => {
      const key = remoteData.tableKeys[table];
      dbTableSignatures[table] = JSON.stringify(values);
      dbKnownIds[table] = new Set(values.map((row) => row[key]).filter(Boolean));
      dbRowSnapshots[table] = new Map(values.map((row) => [row[key], JSON.stringify(row)]).filter(([id]) => id));
    });
    dbLastError = "";
    dbSavedMutationVersion = savingMutationVersion;
    setDbSaveStatus("saved", `${changed.map(([table]) => table).join(", ")} 저장 완료`);
    if (dbMutationVersion > dbSavedMutationVersion) scheduleOperationalPersist();
    return changed.map(([table]) => table);
  } catch (error) {
    dbLastError = authMessage(error);
    console.error("Supabase 저장 실패:", error);
    if (error?.code === "REMOTE_DATA_CHANGED") {
      const details = (error.conflicts || []).slice(0, 5).map((item) => `${item.table} · ${item.id}`).join("\n");
      setDbSaveStatus("conflict", "다른 사용자가 데이터를 변경했습니다. 새로고침 후 다시 시도하세요.");
      showSystemAlert({
        title: "다른 사용자의 변경 사항이 있습니다",
        message: "현재 화면을 연 뒤 DB 데이터가 변경되어 덮어쓰기를 중단했습니다.",
        detail: `${details}${(error.conflicts || []).length > 5 ? `\n외 ${(error.conflicts || []).length - 5}건` : ""}`,
        actionLabel: "새로고침",
        onAction: () => location.reload(),
      });
    } else {
      setDbSaveStatus("error", dbLastError);
      const sessionExpired = /로그인 세션이 만료|로그인이 필요/i.test(dbLastError);
      showSystemAlert({
        title: sessionExpired ? "로그인 세션이 만료되었습니다" : "DB 저장에 실패했습니다",
        message: sessionExpired ? "다시 로그인한 뒤 저장을 시도해 주세요." : "입력한 내용은 화면에 남아 있지만 아직 DB에 저장되지 않았습니다.",
        detail: dbLastError,
        actionLabel: sessionExpired ? "로그인 화면으로" : "다시 저장",
        onAction: sessionExpired ? () => location.reload() : () => {
          closeSystemAlert();
          persistOperationalNow().catch(() => {});
        },
      });
    }
    throw error;
  }
}

function persistOperationalNow() {
  clearTimeout(dbPersistTimer);
  dbPersistChain = dbPersistChain
    .catch(() => {})
    .then(() => withSaveTimeout(performOperationalPersist()))
    .catch((error) => {
      if (error?.code === "DB_SAVE_TIMEOUT") {
        dbLastError = error.message;
        setDbSaveStatus("error", dbLastError);
      }
      throw error;
    });
  return dbPersistChain;
}

function scheduleOperationalPersist() {
  if (!operationalDbReady || !remoteData) return;
  if (dbMutationVersion <= dbSavedMutationVersion) return;
  clearTimeout(dbPersistTimer);
  setDbSaveStatus("queued", "변경 내용을 DB 저장 대기열에 추가했습니다.");
  dbPersistTimer = setTimeout(() => {
    persistOperationalNow().catch(() => {});
  }, 100);
}

async function completeRemoteLogin() {
  const profile = await remoteAuth.loadCurrentProfile();
  applyRemoteProfile(profile);
  showLogin("Supabase 운영 데이터를 불러오고 있습니다.");
  const [operationalData, schemaIssues] = await Promise.all([
    remoteData.loadAll(),
    remoteData.validateSchema ? remoteData.validateSchema() : Promise.resolve([]),
  ]);
  dbSchemaIssues = schemaIssues;
  applyOperationalDb(operationalData);
  applyRemoteProfile(profile);
  const repairedOperationalData = profile.role === "admin" && (dbRelationshipRepairNeeded || dbOutputRepairNeeded);
  if (repairedOperationalData) {
    const repairRows = operationalRows();
    if (dbRelationshipRepairNeeded) await remoteData.upsert("projects", repairRows.projects);
    if (dbOutputRepairNeeded) {
      await remoteData.upsert("output_history", repairRows.output_history);
      await remoteData.removeIds("output_history", [...new Set(dbObsoleteOutputIds.filter(Boolean))]);
    }
    dbRelationshipRepairNeeded = false;
    dbOutputRepairNeeded = false;
    dbObsoleteOutputIds = [];
  }
  const latestOperationalData = repairedOperationalData
    ? await remoteData.loadTables(Object.keys(remoteData.tableKeys))
    : operationalData;
  initializeOperationalSignatures(latestOperationalData);
  if (dbSchemaIssues.length) {
    const summary = dbSchemaIssues.map((issue) => `${issue.table}: ${issue.message}`).join(" / ");
    dbLastError = summary;
    setDbSaveStatus("error", `DB 스키마 보완 필요: ${summary}`);
  }
  document.body.classList.remove("auth-pending");
  const gate = $("#authGate");
  if (gate) gate.hidden = true;
  $("#loginPassword").value = "";
  state.mode = "operator";
  state.view = profile.role === "portal" ? "portal" : profile.role === "worker" ? "myWork" : "dashboard";
  syncActiveViewDom();
  renderAll();
}

async function initializeAuthentication() {
  if (!remoteAuthEnabled) {
    document.body.classList.remove("auth-pending");
    const gate = $("#authGate");
    if (gate) gate.hidden = true;
    return;
  }
  showLogin("저장된 로그인 세션을 확인하고 있습니다.");
  try {
    const restored = await remoteAuth.restoreSession();
    if (restored) {
      await completeRemoteLogin();
      return;
    }
    showLogin("");
    $("#loginId")?.focus();
  } catch (error) {
    await remoteAuth.logout();
    showLogin(authMessage(error), true);
  }
}

function accountForMember(memberOrName) {
  const member = typeof memberOrName === "object"
    ? memberOrName
    : members.find((item) => item.name === memberOrName);
  if (member?._userId) {
    const byUserId = accounts.find((account) => account._userId === member._userId);
    if (byUserId) return byUserId;
  }
  const memberName = member?.name || memberOrName;
  return accounts.find((account) => account.name === memberName);
}

function selectedMemberEditorRecord(value = state.selectedMemberAccount) {
  const key = String(value || "");
  if (key.startsWith("member:")) {
    const employeeId = key.slice(7);
    const member = members.find((item) => String(item._id) === employeeId);
    return { member, account: member ? accountForMember(member) : null };
  }
  const accountId = key.startsWith("account:") ? key.slice(8) : key;
  const account = accounts.find((item) => item.id === accountId);
  return { account, member: account ? members.find((item) => item.name === account.name) : null };
}

function accountProjectOptions(selectedProjects = []) {
  const selected = new Set(selectedProjects);
  return activeProjectConfigs()
    .map((project) => `<option value="${project.project}" ${selected.has(project.project) ? "selected" : ""}>${project.project}</option>`)
    .join("");
}

function authorizedProjectNames(account = currentAccount()) {
  return accessibleProjectConfigs(account).map((project) => project.project);
}

function filteredMembers() {
  return members.filter((m) => {
    if (m.employmentStatus === "퇴사") return false;
    const teamOk = state.adminTeam === "전체" || m.team === state.adminTeam;
    const gradeOk = state.adminGrade === "전체" || m.grade === state.adminGrade;
    const positionOk = state.adminPosition === "전체" || m.position === state.adminPosition;
    const keyword = state.memberSearch.trim().toLowerCase();
    const accountId = accountForMember(m.name)?.id || "";
    const searchOk = !keyword || [accountId, m.name, m.team, m.position, m.grade].some((value) => String(value).toLowerCase().includes(keyword));
    return teamOk && gradeOk && positionOk && searchOk;
  });
}

function filteredMemberEntries() {
  return members.map((member, index) => ({ member, index })).filter(({ member }) => filteredMembers().includes(member));
}

function filterResignedMemberEntries(memberRows, filters) {
  filters = filters || {};
  const team = filters.team || "전체";
  const from = filters.from || "";
  const to = filters.to || "";
  return memberRows
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member.employmentStatus === "퇴사")
    .filter(({ member }) => team === "전체" || member.team === team)
    .filter(({ member }) => !from || (member.leftDate || "") >= from)
    .filter(({ member }) => !to || (member.leftDate || "") <= to)
    .sort((a, b) => (b.member.leftDate || "").localeCompare(a.member.leftDate || "") || a.member.name.localeCompare(b.member.name, "ko"));
}

function progressCard(item) {
  if (isImageEffortSample) {
    return `<article class="project-card"><div class="title-block"><strong>${item.project}</strong><span>${item.data.owners}명 · 작업 폴더 ${item.data.total.toLocaleString()}개</span></div><div class="progress-group"><div class="progress-line"><span>분류율</span><div class="bar"><span style="width:${item.data.checkRate}%"></span></div><b>${item.data.checkRate}%</b></div><div class="progress-line"><span>산출비중</span><div class="bar urgent"><span style="width:${pct(item.data.outputs, sampleData.summary.outputFileCount)}%"></span></div><b>${pct(item.data.outputs, sampleData.summary.outputFileCount)}%</b></div><div class="progress-line"><span>미체크</span><div class="bar delay"><span style="width:${item.data.unmatchedRate}%"></span></div><b>${item.data.unmatchedRate}%</b></div></div><div class="badge-stack"><span class="pill">${effortLabel(item.data.standardHours)}</span><span class="pill ${item.data.unmatched ? "warn" : "good"}">미체크 ${item.data.unmatched}개</span></div></article>`;
  }
  return `<article class="project-card"><div class="title-block"><strong>${item.project}</strong><span>${item.client} · 전월 대비 ${item.data.delta >= 0 ? "+" : ""}${item.data.delta}%</span></div><div class="progress-group"><div class="progress-line"><span>완료율</span><div class="bar"><span style="width:${item.data.completionRate}%"></span></div><b>${item.data.completionRate}%</b></div><div class="progress-line"><span>긴급</span><div class="bar urgent"><span style="width:${item.data.urgentRate}%"></span></div><b>${item.data.urgentRate}%</b></div><div class="progress-line"><span>지연</span><div class="bar delay"><span style="width:${item.data.delayRate}%"></span></div><b>${item.data.delayRate}%</b></div></div><div class="badge-stack"><span class="pill ${cls(item.data.urgentRate)}">긴급 ${item.data.urgentRate}%</span><span class="pill ${cls(item.data.delayRate, 30, 15)}">일정 지연 ${item.data.delayed}건</span></div></article>`;
}

function projectStageSummary(project, rows) {
  const options = projectStageOptions(project.project);
  const stagedRows = rows.filter((task) => task.stage);
  const inProgressRows = stagedRows.filter((task) => ["진행", "검수"].includes(task.status));
  const requestedRows = stagedRows.filter((task) => task.status === "요청");
  const activeRows = stagedRows.filter((task) => !["완료", "반려"].includes(task.status));
  const candidates = inProgressRows.length ? inProgressRows : requestedRows.length ? requestedRows : stagedRows;
  const stageRank = (task) => {
    const index = options.indexOf(task.stage);
    return index >= 0 ? index : -1;
  };
  const current = [...candidates].sort((a, b) => stageRank(a) - stageRank(b)
    || String(a.start || "").localeCompare(String(b.start || ""))
    || String(a.id).localeCompare(String(b.id))).at(-1);
  const optionIndex = current ? options.indexOf(current.stage) : -1;
  const progress = optionIndex >= 0 && options.length ? Math.round(((optionIndex + 1) / options.length) * 100) : 0;
  return {
    current,
    progress,
    stagedCount: stagedRows.length,
    activeCount: activeRows.length,
    missingCount: rows.filter((task) => !task.stage).length,
  };
}

function renderProjectStages(items, direction = "전체") {
  const projects = accessibleProjectConfigs()
    .filter((project) => projectUsesStages(project.project))
    .filter((project) => direction === "전체" || project.direction === direction)
    .filter((project) => state.client === "전체" || project.client === state.client)
    .filter((project) => state.project === "전체" || project.project === state.project);
  if ($("#projectStageCount")) $("#projectStageCount").textContent = `${projects.length}개`;
  if (!$("#projectStageList")) return;
  $("#projectStageList").innerHTML = projects.map((project) => {
    const rows = items.filter((task) => task.project === project.project);
    const summary = projectStageSummary(project, rows);
    const current = summary.current;
    return `<article class="project-stage-card">
      <header><div><strong>${project.project}</strong><span>${project.client} · ${project.direction}</span></div><span class="pill ${current ? "good" : "warn"}">${current ? current.status : "단계 미지정"}</span></header>
      <div class="project-stage-current">${current?.stage || "등록된 종합 단계 없음"}</div>
      <p class="project-stage-detail">${current?.stageDetail || (rows.length ? "업무 수정에서 현재 단계와 세부 상황을 입력하세요." : "등록된 업무가 없습니다.")}</p>
      <div class="project-stage-progress"><div class="bar"><span style="width:${summary.progress}%"></span></div><b>${summary.progress ? `${summary.progress}%` : "직접 입력 단계"}</b></div>
      <div class="project-stage-meta"><span class="pill">단계 업무 ${summary.stagedCount}건</span><span class="pill">진행 ${summary.activeCount}건</span>${summary.missingCount ? `<span class="pill warn">미지정 ${summary.missingCount}건</span>` : ""}</div>
    </article>`;
  }).join("") || `<p class="empty-text">현재 조회 조건에 구축·운영 프로젝트가 없습니다. 이커머스 프로젝트는 종합 단계 대상에서 제외됩니다.</p>`;
}
function simpleCard(title, desc, badges = []) {
  return `<article class="data-card"><div class="title-block"><strong>${title}</strong><span>${desc}</span></div><div></div><div class="stat-row">${badges.map((b) => `<span class="pill ${b.cls || ""}">${b.text}</span>`).join("")}</div></article>`;
}

function renderDashboard(items) {
  const direction = state.dashboardDirection;
  const directionItems = direction === "전체" ? items : items.filter((task) => projectDirection(task.project) === direction);
  const data = summarize(directionItems);
  $$(".dashboard-direction").forEach((button) => button.classList.toggle("active", button.dataset.direction === direction));
  if (isImageEffortSample) {
    $("#dashTotalLabel").textContent = "작업 폴더";
    $("#dashDoneLabel").textContent = "분류율";
    $("#dashSlaLabel").textContent = "미체크 파일";
    $("#dashUrgentLabel").textContent = "총 기준공수";
    $("#dashTotal").textContent = data.total.toLocaleString();
    $("#dashDelta").textContent = `결과물 ${data.outputs.toLocaleString()}개`;
    $("#dashDone").textContent = `${data.checkRate}%`;
    $("#dashDoneText").textContent = `체크 ${data.checkedFiles.toLocaleString()} / 전체 ${data.outputs.toLocaleString()}`;
    $("#dashSla").textContent = `${data.unmatched.toLocaleString()}개`;
    $("#dashSlaText").textContent = "분류 규칙 보완 필요";
    $("#dashUrgent").textContent = formatNumber(data.standardHours);
    $("#dashUrgentText").textContent = "기준공수 합계";
  } else {
    $("#dashTotal").textContent = data.total; $("#dashDelta").textContent = `전월 대비 ${data.delta >= 0 ? "+" : ""}${data.delta}%`;
    $("#dashDone").textContent = `${data.completionRate}%`; $("#dashDoneText").textContent = `완료 ${data.completed}건 / 전체 ${data.total}건`;
    $("#dashSla").textContent = `${data.delayed}건`; $("#dashSlaText").textContent = `정상 처리율 ${data.slaRate}% · 판정보류 ${data.slaPending}건`; $("#dashUrgent").textContent = `${data.urgentRate}%`;
  }
  const projects = projectSummaries(directionItems).filter((project) => direction === "전체" || projectDirection(project.project) === direction);
  $("#projectCount").textContent = `${projects.length}개`;
  $("#dashIssueCount").textContent = `${projects.filter((p) => isImageEffortSample ? p.data.unmatched : p.data.revision || p.data.rejected || p.data.delayed).length}개`;
  $("#projectProgressList").innerHTML = projects.map(progressCard).join("");
  renderProjectStages(directionItems, direction);
}

function renderWorkers(items, target) {
  const totalHours = items.reduce((s, t) => s + t.standardHours, 0);
  const container = $(target);
  if (!container) return;
  const rowsHtml = workerEntriesFor(items).map(([name, w]) => {
    const rows = items.filter((t) => t.owner === name);
    const standardHours = rows.reduce((s, t) => s + t.standardHours, 0);
    const member = members.find((item) => item.name === name);
    const personCapacity = member ? memberSelectedPeriodCapacity(member) : monthlyCapacity(1).totalHours;
    const load = pct(standardHours, personCapacity);
    const delayed = rows.filter((t) => t.delayed).length;
    if (isImageEffortSample) {
      const data = summarize(rows);
      return `<article class="operator-row"><div class="operator-row-title"><strong>${name}</strong><span>${w.team} · 비중 ${pct(standardHours, totalHours)}% · 기준공수 ${formatNumber(standardHours)} / 임시 기준 ${w.capacity}</span></div><div class="operator-row-metrics"><span class="pill">가동지수 ${load}%</span><span class="pill">폴더 ${rows.length}개</span><span class="pill">결과물 ${data.outputs}개</span><span class="pill ${data.unmatched ? "warn" : "good"}">미체크 ${data.unmatched}개</span></div><div></div></article>`;
    }
    return `<article class="operator-row"><div class="operator-row-title"><strong>${name}</strong><span>${w.team}${w.subgroup ? ` · ${w.subgroup}` : ""} · 참여 ${pct(standardHours, totalHours)}% · 기준공수 ${effortLabel(standardHours)} / 월 가용 ${effortLabel(personCapacity)}</span></div><div class="operator-row-metrics"><span class="pill">가동 ${load}%</span><span class="pill">업무 ${rows.length}건</span><span class="pill">일정 지연 ${delayed}건</span><span class="pill">휴가 ${effortLabel(w.vacation)}</span></div><div></div></article>`;
  }).join("");
  container.innerHTML = rowsHtml || `<p class="empty-text">선택 프로젝트에 등록된 구성원이 없습니다.</p>`;
}

function canViewMonthlyActualCompletion(account = currentAccount()) {
  return Boolean(account && (account.role === "admin"
    || (account.role !== "portal" && isManagerPosition(account.name))));
}
function monthlyTaskDateCells(task, showActualCompletion) {
  return `<td class="task-date-cell">${escapeHtml(task.start || "-")}</td>
    <td class="task-date-cell">${escapeHtml(task.dueDate || "-")}</td>
    ${showActualCompletion ? `<td class="task-date-cell">${escapeHtml(task.completedDate || "미입력")}</td>` : ""}`;
}
function renderMonthly(items) {
  const projectSelected = state.project !== "전체";
  if ($("#monthlyProjectNotice")) $("#monthlyProjectNotice").classList.toggle("hidden", projectSelected);
  $$("#monthlyView .monthly-data-section").forEach((section) => section.classList.toggle("hidden", !projectSelected));
  if (!projectSelected) return;
  const rangeFrom = $("#monthlyDownloadFrom");
  const rangeTo = $("#monthlyDownloadTo");
  if (state.month && state.month !== "other" && rangeFrom && rangeTo && rangeFrom.dataset.month !== state.month) {
    const [year, month] = state.month.split("-").map(Number);
    const lastDay = String(new Date(year, month, 0).getDate()).padStart(2, "0");
    rangeFrom.value = `${state.month}-01`;
    rangeTo.value = `${state.month}-${lastDay}`;
    rangeFrom.dataset.month = state.month;
    rangeTo.dataset.month = state.month;
  }
  const data = summarize(items);
  if (isImageEffortSample) {
    $("#monthTotalLabel").textContent = "작업 폴더";
    $("#monthDoneLabel").textContent = "분류율";
    $("#monthSlaLabel").textContent = "미체크 파일";
    $("#monthUrgentLabel").textContent = "총 기준공수";
    $("#monthTotal").textContent = data.total.toLocaleString();
    $("#monthDelta").textContent = `결과물 ${data.outputs.toLocaleString()}개`;
    $("#monthDone").textContent = `${data.checkRate}%`;
    $("#monthDoneText").textContent = `체크 ${data.checkedFiles.toLocaleString()} / 전체 ${data.outputs.toLocaleString()}`;
    $("#monthSla").textContent = `${data.unmatched.toLocaleString()}개`;
    $("#monthSlaText").textContent = "분류 규칙 보완 필요";
    $("#monthUrgent").textContent = formatNumber(data.standardHours);
    $("#monthUrgentText").textContent = "기준공수 합계";
  } else {
    $("#monthTotal").textContent = data.total;
    $("#monthDelta").textContent = state.month
      ? `전월 대비 ${data.delta >= 0 ? "+" : ""}${data.delta}%`
      : `${currentPeriodLabel()} 기준`;
    $("#monthDone").textContent = `${data.completionRate}%`; $("#monthDoneText").textContent = `완료 ${data.completed}건 / 전체 ${data.total}건`;
    $("#monthSla").textContent = `${data.delayed}건`; $("#monthSlaText").textContent = `정상 처리율 ${data.slaRate}% · 판정보류 ${data.slaPending}건`;
    $("#monthUrgent").textContent = `${data.urgentRate}%`; $("#monthUrgentText").textContent = `긴급 ${data.urgent}건 / 전체 ${data.total}건`;
  }
  const taskRows = monthlyTaskRows(items);
  const showActualCompletion = canViewMonthlyActualCompletion();
  $("#monthlyActualCompletionHeader").hidden = !showActualCompletion;
  const visibleTaskRows = taskRows.slice(0, 100);
  $("#taskTableCount").textContent = taskRows.length > visibleTaskRows.length ? `${taskRows.length.toLocaleString()}건 · 화면 ${visibleTaskRows.length}건` : `${taskRows.length}건`;
  $("#taskRows").innerHTML = visibleTaskRows.map((t) => {
    const index = tasks.indexOf(t);
    return `<tr>
      <td>${t.id}</td>
      <td>${t.client}</td>
      <td>${t.project}</td>
      <td>${t.type}</td>
      <td class="task-stage-cell">${projectUsesStages(t.project) ? `<strong>${t.stage || "미지정"}</strong>${t.stageDetail ? `<small>${t.stageDetail}</small>` : ""}` : "-"}</td>
      <td>${requesterName(t)}</td>
      <td><span class="pill ${taskStatusClass(t.status)}">${t.status}</span></td>
      <td>${t.owner}</td>
      ${monthlyTaskDateCells(t, showActualCompletion)}
      <td>${effortLabel(t.standardHours)}</td>
      <td><span class="pill ${taskScheduleClass(t)}">${taskScheduleLabel(t)}</span></td>
      <td>${t.outputs.join("<br>") || "-"}</td>
      <td><button class="secondary small record-edit-open" data-record-type="task" data-index="${index}" type="button">수정</button></td>
    </tr>`;
  }).join("");
  $("#taskSearchInput").value = state.taskSearch;
  $("#teamList").innerHTML = Object.entries(groupBy(items, "team")).map(([team, rows]) => {
    const s = summarize(rows);
    return `<article class="operator-row team-item"><div class="operator-row-title"><strong>${team}</strong><span>${isImageEffortSample ? `작업 폴더 ${s.total}개 · 결과물 ${s.outputs}개 · 분류율 ${s.checkRate}%` : `업무 ${s.total}건 · 결과물 ${s.outputs}건 · 완료율 ${s.completionRate}%`}</span></div><div class="operator-row-metrics">${isImageEffortSample ? `<span class="pill">기준공수 ${formatNumber(s.standardHours)}</span><span class="pill">작업자 ${s.owners}명</span><span class="pill ${s.unmatched ? "warn" : "good"}">미체크 ${s.unmatched}개</span>` : `<span class="pill">팀 생산량 ${s.outputs}건</span><span class="pill">긴급 ${s.urgentRate}%</span><span class="pill">일정 지연 ${s.delayed}회</span>`}</div><div class="operator-row-actions"><button class="secondary small operator-detail-open" data-detail-type="team" data-detail-value="${team}" type="button">팀 상세</button></div></article>`;
  }).join("");
  $("#ownerProductivityList").innerHTML = workerEntriesFor(items).map(([owner]) => {
    const rows = items.filter((t) => t.owner === owner);
    const out = rows.reduce((s, t) => s + outputCount(t), 0);
    const standardHours = rows.reduce((s, t) => s + t.standardHours, 0);
    const member = members.find((item) => item.name === owner);
    const load = pct(standardHours, member ? memberSelectedPeriodCapacity(member) : monthlyCapacity(1).totalHours);
    const productivity = rows.length ? (out / rows.length).toFixed(1) : "0.0";
    const ownerData = summarize(rows);
    return `<article class="operator-row"><div class="operator-row-title"><strong>${owner}</strong><span>${isImageEffortSample ? `작업 폴더 ${rows.length}개 · 결과물 ${out}개` : `처리 ${rows.length}건 · 결과물 ${out}건`}</span></div><div class="operator-row-metrics">${isImageEffortSample ? `<span class="pill">가동지수 ${load}%</span><span class="pill">기준공수 ${formatNumber(standardHours)}</span><span class="pill ${ownerData.unmatched ? "warn" : "good"}">미체크 ${ownerData.unmatched}개</span>` : `<span class="pill">가동률 ${load}%</span><span class="pill">인당 생산량 ${productivity}건</span><span class="pill">긴급 ${rows.filter((t) => t.urgent).length}건</span><span class="pill">일정 지연 ${rows.filter((t) => t.delayed).length}건</span>`}</div><div></div></article>`;
  }).join("");
  renderWorkers(items, "#monthlyWorkerList");
}

function ganttTaskType(task) {
  return String(task?.stage || task?.type || "미분류");
}

function sortGanttTasks(rows, sortOrder = "startAsc", groupByType = false) {
  const dateCompare = (a, b) => {
    if (sortOrder === "startDesc") return String(b.start || "").localeCompare(String(a.start || ""));
    if (sortOrder === "dueAsc") return String(a.dueDate || a.end || "").localeCompare(String(b.dueDate || b.end || ""));
    return String(a.start || "").localeCompare(String(b.start || ""));
  };
  return [...rows].sort((a, b) => {
    const typeCompare = groupByType ? ganttTaskType(a).localeCompare(ganttTaskType(b), "ko") : 0;
    return typeCompare || dateCompare(a, b) || String(a.title || a.id || "").localeCompare(String(b.title || b.id || ""), "ko");
  });
}

function portalWbsTasks(rows, sortOrder = "startAsc", groupByType = true) {
  const dateCompare = (a, b) => {
    if (sortOrder === "startDesc") return String(b.start || "").localeCompare(String(a.start || ""));
    if (sortOrder === "dueAsc") return String(a.dueDate || a.end || "").localeCompare(String(b.dueDate || b.end || ""));
    return String(a.start || "").localeCompare(String(b.start || ""));
  };
  return [...rows].sort((a, b) => String(a.project || "").localeCompare(String(b.project || ""), "ko")
    || (groupByType ? ganttTaskType(a).localeCompare(ganttTaskType(b), "ko") : 0)
    || dateCompare(a, b)
    || String(a.title || a.id || "").localeCompare(String(b.title || b.id || ""), "ko"));
}

function ganttTimelineHtml(rows, period, options = {}) {
  const monthStart = period.start;
  const monthEnd = period.end;
  const monthDays = Math.max(1, dateDiffDays(monthStart, monthEnd) + 1);
  const today = localDateString();
  const days = Array.from({ length: monthDays }, (_, index) => {
    const current = new Date(`${monthStart}T00:00:00`);
    current.setDate(current.getDate() + index);
    const day = current.getDate();
    return { day, label: day === 1 || index === 0 ? `${current.getMonth() + 1}/${day}` : day };
  });
  let lastProject = "";
  let lastType = "";
  let projectNumber = 0;
  let typeNumber = 0;
  let taskNumber = 0;
  const body = rows.map((task) => {
    const type = ganttTaskType(task);
    const groupRows = [];
    if (options.wbs && task.project !== lastProject) {
      lastProject = task.project;
      lastType = "";
      projectNumber += 1;
      typeNumber = 0;
      taskNumber = 0;
      groupRows.push(`<div class="gantt-group-label"><strong>${projectNumber}. ${task.project || "미지정 프로젝트"}</strong></div>`);
    }
    if (options.wbs && options.wbsGroupByType !== false && type !== lastType) {
      lastType = type;
      typeNumber += 1;
      taskNumber = 0;
      groupRows.push(`<div class="gantt-group-label subgroup"><strong>${projectNumber}.${typeNumber} ${type}</strong></div>`);
    } else if (options.groupByType && type !== lastType) {
      lastType = type;
      groupRows.push(`<div class="gantt-group-label"><strong>${type}</strong></div>`);
    }
    taskNumber += 1;
    const start = task.start || monthStart;
    const due = task.dueDate || task.end || start;
    const done = task.completedDate || "";
    const end = done || due || start;
    const visibleStart = start < monthStart ? monthStart : start;
    const visibleEnd = end > monthEnd ? monthEnd : end;
    const offset = clamp(dateDiffDays(monthStart, visibleStart), 0, monthDays - 1);
    const duration = Math.max(1, clamp(dateDiffDays(visibleStart, visibleEnd) + 1, 1, monthDays - offset));
    const isLate = task.delayed || (!done && due && due < today);
    const barClass = task.status === "완료" ? "done" : isLate ? "late" : end < today ? "past" : "planned";
    const wbsNumber = options.wbs
      ? options.wbsGroupByType === false ? `${projectNumber}.${taskNumber} ` : `${projectNumber}.${typeNumber}.${taskNumber} `
      : "";
    const stageDetail = task.stageDetail ? ` · ${task.stageDetail}` : "";
    const detail = options.portal ? `${task.status} · ${start}~${end}${stageDetail}` : `${task.project} · ${task.owner} · ${task.status}${stageDetail}`;
    groupRows.push(`<div class="gantt-task">
      <strong>${wbsNumber}${task.title || task.id}</strong>
      <span>${detail}</span>
      ${options.groupByType || options.wbs ? `<span class="task-type">${type}</span>` : ""}
    </div>
    <div class="gantt-row">
      <span class="gantt-bar ${barClass}" style="grid-column:${offset + 1} / span ${duration}" title="${start} ~ ${end}">
        ${done ? `완료 ${done}` : `예정 ${due}`}
      </span>
    </div>`);
    return groupRows.join("");
  }).join("") || `<div class="gantt-empty">조회할 일정이 없습니다.</div>`;
  return `<div class="gantt-grid" style="--gantt-days:${monthDays}">
    <div class="gantt-corner">${options.cornerLabel || "업무"}</div>
    <div class="gantt-days">${days.map(({ day, label }) => `<span class="${day % 7 === 0 ? "week-mark" : ""}">${label}</span>`).join("")}</div>
    ${body}
  </div>`;
}

function renderGantt(items) {
  if (!$("#ganttTimeline")) return;
  const projectSelected = state.project !== "전체";
  $("#ganttProjectNotice")?.classList.toggle("hidden", projectSelected);
  $$("#ganttView .gantt-project-data").forEach((section) => section.classList.toggle("hidden", !projectSelected));
  if (!projectSelected) return;
  const keyword = state.ganttSearch.trim().toLowerCase();
  const types = ["전체", ...new Set(items.map(ganttTaskType))];
  if (!types.includes(state.ganttType)) state.ganttType = "전체";
  const filtered = items.filter((task) => {
    const text = [task.id, task.title, task.project, task.owner, task.status, ganttTaskType(task), task.outputs?.join(" ")].join(" ").toLowerCase();
    const keywordMatch = !keyword || text.includes(keyword);
    const typeMatch = state.ganttType === "전체" || ganttTaskType(task) === state.ganttType;
    return keywordMatch && typeMatch;
  });
  const rows = sortGanttTasks(filtered, state.ganttSortOrder, state.ganttViewMode === "type");
  $("#ganttCount").textContent = `${rows.length}건`;
  $("#ganttSearchInput").value = state.ganttSearch;
  $("#ganttTypeFilter").innerHTML = optionList(types, state.ganttType);
  $("#ganttViewMode").value = state.ganttViewMode;
  $("#ganttSortOrder").value = state.ganttSortOrder;
  const period = selectedPeriodBounds(items.length ? items : tasks);
  $("#ganttTimeline").innerHTML = ganttTimelineHtml(rows, period, {
    cornerLabel: state.ganttViewMode === "type" ? "작업 유형 / 업무" : "업무",
    groupByType: state.ganttViewMode === "type",
  });
}

function renderPortalWbsGantt(items) {
  if (!$("#portalWbsTimeline")) return;
  const types = ["전체", ...new Set(items.map(ganttTaskType))];
  if (!types.includes(state.portalWbsType)) state.portalWbsType = "전체";
  const filtered = items.filter((task) => state.portalWbsType === "전체" || ganttTaskType(task) === state.portalWbsType);
  const groupByType = state.portalWbsViewMode === "type";
  const rows = portalWbsTasks(filtered, state.portalWbsSortOrder, groupByType);
  $("#portalWbsCount").textContent = `${rows.length}건`;
  $("#portalWbsViewMode").value = state.portalWbsViewMode;
  $("#portalWbsTypeFilter").innerHTML = optionList(types, state.portalWbsType);
  $("#portalWbsSortOrder").value = state.portalWbsSortOrder;
  $("#portalWbsTimeline").innerHTML = ganttTimelineHtml(rows, selectedPeriodBounds(items), {
    cornerLabel: groupByType ? "WBS / 작업 유형 / 업무" : "WBS / 업무",
    wbs: true,
    wbsGroupByType: groupByType,
    portal: true,
  });
}

function makeReport(items) {
  const s = summarize(items);
  const worst = projectSummaries(items).sort((a, b) => b.data.urgentRate + b.data.delayRate - (a.data.urgentRate + a.data.delayRate))[0];
  return [`[월간 운영 보고]`, `대상: ${state.client} / ${state.project}`, ``, `총 요청은 ${s.total}건, 완료는 ${s.completed}건으로 완료율은 ${s.completionRate}%입니다.`, `일정 지연건은 ${s.delayed}건, 긴급 요청은 ${s.urgent}건(${s.urgentRate}%)입니다.`, `수정/재작업은 ${s.revision}건, 반려는 ${s.rejected}건입니다.`, `총 기준공수는 ${effortLabel(s.standardHours)}입니다.`, worst ? `주의 프로젝트는 ${worst.project}이며 긴급 ${worst.data.urgentRate}%, 지연 ${worst.data.delayRate}%입니다.` : `주의 프로젝트가 없습니다.`, ``, `[관리 코멘트]`, s.slaRate < 80 ? `- 일정 지연 업무의 담당자와 고객 승인 상태를 확인해야 합니다.` : `- 일정 정상률은 안정권입니다.`].join("\n");
}

function canManageWorkResources(account = currentAccount()) {
  return ["admin", "operator_all", "operator_no_profit", "operator_output_admin"].includes(account?.role);
}

function renderWorkResourceCreate() {
  const account = currentAccount();
  const availableProjectNames = workResourceProjectConfigs(account).map((project) => project.project);
  const projectNames = availableProjectNames.includes(state.project) ? [state.project] : availableProjectNames;
  const projectSet = new Set(projectNames);
  const canManage = canManageWorkResources(account);
  const createPanel = $("#workResourceCreatePanel");
  if (createPanel) createPanel.classList.toggle("hidden", !canManage);
  if ($("#workResourcePermission")) $("#workResourcePermission").textContent = `${projectNames.length}개 프로젝트 접근`;

  const formProject = $("#workResourceProject");
  if (formProject) {
    const selected = projectSet.has(state.project) ? state.project : projectSet.has(formProject.value) ? formProject.value : projectNames[0] || "";
    formProject.innerHTML = projectNames.length ? optionList(projectNames, selected) : `<option value="">접근 가능한 프로젝트 없음</option>`;
  }
  const rows = workResources
    .filter((resource) => projectSet.has(resource.project))
    .filter((resource) => state.project === "전체" || resource.project === state.project)
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  if ($("#workResourceManageCount")) $("#workResourceManageCount").textContent = `${rows.length}건`;
  if ($("#workResourceManageRows")) $("#workResourceManageRows").innerHTML = rows.map((resource) => {
    const index = workResources.indexOf(resource);
    return `<tr><td>${escapeHtml(resource.project)}</td><td>${escapeHtml(resource.category)}</td><td>${escapeHtml(resource.title)}</td><td>${escapeHtml(resource.createdBy)}</td><td>${escapeHtml(String(resource.updatedAt || resource.createdAt || "").slice(0, 10) || "-")}</td><td><div class="row-actions"><button class="secondary small work-resource-detail-open" data-index="${index}" type="button">상세 보기</button><button class="secondary small record-edit-open" data-record-type="workResource" data-index="${index}" type="button">수정</button><button class="danger-button small record-delete" data-record-type="workResource" data-index="${index}" type="button">삭제</button></div></td></tr>`;
  }).join("") || `<tr><td colspan="6">등록된 프로젝트 자료가 없습니다.</td></tr>`;
}

function renderWorkResources() {
  const account = currentAccount();
  const projectNames = workResourceProjectConfigs(account).map((project) => project.project);
  const projectSet = new Set(projectNames);
  if (projectSet.has(state.project)) state.workResourceProject = state.project;
  else if (state.workResourceProject !== "전체" && !projectSet.has(state.workResourceProject)) state.workResourceProject = "전체";
  if ($("#workResourceProjectFilter")) {
    $("#workResourceProjectFilter").innerHTML = optionList(state.project === "전체" ? ["전체", ...projectNames] : [state.project], state.workResourceProject);
    $("#workResourceProjectFilter").disabled = state.project !== "전체";
  }
  if ($("#workResourceCategoryFilter")) $("#workResourceCategoryFilter").value = state.workResourceCategory;
  if ($("#workResourceSearch")) $("#workResourceSearch").value = state.workResourceSearch;

  const keyword = state.workResourceSearch.trim().toLowerCase();
  const rows = workResources
    .filter((resource) => projectSet.has(resource.project))
    .filter((resource) => state.workResourceProject === "전체" || resource.project === state.workResourceProject)
    .filter((resource) => state.workResourceCategory === "전체" || resource.category === state.workResourceCategory)
    .filter((resource) => !keyword || [resource.title, resource.content, resource.createdBy].join(" ").toLowerCase().includes(keyword))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.workResourcePage = Math.min(Math.max(1, state.workResourcePage), totalPages);
  const visible = rows.slice((state.workResourcePage - 1) * pageSize, state.workResourcePage * pageSize);
  if ($("#workResourceCount")) $("#workResourceCount").textContent = `${rows.length}건`;
  if ($("#workResourcePage")) $("#workResourcePage").textContent = `${state.workResourcePage} / ${totalPages}`;
  if ($("#workResourcePrev")) $("#workResourcePrev").disabled = state.workResourcePage <= 1;
  if ($("#workResourceNext")) $("#workResourceNext").disabled = state.workResourcePage >= totalPages;
  if ($("#workResourceList")) $("#workResourceList").innerHTML = visible.map((resource) => {
    const index = workResources.indexOf(resource);
    const url = safeHttpUrl(resource.referenceUrl);
    return `<article class="work-resource-card">
      <header><div><span class="pill">${escapeHtml(resource.category)}</span>${resource.pinned ? `<span class="pill warn">상단 고정</span>` : ""}${resource.imagePaths?.length ? `<span class="pill">이미지 ${resource.imagePaths.length}장</span>` : ""}</div></header>
      <h3>${escapeHtml(resource.title)}</h3>
      <p>${escapeHtml(resource.content).replace(/\n/g, "<br>")}</p>
      <footer><span>${escapeHtml(resource.project)} · ${escapeHtml(resource.createdBy)} · ${escapeHtml(String(resource.updatedAt || resource.createdAt || "").slice(0, 10) || "-")}</span><div class="row-actions"><button class="secondary small work-resource-detail-open" data-index="${index}" type="button">상세 보기</button>${url ? `<a class="button-link secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">참고 링크</a>` : ""}</div></footer>
    </article>`;
  }).join("") || `<p class="empty-text">조회 조건에 맞는 업무 자료가 없습니다.</p>`;
}

function renderWorkResourceDetailModal() {
  const modal = $("#workResourceDetailModal");
  if (!modal) return;
  const candidate = Number.isInteger(state.workResourceDetailIndex) ? workResources[state.workResourceDetailIndex] : null;
  const resource = canAccessWorkResource(candidate) ? candidate : null;
  if (!resource && state.workResourceDetailIndex !== null) state.workResourceDetailIndex = null;
  modal.classList.toggle("active", !!resource);
  modal.setAttribute("aria-hidden", resource ? "false" : "true");
  if (!resource) return;
  $("#workResourceDetailTitle").textContent = resource.title;
  $("#workResourceDetailMeta").textContent = `${resource.project} · ${resource.createdBy} · ${String(resource.updatedAt || resource.createdAt || "").slice(0, 10) || "-"}`;
  $("#workResourceDetailBadges").innerHTML = `<span class="pill">${escapeHtml(resource.category)}</span>${resource.pinned ? `<span class="pill warn">상단 고정</span>` : ""}${resource.imagePaths?.length ? `<span class="pill">이미지 ${resource.imagePaths.length}장</span>` : ""}`;
  $("#workResourceDetailContent").textContent = resource.content;
  $("#workResourceDetailImages").innerHTML = resource.imagePaths?.length
    ? `<p class="empty-text">첨부 이미지를 불러오는 중입니다.</p>`
    : "";
  const url = safeHttpUrl(resource.referenceUrl);
  $("#workResourceDetailActions").innerHTML = url ? `<a class="button-link secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">참고 링크 열기</a>` : "";
}

async function hydrateWorkResourceDetailImages(index) {
  const resource = workResources[index];
  const container = $("#workResourceDetailImages");
  if (!canAccessWorkResource(resource) || !resource?.imagePaths?.length || !container || !remoteData?.signedWorkResourceImageUrl) return;
  const results = await Promise.allSettled(resource.imagePaths.map((path) => remoteData.signedWorkResourceImageUrl(path)));
  if (state.workResourceDetailIndex !== index) return;
  const urls = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  container.innerHTML = urls.map((url, imageIndex) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="원본 이미지 열기"><img src="${escapeHtml(url)}" alt="${escapeHtml(resource.title)} 첨부 이미지 ${imageIndex + 1}" loading="lazy" /></a>`).join("")
    || `<p class="empty-text">첨부 이미지를 불러오지 못했습니다.</p>`;
}

function taskRecommendationRows(projectName, date) {
  if (!projectName || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return [];
  const config = projectConfig(projectName);
  const dayTarget = Number(config?.assignmentDailyTarget || absoluteDailyHoursForProject(projectName));
  const monthTarget = config?.assignmentMonthlyTarget ?? dayTarget * workingDaysForMonth(date.slice(0, 7));
  const candidateNames = new Set(projectAssignments[projectName] || []);
  const managerNames = new Set(assignedProjectManagers(projectName));
  const scoped = tasks.filter(task => task.project === projectName);
  const daily = new Map(DailyStatus.totals(scoped, date).map(row => [row.key, row.hours]));
  const monthly = new Map();
  [...new Set(scoped.map(DailyStatus.dateOf).filter(d => d.startsWith(date.slice(0, 7))))].forEach(day => {
    DailyStatus.totals(scoped, day).forEach(row => monthly.set(row.key, (monthly.get(row.key) || 0) + row.hours));
  });
  const level = (used, target) => Math.abs(used - target) < 0.005 ? "equal" : used > target ? "over" : "under";
  return members.filter(member => member.employmentStatus !== "퇴사" && member.position !== "관리자" && !managerNames.has(member.name) && candidateNames.has(member.name)).map(member => {
    const key = member._id || member.name;
    const dayUsed = daily.get(key) || 0, monthUsed = monthly.get(key) || 0;
    return {member, dayUsed, monthUsed, dayTarget, monthTarget,
      dayRemaining: dayTarget - dayUsed, monthRemaining: monthTarget - monthUsed,
      dayLevel: level(dayUsed, dayTarget), monthLevel: level(monthUsed, monthTarget)};
  }).sort((a,b) => b.dayRemaining-a.dayRemaining || b.monthRemaining-a.monthRemaining || a.member.name.localeCompare(b.member.name,"ko"));
}

function renderTaskAssigneeRecommendations(projectName) {
  const container = $("#taskAssigneeRecommendations");
  if (!container) return;
  const date = $("#taskDueInput")?.value || "";
  $("#taskRecommendationMonth").textContent = date ? `${date} / ${date.slice(0,7)} 기준` : "완료 예정일을 선택하세요";
  const rows = taskRecommendationRows(projectName, date);
  const labels = {under:"미달",equal:"목표 도달",over:"초과"};
  container.innerHTML = rows.map(row => `
    <button class="task-assignee-recommendation-item load-${row.dayLevel} ${$("#taskOwnerInput")?.value === row.member.name ? "selected" : ""}" data-owner="${escapeHtml(row.member.name)}" type="button" aria-pressed="${$("#taskOwnerInput")?.value === row.member.name}">
      <span class="recommendation-person"><strong>${escapeHtml(row.member.name)}</strong><small>${escapeHtml(row.member.team || "미지정")}</small></span>
      <span class="task-recommendation-load load-${row.dayLevel}"><b>일 잔여 ${formatNumber(row.dayRemaining,2)}H</b><small>${labels[row.dayLevel]} · ${formatNumber(row.dayUsed,2)} / ${formatNumber(row.dayTarget,2)}H</small></span>
      <span class="task-recommendation-load load-${row.monthLevel}"><b>월 잔여 ${formatNumber(row.monthRemaining,2)}H</b><small>${labels[row.monthLevel]} · ${formatNumber(row.monthUsed,2)} / ${formatNumber(row.monthTarget,2)}H</small></span>
    </button>`).join("") || '<p class="empty-text">프로젝트와 완료 예정일을 선택하면 배정 가능한 전체 인원이 표시됩니다.</p>';
}

function relatedTaskCandidates(projectName, excludeTaskId = "") {
  return tasks
    .filter((task) => task.project === projectName && task.id !== excludeTaskId)
    .sort((a, b) => String(b.start || "").localeCompare(String(a.start || "")) || String(b.id).localeCompare(String(a.id)));
}

function renderRelatedTaskOptions(projectName, inputSelector = "#taskRelatedTaskInput", listSelector = "#taskRelatedTaskOptions", excludeTaskId = "") {
  const input = $(inputSelector);
  const list = $(listSelector);
  if (!input || !list) return;
  const rows = relatedTaskCandidates(projectName, excludeTaskId);
  list.innerHTML = rows.map((task) => `<option value="${escapeHtml(task.id)}">${escapeHtml(task.title)} · ${escapeHtml(task.owner || "미지정")} · ${escapeHtml(task.start || "-")}</option>`).join("");
  input.disabled = !projectName || !rows.length;
  input.placeholder = rows.length ? "업무번호 또는 업무명으로 검색" : "연결할 기존 업무가 없습니다";
}

function validatedRelatedTaskId(value, projectName, excludeTaskId = "") {
  const query = String(value || "").trim();
  if (!query) return "";
  const rows = relatedTaskCandidates(projectName, excludeTaskId);
  const exactId = rows.find((task) => task.id.toLowerCase() === query.toLowerCase());
  if (exactId) return exactId.id;
  const titleMatches = rows.filter((task) => task.title.trim().toLowerCase() === query.toLowerCase());
  return titleMatches.length === 1 ? titleMatches[0].id : null;
}

function renderTaskRegistration() {
  const account = currentAccount();
  const canEditBuffer = account?.role === "admin";
  const accountMember = members.find((member) => member.name === account?.name && member.employmentStatus !== "퇴사");
  const registrationAccountValid = account?.role === "admin" || Boolean(accountMember);
  const authorizedProjects = authorizedProjectNames(account);
  const projectNames = authorizedProjects.includes(state.project) ? [state.project] : authorizedProjects;
  const projectSelect = $("#taskProjectInput");
  const previousProject = projectSelect?.value;
  const selectedProject = projectNames.includes(state.project)
    ? state.project
    : projectNames.includes(previousProject) ? previousProject : projectNames[0] || "";
  if (projectSelect) projectSelect.innerHTML = optionList(projectNames, selectedProject);
  const ownerSelect = $("#taskOwnerInput");
  if (ownerSelect) {
    const previousOwner = ownerSelect.value;
    const assignedNames = new Set(projectAssignments[selectedProject] || []);
    const eligibleOwners = members
      .filter((member) => member.employmentStatus !== "퇴사" && assignedNames.has(member.name))
      .map((member) => member.name);
    const selectedOwner = eligibleOwners.includes(previousOwner)
      ? previousOwner
      : eligibleOwners.includes(accountMember?.name) ? accountMember.name : eligibleOwners[0] || "";
    ownerSelect.innerHTML = eligibleOwners.length ? optionList(eligibleOwners, selectedOwner) : `<option value="">배정 가능한 인원 없음</option>`;
  }
  if ($("#taskAccountBadge")) $("#taskAccountBadge").textContent = accountMember
    ? `${account?.id || "-"} · ${projectNames.length}개 프로젝트`
    : `${account?.id || "-"} · 인원 정보 지정 필요`;
  const submitButton = $("#taskForm")?.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = !registrationAccountValid || !projectNames.length || !ownerSelect?.value;
    submitButton.title = !registrationAccountValid
      ? "관리자 > 회사 업무 그룹 > 인원 등급 리스트에서 계정의 팀·포지션·등급을 지정하세요. 관리자 계정은 직원 연결 없이 등록할 수 있습니다."
      : !projectNames.length ? "접근 가능한 진행 프로젝트가 없습니다."
        : !ownerSelect?.value ? "선택 프로젝트에 배정 가능한 담당자가 없습니다." : "";
  }
  $("#taskEffortBufferLabel")?.classList.toggle("hidden", !canEditBuffer);
  if (!canEditBuffer && $("#taskEffortBufferInput")) $("#taskEffortBufferInput").value = "0";
  syncTaskStageFields(selectedProject, "register", true);
  if ($("#taskStartInput") && !$("#taskStartInput").value) $("#taskStartInput").value = `${(state.month !== "other" && state.month) || DEFAULT_MONTH}-01`;
  renderTaskDeliverables(selectedProject);
  renderRelatedTaskOptions(selectedProject);
  updateTaskDueSuggestion();
  renderTaskAssigneeRecommendations(selectedProject);
}

function renderTaskStatus(items) {
  $$("#taskStatusDirectionTabs .direction-tab").forEach((button) => button.classList.toggle("active", button.dataset.taskDirection === state.taskStatusDirection));
  const directionItems = state.taskStatusDirection === "전체"
    ? items
    : items.filter((task) => projectDirection(task.project) === state.taskStatusDirection);
  const keyword = state.registeredTaskSearch.trim().toLowerCase();
  const searchedItems = directionItems.filter((task) => {
    const outputNames = taskOutputDetails(task).map((detail) => detail.name);
    return !keyword || [task.id, task.title, task.relatedTaskId, task.project, task.stage, task.stageDetail, task.owner, ...outputNames]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  }).sort((a, b) => String(b.start || "").localeCompare(String(a.start || "")) || String(b.id).localeCompare(String(a.id)));
  const pageSize = 40;
  const totalPages = Math.max(1, Math.ceil(searchedItems.length / pageSize));
  state.registeredTaskPage = Math.min(Math.max(1, state.registeredTaskPage), totalPages);
  const visibleItems = searchedItems.slice((state.registeredTaskPage - 1) * pageSize, state.registeredTaskPage * pageSize);
  if ($("#taskStatusTotal")) $("#taskStatusTotal").textContent = `${directionItems.length}건`;
  if ($("#taskStatusActive")) $("#taskStatusActive").textContent = `${directionItems.filter((task) => ["요청", "진행", "검수"].includes(task.status)).length}건`;
  if ($("#taskStatusDone")) $("#taskStatusDone").textContent = `${directionItems.filter((task) => task.status === "완료").length}건`;
  if ($("#taskStatusDelayed")) $("#taskStatusDelayed").textContent = `${directionItems.filter((task) => task.delayed && task.slaResponsibility === "우리측").length}건`;
  if ($("#registeredTaskSearchInput")) $("#registeredTaskSearchInput").value = state.registeredTaskSearch;
  if ($("#registeredTaskCount")) $("#registeredTaskCount").textContent = `${searchedItems.length}건`;
  $("#standardRows").innerHTML = visibleItems.map((task) => {
    const rule = taskSlaRule(task);
    const slaText = rule.configured ? `기준일 ${task.slaDueDate || "-"} · ${rule.source} · 일정변경 ${task.scheduleChanges?.length || 0}건` : "기준 없음";
    const index = tasks.indexOf(task);
    const stageText = projectUsesStages(task.project) ? `<strong>${task.stage || "미지정"}</strong>${task.stageDetail ? `<small>${task.stageDetail}</small>` : ""}` : "-";
    const taskTitleText = `<strong>${escapeHtml(task.title)}</strong>${task.relatedTaskId ? `<small class="related-task-label">연결 업무 ${escapeHtml(task.relatedTaskId)}</small>` : ""}`;
    const noteCount = task.detailNotes?.length || 0;
    return `<tr><td>${task.id}</td><td class="task-title-cell">${taskTitleText}</td><td>${task.project}</td><td><span class="pill">${projectDirection(task.project)}</span></td><td class="task-stage-cell">${stageText}</td><td>${task.owner}</td><td>${task.start || "-"}</td><td>${task.dueDate || "-"}</td><td>${task.completedDate || '<span class="pill warn">기타 · 완료일 미입력</span>'}</td><td>${task.slaResponsibility || "미확인"}</td><td>${taskEffortAdjustmentLabel(task)}</td><td>${effortLabel(task.standardHours)}</td><td><span class="pill ${taskScheduleClass(task)}">${taskScheduleLabel(task)} · ${slaText}</span></td><td><div class="row-actions"><button class="secondary small task-detail-open" data-index="${index}" type="button">세부사항${noteCount ? ` ${noteCount}` : ""}</button>${canEditTaskRecord(task) ? `<button class="secondary small record-edit-open" data-record-type="task" data-index="${index}" type="button">수정</button>` : ""}</div></td></tr>`;
  }).join("") || `<tr><td colspan="14" class="empty-cell">${keyword ? "검색 조건에 맞는 등록 업무가 없습니다." : "현재 조회 조건에 등록된 업무가 없습니다."}</td></tr>`;
  if ($("#registeredTaskPage")) $("#registeredTaskPage").textContent = `${state.registeredTaskPage} / ${totalPages} · 총 ${searchedItems.length}건`;
  if ($("#registeredTaskPrev")) $("#registeredTaskPrev").disabled = state.registeredTaskPage <= 1;
  if ($("#registeredTaskNext")) $("#registeredTaskNext").disabled = state.registeredTaskPage >= totalPages;
}

function taskDetailDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "-");
  return date.toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderTaskDetailModal() {
  const modal = $("#taskDetailModal");
  if (!modal) return;
  const task = tasks[state.taskDetailIndex];
  if (!task) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    return;
  }
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  $("#taskDetailTitle").textContent = `${task.id} · ${task.title}`;
  $("#taskDetailMeta").textContent = `${task.project} · 담당자 ${task.owner || "미지정"} · ${task.start || "-"} ~ ${task.dueDate || "-"}`;
  const outputs = taskOutputDetails(task).map((detail) => `${detail.name} ${formatNumber(detail.count, 0)}개`).join(", ") || "결과물 없음";
  const relatedTask = tasks.find((item) => item.id === task.relatedTaskId);
  $("#taskDetailSummary").innerHTML = `
    <div><span>상태</span><strong>${escapeHtml(task.status || "-")}</strong></div>
    <div><span>종합 단계</span><strong>${escapeHtml(task.stage || "미지정")}</strong></div>
    <div><span>연결 업무</span><strong>${task.relatedTaskId ? `${escapeHtml(task.relatedTaskId)}${relatedTask ? ` · ${escapeHtml(relatedTask.title)}` : ""}` : "없음"}</strong></div>
    <div><span>결과물</span><strong>${escapeHtml(outputs)}</strong></div>
    <div><span>기준공수</span><strong>${effortLabel(task.standardHours)}</strong></div>`;
  const canWrite = canEditTaskRecord(task);
  $("#taskDetailComposer").classList.toggle("hidden", !canWrite);
  const notes = [...(task.detailNotes || [])].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(notes.length / pageSize));
  state.taskDetailPage = Math.min(Math.max(1, state.taskDetailPage), totalPages);
  const visible = notes.slice((state.taskDetailPage - 1) * pageSize, state.taskDetailPage * pageSize);
  $("#taskDetailNoteList").innerHTML = visible.map((note) => `
    <article class="task-detail-note">
      <header><span class="pill">${escapeHtml(note.type || "진행 메모")}</span><strong>${escapeHtml(note.author || "미확인")}</strong><time>${escapeHtml(taskDetailDateLabel(note.createdAt))}</time></header>
      <p>${escapeHtml(note.content || "").replace(/\n/g, "<br>")}</p>
    </article>`).join("") || `<p class="empty-text task-detail-empty">등록된 세부사항이 없습니다.</p>`;
  $("#taskDetailPage").textContent = `${state.taskDetailPage} / ${totalPages} · 총 ${notes.length}건`;
  $("#taskDetailPrev").disabled = state.taskDetailPage <= 1;
  $("#taskDetailNext").disabled = state.taskDetailPage >= totalPages;
  const saveButton = $("#taskDetailNoteSave");
  if (saveButton) {
    saveButton.disabled = state.taskDetailSaving;
    saveButton.textContent = state.taskDetailSaving ? "저장 중" : "기록 추가";
  }
}

function renderTaskDeliverables(projectName) {
  const container = $("#taskDeliverableOptions");
  if (!container) return;
  const keyword = state.taskDeliverableSearch.trim().toLowerCase();
  const projectRows = deliverables.filter((deliverable) => deliverable.project === projectName);
  const selectedMap = state.taskDeliverableSelections[projectName] || {};
  const rows = projectRows
    .map((deliverable, index) => ({ deliverable, index }))
    .filter(({ deliverable }) => state.taskShowAllDeliverables
      || (keyword && [deliverable.name, deliverable.keywords].join(" ").toLowerCase().includes(keyword)));
  if ($("#taskDeliverableSearchInput")) $("#taskDeliverableSearchInput").value = state.taskDeliverableSearch;
  container.classList.toggle("show-all", state.taskShowAllDeliverables);
  const toggleButton = $("#toggleAllTaskDeliverables");
  if (toggleButton) {
    toggleButton.textContent = state.taskShowAllDeliverables ? "전체 결과물 닫기" : "전체 결과물 보기";
    toggleButton.setAttribute("aria-expanded", String(state.taskShowAllDeliverables));
  }
  container.innerHTML = rows.map(({ deliverable, index }) => `
    <label class="task-deliverable-item">
      <input class="task-deliverable-check" type="checkbox" data-index="${index}" ${selectedMap[deliverable.name] ? "checked" : ""} />
      <span><strong>${deliverable.name}</strong><small>${effortLabel(deliverable.standardHours)} / 건 · ${deliverable.slaEnabled ? `평균 ${deliverable.slaDays}영업일` : "일정 기준 미설정"}</small></span>
      <input class="task-deliverable-count" type="number" min="1" step="1" value="${selectedMap[deliverable.name]?.count || 1}" data-index="${index}" aria-label="${deliverable.name} 수량" />
    </label>`).join("") || `<p class="empty-text">${projectRows.length ? (keyword ? "검색 조건에 맞는 결과물이 없습니다." : "검색어를 입력하거나 전체 결과물 보기를 선택하세요.") : "이 프로젝트에 등록된 결과물이 없습니다."}</p>`;
  updateTaskRegistrationSummary();
}

function selectedTaskDeliverables() {
  const projectName = $("#taskProjectInput")?.value;
  const projectDeliverables = deliverables.filter((deliverable) => deliverable.project === projectName);
  const selectedMap = state.taskDeliverableSelections[projectName] || {};
  return Object.entries(selectedMap).map(([name, data]) => {
    const deliverable = projectDeliverables.find((item) => item.name === name);
    return deliverable ? { deliverable, count: Math.max(1, Number(data.count || 1)) } : null;
  }).filter(Boolean);
}

function closeEmptyOutputConfirm(value = null) {
  const modal = $("#emptyOutputConfirmModal");
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
  const resolve = emptyOutputConfirmResolver;
  emptyOutputConfirmResolver = null;
  resolve?.(value);
}

function requestEmptyOutputConfirmation() {
  const modal = $("#emptyOutputConfirmModal");
  const input = $("#emptyOutputManualHours");
  if (!modal || !input) return Promise.resolve(0);
  if (emptyOutputConfirmResolver) closeEmptyOutputConfirm(null);
  input.value = "";
  $("#emptyOutputHoursPreview").textContent = "등록 공수 0H";
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => input.focus(), 0);
  return new Promise((resolve) => {
    emptyOutputConfirmResolver = resolve;
  });
}

function assignmentWorkingDates(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue || startValue}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6 && !KOREAN_PUBLIC_HOLIDAYS.has(dateKey)) dates.push(dateKey);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates.length ? dates : [startValue];
}

function taskAssignmentConflict(member, startValue, dueValue, proposedHours) {
  const proposedDates = assignmentWorkingDates(startValue, dueValue);
  if (!member || !proposedDates.length || Number(proposedHours || 0) <= 0) return null;
  const proposedDateSet = new Set(proposedDates);
  const daily = new Map(proposedDates.map((date) => [date, { existingHours: 0, proposedHours: Number(proposedHours || 0) / proposedDates.length }]));
  const activeStatuses = new Set(["요청", "진행", "검수", "보류"]);
  const existingTasks = tasks.flatMap((task) => {
    if (!activeStatuses.has(task.status) || !taskAssignedToMember(task, member)) return [];
    const taskDates = assignmentWorkingDates(task.start, task.dueDate || task.end || task.start);
    const overlapDates = taskDates.filter((date) => proposedDateSet.has(date));
    const hours = memberStandardHours(task, member);
    if (!overlapDates.length || hours <= 0) return [];
    const dailyHours = hours / Math.max(1, taskDates.length);
    overlapDates.forEach((date) => { daily.get(date).existingHours += dailyHours; });
    return [{ task, hours, dailyHours, overlapDates }];
  });
  const overloadDates = [...daily.entries()].map(([date, value]) => ({
    date,
    existingHours: value.existingHours,
    proposedHours: value.proposedHours,
    totalHours: value.existingHours + value.proposedHours,
    overHours: Math.max(0, value.existingHours + value.proposedHours - 8),
  })).filter((row) => row.totalHours > 8.0001);
  if (!overloadDates.length) return null;
  return {
    member,
    start: startValue,
    due: dueValue,
    proposedHours: Number(proposedHours || 0),
    proposedDailyHours: Number(proposedHours || 0) / proposedDates.length,
    workingDays: proposedDates.length,
    existingTasks,
    overloadDates,
    maxDailyHours: Math.max(...overloadDates.map((row) => row.totalHours)),
  };
}

function closeAssignmentConflict(value = false) {
  const modal = $("#assignmentConflictModal");
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
  const resolve = assignmentConflictResolver;
  assignmentConflictResolver = null;
  resolve?.(value);
}

function requestAssignmentConflictConfirmation(conflict) {
  const modal = $("#assignmentConflictModal");
  if (!modal || !conflict) return Promise.resolve(true);
  if (assignmentConflictResolver) closeAssignmentConflict(false);
  $("#assignmentConflictDescription").textContent = `${conflict.member.name}님의 ${conflict.start} ~ ${conflict.due} 배정 공수가 일 8H를 초과합니다.`;
  $("#assignmentConflictSummary").innerHTML = `
    <div><span>담당자</span><strong>${escapeHtml(conflict.member.name)}</strong></div>
    <div><span>신규 업무</span><strong>${effortLabel(conflict.proposedHours)} · ${conflict.workingDays}일</strong></div>
    <div><span>신규 일 배분</span><strong>${formatNumber(conflict.proposedDailyHours, 1)}H</strong></div>
    <div><span>최대 일일 공수</span><strong class="danger-text">${formatNumber(conflict.maxDailyHours, 1)}H</strong></div>`;
  $("#assignmentConflictDates").innerHTML = `<strong>초과 일자</strong>${conflict.overloadDates.map((row) => `<span class="pill danger">${row.date} · ${formatNumber(row.totalHours, 1)}H (+${formatNumber(row.overHours, 1)}H)</span>`).join("")}`;
  $("#assignmentConflictRows").innerHTML = conflict.existingTasks.map(({ task, hours, dailyHours }) => `<tr>
    <td>${escapeHtml(task.id)}</td><td>${escapeHtml(task.project)}</td><td>${escapeHtml(task.title)}</td>
    <td>${escapeHtml(task.start || "-")} ~ ${escapeHtml(task.dueDate || task.end || "-")}</td>
    <td>${effortLabel(hours)}</td><td>${formatNumber(dailyHours, 1)}H/일</td>
  </tr>`).join("") || `<tr><td colspan="6" class="empty-cell">동일 기간의 기존 업무 상세가 없습니다.</td></tr>`;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  return new Promise((resolve) => { assignmentConflictResolver = resolve; });
}

function syncTaskDeliverableSelection(target) {
  const projectName = $("#taskProjectInput")?.value;
  if (!projectName || !target?.dataset?.index) return;
  const deliverable = deliverables.filter((item) => item.project === projectName)[Number(target.dataset.index)];
  if (!deliverable) return;
  state.taskDeliverableSelections[projectName] ||= {};
  const row = target.closest(".task-deliverable-item");
  const checked = row?.querySelector(".task-deliverable-check")?.checked;
  const count = Math.max(1, Number(row?.querySelector(".task-deliverable-count")?.value || 1));
  if (checked) state.taskDeliverableSelections[projectName][deliverable.name] = { count };
  else delete state.taskDeliverableSelections[projectName][deliverable.name];
}

function renderSelectedTaskDeliverables() {
  const container = $("#selectedTaskDeliverables");
  if (!container) return;
  const selected = selectedTaskDeliverables();
  container.innerHTML = selected.map(({ deliverable, count }) => `
    <div class="selected-deliverable-row" data-output-name="${String(deliverable.name).replace(/"/g, "&quot;")}">
      <div><strong>${deliverable.name}</strong><small>${effortLabel(deliverable.standardHours)} / 건 · ${deliverable.slaEnabled ? `평균 ${deliverable.slaDays}영업일` : "일정 기준 미설정"}</small></div>
      <input class="selected-deliverable-count" type="number" min="1" step="1" value="${count}" aria-label="${deliverable.name} 선택 수량" />
      <button class="danger-button icon-button selected-deliverable-remove" type="button" aria-label="${deliverable.name} 삭제" title="삭제">×</button>
    </div>`).join("") || `<p class="empty-text">선택된 결과물이 없습니다.</p>`;
}

function updateTaskDueSuggestion(force = false) {
  const dueInput = $("#taskDueInput");
  const start = $("#taskStartInput")?.value;
  const project = $("#taskProjectInput")?.value;
  if (!dueInput || !start || !project || (!force && dueInput.value)) return;
  const selected = selectedTaskDeliverables();
  const rule = taskSlaRule({
    project,
    type: projectDirection(project),
    outputs: selected.map((item) => `${item.deliverable.name}(${item.count})`),
  });
  dueInput.value = rule.configured ? addWorkingDays(start, rule.limit) : start;
  renderTaskAssigneeRecommendations(project);
}

function updateTaskRegistrationSummary() {
  const summary = $("#taskRegistrationSummary");
  if (!summary) return;
  renderSelectedTaskDeliverables();
  const selected = selectedTaskDeliverables();
  const totalCount = selected.reduce((sum, item) => sum + item.count, 0);
  const baseHours = selected.reduce((sum, item) => sum + item.deliverable.standardHours * item.count, 0);
  const photoType = normalizePhotoType($("#taskPhotoTypeInput")?.value);
  const bufferPct = normalizeEffortBufferPct($("#taskEffortBufferInput")?.value);
  const outputHours = outputEffortHours(baseHours, photoType);
  const resourceHours = resourceEffortHours(baseHours, photoType, bufferPct);
  const projectName = $("#taskProjectInput")?.value || "-";
  const slaRule = taskSlaRule({
    project: projectName,
    type: "",
    outputs: selected.map((item) => `${item.deliverable.name}(${item.count})`),
  });
  const start = $("#taskStartInput")?.value;
  const due = $("#taskDueInput")?.value;
  const standardDue = start && slaRule.configured ? addWorkingDays(start, slaRule.limit) : "";
  const urgentByRequest = Boolean(standardDue && due && due < standardDue);
  summary.innerHTML = `<strong>${selected.length}종 · ${totalCount}개</strong><span>기본 ${effortLabel(baseHours)} → 결과물 공수 ${effortLabel(outputHours)}</span><span>리소스 적용 ${effortLabel(resourceHours)} · ${photoType} · 개별 버퍼 ${bufferPct > 0 ? "+" : ""}${formatNumber(bufferPct, 1)}%</span><span>일정 기준 ${slaRule.configured ? `${slaRule.limit}영업일 · ${slaRule.source}` : "미설정"}</span><span>${urgentByRequest ? "요청자 긴급요청" : "정상 요청 일정"}</span>`;
}

function normalizeImportKey(value) {
  return String(value ?? "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, "");
}

function missingFieldReason(fields) {
  return `필수값 누락: ${fields.join(", ")}`;
}

function normalizeDeliverableKey(value) {
  return normalizeImportKey(value)
    .replace(/[×＊*]/g, "x")
    .replace(/[()[\]{}_\-.,/+]/g, "");
}

function deliverableNameKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/\([^)]*\d[^)]*\)/g, "")
    .replace(/\d+\s*[x×＊*]\s*\d+(?:\s*[x×＊*]\s*\d+)*/g, "")
    .replace(/[\s()[\]{}_\-.,/+]/g, "");
}

function deliverableNameVariants(value) {
  const key = deliverableNameKey(value);
  return [...new Set([key, key.replace(/배너$/, "")].filter((item) => item.length >= 2))];
}

function isDeliverableNameMatch(left, right) {
  const leftVariants = deliverableNameVariants(left);
  const rightVariants = deliverableNameVariants(right);
  if (leftVariants.some((item) => rightVariants.includes(item))) return true;
  return leftVariants.some((a) => rightVariants.some((b) => {
    const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
    if (shorter.length < 2 || !longer.startsWith(shorter)) return false;
    const remainder = longer.slice(shorter.length);
    return remainder.startsWith("배너") || shorter.endsWith("배너");
  }));
}

function importCompositeKey(id, subNumber) {
  return `${normalizeImportKey(id)}|${normalizeImportKey(subNumber)}`;
}

function stringBigrams(value) {
  if (value.length < 2) return value ? [value] : [];
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2));
}

function deliverableIdentityNumbers(value) {
  const withoutSpecs = String(value ?? "")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/\([^)]*\d[^)]*\)/g, "")
    .replace(/\d+\s*[x×＊*]\s*\d+(?:\s*[x×＊*]\s*\d+)*/g, "");
  return withoutSpecs.match(/\d+/g) || [];
}

function deliverableSimilarity(left, right) {
  const leftNumbers = deliverableIdentityNumbers(left);
  const rightNumbers = deliverableIdentityNumbers(right);
  if (leftNumbers.length && rightNumbers.length && leftNumbers.join("|") !== rightNumbers.join("|")) return 0;
  const a = normalizeDeliverableKey(left);
  const b = normalizeDeliverableKey(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (Math.min(a.length, b.length) >= 3 && (a.includes(b) || b.includes(a))) return 0.9;
  const aBigrams = stringBigrams(a);
  const remaining = [...stringBigrams(b)];
  let matches = 0;
  aBigrams.forEach((bigram) => {
    const index = remaining.indexOf(bigram);
    if (index >= 0) {
      matches += 1;
      remaining.splice(index, 1);
    }
  });
  return (2 * matches) / Math.max(1, aBigrams.length + stringBigrams(b).length);
}

function findDeliverableMatch(projectName, uploadedName) {
  const scoreCandidates = (candidates) => candidates
    .map((deliverable) => {
      const exact = normalizeDeliverableKey(uploadedName) === normalizeDeliverableKey(deliverable.name);
      const nameMatch = !exact && isDeliverableNameMatch(uploadedName, deliverable.name);
      return {
        deliverable,
        priority: exact ? 3 : nameMatch ? 2 : 1,
        matchType: exact ? "완전 일치" : nameMatch ? "명칭 일치" : "유사 일치",
        score: exact ? 1 : nameMatch ? 0.97 : deliverableSimilarity(uploadedName, deliverable.name),
      };
    })
    .sort((a, b) => b.priority - a.priority || b.score - a.score)[0];
  const projectMatch = scoreCandidates(deliverables.filter((item) => item.project === projectName));
  if (projectMatch && (projectMatch.priority >= 2 || projectMatch.score >= 0.55)) return projectMatch;
  const globalMatch = scoreCandidates(deliverables);
  return globalMatch && (globalMatch.priority >= 2 || globalMatch.score >= 0.62) ? globalMatch : null;
}

function parseBulkDeliverableText(value, projectName) {
  const text = String(value || "").trim();
  const candidates = deliverables.filter((item) => item.project === projectName);
  const entries = [];
  const matchedRanges = [];
  const pattern = /([\s\S]*?)(?:\s*(?:x|×|\*|:)\s*|\s+)(\d+(?:\.\d+)?)\s*(?:개|건)?(?=\s*(?:[,;\n]|$))/gi;
  let match;
  while ((match = pattern.exec(text))) {
    const name = match[1].replace(/^[\s,;]+|[\s,;]+$/g, "").trim();
    const count = Number(match[2]);
    if (name && Number.isFinite(count) && count > 0) entries.push({ name, count });
    matchedRanges.push([match.index, pattern.lastIndex]);
  }
  let residual = text;
  [...matchedRanges].reverse().forEach(([start, end]) => {
    residual = `${residual.slice(0, start)} ${residual.slice(end)}`;
  });
  residual = residual.replace(/[\s,;]+/g, " ").trim();

  const result = { matched: [], ambiguous: [], unmatched: [] };
  if (!entries.length && text) result.unmatched.push(text);
  entries.forEach((entry) => {
    const ranked = candidates.map((deliverable) => {
      const exact = normalizeDeliverableKey(entry.name) === normalizeDeliverableKey(deliverable.name);
      const nameMatch = !exact && isDeliverableNameMatch(entry.name, deliverable.name);
      return {
        deliverable,
        priority: exact ? 3 : nameMatch ? 2 : 1,
        score: exact ? 1 : nameMatch ? 0.97 : deliverableSimilarity(entry.name, deliverable.name),
      };
    }).sort((a, b) => b.priority - a.priority || b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    const accepted = best && (best.priority >= 2 || best.score >= 0.55);
    const ambiguous = accepted && best.priority < 3 && second
      && second.priority === best.priority
      && Math.abs(best.score - second.score) < 0.05;
    if (!accepted) result.unmatched.push(entry.name);
    else if (ambiguous) result.ambiguous.push({ ...entry, candidates: [best.deliverable.name, second.deliverable.name] });
    else result.matched.push({ deliverable: best.deliverable, count: entry.count });
  });
  if (residual) result.unmatched.push(residual);
  return result;
}

function showBulkDeliverableResult(selector, result) {
  const node = $(selector);
  if (!node) return;
  const matchedText = result.matched.map((item) => `${item.deliverable.name} × ${formatNumber(item.count, 2)}`);
  const issueText = result.unmatched.map((name) => `${name}: 미인식`);
  node.hidden = false;
  node.classList.toggle("warning", issueText.length > 0 || result.ambiguous.length > 0);
  node.replaceChildren();
  const summary = document.createElement("div");
  summary.textContent = [matchedText.length ? `적용 ${matchedText.join(", ")}` : "적용된 결과물 없음", issueText.length ? `확인 ${issueText.join(", ")}` : ""].filter(Boolean).join(" · ");
  node.append(summary);
  result.ambiguous.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bulk-candidate-row";
    const label = document.createElement("span");
    label.textContent = `${item.name} × ${formatNumber(item.count, 2)} 후보`;
    row.append(label);
    item.candidates.forEach((name) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary small bulk-candidate-select";
      button.dataset.context = selector.startsWith("#edit") ? "edit" : "register";
      button.dataset.outputName = name;
      button.dataset.count = item.count;
      button.textContent = name;
      row.append(button);
    });
    node.append(row);
  });
}

function applyBulkCandidateSelection(button) {
  const context = button.dataset.context;
  const projectName = context === "edit" ? $("#editTaskProject")?.value : $("#taskProjectInput")?.value;
  const name = button.dataset.outputName;
  const count = Math.max(1, Number(button.dataset.count || 1));
  if (!projectName || !name) return;
  if (context === "edit") {
    const row = $$(".edit-task-output-row").find((item) => normalizeDeliverableKey(item.querySelector(".edit-task-output-check")?.dataset.outputName) === normalizeDeliverableKey(name));
    if (row) {
      row.querySelector(".edit-task-output-check").checked = true;
      row.querySelector(".edit-task-output-count").value = count;
    }
  } else {
    state.taskDeliverableSelections[projectName] ||= {};
    state.taskDeliverableSelections[projectName][name] = { count };
    renderTaskDeliverables(projectName);
    updateTaskDueSuggestion(true);
  }
  const resultRow = button.closest(".bulk-candidate-row");
  if (resultRow) resultRow.textContent = `선택됨 ${name} × ${formatNumber(count, 2)}`;
}

function applyTaskDeliverableBulkInput() {
  const input = $("#taskDeliverableSearchInput");
  const projectName = $("#taskProjectInput")?.value || "";
  const result = parseBulkDeliverableText(input?.value, projectName);
  state.taskDeliverableSelections[projectName] ||= {};
  result.matched.forEach(({ deliverable, count }) => {
    state.taskDeliverableSelections[projectName][deliverable.name] = { count };
  });
  showBulkDeliverableResult("#taskDeliverableBulkResult", result);
  state.taskDeliverableSearch = "";
  if (input) input.value = "";
  renderTaskDeliverables(projectName);
  updateTaskDueSuggestion(true);
}

function applyEditTaskDeliverableBulkInput() {
  const input = $("#editTaskDeliverableBulkInput");
  const projectName = $("#editTaskProject")?.value || "";
  const result = parseBulkDeliverableText(input?.value, projectName);
  const rows = $$(".edit-task-output-row");
  result.matched.forEach(({ deliverable, count }) => {
    const row = rows.find((item) => normalizeDeliverableKey(item.querySelector(".edit-task-output-check")?.dataset.outputName) === normalizeDeliverableKey(deliverable.name));
    if (!row) return;
    row.querySelector(".edit-task-output-check").checked = true;
    row.querySelector(".edit-task-output-count").value = count;
  });
  showBulkDeliverableResult("#editTaskDeliverableBulkResult", result);
  if (input) input.value = "";
}

function normalizeDbTaskOutputs(projectName, rows) {
  const groups = new Map();
  const obsoleteIds = [];
  let repaired = false;
  [...rows].sort((a, b) => String(a.output_id || "").localeCompare(String(b.output_id || ""))).forEach((row) => {
    const rawName = String(row.deliverable_name || "").trim();
    const cleanedName = rawName.replace(/(?:\(\s*\d+(?:[.,]\d+)?\s*\))+$/g, "").trim() || rawName;
    const matched = findDeliverableMatch(projectName, cleanedName)?.deliverable;
    const canonicalName = matched?.name || cleanedName;
    const ownerKey = row.owner_employee_id || "";
    const key = `${normalizeDeliverableKey(canonicalName) || canonicalName}::${ownerKey}::${outputImportScope(readOutputScope(row.note))}`;
    const quantity = Number(row.quantity || 0);
    if (canonicalName !== rawName) repaired = true;
    if (!groups.has(key)) {
      groups.set(key, {
        ...row,
        deliverable_name: canonicalName,
        quantity,
        standard_hours_per_unit: Number(matched?.standardHours ?? row.standard_hours_per_unit ?? 0),
      });
      return;
    }
    const current = groups.get(key);
    current.quantity = Number(current.quantity || 0) + quantity;
    obsoleteIds.push(row.output_id);
    repaired = true;
  });
  return { rows: [...groups.values()], obsoleteIds, repaired };
}

function emptyExcelCountSummary() {
  return deliverables
    .map((deliverable) => ({
      project: deliverable.project,
      classification: deliverable.name,
      keyNames: [],
      matchTypes: [],
      count: 0,
      hours: 0,
    }))
    .sort((a, b) => a.project.localeCompare(b.project, "ko") || a.classification.localeCompare(b.classification, "ko"));
}

function validateDeliverableImportRows(rows) {
  const configuredProjects = new Map(
    projectConfigs.map((project) => [normalizeImportKey(project.project), project.project]),
  );
  const seen = new Set();
  const errors = [];
  const missingProjects = new Set();
  const nextDeliverables = [];

  if (!configuredProjects.size) {
    throw new Error("프로젝트 구성이 비어 있습니다. 먼저 관리자 메뉴의 프로젝트 구성에서 프로젝트를 등록한 뒤 다시 업로드하세요.");
  }

  rows.forEach((row) => {
    const uploadedProject = String(row["프로젝트"] || "").trim();
    const project = configuredProjects.get(normalizeImportKey(uploadedProject)) || "";
    const name = String(row["결과물 명칭"] || row["산출물 명칭"] || "").trim();
    const hoursText = String(row["기준공수"] ?? "").trim();
    const standardHours = Number(hoursText);
    const scheduleText = String(row["평균 작업일"] ?? row["일정 기준일"] ?? "").trim();
    const scheduleDays = scheduleText === "" ? null : Number(scheduleText);
    const key = `${normalizeImportKey(uploadedProject)}|${normalizeImportKey(name)}`;
    let reason = "";

    const missing = [];
    if (!uploadedProject) missing.push("프로젝트");
    if (!name) missing.push("결과물 명칭");
    if (hoursText === "") missing.push("기준공수");

    if (missing.length) reason = missingFieldReason(missing);
    else if (!project) {
      reason = `프로젝트 구성에 없는 프로젝트: ${uploadedProject}`;
      missingProjects.add(uploadedProject);
    }
    else if (!Number.isFinite(standardHours) || standardHours <= 0) reason = "기준공수는 0보다 큰 숫자";
    else if (scheduleText !== "" && (!Number.isFinite(scheduleDays) || scheduleDays < 0)) reason = "평균 작업일은 0 이상 숫자";
    else if (seen.has(key)) reason = "프로젝트+결과물 명칭 중복";

    if (reason) {
      errors.push(`${row.__rowNumber}행 ${reason}`);
      return;
    }
    seen.add(key);
    nextDeliverables.push({
      project,
      name,
      standardHours,
      slaDays: scheduleDays === null ? null : Math.floor(scheduleDays),
      slaEnabled: scheduleDays !== null,
      conversionTarget: name,
    });
  });

  if (!rows.length) errors.push("업로드할 결과물 데이터가 없습니다.");
  if (errors.length) {
    const suffix = errors.length > 3 ? ` 외 ${errors.length - 3}건` : "";
    const available = [...configuredProjects.values()].join(", ");
    const projectGuide = missingProjects.size
      ? ` 업로드 프로젝트 [${[...missingProjects].join(", ")}]를 프로젝트 구성에 먼저 등록하세요. 현재 등록 프로젝트: ${available || "없음"}.`
      : "";
    throw new Error(`${errors.slice(0, 3).join(", ")}${suffix}.${projectGuide}`);
  }
  return nextDeliverables;
}

function replaceDeliverablesFromExcel(rows, fileName) {
  const nextDeliverables = validateDeliverableImportRows(rows);
  const previousCount = deliverables.length;
  deliverables.splice(0, deliverables.length, ...nextDeliverables);
  const firstActiveProject = nextDeliverables.find((item) => activeProjectConfigs().some((project) => project.project === item.project))?.project
    || nextDeliverables[0]?.project
    || activeProjectConfigs()[0]?.project
    || "";
  state.deliverableProject = firstActiveProject;
  state.conversionTarget = nextDeliverables.find((item) => item.project === firstActiveProject)?.name || "";
  state.deliverableExcelImport = {
    status: "success",
    fileName,
    count: nextDeliverables.length,
    previousCount,
    message: `${previousCount}개 설정을 삭제하고 ${nextDeliverables.length}개 설정으로 교체했습니다.`,
  };
}

function mergeTaskOutputs(currentOutputs, additions) {
  const merged = new Map();
  (currentOutputs || []).forEach((output) => {
    const parsed = parseOutputText(output);
    const name = parsed.name;
    const count = parsed.count;
    merged.set(name, (merged.get(name) || 0) + count);
  });
  additions.forEach((item) => {
    merged.set(item.deliverable.name, (merged.get(item.deliverable.name) || 0) + item.count);
  });
  return [...merged.entries()].map(([name, count]) => `${name}(${formatNumber(count, 2)})`);
}

function excelDateToIso(value) {
  if (typeof value === "number" && value > 0) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const text = String(value || "").trim().replace(/[./]/g, "-");
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return match ? `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}` : "";
}

function importExcelTaskRows(rows, fileName) {
  const existingKeys = new Set(tasks.flatMap((task) => {
    if (task.importKeys?.length) return task.importKeys;
    return [importCompositeKey(task.id, task.uploadSubNumber || "")];
  }));
  const seenKeys = new Set();
  const countSummary = emptyExcelCountSummary();
  const countMap = new Map(countSummary.map((item) => [`${item.project}|${item.classification}`, item]));
  const results = [];
  let added = 0;
  let updated = 0;
  let duplicate = 0;
  let error = 0;
  let firstImportedMonth = "";

  rows.forEach((row) => {
    const id = String(row["업무번호"] || "").trim();
    const subNumber = String(row["보조번호"] || "").trim();
    const title = String(row["업무명"] || "").trim();
    const uploadedProjectName = String(row["프로젝트"] || "").trim();
    const classification = String(row["결과물 분류"] || row["산출물 분류"] || "").trim();
    const uploadedStage = String(row["종합 단계"] || row["업무 단계"] || "").trim();
    const uploadedStageDetail = String(row["단계 상세"] || row["세부 업무 상황"] || "").trim();
    const countText = String(row["Count"] ?? "").trim();
    const outputCount = Number(countText);
    const owner = String(row["작업자"] || "").trim();
    const teamName = String(row["팀명"] || "").trim();
    const subgroup = String(row["세부그룹"] || "").trim();
    const bufferText = String(row["개별 버퍼(배수)"] ?? row["개별버퍼(배수)"] ?? row["개별 버퍼(%)"] ?? row["개별버퍼"] ?? "0").trim();
    const effortMultiplier = importedEffortMultiplier(bufferText);
    const effortBufferPct = importedEffortBufferPct(bufferText);
    const uploadedPhotoType = String(row["촬영 유형"] ?? row["촬영유형"] ?? "일반").trim() || "일반";
    const photoType = normalizePhotoType(uploadedPhotoType);
    const requestDate = excelDateToIso(row["접수일"]);
    const existingMember = members.find((item) => item.name === owner);
    const resolvedTeamName = teamName || existingMember?.team || workers[owner]?.team || "";
    const teamAutoMatched = !teamName && Boolean(resolvedTeamName);
    const resolvedSubgroup = subgroup || existingMember?.subgroup || workers[owner]?.subgroup || "";
    const subgroupAutoMatched = !subgroup && Boolean(resolvedSubgroup);
    const key = importCompositeKey(id, subNumber);
    // 보조번호 20은 수기 추가분을 같은 업무번호에 누적하는 예약 번호다.
    const allowManualAggregate = normalizeImportKey(subNumber) === "20";
    const result = { row: row.__rowNumber, id, subNumber, title, status: "", reason: "" };
    const existingTaskById = tasks.find((task) => normalizeImportKey(task.id) === normalizeImportKey(id));

    const missing = [];
    if (!id) missing.push("업무번호");
    if (!subNumber) missing.push("보조번호");
    if (!title) missing.push("업무명");
    if (!uploadedProjectName) missing.push("프로젝트");
    if (!classification) missing.push("결과물 분류");
    if (!owner) missing.push("작업자");
    if (!requestDate) missing.push("접수일(yyyy-mm-dd)");
    if (!resolvedTeamName) missing.push(teamName ? "팀명" : "팀명(공란 + 작업자 자동 매칭 실패)");
    if (countText === "") missing.push("Count");

    if (missing.length) {
      result.status = "형식 오류";
      result.reason = missingFieldReason(missing);
      error += 1;
      results.push(result);
      return;
    }
    if (!Number.isFinite(outputCount) || !Number.isInteger(outputCount) || outputCount < 0) {
      result.status = "형식 오류";
      result.reason = "Count는 0 이상의 정수여야 합니다.";
      error += 1;
      results.push(result);
      return;
    }
    if (!isValidImportedEffortMultiplier(bufferText)) {
      result.status = "형식 오류";
      result.reason = "개별 버퍼 배수는 0보다 큰 숫자여야 합니다. 예: 1.2, 1.5, 2.0";
      error += 1;
      results.push(result);
      return;
    }
    if (!PHOTO_TYPES.includes(uploadedPhotoType)) {
      result.status = "형식 오류";
      result.reason = `촬영 유형은 ${PHOTO_TYPES.join(", ")} 중 하나여야 합니다.`;
      error += 1;
      results.push(result);
      return;
    }
    if ((!allowManualAggregate && seenKeys.has(key))
      || (!allowManualAggregate && existingKeys.has(key)) || (existingTaskById && !existingTaskById.importKeys?.length)) {
      result.status = "중복 제외";
      result.reason = existingTaskById && !existingTaskById.importKeys?.length
        ? "기존 DB 업무번호(보조번호 이력 없음)"
        : "동일 업무번호+보조번호";
      duplicate += 1;
      results.push(result);
      return;
    }
    const config = activeProjectConfigs().find((project) => normalizeImportKey(project.project) === normalizeImportKey(uploadedProjectName));
    if (!config) {
      result.status = "형식 오류";
      result.reason = `등록되지 않은 프로젝트: ${uploadedProjectName}`;
      error += 1;
      results.push(result);
      return;
    }
    const projectName = config.project;
    const stage = projectUsesStages(projectName) ? uploadedStage : "";
    const stageDetail = projectUsesStages(projectName) ? uploadedStageDetail : "";
    const classificationMatch = findDeliverableMatch(projectName, classification);
    const matchedOutputs = [{
      name: classification,
      count: outputCount,
      deliverable: classificationMatch?.deliverable,
      matchScore: classificationMatch?.score || 0,
      matchType: classificationMatch?.matchType || "",
    }];
    if (!classificationMatch?.deliverable) {
      result.status = "형식 오류";
      result.reason = `미등록 결과물: ${classification}`;
      error += 1;
      results.push(result);
      return;
    }
    if (!existingMember || existingMember.employmentStatus === "퇴사") {
      result.status = "형식 오류";
      result.reason = `인원 등급 리스트에 없는 작업자: ${owner}`;
      error += 1;
      results.push(result);
      return;
    }
    if (teamName && normalizeImportKey(existingMember.team) !== normalizeImportKey(teamName)) {
      result.status = "형식 오류";
      result.reason = `작업자 팀 불일치: ${owner}(${existingMember.team}) / 업로드(${teamName})`;
      error += 1;
      results.push(result);
      return;
    }
    if (subgroup && normalizeImportKey(existingMember.subgroup) !== normalizeImportKey(subgroup)) {
      result.status = "형식 오류";
      result.reason = `작업자 세부그룹 불일치: ${owner}(${existingMember.subgroup || "미지정"}) / 업로드(${subgroup})`;
      error += 1;
      results.push(result);
      return;
    }
    const assignedPeople = projectAssignments[projectName] || [];
    if (assignedPeople.length && !assignedPeople.includes(owner)) {
      result.status = "형식 오류";
      result.reason = `프로젝트 미배정 작업자: ${owner}`;
      error += 1;
      results.push(result);
      return;
    }

    const start = requestDate;
    const completedDate = excelDateToIso(row["완료일"]);
    const uploadedDueDate = excelDateToIso(row["완료예정일"] || row["최초 완료 예정일"] || row["최초완료예정일"]);
    const slaResponsibility = normalizeSlaResponsibility(row["지연귀책"]);
    const scheduleChangeReason = String(row["일정변경사유"] || row["일정 변경 사유"] || "").trim();
    const baseStandardHours = matchedOutputs.reduce((sum, item) => sum + item.deliverable.standardHours * item.count, 0);
    const standardHours = outputEffortHours(baseStandardHours, photoType);
    const existingTask = existingTaskById;
    if (existingTask?.importKeys?.length && normalizePhotoType(existingTask.photoType) !== photoType) {
      result.status = "형식 오류";
      result.reason = `동일 업무번호의 촬영 유형 불일치: 기존 ${normalizePhotoType(existingTask.photoType)} / 업로드 ${photoType}`;
      error += 1;
      results.push(result);
      return;
    }
    if (existingTask) {
      mergeTaskOutputDetails(existingTask, matchedOutputs, existingMember, { importSubNumber: subNumber, resourceMultiplier: allowManualAggregate ? effortMultiplier : 1 });
      existingTask.photoType = photoType;
      recalculateTaskHours(existingTask);
      existingTask.importKeys = [...new Set([...(existingTask.importKeys || []), key])];
      existingTask.importOwners = [...new Set([...(existingTask.importOwners || [existingTask.owner]), owner])];
      existingTask.start = [existingTask.start, start].filter(Boolean).sort()[0] || "";
      existingTask.completedDate = [existingTask.completedDate, completedDate].filter(Boolean).sort().at(-1) || "";
      const beforeDueDate = existingTask.dueDate || "";
      const nextDueDate = uploadedDueDate || beforeDueDate || existingTask.completedDate || existingTask.start;
      existingTask.originalDueDate ||= beforeDueDate || nextDueDate;
      const importedResponsibility = scheduleChangeResponsibility(scheduleChangeReason) || slaResponsibility;
      appendTaskScheduleChange(existingTask, beforeDueDate, nextDueDate, scheduleChangeReason, importedResponsibility);
      existingTask.dueDate = nextDueDate;
      existingTask.end = existingTask.completedDate || existingTask.dueDate;
      if (importedResponsibility !== "미확인") existingTask.slaResponsibility = importedResponsibility;
      if (scheduleChangeReason) existingTask.scheduleChangeReason = scheduleChangeReason;
      existingTask.importSource = fileName;
      if (stage) existingTask.stage = stage;
      if (stageDetail) existingTask.stageDetail = stageDetail;
      const mergedRule = taskSlaRule(existingTask, true);
      existingTask.slaDueDate = mergedRule.configured ? addWorkingDays(existingTask.start, mergedRule.limit) : "";
      existingTask.slaLimit = mergedRule.limit;
      existingTask.slaRuleLabel = mergedRule.source;
      existingTask.slaRuleType = mergedRule.type;
      existingTask.slaConfigured = mergedRule.configured;
      existingTask.slaRuleStored = true;
    } else {
      const newTask = {
        id,
        client: config.client,
        project: projectName,
        team: existingMember.team,
        type: classification,
        stage,
        stageDetail,
        channel: "Excel 업로드",
        difficulty: "보통",
        start,
        end: completedDate || uploadedDueDate || start,
        dueDate: uploadedDueDate || completedDate || start,
        completedDate,
        status: String(row["상태"] || "완료").trim(),
        title,
        owner,
        urgent: false,
        delayed: false,
        revision: false,
        rejected: String(row["상태"] || "") === "반려",
        approvalDelay: false,
        night: false,
        standardHours,
        baseStandardHours,
        photoType,
        effortBufferPct: 0,
        outputs: [],
        outputDetails: [],
        monthDelta: 0,
        importSource: fileName,
        importKeys: [key],
        importOwners: [owner],
        slaResponsibility,
        scheduleChangeReason,
      };
      mergeTaskOutputDetails(newTask, matchedOutputs, existingMember, { importSubNumber: subNumber, resourceMultiplier: allowManualAggregate ? effortMultiplier : 1 });
      const importedRule = taskSlaRule(newTask, true);
      newTask.slaDueDate = importedRule.configured ? addWorkingDays(start, importedRule.limit) : "";
      newTask.dueDate = uploadedDueDate || newTask.slaDueDate || completedDate || start;
      newTask.originalDueDate = newTask.dueDate;
      newTask.end = completedDate || newTask.dueDate;
      newTask.slaLimit = importedRule.limit;
      newTask.slaRuleLabel = importedRule.source;
      newTask.slaRuleType = importedRule.type;
      newTask.slaConfigured = importedRule.configured;
      newTask.slaRuleStored = true;
      tasks.push(newTask);
    }
    matchedOutputs.forEach((item) => {
      const summaryKey = `${projectName}|${item.deliverable.name}`;
      let summary = countMap.get(summaryKey);
      if (!summary) {
        summary = { project: projectName, classification: item.deliverable.name, keyNames: [], matchTypes: [], count: 0, hours: 0 };
        countMap.set(summaryKey, summary);
        countSummary.push(summary);
      }
      if (!summary.keyNames.includes(item.name)) summary.keyNames.push(item.name);
      if (!summary.matchTypes.includes(item.matchType)) summary.matchTypes.push(item.matchType);
      summary.count += item.count;
      summary.hours += outputEffortHours(item.deliverable.standardHours * item.count, photoType);
    });
    if (!firstImportedMonth && completedDate) firstImportedMonth = completedDate.slice(0, 7);
    seenKeys.add(key);
    existingKeys.add(key);
    result.status = existingTask ? "기존 갱신" : "신규 추가";
    const fuzzyMappings = matchedOutputs
      .filter((item) => normalizeDeliverableKey(item.name) !== normalizeDeliverableKey(item.deliverable.name))
      .map((item) => `${item.name}→${item.deliverable.name}`);
    result.reason = `${matchedOutputs.length}종 · ${effortLabel(standardHours)} · ${photoType} · 적용 공수 ${formatNumber(allowManualAggregate ? effortMultiplier : 1, 2)}배 · ${classificationMatch.matchType}${allowManualAggregate && existingTask ? " · 보조번호 20 수기분 합산" : existingTask ? " · 기존 업무에 병합" : ""}${fuzzyMappings.length ? ` · ${fuzzyMappings.join(", ")}` : ""}${teamAutoMatched ? ` · 팀 자동 매칭: ${resolvedTeamName}` : ""}${subgroupAutoMatched ? ` · 세부그룹 자동 매칭: ${resolvedSubgroup}` : ""}`;
    if (existingTask) updated += 1;
    else added += 1;
    results.push(result);
  });

  if (firstImportedMonth && state.year !== "전체") {
    state.year = firstImportedMonth.slice(0, 4);
    state.month = firstImportedMonth;
  }
  state.excelUploadTab = "excelUploadRowsPane";
  state.excelResultPage = 1;
  state.excelErrorPage = 1;
  state.excelImport = {
    fileName,
    read: rows.length,
    added,
    updated,
    duplicate,
    error,
    results,
    countSummary: countSummary.sort((a, b) => a.project.localeCompare(b.project, "ko") || a.classification.localeCompare(b.classification, "ko")),
  };
  syncTaskSlaViolations();
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function excelImportTaskSignature(items = tasks) {
  return JSON.stringify(items.map((task) => ({
    id: task.id,
    project: task.project,
    owner: task.owner,
    start: task.start,
    dueDate: task.dueDate,
    completedDate: task.completedDate,
    status: task.status,
    standardHours: task.standardHours,
    effortBufferPct: task.effortBufferPct,
    photoType: task.photoType,
    outputs: task.outputs,
    importKeys: task.importKeys,
    importBatchId: task.importBatchId,
  })).sort((a, b) => String(a.id).localeCompare(String(b.id))));
}

function analyzeExcelTaskRows(rows, fileName) {
  const beforeTasks = cloneJson(tasks);
  const beforeYear = state.year;
  const beforeMonth = state.month;
  importExcelTaskRows(rows, fileName);
  const previewTasks = cloneJson(tasks);
  const result = cloneJson(state.excelImport);
  replaceArray(tasks, beforeTasks);
  state.year = beforeYear;
  state.month = beforeMonth;
  state.excelImport = result;
  state.excelUploadTab = "excelUploadRowsPane";
  state.pendingExcelImport = {
    fileName,
    rows: cloneJson(rows),
    beforeTasks,
    previewTasks,
    baseSignature: excelImportTaskSignature(beforeTasks),
  };
  syncTaskSlaViolations();
}

function uploadBatchDbRow(batch) {
  return {
    batch_id: batch.batchId,
    file_name: batch.fileName,
    uploaded_by: batch.uploadedBy || null,
    uploaded_by_name: batch.uploadedByName || null,
    uploaded_at: batch.uploadedAt,
    total_rows: batch.totalRows,
    added_rows: batch.addedRows,
    updated_rows: batch.updatedRows,
    duplicate_rows: batch.duplicateRows,
    error_rows: batch.errorRows,
    status: batch.status,
    rolled_back_at: batch.rolledBackAt || null,
    rolled_back_by: batch.rolledBackBy || null,
  };
}

function uploadBatchItemDbRow(item) {
  return {
    item_id: item.itemId,
    batch_id: item.batchId,
    task_id: item.taskId || null,
    row_number: Number(item.rowNumber || 0) || null,
    sub_number: item.subNumber || null,
    action: item.action,
    reason: item.reason || null,
    before_task: item.beforeTask || null,
    after_task: item.afterTask || null,
  };
}

async function applyPendingExcelImport() {
  const pending = state.pendingExcelImport;
  if (!pending) return;
  if (remoteData?.loadTables) await remoteData.loadTables(["upload_batches", "upload_batch_items"]);
  if (excelImportTaskSignature() !== pending.baseSignature) {
    throw new Error("분석 이후 업무 데이터가 변경되었습니다. 파일을 다시 분석하세요.");
  }
  const batchId = `UPB-${Date.now()}`;
  const account = currentAccount();
  const affectedIds = new Set(state.excelImport.results
    .filter((item) => ["신규 추가", "기존 갱신"].includes(item.status))
    .map((item) => item.id));
  const beforeById = new Map(pending.beforeTasks.map((task) => [task.id, task]));
  replaceArray(tasks, cloneJson(pending.previewTasks));
  tasks.forEach((task) => { if (affectedIds.has(task.id)) task.importBatchId = batchId; });
  syncTaskSlaViolations();
  await persistOperationalNow();
  const afterById = new Map(tasks.map((task) => [task.id, task]));
  const items = [...affectedIds].map((taskId, index) => {
    const result = state.excelImport.results.find((entry) => entry.id === taskId && ["신규 추가", "기존 갱신"].includes(entry.status));
    return {
      itemId: `${batchId}-ITEM-${String(index + 1).padStart(4, "0")}`,
      batchId,
      taskId,
      rowNumber: result?.row,
      subNumber: result?.subNumber || "",
      action: result?.status || "신규 추가",
      reason: result?.reason || "",
      beforeTask: beforeById.has(taskId) ? cloneJson(beforeById.get(taskId)) : null,
      afterTask: cloneJson(afterById.get(taskId)),
    };
  });
  const batch = {
    batchId,
    fileName: pending.fileName,
    uploadedBy: account?._userId || null,
    uploadedByName: account?.name || account?.id || "미확인",
    uploadedAt: new Date().toISOString(),
    totalRows: state.excelImport.read,
    addedRows: state.excelImport.added,
    updatedRows: state.excelImport.updated,
    duplicateRows: state.excelImport.duplicate,
    errorRows: state.excelImport.error,
    status: "반영완료",
    rolledBackAt: "",
    rolledBackBy: "",
  };
  if (remoteData) {
    await remoteData.upsert("upload_batches", [uploadBatchDbRow(batch)]);
    await remoteData.upsert("upload_batch_items", items.map(uploadBatchItemDbRow));
  }
  uploadBatches.unshift(batch);
  uploadBatchItems.push(...items);
  state.pendingExcelImport = null;
}

async function rollbackUploadBatch(batchId) {
  const latest = uploadBatches.filter((batch) => batch.status === "반영완료")
    .sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)))[0];
  if (!latest || latest.batchId !== batchId) throw new Error("가장 최근 정상 업로드만 되돌릴 수 있습니다.");
  const items = uploadBatchItems.filter((item) => item.batchId === batchId && ["신규 추가", "기존 갱신"].includes(item.action));
  const conflicts = items.filter((item) => {
    const current = tasks.find((task) => task.id === item.taskId);
    return !current || current.importBatchId !== batchId;
  });
  if (conflicts.length) throw new Error(`이후 수정된 업무 ${conflicts.length}건이 있어 되돌릴 수 없습니다.`);
  items.forEach((item) => {
    const index = tasks.findIndex((task) => task.id === item.taskId);
    if (item.beforeTask) tasks.splice(index, 1, cloneJson(item.beforeTask));
    else if (index >= 0) tasks.splice(index, 1);
  });
  syncTaskSlaViolations();
  await persistOperationalNow();
  latest.status = "되돌림";
  latest.rolledBackAt = new Date().toISOString();
  latest.rolledBackBy = currentAccount()?._userId || null;
  if (remoteData) await remoteData.upsert("upload_batches", [uploadBatchDbRow(latest)]);
}

function renderExcelImportResult() {
  if (!$("#excelUploadResultRows")) return;
  const result = state.excelImport;
  $$(".excel-upload-tab").forEach((button) => button.classList.toggle("active", button.dataset.excelTab === state.excelUploadTab));
  $$(".excel-upload-pane").forEach((pane) => pane.classList.toggle("active", pane.id === state.excelUploadTab));
  $("#excelUploadFileName").textContent = result.fileName || "대기";
  $("#excelUploadMessage").textContent = result.fileName ? `${result.fileName} 처리 결과입니다.` : "업로드된 파일이 없습니다.";
  $("#excelUploadRead").textContent = `${result.read}건`;
  $("#excelUploadAdded").textContent = `${result.added}건`;
  $("#excelUploadUpdated").textContent = `${result.updated || 0}건`;
  $("#excelUploadDuplicate").textContent = `${result.duplicate}건`;
  $("#excelUploadError").textContent = `${result.error}건`;
  $("#downloadExcelCountSummary").disabled = !result.fileName;
  const resultPageSize = 40;
  const resultPages = Math.max(1, Math.ceil(result.results.length / resultPageSize));
  state.excelResultPage = Math.min(Math.max(state.excelResultPage, 1), resultPages);
  const visibleResults = result.results.slice((state.excelResultPage - 1) * resultPageSize, state.excelResultPage * resultPageSize);
  $("#excelUploadResultRows").innerHTML = visibleResults.map((item) => {
    const statusClass = ["신규 추가", "기존 갱신"].includes(item.status) ? "good" : item.status === "중복 제외" ? "warn" : "danger";
    return `<tr><td>${item.row}</td><td>${item.id || "-"}</td><td>${item.subNumber || "-"}</td><td>${item.title || "-"}</td><td><span class="pill ${statusClass}">${item.status}</span></td><td>${item.reason}</td></tr>`;
  }).join("") || `<tr><td colspan="6">업로드 결과가 없습니다.</td></tr>`;
  $("#excelResultPageStatus").textContent = `${state.excelResultPage} / ${resultPages} · 총 ${result.results.length}건`;
  $("#excelResultPrevPage").disabled = state.excelResultPage <= 1;
  $("#excelResultNextPage").disabled = state.excelResultPage >= resultPages;
  const errorResults = result.results.filter((item) => item.status === "형식 오류");
  const errorPageSize = 40;
  const errorPages = Math.max(1, Math.ceil(errorResults.length / errorPageSize));
  state.excelErrorPage = Math.min(Math.max(state.excelErrorPage, 1), errorPages);
  const visibleErrors = errorResults.slice((state.excelErrorPage - 1) * errorPageSize, state.excelErrorPage * errorPageSize);
  $("#excelErrorCount").textContent = `${errorResults.length}건`;
  $("#excelUploadErrorRows").innerHTML = visibleErrors.map((item) => `
    <tr>
      <td>${item.row}</td>
      <td>${item.id || "-"}</td>
      <td>${item.subNumber || "-"}</td>
      <td>${item.title || "-"}</td>
      <td><span class="pill danger">${item.status}</span></td>
      <td>${item.reason}</td>
    </tr>
  `).join("") || `<tr><td colspan="6">형식 오류가 없습니다.</td></tr>`;
  $("#excelErrorPageStatus").textContent = `${state.excelErrorPage} / ${errorPages} · 총 ${errorResults.length}건`;
  $("#excelErrorPrevPage").disabled = state.excelErrorPage <= 1;
  $("#excelErrorNextPage").disabled = state.excelErrorPage >= errorPages;
  const countSummary = result.countSummary || [];
  const totalCount = countSummary.reduce((sum, item) => sum + item.count, 0);
  $("#excelUploadCountTotal").textContent = `${formatNumber(totalCount, 2)}개`;
  $("#excelUploadCountRows").innerHTML = countSummary.map((item) => `
    <tr>
      <td>${item.project}</td>
      <td>${item.classification}</td>
      <td>${item.keyNames.length ? item.keyNames.join(", ") : "-"}</td>
      <td>${item.matchTypes?.length ? item.matchTypes.join(", ") : "-"}</td>
      <td>${formatNumber(item.count, 2)}개</td>
      <td>${effortLabel(item.hours)}</td>
    </tr>
  `).join("") || `<tr><td colspan="6">업로드 결과가 없습니다.</td></tr>`;
  if ($("#excelPreviewActions")) $("#excelPreviewActions").hidden = !state.pendingExcelImport;
  if (state.pendingExcelImport) $("#excelUploadMessage").textContent = `${result.fileName} 분석 결과입니다. 아직 DB에 반영되지 않았습니다.`;
  renderUploadBatchHistory();
}

function renderUploadBatchHistory() {
  const container = $("#excelBatchRows");
  if (!container) return;
  const ordered = [...uploadBatches].sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)));
  const latestActiveId = ordered.find((batch) => batch.status === "반영완료")?.batchId || "";
  $("#excelBatchCount").textContent = `${ordered.length}건`;
  container.innerHTML = ordered.map((batch) => `<tr>
    <td>${escapeHtml(String(batch.uploadedAt || "").replace("T", " ").slice(0, 19) || "-")}</td>
    <td>${escapeHtml(batch.fileName)}</td><td>${escapeHtml(batch.uploadedByName || "-")}</td>
    <td>${Number(batch.totalRows || 0).toLocaleString()}건</td><td>${Number(batch.addedRows || 0).toLocaleString()}건</td><td>${Number(batch.updatedRows || 0).toLocaleString()}건</td>
    <td>${Number(batch.duplicateRows || 0).toLocaleString()}건</td><td>${Number(batch.errorRows || 0).toLocaleString()}건</td>
    <td><span class="pill ${batch.status === "반영완료" ? "good" : "warn"}">${escapeHtml(batch.status)}</span></td>
    <td>${batch.batchId === latestActiveId ? `<button class="secondary small excel-batch-rollback" data-batch-id="${escapeHtml(batch.batchId)}" type="button">되돌리기</button>` : "-"}</td>
  </tr>`).join("") || `<tr><td colspan="10">업로드 이력이 없습니다.</td></tr>`;
}

function localIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function resourceRemainingBounds() {
  const monthKey = /^\d{4}-\d{2}$/.test(state.month) ? state.month : "";
  if (!monthKey) return null;
  const [year, month] = monthKey.split("-").map(Number);
  return { start: localIsoDate(new Date(year, month - 1, 1)), end: localIsoDate(new Date(year, month, 0)), label: `${year}년 ${month}월` };
}

function memberResourcePeriodCapacity(member, bounds, projectName) {
  const dailyHours = absoluteDailyHoursForProject(projectName);
  return memberCapacityForMonths(member, [bounds.start.slice(0, 7)], dailyHours);
}

function signedEffortLabel(value) {
  const hours = Number(value || 0);
  return `${hours > 0 ? "+" : ""}${formatNumber(hours, 1)}H`;
}

function closeResourceRemainingModal() {
  const modal = $("#resourceRemainingModal");
  modal?.classList.remove("active");
  modal?.setAttribute("aria-hidden", "true");
}

function renderResourceRemaining() {
  const container = $("#resourceRemainingRows");
  if (!container || state.project === "전체") return;
  const bounds = resourceRemainingBounds();
  if (!bounds) return;
  const projectName = state.project;
  const completedRows = tasks.filter((task) => task.project === projectName
    && task.completedDate
    && task.completedDate >= bounds.start
    && task.completedDate <= bounds.end);
  const completedWorkerNames = completedRows.flatMap((task) => [task.owner, ...taskOutputDetails(task).map((detail) => detail.owner)]).filter(Boolean);
  const candidateNames = [...new Set([...(projectAssignments[projectName] || []), ...completedWorkerNames])];
  const periodMembers = (completedRows.length ? candidateNames : [])
    .map((name) => members.find((member) => member.name === name))
    .filter((member) => member && isWorkforceMember(member, completedRows));
  const buffers = productivityBuffersForProject(projectName);
  const people = periodMembers.map((member) => {
    const rows = completedRows.filter((task) => taskAssignedToMember(task, member));
    const capacity = memberResourcePeriodCapacity(member, bounds, projectName);
    const used = rows.reduce((sum, task) => sum + memberResourceHours(task, member), 0);
    const outputTotal = rows.reduce((sum, task) => sum + assignedOutputDetails(task, member).reduce((detailSum, detail) => detailSum + Number(detail.count || 0), 0), 0);
    const projectCapacity = Math.max(0, capacity * (buffers.projectBuffer / 100));
    const companyCapacity = Math.max(0, capacity * (buffers.companyBuffer / 100));
    return {
      member,
      rows,
      outputTotal,
      capacity,
      used,
      absoluteRemaining: capacity - used,
      projectRemaining: projectCapacity - used,
      companyRemaining: companyCapacity - used,
      utilization: pct(used, Math.max(capacity, 1)),
    };
  }).sort((a, b) => a.absoluteRemaining - b.absoluteRemaining || b.used - a.used || a.member.name.localeCompare(b.member.name, "ko"));
  const totalCapacity = people.reduce((sum, person) => sum + person.capacity, 0);
  const totalUsed = people.reduce((sum, person) => sum + person.used, 0);
  const totalOutputs = completedRows.reduce((sum, task) => sum + outputCount(task), 0);
  const overloadCount = people.filter((person) => person.absoluteRemaining < 0).length;
  $("#resourceRemainingModalTitle").textContent = `${projectName} · ${bounds.label} 잔여 공수`;
  $("#remainingCapacityTotal").textContent = effortLabel(totalCapacity);
  $("#remainingUsedTotal").textContent = effortLabel(totalUsed);
  $("#remainingAbsoluteTotal").textContent = signedEffortLabel(totalCapacity - totalUsed);
  $("#remainingAbsoluteTotal").closest(".metric")?.classList.toggle("danger", totalCapacity - totalUsed < 0);
  $("#remainingTaskTotal").textContent = `${completedRows.length.toLocaleString()}건`;
  $("#remainingOutputTotal").textContent = `결과물 ${formatNumber(totalOutputs, 1)}개`;
  $("#remainingOverloadTotal").textContent = `${overloadCount}명`;
  $("#remainingPeriodLabel").textContent = `${bounds.label} · 완료일 기준`;
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(people.length / pageSize));
  state.resourceRemainingPage = Math.min(Math.max(1, state.resourceRemainingPage), totalPages);
  const visible = people.slice((state.resourceRemainingPage - 1) * pageSize, state.resourceRemainingPage * pageSize);
  container.innerHTML = visible.map((person) => {
    const member = person.member;
    const remainingClass = person.absoluteRemaining < 0 ? "danger" : person.absoluteRemaining < absoluteDailyHoursForProject(projectName) ? "warn" : "good";
    const utilizationClass = person.utilization >= 100 ? "danger" : person.utilization >= 85 ? "warn" : "good";
    return `<tr><td><strong>${escapeHtml(member.name)}</strong></td><td>${escapeHtml(member.team || "미지정")}${member.subgroup ? ` · ${escapeHtml(member.subgroup)}` : ""}</td><td>${person.rows.length.toLocaleString()}건</td><td>${formatNumber(person.outputTotal, 1)}개</td><td>${effortLabel(person.capacity)}</td><td>${effortLabel(person.used)}</td><td><span class="pill ${remainingClass}">${signedEffortLabel(person.absoluteRemaining)}</span></td><td>${signedEffortLabel(person.projectRemaining)}</td><td>${signedEffortLabel(person.companyRemaining)}</td><td><span class="pill ${utilizationClass}">${person.utilization}%</span></td></tr>`;
  }).join("") || `<tr><td colspan="10" class="empty-cell">${completedRows.length ? "선택 월에 투입된 작업자가 없습니다." : "선택 월에 실제 완료된 업무 데이터가 없어 잔여 공수를 계산하지 않습니다."}</td></tr>`;
  $("#resourceRemainingPage").textContent = `${state.resourceRemainingPage} / ${totalPages} · ${people.length}명`;
  $("#resourceRemainingPrev").disabled = state.resourceRemainingPage <= 1;
  $("#resourceRemainingNext").disabled = state.resourceRemainingPage >= totalPages;
}

function renderResource(items) {
  const projectSelected = state.project !== "전체";
  $("#resourceProjectNotice")?.classList.toggle("hidden", projectSelected);
  $$("#resourceView .resource-project-data").forEach((section) => section.classList.toggle("hidden", !projectSelected));
  if (!projectSelected) return;
  const remainingOpen = $("#resourceRemainingOpen");
  const remainingNote = $("#resourceRemainingLaunchNote");
  const remainingCompletedCount = state.month
    ? tasks.filter((task) => task.project === state.project && task.completedDate?.startsWith(state.month)).length
    : 0;
  if (remainingOpen) remainingOpen.disabled = !state.month;
  if (remainingNote) remainingNote.textContent = state.month
    ? (remainingCompletedCount
      ? `${Number(state.month.slice(5, 7))}월 실제 완료 업무 ${remainingCompletedCount.toLocaleString()}건 · 버튼을 누르면 잔여 공수를 확인합니다.`
      : `${Number(state.month.slice(5, 7))}월 실제 완료 업무 없음 · 잔여 공수를 집계하지 않습니다.`)
    : "조회할 월을 선택하세요. 월을 선택하기 전에는 잔여 공수를 계산하지 않습니다.";
  const activeWorkerNames = scopedWorkerNames(items);
  const scopedWorkers = Object.entries(workers).filter(([name]) => activeWorkerNames.has(name));
  const scopedMembers = members.filter((member) => scopedWorkers.some(([name]) => name === member.name));
  const metrics = resourceMetrics(items, scopedWorkers.length, scopedMembers, true);
  const selectedBuffers = productivityBuffersForProject(state.project);
  const projectProduction = productivityLoadForTasks(items, "project", null, true);
  const companyProduction = productivityLoadForTasks(items, "company", null, true);
  const projectUtilization = bufferedUtilizationRate(metrics.usedHours, metrics.totalHours, selectedBuffers.projectBuffer);
  const companyUtilization = bufferedUtilizationRate(metrics.usedHours, metrics.totalHours, selectedBuffers.companyBuffer);
  const projectPerPersonProduction = Math.round(projectProduction.rate / Math.max(scopedWorkers.length, 1));
  const companyPerPersonProduction = Math.round(companyProduction.rate / Math.max(scopedWorkers.length, 1));
  const people = scopedWorkers.map(([name]) => {
    const member = members.find((item) => item.name === name);
    const rows = member ? items.filter((task) => taskAssignedToMember(task, member)) : items.filter((task) => task.owner === name);
    const standardHours = rows.reduce((sum, task) => sum + (member ? memberResourceHours(task, member) : taskResourceHours(task)), 0);
    const personCapacity = member ? memberSelectedPeriodCapacity(member) : monthlyCapacity(1).totalHours;
    const personProjectBuffer = productivityBufferForRows(rows, "project");
    const personCompanyBuffer = productivityBufferForRows(rows, "company");
    return {
      name,
      member,
      rows,
      standardHours,
      personCapacity,
      load: pct(standardHours, Math.max(personCapacity, 1)),
      projectLoad: bufferedUtilizationRate(standardHours, personCapacity, personProjectBuffer),
      companyLoad: bufferedUtilizationRate(standardHours, personCapacity, personCompanyBuffer),
      projectProduction: productivityLoadForTasks(rows, "project", member, true).rate,
      companyProduction: productivityLoadForTasks(rows, "company", member, true).rate,
    };
  });
  const historyPeople = people.filter((person) => person.rows.length > 0);
  const idleHistoryPeople = historyPeople.filter((person) => person.load < 40);
  const riskHistoryPeople = historyPeople.filter((person) => person.load >= 85);
  renderCapacityMetric("#capacityTotal", metrics);
  $("#resourceProductivity").textContent = `${formatNumber(metrics.averageDailyHours)}H / ${metrics.productivityRate}%`;
  if ($("#resourceProductivity")?.nextElementSibling) $("#resourceProductivity").nextElementSibling.textContent = `1일 평균 공수 / ${metrics.dailyHours}H 절대 가동률`;
  if ($("#resourceProjectStandard")) $("#resourceProjectStandard").textContent = `가동 ${projectUtilization}% / 생산 ${projectPerPersonProduction}%`;
  if ($("#resourceCompanyStandard")) $("#resourceCompanyStandard").textContent = `가동 ${companyUtilization}% / 생산 ${companyPerPersonProduction}%`;
  if ($("#resourceProjectStandardNote")) $("#resourceProjectStandardNote").textContent = `프로젝트 목표 ${formatNumber(selectedBuffers.projectBuffer, 1)}% · 1인 평균 결과물 ${formatNumber(projectProduction.matchedCount / Math.max(scopedWorkers.length, 1), 1)}개`;
  if ($("#resourceCompanyStandardNote")) $("#resourceCompanyStandardNote").textContent = `회사 목표 ${formatNumber(selectedBuffers.companyBuffer, 1)}% · 1인 평균 결과물 ${formatNumber(companyProduction.matchedCount / Math.max(scopedWorkers.length, 1), 1)}개`;
  $("#idlePeople").textContent = `${idleHistoryPeople.length}명 / 총 ${historyPeople.length}명`;
  $("#riskPeople").textContent = `${riskHistoryPeople.length}명 / 총 ${historyPeople.length}명`;
  const underloadPeople = people
    .filter((person) => person.load < 100)
    .sort((a, b) => a.load - b.load || a.standardHours - b.standardHours || a.name.localeCompare(b.name, "ko"));
  const underloadPageSize = 20;
  const underloadPages = Math.max(1, Math.ceil(underloadPeople.length / underloadPageSize));
  state.resourceUnderloadPage = Math.min(Math.max(1, state.resourceUnderloadPage), underloadPages);
  const visibleUnderload = underloadPeople.slice((state.resourceUnderloadPage - 1) * underloadPageSize, state.resourceUnderloadPage * underloadPageSize);
  if ($("#resourceUnderloadCount")) $("#resourceUnderloadCount").textContent = `${underloadPeople.length}명`;
  if ($("#resourceUnderloadRows")) $("#resourceUnderloadRows").innerHTML = visibleUnderload.map((person, index) => {
    const rank = (state.resourceUnderloadPage - 1) * underloadPageSize + index + 1;
    const loadClass = person.load < 40 ? "danger" : person.load < 70 ? "warn" : "good";
    const teamName = person.member?.team || workers[person.name]?.team || "미지정";
    const subgroupName = person.member?.subgroup || workers[person.name]?.subgroup || "";
    return `<tr><td>${rank}</td><td><strong>${escapeHtml(person.name)}</strong></td><td>${escapeHtml(teamName)}${subgroupName ? ` · ${escapeHtml(subgroupName)}` : ""}</td><td>${person.rows.length.toLocaleString()}건</td><td>${effortLabel(person.standardHours)}</td><td>${effortLabel(person.personCapacity)}</td><td><span class="pill ${loadClass}">${person.load}%</span></td><td><strong>${person.projectLoad}%</strong> / ${person.projectProduction}%</td><td><strong>${person.companyLoad}%</strong> / ${person.companyProduction}%</td></tr>`;
  }).join("") || `<tr><td colspan="9" class="empty-cell">가동률 100% 미만 인원이 없습니다.</td></tr>`;
  if ($("#resourceUnderloadPage")) $("#resourceUnderloadPage").textContent = `${state.resourceUnderloadPage} / ${underloadPages}`;
  if ($("#resourceUnderloadPrev")) $("#resourceUnderloadPrev").disabled = state.resourceUnderloadPage <= 1;
  if ($("#resourceUnderloadNext")) $("#resourceUnderloadNext").disabled = state.resourceUnderloadPage >= underloadPages;
  const rankingButton = $("#resourceRankingButton");
  if (rankingButton) rankingButton.dataset.detailValue = state.project;
  const calculationButton = $("#resourceCalculationButton");
  if (calculationButton) calculationButton.dataset.detailValue = state.project;
  const projects = projectSummaries(items);
  $("#resourceProjectList").innerHTML = projects.map((p) => {
    const activeNames = new Set(members.filter((member) => isWorkforceMember(member, p.rows)).map((member) => member.name));
    const assignedNames = assignedProjectPeople(p.project).filter((name) => activeNames.has(name));
    const workerPeople = assignedNames.length;
    const actual = workerPeople;
    const contractPeople = p.contract?.contractPeople || 0;
    const suitability = actual < contractPeople ? `미달 ${contractPeople - actual}명` : actual > contractPeople ? `초과 ${actual - contractPeople}명` : "일치";
    const assignedTeams = projectSettingTeams(projectWorkSettings.find((setting) => setting.project === p.project));
    const assignedTeam = assignedTeams.join(", ") || "미지정 팀";
    const assignedMembers = assignedNames.map((name) => members.find((member) => member.name === name)).filter(Boolean);
    const projectCapacity = Math.max(monthlyCapacity(workerPeople, assignedMembers, p.project).totalHours, 1);
    const projectResourceHours = p.rows.reduce((sum, task) => sum + taskResourceHours(task), 0);
    const projectLoad = pct(projectResourceHours, projectCapacity);
    const buffers = productivityBuffersForProject(p.project);
    const projectStandardLoad = bufferedUtilizationRate(projectResourceHours, projectCapacity, buffers.projectBuffer);
    const companyStandardLoad = bufferedUtilizationRate(projectResourceHours, projectCapacity, buffers.companyBuffer);
    const projectStandardProduction = Math.round(productivityLoadForTasks(p.rows, "project", null, true).rate / Math.max(workerPeople, 1));
    const companyStandardProduction = Math.round(productivityLoadForTasks(p.rows, "company", null, true).rate / Math.max(workerPeople, 1));
    return `<article class="operator-row"><div class="operator-row-title"><strong>${p.project}</strong><span>${p.client} · ${assignedTeam} · 실무 투입 ${actual}명 / 계약 ${contractPeople}명 · ${effortLabel(p.data.standardHours)}</span></div><div class="operator-row-metrics"><span class="pill">계약 대비 ${suitability}</span><span class="pill">절대 가동 ${projectLoad}%</span><span class="pill">프로젝트 ${projectStandardLoad}% / 생산 ${projectStandardProduction}%</span><span class="pill">회사 ${companyStandardLoad}% / 생산 ${companyStandardProduction}%</span><span class="pill ${p.data.unmatched ? "warn" : ""}">${isImageEffortSample ? `미체크 ${p.data.unmatched}개` : `일정 지연 ${p.data.delayed}건`}</span></div><div class="operator-row-actions resource-project-actions"><button class="secondary small operator-detail-open" data-detail-type="resourceTeam" data-detail-value="${p.project}" data-detail-team="${escapeHtml(assignedTeam)}" type="button">전체 순위</button><button class="secondary small operator-detail-open" data-detail-type="groupRanking" type="button">그룹별 순위</button><button class="secondary small operator-detail-open" data-detail-type="resourcePeople" data-detail-value="${escapeHtml(p.project)}" data-detail-team="${escapeHtml(assignedTeam)}" type="button">인원별 상세</button></div></article>`;
  }).join("");
}

function renderKpi(items) {
  const activeWorkerNames = scopedWorkerNames(items);
  const activeWorkers = Object.entries(workers).filter(([name]) => activeWorkerNames.has(name));
  const activeMembers = members.filter((member) => activeWorkers.some(([name]) => name === member.name));
  const metrics = resourceMetrics(items, activeWorkers.length, activeMembers);
  const outputs = items.reduce((s, t) => s + outputCount(t), 0);
  const peopleRows = activeWorkers.map(([name]) => {
    const rows = items.filter((t) => t.owner === name);
    const personOutputs = rows.reduce((s, t) => s + outputCount(t), 0);
    const personHours = rows.reduce((s, t) => s + t.standardHours, 0);
    const member = members.find((item) => item.name === name);
    const personCapacity = member ? memberSelectedPeriodCapacity(member) : monthlyCapacity(1).totalHours;
    return { name, rows, personOutputs, personHours, load: pct(personHours, personCapacity) };
  });
  renderCapacityMetric("#kpiCapacity", metrics);
  $("#kpiProductivity").textContent = `${formatNumber(metrics.averageDailyHours)}H / ${metrics.productivityRate}%`;
  $("#kpiIdle").textContent = `${peopleRows.filter((p) => p.load < 40).length}명`;
  $("#kpiRisk").textContent = `${peopleRows.filter((p) => p.load >= 85).length}명`;
  $("#kpiPeopleList").innerHTML = peopleRows.map((p) => {
    const topProject = Object.entries(groupBy(p.rows, "project")).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || "배정 없음";
    return simpleCard(p.name, `${topProject} · 생산량 ${p.personOutputs}건 · 회사 전체 대비 ${pct(p.personOutputs, outputs)}%`, [{ text: `가동 ${p.load}%`, cls: cls(p.load, 85, 60) }, { text: `업무 ${p.rows.length}건` }]);
  }).join("");
  $("#kpiProjectList").innerHTML = projectSummaries(items).map((p) => simpleCard(p.project, `${p.client} · 총 업무 ${p.data.total}건 · 평균 인당 생산량 ${p.data.owners ? (p.data.outputs / p.data.owners).toFixed(1) : "0.0"}건`, [{ text: `일정 지연 ${p.data.delayed}회`, cls: cls(p.data.delayRate, 30, 15) }, { text: `결과물 ${p.data.outputs}건` }])).join("");
}

function renderAdminSettings() {
  const filteredMemberRows = filteredMembers();
  const templateProjectNames = activeProjectConfigs().map((project) => project.project);
  if (state.deliverableProject && !templateProjectNames.includes(state.deliverableProject)) {
    state.deliverableProject = "";
    state.conversionTarget = "";
  }
  const hasDeliverableProject = Boolean(state.deliverableProject);
  $("#deliverableProjectContents")?.classList.toggle("hidden", !hasDeliverableProject);
  $("#deliverableSlaPanel")?.classList.toggle("hidden", !hasDeliverableProject);
  if ($("#deliverableSelectedProjectTitle")) $("#deliverableSelectedProjectTitle").textContent = state.deliverableProject || "선택 프로젝트";
  if (state.view === "deliverableSetting") {
    state.slaRuleProject = state.deliverableProject;
    if (!deliverables.some((item) => item.project === state.slaRuleProject && item.name === state.slaRuleDeliverable)) {
      state.slaRuleDeliverable = deliverables.find((item) => item.project === state.slaRuleProject)?.name || "";
    }
  }
  if ($("#teamRows")) {
    $("#teamRows").innerHTML = teams.map((t, index) => `<tr><td>${t.name}</td><td>${t.baseGroup}</td><td>${t.subgroups.length ? t.subgroups.join("<br>") : "-"}</td><td><div class="row-actions"><button class="secondary small record-edit-open" data-record-type="team" data-index="${index}" type="button">수정</button><button class="danger-button small record-delete" data-record-type="team" data-index="${index}" type="button">삭제</button></div></td></tr>`).join("");
  }
  if ($("#positionRows")) {
    $("#positionRows").innerHTML = positions.map((p, index) => `<tr><td>${p.name}</td><td><div class="row-actions"><button class="secondary small record-edit-open" data-record-type="position" data-index="${index}" type="button">수정</button><button class="danger-button small record-delete" data-record-type="position" data-index="${index}" type="button">삭제</button></div></td></tr>`).join("");
  }
  if ($("#memberRows")) {
    const memberEntries = filteredMemberEntries();
    $("#memberListCount").textContent = `${memberEntries.length}명`;
    if ($("#memberSearchInput")) $("#memberSearchInput").value = state.memberSearch;
    $("#memberRows").innerHTML = memberEntries.map(({ member: m, index }) => {
      const workType = m.reducedWork
        ? `단축 ${m.reducedWorkStartTime || "-"}~${m.reducedWorkEndTime || "-"}<br><small>${m.reducedWorkStartDate || "-"}~${m.reducedWorkEndDate || "-"} · ${formatNumber(m.reducedDailyHours || reducedDailyHours(m.reducedWorkStartTime, m.reducedWorkEndTime), 1)}H</small>`
        : `일반 · ${DAILY_ABSOLUTE_HOURS}H`;
      return `<tr data-member-index="${index}"><td>${accountForMember(m.name)?.id || "미생성"}</td><td>${m.name}</td><td>${m.team}</td><td>${m.subgroup || "미지정"}</td><td>${m.position}</td><td>${m.grade}</td><td>${workType}</td><td><div class="row-actions"><button class="secondary small member-edit" type="button" data-index="${index}">수정</button><button class="danger-button small member-delete" type="button" data-index="${index}">삭제</button></div></td></tr>`;
    }).join("");
  }
  if ($("#resignedMemberRows")) {
    const resignedEntries = filterResignedMemberEntries(members, { team: state.resignedTeam, from: state.resignedFrom, to: state.resignedTo });
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(resignedEntries.length / pageSize));
    state.resignedPage = Math.min(Math.max(1, state.resignedPage), totalPages);
    const pageRows = resignedEntries.slice((state.resignedPage - 1) * pageSize, state.resignedPage * pageSize);
    $("#resignedTeamFilter").innerHTML = optionList(["전체", ...teams.map((team) => team.name)], state.resignedTeam);
    $("#resignedFromFilter").value = state.resignedFrom;
    $("#resignedToFilter").value = state.resignedTo;
    $("#resignedMemberCount").textContent = `${resignedEntries.length}명`;
    $("#resignedMemberPageStatus").textContent = `${state.resignedPage} / ${totalPages}`;
    $("#resignedMemberPrev").disabled = state.resignedPage <= 1;
    $("#resignedMemberNext").disabled = state.resignedPage >= totalPages;
    $("#resignedMemberRows").innerHTML = pageRows.length
      ? pageRows.map(({ member, index }) => `<tr><td>${member.name}</td><td>${member.team}</td><td>${member.subgroup || "미지정"}</td><td>${member.position}</td><td>${member.grade}</td><td>${member.leftDate || "미입력"}</td><td>${member.resignationReason || "미입력"}</td><td><div class="row-actions"><button class="secondary small member-edit" type="button" data-index="${index}">수정</button><button class="primary small member-restore" type="button" data-index="${index}">재직 복구</button></div></td></tr>`).join("")
      : `<tr><td colspan="8" class="empty-cell">선택 조건에 해당하는 퇴사자가 없습니다.</td></tr>`;
  }
  if ($("#memberAccountAssign")) {
    const addMode = state.memberEditMode === "add";
    $("#memberEditMode").value = state.memberEditMode;
    const options = addMode
      ? [
        { value: "", label: "계정 없이 직원 정보만 추가" },
        ...accounts
          .filter((account) => !members.some((member) => accountForMember(member)?.id === account.id))
          .map((account) => ({ value: `account:${account.id}`, label: `${account.id} · 직원 미연결` })),
      ]
      : members
        .filter((member) => member.employmentStatus !== "퇴사")
        .map((member) => {
          const linkedAccount = accountForMember(member);
          return {
            value: `member:${member._id}`,
            label: linkedAccount ? `${member.name} · ${linkedAccount.id}` : `${member.name} · 계정 미연결`,
          };
        });
    if (!options.some((option) => option.value === state.selectedMemberAccount)) state.selectedMemberAccount = options[0]?.value || "";
    $("#memberAccountAssign").innerHTML = options.map((option) => `<option value="${option.value}" ${option.value === state.selectedMemberAccount ? "selected" : ""}>${option.label}</option>`).join("");
    const { account, member } = selectedMemberEditorRecord();
    const selectedTeam = member?.team || teams[0]?.name || "";
    $("#memberNameInput").value = member?.name || account?.name || "";
    $("#memberAssignTeam").innerHTML = optionList(teams.map((team) => team.name), selectedTeam);
    const subgroups = teams.find((team) => team.name === selectedTeam)?.subgroups || [];
    $("#memberAssignSubgroup").innerHTML = optionList(["미지정", ...subgroups], member?.subgroup || "미지정");
    $("#memberAssignPosition").innerHTML = optionList(positions.map((position) => position.name), member?.position || positions[0]?.name);
    $("#memberAssignGrade").innerHTML = optionList(grades, member?.grade || grades[0]);
    $("#memberAccountApply").textContent = addMode ? "직원 정보 추가" : "직원 정보 변경";
    $("#memberAccountApply").disabled = addMode ? false : !member;
    $("#memberEditorMessage").textContent = addMode
      ? (account ? `${account.id} 계정에 직원·조직 정보를 연결합니다.` : "로그인 계정 없이 직원 정보만 먼저 저장합니다. 계정 연결 탭에서 나중에 연결할 수 있습니다.")
      : (member
        ? `${member.name}의 DB 직원 정보를 변경합니다.${account ? ` 연결 계정: ${account.id}` : " 연결된 로그인 계정은 없습니다."}`
        : "변경할 DB 직원 정보가 없습니다.");
  }
  if ($("#memberLinkEmployee")) {
    const unlinkedMembers = members.filter((member) => member.employmentStatus !== "퇴사" && !accountForMember(member));
    const unlinkedAccounts = accounts.filter((account) => !members.some((member) => accountForMember(member)?.id === account.id));
    $("#unlinkedMemberCount").textContent = `${unlinkedMembers.length}명`;
    $("#memberLinkEmployee").innerHTML = unlinkedMembers.length
      ? unlinkedMembers.map((member) => `<option value="${escapeHtml(member._id)}">${escapeHtml(member.name)} · ${escapeHtml(member.team || "미지정")}</option>`).join("")
      : `<option value="">연결 대기 직원 없음</option>`;
    $("#memberLinkAccount").innerHTML = unlinkedAccounts.length
      ? unlinkedAccounts.map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.id)} · ${escapeHtml(accountRoleLabels[account.role] || account.role)}</option>`).join("")
      : `<option value="">연결 대기 계정 없음</option>`;
    $("#memberLinkApply").disabled = !unlinkedMembers.length || !unlinkedAccounts.length;
  }
  if ($("#accountRows")) {
    const keyword = state.accountSearch.trim().toLowerCase();
    const rows = accounts.filter((account) => !keyword || account.id.toLowerCase().includes(keyword));
    $("#accountCount").textContent = `${rows.length}개`;
    $("#accountSearchInput").value = state.accountSearch;
    $("#accountRows").innerHTML = rows.map((account) => {
      const member = members.find((item) => item.name === account.name);
      const connection = member ? `${member.name} · ${member.team}` : "회사 업무 그룹에서 연결 필요";
      return `<tr><td>${account.id}</td><td>${accountRoleLabels[account.role] || account.role}</td><td>${connection}</td><td><div class="row-actions"><button class="secondary small account-preview" data-account-id="${account.id}" type="button">${account.id === state.currentAccountId ? "현재 계정" : "이 계정으로 보기"}</button><button class="secondary small record-edit-open" data-record-type="account" data-index="${accounts.indexOf(account)}" type="button">권한 수정</button><button class="danger-button small account-delete" data-account-id="${account.id}" type="button">삭제</button></div></td></tr>`;
    }).join("");
  }
  if ($("#projectConfigRows")) {
    const activeProjects = activeProjectConfigs();
    if ($("#projectConfigParent")) {
      const selectedParent = $("#projectConfigParent").value;
      const candidates = activeProjects.filter((project) => ["운영", "구축"].includes(project.direction));
      $("#projectConfigParent").innerHTML = `<option value="">신규 단독 계약</option>${candidates.map((project) => `<option value="${escapeHtml(project._id)}" ${project._id === selectedParent ? "selected" : ""}>${escapeHtml(project.client)} · ${escapeHtml(project.project)}</option>`).join("")}`;
    }
    $("#activeProjectCount").textContent = `${activeProjects.length}개`;
    $("#projectConfigRows").innerHTML = activeProjects.map((p) => {
      const workerPeople = assignedProjectWorkers(p.project).length;
      const managementPeople = assignedProjectManagers(p.project).length || Number(p.managementPeople || 0);
      return `<tr><td>${p.client}</td><td>${p.project}</td><td>${p.direction}</td><td>${p.startDate || "-"} ~ ${p.endDate || "-"}</td><td>${money(p.monthly)}</td><td>${money(p.total)}</td><td>${money(p.unitPrice || 0)}</td><td>${p.monthlyPersonCost ? money(p.monthlyPersonCost) : "미설정"}</td><td>${p.contractPeople || 0}명</td><td>${workerPeople}명</td><td>${managementPeople}명</td><td>${workerPeople + managementPeople}명</td><td><div class="row-actions"><button class="secondary small project-edit" data-project="${p.project}" type="button">수정</button><button class="secondary small project-history-open" data-project="${p.project}" type="button">상세 보기</button><button class="danger-button small project-close" data-project="${p.project}" type="button">종료</button></div></td></tr>`;
    }).join("") || `<tr><td colspan="13">진행 프로젝트가 없습니다.</td></tr>`;
  }
  if ($("#closedProjectRows")) {
    const closedProjects = closedProjectConfigs();
    $("#closedProjectCount").textContent = `${closedProjects.length}개`;
    $("#closedProjectRows").innerHTML = closedProjects.map((p) => `<tr><td>${p.client}</td><td>${p.project}</td><td>${p.direction}</td><td>${p.closedMonth || "-"}</td><td>${p.closeReason || "-"}</td><td><div class="row-actions"><button class="secondary small project-history-open" data-project="${p.project}" type="button">상세 보기</button><button class="primary small project-restore" data-project="${p.project}" type="button">진행으로 복구</button></div></td></tr>`).join("") || `<tr><td colspan="6">종료 프로젝트가 없습니다.</td></tr>`;
  }
  if ($("#projectSettingRows")) {
    const settingRows = activeProjectConfigs();
    if ($("#projectSettingCount")) $("#projectSettingCount").textContent = `${settingRows.length}개`;
    $("#projectSettingRows").innerHTML = settingRows.map((project) => {
      const setting = projectWorkSettings.find((row) => row.project === project.project);
      const index = setting ? projectWorkSettings.indexOf(setting) : -1;
      const teamNames = projectSettingTeams(setting);
      const extraNames = projectSettingExtraMembers(setting);
      const managerNames = projectSettingManagers(setting);
      return `<tr><td>${escapeHtml(project.project)}</td><td>${escapeHtml(teamNames.join(", ") || "미지정")}</td><td>${escapeHtml(extraNames.join(", ") || "-")}</td><td>${escapeHtml(managerNames.join(", ") || "-")}</td><td>${assignedProjectPeople(project.project).length}명</td><td>${escapeHtml(project.direction)}</td><td><strong>${absoluteDailyHoursForProject(project.project)}H</strong></td><td>${escapeHtml(setting?.month || "미설정")}</td><td><div class="row-actions"><button class="secondary small record-edit-open" data-record-type="projectSetting" data-index="${index}" data-project="${escapeHtml(project.project)}" type="button">수정</button></div></td></tr>`;
    }).join("") || `<tr><td colspan="9">진행 프로젝트가 없습니다.</td></tr>`;
  }
  if ($("#workSettingProject")) {
    $("#workSettingProject").innerHTML = optionList(activeProjectConfigs().map((p) => p.project), state.configProject);
    const currentSetting = projectWorkSettings.find((setting) => setting.project === state.configProject);
    ensureWorkSettingDraft(state.configProject, currentSetting);
    renderWorkSettingPickers();
    $("#workSettingMonth").value = currentSetting?.month || (state.month !== "other" && state.month) || DEFAULT_MONTH;
  }
  if ($("#slaRuleProject")) {
    const activeProjects = activeProjectConfigs().map((project) => project.project);
    const availableProjects = state.view === "deliverableSetting" ? (state.deliverableProject ? [state.deliverableProject] : []) : activeProjects;
    if (!availableProjects.includes(state.slaRuleProject)) state.slaRuleProject = availableProjects[0] || "";
    $("#slaRuleProject").innerHTML = availableProjects.length
      ? optionList(availableProjects, state.slaRuleProject)
      : `<option value="">프로젝트를 먼저 선택하세요</option>`;
    const projectDeliverables = deliverables.filter((deliverable) => deliverable.project === state.slaRuleProject);
    if (!projectDeliverables.some((deliverable) => deliverable.name === state.slaRuleDeliverable)) {
      state.slaRuleDeliverable = projectDeliverables[0]?.name || "";
    }
    $("#slaRuleDeliverable").innerHTML = optionList(projectDeliverables.map((deliverable) => deliverable.name), state.slaRuleDeliverable);
    const selectedRule = projectDeliverables.find((deliverable) => deliverable.name === state.slaRuleDeliverable);
    const selectedHasOverride = selectedRule?.slaEnabled === true;
    $("#slaRuleDays").value = selectedHasOverride ? Number(selectedRule.slaDays) : 1;
    const configuredCount = projectDeliverables.filter((deliverable) => deliverable.slaEnabled === true).length;
    $("#slaRuleCount").textContent = `${configuredCount}개 설정`;
    $("#slaRuleRows").innerHTML = projectDeliverables.map((deliverable) => {
      const index = deliverables.indexOf(deliverable);
      const hasOverride = deliverable.slaEnabled === true;
      const override = hasOverride ? Number(deliverable.slaDays) : null;
      return `<tr><td>${deliverable.project}</td><td>${deliverable.name}</td><td>${hasOverride ? `${override}영업일` : "-"}</td><td><span class="pill ${hasOverride ? "good" : ""}">${hasOverride ? `결과물 기준 ${override}영업일` : "미설정"}</span></td><td><div class="row-actions"><button class="secondary small sla-rule-edit" data-index="${index}" type="button">설정</button>${hasOverride ? `<button class="danger-button small sla-rule-reset" data-index="${index}" type="button">미설정</button>` : ""}</div></td></tr>`;
    }).join("") || `<tr><td colspan="5">먼저 업무 템플릿에서 결과물 유형을 등록하세요.</td></tr>`;
  }
  if ($("#teamHistoryProjectFilter")) {
    $("#teamHistoryProjectFilter").innerHTML = optionList(["전체", ...projectConfigs.map((p) => p.project)], state.teamHistoryProject);
  }
  if ($("#projectTeamHistoryRows")) {
    const projects = state.teamHistoryProject === "전체" ? projectConfigs.map((project) => project.project) : [state.teamHistoryProject];
    const rows = projects.flatMap((project) => combinedProjectHistories(project).map((entry) => ({ ...entry, project })))
      .sort((a, b) => b.date.localeCompare(a.date) || b.sortIndex - a.sortIndex);
    $("#projectTeamHistoryRows").innerHTML = rows.map((h) => `<tr><td>${h.date}</td><td>${h.project}</td><td><span class="pill">${h.category}</span></td><td>${h.field}</td><td>${h.before}</td><td>${h.after}</td><td>${h.reason}</td></tr>`).join("") || `<tr><td colspan="7">검색된 변경이력이 없습니다.</td></tr>`;
  }
  if ($("#deliverableRows")) {
    const rows = deliverables.filter((d) => d.project === state.deliverableProject);
    $("#deliverableRows").innerHTML = rows.map((d) => {
      const target = deliverables.find((x) => x.project === d.project && x.name === d.conversionTarget)
        || deliverables.find((x) => x.name === d.conversionTarget)
        || d;
      const converted = dailyConversionCount(d.standardHours, target.standardHours);
      const index = deliverables.indexOf(d);
      return `<tr><td>${d.project}</td><td>${d.name}</td><td>${effortLabel(d.standardHours)}</td><td>${d.slaEnabled ? `${d.slaDays}영업일` : "미설정"}</td><td>${target.name} ${effortLabel(target.standardHours)}</td><td>${converted.toFixed(1)}건 / W/D</td><td><div class="row-actions"><button class="secondary small record-edit-open" data-record-type="deliverable" data-index="${index}" type="button">수정</button><button class="danger-button small record-delete" data-record-type="deliverable" data-index="${index}" type="button">삭제</button></div></td></tr>`;
    }).join("") || `<tr><td colspan="7">선택한 프로젝트에 등록된 결과물이 없습니다.</td></tr>`;
    renderDeliverableConversion();
  }
  if ($("#deliverableExcelMessage")) {
    const info = state.deliverableExcelImport;
    $("#deliverableExcelMessage").classList.toggle("success", info.status === "success");
    $("#deliverableExcelMessage").classList.toggle("error", info.status === "error");
    if (info.status === "success") {
      $("#deliverableExcelMessage").innerHTML = `<strong>교체 완료 · ${info.fileName}</strong><p>${info.message}</p>`;
    } else if (info.status === "error") {
      $("#deliverableExcelMessage").innerHTML = `<strong>교체하지 않음 · ${info.fileName || "파일 확인"}</strong><p>${info.message}</p>`;
    } else {
      $("#deliverableExcelMessage").innerHTML = `<strong>전체 교체 업로드</strong><p>파일 전체가 정상일 때만 기존 결과물 설정을 삭제하고 새 파일 내용으로 교체합니다.</p>`;
    }
  }
  if ($("#deliverableProjectSelect")) {
    $("#deliverableProjectSelect").innerHTML = `<option value="">프로젝트를 선택하세요</option>${optionList(templateProjectNames, state.deliverableProject)}`;
    $("#deliverableProjectSelect").value = state.deliverableProject;
    const projectTargetNames = [...new Set(deliverables.filter((d) => d.project === state.deliverableProject).map((d) => d.name))];
    if (!projectTargetNames.includes(state.conversionTarget)) state.conversionTarget = projectTargetNames[0] || "";
    $("#conversionTargetSelect").innerHTML = optionList(projectTargetNames, state.conversionTarget);
    const projectBuffers = productivityBuffersForProject(state.deliverableProject);
    if ($("#templateProjectBufferInput")) $("#templateProjectBufferInput").value = projectBuffers.projectBuffer;
    if ($("#templateCompanyBufferInput")) $("#templateCompanyBufferInput").value = projectBuffers.companyBuffer;
    if ($("#templateBufferSummary")) {
      $("#templateBufferSummary").innerHTML = state.deliverableProject
        ? `<strong>${escapeHtml(state.deliverableProject)} 리소스 기준</strong><span>월 ${projectBuffers.workingDays} W/D</span><span>프로젝트 목표 ${formatNumber(projectBuffers.projectBuffer, 1)}%</span><span>회사 목표 ${formatNumber(projectBuffers.companyBuffer, 1)}%</span><span>리소스 관제의 가동률·인당 생산율에 적용</span>`
        : `<strong>프로젝트를 선택하세요</strong>`;
    }
    renderDeliverableConversion();
  }
  renderEmployeeReview();
  EmployeeReviewManagement.render();
}

function renderDeliverableConversion() {
  if (!$("#deliverableConversionResult")) return;
  const inputName = $("#deliverableNameInput")?.value?.trim() || state.conversionSource;
  const inputHours = Number($("#deliverableHoursInput")?.value || 0);
  const source = { name: inputName, standardHours: inputHours || deliverables.find((d) => d.name === inputName)?.standardHours || 0 };
  const projectDeliverables = deliverables.filter((deliverable) => deliverable.project === state.deliverableProject);
  const target = projectDeliverables.find((deliverable) => deliverable.name === state.conversionTarget) || projectDeliverables[0];
  if (!target) {
    $("#deliverableConversionResult").innerHTML = `<strong>환산 기준 결과물 미등록</strong><span>결과물을 한 건 이상 추가하거나 Excel로 업로드하면 환산 결과가 표시됩니다.</span>`;
    return;
  }
  const unit = target?.standardHours || 0;
  const totalCount = unit ? source.standardHours / unit : 0;
  const workingDays = source.standardHours / 8;
  const dailyCount = dailyConversionCount(source.standardHours, unit);
  $("#deliverableConversionResult").innerHTML = `<strong>${state.deliverableProject} · ${source.name} ${effortLabel(source.standardHours)}</strong><span>${target.name} ${effortLabel(unit)} 기준</span><span>총 ${totalCount.toFixed(1)}건 ÷ ${workingDays.toFixed(2)} W/D</span><span>1 W/D 환산 ${dailyCount.toFixed(1)}건</span>`;
}

function renderMemberModal() {
  if (!$("#memberModal")) return;
  const isOpen = state.memberModalIndex !== null && members[state.memberModalIndex];
  $("#memberModal").classList.toggle("active", !!isOpen);
  $("#memberModal").setAttribute("aria-hidden", isOpen ? "false" : "true");
  if (!isOpen) return;
  const member = members[state.memberModalIndex];
  $("#modalMemberName").value = member.name;
  $("#modalMemberTeam").innerHTML = optionList(teams.map((t) => t.name), member.team);
  const subgroups = teams.find((team) => team.name === member.team)?.subgroups || [];
  $("#modalMemberSubgroup").innerHTML = optionList(["미지정", ...subgroups], member.subgroup || "미지정");
  $("#modalMemberPosition").innerHTML = optionList(positions.map((p) => p.name), member.position);
  $("#modalMemberGrade").innerHTML = optionList(grades, member.grade);
  $("#modalMemberEmploymentStatus").value = member.employmentStatus || "재직";
  $("#modalMemberLeftDate").value = member.leftDate || "";
  $("#modalMemberResignationReason").value = member.resignationReason || "";
  $("#modalMemberReducedWork").checked = member.reducedWork === true;
  $("#modalMemberReducedStartDate").value = member.reducedWorkStartDate || "";
  $("#modalMemberReducedEndDate").value = member.reducedWorkEndDate || "";
  $("#modalMemberReducedStartTime").value = member.reducedWorkStartTime || "10:00";
  $("#modalMemberReducedEndTime").value = member.reducedWorkEndTime || "16:00";
  updateMemberEmploymentFields();
  updateMemberReducedWorkFields();
}

function updateMemberEmploymentFields() {
  const resigned = $("#modalMemberEmploymentStatus")?.value === "퇴사";
  ["#modalMemberLeftDate", "#modalMemberResignationReason"].forEach((selector) => {
    const input = $(selector);
    if (input) input.disabled = !resigned;
  });
  if ($("#modalMemberEmploymentSummary")) {
    $("#modalMemberEmploymentSummary").innerHTML = resigned
      ? `<strong>퇴사자 처리</strong><span>퇴사일과 사유를 저장하면 활성 인원 집계에서 제외되고 과거 업무 이력은 유지됩니다.</span>`
      : `<strong>재직 인원</strong><span>퇴사 정보는 입력하지 않으며 활성 인원 집계에 포함됩니다.</span>`;
  }
}

function updateMemberReducedWorkFields() {
  const enabled = $("#modalMemberReducedWork")?.checked === true;
  ["#modalMemberReducedStartDate", "#modalMemberReducedEndDate", "#modalMemberReducedStartTime", "#modalMemberReducedEndTime"].forEach((selector) => {
    const input = $(selector);
    if (input) input.disabled = !enabled;
  });
  const hours = reducedDailyHours($("#modalMemberReducedStartTime")?.value, $("#modalMemberReducedEndTime")?.value);
  if ($("#modalMemberReducedSummary")) {
    $("#modalMemberReducedSummary").innerHTML = enabled
      ? `<strong>1일 실근무 ${formatNumber(hours, 1)}H</strong><span>12:00~13:00 점심시간 제외</span>`
      : `<strong>일반 근무</strong><span>가동률 산정 기준 1일 ${DAILY_ABSOLUTE_HOURS}H</span>`;
  }
}

function taskOutputEditRows(task, projectName) {
  const details = taskOutputDetails(task);
  const detailByName = new Map();
  details.forEach((detail) => {
    const key = normalizeDeliverableKey(detail.name);
    const current = detailByName.get(key) || { name: detail.name, count: 0, standardHoursPerUnit: detail.standardHoursPerUnit };
    current.count += Number(detail.count || 0);
    current.standardHoursPerUnit = Number(current.standardHoursPerUnit || detail.standardHoursPerUnit || 0);
    detailByName.set(key, current);
  });
  const configured = deliverables.filter((deliverable) => deliverable.project === projectName);
  const rows = configured.map((deliverable) => {
    const existing = detailByName.get(normalizeDeliverableKey(deliverable.name));
    detailByName.delete(normalizeDeliverableKey(deliverable.name));
    return { name: deliverable.name, count: existing?.count || 0, standardHours: Number(deliverable.standardHours || existing?.standardHoursPerUnit || 0), configured: true };
  });
  detailByName.forEach((detail) => {
    rows.push({ name: detail.name, count: detail.count, standardHours: Number(detail.standardHoursPerUnit || 0), configured: false });
  });
  return rows.flatMap((row) => {
    const matches = details.map((detail, detailIndex) => ({ detail, detailIndex }))
      .filter(({ detail }) => normalizeDeliverableKey(detail.name) === normalizeDeliverableKey(row.name));
    return matches.length ? matches.map(({ detail, detailIndex }) => ({ ...row, count: detail.count, detailIndex,
      importSubNumber: detail.importSubNumber, resourceMultiplier: detail.resourceMultiplier, owner: detail.owner })) : [row];
  });
}

function renderTaskOutputEditor() {
  const edit = state.recordEdit;
  const container = $("#editTaskOutputs");
  if (!container || edit?.type !== "task") return;
  const task = tasks[edit.index];
  const projectName = $("#editTaskProject")?.value || task?.project || "";
  const rows = taskOutputEditRows(task, projectName);
  container.innerHTML = rows.map((row) => {
    const checked = row.count > 0 ? "checked" : "";
    return `<label class="task-deliverable-item edit-task-output-row">
      <input class="edit-task-output-check" type="checkbox" ${checked} data-detail-index="${row.detailIndex ?? ""}" data-output-name="${escapeHtml(row.name)}" data-standard-hours="${row.standardHours}" />
      <span class="edit-output-title">${escapeHtml(row.name)}${row.importSubNumber !== undefined ? ` · 보조 ${escapeHtml(row.importSubNumber)}` : ""}${row.owner ? ` · ${escapeHtml(row.owner)}` : ""}${row.configured ? "" : " · 기존값"}</span>
      <input class="edit-task-output-count" type="number" min="0" step="1" value="${Number(row.count || 0)}" aria-label="${row.name} 수량" />
      <small>${effortLabel(row.standardHours)} / 건</small>
      ${row.importSubNumber === "20" ? `<span class="edit-output-multiplier-field">이 산출물 배수<input class="edit-output-multiplier" ${currentAccount()?.role === "admin" ? "" : "disabled"} type="number" min="0.01" step="0.01" value="${row.resourceMultiplier ?? 1}" /></span>` : ""}
    </label>`;
  }).join("") || `<p class="empty-text">선택한 프로젝트에 등록된 결과물이 없습니다.</p>`;
}

function taskOutputEditPanelMarkup() {
  return `<aside class="task-edit-output-panel">
    <div class="task-edit-output-head"><div><strong>결과물 추가 및 수정</strong><p>체크하면 추가되고, 체크 해제 또는 수량 0은 삭제로 처리됩니다.</p></div></div>
    <div class="bulk-deliverable-entry">
      <label>결과물 검색·일괄 입력<input id="editTaskDeliverableBulkInput" type="search" placeholder="예: 메인배너 3, 공통띠배너 1" /></label>
      <button id="applyEditTaskDeliverableBulk" class="secondary" type="button">일괄 적용</button>
    </div>
    <div id="editTaskDeliverableBulkResult" class="bulk-match-result" hidden></div>
    <div id="editTaskOutputs" class="deliverable-picker edit-task-output-grid"></div>
  </aside>`;
}

function editedTaskOutputs(target, project, fallbackOwner, fallbackOwnerEmployeeId, forceOwner = false) {
  const previousDetails = taskOutputDetails(target);
  return $$(".edit-task-output-row").map((row) => {
    const check = row.querySelector(".edit-task-output-check");
    const count = Number(row.querySelector(".edit-task-output-count")?.value || 0);
    if (!check?.checked || !Number.isFinite(count) || count <= 0) return null;
    const name = check.dataset.outputName;
    const deliverable = deliverables.find((item) => item.project === project && normalizeDeliverableKey(item.name) === normalizeDeliverableKey(name));
    const previous = check.dataset.detailIndex !== "" ? previousDetails[Number(check.dataset.detailIndex)] : null;
    const multiplier = Number(currentAccount()?.role === "admin" ? (row.querySelector(".edit-output-multiplier")?.value ?? previous?.resourceMultiplier ?? 1) : (previous?.resourceMultiplier ?? 1));
    if (!Number.isFinite(multiplier) || multiplier <= 0) throw new Error("산출물 배수는 0보다 큰 숫자여야 합니다.");
    const standardHoursPerUnit = Number((target.project === project ? previous?.standardHoursPerUnit : undefined) ?? deliverable?.standardHours ?? check.dataset.standardHours ?? 0);
    return {
      ...(previous || { importSubNumber: "manual", resourceMultiplier: 1 }),
      ...(previous?.importSubNumber === "20" ? { resourceMultiplier: multiplier } : {}),
      outputId: previous?.outputId,
      name,
      count,
      owner: forceOwner ? fallbackOwner : (previous?.owner || fallbackOwner),
      ownerEmployeeId: forceOwner ? fallbackOwnerEmployeeId : (previous?.ownerEmployeeId || fallbackOwnerEmployeeId),
      standardHoursPerUnit,
      inspectionStatus: previous?.inspectionStatus || null,
      fileLink: previous?.fileLink || null,
      note: previous?.note || null,
    };
  }).filter(Boolean);
}

function renderRecordEditModal() {
  const modal = $("#recordEditModal");
  if (!modal) return;
  const edit = state.recordEdit;
  const saveButton = modal.querySelector(".record-edit-save");
  if (saveButton) {
    saveButton.disabled = Boolean(state.recordEditSaving);
    saveButton.textContent = state.recordEditSaving ? "저장 중" : "저장";
    if (!state.recordEditSaving) saveButton.removeAttribute("title");
  }
  const dialog = modal.querySelector(".record-edit-dialog");
  dialog?.classList.toggle("task-edit-dialog", edit?.type === "task");
  dialog?.classList.toggle("project-setting-edit-dialog", edit?.type === "projectSetting");
  modal.classList.toggle("active", !!edit);
  modal.setAttribute("aria-hidden", edit ? "false" : "true");
  if (!edit) return;
  if ($("#recordEditError")) {
    $("#recordEditError").hidden = true;
    $("#recordEditError").textContent = "";
  }

  const projectOptions = activeProjectConfigs().map((project) => project.project);
  const teamOptions = teams.map((team) => team.name);
  if (edit.type === "task") {
    const item = tasks[edit.index];
    const account = currentAccount();
    if (!item || !canEditTaskRecord(item, account)) {
      state.recordEdit = null;
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
      return;
    }
    if (account?.role === "worker") {
      $("#recordEditModalTitle").textContent = "업무 진행 및 결과물 수정";
      $("#recordEditModalDescription").textContent = "배정된 업무의 상태와 결과물 종류·수량을 변경합니다.";
      $("#recordEditModalBody").innerHTML = `
        <input id="editTaskProject" type="hidden" value="${escapeHtml(item.project)}" />
        <div class="task-edit-layout">
          <section class="task-edit-primary">
            <div class="form-grid">
              <label>업무번호<input value="${escapeHtml(item.id)}" disabled /></label>
              <label>프로젝트<input value="${escapeHtml(item.project)}" disabled /></label>
              <label class="wide-field">업무명<input value="${escapeHtml(item.title || "")}" disabled /></label>
              <label class="wide-field">연결 업무<input value="${escapeHtml(item.relatedTaskId || "없음")}" disabled /></label>
              <label>상태<select id="editTaskStatus">${optionList([...new Set([...TASK_STATUSES, item.status].filter(Boolean))], item.status)}</select></label>
              <label>완료 예정일<input value="${escapeHtml(item.dueDate || "-")}" disabled /></label>
              <label id="editTaskStageField">종합 단계 선택<select id="editTaskStageSelect"><option value="">단계를 선택하세요</option></select></label>
              <label id="editTaskStageCustomField">종합 단계 직접 입력<input id="editTaskStageInput" value="${escapeHtml(item.stage || "")}" placeholder="목록에 없는 단계 입력" /></label>
              <label id="editTaskStageDetailField" class="wide-field">단계 상세<input id="editTaskStageDetailInput" value="${escapeHtml(item.stageDetail || "")}" placeholder="현재 세부 업무 상황" /></label>
            </div>
            <div class="summary-strip">실무자는 상태, 종합 단계와 결과물 종류·수량을 수정할 수 있습니다. 담당자, 일정, 개별 버퍼는 관리자 권한으로 관리됩니다.</div>
          </section>
          ${taskOutputEditPanelMarkup()}
        </div>`;
      syncTaskStageFields(item.project, "edit", true);
      renderTaskOutputEditor();
      return;
    }
    const ownerOptions = members.filter((member) => member.employmentStatus !== "퇴사").map((member) => member.name);
    const channelOptions = ["메일", "메신저", "Jira", "전화", "고객 포털", item.channel].filter(Boolean);
    $("#recordEditModalTitle").textContent = "업무 정보 수정";
    $("#recordEditModalDescription").textContent = "상태, 담당자, 일정, 결과물 수량을 수정합니다. 결과물은 체크 해제 시 삭제됩니다.";
    $("#recordEditModalBody").innerHTML = `
      <div class="task-edit-layout">
        <section class="task-edit-primary">
          <div class="form-grid">
            <label>업무번호<input id="editTaskId" value="${item.id}" disabled /></label>
            <label>프로젝트<select id="editTaskProject">${optionList(projectOptions, item.project)}</select></label>
            <label class="wide-field">업무명<input id="editTaskTitle" value="${item.title || ""}" /></label>
            <label class="wide-field">연결 업무 <span class="optional-label">선택</span><input id="editTaskRelatedTask" list="editTaskRelatedTaskOptions" value="${escapeHtml(item.relatedTaskId || "")}" placeholder="업무번호 또는 업무명으로 검색" autocomplete="off" /><datalist id="editTaskRelatedTaskOptions"></datalist></label>
            <label>담당자<select id="editTaskOwner">${optionList([...new Set([item.owner, ...ownerOptions].filter(Boolean))], item.owner)}</select></label>
            <label>상태<select id="editTaskStatus">${optionList([...new Set([...TASK_STATUSES, item.status].filter(Boolean))], item.status)}</select></label>
            ${!taskOutputDetails(item).length ? `<label>수동 공수(H)<input id="editTaskManualHours" type="number" min="0" step="0.25" value="${Number(item.manualStandardHours ?? item.standardHours ?? 0)}" /></label>` : ""}
            <label id="editTaskStageField">종합 단계 선택<select id="editTaskStageSelect"><option value="">단계를 선택하세요</option></select></label>
            <label id="editTaskStageCustomField">종합 단계 직접 입력<input id="editTaskStageInput" value="${escapeHtml(item.stage || "")}" placeholder="목록에 없는 단계 입력" /></label>
            <label id="editTaskStageDetailField" class="wide-field">단계 상세<input id="editTaskStageDetailInput" value="${escapeHtml(item.stageDetail || "")}" placeholder="예: 메인 화면 기획 1차 완료, 고객 검토 대기" /></label>
            <label>요청 채널<select id="editTaskChannel">${optionList([...new Set(channelOptions)], item.channel || "메일")}</select></label>
            <label>촬영 유형<select id="editTaskPhotoType">${optionList(PHOTO_TYPES, normalizePhotoType(item.photoType))}</select></label>
            ${taskOutputDetails(item).some((detail) => detail.importSubNumber !== undefined) ? `<p class="wide-field form-hint">보조번호 20의 배수는 오른쪽 해당 산출물에서 수정합니다.</p>` : account?.role === "admin" ? `<label>기존 업무 전체 버퍼(%)<input id="editTaskEffortBuffer" type="number" step="1" value="${normalizeEffortBufferPct(item.effortBufferPct)}" /><small>이전 데이터는 보조번호별 원본으로 재업로드해야 적용 범위를 분리할 수 있습니다.</small></label>` : ""}
            <label>접수일<input id="editTaskStart" type="date" value="${item.start || ""}" /></label>
            <label>완료 예정일<input id="editTaskDue" type="date" value="${item.dueDate || ""}" /></label>
            <label class="wide-field">실제 완료일 · 작업 월 집계 기준<input id="editTaskCompletedDate" type="date" value="${item.completedDate || ""}" /><small>완료 상태에서 입력한 날짜로 집계합니다. 비워두면 기타(완료일 미입력)로 분류됩니다.</small></label>
            <label class="wide-field">일정 변경 사유<select id="editTaskScheduleReason">${scheduleChangeReasonOptions(scheduleChangeResponsibility(item.scheduleChangeReason) ? item.scheduleChangeReason : "")}</select></label>
          </div>
          <details class="schedule-reason-guide"><summary><strong>일정 변경 사유별 귀책 기준</strong></summary><p><b>우리측</b> 작업자 일정 지연, 작업 누락 또는 오류 수정, 내부 검수 지연, 내부 커뮤니케이션 지연, 내부 리소스 부족</p><p><b>고객측</b> 고객 요청사항 변경, 고객 자료 전달 지연, 고객 검수 또는 승인 지연</p><p><b>공동</b> 작업 범위 추가 합의, 양측 일정 재협의</p><p><b>제외</b> 천재지변 또는 외부 시스템 장애</p></details>
          <div class="checks"><label><input id="editTaskUrgent" type="checkbox" ${item.urgent ? "checked" : ""} /> 긴급</label><label><input id="editTaskRevision" type="checkbox" ${item.revision ? "checked" : ""} /> 재작업</label></div>
        </section>
        ${taskOutputEditPanelMarkup()}
      </div>`;
    syncTaskStageFields(item.project, "edit", true);
    renderTaskOutputEditor();
    renderRelatedTaskOptions(item.project, "#editTaskRelatedTask", "#editTaskRelatedTaskOptions", item.id);
  } else if (edit.type === "workResource") {
    const item = workResources[edit.index];
    if (!item || !canManageWorkResources() || !canAccessWorkResource(item)) return;
    const projectNames = workResourceProjectConfigs().map((project) => project.project);
    $("#recordEditModalTitle").textContent = "업무 자료 수정";
    $("#recordEditModalDescription").textContent = "프로젝트 공지와 공통 작업 기준을 수정합니다.";
    $("#recordEditModalBody").innerHTML = `
      <label>프로젝트<select id="editWorkResourceProject">${optionList(projectNames, item.project)}</select></label>
      <label>분류<select id="editWorkResourceCategory">${optionList(["공지사항", "공통사항", "작업 가이드", "참고 자료"], item.category)}</select></label>
      <label class="wide-field">제목<input id="editWorkResourceTitle" value="${escapeHtml(item.title)}" /></label>
      <label class="wide-field">내용<textarea id="editWorkResourceContent" rows="7">${escapeHtml(item.content)}</textarea></label>
      <label class="wide-field">참고 링크<input id="editWorkResourceLink" type="url" value="${escapeHtml(item.referenceUrl || "")}" placeholder="https://" /></label>
      ${item.imagePaths?.length ? `<div class="work-resource-image-checks"><strong>기존 이미지</strong>${item.imagePaths.map((path, imageIndex) => `<label><input class="edit-work-resource-image-keep" type="checkbox" data-path="${escapeHtml(path)}" checked /> 이미지 ${imageIndex + 1} 유지</label>`).join("")}</div>` : ""}
      <label class="wide-field">새 이미지 추가<input id="editWorkResourceImages" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple /><small>기존 이미지 포함 최대 20장</small></label>
      <div class="checks"><label><input id="editWorkResourcePinned" type="checkbox" ${item.pinned ? "checked" : ""} /> 상단 고정</label></div>`;
  } else if (edit.type === "project") {
    const item = projectConfigs[edit.index];
    $("#recordEditModalTitle").textContent = "프로젝트 구성 수정";
    $("#recordEditModalDescription").textContent = "프로젝트 리스트의 수정 버튼으로 호출한 정보입니다.";
    $("#recordEditModalBody").innerHTML = `
      <label>고객사<input id="editProjectClient" value="${item.client}" /></label>
      <label>프로젝트 과업명<input id="editProjectName" value="${item.project}" /></label>
      <label>방향성<select id="editProjectDirection">${optionList(["운영", "구축", "이커머스"], item.direction)}</select></label>
      <label>확장 계약 기준 프로젝트<select id="editProjectParent"><option value="">신규 단독 계약</option>${projectConfigs.filter((project) => project !== item && project.client === item.client && ["운영", "구축"].includes(project.direction)).map((project) => `<option value="${escapeHtml(project._id)}" ${project._id === item.parentProjectId ? "selected" : ""}>${escapeHtml(project.project)}</option>`).join("")}</select></label>
      <label>계약 시작일<input id="editProjectStartDate" type="date" value="${item.startDate || ""}" /></label>
      <label>계약 종료일<input id="editProjectEndDate" type="date" value="${item.endDate || ""}" /></label>
      <label>월 계약금<input id="editProjectMonthly" type="number" value="${item.monthly}" /></label>
      <label>총 계약금<input id="editProjectTotal" type="number" value="${item.total}" /></label>
      <label>계약 인원<input id="editProjectPeople" type="number" min="0" value="${item.contractPeople || 0}" /></label>
      <label>1인 월 평단가<input id="editProjectUnitPrice" type="number" min="0" value="${calculatedUnitPrice(item.monthly, item.contractPeople)}" readonly /></label>
      <label>1인 월 원가(만원)<input id="editProjectMonthlyPersonCost" type="number" min="0" step="10" value="${item.monthlyPersonCost || 0}" /></label>
      <label>변경 사유<input id="editProjectReason" placeholder="변경 사유 입력" /></label>`;
    $("#editProjectTotal").dataset.amountSource = item.total ? "total" : "monthly";
  } else if (edit.type === "team") {
    const item = teams[edit.index];
    $("#recordEditModalTitle").textContent = "팀 정보 수정";
    $("#recordEditModalDescription").textContent = "팀명, 기본 업무 그룹, 세부 그룹을 구분해 수정합니다.";
    $("#recordEditModalBody").innerHTML = `
      <label>팀명<input id="editTeamName" value="${item.name}" /></label>
      <label>기본 업무 그룹<input id="editTeamBaseGroup" value="${item.baseGroup}" /></label>
      <label>세부 그룹<input id="editTeamSubgroups" value="${item.subgroups.join(", ")}" placeholder="쉼표로 구분" /></label>`;
  } else if (edit.type === "position") {
    const item = positions[edit.index];
    $("#recordEditModalTitle").textContent = "포지션 수정";
    $("#recordEditModalDescription").textContent = "선택한 포지션 명칭을 수정합니다.";
    $("#recordEditModalBody").innerHTML = `<label>포지션명<input id="editPositionName" value="${item.name}" /></label>`;
  } else if (edit.type === "projectSetting") {
    const projectName = edit.project || projectOptions[0] || "";
    const item = projectWorkSettings[edit.index] || {
      project: projectName,
      team: "미지정",
      teams: [],
      extraMembers: [],
      managerMembers: [],
      absoluteDailyHours: absoluteDailyHoursForProject(projectName),
      month: (state.month !== "other" && state.month) || DEFAULT_MONTH,
    };
    state.editSettingDraftTeams = projectSettingTeams(item);
    state.editSettingDraftMembers = projectSettingExtraMembers(item);
    state.editSettingDraftManagers = projectSettingManagers(item);
    state.editSettingTeamSearch = "";
    state.editSettingMemberSearch = "";
    state.editSettingManagerSearch = "";
    $("#recordEditModalTitle").textContent = "프로젝트 작업 세팅 수정";
    $("#recordEditModalDescription").textContent = "진행 팀, 팀 외 실무자와 관리자를 구분해 지정하고 변경 이력에 남깁니다.";
    $("#recordEditModalBody").innerHTML = `
      <label>진행 프로젝트<select id="editSettingProject" disabled>${optionList([item.project], item.project)}</select></label>
      <label>적용월<input id="editSettingMonth" value="${item.month}" /></label>
      <label>절대 기준 근로시간<select id="editSettingAbsoluteHours">${optionList(["7", "8"], String(absoluteDailyHoursForProject(item.project)))}</select></label>
      <label>일간 배정 목표 기준공수(H)<input id="editAssignmentDailyTarget" type="number" min="0.01" step="0.01" value="${projectConfig(item.project)?.assignmentDailyTarget ?? absoluteDailyHoursForProject(item.project)}" /></label>
      <label>월간 배정 목표 기준공수(H)<input id="editAssignmentMonthlyTarget" type="number" min="0.01" step="0.01" value="${projectConfig(item.project)?.assignmentMonthlyTarget ?? ''}" placeholder="공란: 일간 목표 × 해당 월 W/D" /></label>
      <label class="wide-field"><input id="editPublicDailyEnabled" type="checkbox" ${projectConfig(item.project)?.publicDailyEnabled ? 'checked' : ''} /> 일간 현황 공개 (로그인 없이 작업자명·일자별 기준공수 조회)</label>
      <p class="wide-field">배정 목표는 업무 등록 추천에 적용됩니다. 월간 공란은 설정된 월 근무일수(W/D)를 사용합니다. 회색은 목표 100% 도달을 뜻합니다. 공개 URL: <a href="./daily-public.html" target="_blank" rel="noopener">daily-public.html</a></p>
      <div class="wide-field assignment-role-grid">
        <fieldset class="assignment-fieldset"><legend>진행 팀 복수 선택</legend><div class="assignment-picker assignment-search-picker"><input id="editSettingTeamSearch" type="search" placeholder="팀명 검색" /><select id="editSettingTeamSelect"></select><button id="editSettingTeamAdd" class="secondary" type="button">팀 추가</button></div><div id="editSettingSelectedTeams" class="assignment-selected-list"></div></fieldset>
        <fieldset class="assignment-fieldset"><legend>팀 외 개별 인원 추가</legend><div class="assignment-picker assignment-search-picker"><input id="editSettingMemberSearch" type="search" placeholder="직원명, 팀, 세부 그룹 검색" /><select id="editSettingMemberSelect"></select><button id="editSettingMemberAdd" class="secondary" type="button">인원 추가</button></div><div id="editSettingSelectedMembers" class="assignment-selected-list"></div></fieldset>
        <fieldset class="assignment-fieldset"><legend>관리자 지정</legend><div class="assignment-picker assignment-search-picker"><input id="editSettingManagerSearch" type="search" placeholder="관리자명, 팀, 포지션 검색" /><select id="editSettingManagerSelect"></select><button id="editSettingManagerAdd" class="secondary" type="button">관리자 추가</button></div><div id="editSettingSelectedManagers" class="assignment-selected-list"></div></fieldset>
      </div>
      <label>변경 사유<input id="editSettingReason" placeholder="변경 사유 입력" /></label>`;
    renderEditSettingPickers();
  } else if (edit.type === "deliverable") {
    const item = deliverables[edit.index];
    const targetNames = [...new Set(deliverables.map((deliverable) => deliverable.name))];
    $("#recordEditModalTitle").textContent = "결과물 정보 수정";
    $("#recordEditModalDescription").textContent = "결과물 명칭, 기준공수, 환산 기준은 이 팝업에서만 수정합니다.";
    $("#recordEditModalBody").innerHTML = `
      <label>프로젝트<select id="editDeliverableProject">${optionList(projectOptions, item.project)}</select></label>
      <label>결과물 명칭<input id="editDeliverableName" value="${item.name}" /></label>
      <label>기준공수(H)<input id="editDeliverableHours" type="number" min="0.1" step="0.1" value="${item.standardHours}" /></label>
      <label>평균 작업일(영업일)<input id="editDeliverableSlaDays" type="number" min="0" step="1" value="${item.slaEnabled ? Number(item.slaDays || 0) : ""}" placeholder="미설정" /></label>
      <label>환산 기준 결과물<select id="editDeliverableTarget">${optionList(targetNames, item.conversionTarget)}</select></label>`;
  } else if (edit.type === "account") {
    const item = accounts[edit.index];
    const roleOptions = Object.entries(accountRoleLabels).map(([value, label]) => `<option value="${value}" ${item.role === value ? "selected" : ""}>${label}</option>`).join("");
    $("#recordEditModalTitle").textContent = "계정 권한 수정";
    $("#recordEditModalDescription").textContent = "계정의 접근 권한만 변경합니다. 직원과 팀 정보는 회사 업무 그룹에서 관리합니다.";
    $("#recordEditModalBody").innerHTML = `
      <label>계정명<input id="editAccountId" value="${item.id}" disabled /></label>
      <label>권한<select id="editAccountRole">${roleOptions}</select></label>`;
  }
}

function renderProjectHistoryModal() {
  const modal = $("#projectHistoryModal");
  if (!modal) return;
  const project = projectConfigs.find((item) => item.project === state.projectHistoryProject);
  modal.classList.toggle("active", !!project);
  modal.setAttribute("aria-hidden", project ? "false" : "true");
  if (!project) return;

  const histories = combinedProjectHistories(project.project);
  const totalPages = Math.max(1, Math.ceil(histories.length / 10));
  state.projectHistoryPage = Math.min(Math.max(state.projectHistoryPage, 1), totalPages);
  const start = (state.projectHistoryPage - 1) * 10;
  const rows = histories.slice(start, start + 10);
  const setting = projectWorkSettings.find((item) => item.project === project.project);
  const assignedTeam = projectSettingTeams(setting).join(", ") || "미지정";
  const currentMembers = assignedProjectPeople(project.project);

  $("#projectHistoryModalTitle").textContent = `${project.project} 변경이력`;
  $("#projectHistoryModalDescription").textContent = "구성, 팀 매칭, 담당자, 구성원 변경을 최신순으로 표시합니다.";
  $("#projectHistorySummary").innerHTML = `
    <div class="mini"><b>${project.status === "closed" ? "종료" : "진행"}</b><span>프로젝트 상태</span></div>
    <div class="mini"><b>${assignedTeam}</b><span>진행 팀</span></div>
    <div class="mini"><b>${currentMembers.length}명</b><span>현재 투입 인원</span></div>
    <div class="mini"><b>${histories.length}건</b><span>전체 변경이력</span></div>`;
  $("#projectHistoryModalRows").innerHTML = rows.map((entry) => `<tr><td>${entry.date}</td><td><span class="pill">${entry.category}</span></td><td>${entry.field}</td><td>${entry.before}</td><td>${entry.after}</td><td>${entry.reason}</td></tr>`).join("") || `<tr><td colspan="6">등록된 변경이력이 없습니다.</td></tr>`;
  $("#historyPageStatus").textContent = `${state.projectHistoryPage} / ${totalPages} · 총 ${histories.length}건`;
  $("#historyPrevPage").disabled = state.projectHistoryPage <= 1;
  $("#historyNextPage").disabled = state.projectHistoryPage >= totalPages;
}

function updateAdminFilterVisibility() {
  const showMemberFilters = state.mode === "admin" && state.view === "companyGroup";
  $(".admin-filter").classList.toggle("active", showMemberFilters);
  const hideOperatorFilters = state.mode === "admin" || ["standard", "workResourceCreate", "workResources", "myWork", "daily"].includes(state.view);
  $(".operator-filter")?.classList.toggle("hidden", hideOperatorFilters);
  const healthView = state.mode === "operator" && state.view === "health";
  $("#clientFilterLabel")?.classList.toggle("hidden", healthView);
  $("#projectFilterLabel")?.classList.toggle("hidden", healthView);
}

function profitabilityAsOfDate() {
  if (state.month || state.year !== "전체") return selectedPeriodBounds().end;
  return localDateString();
}

function monthEndAfter(startDate, monthNumber) {
  if (!startDate || !monthNumber) return "";
  const [year, month] = startDate.slice(0, 7).split("-").map(Number);
  const end = new Date(year, month - 1 + Number(monthNumber), 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}

function projectProfitability(config, contract, cumulativeHours = 0) {
  const asOf = profitabilityAsOfDate();
  const direction = config?.direction || "운영";
  const contractMonths = monthsBetween(contract.startDate, contract.endDate);
  const elapsedMonths = contract.startDate && asOf >= contract.startDate ? monthsBetween(contract.startDate, asOf) : 0;
  const inputPeople = Number(contract.inputPeople || 0);
  const contractPeople = Number(contract.contractPeople || 0);
  const monthlyPersonCost = Number(contract.monthlyPersonCost || 0);
  const monthlyBurn = inputPeople * monthlyPersonCost;
  const totalRevenue = Number(contract.total || (contract.monthly * contractMonths) || 0);
  const monthlyRevenue = Number(contract.monthly || (contractMonths ? totalRevenue / contractMonths : 0));
  const personMonthlyRate = calculatedUnitPrice(monthlyRevenue, inputPeople);
  const staffingDifference = contractPeople - inputPeople;
  const monthlyStaffingBenefit = staffingDifference * personMonthlyRate;
  const contractStaffingBenefit = monthlyStaffingBenefit * contractMonths;
  const recognizedMonths = contractMonths ? Math.min(elapsedMonths, contractMonths) : elapsedMonths;
  const recognizedRevenue = Math.min(totalRevenue || Number.POSITIVE_INFINITY, monthlyRevenue * recognizedMonths);
  const accumulatedCost = monthlyBurn * elapsedMonths;
  const balance = Number.isFinite(recognizedRevenue) ? recognizedRevenue - accumulatedCost : 0;
  const expectedCost = monthlyBurn * contractMonths;
  const expectedBalance = totalRevenue - expectedCost;
  const capacityEnd = contract.startDate && asOf >= contract.startDate ? asOf : contract.startDate;
  const cumulativeCapacityHours = inputPeople * workingDaysBetween(contract.startDate, capacityEnd) * DAILY_PRODUCTIVE_HOURS;
  let lossThresholdMonths = null;
  if (monthlyBurn > 0 && direction === "이커머스" && monthlyRevenue > 0 && monthlyBurn > monthlyRevenue) {
    lossThresholdMonths = 1;
  } else if (monthlyBurn > 0 && totalRevenue > 0) {
    const calculatedThreshold = Math.floor(totalRevenue / monthlyBurn) + 1;
    lossThresholdMonths = !contractMonths || calculatedThreshold <= contractMonths ? calculatedThreshold : null;
  }
  const lossDate = monthEndAfter(contract.startDate, lossThresholdMonths);
  const missing = [];
  if (!contract.startDate) missing.push("계약 시작일");
  if (!totalRevenue) missing.push("총 계약금");
  if (!monthlyPersonCost) missing.push("1인 월 원가");
  if (!inputPeople) missing.push("투입 인원");
  const reasons = [];
  if (inputPeople > contractPeople && contractPeople > 0) reasons.push(`투입 인원이 계약보다 ${inputPeople - contractPeople}명 많음`);
  if (staffingDifference > 0) reasons.push(`계약 인원보다 ${staffingDifference}명 적게 투입해 매월 ${money(monthlyStaffingBenefit)}의 인원 운영차익 발생`);
  if (contractMonths && elapsedMonths > contractMonths) reasons.push(`계약기간을 ${elapsedMonths - contractMonths}개월 초과`);
  if (direction === "이커머스" && monthlyRevenue > 0 && monthlyBurn > monthlyRevenue) reasons.push(`월 인력원가가 월 계약금보다 ${money(monthlyBurn - monthlyRevenue)} 큼`);
  if (Number.isFinite(recognizedRevenue) && accumulatedCost > recognizedRevenue) reasons.push(`누적 인력원가가 수익 기준보다 ${money(accumulatedCost - recognizedRevenue)} 초과`);
  if (cumulativeCapacityHours > 0 && cumulativeHours > cumulativeCapacityHours) reasons.push(`수행 공수가 투입 기준보다 ${formatNumber(cumulativeHours - cumulativeCapacityHours)}H 초과`);
  let status = "normal";
  if (missing.length) status = "unknown";
  else if (balance < 0) status = "loss";
  else if ((lossThresholdMonths && lossThresholdMonths - elapsedMonths <= 2) || expectedBalance < 0) status = "warning";
  const statusLabel = { unknown: "판정 대기", normal: "정상 구간", warning: "손해 임박", loss: "적자 단계" }[status];
  return {
    direction,
    asOf,
    contractMonths,
    elapsedMonths,
    recognizedMonths,
    monthlyBurn,
    monthlyRevenue,
    personMonthlyRate,
    staffingDifference,
    monthlyStaffingBenefit,
    contractStaffingBenefit,
    recognizedRevenue: Number.isFinite(recognizedRevenue) ? recognizedRevenue : 0,
    accumulatedCost,
    balance,
    expectedCost,
    expectedBalance,
    lossThresholdMonths,
    lossDate,
    missing,
    reasons,
    status,
    statusLabel,
  };
}

function projectMemberChangeEvents(projectName) {
  return combinedProjectHistories(projectName)
    .filter((entry) => entry.category === "구성원" || entry.field === "구성원")
    .map((entry) => {
      const before = String(entry.before || "");
      const after = String(entry.after || "");
      let delta = 0;
      if (/합류|재직|복구/.test(after) && /미포함|이탈|퇴사/.test(before)) delta = 1;
      else if (/이탈|퇴사/.test(after)) delta = -1;
      return {
        date: historyDate(entry),
        delta,
        label: `${before || "-"} → ${after || "-"}`,
        reason: entry.reason || "구성원 변경",
      };
    })
    .filter((entry) => entry.delta)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function profitabilityHistoryRows(projectName, kind) {
  const memberFields = /구성원|진행 팀|개별 인원|관리 인원|투입 인원/;
  const contractFields = /계약 시작일|계약 종료일|계약기간|프로젝트 상태|확장 계약 기준/;
  return combinedProjectHistories(projectName)
    .filter((entry) => kind === "people"
      ? entry.category === "구성원" || memberFields.test(String(entry.field || ""))
      : contractFields.test(String(entry.field || "")))
    .sort((a, b) => historyDate(b).localeCompare(historyDate(a)));
}

function projectHeadcountAt(projectName, dateKey) {
  let count = assignedProjectWorkers(projectName).length;
  projectMemberChangeEvents(projectName)
    .filter((event) => event.date > dateKey)
    .forEach((event) => { count -= event.delta; });
  const namedManagers = assignedProjectManagers(projectName);
  const managementCount = namedManagers.length || Number(projectConfig(projectName)?.managementPeople || 0);
  return Math.max(0, count) + managementCount;
}

function monthKeysBetweenDates(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return [];
  const [startYear, startMonth] = startDate.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = endDate.slice(0, 7).split("-").map(Number);
  const keys = [];
  const cursor = new Date(startYear, startMonth - 1, 1);
  const limit = new Date(endYear, endMonth - 1, 1);
  while (cursor <= limit) {
    keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

function taskActualWorkerIdentities(task) {
  const identities = new Set();
  const addWorker = (employeeId, employeeName) => {
    const name = String(employeeName || "").trim();
    const matchedMember = name ? members.find((member) => member.name === name) : null;
    const identity = String(employeeId || matchedMember?._id || name).trim();
    if (identity) identities.add(identity);
  };
  addWorker(task.ownerEmployeeId, task.owner);
  const details = Array.isArray(task.outputDetails) ? task.outputDetails : [];
  details.forEach((detail) => addWorker(detail.ownerEmployeeId, detail.owner));
  return [...identities];
}
function projectManagerIdentities(projectName) {
  return assignedProjectManagers(projectName).map((name) => {
    const member = members.find((item) => item.name === name);
    return String(member?._id || name);
  }).filter(Boolean);
}

function projectMonthlyProfitRows(config, contract, asOf = profitabilityAsOfDate()) {
  if (!contract.startDate || asOf < contract.startDate) return [];
  const events = projectMemberChangeEvents(config.project);
  const contractMonths = monthsBetween(contract.startDate, contract.endDate);
  const fixedMonthlyRevenue = contractMonths ? Number(contract.total || 0) / contractMonths : 0;
  const recurringMonthlyRevenue = Number(contract.monthly || fixedMonthlyRevenue || 0);
  const totalCap = Number(contract.total || 0);
  let recognizedRevenue = 0;
  return monthKeysBetweenDates(contract.startDate, asOf).map((monthKey) => {
    const [year, month] = monthKey.split("-").map(Number);
    const monthStart = `${monthKey}-01`;
    const monthEnd = `${monthKey}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
    const inContract = (!contract.endDate || monthStart <= contract.endDate) && monthEnd >= contract.startDate;
    const baseRevenue = inContract ? (config.direction === "이커머스" ? recurringMonthlyRevenue : fixedMonthlyRevenue) : 0;
    const revenue = totalCap ? Math.max(0, Math.min(baseRevenue, totalCap - recognizedRevenue)) : baseRevenue;
    recognizedRevenue += revenue;
    const people = projectHeadcountAt(config.project, monthEnd);
    const taskRows = tasks.filter((task) => task.project === config.project && taskCompletionDate(task).startsWith(monthKey));
    const actualWorkerIds = new Set([
      ...taskRows.flatMap((task) => taskActualWorkerIdentities(task)),
      ...projectManagerIdentities(config.project),
    ]);
    const actualPeople = actualWorkerIds.size;
    const cost = people * Number(contract.monthlyPersonCost || 0);
    const actualCost = actualPeople * Number(contract.monthlyPersonCost || 0);
    const personMonthlyRate = calculatedUnitPrice(recurringMonthlyRevenue, Number(contract.contractPeople || 0));
    const staffingBenefit = (Number(contract.contractPeople || 0) - people) * personMonthlyRate;
    const actualStaffingBenefit = (Number(contract.contractPeople || 0) - actualPeople) * personMonthlyRate;
    const changes = events.filter((event) => event.date.startsWith(monthKey));
    return {
      month: monthKey,
      year: String(year),
      people,
      configuredPeople: people,
      actualPeople,
      revenue,
      cost,
      configuredCost: cost,
      actualCost,
      profit: revenue - cost,
      configuredProfit: revenue - cost,
      actualProfit: revenue - actualCost,
      staffingBenefit,
      actualStaffingBenefit,
      taskCount: taskRows.length,
      hours: taskRows.reduce((sum, task) => sum + Number(task.standardHours || 0), 0),
      changes,
    };
  });
}

function projectAnnualProfitRows(config, contract, asOf = profitabilityAsOfDate()) {
  const grouped = new Map();
  projectMonthlyProfitRows(config, contract, asOf).forEach((row) => {
    const current = grouped.get(row.year) || { year: row.year, months: 0, peopleTotal: 0, revenue: 0, cost: 0, profit: 0, staffingBenefit: 0, taskCount: 0, hours: 0, changes: 0 };
    current.months += 1;
    current.peopleTotal += row.people;
    current.revenue += row.revenue;
    current.cost += row.cost;
    current.profit += row.profit;
    current.staffingBenefit += row.staffingBenefit;
    current.taskCount += row.taskCount;
    current.hours += row.hours;
    current.changes += row.changes.length;
    grouped.set(row.year, current);
  });
  return [...grouped.values()].map((row) => ({
    ...row,
    averagePeople: row.months ? row.peopleTotal / row.months : 0,
    marginRate: row.revenue ? Math.round((row.profit / row.revenue) * 100) : 0,
  })).sort((a, b) => b.year.localeCompare(a.year));
}

function projectHealthMonthlyRows(projectName) {
  const config = projectConfig(projectName);
  const projectRows = tasks.filter((task) => task.project === projectName && accessibleProjectNames().has(task.project));
  const taskMonths = projectRows.map((task) => taskCompletionDate(task).slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month)).sort();
  const startDate = config?.startDate || (taskMonths[0] ? `${taskMonths[0]}-01` : "");
  const today = localDateString();
  const lastTaskMonth = taskMonths.at(-1);
  let endDate = config?.endDate && config.endDate < today ? config.endDate : today;
  if (lastTaskMonth && `${lastTaskMonth}-28` > endDate) endDate = `${lastTaskMonth}-28`;
  if (!startDate || startDate > endDate) return [];
  return monthKeysBetweenDates(startDate, endDate).map((month) => {
    const monthRows = projectRows.filter((task) => taskCompletionDate(task).startsWith(month));
    if (!monthRows.length) return null;
    const data = summarize(monthRows);
    const actualPeople = new Set([
      ...monthRows.flatMap((task) => taskActualWorkerIdentities(task)),
      ...projectManagerIdentities(projectName),
    ]).size;
    if (!actualPeople) return null;
    const [year, monthNumber] = month.split("-").map(Number);
    const monthEnd = `${month}-${String(new Date(year, monthNumber, 0).getDate()).padStart(2, "0")}`;
    return {
      month,
      score: healthScore({ rows: monthRows, data }),
      urgentRate: data.urgentRate,
      revisionRate: data.revisionRate,
      delayRate: data.delayRate,
      people: projectHeadcountAt(projectName, monthEnd),
      configuredPeople: projectHeadcountAt(projectName, monthEnd),
      actualPeople,
      taskCount: data.total,
      hours: data.standardHours,
    };
  }).filter(Boolean);
}

function trendLineChart(title, description, rows, series, options = {}) {
  if (!rows.length) return `<section class="monthly-trend-chart"><header><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></div></header><p class="empty-text">표시할 월별 데이터가 없습니다.</p></section>`;
  const width = Math.max(780, rows.length * 72);
  const height = 292;
  const plot = { left: 58, right: width - 24, top: 26, bottom: 226 };
  const values = rows.flatMap((row) => series.map((item) => Number(row[item.key] || 0)));
  let minValue = options.minValue ?? Math.min(0, ...values);
  let maxValue = options.maxValue ?? Math.max(0, ...values);
  if (maxValue === minValue) maxValue = minValue + 1;
  const range = maxValue - minValue;
  const xAt = (index) => plot.left + (rows.length === 1 ? (plot.right - plot.left) / 2 : index * (plot.right - plot.left) / (rows.length - 1));
  const yAt = (value) => plot.bottom - ((Number(value || 0) - minValue) / range) * (plot.bottom - plot.top);
  const formatAxis = options.formatAxis || ((value) => formatNumber(value, 0));
  const formatValue = options.formatValue || ((value) => formatNumber(value, 1));
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = maxValue - range * ratio;
    const y = plot.top + (plot.bottom - plot.top) * ratio;
    return `<line x1="${plot.left}" y1="${y}" x2="${plot.right}" y2="${y}" class="trend-grid-line"/><text x="${plot.left - 9}" y="${y + 4}" text-anchor="end" class="trend-axis-label">${escapeHtml(formatAxis(value))}</text>`;
  }).join("");
  const monthStep = Math.max(1, Math.ceil(rows.length / 12));
  const monthLabels = rows.map((row, index) => index % monthStep === 0 || index === rows.length - 1
    ? `<text x="${xAt(index)}" y="252" text-anchor="middle" class="trend-month-label">${escapeHtml(row.month.slice(2))}</text>`
    : "").join("");
  const lines = series.map((item) => {
    const points = rows.map((row, index) => `${xAt(index)},${yAt(row[item.key])}`).join(" ");
    const dots = rows.map((row, index) => `<circle cx="${xAt(index)}" cy="${yAt(row[item.key])}" r="4" fill="${item.color}"><title>${escapeHtml(`${row.month} · ${item.label} ${formatValue(row[item.key])}`)}</title></circle>`).join("");
    return `<polyline points="${points}" fill="none" stroke="${item.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }).join("");
  const zeroY = minValue < 0 && maxValue > 0 ? `<line x1="${plot.left}" y1="${yAt(0)}" x2="${plot.right}" y2="${yAt(0)}" class="trend-zero-line"/>` : "";
  const legend = series.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`).join("");
  return `<section class="monthly-trend-chart"><header><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></div><div class="trend-legend">${legend}</div></header><div class="trend-svg-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} 월별 그래프" style="min-width:${width}px">${gridLines}${zeroY}${lines}${monthLabels}</svg></div></section>`;
}

function monthlyTrendTable(rows, columns) {
  return `<div class="table-wrap trend-data-table"><table><thead><tr><th>월</th>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead><tbody>${rows.slice().reverse().map((row) => `<tr><td><strong>${row.month}</strong></td>${columns.map((column) => `<td>${column.format ? column.format(row[column.key], row) : formatNumber(row[column.key], 1)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function projectProfitViewModel(projectName, items) {
  const summary = projectSummaries(items).find((item) => item.project === projectName);
  if (!summary) return null;
  const contract = summary.contract;
  const config = projectConfig(projectName);
  const periodEnd = selectedPeriodBounds().end;
  const contractTaskRows = tasks
    .filter((task) => task.project === projectName && taskCompletionDate(task) && taskCompletionDate(task) <= periodEnd && (!contract.startDate || taskCompletionDate(task) >= contract.startDate) && (!contract.endDate || taskCompletionDate(task) <= contract.endDate));
  const cumulativeHours = contractTaskRows
    .reduce((sum, task) => sum + Number(task.standardHours || 0), 0);
  const activeTaskMonths = new Set(contractTaskRows.map((task) => taskCompletionDate(task).slice(0, 7)).filter((month) => /^\d{4}-\d{2}$/.test(month))).size;
  const contractMonths = monthsBetween(contract.startDate, contract.endDate);
  const requiredContractHours = Number(contract.inputPeople || 0) * projectContractWorkingDays(config) * DAILY_PRODUCTIVE_HOURS;
  const requiredMonthlyHours = contractMonths ? requiredContractHours / contractMonths : 0;
  const currentMonthlyAverageHours = activeTaskMonths ? cumulativeHours / activeTaskMonths : 0;
  const profitability = projectProfitability(config, contract, cumulativeHours);
  const monthlyRows = projectMonthlyProfitRows(config, contract);
  const annualRows = projectAnnualProfitRows(config, contract);
  const currentAnnual = annualRows.find((row) => row.year === profitability.asOf.slice(0, 4)) || annualRows[0];
  const lossThreshold = profitability.lossThresholdMonths
    ? `${profitability.lossThresholdMonths}개월 차${profitability.lossDate ? ` · ${profitability.lossDate.slice(0, 7)}` : ""}`
    : profitability.missing.length ? "계산 불가" : "계약기간 내 없음";
  const detail = profitability.status === "unknown"
    ? `${profitability.missing.join(", ")} 정보를 입력하면 손익 전환 시점을 계산합니다.`
    : profitability.status === "loss"
      ? `누적 투입원가가 수익 기준을 ${money(Math.abs(profitability.balance))} 초과했습니다.`
      : profitability.status === "warning"
        ? `${lossThreshold}부터 손해 구간으로 진입할 가능성이 높습니다.`
        : `현재 기준 ${money(Math.max(0, profitability.balance))}의 계약 여력이 남아 있습니다.`;
  return {
    summary, contract, config, profitability, monthlyRows, annualRows, currentAnnual, cumulativeHours,
    activeTaskMonths, contractMonths, requiredContractHours, requiredMonthlyHours, currentMonthlyAverageHours, lossThreshold, detail,
  };
}

function contractGroupRootId(config) {
  if (!config || config.direction === "이커머스") return config?._id || config?.project || "";
  const visited = new Set();
  let current = config;
  while (current?.parentProjectId && !visited.has(current.parentProjectId)) {
    visited.add(current.parentProjectId);
    current = projectConfigs.find((project) => project._id === current.parentProjectId) || current;
    if (!current.parentProjectId) break;
  }
  return current?._id || config._id || config.project;
}

function linkedContractConfigs(projectName) {
  const config = projectConfig(projectName);
  if (!config) return [];
  const rootId = contractGroupRootId(config);
  return projectConfigs
    .filter((project) => project.client === config.client && contractGroupRootId(project) === rootId)
    .sort((a, b) => String(a.startDate || "").localeCompare(String(b.startDate || "")));
}

function profitSummaryCard(summary, items) {
    if (isImageEffortSample) {
      return `<article class="profit-summary-card unknown"><div class="profit-summary-head"><div><h3>${summary.project}</h3><p>${summary.data.owners}명 · 작업 폴더 ${summary.data.total}개</p></div><span class="pill warn">계약정보 미설정</span></div></article>`;
    }
    const model = projectProfitViewModel(summary.project, items);
    if (!model) return "";
    const { contract, profitability, currentAnnual, lossThreshold, detail } = model;
    const statusClass = profitability.status === "loss" ? "danger" : profitability.status === "warning" || profitability.status === "unknown" ? "warn" : "good";
    const annualProfit = currentAnnual ? `${currentAnnual.profit < 0 ? "-" : ""}${money(Math.abs(currentAnnual.profit))}` : "계산 불가";
    return `<article class="profit-summary-card ${profitability.status}">
      <div class="profit-summary-head"><div><h3>${summary.project}</h3><p>${summary.client} · ${contract.startDate || "-"} ~ ${contract.endDate || "-"}</p></div><span class="pill ${statusClass}">${profitability.statusLabel}</span></div>
      <div class="profit-summary-metrics"><div><b class="${profitability.balance < 0 ? "negative-value" : ""}">${profitability.balance < 0 ? "-" : ""}${money(Math.abs(profitability.balance))}</b><span>현재 계약 여력</span></div><div><b class="${profitability.monthlyStaffingBenefit < 0 ? "negative-value" : ""}">${profitability.monthlyStaffingBenefit < 0 ? "-" : ""}${money(Math.abs(profitability.monthlyStaffingBenefit))}</b><span>월 인원 운영차익</span></div><div><b>${lossThreshold}</b><span>손해 구간 진입 예상</span></div><div><b class="${currentAnnual?.profit < 0 ? "negative-value" : ""}">${annualProfit}</b><span>${currentAnnual?.year || profitability.asOf.slice(0, 4)}년 손익</span></div></div>
      <div class="profit-summary-footer"><span>${escapeHtml(detail)}</span><div class="row-actions"><button class="secondary small operator-detail-open" data-detail-type="profitTrend" data-detail-value="${escapeHtml(summary.project)}" type="button">월별 변천사</button><button class="secondary small operator-detail-open" data-detail-type="profitDetail" data-detail-value="${escapeHtml(summary.project)}" type="button">상세보기</button></div></div>
    </article>`;
}

function renderProfit(items) {
  const summaries = projectSummaries(items);
  const groups = new Map();
  summaries.forEach((summary) => {
    const config = projectConfig(summary.project);
    const key = `${summary.client}::${contractGroupRootId(config)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(summary);
  });
  $("#profitList").innerHTML = [...groups.values()].map((group) => {
    const configs = group.map((summary) => projectConfig(summary.project)).filter(Boolean);
    const linked = configs.length > 1 && configs.some((config) => config.direction !== "이커머스");
    const cards = group.sort((a, b) => String(projectConfig(a.project)?.startDate || "").localeCompare(String(projectConfig(b.project)?.startDate || ""))).map((summary) => profitSummaryCard(summary, items)).join("");
    if (!linked) return cards;
    return `<section class="profit-contract-group"><header><div><strong>${escapeHtml(group[0].client)} · 연결 계약</strong><span>기본 계약과 추가·확장 계약 ${group.length}건을 묶어 표시합니다.</span></div><span class="count-pill">${group.length}건</span></header>${cards}</section>`;
  }).join("");
}

function healthScore(p) {
  const s = p.data;
  if (isImageEffortSample) return s.unmatchedRate;
  return Math.min(100, Math.round(s.urgentRate * 0.2 + s.revisionRate * 0.2 + pct(p.rows.filter((t) => t.approvalDelay).length, s.total) * 0.15 + pct(p.rows.filter((t) => t.night).length, s.total) * 0.15 + s.delayRate * 0.2 + Math.max(s.delta, 0) * 0.1));
}
function monthsBetween(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(`${start.slice(0, 7)}-01T00:00:00`);
  const endDate = new Date(`${end.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(1, (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth() + 1);
}
function clampScore(value, max = 100) {
  return Math.max(0, Math.min(max, Math.round(Number(value || 0))));
}
function utilizationScore(loadRate) {
  const rate = Number(loadRate || 0);
  if (rate < 40) return clampScore((rate / 40) * 55);
  if (rate < 70) return clampScore(55 + ((rate - 40) / 30) * 20);
  if (rate < 100) return clampScore(75 + ((rate - 70) / 30) * 15);
  if (rate < 120) return clampScore(90 + ((rate - 100) / 20) * 7);
  return 97;
}
function reviewFilteredTasks() {
  return tasks.filter((task) => {
    const year = taskCompletionDate(task).slice(0, 4) || "";
    const month = taskCompletionDate(task).slice(5, 7) || "";
    return (state.reviewProject === "전체" || task.project === state.reviewProject)
      && (state.reviewYear === "전체" || year === state.reviewYear)
      && (state.reviewMonth === "전체" || month === state.reviewMonth);
  });
}
function reviewFilterMonths() {
  const rows = tasks.filter((task) => state.reviewYear === "전체" || taskCompletionDate(task).slice(0, 4) === state.reviewYear);
  const evidenceDates = EmployeeReviewManagement.periods().filter(date => state.reviewYear === "전체" || date.slice(0, 4) === state.reviewYear);
  return [...new Set([...rows.map((task) => taskCompletionDate(task).slice(5, 7)), ...evidenceDates.map(date => date.slice(5, 7))].filter(Boolean))].sort();
}
function reviewContributionBonus(projects, durationMonths, avgHealthRisk) {
  if (projects.length < 2) return 0;
  return Math.min(30, (projects.length - 1) * 5);
}
function reviewRelativeBonus(loadRate, teamAverageRate) {
  const rate = Number(loadRate || 0);
  const teamRate = Number(teamAverageRate || 0);
  if (rate < 120) return 0;
  if (teamRate >= 115 && rate <= teamRate + 10) return 0;
  if (rate < teamRate + 15) return 0;
  return clampScore((rate - teamRate - 10) / 8, 5);
}
function reviewGrade(totalScore, taskCount, hours) {
  if (taskCount < 5 || hours < 8) return "평가 보류";
  if (totalScore >= 100) return "S";
  if (totalScore >= 80) return "A";
  if (totalScore >= 65) return "B";
  if (totalScore >= 50) return "C";
  return "D";
}
function gradeClass(grade) {
  if (["S", "A"].includes(grade)) return "good";
  if (grade === "B" || grade === "평가 보류") return "warn";
  return "danger";
}
function memberStandardHours(task, member) {
  const details = assignedOutputDetails(task, member);
  if (details.length) {
    const detailHours = details.reduce((sum, detail) => {
      const rule = deliverableRuleFor(task.project, detail.name);
      const unitHours = Number(detail.standardHoursPerUnit || rule?.standardHours || 0);
      return sum + Number(detail.count || 0) * unitHours;
    }, 0);
    if (detailHours > 0) return outputEffortHours(detailHours, task.photoType);
  }
  return task.ownerEmployeeId === member._id || task.owner === member.name ? Number(task.standardHours || 0) : 0;
}
function memberResourceHours(task, member) {
  if (taskOutputDetails(task).some((detail) => detail.importSubNumber !== undefined)) {
    return assignedOutputDetails(task, member).reduce((sum, detail) => sum + outputResourceHours(task, detail), 0);
  }
  const standardHours = memberStandardHours(task, member);
  return Math.max(0, standardHours * (1 + normalizeEffortBufferPct(task.effortBufferPct) / 100));
}
function employeeReviewRows() {
  const keyword = state.reviewSearch.trim().toLowerCase();
  const reviewTasks = reviewFilteredTasks();
  const activeMembers = members.filter((member) => {
    if (!isWorkforceMember(member, reviewTasks)) return false;
    return !keyword || [member.name, member.team, member.subgroup, member.position, member.grade]
      .some((value) => String(value || "").toLowerCase().includes(keyword));
  });
  const allProjectSummaries = projectConfigs.map((project) => {
    const rows = reviewTasks.filter((task) => task.project === project.project);
    return { project: project.project, client: project.client, rows, data: summarize(rows), contract: projectContract(project.project), score: healthScore({ rows, data: summarize(rows) }) };
  });
  const projectHealth = new Map(allProjectSummaries.map((project) => [project.project, project.score]));
  const baseRows = activeMembers.map((member) => {
    const rows = reviewTasks.filter((task) => taskAssignedToMember(task, member));
    const taskCount = rows.length;
    const hours = rows.reduce((sum, task) => sum + memberStandardHours(task, member), 0);
    const months = [...new Set(rows.map((task) => taskCompletionDate(task).slice(0, 7)).filter(Boolean))].sort();
    const absoluteDailyHours = absoluteDailyHoursForRows(rows, state.reviewProject);
    const capacity = memberCapacityForMonths(member, months, absoluteDailyHours);
    const fallbackCapacity = memberCapacityForMonths(member, selectedPeriodBounds().months, absoluteDailyHours);
    const loadRate = pct(hours, capacity || fallbackCapacity || 1);
    const projectLoad = productivityLoadForTasks(rows, "project", member);
    const companyLoad = productivityLoadForTasks(rows, "company", member);
    const productivityBase = Math.round(utilizationScore(loadRate) * 0.35);
    const summary = summarize(rows);
    const companyIssueDelayRate = pct(rows.filter((task) => task.delayed && normalizeSlaResponsibility(task.slaResponsibility) === "우리측").length, taskCount);
    const onTimeRaw = 100 - companyIssueDelayRate;
    const slaRaw = summary.slaAssessed ? summary.slaRate : summary.completionRate || 75;
    const stabilityRaw = onTimeRaw * 0.65 + slaRaw * 0.35;
    const stability = Math.round(clampScore(stabilityRaw) * 0.20);
    const qualityRaw = 100 - summary.revisionRate * 0.65 - summary.rejectedRate * 0.75;
    const quality = Math.round(clampScore(qualityRaw) * 0.20);
    const projects = [...new Set(rows.map((task) => task.project))];
    const firstDate = rows.map((task) => taskCompletionDate(task)).filter(Boolean).sort()[0] || "";
    const lastDate = rows.map((task) => taskCompletionDate(task)).filter(Boolean).sort().at(-1) || "";
    const durationMonths = monthsBetween(firstDate, lastDate);
    const avgHealthRisk = projects.length ? projects.reduce((sum, project) => sum + Number(projectHealth.get(project) || 0), 0) / projects.length : 50;
    const contribution = reviewContributionBonus(projects, durationMonths, avgHealthRisk);
    const activeProjectShare = pct(projects.filter((project) => projectConfig(project)?.status !== "closed").length, projects.length || 1);
    const operationRaw = clampScore((100 - avgHealthRisk) * 0.55 + activeProjectShare * 0.25 + Math.min(100, durationMonths * 6) * 0.2);
    const operation = Math.round(operationRaw * 0.10);
    const topProject = Object.entries(groupBy(rows, "project")).sort((a, b) => b[1].length - a[1].length)[0]?.[0] || "배정 데이터 없음";
    return {
      member,
      rows,
      taskCount,
      hours,
      absoluteDailyHours,
      loadRate,
      projectLoad,
      companyLoad,
      projects,
      durationMonths,
      productivityBase,
      productivity: productivityBase,
      companyIssueDelayRate,
      stability,
      quality,
      contribution,
      operation,
      topProject,
      summary,
    };
  });
  const teamAverages = new Map();
  teams.forEach((team) => {
    const rows = baseRows.filter((row) => row.member.team === team.name && row.taskCount >= 5);
    const avg = rows.length ? rows.reduce((sum, row) => sum + row.loadRate, 0) / rows.length : 0;
    teamAverages.set(team.name, avg);
  });
  return baseRows.map((row) => {
    const teamAverageRate = teamAverages.get(row.member.team) || 0;
    const relativeBonus = reviewRelativeBonus(row.loadRate, teamAverageRate);
    const productivity = row.productivityBase;
    const pureScore = Math.min(85, productivity + row.stability + row.quality + row.operation);
    const baseTotalScore = Math.min(120, pureScore + relativeBonus + row.contribution);
    const reviewProjectId = state.reviewProject === "전체" ? "" : projectConfig(state.reviewProject)?._id || "__missing__";
    const manualAdjustment = EmployeeReviewManagement.adjustment(row.member._id, reviewProjectId, state.reviewYear, state.reviewMonth);
    const totalScore = EmployeeReviewManagement.finalScore(baseTotalScore, manualAdjustment);
    const grade = reviewGrade(totalScore, row.taskCount, row.hours);
    return {
      ...row,
      teamAverageRate,
      relativeBonus,
      productivity,
      pureScore,
      baseTotalScore,
      manualAdjustment,
      totalScore,
      grade,
      reason: `${row.topProject} · 기존 ${formatNumber(baseTotalScore, 2)}점 · 관리자 가감 ${formatNumber(manualAdjustment, 2)}점${EmployeeReviewManagement.isAvailable() ? "" : " · 가감점 미확인(기존 점수 표시)"} · 순수 ${pureScore}점 · 누적 ${effortLabel(row.hours)} · 업무 ${row.taskCount}건 · 절대 ${row.loadRate}% / 프로젝트 ${row.projectLoad.rate}% / 회사 ${row.companyLoad.rate}% · 우리측 지연 ${row.companyIssueDelayRate}% · 재작업 ${row.summary.revisionRate}%`,
    };
  }).sort((a, b) => {
    const holdA = a.grade === "평가 보류";
    const holdB = b.grade === "평가 보류";
    if (holdA !== holdB) return holdA ? 1 : -1;
    return b.totalScore - a.totalScore || b.hours - a.hours;
  });
}
function renderEmployeeReview() {
  if (!$("#employeeReviewRows")) return;
  const projects = ["전체", ...new Set([...projectConfigs.map((project) => project.project), ...tasks.map((task) => task.project)].filter(Boolean))];
  const years = ["전체", ...new Set([...tasks.map((task) => taskCompletionDate(task).slice(0, 4)), ...EmployeeReviewManagement.periods().map(date => date.slice(0, 4))].filter(Boolean).sort())];
  const months = ["전체", ...reviewFilterMonths()];
  if (!projects.includes(state.reviewProject)) state.reviewProject = "전체";
  if (!years.includes(state.reviewYear)) state.reviewYear = "전체";
  if (!months.includes(state.reviewMonth)) state.reviewMonth = "전체";
  if ($("#reviewSearchInput")) $("#reviewSearchInput").value = state.reviewSearch;
  $("#reviewProjectFilter").innerHTML = optionList(projects, state.reviewProject);
  $("#reviewYearFilter").innerHTML = optionList(years, state.reviewYear);
  $("#reviewMonthFilter").innerHTML = optionList(months.map((month) => month === "전체" ? month : `${month}월`), state.reviewMonth === "전체" ? "전체" : `${state.reviewMonth}월`);
  const rows = employeeReviewRows();
  const validRows = rows.filter((row) => row.grade !== "평가 보류");
  const averageScore = validRows.length ? Math.round(validRows.reduce((sum, row) => sum + row.totalScore, 0) / validRows.length) : 0;
  $("#reviewPeopleCount").textContent = `${rows.length}명`;
  $("#reviewAverageScore").textContent = `${averageScore}점`;
  $("#reviewTopPeople").textContent = `${rows.filter((row) => ["S", "A"].includes(row.grade)).length}명`;
  $("#reviewRiskPeople").textContent = `${rows.filter((row) => ["C", "D"].includes(row.grade)).length}명`;
  $("#reviewHoldPeople").textContent = `${rows.filter((row) => row.grade === "평가 보류").length}명`;
  $("#employeeReviewRows").innerHTML = rows.map((row) => {
    const member = row.member;
    return `<tr><td><strong>${member.name}</strong><br><span class="muted-text">${member.position || "-"} · ${member.grade || "-"}</span></td><td>${member.team || "미지정"}<br>${member.subgroup || "미지정"}</td><td><strong>${row.totalScore}점${EmployeeReviewManagement.isAvailable() ? "" : " (가감점 미확인)"}</strong><br><span class="muted-text">기존 ${formatNumber(row.baseTotalScore, 2)}점 · 가감 ${formatNumber(row.manualAdjustment, 2)}점</span><div class="bar score-bar"><span style="width:${Math.min(row.totalScore / 120 * 100, 100)}%"></span></div><span class="muted-text">순수 ${row.pureScore}점 / 최대 85점</span></td><td><span class="pill ${gradeClass(row.grade)}">${row.grade}</span></td><td>${row.productivity}/35<br><span class="muted-text">절대 기준 산정${row.relativeBonus ? ` · 120%+ 보너스 +${row.relativeBonus}` : ""}</span></td><td><strong>${row.loadRate}%</strong><br><span class="muted-text">${formatNumber(row.absoluteDailyHours, 1)}H/일 · 팀평균 ${formatNumber(row.teamAverageRate, 0)}%</span></td><td><strong>${row.projectLoad.rate}%</strong><br><span class="muted-text review-evaluation-detail"><span>프로젝트 목표 ${formatNumber(row.projectLoad.buffer, 1)}%</span><span>결과물 ${formatNumber(row.projectLoad.matchedCount, 1)}건</span></span></td><td><strong>${row.companyLoad.rate}%</strong><br><span class="muted-text review-evaluation-detail"><span>회사 목표 ${formatNumber(row.companyLoad.buffer, 1)}%</span><span>결과물 ${formatNumber(row.companyLoad.matchedCount, 1)}건</span></span></td><td>${row.stability}/20<br><span class="muted-text">우리측 지연 ${row.companyIssueDelayRate}%</span></td><td>${row.quality}/20</td><td>${row.operation}/10<br><span class="muted-text">재계약/건강도 프록시</span></td><td>+${row.contribution}/30<br><span class="muted-text">${row.projects.length}개 · ${row.durationMonths}개월</span></td><td>${row.reason}</td></tr>`;
  }).join("") || `<tr><td colspan="13">평가할 직원 데이터가 없습니다.</td></tr>`;
  $("#reviewCriteriaList").innerHTML = employeeReviewCriteria.map((item) => simpleCard(item.title, item.body, [])).join("");
}
function renderHealth(items) {
  const projects = projectSummaries(items).map((p) => ({ ...p, score: healthScore(p) })).sort((a, b) => b.score - a.score);
  $("#healthList").innerHTML = projects.map((p) => isImageEffortSample
    ? `<article class="health-card"><header><div><h3>${p.project}</h3><p>작업자 ${p.data.owners}명 · 결과물 ${p.data.outputs}개</p></div><span class="pill ${p.data.unmatched ? "warn" : "good"}">미체크 ${p.data.unmatched}개</span></header><div class="mini-grid"><div class="mini"><b>${p.data.checkRate}%</b><span>분류율</span></div><div class="mini"><b>${formatNumber(p.data.standardHours)}</b><span>기준공수</span></div><div class="mini"><b>${p.data.total}개</b><span>작업 폴더</span></div></div></article>`
    : `<article class="health-card"><header><div><h3>${p.project}</h3><p>${p.client}</p></div><span class="pill ${p.score >= 70 ? "danger" : p.score >= 40 ? "warn" : "good"}">${p.score}점</span></header><div class="mini-grid"><div class="mini"><b>${p.data.urgentRate}%</b><span>긴급</span></div><div class="mini"><b>${p.data.revisionRate}%</b><span>재작업</span></div><div class="mini"><b>${p.data.delayRate}%</b><span>일정 지연</span></div></div><div class="health-card-actions"><button class="secondary small operator-detail-open" data-detail-type="healthTrend" data-detail-value="${escapeHtml(p.project)}" type="button">월별 변천사</button></div></article>`).join("");
  $("#riskFactorList").innerHTML = projects.map((p) => isImageEffortSample
    ? simpleCard(p.project, `${p.data.unmatched ? "분류 규칙 보완이 필요한 파일이 있습니다." : "전체 파일이 기준공수 규칙에 매칭되었습니다."}`, [{ text: `미체크율 ${p.data.unmatchedRate}%`, cls: p.data.unmatched ? "warn" : "good" }, { text: `미체크 ${p.data.unmatched}개` }, { text: `결과물 ${p.data.outputs}개` }])
    : simpleCard(p.project, `${p.client} · ${p.score >= 70 ? "위험 고객 후보" : p.score >= 40 ? "주의 관찰 필요" : "정상 범위"}`, [{ text: `승인지연 ${pct(p.rows.filter((t) => t.approvalDelay).length, p.data.total)}%` }, { text: `야간/주말 ${pct(p.rows.filter((t) => t.night).length, p.data.total)}%` }, { text: `요청변동 +${Math.max(p.data.delta, 0)}%` }])).join("");
}

function renderStaffing(items) {
  const idleHours = Object.entries(workers).filter(([name]) => isWorkforceMember(members.find((member) => member.name === name), items)).reduce((sum, [name, w]) => { const used = items.filter((t) => t.owner === name).reduce((s, t) => s + t.standardHours, 0); return sum + Math.max(w.capacity - w.vacation - used, 0); }, 0);
  const needed = Number($("#simTasks").value) * Number($("#simHours").value);
  const gap = Math.max(needed - idleHours, 0);
  $("#simulationResult").innerHTML = [simpleCard("신규 프로젝트 투입 예상", `예상 필요 공수 ${effortLabel(needed)} · 현재 유휴 공수 ${effortLabel(idleHours)}`, [{ text: gap > 0 ? `부족 ${effortLabel(gap)}` : "재배치 가능", cls: gap > 0 ? "danger" : "good" }]), simpleCard("추가 채용 필요 인원", `1인 월 가용 120H (15 W/D) 기준`, [{ text: `${Math.ceil(gap / 120)}명`, cls: gap > 0 ? "warn" : "good" }]), simpleCard("채용하지 않아도 되는 근거", gap === 0 ? "현재 유휴 공수로 신규 프로젝트를 흡수할 수 있습니다." : "현재 유휴 공수만으로는 부족합니다. 범위 조정 또는 채용 검토가 필요합니다.", [{ text: `유휴 ${effortLabel(idleHours)}` }])].join("");
}

function currentWorkerMember() {
  const account = currentAccount();
  return members.find((member) => member.name === account?.name && member.employmentStatus !== "퇴사");
}

function selectedMyWorkMember() {
  const account = currentAccount();
  if (account?.role !== "admin") return currentWorkerMember();
  const accessibleNames = accessibleProjectNames();
  const accessibleTasks = tasks.filter((task) => accessibleNames.has(task.project));
  const activeMembers = members.filter((member) => isWorkforceMember(member, accessibleTasks));
  let selected = activeMembers.find((member) => member._id === state.myWorkMemberId);
  if (!selected) {
    selected = activeMembers[0] || null;
    state.myWorkMemberId = selected?._id || "";
  }
  return selected;
}

function assignedOutputDetails(task, member) {
  if (!member) return [];
  const details = taskOutputDetails(task);
  const matched = details.filter((detail) =>
    (detail.ownerEmployeeId && detail.ownerEmployeeId === member._id)
    || (!detail.ownerEmployeeId && detail.owner === member.name));
  if (matched.length) return matched;
  return task.ownerEmployeeId === member._id || task.owner === member.name ? details : [];
}

function taskAssignedToMember(task, member) {
  if (!member) return false;
  return task.ownerEmployeeId === member._id
    || task.owner === member.name
    || taskOutputDetails(task).some((detail) =>
      detail.ownerEmployeeId === member._id
      || (!detail.ownerEmployeeId && detail.owner === member.name));
}

function canEditTaskRecord(task, account = currentAccount()) {
  if (!task || !account) return false;
  if (account.role === "admin") return true;
  if (["operator_all", "operator_no_profit", "operator_output_admin"].includes(account.role)) {
    return accessibleProjectNames(account).has(task.project);
  }
  if (account.role === "worker") {
    const member = currentWorkerMember();
    return Boolean(member && taskAssignedToMember(task, member));
  }
  return false;
}

function workerTaskStatus(task, member) {
  const stored = workerTaskStatuses.find((entry) => entry.taskId === task.id && entry.employeeId === member?._id);
  if (stored) return stored;
  return {
    taskId: task.id,
    employeeId: member?._id || "",
    userId: accountForMember(member)?._userId || currentAccount()?._userId || "",
    status: task.status === "완료" ? "완료" : "미처리",
    startedAt: "",
    completedAt: task.status === "완료" ? (task.completedDate || "") : "",
    updatedAt: "",
  };
}

function myWorkItems(items, member = selectedMyWorkMember()) {
  if (!member) return [];
  const keyword = state.myWorkSearch.trim().toLowerCase();
  return items
    .filter((task) => taskAssignedToMember(task, member))
    .map((task) => ({ task, details: assignedOutputDetails(task, member), workStatus: workerTaskStatus(task, member) }))
    .filter(({ task, details, workStatus }) => {
      const statusOk = state.myWorkStatus === "전체" || workStatus.status === state.myWorkStatus;
      const directionOk = state.myWorkDirection === "전체" || projectDirection(task.project) === state.myWorkDirection;
      const searchText = [task.id, task.project, task.title, task.stage, task.stageDetail, ...details.map((detail) => detail.name)].join(" ").toLowerCase();
      return statusOk && directionOk && (!keyword || searchText.includes(keyword));
    })
    .sort((a, b) => {
      const statusOrder = { 처리중: 0, 미처리: 1, 보류: 2, 완료: 3 };
      return (statusOrder[a.workStatus.status] ?? 9) - (statusOrder[b.workStatus.status] ?? 9)
        || String(a.task.dueDate || "").localeCompare(String(b.task.dueDate || ""))
        || String(a.task.id).localeCompare(String(b.task.id));
    });
}

function assignedDetailHours(task, details) {
  return details.reduce((sum, detail) => {
    const rule = deliverables.find((item) => item.project === task.project && normalizeDeliverableKey(item.name) === normalizeDeliverableKey(detail.name));
    return sum + Number(detail.count || 0) * Number(rule?.standardHours ?? detail.standardHoursPerUnit ?? 0);
  }, 0);
}

function renderMyWork(items) {
  const account = currentAccount();
  const member = selectedMyWorkMember();
  const memberLabel = $("#myWorkMemberLabel");
  memberLabel?.classList.toggle("hidden", account?.role !== "admin");
  if (account?.role === "admin" && $("#myWorkMemberFilter")) {
    const activeMembers = members.filter((item) => item.employmentStatus !== "퇴사");
    $("#myWorkMemberFilter").innerHTML = activeMembers.map((item) => `<option value="${escapeHtml(item._id)}" ${item._id === member?._id ? "selected" : ""}>${escapeHtml(item.name)} · ${escapeHtml(item.team || "미지정")}</option>`).join("");
  }
  $$("#myWorkDirectionTabs .direction-tab").forEach((button) => button.classList.toggle("active", button.dataset.myWorkDirection === state.myWorkDirection));
  const allAssignedUnfiltered = member
    ? items.filter((task) => taskAssignedToMember(task, member)).map((task) => ({ task, workStatus: workerTaskStatus(task, member) }))
    : [];
  const allAssigned = state.myWorkDirection === "전체" ? allAssignedUnfiltered : allAssignedUnfiltered.filter(({ task }) => projectDirection(task.project) === state.myWorkDirection);
  const rows = myWorkItems(items, member);
  const today = localDateString();
  const overdue = allAssigned.filter(({ task, workStatus }) => workStatus.status !== "완료" && task.dueDate && task.dueDate < today).length;
  $("#myWorkTotal").textContent = `${allAssigned.length}건`;
  $("#myWorkWaiting").textContent = `${allAssigned.filter(({ workStatus }) => workStatus.status === "미처리").length}건`;
  $("#myWorkActive").textContent = `${allAssigned.filter(({ workStatus }) => ["처리중", "보류"].includes(workStatus.status)).length}건`;
  $("#myWorkOverdue").textContent = `${overdue}건`;
  $("#myWorkCount").textContent = `${rows.length}건`;
  $("#myWorkStatusFilter").value = state.myWorkStatus;
  $("#myWorkSearchInput").value = state.myWorkSearch;

  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  state.myWorkPage = Math.min(Math.max(1, state.myWorkPage), totalPages);
  const visible = rows.slice((state.myWorkPage - 1) * pageSize, state.myWorkPage * pageSize);
  $("#myWorkRows").innerHTML = visible.map(({ task, details, workStatus }) => {
    const detailText = details.map((detail) => `${detail.name}(${formatNumber(detail.count, 2)})`).join("<br>") || "-";
    const isOverdue = workStatus.status !== "완료" && task.dueDate && task.dueDate < today;
    const options = ["미처리", "처리중", "보류", "완료"].map((status) => `<option ${status === workStatus.status ? "selected" : ""}>${status}</option>`).join("");
    return `<tr>
      <td>${task.id}</td>
      <td>${task.project}</td>
      <td><span class="pill">${projectDirection(task.project)}</span></td>
      <td>${task.title}</td>
      <td class="task-stage-cell">${projectUsesStages(task.project) ? `<strong>${task.stage || "미지정"}</strong>${task.stageDetail ? `<small>${task.stageDetail}</small>` : ""}` : "-"}</td>
      <td>${detailText}</td>
      <td>${effortLabel(assignedDetailHours(task, details))}</td>
      <td><span class="pill ${isOverdue ? "danger" : "good"}">${task.dueDate || "-"}</span></td>
      <td><select class="worker-task-status-select" aria-label="${task.title} 개인 상태">${options}</select></td>
      <td>${workStatus.updatedAt ? String(workStatus.updatedAt).slice(0, 10) : "-"}</td>
      <td><div class="row-actions"><button class="primary small worker-task-save" data-task-id="${task.id}" type="button">상태 저장</button><button class="secondary small record-edit-open" data-record-type="task" data-index="${tasks.indexOf(task)}" type="button">수정</button></div></td>
    </tr>`;
  }).join("") || `<tr><td colspan="11">배정된 업무가 없습니다.</td></tr>`;
  $("#myWorkPage").textContent = `${state.myWorkPage} / ${totalPages}`;
  $("#myWorkPrev").disabled = state.myWorkPage <= 1;
  $("#myWorkNext").disabled = state.myWorkPage >= totalPages;
}

function updateWorkerTaskStatus(taskId, status) {
  const account = currentAccount();
  const member = account?.role === "admin" ? selectedMyWorkMember() : currentWorkerMember();
  const task = tasks.find((item) => String(item.id) === String(taskId));
  if (!account || !["worker", "admin"].includes(account.role) || !member || !task || !taskAssignedToMember(task, member)) return false;
  const targetUserId = accountForMember(member)?._userId || (account.role === "worker" ? account._userId : "");
  if (!targetUserId) return false;
  let entry = workerTaskStatuses.find((item) => item.taskId === task.id && item.employeeId === member._id);
  if (!entry) {
    entry = {
      _id: nextRecordId("WTS", workerTaskStatuses.map((item) => item._id), 6),
      taskId: task.id,
      employeeId: member._id,
      userId: targetUserId,
      status: "미처리",
      startedAt: "",
      completedAt: "",
      updatedAt: "",
    };
    workerTaskStatuses.push(entry);
  }
  const today = localDateString();
  entry.userId = targetUserId || entry.userId;
  entry.status = ["미처리", "처리중", "보류", "완료"].includes(status) ? status : "미처리";
  if (entry.status === "처리중" && !entry.startedAt) entry.startedAt = today;
  if (entry.status === "완료") {
    entry.startedAt ||= today;
    entry.completedAt = today;
  } else {
    entry.completedAt = "";
  }
  entry.updatedAt = new Date().toISOString();
  markOperationalDirty();
  renderAll();
  return true;
}

function updateTaskStatus(taskId, status) {
  const task = tasks.find((item) => String(item.id) === String(taskId));
  if (!task) return false;
  const nextStatus = TASK_STATUSES.includes(status) ? status : "요청";
  const previousCompletedDate = task.completedDate || "";
  task.status = nextStatus;
  task.statusUpdatedAt = new Date().toISOString();
  task.rejected = nextStatus === "반려";
  if (nextStatus === "완료") {
    const completed = task.completedDate || localDateString();
    task.completedDate = completed;
    task.end = completed;
  } else {
    task.completedDate = "";
    if (!task.end || task.end === previousCompletedDate) task.end = task.dueDate || task.start || "";
  }
  syncTaskSlaViolations();
  markOperationalDirty();
  renderAll();
  return true;
}

function portalOutputTypeSummary(items) {
  const groups = new Map();
  items.forEach((task) => {
    taskOutputDetails(task).forEach((detail) => {
      const name = String(detail.name || "미분류").trim() || "미분류";
      const key = normalizeDeliverableKey(name) || name;
      const current = groups.get(key) || {
        name,
        quantity: 0,
        urgentQuantity: 0,
        convertedHours: 0,
        taskIds: new Set(),
        urgentTaskIds: new Set(),
      };
      const quantity = Number(detail.count || 0);
      current.quantity += quantity;
      current.convertedHours += outputEffortHours(quantity * Number(detail.standardHoursPerUnit || 0), task.photoType);
      current.taskIds.add(task.id);
      if (task.urgent) {
        current.urgentQuantity += quantity;
        current.urgentTaskIds.add(task.id);
      }
      groups.set(key, current);
    });
  });
  return [...groups.values()].map((item) => ({
    ...item,
    taskCount: item.taskIds.size,
    urgentTaskCount: item.urgentTaskIds.size,
    urgentRate: pct(item.urgentTaskIds.size, item.taskIds.size),
  })).sort((a, b) => b.quantity - a.quantity || b.taskCount - a.taskCount || a.name.localeCompare(b.name, "ko"));
}

function renderPortal(items) {
  const s = summarize(items);
  const outputTypes = portalOutputTypeSummary(items);
  const totalQuantity = outputTypes.reduce((sum, item) => sum + item.quantity, 0);
  const urgentTasks = items.filter((task) => task.urgent).length;
  $("#portalClient").textContent = state.client === "전체" ? "전체 고객사" : state.client;
  $("#portalProgress").textContent = `${s.completionRate}%`;
  $("#portalRequestVolume").textContent = `${s.total}건`;
  $("#portalSla").textContent = `${s.slaRate}%`;
  $("#portalDelta").textContent = `${s.delta >= 0 ? "+" : ""}${s.delta}%`;
  $("#portalUrgent").textContent = `${s.urgentRate}%`;
  $("#portalOutputs").textContent = `${s.outputs}건`;
  $("#portalRows").innerHTML = items.slice(0, 100).map((t) => `<tr><td>${t.title}</td><td>${t.project}</td><td><span class="pill ${t.status === "완료" ? "good" : t.status === "반려" ? "danger" : "warn"}">${t.status}</span></td><td>${t.end}</td><td>${t.outputs.join("<br>") || "-"}</td></tr>`).join("");
  $("#portalOutputQuantity").textContent = `${formatNumber(totalQuantity, 2)}건`;
  $("#portalOutputTypes").textContent = `${outputTypes.length}종`;
  $("#portalUrgentTasks").textContent = `${urgentTasks.toLocaleString()}건`;
  $("#portalOutputUrgentRate").textContent = `${s.urgentRate}%`;
  $("#portalOutputTypeCount").textContent = `${outputTypes.length}종`;
  $("#portalOutputRows").innerHTML = outputTypes.map((item) => {
    const share = pct(item.quantity, totalQuantity);
    const urgentClass = item.urgentRate >= 30 ? "danger" : item.urgentRate > 0 ? "warn" : "good";
    return `<tr>
      <td>${item.name}</td>
      <td>${item.taskCount.toLocaleString()}건</td>
      <td><strong>${formatNumber(item.quantity, 2)}건</strong></td>
      <td><div class="portal-output-share"><div class="bar"><span style="width:${share}%"></span></div><b>${share}%</b></div></td>
      <td>${item.urgentTaskCount.toLocaleString()}건</td>
      <td><span class="pill ${urgentClass}">${item.urgentRate}%</span></td>
      <td>${effortLabel(item.convertedHours)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="7">조회 조건에 해당하는 결과물이 없습니다.</td></tr>`;
  renderPortalWbsGantt(items);
}

function memberHistoryPeriod(member, rows, dailyHours) {
  const selectedMonths = new Set(selectedPeriodBounds().months);
  const months = [...new Set(rows
    .filter((task) => taskAssignedToMember(task, member))
    .map((task) => taskCompletionDate(task).slice(0, 7))
    .filter((month) => selectedMonths.has(month)))].sort();
  return {
    months,
    workingDays: months.reduce((sum, month) => sum + workingDaysForMonth(month), 0),
    capacityHours: memberCapacityForMonths(member, months, dailyHours),
  };
}
function renderTeamDetailRankingCharts(people) {
  const chart = (title, description, valueFn, labelFn) => {
    const ranked = people
      .map((item) => ({ item, value: Number(valueFn(item) || 0) }))
      .sort((a, b) => b.value - a.value || a.item.name.localeCompare(b.item.name, "ko"));
    const maxValue = Math.max(1, ...ranked.map((row) => row.value));
    return `<section class="ranking-chart">
      <header><strong>${title} · ${ranked.length}명</strong><span>${description}</span></header>
      <div class="ranking-bars" tabindex="0" role="region" aria-label="${title} 전체 ${ranked.length}명">${ranked.map(({ item, value }, index) => {
        const width = clamp(pct(value, maxValue), 4, 100);
        return `<div class="ranking-bar-row">
          <span class="ranking-name">${index + 1}. ${escapeHtml(item.name)}</span>
          <div class="ranking-track"><i style="width:${width}%"></i></div>
          <b>${labelFn(item, value)}</b>
        </div>`;
      }).join("") || `<p class="empty-text">조회할 인원이 없습니다.</p>`}</div>
    </section>`;
  };
  return `<div class="team-detail-ranking-grid">
    ${chart("절대 가동률 순위", "프로젝트별 7H/8H 가용공수 대비 사용 공수", (item) => item.load, (item) => `${item.load}%`)}
    ${chart("인당 생산량 순위", "결과물 수량 기준", (item) => item.data.outputs, (item) => `${item.data.outputs}개`)}
    ${chart("건수 기준 순위", "업무 요청 건수 기준", (item) => item.data.total, (item) => `${item.data.total}건`)}
    ${chart("1일 평균 H 순위", "개인별 작업 이력이 있는 월의 W/D 기준", (item) => item.averageDailyHours, (item) => `${formatNumber(item.averageDailyHours)}H`)}
    ${chart("프로젝트 기준 순위", `목표 ${formatNumber(productivityBuffersForProject(state.project).projectBuffer, 1)}%를 100%로 환산`, (item) => item.projectLoad, (item) => `${item.projectLoad}%`)}
    ${chart("회사 기준 순위", `목표 ${formatNumber(productivityBuffersForProject(state.project).companyBuffer, 1)}%를 100%로 환산`, (item) => item.companyLoad, (item) => `${item.companyLoad}%`)}
  </div>`;
}

function renderOperatorDetail(items) {
  const modal = $("#operatorDetailModal");
  if (!modal) return;
  if (!state.operatorDetail) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    return;
  }
  const { type, value, team } = state.operatorDetail;
  const resourceDetailTypes = new Set(["resourceTeam", "resourcePeople", "resourceCalculation", "teamRanking", "projectPersonRanking", "teamPersonRanking", "groupRanking", "groupPeople"]);
  const useIndividualBuffer = state.view === "resource" || resourceDetailTypes.has(type);
  modal.querySelector(".operator-detail-modal")?.classList.toggle("trend-detail-modal", ["healthTrend", "profitTrend"].includes(type));
  const personDetail = (member, scopedRows = items.filter((task) => taskAssignedToMember(task, member))) => {
    const work = workers[member.name] || { team: member.team, subgroup: member.subgroup, capacity: 40, vacation: 0 };
    const standardHours = scopedRows.reduce((sum, task) => sum + (useIndividualBuffer ? memberResourceHours(task, member) : memberStandardHours(task, member)), 0);
    const dailyHours = absoluteDailyHoursForRows(scopedRows, state.project);
    const { months: workMonths, workingDays, capacityHours } = memberHistoryPeriod(member, scopedRows, dailyHours);
    const averageDailyHours = workingDays ? standardHours / workingDays : 0;
    const projectBuffer = productivityBufferForRows(scopedRows, "project");
    const companyBuffer = productivityBufferForRows(scopedRows, "company");
    return {
      name: member.name, person: member, work, rows: scopedRows, standardHours, data: { ...summarize(scopedRows), outputs: scopedRows.reduce((sum, task) => sum + assignedOutputDetails(task, member).reduce((n, d) => n + Number(d.count || 0), 0), 0) }, averageDailyHours, dailyHours,
      workMonths, workingDays,
      load: capacityHours > 0 ? pct(standardHours, capacityHours) : 0,
      projectLoad: capacityHours > 0 ? bufferedUtilizationRate(standardHours, capacityHours, projectBuffer) : 0,
      companyLoad: capacityHours > 0 ? bufferedUtilizationRate(standardHours, capacityHours, companyBuffer) : 0,
      projectProduction: productivityLoadForTasks(scopedRows, "project", member, useIndividualBuffer).rate,
      companyProduction: productivityLoadForTasks(scopedRows, "company", member, useIndividualBuffer).rate,
    };
  };
  const currentWorkerNames = scopedWorkerNames(items);
  const allPeople = members.filter((member) => member.employmentStatus !== "퇴사" && currentWorkerNames.has(member.name)).map((member) => personDetail(member));
  const workHistoryPeople = allPeople.filter((item) => item.rows.length > 0);
  const isPeopleMetric = ["allPeople", "capacityPeople", "idlePeople", "riskPeople"].includes(type);
  let people = [];
  let title = "상세 현황";
  let description = "선택한 항목의 상세 정보입니다.";
  let pageSize = 20;

  if (type === "resourceCalculation") {
    const projectName = value || state.project;
    const projectRows = items.filter((task) => task.project === projectName);
    const buffers = productivityBuffersForProject(projectName);
    const assignedNames = [...new Set([...(projectAssignments[projectName] || []), ...projectRows.map((task) => task.owner)])]
      .filter((name) => isWorkforceMember(members.find((member) => member.name === name), projectRows));
    const assignedMembers = assignedNames.map((name) => members.find((member) => member.name === name)).filter(Boolean);
    const workerCount = assignedNames.length;
    const usedHours = projectRows.reduce((sum, task) => sum + taskResourceHours(task), 0);
    const absoluteDailyHours = absoluteDailyHoursForProject(projectName);
    const absoluteCapacity = monthlyCapacity(workerCount, assignedMembers, projectName).totalHours;
    const projectCapacity = Math.max(0, absoluteCapacity * (buffers.projectBuffer / 100));
    const companyCapacity = Math.max(0, absoluteCapacity * (buffers.companyBuffer / 100));
    const projectLoad = bufferedUtilizationRate(usedHours, absoluteCapacity, buffers.projectBuffer);
    const companyLoad = bufferedUtilizationRate(usedHours, absoluteCapacity, buffers.companyBuffer);
    const rules = deliverables.filter((item) => item.project === projectName);
    const projectProduction = Math.round(productivityLoadForTasks(projectRows, "project", null, true).rate / Math.max(workerCount, 1));
    const companyProduction = Math.round(productivityLoadForTasks(projectRows, "company", null, true).rate / Math.max(workerCount, 1));
    const targetFor = (rule) => deliverables.find((item) => item.project === projectName && item.name === rule.conversionTarget) || rule;
    const monthlyBase = (rule) => {
      const target = targetFor(rule);
      return (Number(rule.standardHours) > 0 ? absoluteDailyHours / Number(rule.standardHours) : 0) * buffers.workingDays;
    };
    const bufferedMonthly = (rule, buffer) => Math.max(0, monthlyBase(rule) * (buffer / 100));
    $("#operatorDetailModalTitle").textContent = `${projectName} · 리소스 계산 방식`;
    $("#operatorDetailModalDescription").textContent = "보조번호 20 산출물에만 배수를 적용한 리소스 공수를 목표 가용공수로 나눕니다. 목표 120%는 기본 가용공수의 1.2배입니다. 표의 수량은 해당 산출물만 작업할 때의 기준이며 배수를 적용하기 전입니다.";
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${buffers.workingDays}일</b><span>월 W/D</span></div>
        <div class="mini"><b>${workerCount}명</b><span>실무 투입 인원</span></div>
        <div class="mini"><b>${formatNumber(usedHours)}H</b><span>선택 기간 환산공수</span></div>
        <div class="mini"><b>${formatNumber(absoluteCapacity)}H</b><span>${absoluteDailyHours}H 절대 가용공수</span></div>
      </div>
      <div class="calculation-formula-list">
        <section class="note-box"><strong>절대 기준 · ${pct(usedHours, Math.max(absoluteCapacity, 1))}%</strong><p>${formatNumber(usedHours)}H ÷ (${workerCount}명 × ${absoluteDailyHours}H × ${buffers.workingDays}일) × 100</p></section>
        <section class="note-box"><strong>프로젝트 기준 · 가동 ${projectLoad}% / 생산 ${projectProduction}%</strong><p>가용 ${formatNumber(absoluteCapacity)}H × ${formatNumber(buffers.projectBuffer, 1)}% = ${formatNumber(projectCapacity)}H</p></section>
        <section class="note-box"><strong>회사 기준 · 가동 ${companyLoad}% / 생산 ${companyProduction}%</strong><p>가용 ${formatNumber(absoluteCapacity)}H × ${formatNumber(buffers.companyBuffer, 1)}% = ${formatNumber(companyCapacity)}H</p></section>
      </div>
      <div class="table-wrap"><table><thead><tr><th>결과물</th><th>기준공수</th><th>환산 기준</th><th>1일 환산량</th><th>월 기본량</th><th>프로젝트 목표 ${formatNumber(buffers.projectBuffer, 1)}%</th><th>회사 목표 ${formatNumber(buffers.companyBuffer, 1)}%</th></tr></thead><tbody>
      ${rules.map((rule) => {
        const target = targetFor(rule);
        const daily = Number(rule.standardHours) > 0 ? absoluteDailyHours / Number(rule.standardHours) : 0;
        return `<tr><td><strong>${escapeHtml(rule.name)}</strong></td><td>${formatNumber(rule.standardHours)}H</td><td>${escapeHtml(target.name)}</td><td>${formatNumber(daily, 2)}건</td><td>${formatNumber(monthlyBase(rule), 1)}건</td><td>${formatNumber(bufferedMonthly(rule, buffers.projectBuffer), 1)}건</td><td>${formatNumber(bufferedMonthly(rule, buffers.companyBuffer), 1)}건</td></tr>`;
      }).join("") || `<tr><td colspan="7">이 프로젝트에 등록된 결과물 기준이 없습니다.</td></tr>`}
      </tbody></table></div>`;
    $("#operatorDetailPagination").hidden = true;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "healthTrend") {
    const rows = projectHealthMonthlyRows(value);
    const latest = rows.at(-1);
    $("#operatorDetailModalTitle").textContent = `${value} · 건강도 월별 변천사`;
    $("#operatorDetailModalDescription").textContent = "업무 원본을 월별로 다시 집계해 위험점수와 투입 인원 변화를 표시합니다.";
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${latest ? `${latest.score}점` : "-"}</b><span>최근 위험점수</span></div><div class="mini"><b>${latest ? `${latest.configuredPeople}명 / ${latest.actualPeople}명` : "-"}</b><span>설정 인원 / 실제 확인 인원</span></div><div class="mini"><b>${latest ? `${latest.taskCount}건` : "-"}</b><span>최근 월 업무</span></div><div class="mini"><b>${latest ? `${formatNumber(latest.hours)}H` : "-"}</b><span>최근 월 수행공수</span></div>
      </div>
      ${trendLineChart("건강도 위험지표", "점수가 높을수록 관리가 필요한 상태입니다.", rows, [{ key: "score", label: "위험점수", color: "#dc2626" }, { key: "urgentRate", label: "긴급률", color: "#f59e0b" }, { key: "revisionRate", label: "재작업률", color: "#7c3aed" }, { key: "delayRate", label: "일정 지연률", color: "#0f766e" }], { minValue: 0, maxValue: 100, formatAxis: (number) => `${Math.round(number)}%`, formatValue: (number) => `${formatNumber(number, 0)}%` })}
      ${trendLineChart("월별 투입 인원 비교", "설정 인원과 업무·결과물 담당자로 실제 확인된 인원을 함께 표시합니다.", rows, [{ key: "configuredPeople", label: "설정 투입 인원", color: "#2563eb" }, { key: "actualPeople", label: "실제 작업 확인 인원", color: "#16a34a" }], { minValue: 0, formatAxis: (number) => `${formatNumber(number, 0)}명`, formatValue: (number) => `${formatNumber(number, 0)}명` })}
      ${monthlyTrendTable(rows, [{ key: "score", label: "위험점수", format: (number) => `${number}점` }, { key: "configuredPeople", label: "설정 인원", format: (number) => `${number}명` }, { key: "actualPeople", label: "실제 확인 인원", format: (number) => `${number}명` }, { key: "urgentRate", label: "긴급률", format: (number) => `${number}%` }, { key: "revisionRate", label: "재작업률", format: (number) => `${number}%` }, { key: "delayRate", label: "일정 지연률", format: (number) => `${number}%` }, { key: "taskCount", label: "업무", format: (number) => `${number}건` }] )}`;
    $("#operatorDetailPagination").hidden = true;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "profitTrend") {
    const config = projectConfig(value);
    const contract = projectContract(value);
    const rows = config ? projectMonthlyProfitRows(config, contract).filter((row) => row.taskCount > 0) : [];
    const latest = rows.at(-1);
    const moneyAxis = (number) => `${formatNumber(number, 0)}`;
    const moneyValue = (number) => `${number < 0 ? "-" : ""}${money(Math.abs(number))}`;
    $("#operatorDetailModalTitle").textContent = `${value} · 수익·투입 월별 변천사`;
    $("#operatorDetailModalDescription").textContent = "월별 투입 인원 변경이력을 반영한 매출, 인력원가와 실제 손익입니다.";
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${latest ? `${latest.configuredPeople}명 / ${latest.actualPeople}명` : "-"}</b><span>설정 인원 / 실제 확인 인원</span></div><div class="mini"><b>${latest ? money(latest.revenue) : "-"}</b><span>최근 월 매출</span></div><div class="mini"><b>${latest ? `${money(latest.configuredCost)} / ${money(latest.actualCost)}` : "-"}</b><span>설정 원가 / 실제 확인 원가</span></div><div class="mini"><b class="${latest?.actualProfit < 0 ? "negative-value" : ""}">${latest ? moneyValue(latest.actualProfit) : "-"}</b><span>실제 확인 인원 기준 손익</span></div>
      </div>
      ${trendLineChart("월별 손익 비교", "설정 투입 인원 기준과 실제 업무에서 확인된 인원 기준 손익을 비교합니다.", rows, [{ key: "revenue", label: "매출", color: "#2563eb" }, { key: "configuredProfit", label: "설정 인원 기준 손익", color: "#f59e0b" }, { key: "actualProfit", label: "실제 확인 인원 기준 손익", color: "#16a34a" }], { formatAxis: moneyAxis, formatValue: moneyValue })}
      ${trendLineChart("월별 투입 인원 비교", "실제 확인 인원은 해당 월 업무 또는 결과물 담당자로 식별된 고유 인원입니다.", rows, [{ key: "configuredPeople", label: "설정 투입 인원", color: "#7c3aed" }, { key: "actualPeople", label: "실제 작업 확인 인원", color: "#16a34a" }], { minValue: 0, formatAxis: (number) => `${formatNumber(number, 0)}명`, formatValue: (number) => `${formatNumber(number, 0)}명` })}
      ${monthlyTrendTable(rows, [{ key: "configuredPeople", label: "설정 인원", format: (number) => `${number}명` }, { key: "actualPeople", label: "실제 확인 인원", format: (number) => `${number}명` }, { key: "revenue", label: "매출", format: moneyValue }, { key: "configuredCost", label: "설정 인원 원가", format: moneyValue }, { key: "actualCost", label: "실제 확인 원가", format: moneyValue }, { key: "configuredProfit", label: "설정 기준 손익", format: moneyValue }, { key: "actualProfit", label: "실제 확인 손익", format: moneyValue }, { key: "taskCount", label: "업무", format: (number) => `${number}건` }] )}`;
    $("#operatorDetailPagination").hidden = true;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "profitPeopleHistory" || type === "profitContractHistory") {
    const kind = type === "profitPeopleHistory" ? "people" : "contract";
    const rows = profitabilityHistoryRows(value, kind);
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.operatorDetailPage = Math.min(Math.max(state.operatorDetailPage, 1), totalPages);
    const visible = rows.slice((state.operatorDetailPage - 1) * pageSize, state.operatorDetailPage * pageSize);
    $("#operatorDetailModalTitle").textContent = `${value} · ${kind === "people" ? "인원 변경 이력" : "계약기간 변경 이력"}`;
    $("#operatorDetailModalDescription").textContent = "최신 변경부터 표시하며 변경자, 변경 전후 값과 사유를 확인할 수 있습니다.";
    $("#operatorDetailModalBody").innerHTML = rows.length
      ? `<div class="table-wrap"><table><thead><tr><th>변경일시</th><th>항목</th><th>변경 전</th><th>변경 후</th><th>변경 사유</th><th>변경자</th></tr></thead><tbody>${visible.map((entry) => `<tr><td>${escapeHtml(historyDate(entry) || "-")}</td><td>${escapeHtml(entry.field || entry.category || "-")}</td><td>${escapeHtml(entry.before || "-")}</td><td>${escapeHtml(entry.after || "-")}</td><td>${escapeHtml(entry.reason || "-")}</td><td>${escapeHtml(entry.changedBy || entry.owner || "-")}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="empty-text">저장된 변경 이력이 없습니다.</p>`;
    updateOperatorDetailPagination(totalPages, rows.length, "건");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "profitDetail") {
    const model = projectProfitViewModel(value, items);
    if (!model) {
      closeOperatorDetail();
      return;
    }
    const { summary, contract, profitability, monthlyRows, annualRows, activeTaskMonths, requiredContractHours, requiredMonthlyHours, currentMonthlyAverageHours } = model;
    const selectedMonthKey = state.month || profitability.asOf.slice(0, 7);
    const selectedMonthRow = monthlyRows.find((row) => row.month === selectedMonthKey) || monthlyRows.at(-1);
    const recentMonthlyRows = monthlyRows.slice(-12).reverse();
    const reasonTags = profitability.reasons.length
      ? profitability.reasons.map((reason) => `<span class="pill danger">${escapeHtml(reason)}</span>`).join("")
      : `<span class="pill good">현재 확인된 손실 요인 없음</span>`;
    const annualMarkup = annualRows.length ? `<div class="annual-profit-section"><div class="annual-profit-head"><div><strong>연도별 손익</strong><span>월별 투입 인원 변경이력을 반영한 누적값</span></div><button class="secondary small operator-detail-open" data-detail-type="profitAnnual" data-detail-value="${escapeHtml(value)}" type="button">월별 상세보기</button></div><div class="table-wrap"><table><thead><tr><th>연도</th><th>매출</th><th>인력원가</th><th>실제 손익</th><th>인원 운영차익</th><th>이익률</th><th>평균 투입</th><th>인원변경</th></tr></thead><tbody>${annualRows.map((row) => `<tr><td><strong>${row.year}</strong></td><td>${money(row.revenue)}</td><td>${money(row.cost)}</td><td class="${row.profit < 0 ? "negative-value" : ""}">${row.profit < 0 ? "-" : ""}${money(Math.abs(row.profit))}</td><td class="${row.staffingBenefit < 0 ? "negative-value" : ""}">${row.staffingBenefit < 0 ? "-" : ""}${money(Math.abs(row.staffingBenefit))}</td><td><span class="pill ${row.marginRate < 0 ? "danger" : row.marginRate < 10 ? "warn" : "good"}">${row.marginRate}%</span></td><td>${formatNumber(row.averagePeople, 1)}명</td><td>${row.changes}건</td></tr>`).join("")}</tbody></table></div></div>` : "";
    const monthlyProfitMarkup = recentMonthlyRows.length ? `<div class="annual-profit-section"><div class="annual-profit-head"><div><strong>월별 이익 금액</strong><span>최근 12개월 기준 · 전체 기간과 변경이력은 월별 상세보기에서 확인</span></div></div><div class="table-wrap"><table class="profit-monthly-summary-table"><thead><tr><th>월</th><th>총 투입</th><th>매출</th><th>인력원가</th><th>실제 월 이익</th><th>인원 운영차익</th><th>이익률</th></tr></thead><tbody>${recentMonthlyRows.map((row) => { const marginRate = row.revenue ? Math.round((row.profit / row.revenue) * 100) : 0; return `<tr><td><strong>${row.month}</strong></td><td>${row.people}명</td><td>${money(row.revenue)}</td><td>${money(row.cost)}</td><td class="${row.profit < 0 ? "negative-value" : ""}">${row.profit < 0 ? "-" : ""}${money(Math.abs(row.profit))}</td><td class="${row.staffingBenefit < 0 ? "negative-value" : ""}">${row.staffingBenefit < 0 ? "-" : ""}${money(Math.abs(row.staffingBenefit))}</td><td><span class="pill ${marginRate < 0 ? "danger" : marginRate < 10 ? "warn" : "good"}">${marginRate}%</span></td></tr>`; }).join("")}</tbody></table></div></div>` : "";
    const peopleChanges = profitabilityHistoryRows(value, "people").length;
    const contractChanges = profitabilityHistoryRows(value, "contract").length;
    const linkedContracts = linkedContractConfigs(value);
    const linkedMarkup = linkedContracts.length > 1 ? `<section class="linked-contracts"><header><strong>연결된 추가·확장 계약</strong><span>같은 고객사와 기준 프로젝트로 묶인 계약입니다.</span></header><div>${linkedContracts.map((config) => `<article class="linked-contract ${config.project === value ? "current" : ""}"><strong>${escapeHtml(config.project)}</strong><span>${escapeHtml(config.direction)} · ${config.startDate || "-"} ~ ${config.endDate || "-"}</span><b>${money(config.total)}</b></article>`).join("")}</div></section>` : "";
    $("#operatorDetailModalTitle").textContent = `${value} · 수익성 상세`;
    $("#operatorDetailModalDescription").textContent = `${summary.client} · ${contract.startDate || "-"} ~ ${contract.endDate || "-"} · ${profitability.asOf} 기준`;
    $("#operatorDetailModalBody").innerHTML = `
      <div class="profit-health ${profitability.status}"><strong>${profitability.direction} 손익 판정 · ${profitability.statusLabel}</strong><span>${escapeHtml(model.detail)}</span></div>
      <div class="profit-detail-grid">
        <div class="mini"><b>${money(contract.total)}</b><span>총 계약금</span></div><div class="mini"><b>${money(contract.monthly)}</b><span>월 계약금</span></div><div class="mini"><b>${money(profitability.personMonthlyRate)}</b><span>월 계약금 / 투입인원 평단가</span></div>
        <div class="mini"><b>${contract.inputPeople}명</b><span>회사 실 투입인원 · 관리 ${contract.managementPeople}명 포함</span></div><button class="mini profit-history-card operator-detail-open" data-detail-type="profitPeopleHistory" data-detail-value="${escapeHtml(value)}" type="button"><b>${peopleChanges}건</b><span>인원 변경 사유 · 상세보기</span></button><div class="mini"><b>${contract.monthlyPersonCost ? money(contract.monthlyPersonCost) : "미설정"}</b><span>회사 입력 1인 월 원가</span></div>
        <div class="mini"><b>${money(profitability.monthlyBurn)}</b><span>회사 월 투입 원가</span></div><div class="mini"><b>${money(profitability.recognizedRevenue)}</b><span>현시점 누적 매출 · 월 ${money(profitability.monthlyRevenue)} × ${profitability.recognizedMonths}개월</span></div><div class="mini"><b class="${profitability.balance < 0 ? "negative-value" : ""}">${profitability.balance < 0 ? "-" : ""}${money(Math.abs(profitability.balance))}</b><span>${profitability.recognizedMonths === profitability.elapsedMonths ? `누적 순이익 · 월 ${profitability.monthlyRevenue - profitability.monthlyBurn < 0 ? "-" : ""}${money(Math.abs(profitability.monthlyRevenue - profitability.monthlyBurn))} × ${profitability.elapsedMonths}개월` : `누적 순이익 · 매출 ${profitability.recognizedMonths}개월 - 원가 ${profitability.elapsedMonths}개월`}</span></div>
        <div class="mini"><b>${formatNumber(requiredContractHours)}H</b><span>계약기간 내 총 필요 누적 공수</span></div><div class="mini"><b>${formatNumber(requiredMonthlyHours)}H</b><span>월 평균 기준 공수</span></div><div class="mini"><b>${formatNumber(currentMonthlyAverageHours)}H</b><span>입력 데이터 월별 평균 공수 · ${activeTaskMonths}개월</span></div>
        ${profitability.direction === "이커머스" ? "" : `<button class="mini profit-history-card operator-detail-open" data-detail-type="profitContractHistory" data-detail-value="${escapeHtml(value)}" type="button"><b>${contractChanges}건</b><span>계약기간 변경내용 · 상세보기</span></button>`}
      </div>
      ${linkedMarkup}<div class="profit-reasons"><strong>손익 영향 요인</strong><div>${reasonTags}</div></div>${monthlyProfitMarkup}${annualMarkup}`;
    $("#operatorDetailPagination").hidden = true;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "profitAnnual") {
    const config = projectConfig(value);
    const contract = projectContract(value);
    const rows = config ? projectMonthlyProfitRows(config, contract) : [];
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.operatorDetailPage = Math.min(Math.max(state.operatorDetailPage, 1), totalPages);
    const visible = rows.slice((state.operatorDetailPage - 1) * pageSize, state.operatorDetailPage * pageSize);
    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const changeCount = rows.reduce((sum, row) => sum + row.changes.length, 0);
    $("#operatorDetailModalTitle").textContent = `${value} · 월별 손익 상세`;
    $("#operatorDetailModalDescription").textContent = "프로젝트 구성원 합류·이탈 이력을 월별 투입 인원에 반영해 매출과 인력원가를 계산합니다.";
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${money(totalRevenue)}</b><span>누적 매출</span></div>
        <div class="mini"><b>${money(totalCost)}</b><span>누적 인력원가</span></div>
        <div class="mini"><b class="${totalProfit < 0 ? "negative-value" : ""}">${totalProfit < 0 ? "-" : ""}${money(Math.abs(totalProfit))}</b><span>누적 손익</span></div>
        <div class="mini"><b>${changeCount}건</b><span>인원 변경이력</span></div>
      </div>
      <div class="table-wrap"><table class="profit-monthly-detail-table"><thead><tr><th>월</th><th>총 투입 인원</th><th>매출</th><th>인력원가</th><th>실제 월 손익</th><th>인원 운영차익</th><th>업무/공수</th><th>인원 변경이력</th></tr></thead><tbody>${visible.map((row) => `<tr><td><strong>${row.month}</strong></td><td>${row.people}명</td><td>${money(row.revenue)}</td><td>${money(row.cost)}</td><td class="${row.profit < 0 ? "negative-value" : ""}">${row.profit < 0 ? "-" : ""}${money(Math.abs(row.profit))}</td><td class="${row.staffingBenefit < 0 ? "negative-value" : ""}">${row.staffingBenefit < 0 ? "-" : ""}${money(Math.abs(row.staffingBenefit))}</td><td>${row.taskCount}건 · ${formatNumber(row.hours)}H</td><td>${row.changes.length ? row.changes.map((change) => `<strong>${escapeHtml(change.label)}</strong><small>${escapeHtml(change.reason)}</small>`).join("") : "-"}</td></tr>`).join("") || `<tr><td colspan="8">조회할 월별 손익 정보가 없습니다.</td></tr>`}</tbody></table></div>`;
    updateOperatorDetailPagination(totalPages, rows.length, "개월");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "groupRanking") {
    const groups = new Map();
    allPeople.forEach((person) => {
      const teamName = person.person.team || "미지정";
      const subgroup = person.person.subgroup || "미지정";
      const key = JSON.stringify([teamName, subgroup]);
      if (!groups.has(key)) groups.set(key, { teamName, subgroup, people: [], hours: 0, days: 0 });
      const group = groups.get(key);
      group.people.push(person);
      group.hours += person.standardHours;
      group.days += person.workingDays;
    });
    const ranked = [...groups.values()].sort((a, b) => b.hours - a.hours || a.teamName.localeCompare(b.teamName, "ko") || a.subgroup.localeCompare(b.subgroup, "ko"));
    $("#operatorDetailModalTitle").textContent = "팀 내 그룹별 공수 순위";
    $("#operatorDetailModalDescription").textContent = `${currentPeriodLabel()} · 현재 팀·그룹 소속 기준입니다. 공수는 담당 산출물별로 합산하며, 일평균은 그룹 총공수 ÷ 개인별 작업 이력 월 W/D 합계입니다.`;
    $("#operatorDetailModalBody").innerHTML = `<div class="table-wrap"><table><thead><tr><th>순위</th><th>팀</th><th>그룹</th><th>인원</th><th>업무</th><th>산출물</th><th>누적 공수</th><th>인당 누적 공수</th><th>1인 1일 평균</th><th>상세</th></tr></thead><tbody>${ranked.map((group, index) => {
      const count = group.people.length;
      const taskCount = new Set(group.people.flatMap((person) => person.rows)).size;
      const outputs = group.people.reduce((sum, person) => sum + person.data.outputs, 0);
      return `<tr><td>${index + 1}</td><td>${escapeHtml(group.teamName)}</td><td>${escapeHtml(group.subgroup)}</td><td>${count}명</td><td>${taskCount}건</td><td>${outputs}개</td><td>${effortLabel(group.hours)}</td><td>${effortLabel(group.hours / count)}</td><td>${effortLabel(group.days ? group.hours / group.days : 0)}</td><td><button class="secondary small operator-detail-open" data-detail-type="groupPeople" data-detail-team="${escapeHtml(group.teamName)}" data-detail-value="${escapeHtml(group.subgroup)}" type="button">그룹 내 순위 그래프</button></td></tr>`;
    }).join("") || '<tr><td colspan="10">조회할 그룹이 없습니다.</td></tr>'}</tbody></table></div>`;
    $("#operatorDetailPagination").hidden = true;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }
  if (type === "teamRanking") {
    const scopedNames = scopedWorkerNames(items);
    const activeMembers = members.filter((member) => member.employmentStatus !== "퇴사" && scopedNames.has(member.name));
    const configuredTeamNames = teams.map((item) => item.name);
    const memberTeamNames = activeMembers.map((member) => member.team);
    const taskTeamNames = items.map((task) => members.find((member) => member.name === task.owner)?.team || workers[task.owner]?.team || task.team);
    const teamNames = [...new Set([...configuredTeamNames, ...memberTeamNames, ...taskTeamNames].filter(Boolean))];
    const rankedTeams = teamNames.map((teamName) => {
      const teamMembers = activeMembers.filter((member) => member.team === teamName);
      const rows = items.filter((task) => {
        const ownerTeam = members.find((member) => member.name === task.owner)?.team || workers[task.owner]?.team || task.team;
        return ownerTeam === teamName;
      });
      const convertedHours = rows.reduce((sum, task) => sum + taskResourceHours(task), 0);
      const capacityHours = monthlyCapacity(teamMembers.length, teamMembers).totalHours;
      const projectBuffer = productivityBufferForRows(rows, "project");
      const companyBuffer = productivityBufferForRows(rows, "company");
      return {
        team: teamName,
        people: teamMembers.length,
        taskCount: rows.length,
        convertedHours,
        capacityHours,
        load: pct(convertedHours, Math.max(capacityHours, 1)),
        projectLoad: bufferedUtilizationRate(convertedHours, capacityHours, projectBuffer),
        companyLoad: bufferedUtilizationRate(convertedHours, capacityHours, companyBuffer),
        projectProduction: Math.round(productivityLoadForTasks(rows, "project", null, true).rate / Math.max(teamMembers.length, 1)),
        companyProduction: Math.round(productivityLoadForTasks(rows, "company", null, true).rate / Math.max(teamMembers.length, 1)),
      };
    }).filter((item) => item.people || item.taskCount)
      .sort((a, b) => b.convertedHours - a.convertedHours || b.load - a.load || a.team.localeCompare(b.team, "ko"));
    const totalPages = Math.max(1, Math.ceil(rankedTeams.length / pageSize));
    state.operatorDetailPage = Math.min(Math.max(state.operatorDetailPage, 1), totalPages);
    const visible = rankedTeams.slice((state.operatorDetailPage - 1) * pageSize, state.operatorDetailPage * pageSize);
    const totalConvertedHours = rankedTeams.reduce((sum, item) => sum + item.convertedHours, 0);
    const totalCapacityHours = rankedTeams.reduce((sum, item) => sum + item.capacityHours, 0);
    $("#operatorDetailModalTitle").textContent = "팀별 환산공수 순위";
    $("#operatorDetailModalDescription").textContent = `${currentPeriodLabel()} 업무를 기준공수로 환산하여 팀별 총 공수와 가동률을 비교합니다.`;
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${rankedTeams.length}개 팀</b><span>조회 팀</span></div>
        <div class="mini"><b>${formatNumber(totalConvertedHours)}H</b><span>전체 환산공수</span></div>
        <div class="mini"><b>${formatNumber(totalCapacityHours)}H</b><span>전체 가용공수</span></div>
        <div class="mini"><b>${pct(totalConvertedHours, Math.max(totalCapacityHours, 1))}%</b><span>전체 가동률</span></div>
      </div>
      <div class="table-wrap"><table class="team-ranking-table"><thead><tr><th>순위</th><th>팀</th><th>인원</th><th>업무</th><th>환산공수</th><th>월 가용공수</th><th>절대 가동</th><th>프로젝트 가동 / 생산</th><th>회사 가동 / 생산</th><th>상세</th></tr></thead>
      <tbody>${visible.map((item, index) => {
        const rank = (state.operatorDetailPage - 1) * pageSize + index + 1;
        const loadClass = item.load >= 100 ? "danger" : item.load >= 85 ? "warn" : "good";
        return `<tr><td><strong>${rank}</strong></td><td>${item.team}</td><td>${item.people}명</td><td>${item.taskCount.toLocaleString()}건</td><td><strong>${effortLabel(item.convertedHours)}</strong></td><td>${effortLabel(item.capacityHours)}</td><td><span class="pill ${loadClass}">${item.load}%</span></td><td><strong>${item.projectLoad}%</strong> / ${item.projectProduction}%</td><td><strong>${item.companyLoad}%</strong> / ${item.companyProduction}%</td><td><button class="secondary small operator-detail-open" data-detail-type="teamPersonRanking" data-detail-value="${item.team}" type="button">개인별 환산공수</button></td></tr>`;
      }).join("") || `<tr><td colspan="10">조회할 팀 데이터가 없습니다.</td></tr>`}</tbody></table></div>`;
    updateOperatorDetailPagination(totalPages, rankedTeams.length, "개 팀");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "projectPersonRanking" || type === "teamPersonRanking") {
    const projectName = type === "projectPersonRanking" ? value : "";
    const teamName = type === "teamPersonRanking" ? value : "";
    const scopeRows = items.filter((task) => {
      const ownerTeam = members.find((member) => member.name === task.owner)?.team || workers[task.owner]?.team || task.team;
      return (!projectName || task.project === projectName) && (!teamName || ownerTeam === teamName);
    });
    const assignedNames = projectName
      ? [...new Set([...(projectAssignments[projectName] || []), ...scopeRows.map((task) => task.owner)])]
      : members.filter((member) => member.team === teamName && isWorkforceMember(member, scopeRows)).map((member) => member.name);
    const rankedPeople = assignedNames.filter((name) => isWorkforceMember(members.find((member) => member.name === name), scopeRows)).map((name) => {
      const member = members.find((item) => item.name === name);
      const rows = scopeRows.filter((task) => taskAssignedToMember(task, member));
      const convertedHours = rows.reduce((sum, task) => sum + memberResourceHours(task, member), 0);
      const personDailyHours = absoluteDailyHoursForRows(rows, projectName || state.project);
      const personCapacity = memberHistoryPeriod(member, rows, personDailyHours).capacityHours;
      const projectBuffer = productivityBufferForRows(rows, "project");
      const companyBuffer = productivityBufferForRows(rows, "company");
      return {
        name,
        team: member?.team || workers[name]?.team || teamName || "-",
        subgroup: member?.subgroup || workers[name]?.subgroup || "",
        taskCount: rows.length,
        convertedHours,
        capacityHours: personCapacity,
        load: personCapacity > 0 ? pct(convertedHours, personCapacity) : 0,
        projectLoad: personCapacity > 0 ? bufferedUtilizationRate(convertedHours, personCapacity, projectBuffer) : 0,
        companyLoad: personCapacity > 0 ? bufferedUtilizationRate(convertedHours, personCapacity, companyBuffer) : 0,
        projectProduction: productivityLoadForTasks(rows, "project", member, true).rate,
        companyProduction: productivityLoadForTasks(rows, "company", member, true).rate,
        dailyHours: personDailyHours,
      };
    }).sort((a, b) => b.convertedHours - a.convertedHours || a.name.localeCompare(b.name, "ko"));
    const personPageSize = 20;
    const totalPages = Math.max(1, Math.ceil(rankedPeople.length / personPageSize));
    state.operatorDetailPage = Math.min(Math.max(state.operatorDetailPage, 1), totalPages);
    const visible = rankedPeople.slice((state.operatorDetailPage - 1) * personPageSize, state.operatorDetailPage * personPageSize);
    const totalConvertedHours = rankedPeople.reduce((sum, item) => sum + item.convertedHours, 0);
    const totalPersonCapacity = rankedPeople.reduce((sum, item) => sum + item.capacityHours, 0);
    const titlePrefix = projectName || teamName;
    $("#operatorDetailModalTitle").textContent = `${titlePrefix} · 개인별 환산공수 순위`;
    $("#operatorDetailModalDescription").textContent = "일반·단축근무 기간별 개인 가용공수 대비 환산공수로 가동률을 계산합니다.";
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${rankedPeople.length}명</b><span>조회 인원</span></div>
        <div class="mini"><b>${formatNumber(totalConvertedHours)}H</b><span>전체 환산공수</span></div>
        <div class="mini"><b>${formatNumber(totalPersonCapacity)}H</b><span>전체 생산 가용공수</span></div>
        <div class="mini"><b>${pct(totalConvertedHours, Math.max(totalPersonCapacity, 1))}%</b><span>평균 가동률</span></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>순위</th><th>이름</th><th>팀 / 세부 그룹</th><th>업무</th><th>환산공수</th><th>절대 기준 가용공수</th><th>절대 가동</th><th>프로젝트 가동 / 생산</th><th>회사 가동 / 생산</th></tr></thead>
      <tbody>${visible.map((item, index) => {
        const rank = (state.operatorDetailPage - 1) * personPageSize + index + 1;
        const loadClass = item.load >= 100 ? "danger" : item.load >= 85 ? "warn" : "good";
        return `<tr><td><strong>${rank}</strong></td><td>${item.name}</td><td>${item.team}${item.subgroup ? ` · ${item.subgroup}` : ""}</td><td>${item.taskCount.toLocaleString()}건</td><td><strong>${effortLabel(item.convertedHours)}</strong></td><td>${effortLabel(item.capacityHours)}</td><td><span class="pill ${loadClass}">${item.load}%</span></td><td><strong>${item.projectLoad}%</strong> / ${item.projectProduction}%</td><td><strong>${item.companyLoad}%</strong> / ${item.companyProduction}%</td></tr>`;
      }).join("") || `<tr><td colspan="9">조회할 개인 데이터가 없습니다.</td></tr>`}</tbody></table></div>`;
    updateOperatorDetailPagination(totalPages, rankedPeople.length, "명");
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    return;
  }

  if (type === "groupPeople") {
    people = allPeople.filter((person) => (person.person.team || "미지정") === team && (person.person.subgroup || "미지정") === value);
    title = `${team} · ${value} 그룹 순위`;
    description = `${currentPeriodLabel()} · 개인별 작업 이력 월 기준 평균·가동률, 조회 기간 누적 수량·건수입니다.`;
    pageSize = 8;
  } else if (isPeopleMetric) {
    people = type === "idlePeople" ? workHistoryPeople.filter((item) => item.load < 40)
      : type === "riskPeople" ? workHistoryPeople.filter((item) => item.load >= 85)
      : allPeople;
    title = type === "idlePeople" ? "유휴 인력 상세" : type === "riskPeople" ? "위험 인력 상세" : type === "capacityPeople" ? "가용 인력 상세" : "전체 인원 생산량";
    description = type === "idlePeople" ? `업무이력 총원 ${workHistoryPeople.length}명 중 가동률 40% 미만 인원을 표시합니다.` : type === "riskPeople" ? `업무이력 총원 ${workHistoryPeople.length}명 중 가동률 85% 이상 인원을 표시합니다.` : "인원별 기준공수, W/D, 가동률과 세부 그룹을 표시합니다.";
  } else if (type === "team") {
    const teamRows = items.filter((task) => task.team === value);
    people = members.filter((member) => member.team === value && isWorkforceMember(member, teamRows))
      .map((member) => personDetail(member, teamRows.filter((task) => task.owner === member.name)));
    title = `${value} 팀 상세`;
    description = "팀 소속 인원의 세부 그룹과 개인별 작업 현황입니다.";
    pageSize = 8;
  } else if (type === "resourceTeam" || type === "resourcePeople") {
    const projectRows = items.filter((task) => task.project === value);
    const assignedNames = projectAssignments[value] || [...new Set(projectRows.map((task) => task.owner))];
    people = [...new Set(assignedNames)].filter((name) => isWorkforceMember(members.find((member) => member.name === name), projectRows)).map((name) => {
      const member = members.find((item) => item.name === name) || { name, team, subgroup: "", position: "-", grade: "-" };
      return personDetail(member, projectRows.filter((task) => taskAssignedToMember(task, member)));
    });
    title = `${value} · ${type === "resourceTeam" ? "전체 순위" : "인원별 상세"}`;
    description = type === "resourceTeam" ? "조회 기간의 전체 투입 인원 순위를 비교합니다. 평균·가동률은 개인별 작업 이력 월 기준입니다." : "프로젝트 투입 인원의 세부 그룹과 개인별 작업 현황입니다.";
    pageSize = 8;
  }

  if (people.length || isPeopleMetric || type === "team" || type === "resourceTeam" || type === "resourcePeople" || type === "groupPeople") {
    const totalPages = Math.max(1, Math.ceil(people.length / pageSize));
    state.operatorDetailPage = Math.min(Math.max(state.operatorDetailPage, 1), totalPages);
    const visible = people.slice((state.operatorDetailPage - 1) * pageSize, state.operatorDetailPage * pageSize);
    const totalRows = people.flatMap((item) => item.rows);
    const summary = summarize(totalRows);
    const rankingCharts = (type === "team" || type === "resourceTeam" || type === "groupPeople") ? renderTeamDetailRankingCharts(people) : "";
    $("#operatorDetailModalTitle").textContent = title;
    $("#operatorDetailModalDescription").textContent = description;
    if (type === "resourceTeam" || type === "groupPeople") {
      $("#operatorDetailModalBody").innerHTML = `${rankingCharts}${type === "groupPeople" ? '<button class="secondary operator-detail-open" data-detail-type="groupRanking" type="button">그룹별 순위표로 돌아가기</button>' : ""}`;
      $("#operatorDetailPagination").hidden = true;
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      return;
    }
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${people.length}명</b><span>조회 인원</span></div>
        <div class="mini"><b>${summary.total}건</b><span>전체 업무</span></div>
        <div class="mini"><b>${effortLabel(summary.standardHours)}</b><span>전체 기준공수</span></div>
        <div class="mini"><b>${summary.delayed}건</b><span>일정 지연</span></div>
      </div>
      ${rankingCharts}
      ${type === "groupPeople" ? '<button class="secondary operator-detail-open" data-detail-type="groupRanking" type="button">그룹별 순위표로 돌아가기</button>' : ""}
      <div class="person-work-list">${visible.map((item) => `
        <article class="person-work-card">
          <div class="operator-row-title"><strong>${item.name}</strong><span>${item.person.team || item.work.team} · ${item.person.subgroup || item.work.subgroup || "세부 그룹 미지정"} · ${item.person.position || "-"} · ${item.person.grade || "-"}등급</span></div>
          <div class="operator-row-metrics">
            <span class="pill">업무 ${item.data.total}건</span>
            <span class="pill">완료 ${item.data.completed}건</span>
            <span class="pill">기준공수 ${effortLabel(item.standardHours)}</span>
            <span class="pill">1일 평균 ${formatNumber(item.averageDailyHours)}H</span>
            <span class="pill" title="${item.workMonths.join(', ') || '작업 이력 없음'}">평균 산정 ${item.workMonths.length}개월 · ${formatNumber(item.workingDays)} W/D</span>
            <span class="pill">절대 가동 ${item.load}%</span>
            <span class="pill">프로젝트 ${item.projectLoad}% / 생산 ${item.projectProduction}%</span>
            <span class="pill">회사 ${item.companyLoad}% / 생산 ${item.companyProduction}%</span>
            <span class="pill">일정 지연 ${item.data.delayed}건</span>
            <span class="pill">결과물 ${item.data.outputs}개</span>
          </div>
        </article>`).join("") || `<p class="empty-text">조건에 해당하는 인원이 없습니다.</p>`}</div>`;
    updateOperatorDetailPagination(totalPages, people.length, "명");
  } else {
    const rows = items.filter((task) => task.project === value);
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    state.operatorDetailPage = Math.min(Math.max(state.operatorDetailPage, 1), totalPages);
    const visible = rows.slice((state.operatorDetailPage - 1) * pageSize, state.operatorDetailPage * pageSize);
    const summary = summarize(rows);
    $("#operatorDetailModalTitle").textContent = `${value} 프로젝트 상세`;
    $("#operatorDetailModalDescription").textContent = "프로젝트 업무 목록을 20건씩 표시합니다.";
    $("#operatorDetailModalBody").innerHTML = `
      <div class="operator-detail-summary">
        <div class="mini"><b>${summary.total}건</b><span>업무 건수</span></div>
        <div class="mini"><b>${summary.outputs}개</b><span>결과물</span></div>
        <div class="mini"><b>${summary.completionRate}%</b><span>완료율</span></div>
        <div class="mini"><b>${summary.delayed}건</b><span>일정 지연</span></div>
      </div>
      <div class="table-wrap"><table><thead><tr><th>번호</th><th>고객사</th><th>프로젝트</th><th>유형</th><th>상태</th><th>담당자</th><th>기준공수</th><th>결과물</th></tr></thead>
      <tbody>${visible.map((task) => `<tr><td>${task.id}</td><td>${task.client}</td><td>${task.project}</td><td>${task.type}</td><td>${task.status}</td><td>${task.owner}</td><td>${effortLabel(task.standardHours)}</td><td>${task.outputs.join("<br>") || "-"}</td></tr>`).join("") || `<tr><td colspan="8">조회할 데이터가 없습니다.</td></tr>`}</tbody></table></div>`;
    updateOperatorDetailPagination(totalPages, rows.length, "건");
  }
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function updateOperatorDetailPagination(totalPages, totalItems, unit) {
  $("#operatorDetailPagination").hidden = false;
  $("#operatorDetailPageStatus").textContent = `${state.operatorDetailPage} / ${totalPages} · 총 ${totalItems}${unit}`;
  $$(".operator-detail-page").forEach((button) => {
    button.disabled = button.dataset.direction === "-1" ? state.operatorDetailPage <= 1 : state.operatorDetailPage >= totalPages;
  });
}

function syncLocalAccount(accountData) {
  const existing = accounts.find((account) => account.id === accountData.id);
  if (existing) {
    const beforeName = existing.name;
    Object.assign(existing, accountData);
    if (beforeName !== existing.name) renamePersonReferences(beforeName, existing.name);
    return existing;
  }
  accounts.push(accountData);
  return accountData;
}

async function upsertAccountFromForm({ id, name, password = "", role, projects, status = "사용", team = "", subgroup = "" }) {
  if (!id || !name || !role) throw new Error("계정 ID, 직원명, 권한을 입력하세요.");
  if (remoteAuthEnabled) {
    const result = await remoteData.upsertAuthAccount({
      login_id: id,
      password,
      display_name: name,
      team_name: team,
      subgroup_name: subgroup,
      role,
      status,
      projects,
    });
    return syncLocalAccount({ id, name, role, projects, status, team: team || "미지정", subgroup, remote: true, _userId: result?.account_user_id || result?.user_id });
  }
  return syncLocalAccount({ id, name, password, role, projects, status, team, subgroup });
}

function temporaryAccountPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join("");
}

async function saveRecordEdit() {
  const edit = state.recordEdit;
  if (!edit) return;
  if (edit.type === "task") {
    const target = tasks[edit.index];
    if (!target) return;
    const account = currentAccount();
    if (!canEditTaskRecord(target, account)) throw new Error("이 업무를 수정할 권한이 없습니다.");
    if (account?.role === "worker") {
      const member = currentWorkerMember();
      const previousStatus = target.status;
      const previousOutputs = aggregateOutputDetails(taskOutputDetails(target)).join(", ") || "-";
      const previousCompletedDate = target.completedDate || "";
      const status = $("#editTaskStatus")?.value || target.status;
      const selectedOutputs = editedTaskOutputs(target, target.project, member?.name || target.owner, member?._id || target.ownerEmployeeId || "");
      const allowsNoOutput = !taskOutputDetails(target).length && target.manualStandardHours !== null && target.manualStandardHours !== undefined;
      if (!selectedOutputs.length && !allowsNoOutput) throw new Error("결과물을 한 개 이상 선택하고 수량을 입력하세요.");
      const nextStatus = TASK_STATUSES.includes(status) ? status : target.status;
      if (nextStatus !== target.status) target.statusUpdatedAt = new Date().toISOString();
      target.status = nextStatus;
      target.stage = projectUsesStages(target.project) ? taskStageValue("edit") : "";
      target.stageDetail = projectUsesStages(target.project) ? ($("#editTaskStageDetailInput")?.value.trim() || "") : "";
      target.rejected = target.status === "반려";
      if (target.status === "완료") {
        target.completedDate ||= localDateString();
        target.end = target.completedDate;
      } else {
        target.completedDate = "";
        if (!target.end || target.end === previousCompletedDate) target.end = target.dueDate || target.start || "";
      }
      target.outputDetails = selectedOutputs;
      target.outputs = aggregateOutputDetails(selectedOutputs);
      target.baseStandardHours = selectedOutputs.length
        ? selectedOutputs.reduce((sum, item) => sum + Number(item.count || 0) * Number(item.standardHoursPerUnit || 0), 0)
        : Number(target.manualStandardHours || 0);
      target.manualStandardHours = selectedOutputs.length ? null : Number(target.manualStandardHours || 0);
      recalculateTaskHours(target);
      const rule = taskSlaRule(target, true);
      target.slaDueDate = rule.configured ? addWorkingDays(target.start, rule.limit) : "";
      target.slaLimit = rule.limit;
      target.slaRuleLabel = rule.source;
      target.slaRuleType = rule.type;
      target.slaConfigured = rule.configured;
      target.slaRuleStored = true;
      const personalStatus = { 요청: "미처리", 진행: "처리중", 검수: "처리중", 완료: "완료", 보류: "보류", 반려: "보류" }[target.status] || "미처리";
      let entry = workerTaskStatuses.find((item) => item.taskId === target.id && item.employeeId === member?._id);
      if (!entry) {
        entry = {
          _id: nextRecordId("WTS", workerTaskStatuses.map((item) => item._id), 6),
          taskId: target.id,
          employeeId: member?._id || "",
          userId: account._userId,
          status: "미처리",
          startedAt: "",
          completedAt: "",
          updatedAt: "",
        };
        workerTaskStatuses.push(entry);
      }
      const today = localDateString();
      entry.status = personalStatus;
      entry.userId = account._userId || entry.userId;
      if (personalStatus === "처리중" && !entry.startedAt) entry.startedAt = today;
      if (personalStatus === "완료") {
        entry.startedAt ||= today;
        entry.completedAt = today;
      } else {
        entry.completedAt = "";
      }
      entry.updatedAt = new Date().toISOString();
      syncTaskSlaViolations();
      appendProjectHistory(target.project, "업무 진행 및 결과물", `${previousStatus} / ${previousOutputs}`, `${target.status} / ${target.stage || "단계 없음"} / ${target.outputs.join(", ") || "-"}`, `${account.id} 실무자 수정`, "업무");
      state.recordEdit = null;
      return;
    }
    const beforeDueDate = target.dueDate || "";
    const beforeProject = target.project;
    const beforeTaskSummary = `${target.id} / ${target.title} / ${target.owner} / ${target.status} / ${aggregateOutputDetails(taskOutputDetails(target)).join(", ") || "-"}`;
    const project = $("#editTaskProject").value;
    const owner = $("#editTaskOwner").value;
    const ownerMember = members.find((member) => member.name === owner);
    const selectedOutputs = editedTaskOutputs(target, project, owner, ownerMember?._id || "", true);
    const relatedTaskId = validatedRelatedTaskId($("#editTaskRelatedTask")?.value, project, target.id);
    const allowsNoOutput = !taskOutputDetails(target).length && target.manualStandardHours !== null && target.manualStandardHours !== undefined;
    if (!project || !owner || !$("#editTaskTitle").value.trim() || relatedTaskId === null || (!selectedOutputs.length && !allowsNoOutput)) throw new Error(relatedTaskId === null ? "연결 업무는 선택 프로젝트의 기존 업무번호를 선택하세요." : "프로젝트, 업무명, 담당자, 결과물을 확인하세요.");
    const previousStatus = target.status;
    const status = $("#editTaskStatus").value;
    const completedDate = status === "완료" ? ($("#editTaskCompletedDate")?.value || "") : "";
    const nextDueDate = $("#editTaskDue").value || target.dueDate;
    const dueDateChanged = beforeDueDate !== nextDueDate;
    const scheduleChangeReason = $("#editTaskScheduleReason").value;
    const scheduleResponsibility = scheduleChangeResponsibility(scheduleChangeReason);
    if (dueDateChanged && !scheduleResponsibility) throw new Error("완료 예정일을 변경할 때는 지정된 일정 변경 사유를 선택하세요.");
    target.originalDueDate ||= beforeDueDate || nextDueDate;
    target.project = project;
    target.client = projectConfig(project)?.client || target.client;
    target.title = $("#editTaskTitle").value.trim();
    target.relatedTaskId = relatedTaskId;
    target.owner = owner;
    target.ownerEmployeeId = ownerMember?._id || target.ownerEmployeeId || "";
    target.team = ownerMember?.team || projectWorkSettings.find((item) => item.project === project)?.team || target.team || "미지정";
    target.type = projectDirection(project);
    target.stage = projectUsesStages(project) ? taskStageValue("edit") : "";
    target.stageDetail = projectUsesStages(project) ? ($("#editTaskStageDetailInput")?.value.trim() || "") : "";
    target.channel = $("#editTaskChannel").value;
    target.photoType = normalizePhotoType($("#editTaskPhotoType").value);
    if (account?.role === "admin" && $("#editTaskEffortBuffer")) {
      target.effortBufferPct = normalizeEffortBufferPct($("#editTaskEffortBuffer")?.value);
    }
    target.start = $("#editTaskStart").value || target.start;
    target.dueDate = nextDueDate;
    target.completedDate = completedDate;
    target.end = completedDate || target.dueDate || target.start;
    target.status = status;
    target.rejected = status === "반려";
    target.urgent = $("#editTaskUrgent").checked;
    target.revision = $("#editTaskRevision").checked;
    if (dueDateChanged) {
      target.slaResponsibility = scheduleResponsibility;
      target.scheduleChangeReason = scheduleChangeReason;
      appendTaskScheduleChange(target, beforeDueDate, target.dueDate, scheduleChangeReason, scheduleResponsibility);
    }
    target.outputDetails = selectedOutputs;
    target.outputs = aggregateOutputDetails(selectedOutputs);
    const editedManualHours = Math.max(0, Number($("#editTaskManualHours")?.value ?? target.manualStandardHours ?? 0));
    target.baseStandardHours = selectedOutputs.length
      ? selectedOutputs.reduce((sum, item) => sum + Number(item.count || 0) * Number(item.standardHoursPerUnit || 0), 0)
      : editedManualHours;
    target.manualStandardHours = selectedOutputs.length ? null : editedManualHours;
    recalculateTaskHours(target);
    const rule = taskSlaRule(target, true);
    target.slaDueDate = rule.configured ? addWorkingDays(target.start, rule.limit) : "";
    target.slaLimit = rule.limit;
    target.slaRuleLabel = rule.source;
    target.slaRuleType = rule.type;
    target.slaConfigured = rule.configured;
    target.slaRuleStored = true;
    appendProjectHistory(
      project,
      "업무 변경",
      beforeTaskSummary,
      `${target.id} / ${target.title} / ${target.owner} / ${target.status} / ${target.stage || "단계 없음"} / ${target.outputs.join(", ") || "-"}`,
      beforeProject === project ? "업무 정보 수정" : `업무 프로젝트 변경: ${beforeProject} → ${project}`,
      "업무"
    );
    if (owner && !projectAssignments[project]?.includes(owner)) {
      projectAssignments[project] ||= [];
      projectAssignments[project].push(owner);
    }
    syncTaskSlaViolations();
  } else if (edit.type === "workResource") {
    const target = workResources[edit.index];
    if (!target || !canManageWorkResources() || !canAccessWorkResource(target)) throw new Error("업무 자료를 수정할 권한이 없습니다.");
    const project = $("#editWorkResourceProject").value;
    const title = $("#editWorkResourceTitle").value.trim();
    const content = $("#editWorkResourceContent").value.trim();
    const referenceUrl = $("#editWorkResourceLink").value.trim();
    if (!workResourceProjectConfigs().some((item) => item.project === project) || !title || !content) throw new Error("접근 가능한 프로젝트, 제목, 내용을 확인하세요.");
    if (referenceUrl && !safeHttpUrl(referenceUrl)) throw new Error("참고 링크는 http 또는 https 주소로 입력하세요.");
    const retainedPaths = $$(".edit-work-resource-image-keep:checked").map((input) => input.dataset.path).filter(Boolean);
    const removedPaths = (target.imagePaths || []).filter((path) => !retainedPaths.includes(path));
    const newImages = [...($("#editWorkResourceImages")?.files || [])];
    if (retainedPaths.length + newImages.length > 20) throw new Error("기존 이미지를 포함해 최대 20장까지 저장할 수 있습니다.");
    if (project !== target.project && retainedPaths.length) throw new Error("프로젝트를 변경하려면 기존 이미지 선택을 모두 해제한 뒤 새로 첨부하세요.");
    let uploadedPaths = [];
    if (newImages.length) {
      if (!remoteData?.uploadWorkResourceImages) throw new Error("Supabase 이미지 저장 기능을 사용할 수 없습니다.");
      const projectRecord = projectConfigs.find((item) => item.project === project);
      projectRecord._id ||= nextRecordId("PRJ", projectConfigs.map((item) => item._id), 3);
      uploadedPaths = await remoteData.uploadWorkResourceImages(projectRecord._id, target._id, newImages);
    }
    if (removedPaths.length) await remoteData?.removeWorkResourceImages?.(removedPaths);
    Object.assign(target, {
      project,
      category: $("#editWorkResourceCategory").value,
      title,
      content,
      referenceUrl,
      imagePaths: [...retainedPaths, ...uploadedPaths],
      pinned: $("#editWorkResourcePinned").checked,
      updatedAt: new Date().toISOString(),
    });
  } else if (edit.type === "project") {
    const target = projectConfigs[edit.index];
    const amounts = normalizedContractAmounts({
      total: $("#editProjectTotal").value,
      monthly: $("#editProjectMonthly").value,
      startDate: $("#editProjectStartDate").value,
      endDate: $("#editProjectEndDate").value,
      source: $("#editProjectTotal").dataset.amountSource || "total",
    });
    const contractPeople = Number($("#editProjectPeople").value || 0);
    const next = {
      client: $("#editProjectClient").value.trim(),
      project: $("#editProjectName").value.trim(),
      direction: $("#editProjectDirection").value,
      parentProjectId: $("#editProjectDirection").value === "이커머스" ? "" : ($("#editProjectParent")?.value || ""),
      startDate: $("#editProjectStartDate").value,
      endDate: $("#editProjectEndDate").value,
      monthly: amounts.monthly,
      total: amounts.total,
      contractPeople,
      managementPeople: assignedProjectManagers(target.project).length,
      unitPrice: calculatedUnitPrice(amounts.monthly, contractPeople),
      monthlyPersonCost: Number($("#editProjectMonthlyPersonCost").value || 0),
    };
    const parent = next.parentProjectId ? projectConfigs.find((project) => project._id === next.parentProjectId) : null;
    if (parent && parent.client !== next.client) return;
    if (!next.client || !next.project || projectConfigs.some((project) => project !== target && project.project === next.project)) return;
    const beforeName = target.project;
    const reason = $("#editProjectReason").value.trim() || "프로젝트 구성 수정";
    const changes = [
      ["고객사", target.client, next.client],
      ["프로젝트 과업명", target.project, next.project],
      ["방향성", target.direction, next.direction],
      ["확장 계약 기준", target.parentProjectId || "단독 계약", next.parentProjectId || "단독 계약"],
      ["계약 시작일", target.startDate || "-", next.startDate || "-"],
      ["계약 종료일", target.endDate || "-", next.endDate || "-"],
      ["월 계약금", money(target.monthly), money(next.monthly)],
      ["총 계약금", money(target.total), money(next.total)],
      ["계약 인원", `${target.contractPeople || 0}명`, `${next.contractPeople}명`],
      ["1인 월 평단가", money(target.unitPrice || 0), money(next.unitPrice)],
      ["1인 월 원가", money(target.monthlyPersonCost || 0), money(next.monthlyPersonCost)],
    ].filter(([, before, after]) => before !== after);
    renameProjectReferences(beforeName, next.project);
    Object.assign(target, next);
    changes.forEach(([field, before, after]) => appendProjectHistory(next.project, field, before, after, reason));
    if (state.configProject === beforeName) state.configProject = next.project;
    if (state.slaRuleProject === beforeName) state.slaRuleProject = next.project;
    if (state.deliverableProject === beforeName) state.deliverableProject = next.project;
    if (state.productivityProject === beforeName) state.productivityProject = next.project;
  } else if (edit.type === "team") {
    const target = teams[edit.index];
    const beforeName = target.name;
    const nextName = $("#editTeamName").value.trim();
    if (!nextName || teams.some((team, index) => index !== edit.index && team.name === nextName)) return;
    const affectedAccounts = accounts.filter((account) => account.team === beforeName || members.some((member) => member.name === account.name && member.team === beforeName));
    target.name = nextName;
    target.baseGroup = $("#editTeamBaseGroup").value.trim() || nextName;
    target.subgroups = $("#editTeamSubgroups").value.split(",").map((value) => value.trim()).filter(Boolean);
    members.forEach((member) => {
      if (member.team !== beforeName) return;
      member.team = nextName;
      if (member.subgroup && !target.subgroups.includes(member.subgroup)) member.subgroup = "";
    });
    Object.values(workers).forEach((worker) => {
      if (worker.team === beforeName) worker.team = nextName;
      if (worker.subgroup && !target.subgroups.includes(worker.subgroup)) worker.subgroup = "";
    });
    tasks.forEach((task) => { if (task.team === beforeName) task.team = nextName; });
    projectWorkSettings.forEach((setting) => {
      setting.teams = projectSettingTeams(setting).map((name) => (name === beforeName ? nextName : name));
      setting.team = setting.teams[0] || "미지정";
    });
    affectedAccounts.forEach((account) => {
      account.team = nextName;
      const member = members.find((item) => item.name === account.name);
      account.subgroup = member?.subgroup || "";
      account.projects = accountTeamProjectNames(account);
    });
    if (state.adminTeam === beforeName) state.adminTeam = nextName;
    await persistOperationalNow();
    for (const account of affectedAccounts.filter((item) => item.remote && item._userId)) {
      await remoteData.updateProfile(account._userId, {
        team_name: nextName,
        subgroup_name: account.subgroup || null,
      });
    }
  } else if (edit.type === "position") {
    const target = positions[edit.index];
    const beforeName = target.name;
    const nextName = $("#editPositionName").value.trim();
    if (!nextName || positions.some((position, index) => index !== edit.index && position.name === nextName)) return;
    target.name = nextName;
    members.forEach((member) => { if (member.position === beforeName) member.position = nextName; });
    if (state.adminPosition === beforeName) state.adminPosition = nextName;
  } else if (edit.type === "projectSetting") {
    const target = projectWorkSettings[edit.index] || null;
    const beforeProject = target?.project || edit.project || $("#editSettingProject").value;
    const beforeTeams = projectSettingTeams(target);
    const beforeExtras = projectSettingExtraMembers(target);
    const beforeManagers = projectSettingManagers(target);
    const selectedTeams = [...state.editSettingDraftTeams];
    const selectedExtras = [...state.editSettingDraftMembers];
    const selectedManagers = [...state.editSettingDraftManagers];
    if (!selectedTeams.length && !selectedExtras.length && !selectedManagers.length) throw new Error("진행 팀, 개별 인원 또는 관리자를 한 명 이상 선택하세요.");
    const next = {
      project: $("#editSettingProject").value,
      team: selectedTeams[0] || "미지정",
      teams: selectedTeams,
      extraMembers: selectedExtras,
      managerMembers: selectedManagers,
      sla: 0,
      absoluteDailyHours: Number($("#editSettingAbsoluteHours").value) === 8 ? 8 : 7,
      month: $("#editSettingMonth").value.trim(),
    };
    const dailyTarget = Number($("#editAssignmentDailyTarget").value);
    const monthlyInput = $("#editAssignmentMonthlyTarget").value.trim();
    const monthlyTarget = monthlyInput === "" ? null : Number(monthlyInput);
    if (!Number.isFinite(dailyTarget) || dailyTarget <= 0 || (monthlyTarget !== null && (!Number.isFinite(monthlyTarget) || monthlyTarget <= 0))) throw new Error("배정 목표 공수는 0보다 큰 수를 입력하세요.");
    const reason = $("#editSettingReason").value.trim() || "프로젝트 작업 세팅 수정";
    [["진행 프로젝트", beforeProject, next.project], ["진행 팀", beforeTeams.join(", ") || "미지정", selectedTeams.join(", ") || "미지정"], ["개별 인원", beforeExtras.join(", ") || "없음", selectedExtras.join(", ") || "없음"], ["관리 인원", beforeManagers.join(", ") || "없음", selectedManagers.join(", ") || "없음"], ["절대 기준 근로시간", `${absoluteDailyHoursForProject(beforeProject)}H`, `${next.absoluteDailyHours}H`], ["적용월", target?.month || "미설정", next.month]]
      .filter(([, before, after]) => before !== after)
      .forEach(([field, before, after]) => appendProjectHistory(next.project, field, before, after, reason, "팀 매칭"));
    if (target) Object.assign(target, next);
    else projectWorkSettings.push(next);
    const nextProjectConfig = projectConfig(next.project);
    if (nextProjectConfig) {
      appendProjectHistory(next.project, "배정 목표 공수", `${nextProjectConfig.assignmentDailyTarget ?? '기본'} / ${nextProjectConfig.assignmentMonthlyTarget ?? '자동'}`, `${dailyTarget} / ${monthlyTarget ?? '자동'}`, reason, "팀 매칭");
      if (nextProjectConfig.publicDailyEnabled !== $("#editPublicDailyEnabled").checked) appendProjectHistory(next.project, "일간 현황 공개", nextProjectConfig.publicDailyEnabled ? "공개" : "비공개", $("#editPublicDailyEnabled").checked ? "공개" : "비공개", reason, "팀 매칭");
      Object.assign(nextProjectConfig, {absoluteDailyHours:next.absoluteDailyHours, assignmentDailyTarget:dailyTarget, assignmentMonthlyTarget:monthlyTarget, publicDailyEnabled:$("#editPublicDailyEnabled").checked});
    }
    if (target && beforeProject !== next.project) syncProjectAssignments(beforeProject, [], [], [], `프로젝트 매칭 변경: ${beforeProject} → ${next.project}`);
    syncProjectAssignments(next.project, selectedTeams, selectedExtras, selectedManagers, reason);
    await persistOperationalNow();
  } else if (edit.type === "deliverable") {
    const target = deliverables[edit.index];
    const beforeSummary = `${target.project} / ${target.name} / ${target.standardHours || 0}H / 환산=${target.conversionTarget || target.name}`;
    const beforeName = target.name;
    const nextName = $("#editDeliverableName").value.trim();
    if (!nextName) return;
    Object.assign(target, {
      project: $("#editDeliverableProject").value,
      name: nextName,
      standardHours: Number($("#editDeliverableHours").value || 0),
      slaDays: $("#editDeliverableSlaDays").value === "" ? null : Math.max(0, Math.floor(Number($("#editDeliverableSlaDays").value || 0))),
      slaEnabled: $("#editDeliverableSlaDays").value !== "",
      conversionTarget: $("#editDeliverableTarget").value,
    });
    appendProjectHistory(
      target.project,
      "업무 템플릿",
      beforeSummary,
      `${target.project} / ${target.name} / ${target.standardHours || 0}H / 평균작업일=${target.slaEnabled ? `${target.slaDays}영업일` : "미설정"} / 환산=${target.conversionTarget || target.name}`,
      "업무 템플릿 수정",
      "결과물"
    );
    deliverables.forEach((deliverable) => {
      if (deliverable.conversionTarget === beforeName) deliverable.conversionTarget = nextName;
    });
  } else if (edit.type === "account") {
    const target = accounts[edit.index];
    if (!target) return;
    const beforeRole = target.role;
    const nextRole = $("#editAccountRole").value;
    await upsertAccountFromForm({
      id: target.id,
      name: target.name || target.id,
      password: "",
      role: nextRole,
      projects: target.projects || [],
      status: target.status || "사용",
      team: target.team || "",
      subgroup: target.subgroup || "",
    });
    if (state.currentAccountId === target.id) {
      state.selectedMemberAccount = target.id;
      state.client = "전체";
      state.project = "전체";
      normalizeScopedFilters();
    }
    const affectedProjects = [...new Set([...accountTeamProjectNames(target), ...(target.projects || [])])];
    affectedProjects.forEach((project) => appendProjectHistory(
      project,
      "계정 권한",
      `${target.id} / ${accountRoleLabels[beforeRole] || beforeRole}`,
      `${target.id} / ${accountRoleLabels[nextRole] || nextRole}`,
      "계정 권한 수정",
      "권한"
    ));
  }
  state.recordEdit = null;
}

function deleteRecord(type, index, button) {
  if (type === "workResource") {
    const target = workResources[index];
    if (!canManageWorkResources() || !canAccessWorkResource(target)) return;
    if (target?.imagePaths?.length) remoteData?.removeWorkResourceImages?.(target.imagePaths).catch((error) => console.warn("업무 자료 이미지 삭제 실패", error));
    workResources.splice(index, 1);
  } else if (type === "deliverable") {
    const target = deliverables[index];
    if (target) {
      appendProjectHistory(
        target.project,
        "업무 템플릿",
        `${target.name} / ${target.standardHours || 0}H / 환산=${target.conversionTarget || target.name}`,
        "삭제",
        "업무 템플릿 삭제",
        "결과물"
      );
    }
    deliverables.splice(index, 1);
  } else if (type === "projectSetting") {
    const target = projectWorkSettings[index];
    if (target) {
      appendProjectHistory(target.project, "진행 팀", projectSettingTeams(target).join(", ") || "미지정", "매칭 해제", "프로젝트 작업 세팅 삭제", "팀 매칭");
      syncProjectAssignments(target.project, [], [], [], "프로젝트 작업 세팅 삭제");
    }
    projectWorkSettings.splice(index, 1);
  } else if (type === "team") {
    const target = teams[index];
    const inUse = members.some((member) => member.team === target.name) || projectWorkSettings.some((setting) => projectSettingTeams(setting).includes(target.name));
    if (inUse) {
      const original = button.textContent;
      button.textContent = "사용 중";
      setTimeout(() => { button.textContent = original; }, 1200);
      return;
    }
    teams.splice(index, 1);
  } else if (type === "position") {
    const target = positions[index];
    if (members.some((member) => member.position === target.name)) {
      const original = button.textContent;
      button.textContent = "사용 중";
      setTimeout(() => { button.textContent = original; }, 1200);
      return;
    }
    positions.splice(index, 1);
  }
  renderAll();
}

function notificationAccountMember(account = currentAccount()) {
  return members.find((member) => member.name === account?.name && member.employmentStatus !== "퇴사") || null;
}

function notificationScopeTasks(account = currentAccount()) {
  if (!account) return [];
  if (account.role === "admin") return tasks.filter((task) => projectConfig(task.project)?.status !== "closed");
  const allowedProjects = accessibleProjectNames(account);
  const scoped = tasks.filter((task) => allowedProjects.has(task.project));
  if (account.role !== "worker") return scoped;
  const member = notificationAccountMember(account);
  return member ? scoped.filter((task) => taskAssignedToMember(task, member)) : [];
}

function notificationStateFor(key, account = currentAccount()) {
  const userId = account?._userId || account?.id || "";
  return notificationStates.find((entry) => entry.userId === userId && entry.key === key) || null;
}

function memberWasEmployedOn(member, date) {
  if (!member) return false;
  const workDate = String(date || "").slice(0, 10);
  if (!workDate) return member.employmentStatus !== "퇴사";
  if (member.joinedDate && workDate < member.joinedDate) return false;
  if (member.leftDate && workDate > member.leftDate) return false;
  if (member.employmentStatus === "퇴사" && !member.leftDate) return false;
  return true;
}

function buildAutomaticNotifications(account = currentAccount()) {
  const today = localDateString();
  const rules = state.notificationRules;
  const scopedTasks = notificationScopeTasks(account);
  const notifications = [];
  scopedTasks.forEach((task) => {
    const dueDate = task.dueDate || task.end || task.start || "";
    const assignmentDate = task.start || dueDate || "";
    const completed = task.status === "완료";
    const outputs = taskOutputDetails(task).filter((detail) => Number(detail.count || 0) > 0);
    const issues = [];
    let severity = "안내";
    let title = "업무 확인 필요";
    const remainingDays = dueDate ? dateDiffDays(today, dueDate) : null;
    if (rules.overdueEnabled && !completed && dueDate && dueDate < today) {
      issues.push(`완료 예정일 ${dueDate}이 지났습니다.`);
      severity = "위험";
      title = "완료 일정 지연";
    } else if (rules.dueSoonEnabled && !completed && dueDate && remainingDays >= 0 && remainingDays <= rules.dueSoonDays) {
      issues.push(remainingDays === 0 ? "오늘 완료 예정인 업무입니다." : `완료 예정일까지 ${remainingDays}일 남았습니다.`);
      severity = "경고";
      title = "완료 일정 임박";
    }
    const ownerMember = members.find((member) => member.name === task.owner);
    if (rules.ownerEnabled && (!task.owner || task.owner === "미지정" || !memberWasEmployedOn(ownerMember, assignmentDate))) {
      issues.push(ownerMember?.leftDate && assignmentDate > ownerMember.leftDate
        ? `담당자의 퇴사일(${ownerMember.leftDate}) 이후 접수된 업무입니다.`
        : ownerMember?.joinedDate && assignmentDate < ownerMember.joinedDate
          ? `담당자의 입사일(${ownerMember.joinedDate}) 이전 접수된 업무입니다.`
          : "업무 접수일 기준 유효한 담당자를 확인할 수 없습니다.");
      severity = "위험";
      title = "담당자 확인 필요";
    }
    const reviewStart = task.statusUpdatedAt || task.start || today;
    const reviewAge = Math.max(0, dateDiffDays(reviewStart, today));
    if (rules.reviewEnabled && task.status === "검수" && reviewAge >= rules.reviewDays) {
      issues.push(`검수 단계가 ${reviewAge}일째 지속되고 있습니다.`);
      if (severity !== "위험") severity = "경고";
      if (title === "업무 확인 필요") title = "검수 대기";
    }
    if (rules.outputEnabled && ["검수", "완료"].includes(task.status) && outputs.length === 0) {
      issues.push("등록된 결과물이 없습니다.");
      if (severity !== "위험") severity = "경고";
      if (title === "업무 확인 필요") title = "결과물 누락";
    }
    const unmatched = outputs.filter((output) => !deliverables.some((rule) => rule.project === task.project && rule.name === output.name));
    if (rules.templateEnabled && unmatched.length) {
      issues.push(`업무 템플릿과 연결되지 않은 결과물 ${unmatched.length}종이 있습니다.`);
      if (severity !== "위험") severity = "경고";
      if (title === "업무 확인 필요") title = "업무 템플릿 확인";
    }
    if (!issues.length) return;
    const key = `task:${task.id}:attention`;
    const saved = notificationStateFor(key, account);
    notifications.push({
      key, severity, title, message: issues.join(" "), project: task.project, taskId: task.id,
      owner: task.owner || "미지정", date: dueDate || task.start || "-", taskIndex: tasks.indexOf(task),
      readAt: saved?.readAt || "", resolvedAt: saved?.resolvedAt || "",
    });
  });
  if (rules.contractEnabled && account?.role !== "worker") {
    accessibleProjectConfigs(account).forEach((project) => {
      if (!project.endDate) return;
      const remaining = dateDiffDays(today, project.endDate);
      if (remaining < 0 || remaining > rules.contractDays) return;
      const key = `project:${project._id || project.project}:contract-end`;
      const saved = notificationStateFor(key, account);
      notifications.push({
        key, severity: remaining <= 7 ? "위험" : "안내", title: "계약 종료 예정",
        message: remaining === 0 ? "계약 종료일이 오늘입니다." : `계약 종료일까지 ${remaining}일 남았습니다.`,
        project: project.project, taskId: "-", owner: "-", date: project.endDate, taskIndex: null,
        readAt: saved?.readAt || "", resolvedAt: saved?.resolvedAt || "",
      });
    });
  }
  const severityOrder = { "위험": 0, "경고": 1, "안내": 2 };
  return notifications.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || String(a.date).localeCompare(String(b.date)) || a.key.localeCompare(b.key));
}

async function saveNotificationState(notification, patch = {}) {
  const account = currentAccount();
  const userId = account?._userId || account?.id || "";
  if (!notification || !userId) return;
  const existing = notificationStateFor(notification.key, account);
  const now = new Date().toISOString();
  const next = {
    stateId: existing?.stateId || `${userId}::${notification.key}`,
    key: notification.key,
    userId,
    readAt: patch.readAt !== undefined ? patch.readAt : (existing?.readAt || ""),
    resolvedAt: patch.resolvedAt !== undefined ? patch.resolvedAt : (existing?.resolvedAt || ""),
    updatedAt: now,
  };
  if (existing) Object.assign(existing, next);
  else notificationStates.push(next);
  renderNotifications();
  if (!remoteData || !account?._userId) return;
  try {
    setDbSaveStatus("saving", "알림 상태 저장 중");
    await remoteData.upsert("notification_states", [{
      state_id: next.stateId,
      notification_key: next.key,
      user_id: next.userId,
      read_at: next.readAt || null,
      resolved_at: next.resolvedAt || null,
      updated_at: next.updatedAt,
    }]);
    setDbSaveStatus("saved", "알림 상태 저장 완료");
  } catch (error) {
    setDbSaveStatus("error", `notification_states 저장 실패: ${authMessage(error)}`);
  }
}

function renderNotificationBadges(notifications = buildAutomaticNotifications()) {
  const unread = notifications.filter((item) => !item.readAt && !item.resolvedAt).length;
  $$(".notification-nav-badge").forEach((badge) => {
    badge.textContent = unread > 99 ? "99+" : String(unread);
    badge.hidden = unread === 0;
  });
}

function renderNotifications() {
  const container = $("#notificationRows");
  const notifications = buildAutomaticNotifications();
  renderNotificationBadges(notifications);
  if (!container) return;
  const projects = ["전체", ...new Set(notifications.map((item) => item.project).filter(Boolean))];
  if (!projects.includes(state.notificationProject)) state.notificationProject = "전체";
  $("#notificationProjectFilter").innerHTML = optionList(projects, state.notificationProject);
  $("#notificationStatusFilter").value = state.notificationStatus;
  $("#notificationSeverityFilter").value = state.notificationSeverity;
  $("#notificationSearch").value = state.notificationSearch;
  $("#notificationDangerCount").textContent = notifications.filter((item) => item.severity === "위험" && !item.resolvedAt).length;
  $("#notificationWarningCount").textContent = notifications.filter((item) => item.severity === "경고" && !item.resolvedAt).length;
  $("#notificationUnreadCount").textContent = notifications.filter((item) => !item.readAt && !item.resolvedAt).length;
  $("#notificationResolvedCount").textContent = notifications.filter((item) => item.resolvedAt).length;
  $("#notificationScopeLabel").textContent = `접근 범위 ${notificationScopeTasks().length.toLocaleString()}건`;
  const query = state.notificationSearch.trim().toLowerCase();
  const filtered = notifications.filter((item) => {
    const statusMatch = state.notificationStatus === "all" || (state.notificationStatus === "resolved" ? item.resolvedAt : !item.resolvedAt);
    const severityMatch = state.notificationSeverity === "전체" || item.severity === state.notificationSeverity;
    const projectMatch = state.notificationProject === "전체" || item.project === state.notificationProject;
    const searchMatch = !query || [item.taskId, item.title, item.message, item.project, item.owner].some((value) => String(value || "").toLowerCase().includes(query));
    return statusMatch && severityMatch && projectMatch && searchMatch;
  });
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  state.notificationPage = Math.min(Math.max(1, state.notificationPage), totalPages);
  const visible = filtered.slice((state.notificationPage - 1) * pageSize, state.notificationPage * pageSize);
  container.innerHTML = visible.map((item) => `<tr class="${item.readAt ? "notification-read" : "notification-unread"}">
    <td><span class="notification-severity ${item.severity === "위험" ? "danger" : item.severity === "경고" ? "warn" : "info"}">${item.severity}</span></td>
    <td><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.message)}</small></td>
    <td>${escapeHtml(item.project || "-")}</td><td><strong>${escapeHtml(item.taskId)}</strong>${item.owner !== "-" ? `<small>담당 ${escapeHtml(item.owner)}</small>` : ""}</td>
    <td>${escapeHtml(item.date)}</td><td>${item.resolvedAt ? `<span class="pill good">처리 완료</span>` : item.readAt ? `<span class="pill">읽음</span>` : `<span class="pill warn">새 알림</span>`}</td>
    <td><div class="row-actions">${item.taskIndex !== null ? `<button class="secondary small notification-open" data-notification-key="${escapeHtml(item.key)}" type="button">업무 열기</button>` : ""}<button class="secondary small notification-read-toggle" data-notification-key="${escapeHtml(item.key)}" type="button">${item.readAt ? "읽지 않음" : "읽음"}</button><button class="${item.resolvedAt ? "secondary" : "primary"} small notification-resolve-toggle" data-notification-key="${escapeHtml(item.key)}" type="button">${item.resolvedAt ? "다시 열기" : "처리 완료"}</button></div></td>
  </tr>`).join("") || `<tr><td colspan="7" class="empty-text">조건에 맞는 알림이 없습니다.</td></tr>`;
  $("#notificationPage").textContent = `${state.notificationPage} / ${totalPages} · ${filtered.length.toLocaleString()}건`;
  $("#notificationPrev").disabled = state.notificationPage <= 1;
  $("#notificationNext").disabled = state.notificationPage >= totalPages;
}

function renderNotificationRuleSettings() {
  if (!$("#notificationRulePanel") || currentAccount()?.role !== "admin") return;
  const rules = state.notificationRules;
  $("#ruleOverdueEnabled").checked = rules.overdueEnabled;
  $("#ruleDueSoonEnabled").checked = rules.dueSoonEnabled;
  $("#ruleDueSoonDays").value = rules.dueSoonDays;
  $("#ruleReviewEnabled").checked = rules.reviewEnabled;
  $("#ruleReviewDays").value = rules.reviewDays;
  $("#ruleOwnerEnabled").checked = rules.ownerEnabled;
  $("#ruleOutputEnabled").checked = rules.outputEnabled;
  $("#ruleTemplateEnabled").checked = rules.templateEnabled;
  $("#ruleContractEnabled").checked = rules.contractEnabled;
  $("#ruleContractDays").value = rules.contractDays;
}

function applyAccountPermissions() {
  const account = currentAccount();
  if (!account) return;
  if ($("#currentUserLabel")) {
    const organization = account.remote ? ` · ${account.team}${account.subgroup ? ` / ${account.subgroup}` : ""}` : "";
    $("#currentUserLabel").textContent = `로그인한 사용자 : ${account.name} (${account.id})${organization}`;
  }
  $$('.nav-mode[data-menu-mode="operator"] .nav-item').forEach((button) => {
    button.classList.toggle("hidden", !canAccessView(button.dataset.view, account));
  });
  $$('.nav-mode[data-menu-mode="admin"] .nav-item').forEach((button) => {
    button.classList.toggle("hidden", !canAccessView(button.dataset.view, account));
  });
  $$(".nav-group-label").forEach((label) => {
    const section = label.dataset.navSection;
    const mode = label.closest(".nav-mode")?.dataset.menuMode;
    const hasVisibleItem = $$(`.nav-mode[data-menu-mode="${mode}"] .nav-item[data-nav-section="${section}"]`)
      .some((button) => !button.classList.contains("hidden"));
    label.classList.toggle("hidden", !hasVisibleItem);
  });
  const canUseAdmin = account.role === "admin" || account.role === "operator_output_admin";
  $('.nav-mode[data-menu-mode="admin"]')?.classList.toggle("permission-hidden", !canUseAdmin);
  $("#modeToggle")?.classList.toggle("hidden", !canUseAdmin);
  if (!canAccessView(state.view, account)) {
    const fallbackMode = firstAllowedView(state.mode, account) ? state.mode : "operator";
    const fallback = firstAllowedView(fallbackMode, account);
    if (fallback) {
      state.mode = fallbackMode;
      state.view = fallback.dataset.view;
      $$(".nav-mode").forEach((nav) => nav.classList.toggle("active", nav.dataset.menuMode === state.mode));
      $(".operator-filter")?.classList.toggle("hidden", state.mode === "admin");
      if ($("#modeToggle")) $("#modeToggle").textContent = state.mode === "operator" ? "관리자 메뉴" : "운영자 메뉴";
    }
  }
}

function syncActiveViewDom() {
  const activeButton = $(`.nav-mode[data-menu-mode="${state.mode}"] .nav-item[data-view="${state.view}"]`) || $(`.nav-item[data-view="${state.view}"]`);
  $$(".nav-item").forEach((button) => button.classList.toggle("active", button === activeButton));
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${state.view}View`));
  if ($("#pageTitle")) $("#pageTitle").textContent = activeButton?.dataset.title || activeButton?.textContent || "대시보드";
}

function syncProjectRequiredView() {
  const activeView = $(`#${state.view}View`);
  const awaitingProject = state.mode === "operator" && PROJECT_REQUIRED_VIEWS.has(state.view) && state.project === "전체";
  $$(".view.project-awaiting").forEach((view) => {
    if (view !== activeView || !awaitingProject) view.classList.remove("project-awaiting");
  });
  if (!activeView) return;
  let notice = activeView.querySelector(":scope > .global-project-required-notice");
  if (awaitingProject && !notice) {
    notice = document.createElement("section");
    notice.className = "panel project-required-notice global-project-required-notice";
    notice.innerHTML = `<strong>프로젝트를 선택하세요</strong><p>상단 프로젝트 선택 후 해당 프로젝트의 정보를 확인할 수 있습니다.</p>`;
    activeView.prepend(notice);
  }
  activeView.classList.toggle("project-awaiting", awaitingProject);
  notice?.classList.toggle("hidden", !awaitingProject);
}

function switchAccount(accountId) {
  const account = accounts.find((item) => item.id === accountId);
  if (!account) return;
  state.currentAccountId = account.id;
  state.client = "전체";
  state.project = "전체";
  state.year = "전체";
  state.month = "";
  state.mode = "operator";
  $$(".nav-mode").forEach((nav) => nav.classList.toggle("active", nav.dataset.menuMode === "operator"));
  $(".operator-filter").classList.remove("hidden");
  $("#modeToggle").textContent = "관리자 메뉴";
  state.view = account.role === "portal" ? "portal" : account.role === "worker" ? "myWork" : "dashboard";
  applyAccountPermissions();
  syncActiveViewDom();
  syncProjectRequiredView();
  renderAll();
}

function renderAll() {
  syncTaskSlaViolations();
  const items = filteredTasks();
  applyAccountPermissions();
  syncActiveViewDom();
  if ($("#dataSourceLabel")) {
    const accessibleNames = accessibleProjectNames();
    const scopedTotal = tasks.filter((task) => accessibleNames.has(task.project)).length;
    $("#dataSourceLabel").textContent = PROJECT_REQUIRED_VIEWS.has(state.view) && state.project === "전체"
      ? "프로젝트 선택 후 데이터를 조회합니다"
      : `${currentPeriodLabel()} · Supabase DB · 접근 가능 업무 ${scopedTotal}건`;
  }
  renderFilters();
  renderNotificationBadges();
  if (state.view === "notifications") renderNotifications();
  else if (state.view === "notificationSetting") renderNotificationRuleSettings();
  else if (state.view === "dashboard") renderDashboard(items);
  else if (state.view === "myWork") renderMyWork(items);
  else if (state.view === "daily") DailyStatus.render();
  else if (state.view === "monthly") renderMonthly(items);
  else if (state.view === "gantt") renderGantt(items);
  else if (state.view === "standard") renderTaskRegistration();
  else if (state.view === "taskStatus") renderTaskStatus(items);
  else if (state.view === "workResourceCreate") renderWorkResourceCreate();
  else if (state.view === "workResources") renderWorkResources();
  else if (state.view === "resource") renderResource(items);
  else if (state.view === "kpi") renderKpi(items);
  else if (state.view === "profit") renderProfit(items);
  else if (state.view === "health") renderHealth(items);
  else if (state.mode === "admin") renderAdminSettings();
  if (state.view === "systemSetting") renderSystemSettings();
  renderMemberModal();
  renderRecordEditModal();
  renderTaskDetailModal();
  renderWorkResourceDetailModal();
  renderProjectHistoryModal();
  renderExcelImportResult();
  updateAdminFilterVisibility();
  if (state.view === "staffing" && $("#simulationResult")) renderStaffing(items);
  if (state.view === "portal" && $("#portalRows")) renderPortal(items);
  renderOperatorDetail(items);
  scheduleOperationalPersist();
}

function setMode(mode) {
  const account = currentAccount();
  if (!firstAllowedView(mode, account)) return;
  state.mode = mode;
  $$(".nav-mode").forEach((nav) => nav.classList.toggle("active", nav.dataset.menuMode === mode));
  $(".operator-filter").classList.toggle("hidden", mode === "admin");
  const first = firstAllowedView(mode, account);
  if (first) first.click();
  $("#modeToggle").textContent = mode === "operator" ? "관리자 메뉴" : "운영자 메뉴";
  updateAdminFilterVisibility();
  renderAll();
}

function activateTab(tabId) {
  if (!tabId) return;
  state.tab = tabId;
  $$(".tab").forEach((x) => x.classList.toggle("active", x.dataset.tab === tabId));
  $$(".tab-pane").forEach((x) => x.classList.toggle("active", x.id === tabId));
}

$$(".nav-item").forEach((btn) => btn.addEventListener("click", () => {
  if (!canAccessView(btn.dataset.view)) return;
  clearOperatorDetailStack();
  state.view = btn.dataset.view;
  resetTopLevelFilters(state.mode);
  if (btn.dataset.view === "deliverableSetting") {
    state.deliverableProject = "";
    state.conversionSource = "";
    state.conversionTarget = "";
    state.slaRuleProject = "";
    state.slaRuleDeliverable = "";
  }
  $$(".nav-item").forEach((x) => x.classList.toggle("active", x === btn));
  $$(".view").forEach((x) => x.classList.toggle("active", x.id === `${state.view}View`));
  $("#pageTitle").textContent = btn.dataset.title || btn.textContent;
  updateAdminFilterVisibility();
  window.scrollTo({ top: 0, behavior: "auto" });
  renderAll();
}));
if ($("#notificationStatusFilter")) $("#notificationStatusFilter").addEventListener("change", (event) => { state.notificationStatus = event.target.value; state.notificationPage = 1; renderNotifications(); });
if ($("#notificationSeverityFilter")) $("#notificationSeverityFilter").addEventListener("change", (event) => { state.notificationSeverity = event.target.value; state.notificationPage = 1; renderNotifications(); });
if ($("#notificationProjectFilter")) $("#notificationProjectFilter").addEventListener("change", (event) => { state.notificationProject = event.target.value; state.notificationPage = 1; renderNotifications(); });
if ($("#notificationSearch")) $("#notificationSearch").addEventListener("input", (event) => { state.notificationSearch = event.target.value; state.notificationPage = 1; renderNotifications(); });
if ($("#notificationPrev")) $("#notificationPrev").addEventListener("click", () => { state.notificationPage = Math.max(1, state.notificationPage - 1); renderNotifications(); });
if ($("#notificationNext")) $("#notificationNext").addEventListener("click", () => { state.notificationPage += 1; renderNotifications(); });
if ($("#saveNotificationRules")) $("#saveNotificationRules").addEventListener("click", async () => {
  const button = $("#saveNotificationRules");
  const message = $("#notificationRuleMessage");
  if (currentAccount()?.role !== "admin") {
    message.textContent = "관리자만 알림 조건을 변경할 수 있습니다.";
    message.className = "form-message error";
    return;
  }
  const next = {
    overdueEnabled: $("#ruleOverdueEnabled").checked,
    dueSoonEnabled: $("#ruleDueSoonEnabled").checked,
    dueSoonDays: Math.min(30, Math.max(0, Number($("#ruleDueSoonDays").value || 0))),
    reviewEnabled: $("#ruleReviewEnabled").checked,
    reviewDays: Math.min(30, Math.max(0, Number($("#ruleReviewDays").value || 0))),
    ownerEnabled: $("#ruleOwnerEnabled").checked,
    outputEnabled: $("#ruleOutputEnabled").checked,
    templateEnabled: $("#ruleTemplateEnabled").checked,
    contractEnabled: $("#ruleContractEnabled").checked,
    contractDays: Math.min(180, Math.max(1, Number($("#ruleContractDays").value || 30))),
  };
  button.disabled = true;
  button.textContent = "저장 중";
  try {
    if (!operationalDbReady || !remoteData?.saveSetting) throw new Error("Supabase DB 연결을 확인하세요.");
    await remoteData.saveSetting("notification_rules", next);
    state.notificationRules = next;
    message.textContent = "알림 조건을 저장했습니다.";
    message.className = "form-message success";
    setDbSaveStatus("saved", "알림 조건 저장 완료");
    renderNotifications();
  } catch (error) {
    message.textContent = `저장 실패: ${authMessage(error)}`;
    message.className = "form-message error";
    setDbSaveStatus("error", `알림 조건 저장 실패: ${authMessage(error)}`);
  } finally {
    button.disabled = false;
    button.textContent = "규칙 저장";
  }
});
if ($("#notificationRows")) $("#notificationRows").addEventListener("click", async (event) => {
  const action = event.target.closest(".notification-open, .notification-read-toggle, .notification-resolve-toggle");
  if (!action) return;
  const notification = buildAutomaticNotifications().find((item) => item.key === action.dataset.notificationKey);
  if (!notification) return;
  if (action.classList.contains("notification-read-toggle")) {
    await saveNotificationState(notification, { readAt: notification.readAt ? "" : new Date().toISOString() });
    return;
  }
  if (action.classList.contains("notification-resolve-toggle")) {
    const resolvedAt = notification.resolvedAt ? "" : new Date().toISOString();
    await saveNotificationState(notification, { readAt: resolvedAt || notification.readAt || new Date().toISOString(), resolvedAt });
    return;
  }
  saveNotificationState(notification, { readAt: notification.readAt || new Date().toISOString() });
  if (notification.taskIndex === null) return;
  state.mode = "operator";
  state.view = canAccessView("taskStatus") ? "taskStatus" : "myWork";
  state.project = notification.project;
  state.taskDetailIndex = notification.taskIndex;
  $$(".nav-mode").forEach((nav) => nav.classList.toggle("active", nav.dataset.menuMode === state.mode));
  $(".operator-filter")?.classList.remove("hidden");
  renderAll();
});
document.addEventListener("click", (event) => {
  const button = event.target.closest(".worker-task-save");
  if (!button) return;
  const row = button.closest("tr");
  const status = row?.querySelector(".worker-task-status-select")?.value || "미처리";
  updateWorkerTaskStatus(button.dataset.taskId, status);
});
document.addEventListener("change", (event) => {
  if (event.target?.id === "editTaskProject") {
    syncTaskStageFields(event.target.value, "edit", false);
    renderTaskOutputEditor();
    if ($("#editTaskRelatedTask")) $("#editTaskRelatedTask").value = "";
    renderRelatedTaskOptions(event.target.value, "#editTaskRelatedTask", "#editTaskRelatedTaskOptions", tasks[state.recordEdit?.index]?.id || "");
  }
  if (["taskStageSelect", "editTaskStageSelect"].includes(event.target?.id) && event.target.value) {
    const prefix = event.target.id.startsWith("edit") ? "editTask" : "task";
    const directInput = $(`#${prefix}StageInput`);
    if (directInput) directInput.value = "";
  }
  if (["taskPhotoTypeInput", "taskEffortBufferInput"].includes(event.target?.id)) updateTaskRegistrationSummary();
  if (event.target?.id === "modalMemberEmploymentStatus") updateMemberEmploymentFields();
  if (["modalMemberReducedWork", "modalMemberReducedStartDate", "modalMemberReducedEndDate", "modalMemberReducedStartTime", "modalMemberReducedEndTime"].includes(event.target?.id)) updateMemberReducedWorkFields();
});
document.addEventListener("click", (event) => {
  const accountOnlyTarget = event.target.closest("#accountAdd, .account-delete");
  if (accountOnlyTarget || (event.target.closest(".record-edit-save") && state.recordEdit?.type === "account")) return;
  const mutationTarget = event.target.closest([
    "#projectConfigAdd", "#teamAdd", "#positionAdd", "#memberAccountApply", "#memberLinkApply",
    "#workSettingAdd", "#slaRuleSave", "#deliverableAdd", "#deliverableBulkConvert",
    "#deliverableExcelUpload", "#dbExcelUpload", "#taskForm button[type='submit']", ".member-modal-save", ".record-edit-save",
    ".record-delete", ".member-delete", ".member-restore", ".project-close", ".project-restore", ".sla-rule-reset",
  ].join(","));
  if (mutationTarget) markOperationalDirty();
}, true);
$$(".tab").forEach((btn) => btn.addEventListener("click", () => {
  activateTab(btn.dataset.tab);
}));
$$(".dashboard-direction").forEach((button) => button.addEventListener("click", () => {
  state.dashboardDirection = button.dataset.direction || "전체";
  renderAll();
}));
$$(".portal-tab").forEach((btn) => btn.addEventListener("click", () => {
  $$(".portal-tab").forEach((item) => item.classList.toggle("active", item === btn));
  $$(".portal-pane").forEach((pane) => pane.classList.toggle("active", pane.id === btn.dataset.portalTab));
}));
$$(".excel-upload-tab").forEach((btn) => btn.addEventListener("click", () => {
  state.excelUploadTab = btn.dataset.excelTab;
  renderExcelImportResult();
}));
$$(".excel-result-page").forEach((btn) => btn.addEventListener("click", () => {
  if (btn.disabled) return;
  state.excelResultPage += Number(btn.dataset.direction);
  renderExcelImportResult();
}));
$$(".excel-error-page").forEach((btn) => btn.addEventListener("click", () => {
  if (btn.disabled) return;
  state.excelErrorPage += Number(btn.dataset.direction);
  renderExcelImportResult();
}));
$$(".subtab").forEach((btn) => btn.addEventListener("click", () => {
  const view = btn.closest(".view");
  view.querySelectorAll(".subtab").forEach((item) => item.classList.toggle("active", item === btn));
  view.querySelectorAll(".subtab-pane").forEach((pane) => pane.classList.toggle("active", pane.id === btn.dataset.target));
}));
$$(".admin-tab").forEach((btn) => btn.addEventListener("click", () => {
  $$(".admin-tab").forEach((x) => x.classList.toggle("active", x === btn));
  $$(".admin-pane").forEach((x) => x.classList.toggle("active", x.id === btn.dataset.adminTab));
}));
$("#clientFilter").addEventListener("change", (e) => { state.client = e.target.value; state.project = "전체"; state.registeredTaskPage = 1; closeResourceRemainingModal(); renderAll(); });
$("#projectFilter").addEventListener("change", (e) => { state.project = e.target.value; state.registeredTaskPage = 1; state.resourceUnderloadPage = 1; state.resourceRemainingPage = 1; closeResourceRemainingModal(); renderAll(); });
$("#yearFilter").addEventListener("change", (e) => {
  state.year = e.target.value;
  state.month = "";
  closeResourceRemainingModal();
  state.registeredTaskPage = 1;
  renderAll();
});
$("#missingCompletionFilter")?.addEventListener("click", () => {
  state.year = "전체";
  state.month = "other";
  state.taskStatusDirection = "전체";
  state.registeredTaskSearch = "";
  state.registeredTaskPage = 1;
  renderAll();
});
$("#monthFilter").addEventListener("change", (e) => {
  state.month = e.target.value;
  state.resourceRemainingPage = 1;
  closeResourceRemainingModal();
  state.registeredTaskPage = 1;
  renderAll();
});
$("#resetFilters").addEventListener("click", () => { state.client = "전체"; state.project = "전체"; state.year = "전체"; state.month = ""; state.registeredTaskPage = 1; closeResourceRemainingModal(); renderAll(); });
if ($("#taskSearchInput")) $("#taskSearchInput").addEventListener("input", (e) => { state.taskSearch = e.target.value; renderAll(); });
if ($("#ganttSearchInput")) $("#ganttSearchInput").addEventListener("input", (e) => { state.ganttSearch = e.target.value; renderAll(); });
if ($("#ganttViewMode")) $("#ganttViewMode").addEventListener("change", (e) => { state.ganttViewMode = e.target.value; renderAll(); });
if ($("#ganttTypeFilter")) $("#ganttTypeFilter").addEventListener("change", (e) => { state.ganttType = e.target.value; renderAll(); });
if ($("#ganttSortOrder")) $("#ganttSortOrder").addEventListener("change", (e) => { state.ganttSortOrder = e.target.value; renderAll(); });
if ($("#portalWbsViewMode")) $("#portalWbsViewMode").addEventListener("change", (e) => { state.portalWbsViewMode = e.target.value; renderAll(); });
if ($("#portalWbsTypeFilter")) $("#portalWbsTypeFilter").addEventListener("change", (e) => { state.portalWbsType = e.target.value; renderAll(); });
if ($("#portalWbsSortOrder")) $("#portalWbsSortOrder").addEventListener("change", (e) => { state.portalWbsSortOrder = e.target.value; renderAll(); });
if ($("#myWorkStatusFilter")) $("#myWorkStatusFilter").addEventListener("change", (e) => { state.myWorkStatus = e.target.value; state.myWorkPage = 1; renderAll(); });
if ($("#myWorkSearchInput")) $("#myWorkSearchInput").addEventListener("input", (e) => { state.myWorkSearch = e.target.value; state.myWorkPage = 1; renderAll(); });
if ($("#myWorkMemberFilter")) $("#myWorkMemberFilter").addEventListener("change", (e) => { state.myWorkMemberId = e.target.value; state.myWorkPage = 1; renderAll(); });
$$('[data-task-direction]').forEach((button) => button.addEventListener("click", () => {
  state.taskStatusDirection = button.dataset.taskDirection || "전체";
  state.registeredTaskPage = 1;
  renderAll();
}));
$$('[data-my-work-direction]').forEach((button) => button.addEventListener("click", () => {
  state.myWorkDirection = button.dataset.myWorkDirection || "전체";
  state.myWorkPage = 1;
  renderAll();
}));
if ($("#myWorkPrev")) $("#myWorkPrev").addEventListener("click", () => { state.myWorkPage = Math.max(1, state.myWorkPage - 1); renderAll(); });
if ($("#myWorkNext")) $("#myWorkNext").addEventListener("click", () => { state.myWorkPage += 1; renderAll(); });
if ($("#workResourceProjectFilter")) $("#workResourceProjectFilter").addEventListener("change", (e) => { state.workResourceProject = e.target.value; state.workResourcePage = 1; renderAll(); });
if ($("#workResourceCategoryFilter")) $("#workResourceCategoryFilter").addEventListener("change", (e) => { state.workResourceCategory = e.target.value; state.workResourcePage = 1; renderAll(); });
if ($("#workResourceSearch")) $("#workResourceSearch").addEventListener("input", (e) => { state.workResourceSearch = e.target.value; state.workResourcePage = 1; renderAll(); });
if ($("#workResourcePrev")) $("#workResourcePrev").addEventListener("click", () => { state.workResourcePage = Math.max(1, state.workResourcePage - 1); renderAll(); });
if ($("#workResourceNext")) $("#workResourceNext").addEventListener("click", () => { state.workResourcePage += 1; renderAll(); });
if ($("#resourceUnderloadPrev")) $("#resourceUnderloadPrev").addEventListener("click", () => { state.resourceUnderloadPage = Math.max(1, state.resourceUnderloadPage - 1); renderAll(); });
if ($("#resourceUnderloadNext")) $("#resourceUnderloadNext").addEventListener("click", () => { state.resourceUnderloadPage += 1; renderAll(); });
if ($("#resourceRemainingOpen")) $("#resourceRemainingOpen").addEventListener("click", () => {
  if (!state.month || state.project === "전체") return;
  state.resourceRemainingPage = 1;
  renderResourceRemaining();
  const modal = $("#resourceRemainingModal");
  modal?.classList.add("active");
  modal?.setAttribute("aria-hidden", "false");
  bringModalToFront(modal);
});
if ($("#resourceRemainingPrev")) $("#resourceRemainingPrev").addEventListener("click", () => { state.resourceRemainingPage = Math.max(1, state.resourceRemainingPage - 1); renderResourceRemaining(); });
if ($("#resourceRemainingNext")) $("#resourceRemainingNext").addEventListener("click", () => { state.resourceRemainingPage += 1; renderResourceRemaining(); });
if ($("#resourceRemainingModal")) $("#resourceRemainingModal").addEventListener("click", (event) => {
  if (!event.target.closest(".resource-remaining-close") && event.target.id !== "resourceRemainingModal") return;
  closeResourceRemainingModal();
});
if ($("#accountSearchInput")) $("#accountSearchInput").addEventListener("input", (e) => { state.accountSearch = e.target.value; renderAll(); });
$("#adminTeamFilter").addEventListener("change", (e) => { state.adminTeam = e.target.value; renderAll(); });
$("#adminGradeFilter").addEventListener("change", (e) => { state.adminGrade = e.target.value; renderAll(); });
$("#adminPositionFilter").addEventListener("change", (e) => { state.adminPosition = e.target.value; renderAll(); });
$("#resetAdminFilters").addEventListener("click", () => { state.adminTeam = "전체"; state.adminGrade = "전체"; state.adminPosition = "전체"; state.memberSearch = ""; state.editingMemberIndex = null; renderAll(); });
if ($("#reviewSearchInput")) $("#reviewSearchInput").addEventListener("input", (e) => { state.reviewSearch = e.target.value; renderAll(); });
if ($("#reviewProjectFilter")) $("#reviewProjectFilter").addEventListener("change", (e) => { state.reviewProject = e.target.value; renderAll(); });
if ($("#reviewYearFilter")) $("#reviewYearFilter").addEventListener("change", (e) => { state.reviewYear = e.target.value; state.reviewMonth = "전체"; renderAll(); });
if ($("#reviewMonthFilter")) $("#reviewMonthFilter").addEventListener("change", (e) => { state.reviewMonth = e.target.value === "전체" ? "전체" : e.target.value.replace("월", "").padStart(2, "0"); renderAll(); });
if ($("#teamHistoryProjectFilter")) $("#teamHistoryProjectFilter").addEventListener("change", (e) => { state.teamHistoryProject = e.target.value; renderAll(); });
if ($("#workSettingProject")) $("#workSettingProject").addEventListener("change", (e) => {
  state.configProject = e.target.value;
  state.workSettingDraftProject = "";
  renderAll();
});
if ($("#workSettingTeamAdd")) $("#workSettingTeamAdd").addEventListener("click", () => {
  const value = $("#workSettingTeamSelect")?.value;
  if (!value || state.workSettingDraftTeams.includes(value)) return;
  state.workSettingDraftTeams.push(value);
  state.workSettingDraftMembers = state.workSettingDraftMembers.filter((name) => members.find((member) => member.name === name)?.team !== value);
  state.workSettingTeamSearch = "";
  renderWorkSettingPickers();
});
if ($("#workSettingTeamSearch")) $("#workSettingTeamSearch").addEventListener("input", (event) => {
  state.workSettingTeamSearch = event.target.value;
  renderWorkSettingPickers();
});
if ($("#workSettingMemberSearch")) $("#workSettingMemberSearch").addEventListener("input", (event) => {
  state.workSettingMemberSearch = event.target.value;
  renderWorkSettingPickers();
});
if ($("#workSettingMemberAdd")) $("#workSettingMemberAdd").addEventListener("click", () => {
  const value = $("#workSettingMemberSelect")?.value;
  if (!value || state.workSettingDraftMembers.includes(value)) return;
  state.workSettingDraftMembers.push(value);
  state.workSettingMemberSearch = "";
  renderWorkSettingPickers();
});
["#workSettingSelectedTeams", "#workSettingSelectedMembers"].forEach((selector) => {
  const container = $(selector);
  if (!container) return;
  container.addEventListener("click", (event) => {
    const button = event.target.closest(".assignment-selected-remove");
    if (!button) return;
    if (button.dataset.assignmentKind === "team") state.workSettingDraftTeams = state.workSettingDraftTeams.filter((value) => value !== button.dataset.assignmentValue);
    if (button.dataset.assignmentKind === "member") state.workSettingDraftMembers = state.workSettingDraftMembers.filter((value) => value !== button.dataset.assignmentValue);
    renderWorkSettingPickers();
  });
});
if ($("#recordEditModalBody")) {
  $("#recordEditModalBody").addEventListener("input", (event) => {
    if (event.target.id === "editSettingTeamSearch") state.editSettingTeamSearch = event.target.value;
    else if (event.target.id === "editSettingMemberSearch") state.editSettingMemberSearch = event.target.value;
    else if (event.target.id === "editSettingManagerSearch") state.editSettingManagerSearch = event.target.value;
    else return;
    renderEditSettingPickers();
  });
  $("#recordEditModalBody").addEventListener("click", (event) => {
    if (event.target.id === "editSettingTeamAdd") {
      const value = $("#editSettingTeamSelect")?.value;
      if (value && !state.editSettingDraftTeams.includes(value)) {
        state.editSettingDraftTeams.push(value);
        state.editSettingDraftMembers = state.editSettingDraftMembers.filter((name) => members.find((member) => member.name === name)?.team !== value);
        state.editSettingTeamSearch = "";
      }
      renderEditSettingPickers();
      return;
    }
    if (event.target.id === "editSettingMemberAdd") {
      const value = $("#editSettingMemberSelect")?.value;
      if (value && !state.editSettingDraftMembers.includes(value)) {
        state.editSettingDraftMembers.push(value);
        state.editSettingMemberSearch = "";
      }
      renderEditSettingPickers();
      return;
    }
    if (event.target.id === "editSettingManagerAdd") {
      const value = $("#editSettingManagerSelect")?.value;
      if (value && !state.editSettingDraftManagers.includes(value)) {
        state.editSettingDraftManagers.push(value);
        state.editSettingDraftMembers = state.editSettingDraftMembers.filter((name) => name !== value);
        state.editSettingManagerSearch = "";
      }
      renderEditSettingPickers();
      return;
    }
    const button = event.target.closest(".assignment-selected-remove");
    if (!button) return;
    if (button.dataset.assignmentKind === "edit-team") state.editSettingDraftTeams = state.editSettingDraftTeams.filter((value) => value !== button.dataset.assignmentValue);
    if (button.dataset.assignmentKind === "edit-member") state.editSettingDraftMembers = state.editSettingDraftMembers.filter((value) => value !== button.dataset.assignmentValue);
    if (button.dataset.assignmentKind === "edit-manager") state.editSettingDraftManagers = state.editSettingDraftManagers.filter((value) => value !== button.dataset.assignmentValue);
    renderEditSettingPickers();
  });
}
if ($("#slaRuleProject")) $("#slaRuleProject").addEventListener("change", (e) => {
  state.slaRuleProject = e.target.value;
  state.slaRuleDeliverable = deliverables.find((deliverable) => deliverable.project === state.slaRuleProject)?.name || "";
  renderAll();
});
if ($("#slaRuleDeliverable")) $("#slaRuleDeliverable").addEventListener("change", (e) => {
  state.slaRuleDeliverable = e.target.value;
  renderAll();
});
async function saveTemplateBufferSettings() {
  const project = state.deliverableProject;
  if (!project) return;
  for (const selector of ["#templateProjectBufferInput", "#templateCompanyBufferInput"]) {
    const input = $(selector);
    if (!input || !input.value.trim() || !Number.isFinite(Number(input.value)) || Number(input.value) <= 0) {
      input?.setCustomValidity("목표 생산율은 0보다 큰 숫자로 입력하세요. 예: 120, 150");
      input?.reportValidity();
      return;
    }
    input.setCustomValidity("");
  }
  state.productivityBuffersByProject[project] = {
    workingDays: productivityBuffersForProject(project).workingDays,
    projectBuffer: parseProductivityBuffer($("#templateProjectBufferInput")?.value, state.productivityProjectBuffer),
    companyBuffer: parseProductivityBuffer($("#templateCompanyBufferInput")?.value, state.productivityCompanyBuffer),
  };
  renderAll();
  if (remoteAuthEnabled && remoteData?.saveSetting) {
    try {
      setDbSaveStatus("saving", "프로젝트 리소스 목표 저장 중");
      await remoteData.saveSetting("productivity", {
        targetVersion: 2,
        workingDays: state.productivityWorkingDays,
        projectBuffer: state.productivityProjectBuffer,
        companyBuffer: state.productivityCompanyBuffer,
        buffer: state.productivityProjectBuffer,
        projectBuffers: state.productivityBuffersByProject,
      });
      setDbSaveStatus("saved", `${project} 리소스 목표 저장 완료`);
    } catch (error) {
      setDbSaveStatus("error", `app_settings 설정 필요: ${authMessage(error)}`);
    }
  }
}
if ($("#saveTemplateBuffers")) $("#saveTemplateBuffers").addEventListener("click", saveTemplateBufferSettings);
function updateBrandingDraftFromInputs() {
  state.branding.companyName = $("#systemCompanyName")?.value.trim() || "회사명";
  state.branding.subtitle = $("#systemBrandSubtitle")?.value.trim() || "프로젝트 운영 관제";
  renderSystemSettings();
}
if ($("#systemCompanyName")) $("#systemCompanyName").addEventListener("input", updateBrandingDraftFromInputs);
if ($("#systemBrandSubtitle")) $("#systemBrandSubtitle").addEventListener("input", updateBrandingDraftFromInputs);
if ($("#systemLogoInput")) $("#systemLogoInput").addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowedTypes.has(file.type) || file.size > 500 * 1024) {
    $("#systemBrandMessage").textContent = "500KB 이하 PNG, JPG, WebP 파일만 등록할 수 있습니다.";
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    state.branding.logoDataUrl = String(reader.result || "");
    if ($("#systemLogoRemove")) $("#systemLogoRemove").checked = false;
    $("#systemBrandMessage").textContent = `${file.name} 로고를 선택했습니다. 저장 버튼을 눌러 적용하세요.`;
    renderSystemSettings();
  };
  reader.onerror = () => { $("#systemBrandMessage").textContent = "로고 파일을 읽지 못했습니다."; };
  reader.readAsDataURL(file);
});
if ($("#systemLogoRemove")) $("#systemLogoRemove").addEventListener("change", (event) => {
  if (event.target.checked) state.branding.logoDataUrl = "";
  renderSystemSettings();
});
if ($("#saveSystemBrand")) $("#saveSystemBrand").addEventListener("click", async () => {
  updateBrandingDraftFromInputs();
  if ($("#systemLogoRemove")?.checked) state.branding.logoDataUrl = "";
  applyBranding();
  renderSystemSettings();
  try {
    if (!operationalDbReady || !remoteData?.saveSetting) throw new Error("로그인 후 Supabase DB에 연결해야 저장할 수 있습니다.");
    setDbSaveStatus("saving", "시스템 설정 저장 중");
    await remoteData.saveSetting("branding", state.branding);
    setDbSaveStatus("saved", "시스템 설정 저장 완료");
    $("#systemBrandMessage").textContent = "회사명과 로고를 DB에 저장해 모든 사용자 화면에 적용했습니다.";
  } catch (error) {
    const message = authMessage(error);
    setDbSaveStatus("error", `시스템 설정 저장 실패: ${message}`);
    $("#systemBrandMessage").textContent = message;
  }
});
if ($("#workCalendarMode")) $("#workCalendarMode").addEventListener("change", (event) => {
  state.workCalendar.mode = event.target.value === "api" ? "api" : "manual";
  renderSystemSettings();
});
if ($("#workCalendarApiUrl")) $("#workCalendarApiUrl").addEventListener("input", (event) => {
  state.workCalendar.apiUrl = event.target.value.trim();
});
if ($("#workCalendarMonth")) $("#workCalendarMonth").addEventListener("change", (event) => {
  const entry = state.workCalendar.months?.[event.target.value];
  if ($("#workCalendarDays")) $("#workCalendarDays").value = entry ? entry.workingDays : "";
});
if ($("#saveManualWorkCalendar")) $("#saveManualWorkCalendar").addEventListener("click", async () => {
  const month = $("#workCalendarMonth")?.value;
  const workingDays = Number($("#workCalendarDays")?.value);
  const message = $("#workCalendarMessage");
  if (!/^\d{4}-\d{2}$/.test(month || "") || !Number.isFinite(workingDays) || workingDays < 0 || workingDays > 31) {
    if (message) message.textContent = "대상 월과 0~31 범위의 W/D를 입력하세요.";
    return;
  }
  state.workCalendar.months[month] = { workingDays, source: "manual", updatedAt: new Date().toISOString() };
  try {
    await persistWorkCalendar(`${month} W/D 저장 완료`);
    if (message) message.textContent = `${month}을 ${formatNumber(workingDays, 1)} W/D로 저장했습니다.`;
    renderAll();
  } catch (error) {
    const detail = authMessage(error);
    setDbSaveStatus("error", `월별 W/D 저장 실패: ${detail}`);
    if (message) message.textContent = detail;
  }
});
if ($("#syncWorkCalendarApi")) $("#syncWorkCalendarApi").addEventListener("click", async () => {
  const url = String($("#workCalendarApiUrl")?.value || "").trim();
  const message = $("#workCalendarMessage");
  if (!/^https?:\/\//i.test(url)) {
    if (message) message.textContent = "http:// 또는 https://로 시작하는 API URL을 입력하세요.";
    return;
  }
  const previousMonths = { ...state.workCalendar.months };
  try {
    if (message) message.textContent = "API에서 월별 W/D를 불러오는 중입니다.";
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`API 응답 오류 ${response.status}`);
    const parsed = normalizeWorkCalendarApiPayload(await response.json());
    const entries = Object.entries(parsed);
    if (!entries.length) throw new Error("지원 형식의 월별 W/D 데이터가 없습니다.");
    state.workCalendar.mode = "api";
    state.workCalendar.apiUrl = url;
    entries.forEach(([month, workingDays]) => {
      state.workCalendar.months[month] = { workingDays, source: "api", updatedAt: new Date().toISOString() };
    });
    await persistWorkCalendar(`API W/D ${entries.length}개월 동기화 완료`);
    if (message) message.textContent = `${entries.length}개월의 W/D를 API에서 동기화했습니다.`;
    renderAll();
  } catch (error) {
    state.workCalendar.months = previousMonths;
    const detail = authMessage(error);
    setDbSaveStatus("error", `W/D API 동기화 실패: ${detail}`);
    if (message) message.textContent = `${detail} 기존 저장값은 유지했습니다. API 서버의 CORS 허용 여부도 확인하세요.`;
    renderSystemSettings();
  }
});
if ($("#workCalendarRows")) $("#workCalendarRows").addEventListener("click", async (event) => {
  const button = event.target.closest(".work-calendar-delete");
  if (!button) return;
  const month = button.dataset.month;
  const previous = state.workCalendar.months[month];
  delete state.workCalendar.months[month];
  try {
    await persistWorkCalendar(`${month} W/D 설정 삭제 완료`);
    renderAll();
  } catch (error) {
    state.workCalendar.months[month] = previous;
    const detail = authMessage(error);
    setDbSaveStatus("error", `월별 W/D 삭제 실패: ${detail}`);
    if ($("#workCalendarMessage")) $("#workCalendarMessage").textContent = detail;
    renderSystemSettings();
  }
});
if ($("#deliverableProjectSelect")) $("#deliverableProjectSelect").addEventListener("change", (e) => {
  state.deliverableProject = e.target.value;
  state.slaRuleProject = state.deliverableProject;
  state.slaRuleDeliverable = deliverables.find((deliverable) => deliverable.project === state.deliverableProject)?.name || "";
  state.conversionTarget = deliverables.find((deliverable) => deliverable.project === state.deliverableProject)?.name || "";
  renderAll();
});
if ($("#deliverableNameInput")) $("#deliverableNameInput").addEventListener("input", () => renderDeliverableConversion());
if ($("#deliverableHoursInput")) $("#deliverableHoursInput").addEventListener("input", () => renderDeliverableConversion());
if ($("#conversionTargetSelect")) $("#conversionTargetSelect").addEventListener("change", (e) => { state.conversionTarget = e.target.value; renderDeliverableConversion(); });
if ($("#memberSearchInput")) $("#memberSearchInput").addEventListener("input", (e) => { state.memberSearch = e.target.value; state.editingMemberIndex = null; renderAll(); });
if ($("#memberEditMode")) $("#memberEditMode").addEventListener("change", (e) => {
  state.memberEditMode = e.target.value === "change" ? "change" : "add";
  state.selectedMemberAccount = "";
  renderAll();
});
if ($("#resignedTeamFilter")) $("#resignedTeamFilter").addEventListener("change", (e) => { state.resignedTeam = e.target.value; state.resignedPage = 1; renderAll(); });
if ($("#resignedFromFilter")) $("#resignedFromFilter").addEventListener("change", (e) => { state.resignedFrom = e.target.value; state.resignedPage = 1; renderAll(); });
if ($("#resignedToFilter")) $("#resignedToFilter").addEventListener("change", (e) => { state.resignedTo = e.target.value; state.resignedPage = 1; renderAll(); });
if ($("#resetResignedFilters")) $("#resetResignedFilters").addEventListener("click", () => { state.resignedTeam = "전체"; state.resignedFrom = ""; state.resignedTo = ""; state.resignedPage = 1; renderAll(); });
if ($("#resignedMemberPrev")) $("#resignedMemberPrev").addEventListener("click", () => { state.resignedPage = Math.max(1, state.resignedPage - 1); renderAll(); });
if ($("#resignedMemberNext")) $("#resignedMemberNext").addEventListener("click", () => { state.resignedPage += 1; renderAll(); });
if ($("#memberAccountAssign")) $("#memberAccountAssign").addEventListener("change", (e) => { state.selectedMemberAccount = e.target.value; renderAll(); });
if ($("#memberAssignTeam")) $("#memberAssignTeam").addEventListener("change", (e) => {
  const subgroups = teams.find((team) => team.name === e.target.value)?.subgroups || [];
  $("#memberAssignSubgroup").innerHTML = optionList(["미지정", ...subgroups], "미지정");
});
if ($("#memberAccountApply")) $("#memberAccountApply").addEventListener("click", async () => {
  const { account, member: selectedMember } = selectedMemberEditorRecord($("#memberAccountAssign").value);
  if (state.memberEditMode === "change" && !selectedMember) return;
  const name = $("#memberNameInput").value.trim();
  let member = selectedMember || (account ? members.find((item) => item.name === account.name) : null);
  let matchedExistingMember = false;
  if (!name) {
    $("#memberEditorMessage").textContent = "직원명을 입력하세요.";
    return;
  }
  const sameNameMember = members.find((item) => item !== member && item.name === name);
  if (state.memberEditMode === "add" && !member && sameNameMember) {
    const linkedAccount = accountForMember(sameNameMember);
    if (!account) {
      $("#memberEditorMessage").textContent = "같은 직원명이 이미 등록되어 있습니다. 기존 변경 또는 계정 연결 탭을 사용하세요.";
      return;
    }
    if (linkedAccount && linkedAccount.id !== account.id) {
      window.alert(`이미 연결된 ID가 있는 사람입니다.\n연결 계정: ${linkedAccount.id}`);
      $("#memberEditorMessage").textContent = `${name} 직원은 이미 ${linkedAccount.id} 계정에 연결되어 있습니다.`;
      return;
    }
    if (sameNameMember.employmentStatus === "퇴사") {
      window.alert(`${name}과 같은 이름의 퇴사자 정보가 있습니다.`);
      const confirmed = window.confirm(
        `퇴사자 ${name}과 동일인이라면 [확인]을 눌러 신규 계정 ${account.id}과 매칭하세요.\n동명이인이면 [취소] 후 구분 가능한 직원명으로 등록하세요.\n계정 연결 후 재직 상태는 퇴사자 관리에서 별도로 복구해야 합니다.`
      );
      if (!confirmed) {
        $("#memberEditorMessage").textContent = "퇴사자 동명이인 확인이 취소되었습니다. 직원명을 구분해 입력하세요.";
        return;
      }
    } else {
      const confirmed = window.confirm(
        `이미 있는 사람 이름입니다.\n${name} 직원 정보를 신규 계정 ${account.id}과 연결하시겠습니까?`
      );
      if (!confirmed) {
        $("#memberEditorMessage").textContent = "기존 직원과 계정 연결을 취소했습니다.";
        return;
      }
    }
    member = sameNameMember;
    matchedExistingMember = true;
  }
  const duplicate = members.find((item) => item !== member && item.name === name);
  if (duplicate) {
    $("#memberEditorMessage").textContent = "같은 직원명이 이미 등록되어 있습니다.";
    return;
  }
  if (state.memberEditMode === "add" && member && !matchedExistingMember) {
    $("#memberEditorMessage").textContent = "이미 직원 정보가 연결된 계정입니다. 기존 변경을 선택하세요.";
    return;
  }
  if (state.memberEditMode === "change" && !member) {
    $("#memberEditorMessage").textContent = "직원 정보가 없는 계정입니다. 신규 추가를 선택하세요.";
    return;
  }
  const beforeName = member?.name || account?.name || name;
  if (!member) {
    member = { _id: nextRecordId("EMP", members.map((item) => item._id), 3), name, team: "", subgroup: "", position: "", grade: "", employmentStatus: "재직" };
    members.push(member);
  } else if (member.name !== name) {
    renamePersonReferences(member.name, name);
    member.name = name;
  }
  const beforeTeam = member.team;
  member.team = $("#memberAssignTeam").value;
  member.subgroup = $("#memberAssignSubgroup").value === "미지정" ? "" : $("#memberAssignSubgroup").value;
  member.position = $("#memberAssignPosition").value;
  member.grade = $("#memberAssignGrade").value;
  if (account) {
    account.name = name;
    account.team = member.team;
    account.subgroup = member.subgroup;
    member._userId = account._userId || member._userId;
  }
  if (beforeName !== name) renamePersonReferences(beforeName, name);
  workers[member.name] = { ...(workers[member.name] || { capacity: 100, vacation: 0, convertible: ["운영"] }), team: member.team, subgroup: member.subgroup };
  recordMemberTeamTransition(member.name, beforeTeam, member.team);
  syncAssignmentsForTeam(beforeTeam, `구성원 팀 이동: ${member.name}`, false);
  syncAssignmentsForTeam(member.team, `구성원 팀 이동: ${member.name}`, false);
  state.memberEditMode = "change";
  state.selectedMemberAccount = `member:${member._id}`;
  renderAll();
  try {
    await persistOperationalNow();
    if (account?.remote && account._userId) {
      await remoteData.updateProfile(account._userId, {
        display_name: member.name,
        team_name: member.team || null,
        subgroup_name: member.subgroup || null,
      });
    }
    if (account) {
      account.projects = accountTeamProjectNames(account);
    }
    $("#memberEditorMessage").textContent = account
      ? `${account.id} 계정의 직원·조직 정보와 팀 프로젝트 권한을 저장했습니다.`
      : `${member.name}의 DB 직원 정보를 저장했습니다. 로그인 계정 연결은 신규 추가에서 진행할 수 있습니다.`;
  } catch (error) {
    const message = authMessage(error);
    setDbSaveStatus("error", message.includes("실패:") ? message : `직원 정보 연결 실패: ${message}`);
    $("#memberEditorMessage").textContent = message;
  }
});
if ($("#memberLinkApply")) $("#memberLinkApply").addEventListener("click", async () => {
  const member = members.find((item) => String(item._id) === String($("#memberLinkEmployee").value));
  const account = accounts.find((item) => item.id === $("#memberLinkAccount").value);
  if (!member || !account) return;
  if (accountForMember(member)) {
    $("#memberLinkMessage").textContent = "이미 로그인 계정과 연결된 직원입니다.";
    return;
  }
  if (members.some((item) => item !== member && accountForMember(item)?.id === account.id)) {
    $("#memberLinkMessage").textContent = "이미 다른 직원과 연결된 계정입니다.";
    return;
  }
  account.name = member.name;
  account.team = member.team || "미지정";
  account.subgroup = member.subgroup || "";
  member._userId = account._userId || member._userId;
  workers[member.name] = { ...(workers[member.name] || { capacity: 100, vacation: 0, convertible: ["운영"] }), team: member.team, subgroup: member.subgroup };
  renderAll();
  try {
    if (account.remote && account._userId) {
      await remoteData.updateProfile(account._userId, {
        display_name: member.name,
        team_name: member.team || null,
        subgroup_name: member.subgroup || null,
      });
    }
    account.projects = accountTeamProjectNames(account);
    await persistOperationalNow();
    $("#memberLinkMessage").textContent = `${member.name} 직원을 ${account.id} 계정과 연결했습니다.`;
    renderAll();
  } catch (error) {
    const message = authMessage(error);
    setDbSaveStatus("error", `직원 계정 연결 실패: ${message}`);
    $("#memberLinkMessage").textContent = message;
  }
});
if ($("#modalMemberTeam")) $("#modalMemberTeam").addEventListener("change", (e) => {
  const subgroups = teams.find((team) => team.name === e.target.value)?.subgroups || [];
  $("#modalMemberSubgroup").innerHTML = optionList(["미지정", ...subgroups], "미지정");
});
if ($("#teamAdd")) $("#teamAdd").addEventListener("click", () => {
  const name = $("#teamNameInput").value.trim();
  if (!name || teams.some((team) => team.name === name)) return;
  teams.push({
    name,
    baseGroup: $("#teamBaseGroupInput").value.trim() || name,
    subgroups: $("#teamSubgroupInput").value.split(",").map((value) => value.trim()).filter(Boolean),
  });
  renderAll();
});
if ($("#positionAdd")) $("#positionAdd").addEventListener("click", () => {
  const name = $("#positionNameInput").value.trim();
  if (!name || positions.some((position) => position.name === name)) return;
  positions.push({ name });
  renderAll();
});
if ($("#accountAdd")) $("#accountAdd").addEventListener("click", async () => {
  const id = $("#accountIdInput").value.trim();
  const role = $("#accountRoleInput").value;
  const password = temporaryAccountPassword();
  const button = $("#accountAdd");
  const result = $("#accountCreateResult");
  if (!id || accounts.some((account) => account.id === id)) {
    const original = button.textContent;
    button.textContent = "계정명 또는 중복 확인";
    setTimeout(() => { button.textContent = original; }, 1400);
    return;
  }
  button.disabled = true;
  button.textContent = remoteAuthEnabled ? "Supabase 계정 생성 중" : "계정 생성 중";
  try {
    await upsertAccountFromForm({ id, name: id, password, role, projects: [], status: "사용", team: "", subgroup: "" });
    state.selectedMemberAccount = id;
    state.memberEditMode = "add";
    $("#accountIdInput").value = "";
    if (result) {
      result.hidden = false;
      result.textContent = `계정 ${id} 생성 완료 · 임시 비밀번호 ${password} · 회사 업무 그룹에서 직원 정보를 연결하세요.`;
    }
    renderAll();
    button.textContent = "계정 생성 완료";
  } catch (error) {
    button.textContent = authMessage(error);
    if (result) {
      result.hidden = false;
      result.textContent = authMessage(error);
    }
    resetDbStateAfterAccountFailure();
  } finally {
    button.disabled = false;
    setTimeout(() => { button.textContent = "계정 생성"; }, 2200);
  }
});
if ($("#deliverableExcelUpload")) $("#deliverableExcelUpload").addEventListener("click", async () => {
  const file = $("#deliverableExcelFile")?.files?.[0];
  const confirmed = $("#deliverableReplaceConfirm")?.checked;
  const button = $("#deliverableExcelUpload");
  if (!file || !confirmed) {
    state.deliverableExcelImport = {
      status: "error",
      fileName: file?.name || "",
      count: 0,
      previousCount: deliverables.length,
      message: !file ? "업무 템플릿 Excel 파일을 선택하세요." : "기존 설정 전체 교체 확인을 체크하세요.",
    };
    renderAll();
    return;
  }
  button.disabled = true;
  button.textContent = "검증 및 교체 중";
  try {
    dbLastError = "";
    const parsed = await XlsxImporter.readDeliverableRows(file);
    replaceDeliverablesFromExcel(parsed.rows, file.name);
    $("#deliverableReplaceConfirm").checked = false;
    renderAll();
    button.textContent = "DB 저장 중";
    await persistOperationalNow();
    button.textContent = `${state.deliverableExcelImport.count}개 DB 저장 완료`;
  } catch (error) {
    const dbFailure = Boolean(dbLastError);
    state.deliverableExcelImport = {
      status: "error",
      fileName: file.name,
      count: 0,
      previousCount: deliverables.length,
      message: dbFailure
        ? `DB 저장 실패: ${dbLastError}. 새로고침하면 기존 DB 설정으로 복원됩니다.`
        : `${error?.message || "Excel 읽기 실패"} 기존 설정은 유지했습니다.`,
    };
    renderAll();
    button.textContent = "교체 실패";
  } finally {
    button.disabled = false;
    setTimeout(() => { button.textContent = "Excel 전체 교체"; }, 1600);
  }
});
if ($("#dbExcelUpload")) $("#dbExcelUpload").addEventListener("click", async () => {
  const file = $("#dbExcelFile")?.files?.[0];
  const button = $("#dbExcelUpload");
  if (!file) {
    const original = button.textContent;
    button.textContent = "Excel 파일을 선택하세요";
    setTimeout(() => { button.textContent = original; }, 1400);
    return;
  }
  button.disabled = true;
  button.textContent = "파일 분석 중";
  try {
    dbLastError = "";
    const parsed = await XlsxImporter.readRows(file);
    analyzeExcelTaskRows(parsed.rows, file.name);
    renderAll();
    button.textContent = "분석 완료";
  } catch (error) {
    const dbFailure = Boolean(dbLastError);
    state.excelUploadTab = "excelUploadResultPane";
    state.excelResultPage = 1;
    state.excelErrorPage = 1;
    state.excelImport = {
      fileName: file.name,
      read: 0,
      added: 0,
      updated: 0,
      duplicate: 0,
      error: 1,
      results: [{
        row: "-",
        id: "-",
        subNumber: "-",
        title: "-",
        status: dbFailure ? "DB 저장 오류" : "형식 오류",
        reason: dbFailure ? dbLastError : (error?.message || "Excel 읽기 실패"),
      }],
      countSummary: emptyExcelCountSummary(),
    };
    renderAll();
    button.textContent = "업로드 실패";
  } finally {
    button.disabled = false;
    setTimeout(() => { button.textContent = "파일 분석"; }, 1600);
  }
});
if ($("#applyExcelPreview")) $("#applyExcelPreview").addEventListener("click", async () => {
  const button = $("#applyExcelPreview");
  button.disabled = true;
  button.textContent = "DB 반영 중";
  try {
    await applyPendingExcelImport();
    setDbSaveStatus("saved", "Excel 업로드 DB 반영 완료");
    button.textContent = "DB 반영 완료";
    renderAll();
  } catch (error) {
    setDbSaveStatus("error", `Excel 반영 실패: ${authMessage(error)}`);
    showSystemAlert({ title: "Excel 반영 실패", message: authMessage(error) });
  } finally {
    button.disabled = false;
    setTimeout(() => { button.textContent = "분석 결과 DB 반영"; }, 1600);
  }
});
if ($("#cancelExcelPreview")) $("#cancelExcelPreview").addEventListener("click", () => {
  state.pendingExcelImport = null;
  state.excelImport = { fileName: "", read: 0, added: 0, updated: 0, duplicate: 0, error: 0, results: [], countSummary: [] };
  state.excelUploadTab = "excelUploadInputPane";
  renderExcelImportResult();
});
if ($("#excelBatchRows")) $("#excelBatchRows").addEventListener("click", async (event) => {
  const button = event.target.closest(".excel-batch-rollback");
  if (!button) return;
  button.disabled = true;
  button.textContent = "되돌리는 중";
  try {
    await rollbackUploadBatch(button.dataset.batchId);
    setDbSaveStatus("saved", "업로드 배치 되돌리기 완료");
    renderAll();
  } catch (error) {
    showSystemAlert({ title: "업로드를 되돌릴 수 없습니다", message: authMessage(error) });
    button.disabled = false;
    button.textContent = "되돌리기";
  }
});
if ($("#taskProjectInput")) $("#taskProjectInput").addEventListener("change", (e) => {
  if ($("#taskDeliverableBulkResult")) $("#taskDeliverableBulkResult").hidden = true;
  if ($("#taskRelatedTaskInput")) $("#taskRelatedTaskInput").value = "";
  state.taskDeliverableSearch = "";
  syncTaskStageFields(e.target.value, "register", false);
  renderAll();
});
if ($("#emptyOutputManualHours")) $("#emptyOutputManualHours").addEventListener("input", (event) => {
  const hours = Math.max(0, Number(event.target.value || 0));
  $("#emptyOutputHoursPreview").textContent = `등록 공수 ${formatNumber(hours, 2)}H`;
});
if ($("#emptyOutputConfirmSave")) $("#emptyOutputConfirmSave").addEventListener("click", () => {
  const hours = Math.max(0, Number($("#emptyOutputManualHours")?.value || 0));
  closeEmptyOutputConfirm(Number.isFinite(hours) ? hours : 0);
});
if ($("#emptyOutputConfirmCancel")) $("#emptyOutputConfirmCancel").addEventListener("click", () => closeEmptyOutputConfirm(null));
if ($("#emptyOutputConfirmModal")) $("#emptyOutputConfirmModal").addEventListener("click", (event) => {
  if (event.target.id === "emptyOutputConfirmModal") closeEmptyOutputConfirm(null);
});
if ($("#assignmentConflictConfirm")) $("#assignmentConflictConfirm").addEventListener("click", () => closeAssignmentConflict(true));
if ($("#assignmentConflictCancel")) $("#assignmentConflictCancel").addEventListener("click", () => closeAssignmentConflict(false));
if ($("#assignmentConflictModal")) $("#assignmentConflictModal").addEventListener("click", (event) => {
  if (event.target.id === "assignmentConflictModal") closeAssignmentConflict(false);
});
if ($("#taskStartInput")) $("#taskStartInput").addEventListener("change", () => {
  updateTaskDueSuggestion(true);
  renderTaskAssigneeRecommendations($("#taskProjectInput")?.value || "");
});
for (const selector of ["#taskDueInput", "#taskOwnerInput"]) $(selector)?.addEventListener("change", () => renderTaskAssigneeRecommendations($("#taskProjectInput")?.value || ""));
if ($("#taskAssigneeRecommendations")) $("#taskAssigneeRecommendations").addEventListener("click", (event) => {
  const button = event.target.closest(".task-assignee-recommendation-item");
  const ownerSelect = $("#taskOwnerInput");
  if (!button || !ownerSelect || ![...ownerSelect.options].some((option) => option.value === button.dataset.owner)) return;
  ownerSelect.value = button.dataset.owner;
  ownerSelect.dispatchEvent(new Event("change", {bubbles:true}));
  renderTaskAssigneeRecommendations($("#taskProjectInput")?.value || "");
});
if ($("#taskEffortBufferInput")) $("#taskEffortBufferInput").addEventListener("input", updateTaskRegistrationSummary);
if ($("#registeredTaskSearchInput")) $("#registeredTaskSearchInput").addEventListener("input", (event) => {
  state.registeredTaskSearch = event.target.value;
  state.registeredTaskPage = 1;
  renderAll();
});
if ($("#registeredTaskPrev")) $("#registeredTaskPrev").addEventListener("click", () => {
  state.registeredTaskPage = Math.max(1, state.registeredTaskPage - 1);
  renderAll();
});
if ($("#registeredTaskNext")) $("#registeredTaskNext").addEventListener("click", () => {
  state.registeredTaskPage += 1;
  renderAll();
});
if ($("#taskDetailPrev")) $("#taskDetailPrev").addEventListener("click", () => {
  state.taskDetailPage = Math.max(1, state.taskDetailPage - 1);
  renderTaskDetailModal();
});
if ($("#taskDetailNext")) $("#taskDetailNext").addEventListener("click", () => {
  state.taskDetailPage += 1;
  renderTaskDetailModal();
});
if ($("#taskDetailNoteSave")) $("#taskDetailNoteSave").addEventListener("click", async () => {
  const task = tasks[state.taskDetailIndex];
  const content = $("#taskDetailNoteContent")?.value.trim() || "";
  const button = $("#taskDetailNoteSave");
  if (!task || !canEditTaskRecord(task) || state.taskDetailSaving) return;
  if (!content) {
    button.textContent = "내용을 입력하세요";
    setTimeout(() => { if (!state.taskDetailSaving) button.textContent = "기록 추가"; }, 1200);
    return;
  }
  const note = {
    id: `NOTE-${Date.now()}`,
    type: $("#taskDetailNoteType")?.value || "진행 메모",
    content,
    author: currentAccount()?.name || currentAccount()?.id || "미확인",
    createdAt: new Date().toISOString(),
  };
  task.detailNotes = [...(task.detailNotes || []), note];
  state.taskDetailPage = 1;
  state.taskDetailSaving = true;
  markOperationalDirty();
  renderTaskDetailModal();
  try {
    await withSaveTimeout(persistOperationalNow(), 25000, "세부사항 저장 시간이 초과되었습니다. 다시 시도해 주세요.");
    state.taskDetailSaving = false;
    if ($("#taskDetailNoteContent")) $("#taskDetailNoteContent").value = "";
    renderTaskDetailModal();
  } catch (error) {
    task.detailNotes = (task.detailNotes || []).filter((item) => item.id !== note.id);
    state.taskDetailSaving = false;
    renderTaskDetailModal();
    button.textContent = "저장 실패";
    button.title = authMessage(error);
  }
});
if ($("#taskPhotoTypeInput")) $("#taskPhotoTypeInput").addEventListener("change", updateTaskRegistrationSummary);
if ($("#projectConfigTotal")) $("#projectConfigTotal").addEventListener("input", () => syncProjectContractAmounts("projectConfig", "total"));
if ($("#projectConfigMonthly")) $("#projectConfigMonthly").addEventListener("input", () => syncProjectContractAmounts("projectConfig", "monthly"));
["#projectConfigPeople", "#projectConfigStartDate", "#projectConfigEndDate"].forEach((selector) => {
  if ($(selector)) $(selector).addEventListener("input", () => syncProjectContractAmounts("projectConfig"));
});
document.addEventListener("input", (event) => {
  if (event.target?.id === "editProjectTotal") syncProjectContractAmounts("editProject", "total");
  if (event.target?.id === "editProjectMonthly") syncProjectContractAmounts("editProject", "monthly");
  if (["editProjectPeople", "editProjectStartDate", "editProjectEndDate"].includes(event.target?.id)) syncProjectContractAmounts("editProject");
  if (["taskStageInput", "editTaskStageInput"].includes(event.target?.id) && event.target.value.trim()) {
    const prefix = event.target.id.startsWith("edit") ? "editTask" : "task";
    const stageSelect = $(`#${prefix}StageSelect`);
    if (stageSelect) stageSelect.value = "";
  }
});
if ($("#taskDeliverableSearchInput")) $("#taskDeliverableSearchInput").addEventListener("input", (e) => {
  state.taskDeliverableSearch = e.target.value;
  renderTaskDeliverables($("#taskProjectInput")?.value || "");
});
if ($("#toggleAllTaskDeliverables")) $("#toggleAllTaskDeliverables").addEventListener("click", () => {
  state.taskShowAllDeliverables = !state.taskShowAllDeliverables;
  renderTaskDeliverables($("#taskProjectInput")?.value || "");
});
if ($("#applyTaskDeliverableBulk")) $("#applyTaskDeliverableBulk").addEventListener("click", applyTaskDeliverableBulkInput);
if ($("#taskDeliverableSearchInput")) $("#taskDeliverableSearchInput").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  applyTaskDeliverableBulkInput();
});
document.addEventListener("click", (event) => {
  if (event.target.closest("#applyEditTaskDeliverableBulk")) applyEditTaskDeliverableBulkInput();
  const candidate = event.target.closest(".bulk-candidate-select");
  if (candidate) applyBulkCandidateSelection(candidate);
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.target?.id !== "editTaskDeliverableBulkInput") return;
  event.preventDefault();
  applyEditTaskDeliverableBulkInput();
});
if ($("#taskDeliverableOptions")) $("#taskDeliverableOptions").addEventListener("input", (event) => {
  syncTaskDeliverableSelection(event.target);
  updateTaskRegistrationSummary();
});
if ($("#taskDeliverableOptions")) $("#taskDeliverableOptions").addEventListener("change", (event) => {
  syncTaskDeliverableSelection(event.target);
  updateTaskRegistrationSummary();
  updateTaskDueSuggestion(true);
});
if ($("#selectedTaskDeliverables")) $("#selectedTaskDeliverables").addEventListener("input", (event) => {
  const input = event.target.closest(".selected-deliverable-count");
  if (!input) return;
  const row = input.closest(".selected-deliverable-row");
  const projectName = $("#taskProjectInput")?.value;
  const name = row?.dataset?.outputName;
  if (!projectName || !name || !state.taskDeliverableSelections[projectName]?.[name]) return;
  state.taskDeliverableSelections[projectName][name].count = Math.max(1, Number(input.value || 1));
  renderTaskDeliverables(projectName);
  updateTaskDueSuggestion(true);
});
if ($("#selectedTaskDeliverables")) $("#selectedTaskDeliverables").addEventListener("click", (event) => {
  const button = event.target.closest(".selected-deliverable-remove");
  if (!button) return;
  const row = button.closest(".selected-deliverable-row");
  const projectName = $("#taskProjectInput")?.value;
  const name = row?.dataset?.outputName;
  if (!projectName || !name) return;
  delete state.taskDeliverableSelections[projectName]?.[name];
  renderTaskDeliverables(projectName);
  updateTaskDueSuggestion(true);
});
if ($("#workSettingAdd")) $("#workSettingAdd").addEventListener("click", async () => {
  const project = $("#workSettingProject").value;
  const selectedTeams = [...state.workSettingDraftTeams];
  const selectedExtras = [...state.workSettingDraftMembers];
  const selectedManagers = [...state.workSettingDraftManagers];
  if (!project || (!selectedTeams.length && !selectedExtras.length && !selectedManagers.length)) return;
  const next = { project, team: selectedTeams[0] || "미지정", teams: selectedTeams, extraMembers: selectedExtras, managerMembers: selectedManagers, sla: 0, absoluteDailyHours: absoluteDailyHoursForProject(project), month: $("#workSettingMonth").value.trim() };
  const existing = projectWorkSettings.find((setting) => setting.project === project);
  const beforeTeams = projectSettingTeams(existing);
  const beforeExtras = projectSettingExtraMembers(existing);
  const beforeManagers = projectSettingManagers(existing);
  if (existing) {
    [["진행 팀", beforeTeams.join(", ") || "미지정", selectedTeams.join(", ") || "미지정"], ["개별 인원", beforeExtras.join(", ") || "없음", selectedExtras.join(", ") || "없음"], ["관리 인원", beforeManagers.join(", ") || "없음", selectedManagers.join(", ") || "없음"], ["적용월", existing.month, next.month]]
      .filter(([, before, after]) => before !== after)
      .forEach(([field, before, after]) => appendProjectHistory(project, field, before, after, "프로젝트 작업 세팅 저장", "팀 매칭"));
    Object.assign(existing, next);
  } else {
    projectWorkSettings.push(next);
    appendProjectHistory(project, "진행 팀", "미지정", selectedTeams.join(", ") || "미지정", "프로젝트 작업 세팅 추가", "팀 매칭");
    if (selectedExtras.length) appendProjectHistory(project, "개별 인원", "없음", selectedExtras.join(", "), "프로젝트 작업 세팅 추가", "팀 매칭");
    if (selectedManagers.length) appendProjectHistory(project, "관리 인원", "없음", selectedManagers.join(", "), "프로젝트 작업 세팅 추가", "팀 매칭");
  }
  syncProjectAssignments(project, selectedTeams, selectedExtras, selectedManagers, "프로젝트 투입 구성 저장");
  renderAll();
  try {
    await persistOperationalNow();
  } catch (error) {
    setDbSaveStatus("error", `프로젝트 담당 권한 저장 실패: ${authMessage(error)}`);
  }
});
if ($("#slaRuleSave")) $("#slaRuleSave").addEventListener("click", () => {
  const deliverable = deliverables.find((item) => item.project === state.slaRuleProject && item.name === state.slaRuleDeliverable);
  if (!deliverable) return;
  const nextDays = Math.max(0, Math.floor(Number($("#slaRuleDays").value || 0)));
  const beforeConfigured = deliverable.slaEnabled === true;
  const beforeDays = beforeConfigured ? Number(deliverable.slaDays) : null;
  deliverable.slaDays = nextDays;
  deliverable.slaEnabled = true;
  if (beforeDays !== nextDays) {
    appendProjectHistory(
      deliverable.project,
      `${deliverable.name} 일정 기준`,
      beforeConfigured ? `${beforeDays}영업일` : "미설정",
      `${nextDays}영업일`,
      "결과물별 일정 기준 변경",
      "일정 기준"
    );
  }
  syncTaskSlaViolations();
  renderAll();
});
if ($("#deliverableAdd")) $("#deliverableAdd").addEventListener("click", () => {
  const name = $("#deliverableNameInput").value.trim();
  const standardHours = Number($("#deliverableHoursInput").value || 0);
  const slaDaysValue = $("#deliverableSlaDaysInput")?.value ?? "";
  const slaDays = slaDaysValue === "" ? null : Math.max(0, Math.floor(Number(slaDaysValue || 0)));
  if (!state.deliverableProject || !name || standardHours <= 0 || deliverables.some((item) => item.project === state.deliverableProject && normalizeImportKey(item.name) === normalizeImportKey(name))) return;
  deliverables.push({ project: state.deliverableProject, name, standardHours, slaDays, slaEnabled: slaDays !== null, conversionTarget: state.conversionTarget || name });
  appendProjectHistory(
    state.deliverableProject,
    "업무 템플릿",
    "-",
    `${name} / ${standardHours}H / 평균작업일=${slaDays !== null ? `${slaDays}영업일` : "미설정"} / 환산=${state.conversionTarget || name}`,
    "업무 템플릿 추가",
    "결과물"
  );
  renderAll();
});
if ($("#deliverableBulkConvert")) $("#deliverableBulkConvert").addEventListener("click", () => {
  const targetName = $("#conversionTargetSelect")?.value;
  const rows = deliverables.filter((deliverable) => deliverable.project === state.deliverableProject);
  if (!targetName || !rows.length) return;
  const beforeTargets = new Set(rows.map((deliverable) => deliverable.conversionTarget || deliverable.name));
  rows.forEach((deliverable) => { deliverable.conversionTarget = targetName; });
  appendProjectHistory(
    state.deliverableProject,
    "환산 기준",
    [...beforeTargets].join(", "),
    targetName,
    "결과물 환산 기준 일괄 변경",
    "결과물"
  );
  state.conversionTarget = targetName;
  renderAll();
  const button = $("#deliverableBulkConvert");
  button.textContent = `${rows.length}개 변경 완료`;
  setTimeout(() => { button.textContent = "환산 기준 일괄 변경"; }, 1400);
});
if ($("#projectConfigAdd")) $("#projectConfigAdd").addEventListener("click", () => {
  const next = readProjectForm();
  const button = $("#projectConfigAdd");
  const parent = next.parentProjectId ? projectConfigs.find((project) => project._id === next.parentProjectId) : null;
  if (parent && parent.client !== next.client) {
    const original = button.textContent;
    button.textContent = "같은 고객사의 기준 프로젝트를 선택하세요";
    setTimeout(() => { button.textContent = original; }, 1600);
    return;
  }
  if (!next.client || !next.project || projectConfigs.some((project) => project.project === next.project)) {
    const original = button.textContent;
    button.textContent = next.project ? "동일한 프로젝트가 있습니다" : "필수값을 입력하세요";
    setTimeout(() => { button.textContent = original; }, 1200);
    return;
  }
  projectConfigs.push({ ...next, status: "active", absoluteDailyHours: 7 });
  contracts[next.project] = { client: next.client, total: next.total, monthly: next.monthly, unitPrice: next.unitPrice, contractPeople: next.contractPeople, managementPeople: 0, monthlyPersonCost: next.monthlyPersonCost, workerPeople: 0, inputPeople: 0, startDate: next.startDate, endDate: next.endDate, costPerHour: 0 };
  const initialTeam = teams[0]?.name || "미지정";
  projectWorkSettings.push({ project: next.project, team: initialTeam, teams: initialTeam ? [initialTeam] : [], extraMembers: [], managerMembers: [], sla: 0, absoluteDailyHours: 7, month: localDateString().slice(0, 7) });
  syncProjectAssignmentsFromTeam(next.project, initialTeam, "프로젝트 신규 생성");
  appendProjectHistory(next.project, "프로젝트 상태", "-", "진행", "프로젝트 신규 생성");
  state.configProject = next.project;
  state.deliverableProject = next.project;
  resetProjectForm();
  renderAll();
});
document.addEventListener("click", (event) => {
  const editRuleButton = event.target.closest(".sla-rule-edit");
  const resetRuleButton = event.target.closest(".sla-rule-reset");
  if (editRuleButton) {
    const deliverable = deliverables[Number(editRuleButton.dataset.index)];
    if (!deliverable) return;
    state.slaRuleProject = deliverable.project;
    state.slaRuleDeliverable = deliverable.name;
    renderAll();
    $("#slaRuleDays")?.focus();
    return;
  }
  if (resetRuleButton) {
    const deliverable = deliverables[Number(resetRuleButton.dataset.index)];
    if (!deliverable) return;
    const beforeDays = Number(deliverable.slaDays);
    deliverable.slaDays = null;
    deliverable.slaEnabled = false;
    appendProjectHistory(
      deliverable.project,
      `${deliverable.name} 일정 기준`,
      `${beforeDays}영업일`,
      "미설정",
      "결과물별 일정 기준 해제",
      "일정 기준"
    );
    state.slaRuleProject = deliverable.project;
    state.slaRuleDeliverable = deliverable.name;
    syncTaskSlaViolations();
    renderAll();
  }
});
document.addEventListener("click", async (e) => {
  const editButton = e.target.closest(".member-edit");
  const deleteButton = e.target.closest(".member-delete");
  const restoreMemberButton = e.target.closest(".member-restore");
  const modalSaveButton = e.target.closest(".member-modal-save");
  const modalCloseButton = e.target.closest(".member-modal-close");
  const projectEditButton = e.target.closest(".project-edit");
  const recordEditButton = e.target.closest(".record-edit-open");
  const recordDeleteButton = e.target.closest(".record-delete");
  const recordEditSave = e.target.closest(".record-edit-save");
  const recordEditClose = e.target.closest(".record-edit-close");
  const taskDetailButton = e.target.closest(".task-detail-open");
  const taskDetailClose = e.target.closest(".task-detail-close");
  const workResourceDetailButton = e.target.closest(".work-resource-detail-open");
  const workResourceDetailClose = e.target.closest(".work-resource-detail-close");
  const projectCloseButton = e.target.closest(".project-close");
  const projectRestoreButton = e.target.closest(".project-restore");
  const projectHistoryButton = e.target.closest(".project-history-open");
  const projectHistoryClose = e.target.closest(".project-history-close");
  const historyPageButton = e.target.closest(".history-page");
  const operatorDetailButton = e.target.closest(".operator-detail-open");
  const metricDetailButton = e.target.closest(".metric-detail-open");
  const operatorDetailClose = e.target.closest(".operator-detail-close");
  const operatorDetailPage = e.target.closest(".operator-detail-page");
  const accountPreviewButton = e.target.closest(".account-preview");
  const accountDeleteButton = e.target.closest(".account-delete");
  if (accountPreviewButton) {
    switchAccount(accountPreviewButton.dataset.accountId);
    return;
  }
  if (accountDeleteButton) {
    const id = accountDeleteButton.dataset.accountId;
    if (id === state.currentAccountId) {
      const original = accountDeleteButton.textContent;
      accountDeleteButton.textContent = "현재 계정";
      setTimeout(() => { accountDeleteButton.textContent = original; }, 1200);
      return;
    }
    const account = accounts.find((item) => item.id === id);
    if (account?.remote && account._userId) {
      accountDeleteButton.disabled = true;
      accountDeleteButton.textContent = "삭제 중";
      try {
        await remoteData.deleteProfile(account._userId);
      } catch (error) {
        accountDeleteButton.disabled = false;
        accountDeleteButton.textContent = "삭제 실패";
        accountDeleteButton.title = authMessage(error);
        resetDbStateAfterAccountFailure();
        return;
      }
    }
    accounts = accounts.filter((account) => account.id !== id);
    if (state.selectedMemberAccount === id) state.selectedMemberAccount = accounts[0]?.id || "";
    renderAll();
    return;
  }
  if (operatorDetailButton || metricDetailButton) {
    const button = operatorDetailButton || metricDetailButton;
    openOperatorDetail({ type: button.dataset.detailType, value: button.dataset.detailValue || "", team: button.dataset.detailTeam || "" });
    return;
  }
  if (operatorDetailPage && !operatorDetailPage.disabled) {
    state.operatorDetailPage += Number(operatorDetailPage.dataset.direction);
    renderOperatorDetail(filteredTasks());
    return;
  }
  if (operatorDetailClose || e.target.id === "operatorDetailModal") {
    closeOperatorDetail();
    return;
  }
  if (projectEditButton) {
    const index = projectConfigs.findIndex((project) => project.project === projectEditButton.dataset.project);
    if (index >= 0) {
      state.recordEditSaving = false;
      state.recordEdit = { type: "project", index };
    }
    renderAll();
    return;
  }
  if (workResourceDetailButton) {
    const index = Number(workResourceDetailButton.dataset.index);
    if (!canAccessWorkResource(workResources[index])) return;
    state.workResourceDetailIndex = index;
    renderAll();
    await hydrateWorkResourceDetailImages(index);
    return;
  }
  if (workResourceDetailClose || e.target.id === "workResourceDetailModal") {
    state.workResourceDetailIndex = null;
    renderAll();
    return;
  }
  if (taskDetailButton) {
    const index = Number(taskDetailButton.dataset.index);
    if (!tasks[index] || !accessibleProjectNames().has(tasks[index].project)) return;
    state.taskDetailIndex = index;
    state.taskDetailPage = 1;
    state.taskDetailSaving = false;
    renderAll();
    return;
  }
  if (taskDetailClose || e.target.id === "taskDetailModal") {
    state.taskDetailIndex = null;
    state.taskDetailPage = 1;
    state.taskDetailSaving = false;
    renderAll();
    return;
  }
  if (recordEditButton) {
    const type = recordEditButton.dataset.recordType;
    const index = Number(recordEditButton.dataset.index);
    if (type === "task" && !canEditTaskRecord(tasks[index])) return;
    if (type === "workResource" && (!canManageWorkResources() || !canAccessWorkResource(workResources[index]))) return;
    state.recordEditSaving = false;
    state.recordEdit = { type, index, project: recordEditButton.dataset.project || "" };
    renderAll();
    return;
  }
  if (recordEditClose || e.target.id === "recordEditModal") {
    state.recordEditSaving = false;
    state.recordEdit = null;
    if ($("#recordEditError")) {
      $("#recordEditError").hidden = true;
      $("#recordEditError").textContent = "";
    }
    renderAll();
    return;
  }
  if (recordEditSave && state.recordEdit) {
    if (state.recordEditSaving) return;
    state.recordEditSaving = true;
    recordEditSave.disabled = true;
    const original = recordEditSave.textContent;
    recordEditSave.textContent = "저장 중";
    if ($("#recordEditError")) {
      $("#recordEditError").hidden = true;
      $("#recordEditError").textContent = "";
    }
    try {
      await withSaveTimeout(saveRecordEdit(), 25000, "변경 정보 저장 시간이 초과되었습니다. 다시 시도해 주세요.");
      state.recordEditSaving = false;
      renderAll();
    } catch (error) {
      state.recordEditSaving = false;
      if (error?.code === "DB_SAVE_TIMEOUT") {
        clearTimeout(dbPersistTimer);
        dbPersistChain = Promise.resolve();
        setDbSaveStatus("error", error.message);
      }
      recordEditSave.disabled = false;
      recordEditSave.textContent = "저장 실패";
      const message = authMessage(error);
      recordEditSave.title = message;
      if ($("#recordEditError")) {
        $("#recordEditError").hidden = false;
        $("#recordEditError").textContent = message;
      }
      if (state.recordEdit?.type === "account") resetDbStateAfterAccountFailure();
      setTimeout(() => { recordEditSave.textContent = original; }, 1800);
    }
    return;
  }
  if (recordDeleteButton) {
    deleteRecord(recordDeleteButton.dataset.recordType, Number(recordDeleteButton.dataset.index), recordDeleteButton);
    return;
  }
  if (projectCloseButton) {
    const target = projectConfigs.find((project) => project.project === projectCloseButton.dataset.project);
    if (target) {
      target.status = "closed";
      target.closedMonth = localDateString().slice(0, 7);
      target.closeReason = $("#projectConfigReason").value.trim() || "관리자 종료 처리";
      appendProjectHistory(target.project, "프로젝트 상태", "진행", "종료", target.closeReason);
      if (state.project === target.project) state.project = "전체";
      if (state.productivityProject === target.project) state.productivityProject = activeProjectConfigs().find((project) => project !== target)?.project || "전체";
      const firstActive = activeProjectConfigs()[0]?.project || "전체";
      state.configProject = firstActive;
      state.deliverableProject = firstActive;
      if (state.editingProjectName === target.project) resetProjectForm();
    }
    renderAll();
    return;
  }
  if (projectRestoreButton) {
    const target = projectConfigs.find((project) => project.project === projectRestoreButton.dataset.project);
    if (target) {
      const reason = `진행 복구${target.closeReason ? `: ${target.closeReason}` : ""}`;
      target.status = "active";
      delete target.closedMonth;
      delete target.closeReason;
      appendProjectHistory(target.project, "프로젝트 상태", "종료", "진행", reason);
      state.configProject = target.project;
      state.deliverableProject = target.project;
    }
    renderAll();
    return;
  }
  if (projectHistoryButton) {
    state.projectHistoryProject = projectHistoryButton.dataset.project;
    state.projectHistoryPage = 1;
    renderAll();
    return;
  }
  if (projectHistoryClose || e.target.id === "projectHistoryModal") {
    state.projectHistoryProject = null;
    state.projectHistoryPage = 1;
    renderAll();
    return;
  }
  if (historyPageButton && !historyPageButton.disabled) {
    state.projectHistoryPage += Number(historyPageButton.dataset.direction);
    renderProjectHistoryModal();
    return;
  }
  if (editButton) {
    state.memberModalIndex = Number(editButton.dataset.index);
    renderAll();
    return;
  }
  if (restoreMemberButton) {
    const index = Number(restoreMemberButton.dataset.index);
    const member = members[index];
    if (member) {
      const beforeStatus = member.employmentStatus || "재직";
      const restored = { ...member, employmentStatus: "재직", leftDate: "", resignationReason: "" };
      recordMemberEmploymentTransition(member, beforeStatus, "재직");
      members[index] = restored;
      syncAssignmentsForMember(restored);
      state.resignedPage = 1;
      renderAll();
      try {
        await persistOperationalNow();
      } catch (error) {
        setDbSaveStatus("error", `재직 복구 저장 실패: ${authMessage(error)}`);
      }
    }
    return;
  }
  if (deleteButton) {
    const index = Number(deleteButton.dataset.index);
    const member = members[index];
    const linkedAccount = accounts.find((account) => account.name === member?.name);
    if (member) {
      recordMemberDeparture(member.name, member.team);
      Object.keys(projectAssignments).forEach((project) => {
        projectAssignments[project] = projectAssignments[project].filter((name) => name !== member.name);
      });
    }
    members.splice(index, 1);
    if (linkedAccount) {
      linkedAccount.name = linkedAccount.id;
      linkedAccount.team = "미지정";
      linkedAccount.subgroup = "";
      linkedAccount.projects = [];
    }
    state.editingMemberIndex = null;
    renderAll();
    try {
      await persistOperationalNow();
      if (linkedAccount?.remote && linkedAccount._userId) {
        await remoteData.updateProfile(linkedAccount._userId, {
          display_name: linkedAccount.id,
          team_name: null,
          subgroup_name: null,
        });
      }
    } catch (error) {
      const message = authMessage(error);
      setDbSaveStatus("error", message.includes("실패:") ? message : `직원 정보 삭제 실패: ${message}`);
    }
    return;
  }
  if (modalSaveButton && state.memberModalIndex !== null) {
    const index = state.memberModalIndex;
    const before = { ...members[index] };
    const linkedAccount = accounts.find((account) => account.name === before.name);
    const after = {
      ...before,
      name: $("#modalMemberName").value.trim() || before.name,
      team: $("#modalMemberTeam").value,
      subgroup: $("#modalMemberSubgroup").value === "미지정" ? "" : $("#modalMemberSubgroup").value,
      position: $("#modalMemberPosition").value,
      grade: $("#modalMemberGrade").value,
      employmentStatus: $("#modalMemberEmploymentStatus").value,
      leftDate: $("#modalMemberEmploymentStatus").value === "퇴사" ? $("#modalMemberLeftDate").value : "",
      resignationReason: $("#modalMemberEmploymentStatus").value === "퇴사" ? $("#modalMemberResignationReason").value.trim() : "",
      reducedWork: $("#modalMemberReducedWork").checked,
      reducedWorkStartDate: $("#modalMemberReducedWork").checked ? $("#modalMemberReducedStartDate").value : "",
      reducedWorkEndDate: $("#modalMemberReducedWork").checked ? $("#modalMemberReducedEndDate").value : "",
      reducedWorkStartTime: $("#modalMemberReducedWork").checked ? $("#modalMemberReducedStartTime").value : "",
      reducedWorkEndTime: $("#modalMemberReducedWork").checked ? $("#modalMemberReducedEndTime").value : "",
      reducedDailyHours: $("#modalMemberReducedWork").checked ? reducedDailyHours($("#modalMemberReducedStartTime").value, $("#modalMemberReducedEndTime").value) : 0
    };
    if (after.reducedWork && (!after.reducedWorkStartDate || !after.reducedWorkEndDate || after.reducedWorkStartDate > after.reducedWorkEndDate || after.reducedDailyHours <= 0)) {
      const summary = $("#modalMemberReducedSummary");
      if (summary) summary.innerHTML = `<strong>단축근무 정보를 확인하세요.</strong><span>적용 기간과 점심시간 제외 후 0H보다 큰 근무시간이 필요합니다.</span>`;
      return;
    }
    if (after.employmentStatus === "퇴사" && (!after.leftDate || !after.resignationReason)) {
      const summary = $("#modalMemberEmploymentSummary");
      if (summary) summary.innerHTML = `<strong>퇴사 정보를 확인하세요.</strong><span>퇴사 처리에는 퇴사일과 퇴사 사유가 모두 필요합니다.</span>`;
      return;
    }
    recordMemberTeamTransition(after.name, before.team, after.team);
    const worker = workers[before.name] || { capacity: 100, vacation: 0, convertible: ["운영"] };
    if (before.name !== after.name) {
      renamePersonReferences(before.name, after.name);
    }
    recordMemberEmploymentTransition(after, before.employmentStatus || "재직", after.employmentStatus);
    workers[after.name] = { ...worker, team: after.team, subgroup: after.subgroup };
    members[index] = after;
    if (linkedAccount) {
      linkedAccount.name = after.name;
      linkedAccount.team = after.team;
      linkedAccount.subgroup = after.subgroup;
    }
    syncAssignmentsForMember(after, before.team);
    state.memberModalIndex = null;
    renderAll();
    try {
      await persistOperationalNow();
      if (linkedAccount?.remote && linkedAccount._userId) {
        await remoteData.updateProfile(linkedAccount._userId, {
          display_name: after.name,
          team_name: after.team || null,
          subgroup_name: after.subgroup || null,
        });
      }
      if (linkedAccount) {
        linkedAccount.projects = accountTeamProjectNames(linkedAccount);
      }
    } catch (error) {
      const message = authMessage(error);
      setDbSaveStatus("error", message.includes("실패:") ? message : `직원 정보 변경 실패: ${message}`);
    }
    return;
  }
  if (modalCloseButton || e.target.id === "memberModal") {
    state.memberModalIndex = null;
    renderAll();
    return;
  }
});
if ($("#workResourceForm")) $("#workResourceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canManageWorkResources()) return;
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const project = String(form.get("project") || "");
  const title = String(form.get("title") || "").trim();
  const content = String(form.get("content") || "").trim();
  const referenceUrl = String(form.get("link") || "").trim();
  const button = formElement.querySelector('button[type="submit"]');
  const assignedProject = workResourceProjectConfigs().some((item) => item.project === project);
  if (!assignedProject || !title || !content || (referenceUrl && !safeHttpUrl(referenceUrl))) {
    const original = button.textContent;
    button.textContent = referenceUrl && !safeHttpUrl(referenceUrl) ? "링크 주소를 확인하세요" : "프로젝트와 필수값을 확인하세요";
    setTimeout(() => { button.textContent = original; }, 1400);
    return;
  }
  const images = [...($("#workResourceImages")?.files || [])];
  if (images.length > 20) {
    button.textContent = "이미지는 최대 20장입니다";
    setTimeout(() => { button.textContent = "업무 자료 등록"; }, 1600);
    return;
  }
  button.disabled = true;
  button.textContent = images.length ? "이미지 업로드 중" : "등록 중";
  try {
    const resourceId = nextRecordId("RES", workResources.map((item) => item._id), 6);
    const projectRecord = projectConfigs.find((item) => item.project === project);
    projectRecord._id ||= nextRecordId("PRJ", projectConfigs.map((item) => item._id), 3);
    const imagePaths = images.length
      ? await remoteData?.uploadWorkResourceImages?.(projectRecord._id, resourceId, images)
      : [];
    if (images.length && imagePaths?.length !== images.length) throw new Error("일부 이미지를 저장하지 못했습니다.");
    const now = new Date().toISOString();
    workResources.push({
      _id: resourceId,
      project,
      category: String(form.get("category") || "공통사항"),
      title,
      content,
      referenceUrl,
      imagePaths: imagePaths || [],
      pinned: form.has("pinned"),
      createdBy: currentAccount()?.id || "미확인",
      createdAt: now,
      updatedAt: now,
    });
    markOperationalDirty();
    formElement.reset();
    state.workResourceProject = project;
    state.workResourcePage = 1;
    renderAll();
    button.textContent = "등록 완료";
  } catch (error) {
    button.textContent = "등록 실패";
    button.title = authMessage(error);
    setDbSaveStatus("error", `업무 자료 등록 실패: ${authMessage(error)}`);
  } finally {
    button.disabled = false;
    setTimeout(() => { button.textContent = "업무 자료 등록"; }, 1800);
  }
});

if ($("#taskForm")) $("#taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const project = f.get("project");
  const account = currentAccount();
  const accountMember = members.find((member) => member.name === account?.name && member.employmentStatus !== "퇴사");
  const registrationAccountValid = account?.role === "admin" || Boolean(accountMember);
  const selected = selectedTaskDeliverables();
  const relatedTaskId = validatedRelatedTaskId(f.get("relatedTaskId"), project);
  const owner = String(f.get("owner") || "");
  const ownerMember = members.find((member) => member.name === owner && member.employmentStatus !== "퇴사");
  const button = e.currentTarget.querySelector('button[type="submit"]');
  if (!registrationAccountValid || !ownerMember || !project || relatedTaskId === null || !authorizedProjectNames(account).includes(project)) {
    const original = button.textContent;
    button.textContent = !registrationAccountValid ? "인원 정보를 먼저 지정하세요" : !ownerMember ? "담당자를 선택하세요" : relatedTaskId === null ? "연결 업무를 확인하세요" : "프로젝트 권한 확인";
    setTimeout(() => { button.textContent = original; }, 1400);
    return;
  }
  const manualStandardHours = selected.length ? null : await requestEmptyOutputConfirmation();
  if (manualStandardHours === null) return;
  const config = projectConfig(project);
  const setting = projectWorkSettings.find((item) => item.project === project);
  const baseStandardHours = selected.length
    ? selected.reduce((sum, item) => sum + item.deliverable.standardHours * item.count, 0)
    : manualStandardHours;
  const photoType = selected.length ? normalizePhotoType(f.get("photoType")) : "일반";
  const effortBufferPct = selected.length && account?.role === "admin" ? normalizeEffortBufferPct(f.get("effortBufferPct")) : 0;
  const standardHours = outputEffortHours(baseStandardHours, photoType);
  const start = f.get("start");
  const dueDate = f.get("due");
  const status = f.get("status");
  const assignmentConflict = ["요청", "진행", "검수", "보류"].includes(status)
    ? taskAssignmentConflict(ownerMember, start, dueDate, standardHours)
    : null;
  if (assignmentConflict && !(await requestAssignmentConflictConfirmation(assignmentConflict))) return;
  const stage = projectUsesStages(project) ? taskStageValue("register") : "";
  const stageDetail = projectUsesStages(project) ? String(f.get("stageDetail") || "").trim() : "";
  const completedDate = status === "완료" ? localDateString() : "";
  const outputs = selected.map((item) => `${item.deliverable.name}(${item.count})`);
  const slaRule = taskSlaRule({ project, type: projectDirection(project), outputs });
  const task = {
    id: nextRecordId("TASK", tasks.map((task) => task.id), 6),
    client: config?.client || "-",
    project,
    team: ownerMember.team || setting?.team || "미지정",
    type: projectDirection(project),
    stage,
    stageDetail,
    channel: f.get("channel"),
    difficulty: "보통",
    start,
    end: completedDate || dueDate,
    dueDate,
    completedDate,
    status,
    title: f.get("title"),
    relatedTaskId,
    owner,
    ownerEmployeeId: ownerMember._id || "",
    urgent: f.has("urgent"),
    delayed: false,
    revision: f.has("revision"),
    rejected: status === "반려",
    approvalDelay: false,
    night: false,
    standardHours,
    baseStandardHours,
    manualStandardHours,
    photoType,
    effortBufferPct,
    outputs,
    outputDetails: selected.map((item) => ({
      name: item.deliverable.name,
      count: item.count,
      owner,
      ownerEmployeeId: ownerMember._id || "",
      standardHoursPerUnit: Number(item.deliverable.standardHours || 0),
    })),
    monthDelta: 0,
    slaResponsibility: "미확인",
    scheduleChangeReason: "",
    originalDueDate: dueDate,
    slaDueDate: slaRule.configured ? addWorkingDays(start, slaRule.limit) : "",
    slaLimit: slaRule.limit,
    slaRuleLabel: slaRule.source,
    slaRuleType: slaRule.type,
    slaConfigured: slaRule.configured,
    slaRuleStored: true,
    detailNotes: assignmentConflict ? [{
      id: `NOTE-${Date.now()}`,
      type: "일정 충돌 승인",
      content: `${assignmentConflict.overloadDates.map((row) => `${row.date} ${formatNumber(row.totalHours, 1)}H`).join(", ")} · 일 8H 초과 상태로 담당자 배정 승인`,
      author: currentAccount()?.name || currentAccount()?.id || "미확인",
      createdAt: new Date().toISOString(),
    }] : [],
  };
  tasks.push(task);
  syncTaskSlaViolations();
  appendProjectHistory(
    project,
    "업무 등록",
    "-",
    `${task.id} / ${task.title} / ${task.owner} / ${stage || "단계 없음"} / ${outputs.join(", ") || `결과물 없음 · 수동 ${formatNumber(manualStandardHours, 2)}H`}`,
    "운영자 업무 등록",
    "업무"
  );
  state.taskDeliverableSelections[project] = {};
  state.taskDeliverableSearch = "";
  $("#taskTitleInput").value = "";
  if ($("#taskRelatedTaskInput")) $("#taskRelatedTaskInput").value = "";
  $("#taskStageSelect").value = "";
  $("#taskStageInput").value = "";
  $("#taskStageDetailInput").value = "";
  $("#taskPhotoTypeInput").value = "일반";
  $("#taskEffortBufferInput").value = "0";
  if ($("#taskDeliverableSearchInput")) $("#taskDeliverableSearchInput").value = "";
  if ($("#taskDeliverableBulkResult")) $("#taskDeliverableBulkResult").hidden = true;
  renderAll();
});
if ($("#downloadMonthlyExcel")) $("#downloadMonthlyExcel").addEventListener("click", downloadMonthlyWorkbook);
if ($("#downloadOutputAggregateExcel")) $("#downloadOutputAggregateExcel").addEventListener("click", () => downloadOutputAggregateWorkbook(false));
if ($("#downloadWorkerOutputExcel")) $("#downloadWorkerOutputExcel").addEventListener("click", () => downloadOutputAggregateWorkbook(true));
if ($("#downloadMonthlyBundle")) $("#downloadMonthlyBundle").addEventListener("click", downloadCombinedMonthlyWorkbook);
if ($("#downloadRangeBundle")) $("#downloadRangeBundle").addEventListener("click", downloadCombinedRangeWorkbook);
if ($("#downloadExcelCountSummary")) $("#downloadExcelCountSummary").addEventListener("click", downloadExcelCountSummary);
if ($("#downloadDeliverableSettings")) $("#downloadDeliverableSettings").addEventListener("click", downloadDeliverableSettingsWorkbook);
if ($("#loginForm")) $("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#loginSubmit");
  const loginId = $("#loginId").value.trim();
  const password = $("#loginPassword").value;
  button.disabled = true;
  button.textContent = "로그인 확인 중";
  showLogin("계정 정보를 확인하고 있습니다.");
  try {
    await remoteAuth.signIn(loginId, password);
    await completeRemoteLogin();
  } catch (error) {
    await remoteAuth.logout();
    showLogin(authMessage(error), true);
  } finally {
    button.disabled = false;
    button.textContent = "로그인";
  }
});
if ($("#dbSaveStatus")) $("#dbSaveStatus").addEventListener("click", async () => {
  if (!operationalDbReady) {
    setDbSaveStatus("idle", "로그인 후 DB 저장을 사용할 수 있습니다.");
    return;
  }
  try {
    await persistOperationalNow();
  } catch {
    // The status button already exposes the actionable error.
  }
});
if ($("#systemAlertAction")) $("#systemAlertAction").addEventListener("click", () => {
  const action = systemAlertAction;
  if (action) action();
});
[$("#systemAlertClose"), $("#systemAlertCloseTop")].filter(Boolean).forEach((button) => {
  button.addEventListener("click", closeSystemAlert);
});
if ($("#systemAlertModal")) $("#systemAlertModal").addEventListener("click", (event) => {
  if (event.target.id === "systemAlertModal") closeSystemAlert();
});
if ($("#logoutButton")) $("#logoutButton").addEventListener("click", async () => {
  if (operationalDbReady) {
    try {
      await persistOperationalNow();
    } catch {
      return;
    }
  }
  if (remoteAuthEnabled) await remoteAuth.logout();
  operationalDbReady = false;
  setDbSaveStatus("idle", "다시 로그인하면 DB에 연결됩니다.");
  showLogin("");
  $("#loginId").focus();
});
if ($("#copyReport")) $("#copyReport").addEventListener("click", async () => { await navigator.clipboard.writeText($("#reportText").value); $("#copyReport").textContent = "복사됨"; setTimeout(() => ($("#copyReport").textContent = "복사"), 1200); });
if ($("#runSim")) $("#runSim").addEventListener("click", () => renderStaffing(filteredTasks()));
if ($("#modeToggle")) $("#modeToggle").addEventListener("click", () => setMode(state.mode === "operator" ? "admin" : "operator"));
$$(".operator-detail-close").forEach((button) => button.addEventListener("click", (e) => {
  e.stopPropagation();
  closeOperatorDetail();
}));

window.addEventListener("beforeunload", (event) => {
  if (dbSaveState !== "queued" && dbSaveState !== "saving") return;
  event.preventDefault();
  event.returnValue = "";
});

applyBranding();
renderAll();
initializeAuthentication();
