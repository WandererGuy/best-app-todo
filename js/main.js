/* ============ render khung ============ */
const VTITLES = {board:'Bảng việc', life:'Bảng cuộc sống', backlog:'Để sau', habits:'Thói quen', focus:'Tập trung', plan:'Lịch trình', cal:'Lịch', journal:'Nhật ký', notes:'Ghi chú', dash:'Tổng quan', new:'Tạo task', tags:'Quản lý tag', trash:'Thùng rác'};
/* nav + tiêu đề: vẽ được ngay từ ui.view, không cần dữ liệu. Gọi sớm lúc tải trang để khung
   hiện đúng trang đang xem luôn, thay vì loé qua "Bảng việc" rồi nhảy khi boot() nạp xong. */
function paintShell(){
  if(KEEP_VIEWS.includes(ui.view)) try{ localStorage.setItem(VIEW_KEY, ui.view); }catch(e){}
  $$('.nav').forEach(b => b.classList.toggle('on', b.dataset.v === ui.view));
  $('#vTitle').textContent = VTITLES[ui.view];
}
/* Đổi sang trang khác. Đi qua đây thay vì gán thẳng ui.view rồi gọi render(), để trình duyệt kịp chụp
   ảnh trang cũ và hoà dần sang trang mới. Chỉ dùng cho việc đổi trang: các lần render khác
   (lọc, tick thói quen, kéo thả, gõ ô tìm) phải đổi tức thì, thêm animation vào là thành ì.
   after chạy sau khi trang mới đã dựng xong: lúc có chuyển cảnh thì render() bị hoãn tới khi trình
   duyệt chụp xong ảnh trang cũ, gọi thẳng ngoài này sẽ chưa thấy phần tử vừa vẽ. */
function goView(v, after){
  ui.view = v;
  const draw = () => { render(); if(after) setTimeout(after, 60); };
  if(!document.startViewTransition) return draw();   // trình duyệt chưa hỗ trợ: fadeView() lo phần dự phòng
  document.startViewTransition(draw);
}
/* Trang vừa vẽ xong lần trước — chỉ để biết khi nào cần chạy fade dự phòng. */
let shownView = null;
function fadeView(){
  if(ui.view === shownView) return;
  shownView = ui.view;
  if(document.startViewTransition) return;
  const v = $('#view');
  v.classList.remove('vfade');
  void v.offsetWidth;            // buộc tính lại layout, nếu không animation sẽ không chạy lại từ đầu
  v.classList.add('vfade');
}
function render(){
  paintShell();
  const onBoard = S.tasks.filter(t => t.status !== 'done' && t.status !== 'backlog');
  $('#ctB').textContent = onBoard.filter(t => t.area !== 'life').length;
  $('#ctL').textContent = onBoard.filter(t => t.area === 'life').length;
  $('#ctK').textContent = S.tasks.filter(t => t.status === 'backlog').length;
  $('#ctT').textContent = S.trash.length + S.ntrash.filter(n => n.trashed).length;
  $('#ctH').textContent = hDue().filter(h => !hDone(h, today())).length;
  if(ui.view !== 'habits' && hd){ hd = null; ui.hEdit = null; }

  const tags = tagNames();
  $('#tagFil').innerHTML = tags.length
    ? tags.map(t => `<button class="tagf${ui.tag===t?' on':''}" data-tag="${esc(t)}"
        style="color:${S.tags[t]}${ui.tag===t ? `;background:${S.tags[t]}22;border-color:${S.tags[t]}` : ''}">#${esc(t)}</button>`).join('')
    : '<div class="nofil">Chưa có tag nào</div>';
  renderSideCal();

  closeEds(); closePal();
  ({board:renderBoard, life:renderBoard, backlog:renderBacklog, habits:renderHabits, focus:renderFocus, plan:renderPlan, cal:renderCal, journal:renderJournal, notes:renderNotes, dash:renderDash, new:renderForm, tags:renderTags, trash:renderTrash})[ui.view]();
  fSide(); fFullPaint(); fPaintTime(); ui.fPop = false;
  if(!storageOK) $('#view').insertAdjacentHTML('afterbegin',
    '<div class="banner">⚠ Trình duyệt đang chặn lưu trữ cục bộ nên dữ liệu sẽ mất khi đóng tab. ' +
    'Hãy bấm <b>Xuất file</b> để giữ lại, và kiểm tra xem có đang mở ở chế độ ẩn danh không.</div>');
  else if(srvErr === 'off') $('#view').insertAdjacentHTML('afterbegin',
    '<div class="banner">⚠ Chưa lưu được vào máy nên dữ liệu chỉ nằm trong trình duyệt này — xoá cache hay đổi profile Chrome là không thấy nữa. ' +
    'Hãy mở app bằng <b>run.bat</b> (cửa sổ đen phải đang mở), rồi tải lại trang.</div>');
  fadeView();
  paintSave(); paintFs(); paintBell(); paintSync();
}

