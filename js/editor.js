/* ============ markdown ============ */
function md(src){
  if(!src || !src.trim()) return `<p class="ph">${tr('ed.empty')}</p>`;
  const blocks = [];
  let t = src.replace(/\r\n/g,'\n').replace(/```([\s\S]*?)```/g, (m,code) => {
    blocks.push(code.replace(/^\n/,'').replace(/\n$/,''));
    return `@@${blocks.length-1}@@`;
  });

  const inline = s => esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<s>$1</s>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const out = []; const lines = t.split('\n');
  let list = null, para = [];
  const flushP = () => { if(para.length){ out.push('<p>'+inline(para.join(' '))+'</p>'); para = []; } };
  const flushL = () => { if(list){ out.push(list === 'ol' ? '</ol>' : '</ul>'); list = null; } };

  for(const ln of lines){
    const cb = ln.match(/^@@(\d+)@@$/);
    if(cb && blocks[+cb[1]] !== undefined){ flushP(); flushL(); out.push('<pre><code>'+esc(blocks[+cb[1]])+'</code></pre>'); continue; }
    if(!ln.trim()){ flushP(); flushL(); continue; }

    let m;
    if((m = ln.match(/^(#{1,3})\s+(.*)$/))){ flushP(); flushL(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if(/^(-{3,}|\*{3,})$/.test(ln.trim())){ flushP(); flushL(); out.push('<hr>'); continue; }
    if((m = ln.match(/^>\s?(.*)$/))){ flushP(); flushL(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); continue; }
    if((m = ln.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/))){
      flushP(); if(list !== 'td'){ flushL(); out.push('<ul class="td">'); list = 'td'; }
      out.push(`<li data-d="${m[1].toLowerCase() === 'x' ? 1 : 0}">${inline(m[2])}</li>`); continue;
    }
    if((m = ln.match(/^\s*[-*+]\s+(.*)$/))){
      flushP(); if(list !== 'ul'){ flushL(); out.push('<ul>'); list = 'ul'; }
      out.push('<li>'+inline(m[1])+'</li>'); continue;
    }
    if((m = ln.match(/^\s*\d+[.)]\s+(.*)$/))){
      flushP(); if(list !== 'ol'){ flushL(); out.push('<ol>'); list = 'ol'; }
      out.push('<li>'+inline(m[1])+'</li>'); continue;
    }
    flushL(); para.push(ln.trim());
  }
  flushP(); flushL();
  return out.join('');
}

/* ============ trình soạn thảo (TipTap / ProseMirror) ============ */
const plain   = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
const hasText = h => plain(h).length > 0 || /<(hr|img)\b|data-file=|data-kanban=/i.test(h || '');

const BLOCKS = [
  {k:'kb',  n:tr('blk.kb'),  ic:'▦',  key:''},     // hay dùng nhất nên đứng đầu: gõ / rồi Enter là ra bảng công việc
  {k:'kbl', n:tr('blk.kbl'), ic:'▦',  key:''},
  {k:'kbp', n:tr('blk.kbp'), ic:'⇣',  key:''},     // chỉ có ở trang nhật ký (xem kanban.js)
  {k:'plink', n:tr('blk.plink'), ic:'↗', key:''},
  {k:'tbl', n:tr('blk.tbl'), ic:'⊞',  key:''},     // sửa bảng thì dùng nút + và tay nắm trên bảng (showTbAdd)
  {k:'p',   n:tr('blk.p'),   ic:'¶',  key:''},
  {k:'h1',  n:tr('blk.h1'),  ic:'H1', key:'# '},
  {k:'h2',  n:tr('blk.h2'),  ic:'H2', key:'## '},
  {k:'h3',  n:tr('blk.h3'),  ic:'H3', key:'### '},
  {k:'td',  n:tr('blk.td'),  ic:'✓',  key:'[] '},
  {k:'ul',  n:tr('blk.ul'),  ic:'•',  key:'- '},
  {k:'ol',  n:tr('blk.ol'),  ic:'1.', key:'1. '},
  {k:'q',   n:tr('blk.q'),   ic:'❝',  key:'> '},
  {k:'pre', n:tr('blk.pre'), ic:'‹›', key:'```'},
  {k:'hr',  n:tr('blk.hr'),  ic:'—',  key:'---'},
  {k:'img', n:tr('blk.img'), ic:'▣',  key:'Ctrl+V'},
  {k:'file', n:tr('blk.file'), ic:'📎', key:tr('blk.fileKey')},
];

/* dữ liệu cũ (markdown, hoặc HTML do bản tự viết sinh ra) -> định dạng TipTap hiểu */
function toRich(html){
  const src = (!html || !html.trim()) ? '' : (/<[a-z][^>]*>/i.test(html) ? html : md(html));
  const d = document.createElement('div'); d.innerHTML = src;
  d.querySelectorAll('ul.td').forEach(ul => {
    ul.removeAttribute('class'); ul.setAttribute('data-type', 'taskList');
    [...ul.children].forEach(li => {
      const done = li.getAttribute('data-d') === '1';
      li.removeAttribute('data-d');
      li.setAttribute('data-type', 'taskItem');
      li.setAttribute('data-checked', done ? 'true' : 'false');
      const p = document.createElement('p');
      while(li.firstChild) p.appendChild(li.firstChild);
      li.appendChild(p);
    });
  });
  return d.innerHTML;
}

const EDS = new Map();
function closeEd(id){
  const e = EDS.get(id);
  if(e){ try{ e.destroy(); }catch(err){} EDS.delete(id); }
}
// render() gọi cái này mỗi lần vẽ trang; widget ghi chú nhanh nằm ngoài trang nên giữ lại
function closeEds(){ [...EDS.keys()].filter(k => k !== 'qnHost').forEach(closeEd); closeSlash(); hideFtb(); closeKbp(); }
/* khung cuộn gần nhất bọc lấy vùng soạn thảo (.jed bên nhật ký, .npage bên ghi chú, ngăn kéo task…) */
function edScroller(el){
  for(let p = el.parentElement; p; p = p.parentElement){
    const o = getComputedStyle(p).overflowY;
    if(o === 'auto' || o === 'scroll') return p;
  }
  return null;
}
/* gõ tới đáy thì tự cuộn cho con trỏ cách mép dưới một khoảng,
   khỏi phải Enter mấy lần để đẩy chữ lên chỗ dễ nhìn */
const CARET_GAP = 70;
function keepCaretOffBottom(ed){
  const box = edScroller(ed.view.dom); if(!box) return;
  const c = TT.caretRect(ed); if(!c) return;
  const over = c.bottom - (box.getBoundingClientRect().bottom - CARET_GAP);
  if(over > 1) box.scrollTop += over;
}

// kbDay: ngày (YYYY-MM-DD) của trang nhật ký đang soạn, để đóng dấu lên bảng việc chưa có ngày.
// Bảng đã mang ngày riêng (chép từ ngày khác sang) thì giữ ngày của nó.
/* nối thẻ của bảng việc trong trang với task thật (xem Kanban trong build/editor.src.js).
   Thẻ dùng {t, s: cột, sub: [{id, t, x: đã xong}]}, task dùng {title, status, subs: [{id, t, d: đã xong}]}.
   Task "Để sau" hiện ở cột Cần làm; kéo thẻ sang cột khác thì task ra khỏi "Để sau".
   Ô Backlog, Quan trọng và Không cần làm chỉ có trên bảng trong trang: với task thật, thẻ ở Backlog tính như ở Cần làm,
   ở Quan trọng tính như ở Đang làm, ở Quan trọng đã xong tính như ở Xong, còn kéo thẻ vào Không cần làm thì task giữ nguyên trạng thái.
   Hạn chót của thẻ (dl) là hạn của task (due). */
const kbSubsOf = t => (t.subs || []).map(x => ({id: x.id, t: x.t, ...(x.d ? {x: true} : {})}));
function kbSetStatus(t, s){                    // như kéo thẻ trên bảng việc (board.js)
  t.status = s;
  if(s === 'done'){ t.pg = 100; t.done = today(); }
  else { t.done = null; if(t.pg === 100) t.pg = 75; if(s === 'doing' && t.pg === 0) t.pg = 25; }
}
const KB_LINK = {
  get(id){
    const t = S.tasks.find(x => x.id === id); if(!t) return null;
    return {t: t.title, s: t.status === 'backlog' ? 'todo' : t.status, sub: kbSubsOf(t), area: t.area, done: t.done, due: t.due};
  },
  create(c, area){
    const note = c.d ? c.d.split('\n').map(l => `<p>${esc(l)}</p>`).join('') : '';
    const s = c.s === 'key' ? 'doing' : c.s === 'won' ? 'done' : c.s;
    const t = {id: uid(), title: c.t, area, prio: c.s === 'key' || c.s === 'won' ? 'high' : 'med', status: s, pg: 0, tags: [], due: c.dl || '', time: '', dur: 60, remind: 30,
      note, cr: today(), subs: (c.sub || []).map(x => ({id: x.id || uid(), t: x.t, d: !!x.x})), done: null};
    kbSetStatus(t, s);
    if(t.status === 'todo') t.pg = 0;
    S.tasks.unshift(t); save();
    toast(tr('kb.linked', {b: tr(area === 'life' ? 'nav.life' : 'nav.board')}));
    return t.id;
  },
  update(id, p){
    const t = S.tasks.find(x => x.id === id); if(!t) return;
    if(p.t) t.title = p.t;
    const s = p.s === 'backlog' ? 'todo' : p.s === 'key' ? 'doing' : p.s === 'won' ? 'done' : p.s === 'drop' ? null : p.s;
    if(s && s !== (t.status === 'backlog' ? 'todo' : t.status)) kbSetStatus(t, s);
    if(p.dd && t.status === 'done') t.done = p.dd;   // sửa tay ngày xong trên thẻ
    if('due' in p){ t.due = p.due; if(!p.due) t.time = ''; }   // bỏ hạn thì bỏ luôn giờ, như ở form task
    if(p.sub){
      const old = new Map((t.subs || []).map(x => [x.id, x]));   // giữ ghi chú riêng của từng việc con trên task
      t.subs = p.sub.map(x => ({...(old.get(x.id) || {}), id: x.id, t: x.t, d: !!x.x}));
    }
    save();
  },
  open(id){ openTask(id); },
};
const kbFmtDay = k => { const d = new Date(k + 'T00:00:00'); return `${DOW[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; };
/* chỗ con trỏ ở trang gõ gần nhất {k: mã trang, from, to}, nhớ riêng trong trình duyệt này như VIEW_KEY:
   mở lại app (restoreCaret lúc boot) thì con trỏ về đúng chỗ đang gõ dở. Chỉ trang có caret mới được nhớ. */
const CARET_KEY = 'dieukhien.caret';
let lastCaret = (() => { try{ return JSON.parse(localStorage.getItem(CARET_KEY)); }catch(e){ return null; } })();
let caretT = null;
const flushCaret = () => { clearTimeout(caretT); try{ localStorage.setItem(CARET_KEY, JSON.stringify(lastCaret)); }catch(e){} };
addEventListener('pagehide', flushCaret);
const CARET_OF = new WeakMap();   // editor -> mã trang
function restoreCaret(){
  const ed = lastCaret && [...EDS.values()].find(e => CARET_OF.get(e) === lastCaret.k);
  if(!ed) return;
  const max = ed.state.doc.content.size;          // trang có thể đã ngắn đi (cửa sổ khác sửa)
  ed.chain().focus(null, {scrollIntoView: false}).setTextSelection({from: Math.min(lastCaret.from, max), to: Math.min(lastCaret.to, max)}).run();
}
function mountEd(hostId, content, ph, onChange, {kbDay = '', caret = ''} = {}){
  closeEd(hostId);
  const host = document.getElementById(hostId); if(!host) return null;
  const ed = window.TT.create(host, {content: toRich(content), placeholder: ph, onChange,
    imgSrc, fileCanView, fileView, onFiles: (files, pos) => dropFiles(ed, files, pos), onPageLink: openPageLink,
    kanban: {cols: Object.entries(COLS).map(([k, c]) => ({k, n: c.n, c: c.c})), day: kbDay, fmtDay: kbFmtDay,
             nest: {todo: {k: 'backlog', n: 'Backlog', c: STATUSES.backlog.c}, done: {k: 'drop', n: tr('kb.drop'), c: '#78716c'}},
             nestTop: {doing: {k: 'key', n: tr('kb.key'), c: '#ef4444', ic: '🔥', tip: tr('kb.keyT')},
                       done: {k: 'won', n: tr('kb.won'), c: '#eab308', ic: '🏆', tip: tr('kb.wonT')}},
             prefN: {key: tr('kb.prefKey')}, setT: tr('kb.setT'),
             dueT: tr('kb.dueT'), dueL: tr('kb.dueL'), dueNone: tr('kb.dueNone'), dueEdit: tr('kb.dueEdit'),
             // màu riêng của bảng trong trang (nhạt hơn màu mảng ở bảng lớn): công việc xanh dương nhạt, cuộc sống xanh lá nhạt
             areas: {work: {n: AREAS.work.n, c: '#93c5fd'}, life: {n: AREAS.life.n, c: '#86efac'}},
             areaNone: tr('kb.areaNone'), areaT: tr('kb.areaT'), startT: tr('kb.startT'), doneT: tr('kb.doneT'), startL: tr('kb.startL'), doneL: tr('kb.doneL'),
             pickPh: tr('common.pickDate'), pickDate: (el, cur, cb) => openDP(el, cur, cb, tr('kb.clearDay')),
             addPh: tr('kb.add'), addT: tr('kb.addT'), pastePh: tr('kb.paste'), delT: tr('kb.del'), copyT: tr('kb.copy'), copied: '✓',
             editT: tr('kb.edit'), descPh: tr('kb.desc'), subPh: tr('kb.subPh'), subT: tr('kb.subT'),
             selN: tr('kb.selN'), copySel: tr('kb.copySel'), copiedSel: tr('kb.copiedSel'), clearSel: tr('kb.clearSel'),
             copyAll: tr('kb.copyAll'), copiedAll: tr('kb.copiedAll'),
             descHide: tr('kb.descHide'), descShow: tr('kb.descShow'),
             subHide: tr('kb.subHide'), subShow: tr('kb.subShow'),
             link: KB_LINK, linkT: tr('kb.linkT'), linkWork: tr('nav.board'), linkLife: tr('nav.life'), linkedT: tr('kb.linkedT')}});
  EDS.set(hostId, ed);
  if(kbDay) KB_DAY.set(ed, kbDay);
  if(caret){
    CARET_OF.set(ed, caret);
    const keep = () => {
      if(!ed.isFocused) return;
      const {from, to} = ed.state.selection;
      lastCaret = {k: caret, from, to};
      clearTimeout(caretT); caretT = setTimeout(flushCaret, 300);
    };
    ed.on('selectionUpdate', keep);
    ed.on('focus', keep);
  }
  kbSync(ed);                                                        // bảng ở trang khác có thể vừa sửa: lấy bản mới nhất
  ed.on('update', () => kbSync(ed));                                 // sửa bảng ở đây thì ghi sang các bản chép của nó
  const dom = ed.view.dom;
  dom.addEventListener('dblclick', e => {                          // bấm đúp ảnh: mở cỡ gốc để đọc chữ trong ảnh
    const img = e.target.closest('img.eimg');
    if(img && img.src && !img.classList.contains('miss')) openLightbox(img.src);
  });
  dom.addEventListener('keydown', e => slashKeys(e, ed), true);   // chặn trước ProseMirror
  dom.addEventListener('mousemove', e => { const w = e.target.closest('.tableWrapper'); if(w) showTbAdd(ed, w, e.target.closest('td, th')); });
  ed.on('update',          () => { syncMenus(ed); keepCaretOffBottom(ed); });   // bám theo TipTap, không bám phím
  ed.on('selectionUpdate', () => syncMenus(ed));
  dom.addEventListener('keydown', e => {
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); TT.link(ed); }
  });
  return ed;
}
function syncMenus(ed){
  const s = TT.slash(ed);
  if(s) openSlash(ed, s); else closeSlash();
  const r = s ? null : TT.selRect(ed);
  if(r) showFtb(ed, r); else hideFtb();
}

/* --- menu lệnh "/" --- */
let slash = null;
function openSlash(ed, info){
  const hit = BLOCKS.filter(b => (b.k !== 'kbp' || KB_DAY.has(ed)) && (!info.q || (b.n + ' ' + b.k).toLowerCase().includes(info.q.toLowerCase())));
  let el = document.getElementById('slashEl');
  if(!el){
    el = document.createElement('div'); el.className = 'slash'; el.id = 'slashEl';
    document.body.appendChild(el);
  }
  el.innerHTML = hit.length
    ? hit.map((b, i) => `<button class="${i ? '' : 'on'}" data-b="${b.k}"><span class="ic3">${b.ic}</span>${b.n}<span class="k">${b.key}</span></button>`).join('')
    : `<div class="none">${tr('ed.noCmd')}</div>`;
  el.querySelectorAll('[data-b]').forEach(b =>
    b.onmousedown = e => { e.preventDefault(); pickSlash(b.dataset.b); });

  const c = TT.caretRect(ed) || {left:200, bottom:200};
  el.style.left = Math.max(8, Math.min(c.left, innerWidth - 248)) + 'px';
  el.style.top  = (c.bottom + 300 > innerHeight ? Math.max(8, c.top - 300) : c.bottom + 8) + 'px';
  slash = {ed, range:{from:info.from, to:info.to}};
}
function closeSlash(){ document.getElementById('slashEl')?.remove(); slash = null; }
function pickSlash(k){
  if(!slash) return;
  const {ed, range} = slash; closeSlash();
  TT.block(ed, k, range);
  if(k === 'img') pickImages(ed);
  if(k === 'file') pickFiles(ed);
  if(k === 'kbp') kbPickDays(ed);
  if(k === 'plink') pickPageLink(ed);
}

/* --- liên kết tới trang: gõ /, chọn "Liên kết tới trang", tìm trong cả ghi chú lẫn nhật ký.
   Link lưu dạng #n/<id trang ghi chú> hoặc #j/<ngày>/<id trang nhật ký>; chữ của link là tên trang lúc chèn --- */
function pageItems(){
  const notes = S.notes.map(n => ({v: '#n/' + n.id, g: tr('nav.notes'), lt: n.title.trim() || tr('note.untitled'),
    t: [...nPath(n), n].map(p => p.title.trim() || tr('note.untitled')).join(' / ')}));
  const days = Object.keys(S.journal).filter(k => dayHas(k)).sort().reverse().flatMap(d => {
    const pgs = Array.isArray(S.journal[d]) ? S.journal[d] : [];
    // trang trống bỏ qua: mỗi cuốn mở ra ở một ngày đều tự có sẵn một trang trống
    return pgs.filter(p => hasText(p.html)).map(p => { const t = jPageName(d, pgs, p);
      return {v: `#j/${d}/${p.id}`, g: tr('nav.journal'), t, lt: tr('nav.journal') + ' ' + t}; });
  });
  return [...notes, ...days];
}
// tên trang nhật ký trong link: ngày và cuốn, thêm tên trang nếu cuốn đó có nhiều trang trong ngày
const jPageName = (d, pgs, p) => {
  const c = jCat(p);
  return fmtVN(d) + ' · ' + jBookName(c) + (pgs.filter(x => jCat(x) === c).length > 1 ? ' · ' + p.name : '');
};
/* nút 🔗 ở trang ghi chú / nhật ký: chép link của trang đang mở. Chép cả dạng HTML nên dán (Ctrl+V) vào trang khác
   là ra đúng link bấm được như /lệnh; dấu cách sau link để gõ tiếp không bị dính vào link */
