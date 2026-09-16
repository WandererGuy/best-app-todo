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
