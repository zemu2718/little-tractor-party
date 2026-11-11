/* 角色短语播放顺序：家人选择或页面里录下的本地音频 → 预生成的台词配音（assets/voice/，见 scripts/make_voice.mjs）→ 设备已有的离线中文语音。 */
'use strict';
window.PartyVoice=(()=>{
 let media,notify=()=>{},changed=()=>{},enabled=false,spoken=true,run=0,timer,utterance,speaking=false,onSpeak=()=>{};
 // 正在说话时通知页面（用于把背景音乐压低）；状态变化才通知。
 function talking(on){if(speaking===on)return;speaking=on;try{onSpeak(on);}catch{}}
 // 每个角色可有多段录音，点一次换一段：{urls:[], next:0}
 const clips=new Map();
 const synth=window.speechSynthesis;
 const VOLUME=1;
 // 设备语音：优先普通话、增强版/高音质的离线中文语音。
 function localVoice(){const list=(synth?.getVoices()||[]).filter(v=>v.localService&&/^zh(?:[-_]|$)/i.test(v.lang));const score=v=>(/CN|Hans/i.test(v.lang)?2:0)+(/enhanced|premium|neural|增强|高品质|优化/i.test(v.name)?3:0);return list.sort((a,b)=>score(b)-score(a))[0];}
 const VOICE_BASE='assets/voice/';
 function prerecorded(kind,text){const map=window.PARTY_VOICE,file=map&&text?map[`${kind}|${text}`]:null;return typeof file==='string'&&/^[\w.-]+\.mp3$/.test(file)?VOICE_BASE+file:null;}
 // 播放一段音频：返回 'ok'（含已被新的点击取代）或 'fail'。
 async function playUrl(url,current,max,onEnd){
  media.src=url;media.volume=VOLUME;media.onended=()=>{if(current===run){clearTimeout(timer);talking(false);onEnd?.();}};
  try{await media.play();if(current!==run)return 'ok';if(!enabled||document.hidden){media.pause();return 'ok';}talking(true);timer=setTimeout(()=>{stop();onEnd?.();},max);return 'ok';}
  catch{return current===run?'fail':'ok';}
 }
 function stop(){run++;clearTimeout(timer);if(media){media.onended=null;media.pause();media.removeAttribute('src');media.load?.();}if(utterance&&synth)synth.cancel();utterance=null;talking(false);}
 function init(element,onNotice,onChange){media=element;notify=onNotice;changed=onChange;media.volume=VOLUME;media.onerror=()=>{const src=media.getAttribute?.('src')||'';if(src.includes(VOICE_BASE))return;stop();notify('这段录音无法播放，请换成 MP3 或 M4A。');};synth?.addEventListener?.('voiceschanged',changed);changed();}
 function setEnabled(value){enabled=value;if(!value)stop();}
 function setSpoken(value){spoken=value;if(!value)stop();}
 function release(kind){const old=clips.get(kind);if(old)old.urls.forEach(url=>URL.revokeObjectURL(url));clips.delete(kind);}
 // 选择文件：替换该角色的全部录音。生日歌录音可以更长。
 function setClip(kind,file){const limit=kind==='song'?30:10;if(!file||file.size>limit*1024*1024){notify(`请选择不超过 ${limit} MB 的录音。`);return false;}stop();const url=URL.createObjectURL(file);release(kind);clips.set(kind,{urls:[url],next:0});changed();return true;}
 // 页面内录音：追加一段（最多 4 段，超出替换最早的），下一次点击先播放这段新录音。
 function addClip(kind,blob,max=4){if(!blob||!blob.size)return false;stop();if(kind==='song')release(kind);const entry=clips.get(kind)||{urls:[],next:0};entry.urls.push(URL.createObjectURL(blob));while(entry.urls.length>max)URL.revokeObjectURL(entry.urls.shift());entry.next=entry.urls.length-1;clips.set(kind,entry);changed();return true;}
 function clearClips(){stop();for(const kind of [...clips.keys()])release(kind);changed();}
 function status(){let count=0;for(const entry of clips.values())count+=entry.urls.length;return {has:kind=>clips.has(kind),count,clipsOf:kind=>clips.get(kind)?.urls.length||0,local:Boolean(localVoice()),voiced:Object.keys(window.PARTY_VOICE||{}).length};}
 function duration(){const d=media?.duration;return Number.isFinite(d)&&d>0?d:0;}
 async function speak(kind,text,options={}){
  stop();const current=run;if(!enabled||!spoken||document.hidden)return false;
  const max=options.max||12000,onEnd=options.onEnd,entry=clips.get(kind);
  if(entry){
   const url=entry.urls[entry.next%entry.urls.length];entry.next=(entry.next+1)%entry.urls.length;
   if(await playUrl(url,current,max,onEnd)==='ok')return true;notify('录音暂时无法播放，先用轻柔音效回应。');return false;
  }
  if(!text)return false;
  // 预生成配音（真人感的神经语音）；文件缺失或无法播放时安静地改用设备语音。
  const voiced=prerecorded(kind,text);
  if(voiced){if(await playUrl(voiced,current,max,onEnd)==='ok')return true;if(current!==run)return true;}
  const selected=localVoice();
  if(!selected||!window.SpeechSynthesisUtterance)return false;
  // 稍高的音调与稍慢的语速，更像童声，也便于两岁宝宝听清。
  try{utterance=new window.SpeechSynthesisUtterance(text);utterance.voice=selected;utterance.lang=selected.lang;utterance.rate=.85;utterance.pitch=1.35;utterance.volume=VOLUME;utterance.onend=()=>{if(current===run){clearTimeout(timer);utterance=null;talking(false);}};synth.speak(utterance);talking(true);timer=setTimeout(stop,10000);return true;}
  catch{utterance=null;return false;}
 }
 function onSpeaking(fn){onSpeak=typeof fn==='function'?fn:()=>{};}
 function busy(){return speaking;}
 return {init,setEnabled,setSpoken,setClip,addClip,clearClips,status,duration,speak,stop,onSpeaking,busy};
})();
