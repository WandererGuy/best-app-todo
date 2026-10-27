/* ============ hằng số ============ */
const AREAS = {work:{n:tr('area.work'),c:'#3b82f6'}, life:{n:tr('area.life'),c:'#a855f7'}, other:{n:tr('area.other'),c:'#64748b'}};
const PRIOS = {low:{n:tr('prio.low'),c:'#22c55e'}, med:{n:tr('prio.med'),c:'#f59e0b'}, high:{n:tr('prio.high'),c:'#f43f5e'}};
const COLS  = {todo:{n:tr('col.todo'),c:'#64748b'}, doing:{n:tr('col.doing'),c:'#6366f1'}, done:{n:tr('col.done'),c:'#22c55e'}};
// "Để sau": việc chưa cam kết làm — không lên bảng, lịch, nhắc việc, thống kê
const STATUSES = {backlog:{n:tr('status.backlog'),c:'#94a3b8'}, ...COLS};
const SCOPES = {today:tr('scope.today'), week:tr('scope.week'), month:tr('scope.month'), all:tr('scope.all')};
const DUES   = {over:tr('due.over'), today:tr('due.today'), none:tr('due.none')};
const DONE_MAX = 10;   // số task hiện sẵn ở cột Xong
const SORTS  = {manual:tr('sort.manual'), prio:tr('sort.prio'), group:tr('sort.group')};
const PRIO_ORDER = ['high', 'med', 'low'];
const DOW   = Array.from({length:7}, (_, i) => tr(`dow.${i}`));
// thói quen: good = việc muốn giữ, bad = việc muốn bỏ (tick = hôm nay đã dùng hành vi thay thế)
const HKINDS = {good:{n:tr('hkind.good'), c:'#22c55e'}, bad:{n:tr('hkind.bad'), c:'#f43f5e'}};
const HWEEKS = 12;   // số tuần hiện trên lưới theo dõi thói quen
// câu mừng theo mốc chuỗi; 66 là số ngày trung bình để một hành vi thành tự động (Lally, 2010)
const HMARKS = Object.fromEntries([1, 3, 7, 14, 21, 30, 66, 100].map(n => [n, tr(`hmark.${n}`)]));
// tập trung (pomodoro): 3 pha của đồng hồ và cài đặt mặc định.
// look: nền toàn màn hình theo pha — màu c, ảnh img (mã trong kho ảnh), độ rõ ảnh op (%), lớp phủ dim (âm = sáng, dương = tối)
const FPHASE = {work:tr('fphase.work'), short:tr('fphase.short'), long:tr('fphase.long')};
const FCFG = {work:40, short:10, long:15, every:3, buffer:20, auto:false,
  qmax:3, confirmSw:true, pauseAsk:2,
  goal:2, miss:1, weekend:true,
  askRate:true, askNext:true,
  look:{work:{c:'#ec4899', img:null, op:76, dim:47}, short:{c:'#7dd3fc', img:null, op:70, dim:35},
        long:{c:'#a3e635', img:null, op:70, dim:35}},
  sound:true, vol:60, notify:true, tabTitle:true};
const KEY   = 'dieukhien.v1';
// cuốn mặc định; hàm chứ không phải hằng để nhật ký và ghi chú mỗi bên có một mảng riêng, sửa bên này không lây bên kia
function books0(){ return [{id:'work', name:tr('book.work')}, {id:'life', name:tr('book.life')}, {id:'grow', name:tr('book.grow')}]; }
// cài đặt mặc định cho người mới mở app lần đầu. Sửa ở đây là đổi mặc định cho mọi bản clone;
// người đã dùng rồi thì giá trị trong file dữ liệu vẫn được giữ, không bị đè.
const SETTINGS = {sort:'group', scope:'week', zen:false, calMode:'month', fcM:'week', doneToday:false,
  nSide:true, nPinned:true, nRecent:true, nAll:true, jSide:true,   // cột trái đang hiện: nSide (ghi chú) / jSide (nhật ký); nPinned / nRecent / nAll = ba mục trong cột ghi chú đang mở
  nPinOrd:[], nRecOrd:[],    // thứ tự kéo thả trong mục Đã ghim / Gần đây (mã trang)
  jBooks:books0(), nBooks:books0()};   // các cuốn của nhật ký / ghi chú, mỗi bên một danh sách riêng (xem bookRowHTML)
