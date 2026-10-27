/* Nguồn để build bundle trình soạn thảo (TipTap/ProseMirror).
   Build:  node build/build.js   -> nhúng thẳng vào index.html
   App chỉ gọi qua window.TT, không đụng trực tiếp vào ProseMirror. */
import { Editor, Node, Extension } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Link } from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder, TrailingNode } from '@tiptap/extensions';
import { Slice, Fragment } from '@tiptap/pm/model';

/* ảnh: nội dung chỉ lưu mã ảnh (data-img) và bề rộng đã kéo (data-w), còn file ảnh do app cất ở chỗ khác.
   Lúc hiển thị hỏi app qua options.src(mã) -> URL.
   Chưa kéo cỡ thì để CSS chặn bớt chiều cao cho ảnh khỏi chiếm hết trang; kéo góc phải dưới thì nhớ cỡ. */
const IMG_MIN_W = 80;
const Img = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions(){ return {src: () => Promise.resolve('')}; },
  addAttributes(){
    return {
      id: {default: null, parseHTML: el => el.getAttribute('data-img'), renderHTML: a => ({'data-img': a.id})},
      w:  {default: null, parseHTML: el => +el.getAttribute('data-w') || null,
           renderHTML: a => a.w ? {'data-w': a.w} : {}},
    };
  },
  parseHTML(){ return [{tag: 'img[data-img]'}]; },
  renderHTML({HTMLAttributes}){ return ['img', HTMLAttributes]; },
  addNodeView(){
    return ({node, getPos, editor}) => {
      const dom = document.createElement('div');
      dom.className = 'eimgw';
      const img = document.createElement('img');
      img.className = 'eimg'; img.alt = 'Không tìm thấy ảnh';
      this.options.src(node.attrs.id).then(u => { if(u) img.src = u; else img.classList.add('miss'); });
      const grip = document.createElement('div');
      grip.className = 'eimgr'; grip.title = 'Kéo để đổi cỡ ảnh, bấm đúp để trả về cỡ mặc định';
      dom.append(img, grip);

      const show = w => { dom.classList.toggle('sized', !!w); dom.style.width = w ? w + 'px' : ''; };
      const save = w => {
        const pos = typeof getPos === 'function' ? getPos() : null;
        if(typeof pos !== 'number') return;
        editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, null, {...node.attrs, w}));
      };
      show(node.attrs.w);

      let drag = null;
      grip.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        grip.setPointerCapture(e.pointerId);
        drag = {x: e.clientX, w: dom.getBoundingClientRect().width};
      });
      grip.addEventListener('pointermove', e => {
        if(!drag) return;
        const max = editor.view.dom.clientWidth;
        show(Math.round(Math.max(IMG_MIN_W, Math.min(max, drag.w + e.clientX - drag.x))));
      });
      const drop = () => { if(drag){ drag = null; save(Math.round(dom.getBoundingClientRect().width)); } };
      grip.addEventListener('pointerup', drop);
      grip.addEventListener('pointercancel', drop);
      grip.addEventListener('dblclick', e => { e.preventDefault(); e.stopPropagation(); save(null); });
      grip.addEventListener('dragstart', e => { e.preventDefault(); e.stopPropagation(); });  // kéo nút cỡ, không phải kéo ảnh đi

      return {
        dom,
        ignoreMutation: () => true,
        stopEvent: e => !!(e.target && e.target.closest && e.target.closest('.eimgr')),
        update(n){
          if(n.type !== node.type || n.attrs.id !== node.attrs.id) return false;
          node = n; show(n.attrs.w); return true;
        },
      };
    };
  },
});

/* file đính kèm: như ảnh, nội dung chỉ lưu mã + tên + cỡ; file thật do app cất.
   Hiện thành thẻ có nút tải về, bấm thì hỏi app qua options.src(mã) -> URL.
   Nút Xem chỉ có khi app bảo xem được (options.canView(tên)); bấm (hoặc bấm đúp vào thẻ) thì app mở qua options.view(attrs). */
const kb = n => n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB';
const FileBlock = Node.create({
  name: 'file',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions(){ return {src: () => Promise.resolve(''), canView: () => false, view: () => Promise.resolve(false)}; },
  addAttributes(){
    const a = (k, num) => ({default: null,
      parseHTML: el => num ? +el.getAttribute('data-' + k) || 0 : el.getAttribute('data-' + k),
      renderHTML: v => ({['data-' + k]: v[k]})});
    return {file: a('file'), name: a('name'), size: a('size', true)};
  },
  parseHTML(){ return [{tag: 'div[data-file]'}]; },
  renderHTML({node, HTMLAttributes}){ return ['div', HTMLAttributes, node.attrs.name || 'file']; },   // tên nằm trong chữ -> tìm kiếm được
  addNodeView(){
    return ({node}) => {
      const dom = document.createElement('div');
      dom.className = 'efile';
      dom.innerHTML = '<span class="fi">📎</span><span class="fn"></span><span class="fs"></span>'
        + (this.options.canView(node.attrs.name || '') ? '<button type="button" class="fd fv">Xem</button>' : '')
        + '<button type="button" class="fd">Tải về</button>';
      dom.querySelector('.fn').textContent = node.attrs.name || 'file';
      dom.querySelector('.fs').textContent = node.attrs.size ? kb(node.attrs.size) : '';
      const btn = dom.querySelector('.fd:not(.fv)');
      const miss = () => { dom.classList.add('miss'); btn.textContent = 'Không tìm thấy file'; };
      const vb = dom.querySelector('.fv');
      if(vb) vb.onclick = async () => { if(!await this.options.view(node.attrs)){ vb.remove(); miss(); } };
      dom.ondblclick = e => {                                  // bấm đúp thẻ = bấm Xem (nếu xem được)
        if(e.target.closest('.fd') || !dom.querySelector('.fv')) return;
        e.preventDefault(); vb.onclick();
      };
      btn.onclick = async () => {
        const u = await this.options.src(node.attrs.file);
        if(!u) return miss();
        const a = document.createElement('a');           // <a> tạm ngoài editor, để Link không bắt lấy
        a.href = u; a.download = node.attrs.name || 'file'; a.click();
      };
      return {dom, stopEvent: e => e.target.closest && !!e.target.closest('.fd')};
    };
  },
});

/* bảng việc nhỏ ngay trong trang: mỗi cột một trạng thái, thêm các ô lồng: Backlog ở cuối cột Cần làm, Không cần làm
   ở cuối cột Xong (options.nest), Quan trọng ở đầu cột Đang làm và Quan trọng đã xong ở đầu cột Xong (options.nestTop).
   Các ô này chỉ có trên bảng trong trang, task thật không có trạng thái tương ứng (Quan trọng tính như Đang làm,
   Quan trọng đã xong tính như Xong). Thẻ Quan trọng kéo sang Xong thì tự vào ô Quan trọng đã xong.
   Thẻ lưu trong data-kanban (JSON) dạng [{id, t: tiêu đề, s: mã cột, d?: mô tả, dh?: đang ẩn mô tả,
   sub?: [{id, t, d?, x?: đã xong}], sh?: đang ẩn danh sách việc con, tk?: id task đã nối ở bảng việc / bảng cuộc sống,
   ds?: ngày bắt đầu, dd?: ngày xong (xem kbStamp), dl?: hạn chót (YYYY-MM-DD, cho việc chưa xong)}];
   Thẻ đã nối (nút ↗): tiêu đề, cột và việc con là của task thật. Bảng hiện lên thì lấy bản mới nhất từ task,
   sửa trên thẻ thì đẩy sang task; chép bảng sang ngày khác vẫn trỏ về cùng task nên không sinh task trùng.
   Mô tả chỉ chép sang task lúc nối, về sau mỗi bên một bản (mô tả của task là văn bản có định dạng).
   chữ của các thẻ còn nằm trong nội dung để ô tìm kiếm thấy. Tên, màu cột và chữ trên nút do app đưa vào qua options.
   Thẻ gập chỉ hiện tiêu đề (có mô tả thì thêm ≡, có việc con thì thêm số đã xong / tổng) cho bảng đỡ rối; bấm vào thẻ
   thì mở ra sửa tiêu đề, viết mô tả, thêm việc con; bấm ra ngoài / Esc thì lưu rồi gập lại.
   Kéo thả: thả ở mép trên / dưới một thẻ là đổi chỗ, thả vào giữa thẻ là thành việc con của nó (việc con chỉ một tầng:
   thẻ đã có việc con thì các việc con ấy đi theo, xếp ngay sau nó). Kéo việc con ra cột thì nó lại thành thẻ riêng,
   kéo lên / xuống trong danh sách việc con của thẻ đang mở thì đổi thứ tự. */
let kbDrag = null;                           // đang kéo: {dom: bảng chứa nó, id, from?: id thẻ cha nếu là việc con}
// thẻ vừa chép (nút ⧉), dùng chung cho mọi bảng nên chép ở ngày này dán được sang ngày khác.
// Clipboard hệ thống nhận thẻ dạng chữ; dán đúng chữ đó vào ô "+ Thêm" thì dựng lại nguyên thẻ.
// Chọn nhiều thẻ (Ctrl + bấm) thì chép cả loạt; dán vào cột nào thì cả loạt vào cột đó, giữ thứ tự.
let kbClip = null;                           // [{t, d?, sub?: [{t, d?, x?}]}]
const kbCardText = c => [c.t, c.d, ...(c.sub || []).map(x => (x.x ? '☑ ' : '☐ ') + x.t)].filter(Boolean).join('\n');
const kbClipText = list => list.map(kbCardText).join('\n\n');
const kbClipOf = c => ({t: c.t, ...(c.d ? {d: c.d} : {}), ...(c.sub && c.sub.length ? {sub: c.sub.map(({id, ...x}) => x)} : {}),
  ...(c.tk ? {tk: c.tk} : {})});
