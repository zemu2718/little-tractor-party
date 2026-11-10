'use strict';
const $ = id => document.getElementById(id);
const stage=$('stage'),controls=$('controls'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const modes=['home','album','cake','game'];
let mode='home',paused=false,photoMode=false,pausedBeforePhoto=false,sound=false,blown=false,calm=false;
let childMode=false,parentTimer,greetingRun=0;
let importing=false,importResume=false,musicRun=0,soundRun=0;
let noticeTimer,confettiTimer,albumTimer,helloTimer,songTimers=[],singing=false,songRun=0;
let photos=[],photoIndex=0,albumPlaying=false,photoRun=0,importRun=0,musicURL='',wantsMusic=false;
let wakeLock=null,wantsAwake=false,wakePending=false;
let micStream=null,micContext=null,micTimer,micRun=0,micPending=false;
let leaveTimer,leaving=null,cheerTimer,countdownTimers=[],counting=false,findTimers=[],findTarget=null,findCount=0;
let lastGreeting=0,lastSparkle=0,suppressClick=0,burstSeed=0,greetStyle=0;
let danceOn=false,danceTimers=[],peeking=false;
const audio=window.PartyAudio;
const voice=window.PartyVoice;
const PALETTE=['#ff5d73','#ffb703','#06d6a0','#4cc9f0','#f72585','#ffd60a','#8ac926','#ff8fab','#ffffff'];
const CONFETTI=140,FIND_IDLE=9000;
function tell(message){clearTimeout(noticeTimer);$('notice').textContent=message;noticeTimer=setTimeout(()=>$('notice').textContent='',4800);}
function clearEffects(){clearTimeout(confettiTimer);$('confetti').replaceChildren();$('bubbles').replaceChildren();}
function clearAmbient(){$('ambient').replaceChildren();}
function frozen(){return paused||photoMode||document.hidden;}
function showControls(visible){controls.hidden=!visible;document.body.classList.toggle('clean',!visible||photoMode);if(!visible){$('settings').open=false;$('notice').textContent='';stage.focus({preventScroll:true});}}
function stagePoint(x,y){const s=stage.getBoundingClientRect();return {x:(x??s.left+s.width/2)-s.left,y:(y??s.top+s.height/2)-s.top};}
function restart(el,name){el.classList.remove(name);void el.offsetWidth;el.classList.add(name);}

// 热闹特效：礼花炮、星星爆开、说话气泡。“安静”动效或暂停时不出现。
function celebrate(){
 clearEffects();if(frozen()||calm)return;
 const w=stage.clientWidth||1600,h=stage.clientHeight||900,shapes=['rect','circle','star','ribbon','heart'];
 for(let i=0;i<CONFETTI;i++){
  const el=document.createElement('i'),cannon=i<100,left=i%2===0,r=Math.random;
  el.className=`confetti-piece ${cannon?'cannon':'rain'} shape-${shapes[i%shapes.length]}`;
  let v;
  if(cannon){const spread=r(),x1=left?w*(.06+.55*spread):w*(.94-.55*spread),y1=h*(.06+.4*r());v={x0:left?-.02*w:1.02*w,y0:h*1.02,x1,y1,x2:x1+(r()-.5)*w*.2,y2:h*1.08,delay:r()*.3,dur:3.8+r()*1.6};}
  else{const x0=r()*w;v={x0,y0:-h*.06,x1:x0,y1:0,x2:x0+(r()-.5)*w*.18,y2:h*1.08,delay:.5+r()*1.8,dur:3.6+r()*1.8};}
  const values={'--x0':`${v.x0}px`,'--y0':`${v.y0}px`,'--x1':`${v.x1}px`,'--y1':`${v.y1}px`,'--x2':`${v.x2}px`,'--y2':`${v.y2}px`,'--rot':`${(r()<.5?-1:1)*(360+r()*720)}deg`,'--color':PALETTE[i%PALETTE.length],'--duration':`${v.dur}s`,'--delay':`${v.delay}s`};
  for(const [k,val]of Object.entries(values))el.style.setProperty(k,val);
  $('confetti').append(el);
 }
 confettiTimer=setTimeout(clearEffects,8200);audio.effect('party').catch(()=>{});
}
function burst(x,y,count=10,big=false){
 if(frozen()||calm)return;
 const box=document.createElement('span');box.className=big?'burst big':'burst';box.style.left=`${x}px`;box.style.top=`${y}px`;
 const glyphs=['★','♥','●','✦'];
 for(let i=0;i<count;i++){const bit=document.createElement('i');bit.textContent=glyphs[(i+burstSeed)%glyphs.length];bit.style.setProperty('--a',`${i*360/count+Math.random()*18}deg`);bit.style.setProperty('--d',`${(big?11:6.5)+Math.random()*4}cqw`);bit.style.setProperty('--c',PALETTE[(i+burstSeed)%PALETTE.length]);box.append(bit);}
 burstSeed++;$('bubbles').append(box);setTimeout(()=>box.remove(),1400);
 while($('bubbles').children.length>14)$('bubbles').firstElementChild.remove();
}
function say(text,x,y){
 if(frozen())return;const w=stage.clientWidth||1600,h=stage.clientHeight||900;
 const el=document.createElement('span');el.className='say';el.textContent=text;
 el.style.left=`${Math.min(w*.8,Math.max(w*.2,x))}px`;el.style.top=`${Math.min(h*.8,Math.max(h*.18,y))}px`;
 $('bubbles').append(el);setTimeout(()=>el.remove(),2600);
}
function sparkle(event){
 const now=performance.now();if(now-lastSparkle<120||frozen())return;lastSparkle=now;
 const p=stagePoint(event.clientX,event.clientY);burst(p.x,p.y,7);audio.effect('twinkle').catch(()=>{});
}

// 场景背景氛围：首页和蛋糕页有飘起的气球，点点玩有肥皂泡（都能戳破），相册有花瓣；首页还有小挖掘机来回巡逻。
const BALLOONS=['#f59a4a','#9cc95b','#f6d35b','#fff1d0','#ef6f6c','#7cc6e6','#f7b6c8'];
function popAt(el,count=12,kind='pop'){suppressClick=performance.now()+450;const r=el.getBoundingClientRect(),s=stage.getBoundingClientRect();burst(r.left+r.width/2-s.left,r.top+r.height*.45-s.top,count);audio.effect(kind).catch(()=>{});el.remove();idleTouch();}
function spawnFloater(className,x,size,dur){
 const b=document.createElement('button');b.type='button';b.className=className;b.tabIndex=-1;b.setAttribute('aria-label',className==='soap'?'泡泡':'气球');
 const values={'--x':`${x}%`,'--color':BALLOONS[Math.floor(Math.random()*BALLOONS.length)],'--duration':`${dur}s`,'--sway':`${(Math.random()<.5?-1:1)*(2+Math.random()*4)}cqw`,'--size':`${size}cqw`};
 for(const [k,v]of Object.entries(values))b.style.setProperty(k,v);
 b.onpointerdown=event=>{event.preventDefault();popAt(b);};
 $('ambient').append(b);setTimeout(()=>b.remove(),dur*1000+300);
}
function spawnBalloon(){const side=mode==='cake'||Math.random()<.65,x=side?(Math.random()<.5?2+Math.random()*22:76+Math.random()*20):24+Math.random()*52;spawnFloater('balloon',x,6+Math.random()*3,10+Math.random()*5);}
function spawnSoap(){spawnFloater('soap',4+Math.random()*90,6+Math.random()*4,12+Math.random()*6);}
function spawnPetal(){
 const p=document.createElement('i'),dur=9+Math.random()*5;p.className='petal';
 const values={'--x':`${Math.random()*100}%`,'--color':PALETTE[Math.floor(Math.random()*PALETTE.length)],'--duration':`${dur}s`,'--sway':`${(Math.random()-.5)*12}cqw`};
 for(const [k,v]of Object.entries(values))p.style.setProperty(k,v);
 $('ambient').append(p);setTimeout(()=>p.remove(),dur*1000+300);
}
function spawnPatrol(){
 const b=document.createElement('button'),img=document.createElement('img');b.type='button';b.className='patrol';b.tabIndex=-1;b.setAttribute('aria-label','小挖掘机按喇叭');
 img.src='assets/little-excavator.webp';img.alt='';b.append(img);
 b.onpointerdown=event=>{event.preventDefault();suppressClick=performance.now()+450;restart(b,'hop');const r=b.getBoundingClientRect(),s=stage.getBoundingClientRect();burst(r.left+r.width/2-s.left,r.top-s.top,10);say('嘟嘟！',r.left+r.width/2-s.left,r.top-s.top);audio.effect('honk').catch(()=>{});idleTouch();};
 $('ambient').append(b);setTimeout(()=>b.remove(),12300);audio.effect('drive').catch(()=>{});
}
function spawnNote(){
 const n=document.createElement('i');n.className='note';n.textContent=Math.random()<.5?'♪':'♫';
 n.style.setProperty('--x',`${6+Math.random()*88}%`);n.style.setProperty('--color',PALETTE[Math.floor(Math.random()*8)]);
 $('ambient').append(n);setTimeout(()=>n.remove(),2600);
}
let ambientCount=0;
function ambientTick(){
 if(frozen()||calm||document.hidden)return;const box=$('ambient'),count=box.children.length;ambientCount++;
 if(mode==='home'&&ambientCount%6===0&&!box.querySelector?.('.patrol'))spawnPatrol();
 else if((mode==='home'||mode==='cake')&&count<6)spawnBalloon();
 else if(mode==='game'&&count<4&&!danceOn)spawnSoap();
 else if(mode==='album'&&photos.length&&count<10)spawnPetal();
}
setInterval(ambientTick,2400);

// 角色台词：每次点击轮换；动物先叫一声（喔喔喔、吱吱吱、嗷呜、轰隆隆），再说话。
const lines={
 dragon:['嗷呜！齐齐，生日快乐！','我是小龙齐齐，两岁啦！','嗷呜，小龙来啦！','齐齐真棒，抱抱！'],
 mouse:['吱吱吱！齐齐，妈妈爱你！','吱吱，宝贝生日快乐！','妈妈抱抱齐齐！','吱吱吱，亲亲齐齐！'],
 rooster:['喔喔喔！齐齐，爸爸陪你玩！','喔喔喔，生日快乐！','爸爸给你举高高！','喔喔，齐齐真棒！'],
 excavator:['轰隆隆，嘟嘟嘟！','挖呀挖，挖呀挖！','嘟嘟，挖掘机来啦！'],
 two:['齐齐两岁啦！','一、二，两岁啦！']
};
const speakers={dragon:'小龙说',mouse:'鼠妈妈说',rooster:'公鸡爸爸说',excavator:'挖掘机说',two:'数字二说'};
const ANIMALS=new Set(['dragon','mouse','rooster','excavator']);
const lineIndex={};
function nextLine(kind){const list=lines[kind];const i=lineIndex[kind]||0;lineIndex[kind]=i+1;return list[i%list.length];}
// 有家人录音就直接放录音；否则动物先叫一声，0.75 秒后再用离线语音说话。
function speakFor(kind,text,always){
 audio.stopEffects();const run=++greetingRun,hasClip=voice.status().has(kind);
 const sfx=always||(ANIMALS.has(kind)&&!hasClip?kind:null);
 if(sfx)audio.effect(sfx).catch(()=>{});
 const talk=()=>{if(run!==greetingRun||frozen())return;voice.speak(kind,text).then(spoken=>{if(!spoken&&!sfx&&run===greetingRun&&!frozen())audio.effect(kind).catch(()=>{});});};
 if(sfx&&!hasClip)setTimeout(talk,750);else talk();
}
// 宝宝连拍时每一下都有星星和动作，只有说话做节流，避免声音叠在一起。
function canTalk(){const now=performance.now();if(now-lastGreeting<450)return false;lastGreeting=now;return true;}
function hotTap(kind,event){
 if(frozen())return;idleTouch();if(kind==='cake'){cakeTap();return;}
 const p=stagePoint(event.clientX,event.clientY);burst(p.x,p.y,10);
 if(kind==='excavator')restart(mode==='home'?$('home-art'):$('birthday-cake'),'rumble');
 if(!canTalk()){audio.effect('twinkle').catch(()=>{});return;}
 const text=nextLine(kind);say(text,p.x,p.y-(stage.clientHeight||900)*.12);
 speakFor(kind==='two'?'narrator':kind,text,kind==='two'?'found':null);
}
for(const id of ['home-hots','cake-hots'])$(id).onclick=event=>{const b=event.target.closest?.('[data-hot]');if(b)hotTap(b.dataset.hot,event);};

// 空闲提示：首页和蛋糕页过几秒，轮流在能点的地方闪光并出现小手，偶尔用语音邀请。
const HINTS={home:[['excavator','齐齐，点点挖掘机！'],['dragon','点点小龙齐齐！'],['rooster','点点公鸡爸爸！'],['mouse','点点鼠妈妈！'],['two','点点数字二！']],cake:[['cake','齐齐，点点蛋糕，吹蜡烛！'],['dragon','点点小龙齐齐！'],['mouse','点点鼠妈妈！'],['rooster','点点公鸡爸爸！']]};
let hintTimers=[],hintCount=0,idleRound=0;
function clearHint(){hintTimers.forEach(clearTimeout);hintTimers=[];for(const id of ['home-hots','cake-hots'])for(const b of Array.from($(id).children||[]))b.classList.remove('hinting');}
function showHint(){
 if(!(mode in HINTS)||frozen()||singing||counting){armIdle();return;}
 const [kind,prompt]=HINTS[mode][hintCount%HINTS[mode].length],round=hintCount++;
 const target=Array.from($(mode==='home'?'home-hots':'cake-hots').children||[]).find(b=>b.dataset.hot===kind);
 if(target){restart(target,'hinting');hintTimers.push(setTimeout(()=>target.classList.remove('hinting'),3600));}
 if(round%2===0)speakFor('narrator',prompt,'twinkle');
 hintTimers.push(setTimeout(showHint,9000));
}
function idleTouch(){if(mode==='game'){if(!findTarget&&!peeking)armIdle();}else armIdle();}
function armIdle(){
 clearHint();
 if(frozen())return;
 if(mode in HINTS)hintTimers.push(setTimeout(showHint,6000));
 else if(mode==='game'&&!danceOn)armFind();
}

function stopSong(){voice.stop();greetingRun++;songRun++;songTimers.forEach(clearTimeout);songTimers=[];singing=false;$('scene-cake').classList.remove('dancing');audio.stopSong();$('sing').textContent='♫ 一起唱生日歌';if(mode==='cake')setLyric(blown?'齐齐，生日快乐！':'许个愿吧');}
function updateSound(){ $('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));$('bgm').muted=!sound;$('photo-video').muted=!sound;voice.setEnabled(sound); }
async function enableSound(value){const run=++soundRun;sound=value;updateSound();try{await audio.setEnabled(value);}catch{if(run!==soundRun)return sound;sound=false;updateSound();tell('此浏览器暂时无法播放声音，仍可继续玩。');}if(run!==soundRun)return sound;if(!sound){stopSong();wantsMusic=false;musicRun++;$('bgm').pause();updateMusic();}return sound;}
$('sound').onclick=async()=>{await enableSound(!sound);syncMusic();};
function updateMusic(){ $('music-toggle').textContent=$('bgm').paused?'播放音乐':'暂停音乐';$('music-toggle').disabled=!musicURL;$('clear-music').disabled=!musicURL; }
function syncMusic(){
 const bgm=$('bgm'),run=++musicRun;
 const video=Boolean(photos[photoIndex]?.video);
 const loop=(!musicURL&&$('builtin-music').checked&&sound&&mode==='album'&&photos.length>0&&albumPlaying&&!importing&&!video&&!frozen())||(danceOn&&sound&&mode==='game'&&!frozen());
 if(loop)audio.startLoop().catch(()=>{});else audio.stopLoop();
 if(wantsMusic&&sound&&mode==='album'&&!video&&!frozen()){bgm.play().then(()=>{if(run!==musicRun)return;if(!wantsMusic||!sound||mode!=='album'||frozen())bgm.pause();updateMusic();}).catch(()=>{if(run!==musicRun)return;wantsMusic=false;updateMusic();tell('音乐暂时无法播放，请点“播放音乐”重试或换一个音频文件。');});}else{bgm.pause();updateMusic();}
}
function schedulePhoto(){clearTimeout(albumTimer);if(mode==='album'&&albumPlaying&&!importing&&!frozen()&&photos.length>1&&!photos[photoIndex]?.video){albumTimer=setTimeout(()=>{photoIndex=(photoIndex+1)%photos.length;renderPhoto();},Number($('duration').value)*1000);}}
function syncPause(){stage.classList.toggle('paused',paused||photoMode);$('pause').textContent=paused?'继续动画':'暂停动画';$('pause').setAttribute('aria-pressed',String(paused));$('photo').textContent=photoMode?'退出合影':'合影模式';$('photo').setAttribute('aria-pressed',String(photoMode));document.body.classList.toggle('clean',controls.hidden||photoMode);if(frozen()){clearEffects();clearAmbient();cancelCountdown();clearFind();clearHint();stopDance();stopSong();stopMic();pauseVideo();audio.suspend().catch(()=>{});}else{armIdle();resumeVideo();}schedulePhoto();syncMusic();}
$('pause').onclick=()=>{if(photoMode){photoMode=false;paused=false;}else paused=!paused;syncPause();};
$('photo').onclick=()=>{if(photoMode){photoMode=false;paused=pausedBeforePhoto;}else{pausedBeforePhoto=paused;photoMode=true;}syncPause();if(photoMode)showControls(false);};
$('hide').onclick=()=>showControls(false);
function updateMotion(){document.body.classList.toggle('calm',calm);$('motion').textContent=calm?'动效：安静':'动效：热闹';$('motion').setAttribute('aria-pressed',String(calm));}
$('motion').onclick=()=>{calm=!calm;updateMotion();clearEffects();clearAmbient();};
$('motion-note').hidden=!reduced.matches;

// 亲子模式：自动开声音与常亮；底部大图标可换场景，长按右下角恢复家长操作。
function exitChildMode(){const wasChild=childMode;clearTimeout(parentTimer);childMode=false;if(wasChild&&window.history?.state?.kidGuard)window.history.back();$('parent-exit').hidden=true;$('kid-nav').hidden=true;$('parent-exit').classList.remove('holding');showControls(true);}
$('child-play').onclick=async()=>{selectScene('game');if(photoMode){photoMode=false;paused=pausedBeforePhoto;}paused=false;syncPause();if(!childMode)window.history?.pushState?.({kidGuard:true},'');childMode=true;$('parent-exit').hidden=false;$('kid-nav').hidden=false;showControls(false);requestAwake();await enableSound(true);};
// 亲子模式防误退：浏览器“返回”（含边缘滑动）会被拦回本页；禁止双指缩放和长按菜单。
window.addEventListener('popstate',()=>{if(childMode)window.history?.pushState?.({kidGuard:true},'');});
document.addEventListener('gesturestart',e=>{if(childMode)e.preventDefault?.();});
document.addEventListener('contextmenu',e=>{if(e.target.closest?.('#stage,#kid-nav'))e.preventDefault();});
$('kid-nav').onclick=event=>{const b=event.target.closest?.('[data-kid]');if(b)selectScene(b.dataset.kid);};
$('parent-exit').onpointerdown=event=>{if(event.isPrimary===false||event.button>0)return;event.preventDefault();clearTimeout(parentTimer);$('parent-exit').classList.add('holding');parentTimer=setTimeout(exitChildMode,1100);};
for(const event of ['pointerup','pointercancel','pointerleave'])$('parent-exit').addEventListener(event,()=>{clearTimeout(parentTimer);$('parent-exit').classList.remove('holding');});
$('parent-exit').onclick=event=>{if(event.detail===0)exitChildMode();};
$('parent-exit').oncontextmenu=event=>event.preventDefault();
// 点空白处：画面上冒出星星；家长模式下同时找回操作栏。
document.addEventListener('click',e=>{
 if(performance.now()<suppressClick)return;const t=e.target;
 if(t.closest('button,a,input,select,summary,dialog,label,#controls'))return;
 if(t.closest('#photo-frame'))photoTap(e);
 else if(t.closest('#stage')){sparkle(e);idleTouch();}
 if(!childMode&&controls.hidden)showControls(true);
});

// 场景切换：小挖掘机开过画面，把新场景“推”进来。
function selectScene(next){
 if(!modes.includes(next)||next===mode)return;
 const previous=mode;stopSong();stopMic();cancelCountdown();clearFind();clearHint();stopDance();pauseVideo();clearEffects();clearAmbient();clearTimeout(albumTimer);mode=next;
 document.querySelectorAll('[data-scene]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.scene===mode)));
 for(const name of ['home','cake','game'])$('kid-'+name).setAttribute('aria-pressed',String(name===mode));
 clearTimeout(leaveTimer);if(leaving){leaving.classList.remove('leaving');leaving=null;}
 modes.forEach(name=>{const el=$('scene-'+name);el.hidden=name!==mode;el.classList.remove('entering');});
 if(!calm&&!frozen()){
  const old=$('scene-'+previous),fresh=$('scene-'+mode);old.hidden=false;old.classList.add('leaving');leaving=old;restart(fresh,'entering');restart($('wipe'),'go');
  leaveTimer=setTimeout(()=>{old.hidden=true;old.classList.remove('leaving');fresh.classList.remove('entering');$('wipe').classList.remove('go');leaving=null;},1000);
  audio.effect('drive').catch(()=>{});
 }
 document.body.setAttribute('data-scene',mode);
 $('album-tools').hidden=mode!=='album';$('album-settings').hidden=mode!=='album';$('cake-tools').hidden=mode!=='cake';$('mic-tools').hidden=mode!=='cake';
 stage.setAttribute('aria-label',({home:'齐齐的小龙挖掘机乐园',album:'齐齐的成长相册',cake:'齐齐的生日蛋糕',game:'点一点，和爸爸妈妈打招呼'})[mode]);
 if(mode==='album')renderPhoto();if(mode==='cake')updateCake();armIdle();syncMusic();
}
document.querySelectorAll('[data-scene]').forEach(el=>el.onclick=()=>selectScene(el.dataset.scene));

// 相册：限定数量与体积，逐张实际解码；失败的文件不会打断已有相册。
function captionOf(name){let s=name.replace(/\.[^.]+$/,'');if(/^(img|dsc|dscn|pxl|mvimg|mmexport|wx_camera|photo|screenshot|微信图片|image)/i.test(s)||/^[0-9a-f-]{8,}$/i.test(s))return '';return s.replace(/^[\d\s._\-()（）]+/,'').replace(/_/g,' ').trim().slice(0,90);}
function decode(url){return new Promise((resolve,reject)=>{const img=new Image();const timer=setTimeout(()=>{img.src='';reject(Error('timeout'));},12000);img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(Error('decode'));};img.src=url;});}
function finishImport(){importing=false;$('import-status').hidden=true;$('pick').disabled=false;$('empty-pick').disabled=false;$('pick-folder').disabled=false;}
function cancelImport(){importRun++;finishImport();albumPlaying=importResume;updateAlbum();schedulePhoto();syncMusic();tell('已取消导入，原来的照片仍然保留。');}
$('cancel-import').onclick=cancelImport;
async function importPhotos(list){
 const files=Array.from(list).filter(f=>IMAGE_RE.test(f.name)||VIDEO_RE.test(f.name)).sort((a,b)=>(a.webkitRelativePath||a.name).localeCompare(b.webkitRelativePath||b.name,'zh',{numeric:true}));
 if(!files.length){tell('请选择 JPG、PNG 照片或 MP4、MOV 小视频。');return;}
 const run=++importRun;if(!importing)importResume=albumPlaying;
 importing=true;selectScene('album');clearTimeout(albumTimer);updateAlbum();syncMusic();
 $('import-status').hidden=false;for(const id of ['pick','empty-pick','pick-folder'])$(id).disabled=true;
 const loaded=[];let skipped=0,bytes=0;
 for(const [i,file]of files.entries()){
  if(run!==importRun){loaded.forEach(p=>URL.revokeObjectURL(p.url));return;}
  const isVideo=VIDEO_RE.test(file.name);
  if(loaded.length>=120||file.size>(isVideo?400:25)*1024*1024||bytes+file.size>1500*1024*1024){skipped++;continue;}
  $('import-label').textContent=`正在准备 ${i+1} / ${files.length} 张 · 仅在本页使用`;
  const url=URL.createObjectURL(file);
  try{if(isVideo){await probeVideo(url);loaded.push({url,cap:captionOf(file.name),video:true});}else{const img=await decode(url);if(img.naturalWidth*img.naturalHeight>50000000)throw Error('large');loaded.push({url,cap:captionOf(file.name)});}bytes+=file.size;}catch{URL.revokeObjectURL(url);skipped++;}
 }
 if(run!==importRun){loaded.forEach(p=>URL.revokeObjectURL(p.url));return;}
 finishImport();
 if(!loaded.length){albumPlaying=importResume;updateAlbum();schedulePhoto();syncMusic();tell('这些照片或视频暂时无法显示，原相册已保留。请换成 JPG、PNG 或 MP4 后重试。');return;}
 photoRun++;const previous=photos;photos=loaded;photoIndex=0;albumPlaying=true;await renderPhoto();syncMusic();
 previous.forEach(p=>URL.revokeObjectURL(p.url));
 if(run===importRun)tell(`已准备 ${photos.length} 个照片/视频，只在本页临时展示。${skipped?'无法显示、动态或超限文件已跳过。':''}`);
}
function updateAlbum(){const has=photos.length>0;$('scene-album').classList.toggle('has-photos',has);$('album-empty').hidden=has;$('photo-frame').hidden=!has;$('album-count').hidden=!has;$('album-progress').hidden=!has;for(const id of ['album-toggle','clear-photos'])$(id).disabled=!has;for(const id of ['previous','next'])$(id).disabled=photos.length<2;$('album-toggle').textContent=albumPlaying?'暂停相册':'播放相册';$('album-count').textContent=`${photoIndex+1} / ${photos.length}`;$('album-progress').firstElementChild.style.width=has?`${(photoIndex+1)/photos.length*100}%`:'0%';}
const IMAGE_RE=/\.(jpe?g|png|webp|avif|bmp|heic|heif)$/i,VIDEO_RE=/\.(mp4|mov|m4v|webm)$/i;
const ORIGINS=['30% 30%','70% 35%','40% 70%','65% 65%','50% 50%'];
async function renderPhoto(){
 clearTimeout(albumTimer);updateAlbum();if(!photos.length)return;const run=++photoRun,p=photos[photoIndex];
 try{
  if(p.video){showVideo(p,run);return;}
  await decode(p.url);if(run!==photoRun)return;const img=$('photo-img');stopVideo();img.hidden=false;
  img.classList.remove('photo-enter');img.src=p.url;img.alt=p.cap||`齐齐的成长照片，第 ${photoIndex+1} 张`;
  img.style.setProperty('--dur',`${Number($('duration').value)+1}s`);img.style.setProperty('--origin',ORIGINS[photoIndex%ORIGINS.length]);
  $('album-bg').style.setProperty('--photo',`url("${p.url}")`);
  $('photo-caption').textContent=$('captions').checked?p.cap:'';
  if(!calm&&!frozen()){void img.offsetWidth;img.classList.add('photo-enter');}
  if(photoIndex%2===0&&mode==='album'&&!frozen())voice.speak('narrator',ALBUM_LINES[(photoIndex/2)%ALBUM_LINES.length]);
  schedulePhoto();
 }catch{if(run!==photoRun)return;albumPlaying=false;updateAlbum();tell('这张照片加载失败，可以切到下一张或重新选择照片。');}
}
// 视频：读出元数据即可加入；播完自动下一张，单个视频时循环播放；有声音时带原声。
function probeVideo(url){return new Promise((resolve,reject)=>{const v=document.createElement('video');const timer=setTimeout(()=>{v.removeAttribute('src');reject(Error('timeout'));},15000);v.preload='metadata';v.muted=true;v.onloadedmetadata=()=>{clearTimeout(timer);v.removeAttribute('src');v.load?.();resolve();};v.onerror=()=>{clearTimeout(timer);reject(Error('video'));};v.src=url;});}
function stopVideo(){const v=$('photo-video');v.onended=null;v.pause?.();v.removeAttribute('src');v.load?.();v.hidden=true;}
function pauseVideo(){$('photo-video').pause?.();}
function resumeVideo(){const v=$('photo-video');if(mode==='album'&&!v.hidden&&v.paused&&!frozen())v.play?.().catch(()=>{});}
function showVideo(p,run){
 const v=$('photo-video'),img=$('photo-img');img.hidden=true;img.classList.remove('photo-enter');
 v.onloadedmetadata=()=>{const ar=v.videoWidth/v.videoHeight||16/9;v.style.width=`min(70cqw,${(42*ar).toFixed(1)}cqw)`;};
 v.hidden=false;v.src=p.url;v.muted=!sound;v.volume=1;v.loop=photos.length<2;
 v.onended=()=>{if(run!==photoRun)return;if(albumPlaying&&photos.length>1){photoIndex=(photoIndex+1)%photos.length;renderPhoto();}};
 $('album-bg').style.setProperty('--photo','none');$('photo-caption').textContent=$('captions').checked?p.cap:'';
 if(!frozen()&&mode==='album')v.play?.().catch(()=>{v.muted=true;v.play?.().catch(()=>{});});
 syncMusic();
}
const ALBUM_LINES=['看，这是齐齐！','哇，齐齐好可爱！','齐齐长大啦！','这是谁呀？是齐齐！'];
const PHOTO_TAP=['哇，齐齐好棒！','是齐齐呀！','齐齐真可爱！'];let photoTapCount=0;
function photoTap(event){if(frozen())return;const p=stagePoint(event.clientX,event.clientY);burst(p.x,p.y,12,true);audio.effect('twinkle').catch(()=>{});if(canTalk()&&!photos[photoIndex]?.video){const text=PHOTO_TAP[photoTapCount++%PHOTO_TAP.length];say(text,p.x,p.y-(stage.clientHeight||900)*.1);voice.speak('narrator',text);}}
function stepPhoto(step){if(!photos.length)return;photoIndex=(photoIndex+step+photos.length)%photos.length;renderPhoto();}
function pickPhotos(){ $('files').click(); }
$('empty-pick').onclick=pickPhotos;$('pick').onclick=pickPhotos;$('pick-folder').onclick=()=>$('folder').click();
for(const id of ['files','folder'])$(id).onchange=e=>{importPhotos(e.target.files);e.target.value='';};
$('previous').onclick=()=>stepPhoto(-1);$('next').onclick=()=>stepPhoto(1);$('album-toggle').onclick=()=>{albumPlaying=!albumPlaying;updateAlbum();schedulePhoto();syncMusic();};$('duration').onchange=schedulePhoto;$('captions').onchange=renderPhoto;$('builtin-music').onchange=syncMusic;
$('clear-photos').onclick=()=>{importRun++;finishImport();importResume=false;photoRun++;clearTimeout(albumTimer);photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[];photoIndex=0;albumPlaying=false;stopVideo();$('photo-img').removeAttribute('src');$('album-bg').style.setProperty('--photo','none');clearAmbient();updateAlbum();syncMusic();};
$('clear-music').onclick=()=>{musicRun++;wantsMusic=false;$('bgm').pause();$('bgm').removeAttribute('src');$('bgm').load?.();if(musicURL)URL.revokeObjectURL(musicURL);musicURL='';updateMusic();syncMusic();};
$('pick-music').onclick=()=>$('music-file').click();$('music-file').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>100*1024*1024){tell('请选择小于 100 MB 的音乐文件。');return;}$('bgm').pause();if(musicURL)URL.revokeObjectURL(musicURL);musicURL=URL.createObjectURL(file);$('bgm').src=musicURL;$('bgm').volume=.7;wantsMusic=false;audio.stopLoop();updateMusic();tell('音乐已选择，点“播放音乐”开始。');};
$('music-toggle').onclick=async()=>{if(!musicURL)return;if(wantsMusic){wantsMusic=false;}else{if(!await enableSound(true))return;wantsMusic=true;}syncMusic();};$('bgm').onerror=()=>{wantsMusic=false;updateMusic();tell('这段音乐无法播放，请尝试 MP3 或其他文件。');};
window.addEventListener('dragover',e=>e.preventDefault());window.addEventListener('drop',e=>{e.preventDefault();if(e.dataTransfer?.files.length)importPhotos(e.dataTransfer.files);});

// 蛋糕：唱歌（家人录音优先）、3·2·1 倒数、吹灭动画、点蛋糕重新点亮再玩一次。
function setLyric(text,duration){
 const el=$('lyric');
 if(!duration){el.classList.remove('karaoke');el.textContent=text;return;}
 const chars=[...text];el.classList.add('karaoke');
 el.replaceChildren(...chars.map((c,i)=>{const s=document.createElement('span');s.textContent=c;s.style.animationDelay=`${(i*duration/chars.length).toFixed(2)}s`;return s;}));
}
function updateCake(){const cake=$('birthday-cake');cake.classList.toggle('out',blown);$('cake-title').textContent=blown?'齐齐，生日快乐！蜡烛吹灭啦':'齐齐，生日快乐！';setLyric(blown?'齐齐，生日快乐！':'许个愿吧');$('blow').hidden=blown;$('countdown-blow').hidden=blown;$('relight').hidden=!blown;}
const LYRICS=['祝你生日快乐','祝你生日快乐','祝齐齐生日快乐','祝你生日快乐'];
function showLyrics(times,total,run){times.forEach((t,i)=>songTimers.push(setTimeout(()=>{if(run===songRun)setLyric(LYRICS[i],(times[i+1]??total-.8)-t);},t*1000)));}
function startCakeDance(beat,run){if(calm)return;const scene=$('scene-cake');scene.style.setProperty('--beat',`${beat}s`);scene.classList.add('dancing');songTimers.push(setInterval(()=>{if(run===songRun&&!frozen())spawnNote();},beat*1000));}
function finishSong(run){if(run!==songRun)return;stopSong();setLyric(blown?'齐齐，生日快乐！':'许个愿，吹蜡烛吧！');if(!blown)voice.speak('narrator','许个愿，吹蜡烛吧！');}
async function sing(){
 if(singing){stopSong();return;}if(frozen()){tell('先退出合影或继续动画，再一起唱歌吧。');return;}
 cancelCountdown();stopMic();const run=++songRun;singing=true;$('sing').textContent='停止生日歌';
 if(!await enableSound(true)||run!==songRun||mode!=='cake'||frozen())return;
 try{
  if(voice.status().has('song')){
   const playing=await voice.speak('song','',{max:180000,onEnd:()=>finishSong(run)});
   if(run!==songRun)return;
   if(playing){startCakeDance(.6,run);const d=voice.duration();if(d){const step=d/LYRICS.length;showLyrics(LYRICS.map((_,i)=>i*step),d+.8,run);}else setLyric('祝齐齐生日快乐');return;}
  }
  const song=await audio.song();if(run!==songRun||mode!=='cake')return;if(!song){stopSong();return;}
  startCakeDance(.58,run);showLyrics(song.lines,song.total,run);songTimers.push(setTimeout(()=>finishSong(run),song.total*1000));
 }catch{stopSong();tell('暂时无法播放生日歌，可以大家一起唱。');}
}
function cancelCountdown(){countdownTimers.forEach(clearTimeout);countdownTimers=[];counting=false;$('countdown').textContent='';$('countdown').classList.remove('show');}
function startCountdown(){
 if(mode!=='cake'||blown||counting)return;if(frozen()){tell('请先退出合影或继续动画。');return;}
 stopSong();stopMic();counting=true;const steps=['3','2','1','呼～'];
 steps.forEach((s,i)=>countdownTimers.push(setTimeout(()=>{$('countdown').textContent=s;restart($('countdown'),'show');audio.effect(i<3?'beep':'puff').catch(()=>{});},i*800)));
 countdownTimers.push(setTimeout(()=>{cancelCountdown();blow();},steps.length*800-150));
}
function blow(){
 if(mode!=='cake'||blown)return;cancelCountdown();stopSong();stopMic();blown=true;updateCake();
 const cake=$('birthday-cake');cake.classList.remove('relit');restart(cake,'just-out');clearTimeout(cheerTimer);cheerTimer=setTimeout(()=>cake.classList.remove('just-out'),3400);
 celebrate();if(!frozen())voice.speak('narrator','哇！齐齐，生日快乐！');showControls(false);
}
function relight(){stopSong();stopMic();cancelCountdown();blown=false;clearEffects();updateCake();restart($('birthday-cake'),'relit');}
function cakeTap(){
 if(counting)return;
 if(blown){relight();const p=stagePoint();burst(p.x,p.y*.7,10);say('蜡烛又亮啦，再吹一次！',p.x,p.y*.55);audio.effect('twinkle').catch(()=>{});}
 else startCountdown();
}
$('sing').onclick=sing;$('blow').onclick=blow;$('countdown-blow').onclick=startCountdown;$('relight').onclick=relight;

// 麦克风仅通过明确按钮启用；校准环境音，连续响度超阈值触发，键盘/按钮始终可用。
function stopMic(){micRun++;clearInterval(micTimer);micStream?.getTracks().forEach(t=>t.stop());micStream=null;if(micContext){micContext.close().catch(()=>{});micContext=null;}micPending=false;$('mic-toggle').disabled=false;$('mic-toggle').textContent='开启吹气感应';$('mic-toggle').setAttribute('aria-pressed','false');$('mic-status').textContent='';}
async function startMic(){if(micStream||micPending){stopMic();return;}if(blown){tell('先重新点亮蜡烛吧。');return;}if(frozen()){tell('请先退出合影或继续动画。');return;}if(!navigator.mediaDevices?.getUserMedia){tell('当前环境不支持麦克风，请直接点“吹灭蜡烛”。');return;}stopSong();const run=++micRun;micPending=true;$('mic-toggle').disabled=true;
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});if(run!==micRun||mode!=='cake'||document.hidden){stream.getTracks().forEach(t=>t.stop());return;}micStream=stream;const AC=window.AudioContext||window.webkitAudioContext;micContext=new AC();await micContext.resume();if(run!==micRun)return;const analyser=micContext.createAnalyser();analyser.fftSize=1024;micContext.createMediaStreamSource(stream).connect(analyser);const samples=new Float32Array(analyser.fftSize);let count=0,ambient=0,over=0;const started=performance.now();$('mic-toggle').textContent='关闭吹气感应';$('mic-toggle').setAttribute('aria-pressed','true');$('mic-status').textContent='先安静一小会儿，正在准备…';
 micTimer=setInterval(()=>{analyser.getFloatTimeDomainData(samples);let sum=0;for(const n of samples)sum+=n*n;const rms=Math.sqrt(sum/samples.length);if(performance.now()-started<1500){ambient=(ambient*count+rms)/++count;return;}const threshold=Math.max(.07,ambient*4);$('mic-status').textContent='对着手机轻轻吹气，也可以点按钮';over=rms>threshold?over+50:Math.max(0,over-25);if(over>=400)blow();},50);
 }catch{if(run===micRun){stopMic();tell('无法使用麦克风，直接点“吹灭蜡烛”就好。');}}finally{if(run===micRun){micPending=false;$('mic-toggle').disabled=false;}}
}
$('mic-toggle').onclick=startMic;

