/* ============ tag: danh sách dùng chung, mỗi tag một màu ============ */
const tagNames = () => Object.keys(S.tags).sort((a, b) => a.localeCompare(b, 'vi'));
const tagStyle = n => { const c = S.tags[n] || '#818cf8'; return `background:${c}22;color:${c}`; };
// trả về tên tag đã có (không phân biệt hoa thường), chưa có thì tạo mới với màu chưa ai dùng
function ensureTag(name){
  const hit = Object.keys(S.tags).find(n => n.toLowerCase() === name.toLowerCase());
  if(hit) return hit;
  const used = Object.values(S.tags), row = TAG_PAL[1];
  S.tags[name] = row.find(c => !used.includes(c)) || row[used.length % row.length];
  return name;
}
// dữ liệu cũ: tag chỉ nằm trong task -> đưa vào danh sách chung
function syncTags(){ [...S.tasks, ...S.notes].forEach(t => (t.tags || []).forEach(n => { if(!S.tags[n]) ensureTag(n); })); }
function delTag(name){
  const n = S.tasks.filter(t => (t.tags || []).includes(name)).length;
  const m = S.notes.filter(t => (t.tags || []).includes(name)).length;
  const used = [n && tr('tag.useTask', {n}), m && tr('tag.useNote', {n: m})].filter(Boolean).join(tr('tag.useJoin'));
  if(!confirm(used ? tr('tag.askDelUsed', {n: name, u: used}) : tr('tag.askDel', {n: name}))) return;
  delete S.tags[name];
  [...S.tasks, ...S.trash, ...S.notes, ...S.ntrash].forEach(t => { if(t.tags) t.tags = t.tags.filter(x => x !== name); });
  if(nf) nf.tags = nf.tags.filter(x => x !== name);
  if(ui.tag === name) ui.tag = null;
  save(); render();
}
// đổi tên: nếu trùng một tag khác thì hỏi gộp (giữ màu của tag đích)
function renameTag(old){
  const v = (prompt(tr('tag.askName'), old) || '').trim().replace(/^#/,'');
  if(!v || v === old) return;
  const hit = Object.keys(S.tags).find(n => n !== old && n.toLowerCase() === v.toLowerCase());
  if(hit && !confirm(tr('tag.askMerge', {h: hit, o: old}))) return;
  const to = hit || v;
  if(!hit) S.tags[to] = S.tags[old];
  delete S.tags[old];
  const swap = arr => [...new Set(arr.map(x => x === old ? to : x))];
  [...S.tasks, ...S.trash, ...S.notes, ...S.ntrash].forEach(t => { if(t.tags) t.tags = swap(t.tags); });
  if(nf) nf.tags = swap(nf.tags);
  if(ui.tag === old) ui.tag = to;
  save(); render();
}
// ô nhập tag: dùng chung cho panel chi tiết và form tạo task
function tagFieldHTML(id, tags, ph){
  return `<div class="tagbox">
      ${tags.map(x => `<span class="tgx" style="${tagStyle(x)}">#${esc(x)}<b data-rmtag="${esc(x)}">✕</b></span>`).join('')}
      <input id="${id}" placeholder="${ph}" autocomplete="off">
    </div>
    <div class="tagsug" id="${id}Sug"></div>`;
}
function bindTagField(root, id, cur, onAdd, onRm){
  const inp = root.querySelector('#' + id), sug = root.querySelector('#' + id + 'Sug');
  const paint = () => {   // gợi ý tag có sẵn, lọc theo chữ đang gõ
    const q = inp.value.trim().replace(/^#/,'').toLowerCase();
    sug.innerHTML = tagNames().filter(n => !cur.includes(n) && n.toLowerCase().includes(q))
      .map(n => `<button class="tgx" style="${tagStyle(n)}" data-addtag="${esc(n)}" title="${tr('tag.attach')}">#${esc(n)}</button>`).join('');
    sug.querySelectorAll('[data-addtag]').forEach(b => b.onclick = () => onAdd(b.dataset.addtag));
  };
  inp.oninput = paint; paint();
  inp.onkeydown = e => {
    if(e.key !== 'Enter') return;
    e.preventDefault();
    const v = inp.value.trim().replace(/^#/,'');
    if(v){ const n = ensureTag(v); save(); onAdd(n); }
  };
  root.querySelectorAll('[data-rmtag]').forEach(b => b.onclick = () => onRm(b.dataset.rmtag));
}

/* --- bảng chọn màu --- */
function openPal(anchor, cur, onPick){
  closePal();
  const el = document.createElement('div'); el.className = 'pal'; el.id = 'palEl';
  el.innerHTML = TAG_PAL.flat().map(c =>
    `<button class="${c === cur ? 'on' : ''}" style="background:${c}" data-pc="${c}"></button>`).join('')
    + `<div class="palft"><span>${tr('tag.otherColor')}</span>
        <input type="color" class="palpick" value="${cur || '#818cf8'}" title="${tr('tag.pickColor')}">
        <input class="palhex" value="${cur || ''}" placeholder="#rrggbb" maxlength="7" title="${tr('tag.hexHint')}"></div>`;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect(), h = el.offsetHeight, w = el.offsetWidth;
  el.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  el.style.top  = (r.bottom + h + 6 > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
  const pick = c => { closePal(); onPick(c); };
  el.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => pick(b.dataset.pc));
  el.querySelector('.palpick').onchange = e => pick(e.target.value);
  const hex = el.querySelector('.palhex');
  hex.oninput = () => hex.classList.remove('bad');
  hex.onkeydown = e => {
    if(e.key !== 'Enter') return;
    const c = normHex(hex.value);
    if(c) pick(c); else hex.classList.add('bad');
  };
}
// "#abc" / "aabbcc" -> "#aabbcc"; sai định dạng thì trả null
function normHex(v){
  const m = v.trim().replace(/^#/,'').toLowerCase();
  if(/^[0-9a-f]{6}$/.test(m)) return '#' + m;
  if(/^[0-9a-f]{3}$/.test(m)) return '#' + [...m].map(x => x + x).join('');
  return null;
}
function closePal(){ $('#palEl')?.remove(); }

/* ============ quản lý tag ============ */
function renderTags(){
  const names = tagNames();
  const count = n => S.tasks.filter(t => (t.tags || []).includes(n)).length;
  const nCount = n => S.notes.filter(t => (t.tags || []).includes(n)).length;
  $('#vSub').textContent = tr('tag.sub', {n: names.length});
  $('#view').innerHTML = `<div class="fwrap"><div class="fcard">
    <div class="fld"><label>${tr('tag.addNew')}</label>
      <div style="display:flex;gap:8px">
        <input class="inp" id="tgNew" placeholder="${tr('tag.newPh')}" autocomplete="off">
        <button class="btn" id="tgAdd">${tr('tag.add')}</button></div>
      <div class="hint" style="margin:0">${tr('tag.addHint')}</div></div>
    <div class="fld"><label>${tr('tag.existing')}</label>
      ${names.length ? `<div>${names.map(n => `<div class="tgrow">
          <button class="tgsw" data-pal="${esc(n)}" style="background:${S.tags[n]}" title="${tr('tag.recolor')}"></button>
          <button class="tgx" data-rentag="${esc(n)}" style="${tagStyle(n)};padding:2px 8px" title="${tr('tag.rename')}">#${esc(n)}</button>
          <span class="meta">${tr('tag.count', {n: count(n)})}${nCount(n) ? tr('tag.countNote', {n: nCount(n)}) : ''}</span>
          <button class="btn ghost" data-rentag="${esc(n)}" style="margin-left:auto;padding:5px 10px;font-size:12px;font-weight:500">${tr('tag.rename')}</button>
          <button class="danger" data-deltag="${esc(n)}">${tr('tag.del')}</button></div>`).join('')}</div>`
        : `<div class="empty">${tr('tag.none')}</div>`}</div>
  </div></div>`;

  const add = () => {
    const v = $('#tgNew').value.trim().replace(/^#/,'');
    if(!v) return;
    const n = ensureTag(v); save(); render();
    toast(tr(n === v ? 'tag.added' : 'tag.already', {n}));
    setTimeout(() => $('#tgNew')?.focus(), 0);
  };
  $('#tgAdd').onclick = add;
  $('#tgNew').onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); add(); } };
  $$('[data-pal]').forEach(b => b.onclick = () =>
    openPal(b, S.tags[b.dataset.pal], c => { S.tags[b.dataset.pal] = c; save(); render(); }));
  $$('[data-deltag]').forEach(b => b.onclick = () => delTag(b.dataset.deltag));
  $$('[data-rentag]').forEach(b => b.onclick = () => renameTag(b.dataset.rentag));
}
