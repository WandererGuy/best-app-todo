/* ============ hằng số ============ */
const AREAS = {work:{n:'Công việc',c:'#3b82f6'}, life:{n:'Cuộc sống',c:'#a855f7'}, other:{n:'Khác',c:'#64748b'}};
const PRIOS = {low:{n:'Thấp',c:'#22c55e'}, med:{n:'Trung bình',c:'#f59e0b'}, high:{n:'Cao',c:'#f43f5e'}};
const COLS  = {todo:{n:'Cần làm',c:'#64748b'}, doing:{n:'Đang làm',c:'#6366f1'}, done:{n:'Xong',c:'#22c55e'}};
// "Để sau": việc chưa cam kết làm — không lên bảng, lịch, nhắc việc, thống kê
const STATUSES = {backlog:{n:'Để sau',c:'#94a3b8'}, ...COLS};
const SCOPES = {today:'Hôm nay', week:'7 ngày', month:'Tháng này', all:'Tất cả'};
const DUES   = {over:'Trễ hạn', today:'Hạn hôm nay', none:'Chưa có hạn'};
const DONE_MAX = 10;   // số task hiện sẵn ở cột Xong
const SORTS  = {manual:'Thủ công', prio:'Theo ưu tiên', group:'Chia nhóm ưu tiên'};
const PRIO_ORDER = ['high', 'med', 'low'];
const DOW   = ['CN','T2','T3','T4','T5','T6','T7'];
// thói quen: good = việc muốn giữ, bad = việc muốn bỏ (tick = hôm nay đã dùng hành vi thay thế)
const HKINDS = {good:{n:'Nên làm', c:'#22c55e'}, bad:{n:'Nên bỏ', c:'#f43f5e'}};
const HWEEKS = 12;   // số tuần hiện trên lưới theo dõi thói quen
// câu mừng theo mốc chuỗi; 66 là số ngày trung bình để một hành vi thành tự động (Lally, 2010)
const HMARKS = {1:'bắt đầu là phần khó nhất, xong rồi!', 3:'nhịp đang hình thành.',
  7:'một tuần liền!', 14:'hai tuần liền, đã thành nếp.', 21:'21 buổi liền!',
  30:'30 buổi liền, rất đáng nể.', 66:'mốc trung bình để một hành vi thành tự động!',
  100:'100 buổi liền 🎉'};
// tập trung (pomodoro): 3 pha của đồng hồ và cài đặt mặc định.
// look: nền toàn màn hình theo pha — màu c, ảnh img (mã trong kho ảnh), độ rõ ảnh op (%), lớp phủ dim (âm = sáng, dương = tối)
const FPHASE = {work:'Tập trung', short:'Nghỉ ngắn', long:'Nghỉ dài'};
const FCFG = {work:40, short:10, long:15, every:3, auto:false,
  qmax:3, confirmSw:true, pauseAsk:2,
  goal:2, miss:1, weekend:true,
  askRate:true, askNext:true,
  look:{work:{c:'#1e1b4b', img:null, op:70, dim:35}, short:{c:'#064e3b', img:null, op:70, dim:35},
        long:{c:'#172554', img:null, op:70, dim:35}},
  sound:true, vol:60, notify:true, tabTitle:true};
const KEY   = 'dieukhien.v1';
// khung giờ: bước 30 phút; nhắc trước tính bằng phút, 0 = không nhắc
const TIMES   = Array.from({length:48}, (_, i) => `${String(i >> 1).padStart(2,'0')}:${i % 2 ? '30' : '00'}`);
const DURS    = [15, 30, 45, 60, 90, 120, 180, 240];
const REMINDS = {0:'Không nhắc', 5:'5 phút', 10:'10 phút', 15:'15 phút', 30:'30 phút', 60:'1 giờ', 1440:'1 ngày'};
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
let S = {tasks:[], trash:[], tags:{}, journal:{}, notes:[], ntrash:[], habits:[], settings:{jH:560}, notis:[], focus:fNorm()};   // tags: {tên: màu}; notis: nhắc việc đã bắn; trash: task đã bỏ (có thêm trường trashed); notes / ntrash: ghi chú và ghi chú đã bỏ; focus: xem mục tập trung
// bf: bộ lọc của bảng việc / bảng cuộc sống — prio: các mức ưu tiên đang chọn, due: mốc hạn, area: mảng (chỉ bảng việc); bfOpen: đang mở bảng lọc
let ui = {view:'board', bf:{prio:[], due:null, area:null}, bfOpen:false, tag:null, q:'', scope:'today',
          open:null, calD:null, calMode:'month', jDate:null, jTab:0, sDate:null, doneAll:false, doneToday:false, nOpen:null,
          hEdit:null, hPop:null,
          // tập trung: fRev = điểm / ghi chú gõ dở của phiên vừa xong,
          // fCheer = các câu mừng đang hiện, fFull = đang toàn màn hình, fCfg = đang mở cài đặt
          fRev:{rate:0, next:''}, fCheer:null, fPop:false, fFull:false, fCfg:false};
let nf = null;                 // dữ liệu form tạo task
let lastSave = null;           // thời điểm lưu gần nhất
let storageOK = true;          // trình duyệt có cho lưu không

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const esc = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => iso(new Date());
