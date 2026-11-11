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
let showMode=false,ceremonyOn=false,ceremonyTimer,ceremonyWatch,performCount=0,showUntil=0;
const audio=window.PartyAudio;
const voice=window.PartyVoice;
const PALETTE=['#ff5d73','#ffb703','#06d6a0','#4cc9f0','#f72585','#ffd60a','#8ac926','#ff8fab','#ffffff'];
const CONFETTI=140,FIND_IDLE=9000;
// 毛毡贴纸（scripts/make_felt_sprites.mjs 生成）：星星、爱心用于点击爆开，气球用于飘浮。
const DECO='assets/deco/',BITS=['star-yellow','heart-red','star-pink','star-mint','heart-pink'],BALLOONS=['orange','lime','cream','yellow','coral','sky','pink'];
for(const name of [...BITS,...BALLOONS.map(b=>'balloon-'+b)]){const warm=new Image();warm.src=`${DECO}${name}.webp`;}
function tell(message){clearTimeout(noticeTimer);$('notice').textContent=message;noticeTimer=setTimeout(()=>$('notice').textContent='',4800);}
function clearEffects(){clearTimeout(confettiTimer);$('confetti').replaceChildren();$('bubbles').replaceChildren();$('finale').replaceChildren();}
function clearAmbient(){$('ambient').replaceChildren();}
function frozen(){return paused||photoMode||document.hidden;}
function showControls(visible){controls.hidden=!visible;if(visible)armMenuIdle();else clearTimeout(menuIdleTimer);document.body.classList.toggle('clean',!visible||photoMode);if(!visible){$('settings').open=false;$('notice').textContent='';stage.focus({preventScroll:true});}}
// 独立的电视全屏拍照背景：不改变相册数据，也不上传用户图片。
// 背景都是生图工具生成的完整插画，由 scripts/make_photo_backgrounds.mjs 转成 WebP 和缩略图；齐齐的每个动作只出现一次。
const PHOTO_BACKGROUNDS=[
 ['漫画施工派对·齐齐','photo-booth-comic-v1'],
 ['嘉年华生日会·齐齐','photo-booth-carnival-v1'],
 ['霓虹音乐会·齐齐','photo-booth-neon-v1'],
 ['太空探险·齐齐','photo-booth-space-v1'],
 ['东方灯会·齐齐','photo-booth-lantern-v1'],
 ['海底生日探险·齐齐','photo-booth-ocean-v1'],
 ['挖掘机生日舞台·齐齐','photo-booth-excavator-stage-v1'],
 ['挖掘机工程任务·齐齐','photo-booth-excavator-blueprint-v1'],
 ['挖掘机大巡游·齐齐','photo-booth-excavator-parade-v1'],
 ['生日派对·热闹施工主题','photo-booth-party-v2'],
 ['毛毡农场派对','felt-farm'],
 ['挖掘机大厅·夜间灯光','hall-night'],
 ['毛毡生日蛋糕','felt-cake'],
 ['梦幻拼贴','dreamscape'],
 ['生日快乐·波普','popart'],
 ['齐齐两岁啦·拼贴','fullbleed-qiqi-2yo-collage'],
 ['齐齐生日照片墙','fullbleed-qiqi-birthday-wall'],
 ['挖掘机大厅·蓝图','hall-blueprint'],
 ['挖掘机大厅·工业橙','hall-industrial-orange'],
 ['小小工程师·复古玩具','hall-retro-toy']
].map(([label,name])=>[label,`assets/photo-backgrounds/${name}.webp`,`assets/photo-backgrounds/${name}.thumb.webp`]);
let photoBoothItems=[],photoBoothIndex=0,photoBoothTimer=0,photoBoothPlaying=false,photoBoothPanelHidden=false,photoBoothMusicOn=false,photoBoothPreviousMusic=false;
let photoBoothRun=0,photoBoothRemoved=[],photoBoothFullscreen=false;
function boothOpen(){return !$('photo-booth').hidden;}
let menuIdleTimer;
// 菜单不操作 14 秒自动收起（打开「更多」、换背景抽屉、导入或录音时不收）；轻点画面空白处、H 或 Esc 叫回来。
function armMenuIdle(){clearTimeout(menuIdleTimer);if(document.hidden)return;if(boothOpen()?!photoBoothPanelHidden:!controls.hidden&&!childMode)menuIdleTimer=setTimeout(autoHideMenus,14000);}
function autoHideMenus(){if(boothOpen()){if(photoBoothPanelHidden)return;if($('photo-booth-drawer').hidden)showPhotoBoothPanel(false);else armMenuIdle();return;}if(controls.hidden||childMode)return;if($('settings').open||importing||recorder)armMenuIdle();else showControls(false);}
function showPhotoBoothPanel(visible=true){photoBoothPanelHidden=!visible;$('photo-booth').classList.toggle('menu-hidden',!visible);if(visible)showControls(false);armMenuIdle();}
function setPhotoBoothDrawer(open){$('photo-booth-drawer').hidden=!open;$('photo-booth-pick').setAttribute('aria-pressed',String(open));armMenuIdle();}
function setPhotoBoothBackground(src,label=''){const surface=$('photo-booth-surface');if(!surface)return;surface.classList.remove('photo-booth-fade');void surface.offsetWidth;surface.style.backgroundImage=`url("${src}")`;surface.dataset.label=label;$('photo-booth-name').textContent=label;surface.classList.add('photo-booth-fade');Array.from($('photo-booth-presets').children||[]).forEach((b,i)=>b.classList.toggle('selected',i===photoBoothIndex));}
function showPhotoBoothItem(i){if(!photoBoothItems.length)return;photoBoothIndex=(i+photoBoothItems.length)%photoBoothItems.length;const item=photoBoothItems[photoBoothIndex];setPhotoBoothBackground(item.src,item.label);}
function renderPhotoBoothItems(){
 const list=$('photo-booth-presets');list.replaceChildren();
 photoBoothItems.forEach((item,i)=>{const b=document.createElement('button'),img=document.createElement('img'),span=document.createElement('span');b.type='button';b.title=item.label;img.src=item.thumb||item.src;img.alt='';img.loading='lazy';span.textContent=item.label;b.append(img);b.append(span);b.onclick=()=>{showPhotoBoothItem(i);schedulePhotoBoothCarousel();};list.append(b);});
 if(photoBoothItems.length){photoBoothIndex=Math.min(photoBoothIndex,photoBoothItems.length-1);showPhotoBoothItem(photoBoothIndex);}
 $('photo-booth-delete').disabled=photoBoothItems.length<2;$('photo-booth-reset').hidden=!photoBoothRemoved.length;
}
function presetBackgrounds(){return PHOTO_BACKGROUNDS.filter(([,src])=>!photoBoothRemoved.includes(src)).map(([label,src,thumb])=>({label,src,thumb,custom:false}));}
function savePhotoBooth(){const files=photoBoothItems.filter(i=>i.custom&&i.file).map(i=>({file:i.file,label:i.label}));store.put('photo-booth-backgrounds',files).catch(()=>{});store.put('photo-booth-removed',photoBoothRemoved).catch(()=>{});}
// 恢复本机保存的背景；打开后又马上关闭时直接丢弃，避免给已关闭的界面创建 blob URL。
async function restorePhotoBooth(run){
 const [saved,removed]=await Promise.all([store.get('photo-booth-backgrounds'),store.get('photo-booth-removed')]);
 if(run!==photoBoothRun||!boothOpen())return;
 const current=photoBoothItems[photoBoothIndex]?.src;
 photoBoothRemoved=Array.isArray(removed)?removed.filter(src=>PHOTO_BACKGROUNDS.some(([,s])=>s===src)):[];
 photoBoothItems=[...presetBackgrounds(),...photoBoothItems.filter(i=>i.custom)];
 if(Array.isArray(saved))for(const item of saved)if(item?.file?.size)photoBoothItems.push({label:item.label||'自定义背景',src:URL.createObjectURL(item.file),file:item.file,custom:true});
 photoBoothIndex=Math.max(0,photoBoothItems.findIndex(i=>i.src===current));renderPhotoBoothItems();
}
function stopPhotoBoothCarousel(){clearTimeout(photoBoothTimer);photoBoothPlaying=false;$('photo-booth-toggle').textContent='开始轮播';$('photo-booth-toggle').setAttribute('aria-pressed','false');}
function schedulePhotoBoothCarousel(){clearTimeout(photoBoothTimer);if(!photoBoothPlaying||photoBoothItems.length<2||!boothOpen()||document.hidden)return;photoBoothTimer=setTimeout(()=>{showPhotoBoothItem(photoBoothIndex+1);schedulePhotoBoothCarousel();},8000);}
// 打开拍照背景时，后面的场景全部停下：提示、自动表演、唱歌、倒数、跳舞、视频都不再出声。
function quietStage(){stopCeremony();clearHint();clearEffects();clearAmbient();cancelCountdown();clearFind();stopDance();stopSong();stopMic();stopRecord(true);voice.stop();clearTimeout(albumTimer);pauseVideo();}
function openPhotoBooth(){
 if(boothOpen())return;
 const run=++photoBoothRun;photoBoothPreviousMusic=wantsMusic;photoBoothMusicOn=sound;photoBoothFullscreen=false;
 $('photo-booth').hidden=false;document.body.classList.add('photo-booth-active');stage.classList.add('background-paused');quietStage();stopPhotoBoothCarousel();setPhotoBoothDrawer(false);showPhotoBoothPanel(true);updatePhotoBoothMusic();updatePhotoBoothFullscreen();
 photoBoothItems=presetBackgrounds();photoBoothIndex=0;renderPhotoBoothItems();syncMusic();restorePhotoBooth(run);
}
function closePhotoBooth(){
 if(!boothOpen())return;
 photoBoothRun++;stopPhotoBoothCarousel();photoBoothMusicOn=false;wantsMusic=photoBoothPreviousMusic;
 const leaveFullscreen=photoBoothFullscreen&&fullscreenElement();photoBoothFullscreen=false;
 $('photo-booth').hidden=true;document.body.classList.remove('photo-booth-active');stage.classList.toggle('background-paused',document.hidden);
 photoBoothItems.filter(i=>i.custom&&i.src.startsWith('blob:')).forEach(i=>URL.revokeObjectURL(i.src));photoBoothItems=[];$('photo-booth-presets').replaceChildren();
 setPhotoBoothDrawer(false);showPhotoBoothPanel(true);showControls(true);syncMusic();schedulePhoto();resumeVideo();armIdle();
 if(leaveFullscreen)exitFullscreen();
}
function updatePhotoBoothFullscreen(){const active=Boolean(fullscreenElement());$('photo-booth-fullscreen').textContent=active?'退出全屏':'全屏';$('photo-booth-fullscreen').setAttribute('aria-pressed',String(active));}
$('photo-booth-open').onclick=openPhotoBooth;
$('photo-booth-close').onclick=closePhotoBooth;
$('photo-booth-hide').onclick=()=>showPhotoBoothPanel(false);
$('photo-booth-prev').onclick=()=>{showPhotoBoothItem(photoBoothIndex-1);schedulePhotoBoothCarousel();};
$('photo-booth-next').onclick=()=>{showPhotoBoothItem(photoBoothIndex+1);schedulePhotoBoothCarousel();};
$('photo-booth-pick').onclick=()=>setPhotoBoothDrawer($('photo-booth-drawer').hidden);
$('photo-booth-music').onclick=async()=>{if(!sound&&!await enableSound(true))return;photoBoothMusicOn=!photoBoothMusicOn;updatePhotoBoothMusic();syncMusic();if(photoBoothMusicOn&&!musicURL&&!$('builtin-music').checked)tell('还没有背景音乐：请在设置里选择音乐，或勾选内置轻音乐。');};
$('photo-background-file').onchange=event=>{const files=[...event.target.files||[]].filter(f=>!f.type||f.type.startsWith('image/'));event.target.value='';if(!files.length)return;for(const file of files)photoBoothItems.push({label:file.name.replace(/\.[^.]+$/,'')||'自定义背景',src:URL.createObjectURL(file),file,custom:true});photoBoothIndex=photoBoothItems.length-files.length;renderPhotoBoothItems();savePhotoBooth();};
$('photo-booth-toggle').onclick=()=>{if(photoBoothPlaying){stopPhotoBoothCarousel();return;}photoBoothPlaying=true;$('photo-booth-toggle').textContent='暂停轮播';$('photo-booth-toggle').setAttribute('aria-pressed','true');schedulePhotoBoothCarousel();};
$('photo-booth-delete').onclick=()=>{if(photoBoothItems.length<2)return;const [removed]=photoBoothItems.splice(photoBoothIndex,1);if(removed.custom){if(removed.src.startsWith('blob:'))URL.revokeObjectURL(removed.src);}else photoBoothRemoved.push(removed.src);photoBoothIndex%=photoBoothItems.length;renderPhotoBoothItems();savePhotoBooth();schedulePhotoBoothCarousel();};
$('photo-booth-reset').onclick=()=>{const current=photoBoothItems[photoBoothIndex]?.src;photoBoothRemoved=[];photoBoothItems=[...presetBackgrounds(),...photoBoothItems.filter(i=>i.custom)];photoBoothIndex=Math.max(0,photoBoothItems.findIndex(i=>i.src===current));renderPhotoBoothItems();savePhotoBooth();};
// 整页全屏而不是只让拍照层全屏：这样提示条在全屏里也看得到。
$('photo-booth-fullscreen').onclick=async()=>{
 try{
  if(fullscreenElement()){photoBoothFullscreen=false;await exitFullscreen();return;}
  const el=document.documentElement,enter=el.requestFullscreen||el.webkitRequestFullscreen;
  if(!enter){tell(/iPhone|iPod/.test(navigator.userAgent||'')?'iPhone 不支持网页全屏：请在 Safari 点「分享 → 添加到主屏幕」，从桌面图标打开即可隐藏工具栏。':'此浏览器不支持网页全屏。请横屏、收起浏览器工具栏，再使用系统屏幕镜像。');requestAwake();return;}
  await enter.call(el);photoBoothFullscreen=true;requestAwake();
 }catch{tell('暂时无法进入全屏，请横屏并使用手机屏幕镜像。');}
 updatePhotoBoothFullscreen();
};
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
 for(let i=0;i<count;i++){const bit=document.createElement('i'),k=(i+burstSeed)%(BITS.length+1);if(k<BITS.length){bit.className='sprite';bit.style.setProperty('--img',`url("${DECO}${BITS[k]}.webp")`);}else bit.textContent='●';bit.style.setProperty('--a',`${i*360/count+Math.random()*18}deg`);bit.style.setProperty('--d',`${(big?11:6.5)+Math.random()*4}cqw`);bit.style.setProperty('--c',PALETTE[(i+burstSeed)%PALETTE.length]);box.append(bit);}
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

