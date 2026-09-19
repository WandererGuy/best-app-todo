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
      <span class="hint">Gõ <b>/</b> để chèn khối</span>
    </div>
    <div class="jtabs">
      ${pages.map((t, i) => `<button class="jtab${i === ui.jTab ? ' on' : ''}" data-jt="${i}">${esc(t.name)}</button>`).join('')}
      <button class="jtab ico" id="jAdd" title="Thêm trang mới cho ngày này">+</button>
      <button class="jtab ico" id="jRen" title="Đổi tên trang">✎</button>
      ${pages.length > 1 ? '<button class="jtab ico" id="jDel" title="Xoá trang này">✕</button>' : ''}
    </div>
    <div class="jed" id="jHost"></div></div>`;

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
}
