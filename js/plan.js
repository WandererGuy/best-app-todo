/* ============ lịch trình trong ngày ============
   Một bảng kỳ vọng (kv) cho mỗi ngày.
   - Ruy-băng ngang: cả 24 giờ trong một cái nhìn, khoảng trống để hở.
   - Danh sách dọc: tên khối, sửa giờ — nối thành mạch như nhật ký ở mục Tập trung.
   Khối của một ngày được copy từ mẫu lúc mở ngày đó lần đầu (giống cách jPages
   tạo trang nhật ký), nên sửa mẫu về sau không viết lại lịch sử ngày đã qua. */

const PDAY = 1440;
const pHM  = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const PTIMES = Array.from({length: PDAY / PSTEP + 1}, (_, i) => pHM(i * PSTEP));
const pHrs = m => !m ? '—' : (m % 60 ? (m / 60).toFixed(1).replace('.', ',') : m / 60) + 'g';
const pDur = m => m < 60 ? `${m} phút` : (m % 60 ? `${Math.floor(m / 60)}g${m % 60}` : `${m / 60} giờ`);

/* --- dữ liệu --- */
// mẫu -> khối thật; mỗi lần gọi sinh id mới vì mỗi ngày giữ một bản copy riêng
const pSegs = name => (S.plan.tpl[name] || []).map(([a, b, k, n]) => ({id:uid(), a, b, k, n}));
const pFlat = s => [s.a, s.b, s.k, s.n];
const pTplNames = () => Object.keys(S.plan.tpl);

// khối của một ngày; ngày chưa mở lần nào thì tạo từ mẫu gắn với thứ của ngày đó
function pDay(date){
  let d = S.plan.days[date];
  if(!d){
    const dw = S.plan.dow[new Date(date + 'T00:00:00').getDay()];
    const name = S.plan.tpl[dw] ? dw : S.plan.tpl[S.plan.last] ? S.plan.last : pTplNames()[0];
    d = S.plan.days[date] = {tpl:name, kv:pSegs(name)};
    save();
  }
  return d;
}
const pSorted = d => [...d.kv].sort((x, y) => toMin(x.a) - toMin(y.a));

/* --- ruy-băng: khối xếp theo trục 0–24h, khoảng trống để hở --- */
function pBand(segs){
  const n = new Date();
  const now = ui.pDate === today()
    ? `<b class="pnow" style="left:${(n.getHours() * 60 + n.getMinutes()) / PDAY * 100}%"></b>` : '';
  return `<div class="pbd">${segs.map(s => {
    const a = toMin(s.a), w = toMin(s.b) - a;
    return `<i style="left:${a / PDAY * 100}%;width:${w / PDAY * 100}%;background:${PKINDS[s.k].c}"
      title="${s.a}–${s.b} · ${esc(s.n)}"></i>`;
  }).join('')}${now}</div>`;
}

/* --- các dòng của một ngày: khối, và khoảng trống trên PSTEP xen giữa.
   Cùng cách dựng như fDayLog ở mục Tập trung, để cột màu nối thành một mạch liền. --- */
function pRows(d){
  const segs = pSorted(d), out = [];
  let end = 0;   // phút đã bị chiếm tới, tính dồn — khối chồng nhau thì không lùi lại
  segs.forEach((s, i) => {
    const a = toMin(s.a);
    if(i && a - end >= PSTEP) out.push({gap:a - end, a:pHM(end)});
    // chồng giờ: không chặn, nhưng phải nói ra, không thì tổng giờ cộng trùng mà chẳng ai biết
    out.push({s, over: i && a < end ? end - a : 0});
    end = Math.max(end, toMin(s.b));
  });
  return out;
}
// ngày đang xem có khác mẫu của nó không
const pDirty = (d, segs) =>
  JSON.stringify(segs.map(pFlat)) !== JSON.stringify(S.plan.tpl[d.tpl] || []);

