/* ============ nhật ký: nhiều cuốn (công việc, cuộc sống…), mỗi cuốn mỗi ngày nhiều trang ============ */
// Mọi cuốn chung một chỗ lưu S.journal[ngày] = [trang]; trang có cat = id cuốn trong S.settings.jBooks.
// Trang không có cat (viết trước khi có cuốn) hoặc trỏ tới cuốn đã xoá thì thuộc cuốn '' — "Chưa phân loại".
function jPages(date){
  let v = S.journal[date];
  if(typeof v === 'string') v = [{id:uid(), name:tr('journal.firstPage'), html:v}];
  if(!Array.isArray(v)) v = [];
  S.journal[date] = v;
  return v;
}
const jCat = p => S.settings.jBooks.some(b => b.id === p.cat) ? p.cat : '';
const jBookName = id => S.settings.jBooks.find(b => b.id === id)?.name || tr('book.none');
// b: chỉ xét trang của cuốn đó; bỏ trống thì xét cả ngày, mọi cuốn (lịch, thống kê)
const dayHas = (k, b) => {
  const v = S.journal[k];
  if(!v) return false;
  return typeof v === 'string' ? (b == null || b === '') && hasText(v) : v.some(t => (b == null || jCat(t) === b) && hasText(t.html));
};
// còn trang nào đã viết mà chưa thuộc cuốn nào: còn thì mới hiện nút "Chưa phân loại"
const jLoose = () => Object.keys(S.journal).some(k => dayHas(k, ''));
/* ============ thùng rác nhật ký ============ */
// S.jtrash: mỗi mục là một trang bị bỏ (kind 'page') hoặc một cuốn bị bỏ (kind 'book') kèm mọi trang đã viết của nó.
// Trang mang theo ngày (d) để khôi phục về đúng chỗ. Cuốn bị bỏ mang trang đi cùng, nên trang không lọt vào "Chưa phân loại".
function trashJPage(d, p){
  S.journal[d] = jPages(d).filter(x => x !== p);
  S.jtrash.unshift({id: p.id, kind: 'page', trashed: today(), pages: [{...p, d}]});
}
function trashJBook(b){
  const pages = [];
  Object.keys(S.journal).forEach(d => {
    if(!Array.isArray(S.journal[d])) return;
    S.journal[d].forEach(p => { if(p.cat === b.id && hasText(p.html)) pages.push({...p, d}); });   // trang trống thì bỏ luôn
    S.journal[d] = S.journal[d].filter(p => p.cat !== b.id);
  });
  S.settings.jBooks = S.settings.jBooks.filter(x => x !== b);
  S.jtrash.unshift({id: b.id, kind: 'book', trashed: today(), book: {...b}, pages});
  jIdxSrc = null;                              // trang đổi chỗ ở nhiều ngày, bản tìm kiếm đã dựng không còn đúng
}
function restoreJTrash(e){
  S.jtrash = S.jtrash.filter(x => x !== e);
  if(e.kind === 'book' && !S.settings.jBooks.some(b => b.id === e.book.id)) S.settings.jBooks.push(e.book);
  e.pages.forEach(({d, ...p}) => { const pgs = jPages(d); if(!pgs.some(x => x.id === p.id)) pgs.push(p); });
  jIdxSrc = null;
}
// dòng phụ ở cột trái: chỉ số trang của cuốn đang mở, ngày mở ra mà chưa viết gì thì nói vậy
function jSub(k){
  const pgs = Array.isArray(S.journal[k]) ? S.journal[k].filter(p => jCat(p) === ui.jBook) : [];
  return dayHas(k, ui.jBook) ? tr('journal.pageCount', {n: pgs.length}) : tr('journal.blank');
}