// 场景背景氛围：首页和蛋糕页有飘起的气球，一起玩有肥皂泡（都能戳破），相册有花瓣；首页还有小挖掘机来回巡逻。
function popAt(el,count=12,kind='pop'){suppressClick=performance.now()+450;const r=el.getBoundingClientRect(),s=stage.getBoundingClientRect();burst(r.left+r.width/2-s.left,r.top+r.height*(el.classList.contains('balloon')?.33:.45)-s.top,count);audio.effect(kind).catch(()=>{});el.remove();idleTouch();}
function spawnFloater(className,x,size,dur){
 const b=document.createElement('button');b.type='button';b.className=className;b.tabIndex=-1;b.setAttribute('aria-label',className==='soap'?'泡泡':'气球');
 const values={'--x':`${x}%`,'--img':`url("${DECO}balloon-${BALLOONS[Math.floor(Math.random()*BALLOONS.length)]}.webp")`,'--duration':`${dur}s`,'--sway':`${(Math.random()<.5?-1:1)*(2+Math.random()*4)}cqw`,'--size':`${size}cqw`};
 for(const [k,v]of Object.entries(values))b.style.setProperty(k,v);
 b.onpointerdown=event=>{event.preventDefault();popAt(b);};
 $('ambient').append(b);setTimeout(()=>b.remove(),dur*1000+300);
}
function spawnBalloon(){const side=mode==='cake'||Math.random()<.65,x=side?(Math.random()<.5?2+Math.random()*22:76+Math.random()*20):24+Math.random()*52;spawnFloater('balloon',x,6+Math.random()*3,10+Math.random()*5);}
function spawnSoap(){spawnFloater('soap',4+Math.random()*90,6+Math.random()*4,12+Math.random()*6);}
function spawnPetal(){
 const p=document.createElement('i'),dur=9+Math.random()*5,felt=Math.random()<.5;p.className=felt?'petal felt':'petal';
 // 毛毡星星/爱心只从两侧飘落，不挡照片中间。
 const x=felt?(Math.random()<.5?Math.random()*14:86+Math.random()*13):Math.random()*100;
 if(felt)p.style.setProperty('--img',`url("${DECO}${BITS[Math.floor(Math.random()*BITS.length)]}.webp")`);
 const values={'--x':`${x}%`,'--color':PALETTE[Math.floor(Math.random()*PALETTE.length)],'--duration':`${dur}s`,'--sway':`${(Math.random()-.5)*12}cqw`};
 for(const [k,v]of Object.entries(values))p.style.setProperty(k,v);
 $('ambient').append(p);setTimeout(()=>p.remove(),dur*1000+300);
}
function spawnPatrol(){
 const b=document.createElement('button'),img=document.createElement('img');b.type='button';b.className='patrol';b.tabIndex=-1;b.setAttribute('aria-label','小挖掘机按喇叭');
 img.src='assets/little-excavator.webp';img.alt='';b.append(img);
 b.onpointerdown=event=>{event.preventDefault();suppressClick=performance.now()+450;restart(b,'hop');const r=b.getBoundingClientRect(),s=stage.getBoundingClientRect();burst(r.left+r.width/2-s.left,r.top-s.top,10);say('嘟嘟！',r.left+r.width/2-s.left,r.top-s.top);audio.effect('honk').catch(()=>{});idleTouch();};
 $('ambient').append(b);setTimeout(()=>b.remove(),12300);if(!voice.busy?.())audio.effect('drive').catch(()=>{});
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
 else if(mode==='album'&&photos.length&&ambientCount%9===0&&!box.querySelector?.('.patrol'))spawnPatrol();
 else if(mode==='album'&&photos.length&&ambientCount%3===0&&count<12)spawnFloater('balloon',Math.random()<.5?1+Math.random()*10:88+Math.random()*10,5+Math.random()*2.5,11+Math.random()*4);
 else if(mode==='album'&&photos.length&&count<12)spawnPetal();
}
setInterval(ambientTick,2400);

