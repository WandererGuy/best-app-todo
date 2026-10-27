/* ============ ghi chú nhanh (scratchpad): widget nổi ở mọi trang ============ */
// Ghi chú nhanh nằm ở mục Ghi chú theo cây Scratchpad → trang ngày "2026-10-16" → "2026-10-16 14:32" (giờ tạo),
// nên ở trang Ghi chú cũng thấy, sửa, tìm được. Widget mở các ghi chú thành tab như VS Code (tab tự xuống hàng):
// đóng tab có chữ chỉ là thôi hiện; đóng tab trống thì xoá luôn ghi chú đó cho khỏi đọng nháp rác.
// Nhớ trong S.settings: qn = id trang Scratchpad, qnTabs = các tab đang mở (theo thứ tự), qnCur = tab đang xem.
const QN_HOST = 'qnHost';
const QN_DAY = /^\d{4}-\d\d-\d\d$/;
let qnOn = false;
const qnNow = () => new Date().toISOString();
const qnPage = (title, parent) => ({id:uid(), title, html:'', parent, tags:[], pin:false, open:true, cr:qnNow(), mod:qnNow()});
function qnRoot(){
  let r = S.notes.find(n => n.id === S.settings.qn);
  if(!r){                                         // chưa có, hoặc đã bị bỏ vào thùng rác: dựng trang mới
    r = {...qnPage('Scratchpad', null), pin:true, cat:S.settings.nBooks[0]?.id};   // vào cuốn đầu danh sách
    S.notes.unshift(r); S.settings.qn = r.id; save();
  }
  return r;
}
// trang ngày d dưới Scratchpad; chưa có thì tạo, ngày mới nhất lên đầu
function qnDay(d){
  const root = qnRoot();
  let f = S.notes.find(n => n.parent === root.id && n.title === d);
  if(!f){
    f = qnPage(d, root.id);
    const sib = S.notes.find(n => n.parent === root.id);
    if(sib) S.notes.splice(S.notes.indexOf(sib), 0, f); else S.notes.push(f);
  }
  return f;
}
const qnDays = () => { const id = qnRoot().id; return S.notes.filter(n => n.parent === id && QN_DAY.test(n.title)); };
// mọi ghi chú nhanh (trang con của các trang ngày), mới nhất trước
function qnKids(){
  const days = new Set(qnDays().map(n => n.id));
  return S.notes.filter(n => days.has(n.parent)).sort((a, b) => (b.cr || '').localeCompare(a.cr || ''));
}
// ghi chú nằm thẳng dưới Scratchpad (cách xếp cũ, hoặc kéo vào ở trang Ghi chú): dời vào trang ngày tạo ra nó
function qnTidy(){
  const root = qnRoot();
  const loose = S.notes.filter(n => n.parent === root.id && !QN_DAY.test(n.title));
  loose.forEach(n => { n.parent = qnDay(iso(new Date(n.cr || Date.now()))).id; });
  // trang ngày mới nhất lên đầu, ghi chú trong một ngày theo giờ tạo (cũ trước): trang Ghi chú xếp trang con
  // theo thứ tự trong mảng chứ không theo tên, nên các bản cũ chèn lên đầu / xuống cuối từng để lẫn lộn
  const sortIn = (kids, cmp) => {
    const at = kids.map(n => S.notes.indexOf(n)), sorted = [...kids].sort(cmp);
    let moved = false;
    at.forEach((p, i) => { if(S.notes[p] !== sorted[i]){ S.notes[p] = sorted[i]; moved = true; } });
    return moved;
  };
  // dọn nháp rác: ghi chú nhanh hoàn toàn trống mà không đang mở thành tab thì xoá, trang ngày thành trống cũng xoá
  const open = new Set(S.settings.qnTabs || []);
  const dayIds = new Set(qnDays().map(n => n.id));
  const empty = n => !hasText(n.html) && !S.notes.some(x => x.parent === n.id);
  const junk = new Set(S.notes.filter(n => dayIds.has(n.parent) && !open.has(n.id) && empty(n)));
  if(junk.size) S.notes = S.notes.filter(n => !junk.has(n));
  const bare = new Set(qnDays().filter(empty));
  if(bare.size) S.notes = S.notes.filter(n => !bare.has(n));
  const days = qnDays();
  let moved = junk.size + bare.size > 0;
  moved = sortIn(days, (a, b) => b.title.localeCompare(a.title)) || moved;
  days.forEach(d => { moved = sortIn(S.notes.filter(n => n.parent === d.id), (a, b) => (a.cr || '').localeCompare(b.cr || '')) || moved; });
  if(loose.length || moved) save();
}
// tab còn hợp lệ: ghi chú vẫn còn và vẫn nằm trong Scratchpad
function qnTabs(){
  const kids = new Set(qnKids().map(n => n.id));
  return (S.settings.qnTabs || []).filter(id => kids.has(id));
}
function qnSet(tabs, cur){ S.settings.qnTabs = tabs; S.settings.qnCur = cur; save(); }
// tên mặc định: ngày + giờ tạo ("2026-10-16 14:32"), nhìn là nhớ ghi lúc nào; trùng phút thì thêm " (2)", " (3)"…
function qnNew(){
  const d = today(), day = qnDay(d), base = `${d} ${new Date().toTimeString().slice(0, 5)}`;
  const taken = new Set(S.notes.filter(n => n.parent === day.id).map(n => n.title));
  let title = base;
  for(let k = 2; taken.has(title); k++) title = `${base} (${k})`;
  const n = {...qnPage(title, day.id), open:false};
  S.notes.push(n);                                // cuối mảng = cuối danh sách con của trang ngày, theo giờ tạo
  day.open = true; qnRoot().open = true;
  qnSet([...qnTabs(), n.id], n.id);
  qnDraw(true);
}
// đóng tab; ghi chú trống thì xoá hẳn (và trang ngày nếu nó cũng thành trống)
function qnClose(id){
  const tabs = qnTabs(), i = tabs.indexOf(id), rest = tabs.filter(x => x !== id);
  const wasCur = S.settings.qnCur === id;
  const n = S.notes.find(x => x.id === id);
  if(n && !hasText(n.html) && !S.notes.some(x => x.parent === n.id)){
    S.notes = S.notes.filter(x => x !== n);
    const day = S.notes.find(x => x.id === n.parent);
    if(day && QN_DAY.test(day.title) && !hasText(day.html) && !S.notes.some(x => x.parent === day.id))
      S.notes = S.notes.filter(x => x !== day);
  }
  qnSet(rest, wasCur ? rest[Math.min(i, rest.length - 1)] : S.settings.qnCur);
  if(!rest.length && !qnKids().length) return qnToggle(false);   // đóng hết, không còn ghi chú nào: cất widget
  qnDraw(wasCur);
}
function qnToggle(on = !qnOn){
  qnOn = on;
  if(on) qnBig(!!S.settings.qnBig);               // S.settings chỉ có sau khi nạp dữ liệu, lúc tải file này thì chưa
  $('#qn').classList.toggle('on', on);
  $('#qnBtn').classList.toggle('on', on);
  $('#qnBtn').textContent = on ? '✕' : '✎';      // như nút chat: đang mở thì bấm lại để đóng
  if(on){ qnTidy(); return qnDraw(true); }
  closeEd(QN_HOST); closeSlash(); hideFtb();
  if(ui.view === 'notes') renderNotes();          // trang Ghi chú đang mở có thể là chính ghi chú vừa sửa ở widget
}
// vẽ thanh tab; mount = dựng lại ô soạn thảo cho tab đang xem (đổi tab, mở widget, tạo ghi chú mới)
function qnDraw(mount){
  let tabs = qnTabs(), cur = S.settings.qnCur;
  if(!tabs.length){                               // chưa mở tab nào: mở ghi chú mới nhất, chưa có ghi chú nào thì tạo
    const last = qnKids()[0];
    if(!last) return qnNew();
    tabs = [last.id];
  }
  if(!tabs.includes(cur)) cur = tabs[tabs.length - 1];
  if(cur !== S.settings.qnCur || tabs.length !== (S.settings.qnTabs || []).length) qnSet(tabs, cur);
  const byId = id => S.notes.find(n => n.id === id);
  $('#qnTabs').innerHTML = tabs.map(id => {
    const n = byId(id);
    return `<div class="qntab${id === cur ? ' on' : ''}" data-qt="${id}" title="${nName(n)} · ${tr('qn.renT')}">
      <span>${nName(n)}</span><button class="qnx" data-qx="${id}" title="${tr(hasText(n.html) ? 'qn.closeTab' : 'qn.closeDel')}">✕</button></div>`;
  }).join('');
  if(!mount) return;
  const id = cur;
  mountEd(QN_HOST, byId(id).html, tr('qn.ph'), v => {
    const n = byId(id); if(!n) return;            // tra lại mỗi lần: nạp bản mới từ server là S được thay cả
    const was = hasText(n.html);
    n.html = v; n.mod = qnNow(); save();
    if(was !== hasText(v)) qnDraw(false);         // tab vừa có chữ / vừa trống: đổi lời nhắc trên nút ✕
  });
  // đặt con trỏ vào ghi chú, trừ khi vừa bấm đúp tab để đổi tên (cú bấm đầu đổi tab, cú thứ hai mở ô đổi tên)
  setTimeout(() => { if(!$('.qnren')) EDS.get(QN_HOST)?.commands.focus('end'); }, 0);
}
// danh sách mọi ghi chú nhanh để mở lại thành tab (tab đang mở có dấu ✓)
function qnMenu(){
  const old = $('#qnMenu'); if(old) return old.remove();
  const tabs = qnTabs();
  const el = document.createElement('div');
  el.id = 'qnMenu'; el.className = 'qnmenu';
  const kids = qnKids();
  el.innerHTML = kids.length ? kids.map(n => `<button data-qo="${n.id}">${tabs.includes(n.id) ? '✓ ' : ''}${nName(n)}
      <span>${fmtAgo(n.mod)}</span></button>`).join('') : `<div class="none">${tr('qn.none')}</div>`;
  $('#qn').appendChild(el);
}
function qnRename(tab){
  const id = tab.dataset.qt, n = S.notes.find(x => x.id === id), sp = tab.querySelector('span');
  const inp = document.createElement('input');
  inp.className = 'qnren'; inp.value = n.title;
  sp.replaceWith(inp);
  // cú bấm đầu của cú bấm đúp vừa đổi tab, TipTap đặt con trỏ vào ghi chú trễ một khung hình:
  // đợi qua khung hình đó rồi mới lấy con trỏ, kẻo ô đổi tên vừa hiện đã bị giành mất
  requestAnimationFrame(() => requestAnimationFrame(() => { if(inp.isConnected){ inp.focus(); inp.select(); } }));
  let done = false;
  const end = ok => {
    if(done) return; done = true;
    if(ok && inp.value.trim()){ n.title = inp.value.trim(); n.mod = qnNow(); save(); }
    qnDraw(false);
  };
  inp.onkeydown = e => {
    if(e.key === 'Enter'){ e.preventDefault(); end(true); }
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); end(false); }
  };
  inp.onblur = () => end(true);
}

