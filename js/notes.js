/* ============ ghi chú: trang không theo ngày, lồng nhau như Notion ============ */
// S.notes: {id, title, html, parent (id trang cha, null = cấp gốc), tags, pin, open (đang mở trang con ở cây), cr, mod}
// cr / mod = thời điểm tạo / sửa lần cuối (ISO). Thứ tự các trang cùng cha = thứ tự trong mảng.
// Bỏ một trang thì cả cây con sang S.ntrash; chỉ trang được bấm bỏ có trường trashed.
const nKids  = id => S.notes.filter(n => n.parent === id);
const nTitle = n => n.title.trim() ? esc(n.title) : `<span class="ph">${tr('note.untitled')}</span>`;
const nName  = n => esc(n.title.trim() || tr('note.untitled'));
// trang root và mọi trang con cháu của nó trong list (dừng ở trang con đã bị bỏ riêng từ trước)
function nTree(list, root){
  const out = [root];
  for(let i = 0; i < out.length; i++) out.push(...list.filter(n => n.parent === out[i].id && !n.trashed));
  return out;
}
// các trang cha từ gốc xuống
function nPath(n){
  const out = [];
  for(let p = S.notes.find(x => x.id === n.parent); p; p = S.notes.find(x => x.id === p.parent)) out.unshift(p);
  return out;
}
// mọi trang theo thứ tự cây, bỏ qua các trang trong skip (và con cháu của chúng)
function nFlat(skip){
  const out = [];
  const walk = (pid, depth) => S.notes.filter(n => n.parent === pid && !skip.has(n.id))
    .forEach(n => { out.push({n, depth}); walk(n.id, depth + 1); });
  walk(null, 0);
  return out;
}
const fmtStamp = s => { const d = new Date(s); return `${fmtVN(iso(d))} ${d.toTimeString().slice(0,5)}`; };
function fmtAgo(s){
  const d = new Date(s), m = Math.floor((Date.now() - d) / 6e4), hm = d.toTimeString().slice(0,5);
  const y = new Date(); y.setDate(y.getDate() - 1);
  if(m < 1) return tr('ago.now');
  if(m < 60) return tr('ago.min', {m});
  if(iso(d) === today()) return tr('ago.today', {h: hm});
  if(iso(d) === iso(y)) return tr('ago.yesterday', {h: hm});
  return fmtStamp(s);
}

function newNote(parent = null){
  const now = new Date().toISOString();
  const n = {id:uid(), title:'', html:'', parent, tags: ui.tag ? [ui.tag] : [], pin:false, open:false, cr:now, mod:now};
  const sib = S.notes.find(x => x.parent === parent);   // trang mới lên đầu danh sách cùng cha
  if(sib) S.notes.splice(S.notes.indexOf(sib), 0, n); else S.notes.push(n);
  if(parent) S.notes.find(x => x.id === parent).open = true;
  ui.nOpen = n.id; ui.q = ''; $('#q').value = '';   // bỏ ô tìm để trang mới hiện ở cây
  save(); renderNotes();
  setTimeout(() => $('#ntTitle')?.focus(), 0);
}
function trashNote(id){
  const n = S.notes.find(x => x.id === id); if(!n) return;
  const tree = nTree(S.notes, n);
  S.notes = S.notes.filter(x => !tree.includes(x));
  n.trashed = today(); S.ntrash.unshift(...tree);
  ui.nOpen = n.parent;
  save(); render();
  toast(tree.length > 1 ? tr('note.trashed', {k: tree.length - 1}) : tr('trash.movedTask'));
}

