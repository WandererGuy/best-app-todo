/* Nguồn để build bundle trình soạn thảo (TipTap/ProseMirror).
   Build:  node build/build.js   -> nhúng thẳng vào index.html
   App chỉ gọi qua window.TT, không đụng trực tiếp vào ProseMirror. */
import { Editor, Node } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Link } from '@tiptap/extension-link';
import { Placeholder, TrailingNode } from '@tiptap/extensions';

/* ảnh: nội dung chỉ lưu mã ảnh (data-img), còn file ảnh do app cất ở chỗ khác.
   Lúc hiển thị hỏi app qua options.src(mã) -> URL. */
const Img = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addOptions(){ return {src: () => Promise.resolve('')}; },
  addAttributes(){
    return {id: {default: null, parseHTML: el => el.getAttribute('data-img'), renderHTML: a => ({'data-img': a.id})}};
  },
  parseHTML(){ return [{tag: 'img[data-img]'}]; },
  renderHTML({HTMLAttributes}){ return ['img', HTMLAttributes]; },
  addNodeView(){
    return ({node}) => {
      const dom = document.createElement('img');
      dom.className = 'eimg'; dom.alt = 'Không tìm thấy ảnh';
      this.options.src(node.attrs.id).then(u => { if(u) dom.src = u; else dom.classList.add('miss'); });
      return {dom};
    };
  },
});

/* file đính kèm: như ảnh, nội dung chỉ lưu mã + tên + cỡ; file thật do app cất.
   Hiện thành thẻ có nút tải về, bấm thì hỏi app qua options.src(mã) -> URL.
   Nút Xem chỉ có khi app bảo xem được (options.canView(tên)); bấm thì app mở qua options.view(attrs). */
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
  img: c => c,                               // chỉ xoá "/lệnh"; app mở hộp chọn file rồi gọi TT.image
  file: c => c,                              // như trên, rồi gọi TT.file
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
     onFiles(files, pos) nhận file được dán / kéo thả vào (pos = null: tại con trỏ) */
  create(el, {content = '', placeholder = '', onChange = () => {}, imgSrc, fileCanView, fileView, onFiles = () => {}} = {}){
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
      ],
      editorProps:{
        attributes:{ class:'ed' },
        handlePaste(view, e){
          const files = [...(e.clipboardData && e.clipboardData.files || [])];
          if(!files.length) return false;
          onFiles(files, null); return true;
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
    if(sel.empty) return null;
    try{
      const a = editor.view.coordsAtPos(sel.from), b = editor.view.coordsAtPos(sel.to);
      const left = Math.min(a.left, b.left);
      const right = Math.max(a.right != null ? a.right : a.left, b.right != null ? b.right : b.left);
      return {left, top: Math.min(a.top, b.top), width: Math.max(1, right - left)};
    }catch(e){ return null; }
  },
};
