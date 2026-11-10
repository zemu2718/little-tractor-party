/* 原生合成音：不加载网络音频。所有声音都从用户操作开始。 */
'use strict';
window.PartyAudio = (() => {
 const MASTER=.68;
 let context, bus, songBus, loopBus, enabled=false, songId=0, effectId=0, loopId=0, loopTimer;
 const effectBuses=new Set();
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
 function bell(hz,t,d,v,target){tone(hz,t,d,v,'sine',target);tone(hz*2,t,d*.6,v*.22,'sine',target);tone(hz*3,t,d*.25,v*.06,'sine',target);}
 function stopEffects(){effectId++;for(const node of effectBuses){node.gain.setValueAtTime(0,context.currentTime);node.disconnect();}effectBuses.clear();}
 function stopSong(){songId++;if(songBus){songBus.gain.setValueAtTime(0,context.currentTime);songBus.disconnect();songBus=null;}}
 function stopLoop(){loopId++;clearTimeout(loopTimer);if(loopBus){loopBus.gain.setValueAtTime(0,context.currentTime);loopBus.disconnect();loopBus=null;}}
 async function setEnabled(value){enabled=value;if(value){await ready();if(enabled)bus.gain.setValueAtTime(MASTER,context.currentTime);}else{stopSong();stopEffects();stopLoop();if(bus)bus.gain.setValueAtTime(0,context.currentTime);}}
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
 async function effect(kind){
  if(!enabled)return;const run=effectId;await ready();if(run!==effectId||!enabled||document.hidden)return;
  const out=context.createGain();out.connect(bus);effectBuses.add(out);setTimeout(()=>{if(effectBuses.delete(out))out.disconnect();},4000);
  const t=context.currentTime+.02;
  if(kind==='mouse'){bell(notes.E5,t,.5,.26,out);bell(notes.G5,t+.16,.5,.24,out);bell(notes.C6,t+.32,.7,.22,out);}
  else if(kind==='rooster'){tone(560,t,.16,.24,'sine',out,760);tone(760,t+.2,.16,.22,'sine',out,700);tone(700,t+.4,.38,.2,'sine',out,520);}
  else if(kind==='excavator'||kind==='drive'){for(let i=0;i<6;i++)tone(92,t+i*.13,.11,.3,'triangle',out,72);tone(520,t+.85,.14,.18,'square',out);tone(520,t+1.05,.2,.18,'square',out);}
  else if(kind==='pop'){tone(900,t,.09,.3,'sine',out,180);noise(t,.12,.35,out,'highpass',1500);bell(notes.E6,t+.06,.3,.08,out);}
  else if(kind==='twinkle'){const scale=['C6','E6','G6','A5','G5','E5'];bell(notes[scale[Math.floor(Math.random()*scale.length)]],t,.5,.14,out);bell(notes[scale[Math.floor(Math.random()*scale.length)]],t+.09,.4,.1,out);}
  else if(kind==='beep'){bell(notes.A5,t,.35,.28,out);}
  else if(kind==='puff'){noise(t,.7,.45,out,'lowpass',2600,300);bell(notes.C6,t,.4,.16,out);}
  else if(kind==='party'){
   tone(160,t,.32,.5,'sine',out,45);noise(t,.35,.5,out,'lowpass',3000,200);
   ['C5','E5','G5','C6'].forEach((n,i)=>bell(notes[n],t+.28+i*.12,.6,.22,out));bell(notes.E6,t+.82,1.2,.2,out);bell(notes.G6,t+.82,1.2,.12,out);
   for(let i=0;i<14;i++)noise(t+.4+i*.09+Math.random()*.05,.05,.12,out,'bandpass',2200+Math.random()*1800);
  }
  else if(kind==='found'){['G5','A5','B5','C6','E6'].forEach((n,i)=>bell(notes[n],t+i*.09,.5,.22,out));noise(t,.25,.12,out,'highpass',5000);}
  else {['C5','E5','G5'].forEach((n,i)=>bell(notes[n],t+i*.15,.8,.24,out));}
 }
 // 相册内置轻快八音盒循环：原创旋律，提前 0.6 秒排程。
 const loopMelody=['C5','E5','G5','E5','A5','G5','E5','C5','D5','F5','A5','F5','G5','E5','D5',null,'E5','G5','C6','G5','A5','G5','E5','G5','F5','E5','D5','B4','C5',null,'G4',null];
 const loopBass=['C3','F3','C3','G2'],STEP=.27;
 async function startLoop(){
  if(loopBus)return;const run=++loopId;await ready();if(run!==loopId||!enabled||document.hidden||loopBus)return;
  loopBus=context.createGain();loopBus.gain.value=.75;loopBus.connect(bus);let next=context.currentTime+.1,step=0;
  const pump=()=>{if(run!==loopId)return;while(next<context.currentTime+.6){const n=loopMelody[step%loopMelody.length];if(n)bell(notes[n],next,.6,.12,loopBus);if(step%8===0)tone(notes[loopBass[(step/8|0)%loopBass.length]],next,1.6,.13,'triangle',loopBus);if(step%2===0)noise(next,.04,.025,loopBus,'highpass',7000);next+=STEP;step++;}loopTimer=setTimeout(pump,200);};
  pump();
 }
 async function suspend(){stopEffects();stopLoop();if(context&&context.state==='running')await context.suspend();}
 return {setEnabled,song,stopSong,stopEffects,effect,startLoop,stopLoop,suspend};
})();