function renderNotes(){
  if(!S.notes.some(n => n.id === ui.nOpen)) ui.nOpen = (S.notes.find(n => n.pin) || S.notes.find(n => !n.parent) || {}).id || null;
  const n = S.notes.find(x => x.id === ui.nOpen);
  $('#vSub').textContent = tr('note.sub', {n: S.notes.length});

  const moveTo = n && nFlat(new Set([n.id])).filter(x => x.n.id !== n.parent);
  const side = S.settings.nSide;
  $('#view').innerHTML = `<div class="nwrap">
    ${side ? `<div class="nside">
      <div class="nshead">
        <button class="btn" id="ntNew">${tr('note.new')}</button>
        <button class="nfold" id="ntHide" title="${tr('common.hideSide')}">«</button>
      </div>
      <div class="search nsrch">
        <span style="color:var(--tx3)">⌕</span>
        <input id="ntQ" value="${esc(ui.q)}" placeholder="${tr('note.search')}" autocomplete="off" title="${tr('note.searchT')}">
      </div>
      <div id="ntList"></div>
    </div>`
    : `<button class="nfold nshow" id="ntShow" title="${tr('common.showSide')}">»</button>`}
    <div class="npage">${n ? `
      ${nPath(n).length ? `<div class="ncrumb">${nPath(n).map(p => `<button data-nid="${p.id}">${nName(p)}</button><span>/</span>`).join('')}</div>` : ''}
      <input class="nttl" id="ntTitle" value="${esc(n.title)}" placeholder="${tr('note.untitled')}" autocomplete="off">
      <div class="nmeta">
        <span class="meta" title="${tr('note.createdAt')}">${tr('note.created', {s: fmtStamp(n.cr)})}</span><span class="meta">·</span>
        <span class="meta" id="ntMod" data-ago="${n.mod}" title="${fmtStamp(n.mod)}">${tr('note.modPre', {a: fmtAgo(n.mod)})}</span>
        <div class="nacts">
          <button class="btn ghost" id="ntPin">${tr(n.pin ? 'note.unpin' : 'note.pin')}</button>
          <button class="btn ghost" id="ntKid">${tr('note.addKid')}</button>
          ${n.parent || moveTo.length ? `<select class="inp nmove" id="ntMove" title="${tr('note.moveT')}">
            <option value="" selected disabled>${tr('note.movePh')}</option>
            ${n.parent ? `<option value="/">${tr('note.moveRoot')}</option>` : ''}
            ${moveTo.map(x => `<option value="${x.n.id}">${'   '.repeat(x.depth)}${nName(x.n)}</option>`).join('')}
          </select>` : ''}
          <button class="danger" id="ntDel">${tr('note.toTrash')}</button>
        </div>
      </div>
      <div class="fld">${tagFieldHTML('ntTag', n.tags, tr('note.tagHint'))}</div>
      <div class="ned" id="ntHost"></div>`
    : `<div class="empty">${tr('note.empty')}</div>`}</div>
  </div>`;

  drawNoteList();
  if(side){
    // dựng sẵn bản bỏ dấu lúc máy rảnh, để phím đầu tiên gõ vào ô tìm không phải bóc html cả kho.
    // Gọi qua window chứ không tách hàm ra biến: requestIdleCallback đòi đúng receiver, tách ra là ném lỗi.
    const warm = () => S.notes.forEach(nEntry);
    if(window.requestIdleCallback) window.requestIdleCallback(warm); else setTimeout(warm, 1);
    $('#ntNew').onclick = () => newNote();
    const qi = $('#ntQ');
    // ô này và ô tìm trên thanh trên là cùng một câu tìm (ui.q), gõ ở đâu cũng soi sang ô kia
    qi.oninput = () => { ui.q = qi.value; $('#q').value = ui.q; drawNoteList(); };
    qi.onkeydown = e => {
      if(e.key === 'Escape' && ui.q){
        e.stopPropagation();                       // Esc ở đây là xoá câu tìm, không phải đóng panel
        ui.q = ''; qi.value = ''; $('#q').value = ''; return drawNoteList();
      }
      if(e.key === 'Enter' && nHits.length && nHits[0].n.id !== ui.nOpen){
        ui.nOpen = nHits[0].n.id; renderNotes();    // Enter = mở trang khớp nhất, con trỏ ở lại ô tìm
        setTimeout(() => $('#ntQ')?.focus(), 0);
      }
    };
  }
  $(side ? '#ntHide' : '#ntShow').onclick = () => { S.settings.nSide = !side; save(); renderNotes(); };
  $('.nwrap').onclick = e => {   // cây trang, kết quả tìm, đường dẫn phía trên tiêu đề
    const sec = e.target.closest('[data-nsec]');
    if(sec){ S.settings[sec.dataset.nsec] = !S.settings[sec.dataset.nsec]; save(); return drawNoteList(); }
    const tog = e.target.closest('[data-ntog]');
    if(tog){ const x = S.notes.find(v => v.id === tog.dataset.ntog); x.open = !x.open; save(); return drawNoteList(); }
    const kid = e.target.closest('[data-nkid]');
    if(kid) return newNote(kid.dataset.nkid);
    const go = e.target.closest('[data-nid]');
    if(go && go.dataset.nid !== ui.nOpen){ ui.nOpen = go.dataset.nid; renderNotes(); }
  };
  if(!n) return;

  const touch = () => {
    n.mod = new Date().toISOString(); save();
    const m = $('#ntMod'); m.dataset.ago = n.mod; m.title = fmtStamp(n.mod); m.textContent = tr('note.modPre', {a: fmtAgo(n.mod)});
  };
  $('#ntTitle').oninput = e => {
    n.title = e.target.value; touch();
    $$(`#ntList [data-nid="${n.id}"] .nname`).forEach(el => el.innerHTML = nTitle(n));
  };
  $('#ntTitle').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); EDS.get('ntHost')?.commands.focus('start'); } };
  mountEd('ntHost', n.html, tr('note.ph'), v => { n.html = v; touch(); });
  $('#ntPin').onclick = () => { n.pin = !n.pin; save(); renderNotes(); };
  $('#ntKid').onclick = () => newNote(n.id);
  if($('#ntMove')) $('#ntMove').onchange = e => {
    nPlace(n, e.target.value === '/' ? null : e.target.value, null);   // xuống cuối danh sách con của cha mới
    save(); renderNotes();
  };
  $('#ntDel').onclick = () => trashNote(n.id);
  bindTagField($('.npage'), 'ntTag', n.tags,
    t => { if(!n.tags.includes(t)) n.tags.push(t); touch(); render(); setTimeout(() => $('#ntTag')?.focus(), 0); },
    t => { n.tags = n.tags.filter(x => x !== t); touch(); render(); });
}
/* ============ tìm kiếm trang ============ */
// Mỗi trang giữ sẵn một bản đã bỏ dấu (nIdx), chỉ dựng lại khi trang đổi — gõ thêm một phím thì
// chỉ quét lại mảng có sẵn chứ không bóc lại html. Câu tìm tách thành từ, trang phải khớp ĐỦ mọi
// từ nhưng không cần đúng thứ tự; rồi chấm điểm để trang đáng xem nhất lên đầu, thay vì xếp theo
// ngày sửa như trước. Kết quả vẽ ra tối đa NQ_MAX hàng, phần dư chỉ đếm.
// nqToks / nqHi / nqSnip nằm ở core.js vì nhật ký cũng dùng chung
const NQ_MAX = 60;
const nIdx = new Map();
// raw / ttl cất bản NFC chứ không phải chuỗi gốc: fold() chuẩn hoá NFC bên trong, nên có cùng
// dạng thì độ dài mới bằng nhau và vị trí khớp mới trỏ đúng chỗ lúc tô sáng.
function nEntry(n){
  let e = nIdx.get(n.id);
  if(!e || e.mod !== n.mod || e.src !== n.title){
    const raw = plain(n.html).replace(/\s+/g, ' ').normalize('NFC');
    const ttl = String(n.title).normalize('NFC');
    e = {mod:n.mod, src:n.title, raw, ttl, t:fold(ttl), b:fold(raw), g:fold(n.tags.join(' '))};
    nIdx.set(n.id, e);
  }
  return e;
}
// chỗ khớp đầu tiên của tok trong hay, ưu tiên chỗ rơi đúng vào đầu một từ
function nqFind(hay, tok){
  let first = -1;
  for(let i = hay.indexOf(tok); i >= 0; i = hay.indexOf(tok, i + 1)){
    if(first < 0) first = i;
    if(i === 0 || !/[a-z0-9]/.test(hay[i - 1])) return {at:i, head:true};
  }
  return first < 0 ? null : {at:first, head:false};
}
// tiêu đề ăn điểm hơn tag, tag hơn nội dung; khớp đầu từ hơn khớp lọt giữa từ. 0 = không nhận
function nqScore(e, toks, fq){
  let s = 0;
  for(const tk of toks){
    const t = nqFind(e.t, tk), g = nqFind(e.g, tk), b = nqFind(e.b, tk);
    if(!t && !g && !b) return 0;               // thiếu một từ là loại cả trang
    if(t) s += t.head ? 60 : 30;
    if(g) s += g.head ? 40 : 20;
    if(b) s += b.head ? 12 : 6;
    if(t && t.at === 0) s += 15;               // đứng ngay đầu tiêu đề
  }
  if(e.t.trim() === fq) s += 120;              // tiêu đề đúng bằng câu tìm
  else if(toks.length > 1 && e.t.includes(fq)) s += 60;   // cả câu nằm nguyên một chỗ trong tiêu đề
  return s;
}
// không có câu tìm (chỉ lọc tag) thì mọi trang đều nhận, xếp theo ngày sửa như cũ
function nqSearch(q){
  const toks = nqToks(q), fq = fold(q).trim();
  return S.notes.filter(n => !ui.tag || n.tags.includes(ui.tag))
    .map(n => { const e = nEntry(n); return {n, e, s: toks.length ? nqScore(e, toks, fq) : 1}; })
    .filter(h => h.s > 0)
    .sort((a, b) => b.s - a.s || b.n.mod.localeCompare(a.n.mod));
}
const nqName = (n, e, toks) => e.ttl.trim()
  ? nqHi(e.ttl, e.t, toks) : `<span class="ph">${tr('note.untitled')}</span>`;