// 角色台词：每次点击轮换；动物先叫一声（喔喔喔、吱吱吱、嗷呜、轰隆隆），再说话。
const lines={
 dragon:['嗷呜！齐齐，生日快乐！','我是齐齐，两岁啦！','嗷呜，齐齐来啦！','齐齐真棒，抱抱！'],
 mouse:['吱吱吱！齐齐，妈妈爱你！','吱吱，宝贝生日快乐！','妈妈抱抱齐齐！','吱吱吱，亲亲齐齐！'],
 rooster:['喔喔喔！齐齐，爸爸陪你玩！','喔喔喔，生日快乐！','爸爸给你举高高！','喔喔，齐齐真棒！'],
 excavator:['轰隆隆，嘟嘟嘟！','挖呀挖，挖呀挖！','嘟嘟，挖掘机来啦！'],
 two:['齐齐两岁啦！','一、二，两岁啦！']
};
const speakers={dragon:'齐齐说',mouse:'妈妈说',rooster:'爸爸说',excavator:'挖掘机说',two:'数字二说'};
const ANIMALS=new Set(['dragon','mouse','rooster','excavator']);
const lineIndex={};
function nextLine(kind){const list=lines[kind];const i=lineIndex[kind]||0;lineIndex[kind]=i+1;return list[i%list.length];}
// 有家人录音就直接放录音；否则动物先叫一声，叫完再用离线语音说话。
function speakFor(kind,text,always){
 audio.stopEffects();const run=++greetingRun,hasClip=voice.status().has(kind);
 const sfx=always||(ANIMALS.has(kind)&&!hasClip?kind:null);
 const played=sfx?audio.effect(sfx).catch(()=>0):null;
 const talk=()=>{if(run!==greetingRun||frozen())return;voice.speak(kind,text).then(spoken=>{if(!spoken&&!sfx&&run===greetingRun&&!frozen())audio.effect(kind).catch(()=>{});});};
 // 叫声快结束时再开口（真实打鸣约 2 秒，合成叫声至少等 0.75 秒）。
 if(sfx&&!hasClip)played.then(d=>setTimeout(talk,ANIMALS.has(sfx)?Math.max(750,(d||0)*1000-200):700));else talk();
}
// 宝宝连拍时每一下都有星星和动作，只有说话做节流，避免声音叠在一起。
function canTalk(){const now=performance.now();if(now-lastGreeting<450)return false;lastGreeting=now;return true;}
// 一起玩页使用独立角色立绘；首页和蛋糕页直接让背景原画回应。
const SPRITES={dragon:'assets/little-dragon.webp',mouse:'assets/little-mouse.webp',rooster:'assets/little-rooster.webp',excavator:'assets/little-excavator.webp'};
// 首页和蛋糕页的背景已经画好了家人，点击时让原画里的角色回应，避免再叠一只重复立绘。
function highlightHot(button){
 if(!button)return;
 restart(button,'reacting');
 setTimeout(()=>button.classList.remove('reacting'),950);
}
function hotRect(button){const s=stage.getBoundingClientRect(),r=button.getBoundingClientRect();return {x:r.left+r.width/2-s.left,y:r.top+r.height/2-s.top,bottom:r.top+r.height-s.top};}
function hotTap(kind,event,button){
 if(frozen())return;idleTouch();if(kind==='cake'){cakeTap();return;}
 const p=stagePoint(event.clientX,event.clientY);burst(p.x,p.y,10);
 if(button&&SPRITES[kind]){const r=hotRect(button);highlightHot(button);}
 if(kind==='excavator')restart(mode==='home'?$('home-art'):$('birthday-cake'),'rumble');
 if(singing||counting||ceremonyOn||!canTalk()){audio.effect('twinkle').catch(()=>{});return;}
 const text=nextLine(kind);say(text,p.x,p.y-(stage.clientHeight||900)*.12);
 speakFor(kind==='two'?'narrator':kind,text,kind==='two'?'found':null);
}
for(const id of ['home-hots','cake-hots'])$(id).onclick=event=>{const b=event.target.closest?.('[data-hot]');if(b)hotTap(b.dataset.hot,event,b);};

// 空闲提示：首页和蛋糕页过几秒，轮流在能点的地方闪光并出现小手，偶尔用语音邀请。
const HINTS={home:[['excavator','挖掘机在这里！'],['dragon','齐齐在这里！'],['rooster','爸爸在这里！'],['mouse','妈妈在这里！'],['two','看看数字二！']],cake:[['cake','点蛋糕，吹蜡烛吧！'],['dragon','齐齐在这里！'],['mouse','妈妈在这里！'],['rooster','爸爸在这里！']]};
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
function idleTouch(){if(showMode&&showUntil)showUntil=Math.max(showUntil,performance.now()+15000);if(mode==='game'){if(!findTarget&&!peeking)armIdle();}else armIdle();}
function armIdle(){
 clearHint();
 if(frozen()||boothOpen())return;
 if(showMode){armShow();return;}
 if(mode in HINTS)hintTimers.push(setTimeout(showHint,6000));
 else if(mode==='game'&&!danceOn)armFind();
}

