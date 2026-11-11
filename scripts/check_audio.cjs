const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../audio.js'),'utf8');
let context,oscillators=0;
function node(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},frequency:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){return this;},disconnect(){this.disconnected=true;},start(){},stop(){}};}
class Context{constructor(){context=this;this.state='running';this.currentTime=0;this.destination={};}createGain(){return node();}createOscillator(){oscillators++;return node();}async resume(){this.state='running';}async suspend(){this.state='suspended';}}
const window={AudioContext:Context},document={hidden:false};const timers=new Set();vm.runInNewContext(code,{window,document,setTimeout:(f,ms)=>{const id={f,ms};timers.add(id);return id;},clearTimeout:id=>timers.delete(id)});const audio=window.PartyAudio;
(async()=>{
 await audio.effect('dragon');assert.equal(oscillators,0);await audio.setEnabled(true);const song=await audio.song();assert.equal(song.lines.length,4);assert(song.total>10);assert(oscillators>0);audio.stopSong();await audio.setEnabled(false);const before=oscillators;await audio.effect('mouse');assert.equal(oscillators,before);
 await audio.setEnabled(true);await audio.suspend();let resume;context.resume=()=>new Promise(r=>resume=r);const pending=audio.song();audio.stopSong();resume();assert.equal(await pending,null);assert.equal(oscillators,before);
 context.state='running';await audio.setEnabled(true);const beforeLoop=oscillators;await audio.startLoop();assert(oscillators>beforeLoop);assert(timers.size>0);audio.stopLoop();const afterStop=oscillators;for(const t of [...timers])t.f();assert.equal(oscillators,afterStop);
 context.state='running';document.hidden=true;await audio.effect('rooster');assert.equal(oscillators,afterStop);assert.equal(await audio.song(),null);
 console.log('PASS: audio opt-in, song timing, mute, cancelled pending audio, hidden-page silence, built-in loop start/stop');
 await samples();
})().catch(e=>{console.error(e);process.exitCode=1;});

// 真实音效：http 下解码播放并替换合成音；mix 叠加合成音；文件缺失时退回合成音；file:// 下用 <audio>。
async function samples(){
 const PARTY_SFX={rooster:[{src:'a.mp3',start:1,end:2.5,gain:.9},{src:'b.mp3'}],party:[{src:'c.mp3',start:.5,end:1.5,mix:true}],mouse:[{src:'missing.mp3'}],bad:[{src:'../x.mp3'}]};
 function run(protocol){
  let osc=0,sources=[],fetched=[],els=[];
  const n=()=>({gain:{value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}},frequency:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){return this;},disconnect(){},start(...a){this.started=a;},stop(){}});
  class Ctx{constructor(){this.state='running';this.currentTime=0;this.destination={};}createGain(){return n();}createOscillator(){osc++;return n();}createBufferSource(){const s=n();sources.push(s);return s;}decodeAudioData(data,ok){return Promise.resolve({duration:data.len});}async resume(){}}
  class Audio{constructor(src){this.src=src;els.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}}
  const window={AudioContext:Ctx,PARTY_SFX,location:{protocol},Audio,fetch:async url=>{fetched.push(url);if(url.includes('missing'))return {ok:false,status:404};return {ok:true,arrayBuffer:async()=>({len:3})};}};
  vm.runInNewContext(code,{window,document:{hidden:false},setTimeout:(f,ms)=>{if(ms<=400)setImmediate(f);return 0;},clearTimeout(){}});
  return {audio:window.PartyAudio,get osc(){return osc;},sources,fetched,els};
 }
 const h=run('https:');await h.audio.setEnabled(true);await new Promise(r=>setImmediate(r));
 assert(h.fetched.every(u=>u.startsWith('assets/sfx/'))&&!h.fetched.some(u=>u.includes('..')),'只加载 assets/sfx/ 下的合法文件名');
 assert.equal(await h.audio.effect('rooster'),1.5);assert.equal(h.osc,0);assert.deepEqual(h.sources[0].started.slice(1),[1,1.5]);
 assert.equal(await h.audio.effect('rooster'),3,'第二段整段播放并轮换');
 const before=h.osc;assert(await h.audio.effect('party')>=1);assert(h.osc>before,'mix 同时播放合成礼炮');
 const m=h.osc;assert(await h.audio.effect('mouse')>0);assert(h.osc>m,'录音缺失时退回合成音');
 const d=h.osc;await h.audio.effect('dragon');assert(h.osc>d,'未登记的种类用合成音');
 const f=run('file:');await f.audio.setEnabled(true);assert.equal(f.fetched.length,0);
 assert.equal(await f.audio.effect('rooster'),1.5);assert.equal(f.els[0].src,'assets/sfx/a.mp3#t=1,2.5');assert.equal(f.osc,0);
 f.audio.stopEffects();assert(f.els[0].paused,'停止音效时暂停 <audio>');
 console.log('PASS: real sfx samples (decode, trim, rotate, mix, fallback, file:// audio element, stop)');
}
