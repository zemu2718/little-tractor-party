/* 原生合成音：不加载网络音频。所有声音都从用户操作开始。 */
'use strict';
window.PartyAudio = (() => {
 let context, bus, songBus, enabled=false;
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
 function stopSong(){if(songBus){songBus.gain.setValueAtTime(0,context.currentTime);songBus.disconnect();songBus=null;}}
 async function setEnabled(value){enabled=value;if(value){await ready();if(enabled)bus.gain.setValueAtTime(.28,context.currentTime);}else{stopSong();if(bus)bus.gain.setValueAtTime(0,context.currentTime);}}
 async function song(){await ready();stopSong();songBus=context.createGain();songBus.connect(bus);const start=context.currentTime+.12;let time=start;const lines=[];
  melody.forEach(([name,duration],i)=>{if([0,6,12,19].includes(i))lines.push(time-start+.12);bell(notes[name],time,Math.max(.65,duration*.8),.27,songBus);time+=duration*.58;});return {lines,total:time-start+.8};
 }
 async function effect(kind){if(!enabled)return;await ready();if(!enabled||document.hidden)return;const t=context.currentTime+.02;
  if(kind==='cow'){tone(160,t,.7,.4,'triangle',bus,110);tone(165,t+.35,.5,.15,'sine',bus,120);}
  else if(kind==='chick'){tone(1400,t,.15,.18,'sine',bus,1900);tone(1600,t+.22,.15,.15,'sine',bus,2100);}
  else if(kind==='tractor'){for(let i=0;i<6;i++)tone(75,t+i*.16,.12,.26,'triangle',bus,58);}
  else {['C5','E5','G5'].forEach((n,i)=>bell(notes[n],t+i*.15,1,.23,bus));}
 }
 async function suspend(){if(context&&context.state==='running')await context.suspend();}
 return {setEnabled,song,stopSong,effect,suspend};
})();