// 派对展示：自动轮播「挖掘机乐园 → 成长相册（放完一轮）→ 一起玩 → 生日蛋糕」，角色每隔几秒自己出来表演，
// 不再反复喊宝宝来点；宝宝点了照样有反应，点得多时会多停留一会儿。生日仪式由家长按一次按钮开始。
const SHOW_ORDER=['home','album','game','cake'],SHOW_TIME={home:45000,game:36000,cake:30000},PERFORM_GAP=8000;
const PERFORM={home:['dragon','rooster','mouse','excavator','two'],cake:['dragon','mouse','rooster','cake']};
// 每个场景有固定的结束时间（showUntil）：跳舞、躲猫猫结束后重排定时器不会把它往后推；宝宝点画面时最多延长到“点完后 15 秒”。
function sceneLength(){if(mode!=='album')return SHOW_TIME[mode]||40000;if(!photos.length)return 800;const each=Number($('duration').value)*1000;return Math.min(photos.reduce((t,p)=>t+(p.video?90000:each),0)+4000,300000);}
function armShow(){
 if(ceremonyOn)return;const now=performance.now();if(!showUntil)showUntil=now+sceneLength();
 hintTimers.push(setTimeout(showPerform,mode==='game'&&!performCount?1200:5000));
 hintTimers.push(setTimeout(nextShow,Math.max(showUntil-now,1500)));
}
function showPerform(){perform();hintTimers.push(setTimeout(showPerform,PERFORM_GAP));}
function hotButton(kind){return Array.from($(mode==='home'?'home-hots':'cake-hots').children||[]).find(b=>b.dataset.hot===kind);}
function perform(){
 if(!showMode||frozen()||singing||counting||ceremonyOn||danceOn||peeking)return;
 const n=performCount++,talk=n%2===1;
 if(mode==='game'){
  if(n%5===0){startDance();return;}
  if(n%5===3){peekaboo();return;}
  greetFriend(friendButtons[(n+1)%friendButtons.length],{auto:true,talk});return;
 }
 if(!(mode in PERFORM))return;
 const list=PERFORM[mode].filter(k=>!(k==='cake'&&blown)),kind=list[n%list.length],button=hotButton(kind);if(!button)return;
 const r=hotRect(button);burst(r.x,r.y,12,true);
 if(kind==='cake'){const p=stagePoint();burst(p.x,p.y*.5,14,true);audio.effect('twinkle').catch(()=>{});return;}
 highlightHot(button);if(kind==='excavator')restart(mode==='home'?$('home-art'):$('birthday-cake'),'rumble');
 if(talk){const text=nextLine(kind);say(text,r.x,r.y-(stage.clientHeight||900)*.12);speakFor(kind==='two'?'narrator':kind,text,kind==='two'?'found':null);}
 else audio.effect(kind==='two'?'found':'twinkle').catch(()=>{});
}
function goShow(next){
 performCount=0;showUntil=0;
 if(next==='album'){photoIndex=0;albumPlaying=true;}
 if(next==='cake'&&blown){blown=false;updateCake();}
 selectScene(next);
}
function nextShow(){
 if(!showMode||ceremonyOn||frozen())return;let i=SHOW_ORDER.indexOf(mode);
 for(let k=0;k<SHOW_ORDER.length;k++){i=(i+1)%SHOW_ORDER.length;const next=SHOW_ORDER[i];if(next==='album'&&!photos.length)continue;if(next!==mode){goShow(next);return;}}
 armIdle();
}
function stopCeremony(){ceremonyOn=false;clearTimeout(ceremonyTimer);clearTimeout(ceremonyWatch);}
// 生日仪式：一起唱生日歌 → 许愿 → 3·2·1 人声倒数 → 吹灭、撒花、欢呼鼓掌 → 回到轮播。
function startCeremony(){
 if(mode!=='cake')selectScene('cake');stopCeremony();clearHint();cancelCountdown();stopSong();
 if(blown){blown=false;updateCake();restart($('birthday-cake'),'relit');}

 ceremonyOn=true;showUntil=0;ceremonyWatch=setTimeout(()=>{if(ceremonyOn){stopCeremony();armIdle();}},150000);
 setLyric('大家一起唱生日歌吧！');speakFor('narrator','大家一起唱生日歌吧！','twinkle');
 ceremonyTimer=setTimeout(()=>{if(ceremonyOn&&mode==='cake'&&!frozen()&&!counting&&!blown&&!singing)sing();},3200);
}
function tryFullscreen(){try{const el=document.documentElement,enter=el.requestFullscreen||el.webkitRequestFullscreen;if(enter&&!fullscreenElement())Promise.resolve(enter.call(el)).catch(()=>{});}catch{}}
async function startShow(ceremony=false){
 tryFullscreen();
 if(photoMode){photoMode=false;paused=pausedBeforePhoto;}paused=false;
 enterKid();showMode=true;document.body.classList.add('show');$('kid-nav').hidden=true;audio.setLoopLevel?.(.5);performCount=0;showUntil=0;
 const on=enableSound(true);
 if(ceremony)startCeremony();else if(mode!=='home')goShow('home');
 syncPause();
 if(await on&&showMode&&!ceremony&&!frozen())voice.speak('narrator','派对开始啦！');
}
$('show-play').onclick=()=>startShow(false);
$('ceremony').onclick=()=>startShow(true);

