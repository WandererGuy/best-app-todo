/* ============ bảng việc trong trang: đồng bộ các bản chép, lấy bảng của ngày trước ============ */
// Mỗi bảng mang một mã (bid, xem Kanban trong build/editor.src.js). Chép cả bảng hay lấy bảng ngày trước thì bản mới
// giữ nguyên mã, nên mọi bản cùng mã là một bảng: sửa thẻ hay đổi loại bảng ở đâu cũng ghi sang các bản còn lại, cả trang đang mở
// lẫn trang đã lưu. Chữ gõ dở ở ô thêm của từng cột thì mỗi bản giữ riêng.
const KB_LAST = new Map();      // bid -> JSON [thẻ, loại bảng] mới nhất trong phiên này
const kbKey = b => JSON.stringify([b.cards, b.area || '']);
const KB_SEEN = new WeakMap();  // editor -> Map(bid -> số bản trong trang) ở lần xem trước, để nhận ra bản vừa dán vào
const KB_DAY  = new WeakMap();  // editor -> ngày của trang nhật ký nó đang soạn
const KB_OPEN = ['backlog', 'todo', 'doing', 'key'];   // thẻ ở các cột này là việc chưa xong

const kbParse = html => { const t = document.createElement('template'); t.innerHTML = html || ''; return t; };
const kbCardsOf = el => { try{ const v = JSON.parse(el.getAttribute('data-kanban')); return Array.isArray(v) ? v : []; }catch(e){ return []; } };
// mọi chỗ lưu nội dung có thể chứa bảng: [đối tượng, tên trường]
function kbHolders(){
  const out = [];
  Object.values(S.journal).forEach(pgs => Array.isArray(pgs) && pgs.forEach(p => out.push([p, 'html'])));
  S.notes.forEach(n => out.push([n, 'html']));
  S.tasks.forEach(t => out.push([t, 'note']));
  return out;
}

// gọi sau mỗi lần nội dung trong ed đổi: bảng nào khác bản mới nhất thì ghi bản của nó đi các nơi
let kbSrc = null;
function kbSync(ed){
  // applyData() thay nguyên S khi nạp lại / cửa sổ khác vừa ghi: bản nhớ trong phiên đã cũ hơn dữ liệu mới nạp
  if(kbSrc !== S){ KB_LAST.clear(); kbSrc = S; }
  const groups = new Map();                    // bid -> [JSON [thẻ, loại] của từng bản trong trang]
  TT.kbBoards(ed).forEach(b => { if(b.bid){ if(!groups.has(b.bid)) groups.set(b.bid, []); groups.get(b.bid).push(kbKey(b)); } });
  const seen = KB_SEEN.get(ed) || new Map();
  KB_SEEN.set(ed, new Map([...groups].map(([bid, js]) => [bid, js.length])));
  const out = [];
  groups.forEach((js, bid) => {
    const last = KB_LAST.get(bid);
    if(last === undefined){                    // lần đầu thấy bảng này trong phiên: bản này là mới nhất
      KB_LAST.set(bid, js[0]);
      if(js.some(j => j !== js[0])) out.push([bid, js[0]]);
      return;
    }
    const diff = js.find(j => j !== last); if(diff === undefined) return;
    // có thêm bản vừa xuất hiện (mở trang, dán vào): nó có thể là bản chép cũ, nên kéo nó theo bản mới nhất;
    // còn không thì đây là chỗ vừa sửa
    const next = js.length > (seen.get(bid) || 0) ? last : diff;
    KB_LAST.set(bid, next);
    out.push([bid, next]);
  });
  if(out.length) kbSpread(out, ed);
}
function kbSpread(list, src){
  const want = new Map(list.map(([bid, j]) => [bid, JSON.parse(j)]));
  let dirty = false;
  kbHolders().forEach(([o, f]) => {
    const h = o[f];
    if(!h || !list.some(([bid]) => h.includes(`data-kbid="${bid}"`))) return;
    const t = kbParse(h); let ch = false;
    t.content.querySelectorAll('div[data-kbid]').forEach(el => {
      const w = want.get(el.getAttribute('data-kbid')); if(!w) return;
      const cards = JSON.stringify(w[0]);
      if(el.getAttribute('data-kanban') !== cards){ el.setAttribute('data-kanban', cards); ch = true; }
      if((el.getAttribute('data-kbarea') || '') !== w[1]){
        if(w[1]) el.setAttribute('data-kbarea', w[1]); else el.removeAttribute('data-kbarea');
        ch = true;
      }
    });
    if(ch){ o[f] = t.innerHTML; dirty = true; }
  });
  // trình soạn thảo đang mở; chính ed vừa sửa thì đợi nó xong lượt này (trang có hai bản của cùng một bảng)
  EDS.forEach(ed => {
    const go = () => want.forEach(([cards, area], bid) => TT.kbSet(ed, bid, cards, area));
    if(ed === src) setTimeout(go, 0); else go();
  });
  if(dirty) save();
}

