/* --- khu vườn: mỗi phiên đủ giờ trồng một cây thuộc loài đã chọn; phiên huỷ giữa chừng để lại cây héo.
   Mỗi loài 3 cấp theo số phút: dưới 15, 15 tới dưới 40, từ 40. Cây vẽ bằng SVG, gốc ở (0, 0), cấp 3 cao chừng 100 đơn vị.
   Nét vẽ: mọi hình đều nhận nguồn sáng từ góc trái trên — tán lá là nhiều cụm lá chồng nhau (cụm sau tối, cụm trước sáng),
   thân có vân vỏ và vệt sáng bên trái, bóng đổ lệch sang phải dưới, vài chiếc lá rụng nằm bẹt dưới gốc.
   Gradient dùng chung, khai báo một lần trong #gdefs: g-<loài> là tông vừa, g-<loài>-t sáng (cụm trước), g-<loài>-b tối (cụm sau). --- */
const GPAL = {   // sáng, vừa, tối, viền
  leaf:['#b5ec8e', '#62bd5e', '#2f7d3a', '#1f5a28'], leafD:['#86c96b', '#3f9a4a', '#22632d', '#184a21'],
  pine:['#8fdca6', '#3f9f68', '#1f6b44', '#154d31'], pink:['#ffe0ec', '#f7a3c6', '#d0628f', '#a1406a'],
  pinkD:['#f7b8d2', '#e27aa6', '#b44c78', '#8c3659'], orange:['#ffe0a3', '#ffa543', '#e0602a', '#a8461b'],
  red:['#ffbfa8', '#ef6a42', '#b8321f', '#862414'], lime:['#f4f9a8', '#bcd95f', '#7ea33a', '#5a7a25'],
  cactus:['#b3eab0', '#56b566', '#2f7a40', '#225c2f'], flower:['#ffd1e3', '#f06292', '#c2185b', '#8e1045']};
const GLIN = {bark:['#b08255', '#6b4428'], birch:['#ffffff', '#d3cdbf'], bamboo:['#cde896', '#6f9f34'],
  palm:['#c9a886', '#8a6a4f'], dead:['#a8988a', '#6d5d50'], stone:['#dcd6cc', '#9d958a']};
// vân vỏ và vệt sáng cho từng loại thân: [màu vân tối, màu vệt sáng]
const GBARK = {bark:['#4f3320', '#d8b189'], birch:['#b9b1a0', '#ffffff'], dead:['#5f5044', '#d0c3b5'],
  bamboo:['#4d6f22', '#e6f5b4'], palm:['#5e452f', '#e4c9a6']};
document.body.insertAdjacentHTML('beforeend', `<svg id="gdefs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  ${Object.entries(GPAL).map(([k, [l, m, d]]) => `<radialGradient id="g-${k}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${l}"/>
    <stop offset=".5" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></radialGradient>
    <radialGradient id="g-${k}-t" cx=".34" cy=".28" r=".8"><stop offset="0" stop-color="${l}"/><stop offset="1" stop-color="${m}"/></radialGradient>
    <radialGradient id="g-${k}-b" cx=".34" cy=".28" r=".8"><stop offset="0" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></radialGradient>`).join('')}
  ${Object.entries(GLIN).map(([k, [l, d]]) => `<linearGradient id="g-${k}" x2="1"><stop offset=".15" stop-color="${l}"/><stop offset=".9" stop-color="${d}"/></linearGradient>`).join('')}
  <radialGradient id="g-shadow"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="g-grass" x1=".2" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#a6e07a"/><stop offset="1" stop-color="#6fb957"/></linearGradient>
  <linearGradient id="g-lip" x2="1"><stop offset=".45" stop-color="#5fa845"/><stop offset=".55" stop-color="#4b8c38"/></linearGradient>
  <linearGradient id="g-dirt" x2="1"><stop offset=".45" stop-color="#a87650"/><stop offset=".55" stop-color="#855a3a"/></linearGradient>
  <linearGradient id="g-dirtD" x2="1"><stop offset=".45" stop-color="#83573a"/><stop offset=".55" stop-color="#65422b"/></linearGradient>
</defs></svg>`);
const gR = v => Math.round(v * 10) / 10;
const gA = o => o < 1 ? ` opacity="${o}"` : '';
const gE = (x, y, rx, ry, f, o = 1) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"${gA(o)}/>`;
const gS = (d, c, w, o = 1) => `<path d="${d}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"${gA(o)}/>`;
// tô khối bằng gradient, viền mềm cùng tông
const gF = (d, k, w = 1.4) => `<path d="${d}" fill="url(#g-${k})"${GPAL[k] ? ` stroke="${GPAL[k][3]}" stroke-width="${w}" stroke-opacity=".45" stroke-linejoin="round"` : ''}/>`;
// bóng dưới gốc: lệch sang phải dưới cho khớp nguồn sáng, thêm một vệt đậm sát chân
const gShadow = (rx, ry = rx * .3) => gE(gR(rx * .2), gR(ry * .12), rx, ry, 'url(#g-shadow)')
  + gE(gR(rx * .12), 0, gR(rx * .45), gR(ry * .52), '#000', .17);