// 家人录音。
function updateVoices(){const state=voice.status();$('clear-voices').disabled=!state.count;for(const [id,kind,label] of [['pick-mom','mouse','妈妈录音'],['pick-dad','rooster','爸爸录音'],['pick-child','dragon','齐齐录音'],['pick-song','song','生日歌录音']])$(id).textContent=state.has(kind)?`更换${label}`:`选择${label}`;$('voice-status').textContent=state.count?`已准备 ${state.count} 段家人录音 · 只在本页使用`:state.local?'可使用设备离线中文声音，也可以选择家人录音。':'设备暂无离线中文声音；可以选择家人录音，或使用轻柔音效。';}
voice.init($('voice-audio'),tell,()=>{updateVoices();try{recLabels();}catch{}});
$('spoken').onchange=()=>voice.setSpoken($('spoken').checked);
let voiceTarget='mouse';
for(const [id,kind] of [['pick-mom','mouse'],['pick-dad','rooster'],['pick-child','dragon'],['pick-song','song']])$(id).onclick=()=>{voiceTarget=kind;$('voice-file').click();};
$('voice-file').onchange=event=>{const file=event.target.files[0];event.target.value='';if(file&&voice.setClip(voiceTarget,file))tell(voiceTarget==='song'?'生日歌录音已准备，点“一起唱生日歌”就会播放。':'录音已准备。开启声音后，点对应角色即可听到；每次最多播放 12 秒。');};
$('clear-voices').onclick=()=>voice.clearClips();

