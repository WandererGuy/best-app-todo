/* ============ tổng quan ============ */
/* Chỉ số của HÔM NAY đứng trước, bức tranh chung đứng sau: mở trang lên là biết ngay
   hôm nay còn việc gì, có gì trễ, đã làm sâu được bao nhiêu — rồi mới tới tổng thể. */
function renderDash(){
  const k0 = today();
  const list = visible();
  const by = k => list.filter(t => t.status === k).length;
  const done = by('done'), total = list.length;
  const rate = total ? Math.round(done / total * 100) : 0;
  const overdue = list.filter(t => dueClass(t) === 'over').sort((a, b) => a.due.localeCompare(b.due));
  const dueToday = list.filter(t => t.status !== 'done' && t.due === k0);
  const dueBy = k => dueToday.filter(t => t.status === k).length;
  const doneToday = list.filter(t => t.done === k0).length;

  const days = Array.from({length:7}, (_, i) => dShift(k0, i - 6));
  const wk = days.map(k => ({l:DOW[dowOf(k)], v:list.filter(t => t.done === k).length}));
  const mx = Math.max(1, ...wk.map(d => d.v));
  const week = wk.reduce((a, b) => a + b.v, 0);

  // tập trung: phiên đạt / mục tiêu hôm nay, chuỗi ngày đạt, số phút làm sâu từng ngày
  const fCnt = fCount(), fToday = fCnt[k0] || 0, fStreak = fRun().cur, fGoal = S.focus.cfg.goal;
  const fMin = {};
  fWorks().forEach(e => { const k = iso(new Date(e.a)); fMin[k] = (fMin[k] || 0) + (e.ms || 0); });
  const fwk = days.map(k => ({l:DOW[dowOf(k)], v:Math.round((fMin[k] || 0) / 6e4)}));
  const fmx = Math.max(1, ...fwk.map(d => d.v));

  const jDays = Object.keys(S.journal).filter(dayHas);
  let streak = 0;
  for(let i = 0; ; i++){ const d = new Date(); d.setDate(d.getDate() - i);
    if(jDays.includes(iso(d))) streak++; else if(i > 0 || !jDays.includes(k0)) break; }

  const hDueL = hDue(), hOkN = hDueL.filter(h => hDone(h, k0)).length;
  const hBest = S.habits.reduce((a, h) => Math.max(a, hRecord(h)), 0);
  // thói quen đang ở buổi quyết định: buổi trước đã lỡ, hôm nay có lịch mà chưa tick
  const hRisk = hDueL.filter(h => !hDone(h, k0) && hMiss(h) >= 1);

  const stat = (k, v, d, c, go) => `<div class="stat${go ? ' go' : ''}"${go ? ` data-dv="${go}"` : ''}>
    <div class="k">${k}</div><div class="v"${c ? ` style="color:${c}"` : ''}>${v}</div><div class="d">${d}</div></div>`;

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
  // cột 7 ngày: dùng chung cho việc hoàn thành và phút tập trung, chỉ khác màu cột
  const wkPane = (title, rows, top, col) => `<div class="pane"><h3>${title}</h3>
    <div class="wk">${rows.map(d => `<div class="wkd">
      <div class="wkv">${d.v || ''}</div>
      <div class="wktrack"><div class="wkb" style="height:${Math.max(3, Math.round(d.v / top * 100))}%;opacity:${d.v ? 1 : .25}${col ? `;background:${col}` : ''}"></div></div>
      <div class="wkl">${d.l}</div></div>`).join('')}</div></div>`;

  const dot = c => `<span class="sw" style="width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:${c}"></span>`;
  const attn = [
    ...overdue.slice(0, 5).map(t => `<div class="tgrow bkrow" data-dgo="${t.id}">${dot(AREAS[t.area].c)}
      <span style="word-break:break-word">${t.title.trim() ? esc(t.title) : `<span class="ph">${tr('task.untitled')}</span>`}</span>
      <span class="meta" style="margin-left:auto;white-space:nowrap;color:var(--high)">${dueLabel(t)}</span></div>`),
    ...hRisk.map(h => `<div class="tgrow bkrow" data-hgo>${dot(h.color)}
      <span style="word-break:break-word">${esc(h.name)}</span>
      <span class="meta" style="margin-left:auto;white-space:nowrap;color:var(--warn)">${tr('hb.missN', {n: hMiss(h)})}</span></div>`),
  ].join('');

  $('#vSub').textContent = tr('dash.sub', {n: total});
  $('#view').innerHTML = `
    <div class="grid stats">
      ${stat(tr('dash.dueToday'), dueToday.length,
        dueToday.length ? tr('dash.openD', {a: dueBy('doing'), b: dueBy('todo')}) : tr('dash.dueTodayNo'), null, 'board')}
      ${stat(tr('dash.overdue'), overdue.length, tr(overdue.length ? 'dash.overdueD' : 'dash.overdueOk'),
        overdue.length ? '#f43f5e' : null, 'board')}
      ${stat(tr('dash.doneToday'), doneToday, tr('dash.doneTodayD', {n: week}), doneToday ? '#22c55e' : null, 'board')}
      ${stat(tr('dash.focus'), `${fToday}/${fGoal}`,
        fStreak ? tr('dash.focusD', {m: fwk[6].v, n: fStreak}) : tr('dash.focusNo', {m: fwk[6].v}),
        fToday >= fGoal ? '#22c55e' : null, 'focus')}
      ${S.habits.length ? stat(tr('dash.habits'), `${hOkN}/${hDueL.length}`,
        hBest ? tr('dash.habitsD', {n: hBest}) : tr('dash.habitsNo'),
        hDueL.length && hOkN === hDueL.length ? '#22c55e' : null, 'habits') : ''}
      ${stat(tr('dash.jStreak'), streak, streak ? tr('dash.jStreakD', {n: streak}) : tr('dash.jStreakNo'),
        streak ? '#818cf8' : null, 'journal')}
    </div>
    <div class="grid panes">
      ${attn ? `<div class="pane"><h3>${tr('dash.attn')}</h3><div>${attn}</div>
        ${overdue.length > 5 ? `<div class="meta" style="padding:8px 2px 0">${tr('dash.attnMore', {n: overdue.length - 5})}</div>` : ''}</div>` : ''}

      <div class="pane"><h3>${tr('dash.byStatus')}</h3><div class="donut">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#2a2f3c" stroke-width="15"/>
          ${arcs}
          <text x="60" y="56" text-anchor="middle" fill="#e7e9ef" font-size="21" font-weight="700">${rate}%</text>
          <text x="60" y="74" text-anchor="middle" fill="#646d80" font-size="10">${tr('dash.donutSub')}</text>
        </svg>
        <div class="lg">${seg.map(([k,v]) =>
          `<div class="lgi"><span class="sw" style="background:${COLS[k].c}"></span>${COLS[k].n}<b>${v}</b></div>`).join('')}</div>
      </div></div>

      ${wkPane(tr('dash.week'), wk, mx)}
      ${wkPane(tr('dash.fweek'), fwk, fmx, '#ec4899')}
      ${barPane(tr('dash.byArea'), Object.entries(AREAS).map(([k,a]) => [a.n, list.filter(t => t.area === k).length, a.c]))}
      ${barPane(tr('dash.byPrio'), Object.entries(PRIOS).reverse().map(([k,p]) => [p.n, list.filter(t => t.prio === k).length, p.c]))}
    </div>`;

  $$('#view [data-dv]').forEach(el => el.onclick = () => goView(el.dataset.dv));
  $$('#view [data-dgo]').forEach(el => el.onclick = () => openTask(el.dataset.dgo));
}