// bảng của ngày k: bảng trong nhật ký mang ngày k, dù nằm ở trang ngày nào (bảng ngày 14 dán sang ngày 15 vẫn tính
// cho ngày 14; bảng được chuyển sang ngày khác thì tính cho ngày mới). Trang của ngày k trước, rồi tới các trang khác;
// trong trang theo thứ tự. Bảng chưa đóng dấu ngày thì tính cho trang chứa nó. Các bản cùng mã chỉ tính một lần.
// stamp = true: bảng chưa có mã thì đóng mã luôn vào trang gốc, để bản sắp dán ra đồng bộ được với nó.
function kbOfDay(k, stamp = false){
  const out = [], seen = new Set();
  const days = [k, ...Object.keys(S.journal).filter(d => d !== k)];
  days.forEach(d => (Array.isArray(S.journal[d]) ? S.journal[d] : []).forEach(p => {
    if(!p.html || !p.html.includes('data-kanban') || (d !== k && !p.html.includes(`data-kbday="${k}"`))) return;
    const t = kbParse(p.html); let ch = false;
    t.content.querySelectorAll('div[data-kanban]').forEach(el => {
      if((el.getAttribute('data-kbday') || d) !== k) return;
      if(stamp && !el.getAttribute('data-kbid')){ el.setAttribute('data-kbid', uid()); ch = true; }
      const bid = el.getAttribute('data-kbid') || '';
      if(bid && seen.has(bid)) return;
      if(bid) seen.add(bid);
      out.push({bid, day: k, cards: kbCardsOf(el), area: el.getAttribute('data-kbarea') || ''});
    });
    if(ch) p.html = t.innerHTML;
  }));
  return out;
}
const kbLeft = list => list.reduce((n, b) => n + b.cards.filter(c => KB_OPEN.includes(c.s)).length, 0);