// khoảng trống đầu tiên đủ rộng để nhét một khối mới
function pHole(segs){
  let a = 0;
  for(const s of segs){
    if(toMin(s.a) - a >= PSTEP) return [a, toMin(s.a)];
    a = Math.max(a, toMin(s.b));
  }
  return PDAY - a >= PSTEP ? [a, PDAY] : null;
}
// pos = ' p0' / ' pz': đường nối chỉ hở ở đầu dòng đầu và cuối dòng cuối
function pGapRow(it, pos){
  return `<div class="plr gap${pos}"><span class="tm">${it.a}</span>
    <i class="rail k"></i>
    <div class="bd"><span class="nm">trống ${pDur(it.gap)}</span></div></div>`;
}
function pRow(s, pos, over){
  // --c trên cả dòng: chấm mang màu loại khối
  return `<div class="plr${pos}${ui.pOpen === s.id ? ' on' : ''}"
      data-pr="${s.id}" style="--c:${PKINDS[s.k].c}">
    <span class="tm">${s.a}</span>
    <i class="rail k"></i><i class="dot k"></i>
    <div class="bd"><span class="nm">${esc(s.n)}</span>
      <span class="du">${pDur(toMin(s.b) - toMin(s.a))}</span>
      ${over ? `<span class="dv ov" title="Khối này đè lên khối trước — tổng giờ đang cộng trùng">⚠ chồng ${over}′</span>` : ''}
    </div></div>${ui.pOpen === s.id ? pEdit(s) : ''}`;
}

