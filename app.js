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
let S = {tasks:[], trash:[], tags:{}, journal:{}, notes:[], ntrash:[], settings:{jH:560}, notis:[]};   // tags: {tên: màu}; notis: nhắc việc đã bắn; trash: task đã bỏ (có thêm trường trashed); notes / ntrash: ghi chú và ghi chú đã bỏ
// bf: bộ lọc của bảng việc / bảng cuộc sống — prio: các mức ưu tiên đang chọn, due: mốc hạn, area: mảng (chỉ bảng việc); bfOpen: đang mở bảng lọc
let ui = {view:'board', bf:{prio:[], due:null, area:null}, bfOpen:false, tag:null, q:'', scope:'today',
          open:null, calD:null, calMode:'month', jDate:null, jTab:0, sDate:null, doneAll:false, nOpen:null};
let nf = null;                 // dữ liệu form tạo task
let lastSave = null;           // thời điểm lưu gần nhất
let storageOK = true;          // trình duyệt có cho lưu không

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const esc = s => String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => iso(new Date());

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){
      const d = JSON.parse(raw);
      S.tasks = d.tasks || []; S.trash = d.trash || []; S.journal = d.journal || {};
      S.notes = d.notes || []; S.ntrash = d.ntrash || [];
      S.settings = Object.assign({jH:560}, d.settings || {});
      S.tags = d.tags || {}; syncTags();
      S.notis = d.notis || [];
      // nhật ký cũ mỗi ngày một trang -> đổi sang dạng nhiều trang
      Object.keys(S.journal).forEach(k => {
        if(typeof S.journal[k] === 'string') S.journal[k] = [{id:uid(), name:'Ghi chép', html:S.journal[k]}];
      });
    }
    else seed();
  }catch(e){ console.warn('Không đọc được dữ liệu cũ:', e); }
}
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(S)); lastSave = new Date(); storageOK = true; }
  catch(e){ storageOK = false; }
  queueFile();
  paintSave();
}
function paintSave(){
  const b = $('#saveBar'); if(!b) return;
  b.classList.toggle('bad', !storageOK);
  if(!storageOK){ b.innerHTML = '<span class="d"></span>Không lưu được — hãy xuất file!'; return; }
  const hh = lastSave ? lastSave.toTimeString().slice(0,8) : '—';
  b.innerHTML = `<span class="d"></span>Đã lưu ${hh}${fh ? ' · ⇄ file' : ''}`;
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

  const tags = tagNames();
  $('#tagFil').innerHTML = tags.length
    ? tags.map(t => `<button class="tagf${ui.tag===t?' on':''}" data-tag="${esc(t)}"
        style="color:${S.tags[t]}${ui.tag===t ? `;background:${S.tags[t]}22;border-color:${S.tags[t]}` : ''}">#${esc(t)}</button>`).join('')
    : '<div class="nofil">Chưa có tag nào</div>';
  renderSideCal();

  killEds(); closePal();
  const titles = {board:'Bảng việc', life:'Bảng cuộc sống', backlog:'Để sau', cal:'Lịch', journal:'Nhật ký', notes:'Ghi chú', dash:'Tổng quan', new:'Tạo task', tags:'Quản lý tag', trash:'Thùng rác'};
  $('#vTitle').textContent = titles[ui.view];
  ({board:renderBoard, life:renderBoard, backlog:renderBacklog, cal:renderCal, journal:renderJournal, notes:renderNotes, dash:renderDash, new:renderForm, tags:renderTags, trash:renderTrash})[ui.view]();
  if(!storageOK) $('#view').insertAdjacentHTML('afterbegin',
    '<div class="banner">⚠ Trình duyệt đang chặn lưu trữ cục bộ nên dữ liệu sẽ mất khi đóng tab. ' +
    'Hãy bấm <b>Xuất file</b> để giữ lại, và kiểm tra xem có đang mở ở chế độ ẩn danh không.</div>');
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

  $('#view').innerHTML = `<div class="tb">
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
    // cột Xong: mới xong lên đầu, mặc định chỉ hiện DONE_MAX task gần nhất
    let more = 0;
    if(k === 'done'){
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
        <button class="add" data-add="${k}" title="Thêm vào cột này">+</button></div>
      ${body}
      ${more > 0 ? `<button class="donemore" data-more>${ui.doneAll ? 'Thu gọn' : `Xem thêm ${more} task`}</button>` : ''}</section>`;
  }).join('') + '</div>';

  $$('[data-sort]').forEach(b => b.onclick = () => { S.settings.sort = b.dataset.sort; save(); renderBoard(); });
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
      S = {tasks: d.tasks, trash: d.trash || [], tags: d.tags || {}, journal: d.journal || {},
           notes: d.notes || [], ntrash: d.ntrash || [], settings: Object.assign({jH:560}, d.settings || {}), notis: d.notis || []};
      syncTags();
      if(SCOPES[S.settings.scope]) ui.scope = S.settings.scope;
      Object.keys(S.journal).forEach(k => {
        if(typeof S.journal[k] === 'string') S.journal[k] = [{id:uid(), name:'Ghi chép', html:S.journal[k]}];
      });
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
  if(!e.target.closest('.pal') && !e.target.closest('[data-pal]')) closePal();
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
  if(slash) return closeSlash();
  if(dp) return closeDP();
  if($('#palEl')) return closePal();
  if(!$('#bellP').hidden) return closeBell();
  if(ui.bfOpen) return closeBf();
  if(ui.open){ hideFtb(); closeDrawer(); }
});

try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
load(); ui.scope = SCOPES[S.settings.scope] ? S.settings.scope : 'today';
if(CAL_MODES[S.settings.calMode]) ui.calMode = S.settings.calMode;
render(); restoreFile();
checkReminders();
setInterval(() => {
  checkReminders(); paintNow();
  $$('[data-ago]').forEach(el => el.textContent = 'Sửa lần cuối ' + fmtAgo(el.dataset.ago));
}, 30000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) checkReminders(); });
