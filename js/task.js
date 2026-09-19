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
    <input value="${esc(s.t)}" data-sub="${s.id}" placeholder="Tên việc con">
    <button class="nt${s.n?' has':''}" data-nsub="${s.id}" title="Mô tả">≡</button>
    <button class="del" data-dsub="${s.id}">✕</button></div>
    <textarea class="subnote" data-subn="${s.id}" placeholder="Mô tả, ghi chú cho việc con…"${s.n?'':' hidden'}>${esc(s.n||'')}</textarea></div>`).join('');
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
      <input class="tt" id="dT" value="${esc(t.title)}" placeholder="Tên task">

      <div class="fld"><label>Mảng</label><div class="seg">${segs(AREAS, t.area, 'area')}</div></div>
      <div class="fld"><label>Ưu tiên</label><div class="seg">${segs(PRIOS, t.prio, 'prio')}</div></div>
      <div class="fld"><label>Trạng thái</label><div class="seg">${segs(STATUSES, t.status, 'st')}</div></div>

      <div class="fld"><label>Tiến độ — ${t.pg}%</label>
        <div class="seg">${[0,25,50,75,100].map(p =>
          `<button class="${t.pg===p?'on':''}" style="${t.pg===p?'background:#6366f1;border-color:#6366f1':''}" data-pg="${p}">${p}%</button>`).join('')}</div>
        <div class="pg" style="margin:2px 0 0"><i style="width:${t.pg}%"></i></div>
      </div>

      <div class="fld"><label>Hạn chót</label>
        ${dateBtn('dD', t.due, 'Chưa đặt hạn')}</div>

      ${t.status === 'done' ? `<div class="fld"><label>Ngày xong</label>
        ${dateBtn('dDone', t.done, 'Chưa ghi ngày xong')}</div>` : ''}

      <div class="fld"><label>Giờ · thời lượng · nhắc trước</label>
        ${slotFieldHTML('d', t)}</div>

      <div class="fld"><label>Tag</label>
        ${tagFieldHTML('tagIn', t.tags||[], 'Chọn tag bên dưới hoặc gõ tag mới rồi Enter')}</div>

      <div class="fld"><label>Việc con ${(t.subs||[]).length ? `— ${t.subs.filter(s=>s.d).length}/${t.subs.length}` : ''}</label>
        <div id="subs">${subsHTML(t.subs||[], true)}</div>
        <button class="addsub" id="addSub">+ Thêm việc con</button></div>

      <div class="fld"><label>Ghi chú</label><div id="dN"></div></div>
    </div>
    <div class="dfoot">
      <span class="meta">Tạo ${fmtVN(t.cr) || '—'}</span>
      <button class="danger" id="dDel" style="margin-left:auto">Chuyển vào thùng rác</button>
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
  mountEd('dN', t.note, 'Suy nghĩ vụn vặt, link, ý tưởng… Gõ / để chèn khối', v => { t.note = v; save(); });

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
  nf = blankForm(status); ui.view = 'new'; render();
  setTimeout(() => $('#nTitle')?.focus(), 60);
}
function grabForm(){
  if(!$('#nTitle')) return;
  nf.title = $('#nTitle').value;   // nf.due do bộ chọn ngày ghi thẳng, nf.note do trình soạn thảo ghi thẳng
}
function renderForm(){
  if(!nf) nf = blankForm();
  $('#vSub').textContent = 'Điền vài thông tin rồi bấm Tạo task';
  const segs = (obj, cur, act) => Object.entries(obj).map(([k,v]) =>
    `<button class="${cur===k?'on':''}" style="${cur===k?`background:${v.c};border-color:${v.c}`:''}" data-${act}="${k}">${v.n}</button>`).join('');

  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <input class="fttl" id="nTitle" value="${esc(nf.title)}" placeholder="Mình cần làm gì?" autocomplete="off">
    <div class="frow">
      <div class="fld"><label>Mảng</label><div class="seg">${segs(AREAS, nf.area, 'nfarea')}</div></div>
      <div class="fld"><label>Ưu tiên</label><div class="seg">${segs(PRIOS, nf.prio, 'nfprio')}</div></div>
    </div>
    <div class="frow">
      <div class="fld"><label>Bắt đầu ở cột</label><div class="seg">${segs(STATUSES, nf.status, 'nfst')}</div></div>
      <div class="fld"><label>Hạn chót</label>
        ${dateBtn('nDue', nf.due, 'Chưa đặt hạn')}
        <div class="hint" style="margin:0">Bấm để mở lịch chọn ngày</div></div>
    </div>
    <div class="fld"><label>Giờ · thời lượng · nhắc trước</label>
      ${slotFieldHTML('n', nf)}
      <div class="hint" style="margin:0">Đặt giờ để task hiện ở lịch trong ngày (sidebar) và được nhắc trước khi bắt đầu</div></div>
    <div class="fld"><label>Tag</label>
      ${tagFieldHTML('nTagIn', nf.tags, 'Chọn tag bên dưới hoặc gõ tag mới rồi Enter')}</div>
    <div class="fld"><label>Việc con</label>
      <div id="nSubs">${subsHTML(nf.subs, false)}</div>
      <button class="addsub" id="nAddSub">+ Thêm việc con</button></div>
    <div class="fld"><label>Ghi chú</label>
      <div class="inp fed" id="nNote"></div></div>
    <div class="fbtns">
      <button class="btn" id="nGo">Tạo task</button>
      <button class="btn ghost" id="nClr">Xoá form</button>
      <span class="hint" id="nErr"></span>
      <span class="meta" style="margin-left:auto">Ngày tạo ${fmtVN(today())}</span>
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
  mountEd('nNote', nf.note, 'Suy nghĩ, link, bối cảnh… Gõ / để chèn khối', v => { nf.note = v; });
  $('#nTitle').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); createFromForm(); } };
  $('#nGo').onclick = createFromForm;
  $('#nClr').onclick = () => { nf = blankForm(nf.status); renderForm(); };
}
function createFromForm(){
  grabForm();
  if(!nf.title.trim()){
    $('#nErr').innerHTML = '<span class="err">Task này chưa có tên.</span>';
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
  nf = blankForm(nf.status); ui.view = t.status === 'backlog' ? 'backlog' : (t.area === 'life' ? 'life' : 'board'); render();
  toast(`Đã tạo: ${t.title}`);
}
