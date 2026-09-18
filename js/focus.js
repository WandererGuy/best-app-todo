/* ============ tập trung (pomodoro) ============ */
/* S.focus: cfg = cài đặt; queue = id task đang chờ làm (tối đa cfg.qmax, task đầu hàng là task của phiên tới);
   run = phiên hoặc giờ nghỉ đang chạy; next = pha kế tiếp khi chưa chạy; cycle = số phiên đã xong, để biết lúc nào nghỉ dài;
   log = mọi phiên và giờ nghỉ đã qua, kể cả bị huỷ, để sau này phân tích; rev = phiên vừa xong đang chờ chấm điểm;
   tree = loài cây chọn cho phiên tới (xem khu vườn).
   Đồng hồ không đếm nhịp mà tính từ mốc thời gian: run.acc là phần đã chạy trước lần dừng gần nhất, run.since là lúc chạy lại
   (null khi đang dừng). Nên F5, tab chạy nền hay tắt app giữa chừng đều không lệch, và chỉ cần lưu khi trạng thái đổi.
   Phần bù (cfg.buffer phút, 0 là tắt): hết giờ phiên mà đang vào mạch thì đồng hồ không khép lại ngay — chỉ kêu chuông
   (run.rang) rồi đếm lên phần làm thêm, tới khi bấm kết thúc hoặc hết run.buf. Phần bù vẫn là giờ tập trung, nhưng
   cây đã chốt ở mức lúc vừa đủ giờ nên làm thêm không được thưởng thêm. */
const FGROUPS = {time:['work','short','long','every','buffer','auto'], queue:['qmax','confirmSw'], pause:['pauseAsk'],
  streak:['goal','miss','weekend'], ask:['askRate','askNext'],
  look:['look'], sound:['sound','vol','notify','tabTitle']};
const FRATE = {1:'Rất phân tán', 2:'Hay bị kéo đi', 3:'Tạm được', 4:'Khá sâu', 5:'Rất sâu'};
// giờ nghỉ nên rời màn hình: vận động nhẹ hồi sức tốt hơn lướt điện thoại, thứ kéo đầu sang việc khác
const FREST = {short:['Đứng dậy vươn vai', 'Uống một cốc nước', 'Nhìn ra xa 20 giây cho mắt nghỉ', 'Hít thở chậm vài nhịp', 'Đi lại vài bước, để điện thoại ở lại bàn'],
               long:['Đi bộ một vòng, ra chỗ có ánh sáng', 'Ăn nhẹ và uống nước', 'Nhắm mắt nghỉ vài phút', 'Giãn cổ, vai và lưng']};
const FTITLE = document.title;

const fTask   = id => S.tasks.find(t => t.id === id);
const fName   = t => t.title.trim() ? esc(t.title) : '<span class="ph">(chưa đặt tên)</span>';
const fLeft   = r => r.dur - r.acc - (r.since ? Date.now() - r.since : 0);
const fWorked = r => r.acc + (r.since ? Date.now() - r.since : 0);
// phần bù: fOver = đã làm thêm bao lâu, fBuf = còn được làm thêm bao lâu (0 là tới lúc khép phiên)
const fOver   = r => Math.max(0, -fLeft(r));
const fBuf    = r => Math.max(0, (r.buf || 0) - fOver(r));
// cây chốt ở mức lúc vừa đủ giờ: phần bù không nuôi cây thêm
const fTreeMs = r => Math.min(fWorked(r), r.dur);
const fGrown  = e => Math.min(e.ms, e.plan * 6e4);
const fClock  = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
// chữ số trên đồng hồ: phần chính đếm ngược, phần bù đếm lên (làm tròn xuống để đủ một giây mới nhảy số)
const fShow   = r => r.rang ? '+' + fClock(Math.floor(fOver(r) / 1000) * 1000) : fClock(fLeft(r));
const fHM     = ms => new Date(ms).toTimeString().slice(0, 5);
const fRest   = p => FREST[p][S.focus.cycle % FREST[p].length];
const fWorks  = () => S.focus.log.filter(e => e.k === 'work');
const fMon    = k => dShift(k, -((dowOf(k) + 6) % 7));   // thứ Hai của tuần chứa ngày k
// hàng đợi chỉ nhận task đang ở cột Đang làm: chuyển cột khác, xong hay bị bỏ thì tự rời hàng
function fQueue(){
  const f = S.focus;
  f.queue = f.queue.filter(id => fTask(id)?.status === 'doing');
  return f.queue;
}
// câu "lần sau bắt đầu từ…" gần nhất của task — hiện lại lúc chuẩn bị làm tiếp task đó
function fLastNext(tid){
  const log = S.focus.log;
  for(let i = log.length - 1; i >= 0; i--) if(log[i].tid === tid && log[i].next) return log[i].next;
  return '';
}

/* --- thống kê: chỉ phiên chạy đủ giờ mới là phiên đạt --- */
function fCount(){
  const m = {};
  fWorks().forEach(e => { if(e.done){ const k = iso(new Date(e.a)); m[k] = (m[k] || 0) + 1; } });
  return m;
}
// chuỗi ngày đạt mục tiêu. Ngày thường không đạt là lỡ, lỡ quá cfg.miss ngày liên tiếp thì về 0.
// Cuối tuần không đạt thì bỏ qua; có đạt thì vẫn cộng (tắt cfg.weekend thì bỏ qua hẳn cuối tuần).
// Hôm nay chưa đạt thì chưa tính là lỡ, vì ngày chưa hết.
function fRun(){
  const c = S.focus.cfg, m = fCount(), k0 = today(), first = Object.keys(m).sort()[0];
  let cur = 0, best = 0, gap = 0;
  for(let k = first; k && k <= k0; k = dShift(k, 1)){
    const ok = (m[k] || 0) >= c.goal;
    if(dowOf(k) % 6 === 0){ if(ok && c.weekend){ cur++; gap = 0; best = Math.max(best, cur); } continue; }
    if(ok){ cur++; gap = 0; best = Math.max(best, cur); }
    else if(k !== k0 && ++gap > c.miss) cur = 0;
  }
  return {cur, best};
}

/* --- nhịp đồng hồ: Chrome chỉ cho timer ở tab chạy nền chạy mỗi phút một lần, timer trong Worker thì không bị hãm.
   Không hẹn đều mỗi giây mà hẹn đúng mốc giây kế tiếp của chính đồng hồ: mốc ấy tính ra từ run.since, thứ mọi tab
   dùng chung, nên hai tab đổi chữ số cùng một khoảnh khắc thay vì lệch theo lúc từng tab được mở. Hẹn một lần một,
   nên timer chạy trễ (máy ngủ, tab bị hãm) cũng tự về đúng mốc ở lần sau. --- */
