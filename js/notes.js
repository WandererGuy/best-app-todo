/* ============ ghi chú: trang không theo ngày, lồng nhau như Notion ============ */
// S.notes: {id, title, html, parent (id trang cha, null = cấp gốc), tags, pin, open (đang mở trang con ở cây), cr, mod}
// cr / mod = thời điểm tạo / sửa lần cuối (ISO). Thứ tự các trang cùng cha = thứ tự trong mảng.
// Bỏ một trang thì cả cây con sang S.ntrash; chỉ trang được bấm bỏ có trường trashed.
// Cuốn (S.settings.nBooks) ghi ở trang gốc qua cat; trang con đi theo cuốn của trang gốc.
const nKids  = id => S.notes.filter(n => n.parent === id);
const nTitle = n => n.title.trim() ? esc(n.title) : `<span class="ph">${tr('note.untitled')}</span>`;
const nName  = n => esc(n.title.trim() || tr('note.untitled'));
function nRoot(n){
  let r = n, p;
  while(r.parent && (p = S.notes.find(x => x.id === r.parent))) r = p;
  return r;
}
const nBook = n => { const c = nRoot(n).cat; return S.settings.nBooks.some(b => b.id === c) ? c : ''; };
const nBookName = id => S.settings.nBooks.find(b => b.id === id)?.name || tr('book.none');
// còn trang gốc nào chưa thuộc cuốn nào: còn thì mới hiện nút "Chưa phân loại"
const nLoose = () => S.notes.some(n => !n.parent && nBook(n) === '');
// bỏ cuốn = cả cuốn lẫn mọi trang của nó sang S.nbtrash, khôi phục lại thì về nguyên chỗ cũ
function trashNBook(b){
  const notes = S.notes.filter(n => nBook(n) === b.id);
  S.notes = S.notes.filter(n => !notes.includes(n));
  S.settings.nBooks = S.settings.nBooks.filter(x => x !== b);
  S.nbtrash.unshift({id: b.id, trashed: today(), book: {...b}, notes});
}
function restoreNBook(e){
  S.nbtrash = S.nbtrash.filter(x => x !== e);
  if(!S.settings.nBooks.some(b => b.id === e.book.id)) S.settings.nBooks.push(e.book);
  S.notes.push(...e.notes.filter(n => !S.notes.some(x => x.id === n.id)));
  syncTags();
}
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
  if(!parent && ui.nBook) n.cat = ui.nBook;
  const sib = S.notes.find(x => x.parent === parent);   // trang mới lên đầu danh sách cùng cha
  if(sib) S.notes.splice(S.notes.indexOf(sib), 0, n); else S.notes.push(n);
  if(parent) S.notes.find(x => x.id === parent).open = true;
  ui.nOpen = n.id; ui.q = ''; $('#q').value = '';   // bỏ ô tìm để trang mới hiện ở cây
  save(); renderNotes();
  setTimeout(() => ($('#ntTitle') || $('.npane.on .nttl'))?.focus(), 0);
}
function trashNote(id){
  const n = S.notes.find(x => x.id === id); if(!n) return;
  const tree = nTree(S.notes, n);
  const c = nBook(n); if(c) n.cat = c;         // nhớ cuốn: khôi phục mà trang cha đã mất thì về gốc của đúng cuốn này
  S.notes = S.notes.filter(x => !tree.includes(x));
  n.trashed = today(); S.ntrash.unshift(...tree);
  ui.nOpen = n.parent;
  save(); render();
  toast(tree.length > 1 ? tr('note.trashed', {k: tree.length - 1}) : tr('trash.movedTask'));
}

// trang đang mở, nhớ riêng trong trình duyệt này như JPAGE_KEY ở nhật ký: tải lại app vẫn ở đúng trang cũ
const NPAGE_KEY = 'dieukhien.npage';
const NBOOK_KEY = 'dieukhien.nbook';   // cuốn đang mở, cho lần cuốn đó chưa có trang nào để nhớ theo trang
/* chia màn hình (xem splitLoad ở core.js): ids là mã trang, ui.nOpen luôn là trang của ô đang chọn.
   Một trang không mở ở hai ô, vì hai bản cùng sửa sẽ ghi đè nhau. */