const kbNorm = s => s.replace(/\r\n?/g, '\n').trim();
const kbId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
// ngày bắt đầu / ngày xong của thẻ: ds = ngày vào Đang làm (giữ khi sang Xong, bỏ khi về Cần làm / Backlog),
// dd = ngày vào Xong (bỏ khi rời Xong). Chỉ đóng khi thẻ đổi cột hoặc mới vào bảng; thẻ đã nối thì dd lấy theo task.
const kbToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const kbDone = s => s === 'done' || s === 'won';   // ô Quan trọng đã xong (won) ở đầu cột Xong cũng là xong
const kbStamp = (prev, next) => {
  const was = new Map(prev.map(c => [c.id, c.s])), t = kbToday();
  return next.map(c => {
    if(was.get(c.id) === c.s) return c;
    const {ds, dd, ...out} = c;
    const busy = c.s === 'doing' || c.s === 'key';
    if(busy || kbDone(c.s) || c.s === 'drop'){ if(ds || busy) out.ds = ds || t; }
    if(kbDone(c.s)) out.dd = dd || t;
    return out;
  });
};
// tuỳ chọn trong menu ⚙ của từng bảng: k = khoá trong attrs.prefs, def = mặc định, n = tên khoá chữ trong options.prefN.
// key: hiện hai ô lồng đầu cột (Quan trọng, Quan trọng đã xong); tắt thì thẻ trong đó hiện chung với cột cha,
// vẫn giữ mã ô nên bật lại là về đúng chỗ
const KB_PREFS = [{k: 'key', def: true}];
// cột còn việc phải làm: thẻ ở đây mới có hạn chót; ô Quan trọng thì bắt buộc có hạn (chưa có thì hiện nhắc)
const KB_DUE = ['todo', 'backlog', 'doing', 'key'];
const kbShortDay = k => { const [y, m, d] = k.split('-'); return `${+d}/${+m}` + (+y !== new Date().getFullYear() ? `/${y.slice(2)}` : ''); };
// thẻ -> các việc con khi bị thả vào thẻ khác: chính nó (ở cột Xong thì coi như đã xong) rồi tới việc con của nó
const kbToSubs = c => [{id: c.id, t: c.t, ...(c.d ? {d: c.d} : {}), ...(kbDone(c.s) ? {x: true} : {})}, ...(c.sub || [])];
const kbToCard = (x, s) => ({id: x.id, t: x.t, s, ...(x.d ? {d: x.d} : {})});
// thẻ chỉ thả được trong bảng của nó: kéo ra ngoài thì chặn trước khi ProseMirror kịp hiện vạch thả hay nhận thả
['dragover', 'drop'].forEach(t => window.addEventListener(t, e => {
  if(kbDrag && !kbDrag.dom.contains(e.target)) e.stopPropagation();
}, true));
const Kanban = Node.create({
  name: 'kanban',
  group: 'block',
  atom: true,
  addOptions(){
    return {cols: [{k:'todo', n:'To do', c:'#64748b'}, {k:'doing', n:'Doing', c:'#6366f1'}, {k:'done', n:'Done', c:'#22c55e'}],
            nest: {todo: {k:'backlog', n:'Backlog', c:'#94a3b8'}, done: {k:'drop', n:"Won't do", c:'#78716c'}},
            nestTop: {doing: {k:'key', n:'Important', c:'#ef4444', ic:'🔥'}, done: {k:'won', n:'Important, done', c:'#eab308', ic:'🏆'}},
            addPh: '+ Add', addT: 'Enter to add, Shift+Enter for a new line', pastePh: '+ Add · Ctrl+V to paste', delT: 'Delete', copyT: 'Copy card', copied: '✓',
            editT: 'Click to edit, drag to move', descPh: 'Description…', subPh: '+ Subtask', subT: 'Drag to a column to make it a card',
            selN: '{n} selected', copySel: '⧉ Copy', copiedSel: '✓ Copied', clearSel: 'Clear',
            copyAll: 'Copy board', copiedAll: 'Copied', descHide: 'Hide description', descShow: 'Show description', subHide: 'Hide subtasks', subShow: 'Show subtasks',
            link: null, linkT: 'Send to a board', linkWork: 'Work board', linkLife: 'Life board', linkedT: 'Linked to a task on {b}. Click to open it',
            startT: 'Started {d}', doneT: 'Done {d}', startL: 'Started', doneL: 'Done', pickPh: 'Pick a date',
            dueT: 'Due {d}', dueL: 'Due', dueNone: 'No due date', dueEdit: 'Click to change the due date',
            pickDate: null,                  // (nút, 'YYYY-MM-DD' | '', onPick(ngày | '')) mở lịch chọn ngày của app
            areas: {work: {n: 'Work', c: '#3b82f6'}, life: {n: 'Life', c: '#a855f7'}}, areaNone: 'Unsorted', areaT: 'Switch between work and life board',
            prefN: {key: 'Show Important boxes'}, setT: 'Board settings',
            day: '', fmtDay: d => d};
  },
  addAttributes(){
    return {cards: {default: [],
      parseHTML: el => { try{ const v = JSON.parse(el.getAttribute('data-kanban')); return Array.isArray(v) ? v : []; }catch(e){ return []; } },
      renderHTML: a => ({'data-kanban': JSON.stringify(a.cards || [])})},
      // chữ gõ dở ở ô thêm của từng cột {mã cột: chữ}: lưu cùng trang, nên đi chỗ khác hay tắt app rồi quay lại vẫn còn
      drafts: {default: {},
        parseHTML: el => { try{ const v = JSON.parse(el.getAttribute('data-kbdraft')); return v && typeof v === 'object' ? v : {}; }catch(e){ return {}; } },
        renderHTML: a => Object.keys(a.drafts || {}).length ? {'data-kbdraft': JSON.stringify(a.drafts)} : {}},
      // ngày bảng thuộc về (YYYY-MM-DD): đóng dấu theo trang nhật ký lúc bảng hiện lần đầu, rồi đi theo bảng khi chép
      // sang ngày khác hay sang ghi chú, nên bảng của ngày 14 dán vào ngày 16 vẫn ghi ngày 14
      day: {default: '',
        parseHTML: el => /^\d{4}-\d\d-\d\d$/.test(el.getAttribute('data-kbday') || '') ? el.getAttribute('data-kbday') : '',
        renderHTML: a => a.day ? {'data-kbday': a.day} : {}},
      // mã của bảng: các bản chép (nút chép cả bảng, lấy bảng ngày trước) giữ nguyên mã, app thấy cùng mã thì đồng bộ thẻ
      bid: {default: '',
        parseHTML: el => el.getAttribute('data-kbid') || '',
        renderHTML: a => a.bid ? {'data-kbid': a.bid} : {}},
      // loại bảng: 'work' | 'life' | '' (bảng cũ chưa phân loại); nhãn và màu do app đưa vào qua options.areas
      area: {default: '',
        parseHTML: el => ['work', 'life'].includes(el.getAttribute('data-kbarea')) ? el.getAttribute('data-kbarea') : '',
        renderHTML: a => a.area ? {'data-kbarea': a.area} : {}},
      // tuỳ chọn riêng của bảng này (nút ⚙ trên đầu bảng), chỉ lưu những mục khác mặc định; xem KB_PREFS.
      // Mỗi bản chép của bảng có tuỳ chọn riêng
      prefs: {default: {},
        parseHTML: el => { try{ const v = JSON.parse(el.getAttribute('data-kbprefs')); return v && typeof v === 'object' ? v : {}; }catch(e){ return {}; } },
        renderHTML: a => Object.keys(a.prefs || {}).length ? {'data-kbprefs': JSON.stringify(a.prefs)} : {}}};
  },
  parseHTML(){ return [{tag: 'div[data-kanban]'}]; },
  renderHTML({node, HTMLAttributes}){
    return ['div', HTMLAttributes, node.attrs.cards.map(c =>
      [c.t, c.d, ...(c.sub || []).map(x => x.t)].filter(Boolean).join(' ')).join(' · ')];
  },
  addNodeView(){
    return ({node, getPos, editor}) => {
      const o = this.options;
      const dom = document.createElement('div');
      dom.className = 'ekb';
      let open = null;                       // id thẻ đang mở ra để sửa
      let justOpened = false;                // vừa bấm mở thẻ: vẽ xong đặt con trỏ vào ô mô tả
      let refocus = null;                    // thẻ vừa gập vì bấm sang ô thêm của cột này: vẽ xong trả con trỏ về đó
      let drawing = false;                   // đang vẽ lại: ô có con trỏ bị gỡ ra cũng bắn focusout, phải bỏ qua
      const sel = new Set();                 // id các thẻ đang chọn (Ctrl + bấm) để chép một lượt; không lưu lại
      const picked = () => node.attrs.cards.filter(c => sel.has(c.id));
      const copy = list => {
        kbClip = list.map(kbClipOf);
        navigator.clipboard?.writeText(kbClipText(kbClip)).catch(() => {});
        document.querySelectorAll('.ekba').forEach(i => { i.placeholder = o.pastePh; });   // mọi bảng đang hiện
      };
      let ph = null, drop = null;            // vạch chỗ thả, và chỗ thả {s: cột, before: id thẻ | null} hoặc {into: id thẻ}
      // ô gõ là textarea tự cao theo chữ, để việc dài xuống dòng thay vì chạy mất về bên phải.
      // Lần vẽ đầu bảng chưa gắn vào trang nên chưa đo được (scrollHeight = 0): để nguyên một dòng, đo lại sau
      const fit = ta => { ta.style.height = 'auto'; if(ta.scrollHeight) ta.style.height = ta.scrollHeight + 'px'; };
      const fitAll = () => dom.querySelectorAll('textarea').forEach(fit);

      // chữ đang gõ trong thẻ đang mở (tiêu đề, mô tả, tên việc con) chưa nằm trong attrs: lần lưu nào cũng gom vào,
      // kẻo tick một việc con xong vẽ lại là mất chữ vừa gõ. Ô bị xoá trắng thì giữ chữ cũ.
      const withLive = cards => {
        const k = dom.querySelector('.ekbk.on'); if(!k) return cards;
        return cards.map(c => {
          if(c.id !== k.dataset.id) return c;
          const t = k.querySelector('.ekbe').value.trim() || c.t;
          const d = k.querySelector('.ekbt').value.replace(/\s+$/, '');
          const {d: _, ...rest} = c;
          const out = d ? {...rest, t, d} : {...rest, t};
          if(c.sub) out.sub = c.sub.map(x => {
            const inp = k.querySelector(`.ekbs[data-sid="${x.id}"] .ekbsn`);
            return inp && inp.value.trim() ? {...x, t: inp.value.trim()} : x;
          });
          return out;
        });
      };
      // chữ gõ dở chờ ghi (pend), ghi sau một nhịp ngừng gõ; lần lưu thẻ nào cũng mang theo luôn
      let pend = null, pendT = null;
      const curDrafts = () => pend || node.attrs.drafts || {};
      const pref = k => { const v = (node.attrs.prefs || {})[k]; return v === undefined ? KB_PREFS.find(x => x.k === k).def : v; };
      // menu ⚙: mỗi tuỳ chọn một ô tick; vẽ lại bảng thì dựng lại menu nếu đang mở
      let setOpen = false;
      const offSet = ev => { if(!ev.target.closest?.('.ekbsetm, .ekbset')){ setOpen = false; dom.querySelector('.ekbsetm')?.remove();
        dom.querySelector('.ekbset')?.classList.remove('on'); document.removeEventListener('pointerdown', offSet, true); } };
      const setMenu = () => {
        dom.querySelector('.ekbsetm')?.remove();
        const gb = dom.querySelector('.ekbset'); if(!gb) return;
        const m = document.createElement('div');
        m.className = 'ekbmenu ekbsetm';
        KB_PREFS.forEach(x => {
          const r = document.createElement('label');
          r.className = 'ekbopt';
          r.innerHTML = '<input type="checkbox"><span></span>';
          r.querySelector('input').dataset.pref = x.k;
          r.querySelector('input').checked = !!pref(x.k);
          r.querySelector('span').textContent = o.prefN[x.k] || x.k;
          m.appendChild(r);
        });
        const r = gb.getBoundingClientRect(), b = dom.getBoundingClientRect();
        m.style.top = (r.bottom - b.top + 4) + 'px';
        m.style.right = (b.right - r.right) + 'px';
        dom.appendChild(m);
        document.removeEventListener('pointerdown', offSet, true);
        document.addEventListener('pointerdown', offSet, true);   // bấm ra ngoài thì đóng
      };
      const write = (attrs, history = true) => {
        clearTimeout(pendT); pend = null;
        if(editor.isDestroyed) return;
        const pos = typeof getPos === 'function' ? getPos() : null;
        if(typeof pos !== 'number') return;
        const tr = editor.view.state.tr.setNodeMarkup(pos, null, {...node.attrs, drafts: curDrafts(), ...attrs});
        if(!history) tr.setMeta('addToHistory', false);   // gõ dở không chiếm chỗ trong Ctrl+Z của trang
        // ProseMirror đặt lại con trỏ của trang sau mỗi lần ghi, Chrome cuộn tới con trỏ đó (vd. đang ở cuối trang
        // sau khi dán): giữ nguyên chỗ cuộn của mọi khung chứa bảng, sửa bảng thì trang đứng yên
        const scrolled = [];
        for(let n = dom.parentElement; n; n = n.parentElement) if(n.scrollHeight > n.clientHeight) scrolled.push([n, n.scrollTop]);
        const wy = window.scrollY;
        editor.view.dispatch(tr);
        scrolled.forEach(([n, t]) => { if(n.scrollTop !== t) n.scrollTop = t; });
        if(window.scrollY !== wy) window.scrollTo(window.scrollX, wy);
      };
      // thẻ đã nối: lấy tiêu đề / cột / việc con từ task; task không còn (đã bỏ vào thùng rác) thì thôi nối, giữ chữ
      const L = o.link;
      const pulled = cards => !L ? cards : cards.map(c => {
        if(!c.tk) return c;
        const T = L.get(c.tk);
        if(!T){ const {tk, ...rest} = c; return rest; }
        const sub = T.sub.map(x => { const own = (c.sub || []).find(y => y.id === x.id); return own && own.d ? {...x, d: own.d} : x; });
        const {sub: _, dl: __, ...rest} = c;
        // thẻ ở ô lồng thì ở yên đó: Backlog khi task còn ở Cần làm, Quan trọng khi task còn ở Đang làm,
        // Không cần làm thì luôn luôn (task thật không đổi theo)
        // Quan trọng mà task đã xong ở bảng lớn thì sang ô Quan trọng đã xong
        const s = c.s === 'drop' || (c.s === 'backlog' && T.s === 'todo') || (c.s === 'key' && T.s === 'doing')
          || (c.s === 'won' && T.s === 'done') ? c.s : c.s === 'key' && T.s === 'done' ? 'won' : T.s;
        return {...rest, t: T.t, s, ...(sub.length ? {sub} : {}), ...(kbDone(s) && T.done ? {dd: T.done} : {}),
          ...(T.due ? {dl: T.due} : {})};   // hạn chót là hạn của task
      });
      // sửa trên thẻ đã nối: đẩy đúng phần vừa đổi sang task (thẻ mới dán vào thì không đẩy, để task giữ bản của nó)
      const pushLinks = (prev, next) => {
        if(L) next.forEach(c => {
          const p = c.tk && prev.find(x => x.id === c.id && x.tk === c.tk); if(!p) return;
          const patch = {};
          if(p.t !== c.t) patch.t = c.t;
          if(p.s !== c.s) patch.s = c.s;
          if(JSON.stringify(p.sub || []) !== JSON.stringify(c.sub || [])) patch.sub = c.sub || [];
          if(kbDone(c.s) && kbDone(p.s) && c.dd && p.dd !== c.dd) patch.dd = c.dd;   // sửa tay ngày xong: task theo luôn
          if((p.dl || '') !== (c.dl || '')) patch.due = c.dl || '';
          if(Object.keys(patch).length) L.update(c.tk, patch);
        });
      };
      let askDue = null;                     // thẻ vừa vào ô Quan trọng mà chưa có hạn: vẽ xong mở lịch chọn hạn cho nó
      const cheer = new Set();                // thẻ vừa vào ô Quan trọng đã xong: vẽ xong cho nó một nhịp ăn mừng
      const save = (cards, drafts) => {
        const was = new Map(node.attrs.cards.map(c => [c.id, c.s]));
        // thẻ Quan trọng kéo sang Xong thì vào thẳng ô Quan trọng đã xong
        let next = withLive(cards).map(c => c.s === 'done' && was.get(c.id) === 'key' ? {...c, s: 'won'} : c);
        pushLinks(node.attrs.cards, next);
        next = kbStamp(node.attrs.cards, pulled(next));
        const need = next.find(c => c.s === 'key' && !c.dl && was.get(c.id) !== 'key');
        if(need) askDue = need.id;
        next.forEach(c => { if(c.s === 'won' && was.has(c.id) && was.get(c.id) !== 'won') cheer.add(c.id); });
        write(drafts ? {cards: next, drafts} : {cards: next});
      };
      let menu = null;                       // menu chọn bảng khi bấm ↗ trên thẻ chưa nối
      const closeMenu = () => { if(menu){ menu.remove(); menu = null; } };
      const flushDrafts = () => { if(pend) write({drafts: pend}, false); };
      const setDraft = (k, v) => {
        const d = {...curDrafts()};
        if(v.trim()) d[k] = v; else delete d[k];
        pend = d; clearTimeout(pendT); pendT = setTimeout(flushDrafts, 250);
      };
      const editSubs = (id, f) => node.attrs.cards.map(c => c.id === id ? {...c, sub: f(c.sub || [])} : c);

      const draw = () => {
        // vẽ lại thay hết phần tử: nhớ ô đang có con trỏ để đặt lại vào ô tương ứng
        const a = document.activeElement, keep = a && dom.contains(a) && a.classList[0] && {
          cls: a.classList[0], s: a.closest('.ekbc')?.dataset.s, sid: a.closest('[data-sid]')?.dataset.sid, on: !!a.closest('.ekbk.on')};
        drawing = true;
        dom.innerHTML = '';
        drawing = false;
        [...sel].forEach(id => { if(!node.attrs.cards.some(c => c.id === id)) sel.delete(id); });   // thẻ đã bị xoá / kéo vào thẻ khác
        // hàng mỏng trên cùng, tách khỏi các cột: bên trái ngày của trang chứa bảng, bên phải nút chép cả bảng
        const canCopy = node.attrs.cards.length && !sel.size;
        const day = node.attrs.day || o.day, label = day ? o.fmtDay(day) : '';
        // loại bảng: viền trái mang màu của loại, nhãn đầu bảng bấm để đổi
        const ar = o.areas && o.areas[node.attrs.area];
        dom.classList.toggle('ar', !!ar);
        if(ar) dom.style.setProperty('--kba', ar.c); else dom.style.removeProperty('--kba');
        if(label || canCopy || o.areas || o.prefN){
          const hd = document.createElement('div');
          hd.className = 'ekbhd';
          if(o.areas){
            const ab = document.createElement('button');
            ab.type = 'button'; ab.className = 'ekbarea' + (ar ? '' : ' none'); ab.title = o.areaT;
            ab.innerHTML = '<i></i><span></span>';
            ab.querySelector('span').textContent = ar ? ar.n : o.areaNone;
            hd.appendChild(ab);
          }
          if(label){
            const lb = document.createElement('span');
            lb.className = 'ekbdate'; lb.textContent = label;
            hd.appendChild(lb);
          }
          if(canCopy){
            const ca = document.createElement('button');
            ca.type = 'button'; ca.className = 'ekbca'; ca.textContent = '⧉'; ca.title = o.copyAll;
            hd.appendChild(ca);
          }
          if(o.prefN){                       // ⚙ tuỳ chọn của bảng này, mở menu (setMenu)
            const gb = document.createElement('button');
            gb.type = 'button'; gb.className = 'ekbset' + (setOpen ? ' on' : ''); gb.textContent = '⚙'; gb.title = o.setT;
            hd.appendChild(gb);
          }
          dom.appendChild(hd);
        }
        if(sel.size){                        // thanh chọn nhiều: nằm trên cả ba cột
          const bar = document.createElement('div');
          bar.className = 'ekbbar';
          bar.innerHTML = '<span></span><button type="button" class="ekbbc"></button><button type="button" class="ekbbx"></button>';
          bar.querySelector('span').textContent = o.selN.replace('{n}', sel.size);
          bar.querySelector('.ekbbc').textContent = o.copySel;
          bar.querySelector('.ekbbx').textContent = o.clearSel;
          dom.appendChild(bar);
        }
        // lưới chỉ chứa ba cột: hàng ngày / thanh chọn nằm ngoài, kẻo một hàng trải ngang làm auto-fit không gộp được rãnh trống, cột co lại
        const grid = document.createElement('div');
        grid.className = 'ekbcols';
        dom.appendChild(grid);
        const mkCol = col => {
          // ô lồng đầu cột đang tắt: thẻ của nó hiện trong cột cha, vẫn mang biểu tượng của ô
          const fold = !pref('key') && o.nestTop && o.nestTop[col.k];
          const cards = node.attrs.cards.filter(c => c.s === col.k || (fold && c.s === fold.k));
          const icOf = c => col.ic || (fold && c.s === fold.k ? fold.ic : '');
          const el = document.createElement('div');
          el.className = 'ekbc'; el.dataset.s = col.k;
          el.innerHTML = '<div class="ekbh"><i></i><span></span><b></b></div><div class="ekbl"></div><textarea class="ekba" rows="1"></textarea>';
          // ô có biểu tượng riêng (col.ic, vd. Quan trọng): hiện biểu tượng thay chấm màu, và gắn nó lên đầu mỗi thẻ trong ô
          if(col.ic){ el.querySelector('i').textContent = col.ic; el.querySelector('i').className = 'ic'; }
          else el.querySelector('i').style.background = col.c;
          el.querySelector('span').textContent = col.n;
          if(col.tip) el.querySelector('.ekbh').title = col.tip;   // rê chuột vào tên ô: ô này dùng cho việc gì
          el.querySelector('b').textContent = cards.length || '';
          el.querySelector('.ekba').placeholder = kbClip ? o.pastePh : o.addPh;
          el.querySelector('.ekba').title = o.addT;
          el.querySelector('.ekba').value = curDrafts()[col.k] || '';
          const list = el.querySelector('.ekbl');
          cards.forEach(c => {
            const k = document.createElement('div');
            k.dataset.id = c.id;
            const sub = c.sub || [];
            if(c.id === open){
              k.className = 'ekbk on';
              k.innerHTML = '<textarea class="ekbe" rows="1"></textarea><textarea class="ekbt" rows="2"></textarea><div class="ekbsl"></div><textarea class="ekbsa" rows="1"></textarea>';
              k.querySelector('.ekbe').value = c.t;
              k.querySelector('.ekbt').value = c.d || '';
              k.querySelector('.ekbt').placeholder = o.descPh;
              k.querySelector('.ekbsa').placeholder = o.subPh;
              // sửa tay ngày bắt đầu (Đang làm, Xong) và ngày xong (Xong); xoá trắng ô thì bỏ ngày đó
              const dates = c.s === 'doing' || c.s === 'key' ? [['ds', o.startL]] : kbDone(c.s) ? [['ds', o.startL], ['dd', o.doneL]] : [];
              if(KB_DUE.includes(c.s)) dates.push(['dl', o.dueL]);   // hạn chót cho việc chưa xong
              if(dates.length && o.pickDate){     // bấm ô ngày: app mở lịch chọn ngày của nó
                const row = document.createElement('div');
                row.className = 'ekbdates';
                dates.forEach(([f, n]) => {
                  const lb = document.createElement('label');
                  lb.innerHTML = '<span></span><button type="button" class="ekbdi"></button>';
                  lb.querySelector('span').textContent = n;
                  const b = lb.querySelector('button');
                  b.dataset.f = f; b.dataset.dt = '1';   // data-dt: app không coi cú bấm mở lịch là bấm ra ngoài lịch
                  b.textContent = c[f] ? o.fmtDay(c[f]) : o.pickPh;
                  if(!c[f]) b.classList.add('ph');
                  row.appendChild(lb);
                });
                k.insertBefore(row, k.querySelector('.ekbsl'));
              }
              const sl = k.querySelector('.ekbsl');
              sub.forEach(x => {
                const r = document.createElement('div');
                r.className = 'ekbs' + (x.x ? ' x' : ''); r.dataset.sid = x.id; r.draggable = true;
                // nhận focus khi nhấn vào nút kéo: con trỏ vẫn ở trong thẻ, nên thẻ không tưởng là bấm ra ngoài mà gập lại
                r.tabIndex = -1;
                r.innerHTML = '<i class="ekbsg">⠿</i><input type="checkbox" class="ekbsc"><textarea class="ekbsn" rows="1"></textarea><button type="button" class="ekbsx">✕</button>';
                r.querySelector('.ekbsg').title = o.subT;
                r.querySelector('.ekbsc').checked = !!x.x;
                r.querySelector('.ekbsn').value = x.t;
                if(x.d) r.querySelector('.ekbsn').title = x.d;
                r.querySelector('.ekbsx').title = o.delT;
                sl.appendChild(r);
              });
            } else {
              k.className = 'ekbk' + (sel.has(c.id) ? ' sel' : ''); k.draggable = true;
              // mô tả hiện ngay dưới tiêu đề cho tới khi bấm ≡ để ẩn (dh lưu cùng thẻ); đang ẩn thì xem qua tooltip
              const showD = c.d && !c.dh;
              k.title = c.d && c.dh ? (c.d.length > 300 ? c.d.slice(0, 300) + '…' : c.d) : o.editT;
              // việc con cũng vậy: hiện ngay trên thẻ, tick được tại chỗ, bấm nhãn ☑ n/m để ẩn / hiện (sh lưu cùng thẻ)
              const n = sub.filter(x => x.x).length, showS = sub.length && !c.sh;
              k.innerHTML = (icOf(c) ? '<i class="ekbic"></i>' : '') + '<span></span>' + (c.d ? `<button type="button" class="ekbd${showD ? ' on' : ''}">≡</button>` : '')
                + (sub.length ? `<button type="button" class="ekbsb${n === sub.length ? ' all' : ''}${showS ? ' on' : ''}">☑ ${n}/${sub.length}</button>` : '')
                + (L ? `<button type="button" class="${c.tk ? 'ekblk' : 'ekbln'}">↗</button>` : '')
                + '<button type="button" class="ekbcp">⧉</button><button type="button" class="ekbx">✕</button>'
                + (showD ? '<div class="ekbdt"></div>' : '') + (showS ? '<div class="ekbsv"></div>' : '');
              // Đang làm: ngày bắt đầu; Xong: ngày xong (rê chuột thấy cả ngày bắt đầu)
              const when = (c.s === 'doing' || c.s === 'key') && c.ds ? o.startT.replace('{d}', kbShortDay(c.ds))
                : kbDone(c.s) && c.dd ? o.doneT.replace('{d}', kbShortDay(c.dd)) : '';
              // hạn chót: nút bấm đổi hạn ngay trên thẻ gập; quá hạn đỏ, hạn hôm nay cam; ô Quan trọng chưa có hạn thì nhắc
              const due = o.pickDate && KB_DUE.includes(c.s) && (c.dl || c.s === 'key');
              if(when || due){
                const w = document.createElement('div');
                w.className = 'ekbwhen';
                if(when){ const t = document.createElement('span'); t.textContent = when; w.appendChild(t); }
                if(kbDone(c.s) && c.ds) w.title = o.startT.replace('{d}', kbShortDay(c.ds));
                if(due){
                  const b = document.createElement('button'), t = kbToday();
                  b.type = 'button'; b.dataset.f = 'dl'; b.dataset.dt = '1'; b.title = o.dueEdit;
                  b.className = 'ekbdl' + (!c.dl ? ' ph' : c.dl < t ? ' over' : c.dl === t ? ' now' : '');
                  b.textContent = c.dl ? o.dueT.replace('{d}', kbShortDay(c.dl)) : o.dueNone;
                  w.appendChild(b);
                }
                k.insertBefore(w, k.querySelector('.ekbdt, .ekbsv'));   // ngay dưới tiêu đề, trên mô tả và việc con
              }
              if(c.tk) k.classList.add('lk');
              if(cheer.has(c.id)) k.classList.add('cheer');
              if(L) k.querySelector(c.tk ? '.ekblk' : '.ekbln').title = c.tk
                ? o.linkedT.replace('{b}', L.get(c.tk)?.area === 'life' ? o.linkLife : o.linkWork) : o.linkT;
              k.querySelector('span').textContent = c.t;
              if(icOf(c)){ const ic = k.querySelector('.ekbic'), from = col.ic ? col : fold; ic.textContent = from.ic; if(from.tip) ic.title = from.tip; }
              if(c.d) k.querySelector('.ekbd').title = showD ? o.descHide : o.descShow;
              if(showD) k.querySelector('.ekbdt').textContent = c.d;
              if(sub.length) k.querySelector('.ekbsb').title = showS ? o.subHide : o.subShow;
              if(showS) sub.forEach(x => {
                const r = document.createElement('label');
                r.className = 'ekbsr' + (x.x ? ' x' : ''); r.dataset.sid = x.id;
                r.innerHTML = '<input type="checkbox" class="ekbsc"><span></span>';
                r.querySelector('input').checked = !!x.x;
                r.querySelector('span').textContent = x.t;
                k.querySelector('.ekbsv').appendChild(r);
              });
              k.querySelector('.ekbcp').title = o.copyT;
              k.querySelector('.ekbx').title = o.delT;
            }
            list.appendChild(k);
          });
          return el;
        };
        o.cols.forEach(col => {
          const el = mkCol(col);
          // ô lồng ở cuối / đầu cột: cũng là một .ekbc nên thêm, dán, kéo thả, chữ gõ dở đều dùng chung
          const sub = o.nest && o.nest[col.k];
          if(sub){ const b = mkCol(sub); b.classList.add('ekbin'); el.appendChild(b); }
          const top = o.nestTop && o.nestTop[col.k];
          if(top && pref('key')){ const b = mkCol(top); b.classList.add('ekbin', 'top'); el.insertBefore(b, el.querySelector('.ekbl')); }
          grid.appendChild(el);
        });
        cheer.clear();                       // ăn mừng một lần, lần vẽ sau thẻ đứng yên
        if(setOpen) setMenu();
        fitAll();
        if(!dom.isConnected) requestAnimationFrame(fitAll);
        let f = null;
        // tìm theo .ekbc gần nhất: ô lồng nằm trong cột, chọn theo cột cha sẽ vớ nhầm ô của ô lồng
        const inCol = (cls, s) => [...dom.querySelectorAll('.' + cls)].filter(x => x.closest('.ekbc').dataset.s === s);
        if(justOpened){ f = dom.querySelector('.ekbk.on .ekbt'); justOpened = false; }
        else if(refocus){ f = inCol('ekba', refocus)[0]; }
        else if(keep) f = inCol(keep.cls, keep.s).find(x => (x.closest('[data-sid]')?.dataset.sid) === keep.sid);
        // ô cũ không còn (vd. vừa kéo việc con ra ngoài) mà thẻ vẫn mở: giữ con trỏ trong thẻ để bấm ra ngoài còn gập được
        if(!f && keep && keep.on) f = dom.querySelector('.ekbk.on .ekbt');
        refocus = null;
        if(f){
          f.focus();
          if(f.setSelectionRange && f.type !== 'checkbox') f.setSelectionRange(f.value.length, f.value.length);
        }
        if(askDue){
          const b = dom.querySelector(`.ekbk[data-id="${askDue}"] .ekbdl`);
          askDue = null;
          if(b) setTimeout(() => { if(b.isConnected) b.click(); }, 0);   // đợi cú bấm / thả hiện tại xong rồi mới mở lịch
        }
      };
      draw();
      // bảng chưa có ngày mà đang nằm trong trang nhật ký: đóng dấu ngày của trang (đợi editor dựng xong mới ghi được)
      if(!node.attrs.day && o.day) setTimeout(() => { if(!node.attrs.day) write({day: o.day}, false); }, 0);
      if(!node.attrs.bid) setTimeout(() => { if(!node.attrs.bid) write({bid: kbId()}, false); }, 0);
      // thẻ đã nối: task có thể vừa đổi ở bảng việc (kéo cột, tick việc con) trong lúc trang này đóng
      setTimeout(() => {
        const fresh = kbStamp(node.attrs.cards, pulled(node.attrs.cards));
        if(JSON.stringify(fresh) !== JSON.stringify(node.attrs.cards)) write({cards: fresh}, false);
      }, 0);

      // lưu thẻ đang mở rồi gập lại (muốn xoá thẻ thì bấm ✕)
      const commit = () => {
        const live = withLive(node.attrs.cards);
        open = null;
        if(JSON.stringify(live) === JSON.stringify(node.attrs.cards)) return draw();
        save(live);
      };

      dom.addEventListener('keydown', e => {
        if(e.isComposing) return;
        // Shift+Enter ở mọi ô = xuống dòng (để textarea tự làm); Enter thường mới là thêm / lưu
        if(e.key === 'Enter' && e.shiftKey && e.target.matches('textarea')) return;
        const inp = e.target.closest('.ekba');
        if(inp && e.key === 'Enter'){
          e.preventDefault();
          const t = inp.value.trim(); if(!t) return;
          const s = inp.closest('.ekbc').dataset.s;
          const {[s]: _, ...drafts} = curDrafts();
          save([...node.attrs.cards, {id: kbId(), t, s}], drafts);
          return;
        }
        const k = e.target.closest('.ekbk.on'); if(!k) return;
        if(e.key === 'Enter' && e.target.matches('.ekbsa')){       // thêm việc con, con trỏ ở lại ô để gõ tiếp
          e.preventDefault();
          const t = e.target.value.trim(); if(!t) return;
          return save(editSubs(k.dataset.id, sub => [...sub, {id: kbId(), t}]));
        }
        if(e.key === 'Enter' && e.target.matches('.ekbsn')){       // sửa tên việc con xong: sang ô thêm việc con
          e.preventDefault();
          k.querySelector('.ekbsa').focus();
          return save(node.attrs.cards);
        }
        // Esc, Enter ở ô tiêu đề, Ctrl+Enter ở ô mô tả: lưu và gập thẻ (Enter thường trong mô tả là xuống dòng)
        if(e.key === 'Escape' || (e.key === 'Enter' && (e.target.matches('.ekbe') || e.ctrlKey || e.metaKey))){
          e.preventDefault(); e.stopPropagation(); commit();
        }
      });
      dom.addEventListener('change', e => {
        if(e.target.dataset.pref){           // tick trong menu ⚙: chỉ lưu khi khác mặc định
          const k = e.target.dataset.pref, def = KB_PREFS.find(x => x.k === k).def;
          const {[k]: _, ...rest} = node.attrs.prefs || {};
          return write({prefs: e.target.checked === def ? rest : {...rest, [k]: e.target.checked}});
        }
        if(!e.target.matches('.ekbsc')) return;
        const id = e.target.closest('.ekbk').dataset.id, sid = e.target.closest('[data-sid]').dataset.sid, on = e.target.checked;
        save(editSubs(id, sub => sub.map(x => {
          if(x.id !== sid) return x;
          const {x: _, ...rest} = x;
          return on ? {...rest, x: true} : rest;
        })));
      });
      dom.addEventListener('input', e => {
        const ta = e.target;
        if(ta.matches('textarea')) fit(ta);
        if(e.target.matches('.ekba')) setDraft(e.target.closest('.ekbc').dataset.s, e.target.value);
      });
      dom.addEventListener('paste', e => {      // dán thẻ vừa chép vào ô "+ Thêm" của cột nào thì thẻ vào cột đó
        const inp = e.target.closest('.ekba');
        if(!inp || inp.value || !kbClip || kbNorm(e.clipboardData.getData('text/plain')) !== kbNorm(kbClipText(kbClip))) return;
        e.preventDefault();
        const s = inp.closest('.ekbc').dataset.s;   // thẻ chép từ cả bảng đã mang cột cũ (c.s), thẻ chép lẻ thì vào cột được dán
        save([...node.attrs.cards, ...kbClip.map(c => ({s, ...c, id: kbId(), ...(c.sub ? {sub: c.sub.map(x => ({...x, id: kbId()}))} : {})}))]);
      });
      dom.addEventListener('focusout', e => {
        if(drawing || !e.target.isConnected) return;         // ô vừa bị thay khi vẽ lại, không phải người dùng rời đi
        if(e.target.matches('.ekba')){                       // rời ô thêm (bấm chỗ khác, sang ngày khác): chữ đã gõ thành thẻ luôn
          const t = e.target.value.trim();
          if(!t) return flushDrafts();
          const s = e.target.closest('.ekbc').dataset.s, to = e.relatedTarget;
          if(to && dom.contains(to) && to.matches('.ekba')) refocus = to.closest('.ekbc').dataset.s;   // vẽ lại xong vẫn ở ô thêm vừa bấm
          const {[s]: _, ...drafts} = curDrafts();
          return save([...node.attrs.cards, {id: kbId(), t, s}], drafts);
        }
        const k = e.target.closest('.ekbk.on');
        if(!k || k.dataset.id !== open) return;
        const to = e.relatedTarget;
        if(to && k.contains(to)) return;                     // đi giữa các ô trong cùng thẻ
        if(to && dom.contains(to) && to.matches('.ekba')) refocus = to.closest('.ekbc').dataset.s;   // vẽ lại xong trả con trỏ về ô thêm vừa bấm
        commit();
      });
      dom.addEventListener('click', e => {
        if(e.target.closest('.ekbsr')){               // việc con trên thẻ gập: ô vuông thì tick ('change' lo), chữ thì mở thẻ như thường
          if(e.target.matches('.ekbsc')) return;
          e.preventDefault();                         // label không tự tick khi bấm vào chữ
        }
        if(menu && !menu.contains(e.target)) closeMenu();
        const mi = e.target.closest('.ekbmi');
        if(mi){                              // chọn bảng trong menu ↗: tạo task thật rồi nối thẻ vào nó
          const id = menu.dataset.id; closeMenu();
          const c = withLive(node.attrs.cards).find(x => x.id === id); if(!c || c.tk) return;
          const tk = L.create(c, mi.dataset.area);
          return save(node.attrs.cards.map(x => x.id === id ? {...x, tk} : x));
        }
        if(e.target.closest('.ekbset')){
          setOpen = !setOpen;
          e.target.closest('.ekbset').classList.toggle('on', setOpen);
          if(setOpen) setMenu(); else dom.querySelector('.ekbsetm')?.remove();
          return;
        }
        if(e.target.closest('.ekbsetm')) return;
        if(e.target.closest('.ekbarea')) return write({area: node.attrs.area === 'work' ? 'life' : 'work'});
        const di = e.target.closest('.ekbdi, .ekbdl');
        if(di){                              // ô ngày trong thẻ đang mở / nút hạn trên thẻ gập: chọn ngày mới, hoặc xoá để bỏ ngày đó
          const id = di.closest('.ekbk').dataset.id, f = di.dataset.f;
          const cur = (node.attrs.cards.find(c => c.id === id) || {})[f] || '';
          return o.pickDate(di, cur, v => {
            if(v && !/^\d{4}-\d\d-\d\d$/.test(v)) return;
            save(node.attrs.cards.map(c => {
              if(c.id !== id) return c;
              const {[f]: _, ...rest} = c;
              return v ? {...rest, [f]: v} : rest;
            }));
          });
        }
        const ln = e.target.closest('.ekbln');
        if(ln && node.attrs.area){           // bảng đã có loại: đưa thẳng lên bảng lớn cùng loại, khỏi hỏi
          const id = ln.closest('.ekbk').dataset.id;
          const c = withLive(node.attrs.cards).find(x => x.id === id); if(!c || c.tk) return;
          const tk = L.create(c, node.attrs.area);
          return save(node.attrs.cards.map(x => x.id === id ? {...x, tk} : x));
        }
        if(ln){
          menu = document.createElement('div');
          menu.className = 'ekbmenu'; menu.dataset.id = ln.closest('.ekbk').dataset.id;
          menu.innerHTML = '<button type="button" class="ekbmi" data-area="work"></button><button type="button" class="ekbmi" data-area="life"></button>';
          menu.children[0].textContent = o.linkWork; menu.children[1].textContent = o.linkLife;
          const r = ln.getBoundingClientRect(), b = dom.getBoundingClientRect();
          menu.style.top = (r.bottom - b.top + 4) + 'px';
          menu.style.right = (b.right - r.right) + 'px';
          dom.appendChild(menu);
          const off = ev => { if(menu && !menu.contains(ev.target) && !ev.target.closest?.('.ekbln')) closeMenu(); if(!menu) document.removeEventListener('pointerdown', off, true); };
          document.addEventListener('pointerdown', off, true);   // bấm ra ngoài bảng cũng đóng menu
          return;
        }
        const lk = e.target.closest('.ekblk');
        if(lk){ const c = node.attrs.cards.find(x => x.id === lk.closest('.ekbk').dataset.id); if(c && c.tk) L.open(c.tk); return; }
        const sb = e.target.closest('.ekbsb');
        if(sb){                              // ẩn / hiện danh sách việc con trên thẻ gập; nhớ theo từng thẻ
          const id = sb.closest('.ekbk').dataset.id;
          return save(node.attrs.cards.map(c => {
            if(c.id !== id) return c;
            const {sh, ...rest} = c;
            return sh ? rest : {...rest, sh: true};
          }));
        }
        const dt = e.target.closest('.ekbd');
        if(dt){                              // bật / tắt mô tả trên thẻ gập; nhớ theo từng thẻ
          const id = dt.closest('.ekbk').dataset.id;
          return save(node.attrs.cards.map(c => {
            if(c.id !== id) return c;
            const {dh, ...rest} = c;
            return dh ? rest : {...rest, dh: true};
          }));
        }
        const cp = e.target.closest('.ekbcp');
        if(cp){                              // ⧉ trên một thẻ đang chọn = chép cả loạt đang chọn
          const id = cp.closest('.ekbk').dataset.id;
          const list = sel.has(id) ? picked() : node.attrs.cards.filter(c => c.id === id); if(!list.length) return;
          copy(list);
          cp.textContent = o.copied; setTimeout(() => { cp.textContent = '⧉'; }, 1200);
          return;
        }
        const bc = e.target.closest('.ekbbc');
        if(bc){
          copy(picked());
          bc.textContent = o.copiedSel; setTimeout(() => { bc.textContent = o.copySel; }, 1500);
          return;
        }
        if(e.target.closest('.ekbbx')){ sel.clear(); return draw(); }
        const ca = e.target.closest('.ekbca');
        if(ca){
          // Chép cả bảng: clipboard có bản HTML của khối bảng (dán vào chữ trong trang khác = ProseMirror dựng lại
          // nguyên bảng, không kèm chữ gõ dở) và bản chữ (dán vào ô "+ Thêm" của bảng khác = gộp thẻ, giữ cột cũ).
          const cards = node.attrs.cards;
          kbClip = cards.map(c => ({...kbClipOf(c), s: c.s}));
          const box = document.createElement('div');
          box.setAttribute('data-kanban', JSON.stringify(cards));
          if(node.attrs.day || o.day) box.setAttribute('data-kbday', node.attrs.day || o.day);
          if(node.attrs.bid) box.setAttribute('data-kbid', node.attrs.bid);   // bản dán ra đồng bộ với bảng này
          if(node.attrs.area) box.setAttribute('data-kbarea', node.attrs.area);
          box.textContent = kbClipText(kbClip);
          const text = kbClipText(kbClip);
          const onCopy = ev => { ev.preventDefault(); ev.clipboardData.setData('text/html', box.outerHTML); ev.clipboardData.setData('text/plain', text); };
          document.addEventListener('copy', onCopy, {once: true, capture: true});
          let ok = false;
          try{ ok = document.execCommand('copy'); }catch(err){}
          document.removeEventListener('copy', onCopy, {capture: true});
          if(!ok) navigator.clipboard?.writeText(text).catch(() => {});
          document.querySelectorAll('.ekba').forEach(i => { i.placeholder = o.pastePh; });
          ca.textContent = '✓'; ca.title = o.copiedAll; ca.classList.add('ok');
          setTimeout(() => { ca.textContent = '⧉'; ca.title = o.copyAll; ca.classList.remove('ok'); }, 1500);
          return;
        }
        const x = e.target.closest('.ekbx');
        if(x){
          const id = x.closest('.ekbk').dataset.id;
          return save(node.attrs.cards.filter(c => c.id !== id));
        }
        const sx = e.target.closest('.ekbsx');
        if(sx){
          const sid = sx.closest('.ekbs').dataset.sid;
          return save(editSubs(sx.closest('.ekbk').dataset.id, sub => sub.filter(y => y.id !== sid)));
        }
        const k = e.target.closest('.ekbk');
        if(!k || k.classList.contains('on')) return;
        if(e.ctrlKey || e.metaKey || e.shiftKey){   // Ctrl / Shift + bấm: chọn hoặc bỏ chọn, không mở thẻ
          if(sel.has(k.dataset.id)) sel.delete(k.dataset.id); else sel.add(k.dataset.id);
          return draw();
        }
        sel.clear(); open = k.dataset.id; justOpened = true; draw();
      });

      const clearDrop = () => {
        if(ph) ph.remove(); ph = null; drop = null;
        dom.querySelectorAll('.ekbk.into').forEach(k => k.classList.remove('into'));
      };
      dom.addEventListener('dragstart', e => {
        const r = e.target.closest && e.target.closest('.ekbs');
        const k = !r && e.target.closest && e.target.closest('.ekbk'); if(!r && !k) return;
        kbDrag = r ? {dom, id: r.dataset.sid, from: r.closest('.ekbk').dataset.id} : {dom, id: k.dataset.id};
        (r || k).classList.add('drag');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-kanban', kbDrag.id);   // không mang chữ, để ô nhập nào cũng không nhận
      });
      dom.addEventListener('dragend', e => {
        e.target.closest && e.target.closest('.ekbs, .ekbk')?.classList.remove('drag');
        kbDrag = null; clearDrop();
      });
      dom.addEventListener('dragover', e => {
        if(kbDrag) e.stopPropagation();          // kéo thẻ trong bảng: không cho vạch thả của ProseMirror hiện lên
        const col = e.target.closest('.ekbc');
        if(!kbDrag || kbDrag.dom !== dom || !col) return;   // chỉ đổi chỗ trong cùng một bảng
        e.preventDefault();
        const y = e.clientY;
        // việc con kéo trong danh sách việc con của chính thẻ cha: đổi thứ tự giữa các việc con
        const sl = kbDrag.from && e.target.closest('.ekbsl');
        if(sl && sl.closest('.ekbk').dataset.id === kbDrag.from){
          dom.querySelectorAll('.ekbk.into').forEach(k => k.classList.remove('into'));
          const at = [...sl.querySelectorAll('.ekbs:not(.drag)')].find(r => { const b = r.getBoundingClientRect(); return y < b.top + b.height / 2; }) || null;
          drop = {sub: kbDrag.from, before: at ? at.dataset.sid : null};
          if(!ph){ ph = document.createElement('div'); ph.className = 'ekbp'; }
          if(at) sl.insertBefore(ph, at); else sl.appendChild(ph);
          return;
        }
        const list = col.querySelector(':scope > .ekbl');   // không lấy danh sách của ô lồng đầu cột
        const cards = [...list.querySelectorAll(':scope > .ekbk:not(.drag)')];
        // con trỏ nằm trên thẻ nào: mép trên / dưới = chèn trước / sau thẻ đó, giữa = thả vào làm việc con
        // (thẻ cha của chính việc con đang kéo thì chỉ có trước / sau)
        let at = null, into = null;
        const on = cards.find(k => { const r = k.getBoundingClientRect(); return y >= r.top && y < r.bottom; });
        if(on){
          const r = on.getBoundingClientRect(), p = (y - r.top) / r.height;
          const edge = on.dataset.id === kbDrag.from ? .5 : .3;
          if(p < edge) at = on;
          else if(p > 1 - edge) at = cards[cards.indexOf(on) + 1] || null;
          else into = on;
        } else at = cards.find(k => y < k.getBoundingClientRect().top) || null;
        dom.querySelectorAll('.ekbk.into').forEach(k => { if(k !== into) k.classList.remove('into'); });
        if(into){
          if(ph) ph.remove();
          into.classList.add('into');
          drop = {into: into.dataset.id};
          return;
        }
        drop = {s: col.dataset.s, before: at ? at.dataset.id : null};
        if(!ph){ ph = document.createElement('div'); ph.className = 'ekbp'; }
        if(at) list.insertBefore(ph, at); else list.appendChild(ph);
      });
      dom.addEventListener('drop', e => {
        if(kbDrag) e.stopPropagation();
        if(!kbDrag || kbDrag.dom !== dom || !drop) return;
        e.preventDefault();
        const d = drop, {id, from} = kbDrag;
        kbDrag = null; clearDrop();
        // rút thứ đang kéo ra khỏi chỗ cũ
        let rest = node.attrs.cards, item;
        if(from){
          item = (rest.find(c => c.id === from)?.sub || []).find(x => x.id === id); if(!item) return;
          rest = rest.map(c => c.id === from ? {...c, sub: c.sub.filter(x => x.id !== id)} : c);
        } else {
          item = rest.find(c => c.id === id); if(!item) return;
          rest = rest.filter(c => c.id !== id);
        }
        if(d.sub){
          return save(rest.map(c => {
            if(c.id !== d.sub) return c;
            const sub = [...c.sub], i = d.before ? sub.findIndex(x => x.id === d.before) : -1;
            sub.splice(i < 0 ? sub.length : i, 0, item);
            return {...c, sub};
          }));
        }
        if(d.into){
          if(d.into === from) return;
          const adds = from ? [item] : kbToSubs(item);
          return save(rest.map(c => c.id === d.into ? {...c, sub: [...(c.sub || []), ...adds]} : c));
        }
        const moved = from ? kbToCard(item, d.s) : {...item, s: d.s};
        let i = d.before ? rest.findIndex(c => c.id === d.before) : -1;
        if(i < 0){                               // cuối cột: ngay sau thẻ cuối của cột đó
          const last = rest.map(c => c.s).lastIndexOf(d.s);
          i = last < 0 ? rest.length : last + 1;
        }
        rest = [...rest]; rest.splice(i, 0, moved);
        save(rest);
      });

      return {
        dom,
        ignoreMutation: () => true,
        stopEvent: () => true,               // mọi thao tác trong bảng do bảng tự lo, ProseMirror đứng ngoài
        update(n){
          if(n.type !== node.type) return false;
          const same = JSON.stringify(n.attrs.cards) === JSON.stringify(node.attrs.cards) && n.attrs.day === node.attrs.day
            && n.attrs.area === node.attrs.area && JSON.stringify(n.attrs.prefs) === JSON.stringify(node.attrs.prefs);
          node = n;
          if(!same) draw();
          else dom.querySelectorAll('.ekba').forEach(i => {   // chỉ chữ gõ dở đổi (vd. Ctrl+Z): khỏi vẽ lại kẻo mất con trỏ
            if(i !== document.activeElement){ i.value = curDrafts()[i.closest('.ekbc').dataset.s] || ''; fit(i); }
          });
          return true;
        },
        destroy(){ try{ flushDrafts(); }catch(e){} },   // trang đóng lại giữa lúc đang gõ dở
      };
    };
  },
});

