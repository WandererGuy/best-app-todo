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
// cài đặt mặc định cho người mới mở app lần đầu. Sửa ở đây là đổi mặc định cho mọi bản clone;
// người đã dùng rồi thì giá trị trong file dữ liệu vẫn được giữ, không bị đè.
const SETTINGS = {sort:'group', scope:'week', zen:false, calMode:'month', fcM:'week', doneToday:false,
  nPinned:true, nRecent:true, nAll:true};   // nPinned / nRecent / nAll: ba mục ở cột trái trang ghi chú đang mở
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
let S = {tasks:[], trash:[], tags:{}, journal:{}, notes:[], ntrash:[], habits:[], settings:{...SETTINGS}, notis:[], focus:fNorm(), plan:pNorm()};   // tags: {tên: màu}; notis: nhắc việc đã bắn; trash: task đã bỏ (có thêm trường trashed); notes / ntrash: ghi chú và ghi chú đã bỏ; focus: xem mục tập trung
// bf: bộ lọc của bảng việc / bảng cuộc sống — prio: các mức ưu tiên đang chọn, due: mốc hạn, area: mảng (chỉ bảng việc); bfOpen: đang mở bảng lọc
let ui = {view: keptView(), bf:{prio:[], due:null, area:null}, bfOpen:false, tag:null, q:'', scope:'today',
          open:null, calD:null, calMode:'month', jDate:null, jTab:0, sDate:null, doneAll:false, nOpen:null,
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
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => iso(new Date());
