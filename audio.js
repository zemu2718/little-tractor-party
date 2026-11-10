/* 原生合成音：不加载网络音频。所有声音都从用户操作开始。 */
'use strict';
window.PartyAudio = (() => {
 let context, bus, songBus, effectBus, enabled=false, songId=0, effectId=0;
 const notes={C4:261.63,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,A5:880,C6:1046.5};
 const melody=[['G4',.75],['G4',.25],['A4',1],['G4',1],['C5',1],['B4',2],['G4',.75],['G4',.25],['A4',1],['G4',1],['D5',1],['C5',2],['G4',.75],['G4',.25],['G5',1],['E5',1],['C5',1],['B4',1],['A4',2],['F5',.75],['F5',.25],['E5',1],['C5',1],['D5',1],['C5',3]];
 async function ready(){
  if(!context){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('此浏览器不支持合成音');context=new AC();bus=context.createGain();bus.gain.value=.28;bus.connect(context.destination);}
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
 function bell(hz,t,d,v,target){tone(hz,t,d,v,'sine',target);tone(hz*2,t,d*.6,v*.18,'sine',target);}
 function stopEffects(){effectId++;if(effectBus){effectBus.gain.setValueAtTime(0,context.currentTime);effectBus.disconnect();effectBus=null;}}
 function stopSong(){songId++;if(songBus){songBus.gain.setValueAtTime(0,context.currentTime);songBus.disconnect();songBus=null;}}
 async function setEnabled(value){enabled=value;if(value){await ready();if(enabled)bus.gain.setValueAtTime(.28,context.currentTime);}else{stopSong();stopEffects();if(bus)bus.gain.setValueAtTime(0,context.currentTime);}}
 async function song(){stopEffects();stopSong();const run=songId;await ready();if(run!==songId||!enabled||document.hidden)return null;songBus=context.createGain();songBus.connect(bus);const start=context.currentTime+.12;let time=start;const lines=[];
  melody.forEach(([name,duration],i)=>{if([0,6,12,19].includes(i))lines.push(time-start+.12);bell(notes[name],time,Math.max(.65,duration*.8),.27,songBus);time+=duration*.58;});return {lines,total:time-start+.8};
 }
 async function effect(kind){if(!enabled)return;stopEffects();const run=effectId;await ready();if(run!==effectId||!enabled||document.hidden)return;effectBus=context.createGain();effectBus.connect(bus);const t=context.currentTime+.02;
  if(kind==='mouse'){bell(notes.E5,t,.5,.18,effectBus);bell(notes.G5,t+.2,.6,.16,effectBus);}
  else if(kind==='rooster'){tone(560,t,.16,.16,'sine',effectBus,700);tone(700,t+.22,.25,.14,'sine',effectBus,620);}
  else if(kind==='tractor'){for(let i=0;i<4;i++)tone(95,t+i*.18,.12,.18,'triangle',effectBus,80);}
  else {['C5','E5','G5'].forEach((n,i)=>bell(notes[n],t+i*.15,.8,.18,effectBus));}
 }
 async function suspend(){stopEffects();if(context&&context.state==='running')await context.suspend();}
 return {setEnabled,song,stopSong,stopEffects,effect,suspend};
})();
