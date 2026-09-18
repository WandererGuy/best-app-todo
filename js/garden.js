/* --- khu vườn: mỗi phiên đủ giờ trồng một cây thuộc loài đã chọn; phiên huỷ giữa chừng để lại cây héo.
   Mỗi loài 3 cấp theo số phút: dưới 15, 15 tới dưới 40, từ 40. Cây vẽ bằng SVG, gốc ở (0, 0), cấp 3 cao chừng 100 đơn vị.
   Nét vẽ mềm: tán lá là khối cong liền, tô chuyển màu (gradient dùng chung, khai báo một lần trong #gdefs) và viền mờ. --- */
const GPAL = {   // sáng, vừa, tối, viền
  leaf:['#b5ec8e', '#62bd5e', '#2f7d3a', '#1f5a28'], leafD:['#86c96b', '#3f9a4a', '#22632d', '#184a21'],
  pine:['#8fdca6', '#3f9f68', '#1f6b44', '#154d31'], pink:['#ffe0ec', '#f7a3c6', '#d0628f', '#a1406a'],
  pinkD:['#f7b8d2', '#e27aa6', '#b44c78', '#8c3659'], orange:['#ffe0a3', '#ffa543', '#e0602a', '#a8461b'],
  red:['#ffbfa8', '#ef6a42', '#b8321f', '#862414'], lime:['#f4f9a8', '#bcd95f', '#7ea33a', '#5a7a25'],
  cactus:['#b3eab0', '#56b566', '#2f7a40', '#225c2f'], flower:['#ffd1e3', '#f06292', '#c2185b', '#8e1045']};
const GLIN = {bark:['#b08255', '#6b4428'], birch:['#ffffff', '#d3cdbf'], bamboo:['#cde896', '#6f9f34'],
  palm:['#c9a886', '#8a6a4f'], dead:['#a8988a', '#6d5d50'], stone:['#dcd6cc', '#9d958a']};