/* Tab trong ô bảng: phím Tab của bảng (sang ô kế) chạy trước phím Tab của danh sách, nên trong ô không thụt mục được.
   Ưu tiên cao hơn bảng: con trỏ đang ở một mục danh sách trong ô thì Tab thụt vào, Shift+Tab đưa ra;
   mục đầu tiên không thụt được thì đứng yên chứ không nhảy ô, kẻo đang gõ danh sách lại văng sang ô khác.
   Ngoài danh sách thì để bảng làm như cũ. */
const LIST_ITEMS = ['listItem', 'taskItem'];
const CellListTab = Extension.create({
  name: 'cellListTab',
  priority: 1000,
  addKeyboardShortcuts(){
    const item = () => {
      const $f = this.editor.state.selection.$from;
      let li = null, cell = false;
      for(let d = $f.depth; d > 0; d--){
        const n = $f.node(d).type.name;
        if(!li && LIST_ITEMS.includes(n)) li = n;
        if(n === 'tableCell' || n === 'tableHeader'){ cell = true; break; }
      }
      return cell && li;
    };
    return {
      Tab: () => { const li = item(); if(!li) return false; this.editor.commands.sinkListItem(li); return true; },
      'Shift-Tab': () => { const li = item(); if(!li) return false; this.editor.commands.liftListItem(li); return true; },
    };
  },
});