// trang đang xem, nhớ riêng trong trình duyệt này để tải lại trang vẫn ở nguyên chỗ cũ.
// 'new' (form tạo task) và 'tags' là trang tạm nên không nhớ.
const VIEW_KEY = 'dieukhien.view';
const KEEP_VIEWS = ['board','life','backlog','habits','focus','plan','cal','journal','notes','dash','trash'];
const keptView = () => {
  try{ const v = localStorage.getItem(VIEW_KEY); return KEEP_VIEWS.includes(v) ? v : 'board'; }catch(e){ return 'board'; }
};
// khung giờ: bước 30 phút; nhắc trước tính bằng phút, 0 = không nhắc
const TIMES   = Array.from({length:48}, (_, i) => `${String(i >> 1).padStart(2,'0')}:${i % 2 ? '30' : '00'}`);
const DURS    = [15, 30, 45, 60, 90, 120, 180, 240];
const REMINDS = Object.fromEntries([0, 5, 10, 15, 30, 60, 1440].map(n => [n, tr(`remind.${n}`)]));
// lịch trình trong ngày (xem plan.js): khối đời sống nối tiếp nhau, không phải event rời như task.
// bước 15 phút chứ không 30 như TIMES, vì mốc thật hay lệch 15 phút.
const PSTEP  = 15;
const PKINDS = {sleep:{n:tr('pkind.sleep'),c:'#4f46e5'}, self:{n:tr('pkind.self'),c:'#10b981'}, move:{n:tr('pkind.move'),c:'#64748b'},
                work:{n:tr('pkind.work'),c:'#3b82f6'}, eat:{n:tr('pkind.eat'),c:'#f59e0b'}, rest:{n:tr('pkind.rest'),c:'#a855f7'}};
// mẫu lịch trình: [giờ đầu, giờ cuối, loại, tên]. Đây chỉ là mẫu khởi đầu cho người mới:
// sửa thẳng trên trang Lịch trình rồi bấm "Lưu thành mẫu mới" để có mẫu của riêng mình.
const PTPL = {
  [tr('ptpl.weekday')]: [
    ['00:00','07:00','sleep',tr('ptpl.sleep')],
    ['07:00','08:00','self',tr('ptpl.wake')],
    ['08:00','08:30','move',tr('ptpl.commuteIn')],
    ['08:30','12:00','work',tr('ptpl.work')],
    ['12:00','13:00','eat',tr('ptpl.lunch')],
    ['13:00','17:30','work',tr('ptpl.work')],
    ['17:30','18:00','move',tr('ptpl.commuteOut')],
    ['18:00','19:00','self',tr('ptpl.exercise')],
    ['19:00','19:45','eat',tr('ptpl.dinner')],
    ['19:45','22:00','rest',tr('ptpl.free')],
    ['22:00','22:30','self',tr('ptpl.winddown')],
    ['22:30','24:00','sleep',tr('ptpl.sleep')],
  ],
};
// mẫu mặc định cho từng thứ, theo thứ tự DOW (0 = CN). Ngày mới mở lấy mẫu của thứ đó.
const PDOW = Array(7).fill(tr('ptpl.weekday'));
const PVER = 2;   // v1 chỉ có 2 mẫu và chưa có dow
const pNorm = (p = {}) => {
  const tpl = Object.keys(p.tpl || {}).length ? {...p.tpl} : structuredClone(PTPL);
  // nâng cấp một lần: thêm các mẫu mặc định còn thiếu rồi đánh dấu đã nâng, nên mẫu
  // người dùng tự xoá về sau không sống lại ở lần mở app kế tiếp
  if((p.v || 1) < PVER)
    Object.entries(PTPL).forEach(([k, v]) => { if(!tpl[k]) tpl[k] = structuredClone(v); });
  // mọi tên trong dow / last phải trỏ vào mẫu còn tồn tại, không thì dồn về mẫu đầu tiên
  const fb = Object.keys(tpl)[0];
  const dow = (Array.isArray(p.dow) && p.dow.length === 7 ? p.dow : PDOW).map(n => tpl[n] ? n : fb);
  // bảng thực tế và mốc cố định đã bỏ: dọn ngay lúc nạp, không để sót ở những ngày lâu không mở
  const days = Object.fromEntries(Object.entries(p.days || {}).map(([k, {tt, ...d}]) =>
    [k, {...d, kv: (d.kv || []).map(({an, ...s}) => s)}]));
  Object.values(tpl).forEach(segs => segs.forEach(s => { if(s.length > 4) s.length = 4; }));
  return {v:PVER, tpl, days, last: tpl[p.last] ? p.last : fb, dow};
};
// bảng màu tag: mỗi hàng một độ đậm, mỗi cột một sắc (đỏ → xám)
const TAG_PAL = [
  ['#fca5a5','#fdba74','#fcd34d','#fde047','#bef264','#86efac','#6ee7b7','#5eead4','#67e8f9','#7dd3fc','#93c5fd','#a5b4fc','#c4b5fd','#d8b4fe','#f0abfc','#f9a8d4','#fda4af','#cbd5e1'],
  ['#f87171','#fb923c','#fbbf24','#facc15','#a3e635','#4ade80','#34d399','#2dd4bf','#22d3ee','#38bdf8','#60a5fa','#818cf8','#a78bfa','#c084fc','#e879f9','#f472b6','#fb7185','#94a3b8'],
  ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#10b981','#14b8a6','#06b6d4','#0ea5e9','#3b82f6','#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899','#f43f5e','#64748b'],
  ['#dc2626','#ea580c','#d97706','#ca8a04','#65a30d','#16a34a','#059669','#0d9488','#0891b2','#0284c7','#2563eb','#4f46e5','#7c3aed','#9333ea','#c026d3','#db2777','#e11d48','#475569'],
];

