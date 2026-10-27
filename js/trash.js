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
  const nroots = S.ntrash.filter(n => n.trashed), nAny = nroots.length + S.nbtrash.length;
  $('#vSub').textContent = tr('trash.sub', {t: S.trash.length, n: nAny, j: S.jtrash.length});
  // mục nhật ký: một trang thì ghi ngày · cuốn · tên trang, một cuốn thì ghi tên cuốn và số trang đi kèm
  const jName = e => e.kind === 'book' ? tr('trash.book', {n: e.book.name})
    : `${fmtVN(e.pages[0].d)} · ${jBookName(jCat(e.pages[0]))} · ${e.pages[0].name}`;
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
      ${nAny ? `<button class="danger" id="ntrClr" style="margin-left:auto">${tr('trash.purgeAll')}</button>` : ''}</label>
      ${nAny ? `<div>${S.nbtrash.map(e => `<div class="tgrow">
          <span style="word-break:break-word">${esc(tr('trash.book', {n: e.book.name}))}</span>
          <span class="meta" style="white-space:nowrap">${tr('trash.metaBook', {k: e.notes.length, d: fmt(e.trashed)})}</span>
          <button class="btn ghost" data-nbrestore="${e.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">${tr('trash.restore')}</button>
          <button class="danger" data-nbpurge="${e.id}" style="white-space:nowrap">${tr('trash.purge')}</button></div>`).join('')}${nroots.map(n => { const k = nTree(S.ntrash, n).length - 1; return `<div class="tgrow">
          <span style="word-break:break-word">${nTitle(n)}</span>
          <span class="meta" style="white-space:nowrap">${k ? tr('trash.withKids', {k}) : ''}${tr('trash.metaNote', {d: fmt(n.trashed)})}</span>
          <button class="btn ghost" data-nrestore="${n.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">${tr('trash.restore')}</button>
          <button class="danger" data-npurge="${n.id}" style="white-space:nowrap">${tr('trash.purge')}</button></div>`; }).join('')}</div>`
        : `<div class="empty">${tr('trash.emptyNotes')}</div>`}</div>
  </div><div class="fcard">
    <div class="fld"><label style="display:flex;align-items:center">${tr('trash.journal')}
      ${S.jtrash.length ? `<button class="danger" id="jtrClr" style="margin-left:auto">${tr('trash.purgeAll')}</button>` : ''}</label>
      ${S.jtrash.length ? `<div>${S.jtrash.map(e => `<div class="tgrow">
          <span style="word-break:break-word">${esc(jName(e))}</span>
          <span class="meta" style="white-space:nowrap">${e.kind === 'book' ? tr('trash.metaBook', {k: e.pages.length, d: fmt(e.trashed)}) : tr('trash.metaNote', {d: fmt(e.trashed)})}</span>
          <button class="btn ghost" data-jrestore="${e.id}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">${tr('trash.restore')}</button>
          <button class="danger" data-jpurge="${e.id}" style="white-space:nowrap">${tr('trash.purge')}</button></div>`).join('')}</div>`
        : `<div class="empty">${tr('trash.emptyJournal')}</div>`}</div>
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
  $$('[data-nbrestore]').forEach(b => b.onclick = () => {
    restoreNBook(S.nbtrash.find(x => x.id === b.dataset.nbrestore));
    save(); render(); toast(tr('trash.backNote'));
  });
  $$('[data-nbpurge]').forEach(b => b.onclick = () => {
    const e = S.nbtrash.find(x => x.id === b.dataset.nbpurge);
    if(!confirm(tr('trash.askOne', {n: tr('trash.book', {n: e.book.name})}))) return;
    S.nbtrash = S.nbtrash.filter(x => x !== e); save(); render();
  });
  if(nAny) $('#ntrClr').onclick = () => {
    if(!confirm(tr('trash.askAllNotes', {n: nAny}))) return;
    S.ntrash = []; S.nbtrash = []; save(); render();
  };

  // khôi phục một cuốn là khôi phục cả cuốn lẫn các trang bị bỏ cùng nó (xem restoreJTrash ở journal.js)
  $$('[data-jrestore]').forEach(b => b.onclick = () => {
    restoreJTrash(S.jtrash.find(x => x.id === b.dataset.jrestore));
    save(); render(); toast(tr('trash.backJournal'));
  });
  $$('[data-jpurge]').forEach(b => b.onclick = () => {
    const e = S.jtrash.find(x => x.id === b.dataset.jpurge);
    if(!confirm(tr('trash.askOne', {n: jName(e)}))) return;
    S.jtrash = S.jtrash.filter(x => x !== e); save(); render();
  });
  if(S.jtrash.length) $('#jtrClr').onclick = () => {
    if(!confirm(tr('trash.askAllJournal', {n: S.jtrash.length}))) return;
    S.jtrash = []; save(); render();
  };
}