let fTick = null, fTimer = null;
function fStartTick(){
  // mỗi lời hẹn mới xoá lời hẹn cũ, để gọi fArm nhiều lần cũng chỉ còn một nhịp
  if(!fTick) try{
    fTick = new Worker(URL.createObjectURL(new Blob(['let t; onmessage = e => { clearTimeout(t); t = setTimeout(() => postMessage(0), e.data); }'])));
    fTick.onmessage = fOnTick;
  }catch(e){}
  fArm();
}
function fStopTick(){
  if(fTick){ fTick.terminate(); fTick = null; }
  clearTimeout(fTimer); fTimer = null;
}
// +20ms cho chắc đã qua mốc; đang tạm dừng thì chữ số đứng yên, chỉ cần nhịp thường để đếm phút dừng
function fArm(){
  const r = S.focus.run;
  if(!r) return;
  const left = r.since ? (r.rang ? fBuf(r) : fLeft(r)) : 0;
  const ms = (left > 0 ? left % 1000 || 1000 : 1000) + 20;
  if(fTick) fTick.postMessage(ms);
  else { clearTimeout(fTimer); fTimer = setTimeout(fOnTick, ms); }
}
function fOnTick(){
  const r = S.focus.run;
  if(r && r.since && fLeft(r) <= 0){
    if(!fBuf(r)) fFinish(false);        // không đặt phần bù, hoặc đã bù hết giờ
    else if(!r.rang) fOvertime();       // vừa đủ giờ: báo một tiếng rồi để đồng hồ chạy tiếp
    else fPaintTime();
  }else fPaintTime();
  fArm();   // fFinish có thể chạy tiếp phiên sau; hết hẳn thì fArm tự thôi
}
// chỉ cập nhật chữ số, không vẽ lại khung — ô đang gõ không bị mất
function fPaintTime(){
  const r = S.focus.run, c = S.focus.cfg;
  if(r){
    const txt = fShow(r);
    $$('[data-fclock]').forEach(el => el.textContent = txt);
    // phần bù thì thanh đã đầy, đứng yên
    $$('[data-fbar]').forEach(el => el.style.width = (r.rang ? 100 : Math.min(100, (1 - fLeft(r) / r.dur) * 100)) + '%');
    // cây lên cấp thì thay hình, phần tử mới nên hiệu ứng lớn lên chạy lại
    if(r.phase === 'work') $$('[data-ftree]').forEach(el => {
      const st = fStage(fTreeMs(r) / 6e4);
      if(+el.dataset.st !== st) el.outerHTML = `<g data-ftree data-st="${st}" class="grow">${fSpecies(r.tree).s[st - 1]}</g>`;
    });
    if(!r.since) $$('[data-fpaused]').forEach(el => {
      const m = Math.floor((Date.now() - r.pAt) / 6e4), long = m >= c.pauseAsk;
      el.classList.toggle('long', long);
      el.textContent = `Đang tạm dừng ${m ? m + ' phút' : 'chưa tới 1 phút'}${long ? ' — mình làm tiếp, hay dừng ở đây?' : ''}`;
    });
  }
  document.title = r && c.tabTitle ? `${r.since ? '' : '⏸ '}${fShow(r)} · ${FPHASE[r.phase]}${r.rang ? ' bù' : ''}` : FTITLE;
}

