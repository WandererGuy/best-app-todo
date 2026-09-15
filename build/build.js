/* Build bundle TipTap ra vendor/tiptap.js (index.html nạp bằng <script src>).
   Chạy lại bất cứ lúc nào:  node build/build.js                              */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'vendor', 'tiptap.js');

esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'editor.src.js')],
  bundle: true, minify: true, format: 'iife', target: 'es2019',
  outfile: OUT, legalComments: 'none',
});

console.log('vendor/tiptap.js KB:', Math.round(fs.statSync(OUT).size / 1024));