/* ============ nhật ký ============ */
// ngày và trang đang mở, nhớ riêng trong trình duyệt này như VIEW_KEY: bật lại app vẫn ở đúng trang cũ.
// Nhớ theo id trang chứ không theo vị trí, vì các trang kéo đổi chỗ được.
const JPAGE_KEY = 'dieukhien.jpage';
let jKept = (() => { try{ return JSON.parse(localStorage.getItem(JPAGE_KEY)); }catch(e){ return null; } })();
// trang đang đọc của từng ngày trong phiên này: sang ngày khác rồi quay lại thì mở đúng trang đó.
// Chỗ chuyển ngày đặt ui.jTab = null để renderJournal() tự chọn theo đây (chưa đọc ngày đó thì trang đầu).
// Nhớ theo ngày và cuốn, vì mỗi cuốn có dãy trang riêng.
// ui.jTab là vị trí trang trong cả ngày (S.journal[ngày]), không phải trong cuốn — kéo thả và xoá làm trên dãy đó.
const jLast = {};
/* chia màn hình (xem splitLoad ở core.js): mỗi ô giữ {d: ngày, id: mã trang}. Thanh ngày, hàng cuốn và tab ở trên
   chỉ để duyệt: đổi ngày, đổi cuốn không đổi ô nào; bấm một tab (hoặc + trang mới, link tới trang) mới mở trang đó
   vào ô đang chọn — jPut đánh dấu lần vẽ đó. Một trang không mở ở hai ô.
   Mỗi cuốn nhớ cách chia và các ô của riêng nó: sang cuốn khác là thấy lại đúng các ô đã mở ở cuốn đó. */
