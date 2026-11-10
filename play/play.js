'use strict';
const $ = id => document.getElementById(id);
const stage=$('stage'),controls=$('controls'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const modes=['home','album','cake','game'];
let mode='home',paused=false,photoMode=false,pausedBeforePhoto=false,sound=false,blown=false;
let noticeTimer,confettiTimer,albumTimer,helloTimer,songTimers=[],singing=false,songRun=0;
let photos=[],photoIndex=0,albumPlaying=false,photoRun=0,importRun=0,musicURL='',wantsMusic=false;
let wakeLock=null,wantsAwake=false,wakePending=false;
let micStream=null,micContext=null,micTimer,micRun=0,micPending=false;
const audio=window.PartyAudio;
function tell(message){clearTimeout(noticeTimer);$('notice').textContent=message;noticeTimer=setTimeout(()=>$('notice').textContent='',4800);}
function clearEffects(){clearTimeout(confettiTimer);$('confetti').replaceChildren();$('bubbles').replaceChildren();}
function frozen(){return paused||photoMode||document.hidden;}
function showControls(visible){controls.hidden=!visible;document.body.classList.toggle('clean',!visible||photoMode);if(!visible){$('settings').open=false;$('notice').textContent='';stage.focus({preventScroll:true});}}
function celebrate(){clearEffects();if(frozen()||reduced.matches)return;const colors=['#f4c85f','#6ebc93','#efaa86','#84c9df'];for(let i=0;i<44;i++){const el=document.createElement('i');el.className='confetti-piece';const values={'--x':`${(i*37)%100}%`,'--color':colors[i%4],'--duration':`${5+i%4*.4}s`,'--delay':`${i%7*.11}s`,'--drift':`${(i%2?1:-1)*(15+i%40)}px`,'--fall':`${stage.clientHeight*1.12}px`};for(const [k,v]of Object.entries(values))el.style.setProperty(k,v);$('confetti').append(el);}confettiTimer=setTimeout(clearEffects,7600);}
function stopSong(){songRun++;songTimers.forEach(clearTimeout);songTimers=[];singing=false;audio.stopSong();$('sing').textContent='♫ 一起唱生日歌';if(mode==='cake')$('lyric').textContent=blown?'愿所有美好，陪你慢慢长大':'许一个小小的愿望吧';}
function updateSound(){ $('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));$('bgm').muted=!sound; }
async function enableSound(value){sound=value;updateSound();try{await audio.setEnabled(value);}catch{sound=false;updateSound();tell('此浏览器暂时无法播放声音，仍可继续玩。');}if(!sound){stopSong();wantsMusic=false;$('bgm').pause();updateMusic();}return sound;}
$('sound').onclick=async()=>{await enableSound(!sound);};
function updateMusic(){ $('music-toggle').textContent=$('bgm').paused?'播放音乐':'暂停音乐';$('music-toggle').disabled=!musicURL; }
function syncMusic(){const bgm=$('bgm');if(wantsMusic&&sound&&mode==='album'&&!frozen()){bgm.play().then(updateMusic).catch(()=>{wantsMusic=false;updateMusic();tell('音乐暂时无法播放，请点“播放音乐”重试或换一个音频文件。');});}else{bgm.pause();updateMusic();}}
function schedulePhoto(){clearTimeout(albumTimer);if(mode==='album'&&albumPlaying&&!frozen()&&photos.length>1){albumTimer=setTimeout(()=>{photoIndex=(photoIndex+1)%photos.length;renderPhoto();},Number($('duration').value)*1000);}}
function syncPause(){stage.classList.toggle('paused',paused||photoMode);$('pause').textContent=paused?'继续动画':'暂停动画';$('pause').setAttribute('aria-pressed',String(paused));$('photo').textContent=photoMode?'退出合影':'合影模式';$('photo').setAttribute('aria-pressed',String(photoMode));document.body.classList.toggle('clean',controls.hidden||photoMode);if(frozen()){clearEffects();stopSong();stopMic();audio.suspend().catch(()=>{});}schedulePhoto();syncMusic();}
$('pause').onclick=()=>{if(photoMode){photoMode=false;paused=false;}else paused=!paused;syncPause();};
$('photo').onclick=()=>{if(photoMode){photoMode=false;paused=pausedBeforePhoto;}else{pausedBeforePhoto=paused;photoMode=true;}syncPause();if(photoMode)showControls(false);};
$('hide').onclick=()=>showControls(false);
document.addEventListener('click',e=>{if(controls.hidden&&!e.target.closest('button,a,input,select,summary,dialog'))showControls(true);});
function selectScene(next){if(!modes.includes(next)||next===mode)return;stopSong();stopMic();clearEffects();clearTimeout(albumTimer);mode=next;
 document.querySelectorAll('[data-scene]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.scene===mode)));
 modes.forEach(name=>$('scene-'+name).hidden=name!==mode);
 $('album-tools').hidden=mode!=='album';$('album-settings').hidden=mode!=='album';$('cake-tools').hidden=mode!=='cake';$('mic-tools').hidden=mode!=='cake';
 stage.setAttribute('aria-label',({home:'齐齐的小龙快乐农场',album:'齐齐的成长相册',cake:'齐齐的生日蛋糕',game:'点一点，和爸爸妈妈打招呼'})[mode]);
 if(mode==='album')renderPhoto();if(mode==='cake')updateCake();syncMusic();
}
document.querySelectorAll('[data-scene]').forEach(el=>el.onclick=()=>selectScene(el.dataset.scene));
// 相册：限定数量与体积，逐张实际解码；失败的文件不会打断已有相册。
function captionOf(name){let s=name.replace(/\.[^.]+$/,'');if(/^(img|dsc|dscn|pxl|mvimg|mmexport|wx_camera|photo|screenshot|微信图片|image)/i.test(s)||/^[0-9a-f-]{8,}$/i.test(s))return '';return s.replace(/^[\d\s._\-()（）]+/,'').replace(/_/g,' ').trim().slice(0,90);}
function decode(url){return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.src='';reject(Error('timeout'));},12000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(Error('decode'));};img.src=url;});}
async function importPhotos(list){const run=++importRun;const files=Array.from(list).filter(f=>/\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i.test(f.name)).sort((a,b)=>(a.webkitRelativePath||a.name).localeCompare(b.webkitRelativePath||b.name,'zh',{numeric:true}));
 if(!files.length){tell('请选择 JPG、PNG 等照片文件。');return;}selectScene('album');albumPlaying=false;clearTimeout(albumTimer);updateAlbum();const loaded=[];let skipped=0,bytes=0;
 for(const [i,file]of files.entries()){
  if(run!==importRun){loaded.forEach(p=>URL.revokeObjectURL(p.url));return;}
  if(loaded.length>=120||file.size>25*1024*1024||bytes+file.size>250*1024*1024){skipped++;continue;}
  tell(`正在准备照片 ${i+1} / ${files.length}…`);const url=URL.createObjectURL(file);
  try{const img=await decode(url);if(img.naturalWidth*img.naturalHeight>50000000)throw Error('large');loaded.push({url,cap:captionOf(file.name)});bytes+=file.size;}catch{URL.revokeObjectURL(url);skipped++;}
 }
 if(run!==importRun){loaded.forEach(p=>URL.revokeObjectURL(p.url));return;}
 if(!loaded.length){tell('这些照片暂时无法显示，请换成 JPG 或 PNG 后重试。');return;}
 photoRun++;photos.forEach(p=>URL.revokeObjectURL(p.url));photos=loaded;photoIndex=0;albumPlaying=true;await renderPhoto();tell(`已准备 ${photos.length} 张照片，循环播放。${skipped?'部分文件无法显示或超过数量/大小限制，已跳过。':''}`);
}
function updateAlbum(){const has=photos.length>0;$('album-empty').hidden=has;$('photo-frame').hidden=!has;$('album-count').hidden=!has;$('album-progress').hidden=!has;for(const id of ['album-toggle','clear-photos'])$(id).disabled=!has;for(const id of ['previous','next'])$(id).disabled=photos.length<2;$('album-toggle').textContent=albumPlaying?'暂停相册':'播放相册';$('album-count').textContent=`${photoIndex+1} / ${photos.length}`;$('album-progress').firstElementChild.style.width=has?`${(photoIndex+1)/photos.length*100}%`:'0%';}
async function renderPhoto(){clearTimeout(albumTimer);updateAlbum();if(!photos.length)return;const run=++photoRun,p=photos[photoIndex];try{await decode(p.url);if(run!==photoRun)return;$('photo-img').src=p.url;$('photo-img').alt=p.cap||`齐齐的成长照片，第 ${photoIndex+1} 张`;$('photo-caption').textContent=$('captions').checked?p.cap:'';schedulePhoto();}catch{if(run!==photoRun)return;albumPlaying=false;updateAlbum();tell('这张照片加载失败，可以切到下一张或重新选择照片。');}}
function stepPhoto(step){if(!photos.length)return;photoIndex=(photoIndex+step+photos.length)%photos.length;renderPhoto();}
function pickPhotos(){ $('files').click(); }
$('empty-pick').onclick=pickPhotos;$('pick').onclick=pickPhotos;$('pick-folder').onclick=()=>$('folder').click();
for(const id of ['files','folder'])$(id).onchange=e=>{importPhotos(e.target.files);e.target.value='';};
$('previous').onclick=()=>stepPhoto(-1);$('next').onclick=()=>stepPhoto(1);$('album-toggle').onclick=()=>{albumPlaying=!albumPlaying;updateAlbum();schedulePhoto();};$('duration').onchange=schedulePhoto;$('captions').onchange=renderPhoto;
$('clear-photos').onclick=()=>{importRun++;photoRun++;clearTimeout(albumTimer);photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[];photoIndex=0;albumPlaying=false;$('photo-img').removeAttribute('src');updateAlbum();};
$('pick-music').onclick=()=>$('music-file').click();$('music-file').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>100*1024*1024){tell('请选择小于 100 MB 的音乐文件。');return;}$('bgm').pause();if(musicURL)URL.revokeObjectURL(musicURL);musicURL=URL.createObjectURL(file);$('bgm').src=musicURL;$('bgm').volume=.5;wantsMusic=false;updateMusic();tell('音乐已选择，点“播放音乐”开始。');};
$('music-toggle').onclick=async()=>{if(!musicURL)return;if(wantsMusic){wantsMusic=false;}else{if(!await enableSound(true))return;wantsMusic=true;}syncMusic();};$('bgm').onerror=()=>{wantsMusic=false;updateMusic();tell('这段音乐无法播放，请尝试 MP3 或其他文件。');};
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer?.files.length)importPhotos(e.dataTransfer.files);});
// 蛋糕由大人控制；唱歌可停止，随时可吹灭，不强制等待。
function updateCake(){ $('birthday-cake').classList.toggle('out',blown);$('cake-title').textContent=blown?'耶！齐齐两岁啦！':'齐齐，生日快乐！';$('lyric').textContent=blown?'愿所有美好，陪你慢慢长大':'许一个小小的愿望吧';$('blow').hidden=blown;$('relight').hidden=!blown;}
async function sing(){if(singing){stopSong();return;}if(frozen()){tell('先退出合影或继续动画，再一起唱歌吧。');return;}stopMic();const run=++songRun;singing=true;$('sing').textContent='停止生日歌';if(!await enableSound(true)||run!==songRun||mode!=='cake'||frozen())return;try{const song=await audio.song();if(run!==songRun||mode!=='cake')return;if(!song){stopSong();return;}const lines=['祝你生日快乐','祝你生日快乐','祝齐齐生日快乐','祝你生日快乐'];song.lines.forEach((t,i)=>songTimers.push(setTimeout(()=>{if(run===songRun)$('lyric').textContent=lines[i];},t*1000)));songTimers.push(setTimeout(()=>{if(run===songRun){stopSong();$('lyric').textContent=blown?'齐齐，生日快乐！':'许个愿，吹蜡烛吧！';}},song.total*1000));}catch{stopSong();tell('暂时无法播放生日歌，可以大家一起唱。');}}
function blow(){if(mode!=='cake'||blown)return;stopSong();stopMic();blown=true;updateCake();celebrate();audio.effect('dragon').catch(()=>{});showControls(false);}
$('sing').onclick=sing;$('blow').onclick=blow;$('relight').onclick=()=>{stopSong();stopMic();blown=false;clearEffects();updateCake();};
// 麦克风仅通过明确按钮启用；校准环境音，连续响度超阈值触发，键盘/按钮始终可用。
function stopMic(){micRun++;clearInterval(micTimer);micStream?.getTracks().forEach(t=>t.stop());micStream=null;if(micContext){micContext.close().catch(()=>{});micContext=null;}micPending=false;$('mic-toggle').disabled=false;$('mic-toggle').textContent='开启吹气感应';$('mic-toggle').setAttribute('aria-pressed','false');$('mic-status').textContent='';}
async function startMic(){if(micStream||micPending){stopMic();return;}if(blown){tell('先重新点亮蜡烛吧。');return;}if(frozen()){tell('请先退出合影或继续动画。');return;}if(!navigator.mediaDevices?.getUserMedia){tell('当前环境不支持麦克风，请直接点“吹灭蜡烛”。');return;}stopSong();const run=++micRun;micPending=true;$('mic-toggle').disabled=true;
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});if(run!==micRun||mode!=='cake'||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}micStream=stream;const AC=window.AudioContext||window.webkitAudioContext;micContext=new AC();await micContext.resume();if(run!==micRun)return;const analyser=micContext.createAnalyser();analyser.fftSize=1024;micContext.createMediaStreamSource(stream).connect(analyser);const samples=new Float32Array(analyser.fftSize);let count=0,ambient=0,over=0;const started=performance.now();$('mic-toggle').textContent='关闭吹气感应';$('mic-toggle').setAttribute('aria-pressed','true');$('mic-status').textContent='先安静一小会儿，正在准备…';
 micTimer=setInterval(()=>{analyser.getFloatTimeDomainData(samples);let sum=0;for(const n of samples)sum+=n*n;const rms=Math.sqrt(sum/samples.length);if(performance.now()-started<1500){ambient=(ambient*count+rms)/++count;return;}const threshold=Math.max(.07,ambient*4);$('mic-status').textContent='对着手机轻轻吹气，也可以点按钮';over=rms>threshold?over+50:Math.max(0,over-25);if(over>=400)blow();},50);
 }catch{if(run===micRun){stopMic();tell('无法使用麦克风，直接点“吹灭蜡烛”就好。');}}finally{if(run===micRun){micPending=false;$('mic-toggle').disabled=false;}}
}
$('mic-toggle').onclick=startMic;
// 无分数、无失败的因果互动，短音效节流，图形与文字同时回应。
const greetings={dragon:'小龙说：齐齐，生日快乐！',mouse:'鼠妈妈说：齐齐，妈妈爱你！',rooster:'公鸡爸爸说：嘟嘟，带齐齐出发！',tractor:'拖拉机说：嘟嘟，快乐出发！'};
let lastGreeting=0;
document.querySelectorAll('[data-friend]').forEach(button=>button.onclick=()=>{if(frozen())return;const now=performance.now();if(now-lastGreeting<220)return;lastGreeting=now;const kind=button.dataset.friend;$('hello').textContent=greetings[kind];clearTimeout(helloTimer);helloTimer=setTimeout(()=>$('hello').textContent='轻轻点一下，看看谁来打招呼',4500);button.classList.remove('greet');void button.offsetWidth;button.classList.add('greet');audio.effect(kind).catch(()=>{});if(!reduced.matches){const star=document.createElement('span');star.className='bubble';star.textContent=kind==='dragon'?'♥':'✦';star.style.left=`${18+Array.from(button.parentNode.children).indexOf(button)*22}%`;star.style.top='43%';$('bubbles').append(star);setTimeout(()=>star.remove(),1900);if($('bubbles').children.length>8)$('bubbles').firstElementChild.remove();}});
// 展示工具：全屏和屏幕常亮均有失败回退。
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();showControls(false);}else tell('此浏览器不支持网页全屏，请横屏并收起浏览器工具栏。');}catch{tell('暂时无法进入全屏，仍可使用手机屏幕镜像。');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏展示';if(!document.fullscreenElement)showControls(true);});
function updateAwake(){ $('awake').textContent=wakeLock?'关闭屏幕常亮':wantsAwake?'常亮已暂停 · 重试':'保持屏幕常亮';$('awake').setAttribute('aria-pressed',String(Boolean(wakeLock))); }
async function acquireWake(show){if(wakePending||wakeLock||!wantsAwake||document.hidden)return;wakePending=true;$('awake').disabled=true;try{const lock=await navigator.wakeLock.request('screen');if(!wantsAwake||document.hidden){await lock.release();return;}wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;updateAwake();});if(show)tell('屏幕常亮已开启，请保持网页在前台。');}catch{if(show)tell('暂时无法常亮，请在手机设置中延长自动锁屏时间。');}finally{wakePending=false;$('awake').disabled=false;updateAwake();}}
$('awake').onclick=async()=>{if(!navigator.wakeLock){tell('当前环境不支持常亮，请在手机设置中延长自动锁屏时间。');return;}if(wakeLock){wantsAwake=false;const lock=wakeLock;wakeLock=null;try{await lock.release();}catch{}updateAwake();}else{wantsAwake=true;await acquireWake(true);}};
$('choose-version').onclick=()=>{if(photos.length||musicURL){$('leave-dialog').showModal();}else location.href='../index.html';};$('stay').onclick=()=>$('leave-dialog').close();
document.addEventListener('keydown',e=>{if(e.key==='Escape'){showControls(true);return;}if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,select,textarea,button,a,summary,dialog'))return;if(/^[1-4]$/.test(e.key)){selectScene(modes[+e.key-1]);return;}if(e.key.toLowerCase()==='h')showControls(controls.hidden);if(mode==='album'){if(e.key==='ArrowRight')stepPhoto(1);if(e.key==='ArrowLeft')stepPhoto(-1);if(e.code==='Space'&&photos.length){e.preventDefault();$('album-toggle').click();}}if(mode==='cake'&&e.code==='Space'){e.preventDefault();blow();}});
document.addEventListener('visibilitychange',()=>{stage.classList.toggle('background-paused',document.hidden);if(document.hidden){clearTimeout(albumTimer);clearEffects();stopSong();stopMic();$('bgm').pause();audio.suspend().catch(()=>{});}else{schedulePhoto();syncMusic();acquireWake(false);}});
window.addEventListener('pagehide',()=>{importRun++;clearTimeout(albumTimer);stopSong();stopMic();clearEffects();$('bgm').pause();audio.suspend().catch(()=>{});const lock=wakeLock;wakeLock=null;if(lock)lock.release().catch(()=>{});});
window.addEventListener('pageshow',()=>{schedulePhoto();acquireWake(false);});window.addEventListener('resize',clearEffects);reduced.addEventListener?.('change',clearEffects);
updateAlbum();updateCake();updateSound();
