// 生成「全屏拍照背景」：齐齐每个动作只出现一次，避免轮播时看到同一个站姿。
// 输出 assets/photo-backgrounds/*.webp（app.js 的 PHOTO_BACKGROUNDS 引用这些文件）。
// 用法：node scripts/make_photo_backgrounds.mjs   （需要本机安装 Chrome；可用 CHROME=路径 指定）
// 原始 PNG 与抠图留在 assets/photo-backgrounds/ 作为源文件，不发布；本脚本也不发布。
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets/photo-backgrounds');
const CANDIDATES = [process.env.CHROME, ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'])].filter(Boolean);
const chrome = CANDIDATES.find(p => existsSync(p));
if (!chrome) throw Error('没有找到 Chrome，请用 CHROME=路径 指定');

// 两类背景：
// 1. 原图里本身没有重复站姿的插画，原样转成 WebP（keep）。
// 2. 用齐齐的四张动作抠图，在干净的毛毡草地（play-sky）上重新排版（poster）：每张一个动作，天色、标题、配角各不相同。
// 原图里的同一站姿无法干净擦除（没有修图模型），所以不在旧图上覆盖，而是重新排版。
const A = 'assets/', P = 'assets/photo-backgrounds/', D = 'assets/deco/';
const KEEP = [['popart', P + 'fullbleed-happy-popart-v2.png'], ['dreamscape', P + 'fullbleed-dreamscape.png'], ['hall-night', P + 'hall-night-exhibition.png']];
// 每个元素：[图片, 中心x, 底边y, 高度, 选项]；坐标按 1920×1080。kid:true 表示照片抠图，加白色贴纸描边和地面投影。
const POSTERS = [
 {out: 'meadow-ride', sky: 'day', title: A + 'birthday-title.png', items: [
  [D + 'bunting.webp', 960, 150, 150, {width: 1920}],
  [D + 'balloon-sky.webp', 1660, 560, 330, {rot: .08}], [D + 'balloon-yellow.webp', 1800, 520, 300, {rot: .12}], [D + 'balloon-coral.webp', 1560, 600, 280, {rot: -.05}],
  [A + 'little-rooster.png', 1500, 1010, 300], [A + 'little-mouse.png', 1730, 1015, 290],
  [P + 'qiqi-action-cab.png', 760, 1030, 620, {kid: true}]]},
 {out: 'sunset-cake', sky: 'sunset', title: A + 'birthday-title.png', items: [
  [D + 'number-2.webp', 420, 900, 520, {rot: -.06}],
  [D + 'heart-pink.webp', 240, 380, 120, {rot: -.2}], [D + 'heart-red.webp', 1700, 360, 130, {rot: .2}], [D + 'heart-pink.webp', 1540, 520, 90, {rot: .1}],
  [D + 'balloon-pink.webp', 1760, 760, 320, {rot: .06}], [D + 'balloon-orange.webp', 160, 760, 260, {rot: -.08}],
  [P + 'qiqi-action-cake.png', 1080, 1050, 690, {kid: true}]]},
 {out: 'starry-excavator', sky: 'night', title: A + 'birthday-title.png', items: [
  [D + 'star-yellow.webp', 200, 330, 110, {rot: -.2}], [D + 'star-mint.webp', 1720, 300, 90, {rot: .3}], [D + 'star-pink.webp', 1500, 440, 70], [D + 'star-yellow.webp', 380, 520, 70, {rot: .4}], [D + 'star-yellow.webp', 1820, 560, 80],
  [A + 'little-excavator.png', 640, 1010, 430],
  [P + 'qiqi-action-toy-excavator.png', 1300, 1050, 690, {kid: true}]]},
 {out: 'family-helmet', sky: 'morning', title: A + 'family-title.png', items: [
  [D + 'bunting.webp', 960, 150, 150, {width: 1920}],
  [A + 'little-dragon.png', 430, 1010, 420], [A + 'little-rooster.png', 1450, 1000, 360], [A + 'little-mouse.png', 1700, 1010, 340],
  [D + 'balloon-lime.webp', 150, 620, 300, {rot: -.1}], [D + 'balloon-cream.webp', 260, 560, 260, {rot: .05}],
  [P + 'qiqi-action-helmet-truck.png', 940, 1050, 690, {kid: true}]]},
];

const DRAW = (keep, posters) => String.raw`(async () => {
 const cache = {}, load = src => cache[src] ||= new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(Error('load ' + src.slice(0, 60))); i.src = window.SRC[src]; });
 const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
 // 按透明度裁掉四周空白。
 function trim(img, cut = 48) {
  const [c, x] = canvas(img.width, img.height); x.drawImage(img, 0, 0);
  // 去掉素材边缘的淡淡底色（标题图带一层半透明光晕，在夜空上会显出方框）。
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < cut) d[i] = 0;
  x.putImageData(id, 0, 0); let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const [t, tx] = canvas(x1 - x0 + 1, y1 - y0 + 1); tx.drawImage(c, -x0, -y0); return t;
 }
 // 白色贴纸描边：剪影向四周平移后填白。
 function sticker(p, w, h, r) {
  const [m, mx] = canvas(Math.ceil(w + r * 2 + 4), Math.ceil(h + r * 2 + 4));
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) mx.drawImage(p, r + 2 + Math.cos(a) * r, r + 2 + Math.sin(a) * r, w, h);
  mx.globalCompositeOperation = 'source-in'; mx.fillStyle = '#fffdf6'; mx.fillRect(0, 0, m.width, m.height); return m;
 }
 const SKY = {
  day: null,
  morning: [['#ffd9c2', .5], ['#fff1dc', .3]],
  sunset: [['#ff8f6e', .78], ['#ffc988', .6]],
  night: [['#0f1f4d', .86], ['#2b3f86', .72]],
 };
 const out = {};
 for (const [name, src] of ${JSON.stringify(keep)}) { const img = await load(src), [c, x] = canvas(img.width, img.height); x.drawImage(img, 0, 0); out[name] = c.toDataURL('image/webp', .9).split(',')[1]; }
 for (const job of ${JSON.stringify(posters)}) {
  const W = 1920, H = 1080, [c, x] = canvas(W, H); x.imageSmoothingQuality = 'high';
  x.drawImage(await load('assets/play-sky.png'), 0, 0, W, H);
  const sky = SKY[job.sky];
  if (sky) {
   // 天空换色：上方整片染色、到地平线渐隐；夜晚连草地一起压暗。
   const g = x.createLinearGradient(0, 0, 0, H * .66);
   g.addColorStop(0, sky[0][0]); g.addColorStop(.85, sky[1][0]); g.addColorStop(1, sky[1][0] + '00');
   x.save(); x.globalAlpha = sky[0][1]; x.globalCompositeOperation = 'source-over'; x.fillStyle = g; x.fillRect(0, 0, W, H * .66); x.restore();
   if (job.sky === 'night') {
    x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#4a5a92'; x.fillRect(0, 0, W, H); x.restore();
    let seed = 7; const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 140; i++) { const sx = r() * W, sy = r() * H * .55, s = .8 + r() * 2.4; x.fillStyle = 'rgba(255,248,220,' + (.45 + r() * .5) + ')'; x.beginPath(); x.arc(sx, sy, s, 0, 7); x.fill(); }
    x.save(); x.shadowColor = '#fff3b0'; x.shadowBlur = 60; x.fillStyle = '#fff4c4'; x.beginPath(); x.arc(1640, 170, 70, 0, 7); x.fill(); x.restore();
    x.save(); x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(1608, 150, 64, 0, 7); x.fill(); x.restore();
    x.save(); x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#1a2a5c'; x.fillRect(0, 0, W, H); x.restore();
   }
  }
  for (const [src, cx, bottom, height, opt = {}] of job.items) {
   const p = trim(await load(src)); let h = height, w = p.width * h / p.height;
   if (opt.width) { w = opt.width; h = p.height * w / p.width; }
   x.save(); x.translate(cx, bottom); x.rotate(opt.rot || 0);
   if (opt.kid) {
    x.save(); x.filter = 'blur(16px)'; x.fillStyle = 'rgba(30,40,10,.38)'; x.beginPath(); x.ellipse(0, -6, w * .42, h * .035, 0, 0, 7); x.fill(); x.restore();
    const r = 10, m = sticker(p, w, h, r);
    x.save(); x.shadowColor = 'rgba(30,20,0,.35)'; x.shadowBlur = 22; x.shadowOffsetY = 8; x.drawImage(m, -w / 2 - r - 2, -h - r - 2); x.restore();
   } else if (!opt.width) { x.shadowColor = 'rgba(30,20,0,.28)'; x.shadowBlur = 18; x.shadowOffsetY = 8; }
   x.drawImage(p, -w / 2, -h, w, h); x.restore();
  }
  const t = trim(await load(job.title), 150), tw = 1000, th = t.height * tw / t.width;
  x.save(); x.shadowColor = 'rgba(0,0,0,.25)'; x.shadowBlur = 20; x.shadowOffsetY = 6; x.drawImage(t, (W - tw) / 2, 120, tw, th); x.restore();
  out[job.out] = c.toDataURL('image/webp', .9).split(',')[1];
 }
 return JSON.stringify(out);
})()`;

const used = new Set([...KEEP.map(k => k[1]), 'assets/play-sky.png', ...POSTERS.flatMap(p => [p.title, ...p.items.map(i => i[0])])]);
const SRC = Object.fromEntries([...used].map(f => [f, `data:image/${f.endsWith('.webp') ? 'webp' : 'png'};base64,` + readFileSync(path.join(ROOT, f)).toString('base64')]));
const port = 9300 + Math.floor(Math.random() * 500), profile = mkdtempSync(path.join(tmpdir(), 'photo-bg-'));
const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
try {
 let target;
 for (let i = 0; i < 50 && !target; i++) { await new Promise(r => setTimeout(r, 200)); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
 if (!target) throw Error('Chrome 没有启动');
 const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
 const reply = new Promise(r => ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) r(m); });
 ws.send(JSON.stringify({id: 0, method: 'Runtime.evaluate', params: {expression: 'window.SRC=' + JSON.stringify(SRC)}}));
 ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: DRAW(KEEP, POSTERS), awaitPromise: true, returnByValue: true}}));
 const m = await reply; ws.close();
 if (m.result?.exceptionDetails) throw Error(JSON.stringify(m.result.exceptionDetails).slice(0, 400));
 for (const [name, data] of Object.entries(JSON.parse(m.result.result.value))) { const buf = Buffer.from(data, 'base64'); writeFileSync(path.join(DIR, name + '.webp'), buf); console.log(`assets/photo-backgrounds/${name}.webp ${(buf.length / 1024).toFixed(0)} KB`); }
} finally { proc.kill(); rmSync(profile, {recursive: true, force: true}); }
