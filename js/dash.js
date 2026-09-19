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

  $('#vSub').textContent = tr('dash.sub', {n: total});
  $('#view').innerHTML = `
    <div class="grid stats">
      ${stat(tr('dash.open'), total - done, tr('dash.openD', {a: by('doing'), b: by('todo')}))}
      ${stat(tr('dash.weekDone'), week, tr('dash.weekDoneD'), '#22c55e')}
      ${stat(tr('dash.overdue'), overdue, tr(overdue ? 'dash.overdueD' : 'dash.overdueOk'), overdue ? '#f43f5e' : null)}
      ${stat(tr('dash.rate'), rate + '%', tr('dash.rateD', {a: done, b: total}))}
      ${stat(tr('dash.avg'), avgPg + '%', tr('dash.avgD'))}
      ${stat(tr('dash.jStreak'), streak, streak ? tr('dash.jStreakD', {n: streak}) : tr('dash.jStreakNo'), streak ? '#818cf8' : null)}
      ${S.habits.length ? stat(tr('dash.habits'), `${hOkN}/${hDueL.length}`,
        hBest ? tr('dash.habitsD', {n: hBest}) : tr('dash.habitsNo'),
        hDueL.length && hOkN === hDueL.length ? '#22c55e' : null) : ''}
    </div>
    <div class="grid panes">
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

      <div class="pane"><h3>${tr('dash.week')}</h3>
        <div class="wk">${wk.map(d => `<div class="wkd">
          <div class="wkv">${d.v || ''}</div>
          <div class="wktrack"><div class="wkb" style="height:${Math.max(3, Math.round(d.v/mx*100))}%;opacity:${d.v?1:.25}"></div></div>
          <div class="wkl">${d.l}</div></div>`).join('')}</div>
      </div>

      ${barPane(tr('dash.byArea'), Object.entries(AREAS).map(([k,a]) => [a.n, list.filter(t => t.area === k).length, a.c]))}
      ${barPane(tr('dash.byPrio'), Object.entries(PRIOS).reverse().map(([k,p]) => [p.n, list.filter(t => t.prio === k).length, p.c]))}
    </div>`;
}