// chuẩn hoá S.focus (xem focus.js) — nằm ở đây vì S bên dưới gọi nó ngay lúc tải trang
function fNorm(f = {}){
  const cfg = {...FCFG, ...f.cfg};
  ['wN', 'wWhat', 'mN', 'mWhat'].forEach(k => delete cfg[k]);   // mốc phần thưởng cũ, đã bỏ
  cfg.look = Object.fromEntries(Object.keys(FPHASE).map(p => [p, {...FCFG.look[p], ...(f.cfg?.look || {})[p]}]));
  return {cfg, queue:f.queue || [], run:f.run || null, next:f.next || 'work', cycle:f.cycle || 0,
          log:f.log || [], rev:f.rev || null, tree:f.tree || 'pine'};
}

/* ============ trạng thái ============ */
let S = {tasks:[], trash:[], tags:{}, journal:{}, jtrash:[], notes:[], ntrash:[], nbtrash:[], habits:[], settings:{...SETTINGS}, notis:[], focus:fNorm(), plan:pNorm()};   // tags: {tên: màu}; notis: nhắc việc đã bắn; trash: task đã bỏ (có thêm trường trashed); notes / ntrash: ghi chú và ghi chú đã bỏ; nbtrash: cuốn ghi chú đã bỏ (kèm trang); jtrash: trang / cuốn nhật ký đã bỏ; focus: xem mục tập trung
// bf: bộ lọc của bảng việc / bảng cuộc sống — prio: các mức ưu tiên đang chọn, due: mốc hạn, area: mảng (chỉ bảng việc); bfOpen: đang mở bảng lọc
let ui = {view: keptView(), bf:{prio:[], due:null, area:null}, bfOpen:false, tag:null, q:'', scope:'today',
          open:null, calD:null, calMode:'month', jDate:null, jTab:0, jBook:null, sDate:null, doneAll:false, nOpen:null, nBook:null,
          hEdit:null, hPop:null,
          // lịch trình: pDate = ngày đang xem, pOpen = id khối đang mở panel sửa
          pDate:null, pOpen:null,
          // tập trung: fRev = điểm / ghi chú gõ dở của phiên vừa xong,
          // fCheer = các câu mừng đang hiện, fFull = đang toàn màn hình, fCfg = đang mở cài đặt
          fRev:{rate:0, next:''}, fCheer:null, fPop:false, fFull:false, fCfg:false};