// cột trái: bình thường là cây trang; đang tìm hoặc lọc tag thì thành danh sách phẳng xếp theo độ khớp
let nHits = [];
function drawNoteList(){
  const box = $('#ntList'); if(!box) return;
  const q = ui.q.trim();
  if(q || ui.tag){
    const toks = nqToks(q);
    nHits = nqSearch(q);
    const show = nHits.slice(0, NQ_MAX);
    box.innerHTML = `<div class="nlbl">${tr('note.matchN', {n: nHits.length})}${ui.tag ? tr('note.matchTag', {t: esc(ui.tag)}) : ''}</div>`
      + (show.length ? show.map(({n, e}) => {
          const sn = toks.length ? nqSnip(e, toks) : '';    // trang rỗng thì không chừa chỗ trống
          return `<button class="nhit${n.id === ui.nOpen ? ' on' : ''}" data-nid="${n.id}">
          <span class="nname">${toks.length ? nqName(n, e, toks) : nTitle(n)}</span>
          ${sn ? `<span class="nsnip">${sn}</span>` : ''}
          <span class="nsub">${nPath(n).map(p => nName(p) + ' / ').join('')}${tr('note.rowAgo', {a: fmtAgo(n.mod)})}</span></button>`;
        }).join('')
        : `<div class="nofil" style="padding:4px 8px">${tr('note.noMatch')}</div>`)
      + (nHits.length > NQ_MAX ? `<div class="nofil" style="padding:6px 8px">${tr('note.matchMore', {n: nHits.length - NQ_MAX})}</div>` : '');
    return;
  }
  nHits = [];
  const row = (n, depth, tree, mark) => {
    const kids = tree ? nKids(n.id) : [];
    return `<div class="nrow${n.id === ui.nOpen ? ' on' : ''}" data-nid="${n.id}"
        ${tree ? `draggable="true" data-tree data-depth="${depth}" title="${tr('note.dragT')}"`
               : `title="${tr('note.rowAgo', {a: fmtAgo(n.mod)})}"`}
        style="padding-left:${2 + depth * 14}px">
        ${!tree ? `<span class="ncar">${mark}</span>`
          : kids.length ? `<button class="ncar" data-ntog="${n.id}">${n.open ? '▾' : '▸'}</button>` : '<span class="ncar">·</span>'}
        <span class="nname">${nTitle(n)}</span>
        ${tree ? `<button class="nadd" data-nkid="${n.id}" title="${tr('note.addKidT')}">+</button>` : ''}</div>
      ${kids.length && n.open ? kids.map(k => row(k, depth + 1, true)).join('') : ''}`;
  };
  const pins = S.notes.filter(n => n.pin), roots = nKids(null);
  const recent = [...S.notes].sort((a, b) => b.mod.localeCompare(a.mod)).slice(0, 5);
  // nhãn mục bấm được: thu gọn hay mở nhớ trong settings theo khoá của mục
  const sect = (key, label, body) =>
    `<button class="nlbl" data-nsec="${key}">${tr(label)}<span class="nlcar">${S.settings[key] ? '▾' : '▸'}</span></button>`
    + (S.settings[key] ? body : '');
  box.innerHTML = (pins.length ? sect('nPinned', 'note.pinned', pins.map(n => row(n, 0, false, '★')).join('')) : '')
    + (recent.length ? sect('nRecent', 'note.recent', recent.map(n => row(n, 0, false, '◷')).join('')) : '')
    + sect('nAll', 'note.all', roots.length ? roots.map(n => row(n, 0, true)).join('')
        : `<div class="nofil" style="padding:4px 8px">${tr('note.none')}</div>`);
  wireNoteDnD();
}

