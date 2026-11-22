globalThis.DailyStatus = (() => {
  let selection;
  const esc = value => escapeHtml(String(value ?? ''));
  function dateOf(task) {
    const date = task.dueDate || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
    const parsed = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0,10) === date ? date : '';
  }
  function totals(items, date) {
    const result = new Map();
    const add = (id, name, hours) => {
      const member = id ? members.find(m => m._id === id) : members.find(m => m.name === name);
      const key = member?._id || id || name || '__unassigned__';
      if (!result.has(key)) result.set(key, {key, name:member?.name || name || '미배정', hours:0});
      result.get(key).hours += Number.isFinite(hours) ? hours : 0;
    };
    items.filter(task => dateOf(task) === date).forEach(task => {
      const details = taskOutputDetails(task);
      if (!details.length) { add(task.ownerEmployeeId, task.owner, Number(task.standardHours || 0)); return; }
      details.forEach(detail => {
        const own = detail.ownerEmployeeId || detail.owner;
        const unit = Number(detail.standardHoursPerUnit ?? deliverableRuleFor(task.project, detail.name)?.standardHours ?? 0);
        add(own ? detail.ownerEmployeeId : task.ownerEmployeeId, own ? detail.owner : task.owner,
          outputEffortHours(Number(detail.count || 0) * unit, task.photoType));
      });
    });
    return [...result.values()].sort((a,b) => b.hours-a.hours || a.name.localeCompare(b.name,'ko'));
  }
  function dateOptions(items, selected) {
    const dates = [...new Set(items.map(dateOf).filter(Boolean))].sort();
    const years = [...new Set(dates.map(d => d.slice(0,4)))];
    const year = years.includes(selected.year) ? selected.year : years.at(-1) || '';
    const months = [...new Set(dates.filter(d => d.slice(0,4) === year).map(d => d.slice(5,7)))];
    const month = months.includes(selected.month) ? selected.month : months.at(-1) || '';
    const days = dates.filter(d => d.startsWith(`${year}-${month}-`)).map(d => d.slice(8,10));
    const day = days.includes(selected.day) ? selected.day : days.at(-1) || '';
    return {years, months, days, year, month, day, date: day ? `${year}-${month}-${day}` : ''};
  }
  function render() {
    const root = document.querySelector('#dailyView');
    if (!canAccessView('daily')) {root.innerHTML='';return;}
    const today = localDateString();
    selection ||= {client:'전체',project:'전체',year:today.slice(0,4),month:today.slice(5,7),day:today.slice(8,10)};
    const configs = accessibleProjectConfigs(), allowed = new Set(configs.map(p=>p.project));
    const accessible = tasks.filter(t=>allowed.has(t.project));
    const clients = ['전체',...new Set(configs.map(p=>p.client))];
    if (!clients.includes(selection.client)) selection.client='전체';
    const projects=['전체',...configs.filter(p=>selection.client==='전체'||p.client===selection.client).map(p=>p.project)];
    if (!projects.includes(selection.project)) selection.project='전체';
    const scoped=accessible.filter(t=>(selection.client==='전체'||t.client===selection.client)&&(selection.project==='전체'||t.project===selection.project));
    const options = dateOptions(scoped, selection);
    const {years, months, days, year, month, day, date} = options;
    Object.assign(selection, {year, month, day});
    const rows=date ? totals(scoped,date) : [];
    const select=(key,label,values,suffix='')=>`<label>${label}<select data-daily-filter="${key}" ${values.length ? '' : 'disabled'}>${values.length ? '' : '<option value="">등록 없음</option>'}${values.map(v=>`<option value="${esc(v)}" ${v===selection[key]?'selected':''}>${esc(v)}${suffix}</option>`).join('')}</select></label>`;
    root.innerHTML=`<section class="panel"><div class="list-toolbar daily-filter-toolbar">${select('client','고객사',clients)}${select('project','프로젝트명',projects)}${select('year','완료연도',years,'년')}${select('month','작업 월',months,'월')}${select('day','작업일자',days,'일')}</div></section>
      <section class="panel"><div class="panel-head"><div><h2>일간 현황${date ? ` · ${date}` : ''}</h2><p>업무 등록 시 완료 예정일 기준 · 기준공수 전액 합산 · 버퍼 미적용</p></div></div><div class="table-wrap"><table><thead><tr><th>작업자</th><th>기준공수 총합 (H)</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${formatNumber(r.hours,2)}H</td></tr>`).join('')||'<tr><td colspan="2">선택한 날짜에 할당된 업무가 없습니다.</td></tr>'}</tbody></table></div></section>`;
  }
  function bind() {
    document.querySelector('#dailyView').addEventListener('change',event=>{
      const key=event.target.dataset.dailyFilter;
      if (!['client','project','year','month','day'].includes(key)) return;
      selection[key]=event.target.value;
      if(key==='client')selection.project='전체';
      render();
    });
  }
  return {render,bind,totals,dateOf,dateOptions};
})();
