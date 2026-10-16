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
  {k:'kb',  n:tr('blk.kb'),  ic:'▦',  key:''},     // hay dùng nhất nên đứng đầu: gõ / rồi Enter là ra bảng việc
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
function closeEds(){ [...EDS.keys()].forEach(closeEd); closeSlash(); hideFtb(); }
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
   Task "Để sau" hiện ở cột Cần làm; kéo thẻ sang cột khác thì task ra khỏi "Để sau". */
const kbSubsOf = t => (t.subs || []).map(x => ({id: x.id, t: x.t, ...(x.d ? {x: true} : {})}));
function kbSetStatus(t, s){                    // như kéo thẻ trên bảng việc (board.js)
  t.status = s;
  if(s === 'done'){ t.pg = 100; t.done = today(); }
  else { t.done = null; if(t.pg === 100) t.pg = 75; if(s === 'doing' && t.pg === 0) t.pg = 25; }
}
const KB_LINK = {
  get(id){
    const t = S.tasks.find(x => x.id === id); if(!t) return null;
    return {t: t.title, s: t.status === 'backlog' ? 'todo' : t.status, sub: kbSubsOf(t), area: t.area};
  },
  create(c, area){
    const note = c.d ? c.d.split('\n').map(l => `<p>${esc(l)}</p>`).join('') : '';
    const t = {id: uid(), title: c.t, area, prio: 'med', status: c.s, pg: 0, tags: [], due: '', time: '', dur: 60, remind: 30,
      note, cr: today(), subs: (c.sub || []).map(x => ({id: x.id || uid(), t: x.t, d: !!x.x})), done: null};
    kbSetStatus(t, c.s);
    if(t.status === 'todo') t.pg = 0;
    S.tasks.unshift(t); save();
    toast(tr('kb.linked', {b: tr(area === 'life' ? 'nav.life' : 'nav.board')}));
    return t.id;
  },
  update(id, p){
    const t = S.tasks.find(x => x.id === id); if(!t) return;
    if(p.t) t.title = p.t;
    if(p.s && p.s !== (t.status === 'backlog' ? 'todo' : t.status)) kbSetStatus(t, p.s);
    if(p.sub){
      const old = new Map((t.subs || []).map(x => [x.id, x]));   // giữ ghi chú riêng của từng việc con trên task
      t.subs = p.sub.map(x => ({...(old.get(x.id) || {}), id: x.id, t: x.t, d: !!x.x}));
    }
    save();
  },
  open(id){ openTask(id); },
};
const kbFmtDay = k => { const d = new Date(k + 'T00:00:00'); return `${DOW[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; };
function mountEd(hostId, content, ph, onChange, {kbDay = ''} = {}){
  closeEd(hostId);
  const host = document.getElementById(hostId); if(!host) return null;
  const ed = window.TT.create(host, {content: toRich(content), placeholder: ph, onChange,
    imgSrc, fileCanView, fileView, onFiles: (files, pos) => dropFiles(ed, files, pos),
    kanban: {cols: Object.entries(COLS).map(([k, c]) => ({k, n: c.n, c: c.c})), day: kbDay, fmtDay: kbFmtDay,
             addPh: tr('kb.add'), addT: tr('kb.addT'), pastePh: tr('kb.paste'), delT: tr('kb.del'), copyT: tr('kb.copy'), copied: '✓',
             editT: tr('kb.edit'), descPh: tr('kb.desc'), subPh: tr('kb.subPh'), subT: tr('kb.subT'),
             selN: tr('kb.selN'), copySel: tr('kb.copySel'), copiedSel: tr('kb.copiedSel'), clearSel: tr('kb.clearSel'),
             copyAll: tr('kb.copyAll'), copiedAll: tr('kb.copiedAll'),
             descHide: tr('kb.descHide'), descShow: tr('kb.descShow'),
             subHide: tr('kb.subHide'), subShow: tr('kb.subShow'),
             link: KB_LINK, linkT: tr('kb.linkT'), linkWork: tr('nav.board'), linkLife: tr('nav.life'), linkedT: tr('kb.linkedT')}});
  EDS.set(hostId, ed);
  const dom = ed.view.dom;
  dom.addEventListener('dblclick', e => {                          // bấm đúp ảnh: mở cỡ gốc để đọc chữ trong ảnh
    const img = e.target.closest('img.eimg');
    if(img && img.src && !img.classList.contains('miss')) openLightbox(img.src);
  });
  dom.addEventListener('keydown', e => slashKeys(e, ed), true);   // chặn trước ProseMirror
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
  const hit = BLOCKS.filter(b => !info.q || (b.n + ' ' + b.k).toLowerCase().includes(info.q.toLowerCase()));
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
    `<button class="${TT.active(ed, m.k) ? 'on' : ''}" data-c="${m.k}" title="${m.t}">${m.l}</button>`).join('');
  el.querySelectorAll('[data-c]').forEach(b =>
    b.onmousedown = e => { e.preventDefault(); TT.mark(ed, b.dataset.c); setTimeout(() => syncMenus(ed), 0); });
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
