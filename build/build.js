/* Build bundle TipTap rồi nhúng thẳng vào index.html giữa hai mốc đánh dấu.
   Chạy lại bất cứ lúc nào:  node build/build.js                              */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'bundle.js');
const HTML = path.join(root, 'index.html');
const A = '<!--TIPTAP-START-->';
const B = '<!--TIPTAP-END-->';

esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'editor.src.js')],
  bundle: true, minify: true, format: 'iife', target: 'es2019',
  outfile: OUT, legalComments: 'none',
});

const js = fs.readFileSync(OUT, 'utf8').trim();
let html = fs.readFileSync(HTML, 'utf8');
const i = html.indexOf(A), j = html.indexOf(B);
if (i < 0 || j < 0) { console.error('Không tìm thấy mốc TIPTAP trong index.html'); process.exit(1); }

html = html.slice(0, i + A.length) + '\n<script>' + js + '</script>\n' + html.slice(j);
fs.writeFileSync(HTML, html);
console.log('bundle KB:', Math.round(js.length / 1024), '| index.html KB:', Math.round(html.length / 1024));
