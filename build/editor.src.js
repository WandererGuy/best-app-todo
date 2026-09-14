/* Nguồn để build bundle trình soạn thảo (TipTap/ProseMirror).
   Build:  node build/build.js   -> nhúng thẳng vào index.html
   App chỉ gọi qua window.TT, không đụng trực tiếp vào ProseMirror. */
import { Editor } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { TaskList, TaskItem } from '@tiptap/extension-list';
import { Link } from '@tiptap/extension-link';
import { Placeholder, TrailingNode } from '@tiptap/extensions';

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
  create(el, {content = '', placeholder = '', onChange = () => {}} = {}){
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
      ],
      editorProps:{ attributes:{ class:'ed' } },
      onUpdate({editor}){ onChange(editor.getHTML()); },
    });
  },

  /* đổi loại khối hiện tại; range để xoá đoạn "/lệnh" vừa gõ */
  block(editor, key, range){
    let c = editor.chain().focus();
    if(range) c = c.deleteRange(range);
    (CMD[key] || CMD.p)(c).run();
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
