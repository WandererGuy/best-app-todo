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
      <b>${tr('cal.monthTitle', {m: m + 1, M: tr(`mon.${m + 1}`), y})}</b><button class="dpnav" data-mv="1">›</button></div>
    <div class="dpg">${DOW.map(d => `<div class="w">${d}</div>`).join('')}${cells}</div>
    <div class="dpft"><button data-pick="${today()}">${tr('common.today')}</button>
      ${dp.clear ? `<button data-pick="">${tr('dp.clearDue')}</button>` : ''}</div>`;

  $('#dpEl').querySelectorAll('[data-mv]').forEach(b => b.onclick = () => {
    dp.month = new Date(dp.month.getFullYear(), dp.month.getMonth() + (+b.dataset.mv), 1); drawDP();
  });
  $('#dpEl').querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    const v = b.dataset.pick, fn = dp.onPick; closeDP(); fn(v);
  });
}

/* ============ khung giờ & nhắc việc ============ */
// giờ của task gắn với ngày hạn chót: có t.due và t.time thì task hiện trên lịch trong ngày
const toMin  = s => +s.slice(0,2) * 60 + +s.slice(3,5);
const fmtDur = m => m < 60 ? tr('dur.min', {m})
  : (m % 60 ? tr('dur.hm', {h: Math.floor(m/60), m: m % 60}) : tr('dur.h', {h: m/60}));

// ô chọn giờ / thời lượng / nhắc trước: dùng chung cho panel chi tiết và form tạo task
function slotFieldHTML(pre, x){
  const opt = (v, n, cur) => `<option value="${v}"${String(cur) === String(v) ? ' selected' : ''}>${n}</option>`;
  const off = x.time ? '' : ' disabled';
  const times = x.time && !TIMES.includes(x.time) ? [x.time, ...TIMES].sort() : TIMES;   // giờ lẻ (sửa tay trong file) vẫn hiện đúng
  return `<div class="slot">
    <select class="inp" id="${pre}Time" title="${tr('slot.timeT')}">${opt('', tr('slot.noTime'), x.time || '')}${times.map(v => opt(v, v, x.time)).join('')}</select>
    <select class="inp" id="${pre}Dur" title="${tr('slot.durT')}"${off}>${DURS.map(m => opt(m, fmtDur(m), x.dur || 60)).join('')}</select>
    <select class="inp" id="${pre}Rem" title="${tr('slot.remT')}"${off}>${Object.entries(REMINDS).map(([m, n]) =>
      opt(m, +m ? tr('slot.remPre', {n}) : n, x.remind ?? 30)).join('')}</select>
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
  $('#sdDay').textContent = ui.sDate === today() ? tr('common.today') : `${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`;
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
  const focus = () => $('#nTitle')?.focus();
  if(ui.view === 'new' && nf){ grabForm(); nf.due = date; nf.time = time; renderForm(); setTimeout(focus, 60); }
  else { nf = blankForm(); nf.due = date; nf.time = time; goView('new', focus); }
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
    const when = start > now ? tr('noti.soon', {t: t.time, n: Math.round((start - now) / 6e4)})
      : tr('noti.started', {t: t.time});
    toast(tr('noti.toast', {title: t.title, when}));
    sysNotify(t, when);
  });
  if(hit){ S.notis = S.notis.slice(0, 50); save(); paintBell(); if(!$('#bellP').hidden) drawBell(); }
}
function sysNotify(t, body){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try{
    const n = new Notification(t.title || tr('noti.title'), {body, tag:t.id});
    n.onclick = () => { window.focus(); openTask(t.id); n.close(); };
  }catch(e){}
}

/* --- chuông thông báo --- */
function paintBell(){
  const n = S.notis.filter(x => !x.read).length, b = $('#bellN');
  b.hidden = !n; b.textContent = n > 9 ? '9+' : n;
}
function drawBell(){
  const when = s => { const [d, h] = s.split('T');
    return d === today() ? tr('bell.whenToday', {h}) : tr('bell.when', {d: fmtVN(d), h}); };
  const ask = 'Notification' in window && Notification.permission === 'default';
  $('#bellP').innerHTML = `<div class="bphd"><b>${tr('bell.head')}</b>
      ${S.notis.length ? `<button class="lblbtn" id="bClr">${tr('bell.clear')}</button>` : ''}</div>
    ${ask ? `<button class="bperm" id="bPerm">${tr('bell.perm')}</button>` : ''}
    <div class="bplist">${S.notis.length
      ? S.notis.map(x => `<button class="bpi${x.read ? '' : ' new'}" data-noti="${x.tid}"><b>${esc(x.title || tr('task.untitled'))}</b>
          <span>${tr('bell.item', {when: when(x.start), at: new Date(x.at).toTimeString().slice(0,5)})}</span></button>`).join('')
      : `<div class="nofil" style="padding:14px">${tr('bell.none')}</div>`}</div>`;
  const P = $('#bellP');
  P.querySelector('#bClr')?.addEventListener('click', () => { S.notis = []; save(); paintBell(); drawBell(); });
  P.querySelector('#bPerm')?.addEventListener('click', async () => { try{ await Notification.requestPermission(); }catch(e){} drawBell(); });
  P.querySelectorAll('[data-noti]').forEach(b => b.onclick = () => {
    closeBell();
    if(S.tasks.some(t => t.id === b.dataset.noti)) openTask(b.dataset.noti); else toast(tr('bell.gone'));
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
