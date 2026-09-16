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