/* --- âm báo tự tổng hợp, khỏi kèm file: hết phiên thì đi lên, hết nghỉ thì đi xuống --- */
let fAc = null;
function fAudio(){
  try{ fAc ||= new AudioContext(); if(fAc.state === 'suspended') fAc.resume(); }catch(e){}
  return fAc;
}
function fChime(phase, force){
  const c = S.focus.cfg, ac = (c.sound || force) && fAudio();
  if(!ac) return;
  const v = Math.max(.0002, c.vol / 100 * .35);
  (phase === 'work' ? [659, 880, 1319] : [880, 659, 523]).forEach((hz, i) => {
    const t = ac.currentTime + i * .2, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = hz;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + .02);
    g.gain.exponentialRampToValueAtTime(.0001, t + 1.2);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 1.25);
  });
}
function fNotify(phase, over){
  if(!S.focus.cfg.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const body = over ? 'Cây đã xong. Làm nốt rồi bấm kết thúc, hoặc để đó cho đồng hồ tự ngừng.'
    : phase === 'work' ? `Tới giờ ${FPHASE[S.focus.next].toLowerCase()}.` : 'Sẵn sàng cho phiên tiếp theo.';
  try{
    const n = new Notification(over ? '✓ Đủ giờ phiên tập trung' : phase === 'work' ? '✓ Xong phiên tập trung' : 'Hết giờ nghỉ', {body, tag:'focus'});
    n.onclick = () => { window.focus(); n.close(); };
  }catch(e){}
}

/* --- vòng đời phiên --- */
// solo = giờ nghỉ tự bấm ngoài chu kỳ (vừa họp xong, vừa huỷ phiên): vẫn vào nhật ký, nhưng không đụng
// cycle và không kéo theo phiên nào — hết giờ là thôi, kể cả khi bật tự chạy tiếp
function fStart(phase, tid, solo){
  const f = S.focus, c = f.cfg, now = Date.now();
  if(phase === 'work'){
    if(!fTask(tid)) return toast('Hàng đợi đang trống — thêm một task rồi bắt đầu');
    ui.fCheer = null;
  }
  f.run = {phase, tid:phase === 'work' ? tid : null, tree:f.tree, dur:c[phase] * 6e4, a:now, acc:0, since:now, pAt:null, paused:0, pause:0, cap:0, sw:0, solo:!!solo,
           buf:phase === 'work' ? c.buffer * 6e4 : 0, rang:false};
  fAudio();   // mở khoá âm thanh ngay trong cú bấm thì lúc hết giờ mới phát được
  save(); fStartTick(); fPaint();
}
function fLog(r, end, ms){
  const e = {id:uid(), k:r.phase, a:r.a, b:end, plan:r.dur / 6e4, ms, done:ms >= r.dur};
  if(r.phase === 'work'){
    const t = fTask(r.tid);
    Object.assign(e, {tid:r.tid, tree:r.tree, title:t ? t.title : '', rate:null, next:'',
      pause:r.pause, cap:r.cap, sw:r.sw, paused:r.paused + (r.pAt ? Date.now() - r.pAt : 0)});
  }
  S.focus.log.push(e);
  return e;
}
// hết giờ. quiet = phát hiện lúc mở app (đã hết giờ khi app đang tắt): không kêu, không tự chạy tiếp
function fFinish(quiet){
  const f = S.focus, c = f.cfg, r = f.run;
  // phần bù tính hết vào giờ làm, nhưng không quá mức cho phép — app tắt giữa chừng thì cắt đúng ở đó
  const ms = r.rang ? Math.min(fWorked(r), r.dur + r.buf) : r.dur;
  const e = fLog(r, r.since ? r.since + ms - r.acc : r.pAt, ms);
  f.run = null;
  if(r.phase === 'work'){
    f.cycle++;
    f.next = f.cycle % c.every ? 'short' : 'long';
    if(c.askRate || c.askNext){ f.rev = e.id; ui.fRev = {rate:0, next:''}; }
    fCheer();
  }else f.next = 'work';
  if(!quiet){ fChime(r.phase); fNotify(r.phase); }
  const q = fQueue();
  if(c.auto && !quiet && !r.solo && (r.phase === 'work' || q.length)) return fStart(f.next, q[0]);
  fStopTick(); save(); fPaint();
}
// vừa đủ giờ nhưng còn khoảng bù: báo một tiếng rồi để đồng hồ đếm tiếp. Phiên chỉ thật sự khép lại ở fFinish,
// nên cây, câu mừng, chấm điểm và giờ nghỉ đều chờ tới lúc bấm kết thúc hoặc hết phần bù.
function fOvertime(){
  const r = S.focus.run;
  r.rang = true;
  fChime('work'); fNotify('work', true);
  save(); fPaint();
}
function fPause(){
  const r = S.focus.run; if(!r || !r.since) return;
  r.acc += Date.now() - r.since; r.since = null; r.pAt = Date.now(); r.pause++;
  save(); fPaint();
}
function fResume(){
  const r = S.focus.run; if(!r || r.since) return;
  r.paused += Date.now() - r.pAt; r.since = Date.now(); r.pAt = null;
  fAudio(); save(); fPaint();
}
// bấm kết thúc trong phần bù: phiên đã đạt rồi, chỉ là thôi làm thêm
function fEnd(){
  const r = S.focus.run;
  if(r && r.rang) fFinish(false);
}
function fCancel(){
  const f = S.focus, r = f.run; if(!r) return;
  const ms = fWorked(r);
  if(!confirm(`Dừng hẳn phiên này? ${Math.floor(ms / 6e4)} phút vừa rồi vẫn được ghi lại, chỉ là chưa tính thành một phiên đạt, và cây đang trồng sẽ héo.`)) return;
  if(ms >= 6e4) fLog(r, Date.now(), ms);   // bấm nhầm rồi huỷ ngay thì không ghi
  f.run = null; fStopTick(); save(); fPaint();
}
// bỏ giờ nghỉ, kể cả khi chưa bắt đầu — vẫn ghi lại để biết mình hay bỏ nghỉ
function fSkip(){
  const f = S.focus, now = Date.now();
  if(f.run) fLog(f.run, now, fWorked(f.run));
  else fLog({phase:f.next, a:now, dur:f.cfg[f.next] * 6e4}, now, 0);
  f.run = null; f.next = 'work'; fStopTick(); save(); fPaint();
}
function fReview(keep){
  const f = S.focus, e = f.log.find(x => x.id === f.rev);
  if(e && keep){ e.rate = ui.fRev.rate || null; e.next = ui.fRev.next.trim(); }
  f.rev = null; ui.fRev = {rate:0, next:''};
  save(); fPaint();
}
// mừng lúc xong phiên; chạm mục tiêu ngày thì nói rõ
function fCheer(){
  const c = S.focus.cfg, n = fCount()[today()] || 0, e = fWorks().pop();
  const msg = [`🌳 Trồng xong cây ${fSpecies(e.tree).n} cấp ${fStage(fGrown(e) / 6e4)} · hôm nay ${n}/${c.goal}`];
  if(n === c.goal) msg.push(`🔥 Đạt mục tiêu hôm nay · chuỗi ${fRun().cur} ngày`);
  ui.fCheer = msg;
  ui.fPop = true;
  toast(ui.fCheer[ui.fCheer.length - 1]);
}

/* --- hàng đợi --- */
function fAdd(tid){
  const f = S.focus, t = fTask(tid); if(!t) return;
  if(t.status !== 'doing') return toast('Hàng đợi chỉ nhận task ở cột Đang làm — kéo task sang đó rồi thêm lại');
  const q = fQueue();
  if(q.includes(tid)) return toast('Task này đã có trong hàng đợi rồi');
  if(q.length >= f.cfg.qmax) return toast(`Hàng đợi đã đủ ${f.cfg.qmax} task — làm xong hoặc bỏ bớt một task rồi thêm tiếp`);
  q.push(tid); save(); fPaint();
  toast(`Đã thêm vào hàng đợi: ${t.title.trim() || '(chưa đặt tên)'}`);
}
// chọn task cho phiên: đưa lên đầu hàng. Đang giữa phiên thì là đổi task — một lần chuyển ngữ cảnh,
// trừ khi task cũ đã xong (làm xong sớm thì chuyển sang việc tiếp là đúng)
function fPick(tid){
  const f = S.focus, r = f.run; if(!fTask(tid)) return;
  if(r && r.phase === 'work' && r.tid !== tid){
    const old = fTask(r.tid);
    if(old && old.status !== 'done'){
      if(f.cfg.confirmSw && !confirm('Đổi sang task khác giữa phiên? Lần đổi này sẽ được ghi lại là một lần chuyển ngữ cảnh.')) return;
      r.sw++;
    }
    r.tid = tid;
  }
  f.queue = [tid, ...fQueue().filter(x => x !== tid)];
  save(); fPaint();
}
function fDone(tid){
  const t = fTask(tid); if(!t) return;
  t.status = 'done'; t.pg = 100; t.done = today();
  save(); render();
  toast(`✓ Xong task: ${t.title.trim() || '(chưa đặt tên)'}`);
}
// chợt nhớ việc khác giữa phiên: ghi vào Để sau rồi quay lại, không làm ngay
function fCapture(title){
  S.tasks.unshift({id:uid(), title, area:'work', prio:'med', status:'backlog', pg:0, tags:[],
    due:'', time:'', dur:60, remind:30, note:'', cr:today(), subs:[], done:null});
  const r = S.focus.run;
  if(r && r.phase === 'work') r.cap++;
  save();
  $('#ctK').textContent = S.tasks.filter(t => t.status === 'backlog').length;
  toast('Đã ghi vào Để sau — mình quay lại việc đang làm nhé');
}

/* --- khung đồng hồ: dùng chung cho sidebar (side), mục Tập trung (page) và toàn màn hình (full) --- */
function fPanel(mode){
  const f = S.focus, c = f.cfg, r = f.run, q = fQueue(), big = mode !== 'side', full = mode === 'full';
  const phase = r ? r.phase : f.next, n = fCount()[today()] || 0;
  const dots = Array.from({length:Math.min(12, Math.max(c.goal, n))}, (_, i) => i < n ? '●' : '○').join('');
  let h = `<div class="fzph"><span class="d"></span>${FPHASE[phase]}${r && r.rang ? ' · phần bù' : ''}
    <span class="fzdots" title="Hôm nay ${n}/${c.goal} phiên">${dots}</span>
    ${mode === 'full' ? '<button class="fzic" data-ffull="0" title="Thoát toàn màn hình (Esc)">✕</button>'
                      : '<button class="fzic" data-ffull="1" title="Toàn màn hình">⤢</button>'}</div>`;
  if(big && phase === 'work') h += fGrowHTML();
  if(ui.fCheer) h += `<div class="fzcheer${ui.fPop ? ' pop' : ''}"><span>${ui.fCheer.map(esc).join('<br>')}</span>
    <button class="fzic" data-fcheer title="Đóng">✕</button></div>`;
  if(f.rev) h += fRevHTML();

  if(!r){
    h += `<div class="fzclock">${fClock(c[phase] * 6e4)}</div>`;
    if(phase !== 'work') return h + `<div class="fzrest">${fRest(phase)}</div>
      <div class="fzbtns"><button class="btn" data-fstart>▶ Bắt đầu nghỉ</button><button class="btn ghost" data-fskip>Bỏ nghỉ</button></div>`;
    // nghỉ ngoài chu kỳ: vừa họp xong hay vừa huỷ phiên thì bấm nghỉ luôn, không phải chạy hết một phiên trước
    const solo = `<button class="fzsolo" data-fsolo title="Nghỉ ${c.short} phút, không tính vào chu kỳ">☕ Nghỉ ngắn ${c.short}′</button>`;
    const t = fTask(q[0]);
    if(!t) return h + `<div class="fzempty">${big ? 'Hàng đợi đang trống — thêm một task ở cột Đang làm vào đây để bắt đầu' : 'Kéo card ở cột Đang làm thả vào đây'}</div>
      <div class="fzbtns">${solo}</div>`;
    return h + (full ? '' : fTaskHTML(t, false)) + (big ? fPickHTML() : '')
      + `<div class="fzbtns"><button class="btn" data-fstart>▶ Bắt đầu</button>${solo}</div>`;
  }

  h += `<div class="fzclock" data-fclock>${fShow(r)}</div><div class="fzbar"><i data-fbar></i></div>`;
  if(r.phase !== 'work') return h + `<div class="fzrest">${fRest(r.phase)}</div>
    <div class="fzbtns"><button class="btn ghost" data-fskip>Bỏ nghỉ</button></div>`;
  if(!full) h += fTaskHTML(fTask(r.tid), true);
  // phần bù: phiên đã đạt rồi nên không còn nút huỷ, chỉ còn kết thúc
  if(r.rang) h += `<div class="fzover">Đã đủ ${r.dur / 6e4}′ — cây đã xong, phần làm thêm vẫn tính giờ tập trung.
    Tự ngừng sau ${r.buf / 6e4}′.</div>`;
  h += r.since
    ? r.rang
      ? `<div class="fzbtns"><button class="btn" data-fend>✓ Kết thúc phiên</button>
          <button class="btn ghost" data-fpause>⏸ Tạm dừng</button></div>`
      : `<div class="fzbtns"><button class="btn ghost" data-fpause>⏸ Tạm dừng</button>
          <button class="fzic" data-fcancel title="Huỷ phiên">■</button></div>`
    : `<div class="fzpaused" data-fpaused></div>
       <div class="fzbtns"><button class="btn" data-fresume>▶ Làm tiếp</button>
         ${r.rang ? '<button class="btn ghost" data-fend>Kết thúc phiên</button>' : '<button class="btn ghost" data-fcancel>Huỷ phiên</button>'}</div>`;
  return mode === 'page' ? h + fCapHTML(true) : h;
}
// tên task và câu "lần trước dừng ở"; task xong ngay giữa phiên thì mời chọn task tiếp trong hàng
function fTaskHTML(t, running){
  if(running && (!t || t.status === 'done')){
    const nextId = fQueue().find(id => !t || id !== t.id);
    return `<div class="fzempty">${t ? 'Task đã xong' : 'Chưa gắn task'} — chọn task tiếp trong hàng đợi
      ${nextId ? `<button class="btn ghost" data-fpick="${nextId}">Làm: ${fName(fTask(nextId))}</button>` : ''}</div>`;
  }
  const nx = fLastNext(t.id);
  return `<div class="fztask">${fName(t)}</div>${nx ? `<div class="fznext">Lần trước dừng ở: ${esc(nx)}</div>` : ''}`;
}
const fCapHTML = big => `<input class="fzin cap" data-fcap placeholder="${big ? '+ Chợt nhớ việc khác? Ghi vào Để sau rồi Enter' : '+ Ghi để sau (Enter)'}" autocomplete="off">`;
// toàn màn hình: task và ô ghi để sau nằm trong ngăn nhỏ bên trái, gập lại được — giữa màn hình chỉ còn đồng hồ
function fLeftHTML(){
  const r = S.focus.run, running = !!r && r.phase === 'work';
  const t = fTask(running ? r.tid : fQueue()[0]);
  if(!S.settings.fzLeft) return `<button class="fzltab" data-fleft title="Mở task và ô ghi để sau">▸ <span>${t ? fName(t) : 'Task'}</span></button>`;
  return `<div class="fzlhd">Task<button class="fzic" data-fleft title="Thu gọn">◂</button></div>
    ${t || running ? fTaskHTML(t, running) : '<div class="fznext">Hàng đợi trống</div>'}
    ${fCapHTML(false)}`;
}
function fRevHTML(){
  const f = S.focus, c = f.cfg, e = f.log.find(x => x.id === f.rev);
  if(!e) return '';
  return `<div class="fzrev"><div class="fzrevh">Xong phiên${e.title.trim() ? ` · ${esc(e.title)}` : ''}</div>
    ${c.askRate ? `<div class="fzrate"><span>Tập trung</span>${[1, 2, 3, 4, 5].map(i =>
      `<button class="${ui.fRev.rate === i ? 'on' : ''}" data-frate="${i}" title="${FRATE[i]}">${i}</button>`).join('')}</div>` : ''}
    ${c.askNext ? `<input class="fzin" data-fin="next" value="${esc(ui.fRev.next)}" placeholder="Lần sau bắt đầu từ…" autocomplete="off">` : ''}
    <div class="fzbtns"><button class="btn" data-frev="1">Lưu</button><button class="btn ghost" data-frev="0">Bỏ qua</button></div></div>`;
}

/* --- vẽ --- */
const fCls = () => { const r = S.focus.run; return `ph-${r ? r.phase : S.focus.next}${r && r.rang ? ' over' : ''}${r && !r.since ? ' paused' : ''}`; };
function fPaint(){
  fSide();
  if(ui.view === 'focus' && $('#fzMain')) fPaintPage();
  fFullPaint(); fPaintTime();
  ui.fPop = false;
}
function fSide(){
  const el = $('#fzSide'); if(!el) return;
  const f = S.focus, r = f.run, min = !!S.settings.fzMin;
  el.className = `fz side ${fCls()}${min ? ' mini' : ''}`;
  $('#fzMinBtn').textContent = min ? 'Mở' : 'Thu gọn';
  // thu gọn: chỉ còn một dòng mảnh, bấm vào để mở lại
  el.innerHTML = min
    ? `<button class="fzmini" data-fmin title="Mở khối tập trung"><span class="d"></span>${FPHASE[r ? r.phase : f.next]}
        ${f.rev ? '<em>· chấm điểm</em>' : ''}<b${r ? ' data-fclock' : ''}>${r ? fShow(r) : fClock(f.cfg[f.next] * 6e4)}</b></button>`
    : fPanel('side');
  $('#ctF').textContent = `${fCount()[today()] || 0}/${S.focus.cfg.goal}`;
}
function fFullPaint(){
  const el = $('#fzFull');
  el.hidden = !ui.fFull;
  if(!ui.fFull) return;
  const b = $('#fzFullBody');
  b.className = 'fz full ' + fCls();
  b.innerHTML = fPanel('full');
  const L = $('#fzFullLeft');
  L.className = 'fzleft' + (S.settings.fzLeft ? ' on' : '');
  L.innerHTML = fLeftHTML();
  fLook(el, S.focus.cfg.look[S.focus.run ? S.focus.run.phase : S.focus.next]);
}
function fFull(on){ ui.fFull = on; fFullPaint(); fPaintTime(); }
// 3 lớp nền: màu, ảnh (giữ phần trong suốt), lớp phủ tối / sáng để chữ luôn đọc được
async function fLook(el, lk){
  el.classList.toggle('lt', lk.dim < 0);
  el.querySelector('.fzbg').style.background = lk.c;
  const img = el.querySelector('.fzimg'), src = lk.img ? await imgSrc(lk.img) : '';
  img.style.backgroundImage = src ? `url("${src}")` : 'none';
  img.style.opacity = lk.op / 100;
  el.querySelector('.fzdim').style.background = lk.dim < 0 ? `rgba(255,255,255,${-lk.dim / 100})` : `rgba(0,0,0,${lk.dim / 100})`;
}

function renderFocus(){
  $('#view').innerHTML = `<div class="fzpage">
    <div class="fzcol"><div id="fzMain"></div><div class="fcard fzcard" id="fzQ"></div></div>
    <div class="fzcol"><div class="fcard fzcard" id="fzStats"></div><div class="fcard fzcard" id="fzChart"></div>
      <div class="fcard fzcard" id="fzJrn"></div><div class="fcard fzcard" id="fzCfg"></div></div></div>`;
  fPaintPage(); fPaintCfg();
}
function fPaintPage(){
  const f = S.focus, n = fCount()[today()] || 0;
  $('#vSub').textContent = `Hôm nay ${n}/${f.cfg.goal} phiên · chuỗi ${fRun().cur} ngày`;
  $('#fzMain').className = 'fz page ' + fCls();
  $('#fzMain').innerHTML = fPanel('page');
  $('#fzQ').innerHTML = fQueueHTML();
  $('#fzStats').innerHTML = fStatsHTML();
  $('#fzJrn').innerHTML = fJournalHTML();
  $('#fzChart').innerHTML = fChartHTML();
}
function fPaintCfg(){
  const el = $('#fzCfg'); if(!el) return;
  el.innerHTML = fCfgHTML();
  $$('[data-fprev]').forEach(p => fLook(p, S.focus.cfg.look[p.dataset.fprev]));
}
function fQueueHTML(){
  const f = S.focus, c = f.cfg, q = fQueue(), r = f.run;
  const cur = r && r.phase === 'work' ? r.tid : q[0];
  const pool = S.tasks.filter(t => t.status === 'doing' && !q.includes(t.id));
  const pill = t => `<span class="pill" style="background:${PRIOS[t.prio].c}22;color:${PRIOS[t.prio].c}">${PRIOS[t.prio].n}</span>`;
  return `<div class="fzh">Hàng đợi<span class="n">${q.length}/${c.qmax}</span></div>
    ${q.length ? `<div>${q.map(id => {
      const t = fTask(id), on = id === cur, nx = fLastNext(id);
      return `<div class="fzqi${on ? ' on' : ''}">
        <span class="sw" style="background:${AREAS[t.area].c}"></span>
        <div class="fzqt"><button class="fzqn" data-fopen="${id}" title="Mở task">${fName(t)}</button> ${pill(t)}
          ${nx ? `<div class="fznext">Lần trước dừng ở: ${esc(nx)}</div>` : ''}</div>
        ${on ? `<span class="meta">${r && r.phase === 'work' ? 'đang làm' : 'phiên tới'}</span>`
             : `<button class="btn ghost" data-fpick="${id}">Chọn</button>`}
        <button class="btn ghost" data-fdone="${id}" title="Đánh dấu task đã xong">✓ Xong</button>
        <button class="fzic" data-fdrop="${id}" title="Bỏ khỏi hàng đợi">✕</button></div>`;
    }).join('')}</div>`
      : '<div class="empty">Hàng đợi đang trống. Kéo card ở cột Đang làm thả vào khối Tập trung ở sidebar, hoặc chọn task ở dưới.</div>'}
    ${q.length < c.qmax
      // chia nhóm theo ưu tiên, cao lên đầu — chọn được việc quan trọng nhất trước
      ? pool.length ? `<select class="inp" id="fzPick"><option value="">+ Thêm task Đang làm vào hàng đợi…</option>
          ${PRIO_ORDER.map(p => { const g = pool.filter(t => t.prio === p); return g.length ? `<optgroup label="Ưu tiên ${PRIOS[p].n}">
            ${g.map(t => `<option value="${t.id}">${esc(t.title.trim() || '(chưa đặt tên)')}</option>`).join('')}</optgroup>` : ''; }).join('')}</select>`
        : '<div class="fzhint">Không còn task nào ở cột Đang làm để thêm. Kéo một task sang Đang làm trên bảng rồi quay lại đây.</div>'
      : `<div class="fzhint">Hàng đợi đã đủ ${c.qmax} task. Ít việc đang mở thì đầu cũng ít chỗ để nhảy sang.</div>`}`;
}
function fStatsHTML(){
  const c = S.focus.cfg, k = today(), m = fCount(), n = m[k] || 0, run = fRun();
  const list = fWorks().filter(e => iso(new Date(e.a)) === k);
  const add = key => list.reduce((s, e) => s + (e[key] || 0), 0);
  const rated = list.filter(e => e.rate);
  const bar = (v, goal) => `<div class="bk"><i style="width:${goal ? Math.min(100, v / goal * 100) : 0}%;background:${goal && v >= goal ? 'var(--ok)' : 'var(--acc)'}"></i></div>`;
  const days = Array.from({length:7}, (_, i) => dShift(k, i - 6));
  return `<div class="fzh">Tiến độ</div>
    <div class="fzbig">
      <div><b>${n}/${c.goal}</b><span>phiên hôm nay</span></div>
      <div><b>🔥 ${run.cur}</b><span>ngày liên tiếp</span></div>
      <div><b>🏆 ${run.best}</b><span>chuỗi dài nhất</span></div></div>
    ${bar(n, c.goal)}
    <div class="fzdays">${days.map(d => { const v = m[d] || 0; return `<div class="${v >= c.goal ? 'ok' : v ? 'part' : ''}${d === k ? ' td' : ''}"
      title="${DOW[dowOf(d)]} ${fmtVN(d)} · ${v} phiên"><b>${v || ''}</b><span>${DOW[dowOf(d)]}</span></div>`; }).join('')}</div>
    <div class="fzh">Hôm nay</div>
    <div class="fzsum">
      <div><b>${Math.round(add('ms') / 6e4)}</b><span>phút tập trung</span></div>
      <div><b>${new Set(list.map(e => e.tid)).size}</b><span>task đã làm</span></div>
      <div><b>${add('cap')}</b><span>lần ghi để sau</span></div>
      <div><b>${add('pause')}</b><span>lần tạm dừng</span></div>
      <div><b>${rated.length ? (rated.reduce((s, e) => s + e.rate, 0) / rated.length).toFixed(1) : '—'}</b><span>điểm tập trung</span></div></div>`;
}

/* --- nhật ký hôm nay: mọi phiên và giờ nghỉ xếp theo dòng thời gian, nối thành một mạch như git log --graph.
   Xen giữa là khoảng trống trên FGAP phút — lúc rời bàn ngoài giờ nghỉ chính thức, thứ không có trong log. --- */
const FGAP = 10 * 6e4;
function fDayLog(){
  const k = today(), out = [];
  const list = S.focus.log.filter(e => iso(new Date(e.a)) === k).sort((x, y) => x.a - y.a);
  list.forEach((e, i) => {
    const prev = list[i - 1];
    if(prev && e.a - prev.b >= FGAP) out.push({gap:e.a - prev.b, a:prev.b});
    out.push(e);
  });
  // phiên đang chạy chưa vào log: nối tiếp vào cuối cho mạch liền tới hiện tại
  const r = S.focus.run;
  if(r && iso(new Date(r.a)) === k){
    const last = list[list.length - 1];
    if(last && r.a - last.b >= FGAP) out.push({gap:r.a - last.b, a:last.b});
    out.push({k:r.phase, a:r.a, b:Date.now(), ms:fWorked(r), plan:r.dur / 6e4, live:true,
      title:r.phase === 'work' && fTask(r.tid) ? fTask(r.tid).title : '', pause:r.pause, cap:r.cap, sw:r.sw});
  }
  return out;
}
// một dòng: cột giờ, đường nối, rồi phần thân. Phiên work có thêm dòng con cho điểm và ghi chú cuối phiên.
function fJournalHTML(){
  const rows = fDayLog();
  if(!rows.length) return `<div class="fzh">Nhật ký hôm nay</div>
    <div class="fzhint">Hôm nay chưa có phiên nào. Xong một phiên là có một dòng ở đây.</div>`;
  const mins = ms => Math.round(ms / 6e4);
  const html = rows.map((e, i) => {
    const work = e.k === 'work', cut = !e.live && !e.done;
    // đường nối chỉ hở ở đầu dòng đầu và cuối dòng cuối — ghi chú treo dưới thì dòng cuối là ghi chú đó
    const tail = i === rows.length - 1 && !(work && !e.live && (e.rate || e.next));
    const rail = `<span class="rail${i === 0 ? ' first' : ''}${tail ? ' last' : ''}"></span>`;
    const railNote = `<span class="rail${i === rows.length - 1 ? ' last' : ''}"></span>`;
    if(e.gap) return `<div class="fzjr gap"><span class="tm">${fHM(e.a)}</span>${rail}<span class="dot"></span>
      <div class="bd"><span class="nm">Rời bàn ${fHours(e.gap)}</span></div></div>`;
    const meta = [];
    if(work){
      if(e.ms > e.plan * 6e4) meta.push(`bù thêm ${mins(e.ms - e.plan * 6e4)}′`);
      if(e.pause) meta.push(`${e.pause} lần dừng`);
      if(e.sw) meta.push(`${e.sw} lần đổi task`);
      if(e.cap) meta.push(`${e.cap} lần ghi để sau`);
    }
    // ghi chú cuối phiên treo dưới dòng, vẫn dính vào đường nối
    const note = work && !e.live && (e.rate || e.next) ? `<div class="fzjr note"><span></span>${railNote}
      <div class="bd">${e.rate ? `<span class="rate" title="${FRATE[e.rate]}">${'★'.repeat(e.rate)}${'☆'.repeat(5 - e.rate)}</span>` : ''}
        ${e.next ? `<span class="nx">Lần sau bắt đầu từ: ${esc(e.next)}</span>` : ''}</div></div>` : '';
    return `<div class="fzjr ${work ? 'work' : 'rest'}${cut ? ' cut' : ''}${e.live ? ' live' : ''}">
      <span class="tm">${fHM(e.a)}</span>${rail}<span class="dot"></span>
      <div class="bd">
        <span class="nm">${FPHASE[e.k]}${work && e.title.trim() ? ` · ${esc(e.title)}` : ''}</span>
        <span class="du">${e.live ? `đang chạy · ${mins(e.ms)}′` : cut ? `bỏ dở · ${mins(e.ms)}′/${e.plan}′` : `${mins(e.ms)}′`}</span>
        ${meta.length ? `<span class="mt">${meta.join(' · ')}</span>` : ''}
      </div></div>${note}`;
  }).join('');
  const work = rows.filter(e => e.k === 'work'), rest = rows.filter(e => e.k === 'short' || e.k === 'long');
  const sum = l => l.reduce((s, e) => s + (e.ms || 0), 0);
  const left = fToSend().length;
  return `<div class="fzh">Nhật ký hôm nay<span class="n">${fHours(sum(work))} làm · ${fHours(sum(rest))} nghỉ</span>
      ${left ? `<button class="lblbtn" data-fsend title="Viết ${left} phiên chưa đưa sang vào trang Tập trung của mục Nhật ký">→ Đưa vào Nhật ký</button>`
             : '<span class="lblbtn off" title="Mọi phiên hôm nay đã có trong mục Nhật ký">✓ đã đưa vào Nhật ký</span>'}</div>
    <div class="fzjrs">${html}</div>`;
}

/* --- đưa sang mục Nhật ký: gom phiên hôm nay thành một bài viết, nối vào cuối trang "Tập trung" của ngày đó.
   Phiên đã đưa sang được đánh dấu sent nên bấm lại chỉ thêm phần mới, không chép lại từ đầu. --- */
const FJPAGE = 'Tập trung';
// chỉ phiên work đã xong hẳn mới đáng viết: đang chạy thì chưa có gì để kể
const fToSend = () => S.focus.log.filter(e => e.k === 'work' && iso(new Date(e.a)) === today() && !e.sent);
function fSend(){
  const list = fToSend();
  if(!list.length) return toast('Mọi phiên hôm nay đã có trong mục Nhật ký');
  const k = today(), pages = jPages(k);
  let page = pages.find(p => p.name === FJPAGE);
  if(!page){ page = {id:uid(), name:FJPAGE, html:''}; pages.push(page); }
  page.html = (hasText(page.html) ? page.html : '') + fSendHTML(list, hasText(page.html));
  list.forEach(e => e.sent = true);
  save();
  ui.view = 'journal'; ui.jDate = k; ui.jTab = pages.indexOf(page);
  render();
  toast(`Đã đưa ${list.length} phiên sang mục Nhật ký`);
}
// bài viết: một dòng tổng ở đầu, rồi mỗi phiên một đoạn. Dùng thẻ thường để sửa lại được bằng tay trong editor.
function fSendHTML(list, cont){
  const done = list.filter(e => e.done), cut = list.filter(e => !e.done);
  const rated = list.filter(e => e.rate);
  const tot = list.reduce((s, e) => s + e.ms, 0);
  const stamp = new Date().toTimeString().slice(0, 5);
  const sum = [`<strong>${done.length} phiên đạt</strong>`, fHours(tot)];
  if(cut.length) sum.push(`${cut.length} phiên bỏ dở`);
  if(rated.length) sum.push(`tập trung ${(rated.reduce((s, e) => s + e.rate, 0) / rated.length).toFixed(1)}/5`);
  // gộp các phiên cùng một task lại: đọc theo việc dễ nhớ hơn đọc theo lượt ngồi
  const byTask = [];
  list.forEach(e => {
    const key = e.tid || e.title, g = byTask.find(x => x.key === key);
    (g || byTask[byTask.push({key, title:e.title, es:[]}) - 1]).es.push(e);
  });
  const body = byTask.map(g => {
    const ms = g.es.reduce((s, e) => s + e.ms, 0);
    const span = `${fHM(g.es[0].a)}–${fHM(g.es[g.es.length - 1].b)}`;
    const nd = g.es.filter(e => e.done).length, cut = g.es.length - nd;
    const head = `<p><strong>${esc(g.title.trim() || '(chưa đặt tên)')}</strong> — ${nd} phiên đạt${cut ? ` · ${cut} bỏ dở` : ''} · ${fHours(ms)} · ${span}</p>`;
    // ghi chú cuối phiên là thứ đáng giữ nhất, nên cho ra một danh sách riêng
    const notes = g.es.filter(e => e.next || e.rate).map(e =>
      `<li>${fHM(e.a)}${e.rate ? ` · ${'★'.repeat(e.rate)}${'☆'.repeat(5 - e.rate)}` : ''}${e.next ? ` — ${esc(e.next)}` : ''}</li>`).join('');
    return head + (notes ? `<ul>${notes}</ul>` : '');
  }).join('');
  return `${cont ? '<hr>' : ''}<h2>Tập trung hôm nay${cont ? ` · thêm lúc ${stamp}` : ''}</h2>
    <p>${sum.join(' · ')}</p>${body}`;
}

// biểu đồ giờ tập trung theo ngày / tuần / tháng / năm. Tính mọi phiên, kể cả bỏ dở, vì thời gian đó vẫn là đã ngồi làm.
// S.settings.fcM = kiểu khoảng đang xem (nhớ qua F5), ui.fcOff = lùi / tiến bao nhiêu khoảng so với hiện tại
const FCM = {day:'Ngày', week:'Tuần', month:'Tháng', year:'Năm'};
const fHours = ms => { const m = Math.round(ms / 6e4); return m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ''}`; };
function fChartHTML(){
  const mode = FCM[S.settings.fcM] ? S.settings.fcM : 'week', off = ui.fcOff || 0, k0 = today();
  let cols, title;   // cols: [{a, b, h, lbl, tip}] — khoảng ngày [a, b] của mỗi cột; xem theo ngày thì mỗi cột là một giờ h
  if(mode === 'day'){
    const d = dShift(k0, off), hr = new Date().getHours(), hh = h => String(h).padStart(2, '0') + ':00';
    cols = Array.from({length:24}, (_, h) => ({a:d, b:d, h, lbl:h % 3 ? '' : h, tip:`${hh(h)}–${hh(h + 1)}`, now:d === k0 && h === hr}));
    title = off === 0 ? 'Hôm nay' : off === -1 ? 'Hôm qua' : `${DOW[dowOf(d)]} ${fmtVN(d)}`;
  }else if(mode === 'week'){
    const mon = dShift(fMon(k0), off * 7);
    cols = Array.from({length:7}, (_, i) => { const d = dShift(mon, i);
      return {a:d, b:d, lbl:`${DOW[dowOf(d)]}<br>${d.slice(8)}/${d.slice(5, 7)}`, tip:`${DOW[dowOf(d)]} ${fmtVN(d)}`, now:d === k0}; });
    title = off ? `${fmtVN(mon).slice(0, 5)} – ${fmtVN(dShift(mon, 6))}` : 'Tuần này';
  }else if(mode === 'month'){
    const x = new Date(k0.slice(0, 7) + '-01T00:00:00'); x.setMonth(x.getMonth() + off);
    const first = iso(x), n = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    cols = Array.from({length:n}, (_, i) => { const d = dShift(first, i);
      return {a:d, b:d, lbl:+d.slice(8) % 5 && i ? '' : +d.slice(8), tip:`${DOW[dowOf(d)]} ${fmtVN(d)}`, now:d === k0}; });
    title = `Tháng ${x.getMonth() + 1}/${x.getFullYear()}`;
  }else{
    const y = +k0.slice(0, 4) + off;
    cols = Array.from({length:12}, (_, i) => { const m = `${y}-${String(i + 1).padStart(2, '0')}`;
      return {a:m + '-01', b:m + '-31', lbl:`T${i + 1}`, tip:`Tháng ${i + 1}/${y}`, now:m === k0.slice(0, 7)}; });
    title = `Năm ${y}`;
  }
  const works = fWorks();
  // phiên tính vào giờ bắt đầu
  cols.forEach(c => { const l = works.filter(e => { const t = new Date(e.a), k = iso(t); return k >= c.a && k <= c.b && (c.h == null || t.getHours() === c.h); });
    c.ms = l.reduce((s, e) => s + (e.ms || 0), 0); c.n = l.filter(e => e.done).length; });
  const total = cols.reduce((s, c) => s + c.ms, 0);
  // cây của khoảng đang xem: phiên đủ giờ, và phiên huỷ đã làm được từ 1 phút (huỷ ngay thì không ghi)
  const a0 = cols[0].a, b0 = cols[cols.length - 1].b;
  const grown = works.filter(e => { const k = iso(new Date(e.a)); return k >= a0 && k <= b0 && (e.done || e.ms >= 6e4); });
  const dead = grown.filter(e => !e.done).length;
  // trục dọc chia 4 nấc tròn số: theo phút khi xem một ngày, theo giờ khi xem khoảng dài hơn
  const unit = mode === 'day' ? 6e4 : 36e5, max = Math.max(...cols.map(c => c.ms)) / unit;
  const step = (mode === 'day' ? [5, 10, 15] : [.25, .5, 1, 2, 5, 10, 20, 50, 100]).find(v => v * 4 >= max) || Math.ceil(max / 4), top = step * 4;
  return `<div class="fzh">Khu vườn<span class="n">🌳 ${grown.length - dead} cây${dead ? ` · 🥀 ${dead} héo` : ''}</span>
      <div class="scope fcscope">${Object.entries(FCM).map(([k, n]) => `<button class="${mode === k ? 'on' : ''}" data-fcm="${k}">${n}</button>`).join('')}</div></div>
    <div class="fcnav"><button class="nvb" data-fcoff="-1">‹</button><span>${title}</span><button class="nvb" data-fcoff="1">›</button></div>
    ${fGardenHTML(grown, mode + a0)}
    ${grown.length ? '' : '<div class="fzhint fcempty">Chưa trồng cây nào trong khoảng này. Xong một phiên tập trung là có một cây.</div>'}
    <div class="fzh">Giờ tập trung<span class="n">${fHours(total)}</span></div>
    <div class="fchart">
      <div class="fcy">${[4, 3, 2, 1, 0].map(i => `<span>${+(step * i).toFixed(2)}${mode === 'day' && i ? 'p' : ''}</span>`).join('')}</div>
      <div class="fcplot">${[4, 3, 2, 1, 0].map(i => `<i style="bottom:${i * 25}%"></i>`).join('')}
        ${cols.map(c => `<div class="fccol${c.now ? ' td' : ''}">
          <b style="height:${c.ms / unit / top * 100}%" data-tip="${c.tip} · ${c.ms ? `${fHours(c.ms)} · ${c.n} phiên` : 'chưa tập trung'}"></b></div>`).join('')}</div>
      <div></div>
      <div class="fcx">${cols.map(c => `<span${c.now ? ' class="td"' : ''}>${c.lbl}</span>`).join('')}</div></div>`;
}
function fLookHTML(p){
  const c = S.focus.cfg, lk = c.look[p];
  return `<div class="fzlook">
    <div class="fzprev" data-fprev="${p}"><div class="fzbg"></div><div class="fzimg"></div><div class="fzdim"></div>
      <div class="fzpt">${FPHASE[p]}<b>${fClock(c[p] * 6e4)}</b></div></div>
    <div class="fzlc">
      <div class="fzrow"><span>Màu nền</span><button class="hsw" data-fpal="${p}" style="background:${lk.c}" title="Đổi màu"></button></div>
      <div class="fzrow"><span>Ảnh nền</span><button class="btn ghost" data-fimg="${p}">${lk.img ? 'Đổi ảnh' : 'Tải ảnh lên'}</button>
        ${lk.img ? `<button class="danger" data-fimgx="${p}">Bỏ ảnh</button>` : ''}</div>
      <label class="fzrow"><span>Độ rõ ảnh</span><input type="range" min="0" max="100" data-flook="${p}|op" value="${lk.op}"></label>
      <label class="fzrow"><span>Lớp phủ</span><input type="range" min="-80" max="80" data-flook="${p}|dim" value="${lk.dim}"><em>sáng · tối</em></label>
    </div></div>`;
}
function fCfgHTML(){
  const c = S.focus.cfg;
  if(!ui.fCfg) return `<button class="fzcfgbtn" data-fcfgbtn>⚙ Cài đặt<span>Thời lượng, hàng đợi, mục tiêu, giao diện, âm thanh</span></button>`;
  const num = (k, l, min, max, u) => `<label class="fzrow"><span>${l}</span><input class="inp" type="number" data-fcfg="${k}" min="${min}" max="${max}" value="${c[k]}">${u ? `<em>${u}</em>` : ''}</label>`;
  const chk = (k, l) => `<label class="fzrow chk"><input type="checkbox" data-fcfg="${k}"${c[k] ? ' checked' : ''}><span>${l}</span></label>`;
  const grp = (id, t, body, hint) => `<div class="fzgrp"><div class="fzgh">${t}<button class="lblbtn" data-freset="${id}">Khôi phục mặc định</button></div>
    ${body}${hint ? `<div class="fzhint">${hint}</div>` : ''}</div>`;
  const perm = 'Notification' in window ? Notification.permission : 'denied';
  return `<div class="fzh">Cài đặt<button class="lblbtn" data-fcfgbtn>Thu gọn</button></div>
    ${grp('time', 'Thời lượng', num('work', 'Phiên tập trung', 1, 180, 'phút') + num('short', 'Nghỉ ngắn', 1, 60, 'phút')
      + num('long', 'Nghỉ dài', 1, 90, 'phút') + num('every', 'Nghỉ dài sau mỗi', 1, 12, 'phiên')
      + num('buffer', 'Cho làm bù sau khi hết giờ', 0, 60, 'phút') + chk('auto', 'Tự chạy phiên hoặc giờ nghỉ tiếp theo'),
      'Đổi khi đồng hồ đang chạy thì chỉ áp dụng từ phiên sau — đã bấm bắt đầu là giữ đúng lịch.<br>'
      + 'Làm bù để 0 thì hết giờ là phiên khép lại ngay. Đặt số phút thì hết giờ chỉ kêu chuông, bạn làm nốt rồi bấm '
      + 'kết thúc, hết ngần ấy phút thì đồng hồ tự ngừng. Phần bù vẫn tính là giờ tập trung, nhưng cây đã chốt ở mức đủ giờ.')}
    ${grp('queue', 'Hàng đợi', num('qmax', 'Số task tối đa', 1, 10, 'task') + chk('confirmSw', 'Đổi task giữa phiên phải xác nhận'),
      'Chỉ task ở cột Đang làm mới vào được hàng đợi.')}
    ${grp('pause', 'Tạm dừng', num('pauseAsk', 'Tạm dừng quá bao lâu thì hỏi huỷ phiên', 1, 60, 'phút'))}
    ${grp('streak', 'Mục tiêu & chuỗi', num('goal', 'Số phiên đạt mỗi ngày', 1, 20, 'phiên') + num('miss', 'Số ngày thường được lỡ', 0, 5, 'ngày')
      + chk('weekend', 'Cuối tuần có làm đủ thì cộng vào chuỗi'),
      'Cuối tuần không làm thì chuỗi không gãy. Phiên huỷ giữa chừng vẫn được ghi lại nhưng không tính là phiên đạt.')}
    ${grp('ask', 'Sau phiên', chk('askRate', 'Chấm độ tập trung cuối phiên')
      + chk('askNext', 'Ghi "lần sau bắt đầu từ…"'))}
    ${grp('look', 'Giao diện toàn màn hình', Object.keys(FPHASE).map(fLookHTML).join(''))}
    ${grp('sound', 'Âm thanh & thông báo', chk('sound', 'Âm báo hết phiên')
      + `<label class="fzrow"><span>Âm lượng</span><input type="range" min="0" max="100" data-fcfg="vol" value="${c.vol}"><button class="btn ghost" data-ftest>Nghe thử</button></label>`
      + chk('notify', 'Thông báo hệ thống')
      + (perm === 'default' ? '<button class="bperm" data-fperm>Cho phép thông báo hệ thống — để được báo cả khi đang ở cửa sổ khác</button>'
        : perm === 'denied' ? '<div class="fzhint">Trình duyệt đang tắt thông báo của trang này.</div>' : '')
      + chk('tabTitle', 'Hiện đồng hồ trên tiêu đề tab'))}`;
}
function fSetCfg(el){
  const c = S.focus.cfg, k = el.dataset.fcfg;
  if(el.type === 'checkbox') c[k] = el.checked;
  else if(el.type === 'number' || el.type === 'range'){
    const v = Math.round(+el.value);
    c[k] = el.value === '' || isNaN(v) ? FCFG[k] : Math.min(+el.max, Math.max(+el.min, v));
    el.value = c[k];
  }else c[k] = el.value.trim();
  save(); fPaint();
  $$('[data-fprev] .fzpt b').forEach(b => b.textContent = fClock(c[b.closest('[data-fprev]').dataset.fprev] * 6e4));
}
function fPickImg(p){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => {
    const file = inp.files[0]; if(!file) return;
    try{ const id = 'i' + uid(); await imgPut(id, await shrink(file)); S.focus.cfg.look[p].img = id; }
    catch(e){ return toast('Chưa đọc được ảnh này'); }
    save(); fPaintCfg(); fFullPaint();
  };
  inp.click();
}

/* --- sự kiện --- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fstart],[data-fsolo],[data-fsend],[data-fskip],[data-fpause],[data-fresume],[data-fcancel],[data-fend],[data-ffull],[data-fcheer],[data-frate],'
    + '[data-frev],[data-fpick],[data-fdone],[data-fdrop],[data-fopen],[data-fcm],[data-fcoff],[data-fsp],[data-fcfgbtn],[data-freset],[data-fpal],[data-fimg],[data-fimgx],[data-ftest],[data-fperm],[data-fleft],[data-fmin]');
  if(!b) return;
  const d = b.dataset, f = S.focus;
  if('fstart' in d) return f.next === 'work' ? fStart('work', fQueue()[0]) : fStart(f.next);
  if('fsolo' in d) return fStart('short', null, true);
  if('fsend' in d) return fSend();
  if('fskip' in d) return fSkip();
  if('fpause' in d) return fPause();
  if('fleft' in d){ S.settings.fzLeft = !S.settings.fzLeft; save(); return fFullPaint(); }
  if('fmin' in d){ S.settings.fzMin = !S.settings.fzMin; save(); fSide(); return fPaintTime(); }
  if('fresume' in d) return fResume();
  if('fcancel' in d) return fCancel();
  if('fend' in d) return fEnd();
  if('ffull' in d) return fFull(d.ffull === '1');
  if('fcheer' in d){ ui.fCheer = null; return fPaint(); }
  if('frate' in d){ ui.fRev.rate = ui.fRev.rate === +d.frate ? 0 : +d.frate; return fPaint(); }
  if('frev' in d) return fReview(d.frev === '1');
  if('fpick' in d) return fPick(d.fpick);
  if('fdone' in d) return fDone(d.fdone);
  if('fdrop' in d){ f.queue = f.queue.filter(x => x !== d.fdrop); save(); return fPaint(); }
  if('fopen' in d) return openTask(d.fopen);
  if('fsp' in d){ f.tree = d.fsp; save(); return fPaint(); }
  if('fcm' in d){ S.settings.fcM = d.fcm; ui.fcOff = 0; save(); return fPaintPage(); }
  if('fcoff' in d){ ui.fcOff = (ui.fcOff || 0) + +d.fcoff; return fPaintPage(); }
  if('fcfgbtn' in d){ ui.fCfg = !ui.fCfg; return fPaintCfg(); }
  if('freset' in d){
    FGROUPS[d.freset].forEach(k => f.cfg[k] = structuredClone(FCFG[k]));
    save(); fPaintCfg(); return fPaint();
  }
  if('fpal' in d){
    const lk = f.cfg.look[d.fpal];
    return openPal(b, lk.c, c => { lk.c = c; save(); fPaintCfg(); fFullPaint(); });
  }
  if('fimg' in d) return fPickImg(d.fimg);
  if('fimgx' in d){ f.cfg.look[d.fimgx].img = null; save(); fPaintCfg(); return fFullPaint(); }
  if('ftest' in d) return fChime('work', true);
  if('fperm' in d) (async () => { try{ await Notification.requestPermission(); }catch(e){} fPaintCfg(); })();
});
document.addEventListener('input', e => {
  const el = e.target, fin = el.dataset && el.dataset.fin;
  if(fin === 'next') ui.fRev.next = el.value;
  else if(el.dataset && el.dataset.flook){
    const [p, k] = el.dataset.flook.split('|'), lk = S.focus.cfg.look[p];
    lk[k] = +el.value;
    $$(`[data-fprev="${p}"]`).forEach(x => fLook(x, lk));
  }
});
document.addEventListener('change', e => {
  const el = e.target;
  if(!el.dataset) return;
  if(el.dataset.flook){ save(); fFullPaint(); }
  else if(el.dataset.fcfg) fSetCfg(el);
  else if(el.id === 'fzPick' && el.value) fAdd(el.value);
});
document.addEventListener('keydown', e => {
  const el = e.target;
  if(e.key !== 'Enter' || !el.dataset || e.isComposing) return;
  if('fcap' in el.dataset && el.value.trim()){ fCapture(el.value.trim()); el.value = ''; }
  else if(el.dataset.fin === 'next') fReview(true);
});
// sau F5 trình duyệt chặn âm thanh tới khi có cú bấm đầu tiên — bấm đâu cũng mở khoá lại
document.addEventListener('pointerdown', () => { if(S.focus.run) fAudio(); });
// mở app: phiên đã hết giờ lúc app tắt thì ghi nhận luôn; phiên còn chạy thì chạy tiếp
function fBoot(){
  const r = S.focus.run;
  if(r && r.since && fLeft(r) <= 0 && !fBuf(r)) fFinish(true);
  if(S.focus.run) fStartTick();
  fPaint();
}