const JSPLIT_KEY = 'dieukhien.jsplit';
const jSplitKey = b => JSPLIT_KEY + '.' + (b || '_');   // '' = Chưa phân loại
let jSplitBook = null, jSplit = {n:1, ids:[], act:0}, jPut = false;   // jSplit là của cuốn jSplitBook, renderJournal() nạp lại khi đổi cuốn
const jSaveSplit = () => splitSave(jSplitKey(jSplitBook), jSplit);
const jRef = r => r && Array.isArray(S.journal[r.d]) ? S.journal[r.d].find(p => p.id === r.id) : null;
function jSetSplit(k){
  if(k === jSplit.n) return;
  if(k === 1){                                 // về một ô: mở đúng trang của ô đang chọn
    const r = [jSplit.ids[jSplit.act], ...jSplit.ids].find(jRef);
    jSplit = {n:1, ids:[], act:0}; jSaveSplit();
    if(r){ const pgs = jPages(r.d), p = jRef(r); ui.jDate = r.d; ui.jTab = pgs.indexOf(p); ui.jBook = jCat(p); }
    jSplitBook = ui.jBook;                     // ô có thể giữ trang của cuốn khác: cuốn đó cũng về một ô
  }
  else {
    const p = jPages(ui.jDate)[ui.jTab];
    jSplit = splitResize(jSplit, k, p && {d: ui.jDate, id: p.id});
  }
  jSaveSplit(); renderJournal();
}
function renderJournal(){
  if(!ui.jDate) ui.jDate = /^\d{4}-\d\d-\d\d$/.test(jKept?.d) ? jKept.d : today();
  const d = new Date(ui.jDate + 'T00:00:00');
  const pages = jPages(ui.jDate);
  if(jKept){                                   // chỉ dùng ở lần vẽ đầu tiên
    const i = jKept.d === ui.jDate ? pages.findIndex(p => p.id === jKept.id) : -1;
    if(i >= 0){ ui.jTab = i; ui.jBook = jCat(pages[i]); }
    else if(ui.jBook == null) ui.jBook = jKept.b;
    jKept = null;
  }
  const books = S.settings.jBooks;
  if(ui.jBook !== '' && !books.some(b => b.id === ui.jBook)) ui.jBook = books[0]?.id ?? '';
  if(jSplitBook !== ui.jBook){ jSplitBook = ui.jBook; jSplit = splitLoad(jSplitKey(jSplitBook)); }
  const split = jSplit.n > 1;
  const key = ui.jDate + '|' + ui.jBook;
  let mine = pages.filter(p => jCat(p) === ui.jBook);
  if(!mine.length){                            // cuốn này chưa có trang nào ở ngày này: mở sẵn một trang trống
    const p = {id:uid(), name:tr('journal.firstPage'), html:''};
    if(ui.jBook) p.cat = ui.jBook;
    pages.push(p); mine = [p];
  }
  if(ui.jTab != null && !mine.includes(pages[ui.jTab])) ui.jTab = null;
  if(ui.jTab == null) ui.jTab = pages.indexOf(mine.find(p => p.id === jLast[key]) || mine[0]);
  const page = pages[ui.jTab];
  if(split){
    const ids = jSplit.ids;
    if(jPut){
      const j = ids.findIndex(r => r?.id === page.id);
      if(j >= 0) jSplit.act = j; else ids[jSplit.act] = {d: ui.jDate, id: page.id};
    }
    ids.forEach((r, i) => { if(!jRef(r)) ids[i] = null; });   // trang đã bỏ vào thùng rác
    jSaveSplit();
  }
  jPut = false;
  const actId = split ? jSplit.ids[jSplit.act]?.id : page.id;   // tab nào sáng: trang của ô đang chọn
  jLast[key] = page.id;
  try{ localStorage.setItem(JPAGE_KEY, JSON.stringify({d: ui.jDate, id: page.id, b: ui.jBook})); }catch(e){}
  const days = Object.keys(S.journal).filter(k => dayHas(k, ui.jBook)).length;
  $('#vSub').textContent = tr('journal.sub', {n: days});
  // chuyển trang đi được tới mọi cuốn thật trừ cuốn đang mở
  const dest = books.filter(b => b.id !== ui.jBook);

  const due = S.tasks.filter(t => t.due === ui.jDate && t.status !== 'backlog');
  const side = S.settings.jSide;
  const sideAt = $('.jside')?.scrollTop || 0;   // như ở ghi chú: vẽ lại cột trái mà vẫn giữ chỗ đang cuộn
  const pane = (r, i) => {
    const p = jRef(r), dd = r && new Date(r.d + 'T00:00:00');
    return splitPaneHTML(jSplit, i, p && `<span class="jplbl">${DOW[dd.getDay()]}, ${dd.getDate()}/${dd.getMonth()+1} · ${esc(p.name)}</span>`,
      p && `<div class="ned" id="jHost${i}"></div>`);
  };
  [...EDS.keys()].filter(k => k.startsWith('jHost')).forEach(closeEd);   // đổi từ 4 ô về 2 thì ô cũ không còn chỗ gắn
  $('#view').innerHTML = `<div class="jwrap${split ? ' split' : ''}">
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
      <div class="nhead">${bookRowHTML({books, cur: ui.jBook, loose: jLoose()})}${splitCtlHTML(jSplit.n)}</div>
      <div class="jbar">
        <button class="nvb" id="pd">‹</button><button class="nvb" id="nd">›</button>
        <div><h2>${DOW[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</h2>
        ${due.length ? `<div class="sub">${tr('journal.dueN', {n: due.length})}</div>` : ''}</div>
        ${dateBtn('jDp', ui.jDate, tr('common.pickDate'), 'width:auto')}
        <span class="hint">${tr('journal.slashHint')}</span>
      </div>
      <div class="jtabs">
        ${mine.map(t => { const i = pages.indexOf(t);
          return `<button class="jtab${t.id === actId ? ' on' : ''}" data-jt="${i}" draggable="true" title="${tr('journal.dragT')}">${esc(t.name)}</button>`; }).join('')}
        <button class="jtab ico" id="jAdd" title="${tr('journal.addPage')}">+</button>
        ${split ? '' : `<button class="jtab ico" id="jRen" title="${tr('journal.renPage')}">✎</button>
        <button class="jtab ico" id="jLink" title="${tr('plink.copyT')}">🔗</button>
        ${dest.length ? `<button class="jtab ico" id="jMove" title="${tr('book.movePage')}">⇄</button>` : ''}
        <button class="jtab ico" id="jDel" title="${tr('journal.delPage')}">✕</button>`}
      </div>
      ${split ? `<div class="npanes n${jSplit.n}">${jSplit.ids.map(pane).join('')}</div>` : `<div class="jed" id="jHost"></div>`}
    </div></div>`;

  drawJournalList();
  if(side) $('.jside').scrollTop = sideAt;
  const shift = n => { const x = new Date(ui.jDate + 'T00:00:00'); x.setDate(x.getDate() + n); ui.jDate = iso(x); ui.jTab = null; renderJournal(); };
  $('#pd').onclick = () => shift(-1);
  $('#nd').onclick = () => shift(1);
  $(side ? '#jHide' : '#jShow').onclick = () => { S.settings.jSide = !side; save(); renderJournal(); };
  if(side){
    $('#jTd').onclick = () => { ui.jDate = today(); ui.jTab = null; renderJournal(); };
    const qi = $('#jQ');
    // ô này và ô tìm trên thanh trên là cùng một câu tìm (ui.q), gõ ở đâu cũng soi sang ô kia
    qi.oninput = () => { ui.q = qi.value; $('#q').value = ui.q; drawJournalList(); };
    qi.onkeydown = e => {
      if(e.key === 'Escape' && ui.q){
        e.stopPropagation();                      // Esc ở đây là xoá câu tìm, không phải đóng panel
        ui.q = ''; qi.value = ''; $('#q').value = ''; return drawJournalList();
      }
      if(e.key === 'Enter' && jHits.length && jHits[0] !== ui.jDate){
        ui.jDate = jHits[0]; ui.jTab = null; renderJournal();   // Enter = mở ngày khớp mới nhất
        setTimeout(() => $('#jQ')?.focus(), 0);
      }
    };
  }
  $('#jDp').onclick = e => openDP(e.currentTarget, ui.jDate,
    v => { if(v){ ui.jDate = v; ui.jTab = null; renderJournal(); } }, false);
  if(side) $('#jList').onclick = e => {
    const b = e.target.closest('[data-jd]');
    if(b && b.dataset.jd !== ui.jDate){ ui.jDate = b.dataset.jd; ui.jTab = null; renderJournal(); }
  };
  // ngày trống vừa được viết thì đổi nhãn ở cột trái luôn
  const edit = (d, p) => v => { p.html = v; save(); const sub = $(`#jList [data-jd="${d}"] .nsub`); if(sub) sub.textContent = jSub(d); };
  if(split){
    wireSplit(jSplit, {store: jSaveSplit, redraw: renderJournal, add: () => $('#jAdd').click(),
      // tab sáng theo trang của ô vừa chọn; không vẽ lại kẻo mất con trỏ
      pick: i => $$('[data-jt]').forEach(b => b.classList.toggle('on', pages[+b.dataset.jt]?.id === jSplit.ids[i]?.id))});
    $$('.npane').forEach(el => {
      const i = +el.dataset.npane, r = jSplit.ids[i], p = jRef(r);
      if(!p) return;
      mountEd('jHost' + i, p.html, tr('journal.ph'), edit(r.d, p), {kbDay: r.d, caret: p.id});
      keepPageScroll(el, p.id);
    });
  }else{
    mountEd('jHost', page.html, tr('journal.ph'), edit(ui.jDate, page), {kbDay: ui.jDate, caret: page.id});   // bảng việc trong trang ghi rõ thuộc ngày nào
    keepPageScroll($('#jHost'), page.id);
  }

  wireBookRow({books, cur: ui.jBook,
    pick: id => { ui.jBook = id; ui.jTab = null; renderJournal(); },
    redraw: renderJournal,
    // bỏ cuốn = đưa cả cuốn lẫn trang của nó vào thùng rác, khôi phục lại được
    trash: b => { trashJBook(b); ui.jBook = S.settings.jBooks[0].id; ui.jTab = null; save(); renderJournal(); },
    // dồn mọi trang đã viết ở "Chưa phân loại" sang cuốn v; trang trống thì bỏ, khỏi thành tab thừa ở cuốn đích
    moveAll: v => {
      const n = Object.values(S.journal).reduce((s, pgs) => s + (Array.isArray(pgs) ? pgs.filter(p => jCat(p) === '' && hasText(p.html)).length : 0), 0);
      if(!confirm(tr('book.askAll', {n, b: jBookName(v)}))) return;
      Object.keys(S.journal).forEach(x => {
        if(!Array.isArray(S.journal[x])) return;
        S.journal[x] = S.journal[x].filter(p => jCat(p) !== '' || hasText(p.html));
        S.journal[x].forEach(p => { if(jCat(p) === '') p.cat = v; });
      });
      jIdxSrc = null;
      ui.jBook = v; ui.jTab = null; save(); renderJournal();
      toast(tr('book.allDone', {n, b: jBookName(v)}));
    }});
  $$('[data-jt]').forEach(b => b.onclick = () => { ui.jTab = +b.dataset.jt; jPut = true; renderJournal(); });
  $$('[data-nsp]').forEach(b => b.onclick = () => jSetSplit(+b.dataset.nsp));
  wireJTabDnD(pages);
  $('#jAdd').onclick = () => {
    const p = {id:uid(), name:tr('journal.newPage', {n: mine.length + 1}), html:''};
    if(ui.jBook) p.cat = ui.jBook;
    pages.push(p); ui.jTab = pages.length - 1; jPut = true; save(); renderJournal();
  };
  if(split) return;                            // đổi tên, chép link, chuyển cuốn, bỏ trang: về một ô (▢) mới có
  // chuyển xong vẫn ở cuốn đang mở, để sắp lại nhiều trang cũ liền một lúc
  if($('#jMove')) $('#jMove').onclick = e => openPick(dest.map(b => ({v: b.id, t: b.name})), e.currentTarget.getBoundingClientRect(), {
    onPick: v => { page.cat = v; ui.jTab = null; save(); renderJournal(); toast(tr('book.moved', {n: jBookName(v)})); }});
  $('#jLink').onclick = () => copyPageLink(`#j/${ui.jDate}/${page.id}`, tr('nav.journal') + ' ' + jPageName(ui.jDate, pages, page));
  $('#jRen').onclick = () => {
    const n = prompt(tr('journal.askName'), page.name);
    if(n && n.trim()){ page.name = n.trim(); save(); renderJournal(); }
  };
  // trang đã viết thì vào thùng rác; trang trống thì bỏ thẳng, không có gì để giữ
  $('#jDel').onclick = () => {
    const kept = hasText(page.html);
    if(kept) trashJPage(ui.jDate, page); else pages.splice(ui.jTab, 1);
    ui.jTab = null; save(); renderJournal();
    if(kept) toast(tr('trash.movedTask'));
  };
}
/* ============ kéo thả tab để đổi thứ tự trang trong ngày (xem wireRowDnD) ============ */
// Trang đang mở vẫn là trang đang mở sau khi đổi chỗ, chỉ vị trí của nó thay đổi.
function wireJTabDnD(pages){
  const open = pages[ui.jTab];
  wireRowDnD($$('[data-jt]'), el => +el.dataset.jt, pages, () => { ui.jTab = pages.indexOf(open); save(); renderJournal(); });
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
// Mỗi cuốn tìm riêng, nên mỗi (ngày, cuốn) một bản.
function jEntry(k){
  if(jIdxSrc !== S.journal){ jIdx.clear(); jIdxSrc = S.journal; }
  const id = k + '|' + ui.jBook;
  let e = jIdx.get(id);
  if(!e || k === ui.jDate){
    const v = S.journal[k];
    const pgs = typeof v === 'string' ? (ui.jBook ? [] : [{name:'', html:v}])
      : (Array.isArray(v) ? v.filter(p => jCat(p) === ui.jBook) : []);
    const nm  = pgs.map(p => p.name || '').join(' ').normalize('NFC');
    const raw = pgs.map(p => plain(p.html)).join(' · ').replace(/\s+/g, ' ').trim().normalize('NFC');
    e = {raw, nm, b:fold(raw), n:fold(nm)};
    jIdx.set(id, e);
  }
  return e;
}
const jHit = (e, toks) => toks.every(tk => e.b.includes(tk) || e.n.includes(tk));

// cột trái: các ngày đã viết trong cuốn đang mở, mới nhất lên đầu, gom theo tháng; đang tìm thì lọc theo nội dung cả ngày
let jHits = [];
function drawJournalList(){
  const box = $('#jList'); if(!box) return;
  const toks = nqToks(ui.q.trim());
  let days = Object.keys(S.journal).filter(k => dayHas(k, ui.jBook));
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
