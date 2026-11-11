/* 原生合成音 + 可选的本地真实音效（assets/sfx/，清单见 sfx.js）。不加载网络音频，所有声音都从用户操作开始。 */
'use strict';
window.PartyAudio = (() => {
 const MASTER=.68;
 let context, bus, songBus, loopBus, enabled=false, songId=0, effectId=0, loopId=0, loopTimer, loopLevel=.75, ducked=false;
 const effectBuses=new Set(),sampleEls=new Set();
 // 真实音效：kind → {list, next}；src → Promise<AudioBuffer|null>。file:// 下无法 fetch，改用 <audio> 播放。
 const SFX_BASE='assets/sfx/',buffers=new Map();let samples;
 const SYNTH_LEN={rooster:1.2,dragon:.9,excavator:1.6,drive:1.6,honk:.5,mouse:.45,party:1.8,found:.6,puff:.7,applause:1};
 const notes={F2:87.31,G2:98,A2:110,C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,B5:987.77,C6:1046.5,E6:1318.5,G6:1568};
 const melody=[['G4',.75],['G4',.25],['A4',1],['G4',1],['C5',1],['B4',2],['G4',.75],['G4',.25],['A4',1],['G4',1],['D5',1],['C5',2],['G4',.75],['G4',.25],['G5',1],['E5',1],['C5',1],['B4',1],['A4',2],['F5',.75],['F5',.25],['E5',1],['C5',1],['D5',1],['C5',3]];
 // 圆舞曲伴奏：每拍对应的和弦（拍号从弱起后的第一拍开始计）。
 const chordChanges=[[1,'C'],[4,'G'],[7,'G'],[10,'C'],[13,'C'],[16,'F'],[19,'F'],[20,'C'],[22,'G'],[23,'C']];
 const chords={C:{bass:'C3',triad:['C4','E4','G4']},G:{bass:'G2',triad:['B3','D4','G4']},F:{bass:'F2',triad:['A3','C4','F4']}};
 const BEAT=.58;
 async function ready(){
  if(!context){
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('此浏览器不支持合成音');
   context=new AC();bus=context.createGain();bus.gain.value=MASTER;
   if(context.createDynamicsCompressor){const limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=10;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.2;bus.connect(limiter);limiter.connect(context.destination);}
   else bus.connect(context.destination);
  }
  if(context.state==='suspended')await context.resume();
  return context;
 }
 function tone(hz,time,duration,volume=.25,type='sine',target=bus,endHz){
  const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(hz,time);
  if(endHz)oscillator.frequency.linearRampToValueAtTime(endHz,time+duration);
  gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(volume,time+.02);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  oscillator.connect(gain).connect(target);oscillator.start(time);oscillator.stop(time+duration+.04);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
 }
 // 白噪声：用于“砰”、气球爆破、吹气与沙锤；不支持时安静跳过。
 function noise(time,duration,volume,target,type='bandpass',from=1200,to){
  if(!context.createBuffer||!context.createBufferSource||!context.createBiquadFilter)return;
  const length=Math.max(1,Math.floor(context.sampleRate*duration)),buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  source.buffer=buffer;filter.type=type;filter.frequency.setValueAtTime(from,time);if(to)filter.frequency.exponentialRampToValueAtTime(to,time+duration);
  gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
  source.connect(filter).connect(gain).connect(target);source.start(time);source.stop(time+duration+.02);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 // 经滤波的音色，用于动物叫声和喇叭。
 function voiced(hz,time,duration,volume,target,endHz,type='sawtooth',center=1400){
  if(!context.createBiquadFilter){tone(hz,time,duration,volume,'sine',target,endHz);return;}
  const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=center;filter.Q.value=1.2;filter.connect(target);
  tone(hz,time,duration,volume,type,filter,endHz);setTimeout(()=>filter.disconnect(),(time-context.currentTime+duration+.3)*1000);
 }
 function crow(t,target){[[480,600,.12],[620,700,.12],[700,950,.2],[950,620,.6]].reduce((at,[a,b,d])=>{voiced(a,at,d,.5,target,b);voiced(a*2,at,d,.12,target,b*2);return at+d+.03;},t);}
 function roar(t,target){voiced(260,t,.22,.45,target,420,'sawtooth',900);voiced(420,t+.22,.35,.4,target,240,'sawtooth',900);}
 function honk(t,target){voiced(440,t,.16,.35,target,null,'square',1100);voiced(554,t,.16,.25,target,null,'square',1100);voiced(440,t+.22,.24,.35,target,null,'square',1100);voiced(554,t+.22,.24,.25,target,null,'square',1100);}
 function bell(hz,t,d,v,target){tone(hz,t,d,v,'sine',target);tone(hz*2,t,d*.6,v*.22,'sine',target);tone(hz*3,t,d*.25,v*.06,'sine',target);}
 function stopEffects(){effectId++;for(const el of sampleEls)el.pause();sampleEls.clear();if(!context)return;for(const node of effectBuses){node.gain.setValueAtTime(0,context.currentTime);node.disconnect();}effectBuses.clear();}
 function sampleTable(){
  if(samples)return samples;samples=new Map();const raw=window.PARTY_SFX;
  if(raw&&typeof raw==='object')for(const [kind,list] of Object.entries(raw)){const ok=(Array.isArray(list)?list:[list]).filter(i=>i&&typeof i.src==='string'&&/^[\w.-]+$/.test(i.src));if(ok.length)samples.set(kind,{list:ok,next:0});}
  return samples;
 }
 const canFetch=()=>/^https?:$/.test(window.location?.protocol||'')&&typeof window.fetch==='function'&&Boolean(context?.decodeAudioData);
 function loadBuffer(src){
  if(!buffers.has(src))buffers.set(src,!canFetch()?Promise.resolve(null):window.fetch(SFX_BASE+src).then(r=>{if(!r.ok)throw Error(r.status);return r.arrayBuffer();})
   .then(data=>new Promise((ok,fail)=>{const p=context.decodeAudioData(data,ok,fail);if(p?.then)p.then(ok,fail);})).catch(()=>null));
  return buffers.get(src);
 }
 function preload(){for(const {list} of sampleTable().values())list.forEach(i=>loadBuffer(i.src));}
 // 播放一段真实音效，返回 {length, mix}；length 为 0 表示没有可用录音，由调用方改用合成音。
 async function playSample(kind,out,run){
  const entry=sampleTable().get(kind),none={length:0};if(!entry)return none;
  const item=entry.list[entry.next++%entry.list.length],gain=Number.isFinite(item.gain)?item.gain:1;
  if(canFetch()){
   // 首次点击若还没解码完，最多等 0.4 秒，否则本次先用合成音。
   const buffer=await Promise.race([loadBuffer(item.src),new Promise(r=>setTimeout(()=>r(null),400))]);
   if(!buffer||run!==effectId||!enabled)return none;
   const start=Math.min(Math.max(0,item.start||0),buffer.duration),end=Math.min(item.end||buffer.duration,buffer.duration),length=end-start;if(length<=0)return none;
   const source=context.createBufferSource(),level=context.createGain();source.buffer=buffer;level.gain.value=gain;
   source.connect(level).connect(out);source.start(context.currentTime+.02,start,length);source.onended=()=>{source.disconnect();level.disconnect();};
   return {length,mix:Boolean(item.mix)};
  }
  if(typeof window.Audio!=='function')return none;
  // 离线双击打开时：用媒体片段 #t= 截取，并按时长兜底停止。
  const start=item.start||0,length=item.end?item.end-start:SYNTH_LEN[kind]||1,el=new window.Audio(`${SFX_BASE}${item.src}#t=${start}${item.end?','+item.end:''}`);
  el.volume=Math.min(1,gain*MASTER);sampleEls.add(el);const done=()=>{el.pause();sampleEls.delete(el);};
  setTimeout(done,(length+.3)*1000);el.onended=done;
  try{await el.play();if(run===effectId&&enabled)return {length,mix:Boolean(item.mix)};done();return none;}catch{done();return none;}
 }
 function stopSong(){songId++;if(songBus){songBus.gain.setValueAtTime(0,context.currentTime);songBus.disconnect();songBus=null;}}
 function stopLoop(){loopId++;clearTimeout(loopTimer);if(loopBus){loopBus.gain.setValueAtTime(0,context.currentTime);loopBus.disconnect();loopBus=null;}}
 async function setEnabled(value){enabled=value;if(value){await ready();if(enabled){bus.gain.setValueAtTime(MASTER,context.currentTime);preload();}}else{stopSong();stopEffects();stopLoop();if(bus)bus.gain.setValueAtTime(0,context.currentTime);}}
 async function song(){
  stopEffects();stopSong();stopLoop();const run=songId;await ready();if(run!==songId||!enabled||document.hidden)return null;
  songBus=context.createGain();songBus.connect(bus);const start=context.currentTime+.12;let time=start,beat=0;const lines=[];
  melody.forEach(([name,duration],i)=>{if([0,6,12,19].includes(i))lines.push(time-start+.12);bell(notes[name],time,Math.max(.65,duration*.8),.3,songBus);time+=duration*BEAT;beat+=duration;});
  // 伴奏：低音“嘭”+ 两拍轻和弦“嚓嚓”+ 每拍沙锤。
  let chord='C';
  for(let b=1;b<beat;b++){
   const change=chordChanges.find(([at])=>at===b);if(change)chord=change[1];
   const t=start+b*BEAT,c=chords[chord];
   if((b-1)%3===0||change)tone(notes[c.bass],t,.5,.2,'triangle',songBus);
   else c.triad.forEach(n=>tone(notes[n],t,.28,.045,'triangle',songBus));
   noise(t,.07,.05,songBus,'highpass',6000);
  }
  // 结尾和弦与欢呼小号角。
  const end=start+beat*BEAT;[...chords.C.triad,'C5'].forEach(n=>bell(notes[n],end-.6,1.8,.09,songBus));
  return {lines,total:time-start+.8};
 }
 // 返回音效时长（秒），便于台词等叫声结束再开口；没有播放时返回 0。
 async function effect(kind){
  if(!enabled)return 0;const run=effectId;await ready();if(run!==effectId||!enabled||document.hidden)return 0;
  const out=context.createGain();out.connect(bus);effectBuses.add(out);setTimeout(()=>{if(effectBuses.delete(out))out.disconnect();},6000);
  if(sampleTable().has(kind)){const {length,mix}=await playSample(kind,out,run);if(run!==effectId||!enabled)return 0;if(length&&!mix)return length;synth(kind,out);return Math.max(length,SYNTH_LEN[kind]||.5);}
  synth(kind,out);return SYNTH_LEN[kind]||.5;
 }
 function synth(kind,out){
  const t=context.currentTime+.02;
  // 老鼠“吱吱吱”：三声快速上滑的高音。
  if(kind==='mouse'){for(let i=0;i<3;i++){tone(2300,t+i*.13,.08,.2,'sine',out,3300);tone(4600,t+i*.13,.06,.04,'sine',out,6200);}}
  // 公鸡“喔喔喔～”：锯齿波经带通滤波，四个音节由低到高再拖长下滑。
  else if(kind==='rooster'){crow(t,out);}
  // 小龙“嗷呜～”：带颤音的可爱叫声，后接亮晶晶的铃声。
  else if(kind==='dragon'){roar(t,out);['C6','E6','G6'].forEach((n,i)=>bell(notes[n],t+.55+i*.1,.5,.12,out));}
  else if(kind==='excavator'||kind==='drive'){for(let i=0;i<8;i++)tone(92,t+i*.12,.11,.32,'triangle',out,70);noise(t,1,.12,out,'lowpass',400,150);honk(t+1,out);}
  else if(kind==='honk'){honk(t,out);}
  else if(kind==='pop'){tone(900,t,.09,.3,'sine',out,180);noise(t,.12,.35,out,'highpass',1500);bell(notes.E6,t+.06,.3,.08,out);}
  else if(kind==='twinkle'){const scale=['C6','E6','G6','A5','G5','E5'];bell(notes[scale[Math.floor(Math.random()*scale.length)]],t,.5,.14,out);bell(notes[scale[Math.floor(Math.random()*scale.length)]],t+.09,.4,.1,out);}
  else if(kind==='beep'){bell(notes.A5,t,.35,.28,out);}
  else if(kind==='puff'){noise(t,.7,.45,out,'lowpass',2600,300);bell(notes.C6,t,.4,.16,out);}
  else if(kind==='party'){
   tone(160,t,.32,.5,'sine',out,45);noise(t,.35,.5,out,'lowpass',3000,200);
   ['C5','E5','G5','C6'].forEach((n,i)=>bell(notes[n],t+.28+i*.12,.6,.22,out));bell(notes.E6,t+.82,1.2,.2,out);bell(notes.G6,t+.82,1.2,.12,out);
   for(let i=0;i<14;i++)noise(t+.4+i*.09+Math.random()*.05,.05,.12,out,'bandpass',2200+Math.random()*1800);
  }
  else if(kind==='applause'){for(let i=0;i<22;i++)noise(t+i*.045+Math.random()*.03,.05,.16,out,'bandpass',1500+Math.random()*1500);['C5','E5','G5','C6'].forEach((n,i)=>bell(notes[n],t+i*.1,.6,.14,out));}
  else if(kind==='found'){['G5','A5','B5','C6','E6'].forEach((n,i)=>bell(notes[n],t+i*.09,.5,.22,out));noise(t,.25,.12,out,'highpass',5000);}
  else {['C5','E5','G5'].forEach((n,i)=>bell(notes[n],t+i*.15,.8,.24,out));}
 }
 // 相册内置轻快八音盒循环：原创旋律，提前 0.6 秒排程。
 const loopMelody=['C5','E5','G5','E5','A5','G5','E5','C5','D5','F5','A5','F5','G5','E5','D5',null,'E5','G5','C6','G5','A5','G5','E5','G5','F5','E5','D5','B4','C5',null,'G4',null];
 const loopBass=['C3','F3','C3','G2'],STEP=.27;
 async function startLoop(){
  if(loopBus)return;const run=++loopId;await ready();if(run!==loopId||!enabled||document.hidden||loopBus)return;
  loopBus=context.createGain();loopBus.gain.value=loopGain();loopBus.connect(bus);let next=context.currentTime+.1,step=0;
  const pump=()=>{if(run!==loopId)return;while(next<context.currentTime+.6){const n=loopMelody[step%loopMelody.length];if(n)bell(notes[n],next,.6,.12,loopBus);if(step%8===0)tone(notes[loopBass[(step/8|0)%loopBass.length]],next,1.6,.13,'triangle',loopBus);if(step%2===0)noise(next,.04,.025,loopBus,'highpass',7000);next+=STEP;step++;}loopTimer=setTimeout(pump,200);};
  pump();
 }
 // 背景循环音量：派对展示时更轻；角色说话时自动压低（ducking），说完再慢慢恢复。
 const loopGain=()=>loopLevel*(ducked?.3:1);
 function applyLoop(){if(!loopBus||!context)return;const g=loopBus.gain;if(g.setTargetAtTime)g.setTargetAtTime(loopGain(),context.currentTime,ducked?.06:.35);else g.value=loopGain();}
 function setLoopLevel(value){loopLevel=value;applyLoop();}
 function duck(on){ducked=Boolean(on);applyLoop();}
 async function suspend(){stopEffects();stopLoop();if(context&&context.state==='running')await context.suspend();}
 return {setEnabled,song,stopSong,stopEffects,effect,startLoop,stopLoop,suspend,setLoopLevel,duck};
})();