async function copyPageLink(href, text){
  const html = `<a href="${esc(href)}">${esc(text)}</a>&nbsp;`;
  try{
    await navigator.clipboard.write([new ClipboardItem({
      'text/html': new Blob([html], {type: 'text/html'}), 'text/plain': new Blob([text], {type: 'text/plain'})})]);
    toast(tr('plink.copied'));
  }catch(e){ toast(tr('plink.copyFail')); }
}
function pickPageLink(ed){
  const items = pageItems(), c = TT.caretRect(ed) || {left: 200, top: 200, bottom: 200};
  openPick(items, {left: c.left, top: c.top, bottom: c.bottom}, {width: 340,
    onPick: v => TT.pageLink(ed, v, items.find(x => x.v === v).lt),
    onEsc: () => ed.commands.focus()});
}
function openPageLink(href){
  let m;
  if((m = href.match(/^#n\/(.+)$/))){
    if(!S.notes.some(n => n.id === m[1])) return toast(tr('plink.gone'));
    ui.nOpen = m[1]; ui.nBook = nBook(S.notes.find(n => n.id === m[1]));
    if(ui.view === 'notes') renderNotes(); else goView('notes');
  }else if((m = href.match(/^#j\/(\d{4}-\d\d-\d\d)\/(.+)$/))){
    const pgs = Array.isArray(S.journal[m[1]]) ? S.journal[m[1]] : [], i = pgs.findIndex(p => p.id === m[2]);
    if(i < 0) return toast(tr('plink.gone'));
    ui.jDate = m[1]; ui.jTab = i; ui.jBook = jCat(pgs[i]); jKept = null; jPut = true;   // jPut: đang chia màn hình thì mở vào ô đang chọn   // jKept: trang nhớ từ lần trước, không được giành chỗ trang vừa bấm
    if(ui.view === 'journal') renderJournal(); else goView('journal');
  }
}
function slashKeys(e, ed){
  if(!slash) return;
  const btns = [...document.querySelectorAll('#slashEl [data-b]')];
  const i = btns.findIndex(b => b.classList.contains('on'));
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    e.preventDefault(); e.stopPropagation();
    if(!btns.length) return;
    btns[i]?.classList.remove('on');
    const j = (i + (e.key === 'ArrowDown' ? 1 : btns.length - 1) + btns.length) % btns.length;
    btns[j].classList.add('on'); btns[j].scrollIntoView({block:'nearest'});
    return;
  }
  if(e.key === 'Enter' && btns.length){ e.preventDefault(); e.stopPropagation(); pickSlash(btns[Math.max(0,i)].dataset.b); return; }
  if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeSlash(); }
}

// menu "/" và menu tay nắm bảng: chuột tới mục nào thì mục đó sáng, dùng chung ô sáng với phím ↑↓ (Enter chọn đúng mục đang sáng)
document.addEventListener('mouseover', e => {
  const b = e.target.closest && e.target.closest('.slash button');
  if(!b || b.classList.contains('on')) return;
  b.parentElement.querySelectorAll('button.on').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
});

/* --- bảng, như Notion: nút + ở mép phải / mép dưới (thêm cột / dòng cuối), tay nắm ⋮ ở đầu dòng và ⋯ trên đầu
   cột của ô đang trỏ (bấm ra menu thêm / xoá). Rê chuột vào bảng thì hiện, ra xa thì ẩn --- */
let tbHover = null;                          // {ed, wrap, cell}: bảng và ô đang trỏ
const TB_MENU = {
  row: [['tbRowUp', '↑'], ['tbRow', '↓'], ['tbDelRow', '✕'], ['tbDel', '✕']],
  col: [['tbColL', '←'], ['tbCol', '→'], ['tbDelCol', '✕'], ['tbDel', '✕']],
};
function showTbAdd(ed, wrap, cell){
  if(document.getElementById('tbMenuEl')) return;   // menu đang mở: giữ nguyên dòng / cột đã chọn
  let el = document.getElementById('tbAddEl');
  if(!el){
    el = document.createElement('div'); el.id = 'tbAddEl';
    el.innerHTML = `<button type="button" class="tbadd" data-k="col" title="${tr('blk.tbCol')}">+</button>`
      + `<button type="button" class="tbadd" data-k="row" title="${tr('blk.tbRow')}">+</button>`
      + `<button type="button" class="tbh" data-h="row" title="${tr('tb.rowT')}">⋮</button>`
      + `<button type="button" class="tbh" data-h="col" title="${tr('tb.colT')}">⋯</button>`;
    el.onmousedown = e => {
      e.preventDefault();
      if(!tbHover) return;
      const h = e.target.closest('[data-h]');
      if(h) return openTbMenu(h);
      const b = e.target.closest('[data-k]'); if(!b) return;
      const rows = tbHover.wrap.querySelectorAll('tr'); if(!rows.length) return;
      const last = (b.dataset.k === 'col' ? rows[0] : rows[rows.length - 1]).lastElementChild;
      TT.tableCmd(tbHover.ed, last, b.dataset.k === 'col' ? 'tbCol' : 'tbRow');
      requestAnimationFrame(placeTbAdd);     // bảng vừa to ra: dời nút theo
    };
    document.body.appendChild(el);
  }
  // trỏ vào mép khung chứ không vào ô nào: giữ ô cũ nếu vẫn là bảng ấy
  tbHover = {ed, wrap, cell: cell || (tbHover && tbHover.wrap === wrap ? tbHover.cell : null)};
  placeTbAdd();
}
function placeTbAdd(){
  const el = document.getElementById('tbAddEl'), t = tbHover && tbHover.wrap.querySelector('table');
  if(!el || !t || !tbHover.wrap.isConnected) return hideTbAdd();
  const r = t.getBoundingClientRect(), w = tbHover.wrap.getBoundingClientRect();
  const right = Math.min(r.right, w.right);  // bảng rộng hơn khung thì cuộn ngang: nút bám mép khung
  const [col, row, rh, ch] = el.children, px = v => v + 'px';
  Object.assign(col.style, {left: px(right + 4), top: px(r.top), width: '18px', height: px(r.height)});
  Object.assign(row.style, {left: px(r.left), top: px(r.bottom + 4), width: px(right - r.left), height: '18px'});
  const c = tbHover.cell && tbHover.cell.isConnected ? tbHover.cell : null;
  rh.style.display = ch.style.display = c ? '' : 'none';
  if(!c) return;
  const rr = c.parentElement.getBoundingClientRect(), cr = c.getBoundingClientRect();
  Object.assign(rh.style, {left: px(r.left - 18), top: px(rr.top), width: '14px', height: px(rr.height)});
  Object.assign(ch.style, {left: px(cr.left), top: px(r.top - 16), width: px(cr.width), height: '12px'});
}
function hideTbAdd(){ closeTbMenu(); document.getElementById('tbAddEl')?.remove(); tbHover = null; }
function openTbMenu(h){
  closeTbMenu();
  const {ed, cell} = tbHover; if(!cell) return;
  const m = document.createElement('div');
  m.className = 'slash'; m.id = 'tbMenuEl';
  // gộp: khi đang kéo chọn nhiều ô; tách: khi ô đang trỏ là ô đã gộp
  const extra = [...(TT.canMerge(ed) ? [['tbMerge', '⊞']] : []), ...(cell.colSpan > 1 || cell.rowSpan > 1 ? [['tbSplit', '⊟']] : [])];
  m.innerHTML = [...TB_MENU[h.dataset.h], ...extra].map(([k, ic]) =>
    `<button type="button" data-b="${k}"><span class="ic3">${ic}</span>${tr('blk.' + k)}</button>`).join('');
  m.onmousedown = e => {
    e.preventDefault();
    const b = e.target.closest('[data-b]'); if(!b) return;
    hideTbAdd();
    TT.tableCmd(ed, cell, b.dataset.b);
  };
  document.body.appendChild(m);
  const r = h.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, innerWidth - 248)) + 'px';
  m.style.top = (r.bottom + 190 > innerHeight ? Math.max(8, r.top - 190) : r.bottom + 4) + 'px';
  h.classList.add('on');
}
function closeTbMenu(){
  document.getElementById('tbMenuEl')?.remove();
  document.querySelectorAll('#tbAddEl .tbh.on').forEach(b => b.classList.remove('on'));
}
document.addEventListener('mousemove', e => {
  if(!tbHover || document.getElementById('tbMenuEl')) return;
  const r = tbHover.wrap.getBoundingClientRect();   // chừa mép quanh bảng cho chuột đi tới nút + và tay nắm
  if(!tbHover.wrap.isConnected || e.clientX < r.left - 24 || e.clientX > r.right + 28 || e.clientY < r.top - 22 || e.clientY > r.bottom + 28) hideTbAdd();
});
document.addEventListener('mousedown', e => {
  if(document.getElementById('tbMenuEl') && !(e.target.closest && e.target.closest('#tbMenuEl, #tbAddEl'))) hideTbAdd();
}, true);
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && document.getElementById('tbMenuEl')){ e.preventDefault(); e.stopPropagation(); hideTbAdd(); }
}, true);
document.addEventListener('scroll', () => { if(tbHover) hideTbAdd(); }, true);