// bộ lọc bảng việc và tag đang lọc: nhớ vào settings để tải lại trang vẫn giữ nguyên, như scope
const saveFil = () => { S.settings.bf = {...ui.bf, prio:[...ui.bf.prio]}; S.settings.tag = ui.tag; save(); };
const loadFil = () => {
  const b = S.settings.bf;
  if(b) ui.bf = {prio: (b.prio || []).filter(x => PRIOS[x]), due: DUES[b.due] ? b.due : null,
                 area: AREAS[b.area] ? b.area : null};
  ui.tag = S.tags[S.settings.tag] ? S.settings.tag : null;
};

let nf = null;                 // dữ liệu form tạo task
let lastSave = null;           // thời điểm lưu gần nhất
let storageOK = true;          // trình duyệt có cho lưu không

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const esc = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
// Bỏ dấu rồi về chữ thường, để gõ "ghi chu" vẫn ra "Ghi chú".
// Thay từng ký tự một nên chuỗi trả về giữ nguyên độ dài, miễn là chuỗi vào đã chuẩn NFC: vị trí khớp
// trên bản bỏ dấu cũng là vị trí trên bản gốc (bên tìm kiếm dựa vào đó để tô sáng đoạn trích).
// Bước cuối gộp y về i cho các cặp viết hai kiểu: lí/lý, kĩ/kỹ, mĩ/mỹ, hi/hy. Chỉ gộp khi y đứng
// một mình làm nguyên âm — y sau nguyên âm là vần khác hẳn nên để nguyên (tay ≠ tai, quy ≠ qui).
const fold = s => String(s).normalize('NFC').replace(/[^\x00-\x7f]/g, c => {
  const d = c.normalize('NFD');
  return d[0] === 'đ' ? 'd' : d[0] === 'Đ' ? 'D' : d.length > 1 && /[a-zA-Z]/.test(d[0]) ? d[0] : c;
}).toLowerCase().replace(/(^|[^aeiouy])y/g, '$1i');
/* --- tìm kiếm: phần dùng chung cho trang ghi chú (notes.js) và nhật ký (journal.js) ---
   Mỗi bên tự giữ bản đã bỏ dấu của mình rồi gọi xuống đây để cắt đoạn trích và tô sáng.
   Quy ước của "entry": {raw, b} — raw là chữ gốc dạng NFC, b là fold(raw), hai chuỗi cùng độ dài. */
const NQ_SNIP = 130;                             // số ký tự của đoạn trích hiện dưới mỗi kết quả
const nqToks = q => fold(q).split(/\s+/).filter(Boolean);
// tô sáng các đoạn khớp: vị trí tính trên low (bản bỏ dấu), chữ hiện ra lấy từ raw (bản gốc còn dấu)
function nqHi(raw, low, toks){
  const hits = [];
  toks.forEach(tk => { for(let i = low.indexOf(tk); i >= 0; i = low.indexOf(tk, i + tk.length)) hits.push([i, i + tk.length]); });
  hits.sort((a, b) => a[0] - b[0]);
  let out = '', at = 0;
  for(const [a, b] of hits){
    if(b <= at) continue;                        // đã nằm trong đoạn vừa tô
    const s = Math.max(a, at);
    out += esc(raw.slice(at, s)) + `<mark>${esc(raw.slice(s, b))}</mark>`;
    at = b;
  }
  return out + esc(raw.slice(at));
}
// mẩu nội dung quanh chỗ khớp đầu tiên; không khớp chỗ nào trong raw thì lấy đoạn mở đầu
function nqSnip(e, toks){
  let at = -1;
  toks.forEach(tk => { const i = e.b.indexOf(tk); if(i >= 0 && (at < 0 || i < at)) at = i; });
  if(!e.raw) return '';
  if(at < 0) return esc(e.raw.slice(0, NQ_SNIP)) + (e.raw.length > NQ_SNIP ? '…' : '');
  let s = Math.max(0, at - 30);
  const sp = s ? e.b.indexOf(' ', s) : -1;       // lùi sang đầu từ kế tiếp cho đỡ cụt giữa chữ
  if(sp > 0 && sp < at) s = sp + 1;
  const end = Math.min(e.raw.length, s + NQ_SNIP);
  return (s ? '…' : '') + nqHi(e.raw.slice(s, end), e.b.slice(s, end), toks) + (end < e.raw.length ? '…' : '');
}
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => iso(new Date());