// nhiễu tiền định: cùng seed thì cùng hình, nên vẽ lại không xáo hình
const gRnd = seed => { let h = (Math.imul(seed || 1, 2654435761) >>> 0) || 7;
  return () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32; };
// đường cong kín trơn đi qua các điểm (Catmull-Rom đổi sang Bézier)
const gSmooth = pts => {
  const n = pts.length; let d = `M${gR(pts[0][0])} ${gR(pts[0][1])}`;
  for(let i = 0; i < n; i++){
    const [p0, p1, p2, p3] = [pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    d += `C${gR(p1[0] + (p2[0] - p0[0]) / 6)} ${gR(p1[1] + (p2[1] - p0[1]) / 6)} ${gR(p2[0] - (p3[0] - p1[0]) / 6)} ${gR(p2[1] - (p3[1] - p1[1]) / 6)} ${gR(p2[0])} ${gR(p2[1])}`;
  }
  return d + 'z';
};
// khối lá: mép phồng lên thành vài múi to rồi gợn thêm nhiễu nhỏ, nên không ra hình bánh răng đều
const gBlob = (x, y, rx, ry, n = 18, wob = .08, seed = 0) => {
  const rnd = gRnd(seed || Math.round(x * 131 + y * 17 + rx * 7 + ry * 3)), ph = rnd() * 6.28;
  return gSmooth(Array.from({length:n}, (_, i) => {
    const t = i / n * 2 * Math.PI - Math.PI / 2, k = 1 + wob * (Math.sin(t * 5 + ph) * .62 + (rnd() - .5) * .8);
    return [x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k];
  }));
};
const gLeaf = (x, y, deg, s, k, g = '') => `<g transform="translate(${x} ${y}) rotate(${deg}) scale(${s})">
  <path d="M0 0C4-6 11-6 15 0C11 6 4 6 0 0z" fill="url(#g-${k}${g})" stroke="${GPAL[k][3]}" stroke-width="1.2" stroke-opacity=".45" stroke-linejoin="round"/>
  ${gS('M2 0H12', GPAL[k][0], 1, .6)}</g>`;
// các cụm lá trong tán: [lệch x, lệch y, cỡ] theo tỉ lệ bán trục — to nhỏ khác nhau để tán không ra hình hoa thị;
// cụm dưới tối, cụm giữa vừa, cụm trên sáng, vẽ theo thứ tự đó nên cụm sáng nằm đè lên trên
const GLOBE = [[-.42, .44, .40, '-b'], [.40, .46, .36, '-b'], [.06, .56, .30, '-b'],
  [.46, .06, .46, ''], [-.50, .10, .40, ''], [.10, .18, .52, ''],
  [-.16, -.30, .56, '-t'], [-.46, -.30, .34, '-t'], [.36, -.34, .40, '-t'], [.04, -.46, .38, '-t']];
// tán lá: khối nền tối lấy đường viền, các cụm lá chồng lên theo chiều sáng — mỗi cụm có một bản sao tối lệch
// xuống dưới phải làm bóng đổ giữa các cụm, nên nhìn ra được từng khóm. Mép cụm gợn khá mạnh để đường viền
// tán không bị trơn; không dán lá rời quanh tán, lá chỉ nằm dưới gốc (xem gFall).
const gCrown = (x, y, rx, ry, k, n = 18) => {
  const [l, , d, b] = GPAL[k];
  let s = `<path d="${gBlob(x, y, gR(rx * .9), gR(ry * .88), n, .09, 11)}" fill="${d}" stroke="${b}" stroke-width="1.4" stroke-opacity=".4" stroke-linejoin="round"/>`;
  GLOBE.forEach(([dx, dy, r, g], i) => {
    const cx = gR(x + dx * rx), cy = gR(y + dy * ry), lx = gR(r * rx * 1.05), ly = gR(r * ry * .95);
    const path = gBlob(cx, cy, lx, ly, 14, .14, i * 37 + 3);
    s += `<path d="${path}" fill="${d}" opacity=".5" transform="translate(${gR(lx * .13)} ${gR(ly * .18)})"/>`
      + `<path d="${path}" fill="url(#g-${k}${g})" stroke="${b}" stroke-width=".9" stroke-opacity=".16" stroke-linejoin="round"/>`;
  });
  return s + `<path d="${gBlob(x, gR(y + ry * .58), gR(rx * .82), gR(ry * .3), 12, .14, 29)}" fill="${b}" opacity=".18"/>`
    + `<path d="${gBlob(gR(x - rx * .3), gR(y - ry * .38), gR(rx * .26), gR(ry * .22), 10, .12, 41)}" fill="${l}" opacity=".4"/>`
    + `<path d="${gBlob(gR(x + rx * .14), gR(y - ry * .5), gR(rx * .16), gR(ry * .13), 10, .12, 53)}" fill="${l}" opacity=".26"/>`;
};
// lá rụng: vài chiếc nằm bẹt dưới gốc — bẹt theo chiều nhìn nghiêng nên không lẫn với lá còn trên cây
const gFall = (k, n, seed, sp) => { const rnd = gRnd(seed);
  return Array.from({length:n}, () => {
    const s = gR(.3 + rnd() * .14);
    return `<g transform="translate(${gR((rnd() - .5) * 2 * sp)} ${gR(rnd() * 5 - 1)}) rotate(${gR((rnd() - .5) * 110)}) scale(${s} ${gR(s * .5)})">
      <path d="M0 0C4-6 11-6 15 0C11 6 4 6 0 0z" fill="url(#g-${k}-b)" stroke="${GPAL[k][3]}" stroke-width="1.6" stroke-opacity=".4" stroke-linejoin="round"/></g>`;
  }).join('');
};
// vân vỏ: vài đường dọc hơi uốn, chạy theo độ cong của thân
const gGrain = (h, w, bend, c) => Array.from({length:3}, (_, i) => {
  const o = (i - 1) * w * .24;
  return gS(`M${gR(o * .95)} ${gR(-h * .12)}Q${gR(o * .82 + bend * .4 - w * .06)} ${gR(-h * .42)} ${gR(o * .78 + bend * .5)} ${gR(-h * .6)}T${gR(o * .7 + bend)} ${gR(-h * .87)}`,
    c, Math.max(.7, gR(w * .075)), .4);
}).join('');
// thân cây: thon và hơi cong, chân loe ra, có vân vỏ và vệt sáng bên trái
const gTrunk = (h, w, bend = 0, k = 'bark') => {
  const [dk, lt] = GBARK[k] || GBARK.bark, t = gR;
  return gE(t(w * .06), t(w * .05), t(w * .8), t(w * .2), '#000', .14)
    + gF(`M${t(-w * .76)} 0Q${t(-w * .5)} ${t(-w * .16)} ${t(-w * .4)} ${t(-w * .58)}L${t(w * .4)} ${t(-w * .58)}Q${t(w * .5)} ${t(-w * .16)} ${t(w * .76)} 0Q0 ${t(w * .3)} ${t(-w * .76)} 0z`, k, 1)
    + gF(`M${t(-w / 2)} 0C${t(-w * .32)} ${t(-h * .35)} ${t(-w * .28 + bend)} ${t(-h * .7)} ${t(-w * .24 + bend)} ${-h}`
      + `L${t(w * .24 + bend)} ${-h}C${t(w * .28 + bend)} ${t(-h * .7)} ${t(w * .32)} ${t(-h * .35)} ${t(w / 2)} 0Q0 ${t(w * .3)} ${t(-w / 2)} 0z`, k)
    + (k === 'bark' || k === 'dead' ? gGrain(h, w, bend, dk)
      + gS(`M${t(-w * .18)} ${t(-h * .5)}h${t(w * .2)}M${t(w * .04)} ${t(-h * .72)}h${t(w * .18)}`, dk, .8, .35) : '')
    + gS(`M${t(-w * .27)} ${t(-w * .2)}C${t(-w * .21)} ${t(-h * .35)} ${t(-w * .19 + bend * .5)} ${t(-h * .65)} ${t(-w * .15 + bend)} ${t(-h * .93)}`,
      lt, Math.max(1, gR(w * .2)), .25);
};
const gBranch = (d, w, c = '#7a5234') => gS(d, c, w) + gS(d, '#b48a5e', gR(w * .34), .35);
// tầng lá cây thông: sườn hơi lõm, mép dưới là các chùm kim chúc xuống, dưới có lớp tối cho dày
const gTier = (y, h, w) => {
  const N = Math.max(5, Math.round(w / 3.2)), sag = x => h * .13 * (1 - (x / w) ** 2);
  let d = `M${gR(-w)} ${gR(y)}Q${gR(-w * .26)} ${gR(y - h * .44)} ${gR(-w * .12)} ${gR(y - h * .88)}`
    + `Q0 ${gR(y - h * 1.1)} ${gR(w * .12)} ${gR(y - h * .88)}Q${gR(w * .26)} ${gR(y - h * .44)} ${gR(w)} ${gR(y)}`;
  for(let i = N; i >= 1; i--){
    const x0 = -w + 2 * w * i / N, x1 = -w + 2 * w * (i - 1) / N, mid = (x0 + x1) / 2;
    d += `L${gR(mid)} ${gR(y + sag(mid) + h * .19)}L${gR(x1)} ${gR(y + sag(x1))}`;
  }
  return `<path d="${d}z" fill="${GPAL.pine[3]}" opacity=".5" transform="translate(1.6 2.6)"/>${gF(d + 'z', 'pine')}`
    + gS(`M${gR(-w * .56)} ${gR(y - h * .26)}Q${gR(-w * .12)} ${gR(y - h * .7)} ${gR(w * .08)} ${gR(y - h * .9)}`, GPAL.pine[0], 1.6, .32);
};
const gSprout = (k1, k2, stem = '#7b5a3a') => gS('M0 0C-1-6 1-11 0-17', stem, 2.6) + gS('M-1 0C-2-6 0-11-1-17', '#c3a077', .9, .4)
  + gLeaf(0, -11, -155, 1, k1, '-b') + gLeaf(0, -15, -25, 1.05, k2, '-t');
const gFruit = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#000" stroke-opacity=".2" stroke-width=".8"/><circle cx="${gR(x - r * .35)}" cy="${gR(y - r * .35)}" r="${gR(r * .3)}" fill="#fff" opacity=".5"/>`;
// bạch dương: vỏ trắng, các vết ngang dài ngắn không đều
const gBirch = (h, w) => gTrunk(h, w, 0, 'birch')
  + Array.from({length:Math.floor(h / 9)}, (_, i) => { const rnd = gRnd(i * 61 + 5), lg = .2 + rnd() * .22;
    return `<rect x="${gR(i % 2 ? w * (.04 + rnd() * .1) : -w * (.2 + lg))}" y="${gR(-6 - i * 9 - rnd() * 3)}" width="${gR(w * lg)}" height="1.7" rx=".85" fill="#4a5358" opacity="${gR(.55 + rnd() * .3)}"/>`;
  }).join('');
// thân cọ: các đốt bầu dục chồng lên nhau, cong dần sang phải; trả về cả toạ độ ngọn
const gPalm = (h, lean) => {
  let s = ''; const n = Math.ceil(h / 7);
  for(let i = 0; i < n; i++){ const t = i / n, x = gR(lean * t * t), y = -i * 7 - 3.5, w = gR(5 - t * 1.4);
    s += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="4.6" fill="url(#g-palm)" stroke="#6d523c" stroke-opacity=".4" stroke-width=".9"/>`
      + gS(`M${gR(x - w * .55)} ${gR(y - 1.6)}q${gR(w * .5)} ${-1.4} ${gR(w * .95)} ${-.2}`, '#e4c9a6', 1, .3); }
  return [s, lean, -n * 7];
};
// tàu lá cọ: phiến lá cong rủ xuống từ ngọn, có gân giữa và vạch chia lá chét
const gFronds = (x, y, ends, w) => ends.map(([dx, dy]) => {
  const c1x = x + dx * .5, c1y = y + dy * .5 - w * 2.2, c2x = x + dx * .45, c2y = y + dy * .5 - w * .3;
  const bez = (cx, cy, t) => [(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * (x + dx), (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * (y + dy)];
  let s = gF(`M${gR(x)} ${gR(y)}Q${gR(c1x)} ${gR(c1y)} ${gR(x + dx)} ${gR(y + dy)}Q${gR(c2x)} ${gR(c2y)} ${gR(x)} ${gR(y + 1)}z`, 'leaf', 1.2);
  for(let i = 1; i <= 4; i++){ const t = i / 5, [ax, ay] = bez(c1x, c1y, t), [bx, by] = bez(c2x, c2y, t);
    s += gS(`M${gR(ax)} ${gR(ay)}L${gR(bx)} ${gR(by)}`, GPAL.leaf[3], .7, .28); }
  return s + gS(`M${gR(x)} ${gR(y)}Q${gR((c1x + c2x) / 2)} ${gR((c1y + c2y) / 2)} ${gR(x + dx)} ${gR(y + dy)}`, GPAL.leaf[3], 1.1, .45);
}).join('');
// xương rồng: gân dọc và các chùm gai nhỏ trên gân
const gCactus = (x, h, w) => gF(`M${x - w / 2} 0V${gR(-h + w / 2)}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${gR(-h + w / 2)}V0Q${x} ${gR(w * .15)} ${x - w / 2} 0z`, 'cactus')
  + gS(`M${gR(x - w * .18)} ${gR(-w * .3)}V${gR(-h + w * .55)}M${gR(x + w * .18)} ${gR(-w * .3)}V${gR(-h + w * .55)}`, GPAL.cactus[0], 1.1, .55)
  + gS(`M${gR(x - w * .42)} ${gR(-w * .4)}V${gR(-h + w * .5)}`, GPAL.cactus[0], gR(w * .16), .28)
  + Array.from({length:Math.floor(h / 9)}, (_, i) => { const y = gR(-w * .6 - i * 9), o = i % 2 ? w * .18 : -w * .18;
    return gS(`M${gR(x + o - 1.2)} ${gR(y - 1)}l1.2 1l-1.2 1M${gR(x + o + 1.2)} ${gR(y - 1)}l-1.2 1l1.2 1`, '#f4f6d8', .6, .3); }).join('');
const gArm = (x, y, dir, len, up, w) => gF(`M${x} ${gR(y + w / 2)}H${gR(x + dir * (len - w / 2))}Q${x + dir * len} ${gR(y + w / 2)} ${x + dir * len} ${y}V${gR(y - up + w / 2)}`
  + `A${w / 2} ${w / 2} 0 0 ${dir > 0 ? 0 : 1} ${gR(x + dir * (len - w))} ${gR(y - up + w / 2)}V${gR(y - w / 2)}H${x}z`, 'cactus')
  + gS(`M${gR(x + dir * (len - w * .5))} ${gR(y - up + w * .75)}V${gR(y - w * .1)}`, GPAL.cactus[0], gR(w * .14), .3);
// tre: mỗi dóng có mấu nổi ở hai đầu và vệt sáng dọc
const gBamboo = (x, h, w) => {
  let s = '';
  for(let y = 0; y < h; y += 13){ const sh = Math.min(13, h - y);
    s += `<rect x="${x - w / 2}" y="${-y - sh}" width="${w}" height="${sh}" rx="${w / 2.4}" fill="url(#g-bamboo)" stroke="#557a26" stroke-opacity=".45" stroke-width=".9"/>`
      + gS(`M${gR(x - w * .22)} ${gR(-y - sh + w * .5)}V${gR(-y - w * .5)}`, '#e6f5b4', gR(w * .2), .3)
      + gS(`M${gR(x - w * .5)} ${gR(-y - sh + .6)}h${w}`, '#4d6f22', .9, .4); }
  return s;
};
const gFlower = (x, y, r) => [0, 72, 144, 216, 288].map(a => `<ellipse cx="${gR(x + Math.cos(a * Math.PI / 180) * r * .9)}" cy="${gR(y + Math.sin(a * Math.PI / 180) * r * .9)}" rx="${r * .75}" ry="${r * .75}" fill="url(#g-flower)"/>`).join('')
  + `<circle cx="${x}" cy="${y}" r="${gR(r * .55)}" fill="#ffd54f"/>`;
// khóm cỏ: năm lá cỏ toả ra từ một điểm, lá giữa cao nhất
const gTuft = (x, y, s, c) => gS([[-3.4, -5.6, -1.6, -2.6, -2.5, -4.4], [-1.9, -6.6, -1, -2.8, -1.7, -5], [-.2, -7.4, 0, -3, .5, -5.2],
  [1.7, -6.4, .9, -2.8, 1.6, -4.8], [3.6, -5.2, 1.4, -2.4, 2.6, -4]]
  .map(([ex, ey, c1x, c1y, c2x, c2y]) => `M${x} ${y}c${gR(c1x * s)} ${gR(c1y * s)} ${gR(c2x * s)} ${gR(c2y * s)} ${gR(ex * s)} ${gR(ey * s)}`).join(''),
  c, gR(1.05 * s), .9);
const FSP = {
  pine:{n:tr('sp.pine'), s:[
    gShadow(14) + gTrunk(7, 5) + gTier(-5, 26, 12),
    gShadow(22) + gTrunk(11, 7) + gTier(-9, 30, 21) + gTier(-28, 30, 16),
    gShadow(32) + gTrunk(15, 9) + gTier(-13, 36, 31) + gTier(-36, 36, 24) + gTier(-58, 38, 17)
      + gFruit(-15, -18, 2.8, '#9a6437') + gFruit(13, -40, 2.8, '#9a6437')]},
  oak:{n:tr('sp.oak'), s:[
    gShadow(12) + gSprout('leaf', 'leafD'),
    gShadow(22) + gFall('leafD', 3, 21, 15) + gTrunk(26, 8, 1) + gCrown(0, -45, 23, 20, 'leaf'),
    gShadow(34) + gFall('leafD', 4, 33, 24) + gTrunk(38, 12, 2) + gBranch('M1-28C-5-34-10-38-15-44M2-32C8-38 12-42 16-48', 4.5)
      + gCrown(-17, -56, 21, 18, 'leafD') + gCrown(19, -60, 20, 18, 'leafD') + gCrown(0, -72, 32, 27, 'leaf')
      + gFruit(-20, -48, 3, '#c07a3e') + gFruit(21, -54, 3, '#c07a3e') + gFruit(6, -60, 3, '#c07a3e')]},
  cherry:{n:tr('sp.cherry'), s:[
    gShadow(12) + gSprout('leaf', 'leafD', '#6d4c41') + gFruit(0, -19, 4.2, '#f48fb1'),
    gShadow(22) + gFall('pink', 3, 41, 15) + gTrunk(22, 7, -1, 'bark') + gBranch('M-1-16C-5-22-8-26-10-30M0-19C4-24 7-28 10-32', 3.2, '#6d4c41') + gCrown(0, -42, 23, 18, 'pink'),
    gShadow(34) + gFall('pink', 4, 53, 24) + gTrunk(34, 11, -2) + gBranch('M-1-26C-8-32-14-38-19-46M-1-29C6-36 12-42 17-50', 5, '#6d4c41')
      + gCrown(-18, -56, 20, 17, 'pinkD') + gCrown(19, -58, 20, 17, 'pinkD') + gCrown(0, -72, 30, 24, 'pink')]},
  maple:{n:tr('sp.maple'), s:[
    gShadow(12) + gSprout('orange', 'red', '#5d4037') + gLeaf(0, -16, -90, .8, 'orange'),
    gShadow(22) + gFall('orange', 3, 61, 15) + gTrunk(22, 7, 1, 'bark') + gCrown(0, -42, 23, 19, 'orange'),
    gShadow(34) + gFall('red', 5, 71, 24) + gTrunk(36, 11, 1) + gCrown(-18, -56, 21, 18, 'red') + gCrown(19, -58, 20, 18, 'orange')
      + gCrown(0, -72, 31, 25, 'red') + gCrown(-8, -80, 14, 11, 'orange')]},
  birch:{n:tr('sp.birch'), s:[
    gShadow(12) + gSprout('lime', 'leaf', '#cfc8b8'),
    gShadow(18) + gBirch(40, 6) + gCrown(0, -54, 15, 23, 'lime', 14),
    gShadow(28) + gFall('lime', 3, 83, 18) + gBirch(58, 8) + gCrown(-12, -62, 13, 21, 'lime', 14) + gCrown(13, -66, 13, 21, 'lime', 14) + gCrown(0, -80, 17, 25, 'lime', 14)]},
  palm:{n:tr('sp.palm'), s:[
    gShadow(12) + gFronds(0, -4, [[-15, 2], [15, 2], [-6, -13], [7, -13]], 3.5),
    gShadow(20) + (([s, x, y]) => s + gFronds(x, y, [[-28, 8], [28, 8], [-20, -10], [21, -10], [1, -18]], 5.5))(gPalm(34, 4)),
    gShadow(30) + (([s, x, y]) => s + gFronds(x, y, [[-40, 12], [40, 12], [-31, -12], [32, -12], [-11, -24], [13, -24]], 7)
      + gFruit(x - 4, y + 4, 4.2, '#7a5236') + gFruit(x + 4, y + 5, 4.2, '#6b4630') + gFruit(x, y + 8, 4, '#7a5236'))(gPalm(62, 8))]},
  cactus:{n:tr('sp.cactus'), s:[
    gShadow(11) + gF(gBlob(0, -9, 9, 9, 12, .03, 17), 'cactus') + gS('M-3-4V-14M3-4V-14', GPAL.cactus[0], 1, .55),
    gShadow(16) + gArm(6, -18, 1, 14, 14, 8) + gCactus(0, 44, 16),
    gShadow(24) + gArm(-8, -30, -1, 17, 18, 10) + gArm(8, -42, 1, 17, 16, 10) + gCactus(0, 70, 20) + gFlower(0, -71, 4)]},
  bamboo:{n:tr('sp.bamboo'), s:[
    gShadow(10) + gBamboo(0, 20, 5) + gLeaf(2, -14, -30, .9, 'leaf') + gLeaf(-2, -18, -150, .8, 'leafD'),
    gShadow(16) + gBamboo(-5, 46, 6) + gBamboo(6, 36, 6) + gLeaf(-4, -32, -150, 1, 'leafD') + gLeaf(8, -26, -25, 1, 'leaf') + gLeaf(-4, -44, -40, .9, 'leaf'),
    gShadow(24) + gBamboo(-11, 78, 7) + gBamboo(12, 65, 7) + gBamboo(1, 96, 7)
      + gLeaf(-10, -54, -155, 1.1, 'leafD') + gLeaf(15, -48, -20, 1.1, 'leaf') + gLeaf(4, -72, -30, 1.1, 'leaf')
      + gLeaf(-1, -84, -150, 1, 'leafD') + gLeaf(4, -95, -60, .9, 'leaf') + gLeaf(-10, -30, -140, .9, 'leaf')]}};
// cây héo: thân nứt, cành trụi, vài chiếc lá rụng dưới gốc
const FDEAD = gShadow(18) + gTrunk(34, 7, 0, 'dead')
  + gBranch('M0-20C-5-26-10-30-14-36M0-27C4-32 8-36 11-42M-14-36C-15-40-15-44-17-47', 3, '#7d6b5d')
  + gS('M-1-8C0-14-2-18-1-24', '#5f5044', .9, .5) + gS('M2-30C3-34 2-38 3-41', '#5f5044', .8, .4)
  + gFall('leafD', 3, 97, 13);
const fSpecies = k => FSP[k] || FSP.pine;   // phiên cũ trước khi có chọn loài thì là thông
const fStage   = min => min < 15 ? 1 : min < 40 ? 2 : 3;
// cây trên đồng hồ: chưa bắt đầu là cây cấp 1, đang chạy thì lên cấp theo số phút đã làm
function fGrowHTML(){
  const r = S.focus.run, k = r ? r.tree : S.focus.tree, st = r ? fStage(fTreeMs(r) / 6e4) : 1;
  return `<div class="fztree" title="${tr('gd.treeT', {sp: fSpecies(k).n, st})}"><svg viewBox="-50 -104 100 110">
    <g data-ftree data-st="${st}">${fSpecies(k).s[st - 1]}</g></svg></div>`;
}
// hàng chọn loài cây trước khi bắt đầu phiên; app nhớ loài chọn lần trước
function fPickHTML(){
  const cur = S.focus.tree;
  return `<div class="fzsp">${Object.entries(FSP).map(([k, t]) => `<button class="${k === cur ? 'on' : ''}" data-fsp="${k}" title="${t.n}">
      <svg viewBox="-50 -104 100 110">${t.s[2]}</svg></button>`).join('')}</div>
    <div class="fzhint fzsph">${tr('gd.stageHint', {sp: fSpecies(cur).n})}</div>`;
}
// hình thoi bo góc, đỉnh trên ở (x, y), nửa rộng W, nửa cao H
const gDia = (x, y, W, H, k) => {
  const V = [[x, y], [x + W, y + H], [x, y + 2 * H], [x - W, y + H]], at = (p, q) => `${gR(p[0] + (q[0] - p[0]) * k)} ${gR(p[1] + (q[1] - p[1]) * k)}`;
  return V.map((v, i) => `${i ? 'L' : 'M'}${at(v, V[(i + 3) % 4])}Q${gR(v[0])} ${gR(v[1])} ${at(v, V[(i + 1) % 4])}`).join('') + 'z';
};
// ô đất isometric N×N bo góc; cây và cỏ hoa rải ngẫu nhiên nhưng cố định theo khoảng đang xem (vẽ lại không bị xáo)
function fGardenHTML(list, seed){
  const N = Math.max(4, Math.ceil(Math.sqrt(list.length))), a = 50, b = 25, depth = 24, k = Math.min(.12, .5 / N);
  let h = 0; for(const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => (h = (h * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const cells = []; for(let i = 0; i < N; i++) for(let j = 0; j < N; j++) cells.push([i, j]);
  // mặt cỏ có ô sáng xen kẽ rất nhẹ, không kẻ lưới cứng
  const tiles = cells.filter(([i, j]) => (i + j) % 2).map(([i, j]) =>
    `<path d="${gDia((i - j) * a, (i + j) * b + b * .12, a * .88, b * .88, .3)}" fill="#fff" opacity=".06"/>`).join('');
  // vệt cỏ đậm nhạt loang lổ, để mặt sân không phẳng một màu
  const patches = Array.from({length:10}, (_, n) => `<path d="${gBlob(gR((rnd() - .5) * 1.8 * N * a), gR(rnd() * 2 * N * b),
    gR(a * (.7 + rnd() * 1.1)), gR(b * (.8 + rnd() * 1.1)), 14, .26, n * 131 + 5)}" fill="${n % 2 ? '#3d8a31' : '#dcf4ad'}" opacity=".2"/>`).join('');
  // sạn lấm tấm trên vách đất, dọc hai mép trước
  const grit = Array.from({length:N * 10}, () => { const t = rnd(), side = rnd() < .5 ? -1 : 1;
    return gE(gR(side * N * a * (1 - t)), gR(N * b * (1 + t) + 3 + rnd() * (depth - 6)), gR(.8 + rnd() * 1.3), gR(.5 + rnd() * .8),
      rnd() < .5 ? '#5d3c22' : '#caa070', .35); }).join('');
  // cỏ mọc tràn qua mép, để đường viền đất không phải một nét thẳng
  const edge = back => Array.from({length:N * (back ? 6 : 8)}, () => { const t = rnd(), side = rnd() < .5 ? -1 : 1;
    return gTuft(gR(side * N * a * (back ? t : 1 - t)), gR(N * b * (back ? t : 1 + t) + 3.5 + rnd() * 2.5),
      gR(.7 + rnd() * .6), rnd() < .5 ? '#4f9a3a' : '#7cc45f'); }).join('');
  const fringeBack = edge(true), fringe = edge(false);
  for(let i = cells.length - 1; i > 0; i--){ const x = Math.floor(rnd() * (i + 1)); [cells[i], cells[x]] = [cells[x], cells[i]]; }
  // ô trống thỉnh thoảng có khóm cỏ, bông hoa hay hòn đá
  const items = cells.map(([i, j], n) => {
    const x = gR((i - j) * a + (rnd() - .5) * 34), y = gR((i + j) * b + b + (rnd() - .5) * 16), e = list[n], p = rnd(), sc = gR(.74 + rnd() * .13);
    if(e){
      const sp = fSpecies(e.tree), st = fStage(fGrown(e) / 6e4), dk = iso(new Date(e.a)), m = Math.round(e.ms / 6e4);
      const tip = tr('gd.tip', {
        what: e.done ? tr('gd.treeT', {sp: sp.n, st}) : tr('gd.wilted', {sp: sp.n}),
        hm: fHM(e.a), w: DOW[dowOf(dk)], d: fmtVN(dk),
        how: tr(e.done ? 'gd.mins' : 'gd.cutAfter', {m}),
        title: e.title.trim() || tr('task.untitled')});
      return {i, j, svg:`<g class="gt" data-gtip="${esc(tip)}" transform="translate(${(i - j) * a} ${(i + j) * b + b}) scale(${sc})">${e.done ? sp.s[st - 1] : FDEAD}</g>`};
    }
    const svg = p < .24 ? gTuft(x, y, gR(.85 + p * 2), p < .12 ? '#43902f' : '#6bb84e')
      : p < .36 ? gS(`M${x} ${y}c0-3 1-5 0-7`, '#4f9a3a', 1.3) + gFlower(x, gR(y - 8), p < .3 ? 2.1 : 1.7)
      : p < .44 ? gE(x, y + 1, 6, 2, 'url(#g-shadow)') + gE(x, y - 1, 5, 3, 'url(#g-stone)') + gE(gR(x - 1.5), gR(y - 2.2), 1.8, .9, '#fff', .5) : '';
    return {i, j, svg};
  }).sort((p, q) => p.i + p.j - q.i - q.j || p.i - q.i).map(x => x.svg).join('');   // sau vẽ trước, trước che lên
  // khối đất: chồng các lớp hình thoi từ dưới lên; gradient ngang làm mặt trái sáng, mặt phải tối
  const layers = Array.from({length:depth / 2}, (_, n) => { const dy = depth - n * 2;
    return `<path d="${gDia(0, dy, N * a, N * b, k)}" fill="url(#g-${dy > depth - 5 ? 'dirtD' : dy > 6 ? 'dirt' : 'lip'})"/>`; }).join('');
  const W = 2 * N * a + 24, top = b - 90, H = 2 * N * b + depth + 30 - top;
  return `<svg class="fgarden" viewBox="${-N * a - 12} ${top} ${W} ${H}">
    <defs><clipPath id="ggclip"><path d="${gDia(0, 0, N * a, N * b, k)}"/></clipPath></defs>
    ${gE(0, N * b + depth + 8, N * a * .95, N * b * .95, 'url(#g-shadow)')}
    ${layers}${grit}${fringeBack}<path d="${gDia(0, 0, N * a, N * b, k)}" fill="url(#g-grass)"/>
    <g clip-path="url(#ggclip)">${patches}${tiles}</g>
    <path d="${gDia(0, 1.5, N * a - 3, N * b - 1.5, k)}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
    ${gS(`M${gR(-N * a)} ${gR(N * b + 3)}L0 ${gR(2 * N * b + 3)}L${gR(N * a)} ${gR(N * b + 3)}`, '#33611f', 3.5, .2)}
    ${items}${fringe}</svg>`;
}
// tooltip của cây trong vườn: đi theo chuột
document.addEventListener('mouseover', e => {
  const g = e.target.closest && e.target.closest('[data-gtip]'); let tip = $('#gtip');
  if(!g){ if(tip) tip.hidden = true; return; }
  if(!tip){ tip = document.createElement('div'); tip.id = 'gtip'; document.body.appendChild(tip); }
  tip.textContent = g.dataset.gtip; tip.hidden = false;
});
document.addEventListener('mousemove', e => {
  const tip = $('#gtip'); if(!tip || tip.hidden) return;
  tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = e.clientY + 16 + 'px';
});