/* ============ sự kiện ============ */
document.addEventListener('click', e => {
  const nav = e.target.closest('.nav');
  if(nav){
    return goView(nav.dataset.v);
  }

  const tag = e.target.closest('.tagf');
  if(tag){ ui.tag = ui.tag === tag.dataset.tag ? null : tag.dataset.tag; saveFil(); return render(); }

  const add = e.target.closest('[data-add]');
  if(add){ return openForm(add.dataset.add); }

  const sc = e.target.closest('[data-scope]');
  if(sc){ ui.scope = S.settings.scope = sc.dataset.scope; save(); return render(); }

  const ht = e.target.closest('[data-htick]');
  if(ht) return hToggle(ht.dataset.htick, ht.dataset.hday || today());

  const hg = e.target.closest('[data-hgo]');
  if(hg){ return goView('habits'); }

  const c = e.target.closest('.card');
  if(c) return openTask(c.dataset.id);
});
// đóng lịch chọn ngày khi bấm ra ngoài hoặc khi cuộn trang
document.addEventListener('click', e => {
  // phần tử đã bị gỡ khỏi DOM (do vừa vẽ lại lịch) thì không tính là bấm ra ngoài
  if(!dp || !e.target.isConnected) return;
  if(!e.target.closest('.dp') && !e.target.closest('[data-dt]')) closeDP();
});
// đóng bảng màu khi bấm ra ngoài
document.addEventListener('click', e => {
  if(!$('#palEl') || !e.target.isConnected) return;
  if(!e.target.closest('.pal') && !e.target.closest('[data-pal],[data-hpal],[data-fpal]')) closePal();
});
document.addEventListener('scroll', e => {
  const t = e.target;
  if(t && t.nodeType === 1 && t.closest && t.closest('#slashEl, #ftbEl')) return;  // cuộn trong chính menu
  if(dp) closeDP();
  if(slash) closeSlash();
  hideFtb(); closePal();
}, true);
// đóng menu "/" và thanh công cụ khi bấm ra ngoài vùng soạn thảo
document.addEventListener('mousedown', e => {
  if(e.target.closest('.ed, .ProseMirror')) return;
  if(!e.target.closest('#slashEl')) closeSlash();
  if(!e.target.closest('#ftbEl')) hideFtb();
});
// đóng bảng lọc khi bấm ra ngoài (bấm trong bảng lọc thì bảng vẽ lại, phần tử cũ đã rời DOM)
const closeBf = () => { ui.bfOpen = false; $('.bfp')?.setAttribute('hidden', ''); };
document.addEventListener('click', e => {
  if(!ui.bfOpen || !e.target.isConnected || e.target.closest('.bfw')) return;
  closeBf();
});
// đóng chuông khi bấm ra ngoài
document.addEventListener('click', e => {
  if($('#bellP').hidden || !e.target.isConnected) return;
  if(!e.target.closest('.bellw')) closeBell();
});
$('#bellBtn').onclick = toggleBell;
$('#sdCal').onclick = e => {
  const ev = e.target.closest('.sdev');
  if(ev) return openTask(ev.dataset.id);
  const s = e.target.closest('[data-slot]');
  if(s) pickSlot(ui.sDate, s.dataset.slot);
};
const shiftSd = n => { const x = new Date(ui.sDate + 'T00:00:00'); x.setDate(x.getDate() + n); ui.sDate = iso(x); renderSideCal(); };
$('#sdPrev').onclick = () => shiftSd(-1);
$('#sdNext').onclick = () => shiftSd(1);
$('#sdDay').onclick  = () => { ui.sDate = today(); sdScrolled = null; renderSideCal(); };
$('#sdBig').onclick  = () => { ui.calMode = S.settings.calMode = 'week'; ui.calD = ui.sDate; save(); goView('cal'); };
$('#scrim').onclick = closeDrawer;
$('#newBtn').onclick = () => openForm('todo');
$('#tagMgr').onclick = () => goView('tags');
const tz = $('#trashZone');
tz.addEventListener('dragover', e => {
  e.preventDefault(); tz.classList.add('over');
  if(ph){ ph.remove(); ph = null; }
});
tz.addEventListener('dragleave', () => tz.classList.remove('over'));
tz.addEventListener('drop', e => {
  e.preventDefault(); tz.classList.remove('on', 'over');
  trashTask(dragId); render();
});
// thả card vào mục "Để sau" ở sidebar để gác lại
const bkNav = $('.nav[data-v="backlog"]');
bkNav.addEventListener('dragover', e => {
  if(!dragId) return;
  e.preventDefault(); bkNav.classList.add('over');
  if(ph){ ph.remove(); ph = null; }
});
bkNav.addEventListener('dragleave', () => bkNav.classList.remove('over'));
bkNav.addEventListener('drop', e => {
  e.preventDefault(); bkNav.classList.remove('over');
  $('#trashZone').classList.remove('on', 'over');
  setBacklog(dragId, true); dragId = null; render();
});
// thả card vào khối Tập trung ở sidebar để đưa vào hàng đợi
const fzSide = $('#fzSide');
fzSide.addEventListener('dragover', e => {
  if(!dragId) return;
  e.preventDefault(); fzSide.classList.add('over');
  if(ph){ ph.remove(); ph = null; }
});
fzSide.addEventListener('dragleave', e => { if(!fzSide.contains(e.relatedTarget)) fzSide.classList.remove('over'); });
fzSide.addEventListener('drop', e => {
  e.preventDefault(); fzSide.classList.remove('over');
  $('#trashZone').classList.remove('on', 'over');
  const id = dragId; dragId = null; fAdd(id);
});
$('#fsBtn').onclick = () => fh ? linkFile() : reconnectFile();
$('#q').oninput = e => {
  ui.q = e.target.value;
  if(['dash', 'board', 'life', 'backlog', 'cal'].includes(ui.view)) render();
  if(ui.view === 'notes') drawNoteList();   // chỉ vẽ lại cột trái, trang đang mở giữ nguyên
};
$('#syncBar').onclick = () => pullSrv(true);
// vừa rời ô soạn thảo / vừa đóng form: nếu đang hoãn bản mới thì nạp luôn
document.addEventListener('focusout', () => setTimeout(() => { if(pullWait) pullSrv(); }, 0));
$('#expBtn').onclick = exportJSON;
$('#impBtn').onclick = () => $('#impFile').click();
$('#impFile').onchange = e => { if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; };
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if(ui.fFull) return fFull(false);
  if(slash) return closeSlash();
  if(dp) return closeDP();
  if($('#palEl')) return closePal();
  if(!$('#bellP').hidden) return closeBell();
  if(ui.bfOpen) return closeBf();
  if(ui.open){ hideFtb(); closeDrawer(); }
});

try{ document.execCommand('defaultParagraphSeparator', false, 'p'); }catch(e){}
paintShell();                    // trước khi boot() nạp xong, khung đã đứng ở đúng trang
boot().then(msg => {
  ui.scope = SCOPES[S.settings.scope] ? S.settings.scope : 'today';
  if(CAL_MODES[S.settings.calMode]) ui.calMode = S.settings.calMode;
  loadFil();
  render(); restoreFile(); fBoot();
  if(msg) toast(msg);
  checkReminders();
});
setInterval(() => {
  checkReminders(); paintNow();
  $$('[data-ago]').forEach(el => el.textContent = 'Sửa lần cuối ' + fmtAgo(el.dataset.ago));
}, 30000);
document.addEventListener('visibilitychange', () => { if(!document.hidden) checkReminders(); });