/* --- ô chọn gõ để tìm: <select data-find> ---
   Select gốc gõ một chữ là nhảy luôn tới mục đầu tiên bắt đầu bằng chữ đó. Với select có data-find,
   bấm vào hoặc gõ phím thì mở khung có ô tìm (không dấu, nhiều từ) thay cho danh sách của trình duyệt;
   chọn xong thì gán value rồi bắn 'change', nên chỗ dùng vẫn bắt 'change' như select thường. */
function openFind(sel, q = ''){
  const items = [...sel.querySelectorAll('option')].filter(o => !o.disabled && o.value)
    .map(o => ({v: o.value, t: o.textContent, g: o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : ''}));
  openPick(items, sel.getBoundingClientRect(), {q,
    onPick: v => { sel.value = v; sel.dispatchEvent(new Event('change', {bubbles: true})); },
    onEsc: () => sel.focus()});
}
/* khung tìm dùng chung: items = [{v, t, g?}] (g = tên nhóm), đặt dưới hình chữ nhật r (left, top, bottom, width);
   chọn thì gọi onPick(v), Esc thì onEsc(). Chỉ vẽ PICK_MAX mục đầu, gõ thêm để lọc */
const PICK_MAX = 80;
function openPick(items, r, {q = '', onPick, onEsc = () => {}, width = 260} = {}){
  closeFind();
  items = items.map(x => ({...x, b: fold(x.t)}));
  const el = document.createElement('div');
  el.className = 'sfind'; el.id = 'sfindEl';
  el.innerHTML = `<input autocomplete="off" placeholder="${tr('common.findPh')}"><div class="sfl"></div>`;
  const inp = el.querySelector('input'), list = el.querySelector('.sfl');
  const draw = () => {
    const toks = nqToks(inp.value);
    const hit = items.filter(x => toks.every(tk => x.b.includes(tk))).slice(0, PICK_MAX);
    let g = null;
    list.innerHTML = hit.length ? hit.map((x, i) => {
      // nhóm (optgroup) chỉ hiện khi không tìm; đang tìm thì bỏ thụt lề, tô chữ khớp
      const head = !toks.length && x.g && x.g !== g ? `<div class="sfg">${esc(g = x.g)}</div>` : '';
      const tt = x.t.trim();
      return head + `<button type="button" class="${i ? '' : 'on'}" data-v="${esc(x.v)}">${toks.length
        ? nqHi(tt, fold(tt), toks) : esc(x.t)}</button>`;
    }).join('') : `<div class="none">${tr('common.findNone')}</div>`;
  };
  const pick = v => { closeFind(); onPick(v); };
  inp.oninput = draw;
  inp.onkeydown = e => {
    const btns = [...list.querySelectorAll('button')], i = btns.findIndex(b => b.classList.contains('on'));
    if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      if(!btns.length) return;
      btns[i]?.classList.remove('on');
      const j = (i + (e.key === 'ArrowDown' ? 1 : btns.length - 1) + btns.length) % btns.length;
      btns[j].classList.add('on'); btns[j].scrollIntoView({block: 'nearest'});
    } else if(e.key === 'Enter'){
      e.preventDefault();
      if(btns[Math.max(0, i)]) pick(btns[Math.max(0, i)].dataset.v);
    } else if(e.key === 'Escape'){
      e.preventDefault(); e.stopPropagation();   // Esc chỉ đóng khung này, không đóng panel phía sau
      closeFind(); onEsc();
    }
  };
  list.onmousedown = e => { e.preventDefault(); const b = e.target.closest('button'); if(b) pick(b.dataset.v); };
  document.body.appendChild(el);
  const w = Math.max(r.width || 0, width);
  el.style.width = w + 'px';
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  el.style.top = (r.bottom + 320 > innerHeight ? Math.max(8, r.top - 324) : r.bottom + 4) + 'px';
  inp.value = q; draw(); inp.focus();
}
function closeFind(){
  const el = $('#sfindEl'); if(el) el.remove();
}

