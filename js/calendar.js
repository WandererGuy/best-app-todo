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
