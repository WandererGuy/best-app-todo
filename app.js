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

/* nạp dữ liệu (từ server, localStorage hay file) vào S — thêm trường mới vào S thì sửa ở đây */
function applyData(d){
  S = {tasks: d.tasks || [], trash: d.trash || [], tags: d.tags || {}, journal: d.journal || {},
       notes: d.notes || [], ntrash: d.ntrash || [], habits: d.habits || [],
       settings: Object.assign({jH:560}, d.settings || {}), notis: d.notis || [], focus: fNorm(d.focus)};
  syncTags();
  // nhật ký cũ mỗi ngày một trang -> đổi sang dạng nhiều trang
  Object.keys(S.journal).forEach(k => {
    if(typeof S.journal[k] === 'string') S.journal[k] = [{id:uid(), name:'Ghi chép', html:S.journal[k]}];
  });
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); lastSave = new Date(); storageOK = true; }
  catch(e){ storageOK = false; }
  queueFile(); queueSrv();
  paintSave();
}
function paintSave(){
  const b = $('#saveBar'); if(!b) return;
  const msg = !storageOK ? 'Không lưu được — hãy xuất file!'
    : srvErr === 'conflict' ? 'Đã sửa ở cửa sổ khác — tải lại trang'
    : srvErr ? 'Chưa lưu vào máy — chỉ trong trình duyệt' : '';
  b.classList.toggle('bad', !!msg);
  if(msg){ b.innerHTML = `<span class="d"></span>${msg}`; return; }
  const hh = lastSave ? lastSave.toTimeString().slice(0,8) : '—';
  b.innerHTML = `<span class="d"></span>Đã lưu vào máy ${hh}${fh ? ' · ⇄ file' : ''}`;
}

/* ---- dữ liệu chính nằm ở server: serve.py ghi ra data/dieukhien.json ----
   localStorage chỉ là bản đệm, nên xoá cache hay đổi profile Chrome không mất gì.
   Mỗi lần ghi kèm mã phiên bản (ETag) của bản trên server mà dữ liệu đang dựa vào; cửa sổ khác đã ghi
   trước thì server trả 409, bản ở đây được cất vào data/backups chứ không đè lên.
   localStorage 'dieukhien.srv' = {tag, dirty}: dirty = còn thay đổi chưa gửi được (tắt tab sớm, server tắt). */
