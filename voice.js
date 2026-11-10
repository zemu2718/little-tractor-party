/* 角色短语只使用家人选择的本地音频，或设备已有的离线中文语音。 */
'use strict';
window.PartyVoice=(()=>{
 let media,notify=()=>{},changed=()=>{},enabled=false,spoken=true,run=0,timer,utterance;
 const clips=new Map();
 const synth=window.speechSynthesis;
 const VOLUME=1;
 function localVoice(){return synth?.getVoices().find(v=>v.localService&&/^zh(?:[-_]|$)/i.test(v.lang));}
 function stop(){run++;clearTimeout(timer);if(media){media.onended=null;media.pause();media.removeAttribute('src');media.load?.();}if(utterance&&synth)synth.cancel();utterance=null;}
 function init(element,onNotice,onChange){media=element;notify=onNotice;changed=onChange;media.volume=VOLUME;media.onerror=()=>{stop();notify('这段录音无法播放，请换成 MP3 或 M4A。');};synth?.addEventListener?.('voiceschanged',changed);changed();}
 function setEnabled(value){enabled=value;if(!value)stop();}
 function setSpoken(value){spoken=value;if(!value)stop();}
 // 生日歌录音可以更长，其余角色录音保持短小。
 function setClip(kind,file){const limit=kind==='song'?30:10;if(!file||file.size>limit*1024*1024){notify(`请选择不超过 ${limit} MB 的录音。`);return false;}stop();const old=clips.get(kind);const url=URL.createObjectURL(file);clips.set(kind,url);if(old)URL.revokeObjectURL(old);changed();return true;}
 function clearClips(){stop();for(const url of clips.values())URL.revokeObjectURL(url);clips.clear();changed();}
 function status(){return {has:kind=>clips.has(kind),count:clips.size,local:Boolean(localVoice())};}
 function duration(){const d=media?.duration;return Number.isFinite(d)&&d>0?d:0;}
 async function speak(kind,text,options={}){
  stop();const current=run;if(!enabled||!spoken||document.hidden)return false;
  const max=options.max||12000,onEnd=options.onEnd;
  if(clips.has(kind)){
   media.src=clips.get(kind);media.volume=VOLUME;media.onended=()=>{if(current===run){clearTimeout(timer);onEnd?.();}};
   try{await media.play();if(current!==run)return true;if(!enabled||document.hidden){media.pause();return true;}timer=setTimeout(()=>{stop();onEnd?.();},max);return true;}
   catch{if(current===run){notify('录音暂时无法播放，先用轻柔音效回应。');return false;}return true;}
  }
  if(!text)return false;
  const selected=localVoice();
  if(!selected||!window.SpeechSynthesisUtterance)return false;
  // 稍高的音调与稍慢的语速，更像童声，也便于两岁宝宝听清。
  try{utterance=new window.SpeechSynthesisUtterance(text);utterance.voice=selected;utterance.lang=selected.lang;utterance.rate=.85;utterance.pitch=1.35;utterance.volume=VOLUME;utterance.onend=()=>{if(current===run){clearTimeout(timer);utterance=null;}};synth.speak(utterance);timer=setTimeout(stop,10000);return true;}
  catch{utterance=null;return false;}
 }
 return {init,setEnabled,setSpoken,setClip,clearClips,status,duration,speak,stop};
})();
