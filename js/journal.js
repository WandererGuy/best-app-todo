/* ============ nhật ký: mỗi ngày nhiều trang ============ */
function jPages(date){
  let v = S.journal[date];
  if(typeof v === 'string') v = [{id:uid(), name:tr('journal.firstPage'), html:v}];
  if(!Array.isArray(v) || !v.length) v = [{id:uid(), name:tr('journal.firstPage'), html:''}];
  S.journal[date] = v;
  return v;
}
const dayHas = k => {
  const v = S.journal[k];
  if(!v) return false;
  return typeof v === 'string' ? hasText(v) : v.some(t => hasText(t.html));
};
// chữ của cả ngày, để ô tìm kiếm lọc theo nội dung
function jText(k){
  const v = S.journal[k];
  if(typeof v === 'string') return plain(v);
  return (Array.isArray(v) ? v : []).map(p => `${p.name} ${plain(p.html)}`).join(' ').trim();
}
// dòng phụ ở cột trái: chỉ số trang, ngày mở ra mà chưa viết gì thì nói vậy
function jSub(k){
  const pgs = Array.isArray(S.journal[k]) ? S.journal[k] : [];
  return dayHas(k) ? tr('journal.pageCount', {n: pgs.length}) : tr('journal.blank');
}

/* ============ nhật ký ============ */
function renderJournal(){
  if(!ui.jDate) ui.jDate = today();
  const d = new Date(ui.jDate + 'T00:00:00');
  const pages = jPages(ui.jDate);
  if(ui.jTab >= pages.length) ui.jTab = 0;
  const page = pages[ui.jTab];
  const days = Object.keys(S.journal).filter(dayHas).length;
  $('#vSub').textContent = tr('journal.sub', {n: days});

  const due = S.tasks.filter(t => t.due === ui.jDate && t.status !== 'backlog');
  $('#view').innerHTML = `<div class="jwrap">
    <div class="jside">
      <button class="btn" id="jTd">${tr('common.today')}</button>
      <div id="jList"></div>
    </div>
    <div class="jpage">
      <div class="jbar">
        <button class="nvb" id="pd">‹</button><button class="nvb" id="nd">›</button>
        <div><h2>${DOW[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</h2>
        <div class="sub">${due.length ? tr('journal.dueN', {n: due.length}) : tr('journal.dueNone')}</div></div>
        ${dateBtn('jDp', ui.jDate, tr('common.pickDate'), 'width:auto')}
        <span class="hint">${tr('journal.slashHint')}</span>
      </div>
      <div class="jtabs">
        ${pages.map((t, i) => `<button class="jtab${i === ui.jTab ? ' on' : ''}" data-jt="${i}">${esc(t.name)}</button>`).join('')}
        <button class="jtab ico" id="jAdd" title="${tr('journal.addPage')}">+</button>
        <button class="jtab ico" id="jRen" title="${tr('journal.renPage')}">✎</button>
        ${pages.length > 1 ? `<button class="jtab ico" id="jDel" title="${tr('journal.delPage')}">✕</button>` : ''}
      </div>
      <div class="jed" id="jHost"></div>
    </div></div>`;

  drawJournalList();
  const shift = n => { const x = new Date(ui.jDate + 'T00:00:00'); x.setDate(x.getDate() + n); ui.jDate = iso(x); ui.jTab = 0; renderJournal(); };
  $('#pd').onclick = () => shift(-1);
  $('#nd').onclick = () => shift(1);
  $('#jTd').onclick = () => { ui.jDate = today(); ui.jTab = 0; renderJournal(); };
  $('#jDp').onclick = e => openDP(e.currentTarget, ui.jDate,
    v => { if(v){ ui.jDate = v; ui.jTab = 0; renderJournal(); } }, false);
  $('#jList').onclick = e => {
    const b = e.target.closest('[data-jd]');
    if(b && b.dataset.jd !== ui.jDate){ ui.jDate = b.dataset.jd; ui.jTab = 0; renderJournal(); }
  };
  mountEd('jHost', page.html, tr('journal.ph'), v => {
    page.html = v; save();
    const sub = $(`#jList [data-jd="${ui.jDate}"] .nsub`);   // ngày trống vừa được viết thì đổi nhãn ở cột trái luôn
    if(sub) sub.textContent = jSub(ui.jDate);
  });

  $$('[data-jt]').forEach(b => b.onclick = () => { ui.jTab = +b.dataset.jt; renderJournal(); });
  $('#jAdd').onclick = () => {
    pages.push({id:uid(), name:tr('journal.newPage', {n: pages.length + 1}), html:''});
    ui.jTab = pages.length - 1; save(); renderJournal();
  };
  $('#jRen').onclick = () => {
    const n = prompt(tr('journal.askName'), page.name);
    if(n && n.trim()){ page.name = n.trim(); save(); renderJournal(); }
  };
  if($('#jDel')) $('#jDel').onclick = () => {
    if(!confirm(tr('journal.askDel', {n: page.name}))) return;
    pages.splice(ui.jTab, 1); ui.jTab = 0; save(); renderJournal();
  };
}
// cột trái: các ngày đã viết, mới nhất lên đầu, gom theo tháng; đang tìm thì lọc theo nội dung cả ngày
function drawJournalList(){
  const box = $('#jList'); if(!box) return;
  const q = ui.q.trim().toLowerCase();
  const days = Object.keys(S.journal).filter(dayHas)
    .filter(k => !q || jText(k).toLowerCase().includes(q))
    .sort((a, b) => b.localeCompare(a));
  if(!q && !days.includes(ui.jDate)) days.push(ui.jDate);   // ngày đang mở luôn có mặt, dù chưa viết gì
  days.sort((a, b) => b.localeCompare(a));

  let month = '';
  const rows = days.map(k => {
    const dd = new Date(k + 'T00:00:00');
    const m = tr('journal.monthLbl', {m: dd.getMonth() + 1, M: tr(`mon.${dd.getMonth() + 1}`), y: dd.getFullYear()});
    const lbl = m === month ? '' : `<div class="nlbl">${m}</div>`;
    month = m;
    return `${lbl}<button class="nhit${k === ui.jDate ? ' on' : ''}" data-jd="${k}">
        <span class="nname">${DOW[dd.getDay()]}, ${dd.getDate()}/${dd.getMonth() + 1}${k === today() ? tr('journal.todaySfx') : ''}</span>
        <span class="nsub">${esc(jSub(k))}</span></button>`;
  }).join('');

  box.innerHTML = (q ? `<div class="nlbl">${tr('journal.matchN', {n: days.length})}</div>` : '')
    + (rows || `<div class="nofil" style="padding:4px 8px">${tr('journal.noMatch')}</div>`);
}
