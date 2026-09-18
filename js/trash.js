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
  $('#vSub').textContent = `${S.trash.length} task · ${nroots.length} trang ghi chú · xoá vĩnh viễn thì không khôi phục lại được`;
  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <div class="fld"><label style="display:flex;align-items:center">Task đã bỏ
      ${S.trash.length ? '<button class="danger" id="trClr" style="margin-left:auto">Xoá vĩnh viễn tất cả</button>' : ''}</label>
      ${S.trash.length ? `<div>${S.trash.map(t => `<div class="tgrow">
          <span class="sw" style="width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:${AREAS[t.area].c}"></span>
          <span style="word-break:break-word">${t.title.trim() ? esc(t.title) : '<span class="ph">(chưa đặt tên)</span>'}</span>
          <span class="meta" style="white-space:nowrap">${STATUSES[t.status].n} · bỏ ngày ${fmt(t.trashed)}</span>
          <button class="btn ghost" data-restore="${t.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">Khôi phục</button>
          <button class="danger" data-purge="${t.id}" style="white-space:nowrap">Xoá vĩnh viễn</button></div>`).join('')}</div>`
        : '<div class="empty">Thùng rác đang trống. Kéo card trên bảng xuống đáy màn hình để bỏ vào đây.</div>'}</div>
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
    if(!confirm(`Xoá vĩnh viễn "${t.title.trim() || '(chưa đặt tên)'}"? Sẽ không khôi phục lại được.`)) return;
    S.trash = S.trash.filter(x => x !== t); save(); render();
  });
  if(S.trash.length) $('#trClr').onclick = () => {
    if(!confirm(`Xoá vĩnh viễn ${S.trash.length} task trong thùng rác? Sẽ không khôi phục lại được.`)) return;
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
    if(!confirm(`Xoá vĩnh viễn "${n.title.trim() || 'Không có tiêu đề'}"${tree.length > 1 ? ` và ${tree.length - 1} trang con` : ''}? Sẽ không khôi phục lại được.`)) return;
    S.ntrash = S.ntrash.filter(x => !tree.includes(x)); save(); render();
  });
  if(nroots.length) $('#ntrClr').onclick = () => {
    if(!confirm(`Xoá vĩnh viễn ${nroots.length} trang ghi chú trong thùng rác? Sẽ không khôi phục lại được.`)) return;
    S.ntrash = []; save(); render();
  };
}