const NSPLIT_KEY = 'dieukhien.nsplit';
let nSplit = splitLoad(NSPLIT_KEY);
const nSaveSplit = () => splitSave(NSPLIT_KEY, nSplit);
function nSetSplit(k){
  if(k === nSplit.n) return;
  if(k === 1){
    ui.nOpen = nSplit.ids[nSplit.act] || nSplit.ids.find(Boolean) || null;
    const o = S.notes.find(x => x.id === ui.nOpen); if(o) ui.nBook = nBook(o);   // ô có thể đang giữ trang của cuốn khác
    nSplit = {n:1, ids:[], act:0};
  }
  else { nSplit = splitResize(nSplit, k, ui.nOpen); ui.nOpen = nSplit.ids[nSplit.act]; }
  nSaveSplit(); renderNotes();
}
function renderNotes(){
  const split = nSplit.n > 1;
  if(!ui.nOpen && !split) try{ ui.nOpen = localStorage.getItem(NPAGE_KEY); }catch(e){}
  if(split){
    const ids = nSplit.ids;
    if(ui.nOpen && ui.nOpen !== ids[nSplit.act]){   // vừa có yêu cầu mở trang (bấm cây, link, trang mới…)
      const j = ids.indexOf(ui.nOpen);
      if(j >= 0) nSplit.act = j; else ids[nSplit.act] = ui.nOpen;
    }
    ids.forEach((id, i) => { if(!S.notes.some(x => x.id === id)) ids[i] = null; });   // trang đã bỏ vào thùng rác
    ui.nOpen = ids[nSplit.act];
    nSaveSplit();
  }
  if(ui.nBook == null){
    const o = S.notes.find(x => x.id === ui.nOpen);
    if(o) ui.nBook = nBook(o); else try{ ui.nBook = localStorage.getItem(NBOOK_KEY); }catch(e){}
  }
  const books = S.settings.nBooks;
  if(ui.nBook !== '' && !books.some(b => b.id === ui.nBook)) ui.nBook = books[0]?.id ?? '';
  const inBook = x => nBook(x) === ui.nBook;
  const open = S.notes.find(x => x.id === ui.nOpen);
  // chia màn hình thì không tự chọn trang: ô trống cứ để trống, ô có thể giữ trang của cuốn khác
  if(!split && (!open || !inBook(open))) ui.nOpen = (S.notes.find(x => x.pin && inBook(x)) || S.notes.find(x => !x.parent && inBook(x)) || {}).id || null;
  try{ if(ui.nOpen) localStorage.setItem(NPAGE_KEY, ui.nOpen); localStorage.setItem(NBOOK_KEY, ui.nBook); }catch(e){}
  const n = S.notes.find(x => x.id === ui.nOpen);
  $('#vSub').textContent = tr('note.sub', {n: S.notes.filter(inBook).length});

  // chỉ chuyển vào trang cùng cuốn; sang cuốn khác thì dùng nút ⇄
  const moveTo = n && nFlat(new Set([n.id])).filter(x => x.n.id !== n.parent && inBook(x.n));
  const dest = books.filter(b => b.id !== ui.nBook);
  const side = S.settings.nSide;
  const sideAt = $('.nside')?.scrollTop || 0;   // vẽ lại cả cột trái: giữ chỗ đang cuộn, bấm trang ở dưới không bị nhảy lên đầu
  const head = `<div class="nhead">${bookRowHTML({books, cur: ui.nBook, loose: nLoose()})}${splitCtlHTML(nSplit.n)}</div>`;
  const pane = (id, i) => {
    const p = S.notes.find(x => x.id === id);
    return splitPaneHTML(nSplit, i, p && `<input class="nttl" value="${esc(p.title)}" placeholder="${tr('note.untitled')}" autocomplete="off">`,
      p && `<div class="ned" id="ntHost${i}"></div>`);
  };
  [...EDS.keys()].filter(k => k.startsWith('ntHost')).forEach(closeEd);   // đổi từ 4 ô về 2 thì ô cũ không còn chỗ gắn
  $('#view').innerHTML = `<div class="nwrap${split ? ' split' : ''}">
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
    ${split ? `<div class="nmain">${head}<div class="npanes n${nSplit.n}">${nSplit.ids.map(pane).join('')}</div></div>`
    : `<div class="npage">${head}${n ? `
      ${nPath(n).length ? `<div class="ncrumb">${nPath(n).map(p => `<button data-nid="${p.id}">${nName(p)}</button><span>/</span>`).join('')}</div>` : ''}
      <input class="nttl" id="ntTitle" value="${esc(n.title)}" placeholder="${tr('note.untitled')}" autocomplete="off">
      <div class="nmeta">
        <span class="meta" title="${tr('note.createdAt')}">${tr('note.created', {s: fmtStamp(n.cr)})}</span><span class="meta">·</span>
        <span class="meta" id="ntMod" data-ago="${n.mod}" title="${fmtStamp(n.mod)}">${tr('note.modPre', {a: fmtAgo(n.mod)})}</span>
        <div class="nacts">
          <button class="btn ghost" id="ntPin">${tr(n.pin ? 'note.unpin' : 'note.pin')}</button>
          <button class="btn ghost" id="ntKid">${tr('note.addKid')}</button>
          <button class="btn ghost" id="ntLink" title="${tr('plink.copyT')}">${tr('plink.copy')}</button>
          ${n.parent || moveTo.length ? `<select class="inp nmove" id="ntMove" data-find title="${tr('note.moveT')}">
            <option value="" selected disabled>${tr('note.movePh')}</option>
            ${n.parent ? `<option value="/">${tr('note.moveRoot')}</option>` : ''}
            ${moveTo.map(x => `<option value="${x.n.id}">${'   '.repeat(x.depth)}${nName(x.n)}</option>`).join('')}
          </select>` : ''}
          ${dest.length ? `<button class="btn ghost" id="ntBook" title="${tr('book.movePage')}">⇄ ${tr('note.toBook')}</button>` : ''}
          <button class="danger" id="ntDel">${tr('note.toTrash')}</button>
        </div>
      </div>
      <div class="fld">${tagFieldHTML('ntTag', n.tags, tr('note.tagHint'))}</div>
      <div class="ned" id="ntHost"></div>`
    : `<div class="empty">${tr('note.empty')}</div>`}</div>`}
  </div>`;

  drawNoteList();
  if(side) $('.nside').scrollTop = sideAt;
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
  wireBookRow({books, cur: ui.nBook,
    pick: id => { ui.nBook = id; ui.nOpen = null; renderNotes(); },
    redraw: renderNotes,
    trash: b => { trashNBook(b); ui.nBook = S.settings.nBooks[0].id; ui.nOpen = null; save(); render(); },
    // trang gốc chưa phân loại sang cuốn v, trang con đi theo
    moveAll: v => {
      const k = S.notes.filter(x => nBook(x) === '').length;
      if(!confirm(tr('book.askAll', {n: k, b: nBookName(v)}))) return;
      S.notes.filter(x => !x.parent && nBook(x) === '').forEach(x => x.cat = v);
      ui.nBook = v; ui.nOpen = null; save(); renderNotes();
      toast(tr('book.allDone', {n: k, b: nBookName(v)}));
    }});
  $$('[data-nsp]').forEach(b => b.onclick = () => nSetSplit(+b.dataset.nsp));
  if(split) return wirePanes();
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
  keepPageScroll($('.npage'), n.id);
  $('#ntPin').onclick = () => {
    n.pin = !n.pin;
    S.settings.nPinOrd = S.settings.nPinOrd.filter(id => id !== n.id);   // ghim lại thì lên đầu như trang mới ghim
    save(); renderNotes();
  };
  $('#ntKid').onclick = () => newNote(n.id);
  $('#ntLink').onclick = () => copyPageLink('#n/' + n.id, n.title.trim() || tr('note.untitled'));
  if($('#ntMove')) $('#ntMove').onchange = e => {
    nPlace(n, e.target.value === '/' ? null : e.target.value, null);   // xuống cuối danh sách con của cha mới
    save(); renderNotes();
  };
  // sang cuốn khác thì thành trang gốc ở cuốn đó, trang con đi theo; vẫn ở lại cuốn đang mở để sắp tiếp
  if($('#ntBook')) $('#ntBook').onclick = e => openPick(dest.map(b => ({v: b.id, t: b.name})), e.currentTarget.getBoundingClientRect(), {
    onPick: v => { nPlace(n, null, null); n.cat = v; save(); renderNotes(); toast(tr('book.moved', {n: nBookName(v)})); }});
  $('#ntDel').onclick = () => trashNote(n.id);
  bindTagField($('.npage'), 'ntTag', n.tags,
    t => { if(!n.tags.includes(t)) n.tags.push(t); touch(); render(); setTimeout(() => $('#ntTag')?.focus(), 0); },
    t => { n.tags = n.tags.filter(x => x !== t); touch(); render(); });
}
// các ô khi chia màn hình: mỗi ô chỉ có tiêu đề và trang viết. Ghim, chuyển chỗ, tag, bỏ trang thì về một ô (▢)
function wirePanes(){
  wireSplit(nSplit, {store: nSaveSplit, redraw: renderNotes, add: () => newNote(),
    pick: i => {
      ui.nOpen = nSplit.ids[i];
      try{ if(ui.nOpen) localStorage.setItem(NPAGE_KEY, ui.nOpen); }catch(e){}
      drawNoteList();                              // dòng sáng ở cây theo trang của ô vừa chọn
    }});
  $$('.npane').forEach(el => {
    const i = +el.dataset.npane, p = S.notes.find(x => x.id === nSplit.ids[i]);
    if(!p) return;
    const touch = () => { p.mod = new Date().toISOString(); save(); };
    const ti = el.querySelector('.nttl');
    ti.oninput = () => {
      p.title = ti.value; touch();
      $$(`#ntList [data-nid="${p.id}"] .nname`).forEach(x => x.innerHTML = nTitle(p));
    };
    ti.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); EDS.get('ntHost' + i)?.commands.focus('start'); } };
    mountEd('ntHost' + i, p.html, tr('note.ph'), v => { p.html = v; touch(); });
    keepPageScroll(el, p.id);
  });
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
  return S.notes.filter(n => (!ui.tag || n.tags.includes(ui.tag)) && nBook(n) === ui.nBook)
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
  const row = (n, depth, tree, mark, sec) => {
    const kids = tree ? nKids(n.id) : [];
    return `<div class="nrow${n.id === ui.nOpen ? ' on' : ''}" data-nid="${n.id}"
        ${tree ? `draggable="true" data-tree data-depth="${depth}" title="${tr('note.dragT')}"`
               : `draggable="true" data-sec="${sec}" title="${tr('note.rowAgo', {a: fmtAgo(n.mod)})}"`}
        style="padding-left:${2 + depth * 14}px">
        ${!tree ? `<span class="ncar">${mark}</span>`
          : kids.length ? `<button class="ncar" data-ntog="${n.id}">${n.open ? '▾' : '▸'}</button>` : '<span class="ncar">·</span>'}
        <span class="nname">${nTitle(n)}</span>
        ${tree ? `<button class="nadd" data-nkid="${n.id}" title="${tr('note.addKidT')}">+</button>` : ''}</div>
      ${kids.length && n.open ? kids.map(k => row(k, depth + 1, true)).join('') : ''}`;
  };
  // ba mục đều chỉ lấy trang của cuốn đang mở
  const mine = S.notes.filter(n => nBook(n) === ui.nBook);
  const pins = nOrd(mine.filter(n => n.pin), S.settings.nPinOrd), roots = mine.filter(n => !n.parent);
  const recent = nOrd([...mine].sort((a, b) => b.mod.localeCompare(a.mod)).slice(0, 5), S.settings.nRecOrd);
  // nhãn mục bấm được: thu gọn hay mở nhớ trong settings theo khoá của mục
  const sect = (key, label, body) =>
    `<button class="nlbl" data-nsec="${key}">${tr(label)}<span class="nlcar">${S.settings[key] ? '▾' : '▸'}</span></button>`
    + (S.settings[key] ? body : '');
  box.innerHTML = (pins.length ? sect('nPinned', 'note.pinned', pins.map(n => row(n, 0, false, '★', 'nPinned')).join('')) : '')
    + (recent.length ? sect('nRecent', 'note.recent', recent.map(n => row(n, 0, false, '◷', 'nRecent')).join('')) : '')
    + sect('nAll', 'note.all', roots.length ? roots.map(n => row(n, 0, true)).join('')
        : `<div class="nofil" style="padding:4px 8px">${tr('note.none')}</div>`);
  wireNoteDnD();
}