// 点点玩：无分数、无失败。每一下都有动作和星星；挖掘机会开走再开回来；空闲时轮流玩“找一找”和“躲猫猫”；♫ 按钮开跳舞派对。
const friendButtons=[...document.querySelectorAll('[data-friend]')];
const friendOf=kind=>friendButtons.find(b=>b.dataset.friend===kind);
const greetStyles=['greet-jump','greet-spin','greet-wiggle'];
const FIND={mouse:['齐齐，妈妈在哪里呀？','找到妈妈啦！真棒！'],rooster:['齐齐，爸爸在哪里呀？','找到爸爸啦！真棒！'],excavator:['挖掘机在哪里呀？','找到挖掘机啦！嘟嘟！'],dragon:['小龙齐齐在哪里呀？','找到小龙齐齐啦！']};
function helloDefault(){return findTarget?FIND[findTarget][0]:'点点小伙伴';}
function friendCenter(button){const s=stage.getBoundingClientRect(),r=button.getBoundingClientRect();return {x:r.left+r.width/2-s.left,y:r.top+r.height*.25-s.top};}
function clearFind(){findTimers.forEach(clearTimeout);findTimers=[];if(findTarget)friendOf(findTarget)?.classList.remove('hint');findTarget=null;peeking=false;friendButtons.forEach(b=>{b.classList.remove('hiding');b.classList.remove('peek');});}
function armFind(){clearFind();if(mode!=='game'||frozen()||danceOn)return;findTimers.push(setTimeout(()=>idleRound++%2===0?askFind():peekaboo(),FIND_IDLE));}
function askFind(){
 if(mode!=='game'||frozen())return;const kinds=Object.keys(FIND),kind=kinds[findCount++%kinds.length];
 findTarget=kind;clearTimeout(helloTimer);$('hello').textContent=FIND[kind][0];speakFor('narrator',FIND[kind][0]);
 findTimers.push(setTimeout(()=>friendOf(kind)?.classList.add('hint'),3500));
 findTimers.push(setTimeout(armFind,22000));
}
function peekaboo(){
 if(mode!=='game'||frozen()||danceOn)return;peeking=true;clearTimeout(helloTimer);
 $('hello').textContent='躲猫猫！大家藏起来啦～';speakFor('narrator','躲猫猫，大家藏起来啦！','twinkle');
 friendButtons.forEach(b=>restart(b,'hiding'));
 friendButtons.forEach((b,i)=>findTimers.push(setTimeout(()=>reveal(b,false),3000+i*650)));
 findTimers.push(setTimeout(()=>{peeking=false;$('hello').textContent='哇！大家都出来啦！';speakFor('narrator','哇！躲猫猫！','found');helloTimer=setTimeout(()=>$('hello').textContent=helloDefault(),4000);armFind();},3000+friendButtons.length*650+400));
}
function reveal(button,byTap){
 if(!button.classList.contains('hiding'))return;button.classList.remove('hiding');restart(button,'peek');setTimeout(()=>button.classList.remove('peek'),800);
 const c=friendCenter(button);burst(c.x,c.y,12,true);audio.effect(byTap?'found':'pop').catch(()=>{});
 if(byTap&&canTalk()){$('hello').textContent='找到啦！';voice.speak('narrator','找到啦！');}
}
function animateFriend(button,kind){
 if(kind==='excavator'){if(!button.classList.contains('driving')){restart(button,'driving');setTimeout(()=>button.classList.remove('driving'),2600);}return;}
 for(const name of greetStyles)button.classList.remove(name);void button.offsetWidth;const style=greetStyles[greetStyle++%greetStyles.length];button.classList.add(style);setTimeout(()=>button.classList.remove(style),950);
}
friendButtons.forEach(button=>button.onclick=()=>{
 if(frozen())return;const kind=button.dataset.friend;
 if(peeking&&button.classList.contains('hiding')){reveal(button,true);return;}
 const found=findTarget===kind;animateFriend(button,kind);
 const c=friendCenter(button);burst(c.x,c.y,found?16:10,found);
 if(found)lastGreeting=performance.now();else if(!canTalk()){audio.effect('twinkle').catch(()=>{});return;}
 const text=found?FIND[kind][1]:nextLine(kind);
 $('hello').textContent=found?text:`${speakers[kind]}：${text}`;
 if(found){clearFind();speakFor('narrator',text,'found');armFind();}
 else{speakFor(kind,text);if(!findTarget&&!peeking)armFind();}
 clearTimeout(helloTimer);helloTimer=setTimeout(()=>$('hello').textContent=helloDefault(),4500);
});
function stopDance(){danceTimers.forEach(clearTimeout);danceTimers=[];if(!danceOn)return;danceOn=false;$('scene-game').classList.remove('dancing');$('dance-btn').classList.remove('on');syncMusic();}
async function startDance(){
 if(danceOn){stopDance();armIdle();return;}if(frozen()||mode!=='game')return;
 clearFind();danceOn=true;$('scene-game').classList.add('dancing');$('dance-btn').classList.add('on');clearTimeout(helloTimer);$('hello').textContent='跳舞啦！一起扭一扭！';
 danceTimers.push(setInterval(()=>{if(!frozen())spawnNote();},540));
 danceTimers.push(setTimeout(()=>{stopDance();$('hello').textContent='跳得真棒！';celebrate();helloTimer=setTimeout(()=>$('hello').textContent=helloDefault(),4500);armIdle();},16000));
 if(await enableSound(true)&&danceOn){syncMusic();voice.speak('narrator','跳舞啦！一起扭一扭！');}
}
$('dance-btn').onclick=startDance;