/* ============ cuốn: nhật ký và ghi chú chia trang theo cuốn (công việc, cuộc sống…) ============ */
// Trang trỏ tới cuốn qua trường cat; cat trống hoặc trỏ tới cuốn không còn thì thuộc cuốn '' — "Chưa phân loại".
// Hàng chọn cuốn đứng đầu cột phải, nên ẩn cột trái vẫn đổi cuốn được.
// o = {books (mảng cuốn trong settings), cur (id cuốn đang mở), loose (còn trang chưa phân loại không)}
function bookRowHTML(o){
  const {books, cur} = o;
  return `<div class="jbooks">
    ${books.map(b => `<button class="jbook${b.id === cur ? ' on' : ''}" data-jb="${esc(b.id)}" draggable="true" title="${tr('book.dragT')}">${esc(b.name)}</button>`).join('')}
    ${cur === '' || o.loose ? `<button class="jbook none${cur === '' ? ' on' : ''}" data-jb="" title="${tr('book.noneT')}">${tr('book.none')}</button>` : ''}
    <button class="jtab ico" data-bk="add" title="${tr('book.add')}">+</button>
    ${cur ? `<button class="jtab ico" data-bk="ren" title="${tr('book.ren')}">✎</button>` : ''}
    ${cur && books.length > 1 ? `<button class="jtab ico" data-bk="del" title="${tr('book.del')}">✕</button>` : ''}
    ${cur === '' && books.length ? `<button class="jtab ico" data-bk="all" title="${tr('book.allT')}">⇄ ${tr('book.all')}</button>` : ''}
  </div>`;
}
// o thêm: pick(id) mở cuốn khác, redraw() vẽ lại tại chỗ, trash(b) bỏ cuốn vào thùng rác,
// moveAll(id) dồn trang chưa phân loại sang cuốn id. Thêm / đổi tên / kéo đổi chỗ thì làm ở đây luôn.
function wireBookRow(o){
  const box = $('.jbooks'), {books} = o;
  const act = k => box.querySelector(`[data-bk="${k}"]`);
  const cur = () => books.find(b => b.id === o.cur);
  box.querySelectorAll('[data-jb]').forEach(b => b.onclick = () => { if(b.dataset.jb !== o.cur) o.pick(b.dataset.jb); });
  act('add').onclick = () => {
    const n = prompt(tr('book.askNew'));
    if(!n || !n.trim()) return;
    const b = {id:uid(), name:n.trim()};
    books.push(b); save(); o.pick(b.id);
  };
  if(act('ren')) act('ren').onclick = () => {
    const b = cur(), n = prompt(tr('book.askName'), b.name);
    if(n && n.trim()){ b.name = n.trim(); save(); o.redraw(); }
  };
  if(act('del')) act('del').onclick = () => {
    const b = cur();
    if(!confirm(tr('book.askDel', {n: b.name}))) return;
    o.trash(b); toast(tr('trash.movedTask'));
  };
  if(act('all')) act('all').onclick = e => openPick(books.map(b => ({v: b.id, t: b.name})), e.currentTarget.getBoundingClientRect(),
    {onPick: v => o.moveAll(v)});
  wireRowDnD([...box.querySelectorAll('.jbook[draggable]')], el => books.findIndex(b => b.id === el.dataset.jb), books,
    () => { save(); o.redraw(); });
}
/* ============ chia màn hình (ghi chú, nhật ký) ============ */
// Như Sublime: 2 trang cạnh nhau, 3 trang (hai ô trên, một ô rộng dưới) hoặc lưới 2×2. st = {n, ids, act}: ids = trang ở từng ô (null = ô trống),
// act = ô đang chọn — trang mở từ cây / tab / link / trang mới đều vào ô này. Nhớ riêng trong trình duyệt này.
function splitLoad(key){
  try{
    const v = JSON.parse(localStorage.getItem(key));
    const mem = v?.mem && typeof v.mem === 'object' ? v.mem : {};
    if(v?.n === 1) return {n:1, ids:[], act:0, mem};
    if([2, 3, 4].includes(v?.n) && Array.isArray(v.ids) && v.ids.length === v.n && v.act >= 0 && v.act < v.n) return {...v, mem};
  }catch(e){}
  return {n:1, ids:[], act:0, mem:{}};
}
const splitSave = (key, st) => { try{ localStorage.setItem(key, JSON.stringify(st)); }catch(e){} };
// mem[k] = các ô lần cuối dùng k ô: về 1 ô hay sang cách chia khác rồi quay lại k ô thì thấy lại đúng các ô đó.
// mem[1] = trang đang xem lúc rời 1 ô, để về 1 ô thì mở lại trang đó chứ không phải trang ô đang chọn.
const splitMem = st => st.n > 1 ? {...st.mem, [st.n]: {ids: st.ids, act: st.act}} : {...st.mem};
const splitOne = st => ({n:1, ids:[], act:0, mem: splitMem(st)});
// đổi sang k ô (k > 1). Từng dùng k ô: lấy lại đúng các ô đó; trang đang xem (cur) nếu chưa có trong đó thì vào ô trống đầu tiên.
// Chưa từng: giữ trang ô đang chọn ở đầu, bớt ô thì bỏ ô cuối, thêm ô thì ô mới trống và được chọn sẵn.
// Ô của nhật ký là {d, id}, của ghi chú là mã trang: so theo .id nếu có.
function splitResize(st, k, cur){
  const mem = splitMem(st);
  if(st.n === 1 && cur) mem[1] = cur;
  const was = mem[k], same = (a, b) => a && b && (a.id || a) === (b.id || b);
  if(was && Array.isArray(was.ids) && was.ids.length === k){
    const ids = [...was.ids];
    let act = was.act >= 0 && was.act < k ? was.act : 0;
    if(cur){
      const j = ids.findIndex(x => same(x, cur)), e = ids.indexOf(null);
      if(j >= 0) act = j; else if(e >= 0){ ids[e] = cur; act = e; }
    }
    return {n:k, ids, act, mem};
  }
  const ids = st.n === 1 ? [cur || null] : [st.ids[st.act], ...st.ids.filter((_, i) => i !== st.act)];
  while(ids.length < k) ids.push(null);
  ids.length = k;
  return {n:k, ids, act: Math.max(0, ids.indexOf(null)), mem};
}
// icon nút chia: khung chữ nhật, kẻ thêm đường chia theo số ô
const SPLIT_LINES = {1: '', 2: 'M8 2v10', 3: 'M1 7h14M8 2v5', 4: 'M8 2v10M1 7h14'};
const splitCtlHTML = n => `<div class="scope nsplit">${[1, 2, 3, 4].map(k =>
  `<button data-nsp="${k}" class="${n === k ? 'on' : ''}" title="${tr('note.splitN', {n: k})}"><svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1" y="2" width="14" height="10" rx="1.5"/><path d="${SPLIT_LINES[k]}"/></svg></button>`).join('')}</div>`;