function stopSong(){voice.stop();greetingRun++;songRun++;songTimers.forEach(clearTimeout);songTimers=[];singing=false;$('scene-cake').classList.remove('dancing');audio.stopSong();$('sing').textContent='♫ 一起唱生日歌';if(mode==='cake')setLyric(blown?'齐齐，生日快乐！':'许个愿吧');syncMusic();}
function updateSound(){ $('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));$('bgm').muted=!sound;$('photo-video').muted=!sound;voice.setEnabled(sound); }
async function enableSound(value){const run=++soundRun;sound=value;updateSound();try{await audio.setEnabled(value);}catch{if(run!==soundRun)return sound;sound=false;updateSound();tell('此浏览器暂时无法播放声音，仍可继续玩。');}if(run!==soundRun)return sound;if(!sound){stopSong();wantsMusic=false;musicRun++;$('bgm').pause();updateMusic();}return sound;}
$('sound').onclick=async()=>{await enableSound(!sound);syncMusic();};
function updateMusic(){ $('music-toggle').textContent=$('bgm').paused?'播放音乐':'暂停音乐';$('music-toggle').disabled=!musicURL;$('clear-music').disabled=!musicURL; }
function updatePhotoBoothMusic(){$('photo-booth-music').textContent=`音乐：${photoBoothMusicOn?'开':'关'}`;$('photo-booth-music').setAttribute('aria-pressed',String(photoBoothMusicOn));}
function syncMusic(){
 const bgm=$('bgm'),run=++musicRun;
 const video=Boolean(photos[photoIndex]?.video);
 // 拍照背景打开时，只听它自己的「背景音乐」开关，后面场景的音乐一律不响，也不受场景暂停影响。
 const booth=boothOpen(),quiet=booth?document.hidden||!sound:singing||counting||frozen()||!sound,builtin=!musicURL&&$('builtin-music').checked;
 const showLoop=showMode&&builtin&&!(mode==='album'&&video);
 const loop=!quiet&&(booth?photoBoothMusicOn&&builtin:(showLoop||(builtin&&mode==='album'&&photos.length>0&&albumPlaying&&!importing&&!video)||(danceOn&&mode==='game')));
 if(loop)audio.startLoop().catch(()=>{});else audio.stopLoop();
 const music=()=>sound&&!quiet&&(booth?Boolean(photoBoothMusicOn&&musicURL):Boolean((wantsMusic||showMode&&musicURL)&&(mode==='album'||showMode)&&!video));
 if(music()){bgm.play().then(()=>{if(run!==musicRun)return;if(!music())bgm.pause();updateMusic();}).catch(()=>{if(run!==musicRun)return;wantsMusic=false;updateMusic();tell('音乐暂时无法播放，请点“播放音乐”重试或换一个音频文件。');});}else{bgm.pause();updateMusic();}
}
function schedulePhoto(){clearTimeout(albumTimer);if(mode==='album'&&albumPlaying&&!importing&&!frozen()&&!boothOpen()&&photos.length>1&&!photos[photoIndex]?.video){albumTimer=setTimeout(()=>{if(showMode&&photoIndex===photos.length-1){nextShow();return;}photoIndex=(photoIndex+1)%photos.length;renderPhoto();},Number($('duration').value)*1000);}}
function syncPause(){stage.classList.toggle('paused',paused||photoMode);$('pause').textContent=paused?'继续动画':'暂停动画';$('pause').setAttribute('aria-pressed',String(paused));$('photo').textContent=photoMode?'退出合影':'合影模式';$('photo').setAttribute('aria-pressed',String(photoMode));document.body.classList.toggle('clean',controls.hidden||photoMode);if(frozen()){stopCeremony();clearEffects();clearAmbient();cancelCountdown();clearFind();clearHint();stopDance();stopSong();stopMic();pauseVideo();audio.suspend().catch(()=>{});}else{armIdle();resumeVideo();}schedulePhoto();syncMusic();}
$('pause').onclick=()=>{if(photoMode){photoMode=false;paused=false;}else paused=!paused;syncPause();};
$('photo').onclick=()=>{if(photoMode){photoMode=false;paused=pausedBeforePhoto;}else{pausedBeforePhoto=paused;photoMode=true;}syncPause();if(photoMode)showControls(false);};
$('hide').onclick=()=>showControls(false);
function updateMotion(){document.body.classList.toggle('calm',calm);$('motion').textContent=calm?'动效：安静':'动效：热闹';$('motion').setAttribute('aria-pressed',String(calm));}
$('motion').onclick=()=>{calm=!calm;updateMotion();clearEffects();clearAmbient();};
$('motion-note').hidden=!reduced.matches;

// 亲子模式：自动开声音与常亮；底部大图标可换场景，长按右下角恢复家长操作。
function exitChildMode(){
 const wasChild=childMode,wasShow=showMode;clearTimeout(parentTimer);childMode=false;showMode=false;stopCeremony();
 if(wasChild&&window.history?.state?.kidGuard)window.history.back();
 document.body.classList.remove('kid');document.body.classList.remove('show');audio.setLoopLevel?.(.75);
 $('parent-exit').hidden=true;$('kid-nav').hidden=true;$('parent-exit').classList.remove('holding');showControls(true);
 if(wasShow){armIdle();syncMusic();}
}
function enterKid(){if(!childMode)window.history?.pushState?.({kidGuard:true},'');childMode=true;document.body.classList.add('kid');$('parent-exit').hidden=false;showControls(false);requestAwake();}
$('child-play').onclick=async()=>{if(showMode){showMode=false;stopCeremony();document.body.classList.remove('show');audio.setLoopLevel?.(.75);}selectScene('game');if(photoMode){photoMode=false;paused=pausedBeforePhoto;}paused=false;syncPause();enterKid();$('kid-nav').hidden=false;await enableSound(true);};
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
 if(t.closest('#photo-booth-surface')){if(photoBoothPanelHidden)showPhotoBoothPanel(true);return;}
 if(boothOpen())return;
 if(t.closest('#photo-frame'))photoTap(e);
 else if(t.closest('#stage')){sparkle(e);idleTouch();}
 if(!childMode&&controls.hidden&&!photoBoothPanelHidden)showControls(true);
});

// H / Esc 叫回菜单（轻点画面也会叫回，见上面的点击处理）。
function restoreMenus(){if(photoBoothPanelHidden)showPhotoBoothPanel(true);if(!childMode&&controls.hidden&&!boothOpen())showControls(true);}

// 场景切换：小挖掘机开过画面，把新场景“推”进来。
function selectScene(next){
 if(!modes.includes(next)||next===mode)return;
 const previous=mode;stopCeremony();stopSong();stopMic();cancelCountdown();clearFind();clearHint();stopDance();pauseVideo();clearEffects();clearAmbient();clearTimeout(albumTimer);mode=next;
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
 stage.setAttribute('aria-label',({home:'齐齐的挖掘机乐园',album:'齐齐的成长相册',cake:'齐齐的生日蛋糕',game:'和爸爸妈妈一起玩'})[mode]);
 if(mode==='album')renderPhoto();if(mode==='cake')updateCake();armIdle();syncMusic();
}
document.querySelectorAll('[data-scene]').forEach(el=>el.onclick=()=>selectScene(el.dataset.scene));

