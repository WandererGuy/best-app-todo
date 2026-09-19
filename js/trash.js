/* ============ thùng rác ============ */
// task bị bỏ nằm riêng trong S.trash nên bảng, lịch, thống kê, nhắc việc tự không thấy
function trashTask(id){
  const t = S.tasks.find(x => x.id === id); if(!t) return;
  S.tasks = S.tasks.filter(x => x.id !== id);
  t.trashed = today(); S.trash.unshift(t);
  save(); toast(tr('trash.movedTask'));
}
function renderTrash(){
  const fmt = d => d ? d.split('-').reverse().join('/') : '';
  const nroots = S.ntrash.filter(n => n.trashed);
  $('#vSub').textContent = tr('trash.sub', {t: S.trash.length, n: nroots.length});
  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <div class="fld"><label style="display:flex;align-items:center">${tr('trash.tasks')}
      ${S.trash.length ? `<button class="danger" id="trClr" style="margin-left:auto">${tr('trash.purgeAll')}</button>` : ''}</label>
      ${S.trash.length ? `<div>${S.trash.map(t => `<div class="tgrow">
          <span class="sw" style="width:8px;height:8px;border-radius:50%;flex:0 0 8px;background:${AREAS[t.area].c}"></span>
          <span style="word-break:break-word">${t.title.trim() ? esc(t.title) : `<span class="ph">${tr('task.untitled')}</span>`}</span>
          <span class="meta" style="white-space:nowrap">${tr('trash.metaTask', {s: STATUSES[t.status].n, d: fmt(t.trashed)})}</span>
          <button class="btn ghost" data-restore="${t.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">${tr('trash.restore')}</button>
          <button class="danger" data-purge="${t.id}" style="white-space:nowrap">${tr('trash.purge')}</button></div>`).join('')}</div>`
        : `<div class="empty">${tr('trash.emptyTasks')}</div>`}</div>
  </div><div class="fcard">
    <div class="fld"><label style="display:flex;align-items:center">${tr('trash.notes')}
      ${nroots.length ? `<button class="danger" id="ntrClr" style="margin-left:auto">${tr('trash.purgeAll')}</button>` : ''}</label>
      ${nroots.length ? `<div>${nroots.map(n => { const k = nTree(S.ntrash, n).length - 1; return `<div class="tgrow">
          <span style="word-break:break-word">${nTitle(n)}</span>
          <span class="meta" style="white-space:nowrap">${k ? tr('trash.withKids', {k}) : ''}${tr('trash.metaNote', {d: fmt(n.trashed)})}</span>
          <button class="btn ghost" data-nrestore="${n.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">${tr('trash.restore')}</button>
          <button class="danger" data-npurge="${n.id}" style="white-space:nowrap">${tr('trash.purge')}</button></div>`; }).join('')}</div>`
        : `<div class="empty">${tr('trash.emptyNotes')}</div>`}</div>
  </div></div>`;

  $$('[data-restore]').forEach(b => b.onclick = () => {
    const t = S.trash.find(x => x.id === b.dataset.restore);
    S.trash = S.trash.filter(x => x !== t);
    delete t.trashed; S.tasks.unshift(t); syncTags();
    save(); render(); toast(tr('trash.backTask'));
  });
  $$('[data-purge]').forEach(b => b.onclick = () => {
    const t = S.trash.find(x => x.id === b.dataset.purge);
    if(!confirm(tr('trash.askOne', {n: t.title.trim() || tr('task.untitled')}))) return;
    S.trash = S.trash.filter(x => x !== t); save(); render();
  });
  if(S.trash.length) $('#trClr').onclick = () => {
    if(!confirm(tr('trash.askAllTasks', {n: S.trash.length}))) return;
    S.trash = []; save(); render();
  };

  // khôi phục / xoá một trang ghi chú là khôi phục / xoá cả các trang con bị bỏ cùng lúc với nó
  $$('[data-nrestore]').forEach(b => b.onclick = () => {
    const n = S.ntrash.find(x => x.id === b.dataset.nrestore), tree = nTree(S.ntrash, n);
    S.ntrash = S.ntrash.filter(x => !tree.includes(x));
    delete n.trashed;
    if(n.parent && !S.notes.some(p => p.id === n.parent)) n.parent = null;   // trang cha đã bị bỏ / xoá thì về cấp gốc
    S.notes.push(...tree); syncTags();
    save(); render(); toast(tr('trash.backNote'));
  });
  $$('[data-npurge]').forEach(b => b.onclick = () => {
    const n = S.ntrash.find(x => x.id === b.dataset.npurge), tree = nTree(S.ntrash, n);
    if(!confirm(tr('trash.askNote', {n: n.title.trim() || tr('note.untitled'),
        k: tree.length > 1 ? tr('trash.askNoteKids', {k: tree.length - 1}) : ''}))) return;
    S.ntrash = S.ntrash.filter(x => !tree.includes(x)); save(); render();
  });
  if(nroots.length) $('#ntrClr').onclick = () => {
    if(!confirm(tr('trash.askAllNotes', {n: nroots.length}))) return;
    S.ntrash = []; save(); render();
  };
}
