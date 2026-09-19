/* ============ lọc ============ */
// backlog = true: chỉ lấy task "Để sau"; mặc định bỏ chúng ra
function visible(backlog = false){
  const q = ui.q.trim().toLowerCase();
  return S.tasks.filter(t => {
    if((t.status === 'backlog') !== backlog) return false;
    if(ui.tag && !(t.tags||[]).includes(ui.tag)) return false;
    if(q){
      const hay = [t.title, plain(t.note), (t.tags||[]).join(' '), (t.subs||[]).map(s=>s.t+' '+(s.n||'')).join(' ')].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
// bộ lọc trên thanh của bảng; life = đang ở bảng cuộc sống (bảng này không lọc mảng)
function boardMatch(t, life){
  const f = ui.bf;
  if(f.prio.length && !f.prio.includes(t.prio)) return false;
  if(f.area && !life && t.area !== f.area) return false;
  if(f.due === 'over'  && dueClass(t) !== 'over') return false;
  if(f.due === 'today' && t.due !== today()) return false;
  if(f.due === 'none'  && t.due) return false;
  return true;
}
/* Khoảng thời gian của bảng. Quy tắc:
   - việc CHƯA xong: hiện nếu không có hạn, hoặc hạn nằm trong khoảng (gồm cả việc trễ hạn)
   - việc ĐÃ xong : chỉ hiện nếu hoàn thành trong khoảng
   Nhờ vậy chuyển sang "Hôm nay" không bao giờ làm mất việc còn tồn. */
function scopeWin(){
  const n = new Date();
  const plus = k => { const d = new Date(n); d.setDate(n.getDate() + k); return iso(d); };
  if(ui.scope === 'today') return {a: today(), b: today()};
  if(ui.scope === 'week')  return {a: plus(-6), b: plus(6)};
  if(ui.scope === 'month') return {a: iso(new Date(n.getFullYear(), n.getMonth(), 1)),
                                   b: iso(new Date(n.getFullYear(), n.getMonth()+1, 0))};
  return null;
}
function inScope(t){
  const w = scopeWin(); if(!w) return true;
  if(t.status === 'done')  return !!t.done && t.done >= w.a && t.done <= w.b;
  if(t.status === 'doing') return true;              // việc đang làm dở luôn hiện
  return !t.due || t.due <= w.b;
}
const dueClass = t => !t.due || t.status === 'done' ? '' : (t.due < today() ? 'over' : (t.due === today() ? 'due' : ''));
function dueLabel(t){
  if(!t.due) return '';
  const diff = Math.round((new Date(t.due) - new Date(today())) / 864e5);
  if(diff === 0) return tr('common.today');
  if(diff === 1) return tr('due.tomorrow');
  if(diff === -1) return tr('due.late1');
  if(diff < 0) return tr('due.lateN', {n: -diff});
  const d = new Date(t.due);
  return `${d.getDate()}/${d.getMonth()+1}`;
}

/* ============ bảng kanban ============ */
function renderBoard(){
  // hai bảng dùng chung khung: bảng cuộc sống chỉ lấy mảng cuộc sống, bảng việc lấy phần còn lại
  const life = ui.view === 'life';
  const all = visible().filter(t => (t.area === 'life') === life && boardMatch(t, life));
  const list = all.filter(inScope);
  const f = ui.bf, nFil = f.prio.length + !!f.due + !!(f.area && !life);   // số bộ lọc đang bật, hiện trên nút Lọc
  const chip = (key, val, on, label, c) =>
    `<button class="${on ? 'on' : ''}" data-bf="${key}|${val}">${c ? `<span class="sw" style="background:${c}"></span>` : ''}${label}</button>`;
  const open = list.filter(t => t.status !== 'done').length;
  const late = list.filter(t => dueClass(t) === 'over').length;
  const hidden = all.length - list.length;
  $('#vSub').textContent = tr('board.sub', {s: SCOPES[ui.scope], n: open})
    + (late ? tr('board.subLate', {n: late}) : '');
  const sort = S.settings.sort || 'manual';
  // sort ổn định: cùng mức ưu tiên thì giữ thứ tự kéo thả
  const byPrio = arr => sort === 'manual' ? arr
    : [...arr].sort((a, b) => PRIO_ORDER.indexOf(a.prio) - PRIO_ORDER.indexOf(b.prio));
  const box = (items, status, prio, emptyTxt) => `<div class="cards" data-cards="${status}"${prio ? ` data-prio="${prio}"` : ''}>
        ${items.length ? items.map(card).join('') : `<div class="empty">${emptyTxt}</div>`}</div>`;

  $('#view').innerHTML = habitStrip() + `<div class="tb">
      <span class="hint">${hidden ? tr('board.hiding', {n: hidden}) : tr('board.showAll')}</span>
      <div class="bfw">
        <div class="scope"><button class="${nFil ? 'on' : ''}" data-bfbtn>${tr('board.filter')}${nFil ? ` · ${nFil}` : ''}</button></div>
        <div class="bfp"${ui.bfOpen ? '' : ' hidden'}>
          <div class="flbl">${tr('board.fScope')}</div>
          <div class="chips">${Object.entries(SCOPES).map(([k,n]) =>
            `<button class="${ui.scope===k?'on':''}" data-scope="${k}">${n}</button>`).join('')}</div>
          <div class="flbl">${tr('board.fPrio')}</div>
          <div class="chips">${PRIO_ORDER.map(p => chip('prio', p, f.prio.includes(p), PRIOS[p].n, PRIOS[p].c)).join('')}</div>
          <div class="flbl">${tr('board.fDue')}</div>
          <div class="chips">${Object.entries(DUES).map(([k,n]) => chip('due', k, f.due === k, n)).join('')}</div>
          ${life ? '' : `<div class="flbl">${tr('board.fArea')}</div>
          <div class="chips">${['work','other'].map(k => chip('area', k, f.area === k, AREAS[k].n, AREAS[k].c)).join('')}</div>`}
          <div class="flbl">${tr('board.fSort')}</div>
          <div class="chips">${Object.entries(SORTS).map(([k,n]) =>
            `<button class="${sort===k?'on':''}" data-sort="${k}">${n}</button>`).join('')}</div>
          ${nFil ? `<button class="bfclr" data-bfclr>${tr('board.fClear')}</button>` : ''}
        </div>
      </div>
      <div class="scope"><button class="${S.settings.zen?'on':''}" data-zen title="${tr('board.zenT')}">Zen</button></div>
    </div>`
    + '<div id="board">' + Object.entries(COLS).map(([k,c]) => {
    let items = byPrio(list.filter(t => t.status === k));
    // cột Xong: mới xong lên đầu, mặc định chỉ hiện DONE_MAX task gần nhất; bật "Hôm nay" thì chỉ giữ task xong hôm nay
    let more = 0;
    if(k === 'done'){
      if(S.settings.doneToday) items = items.filter(t => t.done === today());
      items = [...items].sort((a, b) => (b.done || '').localeCompare(a.done || ''));
      more = items.length - DONE_MAX;
    }
    const shown = more > 0 && !ui.doneAll ? items.slice(0, DONE_MAX) : items;
    const body = sort === 'group'
      ? `<div class="pgrps">${PRIO_ORDER.map(p => {
          const g = shown.filter(t => t.prio === p);
          return `<div class="pgrp"><div class="pgrphd"><span class="sw" style="background:${PRIOS[p].c}"></span>${PRIOS[p].n}<span class="n">${g.length}</span></div>
            ${box(g, k, p, tr('board.dropPrio'))}</div>`;
        }).join('')}</div>`
      : box(shown, k, null, tr('board.dropCol'));
    return `<section class="col" data-col="${k}">
      <div class="colhd"><span class="sw" style="background:${c.c}"></span>${c.n}
        <span class="n">${items.length}</span>
        ${k === 'done' ? `<button class="dtoday${S.settings.doneToday ? ' on' : ''}" data-dtoday title="${tr('board.doneToday')}">${tr('common.today')}</button>` : ''}
        <button class="add" data-add="${k}" title="${tr('board.addToCol')}">+</button></div>
      ${body}
      ${more > 0 ? `<button class="donemore" data-more>${ui.doneAll ? tr('board.collapse') : tr('board.showMore', {n: more})}</button>` : ''}</section>`;
  }).join('') + '</div>';

  $$('[data-sort]').forEach(b => b.onclick = () => { S.settings.sort = b.dataset.sort; save(); renderBoard(); });
  $$('[data-dtoday]').forEach(b => b.onclick = () => { S.settings.doneToday = !S.settings.doneToday; save(); renderBoard(); });
  $$('[data-more]').forEach(b => b.onclick = () => { ui.doneAll = !ui.doneAll; renderBoard(); });
  $$('[data-zen]').forEach(b => b.onclick = () => { S.settings.zen = !S.settings.zen; save(); renderBoard(); });
  $$('[data-bfbtn]').forEach(b => b.onclick = () => { ui.bfOpen = !ui.bfOpen; renderBoard(); });
  // ưu tiên chọn được nhiều mức; hạn và mảng chỉ một, bấm lại để bỏ
  $$('[data-bf]').forEach(b => b.onclick = () => {
    const [k, v] = b.dataset.bf.split('|');
    if(k === 'prio') f.prio = f.prio.includes(v) ? f.prio.filter(x => x !== v) : [...f.prio, v];
    else f[k] = f[k] === v ? null : v;
    saveFil(); renderBoard();
  });
  $$('[data-bfclr]').forEach(b => b.onclick = () => { ui.bf = {prio:[], due:null, area:null}; saveFil(); renderBoard(); });
  wireDnD();
}
function card(t){
  const a = AREAS[t.area], p = PRIOS[t.prio], dc = dueClass(t);
  const nSub = (t.subs||[]).length, dSub = (t.subs||[]).filter(s => s.d).length;
  // zen: chỉ tên task, hạn chỉ hiện khi hôm nay hoặc đã trễ
  if(S.settings.zen) return `<article class="card zen${t.status==='done'?' done':''}" draggable="true" data-id="${t.id}" style="border-left-color:${a.c}">
    <div class="t">${t.title.trim() ? esc(t.title) : `<span class="ph">${tr('task.untitled')}</span>`}</div>
    ${dc ? `<div class="crow"><span class="meta ${dc}">◷ ${dueLabel(t)}${t.time ? ' ' + t.time : ''}</span></div>` : ''}</article>`;
  return `<article class="card${t.status==='done'?' done':''}" draggable="true" data-id="${t.id}" style="border-left-color:${a.c}">
    <div class="t">${t.title.trim() ? esc(t.title) : `<span class="ph">${tr('task.untitled')}</span>`}</div>
    ${t.pg > 0 ? `<div class="pg"><i style="width:${t.pg}%"></i></div>` : ''}
    <div class="crow">
      <span class="pill" style="background:${p.c}22;color:${p.c}">${p.n}</span>
      ${(t.tags||[]).slice(0,2).map(x => `<span class="tg" style="${tagStyle(x)}">#${esc(x)}</span>`).join('')}
      ${nSub ? `<span class="meta">☑ ${dSub}/${nSub}</span>` : ''}
      ${hasText(t.note) ? `<span class="meta" title="${tr('card.hasNote')}">✎</span>` : ''}
      ${t.due ? `<span class="meta ${dc}">◷ ${dueLabel(t)}${t.time ? ' ' + t.time : ''}</span>` : ''}
      ${t.status === 'done' && t.done ? `<span class="meta ok" title="${tr('card.doneOn')}">✓ ${fmtVN(t.done)}</span>` : ''}
      ${t.pg > 0 && t.pg < 100 ? `<span class="meta" style="margin-left:auto">${t.pg}%</span>` : ''}
    </div></article>`;
}

/* ============ kéo thả ============ */
let dragId = null, ph = null;
function wireDnD(){
  $$('.card').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragId = el.dataset.id; el.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
      $('#trashZone').classList.add('on');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('drag'); dragId = null;
      if(ph) ph.remove(); ph = null;
      $$('.col').forEach(c => c.classList.remove('over'));
      $('#trashZone').classList.remove('on', 'over');
    });
  });

  $$('.cards').forEach(box => {
    box.addEventListener('dragover', e => {
      e.preventDefault();
      box.closest('.col').classList.add('over');
      if(!ph){ ph = document.createElement('div'); ph.className = 'drop'; }
      const after = cardAfter(box, e.clientY);
      box.querySelector('.empty')?.remove();
      if(after) box.insertBefore(ph, after); else box.appendChild(ph);
    });
    box.addEventListener('dragleave', e => {
      if(!box.contains(e.relatedTarget)) box.closest('.col').classList.remove('over');
    });
    box.addEventListener('drop', e => {
      e.preventDefault();
      const status = box.dataset.cards;
      const t = S.tasks.find(x => x.id === dragId);
      if(!t) return;
      if(box.dataset.prio) t.prio = box.dataset.prio;   // chế độ chia nhóm: thả vào nhóm nào thì đổi ưu tiên theo nhóm đó
      const beforeEl = ph && ph.nextElementSibling && ph.nextElementSibling.dataset
                       ? ph.nextElementSibling.dataset.id : null;
      S.tasks = S.tasks.filter(x => x.id !== t.id);
      if(t.status !== status){
        t.status = status;
        if(status === 'done'){ t.pg = 100; t.done = today(); }
        else { t.done = null; if(t.pg === 100) t.pg = 75; if(status === 'doing' && t.pg === 0) t.pg = 25; }
      }
      const at = beforeEl ? S.tasks.findIndex(x => x.id === beforeEl) : -1;
      if(at >= 0) S.tasks.splice(at, 0, t);
      else {
        const last = S.tasks.map(x => x.status).lastIndexOf(status);
        if(last >= 0) S.tasks.splice(last + 1, 0, t); else S.tasks.push(t);
      }
      $('#trashZone').classList.remove('on', 'over');   // render() thay card đang kéo nên dragend có thể không chạy
      save(); render();
    });
  });
}
function cardAfter(box, y){
  const els = [...box.querySelectorAll('.card:not(.drag)')];
  return els.find(el => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
}

/* ============ để sau ============ */
// on = true: gác task xuống Để sau; false: đưa lên cuối cột Cần làm
function setBacklog(id, on){
  const t = S.tasks.find(x => x.id === id); if(!t) return;
  S.tasks = S.tasks.filter(x => x !== t);
  t.status = on ? 'backlog' : 'todo'; t.done = null;
  if(t.pg === 100) t.pg = 75;
  S.tasks.splice(S.tasks.map(x => x.status).lastIndexOf(t.status) + 1, 0, t);
  save(); toast(tr(on ? 'bk.parked' : 'bk.unparked', {n: t.title}));
}
function renderBacklog(){
  // mới ghi lên đầu; tuổi tính từ ngày tạo để lúc xem lại dễ mạnh tay xoá bớt
  const list = visible(true).sort((a, b) => (b.cr || '').localeCompare(a.cr || ''));
  const age = t => { if(!t.cr) return ''; const n = Math.round((new Date(today()) - new Date(t.cr)) / 864e5); return n ? tr('bk.ageDays', {n}) : tr('bk.ageToday'); };
  $('#vSub').textContent = tr('bk.sub', {n: list.length});
  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <input class="fttl" id="bkIn" placeholder="${tr('bk.quickPh')}" autocomplete="off">
    ${list.length ? `<div>${list.map(t => `<div class="tgrow bkrow" data-bk="${t.id}">
        <span class="sw" style="width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:${AREAS[t.area].c}"></span>
        <span style="word-break:break-word">${t.title.trim() ? esc(t.title) : `<span class="ph">${tr('task.untitled')}</span>`}</span>
        ${(t.tags||[]).slice(0,2).map(x => `<span class="tg" style="${tagStyle(x)}">#${esc(x)}</span>`).join('')}
        <span class="meta" style="margin-left:auto;white-space:nowrap" title="${tr('bk.createdOn', {d: fmtVN(t.cr)})}">${age(t)}</span>
        <button class="btn ghost" data-todo="${t.id}" style="padding:5px 10px;font-size:12px;font-weight:500;white-space:nowrap">${tr('bk.toTodo')}</button></div>`).join('')}</div>`
      : `<div class="empty">${tr('bk.empty')}</div>`}
  </div></div>`;

  $('#bkIn').onkeydown = e => {
    const title = e.target.value.trim();
    if(e.key !== 'Enter' || !title) return;
    S.tasks.unshift({id:uid(), title, area:'work', prio:'med', status:'backlog', pg:0, tags:[],
      due:'', time:'', dur:60, remind:30, note:'', cr:today(), subs:[], done:null});
    ui.q = ''; $('#q').value = ''; ui.tag = null;   // bỏ bộ lọc có thể che mất việc vừa ghi
    save(); render(); $('#bkIn').focus();
  };
  $$('[data-todo]').forEach(b => b.onclick = e => { e.stopPropagation(); setBacklog(b.dataset.todo, false); render(); });
  $$('[data-bk]').forEach(r => r.onclick = () => openTask(r.dataset.bk));
}