// 页面内录音：点一下开始、再点结束；录好立即回放。不上传，刷新后需重录。
const REC={mouse:['rec-mom','录妈妈'],rooster:['rec-dad','录爸爸'],dragon:['rec-child','录齐齐/小龙'],song:['rec-song','录全家唱生日歌']};
let recorder=null,recStream=null,recTimer,recKind=null;
function recLabels(){const state=voice.status();for(const [kind,[id,label]] of Object.entries(REC)){const n=state.clipsOf?.(kind)||0;$(id).textContent=n&&kind!=='song'?`${label}（已录 ${n} 段）`:n?`${label}（已录好）`:label;$(id).setAttribute('aria-pressed','false');}}
function stopRecord(save=true){clearTimeout(recTimer);const r=recorder;recorder=null;recKind=null;if(r){if(!save)r.onstop=null;if(r.state!=='inactive')r.stop();}recStream?.getTracks().forEach(t=>t.stop());recStream=null;recLabels();}
async function toggleRecord(kind){
 if(recorder){const same=recKind===kind;stopRecord(true);if(same)return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){tell('当前浏览器不支持页面内录音，可以先用手机录音，再点“选择妈妈录音”等按钮导入。');return;}
 stopMic();stopSong();voice.stop();
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
  recStream=stream;const chunks=[],r=new window.MediaRecorder(stream);recorder=r;recKind=kind;
  r.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  r.onstop=async()=>{const blob=new Blob(chunks,{type:r.mimeType||'audio/webm'});if(!blob.size){tell('没有录到声音，请再试一次。');return;}voice.addClip(kind,blob);recLabels();tell(kind==='song'?'录好了！正在回放；点“一起唱生日歌”就会播放这段。':'录好了！正在回放；点对应角色就能听到，多录几段会轮流播放。');if(await enableSound(true))voice.speak(kind,'');};
  r.start();$(REC[kind][0]).textContent='■ 正在录音，点我结束';$(REC[kind][0]).setAttribute('aria-pressed','true');
  recTimer=setTimeout(()=>stopRecord(true),kind==='song'?90000:10000);
 }catch{stopRecord(false);tell('无法录音：请允许麦克风权限，并用 HTTPS 或局域网地址打开页面。');}
}
for(const kind of Object.keys(REC))$(REC[kind][0]).onclick=()=>toggleRecord(kind);
recLabels();