/* ============ kéo thả: đổi thứ tự trang, hoặc thả vào trang khác thành trang con ============ */
// Trỏ vào mép trên / mép dưới một hàng thì thành khe chèn trước / sau hàng ấy (hiện vạch);
// trỏ vào giữa hàng thì thành trang con, xuống cuối danh sách con của nó (hàng sáng viền).
// Thả dưới hàng cuối cùng thì về cấp gốc. Chỉ làm ở chế độ cây, lúc đang tìm hay lọc tag thì thôi.
let nDragId = null, nDragTree = null, nPh = null, nDrop = null;
function wireNoteDnD(){
  const box = $('#ntList'); if(!box || box.dataset.dnd) return;
  box.dataset.dnd = 1;                      // cây vẽ lại nhiều lần, chỉ gắn một lần rồi bắt theo sự kiện nổi lên
  box.addEventListener('dragstart', e => {
    const el = e.target.closest('.nrow[data-tree]'); if(!el) return;
    nDragId = el.dataset.nid; el.classList.add('drag');
    nDragTree = new Set(nTree(S.notes, S.notes.find(x => x.id === nDragId)).map(x => x.id));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nDragId);
  });
  box.addEventListener('dragend', e => { e.target.closest('.nrow')?.classList.remove('drag'); nDragEnd(); });
  box.addEventListener('dragover', e => {
    if(!nDragId) return;
    e.preventDefault();
    nMark(box, nDropAt(box, e.clientY));
  });
  box.addEventListener('drop', e => {
    e.preventDefault();
    const n = S.notes.find(x => x.id === nDragId), d = nDrop;
    nDragEnd();
    if(!n || (d && d.where === 'no')) return;
    const at = d && S.notes.find(x => x.id === d.id);
    if(!at) nPlace(n, null, null);                       // thả dưới hàng cuối = cấp gốc, cuối danh sách
    else if(d.where === 'into') nPlace(n, at.id, null);
    else if(d.where === 'before') nPlace(n, at.parent, at.id);
    else if(at.open && nKids(at.id).some(x => x !== n))  // hàng đang mở: "sau" nó tức là con đầu tiên
      nPlace(n, at.id, nKids(at.id).filter(x => x !== n)[0].id);
    else { const sib = nKids(at.parent).filter(x => x !== n); nPlace(n, at.parent, sib[sib.indexOf(at) + 1]?.id); }
    save(); renderNotes();
  });
}
// bỏ trang khỏi chỗ cũ rồi đặt vào trước trang before (không có before thì xuống cuối danh sách con của cha mới)
function nPlace(n, parent, before){
  S.notes = S.notes.filter(x => x !== n);
  n.parent = parent;
  const at = before && S.notes.find(x => x.id === before);
  if(at) S.notes.splice(S.notes.indexOf(at), 0, n); else S.notes.push(n);
  if(parent) S.notes.find(x => x.id === parent).open = true;
}
// hàng đầu tiên mà con trỏ chưa đi qua hết, kèm chỗ thả trong hàng đó; null = dưới hàng cuối
function nDropAt(box, y){
  for(const el of box.querySelectorAll('.nrow[data-tree]:not(.drag)')){
    const r = el.getBoundingClientRect();
    if(y >= r.bottom) continue;
    if(nDragTree.has(el.dataset.nid)) return {where:'no'};   // không thả một trang vào trong chính nó
    const p = (y - r.top) / r.height;
    return {id: el.dataset.nid, el, depth: +el.dataset.depth, where: p < .25 ? 'before' : p > .75 ? 'after' : 'into'};
  }
  return null;
}
function nMark(box, d){
  nDrop = d;
  $$('.nrow.into').forEach(el => el.classList.remove('into'));
  if(d && (d.where === 'no' || d.where === 'into')){
    if(nPh) nPh.remove();
    if(d.where === 'into') d.el.classList.add('into');
    return;
  }
  if(!nPh){ nPh = document.createElement('div'); nPh.className = 'drop'; }
  const t = d && d.where === 'after' && S.notes.find(x => x.id === d.id);
  const kid = t && t.open && nKids(t.id).some(x => x.id !== nDragId);   // khe ngay dưới hàng đang mở = con đầu
  // lề dọc âm để vạch không đẩy các hàng xuống, kẻo rê qua một hàng lại giật
  nPh.style.margin = `-1px 8px -1px ${(d ? d.depth + (kid ? 1 : 0) : 0) * 14 + 8}px`;
  if(d) d.el.insertAdjacentElement(d.where === 'before' ? 'beforebegin' : 'afterend', nPh);
  else box.appendChild(nPh);
}
function nDragEnd(){
  nDragId = null; nDragTree = null; nDrop = null;
  if(nPh) nPh.remove(); nPh = null;
  $$('.nrow.into').forEach(el => el.classList.remove('into'));
}