/* --- thanh công cụ nổi khi bôi đen --- */
const MARKS = [
  {k:'bold',   l:'<b>B</b>',  t:tr('mark.bold')},
  {k:'italic', l:'<i>I</i>',  t:tr('mark.italic')},
  {k:'strike', l:'<s>S</s>',  t:tr('mark.strike')},
  {k:'code',   l:'‹›',        t:tr('mark.code')},
  {k:'link',   l:'↗',         t:tr('mark.link')},
];
function showFtb(ed, r){
  let el = document.getElementById('ftbEl');
  if(!el){
    el = document.createElement('div'); el.className = 'ftb'; el.id = 'ftbEl';
    document.body.appendChild(el);
  }
  el.innerHTML = MARKS.map(m =>
    `<button class="${TT.active(ed, m.k) ? 'on' : ''}" data-c="${m.k}" title="${m.t}">${m.l}</button>`).join('')
    + (TT.canMerge(ed) ? `<span class="sep"></span><button data-merge title="${tr('blk.tbMerge')}">${tr('mark.merge')}</button>` : '');   // kéo chọn nhiều ô bảng
  el.querySelectorAll('[data-c]').forEach(b =>
    b.onmousedown = e => { e.preventDefault(); TT.mark(ed, b.dataset.c); setTimeout(() => syncMenus(ed), 0); });
  const mg = el.querySelector('[data-merge]');
  if(mg) mg.onmousedown = e => { e.preventDefault(); TT.tableCmd(ed, null, 'tbMerge'); setTimeout(() => syncMenus(ed), 0); };
  el.style.left = Math.max(8, Math.min(r.left + r.width/2 - 92, innerWidth - 192)) + 'px';
  el.style.top  = Math.max(8, r.top - 42) + 'px';
}
function hideFtb(){ document.getElementById('ftbEl')?.remove(); }

