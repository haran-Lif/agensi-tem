// Read-only public aggregates; this page never loads authentication or private tables.
(() => {
  let rows=[], busy=false;
  const today=new Date();
  const choice={client:'전체',project:'전체',year:String(today.getFullYear()),month:String(today.getMonth()+1).padStart(2,'0'),day:String(today.getDate()).padStart(2,'0')};
  const root=document.querySelector('#dailyView'), message=document.querySelector('#publicDailyMessage');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render() {
    const clients=['전체',...new Set(rows.map(r=>r.client))];
    if(!clients.includes(choice.client))choice.client='전체';
    const projects=['전체',...new Set(rows.filter(r=>choice.client==='전체'||r.client===choice.client).map(r=>r.project))];
    if(!projects.includes(choice.project))choice.project='전체';
    const scoped=rows.filter(r=>(choice.client==='전체'||r.client===choice.client)&&(choice.project==='전체'||r.project===choice.project));
    const options=DailyStatus.dateOptions(scoped,choice);
    Object.assign(choice,{year:options.year,month:options.month,day:options.day});
    const sums=new Map();
    scoped.filter(r=>r.dueDate===options.date).forEach(r=>{if(!sums.has(r.key))sums.set(r.key,{name:r.name,hours:0});sums.get(r.key).hours+=Number(r.hours)||0;});
    const select=(key,label,values,suffix='')=>`<label>${label}<select data-filter="${key}" ${values.length?'':'disabled'}>${values.length?values.map(v=>`<option value="${esc(v)}" ${v===choice[key]?'selected':''}>${esc(v)}${suffix}</option>`).join(''):'<option>등록 없음</option>'}</select></label>`;
    root.innerHTML=`<section class="panel"><div class="list-toolbar daily-filter-toolbar">${select('client','고객사',clients)}${select('project','프로젝트명',projects)}${select('year','완료연도',options.years,'년')}${select('month','작업 월',options.months,'월')}${select('day','작업일자',options.days,'일')}</div></section><section class="panel"><h2>일간 현황${options.date?' · '+esc(options.date):''}</h2><p>업무 등록 시 완료 예정일 기준 · 기준공수 전액 합산 · 버퍼 미적용</p><div class="table-wrap"><table><thead><tr><th>작업자</th><th>기준공수 총합 (H)</th></tr></thead><tbody>${[...sums.values()].sort((a,b)=>b.hours-a.hours||a.name.localeCompare(b.name,'ko')).map(r=>`<tr><td>${esc(r.name)}</td><td>${r.hours.toLocaleString('ko-KR',{maximumFractionDigits:2})}H</td></tr>`).join('')||'<tr><td colspan="2">공개된 업무 데이터가 없습니다.</td></tr>'}</tbody></table></div></section>`;
  }
  async function refresh(){
    if(busy)return;busy=true;
    const button=document.querySelector('#refreshDaily');button.disabled=true;
    try{
      const response=await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/get_public_daily_status`,{method:'POST',headers:{apikey:SUPABASE_CONFIG.publishableKey,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error(`조회 실패 (${response.status})`);
      const data=await response.json();if(!Array.isArray(data))throw new Error('잘못된 응답');
      rows=data;render();message.textContent=`최근 조회: ${new Date().toLocaleString('ko-KR')} · 1분마다 갱신`;
    }catch(error){rows=[];root.innerHTML='';message.textContent=`일간 현황을 불러오지 못했습니다. ${error.message} · 관리자에게 공개 설정 및 027 SQL 적용을 확인해주세요.`;}
    finally{busy=false;button.disabled=false;}
  }
  root.addEventListener('change',event=>{const key=event.target.dataset.filter;if(!['client','project','year','month','day'].includes(key))return;choice[key]=event.target.value;if(key==='client')choice.project='전체';render();});
  document.querySelector('#refreshDaily').addEventListener('click',refresh);
  refresh();setInterval(()=>{if(!document.hidden)refresh();},60000);
})();