const SRV_KEY = 'dieukhien.srv';
const SRV_H = {'X-App':'dieukhien', 'Content-Type':'application/json'};
let srvOn = false;      // phiên này đang ghi lên server
let srvErr = null;      // null | 'off': không nối / không gửi được | 'conflict': cửa sổ khác đã ghi
let srvTag = null, srvTimer = null, srvBusy = false, srvKeep = false, srvGen = 0;
function setMeta(dirty){
  if(srvTag) try{ localStorage.setItem(SRV_KEY, JSON.stringify({tag:srvTag, dirty})); }catch(e){}
}
function queueSrv(){
  setMeta(true); srvGen++;
  if(!srvOn) return;
  clearTimeout(srvTimer);
  srvTimer = setTimeout(pushSrv, 800);
}
async function pushSrv(){
  if(srvBusy){ clearTimeout(srvTimer); srvTimer = setTimeout(pushSrv, 300); return; }
  srvBusy = true;
  const gen = srvGen, keep = srvKeep;
  try{
    const r = await fetch('/api/data' + (keep ? '?keep=1' : ''),
                          {method:'PUT', headers:{...SRV_H, 'If-Match':srvTag}, body: await dataJSON()});
    if(r.status === 409){
      srvOn = false; srvErr = 'conflict';
      await stashSrv();
      toast('Dữ liệu vừa được sửa ở cửa sổ khác. Thay đổi ở đây đã cất vào data/backups — hãy tải lại trang.');
    }else if(r.ok){
      srvTag = r.headers.get('ETag'); srvErr = null; srvKeep = srvKeep && !keep;
      setMeta(gen !== srvGen);
    }else throw new Error(r.status);
  }catch(e){
    if(!srvErr) toast('Không lưu được vào máy — cửa sổ run.bat còn mở không? Thay đổi vẫn giữ trong trình duyệt.');
    srvErr = 'off';
  }
  srvBusy = false;
  paintSave();
}
/* cất dữ liệu đang có trong S vào data/backups (không bao giờ mất, chỉ không được dùng) */
async function stashSrv(){
  try{ return (await fetch('/api/backup', {method:'POST', headers:SRV_H, body: await dataJSON()})).ok; }
  catch(e){ return false; }
}
const countData = d => `${(d.tasks || []).length} task, ${(d.notes || []).length} ghi chú, ${(d.habits || []).length} thói quen`;
/* khởi động: ưu tiên server, không có server mới dùng dữ liệu trình duyệt. Trả về lời nhắn cần báo (nếu có) */
async function boot(){
  let local = null, meta = null, res = null, msg = '';
  try{ local = JSON.parse(localStorage.getItem(KEY)); }catch(e){ console.warn('Không đọc được dữ liệu cũ:', e); }
  try{ meta = JSON.parse(localStorage.getItem(SRV_KEY)); }catch(e){}
  if(location.protocol !== 'file:') try{ res = await fetch('/api/data', {cache:'no-store'}); }catch(e){}

  if(!res || res.headers.get('X-App') !== 'dieukhien' || !(res.ok || res.status === 404)){
    srvErr = 'off'; srvTag = meta && meta.tag;          // vẫn đánh dấu dirty để lần sau có server thì gửi lên
    if(local) applyData(local); else seed();
    return '';
  }
  srvOn = true;
  if(res.status === 404){
    srvTag = 'none';
    if(!local){ seed(); return ''; }                      // seed() tự save() -> tạo file
    applyData(local);
    if(confirm(`Chưa có file dữ liệu trên máy (data/dieukhien.json).\n\n` +
               `Dùng dữ liệu đang có trong trình duyệt này làm dữ liệu chính?\n(${countData(local)})\n\n` +
               `Bấm Huỷ nếu đây không phải dữ liệu thật — ví dụ đang mở nhầm profile Chrome.`)){
      save(); return 'Đã đưa dữ liệu vào data/dieukhien.json.';
    }
    srvOn = false; srvErr = 'off'; srvTag = null;
    return '';
  }

  const d = await res.json(); srvTag = res.headers.get('ETag');
  if(local && meta && meta.dirty && meta.tag === srvTag){   // thay đổi lần trước chưa kịp gửi
    applyData(local); save(); return '';
  }
  if(local && !(meta && !meta.dirty)){                      // dữ liệu riêng của trình duyệt này, chưa lên server
    applyData(local);
    if(!await stashSrv()){ srvOn = false; srvErr = 'off'; srvTag = null; return ''; }   // bỏ tag: lần sau không được coi là thay đổi của bản server
    msg = `Trình duyệt này có dữ liệu riêng (${countData(local)}) — đã cất vào data/backups, đang dùng dữ liệu trên máy.`;
  }
  for(const [id, url] of Object.entries(d.images || {})){
    imgData.set(id, url);
    if(!await imgGet(id)) await imgPut(id, await (await fetch(url)).blob());
  }
  applyData(d);
  try{ localStorage.setItem(KEY, JSON.stringify(S)); lastSave = new Date(); }catch(e){ storageOK = false; }
  setMeta(false);
  return msg;
}
function toast(msg){
  const el = $('#toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('on'), 2600);
}

/* ---- ghi thẳng ra file trên ổ đĩa (Chrome/Edge) ---- */
const FS_OK = typeof window.showSaveFilePicker === 'function';
let fh = null, fsTimer = null;
async function linkFile(){
  try{
    fh = await window.showSaveFilePicker({
      suggestedName: `dieukhien-${today()}.json`,
      types: [{description:'Dữ liệu Điều khiển', accept:{'application/json':['.json']}}]
    });
    await writeFile(); await idbPut(fh);
    toast('Đã liên kết. Mọi thay đổi sẽ tự ghi ra file này.');
  }catch(e){ if(e.name !== 'AbortError') toast('Không liên kết được file: ' + e.message); }
  paintFs();
}
async function writeFile(){
  if(!fh) return;
  try{
    const txt = await dataJSON();
    const w = await fh.createWritable();
    await w.write(txt);
    await w.close();
  }catch(e){ fh = null; toast('Mất quyền ghi file — hãy liên kết lại.'); }
  paintFs(); paintSave();
}
function queueFile(){
  if(!fh) return;
  clearTimeout(fsTimer);
  fsTimer = setTimeout(writeFile, 1200);
}
function paintFs(){
  const b = $('#fsBtn'); if(!b) return;
  b.hidden = !FS_OK;
  b.textContent = fh ? `⇄ Đang ghi ra ${fh.name}` : (fhPending ? 'Kết nối lại file dữ liệu' : 'Liên kết file trên ổ đĩa');
}
/* lưu file handle qua IndexedDB để lần mở sau chỉ cần 1 cú bấm */
let fhPending = null;
function idb(){
  return new Promise((res, rej) => {
    const r = indexedDB.open('dieukhien-fs', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('h');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function idbPut(handle){
  try{ const d = await idb(); d.transaction('h','readwrite').objectStore('h').put(handle,'file'); }catch(e){}
}
async function idbGet(){
  try{
    const d = await idb();
    return await new Promise(res => {
      const q = d.transaction('h','readonly').objectStore('h').get('file');
      q.onsuccess = () => res(q.result || null); q.onerror = () => res(null);
    });
  }catch(e){ return null; }
}
async function restoreFile(){
  if(!FS_OK) return;
  const h = await idbGet(); if(!h) return;
  if(await h.queryPermission({mode:'readwrite'}) === 'granted'){ fh = h; }
  else fhPending = h;
  paintFs(); paintSave();
}
async function reconnectFile(){
  if(!fhPending) return linkFile();
  if(await fhPending.requestPermission({mode:'readwrite'}) === 'granted'){
    fh = fhPending; fhPending = null; await writeFile(); toast('Đã kết nối lại file dữ liệu.');
  }else toast('Bạn đã từ chối quyền ghi file.');
  paintFs();
}

/* ---- ảnh và file đính kèm trong ghi chú ----
   File nằm trong IndexedDB (localStorage chỉ ~5MB), ghi chú chỉ giữ <img data-img="mã"> / <div data-file="mã">.
   Ảnh và file dùng chung một kho. Xuất file và file liên kết gói kèm chúng dạng data URL ở trường images
   (giữ tên cũ để file backup cũ vẫn nạp được), để backup có đủ. */
const IMG_MAX  = 2560;             // cạnh dài tối đa; ảnh to hơn thì thu nhỏ về mức này
const IMG_KEEP = 800 * 1024;       // ảnh không vượt cạnh tối đa và nhẹ hơn mức này thì giữ nguyên file gốc
const FILE_MAX = 25 * 1024 * 1024; // file đính kèm nặng hơn thì từ chối: nó bị nhét vào JSON backup mỗi lần ghi
const imgUrls = new Map();         // mã -> object URL để hiển thị
const imgData = new Map();         // mã -> data URL, khỏi đọc lại mỗi lần ghi file
let imgDbP = null;
function imgDb(){
  return imgDbP ||= new Promise((res, rej) => {
    const r = indexedDB.open('dieukhien-img', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
async function imgPut(id, blob){
  const d = await imgDb();
  await new Promise((res, rej) => {
    const tx = d.transaction('img', 'readwrite'); tx.objectStore('img').put(blob, id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
  imgUrls.delete(id); imgData.delete(id);
}
async function imgGet(id){
  try{
    const d = await imgDb();
    return await new Promise(res => {
      const q = d.transaction('img', 'readonly').objectStore('img').get(id);
      q.onsuccess = () => res(q.result || null); q.onerror = () => res(null);
    });
  }catch(e){ return null; }
}
async function imgSrc(id){
  if(!imgUrls.has(id)){
    const b = await imgGet(id); if(!b) return '';
    imgUrls.set(id, URL.createObjectURL(b));
  }
  return imgUrls.get(id);
}
async function shrink(file){
  if(file.type === 'image/gif') return file;               // giữ ảnh động
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, IMG_MAX / Math.max(bmp.width, bmp.height));
  if(k === 1 && file.size <= IMG_KEEP){ bmp.close(); return file; }
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); bmp.close();
  const out = await new Promise(res => c.toBlob(res, 'image/webp', 0.92));
  return out && (k < 1 || out.size < file.size) ? out : file;
}
async function addImages(ed, files, pos){
  const ids = [];
  for(const f of files){
    try{ const id = 'i' + uid(); await imgPut(id, await shrink(f)); ids.push(id); }
    catch(e){ toast(`Không chèn được ảnh ${f.name}`); }
  }
  TT.image(ed, ids, pos);
}
async function addFiles(ed, files, pos){
  const items = [];
  for(const f of files){
    if(f.size > FILE_MAX){ toast(`${f.name} nặng quá ${FILE_MAX / 1024 / 1024}MB, không đính kèm được`); continue; }
    try{ const id = 'f' + uid(); await imgPut(id, f); items.push({file:id, name:f.name, size:f.size}); }
    catch(e){ toast(`Không đính kèm được ${f.name}`); }
  }
  TT.file(ed, items, pos);
}
/* dán / kéo thả: ảnh thì chèn ảnh, còn lại thành file đính kèm */
function dropFiles(ed, files, pos){
  const isImg = f => f.type.startsWith('image/') && f.type !== 'image/svg+xml';
  const imgs = files.filter(isImg), rest = files.filter(f => !isImg(f));
  if(imgs.length) addImages(ed, imgs, pos);
  if(rest.length) addFiles(ed, rest, pos);
}
function pickImages(ed){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
  inp.onchange = () => addImages(ed, [...inp.files], null);
  inp.click();
}
/* xem file ở tab mới: chỉ các loại trình duyệt tự hiển thị được (Word/Excel thì không).
   Kiểu MIME đặt theo đuôi file; file chữ và code (kể cả .html, .svg) luôn mở dạng chữ thuần,
   để script trong file không chạy được dưới origin của app (đọc được localStorage). */
const VIEW_MIME = {pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif',
  webp:'image/webp', bmp:'image/bmp', avif:'image/avif', mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg',
  m4a:'audio/mp4', mp4:'video/mp4', webm:'video/webm'};
const VIEW_TEXT = new Set(('txt md csv tsv json log xml html htm svg yml yaml ini conf sql js ts jsx tsx css '
  + 'py java c h cpp cs go rs php rb sh bat ps1').split(' '));
const fileExt = name => (String(name).match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
const fileCanView = name => !!VIEW_MIME[fileExt(name)] || VIEW_TEXT.has(fileExt(name));
const viewUrls = new Map();        // mã -> object URL để xem; giữ lại vì trình xem PDF còn dùng khi bấm tải
async function fileView({file, name}){
  if(!viewUrls.has(file)){
    const b = await imgGet(file); if(!b) return false;
    const ext = fileExt(name);
    const type = VIEW_TEXT.has(ext) ? 'text/plain;charset=utf-8' : VIEW_MIME[ext];
    viewUrls.set(file, URL.createObjectURL(new Blob([b], {type})));
  }
  window.open(viewUrls.get(file), '_blank');
  return true;
}
function pickFiles(ed){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true;
  inp.onchange = () => addFiles(ed, [...inp.files], null);
  inp.click();
}
/* dữ liệu để ghi ra file: S + các ảnh / file đang được ghi chú dùng */
async function dataJSON(){
  const ids = new Set([...JSON.stringify(S).matchAll(/data-(?:img|file)=\\"(\w+)\\"/g)].map(m => m[1]));
  Object.values(S.focus.cfg.look).forEach(l => { if(l.img) ids.add(l.img); });   // ảnh nền màn hình tập trung
  const images = {};
  for(const id of ids){
    if(!imgData.has(id)){
      const b = await imgGet(id); if(!b) continue;
      imgData.set(id, await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); }));
    }
    images[id] = imgData.get(id);
  }
  return JSON.stringify({...S, images}, null, 2);
}
function seed(){
  const d = new Date(); const plus = n => { const x = new Date(); x.setDate(d.getDate()+n); return iso(x); };
  S.tasks = [
    {id:uid(), title:'Chuẩn bị slide họp team', area:'work', prio:'high', status:'doing', pg:50,
     tags:['họp'], due:plus(1), note:'<p>Nhấn vào task để mở panel này.</p><p>Ô ghi chú gõ như trang Notion — gõ <strong>/</strong> để chèn khối:</p><ul class="td"><li data-d="1">gõ "[] " thành ô tích việc</li><li data-d="0">gõ "# " thành tiêu đề</li></ul><blockquote>Mọi suy nghĩ vụn vặt về task cứ ném vào đây.</blockquote>',
     subs:[{id:uid(),t:'Dựng outline',d:true},{id:uid(),t:'Vẽ biểu đồ số liệu',d:false}], cr:today(), done:null},
    {id:uid(), title:'Review pull request của Minh', area:'work', prio:'med', status:'todo', pg:0,
     tags:['code'], due:plus(0), note:'', subs:[], cr:today(), done:null},
    {id:uid(), title:'Tập gym 3 buổi tuần này', area:'life', prio:'med', status:'doing', pg:75,
     tags:['sức khoẻ'], due:plus(3), note:'', subs:[], cr:today(), done:null},
    {id:uid(), title:'Đặt lịch khám răng', area:'life', prio:'low', status:'todo', pg:0,
     tags:['sức khoẻ'], due:'', note:'', subs:[], cr:today(), done:null},
    {id:uid(), title:'Dọn hộp thư đến về 0', area:'other', prio:'low', status:'done', pg:100,
     tags:[], due:'', note:'', subs:[], cr:today(), done:today()}
  ];
  S.habits = [
    {id:uid(), name:'Đọc 20 trang', kind:'good', days:[1,2,3,4,5], cue:'Sau khi ăn tối, ở bàn làm việc',
     swap:'', color:'#38bdf8', log:{}, cr:today()},
    {id:uid(), name:'Đi bộ 20 phút', kind:'good', days:[1,3,5], cue:'Ngay sau giờ tan làm',
     swap:'', color:'#4ade80', log:{}, cr:today()},
    {id:uid(), name:'Lướt điện thoại trên giường', kind:'bad', days:[0,1,2,3,4,5,6],
     cue:'Lúc chuẩn bị đi ngủ', swap:'Cắm sạc điện thoại ngoài phòng, đọc vài trang sách giấy',
     color:'#fb7185', log:{}, cr:today()}
  ];
  S.journal[today()] = [{id:uid(), name:'Ghi chép', html:'<h1>Hôm nay</h1><p>Viết bất cứ điều gì trong đầu ở đây.</p><h2>Việc đã làm</h2><ul class="td"><li data-d="1">Mở app lần đầu</li><li data-d="0">Thêm task thật của mình</li></ul><h2>Suy nghĩ</h2><blockquote>Trang này của riêng ngày hôm nay. Đổi ngày ở thanh trên. Bấm + để thêm trang khác trong cùng ngày.</blockquote>'}];
  syncTags();
  save();
}

/* ============ tag: danh sách dùng chung, mỗi tag một màu ============ */
const tagNames = () => Object.keys(S.tags).sort((a, b) => a.localeCompare(b, 'vi'));
const tagStyle = n => { const c = S.tags[n] || '#818cf8'; return `background:${c}22;color:${c}`; };
// trả về tên tag đã có (không phân biệt hoa thường), chưa có thì tạo mới với màu chưa ai dùng
function ensureTag(name){
  const hit = Object.keys(S.tags).find(n => n.toLowerCase() === name.toLowerCase());
  if(hit) return hit;
  const used = Object.values(S.tags), row = TAG_PAL[1];
  S.tags[name] = row.find(c => !used.includes(c)) || row[used.length % row.length];
  return name;
}
// dữ liệu cũ: tag chỉ nằm trong task -> đưa vào danh sách chung
function syncTags(){ [...S.tasks, ...S.notes].forEach(t => (t.tags || []).forEach(n => { if(!S.tags[n]) ensureTag(n); })); }
function delTag(name){
  const n = S.tasks.filter(t => (t.tags || []).includes(name)).length;
  const m = S.notes.filter(t => (t.tags || []).includes(name)).length;
  const used = [n && `${n} task`, m && `${m} trang ghi chú`].filter(Boolean).join(' và ');
  if(!confirm(used ? `Xoá tag "#${name}"? Tag sẽ bị gỡ khỏi ${used}.` : `Xoá tag "#${name}"?`)) return;
  delete S.tags[name];
  [...S.tasks, ...S.trash, ...S.notes, ...S.ntrash].forEach(t => { if(t.tags) t.tags = t.tags.filter(x => x !== name); });
  if(nf) nf.tags = nf.tags.filter(x => x !== name);
  if(ui.tag === name) ui.tag = null;
  save(); render();
}
// đổi tên: nếu trùng một tag khác thì hỏi gộp (giữ màu của tag đích)
function renameTag(old){
  const v = (prompt('Tên mới cho tag:', old) || '').trim().replace(/^#/,'');
  if(!v || v === old) return;
  const hit = Object.keys(S.tags).find(n => n !== old && n.toLowerCase() === v.toLowerCase());
  if(hit && !confirm(`Tag "#${hit}" đã có. Gộp "#${old}" vào "#${hit}"?`)) return;
  const to = hit || v;
  if(!hit) S.tags[to] = S.tags[old];
  delete S.tags[old];
  const swap = arr => [...new Set(arr.map(x => x === old ? to : x))];
  [...S.tasks, ...S.trash, ...S.notes, ...S.ntrash].forEach(t => { if(t.tags) t.tags = swap(t.tags); });
  if(nf) nf.tags = swap(nf.tags);
  if(ui.tag === old) ui.tag = to;
  save(); render();
}
// ô nhập tag: dùng chung cho panel chi tiết và form tạo task
function tagFieldHTML(id, tags, ph){
  return `<div class="tagbox">
      ${tags.map(x => `<span class="tgx" style="${tagStyle(x)}">#${esc(x)}<b data-rmtag="${esc(x)}">✕</b></span>`).join('')}
      <input id="${id}" placeholder="${ph}" autocomplete="off">
    </div>
    <div class="tagsug" id="${id}Sug"></div>`;
}
function bindTagField(root, id, cur, onAdd, onRm){
  const inp = root.querySelector('#' + id), sug = root.querySelector('#' + id + 'Sug');
  const paint = () => {   // gợi ý tag có sẵn, lọc theo chữ đang gõ
    const q = inp.value.trim().replace(/^#/,'').toLowerCase();
    sug.innerHTML = tagNames().filter(n => !cur.includes(n) && n.toLowerCase().includes(q))
      .map(n => `<button class="tgx" style="${tagStyle(n)}" data-addtag="${esc(n)}" title="Gắn tag này">#${esc(n)}</button>`).join('');
    sug.querySelectorAll('[data-addtag]').forEach(b => b.onclick = () => onAdd(b.dataset.addtag));
  };
  inp.oninput = paint; paint();
  inp.onkeydown = e => {
    if(e.key !== 'Enter') return;
    e.preventDefault();
    const v = inp.value.trim().replace(/^#/,'');
    if(v){ const n = ensureTag(v); save(); onAdd(n); }
  };
  root.querySelectorAll('[data-rmtag]').forEach(b => b.onclick = () => onRm(b.dataset.rmtag));
}

/* --- bảng chọn màu --- */
function openPal(anchor, cur, onPick){
  closePal();
  const el = document.createElement('div'); el.className = 'pal'; el.id = 'palEl';
  el.innerHTML = TAG_PAL.flat().map(c =>
    `<button class="${c === cur ? 'on' : ''}" style="background:${c}" data-pc="${c}"></button>`).join('')
    + `<div class="palft"><span>Màu khác</span>
        <input type="color" class="palpick" value="${cur || '#818cf8'}" title="Chọn màu bất kỳ">
        <input class="palhex" value="${cur || ''}" placeholder="#rrggbb" maxlength="7" title="Gõ mã màu rồi Enter"></div>`;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect(), h = el.offsetHeight, w = el.offsetWidth;
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  el.style.top  = (r.bottom + h + 6 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  const pick = c => { closePal(); onPick(c); };
  el.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => pick(b.dataset.pc));
  el.querySelector('.palpick').onchange = e => pick(e.target.value);
  const hex = el.querySelector('.palhex');
  hex.oninput = () => hex.classList.remove('bad');
  hex.onkeydown = e => {
    if(e.key !== 'Enter') return;
    const c = normHex(hex.value);
    if(c) pick(c); else hex.classList.add('bad');
  };
}
// "#abc" / "aabbcc" -> "#aabbcc"; sai định dạng thì trả null
function normHex(v){
  const m = v.trim().replace(/^#/,'').toLowerCase();
  if(/^[0-9a-f]{6}$/.test(m)) return '#' + m;
  if(/^[0-9a-f]{3}$/.test(m)) return '#' + [...m].map(x => x + x).join('');
  return null;
}
function closePal(){ $('#palEl')?.remove(); }

/* ============ markdown ============ */
function md(src){
  if(!src || !src.trim()) return '<p class="ph">Chưa có nội dung.</p>';
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
const hasText = h => plain(h).length > 0 || /<(hr|img)\b|data-file=/i.test(h || '');

const BLOCKS = [
  {k:'p',   n:'Văn bản',            ic:'¶',  key:''},
  {k:'h1',  n:'Tiêu đề lớn',        ic:'H1', key:'# '},
  {k:'h2',  n:'Tiêu đề vừa',        ic:'H2', key:'## '},
  {k:'h3',  n:'Tiêu đề nhỏ',        ic:'H3', key:'### '},
  {k:'td',  n:'Danh sách việc',     ic:'✓',  key:'[] '},
  {k:'ul',  n:'Gạch đầu dòng',      ic:'•',  key:'- '},
  {k:'ol',  n:'Danh sách đánh số',  ic:'1.', key:'1. '},
  {k:'q',   n:'Trích dẫn',          ic:'❝',  key:'> '},
  {k:'pre', n:'Khối code',          ic:'‹›', key:'```'},
  {k:'hr',  n:'Đường kẻ ngang',     ic:'—',  key:'---'},
  {k:'img', n:'Ảnh',                ic:'▣',  key:'Ctrl+V'},
  {k:'file', n:'File đính kèm',      ic:'📎', key:'kéo thả'},
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
function killEd(id){
  const e = EDS.get(id);
  if(e){ try{ e.destroy(); }catch(err){} EDS.delete(id); }
}
function killEds(){ [...EDS.keys()].forEach(killEd); closeSlash(); hideFtb(); }
function mountEd(hostId, content, ph, onChange){
  killEd(hostId);
  const host = document.getElementById(hostId); if(!host) return null;
  const ed = window.TT.create(host, {content: toRich(content), placeholder: ph, onChange,
    imgSrc, fileCanView, fileView, onFiles: (files, pos) => dropFiles(ed, files, pos)});
  EDS.set(hostId, ed);
  const dom = ed.view.dom;
  dom.addEventListener('dblclick', e => {                          // bấm đúp ảnh: mở cỡ gốc ở tab mới
    const img = e.target.closest('img.eimg');
    if(img && img.src) window.open(img.src, '_blank');
  });
  dom.addEventListener('keydown', e => slashKeys(e, ed), true);   // chặn trước ProseMirror
  ed.on('update',          () => syncMenus(ed));                  // bám theo TipTap, không bám phím
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
    : '<div class="none">Không có lệnh nào khớp</div>';
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
  {k:'bold',   l:'<b>B</b>',  t:'Đậm (Ctrl+B)'},
  {k:'italic', l:'<i>I</i>',  t:'Nghiêng (Ctrl+I)'},
  {k:'strike', l:'<s>S</s>',  t:'Gạch ngang'},
  {k:'code',   l:'‹›',        t:'Code (Ctrl+E)'},
  {k:'link',   l:'↗',         t:'Chèn link (Ctrl+K)'},
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

/* ============ chọn ngày (dd/mm/yyyy) ============ */
const fmtVN = s => { if(!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };
let dp = null;   // {onPick, clear, month, sel}

function dateBtn(id, val, ph, style = ''){
  return `<button class="dtf" id="${id}" data-dt="1" style="${style}">
    <span${val ? '' : ' class="ph"'}>${val ? fmtVN(val) : ph}</span><span class="ic2">▦</span></button>`;
}
function openDP(anchor, cur, onPick, clear){
  closeDP();
  dp = {onPick, clear, sel:cur || '', month: new Date((cur || today()) + 'T00:00:00'), anchor};
  anchor.classList.add('on');
  const el = document.createElement('div'); el.className = 'dp'; el.id = 'dpEl';
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - 284)) + 'px';
  el.style.top  = (r.bottom + 310 > innerHeight ? Math.max(8, r.top - 316) : r.bottom + 6) + 'px';
  drawDP();
}
function closeDP(){
  if(dp) dp.anchor.classList.remove('on');
  $('#dpEl')?.remove(); dp = null;
}
function drawDP(){
  const M = dp.month, y = M.getFullYear(), m = M.getMonth();
  const start = new Date(y, m, 1); start.setDate(1 - start.getDay());
  let cells = '';
  for(let i = 0; i < 42; i++){
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = iso(d);
    cells += `<button class="dpd${d.getMonth()!==m?' off':''}${k===today()?' today':''}${k===dp.sel?' sel':''}"
      data-pick="${k}">${d.getDate()}</button>`;
  }
  $('#dpEl').innerHTML = `
    <div class="dphd"><button class="dpnav" data-mv="-1">‹</button>
      <b>Tháng ${m+1} / ${y}</b><button class="dpnav" data-mv="1">›</button></div>
    <div class="dpg">${DOW.map(d => `<div class="w">${d}</div>`).join('')}${cells}</div>
    <div class="dpft"><button data-pick="${today()}">Hôm nay</button>
      ${dp.clear ? '<button data-pick="">Xoá hạn</button>' : ''}</div>`;

  $('#dpEl').querySelectorAll('[data-mv]').forEach(b => b.onclick = () => {
    dp.month = new Date(dp.month.getFullYear(), dp.month.getMonth() + (+b.dataset.mv), 1); drawDP();
  });
  $('#dpEl').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    const v = b.dataset.pick, fn = dp.onPick; closeDP(); fn(v);
  });
}

/* ============ nhật ký: mỗi ngày nhiều trang ============ */
function jPages(date){
  let v = S.journal[date];
  if(typeof v === 'string') v = [{id:uid(), name:'Ghi chép', html:v}];
  if(!Array.isArray(v) || !v.length) v = [{id:uid(), name:'Ghi chép', html:''}];
  S.journal[date] = v;
  return v;
}
const dayHas = k => {
  const v = S.journal[k];
  if(!v) return false;
  return typeof v === 'string' ? hasText(v) : v.some(t => hasText(t.html));
};

/* ============ khung giờ & nhắc việc ============ */
// giờ của task gắn với ngày hạn chót: có t.due và t.time thì task hiện trên lịch trong ngày
const toMin  = s => +s.slice(0,2) * 60 + +s.slice(3,5);
const fmtDur = m => m < 60 ? `${m} phút` : (m % 60 ? `${Math.floor(m/60)}g${m % 60}` : `${m/60} giờ`);

// ô chọn giờ / thời lượng / nhắc trước: dùng chung cho panel chi tiết và form tạo task
function slotFieldHTML(pre, x){
  const opt = (v, n, cur) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${n}</option>`;
  const off = x.time ? '' : ' disabled';
  const times = x.time && !TIMES.includes(x.time) ? [x.time, ...TIMES].sort() : TIMES;   // giờ lẻ (sửa tay trong file) vẫn hiện đúng
  return `<div class="slot">
    <select class="inp" id="${pre}Time" title="Giờ bắt đầu">${opt('', 'Không đặt giờ', x.time || '')}${times.map(v => opt(v, v, x.time)).join('')}</select>
    <select class="inp" id="${pre}Dur" title="Thời lượng"${off}>${DURS.map(m => opt(m, fmtDur(m), x.dur || 60)).join('')}</select>
    <select class="inp" id="${pre}Rem" title="Nhắc trước"${off}>${Object.entries(REMINDS).map(([m, n]) =>
      opt(m, +m ? 'Nhắc trước ' + n : n, x.remind ?? 30)).join('')}</select>
  </div>`;
}
function bindSlotField(root, pre, set){
  root.querySelector(`#${pre}Time`).onchange = e => set('time', e.target.value);
  root.querySelector(`#${pre}Dur`).onchange  = e => set('dur', +e.target.value);
  root.querySelector(`#${pre}Rem`).onchange  = e => set('remind', +e.target.value);
}

// các task có giờ của một ngày, kèm vị trí: a/b = phút bắt đầu/kết thúc, lane/w = cột thứ mấy / trong bao nhiêu cột
function dayLayout(list, date){
  const evs = list.filter(t => t.due === date && t.time)
    .map(t => ({t, a: toMin(t.time), b: Math.min(1440, toMin(t.time) + (t.dur || 60))}))
    .sort((x, y) => x.a - y.a);
  // việc trùng giờ xếp thành các cột cạnh nhau, tính riêng cho từng cụm chồng nhau
  let group = [], lanes = [], end = 0;
  const flush = () => group.forEach(e => e.w = lanes.length);
  evs.forEach(e => {
    if(e.a >= end){ flush(); group = []; lanes = []; }
    let i = lanes.findIndex(x => x <= e.a); if(i < 0) i = lanes.push(0) - 1;
    lanes[i] = e.b; e.lane = i; group.push(e); end = Math.max(end, e.b);
  });
  flush();
  return evs;
}

/* --- lịch trong ngày ở sidebar --- */
const HH = 40;          // chiều cao 1 giờ (px)
let sdScrolled = null;  // ngày đã tự cuộn tới — vẽ lại cùng ngày thì giữ nguyên vị trí cuộn
function renderSideCal(){
  if(!ui.sDate) ui.sDate = today();
  const d = new Date(ui.sDate + 'T00:00:00');
  $('#sdDay').textContent = ui.sDate === today() ? 'Hôm nay' : `${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
  const evs = dayLayout(S.tasks.filter(t => t.status !== 'backlog'), ui.sDate);

  const box = $('#sdCal'), keep = box.scrollTop;
  box.innerHTML = `<div class="sdgrid">
    ${TIMES.map((v, i) => `<div class="sds${i % 2 ? '' : ' h'}" style="top:${i * HH / 2}px" data-slot="${v}"></div>`).join('')}
    ${evs.map(e => { const c = AREAS[e.t.area].c; return `<div class="sdev${e.t.status === 'done' ? ' done' : ''}" data-id="${e.t.id}"
        title="${e.t.time} · ${fmtDur(e.b - e.a)} — ${esc(e.t.title)}"
        style="top:${e.a / 60 * HH}px;height:${Math.max(16, (e.b - e.a) / 60 * HH - 2)}px;
               left:calc(38px + (100% - 42px) * ${e.lane} / ${e.w});width:calc((100% - 42px) / ${e.w} - 2px);
               border-left-color:${c};background:${c}33"><b>${e.t.time}</b> ${esc(e.t.title)}</div>`; }).join('')}
    ${ui.sDate === today() ? `<div class="sdnow" data-now="${HH}"></div>` : ''}
  </div>`;
  paintNow();
  if(sdScrolled !== ui.sDate){
    sdScrolled = ui.sDate;
    const h = ui.sDate === today() ? new Date().getHours() - 1 : (evs.length ? Math.floor(evs[0].a / 60) : 8);
    box.scrollTop = Math.max(0, h) * HH;
  }else box.scrollTop = keep;
}
// vạch giờ hiện tại; data-now = chiều cao 1 giờ của lịch chứa nó
function paintNow(){
  const d = new Date(), m = d.getHours() * 60 + d.getMinutes();
  $$('[data-now]').forEach(n => n.style.top = m / 60 * +n.dataset.now + 'px');
}
// bấm khung trống: đang ở form thì điền giờ vào form, không thì mở form mới
function pickSlot(date, time){
  if(ui.view === 'new' && nf){ grabForm(); nf.due = date; nf.time = time; renderForm(); }
  else { nf = blankForm(); nf.due = date; nf.time = time; ui.view = 'new'; render(); }
  setTimeout(() => $('#nTitle')?.focus(), 60);
}

/* --- nhắc việc: chỉ chạy khi app đang mở --- */
function checkReminders(){
  const now = Date.now(); let hit = 0;
  S.tasks.forEach(t => {
    if(!t.due || !t.time || !t.remind || t.status === 'done' || t.status === 'backlog') return;
    const key = `${t.due}T${t.time}|${t.remind}`;   // đổi giờ hoặc mốc nhắc thì nhắc lại
    if(t.rmd === key) return;
    const start = new Date(`${t.due}T${t.time}:00`).getTime();
    // đã tới mốc nhắc và task chưa kết thúc (mở app muộn vẫn được nhắc nếu việc còn đang diễn ra)
    if(now < start - t.remind * 6e4 || now >= start + (t.dur || 60) * 6e4) return;
    t.rmd = key; hit++;
    S.notis.unshift({id:uid(), tid:t.id, title:t.title, start:`${t.due}T${t.time}`, at:new Date().toISOString(), read:false});
    const when = start > now ? `bắt đầu lúc ${t.time} (còn ${Math.round((start - now) / 6e4)} phút)` : `đã bắt đầu lúc ${t.time}`;
    toast(`◷ ${t.title} — ${when}`);
    sysNotify(t, when);
  });
  if(hit){ S.notis = S.notis.slice(0, 50); save(); paintBell(); if(!$('#bellP').hidden) drawBell(); }
}
function sysNotify(t, body){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try{
    const n = new Notification(t.title || 'Nhắc việc', {body, tag:t.id});
    n.onclick = () => { window.focus(); openTask(t.id); n.close(); };
  }catch(e){}
}

/* --- chuông thông báo --- */
function paintBell(){
  const n = S.notis.filter(x => !x.read).length, b = $('#bellN');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
}
function drawBell(){
  const when = s => { const [d, h] = s.split('T'); return d === today() ? `hôm nay ${h}` : `${fmtVN(d)} ${h}`; };
  const ask = 'Notification' in window && Notification.permission === 'default';
  $('#bellP').innerHTML = `<div class="bphd"><b>Thông báo</b>
      ${S.notis.length ? '<button class="lblbtn" id="bClr">Xoá hết</button>' : ''}</div>
    ${ask ? '<button class="bperm" id="bPerm">Bật thông báo hệ thống — để được nhắc cả khi đang ở cửa sổ khác</button>' : ''}
    <div class="bplist">${S.notis.length
      ? S.notis.map(x => `<button class="bpi${x.read ? '' : ' new'}" data-noti="${x.tid}"><b>${esc(x.title || '(chưa đặt tên)')}</b>
          <span>Bắt đầu ${when(x.start)} · nhắc lúc ${new Date(x.at).toTimeString().slice(0,5)}</span></button>`).join('')
      : '<div class="nofil" style="padding:14px">Chưa có thông báo. Task có đặt giờ sẽ được nhắc ở đây.</div>'}</div>`;
  const P = $('#bellP');
  P.querySelector('#bClr')?.addEventListener('click', () => { S.notis = []; save(); paintBell(); drawBell(); });
  P.querySelector('#bPerm')?.addEventListener('click', async () => { try{ await Notification.requestPermission(); }catch(e){} drawBell(); });
  P.querySelectorAll('[data-noti]').forEach(b => b.onclick = () => {
    closeBell();
    if(S.tasks.some(t => t.id === b.dataset.noti)) openTask(b.dataset.noti); else toast('Task này đã bị xoá.');
  });
}
function toggleBell(){
  const P = $('#bellP');
  if(!P.hidden) return closeBell();
  drawBell(); P.hidden = false; $('#bellBtn').classList.add('on');
  // mở chuông = đã xem; mục mới vẫn có vạch đánh dấu cho tới lần mở sau
  if(S.notis.some(x => !x.read)){ S.notis.forEach(x => x.read = true); save(); }
  paintBell();
}
function closeBell(){ $('#bellP').hidden = true; $('#bellBtn').classList.remove('on'); }

/* ============ lọc ============ */
// backlog = true: chỉ lấy task "Để sau"; mặc định bỏ chúng ra
function visible(backlog = false){
  const q = ui.q.trim().toLowerCase();
  return S.tasks.filter(t => {
    if((t.status === 'backlog') !== backlog) return false;
    if(ui.tag && !(t.tags||[]).includes(ui.tag)) return false;
    if(q){
      const hay = [t.title, plain(t.note), (t.tags||[]).join(' '), (t.subs||[]).map(s=>s.t+' '+(s.n||'')).join(' ')].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}
// bộ lọc trên thanh của bảng; life = đang ở bảng cuộc sống (bảng này không lọc mảng)
function boardMatch(t, life){
  const f = ui.bf;
  if(f.prio.length && !f.prio.includes(t.prio)) return false;
  if(f.area && !life && t.area !== f.area) return false;
  if(f.due === 'over'  && dueClass(t) !== 'over') return false;
  if(f.due === 'today' && t.due !== today()) return false;
  if(f.due === 'none'  && t.due) return false;
  return true;
}
/* Khoảng thời gian của bảng. Quy tắc:
   - việc CHƯA xong: hiện nếu không có hạn, hoặc hạn nằm trong khoảng (gồm cả việc trễ hạn)
   - việc ĐÃ xong : chỉ hiện nếu hoàn thành trong khoảng
   Nhờ vậy chuyển sang "Hôm nay" không bao giờ làm mất việc còn tồn. */
function scopeWin(){
  const n = new Date();
  const plus = k => { const d = new Date(n); d.setDate(n.getDate() + k); return iso(d); };
  if(ui.scope === 'today') return {a: today(), b: today()};
  if(ui.scope === 'week')  return {a: plus(-6), b: plus(6)};
  if(ui.scope === 'month') return {a: iso(new Date(n.getFullYear(), n.getMonth(), 1)),
                                   b: iso(new Date(n.getFullYear(), n.getMonth()+1, 0))};
  return null;
}
function inScope(t){
  const w = scopeWin(); if(!w) return true;
  if(t.status === 'done')  return !!t.done && t.done >= w.a && t.done <= w.b;
  if(t.status === 'doing') return true;              // việc đang làm dở luôn hiện
  return !t.due || t.due <= w.b;
}
const dueClass = t => !t.due || t.status === 'done' ? '' : (t.due < today() ? 'over' : (t.due === today() ? 'due' : ''));
function dueLabel(t){
  if(!t.due) return '';
  const diff = Math.round((new Date(t.due) - new Date(today())) / 864e5);
  if(diff === 0) return 'Hôm nay';
  if(diff === 1) return 'Ngày mai';
  if(diff === -1) return 'Trễ 1 ngày';
  if(diff < 0) return `Trễ ${-diff} ngày`;
  const d = new Date(t.due);
  return `${d.getDate()}/${d.getMonth()+1}`;
}

/* ============ render khung ============ */
function render(){
  $$('.nav').forEach(b => b.classList.toggle('on', b.dataset.v === ui.view));
  const onBoard = S.tasks.filter(t => t.status !== 'done' && t.status !== 'backlog');
  $('#ctB').textContent = onBoard.filter(t => t.area !== 'life').length;
  $('#ctL').textContent = onBoard.filter(t => t.area === 'life').length;
  $('#ctK').textContent = S.tasks.filter(t => t.status === 'backlog').length;
  $('#ctT').textContent = S.trash.length + S.ntrash.filter(n => n.trashed).length;
  $('#ctH').textContent = hDue().filter(h => !hDone(h, today())).length;
  if(ui.view !== 'habits' && hd){ hd = null; ui.hEdit = null; }

  const tags = tagNames();
  $('#tagFil').innerHTML = tags.length
    ? tags.map(t => `<button class="tagf${ui.tag===t?' on':''}" data-tag="${esc(t)}"
        style="color:${S.tags[t]}${ui.tag===t ? `;background:${S.tags[t]}22;border-color:${S.tags[t]}` : ''}">#${esc(t)}</button>`).join('')
    : '<div class="nofil">Chưa có tag nào</div>';
  renderSideCal();

  killEds(); closePal();
  const titles = {board:'Bảng việc', life:'Bảng cuộc sống', backlog:'Để sau', habits:'Thói quen', focus:'Tập trung', cal:'Lịch', journal:'Nhật ký', notes:'Ghi chú', dash:'Tổng quan', new:'Tạo task', tags:'Quản lý tag', trash:'Thùng rác'};
  $('#vTitle').textContent = titles[ui.view];
  ({board:renderBoard, life:renderBoard, backlog:renderBacklog, habits:renderHabits, focus:renderFocus, cal:renderCal, journal:renderJournal, notes:renderNotes, dash:renderDash, new:renderForm, tags:renderTags, trash:renderTrash})[ui.view]();
  fSide(); fFullPaint(); fPaintTime(); ui.fPop = false;
  if(!storageOK) $('#view').insertAdjacentHTML('afterbegin',
    '<div class="banner">⚠ Trình duyệt đang chặn lưu trữ cục bộ nên dữ liệu sẽ mất khi đóng tab. ' +
    'Hãy bấm <b>Xuất file</b> để giữ lại, và kiểm tra xem có đang mở ở chế độ ẩn danh không.</div>');
  else if(srvErr === 'off') $('#view').insertAdjacentHTML('afterbegin',
    '<div class="banner">⚠ Chưa lưu được vào máy nên dữ liệu chỉ nằm trong trình duyệt này — xoá cache hay đổi profile Chrome là không thấy nữa. ' +
    'Hãy mở app bằng <b>run.bat</b> (cửa sổ đen phải đang mở), rồi tải lại trang.</div>');
  else if(srvErr === 'conflict') $('#view').insertAdjacentHTML('afterbegin',
    '<div class="banner">⚠ Dữ liệu vừa được sửa ở cửa sổ hoặc profile Chrome khác. Thay đổi ở đây đã được cất vào <b>data/backups</b>, không ghi đè lên — hãy <b>tải lại trang</b> để thấy bản mới nhất.</div>');
  paintSave(); paintFs(); paintBell();
}

/* ============ bảng kanban ============ */
function renderBoard(){
  // hai bảng dùng chung khung: bảng cuộc sống chỉ lấy mảng cuộc sống, bảng việc lấy phần còn lại
  const life = ui.view === 'life';
  const all = visible().filter(t => (t.area === 'life') === life && boardMatch(t, life));
  const list = all.filter(inScope);
  const f = ui.bf, nFil = f.prio.length + !!f.due + !!(f.area && !life);   // số bộ lọc đang bật, hiện trên nút Lọc
  const chip = (key, val, on, label, c) =>
    `<button class="${on ? 'on' : ''}" data-bf="${key}|${val}">${c ? `<span class="sw" style="background:${c}"></span>` : ''}${label}</button>`;
  const open = list.filter(t => t.status !== 'done').length;
  const late = list.filter(t => dueClass(t) === 'over').length;
  const hidden = all.length - list.length;
  $('#vSub').textContent = `${SCOPES[ui.scope]} · ${open} việc chưa xong` + (late ? ` · ${late} trễ hạn` : '');
  const sort = S.settings.sort || 'manual';
  // sort ổn định: cùng mức ưu tiên thì giữ thứ tự kéo thả
  const byPrio = arr => sort === 'manual' ? arr
    : [...arr].sort((a, b) => PRIO_ORDER.indexOf(a.prio) - PRIO_ORDER.indexOf(b.prio));
  const box = (items, status, prio, emptyTxt) => `<div class="cards" data-cards="${status}"${prio ? ` data-prio="${prio}"` : ''}>
        ${items.length ? items.map(card).join('') : `<div class="empty">${emptyTxt}</div>`}</div>`;

  $('#view').innerHTML = habitStrip() + `<div class="tb">
      <span class="hint">${hidden ? `Đang ẩn ${hidden} task ngoài khoảng này` : 'Đang hiện toàn bộ task khớp bộ lọc'}</span>
      <div class="bfw">
        <div class="scope"><button class="${nFil ? 'on' : ''}" data-bfbtn>Lọc${nFil ? ` · ${nFil}` : ''}</button></div>
        <div class="bfp"${ui.bfOpen ? '' : ' hidden'}>
          <div class="flbl">Khoảng thời gian</div>
          <div class="chips">${Object.entries(SCOPES).map(([k,n]) =>
            `<button class="${ui.scope===k?'on':''}" data-scope="${k}">${n}</button>`).join('')}</div>
          <div class="flbl">Ưu tiên</div>
          <div class="chips">${PRIO_ORDER.map(p => chip('prio', p, f.prio.includes(p), PRIOS[p].n, PRIOS[p].c)).join('')}</div>
          <div class="flbl">Hạn</div>
          <div class="chips">${Object.entries(DUES).map(([k,n]) => chip('due', k, f.due === k, n)).join('')}</div>
          ${life ? '' : `<div class="flbl">Mảng</div>
          <div class="chips">${['work','other'].map(k => chip('area', k, f.area === k, AREAS[k].n, AREAS[k].c)).join('')}</div>`}
          <div class="flbl">Sắp xếp</div>
          <div class="chips">${Object.entries(SORTS).map(([k,n]) =>
            `<button class="${sort===k?'on':''}" data-sort="${k}">${n}</button>`).join('')}</div>
          ${nFil ? '<button class="bfclr" data-bfclr>✕ Bỏ lọc</button>' : ''}
        </div>
      </div>
      <div class="scope"><button class="${S.settings.zen?'on':''}" data-zen title="Thẻ chỉ còn tên task và hạn khi sắp/trễ hạn">Zen</button></div>
    </div>`
    + '<div id="board">' + Object.entries(COLS).map(([k,c]) => {
    let items = byPrio(list.filter(t => t.status === k));
    // cột Xong: mới xong lên đầu, mặc định chỉ hiện DONE_MAX task gần nhất; bật "Hôm nay" thì chỉ giữ task xong hôm nay
    let more = 0;
    if(k === 'done'){
      if(ui.doneToday) items = items.filter(t => t.done === today());
      items = [...items].sort((a, b) => (b.done || '').localeCompare(a.done || ''));
      more = items.length - DONE_MAX;
    }
    const shown = more > 0 && !ui.doneAll ? items.slice(0, DONE_MAX) : items;
    const body = sort === 'group'
      ? `<div class="pgrps">${PRIO_ORDER.map(p => {
          const g = shown.filter(t => t.prio === p);
          return `<div class="pgrp"><div class="pgrphd"><span class="sw" style="background:${PRIOS[p].c}"></span>${PRIOS[p].n}<span class="n">${g.length}</span></div>
            ${box(g, k, p, 'Kéo vào đây')}</div>`;
        }).join('')}</div>`
      : box(shown, k, null, 'Kéo task vào đây');
    return `<section class="col" data-col="${k}">
      <div class="colhd"><span class="sw" style="background:${c.c}"></span>${c.n}
        <span class="n">${items.length}</span>
        ${k === 'done' ? `<button class="dtoday${ui.doneToday ? ' on' : ''}" data-dtoday title="Chỉ hiện task xong hôm nay">Hôm nay</button>` : ''}
        <button class="add" data-add="${k}" title="Thêm vào cột này">+</button></div>
      ${body}
      ${more > 0 ? `<button class="donemore" data-more>${ui.doneAll ? 'Thu gọn' : `Xem thêm ${more} task`}</button>` : ''}</section>`;
  }).join('') + '</div>';

  $$('[data-sort]').forEach(b => b.onclick = () => { S.settings.sort = b.dataset.sort; save(); renderBoard(); });
  $$('[data-dtoday]').forEach(b => b.onclick = () => { ui.doneToday = !ui.doneToday; renderBoard(); });
  $$('[data-more]').forEach(b => b.onclick = () => { ui.doneAll = !ui.doneAll; renderBoard(); });
  $$('[data-zen]').forEach(b => b.onclick = () => { S.settings.zen = !S.settings.zen; save(); renderBoard(); });
  $$('[data-bfbtn]').forEach(b => b.onclick = () => { ui.bfOpen = !ui.bfOpen; renderBoard(); });
  // ưu tiên chọn được nhiều mức; hạn và mảng chỉ một, bấm lại để bỏ
  $$('[data-bf]').forEach(b => b.onclick = () => {
    const [k, v] = b.dataset.bf.split('|');
    if(k === 'prio') f.prio = f.prio.includes(v) ? f.prio.filter(x => x !== v) : [...f.prio, v];
    else f[k] = f[k] === v ? null : v;
    renderBoard();
  });
  $$('[data-bfclr]').forEach(b => b.onclick = () => { ui.bf = {prio:[], due:null, area:null}; renderBoard(); });
  wireDnD();
}
function card(t){
  const a = AREAS[t.area], p = PRIOS[t.prio], dc = dueClass(t);
  const nSub = (t.subs||[]).length, dSub = (t.subs||[]).filter(s => s.d).length;
  // zen: chỉ tên task, hạn chỉ hiện khi hôm nay hoặc đã trễ
  if(S.settings.zen) return `<article class="card zen${t.status==='done'?' done':''}" draggable="true" data-id="${t.id}" style="border-left-color:${a.c}">
    <div class="t">${t.title.trim() ? esc(t.title) : '<span class="ph">(chưa đặt tên)</span>'}</div>
    ${dc ? `<div class="crow"><span class="meta ${dc}">◷ ${dueLabel(t)}${t.time ? ' ' + t.time : ''}</span></div>` : ''}</article>`;
  return `<article class="card${t.status==='done'?' done':''}" draggable="true" data-id="${t.id}" style="border-left-color:${a.c}">
    <div class="t">${t.title.trim() ? esc(t.title) : '<span class="ph">(chưa đặt tên)</span>'}</div>
    ${t.pg > 0 ? `<div class="pg"><i style="width:${t.pg}%"></i></div>` : ''}
    <div class="crow">
      <span class="pill" style="background:${p.c}22;color:${p.c}">${p.n}</span>
      ${(t.tags||[]).slice(0,2).map(x => `<span class="tg" style="${tagStyle(x)}">#${esc(x)}</span>`).join('')}
      ${nSub ? `<span class="meta">☑ ${dSub}/${nSub}</span>` : ''}
      ${hasText(t.note) ? '<span class="meta" title="Có ghi chú">✎</span>' : ''}
      ${t.due ? `<span class="meta ${dc}">◷ ${dueLabel(t)}${t.time ? ' ' + t.time : ''}</span>` : ''}
      ${t.status === 'done' && t.done ? `<span class="meta ok" title="Ngày hoàn thành">✓ ${fmtVN(t.done)}</span>` : ''}
      ${t.pg > 0 && t.pg < 100 ? `<span class="meta" style="margin-left:auto">${t.pg}%</span>` : ''}
    </div></article>`;
}

/* ============ kéo thả ============ */
let dragId = null, ph = null;
function wireDnD(){
  $$('.card').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragId = el.dataset.id; el.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
      $('#trashZone').classList.add('on');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('drag'); dragId = null;
      if(ph) ph.remove(); ph = null;
      $$('.col').forEach(c => c.classList.remove('over'));
      $('#trashZone').classList.remove('on', 'over');
    });
  });

  $$('.cards').forEach(box => {
    box.addEventListener('dragover', e => {
      e.preventDefault();
      box.closest('.col').classList.add('over');
      if(!ph){ ph = document.createElement('div'); ph.className = 'drop'; }
      const after = cardAfter(box, e.clientY);
      box.querySelector('.empty')?.remove();
      if(after) box.insertBefore(ph, after); else box.appendChild(ph);
    });
    box.addEventListener('dragleave', e => {
      if(!box.contains(e.relatedTarget)) box.closest('.col').classList.remove('over');
    });
    box.addEventListener('drop', e => {
      e.preventDefault();
      const status = box.dataset.cards;
      const t = S.tasks.find(x => x.id === dragId);
      if(!t) return;
      if(box.dataset.prio) t.prio = box.dataset.prio;   // chế độ chia nhóm: thả vào nhóm nào thì đổi ưu tiên theo nhóm đó
      const beforeEl = ph && ph.nextElementSibling && ph.nextElementSibling.dataset
                       ? ph.nextElementSibling.dataset.id : null;
      S.tasks = S.tasks.filter(x => x.id !== t.id);
      if(t.status !== status){
        t.status = status;
        if(status === 'done'){ t.pg = 100; t.done = today(); }
        else { t.done = null; if(t.pg === 100) t.pg = 75; if(status === 'doing' && t.pg === 0) t.pg = 25; }
      }
      const at = beforeEl ? S.tasks.findIndex(x => x.id === beforeEl) : -1;
      if(at >= 0) S.tasks.splice(at, 0, t);
      else {
        const last = S.tasks.map(x => x.status).lastIndexOf(status);
        if(last >= 0) S.tasks.splice(last + 1, 0, t); else S.tasks.push(t);
      }
      $('#trashZone').classList.remove('on', 'over');   // render() thay card đang kéo nên dragend có thể không chạy
      save(); render();
    });
  });
}
function cardAfter(box, y){
  const els = [...box.querySelectorAll('.card:not(.drag)')];
  return els.find(el => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; }) || null;
}

/* ============ panel chi tiết ============ */
function openTask(id){
  ui.open = id;
  drawTask(); $('#drawer').classList.add('on'); $('#scrim').classList.add('on');
}
function closeDrawer(){
  ui.open = null; $('#drawer').classList.remove('on'); $('#scrim').classList.remove('on');
  render();
}
// việc con: dùng chung cho panel chi tiết (có ô tick) và form tạo task (không có)
function subsHTML(subs, withCb){
  return subs.map(s => `<div class="subitem"><div class="subrow${s.d?' on':''}">
    ${withCb ? `<span class="cb${s.d?' on':''}" data-tog="${s.id}">✓</span>` : ''}
    <input value="${esc(s.t)}" data-sub="${s.id}" placeholder="Tên việc con">
    <button class="nt${s.n?' has':''}" data-nsub="${s.id}" title="Mô tả">≡</button>
    <button class="del" data-dsub="${s.id}">✕</button></div>
    <textarea class="subnote" data-subn="${s.id}" placeholder="Mô tả, ghi chú cho việc con…"${s.n?'':' hidden'}>${esc(s.n||'')}</textarea></div>`).join('');
}
// gắn sự kiện gõ chữ; onText chạy sau mỗi lần sửa tên/mô tả
function bindSubs(root, subs, onText){
  const find = id => subs.find(s => s.id === id);
  root.querySelectorAll('[data-sub]').forEach(inp => inp.oninput = () => { find(inp.dataset.sub).t = inp.value; onText(); });
  root.querySelectorAll('[data-subn]').forEach(ta => ta.oninput = () => {
    find(ta.dataset.subn).n = ta.value; onText();
    root.querySelector(`[data-nsub="${ta.dataset.subn}"]`).classList.toggle('has', !!ta.value);
  });
  root.querySelectorAll('[data-nsub]').forEach(b => b.onclick = () => {
    const ta = root.querySelector(`[data-subn="${b.dataset.nsub}"]`);
    ta.hidden = !ta.hidden && !ta.value;   // mô tả trống thì bấm lại để ẩn
    if(!ta.hidden) ta.focus();
  });
}
function drawTask(){
  killEd('dN');
  const t = S.tasks.find(x => x.id === ui.open);
  if(!t) return closeDrawer();
  const segs = (obj, cur, act) => Object.entries(obj).map(([k,v]) =>
    `<button class="${cur===k?'on':''}" style="${cur===k?`background:${v.c};border-color:${v.c}`:''}" data-${act}="${k}">${v.n}</button>`).join('');

  $('#drawer').innerHTML = `
    <div class="dhd">
      <span class="pill" style="background:${AREAS[t.area].c}22;color:${AREAS[t.area].c}">${AREAS[t.area].n}</span>
      <span class="meta">${STATUSES[t.status].n}</span>
      <button class="x" id="dX">✕</button>
    </div>
    <div class="dbody">
      <input class="tt" id="dT" value="${esc(t.title)}" placeholder="Tên task">

      <div class="fld"><label>Mảng</label><div class="seg">${segs(AREAS, t.area, 'area')}</div></div>
      <div class="fld"><label>Ưu tiên</label><div class="seg">${segs(PRIOS, t.prio, 'prio')}</div></div>
      <div class="fld"><label>Trạng thái</label><div class="seg">${segs(STATUSES, t.status, 'st')}</div></div>

      <div class="fld"><label>Tiến độ — ${t.pg}%</label>
        <div class="seg">${[0,25,50,75,100].map(p =>
          `<button class="${t.pg===p?'on':''}" style="${t.pg===p?'background:#6366f1;border-color:#6366f1':''}" data-pg="${p}">${p}%</button>`).join('')}</div>
        <div class="pg" style="margin:2px 0 0"><i style="width:${t.pg}%"></i></div>
      </div>

      <div class="fld"><label>Hạn chót</label>
        ${dateBtn('dD', t.due, 'Chưa đặt hạn')}</div>

      ${t.status === 'done' ? `<div class="fld"><label>Ngày xong</label>
        ${dateBtn('dDone', t.done, 'Chưa ghi ngày xong')}</div>` : ''}

      <div class="fld"><label>Giờ · thời lượng · nhắc trước</label>
        ${slotFieldHTML('d', t)}</div>

      <div class="fld"><label>Tag</label>
        ${tagFieldHTML('tagIn', t.tags||[], 'Chọn tag bên dưới hoặc gõ tag mới rồi Enter')}</div>

      <div class="fld"><label>Việc con ${(t.subs||[]).length ? `— ${t.subs.filter(s=>s.d).length}/${t.subs.length}` : ''}</label>
        <div id="subs">${subsHTML(t.subs||[], true)}</div>
        <button class="addsub" id="addSub">+ Thêm việc con</button></div>

      <div class="fld"><label>Ghi chú</label><div id="dN"></div></div>
    </div>
    <div class="dfoot">
      <span class="meta">Tạo ${fmtVN(t.cr) || '—'}</span>
      <button class="danger" id="dDel" style="margin-left:auto">Chuyển vào thùng rác</button>
    </div>`;

  const D = $('#drawer');
  const patch = (fn) => { fn(S.tasks.find(x => x.id === ui.open)); save(); drawTask(); };

  $('#dX').onclick = closeDrawer;
  $('#dT').oninput = e => { t.title = e.target.value; save(); };
  $('#dD').onclick = e => openDP(e.currentTarget, t.due, v => patch(x => { x.due = v; if(!v) x.time = ''; }), true);
  if($('#dDone')) $('#dDone').onclick = e => openDP(e.currentTarget, t.done, v => patch(x => x.done = v));
  // đặt giờ khi chưa có hạn thì lấy hôm nay làm ngày
  bindSlotField(D, 'd', (k, v) => patch(x => {
    x[k] = v;
    if(k === 'time' && v){ if(!x.due) x.due = today(); x.dur = x.dur || 60; x.remind = x.remind ?? 30; }
  }));
  mountEd('dN', t.note, 'Suy nghĩ vụn vặt, link, ý tưởng… Gõ / để chèn khối', v => { t.note = v; save(); });

  D.querySelectorAll('[data-area]').forEach(b => b.onclick = () => patch(x => x.area = b.dataset.area));
  D.querySelectorAll('[data-prio]').forEach(b => b.onclick = () => patch(x => x.prio = b.dataset.prio));
  D.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => patch(x => {
    x.pg = +b.dataset.pg;
    if(x.pg === 100){ x.status = 'done'; x.done = today(); }
    else if(x.status === 'done'){ x.status = 'doing'; x.done = null; }
  }));
  D.querySelectorAll('[data-st]').forEach(b => b.onclick = () => patch(x => {
    x.status = b.dataset.st;
    if(x.status === 'done'){ x.pg = 100; x.done = today(); }
    else { x.done = null; if(x.pg === 100) x.pg = 75; }
  }));
  bindTagField(D, 'tagIn', t.tags||[],
    n => { patch(x => { x.tags = x.tags || []; if(!x.tags.includes(n)) x.tags.push(n); }); setTimeout(() => $('#tagIn')?.focus(), 0); },
    n => patch(x => x.tags = x.tags.filter(v => v !== n)));
  D.querySelectorAll('[data-tog]').forEach(b => b.onclick = () => patch(x => {
    const s = x.subs.find(s => s.id === b.dataset.tog); s.d = !s.d;
  }));
  D.querySelectorAll('[data-dsub]').forEach(b => b.onclick = () => patch(x => x.subs = x.subs.filter(s => s.id !== b.dataset.dsub)));
  bindSubs(D, t.subs||[], save);

  $('#addSub').onclick = () => {
    patch(x => { x.subs = x.subs || []; x.subs.push({id:uid(), t:'', d:false}); });
    const rows = $('#subs').querySelectorAll('input'); rows[rows.length-1]?.focus();
  };
  $('#dDel').onclick = () => {
    trashTask(t.id); closeDrawer();
  };
}

/* ============ lịch ============ */
const CAL_MODES = {day:'Ngày', week:'Tuần', month:'Tháng'};
function renderCal(){
  if(!ui.calD) ui.calD = today();
  if(!CAL_MODES[ui.calMode]) ui.calMode = 'month';
  const A = new Date(ui.calD + 'T00:00:00');
  const move = n => {   // lùi / tiến 1 ngày, 1 tuần hoặc 1 tháng tuỳ chế độ
    const x = new Date(A);
    if(ui.calMode === 'month') x.setDate(1), x.setMonth(x.getMonth() + n);
    else x.setDate(x.getDate() + n * (ui.calMode === 'week' ? 7 : 1));
    ui.calD = iso(x); renderCal();
  };
  if(ui.calMode === 'month') renderMonth(A);
  else renderTimeGrid(A);
  $('#calModes').innerHTML = Object.entries(CAL_MODES).map(([k, n]) =>
    `<button class="${ui.calMode === k ? 'on' : ''}" data-cm="${k}">${n}</button>`).join('');
  $$('[data-cm]').forEach(b => b.onclick = () => { ui.calMode = S.settings.calMode = b.dataset.cm; save(); renderCal(); });
  $('#pm').onclick  = () => move(-1);
  $('#nm').onclick  = () => move(1);
  $('#tdy').onclick = () => { ui.calD = today(); renderCal(); };
}
const calBar = (title, hint) => `<div class="calbar">
    <button class="nvb" id="pm">‹</button><button class="nvb" id="nm">›</button>
    <h2>${title}</h2>
    <button class="btn ghost" id="tdy">Hôm nay</button>
    <div class="scope" id="calModes"></div>
    <span class="meta" style="margin-left:auto">${hint}</span>
  </div>`;

/* --- tuần / ngày: lưới giờ như Google Calendar --- */
const GH = 48;          // chiều cao 1 giờ ở lịch lớn (px)
let calScroll = null;   // khoảng ngày đã tự cuộn tới — vẽ lại cùng khoảng thì giữ vị trí cuộn
function renderTimeGrid(A){
  const n = ui.calMode === 'week' ? 7 : 1;
  const start = new Date(A); if(n === 7) start.setDate(A.getDate() - A.getDay());
  const days = Array.from({length:n}, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const keys = days.map(iso), list = visible();
  const a = days[0], b = days[n - 1];
  const title = n === 1 ? `${DOW[a.getDay()]}, ${a.getDate()}/${a.getMonth()+1}/${a.getFullYear()}`
    : a.getMonth() === b.getMonth() ? `${a.getDate()} – ${b.getDate()} / ${b.getMonth()+1} / ${b.getFullYear()}`
    : `${a.getDate()}/${a.getMonth()+1} – ${b.getDate()}/${b.getMonth()+1}/${b.getFullYear()}`;
  const timed = list.filter(t => t.time && keys.includes(t.due)).length;
  const allDay = list.filter(t => !t.time && keys.includes(t.due)).length;
  $('#vSub').textContent = `${timed} task có giờ · ${allDay} task cả ngày`;

  const old = $('#wvBox'), keep = old ? old.scrollTop : 0;
  const cols = `style="--cols:${n}"`;
  $('#view').innerHTML = calBar(title, 'Bấm khung giờ trống để tạo task · bấm tên ngày để xem riêng ngày đó') + `
    <div class="wv" id="wvBox">
      <div class="wvhead">
        <div class="wvrow" ${cols}><div></div>${days.map((d, i) => `<div class="wvdh${keys[i] === today() ? ' today' : ''}" data-cday="${keys[i]}">
          <div class="w">${DOW[d.getDay()]}</div><div class="n"><span>${d.getDate()}</span></div></div>`).join('')}</div>
        <div class="wvrow wvall" ${cols}><div class="wvlbl">Cả ngày</div>${keys.map(k => {
          const evs = list.filter(t => t.due === k && !t.time);
          return `<div class="wvallc">${evs.slice(0, 3).map(t => `<div class="ev${t.status === 'done' ? ' done' : ''}" style="border-left-color:${AREAS[t.area].c}" data-id="${t.id}">${esc(t.title)}</div>`).join('')}
            ${evs.length > 3 ? `<div class="more" data-cday="${k}">+${evs.length - 3} nữa</div>` : ''}</div>`;
        }).join('')}</div>
      </div>
      <div class="wvgrid" ${cols}>
        <div class="wvhr">${TIMES.filter((_, i) => i % 2 === 0 && i).map((v, i) => `<span style="top:${(i + 1) * GH}px">${v}</span>`).join('')}</div>
        ${keys.map(k => `<div class="wvcol${k === today() ? ' today' : ''}">
          ${TIMES.map((v, i) => `<div class="wvs${i % 2 ? '' : ' h'}" style="top:${i * GH / 2}px" data-cslot="${k}|${v}" data-slot="${v}"></div>`).join('')}
          ${dayLayout(list, k).map(e => { const c = AREAS[e.t.area].c; return `<div class="wvev${e.t.status === 'done' ? ' done' : ''}${e.b - e.a < 45 ? ' short' : ''}" data-id="${e.t.id}"
              title="${e.t.time} · ${fmtDur(e.b - e.a)} — ${esc(e.t.title)}"
              style="top:${e.a / 60 * GH}px;height:${Math.max(20, (e.b - e.a) / 60 * GH - 2)}px;
                     left:calc((100% - 6px) * ${e.lane} / ${e.w} + 2px);width:calc((100% - 6px) / ${e.w} - 2px);
                     border-left-color:${c};background:${c}33">
              <b>${esc(e.t.title) || '<span class="ph">(chưa đặt tên)</span>'}</b><span class="tm">${e.t.time} · ${fmtDur(e.b - e.a)}</span></div>`; }).join('')}
          ${k === today() ? `<div class="sdnow" data-now="${GH}"></div>` : ''}
        </div>`).join('')}
      </div>
    </div>`;
  paintNow();

  const box = $('#wvBox'), key = ui.calMode + keys[0];
  if(calScroll !== key){
    calScroll = key;
    const first = Math.min(...keys.flatMap(k => dayLayout(list, k).map(e => e.a)));
    const h = keys.includes(today()) ? new Date().getHours() - 1 : (isFinite(first) ? Math.floor(first / 60) : 7);
    box.scrollTop = Math.max(0, h) * GH;
  }else box.scrollTop = keep;

  box.onclick = e => {
    const ev = e.target.closest('[data-id]');
    if(ev) return openTask(ev.dataset.id);
    const day = e.target.closest('[data-cday]');
    if(day){ ui.calD = day.dataset.cday; ui.calMode = 'day'; return renderCal(); }
    const s = e.target.closest('[data-cslot]');
    if(s){ const [d, t] = s.dataset.cslot.split('|'); pickSlot(d, t); }
  };
}

/* --- tháng --- */
function renderMonth(A){
  const y = A.getFullYear(), m = A.getMonth();
  const first = new Date(y, m, 1), start = new Date(first);
  start.setDate(1 - first.getDay());
  const list = visible();

  let cells = '';
  for(let i = 0; i < 42; i++){
    const d = new Date(start); d.setDate(start.getDate() + i);
    const key = iso(d), off = d.getMonth() !== m;
    const evs = list.filter(t => t.due === key);
    const hasJ = dayHas(key);
    cells += `<div class="cell${off?' off':''}${key===today()?' today':''}" data-day="${key}">
      <div class="cellhd"><span class="dn">${d.getDate()}</span>${hasJ?'<span class="jdot">✎</span>':''}</div>
      ${evs.slice(0,3).map(t => `<div class="ev${t.status==='done'?' done':''}" style="border-left-color:${AREAS[t.area].c}" data-id="${t.id}">${t.time ? `<b>${t.time}</b> ` : ''}${esc(t.title)}</div>`).join('')}
      ${evs.length > 3 ? `<div class="more">+${evs.length-3} nữa</div>` : ''}
    </div>`;
  }
  const withDue = list.filter(t => t.due && t.due.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length;
  $('#vSub').textContent = `${withDue} task có hạn trong tháng này`;
  $('#view').innerHTML = calBar(`Tháng ${m+1} / ${y}`, 'Bấm vào ngày để mở nhật ký · bấm task để xem chi tiết') + `
    <div class="cal">${DOW.map(d => `<div class="dow">${d}</div>`).join('')}${cells}</div>`;

  $$('.cell').forEach(c => c.onclick = e => {
    const ev = e.target.closest('.ev');
    if(ev) return openTask(ev.dataset.id);
    ui.jDate = c.dataset.day; ui.jTab = 0; ui.view = 'journal'; render();
  });
}

/* ============ nhật ký ============ */
function renderJournal(){
  if(!ui.jDate) ui.jDate = today();
  const d = new Date(ui.jDate + 'T00:00:00');
  const pages = jPages(ui.jDate);
  if(ui.jTab >= pages.length) ui.jTab = 0;
  const page = pages[ui.jTab];
  const days = Object.keys(S.journal).filter(dayHas).length;
  $('#vSub').textContent = `${days} ngày đã viết`;

  const due = S.tasks.filter(t => t.due === ui.jDate && t.status !== 'backlog');
  $('#view').innerHTML = `<div class="jwrap">
    <div class="jbar">
      <button class="nvb" id="pd">‹</button><button class="nvb" id="nd">›</button>
      <div><h2>${DOW[d.getDay()]}, ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}</h2>
      <div class="sub">${due.length ? `${due.length} task đến hạn hôm nay` : 'Không có task nào đến hạn'}</div></div>
      ${dateBtn('jDp', ui.jDate, 'Chọn ngày', 'width:auto')}
      <button class="btn ghost" id="jTd">Hôm nay</button>
      <span class="hint">Gõ <b>/</b> để chèn khối · kéo mép dưới để chỉnh chiều cao</span>
    </div>
    <div class="jtabs">
      ${pages.map((t, i) => `<button class="jtab${i === ui.jTab ? ' on' : ''}" data-jt="${i}">${esc(t.name)}</button>`).join('')}
      <button class="jtab ico" id="jAdd" title="Thêm trang mới cho ngày này">+</button>
      <button class="jtab ico" id="jRen" title="Đổi tên trang">✎</button>
      ${pages.length > 1 ? '<button class="jtab ico" id="jDel" title="Xoá trang này">✕</button>' : ''}
    </div>
    <div class="jed" id="jHost" style="height:${S.settings.jH}px"></div></div>`;

  const shift = n => { const x = new Date(ui.jDate + 'T00:00:00'); x.setDate(x.getDate() + n); ui.jDate = iso(x); ui.jTab = 0; renderJournal(); };
  $('#pd').onclick = () => shift(-1);
  $('#nd').onclick = () => shift(1);
  $('#jTd').onclick = () => { ui.jDate = today(); ui.jTab = 0; renderJournal(); };
  $('#jDp').onclick = e => openDP(e.currentTarget, ui.jDate,
    v => { if(v){ ui.jDate = v; ui.jTab = 0; renderJournal(); } }, false);
  mountEd('jHost', page.html, 'Hôm nay bạn nghĩ gì…', v => { page.html = v; save(); });

  $$('[data-jt]').forEach(b => b.onclick = () => { ui.jTab = +b.dataset.jt; renderJournal(); });
  $('#jAdd').onclick = () => {
    pages.push({id:uid(), name:'Trang ' + (pages.length + 1), html:''});
    ui.jTab = pages.length - 1; save(); renderJournal();
  };
  $('#jRen').onclick = () => {
    const n = prompt('Tên trang:', page.name);
    if(n && n.trim()){ page.name = n.trim(); save(); renderJournal(); }
  };
  if($('#jDel')) $('#jDel').onclick = () => {
    if(!confirm(`Xoá trang "${page.name}" của ngày này?`)) return;
    pages.splice(ui.jTab, 1); ui.jTab = 0; save(); renderJournal();
  };
  // nhớ chiều cao khung sau khi kéo giãn
  const host = $('#jHost');
  new ResizeObserver(() => {
    const h = Math.round(host.getBoundingClientRect().height);
    if(h && Math.abs(h - S.settings.jH) > 4){ S.settings.jH = h; save(); }
  }).observe(host);
}

/* ============ ghi chú: trang không theo ngày, lồng nhau như Notion ============ */
// S.notes: {id, title, html, parent (id trang cha, null = cấp gốc), tags, pin, open (đang mở trang con ở cây), cr, mod}
// cr / mod = thời điểm tạo / sửa lần cuối (ISO). Thứ tự các trang cùng cha = thứ tự trong mảng.
// Bỏ một trang thì cả cây con sang S.ntrash; chỉ trang được bấm bỏ có trường trashed.
const nKids  = id => S.notes.filter(n => n.parent === id);
const nTitle = n => n.title.trim() ? esc(n.title) : '<span class="ph">Không có tiêu đề</span>';
const nName  = n => esc(n.title.trim() || 'Không có tiêu đề');
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
  if(m < 1) return 'vừa xong';
  if(m < 60) return `${m} phút trước`;
  if(iso(d) === today()) return `hôm nay ${hm}`;
  if(iso(d) === iso(y)) return `hôm qua ${hm}`;
  return fmtStamp(s);
}

function newNote(parent = null){
  const now = new Date().toISOString();
  const n = {id:uid(), title:'', html:'', parent, tags: ui.tag ? [ui.tag] : [], pin:false, open:false, cr:now, mod:now};
  S.notes.push(n);
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
  toast(tree.length > 1 ? `Đã chuyển trang và ${tree.length - 1} trang con vào thùng rác` : 'Đã chuyển vào thùng rác');
}

function renderNotes(){
  if(!S.notes.some(n => n.id === ui.nOpen)) ui.nOpen = (S.notes.find(n => n.pin) || S.notes.find(n => !n.parent) || {}).id || null;
  const n = S.notes.find(x => x.id === ui.nOpen);
  $('#vSub').textContent = `${S.notes.length} trang`;

  const moveTo = n && nFlat(new Set([n.id])).filter(x => x.n.id !== n.parent);
  $('#view').innerHTML = `<div class="nwrap">
    <div class="nside">
      <button class="btn" id="ntNew">+ Trang mới</button>
      <div id="ntList"></div>
    </div>
    <div class="npage">${n ? `
      <div class="ncrumb">${nPath(n).map(p => `<button data-nid="${p.id}">${nName(p)}</button><span>/</span>`).join('')}</div>
      <input class="nttl" id="ntTitle" value="${esc(n.title)}" placeholder="Không có tiêu đề" autocomplete="off">
      <div class="nmeta">
        <span class="meta" title="Ngày tạo">Tạo ${fmtStamp(n.cr)}</span><span class="meta">·</span>
        <span class="meta" id="ntMod" data-ago="${n.mod}" title="${fmtStamp(n.mod)}">Sửa lần cuối ${fmtAgo(n.mod)}</span>
        <div class="nacts">
          <button class="btn ghost" id="ntPin">${n.pin ? '★ Bỏ ghim' : '☆ Ghim'}</button>
          <button class="btn ghost" id="ntKid">+ Trang con</button>
          ${n.parent || moveTo.length ? `<select class="inp nmove" id="ntMove" title="Chuyển trang này vào trong trang khác">
            <option value="" selected disabled>Chuyển vào…</option>
            ${n.parent ? '<option value="/">Cấp gốc</option>' : ''}
            ${moveTo.map(x => `<option value="${x.n.id}">${'   '.repeat(x.depth)}${nName(x.n)}</option>`).join('')}
          </select>` : ''}
          <button class="danger" id="ntDel">Chuyển vào thùng rác</button>
        </div>
      </div>
      <div class="fld">${tagFieldHTML('ntTag', n.tags, 'Gắn tag: chọn bên dưới hoặc gõ tag mới rồi Enter')}</div>
      <div class="ned" id="ntHost"></div>`
    : '<div class="empty">Chưa có trang nào. Bấm <b>+ Trang mới</b> để bắt đầu.</div>'}</div>
  </div>`;

  drawNoteList();
  $('#ntNew').onclick = () => newNote();
  $('.nwrap').onclick = e => {   // cây trang, kết quả tìm, đường dẫn phía trên tiêu đề
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
    const m = $('#ntMod'); m.dataset.ago = n.mod; m.title = fmtStamp(n.mod); m.textContent = 'Sửa lần cuối ' + fmtAgo(n.mod);
  };
  $('#ntTitle').oninput = e => {
    n.title = e.target.value; touch();
    $$(`#ntList [data-nid="${n.id}"] .nname`).forEach(el => el.innerHTML = nTitle(n));
  };
  $('#ntTitle').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); EDS.get('ntHost')?.commands.focus('start'); } };
  mountEd('ntHost', n.html, 'Viết gì đó… Gõ / để chèn khối', v => { n.html = v; touch(); });
  $('#ntPin').onclick = () => { n.pin = !n.pin; save(); renderNotes(); };
  $('#ntKid').onclick = () => newNote(n.id);
  if($('#ntMove')) $('#ntMove').onchange = e => {
    const to = e.target.value === '/' ? null : e.target.value;
    S.notes = S.notes.filter(x => x !== n); S.notes.push(n);   // xuống cuối danh sách con của cha mới
    n.parent = to;
    if(to) S.notes.find(x => x.id === to).open = true;
    save(); renderNotes();
  };
  $('#ntDel').onclick = () => trashNote(n.id);
  bindTagField($('.npage'), 'ntTag', n.tags,
    t => { if(!n.tags.includes(t)) n.tags.push(t); touch(); render(); setTimeout(() => $('#ntTag')?.focus(), 0); },
    t => { n.tags = n.tags.filter(x => x !== t); touch(); render(); });
}
// cột trái: bình thường là cây trang; đang tìm hoặc lọc tag thì thành danh sách phẳng, mới sửa lên đầu
function drawNoteList(){
  const box = $('#ntList'); if(!box) return;
  const q = ui.q.trim().toLowerCase();
  if(q || ui.tag){
    const hit = S.notes.filter(n => (!ui.tag || n.tags.includes(ui.tag))
        && (!q || [n.title, plain(n.html), n.tags.join(' ')].join(' ').toLowerCase().includes(q)))
      .sort((a, b) => b.mod.localeCompare(a.mod));
    box.innerHTML = `<div class="nlbl">${hit.length} trang khớp${ui.tag ? ` tag #${esc(ui.tag)}` : ''}</div>`
      + (hit.length ? hit.map(n => `<button class="nhit${n.id === ui.nOpen ? ' on' : ''}" data-nid="${n.id}">
          <span class="nname">${nTitle(n)}</span>
          <span class="nsub">${nPath(n).map(p => nName(p) + ' / ').join('')}sửa ${fmtAgo(n.mod)}</span></button>`).join('')
        : '<div class="nofil" style="padding:4px 8px">Không có trang nào khớp</div>');
    return;
  }
  const row = (n, depth, tree) => {
    const kids = tree ? nKids(n.id) : [];
    return `<div class="nrow${n.id === ui.nOpen ? ' on' : ''}" data-nid="${n.id}" style="padding-left:${2 + depth * 14}px">
        ${!tree ? '<span class="ncar">★</span>'
          : kids.length ? `<button class="ncar" data-ntog="${n.id}">${n.open ? '▾' : '▸'}</button>` : '<span class="ncar">·</span>'}
        <span class="nname">${nTitle(n)}</span>
        ${tree ? `<button class="nadd" data-nkid="${n.id}" title="Thêm trang con">+</button>` : ''}</div>
      ${kids.length && n.open ? kids.map(k => row(k, depth + 1, true)).join('') : ''}`;
  };
  const pins = S.notes.filter(n => n.pin), roots = nKids(null);
  box.innerHTML = (pins.length ? `<div class="nlbl">Đã ghim</div>${pins.map(n => row(n, 0, false)).join('')}` : '')
    + `<div class="nlbl">Tất cả trang</div>`
    + (roots.length ? roots.map(n => row(n, 0, true)).join('') : '<div class="nofil" style="padding:4px 8px">Chưa có trang nào</div>');
}

/* ============ tổng quan ============ */
function renderDash(){
  const list = visible();
  const by = k => list.filter(t => t.status === k).length;
  const done = by('done'), total = list.length;
  const rate = total ? Math.round(done / total * 100) : 0;
  const overdue = list.filter(t => dueClass(t) === 'over').length;

  const wk = []; const n = new Date();
  for(let i = 6; i >= 0; i--){
    const d = new Date(n); d.setDate(n.getDate() - i);
    wk.push({k:iso(d), l:DOW[d.getDay()], v:list.filter(t => t.done === iso(d)).length});
  }
  const mx = Math.max(1, ...wk.map(d => d.v));
  const week = wk.reduce((a,b) => a + b.v, 0);
  const avgPg = total ? Math.round(list.reduce((a,t) => a + (t.pg||0), 0) / total) : 0;

  const jDays = Object.keys(S.journal).filter(dayHas);
  let streak = 0;
  for(let i = 0; ; i++){ const d = new Date(n); d.setDate(n.getDate() - i);
    if(jDays.includes(iso(d))) streak++; else if(i > 0 || !jDays.includes(iso(n))) break; }

  const hDueL = hDue(), hOkN = hDueL.filter(h => hDone(h, today())).length;
  const hBest = S.habits.reduce((a, h) => Math.max(a, hRecord(h)), 0);

  const stat = (k,v,d,c) => `<div class="stat"><div class="k">${k}</div><div class="v"${c?` style="color:${c}"`:''}>${v}</div><div class="d">${d}</div></div>`;

  const seg = [['todo',by('todo')],['doing',by('doing')],['done',done]];
  let acc = 0, C = 2 * Math.PI * 52;
  const arcs = seg.map(([k,v]) => {
    const frac = total ? v / total : 0;
    const el = `<circle cx="60" cy="60" r="52" fill="none" stroke="${COLS[k].c}" stroke-width="15"
      stroke-dasharray="${(frac*C).toFixed(1)} ${C}" stroke-dashoffset="${(-acc*C).toFixed(1)}"
      transform="rotate(-90 60 60)" stroke-linecap="butt"/>`;
    acc += frac; return el;
  }).join('');

  const barPane = (title, rows) => `<div class="pane"><h3>${title}</h3><div class="bars">${
    rows.map(([n,v,c]) => `<div class="bar"><div class="bt">${n}<b>${v}</b></div>
      <div class="bk"><i style="width:${total?Math.round(v/total*100):0}%;background:${c}"></i></div></div>`).join('')
  }</div></div>`;

  $('#vSub').textContent = `${total} task trong phạm vi đang lọc`;
  $('#view').innerHTML = `
    <div class="grid stats">
      ${stat('Chưa xong', total - done, `${by('doing')} đang làm · ${by('todo')} chờ`)}
      ${stat('Xong tuần này', week, 'trong 7 ngày gần nhất', '#22c55e')}
      ${stat('Trễ hạn', overdue, overdue ? 'cần xử lý ngay' : 'không có việc nào trễ', overdue ? '#f43f5e' : null)}
      ${stat('Tỷ lệ hoàn thành', rate + '%', `${done}/${total} task`)}
      ${stat('Tiến độ trung bình', avgPg + '%', 'trên toàn bộ task')}
      ${stat('Chuỗi viết nhật ký', streak, streak ? `${streak} ngày liên tiếp` : 'hôm nay chưa viết', streak ? '#818cf8' : null)}
      ${S.habits.length ? stat('Thói quen hôm nay', `${hOkN}/${hDueL.length}`,
        hBest ? `chuỗi dài nhất ${hBest} buổi` : 'chưa có chuỗi nào',
        hDueL.length && hOkN === hDueL.length ? '#22c55e' : null) : ''}
    </div>
    <div class="grid panes">
      <div class="pane"><h3>Phân bố trạng thái</h3><div class="donut">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#2a2f3c" stroke-width="15"/>
          ${arcs}
          <text x="60" y="56" text-anchor="middle" fill="#e7e9ef" font-size="21" font-weight="700">${rate}%</text>
          <text x="60" y="74" text-anchor="middle" fill="#646d80" font-size="10">hoàn thành</text>
        </svg>
        <div class="lg">${seg.map(([k,v]) =>
          `<div class="lgi"><span class="sw" style="background:${COLS[k].c}"></span>${COLS[k].n}<b>${v}</b></div>`).join('')}</div>
      </div></div>

      <div class="pane"><h3>Việc hoàn thành 7 ngày qua</h3>
        <div class="wk">${wk.map(d => `<div class="wkd">
          <div class="wkv">${d.v || ''}</div>
          <div class="wktrack"><div class="wkb" style="height:${Math.max(3, Math.round(d.v/mx*100))}%;opacity:${d.v?1:.25}"></div></div>
          <div class="wkl">${d.l}</div></div>`).join('')}</div>
      </div>

      ${barPane('Theo mảng', Object.entries(AREAS).map(([k,a]) => [a.n, list.filter(t => t.area === k).length, a.c]))}
      ${barPane('Theo ưu tiên', Object.entries(PRIOS).reverse().map(([k,p]) => [p.n, list.filter(t => t.prio === k).length, p.c]))}
    </div>`;
}

/* ============ tạo task / xuất nhập ============ */
function blankForm(status = 'todo'){
  return {title:'', area: ui.view === 'life' ? 'life' : (ui.bf.area || 'work'), prio:'med', status,
          pg: status === 'done' ? 100 : 0, due:'', time:'', dur:60, remind:30,
          tags: ui.tag ? [ui.tag] : [], note:'', subs:[]};
}
function openForm(status = 'todo'){
  nf = blankForm(status); ui.view = 'new'; render();
  setTimeout(() => $('#nTitle')?.focus(), 60);
}
function grabForm(){
  if(!$('#nTitle')) return;
  nf.title = $('#nTitle').value;   // nf.due do bộ chọn ngày ghi thẳng, nf.note do trình soạn thảo ghi thẳng
}
function renderForm(){
  if(!nf) nf = blankForm();
  $('#vSub').textContent = 'Điền thông tin rồi bấm Tạo task';
  const segs = (obj, cur, act) => Object.entries(obj).map(([k,v]) =>
    `<button class="${cur===k?'on':''}" style="${cur===k?`background:${v.c};border-color:${v.c}`:''}" data-${act}="${k}">${v.n}</button>`).join('');

  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <input class="fttl" id="nTitle" value="${esc(nf.title)}" placeholder="Cần làm gì?" autocomplete="off">
    <div class="frow">
      <div class="fld"><label>Mảng</label><div class="seg">${segs(AREAS, nf.area, 'nfarea')}</div></div>
      <div class="fld"><label>Ưu tiên</label><div class="seg">${segs(PRIOS, nf.prio, 'nfprio')}</div></div>
    </div>
    <div class="frow">
      <div class="fld"><label>Bắt đầu ở cột</label><div class="seg">${segs(STATUSES, nf.status, 'nfst')}</div></div>
      <div class="fld"><label>Hạn chót</label>
        ${dateBtn('nDue', nf.due, 'Chưa đặt hạn')}
        <div class="hint" style="margin:0">Bấm để mở lịch chọn ngày</div></div>
    </div>
    <div class="fld"><label>Giờ · thời lượng · nhắc trước</label>
      ${slotFieldHTML('n', nf)}
      <div class="hint" style="margin:0">Đặt giờ để task hiện ở lịch trong ngày (sidebar) và được nhắc trước khi bắt đầu</div></div>
    <div class="fld"><label>Tag</label>
      ${tagFieldHTML('nTagIn', nf.tags, 'Chọn tag bên dưới hoặc gõ tag mới rồi Enter')}</div>
    <div class="fld"><label>Việc con</label>
      <div id="nSubs">${subsHTML(nf.subs, false)}</div>
      <button class="addsub" id="nAddSub">+ Thêm việc con</button></div>
    <div class="fld"><label>Ghi chú</label>
      <div class="inp fed" id="nNote"></div></div>
    <div class="fbtns">
      <button class="btn" id="nGo">Tạo task</button>
      <button class="btn ghost" id="nClr">Xoá form</button>
      <span class="hint" id="nErr"></span>
      <span class="meta" style="margin-left:auto">Ngày tạo ${fmtVN(today())}</span>
    </div>
  </div></div>`;

  const V = $('#view');
  V.querySelectorAll('[data-nfarea]').forEach(b => b.onclick = () => { grabForm(); nf.area = b.dataset.nfarea; renderForm(); });
  V.querySelectorAll('[data-nfprio]').forEach(b => b.onclick = () => { grabForm(); nf.prio = b.dataset.nfprio; renderForm(); });
  V.querySelectorAll('[data-nfst]').forEach(b => b.onclick = () => { grabForm(); nf.status = b.dataset.nfst; renderForm(); });
  bindTagField(V, 'nTagIn', nf.tags,
    n => { grabForm(); if(!nf.tags.includes(n)) nf.tags.push(n); renderForm(); setTimeout(() => $('#nTagIn')?.focus(), 0); },
    n => { grabForm(); nf.tags = nf.tags.filter(x => x !== n); renderForm(); });
  bindSubs(V, nf.subs, () => {});
  V.querySelectorAll('[data-dsub]').forEach(b => b.onclick = () => { grabForm(); nf.subs = nf.subs.filter(s => s.id !== b.dataset.dsub); renderForm(); });
  $('#nAddSub').onclick = () => {
    grabForm(); nf.subs.push({id:uid(), t:'', d:false, n:''}); renderForm();
    const rows = $('#nSubs').querySelectorAll('input'); rows[rows.length-1]?.focus();
  };
  $('#nDue').onclick = e => openDP(e.currentTarget, nf.due,
    v => { grabForm(); nf.due = v; if(!v) nf.time = ''; renderForm(); }, true);
  bindSlotField(V, 'n', (k, v) => {
    grabForm(); nf[k] = v;
    if(k === 'time' && v && !nf.due) nf.due = today();   // đặt giờ khi chưa có hạn thì lấy hôm nay
    renderForm();
  });
  mountEd('nNote', nf.note, 'Suy nghĩ, link, bối cảnh… Gõ / để chèn khối', v => { nf.note = v; });
  $('#nTitle').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); createFromForm(); } };
  $('#nGo').onclick = createFromForm;
  $('#nClr').onclick = () => { nf = blankForm(nf.status); renderForm(); };
}
function createFromForm(){
  grabForm();
  if(!nf.title.trim()){
    $('#nErr').innerHTML = '<span class="err">Cần có tên task trước đã.</span>';
    $('#nTitle').focus(); return;
  }
  const t = {id:uid(), title:nf.title.trim(), area:nf.area, prio:nf.prio, status:nf.status,
    pg: nf.status === 'done' ? 100 : (nf.status === 'doing' ? 25 : 0), tags:[...nf.tags],
    due:nf.due, time: nf.due ? nf.time : '', dur:nf.dur, remind:nf.remind, note:nf.note, cr:today(),
    subs: nf.subs.filter(s => s.t.trim()).map(s => ({...s, t:s.t.trim()})), done: nf.status === 'done' ? today() : null};
  S.tasks.unshift(t); save();
  // xoá các bộ lọc có thể che mất task vừa tạo
  ui.q = ''; $('#q').value = '';
  if(ui.tag && !t.tags.includes(ui.tag)) ui.tag = null;
  if(!boardMatch(t, t.area === 'life')) ui.bf = {prio:[], due:null, area:null};
  nf = blankForm(nf.status); ui.view = t.status === 'backlog' ? 'backlog' : (t.area === 'life' ? 'life' : 'board'); render();
  toast(`Đã tạo: ${t.title}`);
}
/* ============ quản lý tag ============ */
function renderTags(){
  const names = tagNames();
  const count = n => S.tasks.filter(t => (t.tags || []).includes(n)).length;
  const nCount = n => S.notes.filter(t => (t.tags || []).includes(n)).length;
  $('#vSub').textContent = `${names.length} tag · bấm ô màu để đổi màu, bấm tên để đổi tên`;
  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <div class="fld"><label>Thêm tag mới</label>
      <div style="display:flex;gap:8px">
        <input class="inp" id="tgNew" placeholder="Tên tag, ví dụ: học" autocomplete="off">
        <button class="btn" id="tgAdd">Thêm</button></div>
      <div class="hint" style="margin:0">Tag mới được tự gán một màu chưa dùng — đổi được bất cứ lúc nào.</div></div>
    <div class="fld"><label>Tag đã có</label>
      ${names.length ? `<div>${names.map(n => `<div class="tgrow">
          <button class="tgsw" data-pal="${esc(n)}" style="background:${S.tags[n]}" title="Đổi màu"></button>
          <button class="tgx" data-rentag="${esc(n)}" style="${tagStyle(n)};padding:2px 8px" title="Đổi tên">#${esc(n)}</button>
          <span class="meta">${count(n)} task${nCount(n) ? ` · ${nCount(n)} trang` : ''}</span>
          <button class="btn ghost" data-rentag="${esc(n)}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">Đổi tên</button>
          <button class="danger" data-deltag="${esc(n)}">Xoá</button></div>`).join('')}</div>`
        : '<div class="empty">Chưa có tag nào</div>'}</div>
  </div></div>`;

  const add = () => {
    const v = $('#tgNew').value.trim().replace(/^#/,'');
    if(!v) return;
    const n = ensureTag(v); save(); render();
    toast(n === v ? `Đã thêm tag #${n}` : `Tag #${n} đã có sẵn`);
    setTimeout(() => $('#tgNew')?.focus(), 0);
  };
  $('#tgAdd').onclick = add;
  $('#tgNew').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); add(); } };
  $$('[data-pal]').forEach(b => b.onclick = () =>
    openPal(b, S.tags[b.dataset.pal], c => { S.tags[b.dataset.pal] = c; save(); render(); }));
  $$('[data-deltag]').forEach(b => b.onclick = () => delTag(b.dataset.deltag));
  $$('[data-rentag]').forEach(b => b.onclick = () => renameTag(b.dataset.rentag));
}

/* ============ để sau ============ */
// on = true: gác task xuống Để sau; false: đưa lên cuối cột Cần làm
function setBacklog(id, on){
  const t = S.tasks.find(x => x.id === id); if(!t) return;
  S.tasks = S.tasks.filter(x => x !== t);
  t.status = on ? 'backlog' : 'todo'; t.done = null;
  if(t.pg === 100) t.pg = 75;
  S.tasks.splice(S.tasks.map(x => x.status).lastIndexOf(t.status) + 1, 0, t);
  save(); toast(on ? `Đã gác lại: ${t.title}` : `Đã đưa lên Cần làm: ${t.title}`);
}
function renderBacklog(){
  // mới ghi lên đầu; tuổi tính từ ngày tạo để lúc xem lại dễ mạnh tay xoá bớt
  const list = visible(true).sort((a, b) => (b.cr || '').localeCompare(a.cr || ''));
  const age = t => { if(!t.cr) return ''; const n = Math.round((new Date(today()) - new Date(t.cr)) / 864e5); return n ? `${n} ngày` : 'hôm nay'; };
  $('#vSub').textContent = `${list.length} việc chưa cam kết làm · không lên bảng, lịch, nhắc việc`;
  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <input class="fttl" id="bkIn" placeholder="Ghi nhanh việc để sau rồi Enter" autocomplete="off">
    ${list.length ? `<div>${list.map(t => `<div class="tgrow bkrow" data-bk="${t.id}">
        <span class="sw" style="width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:${AREAS[t.area].c}"></span>
        <span style="word-break:break-word">${t.title.trim() ? esc(t.title) : '<span class="ph">(chưa đặt tên)</span>'}</span>
        ${(t.tags||[]).slice(0,2).map(x => `<span class="tg" style="${tagStyle(x)}">#${esc(x)}</span>`).join('')}
        <span class="meta" style="margin-left:auto;white-space:nowrap" title="Tạo ${fmtVN(t.cr)}">${age(t)}</span>
        <button class="btn ghost" data-todo="${t.id}" style="padding:5px 10px;font-size:12px;font-weight:500;white-space:nowrap">→ Cần làm</button></div>`).join('')}</div>`
      : '<div class="empty">Chưa có việc nào để sau. Ghi nhanh ở ô trên, hoặc kéo card trên bảng thả vào mục Để sau ở sidebar.</div>'}
  </div></div>`;

  $('#bkIn').onkeydown = e => {
    const title = e.target.value.trim();
    if(e.key !== 'Enter' || !title) return;
    S.tasks.unshift({id:uid(), title, area:'work', prio:'med', status:'backlog', pg:0, tags:[],
      due:'', time:'', dur:60, remind:30, note:'', cr:today(), subs:[], done:null});
    ui.q = ''; $('#q').value = ''; ui.tag = null;   // bỏ bộ lọc có thể che mất việc vừa ghi
    save(); render(); $('#bkIn').focus();
  };
  $$('[data-todo]').forEach(b => b.onclick = e => { e.stopPropagation(); setBacklog(b.dataset.todo, false); render(); });
  $$('[data-bk]').forEach(r => r.onclick = () => openTask(r.dataset.bk));
}

/* ============ thói quen ============ */
/* Thói quen đứng riêng ở S.habits: không lên bảng, lịch, nhắc việc và không tính vào thống kê task —
   task là việc làm một lần rồi xong, thói quen là chuỗi không có điểm kết thúc.
   Mỗi thói quen chỉ ghi lại những ngày đã làm (log). Ngày nằm trong lịch mà không có trong log
   nghĩa là bỏ lỡ, nên không phải đụng vào dữ liệu những hôm không làm gì. */
let hd = null;        // bản nháp thói quen đang thêm / sửa
let hFocus = false;   // vừa mở form thì đưa con trỏ vào ô tên

const dShift = (k, n) => { const d = new Date(k + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const dowOf  = k => new Date(k + 'T00:00:00').getDay();
const hOn    = (h, k) => h.days.includes(dowOf(k));   // ngày k có nằm trong lịch của thói quen không
const hDone  = (h, k) => !!h.log[k];
const hDue   = () => S.habits.filter(h => hOn(h, today()));

// chuỗi: đi xuôi qua các buổi theo lịch, làm thì cộng, bỏ thì về 0.
// Bật grace thì bỏ một buổi chuỗi vẫn giữ (chỉ không cộng), bỏ 2 buổi liên tiếp mới về 0 — đúng luật "không bỏ hai lần".
// Hôm nay chưa tick thì chưa tính là bỏ, vì ngày hôm nay chưa hết.
function hRun(h){
  const k0 = today(), limit = h.grace ? 2 : 1;
  let k = Object.keys(h.log).reduce((a, x) => x < a ? x : a, h.cr);
  let cur = 0, best = 0, gap = 0;
  for(; k <= k0; k = dShift(k, 1)){
    if(!hOn(h, k)) continue;
    if(hDone(h, k)){ cur++; gap = 0; best = Math.max(best, cur); }
    else if(k !== k0 && ++gap >= limit) cur = 0;
  }
  return {cur, best};
}
const hStreak = h => hRun(h).cur;
const hRecord = h => hRun(h).best;   // chuỗi dài nhất từng đạt
// số buổi theo lịch gần nhất đã bỏ liên tiếp, không tính hôm nay — nền của luật "không bỏ hai lần"
function hMiss(h){
  let n = 0, k = dShift(today(), -1);
  for(let i = 0; i < 120; i++, k = dShift(k, -1)){
    if(k < h.cr) break;
    if(!hOn(h, k)) continue;
    if(hDone(h, k)) break;
    n++;
  }
  return n;
}
// tỉ lệ làm được trên các buổi theo lịch trong khoảng lưới. Trước ngày tạo thói quen chỉ tính buổi đã tick bù,
// không coi là bỏ lỡ những buổi hồi đó chưa theo dõi
function hRate(h){
  let due = 0, ok = 0, k = today();
  for(let i = 0; i < HWEEKS * 7; i++, k = dShift(k, -1)){
    if(!hOn(h, k) || (k < h.cr && !hDone(h, k))) continue;
    due++; if(hDone(h, k)) ok++;
  }
  return due ? Math.round(ok / due * 100) : 0;
}
// mừng ngay lúc tick: cảm xúc tích cực tức thì mới là thứ gắn hành vi thành thói quen,
// không phải số lần lặp — nên lần tick nào cũng có phản hồi.
function hCheer(h){
  const n = hStreak(h);
  toast(HMARKS[n] ? `🔥 ${n} buổi · ${HMARKS[n]}` : `✓ ${h.name} · chuỗi ${n} buổi`);
}
function hToggle(id, k){
  const h = S.habits.find(x => x.id === id);
  if(!h || k > today()) return;               // ngày chưa tới thì không tick trước được
  const on = !hDone(h, k);
  if(on) h.log[k] = 1; else delete h.log[k];
  save();
  // chỉ mừng buổi theo lịch (kể cả tick bù trước ngày tạo); tick ngoài lịch không đổi chuỗi nên báo thẳng, tránh trông như được tính
  const inPlan = hOn(h, k);
  ui.hPop = on && inPlan ? h.id : null; render(); ui.hPop = null;
  if(on && inPlan) hCheer(h);
  else if(on) toast(`Đã ghi buổi làm thêm ${DOW[dowOf(k)]} ${fmtVN(k)} — ngoài lịch nên không tính vào chuỗi`);
}

/* dải thói quen hôm nay ở đầu bảng — đặt ngay chỗ mình mở đầu tiên mỗi ngày thì mới thật sự tick */
function habitStrip(){
  const list = hDue(), k = today();
  if(!list.length) return '';
  const done = list.filter(h => hDone(h, k)).length;
  const dec = list.filter(h => !hDone(h, k) && hMiss(h) >= 1).length;
  const chips = list.map(h => {
    const on = hDone(h, k), n = hStreak(h), m = hMiss(h);
    const tip = [h.kind === 'bad' && h.swap ? `Thay bằng: ${h.swap}` : h.cue,
                 !on && m === 1 ? 'Đã bỏ 1 buổi — đừng bỏ buổi thứ hai' : '',
                 !on && m >= 2 ? `Đã bỏ ${m} buổi liên tiếp` : ''].filter(Boolean).join(' · ');
    return `<button class="hchip${on ? ' on' : ''}${!on && m ? ' miss' : ''}${ui.hPop === h.id ? ' pop' : ''}"
      data-htick="${h.id}"${on ? ` style="background:${h.color}1c;border-color:${h.color}55;color:${h.color}"` : ''}
      title="${esc(tip || h.name)}"><span class="bx"${on ? ` style="background:${h.color};border-color:${h.color}"` : ''}>${on ? '✓' : ''}</span>${esc(h.name)}${n ? `<span class="st">🔥${n}</span>` : ''}</button>`;
  }).join('');
  return `<div class="hstrip">
    <button class="hshd" data-hgo title="Mở mục Thói quen"><span class="d">Thói quen hôm nay</span><b>${done}/${list.length}</b></button>
    ${chips}
    ${done === list.length ? '<span class="hsnote ok">Xong cả rồi</span>'
      : dec ? `<span class="hsnote warn">${dec} việc đang ở buổi quyết định</span>` : ''}</div>`;
}

const HWK = [1,2,3,4,5,6,0];   // thứ tự thứ trong mục thói quen: tuần bắt đầu từ T2, CN đứng cạnh T7

/* lưới theo dõi: cột là tuần, hàng là thứ — nhìn dọc thấy ngay mình hay đứt vào thứ mấy */
function hGrid(h){
  const k0 = today(), end = dShift(k0, (7 - dowOf(k0)) % 7), n = HWEEKS * 7;
  // nhãn tháng đặt ở cột tuần đầu tiên của tháng; cột đầu lưới chỉ ghi khi tháng sau chưa chen vào ngay
  const mons = [];
  for(let c = 0; c < HWEEKS; c++){
    const m = +dShift(end, -(n - 1 - c * 7)).slice(5, 7);
    const prev = c ? +dShift(end, -(n - 1 - (c - 1) * 7)).slice(5, 7) : 0;
    const next = +dShift(end, -(n - 1 - (c + 1) * 7)).slice(5, 7);
    mons.push(m !== prev && (c || next === m) ? `Th${m}` : '');
  }
  let cells = '';
  for(let i = 0; i < n; i++){
    const k = dShift(end, -(n - 1 - i));
    // ngày đã tick luôn hiện, kể cả khi nằm ngoài lịch — để đổi lịch không xoá mất lịch sử,
    // và để ghi được buổi làm thêm vào hôm khác. Buổi làm thêm không tính vào chuỗi và tỉ lệ.
    const cls = k > k0 ? 'fut'
      : hDone(h, k) ? (hOn(h, k) ? 'on' : 'extra')
      : (k < h.cr || !hOn(h, k)) ? 'off' : 'miss';
    const note = {on:' · đã làm', extra:' · làm thêm ngoài lịch', miss:' · bỏ lỡ', off:' · ngoài lịch'}[cls] || '';
    cells += `<i class="${cls}${k === k0 ? ' td' : ''}"${cls === 'fut' ? '' : ` data-htick="${h.id}" data-hday="${k}"`} title="${DOW[dowOf(k)]} ${fmtVN(k)}${note}">${+k.slice(8)}</i>`;
  }
  return `<div class="hgwrap">
    <span></span><div class="hgmon">${mons.map(m => `<span>${m}</span>`).join('')}</div>
    <div class="hglbl">${HWK.map(i => `<span class="${h.days.includes(i) ? 'on' : ''}">${DOW[i]}</span>`).join('')}</div>
    <div class="hgrid">${cells}</div>
    <div class="hgleg"><i class="on"></i>đã làm<i class="extra"></i>làm thêm<i class="miss"></i>bỏ lỡ<i class="off"></i>ngoài lịch
      <span style="margin-left:auto">${HWEEKS} tuần gần nhất</span></div>
  </div>`;
}

/* Lý do: mở ra là một ô soạn thảo như ghi chú task, gập lại chỉ còn một dòng xem trước.
   Trạng thái mở / gập nằm trong chính thói quen nên mở lại app vẫn đúng như lúc rời đi. */
function hWhy(h){
  if(h.open) return `<div class="hwhy on">
    <button class="hwt" data-hwhy="${h.id}"><span class="cv">▾</span><span class="l">Lý do</span></button>
    <div class="hwbox"><div id="hWhy-${h.id}"></div></div></div>`;
  const txt = plain(h.why);
  const peek = txt ? (txt.length > 72 ? txt.slice(0, 72) + '…' : txt)
                   : (hasText(h.why) ? '…' : 'chưa viết — bấm để thêm');
  return `<div class="hwhy">
    <button class="hwt" data-hwhy="${h.id}"><span class="cv">▸</span><span class="l">Lý do</span>
      <span class="pk${txt || hasText(h.why) ? '' : ' none'}">${esc(peek)}</span></button></div>`;
}

function hCard(h){
  const k = today(), on = hDone(h, k), due = hOn(h, k), kind = HKINDS[h.kind];
  const n = hStreak(h), m = hMiss(h);
  // luật "không bỏ hai lần": bỏ một buổi gần như không ảnh hưởng đến quá trình thành tự động,
  // bỏ liên tiếp mới là lúc thói quen chết — nên app chỉ lên tiếng đúng lúc đó.
  const nudge = on || !m ? ''
    : m >= 2 ? `<div class="hnudge cold">Đã bỏ <b>${m} buổi liên tiếp</b>. Bỏ một buổi thì gần như không mất gì — bỏ liên tiếp mới làm thói quen chết. Hôm nay làm bản dễ nhất của nó cũng được tính.</div>`
    : `<div class="hnudge warn">Bỏ lỡ buổi gần nhất. <b>${due ? 'Hôm nay' : 'Buổi tới'} là buổi quyết định</b> — ${h.grace ? 'chuỗi vẫn được giữ, bỏ tiếp buổi này thì về 0' : 'làm được thì coi như nhịp chưa đứt'}.</div>`;
  return `<div class="hcard" id="hc-${h.id}" style="--hc:${h.color}">
    <div class="hhd">
      ${due ? `<button class="hbx${on ? ' on' : ''}${ui.hPop === h.id ? ' pop' : ''}" data-htick="${h.id}"${on ? ` style="background:${h.color};border-color:${h.color}"` : ''} title="${on ? 'Bỏ đánh dấu hôm nay' : 'Đánh dấu đã làm hôm nay'}">${on ? '✓' : ''}</button>`
             : '<span class="hbx off" title="Hôm nay không nằm trong lịch"></span>'}
      <span class="hnm">${esc(h.name)}</span>
      <span class="pill" style="background:${kind.c}22;color:${kind.c}">${kind.n}</span>
      <span class="hstat" title="Số buổi liên tiếp${h.grace ? ' (cho phép lỡ một buổi)' : ''}">🔥 ${n}</span>
      <span class="hstat" title="Chuỗi dài nhất từng đạt">🏆 ${hRecord(h)}</span>
      <span class="hstat" title="Tỉ lệ làm được trong ${HWEEKS} tuần qua">${hRate(h)}%</span>
      <button class="btn ghost hsm" data-hedit="${h.id}">Sửa</button>
    </div>
    ${h.cue ? `<div class="hmeta"><span class="l">Khi nào</span>${esc(h.cue)}</div>` : ''}
    ${h.kind === 'bad' && h.swap ? `<div class="hmeta"><span class="l">Thay bằng</span>${esc(h.swap)}</div>` : ''}
    ${hWhy(h)}
    ${nudge}
    ${hGrid(h)}</div>`;
}

/* tóm tắt đầu mục: nhìn một lượt là biết có những thói quen gì, hôm nay cần làm gì — khỏi cuộn qua từng thẻ */
const hSched = days => days.length === 7 ? 'Mỗi ngày'
  : days.join() === '1,2,3,4,5' ? 'T2–T6'
  : HWK.filter(i => days.includes(i)).map(i => DOW[i]).join(', ');
function hSum(){
  const k = today();
  return `<div class="hsum">${S.habits.map(h => {
    const on = hDone(h, k), due = hOn(h, k);
    return `<div class="hsr" style="--hc:${h.color}">
      ${due ? `<button class="hbx${on ? ' on' : ''}" data-htick="${h.id}"${on ? ` style="background:${h.color};border-color:${h.color}"` : ''} title="${on ? 'Bỏ đánh dấu hôm nay' : 'Đánh dấu đã làm hôm nay'}">${on ? '✓' : ''}</button>`
             : '<span class="hbx off" title="Hôm nay không nằm trong lịch"></span>'}
      <button class="hsn" data-hjump="${h.id}" title="Tới thẻ thói quen">${esc(h.name)}</button>
      <span class="hstat">${hSched(h.days)}</span>
      <span class="hstat" title="Số buổi liên tiếp">🔥 ${hStreak(h)}</span>
      <span class="hstat" title="Chuỗi dài nhất từng đạt">🏆 ${hRecord(h)}</span>
      <span class="hstat" title="Tỉ lệ làm được trong ${HWEEKS} tuần qua">${hRate(h)}%</span></div>`;
  }).join('')}</div>`;
}

function hForm(){
  const d = hd;
  return `<div class="hcard edit" id="hEdit" style="--hc:${d.color}">
    <div class="hhd">
      <button class="hsw" id="hSw" data-hpal style="background:${d.color}" title="Đổi màu"></button>
      <input class="fttl" id="hName" value="${esc(d.name)}" autocomplete="off"
        placeholder="${d.kind === 'bad' ? 'Thói quen muốn bỏ, ví dụ: lướt điện thoại trên giường' : 'Thói quen muốn giữ, ví dụ: đọc 20 trang'}">
    </div>
    <div class="fld"><label>Loại</label><div class="seg">${Object.entries(HKINDS).map(([k, v]) =>
      `<button class="${d.kind === k ? 'on' : ''}" style="${d.kind === k ? `background:${v.c};border-color:${v.c}` : ''}" data-hkind="${k}">${v.n}</button>`).join('')}</div></div>
    <div class="fld"><label>Những ngày nào trong tuần</label>
      <div class="hpick">${HWK.map(i => `<button class="${d.days.includes(i) ? 'on' : ''}" data-hdow="${i}">${DOW[i]}</button>`).join('')}</div>
      <div class="hint" style="margin:0">Cùng thứ, cùng giờ, cùng chỗ thì não sớm tự chạy mà không cần nhớ.
        <button class="hpre" data-hpre="all">Mỗi ngày</button><button class="hpre" data-hpre="wd">T2–T6</button></div></div>
    <div class="fld"><label>Chuỗi</label>
      <label class="hgrace"><input type="checkbox" id="hGrace"${d.grace ? ' checked' : ''}>Cho phép lỡ một buổi</label>
      <div class="hint" style="margin:0">Bỏ một buổi thì chuỗi giữ nguyên, chỉ không cộng thêm. Bỏ 2 buổi liên tiếp mới về 0.</div></div>
    <div class="fld"><label>Ý định thực hiện</label>
      <input class="inp" id="hCue" value="${esc(d.cue)}" placeholder="Sau khi ăn sáng, ở bàn làm việc" autocomplete="off">
      <div class="hint" style="margin:0">Ghi rõ <b>sau việc gì</b> và <b>ở đâu</b>. Riêng việc viết ra câu này đã làm tỉ lệ thực hiện tăng gần gấp đôi trong các nghiên cứu.</div></div>
    <div class="fld" id="hSwapFld"${d.kind === 'bad' ? '' : ' hidden'}><label>Thay bằng hành vi nào</label>
      <input class="inp" id="hSwap" value="${esc(d.swap)}" placeholder="Cắm sạc điện thoại ngoài phòng, đọc sách giấy" autocomplete="off">
      <div class="hint" style="margin:0">Cơn thèm vẫn sẽ đến, thứ đổi được là phản ứng. Mỗi ngày dùng được hành vi thay thế thì tick.</div></div>
    <div class="fld"><label>Lý do</label>
      <div class="hwbox"><div id="hWhyEd"></div></div>
      <div class="hint" style="margin:0">Vì sao thói quen này đáng làm — thứ bạn sẽ cần đọc lại vào đúng hôm không muốn làm. Gõ <b>/</b> để chèn khối.</div></div>
    <div class="hact">
      <button class="btn" data-hsave>${d.id ? 'Lưu' : 'Thêm thói quen'}</button>
      <button class="btn ghost" data-hcancel>Huỷ</button>
      ${d.id ? `<button class="danger" data-hdel="${d.id}" style="margin-left:auto">Xoá thói quen</button>` : ''}
    </div></div>`;
}

// Vẽ lại các nút trong form theo bản nháp mà không đụng vào ô soạn thảo Lý do đang mở.
// Nếu vẽ lại cả form thì trình soạn thảo bị huỷ rồi dựng lại, con trỏ nhảy về đầu.
function hSync(){
  const f = $('#hEdit'); if(!f || !hd) return;
  f.style.setProperty('--hc', hd.color);
  $('#hSw').style.background = hd.color;
  $$('[data-hkind]').forEach(b => {
    const on = b.dataset.hkind === hd.kind, c = HKINDS[b.dataset.hkind].c;
    b.classList.toggle('on', on);
    b.style.cssText = on ? `background:${c};border-color:${c}` : '';
  });
  $$('[data-hdow]').forEach(b => b.classList.toggle('on', hd.days.includes(+b.dataset.hdow)));
  $('#hSwapFld').hidden = hd.kind !== 'bad';
  $('#hName').placeholder = hd.kind === 'bad'
    ? 'Thói quen muốn bỏ, ví dụ: lướt điện thoại trên giường'
    : 'Thói quen muốn giữ, ví dụ: đọc 20 trang';
}

function hOpen(h){
  hd = h ? {...h, days:[...h.days]}
         : {id:null, name:'', kind:'good', days:[1,2,3,4,5], cue:'', swap:'', grace:false, color:'#818cf8', log:{}, cr:today()};
  ui.hEdit = h ? h.id : 'new'; hFocus = true;
  renderHabits();
}
// giữ lại chữ đang gõ trước khi vẽ lại form (bấm chọn thứ, đổi loại… đều vẽ lại)
function hGrab(){
  if(!hd) return;
  hd.name = $('#hName')?.value ?? hd.name;
  hd.cue  = $('#hCue')?.value  ?? hd.cue;
  hd.swap = $('#hSwap')?.value ?? hd.swap;
  hd.grace = $('#hGrace')?.checked ?? hd.grace;
}
function hSave(){
  hGrab();
  if(!hd.name.trim()) return toast('Đặt tên cho thói quen đã');
  if(!hd.days.length) return toast('Chọn ít nhất một ngày trong tuần');
  hd.name = hd.name.trim(); hd.cue = hd.cue.trim(); hd.swap = hd.swap.trim();
  if(hd.id) Object.assign(S.habits.find(x => x.id === hd.id), hd);
  else { hd.id = uid(); S.habits.push(hd); }
  const name = hd.name;
  hd = null; ui.hEdit = null; save(); render(); toast(`Đã lưu: ${name}`);
}
function hDel(id){
  const h = S.habits.find(x => x.id === id); if(!h) return;
  const n = Object.keys(h.log).length;
  if(!confirm(`Xoá thói quen "${h.name}"? ${n} ngày đã đánh dấu sẽ mất và không lấy lại được.`)) return;
  S.habits = S.habits.filter(x => x.id !== id);
  hd = null; ui.hEdit = null; save(); render(); toast('Đã xoá thói quen');
}

function renderHabits(){
  killEds();
  const k = today(), due = hDue(), done = due.filter(h => hDone(h, k)).length;
  const best = S.habits.reduce((a, h) => Math.max(a, hRecord(h)), 0);
  $('#vSub').textContent = S.habits.length
    ? `${S.habits.length} thói quen · hôm nay ${done}/${due.length} · chuỗi dài nhất ${best} buổi`
    : 'Chưa có thói quen nào';
  $('#view').innerHTML = `<div class="tb">
      <span class="hint" style="margin:0">Bấm ô trong lưới để đánh dấu hoặc bỏ đánh dấu một ngày</span>
      <button class="btn" data-hnew style="margin-left:auto"${ui.hEdit ? ' hidden' : ''}>+ Thói quen mới</button></div>
    <div class="hlist">
      ${S.habits.length ? hSum() : ''}
      ${ui.hEdit === 'new' ? hForm() : ''}
      ${S.habits.map(h => ui.hEdit === h.id ? hForm() : hCard(h)).join('')}
      ${!S.habits.length && ui.hEdit !== 'new' ? '<div class="empty">Chưa có thói quen nào.<br>Bắt đầu bằng một thứ nhỏ đến mức khó mà bỏ — hạ ngưỡng khởi động ăn đứt việc cố gồng ý chí.</div>' : ''}
    </div>`;
  wireHabits();
  S.habits.forEach(h => {
    if(h.open && ui.hEdit !== h.id)
      mountEd('hWhy-' + h.id, h.why || '', 'Vì sao thói quen này đáng làm? Gõ / để chèn khối',
              v => { h.why = v; save(); });
  });
  // trong form thì ghi vào bản nháp, chỉ vào dữ liệu thật khi bấm Lưu
  if(hd) mountEd('hWhyEd', hd.why || '', 'Vì sao thói quen này đáng làm? Gõ / để chèn khối',
                 v => { hd.why = v; });
}
function wireHabits(){
  $$('[data-hnew]').forEach(b => b.onclick = () => hOpen(null));
  $$('[data-hedit]').forEach(b => b.onclick = () => hOpen(S.habits.find(x => x.id === b.dataset.hedit)));
  $$('[data-hjump]').forEach(b => b.onclick = () => $('#hc-' + b.dataset.hjump)?.scrollIntoView({behavior:'smooth', block:'start'}));
  $$('[data-hwhy]').forEach(b => b.onclick = () => {
    const h = S.habits.find(x => x.id === b.dataset.hwhy);
    h.open = !h.open; save(); renderHabits();
  });
  if(!hd) return;
  $$('[data-hkind]').forEach(b => b.onclick = () => { hd.kind = b.dataset.hkind; hSync(); });
  $$('[data-hdow]').forEach(b => b.onclick = () => {
    const i = +b.dataset.hdow;
    hd.days = hd.days.includes(i) ? hd.days.filter(x => x !== i) : [...hd.days, i].sort((a, b) => a - b);
    hSync();
  });
  $$('[data-hpre]').forEach(b => b.onclick = () =>
    { hd.days = b.dataset.hpre === 'all' ? [0,1,2,3,4,5,6] : [1,2,3,4,5]; hSync(); });
  $$('[data-hpal]').forEach(b => b.onclick = () => openPal(b, hd.color, c => { hd.color = c; hSync(); }));
  $$('[data-hsave]').forEach(b => b.onclick = hSave);
  $$('[data-hcancel]').forEach(b => b.onclick = () => { hd = null; ui.hEdit = null; renderHabits(); });
  $$('[data-hdel]').forEach(b => b.onclick = () => hDel(b.dataset.hdel));
  if(hFocus){ $('#hName')?.focus(); hFocus = false; }
}

/* ============ tập trung (pomodoro) ============ */
/* S.focus: cfg = cài đặt; queue = id task đang chờ làm (tối đa cfg.qmax, task đầu hàng là task của phiên tới);
   run = phiên hoặc giờ nghỉ đang chạy; next = pha kế tiếp khi chưa chạy; cycle = số phiên đã xong, để biết lúc nào nghỉ dài;
   log = mọi phiên và giờ nghỉ đã qua, kể cả bị huỷ, để sau này phân tích; rev = phiên vừa xong đang chờ chấm điểm;
   tree = loài cây chọn cho phiên tới (xem khu vườn).
   Đồng hồ không đếm nhịp mà tính từ mốc thời gian: run.acc là phần đã chạy trước lần dừng gần nhất, run.since là lúc chạy lại
   (null khi đang dừng). Nên F5, tab chạy nền hay tắt app giữa chừng đều không lệch, và chỉ cần lưu khi trạng thái đổi. */
const FGROUPS = {time:['work','short','long','every','auto'], queue:['qmax','confirmSw'], pause:['pauseAsk'],
  streak:['goal','miss','weekend'], ask:['askRate','askNext'],
  look:['look'], sound:['sound','vol','notify','tabTitle']};
const FRATE = {1:'Rất phân tán', 2:'Hay bị kéo đi', 3:'Tạm được', 4:'Khá sâu', 5:'Rất sâu'};
// giờ nghỉ nên rời màn hình: vận động nhẹ hồi sức tốt hơn lướt điện thoại, thứ kéo đầu sang việc khác
const FREST = {short:['Đứng dậy vươn vai', 'Uống một cốc nước', 'Nhìn ra xa 20 giây cho mắt nghỉ', 'Hít thở chậm vài nhịp', 'Đi lại vài bước, đừng cầm điện thoại'],
               long:['Đi bộ một vòng, ra chỗ có ánh sáng', 'Ăn nhẹ và uống nước', 'Nhắm mắt nghỉ vài phút', 'Giãn cổ, vai và lưng']};
const FTITLE = document.title;

function fNorm(f = {}){
  const cfg = {...FCFG, ...f.cfg};
  ['wN', 'wWhat', 'mN', 'mWhat'].forEach(k => delete cfg[k]);   // mốc phần thưởng cũ, đã bỏ
  cfg.look = Object.fromEntries(Object.keys(FPHASE).map(p => [p, {...FCFG.look[p], ...(f.cfg?.look || {})[p]}]));
  return {cfg, queue:f.queue || [], run:f.run || null, next:f.next || 'work', cycle:f.cycle || 0,
          log:f.log || [], rev:f.rev || null, tree:f.tree || 'pine'};
}
const fTask   = id => S.tasks.find(t => t.id === id);
const fName   = t => t.title.trim() ? esc(t.title) : '<span class="ph">(chưa đặt tên)</span>';
const fLeft   = r => r.dur - r.acc - (r.since ? Date.now() - r.since : 0);
const fWorked = r => r.acc + (r.since ? Date.now() - r.since : 0);
const fClock  = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const fHM     = ms => new Date(ms).toTimeString().slice(0, 5);
const fRest   = p => FREST[p][S.focus.cycle % FREST[p].length];
const fWorks  = () => S.focus.log.filter(e => e.k === 'work');
const fMon    = k => dShift(k, -((dowOf(k) + 6) % 7));   // thứ Hai của tuần chứa ngày k
// hàng đợi chỉ nhận task đang ở cột Đang làm: chuyển cột khác, xong hay bị bỏ thì tự rời hàng
function fQueue(){
  const f = S.focus;
  f.queue = f.queue.filter(id => fTask(id)?.status === 'doing');
  return f.queue;
}
// câu "lần sau bắt đầu từ…" gần nhất của task — hiện lại lúc chuẩn bị làm tiếp task đó
function fLastNext(tid){
  const log = S.focus.log;
  for(let i = log.length - 1; i >= 0; i--) if(log[i].tid === tid && log[i].next) return log[i].next;
  return '';
}

/* --- thống kê: chỉ phiên chạy đủ giờ mới là phiên đạt --- */
function fCount(){
  const m = {};
  fWorks().forEach(e => { if(e.done){ const k = iso(new Date(e.a)); m[k] = (m[k] || 0) + 1; } });
  return m;
}
// chuỗi ngày đạt mục tiêu. Ngày thường không đạt là lỡ, lỡ quá cfg.miss ngày liên tiếp thì về 0.
// Cuối tuần không đạt thì bỏ qua; có đạt thì vẫn cộng (tắt cfg.weekend thì bỏ qua hẳn cuối tuần).
// Hôm nay chưa đạt thì chưa tính là lỡ, vì ngày chưa hết.
function fRun(){
  const c = S.focus.cfg, m = fCount(), k0 = today(), first = Object.keys(m).sort()[0];
  let cur = 0, best = 0, gap = 0;
  for(let k = first; k && k <= k0; k = dShift(k, 1)){
    const ok = (m[k] || 0) >= c.goal;
    if(dowOf(k) % 6 === 0){ if(ok && c.weekend){ cur++; gap = 0; best = Math.max(best, cur); } continue; }
    if(ok){ cur++; gap = 0; best = Math.max(best, cur); }
    else if(k !== k0 && ++gap > c.miss) cur = 0;
  }
  return {cur, best};
}

/* --- nhịp đồng hồ: Chrome chỉ cho timer ở tab chạy nền chạy mỗi phút một lần, timer trong Worker thì không bị hãm --- */
let fTick = null;
function fStartTick(){
  if(fTick) return;
  try{
    fTick = new Worker(URL.createObjectURL(new Blob(['setInterval(() => postMessage(0), 1000)'])));
    fTick.onmessage = fOnTick;
  }catch(e){ fTick = setInterval(fOnTick, 1000); }
}
function fStopTick(){
  if(!fTick) return;
  if(fTick.terminate) fTick.terminate(); else clearInterval(fTick);
  fTick = null;
}
function fOnTick(){
  const r = S.focus.run;
  if(r && r.since && fLeft(r) <= 0) return fFinish(false);
  fPaintTime();
}
// chỉ cập nhật chữ số, không vẽ lại khung — ô đang gõ không bị mất
function fPaintTime(){
  const r = S.focus.run, c = S.focus.cfg;
  if(r){
    const left = fLeft(r), txt = fClock(left);
    $$('[data-fclock]').forEach(el => el.textContent = txt);
    $$('[data-fbar]').forEach(el => el.style.width = Math.min(100, (1 - left / r.dur) * 100) + '%');
    // cây lên cấp thì thay hình, phần tử mới nên hiệu ứng lớn lên chạy lại
    if(r.phase === 'work') $$('[data-ftree]').forEach(el => {
      const st = fStage(fWorked(r) / 6e4);
      if(+el.dataset.st !== st) el.outerHTML = `<g data-ftree data-st="${st}" class="grow">${fSpecies(r.tree).s[st - 1]}</g>`;
    });
    if(!r.since) $$('[data-fpaused]').forEach(el => {
      const m = Math.floor((Date.now() - r.pAt) / 6e4), long = m >= c.pauseAsk;
      el.classList.toggle('long', long);
      el.textContent = `Đang tạm dừng ${m ? m + ' phút' : 'chưa tới 1 phút'}${long ? ' — làm tiếp hay huỷ phiên?' : ''}`;
    });
  }
  document.title = r && c.tabTitle ? `${r.since ? '' : '⏸ '}${fClock(fLeft(r))} · ${FPHASE[r.phase]}` : FTITLE;
}

/* --- âm báo tự tổng hợp, khỏi kèm file: hết phiên thì đi lên, hết nghỉ thì đi xuống --- */
let fAc = null;
function fAudio(){
  try{ fAc ||= new AudioContext(); if(fAc.state === 'suspended') fAc.resume(); }catch(e){}
  return fAc;
}
function fChime(phase, force){
  const c = S.focus.cfg, ac = (c.sound || force) && fAudio();
  if(!ac) return;
  const v = Math.max(.0002, c.vol / 100 * .35);
  (phase === 'work' ? [659, 880, 1319] : [880, 659, 523]).forEach((hz, i) => {
    const t = ac.currentTime + i * .2, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = hz;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1.25);
  });
}
function fNotify(phase){
  if(!S.focus.cfg.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const body = phase === 'work' ? `Tới giờ ${FPHASE[S.focus.next].toLowerCase()}.` : 'Sẵn sàng cho phiên tiếp theo.';
  try{
    const n = new Notification(phase === 'work' ? '✓ Xong phiên tập trung' : 'Hết giờ nghỉ', {body, tag:'focus'});
    n.onclick = () => { window.focus(); n.close(); };
  }catch(e){}
}

/* --- vòng đời phiên --- */
function fStart(phase, tid){
  const f = S.focus, c = f.cfg, now = Date.now();
  if(phase === 'work'){
    if(!fTask(tid)) return toast('Thêm một task vào hàng đợi trước đã');
    ui.fCheer = null;
  }
  f.run = {phase, tid:phase === 'work' ? tid : null, tree:f.tree, dur:c[phase] * 6e4, a:now, acc:0, since:now, pAt:null, paused:0, pause:0, cap:0, sw:0};
  fAudio();   // mở khoá âm thanh ngay trong cú bấm thì lúc hết giờ mới phát được
  save(); fStartTick(); fPaint();
}
function fLog(r, end, ms){
  const e = {id:uid(), k:r.phase, a:r.a, b:end, plan:r.dur / 6e4, ms, done:ms >= r.dur};
  if(r.phase === 'work'){
    const t = fTask(r.tid);
    Object.assign(e, {tid:r.tid, tree:r.tree, title:t ? t.title : '', rate:null, next:'',
      pause:r.pause, cap:r.cap, sw:r.sw, paused:r.paused + (r.pAt ? Date.now() - r.pAt : 0)});
  }
  S.focus.log.push(e);
  return e;
}
// hết giờ. quiet = phát hiện lúc mở app (đã hết giờ khi app đang tắt): không kêu, không tự chạy tiếp
function fFinish(quiet){
  const f = S.focus, c = f.cfg, r = f.run;
  const e = fLog(r, r.since + r.dur - r.acc, r.dur);
  f.run = null;
  if(r.phase === 'work'){
    f.cycle++;
    f.next = f.cycle % c.every ? 'short' : 'long';
    if(c.askRate || c.askNext){ f.rev = e.id; ui.fRev = {rate:0, next:''}; }
    fCheer();
  }else f.next = 'work';
  if(!quiet){ fChime(r.phase); fNotify(r.phase); }
  const q = fQueue();
  if(c.auto && !quiet && (r.phase === 'work' || q.length)) return fStart(f.next, q[0]);
  fStopTick(); save(); fPaint();
}
function fPause(){
  const r = S.focus.run; if(!r || !r.since) return;
  r.acc += Date.now() - r.since; r.since = null; r.pAt = Date.now(); r.pause++;
  save(); fPaint();
}
function fResume(){
  const r = S.focus.run; if(!r || r.since) return;
  r.paused += Date.now() - r.pAt; r.since = Date.now(); r.pAt = null;
  fAudio(); save(); fPaint();
}
function fCancel(){
  const f = S.focus, r = f.run; if(!r) return;
  const ms = fWorked(r);
  if(!confirm(`Huỷ phiên đang làm? ${Math.floor(ms / 6e4)} phút đã làm vẫn được ghi lại, nhưng không tính là một phiên đạt, và cây đang trồng sẽ héo.`)) return;
  if(ms >= 6e4) fLog(r, Date.now(), ms);   // bấm nhầm rồi huỷ ngay thì không ghi
  f.run = null; fStopTick(); save(); fPaint();
}
// bỏ giờ nghỉ, kể cả khi chưa bắt đầu — vẫn ghi lại để biết mình hay bỏ nghỉ
function fSkip(){
  const f = S.focus, now = Date.now();
  if(f.run) fLog(f.run, now, fWorked(f.run));
  else fLog({phase:f.next, a:now, dur:f.cfg[f.next] * 6e4}, now, 0);
  f.run = null; f.next = 'work'; fStopTick(); save(); fPaint();
}
function fReview(keep){
  const f = S.focus, e = f.log.find(x => x.id === f.rev);
  if(e && keep){ e.rate = ui.fRev.rate || null; e.next = ui.fRev.next.trim(); }
  f.rev = null; ui.fRev = {rate:0, next:''};
  save(); fPaint();
}
// mừng lúc xong phiên; chạm mục tiêu ngày thì nói rõ
function fCheer(){
  const c = S.focus.cfg, n = fCount()[today()] || 0, e = fWorks().pop();
  const msg = [`🌳 Trồng xong cây ${fSpecies(e.tree).n} cấp ${fStage(e.ms / 6e4)} · hôm nay ${n}/${c.goal}`];
  if(n === c.goal) msg.push(`🔥 Đạt mục tiêu hôm nay · chuỗi ${fRun().cur} ngày`);
  ui.fCheer = msg;
  ui.fPop = true;
  toast(ui.fCheer[ui.fCheer.length - 1]);
}

/* --- hàng đợi --- */
function fAdd(tid){
  const f = S.focus, t = fTask(tid); if(!t) return;
  if(t.status !== 'doing') return toast('Chỉ task ở cột Đang làm mới vào được hàng đợi — kéo task sang Đang làm trước');
  const q = fQueue();
  if(q.includes(tid)) return toast('Task này đã ở trong hàng đợi');
  if(q.length >= f.cfg.qmax) return toast(`Hàng đợi đã đủ ${f.cfg.qmax} task — làm xong hoặc bỏ bớt một task trước`);
  q.push(tid); save(); fPaint();
  toast(`Đã thêm vào hàng đợi: ${t.title.trim() || '(chưa đặt tên)'}`);
}
// chọn task cho phiên: đưa lên đầu hàng. Đang giữa phiên thì là đổi task — một lần chuyển ngữ cảnh,
// trừ khi task cũ đã xong (làm xong sớm thì chuyển sang việc tiếp là đúng)
function fPick(tid){
  const f = S.focus, r = f.run; if(!fTask(tid)) return;
  if(r && r.phase === 'work' && r.tid !== tid){
    const old = fTask(r.tid);
    if(old && old.status !== 'done'){
      if(f.cfg.confirmSw && !confirm('Đổi task giữa phiên? Lần đổi này được ghi lại là một lần chuyển ngữ cảnh.')) return;
      r.sw++;
    }
    r.tid = tid;
  }
  f.queue = [tid, ...fQueue().filter(x => x !== tid)];
  save(); fPaint();
}
function fDone(tid){
  const t = fTask(tid); if(!t) return;
  t.status = 'done'; t.pg = 100; t.done = today();
  save(); render();
  toast(`✓ Xong task: ${t.title.trim() || '(chưa đặt tên)'}`);
}
// chợt nhớ việc khác giữa phiên: ghi vào Để sau rồi quay lại, không làm ngay
function fCapture(title){
  S.tasks.unshift({id:uid(), title, area:'work', prio:'med', status:'backlog', pg:0, tags:[],
    due:'', time:'', dur:60, remind:30, note:'', cr:today(), subs:[], done:null});
  const r = S.focus.run;
  if(r && r.phase === 'work') r.cap++;
  save();
  $('#ctK').textContent = S.tasks.filter(t => t.status === 'backlog').length;
  toast('Đã ghi vào Để sau — quay lại việc đang làm');
}

/* --- khung đồng hồ: dùng chung cho sidebar (side), mục Tập trung (page) và toàn màn hình (full) --- */
function fPanel(mode){
  const f = S.focus, c = f.cfg, r = f.run, q = fQueue(), big = mode !== 'side', full = mode === 'full';
  const phase = r ? r.phase : f.next, n = fCount()[today()] || 0;
  const dots = Array.from({length:Math.min(12, Math.max(c.goal, n))}, (_, i) => i < n ? '●' : '○').join('');
  let h = `<div class="fzph"><span class="d"></span>${FPHASE[phase]}
    <span class="fzdots" title="Hôm nay ${n}/${c.goal} phiên">${dots}</span>
    ${mode === 'full' ? '<button class="fzic" data-ffull="0" title="Thoát toàn màn hình (Esc)">✕</button>'
                      : '<button class="fzic" data-ffull="1" title="Toàn màn hình">⤢</button>'}</div>`;
  if(big && phase === 'work') h += fGrowHTML();
  if(ui.fCheer) h += `<div class="fzcheer${ui.fPop ? ' pop' : ''}"><span>${ui.fCheer.map(esc).join('<br>')}</span>
    <button class="fzic" data-fcheer title="Đóng">✕</button></div>`;
  if(f.rev) h += fRevHTML();

  if(!r){
    h += `<div class="fzclock">${fClock(c[phase] * 6e4)}</div>`;
    if(phase !== 'work') return h + `<div class="fzrest">${fRest(phase)}</div>
      <div class="fzbtns"><button class="btn" data-fstart>▶ Bắt đầu nghỉ</button><button class="btn ghost" data-fskip>Bỏ nghỉ</button></div>`;
    const t = fTask(q[0]);
    if(!t) return h + `<div class="fzempty">${big ? 'Hàng đợi trống — thêm task Đang làm vào hàng đợi để bắt đầu' : 'Kéo card ở cột Đang làm thả vào đây'}</div>`;
    return h + (full ? '' : fTaskHTML(t, false)) + (big ? fPickHTML() : '') + '<div class="fzbtns"><button class="btn" data-fstart>▶ Bắt đầu</button></div>';
  }

  h += `<div class="fzclock" data-fclock>${fClock(fLeft(r))}</div><div class="fzbar"><i data-fbar></i></div>`;
  if(r.phase !== 'work') return h + `<div class="fzrest">${fRest(r.phase)}</div>
    <div class="fzbtns"><button class="btn ghost" data-fskip>Bỏ nghỉ</button></div>`;
  if(!full) h += fTaskHTML(fTask(r.tid), true);
  h += r.since
    ? `<div class="fzbtns"><button class="btn ghost" data-fpause>⏸ Tạm dừng</button>
        <button class="fzic" data-fcancel title="Huỷ phiên">■</button></div>`
    : `<div class="fzpaused" data-fpaused></div>
       <div class="fzbtns"><button class="btn" data-fresume>▶ Làm tiếp</button><button class="btn ghost" data-fcancel>Huỷ phiên</button></div>`;
  return mode === 'page' ? h + fCapHTML(true) : h;
}
// tên task và câu "lần trước dừng ở"; task xong ngay giữa phiên thì mời chọn task tiếp trong hàng
function fTaskHTML(t, running){
  if(running && (!t || t.status === 'done')){
    const nextId = fQueue().find(id => !t || id !== t.id);
    return `<div class="fzempty">${t ? 'Task đã xong' : 'Chưa gắn task'} — chọn task tiếp trong hàng đợi
      ${nextId ? `<button class="btn ghost" data-fpick="${nextId}">Làm: ${fName(fTask(nextId))}</button>` : ''}</div>`;
  }
  const nx = fLastNext(t.id);
  return `<div class="fztask">${fName(t)}</div>${nx ? `<div class="fznext">Lần trước dừng ở: ${esc(nx)}</div>` : ''}`;
}
const fCapHTML = big => `<input class="fzin cap" data-fcap placeholder="${big ? '+ Chợt nhớ việc khác? Ghi vào Để sau rồi Enter' : '+ Ghi để sau (Enter)'}" autocomplete="off">`;
// toàn màn hình: task và ô ghi để sau nằm trong ngăn nhỏ bên trái, gập lại được — giữa màn hình chỉ còn đồng hồ
function fLeftHTML(){
  const r = S.focus.run, running = !!r && r.phase === 'work';
  const t = fTask(running ? r.tid : fQueue()[0]);
  if(!S.settings.fzLeft) return `<button class="fzltab" data-fleft title="Mở task và ô ghi để sau">▸ <span>${t ? fName(t) : 'Task'}</span></button>`;
  return `<div class="fzlhd">Task<button class="fzic" data-fleft title="Thu gọn">◂</button></div>
    ${t || running ? fTaskHTML(t, running) : '<div class="fznext">Hàng đợi trống</div>'}
    ${fCapHTML(false)}`;
}
function fRevHTML(){
  const f = S.focus, c = f.cfg, e = f.log.find(x => x.id === f.rev);
  if(!e) return '';
  return `<div class="fzrev"><div class="fzrevh">Xong phiên${e.title.trim() ? ` · ${esc(e.title)}` : ''}</div>
    ${c.askRate ? `<div class="fzrate"><span>Tập trung</span>${[1, 2, 3, 4, 5].map(i =>
      `<button class="${ui.fRev.rate === i ? 'on' : ''}" data-frate="${i}" title="${FRATE[i]}">${i}</button>`).join('')}</div>` : ''}
    ${c.askNext ? `<input class="fzin" data-fin="next" value="${esc(ui.fRev.next)}" placeholder="Lần sau bắt đầu từ…" autocomplete="off">` : ''}
    <div class="fzbtns"><button class="btn" data-frev="1">Lưu</button><button class="btn ghost" data-frev="0">Bỏ qua</button></div></div>`;
}

/* --- vẽ --- */
const fCls = () => { const r = S.focus.run; return `ph-${r ? r.phase : S.focus.next}${r && !r.since ? ' paused' : ''}`; };
function fPaint(){
  fSide();
  if(ui.view === 'focus' && $('#fzMain')) fPaintPage();
  fFullPaint(); fPaintTime();
  ui.fPop = false;
}
function fSide(){
  const el = $('#fzSide'); if(!el) return;
  const f = S.focus, r = f.run, min = !!S.settings.fzMin;
  el.className = `fz side ${fCls()}${min ? ' mini' : ''}`;
  $('#fzMinBtn').textContent = min ? 'Mở' : 'Thu gọn';
  // thu gọn: chỉ còn một dòng mảnh, bấm vào để mở lại
  el.innerHTML = min
    ? `<button class="fzmini" data-fmin title="Mở khối tập trung"><span class="d"></span>${FPHASE[r ? r.phase : f.next]}
        ${f.rev ? '<em>· chấm điểm</em>' : ''}<b${r ? ' data-fclock' : ''}>${fClock(r ? fLeft(r) : f.cfg[f.next] * 6e4)}</b></button>`
    : fPanel('side');
  $('#ctF').textContent = `${fCount()[today()] || 0}/${S.focus.cfg.goal}`;
}
function fFullPaint(){
  const el = $('#fzFull');
  el.hidden = !ui.fFull;
  if(!ui.fFull) return;
  const b = $('#fzFullBody');
  b.className = 'fz full ' + fCls();
  b.innerHTML = fPanel('full');
  const L = $('#fzFullLeft');
  L.className = 'fzleft' + (S.settings.fzLeft ? ' on' : '');
  L.innerHTML = fLeftHTML();
  fLook(el, S.focus.cfg.look[S.focus.run ? S.focus.run.phase : S.focus.next]);
}
function fFull(on){ ui.fFull = on; fFullPaint(); fPaintTime(); }
// 3 lớp nền: màu, ảnh (giữ phần trong suốt), lớp phủ tối / sáng để chữ luôn đọc được
async function fLook(el, lk){
  el.classList.toggle('lt', lk.dim < 0);
  el.querySelector('.fzbg').style.background = lk.c;
  const img = el.querySelector('.fzimg'), src = lk.img ? await imgSrc(lk.img) : '';
  img.style.backgroundImage = src ? `url("${src}")` : 'none';
  img.style.opacity = lk.op / 100;
  el.querySelector('.fzdim').style.background = lk.dim < 0 ? `rgba(255,255,255,${-lk.dim / 100})` : `rgba(0,0,0,${lk.dim / 100})`;
}

function renderFocus(){
  $('#view').innerHTML = `<div class="fzpage">
    <div class="fzcol"><div id="fzMain"></div><div class="fcard fzcard" id="fzQ"></div></div>
    <div class="fzcol"><div class="fcard fzcard" id="fzStats"></div><div class="fcard fzcard" id="fzChart"></div><div class="fcard fzcard" id="fzCfg"></div></div></div>`;
  fPaintPage(); fPaintCfg();
}
function fPaintPage(){
  const f = S.focus, n = fCount()[today()] || 0;
  $('#vSub').textContent = `Hôm nay ${n}/${f.cfg.goal} phiên · chuỗi ${fRun().cur} ngày`;
  $('#fzMain').className = 'fz page ' + fCls();
  $('#fzMain').innerHTML = fPanel('page');
  $('#fzQ').innerHTML = fQueueHTML();
  $('#fzStats').innerHTML = fStatsHTML();
  $('#fzChart').innerHTML = fChartHTML();
}
function fPaintCfg(){
  const el = $('#fzCfg'); if(!el) return;
  el.innerHTML = fCfgHTML();
  $$('[data-fprev]').forEach(p => fLook(p, S.focus.cfg.look[p.dataset.fprev]));
}
function fQueueHTML(){
  const f = S.focus, c = f.cfg, q = fQueue(), r = f.run;
  const cur = r && r.phase === 'work' ? r.tid : q[0];
  const pool = S.tasks.filter(t => t.status === 'doing' && !q.includes(t.id));
  const pill = t => `<span class="pill" style="background:${PRIOS[t.prio].c}22;color:${PRIOS[t.prio].c}">${PRIOS[t.prio].n}</span>`;
  return `<div class="fzh">Hàng đợi<span class="n">${q.length}/${c.qmax}</span></div>
    ${q.length ? `<div>${q.map(id => {
      const t = fTask(id), on = id === cur, nx = fLastNext(id);
      return `<div class="fzqi${on ? ' on' : ''}">
        <span class="sw" style="background:${AREAS[t.area].c}"></span>
        <div class="fzqt"><button class="fzqn" data-fopen="${id}" title="Mở task">${fName(t)}</button> ${pill(t)}
          ${nx ? `<div class="fznext">Lần trước dừng ở: ${esc(nx)}</div>` : ''}</div>
        ${on ? `<span class="meta">${r && r.phase === 'work' ? 'đang làm' : 'phiên tới'}</span>`
             : `<button class="btn ghost" data-fpick="${id}">Chọn</button>`}
        <button class="btn ghost" data-fdone="${id}" title="Đánh dấu task đã xong">✓ Xong</button>
        <button class="fzic" data-fdrop="${id}" title="Bỏ khỏi hàng đợi">✕</button></div>`;
    }).join('')}</div>`
      : '<div class="empty">Hàng đợi trống. Kéo card ở cột Đang làm thả vào khối Tập trung ở sidebar, hoặc chọn task ở dưới.</div>'}
    ${q.length < c.qmax
      // chia nhóm theo ưu tiên, cao lên đầu — chọn được việc quan trọng nhất trước
      ? pool.length ? `<select class="inp" id="fzPick"><option value="">+ Thêm task Đang làm vào hàng đợi…</option>
          ${PRIO_ORDER.map(p => { const g = pool.filter(t => t.prio === p); return g.length ? `<optgroup label="Ưu tiên ${PRIOS[p].n}">
            ${g.map(t => `<option value="${t.id}">${esc(t.title.trim() || '(chưa đặt tên)')}</option>`).join('')}</optgroup>` : ''; }).join('')}</select>`
        : '<div class="fzhint">Không còn task nào ở cột Đang làm để thêm. Kéo task sang Đang làm trên bảng trước.</div>'
      : `<div class="fzhint">Hàng đợi đã đủ ${c.qmax} task. Ít việc đang mở thì đầu ít chỗ để nhảy sang.</div>`}`;
}
function fStatsHTML(){
  const c = S.focus.cfg, k = today(), m = fCount(), n = m[k] || 0, run = fRun();
  const list = fWorks().filter(e => iso(new Date(e.a)) === k);
  const add = key => list.reduce((s, e) => s + (e[key] || 0), 0);
  const rated = list.filter(e => e.rate);
  const bar = (v, goal) => `<div class="bk"><i style="width:${goal ? Math.min(100, v / goal * 100) : 0}%;background:${goal && v >= goal ? 'var(--ok)' : 'var(--acc)'}"></i></div>`;
  const days = Array.from({length:7}, (_, i) => dShift(k, i - 6));
  return `<div class="fzh">Tiến độ</div>
    <div class="fzbig">
      <div><b>${n}/${c.goal}</b><span>phiên hôm nay</span></div>
      <div><b>🔥 ${run.cur}</b><span>ngày liên tiếp</span></div>
      <div><b>🏆 ${run.best}</b><span>chuỗi dài nhất</span></div></div>
    ${bar(n, c.goal)}
    <div class="fzdays">${days.map(d => { const v = m[d] || 0; return `<div class="${v >= c.goal ? 'ok' : v ? 'part' : ''}${d === k ? ' td' : ''}"
      title="${DOW[dowOf(d)]} ${fmtVN(d)} · ${v} phiên"><b>${v || ''}</b><span>${DOW[dowOf(d)]}</span></div>`; }).join('')}</div>
    <div class="fzh">Hôm nay</div>
    <div class="fzsum">
      <div><b>${Math.round(add('ms') / 6e4)}</b><span>phút tập trung</span></div>
      <div><b>${new Set(list.map(e => e.tid)).size}</b><span>task đã làm</span></div>
      <div><b>${add('cap')}</b><span>lần ghi để sau</span></div>
      <div><b>${add('pause')}</b><span>lần tạm dừng</span></div>
      <div><b>${rated.length ? (rated.reduce((s, e) => s + e.rate, 0) / rated.length).toFixed(1) : '—'}</b><span>điểm tập trung</span></div></div>
    ${list.length ? `<div>${list.slice().reverse().map(e => `<div class="fzli${e.done ? '' : ' off'}">
        <span class="tm">${fHM(e.a)}</span>
        <span class="nm">${e.title.trim() ? esc(e.title) : '<span class="ph">(chưa đặt tên)</span>'}</span>
        <span class="meta">${e.done ? (e.rate ? `${e.rate}/5` : '✓') : `bỏ dở · ${Math.round(e.ms / 6e4)} phút`}</span></div>`).join('')}</div>`
      : '<div class="fzhint">Chưa có phiên nào hôm nay.</div>'}`;
}
/* --- khu vườn: mỗi phiên đủ giờ trồng một cây thuộc loài đã chọn; phiên huỷ giữa chừng để lại cây héo.
   Mỗi loài 3 cấp theo số phút: dưới 15, 15 tới dưới 40, từ 40. Cây vẽ bằng SVG, gốc ở (0, 0), cấp 3 cao chừng 100 đơn vị.
   Nét vẽ mềm: tán lá là khối cong liền, tô chuyển màu (gradient dùng chung, khai báo một lần trong #gdefs) và viền mờ. --- */
const GPAL = {   // sáng, vừa, tối, viền
  leaf:['#b5ec8e', '#62bd5e', '#2f7d3a', '#1f5a28'], leafD:['#86c96b', '#3f9a4a', '#22632d', '#184a21'],
  pine:['#8fdca6', '#3f9f68', '#1f6b44', '#154d31'], pink:['#ffe0ec', '#f7a3c6', '#d0628f', '#a1406a'],
  pinkD:['#f7b8d2', '#e27aa6', '#b44c78', '#8c3659'], orange:['#ffe0a3', '#ffa543', '#e0602a', '#a8461b'],
  red:['#ffbfa8', '#ef6a42', '#b8321f', '#862414'], lime:['#f4f9a8', '#bcd95f', '#7ea33a', '#5a7a25'],
  cactus:['#b3eab0', '#56b566', '#2f7a40', '#225c2f'], flower:['#ffd1e3', '#f06292', '#c2185b', '#8e1045']};
const GLIN = {bark:['#b08255', '#6b4428'], birch:['#ffffff', '#d3cdbf'], bamboo:['#cde896', '#6f9f34'],
  palm:['#c9a886', '#8a6a4f'], dead:['#a8988a', '#6d5d50'], stone:['#dcd6cc', '#9d958a']};
document.body.insertAdjacentHTML('beforeend', `<svg id="gdefs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  ${Object.entries(GPAL).map(([k, [l, m, d]]) => `<radialGradient id="g-${k}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${l}"/>
    <stop offset=".5" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></radialGradient>`).join('')}
  ${Object.entries(GLIN).map(([k, [l, d]]) => `<linearGradient id="g-${k}" x2="1"><stop offset=".15" stop-color="${l}"/><stop offset=".9" stop-color="${d}"/></linearGradient>`).join('')}
  <radialGradient id="g-shadow"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="g-grass" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#a6e07a"/><stop offset="1" stop-color="#6fb957"/></linearGradient>
  <linearGradient id="g-lip" x2="1"><stop offset=".45" stop-color="#5fa845"/><stop offset=".55" stop-color="#4b8c38"/></linearGradient>
  <linearGradient id="g-dirt" x2="1"><stop offset=".45" stop-color="#a87650"/><stop offset=".55" stop-color="#855a3a"/></linearGradient>
  <linearGradient id="g-dirtD" x2="1"><stop offset=".45" stop-color="#83573a"/><stop offset=".55" stop-color="#65422b"/></linearGradient>
</defs></svg>`);
const gR = v => Math.round(v * 10) / 10;
const gA = o => o < 1 ? ` opacity="${o}"` : '';
const gE = (x, y, rx, ry, f, o = 1) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${gA(o)}/>`;
const gS = (d, c, w, o = 1) => `<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"${gA(o)}/>`;
// tô khối bằng gradient, viền mềm cùng tông
const gF = (d, k, w = 1.4) => `<path d="${d}" fill="url(#g-${k})"${GPAL[k] ? ` stroke="${GPAL[k][3]}" stroke-width="${w}" stroke-opacity=".45" stroke-linejoin="round"` : ''}/>`;
const gShadow = (rx, ry = rx * .3) => gE(0, 0, rx, ry, 'url(#g-shadow)');
// đường cong kín trơn đi qua các điểm (Catmull-Rom đổi sang Bézier)
const gSmooth = pts => {
  const n = pts.length; let d = `M${gR(pts[0][0])} ${gR(pts[0][1])}`;
  for(let i = 0; i < n; i++){
    const [p0, p1, p2, p3] = [pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    d += `C${gR(p1[0] + (p2[0] - p0[0]) / 6)} ${gR(p1[1] + (p2[1] - p0[1]) / 6)} ${gR(p2[0] - (p3[0] - p1[0]) / 6)} ${gR(p2[1] - (p3[1] - p1[1]) / 6)} ${gR(p2[0])} ${gR(p2[1])}`;
  }
  return d + 'z';
};
// tán lá: mép gợn nhẹ như cụm lá, đốm sáng góc trái trên
const gBlob = (x, y, rx, ry, n = 18, wob = .045) => gSmooth(Array.from({length:n}, (_, i) => {
  const t = i / n * 2 * Math.PI - Math.PI / 2, k = 1 + (i % 2 ? wob : -wob);
  return [x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k];
}));
const gCrown = (x, y, rx, ry, k, n = 18) => gF(gBlob(x, y, rx, ry, n), k)
  + `<path d="${gBlob(x - rx * .3, y - ry * .34, rx * .4, ry * .32, 12, .03)}" fill="${GPAL[k][0]}" opacity=".3"/>`;
// thân cây: thon và hơi cong, chân loe ra, gốc bo tròn
const gTrunk = (h, w, bend = 0, k = 'bark') => gF(`M${-w / 2} 0C${-w * .32} ${gR(-h * .35)} ${gR(-w * .28 + bend)} ${gR(-h * .7)} ${gR(-w * .24 + bend)} ${-h}`
  + `L${gR(w * .24 + bend)} ${-h}C${gR(w * .28 + bend)} ${gR(-h * .7)} ${w * .32} ${gR(-h * .35)} ${w / 2} 0Q0 ${gR(w * .3)} ${-w / 2} 0z`, k);
const gBranch = (d, w, c = '#7a5234') => gS(d, c, w);
// tầng lá cây thông: sườn hơi lõm, đỉnh tròn, mép dưới rủ nhẹ
const gTier = (y, h, w) => gF(`M${-w} ${y}Q${gR(-w * .25)} ${gR(y - h * .4)} ${gR(-w * .14)} ${gR(y - h * .86)}Q0 ${gR(y - h * 1.08)} ${gR(w * .14)} ${gR(y - h * .86)}`
  + `Q${gR(w * .25)} ${gR(y - h * .4)} ${w} ${y}Q${gR(w * .5)} ${gR(y + h * .22)} 0 ${gR(y + h * .12)}Q${gR(-w * .5)} ${gR(y + h * .22)} ${-w} ${y}z`, 'pine');
const gLeaf = (x, y, deg, s, k) => `<g transform="translate(${x} ${y}) rotate(${deg}) scale(${s})">${gF('M0 0C4-6 11-6 15 0C11 6 4 6 0 0z', k, 1.2)}
  ${gS('M2 0H12', GPAL[k][0], 1, .6)}</g>`;
const gSprout = (k1, k2, stem = '#7b5a3a') => gS('M0 0C-1-6 1-11 0-17', stem, 2.6) + gLeaf(0, -11, -155, 1, k1) + gLeaf(0, -15, -25, 1.05, k2);
const gFruit = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#000" stroke-opacity=".2" stroke-width=".8"/><circle cx="${gR(x - r * .35)}" cy="${gR(y - r * .35)}" r="${gR(r * .3)}" fill="#fff" opacity=".5"/>`;
const gPetal = (x, y, deg, c) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="1.7" transform="rotate(${deg} ${x} ${y})" fill="${c}"/>`;
const gBirch = (h, w) => gTrunk(h, w, 0, 'birch')
  + Array.from({length:Math.floor(h / 10)}, (_, i) => `<rect x="${gR(i % 2 ? w * .02 : -w * .36)}" y="${-7 - i * 10}" width="${gR(w * .34)}" height="1.8" rx=".9" fill="#4a5358" opacity=".8"/>`).join('');
// thân cọ: các đốt bầu dục chồng lên nhau, cong dần sang phải; trả về cả toạ độ ngọn
const gPalm = (h, lean) => {
  let s = ''; const n = Math.ceil(h / 7);
  for(let i = 0; i < n; i++){ const t = i / n, x = gR(lean * t * t), y = -i * 7 - 3.5, w = gR(5 - t * 1.4); s += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="4.6" fill="url(#g-palm)" stroke="#6d523c" stroke-opacity=".4" stroke-width=".9"/>`; }
  return [s, lean, -n * 7];
};
// tàu lá cọ: phiến lá cong rủ xuống từ ngọn
const gFronds = (x, y, ends, w) => ends.map(([dx, dy]) => gF(`M${x} ${y}Q${gR(x + dx * .5)} ${gR(y + dy * .5 - w * 2.2)} ${x + dx} ${y + dy}Q${gR(x + dx * .45)} ${gR(y + dy * .5 - w * .3)} ${x} ${y + 1}z`, 'leaf', 1.2)).join('');
const gCactus = (x, h, w) => gF(`M${x - w / 2} 0V${gR(-h + w / 2)}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${gR(-h + w / 2)}V0Q${x} ${gR(w * .15)} ${x - w / 2} 0z`, 'cactus')
  + gS(`M${gR(x - w * .18)} ${gR(-w * .3)}V${gR(-h + w * .55)}M${gR(x + w * .18)} ${gR(-w * .3)}V${gR(-h + w * .55)}`, GPAL.cactus[0], 1.1, .55);
const gArm = (x, y, dir, len, up, w) => gF(`M${x} ${gR(y + w / 2)}H${gR(x + dir * (len - w / 2))}Q${x + dir * len} ${gR(y + w / 2)} ${x + dir * len} ${y}V${gR(y - up + w / 2)}`
  + `A${w / 2} ${w / 2} 0 0 ${dir > 0 ? 0 : 1} ${gR(x + dir * (len - w))} ${gR(y - up + w / 2)}V${gR(y - w / 2)}H${x}z`, 'cactus');
const gBamboo = (x, h, w) => {
  let s = '';
  for(let y = 0; y < h; y += 13){ const sh = Math.min(13, h - y);
    s += `<rect x="${x - w / 2}" y="${-y - sh}" width="${w}" height="${sh}" rx="${w / 2.4}" fill="url(#g-bamboo)" stroke="#557a26" stroke-opacity=".45" stroke-width=".9"/>`; }
  return s;
};
const gFlower = (x, y, r) => [0, 72, 144, 216, 288].map(a => `<ellipse cx="${gR(x + Math.cos(a * Math.PI / 180) * r * .9)}" cy="${gR(y + Math.sin(a * Math.PI / 180) * r * .9)}" rx="${r * .75}" ry="${r * .75}" fill="url(#g-flower)"/>`).join('')
  + `<circle cx="${x}" cy="${y}" r="${gR(r * .55)}" fill="#ffd54f"/>`;
const FSP = {
  pine:{n:'Thông', s:[
    gShadow(14) + gTrunk(7, 5) + gTier(-5, 26, 12),
    gShadow(22) + gTrunk(11, 7) + gTier(-9, 30, 21) + gTier(-28, 30, 16),
    gShadow(32) + gTrunk(15, 9) + gTier(-13, 36, 31) + gTier(-36, 36, 24) + gTier(-58, 38, 17)
      + gFruit(-15, -18, 2.8, '#9a6437') + gFruit(13, -40, 2.8, '#9a6437')]},
  oak:{n:'Sồi', s:[
    gShadow(12) + gSprout('leaf', 'leafD'),
    gShadow(22) + gTrunk(26, 8, 1) + gCrown(0, -45, 23, 20, 'leaf'),
    gShadow(34) + gTrunk(38, 12, 2) + gBranch('M1-28C-5-34-10-38-15-44M2-32C8-38 12-42 16-48', 4.5)
      + gCrown(-17, -56, 21, 18, 'leafD') + gCrown(19, -60, 20, 18, 'leafD') + gCrown(0, -72, 32, 27, 'leaf')
      + gFruit(-20, -48, 3, '#c07a3e') + gFruit(21, -54, 3, '#c07a3e') + gFruit(6, -60, 3, '#c07a3e')]},
  cherry:{n:'Anh đào', s:[
    gShadow(12) + gSprout('leaf', 'leafD', '#6d4c41') + gFruit(0, -19, 4.2, '#f48fb1'),
    gShadow(22) + gTrunk(22, 7, -1, 'bark') + gBranch('M-1-16C-5-22-8-26-10-30M0-19C4-24 7-28 10-32', 3.2, '#6d4c41') + gCrown(0, -42, 23, 18, 'pink'),
    gShadow(34) + gTrunk(34, 11, -2) + gBranch('M-1-26C-8-32-14-38-19-46M-1-29C6-36 12-42 17-50', 5, '#6d4c41')
      + gCrown(-18, -56, 20, 17, 'pinkD') + gCrown(19, -58, 20, 17, 'pinkD') + gCrown(0, -72, 30, 24, 'pink')
      + gPetal(-26, -4, 20, '#f7a3c6') + gPetal(22, -2, -30, '#f48fb1') + gPetal(-6, 5, 60, '#f7a3c6') + gPetal(33, -24, 10, '#ffd1e3')]},
  maple:{n:'Phong đỏ', s:[
    gShadow(12) + gSprout('orange', 'red', '#5d4037') + gLeaf(0, -16, -90, .8, 'orange'),
    gShadow(22) + gTrunk(22, 7, 1, 'bark') + gCrown(0, -42, 23, 19, 'orange'),
    gShadow(34) + gTrunk(36, 11, 1) + gCrown(-18, -56, 21, 18, 'red') + gCrown(19, -58, 20, 18, 'orange') + gCrown(0, -72, 31, 25, 'red')
      + gCrown(-8, -80, 14, 11, 'orange') + gLeaf(-32, -10, 20, .6, 'orange') + gLeaf(26, -3, -40, .6, 'red')]},
  birch:{n:'Bạch dương', s:[
    gShadow(12) + gSprout('lime', 'leaf', '#cfc8b8'),
    gShadow(18) + gBirch(40, 6) + gCrown(0, -54, 15, 23, 'lime', 14),
    gShadow(28) + gBirch(58, 8) + gCrown(-12, -62, 13, 21, 'lime', 14) + gCrown(13, -66, 13, 21, 'lime', 14) + gCrown(0, -80, 17, 25, 'lime', 14)]},
  palm:{n:'Cọ', s:[
    gShadow(12) + gFronds(0, -4, [[-15, 2], [15, 2], [-6, -13], [7, -13]], 3.5),
    gShadow(20) + (([s, x, y]) => s + gFronds(x, y, [[-28, 8], [28, 8], [-20, -10], [21, -10], [1, -18]], 5.5))(gPalm(34, 4)),
    gShadow(30) + (([s, x, y]) => s + gFronds(x, y, [[-40, 12], [40, 12], [-31, -12], [32, -12], [-11, -24], [13, -24]], 7)
      + gFruit(x - 4, y + 4, 4.2, '#7a5236') + gFruit(x + 4, y + 5, 4.2, '#6b4630') + gFruit(x, y + 8, 4, '#7a5236'))(gPalm(62, 8))]},
  cactus:{n:'Xương rồng', s:[
    gShadow(11) + gF(gBlob(0, -9, 9, 9, 12, .02), 'cactus') + gS('M-3-4V-14M3-4V-14', GPAL.cactus[0], 1, .55),
    gShadow(16) + gArm(6, -18, 1, 14, 14, 8) + gCactus(0, 44, 16),
    gShadow(24) + gArm(-8, -30, -1, 17, 18, 10) + gArm(8, -42, 1, 17, 16, 10) + gCactus(0, 70, 20) + gFlower(0, -71, 4)]},
  bamboo:{n:'Tre', s:[
    gShadow(10) + gBamboo(0, 20, 5) + gLeaf(2, -14, -30, .9, 'leaf') + gLeaf(-2, -18, -150, .8, 'leafD'),
    gShadow(16) + gBamboo(-5, 46, 6) + gBamboo(6, 36, 6) + gLeaf(-4, -32, -150, 1, 'leafD') + gLeaf(8, -26, -25, 1, 'leaf') + gLeaf(-4, -44, -40, .9, 'leaf'),
    gShadow(24) + gBamboo(-11, 78, 7) + gBamboo(12, 65, 7) + gBamboo(1, 96, 7)
      + gLeaf(-10, -54, -155, 1.1, 'leafD') + gLeaf(15, -48, -20, 1.1, 'leaf') + gLeaf(4, -72, -30, 1.1, 'leaf')
      + gLeaf(-1, -84, -150, 1, 'leafD') + gLeaf(4, -95, -60, .9, 'leaf') + gLeaf(-10, -30, -140, .9, 'leaf')]}};
const FDEAD = gShadow(18) + gTrunk(34, 7, 0, 'dead') + gBranch('M0-20C-5-26-10-30-14-36M0-27C4-32 8-36 11-42M-14-36C-15-40-15-44-17-47', 3, '#7d6b5d')
  + gPetal(-12, 2, 10, '#a1887f') + gPetal(11, 1, -20, '#8d6e63');
const fSpecies = k => FSP[k] || FSP.pine;   // phiên cũ trước khi có chọn loài thì là thông
const fStage   = min => min < 15 ? 1 : min < 40 ? 2 : 3;
// cây trên đồng hồ: chưa bắt đầu là cây cấp 1, đang chạy thì lên cấp theo số phút đã làm
function fGrowHTML(){
  const r = S.focus.run, k = r ? r.tree : S.focus.tree, st = r ? fStage(fWorked(r) / 6e4) : 1;
  return `<div class="fztree" title="${fSpecies(k).n} · cấp ${st}"><svg viewBox="-50 -104 100 110">
    <g data-ftree data-st="${st}">${fSpecies(k).s[st - 1]}</g></svg></div>`;
}
// hàng chọn loài cây trước khi bắt đầu phiên; app nhớ loài chọn lần trước
function fPickHTML(){
  const cur = S.focus.tree;
  return `<div class="fzsp">${Object.entries(FSP).map(([k, t]) => `<button class="${k === cur ? 'on' : ''}" data-fsp="${k}" title="${t.n}">
      <svg viewBox="-50 -104 100 110">${t.s[2]}</svg></button>`).join('')}</div>
    <div class="fzhint fzsph">${fSpecies(cur).n} · cấp 2 từ 15 phút, cấp 3 từ 40 phút</div>`;
}
// hình thoi bo góc, đỉnh trên ở (x, y), nửa rộng W, nửa cao H
const gDia = (x, y, W, H, k) => {
  const V = [[x, y], [x + W, y + H], [x, y + 2 * H], [x - W, y + H]], at = (p, q) => `${gR(p[0] + (q[0] - p[0]) * k)} ${gR(p[1] + (q[1] - p[1]) * k)}`;
  return V.map((v, i) => `${i ? 'L' : 'M'}${at(v, V[(i + 3) % 4])}Q${gR(v[0])} ${gR(v[1])} ${at(v, V[(i + 1) % 4])}`).join('') + 'z';
};
// ô đất isometric N×N bo góc; cây và cỏ hoa rải ngẫu nhiên nhưng cố định theo khoảng đang xem (vẽ lại không bị xáo)
function fGardenHTML(list, seed){
  const N = Math.max(4, Math.ceil(Math.sqrt(list.length))), a = 50, b = 25, depth = 24, k = Math.min(.12, .5 / N);
  let h = 0; for(const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const cells = []; for(let i = 0; i < N; i++) for(let j = 0; j < N; j++) cells.push([i, j]);
  // mặt cỏ có ô sáng xen kẽ rất nhẹ, không kẻ lưới cứng
  const tiles = cells.filter(([i, j]) => (i + j) % 2).map(([i, j]) =>
    `<path d="${gDia((i - j) * a, (i + j) * b + b * .12, a * .88, b * .88, .3)}" fill="#fff" opacity=".07"/>`).join('');
  for(let i = cells.length - 1; i > 0; i--){ const x = Math.floor(rnd() * (i + 1)); [cells[i], cells[x]] = [cells[x], cells[i]]; }
  // ô trống thỉnh thoảng có khóm cỏ, bông hoa hay hòn đá
  const items = cells.map(([i, j], n) => {
    const x = gR((i - j) * a + (rnd() - .5) * 34), y = gR((i + j) * b + b + (rnd() - .5) * 16), e = list[n], p = rnd();
    if(e){
      const sp = fSpecies(e.tree), st = fStage(e.ms / 6e4), dk = iso(new Date(e.a)), m = Math.round(e.ms / 6e4);
      const tip = `${e.done ? `${sp.n} · cấp ${st}` : `${sp.n} héo`} · ${fHM(e.a)} ${DOW[dowOf(dk)]} ${fmtVN(dk)} · ${e.done ? `${m} phút` : `bỏ dở sau ${m} phút`} · ${e.title.trim() || '(chưa đặt tên)'}`;
      return {i, j, svg:`<g class="gt" data-gtip="${esc(tip)}" transform="translate(${(i - j) * a} ${(i + j) * b + b}) scale(.8)">${e.done ? sp.s[st - 1] : FDEAD}</g>`};
    }
    const svg = p < .2 ? gS(`M${x} ${y}c-1-3-3-5-5-7M${x} ${y}c0-3 0-6 1-9M${x} ${y}c1-3 3-5 5-6`, '#4f9a3a', 1.5)
      : p < .32 ? gS(`M${x} ${y}c0-2 1-4 0-6`, '#4f9a3a', 1.2) + gFlower(x, gR(y - 7), p < .26 ? 1.8 : 1.5)
      : p < .4 ? gE(x, y + 1, 6, 2, 'url(#g-shadow)') + gE(x, y - 1, 5, 3, 'url(#g-stone)') + gE(gR(x - 1.5), gR(y - 2.2), 1.8, .9, '#fff', .5) : '';
    return {i, j, svg};
  }).sort((p, q) => p.i + p.j - q.i - q.j || p.i - q.i).map(x => x.svg).join('');   // sau vẽ trước, trước che lên
  // khối đất: chồng các lớp hình thoi từ dưới lên; gradient ngang làm mặt trái sáng, mặt phải tối
  const layers = Array.from({length:depth / 2}, (_, n) => { const dy = depth - n * 2;
    return `<path d="${gDia(0, dy, N * a, N * b, k)}" fill="url(#g-${dy > depth - 5 ? 'dirtD' : dy > 6 ? 'dirt' : 'lip'})"/>`; }).join('');
  const W = 2 * N * a + 24, top = b - 90, H = 2 * N * b + depth + 30 - top;
  return `<svg class="fgarden" viewBox="${-N * a - 12} ${top} ${W} ${H}">
    ${gE(0, N * b + depth + 8, N * a * .95, N * b * .95, 'url(#g-shadow)')}
    ${layers}<path d="${gDia(0, 0, N * a, N * b, k)}" fill="url(#g-grass)"/>
    <path d="${gDia(0, 1.5, N * a - 3, N * b - 1.5, k)}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
    ${tiles}${items}</svg>`;
}
// tooltip của cây trong vườn: đi theo chuột
document.addEventListener('mouseover', e => {
  const g = e.target.closest && e.target.closest('[data-gtip]'); let tip = $('#gtip');
  if(!g){ if(tip) tip.hidden = true; return; }
  if(!tip){ tip = document.createElement('div'); tip.id = 'gtip'; document.body.appendChild(tip); }
  tip.textContent = g.dataset.gtip; tip.hidden = false;
});
document.addEventListener('mousemove', e => {
  const tip = $('#gtip'); if(!tip || tip.hidden) return;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = e.clientY + 16 + 'px';
});

// biểu đồ giờ tập trung theo tuần / tháng / năm. Tính mọi phiên, kể cả bỏ dở, vì thời gian đó vẫn là đã ngồi làm.
// ui.fcM = khoảng đang xem, ui.fcOff = lùi / tiến bao nhiêu khoảng so với hiện tại
const FCM = {week:'Tuần', month:'Tháng', year:'Năm'};
const fHours = ms => { const m = Math.round(ms / 6e4); return m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}`; };
function fChartHTML(){
  const mode = ui.fcM || 'week', off = ui.fcOff || 0, k0 = today();
  let cols, title;   // cols: [{a, b, lbl, tip}] — khoảng ngày [a, b] của mỗi cột
  if(mode === 'week'){
    const mon = dShift(fMon(k0), off * 7);
    cols = Array.from({length:7}, (_, i) => { const d = dShift(mon, i);
      return {a:d, b:d, lbl:`${DOW[dowOf(d)]}<br>${d.slice(8)}/${d.slice(5, 7)}`, tip:`${DOW[dowOf(d)]} ${fmtVN(d)}`, now:d === k0}; });
    title = off ? `${fmtVN(mon).slice(0, 5)} – ${fmtVN(dShift(mon, 6))}` : 'Tuần này';
  }else if(mode === 'month'){
    const x = new Date(k0.slice(0, 7) + '-01T00:00:00'); x.setMonth(x.getMonth() + off);
    const first = iso(x), n = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    cols = Array.from({length:n}, (_, i) => { const d = dShift(first, i);
      return {a:d, b:d, lbl:+d.slice(8) % 5 && i ? '' : +d.slice(8), tip:`${DOW[dowOf(d)]} ${fmtVN(d)}`, now:d === k0}; });
    title = `Tháng ${x.getMonth() + 1}/${x.getFullYear()}`;
  }else{
    const y = +k0.slice(0, 4) + off;
    cols = Array.from({length:12}, (_, i) => { const m = `${y}-${String(i + 1).padStart(2, '0')}`;
      return {a:m + '-01', b:m + '-31', lbl:`T${i + 1}`, tip:`Tháng ${i + 1}/${y}`, now:m === k0.slice(0, 7)}; });
    title = `Năm ${y}`;
  }
  const works = fWorks();
  cols.forEach(c => { const l = works.filter(e => { const k = iso(new Date(e.a)); return k >= c.a && k <= c.b; });
    c.ms = l.reduce((s, e) => s + (e.ms || 0), 0); c.n = l.filter(e => e.done).length; });
  const total = cols.reduce((s, c) => s + c.ms, 0);
  // cây của khoảng đang xem: phiên đủ giờ, và phiên huỷ đã làm được từ 1 phút (huỷ ngay thì không ghi)
  const a0 = cols[0].a, b0 = cols[cols.length - 1].b;
  const grown = works.filter(e => { const k = iso(new Date(e.a)); return k >= a0 && k <= b0 && (e.done || e.ms >= 6e4); });
  const dead = grown.filter(e => !e.done).length;
  // trục dọc theo giờ: chia 4 nấc tròn số
  const maxH = Math.max(...cols.map(c => c.ms)) / 36e5, step = [.25, .5, 1, 2, 5, 10, 20, 50, 100].find(v => v * 4 >= maxH) || Math.ceil(maxH / 4), top = step * 4;
  return `<div class="fzh">Khu vườn<span class="n">🌳 ${grown.length - dead} cây${dead ? ` · 🥀 ${dead} héo` : ''}</span>
      <div class="scope fcscope">${Object.entries(FCM).map(([k, n]) => `<button class="${mode === k ? 'on' : ''}" data-fcm="${k}">${n}</button>`).join('')}</div></div>
    <div class="fcnav"><button class="nvb" data-fcoff="-1">‹</button><span>${title}</span><button class="nvb" data-fcoff="1">›</button></div>
    ${fGardenHTML(grown, mode + a0)}
    ${grown.length ? '' : '<div class="fzhint fcempty">Chưa trồng cây nào trong khoảng này. Xong một phiên tập trung là có một cây.</div>'}
    <div class="fzh">Giờ tập trung<span class="n">${fHours(total)}</span></div>
    <div class="fchart">
      <div class="fcy">${[4, 3, 2, 1, 0].map(i => `<span>${+(step * i).toFixed(2)}</span>`).join('')}</div>
      <div class="fcplot">${[4, 3, 2, 1, 0].map(i => `<i style="bottom:${i * 25}%"></i>`).join('')}
        ${cols.map(c => `<div class="fccol${c.now ? ' td' : ''}">
          <b style="height:${c.ms / 36e5 / top * 100}%" data-tip="${c.tip} · ${c.ms ? `${fHours(c.ms)} · ${c.n} phiên` : 'chưa tập trung'}"></b></div>`).join('')}</div>
      <div></div>
      <div class="fcx">${cols.map(c => `<span${c.now ? ' class="td"' : ''}>${c.lbl}</span>`).join('')}</div></div>`;
}
function fLookHTML(p){
  const c = S.focus.cfg, lk = c.look[p];
  return `<div class="fzlook">
    <div class="fzprev" data-fprev="${p}"><div class="fzbg"></div><div class="fzimg"></div><div class="fzdim"></div>
      <div class="fzpt">${FPHASE[p]}<b>${fClock(c[p] * 6e4)}</b></div></div>
    <div class="fzlc">
      <div class="fzrow"><span>Màu nền</span><button class="hsw" data-fpal="${p}" style="background:${lk.c}" title="Đổi màu"></button></div>
      <div class="fzrow"><span>Ảnh nền</span><button class="btn ghost" data-fimg="${p}">${lk.img ? 'Đổi ảnh' : 'Tải ảnh lên'}</button>
        ${lk.img ? `<button class="danger" data-fimgx="${p}">Bỏ ảnh</button>` : ''}</div>
      <label class="fzrow"><span>Độ rõ ảnh</span><input type="range" min="0" max="100" data-flook="${p}|op" value="${lk.op}"></label>
      <label class="fzrow"><span>Lớp phủ</span><input type="range" min="-80" max="80" data-flook="${p}|dim" value="${lk.dim}"><em>sáng · tối</em></label>
    </div></div>`;
}
function fCfgHTML(){
  const c = S.focus.cfg;
  if(!ui.fCfg) return `<button class="fzcfgbtn" data-fcfgbtn>⚙ Cài đặt<span>Thời lượng, hàng đợi, mục tiêu, giao diện, âm thanh</span></button>`;
  const num = (k, l, min, max, u) => `<label class="fzrow"><span>${l}</span><input class="inp" type="number" data-fcfg="${k}" min="${min}" max="${max}" value="${c[k]}">${u ? `<em>${u}</em>` : ''}</label>`;
  const chk = (k, l) => `<label class="fzrow chk"><input type="checkbox" data-fcfg="${k}"${c[k] ? ' checked' : ''}><span>${l}</span></label>`;
  const grp = (id, t, body, hint) => `<div class="fzgrp"><div class="fzgh">${t}<button class="lblbtn" data-freset="${id}">Khôi phục mặc định</button></div>
    ${body}${hint ? `<div class="fzhint">${hint}</div>` : ''}</div>`;
  const perm = 'Notification' in window ? Notification.permission : 'denied';
  return `<div class="fzh">Cài đặt<button class="lblbtn" data-fcfgbtn>Thu gọn</button></div>
    ${grp('time', 'Thời lượng', num('work', 'Phiên tập trung', 1, 180, 'phút') + num('short', 'Nghỉ ngắn', 1, 60, 'phút')
      + num('long', 'Nghỉ dài', 1, 90, 'phút') + num('every', 'Nghỉ dài sau mỗi', 1, 12, 'phiên') + chk('auto', 'Tự chạy phiên hoặc giờ nghỉ tiếp theo'),
      'Đổi khi đồng hồ đang chạy thì chỉ áp dụng từ phiên sau — đã bấm bắt đầu là giữ đúng lịch.')}
    ${grp('queue', 'Hàng đợi', num('qmax', 'Số task tối đa', 1, 10, 'task') + chk('confirmSw', 'Đổi task giữa phiên phải xác nhận'),
      'Chỉ task ở cột Đang làm mới vào được hàng đợi.')}
    ${grp('pause', 'Tạm dừng', num('pauseAsk', 'Tạm dừng quá bao lâu thì hỏi huỷ phiên', 1, 60, 'phút'))}
    ${grp('streak', 'Mục tiêu & chuỗi', num('goal', 'Số phiên đạt mỗi ngày', 1, 20, 'phiên') + num('miss', 'Số ngày thường được lỡ', 0, 5, 'ngày')
      + chk('weekend', 'Cuối tuần có làm đủ thì cộng vào chuỗi'),
      'Cuối tuần không làm thì chuỗi không gãy. Phiên huỷ giữa chừng vẫn được ghi lại nhưng không tính là phiên đạt.')}
    ${grp('ask', 'Sau phiên', chk('askRate', 'Chấm độ tập trung cuối phiên')
      + chk('askNext', 'Ghi "lần sau bắt đầu từ…"'))}
    ${grp('look', 'Giao diện toàn màn hình', Object.keys(FPHASE).map(fLookHTML).join(''))}
    ${grp('sound', 'Âm thanh & thông báo', chk('sound', 'Âm báo hết phiên')
      + `<label class="fzrow"><span>Âm lượng</span><input type="range" min="0" max="100" data-fcfg="vol" value="${c.vol}"><button class="btn ghost" data-ftest>Nghe thử</button></label>`
      + chk('notify', 'Thông báo hệ thống')
      + (perm === 'default' ? '<button class="bperm" data-fperm>Cho phép thông báo hệ thống — để được báo cả khi đang ở cửa sổ khác</button>'
        : perm === 'denied' ? '<div class="fzhint">Trình duyệt đang chặn thông báo của trang này.</div>' : '')
      + chk('tabTitle', 'Hiện đồng hồ trên tiêu đề tab'))}`;
}
function fSetCfg(el){
  const c = S.focus.cfg, k = el.dataset.fcfg;
  if(el.type === 'checkbox') c[k] = el.checked;
  else if(el.type === 'number' || el.type === 'range'){
    const v = Math.round(+el.value);
    c[k] = el.value === '' || isNaN(v) ? FCFG[k] : Math.min(+el.max, Math.max(+el.min, v));
    el.value = c[k];
  }else c[k] = el.value.trim();
  save(); fPaint();
  $$('[data-fprev] .fzpt b').forEach(b => b.textContent = fClock(c[b.closest('[data-fprev]').dataset.fprev] * 6e4));
}
function fPickImg(p){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const file = inp.files[0]; if(!file) return;
    try{ const id = 'i' + uid(); await imgPut(id, await shrink(file)); S.focus.cfg.look[p].img = id; }
    catch(e){ return toast('Không đọc được ảnh này'); }
    save(); fPaintCfg(); fFullPaint();
  };
  inp.click();
}

/* --- sự kiện --- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fstart],[data-fskip],[data-fpause],[data-fresume],[data-fcancel],[data-ffull],[data-fcheer],[data-frate],'
    + '[data-frev],[data-fpick],[data-fdone],[data-fdrop],[data-fopen],[data-fcm],[data-fcoff],[data-fsp],[data-fcfgbtn],[data-freset],[data-fpal],[data-fimg],[data-fimgx],[data-ftest],[data-fperm],[data-fleft],[data-fmin]');
  if(!b) return;
  const d = b.dataset, f = S.focus;
  if('fstart' in d) return f.next === 'work' ? fStart('work', fQueue()[0]) : fStart(f.next);
  if('fskip' in d) return fSkip();
  if('fpause' in d) return fPause();
  if('fleft' in d){ S.settings.fzLeft = !S.settings.fzLeft; save(); return fFullPaint(); }
  if('fmin' in d){ S.settings.fzMin = !S.settings.fzMin; save(); fSide(); return fPaintTime(); }
  if('fresume' in d) return fResume();
  if('fcancel' in d) return fCancel();
  if('ffull' in d) return fFull(d.ffull === '1');
  if('fcheer' in d){ ui.fCheer = null; return fPaint(); }
  if('frate' in d){ ui.fRev.rate = ui.fRev.rate === +d.frate ? 0 : +d.frate; return fPaint(); }
  if('frev' in d) return fReview(d.frev === '1');
  if('fpick' in d) return fPick(d.fpick);
  if('fdone' in d) return fDone(d.fdone);
  if('fdrop' in d){ f.queue = f.queue.filter(x => x !== d.fdrop); save(); return fPaint(); }
  if('fopen' in d) return openTask(d.fopen);
  if('fsp' in d){ f.tree = d.fsp; save(); return fPaint(); }
  if('fcm' in d){ ui.fcM = d.fcm; ui.fcOff = 0; return fPaintPage(); }
  if('fcoff' in d){ ui.fcOff = (ui.fcOff || 0) + +d.fcoff; return fPaintPage(); }
  if('fcfgbtn' in d){ ui.fCfg = !ui.fCfg; return fPaintCfg(); }
  if('freset' in d){
    FGROUPS[d.freset].forEach(k => f.cfg[k] = structuredClone(FCFG[k]));
    save(); fPaintCfg(); return fPaint();
  }
  if('fpal' in d){
    const lk = f.cfg.look[d.fpal];
    return openPal(b, lk.c, c => { lk.c = c; save(); fPaintCfg(); fFullPaint(); });
  }
  if('fimg' in d) return fPickImg(d.fimg);
  if('fimgx' in d){ f.cfg.look[d.fimgx].img = null; save(); fPaintCfg(); return fFullPaint(); }
  if('ftest' in d) return fChime('work', true);
  if('fperm' in d) (async () => { try{ await Notification.requestPermission(); }catch(e){} fPaintCfg(); })();
});
document.addEventListener('input', e => {
  const el = e.target, fin = el.dataset && el.dataset.fin;
  if(fin === 'next') ui.fRev.next = el.value;
  else if(el.dataset && el.dataset.flook){
    const [p, k] = el.dataset.flook.split('|'), lk = S.focus.cfg.look[p];
    lk[k] = +el.value;
    $$(`[data-fprev="${p}"]`).forEach(x => fLook(x, lk));
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if(!el.dataset) return;
  if(el.dataset.flook){ save(); fFullPaint(); }
  else if(el.dataset.fcfg) fSetCfg(el);
  else if(el.id === 'fzPick' && el.value) fAdd(el.value);
});
document.addEventListener('keydown', e => {
  const el = e.target;
  if(e.key !== 'Enter' || !el.dataset || e.isComposing) return;
  if('fcap' in el.dataset && el.value.trim()){ fCapture(el.value.trim()); el.value = ''; }
  else if(el.dataset.fin === 'next') fReview(true);
});
// sau F5 trình duyệt chặn âm thanh tới khi có cú bấm đầu tiên — bấm đâu cũng mở khoá lại
document.addEventListener('pointerdown', () => { if(S.focus.run) fAudio(); });
// mở app: phiên đã hết giờ lúc app tắt thì ghi nhận luôn; phiên còn chạy thì chạy tiếp
function fBoot(){
  const r = S.focus.run;
  if(r && r.since && fLeft(r) <= 0) fFinish(true);
  if(S.focus.run) fStartTick();
  fPaint();
}

/* ============ thùng rác ============ */
// task bị bỏ nằm riêng trong S.trash nên bảng, lịch, thống kê, nhắc việc tự không thấy
function trashTask(id){
  const t = S.tasks.find(x => x.id === id); if(!t) return;
  S.tasks = S.tasks.filter(x => x.id !== id);
  t.trashed = today(); S.trash.unshift(t);
  save(); toast('Đã chuyển vào thùng rác');
}
function renderTrash(){
  const fmt = d => d ? d.split('-').reverse().join('/') : '';
  const nroots = S.ntrash.filter(n => n.trashed);
  $('#vSub').textContent = `${S.trash.length} task · ${nroots.length} trang ghi chú · xoá vĩnh viễn thì không lấy lại được`;
  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <div class="fld"><label style="display:flex;align-items:center">Task đã bỏ
      ${S.trash.length ? '<button class="danger" id="trClr" style="margin-left:auto">Xoá vĩnh viễn tất cả</button>' : ''}</label>
      ${S.trash.length ? `<div>${S.trash.map(t => `<div class="tgrow">
          <span class="sw" style="width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:${AREAS[t.area].c}"></span>
          <span style="word-break:break-word">${t.title.trim() ? esc(t.title) : '<span class="ph">(chưa đặt tên)</span>'}</span>
          <span class="meta" style="white-space:nowrap">${STATUSES[t.status].n} · bỏ ngày ${fmt(t.trashed)}</span>
          <button class="btn ghost" data-restore="${t.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">Khôi phục</button>
          <button class="danger" data-purge="${t.id}" style="white-space:nowrap">Xoá vĩnh viễn</button></div>`).join('')}</div>`
        : '<div class="empty">Thùng rác trống. Kéo card trên bảng xuống đáy màn hình để bỏ.</div>'}</div>
  </div><div class="fcard">
    <div class="fld"><label style="display:flex;align-items:center">Ghi chú đã bỏ
      ${nroots.length ? '<button class="danger" id="ntrClr" style="margin-left:auto">Xoá vĩnh viễn tất cả</button>' : ''}</label>
      ${nroots.length ? `<div>${nroots.map(n => { const k = nTree(S.ntrash, n).length - 1; return `<div class="tgrow">
          <span style="word-break:break-word">${nTitle(n)}</span>
          <span class="meta" style="white-space:nowrap">${k ? `kèm ${k} trang con · ` : ''}bỏ ngày ${fmt(n.trashed)}</span>
          <button class="btn ghost" data-nrestore="${n.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">Khôi phục</button>
          <button class="danger" data-npurge="${n.id}" style="white-space:nowrap">Xoá vĩnh viễn</button></div>`; }).join('')}</div>`
        : '<div class="empty">Chưa có trang ghi chú nào bị bỏ.</div>'}</div>
  </div></div>`;

  $$('[data-restore]').forEach(b => b.onclick = () => {
    const t = S.trash.find(x => x.id === b.dataset.restore);
    S.trash = S.trash.filter(x => x !== t);
    delete t.trashed; S.tasks.unshift(t); syncTags();
    save(); render(); toast('Đã khôi phục task');
  });
  $$('[data-purge]').forEach(b => b.onclick = () => {
    const t = S.trash.find(x => x.id === b.dataset.purge);
    if(!confirm(`Xoá vĩnh viễn "${t.title.trim() || '(chưa đặt tên)'}"? Không lấy lại được.`)) return;
    S.trash = S.trash.filter(x => x !== t); save(); render();
  });
  if(S.trash.length) $('#trClr').onclick = () => {
    if(!confirm(`Xoá vĩnh viễn ${S.trash.length} task trong thùng rác? Không lấy lại được.`)) return;
    S.trash = []; save(); render();
  };

  // khôi phục / xoá một trang ghi chú là khôi phục / xoá cả các trang con bị bỏ cùng lúc với nó
  $$('[data-nrestore]').forEach(b => b.onclick = () => {
    const n = S.ntrash.find(x => x.id === b.dataset.nrestore), tree = nTree(S.ntrash, n);
    S.ntrash = S.ntrash.filter(x => !tree.includes(x));
    delete n.trashed;
    if(n.parent && !S.notes.some(p => p.id === n.parent)) n.parent = null;   // trang cha đã bị bỏ / xoá thì về cấp gốc
    S.notes.push(...tree); syncTags();
    save(); render(); toast('Đã khôi phục trang ghi chú');
  });
  $$('[data-npurge]').forEach(b => b.onclick = () => {
    const n = S.ntrash.find(x => x.id === b.dataset.npurge), tree = nTree(S.ntrash, n);
    if(!confirm(`Xoá vĩnh viễn "${n.title.trim() || 'Không có tiêu đề'}"${tree.length > 1 ? ` và ${tree.length - 1} trang con` : ''}? Không lấy lại được.`)) return;
    S.ntrash = S.ntrash.filter(x => !tree.includes(x)); save(); render();
  });
  if(nroots.length) $('#ntrClr').onclick = () => {
    if(!confirm(`Xoá vĩnh viễn ${nroots.length} trang ghi chú trong thùng rác? Không lấy lại được.`)) return;
    S.ntrash = []; save(); render();
  };
}

async function exportJSON(){
  const blob = new Blob([await dataJSON()], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dieukhien-${today()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
}
function importJSON(file){
  const r = new FileReader();
  r.onload = async () => {
    try{
      const d = JSON.parse(r.result);
      if(!Array.isArray(d.tasks)) throw new Error('File không đúng định dạng');
      if(!confirm(`Nạp ${d.tasks.length} task và ghi đè toàn bộ dữ liệu hiện tại?`)) return;
      for(const [id, url] of Object.entries(d.images || {})) await imgPut(id, await (await fetch(url)).blob());
      applyData(d);
      if(SCOPES[S.settings.scope]) ui.scope = S.settings.scope;
      srvKeep = true;                          // server cất bản đang có vào data/backups trước khi bị đè
      save(); render();
    }catch(e){ alert('Không đọc được file: ' + e.message); }
  };
  r.readAsText(file);
}

/* ============ sự kiện ============ */
document.addEventListener('click', e => {
  const nav = e.target.closest('.nav');
  if(nav){
    ui.view = nav.dataset.v;
    return render();
  }

  const tag = e.target.closest('.tagf');
  if(tag){ ui.tag = ui.tag === tag.dataset.tag ? null : tag.dataset.tag; return render(); }

  const add = e.target.closest('[data-add]');
  if(add){ return openForm(add.dataset.add); }

  const sc = e.target.closest('[data-scope]');
  if(sc){ ui.scope = S.settings.scope = sc.dataset.scope; save(); return render(); }

  const ht = e.target.closest('[data-htick]');
  if(ht) return hToggle(ht.dataset.htick, ht.dataset.hday || today());

  const hg = e.target.closest('[data-hgo]');
  if(hg){ ui.view = 'habits'; return render(); }

  const c = e.target.closest('.card');
  if(c) return openTask(c.dataset.id);
});
// đóng lịch chọn ngày khi bấm ra ngoài hoặc khi cuộn trang
document.addEventListener('click', e => {
  // phần tử đã bị gỡ khỏi DOM (do vừa vẽ lại lịch) thì không tính là bấm ra ngoài
  if(!dp || !e.target.isConnected) return;
  if(!e.target.closest('.dp') && !e.target.closest('[data-dt]')) closeDP();
});
// đóng bảng màu khi bấm ra ngoài
document.addEventListener('click', e => {
  if(!$('#palEl') || !e.target.isConnected) return;
  if(!e.target.closest('.pal') && !e.target.closest('[data-pal],[data-hpal],[data-fpal]')) closePal();
});
document.addEventListener('scroll', e => {
  const t = e.target;
  if(t && t.nodeType === 1 && t.closest && t.closest('#slashEl, #ftbEl')) return;  // cuộn trong chính menu
  if(dp) closeDP();
  if(slash) closeSlash();
  hideFtb(); closePal();
}, true);
// đóng menu "/" và thanh công cụ khi bấm ra ngoài vùng soạn thảo
document.addEventListener('mousedown', e => {
  if(e.target.closest('.ed, .ProseMirror')) return;
  if(!e.target.closest('#slashEl')) closeSlash();
  if(!e.target.closest('#ftbEl')) hideFtb();
});
// đóng bảng lọc khi bấm ra ngoài (bấm trong bảng lọc thì bảng vẽ lại, phần tử cũ đã rời DOM)
const closeBf = () => { ui.bfOpen = false; $('.bfp')?.setAttribute('hidden', ''); };
document.addEventListener('click', e => {
  if(!ui.bfOpen || !e.target.isConnected || e.target.closest('.bfw')) return;
  closeBf();
});
// đóng chuông khi bấm ra ngoài
document.addEventListener('click', e => {
  if($('#bellP').hidden || !e.target.isConnected) return;
  if(!e.target.closest('.bellw')) closeBell();
});
$('#bellBtn').onclick = toggleBell;
$('#sdCal').onclick = e => {
  const ev = e.target.closest('.sdev');
  if(ev) return openTask(ev.dataset.id);
  const s = e.target.closest('[data-slot]');
  if(s) pickSlot(ui.sDate, s.dataset.slot);
};
const shiftSd = n => { const x = new Date(ui.sDate + 'T00:00:00'); x.setDate(x.getDate() + n); ui.sDate = iso(x); renderSideCal(); };
$('#sdPrev').onclick = () => shiftSd(-1);
$('#sdNext').onclick = () => shiftSd(1);
$('#sdDay').onclick  = () => { ui.sDate = today(); sdScrolled = null; renderSideCal(); };
$('#sdBig').onclick  = () => { ui.view = 'cal'; ui.calMode = S.settings.calMode = 'week'; ui.calD = ui.sDate; save(); render(); };
$('#scrim').onclick = closeDrawer;
$('#newBtn').onclick = () => openForm('todo');
$('#tagMgr').onclick = () => { ui.view = 'tags'; render(); };
const tz = $('#trashZone');
tz.addEventListener('dragover', e => {
  e.preventDefault(); tz.classList.add('over');
  if(ph){ ph.remove(); ph = null; }
});
tz.addEventListener('dragleave', () => tz.classList.remove('over'));
tz.addEventListener('drop', e => {
  e.preventDefault(); tz.classList.remove('on', 'over');
  trashTask(dragId); render();
});
// thả card vào mục "Để sau" ở sidebar để gác lại
const bkNav = $('.nav[data-v="backlog"]');
bkNav.addEventListener('dragover', e => {
  if(!dragId) return;
  e.preventDefault(); bkNav.classList.add('over');
  if(ph){ ph.remove(); ph = null; }
});
bkNav.addEventListener('dragleave', () => bkNav.classList.remove('over'));
bkNav.addEventListener('drop', e => {
  e.preventDefault(); bkNav.classList.remove('over');
  $('#trashZone').classList.remove('on', 'over');
  setBacklog(dragId, true); dragId = null; render();
});
// thả card vào khối Tập trung ở sidebar để đưa vào hàng đợi
const fzSide = $('#fzSide');
fzSide.addEventListener('dragover', e => {
  if(!dragId) return;
  e.preventDefault(); fzSide.classList.add('over');
  if(ph){ ph.remove(); ph = null; }
});
fzSide.addEventListener('dragleave', e => { if(!fzSide.contains(e.relatedTarget)) fzSide.classList.remove('over'); });
fzSide.addEventListener('drop', e => {
  e.preventDefault(); fzSide.classList.remove('over');
  $('#trashZone').classList.remove('on', 'over');
  const id = dragId; dragId = null; fAdd(id);
});
$('#fsBtn').onclick = () => fh ? linkFile() : reconnectFile();
$('#q').oninput = e => {
  ui.q = e.target.value;
  if(['dash', 'board', 'life', 'backlog', 'cal'].includes(ui.view)) render();
  if(ui.view === 'notes') drawNoteList();   // chỉ vẽ lại cột trái, trang đang mở giữ nguyên
};
$('#expBtn').onclick = exportJSON;
$('#impBtn').onclick = () => $('#impFile').click();
$('#impFile').onchange = e => { if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; };
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if(ui.fFull) return fFull(false);
  if(slash) return closeSlash();
  if(dp) return closeDP();
  if($('#palEl')) return closePal();
  if(!$('#bellP').hidden) return closeBell();
  if(ui.bfOpen) return closeBf();
  if(ui.open){ hideFtb(); closeDrawer(); }
});

try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
boot().then(msg => {
  ui.scope = SCOPES[S.settings.scope] ? S.settings.scope : 'today';
  if(CAL_MODES[S.settings.calMode]) ui.calMode = S.settings.calMode;
  render(); restoreFile(); fBoot();
  if(msg) toast(msg);
  checkReminders();
});
setInterval(() => {
  checkReminders(); paintNow();
  $$('[data-ago]').forEach(el => el.textContent = 'Sửa lần cuối ' + fmtAgo(el.dataset.ago));
}, 30000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) checkReminders(); });