/* --- panel sửa: tên, loại và giờ của một khối --- */
function pEdit(s){
  const sel = (id, v) => `<select class="inp" id="${id}">${PTIMES.map(t =>
    `<option value="${t}"${t === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<div class="ped">
    <div class="r"><input class="inp" id="pName" value="${esc(s.n)}" placeholder="Tên khối">
      <select class="inp" id="pKind">${Object.entries(PKINDS).map(([k, x]) =>
        `<option value="${k}"${k === s.k ? ' selected' : ''}>${x.n}</option>`).join('')}</select></div>
    <div class="r"><span class="lb">Kỳ vọng</span>${sel('pKvA', s.a)}<span class="ar">→</span>${sel('pKvB', s.b)}</div>
    <div class="r end"><button class="lblbtn del" id="pDel">Xoá khối này</button></div></div>`;
}

/* --- tổng giờ theo loại: phần "nhìn tổng thể" mà bảng giờ đơn lẻ không cho --- */
function pSum(d){
  const kv = pSorted(d).reduce((m, s) => (m[s.k] = (m[s.k] || 0) + toMin(s.b) - toMin(s.a), m), {});
  return Object.keys(PKINDS).filter(k => kv[k]).map(k =>
    `<div><span class="d" style="background:${PKINDS[k].c}"></span>${PKINDS[k].n}
      <b>${pHrs(kv[k])}</b></div>`).join('');
}

/* --- khung --- */
function renderPlan(){
  if(!ui.pDate) ui.pDate = today();
  const date = ui.pDate, d = pDay(date), dt = new Date(date + 'T00:00:00');
  const segs = pSorted(d), dirty = pDirty(d, segs);
  $('#vSub').textContent = Object.keys(S.plan.days).length + ' ngày đã lên lịch';

  const items = pRows(d);
  const rows = items.map((it, i) => {
    const pos = (i === 0 ? ' p0' : '') + (i === items.length - 1 ? ' pz' : '');
    return it.gap ? pGapRow(it, pos) : pRow(it.s, pos, it.over);
  }).join('');

  $('#view').innerHTML = `<div class="pwrap">
    <div class="jbar">
      <button class="nvb" id="pPd">‹</button><button class="nvb" id="pNd">›</button>
      <div><h2>${DOW[dt.getDay()]}, ${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}</h2>
        <div class="sub">${segs.length} khối trong ngày</div></div>
      ${dateBtn('pDp', date, 'Chọn ngày', 'width:auto')}
      <button class="btn ghost" id="pTd">Hôm nay</button>
    </div>

    <div class="ptpl">
      <span class="lb">Mẫu ngày này</span>
      <select class="inp" id="pTpl" title="Đổi mẫu sẽ thay toàn bộ khối của ngày này">
        ${pTplNames().map(n => `<option${n === d.tpl ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <button class="lblbtn" id="pNew" title="Tạo mẫu mới từ các khối của ngày đang xem">+ Mẫu mới</button>
      <button class="lblbtn" id="pRen" title="Đổi tên mẫu đang chọn">✎ Đổi tên</button>
      <button class="lblbtn" id="pDelT" title="Xoá mẫu đang chọn">✕ Xoá mẫu</button>
      <button class="lblbtn sv${dirty ? ' hot' : ''}" id="pSave"
        title="${dirty ? `Ghi ${segs.length} khối của ngày này đè lên mẫu "${esc(d.tpl)}"`
                       : 'Ngày này đang giống hệt mẫu, chưa có gì để lưu'}">
        ${dirty ? '● ' : ''}⤓ Lưu vào mẫu</button>
      <span class="shint${dirty ? ' hot' : ''}">${dirty
        ? `Ngày này đang khác mẫu — lưu thì các ngày sau mới theo, không lưu thì đổi chỉ áp cho hôm nay`
        : `Đang khớp mẫu “${esc(d.tpl)}”`}</span>
    </div>

    <div class="pdow"><span class="lb">Mẫu theo thứ</span>
      ${DOW.map((w, i) => `<label${i === dt.getDay() ? ' class="td"' : ''}>${w}
        <select class="inp" data-pdw="${i}">${pTplNames().map(n =>
          `<option${n === S.plan.dow[i] ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`).join('')}
      <span class="hint">Ngày chưa mở lần nào sẽ lấy mẫu của thứ đó</span></div>

    <div class="pbn">
      <div class="ax">${Array.from({length:9}, (_, i) => `<span style="left:${i / 8 * 100}%">${i * 3}</span>`).join('')}</div>
      <div class="rw">${pBand(segs)}</div>
    </div>

    <div class="psum">${pSum(d)}</div>

    <div class="plhd">
      <button class="pbtn" id="pAdd" title="Thêm một khối vào khoảng trống đầu tiên còn lại trong ngày">+ Thêm khối</button>
      <span class="hint">Bấm một dòng bên dưới để sửa tên, loại và giờ của khối đó</span>
    </div>
    <div class="plist">${rows}</div>
  </div>`;

  const go = n => { ui.pDate = dShift(date, n); ui.pOpen = null; renderPlan(); };
  $('#pPd').onclick = () => go(-1);
  $('#pNd').onclick = () => go(1);
  $('#pTd').onclick = () => { ui.pDate = today(); ui.pOpen = null; renderPlan(); };
  $('#pDp').onclick = e => openDP(e.currentTarget, date, v => {
    if(v){ ui.pDate = v; ui.pOpen = null; renderPlan(); }
  }, false);
  $('#pTpl').onchange = e => {
    const n = e.target.value;
    if(!confirm(`Thay toàn bộ khối của ngày này bằng mẫu "${n}"?`)) return renderPlan();
    d.tpl = n; d.kv = pSegs(n); S.plan.last = n; ui.pOpen = null; save(); renderPlan();
  };
  $('#pSave').onclick = () => {
    if(!dirty) return toast(`Ngày này đang giống hệt mẫu "${d.tpl}", chưa có gì để lưu`);
    if(!confirm(`Ghi ${segs.length} khối của ngày này vào mẫu "${d.tpl}"? Các ngày đã mở trước đó không đổi.`)) return;
    S.plan.tpl[d.tpl] = segs.map(pFlat);
    save(); renderPlan(); toast(`Đã lưu mẫu "${d.tpl}"`);
  };
  // mẫu mới lấy luôn các khối của ngày đang xem làm điểm bắt đầu — sửa một ngày cho vừa ý
  // rồi cất thành loại ngày, đỡ phải gõ lại 16 khối
  $('#pNew').onclick = () => {
    const v = prompt('Tên loại ngày mới:', '');
    if(!v || !v.trim()) return;
    const n = v.trim();
    if(S.plan.tpl[n]) return toast(`Đã có mẫu "${n}"`);
    S.plan.tpl[n] = segs.map(pFlat);
    d.tpl = n; S.plan.last = n; save(); renderPlan();
    toast(`Đã tạo mẫu "${n}" từ ngày ${fmtVN(date)}`);
  };
  // đổi tên: kéo theo mọi chỗ đang trỏ vào tên cũ
  $('#pRen').onclick = () => {
    const v = prompt('Tên mẫu:', d.tpl);
    if(!v || !v.trim() || v.trim() === d.tpl) return;
    const n = v.trim(), old = d.tpl;
    if(S.plan.tpl[n]) return toast(`Đã có mẫu "${n}"`);
    S.plan.tpl = Object.fromEntries(Object.entries(S.plan.tpl).map(([k, x]) => [k === old ? n : k, x]));
    S.plan.dow = S.plan.dow.map(x => x === old ? n : x);
    Object.values(S.plan.days).forEach(x => { if(x.tpl === old) x.tpl = n; });
    if(S.plan.last === old) S.plan.last = n;
    save(); renderPlan();
  };
  $('#pDelT').onclick = () => {
    if(pTplNames().length < 2) return toast('Phải còn ít nhất một mẫu');
    const old = d.tpl;
    if(!confirm(`Xoá mẫu "${old}"? Các ngày đã lên lịch giữ nguyên khối của chúng.`)) return;
    const rest = pTplNames().find(n => n !== old);
    delete S.plan.tpl[old];
    S.plan.dow = S.plan.dow.map(x => x === old ? rest : x);
    Object.values(S.plan.days).forEach(x => { if(x.tpl === old) x.tpl = rest; });
    if(S.plan.last === old) S.plan.last = rest;
    save(); renderPlan();
  };
  $$('[data-pdw]').forEach(el => el.onchange = e => {
    const i = +el.dataset.pdw;
    S.plan.dow[i] = e.target.value; save();
    toast(`${DOW[i]} sẽ dùng mẫu "${e.target.value}"`);
  });
  // khối mới rơi vào khoảng trống đầu tiên, không đè lên khối đang có
  $('#pAdd').onclick = () => {
    const h = pHole(segs);
    if(!h) return toast('Ngày đã kín giờ — thu ngắn hoặc xoá một khối trước đã');
    const s = {id:uid(), a:pHM(h[0]), b:pHM(Math.min(h[1], h[0] + 60)), k:'rest', n:'Khối mới'};
    d.kv.push(s); ui.pOpen = s.id; save(); renderPlan();
  };

  $$('[data-pr]').forEach(el => el.onclick = e => {
    if(e.target.closest('.ped')) return;              // bấm trong panel sửa thì không đóng
    ui.pOpen = ui.pOpen === el.dataset.pr ? null : el.dataset.pr;
    renderPlan();
  });
  if(ui.pOpen) pBindEdit(d, segs.find(s => s.id === ui.pOpen));
}

function pBindEdit(d, s){
  if(!s) return;
  const set = (k, v) => { s[k] = v; save(); renderPlan(); };
  $('#pName').onchange = e => set('n', e.target.value.trim() || 'Khối mới');
  $('#pKind').onchange = e => set('k', e.target.value);
  // đổi giờ: giữ đúng thứ tự đầu < cuối
  $('#pKvA').onchange = e => { s.a = e.target.value; if(toMin(s.b) <= toMin(s.a)) s.b = pHM(Math.min(PDAY, toMin(s.a) + PSTEP)); save(); renderPlan(); };
  $('#pKvB').onchange = e => { s.b = e.target.value; if(toMin(s.b) <= toMin(s.a)) s.a = pHM(Math.max(0, toMin(s.b) - PSTEP)); save(); renderPlan(); };
  $('#pDel').onclick  = () => {
    if(!confirm(`Xoá khối "${s.n}" khỏi ngày này?`)) return;
    d.kv = d.kv.filter(x => x.id !== s.id);
    ui.pOpen = null; save(); renderPlan();
  };
}
