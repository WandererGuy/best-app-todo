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
  const side = S.settings.jSide;
  $('#view').innerHTML = `<div class="jwrap">
    ${side ? `<div class="jside">
      <div class="nshead">
        <button class="btn" id="jTd">${tr('common.today')}</button>
        <button class="nfold" id="jHide" title="${tr('common.hideSide')}">«</button>
      </div>
      <div class="search nsrch">
        <span style="color:var(--tx3)">⌕</span>
        <input id="jQ" value="${esc(ui.q)}" placeholder="${tr('journal.search')}" autocomplete="off" title="${tr('journal.searchT')}">
      </div>
      <div id="jList"></div>
    </div>`
    : `<button class="nfold nshow" id="jShow" title="${tr('common.showSide')}">»</button>`}
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
  $(side ? '#jHide' : '#jShow').onclick = () => { S.settings.jSide = !side; save(); renderJournal(); };
  if(side){
    $('#jTd').onclick = () => { ui.jDate = today(); ui.jTab = 0; renderJournal(); };
    const qi = $('#jQ');
    // ô này và ô tìm trên thanh trên là cùng một câu tìm (ui.q), gõ ở đâu cũng soi sang ô kia
    qi.oninput = () => { ui.q = qi.value; $('#q').value = ui.q; drawJournalList(); };
    qi.onkeydown = e => {
      if(e.key === 'Escape' && ui.q){
        e.stopPropagation();                      // Esc ở đây là xoá câu tìm, không phải đóng panel
        ui.q = ''; qi.value = ''; $('#q').value = ''; return drawJournalList();
      }
      if(e.key === 'Enter' && jHits.length && jHits[0] !== ui.jDate){
        ui.jDate = jHits[0]; ui.jTab = 0; renderJournal();   // Enter = mở ngày khớp mới nhất
        setTimeout(() => $('#jQ')?.focus(), 0);
      }
    };
  }
  $('#jDp').onclick = e => openDP(e.currentTarget, ui.jDate,
    v => { if(v){ ui.jDate = v; ui.jTab = 0; renderJournal(); } }, false);
  if(side) $('#jList').onclick = e => {
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
/* ============ tìm kiếm ngày ============ */
// Như bên ghi chú: mỗi ngày giữ sẵn một bản đã bỏ dấu, câu tìm tách thành từ và ngày phải khớp
// ĐỦ mọi từ, không cần đúng thứ tự. Khác một chỗ: kết quả vẫn xếp theo ngày và gom theo tháng
// chứ không xếp theo độ khớp — nhật ký đọc theo dòng thời gian, đảo thứ tự là mất ý nghĩa.
const JQ_MAX = 60;
const jIdx = new Map();
let jIdxSrc = null;
// Ngày đang mở thì dựng lại mỗi lần, vì chỉ nó mới sửa được — khỏi phải gắn cờ ở từng chỗ ghi.
// applyData() thay nguyên S mỗi lần nạp / đồng bộ, nên so danh tính S.journal là biết cache hết hạn.
function jEntry(k){
  if(jIdxSrc !== S.journal){ jIdx.clear(); jIdxSrc = S.journal; }
  let e = jIdx.get(k);
  if(!e || k === ui.jDate){
    const v = S.journal[k];
    const pgs = typeof v === 'string' ? [{name:'', html:v}] : (Array.isArray(v) ? v : []);
    const nm  = pgs.map(p => p.name || '').join(' ').normalize('NFC');
    const raw = pgs.map(p => plain(p.html)).join(' · ').replace(/\s+/g, ' ').trim().normalize('NFC');
    e = {raw, nm, b:fold(raw), n:fold(nm)};
    jIdx.set(k, e);
  }
  return e;
}
const jHit = (e, toks) => toks.every(tk => e.b.includes(tk) || e.n.includes(tk));

// cột trái: các ngày đã viết, mới nhất lên đầu, gom theo tháng; đang tìm thì lọc theo nội dung cả ngày
let jHits = [];
function drawJournalList(){
  const box = $('#jList'); if(!box) return;
  const toks = nqToks(ui.q.trim());
  let days = Object.keys(S.journal).filter(dayHas);
  if(toks.length) days = days.filter(k => jHit(jEntry(k), toks));
  else if(!days.includes(ui.jDate)) days.push(ui.jDate);   // ngày đang mở luôn có mặt, dù chưa viết gì
  days.sort((a, b) => b.localeCompare(a));
  jHits = days;
  const show = days.slice(0, JQ_MAX);

  let month = '';
  const rows = show.map(k => {
    const dd = new Date(k + 'T00:00:00');
    const m = tr('journal.monthLbl', {m: dd.getMonth() + 1, M: tr(`mon.${dd.getMonth() + 1}`), y: dd.getFullYear()});
    const lbl = m === month ? '' : `<div class="nlbl">${m}</div>`;
    month = m;
    const sn = toks.length ? nqSnip(jEntry(k), toks) : '';
    return `${lbl}<button class="nhit${k === ui.jDate ? ' on' : ''}" data-jd="${k}">
        <span class="nname">${DOW[dd.getDay()]}, ${dd.getDate()}/${dd.getMonth() + 1}${k === today() ? tr('journal.todaySfx') : ''}</span>
        ${sn ? `<span class="nsnip">${sn}</span>` : ''}
        <span class="nsub">${esc(jSub(k))}</span></button>`;
  }).join('');

  box.innerHTML = (toks.length ? `<div class="nlbl">${tr('journal.matchN', {n: days.length})}</div>` : '')
    + (rows || `<div class="nofil" style="padding:4px 8px">${tr('journal.noMatch')}</div>`)
    + (days.length > JQ_MAX ? `<div class="nofil" style="padding:6px 8px">${tr('journal.matchMore', {n: days.length - JQ_MAX})}</div>` : '');
}