// 本机保存：照片、小视频、家人录音和背景音乐存进这台设备浏览器的 IndexedDB，不上传；
// 刷新或手机投屏时页面被系统重新加载，也能自动恢复。没有 IndexedDB（或隐私模式拒绝）时安静地退回为只在本页使用。
const store=(()=>{
 let ready;
 const open=()=>ready||(ready=new Promise((ok,no)=>{try{if(!window.indexedDB)throw Error('none');const req=window.indexedDB.open('qiqi-party',1);req.onupgradeneeded=()=>req.result.createObjectStore('kv');req.onsuccess=()=>ok(req.result);req.onerror=()=>no(req.error);}catch(e){no(e);}}));
 const tx=(kind,fn)=>open().then(db=>new Promise((ok,no)=>{const t=db.transaction('kv',kind),req=fn(t.objectStore('kv'));t.oncomplete=()=>ok(req.result);t.onerror=t.onabort=()=>no(t.error);}));
 return {get:key=>tx('readonly',st=>st.get(key)).catch(()=>undefined),put:(key,value)=>{try{navigator.storage?.persist?.()?.catch?.(()=>{});}catch{}return tx('readwrite',st=>st.put(value,key));},drop:key=>tx('readwrite',st=>st.delete(key)).catch(()=>{})};
})();
let savedClips={};
function savePhotos(){const items=photos.map(p=>({blob:p.file,cap:p.cap,video:Boolean(p.video)}));if(!items.length||!items.every(i=>i.blob))return;store.put('photos',items).catch(()=>tell('照片没能保存到本机（可能空间不足），刷新后需要重新选择。'));}
function rememberClip(kind,blob,append){savedClips[kind]=append&&kind!=='song'?[...(savedClips[kind]||[]),blob].slice(-4):[blob];store.put('clips',{...savedClips}).catch(()=>{});}
async function restoreSaved(){
 let restored=0;
 const items=await store.get('photos');
 if(Array.isArray(items)&&!photos.length&&!importing){const ok=items.filter(i=>i?.blob?.size);if(ok.length){photos=ok.map(i=>({url:URL.createObjectURL(i.blob),cap:i.cap||'',video:Boolean(i.video),file:i.blob}));photoIndex=0;albumPlaying=true;restored+=ok.length;updateAlbum();if(mode==='album')renderPhoto();syncMusic();}}
 const clips=await store.get('clips');
 if(clips&&typeof clips==='object'&&!voice.status().count)for(const [kind,list] of Object.entries(clips))if(Array.isArray(list)){const good=list.filter(b=>b?.size);good.forEach(b=>voice.addClip(kind,b));if(good.length){savedClips[kind]=good;restored+=good.length;}}
 const music=await store.get('music');
 if(music?.size&&!musicURL){musicURL=URL.createObjectURL(music);$('bgm').src=musicURL;$('bgm').volume=.7;updateMusic();restored++;}
 if(restored)tell('已恢复上次保存在这台手机里的照片和录音。');
}

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
  try{if(isVideo){await probeVideo(url);loaded.push({url,cap:captionOf(file.name),video:true,file});}else{const img=await decode(url);if(img.naturalWidth*img.naturalHeight>50000000)throw Error('large');loaded.push({url,cap:captionOf(file.name),file});}bytes+=file.size;}catch{URL.revokeObjectURL(url);skipped++;}
 }
 if(run!==importRun){loaded.forEach(p=>URL.revokeObjectURL(p.url));return;}
 finishImport();
 if(!loaded.length){albumPlaying=importResume;updateAlbum();schedulePhoto();syncMusic();tell('这些照片或视频暂时无法显示，原相册已保留。请换成 JPG、PNG 或 MP4 后重试。');return;}
 photoRun++;const previous=photos;photos=loaded;photoIndex=0;albumPlaying=true;await renderPhoto();syncMusic();
 previous.forEach(p=>URL.revokeObjectURL(p.url));
 if(run===importRun)tell(`已准备 ${photos.length} 个照片/视频，保存在这台手机里（不上传），刷新也不会丢。${skipped?'无法显示、动态或超限文件已跳过。':''}`);
 savePhotos();
}
function updateAlbum(){const has=photos.length>0;$('scene-album').classList.toggle('has-photos',has);$('album-empty').hidden=has;$('photo-frame').hidden=!has;$('album-count').hidden=!has;$('album-progress').hidden=!has;for(const id of ['album-toggle','clear-photos'])$(id).disabled=!has;for(const id of ['previous','next'])$(id).disabled=photos.length<2;$('album-toggle').textContent=albumPlaying?'暂停相册':'播放相册';$('album-count').textContent=`${photoIndex+1} / ${photos.length}`;$('album-progress').firstElementChild.style.width=has?`${(photoIndex+1)/photos.length*100}%`:'0%';}
const IMAGE_RE=/\.(jpe?g|png|webp|avif|bmp|heic|heif)$/i,VIDEO_RE=/\.(mp4|mov|m4v|webm)$/i;
// 相册运镜：照片在相框里慢慢推拉平移（每张换一种方向）；入场四种轮换；上一张被甩出画面；每 5 张一次小庆祝。
const CAMERA=[['scale(1) translate(0,0)','scale(1.14) translate(-3%,-2%)'],['scale(1.14) translate(3%,2%)','scale(1.02) translate(0,0)'],['scale(1.1) translate(-3.5%,0)','scale(1.1) translate(3.5%,0)'],['scale(1.12) translate(0,3%)','scale(1.12) translate(0,-2.5%)'],['scale(1.02) translate(2%,-2%)','scale(1.15) translate(-2%,1.5%)']];
const ENTRANCES=['enter-toss','enter-swing','enter-pop','enter-flip'],EXITS=['exit-toss','exit-shrink'];
function ghostCard(card){
 // 复制当前照片做离场动画：被甩出去或缩小飘走，新照片同时进场。
 if(calm||frozen()||card.hidden||!card.cloneNode||!$('photo-img').getAttribute?.('src'))return;
 const ghost=card.cloneNode(true);ghost.removeAttribute('id');ghost.querySelectorAll?.('[id]').forEach(el=>el.removeAttribute('id'));
 Object.assign(ghost.style,{position:'absolute',left:`${card.offsetLeft}px`,top:`${card.offsetTop}px`,width:`${card.offsetWidth}px`,height:`${card.offsetHeight}px`,margin:'0'});
 const gi=ghost.querySelector?.('img');if(gi){gi.classList.remove('kb');gi.style.transform=gi.style.getPropertyValue('--kb1');}
 ghost.className=`photo-card photo-ghost ${EXITS[photoIndex%EXITS.length]}`;ghost.setAttribute('aria-hidden','true');
 $('photo-frame').append(ghost);setTimeout(()=>ghost.remove(),1000);
}
function albumParty(){
 // 每 5 张：爸爸和挖掘机从底下探头，相框四周爆出毛毡星星和爱心，配一声欢呼。
 if(calm||frozen())return;const card=$('photo-card'),s=stage.getBoundingClientRect(),r=card.getBoundingClientRect();
 for(const [fx,fy] of [[0,0],[1,0],[0,1],[1,1]])burst(r.left-s.left+r.width*fx,r.top-s.top+r.height*fy,10,true);
 for(const id of ['peek-rooster','peek-excavator']){const el=$(id);restart(el,'up');setTimeout(()=>el.classList.remove('up'),3200);}
 audio.effect('found').catch(()=>{});
}
async function renderPhoto(){
 clearTimeout(albumTimer);updateAlbum();if(!photos.length)return;const run=++photoRun,p=photos[photoIndex];
 try{
  if(p.video){showVideo(p,run);return;}
  await decode(p.url);if(run!==photoRun)return;const img=$('photo-img'),card=$('photo-card'),cap=$('photo-caption');stopVideo();
  const live=!calm&&!frozen();if(live)ghostCard(card);
  card.hidden=false;img.hidden=false;
  for(const name of [...ENTRANCES,'kb'])card.classList.remove(name);img.classList.remove('kb');cap.classList.remove('stamp');
  img.src=p.url;img.alt=p.cap||`齐齐的成长照片，第 ${photoIndex+1} 张`;
  const [from,to]=CAMERA[photoIndex%CAMERA.length];img.style.setProperty('--kb0',from);img.style.setProperty('--kb1',to);img.style.setProperty('--dur',`${Number($('duration').value)+1.5}s`);
  card.style.setProperty('--tilt',['-1.5deg','1deg','-.6deg','1.4deg'][photoIndex%4]);card.style.setProperty('--side',photoIndex%2?'1':'-1');
  if(live)document.querySelectorAll('.album-sticker').forEach((el,i)=>{if((photoIndex+i)%2===0){restart(el,'cheer');setTimeout(()=>el.classList.remove('cheer'),1000);}});
  $('album-bg').style.setProperty('--photo',`url("${p.url}")`);
  cap.textContent=$('captions').checked?p.cap:'';
  if(live){void card.offsetWidth;card.classList.add(ENTRANCES[photoIndex%ENTRANCES.length]);img.classList.add('kb');cap.classList.add('stamp');if(photoIndex%5===4)setTimeout(()=>{if(mode==='album'&&photos[photoIndex]===p)albumParty();},1100);}
  if(photoIndex%2===0&&mode==='album'&&!frozen())voice.speak('narrator',ALBUM_LINES[(photoIndex/2)%ALBUM_LINES.length]);
  schedulePhoto();
 }catch{if(run!==photoRun)return;albumPlaying=false;updateAlbum();tell('这张照片加载失败，可以切到下一张或重新选择照片。');}
}
// 视频：读出元数据即可加入；播完自动下一张，单个视频时循环播放；有声音时带原声。
function probeVideo(url){return new Promise((resolve,reject)=>{const v=document.createElement('video');const timer=setTimeout(()=>{v.removeAttribute('src');reject(Error('timeout'));},15000);v.preload='metadata';v.muted=true;v.onloadedmetadata=()=>{clearTimeout(timer);v.removeAttribute('src');v.load?.();resolve();};v.onerror=()=>{clearTimeout(timer);reject(Error('video'));};v.src=url;});}
function stopVideo(){const v=$('photo-video');v.onended=null;v.pause?.();v.removeAttribute('src');v.load?.();v.hidden=true;}
function pauseVideo(){$('photo-video').pause?.();}
function resumeVideo(){const v=$('photo-video');if(mode==='album'&&!v.hidden&&v.paused&&!frozen()&&!boothOpen())v.play?.().catch(()=>{});}
function showVideo(p,run){
 const v=$('photo-video'),img=$('photo-img');img.hidden=true;$('photo-card').hidden=true;img.classList.remove('kb');
 v.onloadedmetadata=()=>{const ar=v.videoWidth/v.videoHeight||16/9;v.style.width=`min(70cqw,${(42*ar).toFixed(1)}cqw)`;};
 v.hidden=false;v.src=p.url;v.muted=!sound;v.volume=1;v.loop=photos.length<2;
 v.onended=()=>{if(run!==photoRun)return;if(showMode&&photoIndex===photos.length-1){nextShow();return;}if(albumPlaying&&photos.length>1){photoIndex=(photoIndex+1)%photos.length;renderPhoto();}};
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
$('clear-photos').onclick=()=>{store.drop('photos');importRun++;finishImport();importResume=false;photoRun++;clearTimeout(albumTimer);photos.forEach(p=>URL.revokeObjectURL(p.url));photos=[];photoIndex=0;albumPlaying=false;stopVideo();$('photo-img').removeAttribute('src');$('photo-card').hidden=true;$('album-bg').style.setProperty('--photo','none');clearAmbient();updateAlbum();syncMusic();};
$('clear-music').onclick=()=>{store.drop('music');musicRun++;wantsMusic=false;$('bgm').pause();$('bgm').removeAttribute('src');$('bgm').load?.();if(musicURL)URL.revokeObjectURL(musicURL);musicURL='';updateMusic();syncMusic();};
$('pick-music').onclick=()=>$('music-file').click();$('music-file').onchange=e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>100*1024*1024){tell('请选择小于 100 MB 的音乐文件。');return;}$('bgm').pause();if(musicURL)URL.revokeObjectURL(musicURL);musicURL=URL.createObjectURL(file);$('bgm').src=musicURL;$('bgm').volume=.7;wantsMusic=false;audio.stopLoop();updateMusic();store.put('music',file).catch(()=>{});tell('音乐已选择，点“播放音乐”开始；派对展示时会全程播放。');};
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
function finishSong(run){if(run!==songRun)return;stopSong();setLyric(blown?'齐齐，生日快乐！':'许个愿，吹蜡烛吧！');if(blown)return;voice.speak('narrator','许个愿，吹蜡烛吧！');if(ceremonyOn){clearTimeout(ceremonyTimer);ceremonyTimer=setTimeout(()=>{if(ceremonyOn&&mode==='cake'&&!frozen())startCountdown();},3400);}}
async function sing(){
 if(singing){stopSong();return;}if(frozen()){tell('先退出合影或继续动画，再一起唱歌吧。');return;}
 cancelCountdown();stopMic();const run=++songRun;singing=true;$('sing').textContent='停止生日歌';syncMusic();
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
// 倒数用旁白喊出来（宝宝不认字，光看数字不够热闹）。
const COUNTDOWN=['三！','二！','一！','呼——吹蜡烛！'];
const COUNT_STEP=1000;
function cancelCountdown(){countdownTimers.forEach(clearTimeout);countdownTimers=[];counting=false;$('countdown').textContent='';$('countdown').classList.remove('show');}
function startCountdown(){
 if(mode!=='cake'||blown||counting)return;if(frozen()){tell('请先退出合影或继续动画。');return;}
 stopSong();stopMic();counting=true;syncMusic();clearHint();const steps=['3','2','1','呼～'];
 steps.forEach((s,i)=>countdownTimers.push(setTimeout(()=>{$('countdown').textContent=s;restart($('countdown'),'show');audio.effect(i<3?'beep':'puff').catch(()=>{});voice.speak('narrator',COUNTDOWN[i]);},i*COUNT_STEP)));
 countdownTimers.push(setTimeout(()=>{cancelCountdown();blow();},steps.length*COUNT_STEP-150));
}
function blow(){
 if(mode!=='cake'||blown)return;cancelCountdown();stopSong();stopMic();blown=true;updateCake();
 const cake=$('birthday-cake');cake.classList.remove('relit');restart(cake,'just-out');clearTimeout(cheerTimer);cheerTimer=setTimeout(()=>cake.classList.remove('just-out'),3400);
 celebrate();finale();audio.effect('applause').catch(()=>{});countdownTimers.push(setTimeout(()=>{if(!frozen()&&blown)voice.speak('narrator','哇！齐齐，生日快乐！');},1000));if(!childMode)showControls(false);
 if(ceremonyOn)stopCeremony();syncMusic();armIdle();
}
// 吹灭后的结尾：四个角色从底下一个个跳出来跟着节拍跳舞，中间升起金色毛毡大“2”；随彩纸一起约 8 秒后收起。
const FINALE=[['mouse',11],['rooster',28],['dragon',72],['excavator',89]];
function finale(){
 if(frozen()||calm)return;const box=$('finale');box.replaceChildren();
 const two=document.createElement('img');two.className='finale-two';two.src=`${DECO}number-2.webp`;two.alt='';box.append(two);
 FINALE.forEach(([kind,x],i)=>{const img=document.createElement('img');img.className=`finale-friend${kind==='excavator'?' wide':''}`;img.src=SPRITES[kind];img.alt='';img.style.setProperty('--x',`${x}%`);img.style.setProperty('--i',String(i));box.append(img);});
}
function relight(){stopSong();stopMic();cancelCountdown();blown=false;clearEffects();updateCake();restart($('birthday-cake'),'relit');}
function cakeTap(){
 if(counting)return;
 if(blown){relight();const p=stagePoint();burst(p.x,p.y*.7,10);say('蜡烛又亮啦，再吹一次！',p.x,p.y*.55);speakFor('narrator','蜡烛又亮啦，再吹一次！','twinkle');}
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
function updateVoices(){const state=voice.status();$('clear-voices').disabled=!state.count;for(const [id,kind,label] of [['pick-mom','mouse','妈妈录音'],['pick-dad','rooster','爸爸录音'],['pick-child','dragon','齐齐录音'],['pick-song','song','生日歌录音']])$(id).textContent=state.has(kind)?`更换${label}`:`选择${label}`;$('voice-status').textContent=state.count?`已准备 ${state.count} 段家人录音 · 只在本页使用`:state.voiced?'角色已配好童声配音，也可以录下家人的声音替换。':state.local?'可使用设备离线中文声音，也可以选择家人录音。':'设备暂无离线中文声音；可以选择家人录音，或使用轻柔音效。';}
voice.init($('voice-audio'),tell,()=>{updateVoices();try{recLabels();}catch{}});
// 角色说话时把背景音乐压低，说完再恢复。
voice.onSpeaking?.(on=>{audio.duck?.(on);$('bgm').volume=on?.25:.7;});
$('spoken').onchange=()=>voice.setSpoken($('spoken').checked);
let voiceTarget='mouse';
for(const [id,kind] of [['pick-mom','mouse'],['pick-dad','rooster'],['pick-child','dragon'],['pick-song','song']])$(id).onclick=()=>{voiceTarget=kind;$('voice-file').click();};
$('voice-file').onchange=event=>{const file=event.target.files[0];event.target.value='';if(file&&voice.setClip(voiceTarget,file)){rememberClip(voiceTarget,file,false);tell(voiceTarget==='song'?'生日歌录音已准备，点“一起唱生日歌”就会播放。':'录音已准备。开启声音后，点对应角色即可听到；每次最多播放 12 秒。');}};
$('clear-voices').onclick=()=>{voice.clearClips();savedClips={};store.drop('clips');};

// 一起玩：无分数、无失败。每一下都有动作和星星；挖掘机会开走再开回来；空闲时轮流玩“找一找”和“躲猫猫”；♫ 按钮开跳舞派对。
const friendButtons=[...document.querySelectorAll('[data-friend]')];
const friendOf=kind=>friendButtons.find(b=>b.dataset.friend===kind);
const greetStyles=['greet-jump','greet-spin','greet-wiggle'];
const FIND={mouse:['齐齐，妈妈在哪里呀？','找到妈妈啦！真棒！'],rooster:['齐齐，爸爸在哪里呀？','找到爸爸啦！真棒！'],excavator:['挖掘机在哪里呀？','找到挖掘机啦！嘟嘟！'],dragon:['齐齐在哪里呀？','找到齐齐啦！']};
function helloDefault(){return findTarget?FIND[findTarget][0]:'点一个家人';}
function friendCenter(button){const s=stage.getBoundingClientRect(),r=button.getBoundingClientRect();return {x:r.left+r.width/2-s.left,y:r.top+r.height*.25-s.top};}
function clearFind(){findTimers.forEach(clearTimeout);findTimers=[];if(findTarget)friendOf(findTarget)?.classList.remove('hint');findTarget=null;peeking=false;friendButtons.forEach(b=>{b.classList.remove('hiding');b.classList.remove('peek');});}
function armFind(){clearFind();if(mode!=='game'||frozen()||danceOn||showMode)return;findTimers.push(setTimeout(()=>idleRound++%2===0?askFind():peekaboo(),FIND_IDLE));}
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
 findTimers.push(setTimeout(()=>{peeking=false;$('hello').textContent='哇！大家都出来啦！';speakFor('narrator','哇！大家都出来啦！','found');helloTimer=setTimeout(()=>$('hello').textContent=helloDefault(),4000);armIdle();},3000+friendButtons.length*650+400));
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
// 角色打招呼：宝宝点击，或派对展示时自动表演（auto 时不打断“找一找”，talk=false 只做动作不说话）。
function greetFriend(button,{auto=false,talk=true}={}){
 const kind=button.dataset.friend;
 if(!auto&&peeking&&button.classList.contains('hiding')){reveal(button,true);return;}
 const found=!auto&&findTarget===kind;animateFriend(button,kind);
 const c=friendCenter(button);burst(c.x,c.y,found?16:10,found||auto);
 if(auto&&!talk){audio.effect('twinkle').catch(()=>{});return;}
 if(found)lastGreeting=performance.now();else if(!canTalk()){audio.effect('twinkle').catch(()=>{});return;}
 const text=found?FIND[kind][1]:nextLine(kind);
 $('hello').textContent=found?text:`${speakers[kind]}：${text}`;
 if(found){clearFind();speakFor('narrator',text,'found');armFind();}
 else{speakFor(kind,text);if(!auto&&!findTarget&&!peeking)armFind();}
 clearTimeout(helloTimer);helloTimer=setTimeout(()=>$('hello').textContent=helloDefault(),4500);
}
friendButtons.forEach(button=>button.onclick=()=>{if(frozen())return;greetFriend(button);if(showMode)idleTouch();});
function stopDance(){danceTimers.forEach(clearTimeout);danceTimers=[];if(!danceOn)return;danceOn=false;$('scene-game').classList.remove('dancing');$('dance-btn').classList.remove('on');syncMusic();}
async function startDance(){
 if(danceOn){stopDance();armIdle();return;}if(frozen()||mode!=='game')return;
 clearFind();danceOn=true;$('scene-game').classList.add('dancing');$('dance-btn').classList.add('on');clearTimeout(helloTimer);$('hello').textContent='跳舞啦！一起扭一扭！';
 danceTimers.push(setInterval(()=>{if(!frozen())spawnNote();},540));
 danceTimers.push(setTimeout(()=>{stopDance();$('hello').textContent='跳得真棒！';celebrate();voice.speak('narrator','跳得真棒！');helloTimer=setTimeout(()=>$('hello').textContent=helloDefault(),4500);armIdle();},16000));
 if(await enableSound(true)&&danceOn){syncMusic();voice.speak('narrator','跳舞啦！一起扭一扭！');}
}
$('dance-btn').onclick=startDance;

// 页面内录音：点一下开始、再点结束；录好立即回放。不上传，刷新后需重录。
const REC={mouse:['rec-mom','录妈妈'],rooster:['rec-dad','录爸爸'],dragon:['rec-child','录齐齐'],song:['rec-song','录全家唱生日歌']};
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
  r.onstop=async()=>{const blob=new Blob(chunks,{type:r.mimeType||'audio/webm'});if(!blob.size){tell('没有录到声音，请再试一次。');return;}voice.addClip(kind,blob);rememberClip(kind,blob,true);recLabels();tell(kind==='song'?'录好了！正在回放；点“一起唱生日歌”就会播放这段。':'录好了！正在回放；点对应角色就能听到，多录几段会轮流播放。');if(await enableSound(true))voice.speak(kind,'');};
  r.start();$(REC[kind][0]).textContent='■ 正在录音，点我结束';$(REC[kind][0]).setAttribute('aria-pressed','true');
  recTimer=setTimeout(()=>stopRecord(true),kind==='song'?90000:10000);
 }catch{stopRecord(false);tell('无法录音：请允许麦克风权限，并用 HTTPS 或局域网地址打开页面。');}
}
for(const kind of Object.keys(REC))$(REC[kind][0]).onclick=()=>toggleRecord(kind);
recLabels();


