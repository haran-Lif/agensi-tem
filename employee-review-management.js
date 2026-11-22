/* Admin-only review evidence and append-only score ledger. */
globalThis.EmployeeReviewManagement = (() => {
  let entries = [], available = false, tab = 'list', busy = false, search = '', employee = '', project = '', month = '';
  const bucket = 'employee-review-images';
  const allowedImages = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
  const isAdmin = () => currentAccount()?.role === 'admin';
  const esc = value => escapeHtml(String(value ?? ''));
  const request = (path, options) => remoteAuth.authenticatedRequest(path, options);
  const pathUrl = path => path.split('/').map(encodeURIComponent).join('/');
  const employeeName = id => members.find(m => m._id === id)?.name || id;
  const projectName = id => projectConfigs.find(p => p._id === id)?.project || id;
  const authorName = id => accounts.find(a => a._userId === id)?.name || id;
  function hydrate(rows, ready) { entries = rows || []; available = Boolean(ready); }
  function finalScore(base, delta) { return Math.round(Math.max(0, Math.min(120, base + delta)) * 100) / 100; }
  function adjustment(employeeId, projectId, year, selectedMonth) {
    return Math.round(entries.filter(e => e.entry_kind === 'score' && e.employee_id === employeeId
      && (!projectId || e.project_id === projectId)
      && (year === '전체' || e.effective_month.slice(0, 4) === year)
      && (selectedMonth === '전체' || e.effective_month.slice(5, 7) === selectedMonth))
      .reduce((sum, e) => sum + Number(e.points), 0) * 100) / 100;
  }
  const options = (items, selected, prompt) => `<option value="">${prompt}</option>` + items.map(([id, name]) => `<option value="${esc(id)}" ${id === selected ? 'selected' : ''}>${esc(name)}</option>`).join('');
  function filteredEntries() {
    return entries.filter(e => (!employee || e.employee_id === employee) && (!project || e.project_id === project)
      && (!month || e.effective_month.startsWith(month))
      && (!search || [e.title, e.content, employeeName(e.employee_id)].join(' ').toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));
  }
  function card(e) {
    const link = safeHttpUrl(e.reference_url);
    return `<article class="panel review-evidence-card"><div class="panel-head"><div><strong>${esc(e.title)}</strong><p>${esc(employeeName(e.employee_id))} · ${esc(projectName(e.project_id))} · ${esc(e.category)} · 적용 ${esc(e.effective_month.slice(0, 7))}</p></div><span class="pill">${e.entry_kind === 'score' ? `${Number(e.points) > 0 ? '+' : ''}${Number(e.points)}점` : '자료'}</span></div>
      <div class="review-evidence-text">${esc(e.content)}</div>
      ${link ? `<p><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">참고 링크</a></p>` : ''}
      ${e.source_id ? `<p>근거 자료: ${esc(entries.find(x => x.entry_id === e.source_id)?.title || e.source_id)}</p>` : ''}
      <div class="review-image-actions">${(e.image_paths || []).map((_, i) => `<button class="secondary small" type="button" data-review-image="${esc(e.entry_id)}" data-image-index="${i}">첨부 이미지 ${i + 1}</button>`).join('')}</div>
      <small>작성자 ${esc(authorName(e.created_by))} · ${esc(new Date(e.created_at).toLocaleString('ko-KR'))}</small>
      ${e.entry_kind === 'feedback' ? `<button class="secondary small" type="button" data-review-score="${esc(e.entry_id)}">이 자료로 점수 조정</button>` : ''}</article>`;
  }
  function render() {
    const root = document.querySelector('#employeeReviewManagementView');
    if (!root) return;
    if (!isAdmin()) { root.innerHTML = ''; return; }
    // Preserve typed input while unrelated dashboard renders occur.
    if (root.dataset.tab === tab && tab === 'create' && root.querySelector('form')) return;
    root.dataset.tab = tab;
    const people = members.map(m => [m._id, `${m.name} · ${m.team}${m.employmentStatus === '퇴사' ? ' · 퇴사' : ''}`]).filter(x => x[0]);
    const projects = workResourceProjectConfigs().map(p => [p._id, p.project]).filter(x => x[0]);
    root.innerHTML = `<section class="panel"><div class="panel-head"><div><h2>직원평가관리</h2><p>피드백·이슈 자료와 점수 조정 근거를 관리합니다. 자료만 등록하면 점수는 바뀌지 않습니다.</p></div></div>
      <div class="tabs">${[['list','자료 확인'],['create','자료등록'],['score','점수관리']].map(([id,label]) => `<button type="button" class="tab ${tab === id ? 'active' : ''}" data-review-tab="${id}">${label}</button>`).join('')}</div>
      <p id="reviewManagementMessage" role="status">${available ? '' : '평가 자료를 불러오지 못했습니다. DB 026 마이그레이션 적용 및 재로그인 후 사용하세요. 최종 점수는 미확인 상태입니다.'}</p>
      <div id="reviewManagementBody"></div></section>`;
    const body = root.querySelector('#reviewManagementBody');
    if (tab === 'create') {
      body.innerHTML = `<form id="reviewEvidenceForm" class="form-grid">
        <label>대상 직원<select name="employee" required>${options(people,'','직원 선택')}</select></label>
        <label>프로젝트<select name="project" required>${options(projects,'','프로젝트 선택')}</select></label>
        <label>분류<select name="category"><option>피드백</option><option>이슈</option><option>우수 사례</option><option>참고 자료</option></select></label>
        <label>평가 적용월<input type="month" name="month" required value="${localDateString().slice(0,7)}" /></label>
        <label class="wide-field">제목<input name="title" required maxlength="200" /></label>
        <label class="wide-field">내용<textarea name="content" rows="6" required></textarea></label>
        <label class="wide-field">참고 링크<input name="link" type="url" placeholder="https://" /></label>
        <label class="wide-field">첨부 이미지<input name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple /><small>한 건당 최대 20장, 이미지당 10MB</small></label>
        <div class="checks"><label><input name="pinned" type="checkbox" /> 상단 고정</label></div>
        <button class="primary" type="submit" ${available ? '' : 'disabled'}>자료 등록</button></form>`;
      return;
    }
    body.innerHTML = `<div class="list-toolbar"><label>직원<select id="reviewManagementEmployee">${options(people,employee,'전체 직원')}</select></label><label>프로젝트<select id="reviewManagementProject">${options(projects,project,'전체 프로젝트')}</select></label><label>적용월<input id="reviewManagementMonth" type="month" value="${esc(month)}" /></label><label>검색<input id="reviewManagementSearch" type="search" value="${esc(search)}" placeholder="제목·내용·직원" /></label><button type="button" class="secondary" data-review-reset>초기화</button></div>`;
    if (tab === 'score') {
      const sources = entries.filter(e => e.entry_kind === 'feedback' && (!employee || e.employee_id === employee) && (!project || e.project_id === project));
      body.innerHTML += `<p>근거 자료를 선택해 가감점을 기록합니다. 기존 기록은 유지하며 정정 시 반대 부호의 점수와 정정 사유를 추가하세요. 최종 점수는 기존 평가 범위인 0~120점으로 제한됩니다.</p>
        <form id="reviewScoreForm" class="form-grid"><label class="wide-field">근거 자료<select name="source" required>${options(sources.map(e=>[e.entry_id,`${employeeName(e.employee_id)} · ${projectName(e.project_id)} · ${e.title}`]),'','자료 선택')}</select></label><label>평가 적용월<input name="month" type="month" required value="${month || localDateString().slice(0,7)}" /></label><label>가감점<input name="points" type="number" min="-120" max="120" step="0.01" required placeholder="예: -3 또는 2" /></label><label class="wide-field">조정 사유<textarea name="content" rows="3" required></textarea></label><button type="submit" class="primary" ${available ? '' : 'disabled'}>가감점 반영</button></form>
        <p>최종 점수는 ‘내부 직원평가’의 프로젝트·연도·월 필터 기준입니다. 아래 미리보기도 동일한 평가 필터를 따릅니다.</p>
        <div class="table-wrap"><table><thead><tr><th>직원</th><th>기존 점수</th><th>가감점</th><th>최종 점수</th><th>등급</th></tr></thead><tbody>${employeeReviewRows().filter(r=>!employee || r.member._id === employee).map(r=>`<tr><td>${esc(r.member.name)}</td><td>${formatNumber(r.baseTotalScore,2)}</td><td>${formatNumber(r.manualAdjustment,2)}</td><td>${available ? formatNumber(r.totalScore,2) : '미확인'}</td><td>${available ? esc(r.grade) : '미확인'}</td></tr>`).join('')}</tbody></table></div>`;
    }
    const rows = filteredEntries().filter(e => tab === 'list' ? e.entry_kind === 'feedback' : e.entry_kind === 'score');
    body.innerHTML += `<p>${rows.length}건</p><div class="work-resource-list">${rows.map(card).join('') || '<p class="empty-text">등록된 자료가 없습니다.</p>'}</div>`;
  }
  function validateImages(files) {
    if (files.length > 20) throw new Error('이미지는 최대 20장까지 등록할 수 있습니다.');
    for (const file of files) {
      if (!allowedImages.has(file.type) || file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: JPG·PNG·WebP·GIF, 이미지당 10MB 이하만 가능합니다.`);
    }
  }
  async function save(formElement) {
    if (!isAdmin() || busy || !available) return;
    const form = new FormData(formElement), isScore = formElement.id === 'reviewScoreForm';
    const id = formElement.dataset.entryId ||= crypto.randomUUID();
    const content = String(form.get('content') || '').trim();
    const appliedMonth = String(form.get('month') || '');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(appliedMonth) || !content) throw new Error('적용월과 내용을 입력하세요.');
    let row = {entry_id:id, entry_kind:isScore?'score':'feedback', content, effective_month:`${appliedMonth}-01`, image_paths:[]};
    const files = isScore ? [] : [...formElement.elements.images.files];
    validateImages(files);
    if (isScore) {
      const source = entries.find(e=>e.entry_id === form.get('source') && e.entry_kind === 'feedback');
      const points = Number(form.get('points'));
      if (!source || !Number.isFinite(points) || !points || Math.abs(points)>120) throw new Error('근거 자료와 0이 아닌 -120~120점 가감점을 입력하세요.');
      row = {...row, source_id:source.entry_id, employee_id:source.employee_id, project_id:source.project_id, points, category:'점수 조정', title:`점수 조정: ${source.title}`};
    } else {
      const projectId = String(form.get('project')), employeeId = String(form.get('employee'));
      const link = String(form.get('link')||'').trim(), title = String(form.get('title')||'').trim();
      if (!members.some(m=>m._id===employeeId) || !workResourceProjectConfigs().some(p=>p._id===projectId) || !title || (link && !safeHttpUrl(link))) throw new Error('직원·프로젝트·제목·참고 링크를 확인하세요.');
      row = {...row, employee_id:employeeId, project_id:projectId, category:String(form.get('category')), title, reference_url:link, pinned:form.get('pinned')==='on', points:0};
    }
    busy = true;
    const button = formElement.querySelector('[type="submit"]'); button.disabled = true;
    try {
      // Reuse a submission ID: retry after a lost response must not apply points twice.
      const previous = await request(`/rest/v1/employee_review_entries?entry_id=eq.${id}&select=*`);
      let saved = previous[0];
      if (!saved) {
        for (let i=0;i<files.length;i++) {
          const file=files[i], path=`${id}/${crypto.randomUUID()}-${i}`;
          await request(`/storage/v1/object/${bucket}/${pathUrl(path)}`, {method:'POST',headers:{'Content-Type':file.type,'x-upsert':'false'},body:file});
          row.image_paths.push(path);
        }
        const result = await request('/rest/v1/employee_review_entries', {method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(row)});
        saved = result[0];
      }
      if (!entries.some(e=>e.entry_id===saved.entry_id)) entries.push(saved);
      tab = isScore ? 'score' : 'list';
      render(); renderEmployeeReview();
      document.querySelector('#reviewManagementMessage').textContent = 'DB에 저장했습니다.';
    } finally { busy = false; button.disabled = false; }
  }
  function bind() {
    const root = document.querySelector('#employeeReviewManagementView');
    root.addEventListener('click', async event => {
      if (!isAdmin() || busy) return;
      const target = event.target.closest('button'); if (!target) return;
      if (target.dataset.reviewTab) {tab=target.dataset.reviewTab; render();}
      if (target.hasAttribute('data-review-reset')) {employee=project=month=search=''; render();}
      if (target.dataset.reviewScore) {
        const source = entries.find(e => e.entry_id === target.dataset.reviewScore);
        tab='score'; render();
        root.querySelector('[name="source"]').value=target.dataset.reviewScore;
        if (source) root.querySelector('[name="month"]').value=source.effective_month.slice(0,7);
      }
      if (target.dataset.reviewImage) {
        try {
          const row=entries.find(e=>e.entry_id===target.dataset.reviewImage), path=row?.image_paths?.[Number(target.dataset.imageIndex)];
          if (!path) return;
          const result=await request(`/storage/v1/object/sign/${bucket}/${pathUrl(path)}`,{method:'POST',body:JSON.stringify({expiresIn:300})});
          const signed=result.signedURL||result.signedUrl;
          if (!signed) throw new Error('이미지 주소를 받지 못했습니다.');
          const url=new URL(/^https?:\/\//.test(signed) || signed.startsWith('/storage/v1/') ? signed : `/storage/v1${signed}`,SUPABASE_CONFIG.url).href;
          const dialog=document.createElement('dialog'); dialog.className='review-image-dialog';
          const close=document.createElement('button'); close.textContent='닫기'; close.onclick=()=>{dialog.close();dialog.remove();};
          const img=document.createElement('img'); img.src=url; img.alt=row.title; dialog.append(close,img); document.body.append(dialog); dialog.showModal();
          dialog.addEventListener('close',()=>dialog.remove(),{once:true});
        } catch(error) {root.querySelector('#reviewManagementMessage').textContent=authMessage(error);}
      }
    });
    root.addEventListener('change', event => {
      const map={reviewManagementEmployee:v=>employee=v,reviewManagementProject:v=>project=v,reviewManagementMonth:v=>month=v,reviewManagementSearch:v=>search=v};
      if(map[event.target.id]) {map[event.target.id](event.target.value);render();}
    });
    root.addEventListener('submit',async event=>{event.preventDefault();try{await save(event.target);}catch(error){root.querySelector('#reviewManagementMessage').textContent=authMessage(error);}});
  }
  return {hydrate, adjustment, finalScore, render, bind, validateImages, periods:()=>entries.map(e=>e.effective_month), isAvailable:()=>available};
})();