/* chữ trơn dán vào (Sublime, Notepad, VS Code…) -> các khối của trình soạn thảo, theo đúng những gì gõ tay cũng tự đổi:
   "- " / "* " / "+ " gạch đầu dòng, "1. " danh sách số, "[ ] " / "- [x] " việc cần làm (thụt đầu dòng = mục con),
   "# " tới "### " tiêu đề, "> " trích dẫn, ``` khối code, "---" đường kẻ; trong dòng: **đậm**, *nghiêng*, ~~gạch~~, `code`, link.
   Dòng thường thì như trước: mỗi dòng một đoạn, dòng trắng giữ thành đoạn trống, thụt đầu dòng đổi sang dấu cách cứng
   (không thì mở lại trang HTML sẽ nuốt mất). Ctrl+Shift+V thì dán nguyên chữ, không đổi gì. */
const MD_INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*|__[^_\n]+__)|(~~[^~\n]+~~)|(\*[^*\s][^*\n]*\*|(?<!\w)_[^_\s][^_\n]*_(?!\w))|(https?:\/\/[^\s<>]*[^\s<>()[\]{}.,;:!?'"])/g;
function mdInline(schema, s, marks){
  const out = [];
  let at = 0, m;
  const re = new RegExp(MD_INLINE.source, 'g');
  const add = (t, ms) => { if(t) out.push(schema.text(t, ms)); };
  while((m = re.exec(s))){
    add(s.slice(at, m.index), marks);
    const [w] = m;
    if(m[1]) add(w.slice(1, -1), schema.marks.code.create().addToSet(marks));
    else if(m[2]) out.push(...mdInline(schema, w.slice(2, -2), schema.marks.bold.create().addToSet(marks)));
    else if(m[3]) out.push(...mdInline(schema, w.slice(2, -2), schema.marks.strike.create().addToSet(marks)));
    else if(m[4]) out.push(...mdInline(schema, w.slice(1, -1), schema.marks.italic.create().addToSet(marks)));
    else add(w, schema.marks.link.create({href: w}).addToSet(marks));
    at = m.index + w.length;
  }
  add(s.slice(at), marks);
  return out;
}
const mdIndent = s => s.replace(/\t/g, '    ').length;
const MD_ITEM = /^([ \t]*)(?:([-*+])|(\d+)[.)])[ \t]+(?:\[([ xX])\][ \t]+)?(.*)$/;
const MD_TASK = /^([ \t]*)\[([ xX])\][ \t]+(.*)$/;
function mdItem(ln){
  let m = ln.match(MD_TASK);
  if(m) return {ind: mdIndent(m[1]), kind: 'task', x: m[2] !== ' ', t: m[3]};
  m = ln.match(MD_ITEM); if(!m) return null;
  if(m[4] !== undefined) return {ind: mdIndent(m[1]), kind: 'task', x: m[4] !== ' ', t: m[5]};
  return {ind: mdIndent(m[1]), kind: m[2] ? 'ul' : 'ol', n: m[3] ? +m[3] : 1, t: m[5]};
}
// các mục liền nhau -> danh sách lồng theo thụt đầu dòng; đổi loại (gạch / số / việc) ở cùng tầng thì sang danh sách mới
function mdLists(schema, items, marks){
  const N = schema.nodes, out = [];
  let i = 0;
  const level = ind => {
    const lists = [];
    while(i < items.length && items[i].ind >= ind){
      const kind = items[i].kind, start = items[i].n, myInd = items[i].ind, kids = [];
      while(i < items.length && items[i].ind === myInd && items[i].kind === kind){
        const it = items[i++];
        const body = [N.paragraph.create(null, mdInline(schema, it.t, marks))];
        if(i < items.length && items[i].ind > myInd) body.push(...level(items[i].ind));
        kids.push(kind === 'task' ? N.taskItem.create({checked: it.x}, body) : N.listItem.create(null, body));
      }
      lists.push(kind === 'task' ? N.taskList.create(null, kids)
        : kind === 'ol' ? N.orderedList.create({start}, kids) : N.bulletList.create(null, kids));
    }
    return lists;
  };
  while(i < items.length) out.push(...level(items[i].ind));
  return out;
}
function mdBlocks(schema, text, marks){
  const N = schema.nodes, lines = text.replace(/\r\n?/g, '\n').split('\n'), out = [];
  const para = ln => N.paragraph.create(null, ln ? mdInline(schema,
    ln.replace(/^[ \t]+/, w => w.replace(/\t/g, '    ').replace(/ /g, '\u00a0')), marks) : null);
  for(let i = 0; i < lines.length;){
    const ln = lines[i];
    let m;
    if((m = ln.match(/^[ \t]*```(\S*)/))){             // khối code: giữ nguyên chữ tới dấu ``` đóng
      const body = [];
      for(i++; i < lines.length && !/^[ \t]*```/.test(lines[i]); i++) body.push(lines[i]);
      i++;
      out.push(N.codeBlock.create(m[1] ? {language: m[1]} : null, body.length ? schema.text(body.join('\n')) : null));
      continue;
    }
    if(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/.test(ln)){ out.push(N.horizontalRule.create()); i++; continue; }
    if((m = ln.match(/^(#{1,6})[ \t]+(.*)$/))){
      out.push(N.heading.create({level: Math.min(3, m[1].length)}, mdInline(schema, m[2], marks))); i++; continue;
    }
    if(/^[ \t]*>/.test(ln)){
      const body = [];
      for(; i < lines.length && /^[ \t]*>/.test(lines[i]); i++) body.push(para(lines[i].replace(/^[ \t]*>[ \t]?/, '')));
      out.push(N.blockquote.create(null, body));
      continue;
    }
    if(mdItem(ln)){
      const items = [];
      for(let it; i < lines.length && (it = mdItem(lines[i])); i++) items.push(it);
      out.push(...mdLists(schema, items, marks));
      continue;
    }
    out.push(para(ln)); i++;
  }
  return out;
}
// HTML mà trình soạn code chép kèm (VS Code, JetBrains…) chỉ là chữ tô màu: dán như chữ trơn để các dòng "- " thành danh sách
const codeHTML = h => /white-space:\s*pre|^\s*(<meta[^>]*>\s*)?<pre\b/i.test(h) && !/<(p|li|h[1-6]|table|img|br)\b/i.test(h);
// link tới trang trong app: trả '#n/…' (ghi chú) | '#j/…' (nhật ký), không phải thì null.
// Chrome chép HTML vào clipboard thì đổi link thành dạng đầy đủ (http://máy-này/#n/…), nên nhận cả dạng đó
const pageHref = href => {
  try{ const u = new URL(href, location.href); return u.origin === location.origin && /^#[nj]\//.test(u.hash) ? u.hash : null; }
  catch(e){ return null; }
};
let pasteMd = false;                         // dán chữ trơn do handlePaste chuyển sang: vẫn đổi kiểu markdown
let mdSlice = null;                          // slice clipboardTextParser vừa dựng, chờ transformPasted trả lại nguyên vẹn

const CMD = {
  p:   c => c.setParagraph(),
  h1:  c => c.toggleHeading({level:1}),
  h2:  c => c.toggleHeading({level:2}),
  h3:  c => c.toggleHeading({level:3}),
  td:  c => c.toggleTaskList(),
  ul:  c => c.toggleBulletList(),
  ol:  c => c.toggleOrderedList(),
  q:   c => c.toggleBlockquote(),
  pre: c => c.toggleCodeBlock(),
  hr:  c => c.setHorizontalRule(),
  kbp: c => c,                               // chỉ xoá "/lệnh"; app mở lịch chọn ngày rồi gọi TT.kbInsert
  img: c => c,                               // chỉ xoá "/lệnh"; app mở hộp chọn file rồi gọi TT.image
  file: c => c,                              // như trên, rồi gọi TT.file
  kb:  c => c.insertContent({type:'kanban', attrs:{area:'work'}}),
  kbl: c => c.insertContent({type:'kanban', attrs:{area:'life'}}),
  tbl:   c => c.insertTable({rows:3, cols:3, withHeaderRow:true}),
  plink: c => c,                             // chỉ xoá "/lệnh"; app mở khung chọn trang rồi gọi TT.pageLink
  // các lệnh dưới chạy từ menu tay nắm của bảng (TT.tableCmd), không có trong menu "/"
  tbRow: c => c.addRowAfter(),
  tbRowUp: c => c.addRowBefore(),
  tbCol: c => c.addColumnAfter(),
  tbColL: c => c.addColumnBefore(),
  tbDelRow: c => c.deleteRow(),
  tbDelCol: c => c.deleteColumn(),
  tbDel: c => c.deleteTable(),
  tbMerge: c => c.mergeCells(),              // gộp các ô đang chọn (kéo chuột qua nhiều ô)
  tbSplit: c => c.splitCell(),               // tách ô đã gộp về lại từng ô
};
const MARK = {
  bold:   c => c.toggleBold(),
  italic: c => c.toggleItalic(),
  strike: c => c.toggleStrike(),
  code:   c => c.toggleCode(),
};
const ACTIVE = {
  p:'paragraph', td:'taskList', ul:'bulletList', ol:'orderedList',
  q:'blockquote', pre:'codeBlock', bold:'bold', italic:'italic', strike:'strike', code:'code',
};

window.TT = {
  /* imgSrc(mã) -> Promise<URL> (dùng cho cả ảnh lẫn file đính kèm);
     fileCanView(tên) -> có nút Xem không; fileView(attrs) -> Promise<false nếu không tìm thấy file>;
     onFiles(files, pos) nhận file được dán / kéo thả vào (pos = null: tại con trỏ);
     kanban = {cols, day, fmtDay, addPh, addT, pastePh, delT, copyT, copied, editT, descPh, subPh, subT, selN, copySel, copiedSel, clearSel, copyAll, copiedAll, descHide, descShow, subHide, subShow, link, linkT, linkWork, linkLife, linkedT}:
     link = {get(id) -> {t, s, sub, area} | null, create(thẻ, 'work' | 'life') -> id task, update(id, {t?, s?, sub?}), open(id)} tên / màu cột và chữ trên bảng việc trong trang */
  create(el, {content = '', placeholder = '', onChange = () => {}, imgSrc, fileCanView, fileView, onFiles = () => {}, kanban, onPageLink} = {}){
    return new Editor({
      element: el,
      content,
      extensions: [
        StarterKit.configure({
          heading: {levels:[1,2,3]},
          link: false,                       // dùng cấu hình Link riêng bên dưới
        }),
        TaskList,
        TaskItem.configure({nested:true}),
        Link.configure({
          openOnClick:true, autolink:true, defaultProtocol:'https',
          HTMLAttributes:{target:'_blank', rel:'noopener noreferrer'},
        }),
        Placeholder.configure({placeholder}),
        TrailingNode,                        // luôn có 1 đoạn trống ở cuối để bấm vào
        Img.configure(imgSrc ? {src: imgSrc} : {}),
        FileBlock.configure({
          ...(imgSrc ? {src: imgSrc} : {}),
          ...(fileView ? {canView: fileCanView, view: fileView} : {}),
        }),
        Kanban.configure(kanban || {}),
        TableKit.configure({table: {resizable: true, cellMinWidth: 60}}),   // kéo mép cột để giãn; Tab ở ô cuối thêm dòng mới
        CellListTab,
      ],
      editorProps:{
        attributes:{ class:'ed' },
        // link tới trang trong app (#n/… ghi chú, #j/… nhật ký): chuyển trang thay vì mở tab mới như link thường.
        // editorProps chạy trước plugin của Link nên chặn được ở đây
        handleClick(view, pos, e){
          const a = e.button === 0 && e.target.closest && e.target.closest('a[href]');
          const h = a && pageHref(a.getAttribute('href'));
          if(!h || !onPageLink) return false;
          onPageLink(h);
          return true;
        },
        // dán link trang (nút 🔗): đưa về dạng ngắn #n/… như lúc chèn bằng /lệnh
        transformPastedHTML(html){
          return html.replace(/href="([^"]*)"/g, (m, h) => { const p = pageHref(h.replace(/&amp;/g, '&')); return p ? `href="${p}"` : m; });
        },
        handlePaste(view, e){
          const cd = e.clipboardData;
          const files = [...(cd && cd.files || [])];
          if(files.length){ onFiles(files, null); return true; }
          const html = cd && cd.getData('text/html'), text = cd && cd.getData('text/plain');
          if(!pasteMd && html && text && codeHTML(html) && !view.state.selection.$from.parent.type.spec.code){
            pasteMd = true;
            try{ view.pasteText(text); } finally{ pasteMd = false; }
            return true;
          }
          return false;
        },
        // ProseMirror mở hết cỡ mọi slice dán vào, nên mục đầu của danh sách bị nhập vào dòng đang gõ: trả lại slice đúng như mdBlocks dựng
        transformPasted(slice){
          const s = mdSlice; mdSlice = null;
          return s || slice;
        },
        /* dán chữ trơn: xem mdBlocks. Mặc định ProseMirror gộp các dòng trắng liền nhau, nên đoạn văn dán vào dính hết vào nhau. */
        clipboardTextParser(text, $ctx, plain){
          const {schema} = $ctx.parent.type, marks = $ctx.marks();
          const nodes = plain && !pasteMd
            ? text.replace(/\r\n?/g, '\n').split('\n').map(ln => schema.nodes.paragraph.create(null, ln ? schema.text(
              ln.replace(/^[ \t]+/, w => w.replace(/\t/g, '    ').replace(/ /g, '\u00a0')), marks) : null))
            : mdBlocks(schema, text, marks);
          // đầu / cuối là đoạn thường thì mở ra để nối vào đoạn đang gõ; là danh sách, tiêu đề… thì để nguyên khối
          const open = n => n && n.type === schema.nodes.paragraph ? 1 : 0;
          return (mdSlice = new Slice(Fragment.from(nodes), open(nodes[0]), open(nodes[nodes.length - 1])));
        },
        handleDrop(view, e, slice, moved){
          const files = moved ? [] : [...(e.dataTransfer && e.dataTransfer.files || [])];
          if(!files.length) return false;
          const p = view.posAtCoords({left:e.clientX, top:e.clientY});
          onFiles(files, p ? p.pos : null); return true;
        },
      },
      onUpdate({editor}){ onChange(editor.getHTML()); },
    });
  },

  /* đổi loại khối hiện tại; range để xoá đoạn "/lệnh" vừa gõ */
  block(editor, key, range){
    let c = editor.chain().focus();
    if(range) c = c.deleteRange(range);
    (CMD[key] || CMD.p)(c).run();
  },

  /* chèn ảnh theo mã; pos = null thì chèn tại con trỏ */
  image(editor, ids, pos){
    if(editor.isDestroyed || !ids.length) return;
    const nodes = ids.map(id => ({type:'image', attrs:{id}}));
    const c = editor.chain().focus();
    // xử lý ảnh mất một lúc, nội dung có thể đã ngắn đi -> kẹp vị trí lại
    (pos == null ? c.insertContent(nodes) : c.insertContentAt(Math.min(pos, editor.state.doc.content.size), nodes)).run();
  },

  /* chèn file đính kèm; items = [{file: mã, name, size}] */
  file(editor, items, pos){
    if(editor.isDestroyed || !items.length) return;
    const nodes = items.map(a => ({type:'file', attrs:a}));
    const c = editor.chain().focus();
    (pos == null ? c.insertContent(nodes) : c.insertContentAt(Math.min(pos, editor.state.doc.content.size), nodes)).run();
  },

  /* các bảng việc trong trang: [{bid, cards, area}], theo thứ tự trong trang */
  kbBoards(editor){
    const out = [];
    editor.state.doc.descendants(n => { if(n.type.name === 'kanban') out.push({bid: n.attrs.bid, cards: n.attrs.cards, area: n.attrs.area}); });
    return out;
  },
  /* thay thẻ và loại của mọi bảng mang mã bid (bản sửa ở chỗ khác); không vào Ctrl+Z của trang này */
  kbSet(editor, bid, cards, area){
    if(editor.isDestroyed) return;
    const tr = editor.state.tr, j = JSON.stringify(cards);
    editor.state.doc.descendants((n, pos) => {
      if(n.type.name === 'kanban' && n.attrs.bid === bid && (JSON.stringify(n.attrs.cards) !== j || n.attrs.area !== area))
        tr.setNodeMarkup(pos, null, {...n.attrs, cards, area});
    });
    if(tr.docChanged) editor.view.dispatch(tr.setMeta('addToHistory', false));
  },
  /* chèn các bảng tại con trỏ, giữa hai bảng có hai dòng trống; boards = [{bid, day, cards, area}] */
  kbInsert(editor, boards){
    if(editor.isDestroyed || !boards.length) return;
    const gap = [{type: 'paragraph'}, {type: 'paragraph'}];
    editor.chain().focus().insertContent(boards.flatMap((b, i) =>
      [...(i ? gap : []), {type: 'kanban', attrs: {bid: b.bid, day: b.day, cards: b.cards, area: b.area || ''}}])).run();
  },

  mark(editor, key){
    if(key === 'link') return this.link(editor);
    let c = editor.chain().focus();
    (MARK[key] || MARK.bold)(c).run();
  },

  link(editor){
    const cur = editor.getAttributes('link').href || 'https://';
    const url = window.prompt('Dán link vào đây:', cur);
    if(url === null) return;
    if(!url.trim()) return editor.chain().focus().extendMarkRange('link').unsetLink().run();
    editor.chain().focus().extendMarkRange('link').setLink({href:url.trim()}).run();
  },

  active(editor, key){
    const n = ACTIVE[key];
    if(!n) return false;
    if(key === 'h1' || key === 'h2' || key === 'h3')
      return editor.isActive('heading', {level:+key[1]});
    return editor.isActive(n);
  },

  /* chèn link tới trang khác trong app tại con trỏ, kèm một dấu cách không thuộc link để gõ tiếp */
  pageLink(editor, href, text){
    if(editor.isDestroyed) return;
    editor.chain().focus().insertContent([{type: 'text', text, marks: [{type: 'link', attrs: {href}}]}, {type: 'text', text: ' '}]).run();
  },

  /* nút + và tay nắm của bảng (xem editor.js): đặt con trỏ vào ô cell (phần tử td / th) rồi chạy lệnh key của CMD */
  tableCmd(editor, cell, key){
    if(editor.isDestroyed || (cell && !cell.isConnected)) return;
    // gộp ô chạy trên vùng ô đang chọn, đặt con trỏ vào một ô là mất vùng chọn đó
    const c = key === 'tbMerge' || !cell ? editor.chain().focus() : editor.chain().focus().setTextSelection(editor.view.posAtDOM(cell, 0) + 1);
    (CMD[key] || CMD.p)(c).run();
  },
  // đang chọn nhiều ô liền nhau thì gộp được
  canMerge(editor){ return !editor.isDestroyed && editor.can().mergeCells(); },

  /* đang gõ "/lệnh" ở đâu? trả về vị trí để xoá và chữ đã gõ để lọc menu */
  slash(editor){
    const {state} = editor, sel = state.selection;
    if(!sel.empty) return null;
    const $from = sel.$from;
    if(!$from.parent.isTextblock || $from.parent.type.name === 'codeBlock') return null;
    const text = state.doc.textBetween($from.start(), sel.from, '\n', '\0');
    const m = text.match(/(?:^|\s)\/([^\/\s]{0,18})$/);
    if(!m) return null;
    return {from: sel.from - m[1].length - 1, to: sel.from, q: m[1]};
  },

  /* toạ độ con trỏ trên màn hình, để đặt menu và thanh công cụ */
  caretRect(editor){
    try{
      const c = editor.view.coordsAtPos(editor.state.selection.from);
      return {left:c.left, top:c.top, bottom:c.bottom};
    }catch(e){ return null; }
  },
  /* hình chữ nhật bao vùng bôi đen — lấy từ ProseMirror nên không phụ thuộc selection của DOM */
  selRect(editor){
    const sel = editor.state.selection;
    if(sel.empty || sel.node) return null;   // chọn cả một khối (bảng việc, ảnh, file): không có chữ để định dạng
    try{
      const a = editor.view.coordsAtPos(sel.from), b = editor.view.coordsAtPos(sel.to);
      const left = Math.min(a.left, b.left);
      const right = Math.max(a.right != null ? a.right : a.left, b.right != null ? b.right : b.left);
      return {left, top: Math.min(a.top, b.top), width: Math.max(1, right - left)};
    }catch(e){ return null; }
  },
};
