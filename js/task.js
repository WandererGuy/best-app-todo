/* ============ panel chi tiết ============ */
function openTask(id){
  ui.open = id;
  drawTask(); $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
}
function closeDrawer(){
  ui.open = null; $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on');
  render();
}
// việc con: dùng chung cho panel chi tiết (có ô tick) và form tạo task (không có)
function subsHTML(subs, withCb){
  return subs.map(s => `<div class="subitem"><div class="subrow${s.d?' on':''}">
    ${withCb ? `<span class="cb${s.d?' on':''}" data-tog="${s.id}">✓</span>` : ''}
    <input value="${esc(s.t)}" data-sub="${s.id}" placeholder="${tr('sub.namePh')}">
    <button class="nt${s.n?' has':''}" data-nsub="${s.id}" title="${tr('sub.noteT')}">≡</button>
    <button class="del" data-dsub="${s.id}">✕</button></div>
    <textarea class="subnote" data-subn="${s.id}" placeholder="${tr('sub.notePh')}"${s.n?'':' hidden'}>${esc(s.n||'')}</textarea></div>`).join('');
}
// gắn sự kiện gõ chữ; onText chạy sau mỗi lần sửa tên/mô tả
function bindSubs(root, subs, onText){
  const find = id => subs.find(s => s.id === id);
  root.querySelectorAll('[data-sub]').forEach(inp => inp.oninput = () => { find(inp.dataset.sub).t = inp.value; onText(); });
  root.querySelectorAll('[data-subn]').forEach(ta => ta.oninput = () => {
    find(ta.dataset.subn).n = ta.value; onText();
    root.querySelector(`[data-nsub="${ta.dataset.subn}"]`).classList.toggle('has', !!ta.value);
  });
  root.querySelectorAll('[data-nsub]').forEach(b => b.onclick = () => {
    const ta = root.querySelector(`[data-subn="${b.dataset.nsub}"]`);
    ta.hidden = !ta.hidden && !ta.value;   // mô tả trống thì bấm lại để ẩn
    if(!ta.hidden) ta.focus();
  });
}
function drawTask(){
  closeEd('dN');
  const t = S.tasks.find(x => x.id === ui.open);
  if(!t) return closeDrawer();
  const segs = (obj, cur, act) => Object.entries(obj).map(([k,v]) =>
    `<button class="${cur===k?'on':''}" style="${cur===k?`background:${v.c};border-color:${v.c}`:''}" data-${act}="${k}">${v.n}</button>`).join('');

  $('#drawer').innerHTML = `
    <div class="dhd">
      <span class="pill" style="background:${AREAS[t.area].c}22;color:${AREAS[t.area].c}">${AREAS[t.area].n}</span>
      <span class="meta">${STATUSES[t.status].n}</span>
      <button class="x" id="dX">✕</button>
    </div>
    <div class="dbody">
      <input class="tt" id="dT" value="${esc(t.title)}" placeholder="${tr('td.titlePh')}">

      <div class="fld"><label>${tr('td.area')}</label><div class="seg">${segs(AREAS, t.area, 'area')}</div></div>
      <div class="fld"><label>${tr('td.prio')}</label><div class="seg">${segs(PRIOS, t.prio, 'prio')}</div></div>
      <div class="fld"><label>${tr('td.status')}</label><div class="seg">${segs(STATUSES, t.status, 'st')}</div></div>

      <div class="fld"><label>${tr('td.progress', {n: t.pg})}</label>
        <div class="seg">${[0,25,50,75,100].map(p =>
          `<button class="${t.pg===p?'on':''}" style="${t.pg===p?'background:#6366f1;border-color:#6366f1':''}" data-pg="${p}">${p}%</button>`).join('')}</div>
        <div class="pg" style="margin:2px 0 0"><i style="width:${t.pg}%"></i></div>
      </div>

      <div class="fld"><label>${tr('td.due')}</label>
        ${dateBtn('dD', t.due, tr('td.duePh'))}</div>

      ${t.status === 'done' ? `<div class="fld"><label>${tr('td.doneDate')}</label>
        ${dateBtn('dDone', t.done, tr('td.donePh'))}</div>` : ''}

      <div class="fld"><label>${tr('td.slot')}</label>
        ${slotFieldHTML('d', t)}</div>

      <div class="fld"><label>${tr('td.tag')}</label>
        ${tagFieldHTML('tagIn', t.tags||[], tr('td.tagHint'))}</div>

      <div class="fld"><label>${tr('td.subs')} ${(t.subs||[]).length ? `— ${t.subs.filter(s=>s.d).length}/${t.subs.length}` : ''}</label>
        <div id="subs">${subsHTML(t.subs||[], true)}</div>
        <button class="addsub" id="addSub">${tr('sub.add')}</button></div>

      <div class="fld"><label>${tr('td.note')}</label><div id="dN"></div></div>
    </div>
    <div class="dfoot">
      <span class="meta">${tr('td.created', {d: fmtVN(t.cr) || '—'})}</span>
      <button class="danger" id="dDel" style="margin-left:auto">${tr('note.toTrash')}</button>
    </div>`;

  const D = $('#drawer');
  const patch = (fn) => { fn(S.tasks.find(x => x.id === ui.open)); save(); drawTask(); };

  $('#dX').onclick = closeDrawer;
  $('#dT').oninput = e => { t.title = e.target.value; save(); };
  $('#dD').onclick = e => openDP(e.currentTarget, t.due, v => patch(x => { x.due = v; if(!v) x.time = ''; }), true);
  if($('#dDone')) $('#dDone').onclick = e => openDP(e.currentTarget, t.done, v => patch(x => x.done = v));
  // đặt giờ khi chưa có hạn thì lấy hôm nay làm ngày
  bindSlotField(D, 'd', (k, v) => patch(x => {
    x[k] = v;
    if(k === 'time' && v){ if(!x.due) x.due = today(); x.dur = x.dur || 60; x.remind = x.remind ?? 30; }
  }));
  mountEd('dN', t.note, tr('td.notePh'), v => { t.note = v; save(); });

  D.querySelectorAll('[data-area]').forEach(b => b.onclick = () => patch(x => x.area = b.dataset.area));
  D.querySelectorAll('[data-prio]').forEach(b => b.onclick = () => patch(x => x.prio = b.dataset.prio));
  D.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => patch(x => {
    x.pg = +b.dataset.pg;
    if(x.pg === 100){ x.status = 'done'; x.done = today(); }
    else if(x.status === 'done'){ x.status = 'doing'; x.done = null; }
  }));
  D.querySelectorAll('[data-st]').forEach(b => b.onclick = () => patch(x => {
    x.status = b.dataset.st;
    if(x.status === 'done'){ x.pg = 100; x.done = today(); }
    else { x.done = null; if(x.pg === 100) x.pg = 75; }
  }));
  bindTagField(D, 'tagIn', t.tags||[],
    n => { patch(x => { x.tags = x.tags || []; if(!x.tags.includes(n)) x.tags.push(n); }); setTimeout(() => $('#tagIn')?.focus(), 0); },
    n => patch(x => x.tags = x.tags.filter(v => v !== n)));
  D.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => patch(x => {
    const s = x.subs.find(s => s.id === b.dataset.tog); s.d = !s.d;
  }));
  D.querySelectorAll('[data-dsub]').forEach(b => b.onclick = () => patch(x => x.subs = x.subs.filter(s => s.id !== b.dataset.dsub)));
  bindSubs(D, t.subs||[], save);

  $('#addSub').onclick = () => {
    patch(x => { x.subs = x.subs || []; x.subs.push({id:uid(), t:'', d:false}); });
    const rows = $('#subs').querySelectorAll('input'); rows[rows.length-1]?.focus();
  };
  $('#dDel').onclick = () => {
    trashTask(t.id); closeDrawer();
  };
}