// 展示工具：全屏、屏幕常亮均有失败回退；进入全屏或亲子模式时自动尝试常亮。
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
function updateFullscreen(){const active=Boolean(fullscreenElement());$('fullscreen').textContent=active?'退出全屏':'全屏展示';$('fullscreen').setAttribute('aria-pressed',String(active));if(!active&&childMode)exitChildMode();else showControls(!active);}
$('fullscreen').onclick=async()=>{
 try{
  if(fullscreenElement()){
   const exit=document.fullscreenElement?document.exitFullscreen:document.webkitExitFullscreen;
   if(exit)await exit.call(document);
  }else{
   const enter=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;
   if(!enter){tell(/iPhone|iPod/.test(navigator.userAgent||'')?'iPhone 不支持网页全屏：请在 Safari 点「分享 → 添加到主屏幕」，从桌面图标打开即可隐藏工具栏。':'此浏览器不支持网页全屏。请横屏、收起浏览器工具栏，再使用系统屏幕镜像。');requestAwake();return;}
   await enter.call(document.documentElement);showControls(false);requestAwake();
  }
  updateFullscreen();
 }catch{tell('暂时无法进入全屏，请横屏并使用手机屏幕镜像。');}
};
document.addEventListener('fullscreenchange',updateFullscreen);
document.addEventListener('webkitfullscreenchange',updateFullscreen);
$('celebrate').onclick=()=>{celebrate();showControls(false);};
function updateAwake(){ $('awake').textContent=wakeLock?'关闭屏幕常亮':wantsAwake?'常亮已暂停 · 重试':'保持屏幕常亮';$('awake').setAttribute('aria-pressed',String(Boolean(wakeLock))); }
async function acquireWake(show){if(!navigator.wakeLock||wakePending||wakeLock||!wantsAwake||document.hidden)return;wakePending=true;$('awake').disabled=true;try{const lock=await navigator.wakeLock.request('screen');if(!wantsAwake||document.hidden){await lock.release();return;}wakeLock=lock;lock.addEventListener('release',()=>{if(wakeLock===lock)wakeLock=null;updateAwake();});if(show)tell('屏幕常亮已开启，请保持网页在前台。');}catch{if(show)tell('暂时无法常亮，请在手机设置中延长自动锁屏时间。');}finally{wakePending=false;$('awake').disabled=false;updateAwake();}}
function requestAwake(){if(!navigator.wakeLock)return;wantsAwake=true;acquireWake(false);}
$('awake').onclick=async()=>{if(!navigator.wakeLock){tell('当前环境不支持常亮，请在手机设置中延长自动锁屏时间。');return;}if(wakeLock){wantsAwake=false;const lock=wakeLock;wakeLock=null;try{await lock.release();}catch{}updateAwake();}else{wantsAwake=true;await acquireWake(true);}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){exitChildMode();return;}if(childMode)return;if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,select,textarea,button,a,summary,dialog'))return;if(/^[1-4]$/.test(e.key)){selectScene(modes[+e.key-1]);return;}if(e.key.toLowerCase()==='h')showControls(controls.hidden);if(mode==='album'){if(e.key==='ArrowRight')stepPhoto(1);if(e.key==='ArrowLeft')stepPhoto(-1);if(e.code==='Space'&&photos.length){e.preventDefault();$('album-toggle').click();}}if(mode==='cake'&&e.code==='Space'){e.preventDefault();blow();}});
document.addEventListener('visibilitychange',()=>{stage.classList.toggle('background-paused',document.hidden);if(document.hidden){musicRun++;clearTimeout(albumTimer);clearEffects();clearAmbient();cancelCountdown();clearFind();clearHint();stopDance();pauseVideo();stopRecord(true);stopSong();stopMic();$('bgm').pause();audio.suspend().catch(()=>{});}else{schedulePhoto();syncMusic();acquireWake(false);armIdle();resumeVideo();}});
window.addEventListener('pagehide',()=>{musicRun++;importRun++;finishImport();clearTimeout(albumTimer);stopSong();stopMic();stopRecord(false);clearHint();stopDance();pauseVideo();clearEffects();clearAmbient();cancelCountdown();clearFind();$('bgm').pause();audio.suspend().catch(()=>{});const lock=wakeLock;wakeLock=null;if(lock)lock.release().catch(()=>{});});
window.addEventListener('pageshow',()=>{schedulePhoto();acquireWake(false);});window.addEventListener('resize',()=>{clearEffects();clearAmbient();});
updateAlbum();updateCake();updateSound();updateMotion();armIdle();