// 展示工具：全屏、屏幕常亮均有失败回退；进入全屏或亲子模式时自动尝试常亮。
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement;}
function exitFullscreen(){try{const exit=document.fullscreenElement?document.exitFullscreen:document.webkitExitFullscreen;return Promise.resolve(exit?.call(document)).catch(()=>{});}catch{return Promise.resolve();}}
function updateFullscreen(){const active=Boolean(fullscreenElement());$('fullscreen').textContent=active?'退出全屏':'全屏';$('fullscreen').setAttribute('aria-pressed',String(active));updatePhotoBoothFullscreen();if(!active)photoBoothFullscreen=false;if(boothOpen())return;if(childMode){if(!active&&!showMode)exitChildMode();return;}showControls(!active);}
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
document.addEventListener('pointerdown',()=>armMenuIdle(),true);
$('settings').addEventListener('toggle',()=>armMenuIdle());
document.addEventListener('keydown',e=>{armMenuIdle();if(boothOpen()){if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,button,a,summary,dialog'))return;if(e.key==='Escape'||e.key.toLowerCase()==='h')restoreMenus();else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){showPhotoBoothItem(photoBoothIndex+(e.key==='ArrowRight'?1:-1));schedulePhotoBoothCarousel();}return;}if(e.key==='Escape'){exitChildMode();return;}if(childMode)return;if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.closest('input,select,textarea,button,a,summary,dialog'))return;if(/^[1-4]$/.test(e.key)){selectScene(modes[+e.key-1]);return;}if(e.key.toLowerCase()==='h'){restoreMenus();return;}if(mode==='album'){if(e.key==='ArrowRight')stepPhoto(1);if(e.key==='ArrowLeft')stepPhoto(-1);if(e.code==='Space'&&photos.length){e.preventDefault();$('album-toggle').click();}}if(mode==='cake'&&e.code==='Space'){e.preventDefault();blow();}});
document.addEventListener('visibilitychange',()=>{stage.classList.toggle('background-paused',document.hidden||boothOpen());if(document.hidden){stopCeremony();musicRun++;clearTimeout(albumTimer);clearTimeout(photoBoothTimer);clearEffects();clearAmbient();cancelCountdown();clearFind();clearHint();stopDance();pauseVideo();stopRecord(true);stopSong();stopMic();$('bgm').pause();audio.suspend().catch(()=>{});}else{schedulePhoto();schedulePhotoBoothCarousel();syncMusic();acquireWake(false);armIdle();resumeVideo();}});
window.addEventListener('pagehide',()=>{stopCeremony();clearTimeout(photoBoothTimer);musicRun++;importRun++;finishImport();clearTimeout(albumTimer);stopSong();stopMic();stopRecord(false);clearHint();stopDance();pauseVideo();clearEffects();clearAmbient();cancelCountdown();clearFind();$('bgm').pause();audio.suspend().catch(()=>{});const lock=wakeLock;wakeLock=null;if(lock)lock.release().catch(()=>{});});
window.addEventListener('pageshow',()=>{schedulePhoto();acquireWake(false);});window.addEventListener('resize',()=>{clearEffects();clearAmbient();});
updateAlbum();updateCake();updateSound();updateMotion();armIdle();restoreSaved().catch(()=>{});