document.body.insertAdjacentHTML('beforeend', `<svg id="gdefs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  ${Object.entries(GPAL).map(([k, [l, m, d]]) => `<radialGradient id="g-${k}" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="${l}"/>
    <stop offset=".5" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></radialGradient>`).join('')}
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
const gShadow = (rx, ry = rx * .3) => gE(0, 0, rx, ry, 'url(#g-shadow)');
// đường cong kín trơn đi qua các điểm (Catmull-Rom đổi sang Bézier)
const gSmooth = pts => {
  const n = pts.length; let d = `M${gR(pts[0][0])} ${gR(pts[0][1])}`;
  for(let i = 0; i < n; i++){
    const [p0, p1, p2, p3] = [pts[(i + n - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    d += `C${gR(p1[0] + (p2[0] - p0[0]) / 6)} ${gR(p1[1] + (p2[1] - p0[1]) / 6)} ${gR(p2[0] - (p3[0] - p1[0]) / 6)} ${gR(p2[1] - (p3[1] - p1[1]) / 6)} ${gR(p2[0])} ${gR(p2[1])}`;
  }
  return d + 'z';
};
// tán lá: mép gợn nhẹ như cụm lá, đốm sáng góc trái trên
const gBlob = (x, y, rx, ry, n = 18, wob = .045) => gSmooth(Array.from({length:n}, (_, i) => {
  const t = i / n * 2 * Math.PI - Math.PI / 2, k = 1 + (i % 2 ? wob : -wob);
  return [x + Math.cos(t) * rx * k, y + Math.sin(t) * ry * k];
}));
const gCrown = (x, y, rx, ry, k, n = 18) => gF(gBlob(x, y, rx, ry, n), k)
  + `<path d="${gBlob(x - rx * .3, y - ry * .34, rx * .4, ry * .32, 12, .03)}" fill="${GPAL[k][0]}" opacity=".3"/>`;
// thân cây: thon và hơi cong, chân loe ra, gốc bo tròn
const gTrunk = (h, w, bend = 0, k = 'bark') => gF(`M${-w / 2} 0C${-w * .32} ${gR(-h * .35)} ${gR(-w * .28 + bend)} ${gR(-h * .7)} ${gR(-w * .24 + bend)} ${-h}`
  + `L${gR(w * .24 + bend)} ${-h}C${gR(w * .28 + bend)} ${gR(-h * .7)} ${w * .32} ${gR(-h * .35)} ${w / 2} 0Q0 ${gR(w * .3)} ${-w / 2} 0z`, k);
const gBranch = (d, w, c = '#7a5234') => gS(d, c, w);
// tầng lá cây thông: sườn hơi lõm, đỉnh tròn, mép dưới rủ nhẹ
const gTier = (y, h, w) => gF(`M${-w} ${y}Q${gR(-w * .25)} ${gR(y - h * .4)} ${gR(-w * .14)} ${gR(y - h * .86)}Q0 ${gR(y - h * 1.08)} ${gR(w * .14)} ${gR(y - h * .86)}`
  + `Q${gR(w * .25)} ${gR(y - h * .4)} ${w} ${y}Q${gR(w * .5)} ${gR(y + h * .22)} 0 ${gR(y + h * .12)}Q${gR(-w * .5)} ${gR(y + h * .22)} ${-w} ${y}z`, 'pine');
const gLeaf = (x, y, deg, s, k) => `<g transform="translate(${x} ${y}) rotate(${deg}) scale(${s})">${gF('M0 0C4-6 11-6 15 0C11 6 4 6 0 0z', k, 1.2)}
  ${gS('M2 0H12', GPAL[k][0], 1, .6)}</g>`;
const gSprout = (k1, k2, stem = '#7b5a3a') => gS('M0 0C-1-6 1-11 0-17', stem, 2.6) + gLeaf(0, -11, -155, 1, k1) + gLeaf(0, -15, -25, 1.05, k2);
const gFruit = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="#000" stroke-opacity=".2" stroke-width=".8"/><circle cx="${gR(x - r * .35)}" cy="${gR(y - r * .35)}" r="${gR(r * .3)}" fill="#fff" opacity=".5"/>`;
const gPetal = (x, y, deg, c) => `<ellipse cx="${x}" cy="${y}" rx="3.2" ry="1.7" transform="rotate(${deg} ${x} ${y})" fill="${c}"/>`;
const gBirch = (h, w) => gTrunk(h, w, 0, 'birch')
  + Array.from({length:Math.floor(h / 10)}, (_, i) => `<rect x="${gR(i % 2 ? w * .02 : -w * .36)}" y="${-7 - i * 10}" width="${gR(w * .34)}" height="1.8" rx=".9" fill="#4a5358" opacity=".8"/>`).join('');
// thân cọ: các đốt bầu dục chồng lên nhau, cong dần sang phải; trả về cả toạ độ ngọn
const gPalm = (h, lean) => {
  let s = ''; const n = Math.ceil(h / 7);
  for(let i = 0; i < n; i++){ const t = i / n, x = gR(lean * t * t), y = -i * 7 - 3.5, w = gR(5 - t * 1.4); s += `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="4.6" fill="url(#g-palm)" stroke="#6d523c" stroke-opacity=".4" stroke-width=".9"/>`; }
  return [s, lean, -n * 7];
};
// tàu lá cọ: phiến lá cong rủ xuống từ ngọn
const gFronds = (x, y, ends, w) => ends.map(([dx, dy]) => gF(`M${x} ${y}Q${gR(x + dx * .5)} ${gR(y + dy * .5 - w * 2.2)} ${x + dx} ${y + dy}Q${gR(x + dx * .45)} ${gR(y + dy * .5 - w * .3)} ${x} ${y + 1}z`, 'leaf', 1.2)).join('');
const gCactus = (x, h, w) => gF(`M${x - w / 2} 0V${gR(-h + w / 2)}A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${gR(-h + w / 2)}V0Q${x} ${gR(w * .15)} ${x - w / 2} 0z`, 'cactus')
  + gS(`M${gR(x - w * .18)} ${gR(-w * .3)}V${gR(-h + w * .55)}M${gR(x + w * .18)} ${gR(-w * .3)}V${gR(-h + w * .55)}`, GPAL.cactus[0], 1.1, .55);
const gArm = (x, y, dir, len, up, w) => gF(`M${x} ${gR(y + w / 2)}H${gR(x + dir * (len - w / 2))}Q${x + dir * len} ${gR(y + w / 2)} ${x + dir * len} ${y}V${gR(y - up + w / 2)}`
  + `A${w / 2} ${w / 2} 0 0 ${dir > 0 ? 0 : 1} ${gR(x + dir * (len - w))} ${gR(y - up + w / 2)}V${gR(y - w / 2)}H${x}z`, 'cactus');
const gBamboo = (x, h, w) => {
  let s = '';
  for(let y = 0; y < h; y += 13){ const sh = Math.min(13, h - y);
    s += `<rect x="${x - w / 2}" y="${-y - sh}" width="${w}" height="${sh}" rx="${w / 2.4}" fill="url(#g-bamboo)" stroke="#557a26" stroke-opacity=".45" stroke-width=".9"/>`; }
  return s;
};
const gFlower = (x, y, r) => [0, 72, 144, 216, 288].map(a => `<ellipse cx="${gR(x + Math.cos(a * Math.PI / 180) * r * .9)}" cy="${gR(y + Math.sin(a * Math.PI / 180) * r * .9)}" rx="${r * .75}" ry="${r * .75}" fill="url(#g-flower)"/>`).join('')
  + `<circle cx="${x}" cy="${y}" r="${gR(r * .55)}" fill="#ffd54f"/>`;
const FSP = {
  pine:{n:'Thông', s:[
    gShadow(14) + gTrunk(7, 5) + gTier(-5, 26, 12),
    gShadow(22) + gTrunk(11, 7) + gTier(-9, 30, 21) + gTier(-28, 30, 16),
    gShadow(32) + gTrunk(15, 9) + gTier(-13, 36, 31) + gTier(-36, 36, 24) + gTier(-58, 38, 17)
      + gFruit(-15, -18, 2.8, '#9a6437') + gFruit(13, -40, 2.8, '#9a6437')]},
  oak:{n:'Sồi', s:[
    gShadow(12) + gSprout('leaf', 'leafD'),
    gShadow(22) + gTrunk(26, 8, 1) + gCrown(0, -45, 23, 20, 'leaf'),
    gShadow(34) + gTrunk(38, 12, 2) + gBranch('M1-28C-5-34-10-38-15-44M2-32C8-38 12-42 16-48', 4.5)
      + gCrown(-17, -56, 21, 18, 'leafD') + gCrown(19, -60, 20, 18, 'leafD') + gCrown(0, -72, 32, 27, 'leaf')
      + gFruit(-20, -48, 3, '#c07a3e') + gFruit(21, -54, 3, '#c07a3e') + gFruit(6, -60, 3, '#c07a3e')]},
  cherry:{n:'Anh đào', s:[
    gShadow(12) + gSprout('leaf', 'leafD', '#6d4c41') + gFruit(0, -19, 4.2, '#f48fb1'),
    gShadow(22) + gTrunk(22, 7, -1, 'bark') + gBranch('M-1-16C-5-22-8-26-10-30M0-19C4-24 7-28 10-32', 3.2, '#6d4c41') + gCrown(0, -42, 23, 18, 'pink'),
    gShadow(34) + gTrunk(34, 11, -2) + gBranch('M-1-26C-8-32-14-38-19-46M-1-29C6-36 12-42 17-50', 5, '#6d4c41')
      + gCrown(-18, -56, 20, 17, 'pinkD') + gCrown(19, -58, 20, 17, 'pinkD') + gCrown(0, -72, 30, 24, 'pink')
      + gPetal(-26, -4, 20, '#f7a3c6') + gPetal(22, -2, -30, '#f48fb1') + gPetal(-6, 5, 60, '#f7a3c6') + gPetal(33, -24, 10, '#ffd1e3')]},
  maple:{n:'Phong đỏ', s:[
    gShadow(12) + gSprout('orange', 'red', '#5d4037') + gLeaf(0, -16, -90, .8, 'orange'),
    gShadow(22) + gTrunk(22, 7, 1, 'bark') + gCrown(0, -42, 23, 19, 'orange'),
    gShadow(34) + gTrunk(36, 11, 1) + gCrown(-18, -56, 21, 18, 'red') + gCrown(19, -58, 20, 18, 'orange') + gCrown(0, -72, 31, 25, 'red')
      + gCrown(-8, -80, 14, 11, 'orange') + gLeaf(-32, -10, 20, .6, 'orange') + gLeaf(26, -3, -40, .6, 'red')]},
  birch:{n:'Bạch dương', s:[
    gShadow(12) + gSprout('lime', 'leaf', '#cfc8b8'),
    gShadow(18) + gBirch(40, 6) + gCrown(0, -54, 15, 23, 'lime', 14),
    gShadow(28) + gBirch(58, 8) + gCrown(-12, -62, 13, 21, 'lime', 14) + gCrown(13, -66, 13, 21, 'lime', 14) + gCrown(0, -80, 17, 25, 'lime', 14)]},
  palm:{n:'Cọ', s:[
    gShadow(12) + gFronds(0, -4, [[-15, 2], [15, 2], [-6, -13], [7, -13]], 3.5),
    gShadow(20) + (([s, x, y]) => s + gFronds(x, y, [[-28, 8], [28, 8], [-20, -10], [21, -10], [1, -18]], 5.5))(gPalm(34, 4)),
    gShadow(30) + (([s, x, y]) => s + gFronds(x, y, [[-40, 12], [40, 12], [-31, -12], [32, -12], [-11, -24], [13, -24]], 7)
      + gFruit(x - 4, y + 4, 4.2, '#7a5236') + gFruit(x + 4, y + 5, 4.2, '#6b4630') + gFruit(x, y + 8, 4, '#7a5236'))(gPalm(62, 8))]},
  cactus:{n:'Xương rồng', s:[
    gShadow(11) + gF(gBlob(0, -9, 9, 9, 12, .02), 'cactus') + gS('M-3-4V-14M3-4V-14', GPAL.cactus[0], 1, .55),
    gShadow(16) + gArm(6, -18, 1, 14, 14, 8) + gCactus(0, 44, 16),
    gShadow(24) + gArm(-8, -30, -1, 17, 18, 10) + gArm(8, -42, 1, 17, 16, 10) + gCactus(0, 70, 20) + gFlower(0, -71, 4)]},
  bamboo:{n:'Tre', s:[
    gShadow(10) + gBamboo(0, 20, 5) + gLeaf(2, -14, -30, .9, 'leaf') + gLeaf(-2, -18, -150, .8, 'leafD'),
    gShadow(16) + gBamboo(-5, 46, 6) + gBamboo(6, 36, 6) + gLeaf(-4, -32, -150, 1, 'leafD') + gLeaf(8, -26, -25, 1, 'leaf') + gLeaf(-4, -44, -40, .9, 'leaf'),
    gShadow(24) + gBamboo(-11, 78, 7) + gBamboo(12, 65, 7) + gBamboo(1, 96, 7)
      + gLeaf(-10, -54, -155, 1.1, 'leafD') + gLeaf(15, -48, -20, 1.1, 'leaf') + gLeaf(4, -72, -30, 1.1, 'leaf')
      + gLeaf(-1, -84, -150, 1, 'leafD') + gLeaf(4, -95, -60, .9, 'leaf') + gLeaf(-10, -30, -140, .9, 'leaf')]}};
const FDEAD = gShadow(18) + gTrunk(34, 7, 0, 'dead') + gBranch('M0-20C-5-26-10-30-14-36M0-27C4-32 8-36 11-42M-14-36C-15-40-15-44-17-47', 3, '#7d6b5d')
  + gPetal(-12, 2, 10, '#a1887f') + gPetal(11, 1, -20, '#8d6e63');
const fSpecies = k => FSP[k] || FSP.pine;   // phiên cũ trước khi có chọn loài thì là thông
const fStage   = min => min < 15 ? 1 : min < 40 ? 2 : 3;
// cây trên đồng hồ: chưa bắt đầu là cây cấp 1, đang chạy thì lên cấp theo số phút đã làm
function fGrowHTML(){
  const r = S.focus.run, k = r ? r.tree : S.focus.tree, st = r ? fStage(fTreeMs(r) / 6e4) : 1;
  return `<div class="fztree" title="${fSpecies(k).n} · cấp ${st}"><svg viewBox="-50 -104 100 110">
    <g data-ftree data-st="${st}">${fSpecies(k).s[st - 1]}</g></svg></div>`;
}
// hàng chọn loài cây trước khi bắt đầu phiên; app nhớ loài chọn lần trước
function fPickHTML(){
  const cur = S.focus.tree;
  return `<div class="fzsp">${Object.entries(FSP).map(([k, t]) => `<button class="${k === cur ? 'on' : ''}" data-fsp="${k}" title="${t.n}">
      <svg viewBox="-50 -104 100 110">${t.s[2]}</svg></button>`).join('')}</div>
    <div class="fzhint fzsph">${fSpecies(cur).n} · cấp 2 từ 15 phút, cấp 3 từ 40 phút</div>`;
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
    `<path d="${gDia((i - j) * a, (i + j) * b + b * .12, a * .88, b * .88, .3)}" fill="#fff" opacity=".07"/>`).join('');
  for(let i = cells.length - 1; i > 0; i--){ const x = Math.floor(rnd() * (i + 1)); [cells[i], cells[x]] = [cells[x], cells[i]]; }
  // ô trống thỉnh thoảng có khóm cỏ, bông hoa hay hòn đá
  const items = cells.map(([i, j], n) => {
    const x = gR((i - j) * a + (rnd() - .5) * 34), y = gR((i + j) * b + b + (rnd() - .5) * 16), e = list[n], p = rnd();
    if(e){
      const sp = fSpecies(e.tree), st = fStage(fGrown(e) / 6e4), dk = iso(new Date(e.a)), m = Math.round(e.ms / 6e4);
      const tip = `${e.done ? `${sp.n} · cấp ${st}` : `${sp.n} héo`} · ${fHM(e.a)} ${DOW[dowOf(dk)]} ${fmtVN(dk)} · ${e.done ? `${m} phút` : `bỏ dở sau ${m} phút`} · ${e.title.trim() || '(chưa đặt tên)'}`;
      return {i, j, svg:`<g class="gt" data-gtip="${esc(tip)}" transform="translate(${(i - j) * a} ${(i + j) * b + b}) scale(.8)">${e.done ? sp.s[st - 1] : FDEAD}</g>`};
    }
    const svg = p < .2 ? gS(`M${x} ${y}c-1-3-3-5-5-7M${x} ${y}c0-3 0-6 1-9M${x} ${y}c1-3 3-5 5-6`, '#4f9a3a', 1.5)
      : p < .32 ? gS(`M${x} ${y}c0-2 1-4 0-6`, '#4f9a3a', 1.2) + gFlower(x, gR(y - 7), p < .26 ? 1.8 : 1.5)
      : p < .4 ? gE(x, y + 1, 6, 2, 'url(#g-shadow)') + gE(x, y - 1, 5, 3, 'url(#g-stone)') + gE(gR(x - 1.5), gR(y - 2.2), 1.8, .9, '#fff', .5) : '';
    return {i, j, svg};
  }).sort((p, q) => p.i + p.j - q.i - q.j || p.i - q.i).map(x => x.svg).join('');   // sau vẽ trước, trước che lên
  // khối đất: chồng các lớp hình thoi từ dưới lên; gradient ngang làm mặt trái sáng, mặt phải tối
  const layers = Array.from({length:depth / 2}, (_, n) => { const dy = depth - n * 2;
    return `<path d="${gDia(0, dy, N * a, N * b, k)}" fill="url(#g-${dy > depth - 5 ? 'dirtD' : dy > 6 ? 'dirt' : 'lip'})"/>`; }).join('');
  const W = 2 * N * a + 24, top = b - 90, H = 2 * N * b + depth + 30 - top;
  return `<svg class="fgarden" viewBox="${-N * a - 12} ${top} ${W} ${H}">
    ${gE(0, N * b + depth + 8, N * a * .95, N * b * .95, 'url(#g-shadow)')}
    ${layers}<path d="${gDia(0, 0, N * a, N * b, k)}" fill="url(#g-grass)"/>
    <path d="${gDia(0, 1.5, N * a - 3, N * b - 1.5, k)}" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>
    ${tiles}${items}</svg>`;
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
