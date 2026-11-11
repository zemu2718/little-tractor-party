// 把「全屏拍照背景」的 AI 生图转成发布用的 WebP 和缩略图：assets/photo-backgrounds/<名字>.webp、<名字>.thumb.webp。
// 背景只用生图工具生成的完整插画（提示词见 scripts/photo-background-prompts.md 和 image-prompts.json），这里只做缩放和编码，不拼贴、不绘制。
// 用法：node scripts/make_photo_backgrounds.mjs   （需要本机安装 Chrome；可用 CHROME=路径 指定）
// 源 PNG 留在 assets/photo-backgrounds/ 不发布；新增背景时在 BACKGROUNDS 里登记，并同步 app.js 的 PHOTO_BACKGROUNDS。
import {spawn} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets/photo-backgrounds');
const CANDIDATES = [process.env.CHROME, ...(process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'])].filter(Boolean);
const chrome = CANDIDATES.find(p => existsSync(p));
if (!chrome) throw Error('没有找到 Chrome，请用 CHROME=路径 指定');

// [输出名, 源文件]。输出最宽 2560：电视上依然清楚，手机解码也不吃力；源图更小时保持原尺寸。
const BACKGROUNDS = [
 ['popart', 'assets/photo-backgrounds/fullbleed-happy-popart-v2.png'],
 ['felt-farm', 'assets/birthday-background-4k.png'],
 ['hall-night', 'assets/photo-backgrounds/hall-night-exhibition.png'],
 ['felt-cake', 'assets/birthday-cake-4k.png'],
 ['dreamscape', 'assets/photo-backgrounds/fullbleed-dreamscape.png'],
];
const MAX_WIDTH = 2560;

const DRAW = String.raw`(async () => {
 const load = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(Error('load failed')); i.src = src; });
 const encode = (img, w, q) => { const h = Math.round(img.height * w / img.width), c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h); return c.toDataURL('image/webp', q).split(',')[1]; };
 const out = {};
 for (const [name, src] of Object.entries(window.SRC)) { const img = await load(src); out[name] = encode(img, Math.min(img.width, ${MAX_WIDTH}), .9); out[name + '.thumb'] = encode(img, 384, .82); }
 return JSON.stringify(out);
})()`;

for (const [, f] of BACKGROUNDS) if (!existsSync(path.join(ROOT, f))) throw Error('缺少源图 ' + f);
const SRC = Object.fromEntries(BACKGROUNDS.map(([n, f]) => [n, 'data:image/png;base64,' + readFileSync(path.join(ROOT, f)).toString('base64')]));
const port = 9300 + Math.floor(Math.random() * 500), profile = mkdtempSync(path.join(tmpdir(), 'photo-bg-'));
const proc = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], {stdio: 'ignore'});
try {
 let target;
 for (let i = 0; i < 50 && !target; i++) { await new Promise(r => setTimeout(r, 200)); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
 if (!target) throw Error('Chrome 没有启动');
 const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
 const reply = new Promise(r => ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) r(m); });
 ws.send(JSON.stringify({id: 0, method: 'Runtime.evaluate', params: {expression: 'window.SRC=' + JSON.stringify(SRC)}}));
 ws.send(JSON.stringify({id: 1, method: 'Runtime.evaluate', params: {expression: DRAW, awaitPromise: true, returnByValue: true}}));
 const m = await reply; ws.close();
 if (m.result?.exceptionDetails) throw Error(JSON.stringify(m.result.exceptionDetails).slice(0, 600));
 // 先删掉旧的输出，免得撤下的背景还被打包。
 for (const f of readdirSync(DIR)) if (f.endsWith('.webp')) rmSync(path.join(DIR, f));
 for (const [name, data] of Object.entries(JSON.parse(m.result.result.value))) { const buf = Buffer.from(data, 'base64'); writeFileSync(path.join(DIR, name + '.webp'), buf); console.log(`assets/photo-backgrounds/${name}.webp ${(buf.length / 1024).toFixed(0)} KB`); }
} finally { proc.kill(); rmSync(profile, {recursive: true, force: true}); }