/* ============ tạo task / xuất nhập ============ */
function blankForm(status = 'todo'){
  return {title:'', area: ui.view === 'life' ? 'life' : (ui.bf.area || 'work'), prio:'med', status,
          pg: status === 'done' ? 100 : 0, due:'', time:'', dur:60, remind:30,
          tags: ui.tag ? [ui.tag] : [], note:'', subs:[]};
}
function openForm(status = 'todo'){
  nf = blankForm(status); goView('new', () => $('#nTitle')?.focus());
}
function grabForm(){
  if(!$('#nTitle')) return;
  nf.title = $('#nTitle').value;   // nf.due do bộ chọn ngày ghi thẳng, nf.note do trình soạn thảo ghi thẳng
}
function renderForm(){
  if(!nf) nf = blankForm();
  $('#vSub').textContent = tr('nf.sub');
  const segs = (obj, cur, act) => Object.entries(obj).map(([k,v]) =>
    `<button class="${cur===k?'on':''}" style="${cur===k?`background:${v.c};border-color:${v.c}`:''}" data-${act}="${k}">${v.n}</button>`).join('');

  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <input class="fttl" id="nTitle" value="${esc(nf.title)}" placeholder="${tr('nf.titlePh')}" autocomplete="off">
    <div class="frow">
      <div class="fld"><label>${tr('td.area')}</label><div class="seg">${segs(AREAS, nf.area, 'nfarea')}</div></div>
      <div class="fld"><label>${tr('td.prio')}</label><div class="seg">${segs(PRIOS, nf.prio, 'nfprio')}</div></div>
    </div>
    <div class="frow">
      <div class="fld"><label>${tr('nf.startCol')}</label><div class="seg">${segs(STATUSES, nf.status, 'nfst')}</div></div>
      <div class="fld"><label>${tr('td.due')}</label>
        ${dateBtn('nDue', nf.due, tr('td.duePh'))}
        <div class="hint" style="margin:0">${tr('nf.dueHint')}</div></div>
    </div>
    <div class="fld"><label>${tr('td.slot')}</label>
      ${slotFieldHTML('n', nf)}
      <div class="hint" style="margin:0">${tr('nf.slotHint')}</div></div>
    <div class="fld"><label>${tr('td.tag')}</label>
      ${tagFieldHTML('nTagIn', nf.tags, tr('td.tagHint'))}</div>
    <div class="fld"><label>${tr('td.subs')}</label>
      <div id="nSubs">${subsHTML(nf.subs, false)}</div>
      <button class="addsub" id="nAddSub">${tr('sub.add')}</button></div>
    <div class="fld"><label>${tr('td.note')}</label>
      <div class="inp fed" id="nNote"></div></div>
    <div class="fbtns">
      <button class="btn" id="nGo">${tr('nf.create')}</button>
      <button class="btn ghost" id="nClr">${tr('nf.clear')}</button>
      <span class="hint" id="nErr"></span>
      <span class="meta" style="margin-left:auto">${tr('nf.createdOn', {d: fmtVN(today())})}</span>
    </div>
  </div></div>`;

  const V = $('#view');
  V.querySelectorAll('[data-nfarea]').forEach(b => b.onclick = () => { grabForm(); nf.area = b.dataset.nfarea; renderForm(); });
  V.querySelectorAll('[data-nfprio]').forEach(b => b.onclick = () => { grabForm(); nf.prio = b.dataset.nfprio; renderForm(); });
  V.querySelectorAll('[data-nfst]').forEach(b => b.onclick = () => { grabForm(); nf.status = b.dataset.nfst; renderForm(); });
  bindTagField(V, 'nTagIn', nf.tags,
    n => { grabForm(); if(!nf.tags.includes(n)) nf.tags.push(n); renderForm(); setTimeout(() => $('#nTagIn')?.focus(), 0); },
    n => { grabForm(); nf.tags = nf.tags.filter(x => x !== n); renderForm(); });
  bindSubs(V, nf.subs, () => {});
  V.querySelectorAll('[data-dsub]').forEach(b => b.onclick = () => { grabForm(); nf.subs = nf.subs.filter(s => s.id !== b.dataset.dsub); renderForm(); });
  $('#nAddSub').onclick = () => {
    grabForm(); nf.subs.push({id:uid(), t:'', d:false, n:''}); renderForm();
    const rows = $('#nSubs').querySelectorAll('input'); rows[rows.length-1]?.focus();
  };
  $('#nDue').onclick = e => openDP(e.currentTarget, nf.due,
    v => { grabForm(); nf.due = v; if(!v) nf.time = ''; renderForm(); }, true);
  bindSlotField(V, 'n', (k, v) => {
    grabForm(); nf[k] = v;
    if(k === 'time' && v && !nf.due) nf.due = today();   // đặt giờ khi chưa có hạn thì lấy hôm nay
    renderForm();
  });
  mountEd('nNote', nf.note, tr('nf.notePh'), v => { nf.note = v; });
  $('#nTitle').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); createFromForm(); } };
  $('#nGo').onclick = createFromForm;
  $('#nClr').onclick = () => { nf = blankForm(nf.status); renderForm(); };
}
function createFromForm(){
  grabForm();
  if(!nf.title.trim()){
    $('#nErr').innerHTML = `<span class="err">${tr('nf.noTitle')}</span>`;
    $('#nTitle').focus(); return;
  }
  const t = {id:uid(), title:nf.title.trim(), area:nf.area, prio:nf.prio, status:nf.status,
    pg: nf.status === 'done' ? 100 : (nf.status === 'doing' ? 25 : 0), tags:[...nf.tags],
    due:nf.due, time: nf.due ? nf.time : '', dur:nf.dur, remind:nf.remind, note:nf.note, cr:today(),
    subs: nf.subs.filter(s => s.t.trim()).map(s => ({...s, t:s.t.trim()})), done: nf.status === 'done' ? today() : null};
  S.tasks.unshift(t); save();
  // xoá các bộ lọc có thể che mất task vừa tạo
  ui.q = ''; $('#q').value = '';
  if(ui.tag && !t.tags.includes(ui.tag)) ui.tag = null;
  if(!boardMatch(t, t.area === 'life')) ui.bf = {prio:[], due:null, area:null};
  saveFil();
  nf = blankForm(nf.status); goView(t.status === 'backlog' ? 'backlog' : (t.area === 'life' ? 'life' : 'board'));
  toast(tr('nf.done', {n: t.title}));
}