// khung một ô: tay nắm kéo đổi chỗ, nhãn / tiêu đề (head), rồi trang viết (body); ô trống thì lời nhắc và nút trang mới
const splitPaneHTML = (st, i, head, body) => `<div class="npane${i === st.act ? ' on' : ''}" data-npane="${i}">
  <div class="nphead"><span class="ngrip" draggable="true" title="${tr('note.paneDrag')}">⠿</span>${head || ''}</div>
  ${body || `<div class="empty">${tr('note.paneEmpty')}<button class="btn ghost" data-npnew>${tr('note.new')}</button></div>`}</div>`;
// o.store(): ghi st; o.redraw(): vẽ lại cả trang; o.pick(i): vừa chọn ô i; o.add(): trang mới vào ô đang chọn
function wireSplit(st, o){
  $$('.npane').forEach(el => {
    const i = +el.dataset.npane;
    // bấm vào ô nào thì ô đó được chọn; chỉ đổi khung viền, không vẽ lại kẻo mất con trỏ
    const pick = () => {
      if(st.act === i) return;
      st.act = i; o.store();
      $$('.npane').forEach(x => x.classList.toggle('on', x === el));
      o.pick(i);
    };
    el.addEventListener('pointerdown', pick);
    el.addEventListener('focusin', pick);
    el.querySelector('[data-npnew]')?.addEventListener('click', o.add);
    // kéo tay nắm ⠿ thả lên ô khác: hai ô đổi chỗ, ô đang chọn đi theo trang của nó.
    // Bắt ở pha capture để ProseMirror trong ô không nhận cú thả này như chữ dán vào.
    const grip = el.querySelector('.ngrip'), mine = e => e.dataTransfer.types.includes('text/npane');
    grip.addEventListener('dragstart', e => { e.dataTransfer.setData('text/npane', String(i)); e.dataTransfer.effectAllowed = 'move'; el.classList.add('drag'); });
    grip.addEventListener('dragend', () => el.classList.remove('drag'));
    el.addEventListener('dragover', e => { if(!mine(e)) return; e.preventDefault(); e.stopPropagation(); el.classList.add('dropin'); }, true);
    el.addEventListener('dragleave', e => { if(!el.contains(e.relatedTarget)) el.classList.remove('dropin'); });
    el.addEventListener('drop', e => {
      if(!mine(e)) return;
      e.preventDefault(); e.stopPropagation(); el.classList.remove('dropin');
      const j = +e.dataTransfer.getData('text/npane'), ids = st.ids;
      if(j === i) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      st.act = st.act === j ? i : st.act === i ? j : st.act;
      o.store(); o.redraw();
    }, true);
  });
}
// kéo thả đổi thứ tự trong một hàng nút (tab trang nhật ký, các cuốn). pos(el) = vị trí của nút trong list.
// Trỏ vào nửa trái một nút thì chèn trước nó, nửa phải thì chèn sau (hiện vạch ở mép đó); thả xong đổi chỗ trong list rồi gọi done().
function wireRowDnD(tabs, pos, list, done){
  let from = -1, drop = null;
  const mark = d => { tabs.forEach(t => t.classList.remove('dropL', 'dropR')); drop = d; if(d) d.el.classList.add(d.after ? 'dropR' : 'dropL'); };
  tabs.forEach(el => {
    el.addEventListener('dragstart', e => {
      from = pos(el); el.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', el.textContent);
    });
    el.addEventListener('dragend', () => { el.classList.remove('drag'); from = -1; mark(null); });
    el.addEventListener('dragover', e => {
      if(from < 0) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      mark({el, after: e.clientX > r.left + r.width / 2});
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      if(from < 0 || !drop) return;
      let to = pos(drop.el) + (drop.after ? 1 : 0);   // tính trước khi rút ra: pos có thể tìm theo vị trí trong list
      const [x] = list.splice(from, 1);
      if(to > from) to--;                     // đã rút ra phía trước nên chỗ chèn lùi một ô
      list.splice(to, 0, x);
      from = -1; mark(null);
      done();
    });
  });
}
document.addEventListener('mousedown', e => {
  const sel = e.target.closest && e.target.closest('select[data-find]');
  if(sel){ e.preventDefault(); return $('#sfindEl') ? closeFind() : openFind(sel); }   // chặn danh sách của trình duyệt
  if(!e.target.closest || !e.target.closest('#sfindEl')) closeFind();
}, true);
// khung đứng yên theo màn hình: trang cuộn thì đóng, kẻo khung lệch khỏi ô chọn
document.addEventListener('scroll', e => { if(!e.target.closest || !e.target.closest('#sfindEl')) closeFind(); }, true);
document.addEventListener('keydown', e => {
  const sel = e.target;
  if(!sel.matches || !sel.matches('select[data-find]') || e.ctrlKey || e.metaKey || e.altKey) return;
  const ch = e.key.length === 1 && e.key !== ' ';
  if(!ch && !['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  openFind(sel, ch ? e.key : '');                 // phím vừa gõ thành chữ đầu tiên trong ô tìm
}, true);