/* --- xem ảnh cỡ gốc --- */
function openLightbox(src){
  const el = document.createElement('div');
  el.className = 'lbx';
  el.innerHTML = `<img alt=""><button type="button" class="x">✕</button><div class="hint">${tr('ed.imgZoom')}</div>`;
  const img = el.querySelector('img'); img.src = src;
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); } };
  el.querySelector('.x').onclick = close;
  el.addEventListener('mousedown', e => { if(e.target === el) close(); });
  /* bấm ảnh: đổi giữa vừa màn hình và cỡ 1:1; đang ở 1:1 thì kéo để dời ảnh */
  let pan = null, moved = false;
  img.addEventListener('pointerdown', e => {
    if(!el.classList.contains('zoom')) return;
    pan = {x:e.clientX, y:e.clientY, l:el.scrollLeft, t:el.scrollTop}; moved = false;
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener('pointermove', e => {
    if(!pan) return;
    if(Math.abs(e.clientX - pan.x) > 3 || Math.abs(e.clientY - pan.y) > 3) moved = true;
    el.scrollLeft = pan.l - (e.clientX - pan.x); el.scrollTop = pan.t - (e.clientY - pan.y);
  });
  img.addEventListener('pointerup', () => { pan = null; });
  img.addEventListener('click', () => { if(!moved) el.classList.toggle('zoom'); moved = false; });
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(el);
}
