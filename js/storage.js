/* nạp dữ liệu (từ server, localStorage hay file) vào S — thêm trường mới vào S thì sửa ở đây */
function applyData(d){
  S = {tasks: d.tasks || [], trash: d.trash || [], tags: d.tags || {}, journal: d.journal || {},
       notes: d.notes || [], ntrash: d.ntrash || [], habits: d.habits || [],
       settings: Object.assign({...SETTINGS}, d.settings || {}), notis: d.notis || [], focus: fNorm(d.focus),
       plan: pNorm(d.plan)};
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
    : srvErr === 'conflict' ? 'Đã sửa ở cửa sổ khác — đang lấy bản mới'
    : srvErr ? 'Chưa lưu vào máy — chỉ trong trình duyệt' : '';
  b.classList.toggle('bad', !!msg);
  if(msg){ b.innerHTML = `<span class="d"></span>${msg}`; return; }
  const hh = lastSave ? lastSave.toTimeString().slice(0,8) : '—';
  b.innerHTML = `<span class="d"></span>Đã lưu vào máy ${hh}${fh ? ' · ⇄ file' : ''}`;
}

/* ---- dữ liệu chính nằm ở server: serve.py ghi ra data/dieukhien.json ----
   localStorage chỉ là bản đệm, nên xoá cache hay đổi profile Chrome không mất gì.
   Mỗi lần ghi kèm mã phiên bản (ETag) của bản trên server mà dữ liệu đang dựa vào; cửa sổ khác đã ghi
   trước thì server trả 409 — lúc đó tab này nạp lại bản mới (xem pullSrv) thay vì đè lên.
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
      // cửa sổ khác vừa ghi: cất bản ở đây vào data/backups rồi nạp bản mới về, không đè lên nhau
      await stashSrv();
      srvErr = 'conflict'; paintSave();
      srvBusy = false;
      await pullSrv(true);
      return;
    }else if(r.ok){
      srvTag = r.headers.get('ETag'); srvErr = null; srvKeep = srvKeep && !keep;
      setMeta(gen !== srvGen);
      bcSend();
    }else throw new Error(r.status);
  }catch(e){
    if(!srvErr) toast('Chưa lưu được vào máy — cửa sổ run.bat còn mở không? Thay đổi vẫn giữ trong trình duyệt.');
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
/* ---- nhiều tab cùng mở: tab nào cũng theo kịp bản mới nhất ----
   Hỏi server mỗi POLL_MS một lần (và ngay khi quay lại tab); ETag khác thì nạp về.
   BroadcastChannel chỉ để giục các tab cùng trình duyệt hỏi ngay, khỏi chờ hết nhịp — dữ liệu vẫn lấy từ server,
   nên hai profile Chrome hay hai trình duyệt khác nhau cũng đồng bộ được.
   Đang gõ hay đang chạy đồng hồ tập trung thì hoãn: nạp giữa chừng sẽ nuốt mất chữ / phiên đang chạy.
   Lúc đó hiện thanh mời nạp, người dùng bấm hoặc rời chỗ gõ là nạp. */
const POLL_MS = 3000;
const bc = typeof BroadcastChannel === 'function' ? new BroadcastChannel('dieukhien') : null;
let pullBusy = false, pullWait = false;   // pullWait: có bản mới nhưng đang hoãn
if(bc) bc.onmessage = () => pullSrv();

function bcSend(){ try{ bc && bc.postMessage(1); }catch(e){} }
/* lúc này nạp về sẽ ghi đè lên thứ đang làm dở */
function busyNow(){
  const a = document.activeElement;
  if(a && a.closest('.ed, .ProseMirror, input, textarea')) return true;   // đang gõ
  if(S.focus.run && S.focus.run.since) return true;                 // đồng hồ tập trung đang chạy
  if(ui.view === 'new') return true;                                // form tạo task chưa lưu
  return false;
}
/* nạp bản mới trên server về nếu khác bản đang dùng. force = vừa bị 409, phải nạp cho bằng được */
async function pullSrv(force){
  if(!srvOn || pullBusy) return;
  pullBusy = true;
  try{
    const r = await fetch('/api/data', {cache:'no-store'});
    if(!r.ok || r.headers.get('X-App') !== 'dieukhien') throw new Error(r.status);
    const tag = r.headers.get('ETag');
    if(tag === srvTag){ pullWait = false; paintSync(); return; }    // đang là bản mới nhất rồi
    if(!force && busyNow()){ pullWait = true; paintSync(); return; }
    const d = await r.json();
    for(const [id, url] of Object.entries(d.images || {})){
      imgData.set(id, url);
      if(!await imgGet(id)) await imgPut(id, await (await fetch(url)).blob());
    }
    applyData(d);
    srvTag = tag; srvErr = null; pullWait = false;
    try{ localStorage.setItem(KEY, JSON.stringify(S)); lastSave = new Date(); }catch(e){ storageOK = false; }
    setMeta(false);
    render();
    if(ui.open) drawTask();          // render() không vẽ lại panel task đang mở
    if(S.focus.run) fStartTick(); else fStopTick();   // tab khác vừa bắt đầu / dừng phiên: nhịp đồng hồ ở đây theo kịp
    if(force) toast('Cửa sổ khác vừa sửa dữ liệu. Thay đổi ở đây đã cất vào data/backups, màn hình đang là bản mới nhất.');
  }catch(e){ /* server tắt: pushSrv sẽ báo, ở đây im lặng */ }
  finally{ pullBusy = false; }
}
function paintSync(){
  const b = $('#syncBar'); if(!b) return;
  b.hidden = !pullWait;
}
setInterval(() => { if(!document.hidden) pullSrv(); }, POLL_MS);
document.addEventListener('visibilitychange', () => { if(!document.hidden) pullSrv(); });

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
  }catch(e){ if(e.name !== 'AbortError') toast('Chưa liên kết được file: ' + e.message); }
  paintFs();
}
async function writeFile(){
  if(!fh) return;
  try{
    const txt = await dataJSON();
    const w = await fh.createWritable();
    await w.write(txt);
    await w.close();
  }catch(e){ fh = null; toast('Mất quyền ghi file — liên kết lại giúp mình.'); }
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
  }else toast('Chưa được cấp quyền ghi file.');
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
    catch(e){ toast(`Chưa chèn được ảnh ${f.name}`); }
  }
  TT.image(ed, ids, pos);
}
async function addFiles(ed, files, pos){
  const items = [];
  for(const f of files){
    if(f.size > FILE_MAX){ toast(`${f.name} nặng hơn ${FILE_MAX / 1024 / 1024}MB nên chưa đính kèm được`); continue; }
    try{ const id = 'f' + uid(); await imgPut(id, f); items.push({file:id, name:f.name, size:f.size}); }
    catch(e){ toast(`Chưa đính kèm được ${f.name}`); }
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
      loadFil();
      srvKeep = true;                          // server cất bản đang có vào data/backups trước khi bị đè
      save(); render();
    }catch(e){ alert('Chưa đọc được file: ' + e.message); }
  };
  r.readAsText(file);
}
