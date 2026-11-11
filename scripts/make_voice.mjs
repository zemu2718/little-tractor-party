// 预生成角色台词配音：从 app.js 提取全部台词，用微软神经语音合成 MP3，
// 写入 assets/voice/ 并生成清单 voice.js。页面播放时优先家人录音，其次这些配音，最后才用设备语音。
// 两种生成方式（会把台词文本发送到微软语音服务，生成后的文件离线可用）：
//   1) Azure 语音服务（推荐，正规接口，免费层每月 50 万字）：
//      AZURE_SPEECH_KEY=密钥 AZURE_SPEECH_REGION=eastasia node scripts/make_voice.mjs
//   2) edge-tts（pip3 install -U edge-tts）：未设置 AZURE_SPEECH_KEY 时使用；微软可能拒绝（403）。
// 选项：--force 全部重做；--only 关键字 只生成包含关键字的台词（试听用）。
import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/voice');
const force = process.argv.includes('--force');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;

// 角色音色：小龙齐齐用男童声，鼠妈妈温柔女声，公鸡爸爸活泼男声，旁白用可爱女声。
// style 为 Azure 的情感风格（edge-tts 不支持，会忽略）。
export const VOICES = {
  narrator: {voice: 'zh-CN-XiaoyiNeural', rate: '-8%', pitch: '+0Hz', style: 'cheerful'},
  dragon: {voice: 'zh-CN-YunxiaNeural', rate: '-5%', pitch: '+0Hz', style: 'cheerful'},
  mouse: {voice: 'zh-CN-XiaoxiaoNeural', rate: '-10%', pitch: '+2Hz', style: 'affectionate'},
  rooster: {voice: 'zh-CN-YunxiNeural', rate: '-5%', pitch: '+0Hz', style: 'cheerful'},
  excavator: {voice: 'zh-CN-YunxiaNeural', rate: '+0%', pitch: '-6Hz', style: 'cheerful'},
};

// 从 app.js 取出台词数据（只解析字面量，不执行页面代码）。
export function collectLines(source) {
  const literal = name => {
    const at = source.indexOf(`const ${name}=`);
    if (at < 0) throw Error('找不到台词数据 ' + name);
    let i = source.indexOf('=', at) + 1, depth = 0, quote = null;
    const start = i;
    for (; i < source.length; i++) {
      const c = source[i];
      if (quote) { if (c === '\\') i++; else if (c === quote) quote = null; continue; }
      if (c === "'" || c === '"' || c === '`') quote = c;
      else if ('[{'.includes(c)) depth++;
      else if (']}'.includes(c) && --depth === 0) break;
    }
    return Function('"use strict";return (' + source.slice(start, i + 1) + ')')();
  };
  const items = new Map();
  const add = (kind, text) => { if (text) items.set(`${kind}|${text}`, {kind, text}); };
  const lines = literal('lines');
  for (const [kind, list] of Object.entries(lines)) for (const text of list) add(kind === 'two' ? 'narrator' : kind, text);
  for (const list of Object.values(literal('HINTS'))) for (const [, text] of list) add('narrator', text);
  for (const pair of Object.values(literal('FIND'))) pair.forEach(text => add('narrator', text));
  literal('ALBUM_LINES').forEach(text => add('narrator', text));
  literal('PHOTO_TAP').forEach(text => add('narrator', text));
  literal('COUNTDOWN').forEach(text => add('narrator', text));
  for (const m of source.matchAll(/(?:voice\.speak|speakFor)\('(\w+)','([^']+)'/g)) add(m[1], m[2]);
  return [...items.values()];
}

// 后期处理：切掉首尾静音、轻压缩、统一峰值到 -1.5 dBFS，让所有台词一样响、倒数更干脆。
// 需要 ffmpeg（macOS：brew install ffmpeg）；没有时保留原始音频并提示。改动这里的参数要同时改 POLISH 以便重新生成。
export const POLISH = 'trim-comp-peak1.5-v1';
export const fileFor = ({kind, text}) => `${kind}-${createHash('sha1').update(`${kind}|${text}|${JSON.stringify(VOICES[kind] || VOICES.narrator)}|${POLISH}`).digest('hex').slice(0, 10)}.mp3`;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {stdio: ['ignore', 'pipe', 'pipe']});
    let out = '';
    child.stdout.on('data', d => out += d); child.stderr.on('data', d => out += d);
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(out) : reject(Error(out.trim().split('\n').pop())));
  });
}
let polishWarned = false;
async function polish(target) {
  const tmp = target + '.tmp.mp3';
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.08,areverse,acompressor=threshold=-20dB:ratio=3:attack=5:release=120:makeup=2';
  try {
    const probe = await run(FFMPEG, ['-hide_banner', '-i', target, '-af', trim + ',volumedetect', '-f', 'null', '-']);
    const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(probe)?.[1] ?? 0);
    await run(FFMPEG, ['-hide_banner', '-y', '-i', target, '-af', `${trim},volume=${(-1.5 - peak).toFixed(2)}dB,alimiter=limit=0.85`, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '64k', tmp]);
    writeFileSync(target, readFileSync(tmp)); unlinkSync(tmp);
  } catch (e) {
    try { unlinkSync(tmp); } catch {}
    if (!polishWarned) { polishWarned = true; console.warn('⚠ 没有可用的 ffmpeg，配音保留原始音量与首尾静音：' + e.message); }
  }
}