// mục Đã ghim / Gần đây xếp theo ord (kéo thả); trang chưa có trong ord (mới ghim, mới sửa) lên đầu
const N_ORD = {nPinned: 'nPinOrd', nRecent: 'nRecOrd'};
function nOrd(list, ord){
  const i = n => ord.indexOf(n.id);
  return [...list.filter(n => i(n) < 0), ...list.filter(n => i(n) >= 0).sort((a, b) => i(a) - i(b))];
}

/* ============ kéo thả: đổi thứ tự trang, hoặc thả vào trang khác thành trang con ============ */
// Ở mục Đã ghim / Gần đây (nDragSec) thì chỉ đổi thứ tự trong mục đó, không đụng tới cây.
// Trỏ vào mép trên / mép dưới một hàng thì thành khe chèn trước / sau hàng ấy (hiện vạch);
// trỏ vào giữa hàng thì thành trang con, xuống cuối danh sách con của nó (hàng sáng viền).
// Thả dưới hàng cuối cùng thì về cấp gốc. Chỉ làm ở chế độ cây, lúc đang tìm hay lọc tag thì thôi.
let nDragId = null, nDragTree = null, nPh = null, nDrop = null, nDragSec = null;
function wireNoteDnD(){
  const box = $('#ntList'); if(!box || box.dataset.dnd) return;
  box.dataset.dnd = 1;                      // cây vẽ lại nhiều lần, chỉ gắn một lần rồi bắt theo sự kiện nổi lên
  box.addEventListener('dragstart', e => {
    const fl = e.target.closest('.nrow[data-sec]');
    if(fl){
      nDragId = fl.dataset.nid; nDragSec = fl.dataset.sec; fl.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', nDragId);
      return;
    }
    const el = e.target.closest('.nrow[data-tree]'); if(!el) return;
    nDragId = el.dataset.nid; el.classList.add('drag');
    nDragTree = new Set(nTree(S.notes, S.notes.find(x => x.id === nDragId)).map(x => x.id));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nDragId);
  });
  box.addEventListener('dragend', e => { e.target.closest('.nrow')?.classList.remove('drag'); nDragEnd(); });
  box.addEventListener('dragover', e => {
    if(!nDragId) return;
    if(nDragSec){
      const d = nFlatAt(box, e.clientY);
      if(d) e.preventDefault();               // ra ngoài mục đang kéo thì không thả được
      return nMarkFlat(d);
    }
    e.preventDefault();
    nMark(box, nDropAt(box, e.clientY));
  });
  box.addEventListener('drop', e => {
    e.preventDefault();
    if(nDragSec){
      const sec = nDragSec, id = nDragId, d = nDrop;
      nDragEnd();
      if(!d || d.id === id) return;
      const ids = [...box.querySelectorAll(`.nrow[data-sec="${sec}"]`)].map(el => el.dataset.nid).filter(x => x !== id);
      ids.splice(ids.indexOf(d.id) + (d.where === 'after' ? 1 : 0), 0, id);
      S.settings[N_ORD[sec]] = ids;
      save(); return drawNoteList();
    }
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
// Thành trang gốc thì ghi cuốn đang theo vào cat, để không rơi sang "Chưa phân loại".
function nPlace(n, parent, before){
  const c = nBook(n);
  S.notes = S.notes.filter(x => x !== n);
  n.parent = parent;
  if(!parent){ if(c) n.cat = c; else delete n.cat; }
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
// khe chèn trong mục đang kéo: trước hàng có nửa dưới chưa bị con trỏ vượt qua, hoặc sau hàng cuối; null = ra ngoài mục
function nFlatAt(box, y){
  const rows = [...box.querySelectorAll(`.nrow[data-sec="${nDragSec}"]`)];
  if(!rows.length) return null;
  const last = rows[rows.length - 1];
  if(y < rows[0].getBoundingClientRect().top - 8 || y > last.getBoundingClientRect().bottom + 8) return null;
  for(const el of rows){ const r = el.getBoundingClientRect(); if(y < r.top + r.height / 2) return {id: el.dataset.nid, el, where: 'before'}; }
  return {id: last.dataset.nid, el: last, where: 'after'};
}
function nMarkFlat(d){
  nDrop = d;
  if(!d){ if(nPh) nPh.remove(); return; }
  if(!nPh){ nPh = document.createElement('div'); nPh.className = 'drop'; }
  nPh.style.margin = '-1px 8px';
  d.el.insertAdjacentElement(d.where === 'before' ? 'beforebegin' : 'afterend', nPh);
}
function nDragEnd(){
  nDragId = null; nDragTree = null; nDrop = null; nDragSec = null;
  if(nPh) nPh.remove(); nPh = null;
  $$('.nrow.into').forEach(el => el.classList.remove('into'));
}