/* --- lệnh "/Bảng ngày trước": lịch chọn nhiều ngày --- */
// Sáng = có bảng còn việc, tối = có bảng nhưng xong hết, mờ = không có bảng (không chọn được).
// Chọn được ngày của trang và các ngày trước đó (ngày của trang: lấy bảng ở các trang khác cùng ngày).
// Dán: ngày gần nhất trước, bảng đã có trong trang thì bỏ qua.
let kbp = null;                                // {ed, until, month, sel: Set, stat: Map(ngày -> {n, m})}
function kbPickDays(ed){
  closeKbp();
  const until = KB_DAY.get(ed); if(!until) return;
  const el = document.createElement('div'); el.className = 'dp kbp'; el.id = 'kbpEl';
  document.body.appendChild(el);
  const c = TT.caretRect(ed) || {left: 200, top: 200, bottom: 200};
  el.style.left = Math.max(8, Math.min(c.left, innerWidth - 284)) + 'px';
  el.style.top = (c.bottom + 380 > innerHeight ? Math.max(8, c.top - 386) : c.bottom + 8) + 'px';
  const d = new Date(until + 'T00:00:00');
  kbp = {ed, until, el, month: new Date(d.getFullYear(), d.getMonth(), 1), sel: new Set(), stat: new Map()};
  el.addEventListener('mousedown', e => e.preventDefault());   // giữ con trỏ trong trang để dán đúng chỗ
  el.addEventListener('click', kbpClick);
  setTimeout(() => document.addEventListener('pointerdown', kbpOut, true), 0);
  document.addEventListener('keydown', kbpKey, true);
  drawKbp();
}
function closeKbp(){
  if(!kbp) return;
  kbp.el.remove(); kbp = null;
  document.removeEventListener('pointerdown', kbpOut, true);
  document.removeEventListener('keydown', kbpKey, true);
}
const kbpOut = e => { if(kbp && !kbp.el.contains(e.target)) closeKbp(); };
const kbpKey = e => { if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeKbp(); } };
function kbpStat(k){
  if(!kbp.stat.has(k)){ const l = kbOfDay(k); kbp.stat.set(k, {n: l.length, m: kbLeft(l)}); }
  return kbp.stat.get(k);
}
function drawKbp(){
  const M = kbp.month, y = M.getFullYear(), m = M.getMonth();
  const start = new Date(y, m, 1); start.setDate(1 - start.getDay());
  let cells = '';
  for(let i = 0; i < 42; i++){
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = iso(d), st = k <= kbp.until ? kbpStat(k) : {n: 0, m: 0};
    const cls = !st.n ? 'none' : st.m ? 'live' : 'fin';
    cells += `<button class="dpd ${cls}${d.getMonth() !== m ? ' off' : ''}${kbp.sel.has(k) ? ' sel' : ''}"
      ${st.n ? `data-k="${k}" title="${tr('kbp.dayT', {n: st.n, m: st.m})}"` : 'disabled'}>${d.getDate()}</button>`;
  }
  const n = [...kbp.sel].reduce((s, k) => s + kbpStat(k).n, 0);
  kbp.el.innerHTML = `
    <div class="dphd"><button class="dpnav" data-mv="-1">‹</button>
      <b>${tr('cal.monthTitle', {m: m + 1, M: tr(`mon.${m + 1}`), y})}</b><button class="dpnav" data-mv="1">›</button></div>
    <div class="dpg">${DOW.map(d => `<div class="w">${d}</div>`).join('')}${cells}</div>
    <div class="kbpl"><span><i class="live"></i>${tr('kbp.live')}</span><span><i class="fin"></i>${tr('kbp.fin')}</span><span><i class="none"></i>${tr('kbp.none')}</span></div>
    <div class="dpft"><button data-go class="${n ? 'on' : ''}"${n ? '' : ' disabled'}>${n ? tr('kbp.paste', {n}) : tr('kbp.pick')}</button>
      <button data-x>${tr('kbp.cancel')}</button></div>`;
}
function kbpClick(e){
  const b = e.target.closest('button'); if(!b || b.disabled) return;
  if(b.dataset.mv){ kbp.month = new Date(kbp.month.getFullYear(), kbp.month.getMonth() + (+b.dataset.mv), 1); return drawKbp(); }
  if(b.dataset.k){ const k = b.dataset.k; if(kbp.sel.has(k)) kbp.sel.delete(k); else kbp.sel.add(k); return drawKbp(); }
  if(b.hasAttribute('data-x')) return closeKbp();
  if(b.hasAttribute('data-go')){
    const {ed, sel} = kbp; closeKbp();
    const have = new Set(TT.kbBoards(ed).map(x => x.bid).filter(Boolean));
    const boards = [];
    [...sel].sort((a, b) => b.localeCompare(a)).forEach(k => kbOfDay(k, true).forEach(x => {
      if(have.has(x.bid)) return;
      have.add(x.bid);
      // trang gốc đã lưu có thể cũ hơn bản đang mở ở đâu đó trong phiên này
      if(KB_LAST.has(x.bid)) [x.cards, x.area] = JSON.parse(KB_LAST.get(x.bid)); else KB_LAST.set(x.bid, kbKey(x));
      boards.push(x);
    }));
    save();                                    // mã vừa đóng vào bảng gốc
    if(!boards.length) return toast(tr('kbp.dup'));
    TT.kbInsert(ed, boards);
  }
}