const ready = file => { try { return statSync(file).size > 0; } catch { return false; } };
const escapeXml = t => t.replace(/[<>&'"]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'}[c]));

// ---- 方式 1：Azure 语音服务 REST 接口 ----
async function azure(text, {voice, rate, pitch, style}, target) {
  const key = process.env.AZURE_SPEECH_KEY, region = process.env.AZURE_SPEECH_REGION || 'eastasia';
  const body = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='zh-CN'><voice name='${voice}'>` +
    (style ? `<mstts:express-as style='${style}'>` : '') + `<prosody rate='${rate}' pitch='${pitch}'>${escapeXml(text)}</prosody>` + (style ? '</mstts:express-as>' : '') + '</voice></speak>';
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {method: 'POST', body, headers: {
    'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'party-voice-script'}});
  if (r.status === 401 || r.status === 403) throw Object.assign(Error(`Azure 拒绝访问（${r.status}）：请检查密钥和区域 AZURE_SPEECH_REGION`), {fatal: true});
  if (!r.ok) throw Error(`Azure 返回 ${r.status} ${await r.text().catch(() => '')}`.trim());
  const data = Buffer.from(await r.arrayBuffer());
  if (!data.length) throw Error('Azure 没有返回音频');
  writeFileSync(target, data);
}

// ---- 方式 2：开源命令行工具 edge-tts ----
function edge(text, {voice, rate, pitch}, target) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.EDGE_TTS || 'edge-tts', [`--voice=${voice}`, `--rate=${rate}`, `--pitch=${pitch}`, `--text=${text}`, `--write-media=${target}`], {stdio: ['ignore', 'ignore', 'pipe']});
    let err = '';
    child.stderr.on('data', d => err += d);
    child.on('error', e => reject(Object.assign(Error(e.code === 'ENOENT' ? '没有找到 edge-tts，请先运行：pip3 install edge-tts' : e.message), {fatal: true})));
    child.on('close', code => {
      if (code === 0 && ready(target)) return resolve();
      const last = err.trim().split('\n').pop() || '退出码 ' + code;
      reject(Object.assign(Error(/403/.test(last) ? '微软拒绝了 edge-tts 的连接（403）。可先运行 pip3 install -U edge-tts 升级再试；仍不行请改用 Azure 语音服务（见脚本开头说明）。' : last), {fatal: /403/.test(last)}));
    });
  });
}

function writeManifest(manifest) {
  writeFileSync(path.join(OUT, 'voice.js'),
    '/* 由 scripts/make_voice.mjs 生成：角色台词的预生成配音（微软神经语音）。键为「角色|台词」；没有配音的台词由页面改用设备语音。 */\n' +
    'window.PARTY_VOICE=' + JSON.stringify(manifest, null, 1) + ';\n');
}

async function main() {
  const items = collectLines(readFileSync(path.join(ROOT, 'app.js'), 'utf8'));
  const engine = process.env.AZURE_SPEECH_KEY ? azure : edge;
  console.log(`使用 ${engine === azure ? 'Azure 语音服务' : 'edge-tts'}，共 ${items.length} 句台词。`);
  mkdirSync(OUT, {recursive: true});
  const manifest = {}, used = new Set();
  let made = 0, kept = 0, error = null;
  for (const item of items) {
    const file = fileFor(item), target = path.join(OUT, file);
    used.add(file);
    const skip = (only && !item.text.includes(only)) || (ready(target) && !force);
    if (!skip && !error) {
      for (let attempt = 1; ; attempt++) {
        try { await engine(item.text, VOICES[item.kind] || VOICES.narrator, target); await polish(target); made++; console.log('✓', item.kind, item.text); break; }
        catch (e) {
          try { unlinkSync(target); } catch {}
          if (attempt >= 3 || e.fatal) { error = Error(`${item.text}：${e.message}`); break; }
          await new Promise(r => setTimeout(r, 1500 * attempt));
        }
      }
      await new Promise(r => setTimeout(r, 200));
    } else if (ready(target)) kept++;
    // 清单只登记真正生成成功的文件。
    if (ready(target)) manifest[`${item.kind}|${item.text}`] = file;
  }
  // 清理空文件和不再使用的旧配音。
  for (const name of readdirSync(OUT)) if (name.endsWith('.mp3') && (!used.has(name) || !ready(path.join(OUT, name)))) unlinkSync(path.join(OUT, name));
  writeManifest(manifest);
  console.log(`已配音 ${Object.keys(manifest).length}/${items.length} 句（本次新生成 ${made}，沿用 ${kept}）。`);
  if (error) throw error;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error('生成失败：', e.message); process.exitCode = 1; });