$('#qnBtn').onclick = () => qnToggle();
// Mở rộng: phóng widget ngay tại chỗ, to bằng khung ghi chú ở trang Ghi chú (vùng nội dung #view, trừ lề 20px của nó),
// đáy dừng trên nút tròn; bấm lần nữa để thu lại; nhớ lần sau mở vẫn như vậy
// Khung ghi chú = phần bên phải cột danh sách 260px + khe 16px, trong khối tối đa 1400px nằm giữa (.nwrap ở style.css).
// Đang ở trang Ghi chú thì lấy luôn khung thật; trang khác thì tính theo cùng công thức.
function qnFit(){
  const el = $('#qn'); if(!el.classList.contains('big')) return;
  const v = $('#view'), r = v.getBoundingClientRect(), page = v.querySelector('.npage');
  let left, right;
  if(page){ const p = page.getBoundingClientRect(); left = p.left; right = p.right; }
  else {
    const inL = r.left + 20, inR = r.left + v.clientWidth - 20;    // clientWidth không tính thanh cuộn
    const w = Math.min(inR - inL, 1400), wl = inL + (inR - inL - w) / 2;
    left = wl + (w > 700 ? 276 : 0); right = wl + w;               // hẹp quá thì như trang Ghi chú: không còn cột danh sách
  }
  el.style.setProperty('--qt', r.top + 20 + 'px');
  el.style.setProperty('--ql', left + 'px');
  el.style.setProperty('--qr', Math.max(16, innerWidth - right) + 'px');
}
addEventListener('resize', qnFit);
function qnBig(on){
  $('#qn').classList.toggle('big', on);
  qnFit();
  $('#qnGo').innerHTML = on ? `↙ <span>${tr('qn.smallS')}</span>` : `↗ <span>${tr('qn.goS')}</span>`;
  $('#qnGo').title = tr(on ? 'qn.small' : 'qn.go');
}
qnBig(!!S.settings.qnBig);
$('#qnGo').onclick = () => {
  S.settings.qnBig = !S.settings.qnBig; save();
  qnBig(S.settings.qnBig);
  EDS.get(QN_HOST)?.commands.focus();
};
$('#qn').addEventListener('click', e => {
  const t = e.target;
  if(!t.closest('#qnMenu, #qnList')) $('#qnMenu')?.remove();
  const x = t.closest('[data-qx]');
  if(x) return qnClose(x.dataset.qx);
  const tab = t.closest('[data-qt]');
  if(tab && !t.closest('.qnren') && tab.dataset.qt !== S.settings.qnCur){ qnSet(qnTabs(), tab.dataset.qt); return qnDraw(true); }
  if(t.closest('#qnAdd')) return qnNew();
  if(t.closest('#qnList')) return qnMenu();
  const op = t.closest('[data-qo]');
  if(op){
    const tabs = qnTabs();
    qnSet(tabs.includes(op.dataset.qo) ? tabs : [...tabs, op.dataset.qo], op.dataset.qo);
    $('#qnMenu')?.remove(); return qnDraw(true);
  }
});
// bấm đúp tab chưa chọn: cú bấm đầu đã đổi tab và vẽ lại thanh tab, nên dblclick không còn trỏ vào tab cũ;
// lấy tab đang nằm dưới con trỏ thay vì e.target
$('#qn').addEventListener('dblclick', e => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const tab = el && el.closest('#qnTabs [data-qt]');
  if(tab && !el.closest('[data-qx], .qnren')) qnRename(tab);
});
// Alt+N: mở / đóng widget ở bất kỳ trang nào. Tab mới: Alt+T, hoặc Ctrl+N khi widget đang mở
// (trong tab Chrome thường, Ctrl+N luôn mở cửa sổ Chrome mới, trang web không chặn được; mở app thành cửa sổ riêng thì có thể dùng được)
document.addEventListener('keydown', e => {
  const k = e.code, ctrl = e.ctrlKey || e.metaKey;
  if(e.altKey && !ctrl && !e.shiftKey && k === 'KeyN'){ e.preventDefault(); return qnToggle(); }
  if((e.altKey && !ctrl && !e.shiftKey && k === 'KeyT') || (qnOn && ctrl && !e.altKey && !e.shiftKey && k === 'KeyN')){
    e.preventDefault();
    if(!qnOn){ qnToggle(true); if(qnKids().length <= 1 && !hasText(qnKids()[0]?.html)) return; }   // vừa mở đã tự tạo tab trống thì thôi
    qnNew();
  }
});
