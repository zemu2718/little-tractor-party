// 生成毛毡风格的装饰贴纸（气球、星星、爱心、彩旗），与生图插画的黏土/毛毡质感统一。
// 在无头 Chrome 的 canvas 里逐根“绒毛”绘制，再直接编码为保留透明度的 WebP 写入 assets/deco/。
// 用法：node scripts/make_felt_sprites.mjs        （需要本机安装 Chrome；可用 CHROME=路径 指定）
// 随机数固定种子，重复运行结果一致。不发布本脚本。
import {spawn} from 'node:child_process';
import {writeFileSync, mkdirSync, existsSync, rmSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/deco');
const CANDIDATES = [process.env.CHROME, ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'])].filter(Boolean);
const chrome = CANDIDATES.find(p => existsSync(p));
if (!chrome) throw Error('没有找到 Chrome，请用 CHROME=路径 指定');

// 在页面里执行的绘制代码。
const DRAW = String.raw`
(() => {
 let seed = 20241111;
 const r = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
 const out = {};
 const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
 // 毛毡填充：径向明暗 + 细碎绒毛 + 边缘毛边 + 内侧缝线 + 柔光高光。
 function felt(ctx, shape, box, c, opt = {}) {
  const {x, y, w, h} = box;
  ctx.save(); ctx.clip(shape);
  const g = ctx.createRadialGradient(x + w * .34, y + h * .28, w * .04, x + w * .5, y + h * .55, Math.max(w, h) * .72);
  g.addColorStop(0, c.light); g.addColorStop(.5, c.base); g.addColorStop(1, c.dark);
  ctx.fillStyle = g; ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  const fibers = Math.round(w * h / 9);
  for (let i = 0; i < fibers; i++) {
   const fx = x + r() * w, fy = y + r() * h, a = r() * Math.PI * 2, l = 2 + r() * 7;
   ctx.strokeStyle = r() < .5 ? 'rgba(255,255,255,.13)' : 'rgba(60,30,0,.09)';
   ctx.lineWidth = .7 + r() * .9; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + Math.cos(a + 1) * l * .5, fy + Math.sin(a + 1) * l * .5, fx + Math.cos(a) * l, fy + Math.sin(a) * l); ctx.stroke();
  }
  // 柔和高光。
  ctx.filter = 'blur(' + Math.round(w * .05) + 'px)'; ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.beginPath(); ctx.ellipse(x + w * (opt.hx ?? .32), y + h * (opt.hy ?? .27), w * .13, h * .09, -.6, 0, Math.PI * 2); ctx.fill(); ctx.filter = 'none';
  ctx.restore();
  // 毛边：沿轮廓的短绒毛。
  ctx.save(); ctx.strokeStyle = c.dark; ctx.globalAlpha = .5; ctx.lineWidth = 2.2; ctx.setLineDash([1.2, 2.2]); ctx.stroke(shape); ctx.restore();
  // 缝线：向内缩一圈的虚线。
  if (opt.stitch !== false) {
   const s = opt.inset ?? .84, cx = x + w / 2, cy = y + h * (opt.cy ?? .5);
   ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
   ctx.strokeStyle = opt.thread || 'rgba(255,248,226,.92)'; ctx.lineWidth = Math.max(2.4, w * .016) / s; ctx.lineCap = 'round'; ctx.setLineDash([w * .045 / s, w * .035 / s]);
   ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowOffsetY = 1.2; ctx.stroke(shape); ctx.restore();
  }
 }
 const COLORS = {
  orange: {light: '#ffc58a', base: '#f28a3d', dark: '#c4581e'},
  lime: {light: '#e2f1a6', base: '#a9c95a', dark: '#6f9133'},
  cream: {light: '#fffaf0', base: '#f6e6c3', dark: '#cdb88c'},
  yellow: {light: '#fff0a8', base: '#f5cd45', dark: '#c99a1c'},
  coral: {light: '#ffc0b2', base: '#ee7868', dark: '#bf4a3e'},
  sky: {light: '#d7f1fb', base: '#8fcbe2', dark: '#5a9bb6'},
  pink: {light: '#ffdbe4', base: '#f3a5b9', dark: '#c76f86'},
  green: {light: '#cde6a2', base: '#7fae4f', dark: '#4d7a2c'},
  red: {light: '#ffb0a8', base: '#e65b54', dark: '#a8322e'},
  mint: {light: '#dcf7e8', base: '#8fd4b0', dark: '#4f9a77'},
 };
 const save = (name, c) => { out[name] = c.toDataURL('image/webp', .9).split(',')[1]; };
 // 气球：椭圆身体 + 打结 + 一小段弯弯的麻绳。
 for (const name of ['orange', 'lime', 'cream', 'yellow', 'coral', 'sky', 'pink']) {
  const [c, ctx] = canvas(300, 470), col = COLORS[name];
  const p = new Path2D(); p.moveTo(150, 22); p.bezierCurveTo(262, 22, 290, 140, 270, 210); p.bezierCurveTo(250, 285, 190, 330, 150, 340); p.bezierCurveTo(110, 330, 50, 285, 30, 210); p.bezierCurveTo(10, 140, 38, 22, 150, 22); p.closePath();
  // 麻绳先画，压在气球下面。
  ctx.strokeStyle = '#b8935c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(150, 350); ctx.bezierCurveTo(132, 385, 170, 420, 146, 466); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,.6)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
  felt(ctx, p, {x: 18, y: 22, w: 264, h: 318}, col, {inset: .86, cy: .47});
  const k = new Path2D(); k.moveTo(150, 334); k.lineTo(170, 360); k.quadraticCurveTo(150, 352, 130, 360); k.closePath();
  felt(ctx, k, {x: 128, y: 332, w: 44, h: 30}, col, {stitch: false});
  save('balloon-' + name, c);
 }
 // 五角星（圆角）与爱心。
 function star(cx, cy, R, ri) { const p = new Path2D(); const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  for (let i = 0; i < 10; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 10]; const mx = (ax + bx) / 2, my = (ay + by) / 2; if (i === 0) p.moveTo(mx, my); else p.quadraticCurveTo(ax, ay, mx, my); }
  const [ax, ay] = pts[0], [bx, by] = pts[1]; p.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2); p.closePath(); return p; }
 for (const name of ['yellow', 'pink', 'mint']) { const [c, ctx] = canvas(200, 200); felt(ctx, star(100, 106, 92, 44), {x: 8, y: 14, w: 184, h: 176}, COLORS[name], {inset: .78, cy: .52}); save('star-' + name, c); }
 function heart(w) { const p = new Path2D(); p.moveTo(w / 2, w * .9); p.bezierCurveTo(w * .05, w * .58, w * .02, w * .2, w * .28, w * .12); p.bezierCurveTo(w * .42, w * .08, w * .5, w * .2, w / 2, w * .28); p.bezierCurveTo(w * .5, w * .2, w * .58, w * .08, w * .72, w * .12); p.bezierCurveTo(w * .98, w * .2, w * .95, w * .58, w / 2, w * .9); p.closePath(); return p; }
 for (const name of ['red', 'pink']) { const [c, ctx] = canvas(200, 200); felt(ctx, heart(200), {x: 6, y: 18, w: 188, h: 164}, COLORS[name], {inset: .76, cy: .5, hx: .3, hy: .3}); save('heart-' + name, c); }
 // 彩旗：下垂的麻绳上挂毛毡三角旗，配色取自主插画（绿格纹、橙、奶油、黄）。
 {
  const W = 2400, H = 300, [c, ctx] = canvas(W, H), sag = 70, y0 = 30;
  const rope = x => y0 + sag * (1 - Math.pow((x - W / 2) / (W / 2), 2));
  const order = ['green', 'orange', 'cream', 'yellow', 'coral', 'lime'];
  const flags = 13, fw = 150, fh = 190;
  for (let i = 0; i < flags; i++) {
   const cx = (i + .5) * W / flags, top = rope(cx) + 4, col = COLORS[order[i % order.length]];
   const slope = Math.atan2(rope(cx + 10) - rope(cx - 10), 20);
   ctx.save(); ctx.translate(cx, top); ctx.rotate(slope); ctx.translate(-cx, -top);
   const p = new Path2D(); p.moveTo(cx - fw / 2, top); p.lineTo(cx + fw / 2, top); p.quadraticCurveTo(cx + 8, top + fh * .92, cx, top + fh); p.quadraticCurveTo(cx - 8, top + fh * .92, cx - fw / 2, top); p.closePath();
   ctx.shadowColor = 'rgba(60,40,10,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4; ctx.fillStyle = col.base; ctx.fill(p); ctx.shadowColor = 'transparent';
   felt(ctx, p, {x: cx - fw / 2, y: top, w: fw, h: fh}, col, {inset: .8, cy: .36, hx: .4, hy: .18});
   // 绿旗加格纹，奶油旗加小圆点。
   if (order[i % order.length] === 'green') { ctx.save(); ctx.clip(p); ctx.fillStyle = 'rgba(255,250,225,.28)'; for (let k = -fw; k < fw; k += 26) { ctx.fillRect(cx + k, top, 10, fh); ctx.fillRect(cx - fw, top + k + fw, fw * 2, 10); } ctx.restore(); }
   if (order[i % order.length] === 'cream') { ctx.save(); ctx.clip(p); ctx.fillStyle = 'rgba(232,120,90,.55)'; for (let yy = top + 26; yy < top + fh; yy += 34) for (let xx = cx - fw / 2 + ((yy / 34) % 2 ? 20 : 37); xx < cx + fw / 2; xx += 34) { ctx.beginPath(); ctx.arc(xx, yy, 6, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
   ctx.restore();
  }
  ctx.strokeStyle = '#a77f45'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); for (let x = 0; x <= W; x += 10) { x ? ctx.lineTo(x, rope(x)) : ctx.moveTo(x, rope(x)); } ctx.stroke();
  ctx.strokeStyle = 'rgba(255,235,190,.55)'; ctx.lineWidth = 2; ctx.setLineDash([6, 7]); ctx.stroke(); ctx.setLineDash([]);
  save('bunting', c);
 }
 return out;
})()`;

const profile = mkdtempSync(path.join(tmpdir(), 'felt-'));
const port = 9400 + Math.floor(Math.random() * 400);
const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
try {
 let target;
 for (let i = 0; i < 150 && !target; i++) { await new Promise(r => setTimeout(r, 200)); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
 if (!target) throw Error('Chrome 没有启动');
 const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
 const result = await new Promise(resolve => { ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) resolve(m); }; ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: DRAW, returnByValue: true}})); });
 const files = result.result?.result?.value;
 if (!files) throw Error('绘制失败：' + JSON.stringify(result.result?.exceptionDetails || result));
 mkdirSync(OUT, {recursive: true});
 for (const [name, data] of Object.entries(files)) { const buf = Buffer.from(data, 'base64'); writeFileSync(path.join(OUT, name + '.webp'), buf); console.log(`assets/deco/${name}.webp ${(buf.length / 1024).toFixed(0)} KB`); }
 ws.close();
} finally { proc.kill(); try { rmSync(profile, {recursive: true, force: true}); } catch {} }
