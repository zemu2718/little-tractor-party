// 无第三方依赖的状态/生命周期回归；浏览器与设备表现仍需实测。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function element(){const classes=new Set();return {hidden:false,disabled:false,checked:true,open:false,value:'8',textContent:'',clientHeight:900,offsetWidth:10,children:[],attrs:{},listeners:{},style:{setProperty(k,v){this[k]=v;}},classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,force){const v=force??!classes.has(k);v?classes.add(k):classes.delete(k);return v;}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this[k];},append(c){this.children.push(c);c.parentNode=this;},replaceChildren(){this.children=[];},get firstElementChild(){return this.children[0];},getBoundingClientRect(){return {left:20,top:30,width:200,height:300};},focus(){},closest(){return null;},addEventListener(k,f){this.listeners[k]=f;},click(){return this.onclick?.({target:this});},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);},showModal(){this.open=true;},close(){this.open=false;}};}
function setup({reduce=false}={}){
 const els=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],element()]));
 els['album-progress'].append(element());const bgm=els.bgm;bgm.paused=true;bgm.play=async()=>{bgm.paused=false;};bgm.pause=()=>{bgm.paused=true;};
 const tabs=['home','album','cake','game'].map(scene=>Object.assign(element(),{dataset:{scene}}));const friends=['mouse','dragon','rooster','excavator'].map(friend=>Object.assign(element(),{dataset:{friend}}));const friendParent=element();friends.forEach(f=>friendParent.append(f));
 const events={},windowEvents={},timers=new Map();let tid=0,uid=0;const objects=new Map(),revoked=[];
 const document={hidden:false,documentElement:{},body:element(),getElementById:id=>els[id],querySelectorAll:selector=>selector==='[data-scene]'?tabs:friends,addEventListener:(k,f)=>events[k]=f,createElement:element};
 const audio={enabled:false,songCount:0,stopped:0,async setEnabled(v){this.enabled=v;},async effect(){},async suspend(){},async song(){this.songCount++;return {lines:[0,3,6,10],total:14};},stopSong(){this.stopped++;},stopEffects(){},loops:0,async startLoop(){this.loops++;},stopLoop(){}};
 const voice={init(){},setEnabled(){},setSpoken(){},status(){return {count:0,has:()=>false,local:false};},stop(){},async speak(){return false;},setClip(){return true;},clearClips(){}};
 const window={PartyVoice:voice,PartyAudio:audio,addEventListener:(k,f)=>windowEvents[k]=f};
 class Image{set src(v){if(!v)return;const file=objects.get(v);queueMicrotask(()=>{if(file?.bad)this.onerror?.();else{this.naturalWidth=1200;this.naturalHeight=800;this.onload?.();}});}}
 const URL={createObjectURL(f){const url='blob:'+ ++uid;objects.set(url,f);return url;},revokeObjectURL(url){revoked.push(url);objects.delete(url);}};
 const timeout=(f,ms)=>{timers.set(++tid,{f,ms});return tid;};
 const context=vm.createContext({document,window,navigator:{},matchMedia:()=>({matches:reduce,addEventListener(){}}),performance:{now:()=>1000},setTimeout:timeout,clearTimeout:id=>timers.delete(id),setInterval:timeout,clearInterval:id=>timers.delete(id),Image,URL,location:{href:''},console});vm.runInContext(source,context);
 return {els,tabs,friends,events,windowEvents,timers,revoked,objects,audio,context,document,read:s=>vm.runInContext(s,context),click:async id=>{await els[id].click();await new Promise(setImmediate);},run:async s=>{await vm.runInContext(s,context);await new Promise(setImmediate);}};
}
(async()=>{
 let app=setup();const {els}=app;
 assert.equal(app.read('mode'),'home');assert.equal(els.sound.attrs['aria-pressed'],'false');
 await app.run("selectScene('cake')");await app.click('blow');assert.equal(app.read('blown'),true);assert(els.controls.hidden);assert(els.confetti.children.length>=100);assert(els['birthday-cake'].classList.contains('just-out'));
 await app.run("selectScene('home');selectScene('cake')");assert(els['birthday-cake'].classList.contains('out'));await app.click('relight');assert(!els['birthday-cake'].classList.contains('out'));assert.equal(els.confetti.children.length,0);
 await app.click('photo');assert(els.controls.hidden);assert(els.stage.classList.contains('paused'));await app.click('blow');assert.equal(els.confetti.children.length,0);await app.click('photo');assert(!els.stage.classList.contains('paused'));
 await app.click('pause');await app.click('photo');await app.click('photo');assert(els.stage.classList.contains('paused'));await app.click('pause');assert(!els.stage.classList.contains('paused'));
 await app.click('relight');await app.click('sing');assert.equal(app.read('singing'),true);assert.equal(app.audio.songCount,1);await app.run("selectScene('game')");assert.equal(app.read('singing'),false);assert.equal(app.read('songTimers.length'),0);
 await app.run("selectScene('cake')");await app.click('sing');await app.click('sound');assert.equal(app.read('singing'),false);assert.equal(app.read('sound'),false);
 await app.run("importPhotos([{name:'02-第一次坐挖掘机.jpg',size:12},{name:'01-刚出生.png',size:12},{name:'03-broken.jpg',size:12,bad:true},{name:'ignore.txt',size:4}])");
 assert.equal(app.read('photos.length'),2);assert.equal(app.read('photos[0].cap'),'刚出生');assert.equal(app.read('mode'),'album');assert.equal(els['photo-caption'].textContent,'刚出生');assert.equal(app.read('albumPlaying'),true);assert(app.revoked.length>=1);assert(!els['next'].disabled);
 await app.click('next');assert.equal(els['photo-caption'].textContent,'第一次坐挖掘机');await app.click('next');assert.equal(els['photo-caption'].textContent,'刚出生');await app.click('previous');assert.equal(app.read('photoIndex'),1);
 await app.click('album-toggle');assert.equal(app.read('albumPlaying'),false);assert(![...app.timers.values()].some(t=>t.ms===8000));await app.click('album-toggle');assert([...app.timers.values()].some(t=>t.ms===8000));
 app.document.hidden=true;app.events.visibilitychange();assert(![...app.timers.values()].some(t=>t.ms===8000));app.document.hidden=false;app.events.visibilitychange();assert([...app.timers.values()].some(t=>t.ms===8000));
 await app.click('photo');assert(![...app.timers.values()].some(t=>t.ms===8000));await app.click('photo');assert([...app.timers.values()].some(t=>t.ms===8000));
 await app.run("importPhotos([{name:'bad.heic',size:5,bad:true}])");assert.equal(app.read('photos.length'),2);assert.match(els.notice.textContent,/无法显示/);assert.equal(app.read('albumPlaying'),true);
 const priorURLs=app.read('JSON.stringify(photos.map(p=>p.url))');await app.click('clear-photos');assert.equal(app.read('photos.length'),0);assert.equal(els['photo-frame'].hidden,true);for(const url of JSON.parse(priorURLs))assert(app.revoked.includes(url));
 await app.run("importPhotos([{name:'01-photo.jpg',size:1}])");assert(els.next.disabled);assert(![...app.timers.values()].some(t=>t.ms===8000));
 await app.run("selectScene('cake')");await app.click('mic-toggle');assert.match(els.notice.textContent,/不支持麦克风/);
 await app.click('fullscreen');assert.match(els.notice.textContent,/不支持/);await app.click('awake');assert.match(els.notice.textContent,/不支持/);
 // Late microphone grant must be immediately released after leaving the scene.
 let grant,stopped=false;app.context.navigator.mediaDevices={getUserMedia:()=>new Promise(r=>grant=r)};const pending=app.run('startMic()');assert.equal(els['mic-toggle'].disabled,true);await app.run("selectScene('home')");grant({getTracks:()=>[{stop(){stopped=true;}}]});await pending;assert(stopped);assert.equal(app.read('micStream'),null);
 // Wake request resolving in the background cannot keep a stale lock.
 let giveLock,released=false;app.context.navigator.wakeLock={request:()=>new Promise(r=>giveLock=r)};const waiting=app.click('awake');app.document.hidden=true;giveLock({release:async()=>{released=true;},addEventListener(){}});await waiting;assert(released);assert.equal(app.read('wakeLock'),null);
 // 标准与 WebKit 全屏入口成功、退出、拒绝以及家人互动。
 app=setup();
 app.document.documentElement.requestFullscreen=async()=>{app.document.fullscreenElement={};app.events.fullscreenchange();};
 app.document.exitFullscreen=async()=>{app.document.fullscreenElement=null;app.events.fullscreenchange();};
 await app.click('fullscreen');assert(app.els.controls.hidden);assert.equal(app.els.fullscreen.attrs['aria-pressed'],'true');assert.equal(app.els.fullscreen.textContent,'退出全屏');
 await app.click('fullscreen');assert(!app.els.controls.hidden);assert.equal(app.els.fullscreen.attrs['aria-pressed'],'false');
 app.document.documentElement.requestFullscreen=async()=>{throw Error('denied');};await app.click('fullscreen');assert.match(app.els.notice.textContent,/无法进入/);
 delete app.document.documentElement.requestFullscreen;
 app.document.documentElement.webkitRequestFullscreen=()=>{app.document.webkitFullscreenElement={};app.events.webkitfullscreenchange();};
 app.document.webkitExitFullscreen=()=>{app.document.webkitFullscreenElement=null;app.events.webkitfullscreenchange();};
 await app.click('fullscreen');assert(app.els.controls.hidden);await app.click('fullscreen');assert(!app.els.controls.hidden);
 await app.run("selectScene('game')");app.friends.find(f=>f.dataset.friend==='mouse').onclick();assert.match(app.els.hello.textContent,/鼠妈妈/);assert.equal(app.els.bubbles.children[0].style.left,'100px');assert.equal(app.els.bubbles.children[0].style.top,'75px');
 await app.run('lastGreeting=0');app.friends[2].onclick();assert.match(app.els.hello.textContent,/公鸡爸爸/);
 await app.click('celebrate');assert(app.els.controls.hidden);assert(app.els.confetti.children.length>=100);
 // 亲子模式：空白点击不唤出菜单；长按及 Esc 可恢复。
 app=setup();await app.click('child-play');assert.equal(app.read('mode'),'game');assert.equal(app.read('childMode'),true);assert(app.els.controls.hidden);
 app.events.click({target:{closest:()=>null}});assert(app.els.controls.hidden);
 app.els['parent-exit'].onpointerdown({preventDefault(){}});const held=[...app.timers.values()].find(t=>t.ms===1100);assert(held);held.f();assert(!app.els.controls.hidden);assert(!app.read('childMode'));
 await app.click('child-play');app.events.keydown({key:'Escape'});assert(!app.read('childMode'));
 // 连拍：每一下都有星星，只有说话被节流；躲猫猫点到藏起来的角色会立刻弹出；跳舞派对；返回键拦截；视频导入。
 app=setup();await app.run("selectScene('game')");const mouse=app.friends.find(f=>f.dataset.friend==='mouse');mouse.onclick();const said=app.els.hello.textContent;mouse.onclick();assert.equal(app.els.bubbles.children.length,2);assert.equal(app.els.hello.textContent,said);
 await app.run('peekaboo()');assert(app.read('peeking'));assert(mouse.classList.contains('hiding'));mouse.onclick();assert(!mouse.classList.contains('hiding'));assert(mouse.classList.contains('peek'));await app.run("selectScene('home')");assert(!app.read('peeking'));
 await app.run("selectScene('game')");await app.click('dance-btn');assert(app.read('danceOn'));assert(app.audio.loops>0);await app.run("selectScene('cake')");assert(!app.read('danceOn'));
 const hist={state:null,pushes:0,pushState(st){this.state=st;this.pushes++;},back(){this.state=null;}};app.context.window.history=hist;
 await app.click('child-play');assert.equal(hist.pushes,1);app.windowEvents.popstate();assert.equal(hist.pushes,2);app.events.keydown({key:'Escape'});assert.equal(hist.state,null);app.windowEvents.popstate();assert.equal(hist.pushes,2);
 await app.run('probeVideo=async()=>{}');await app.run("importPhotos([{name:'01-第一次走路.mp4',size:5000},{name:'02-a.jpg',size:1}])");assert.equal(app.read('photos.length'),2);assert.equal(app.read('photos[0].video'),true);assert.equal(app.els['photo-video'].hidden,false);assert.equal(app.els['photo-img'].hidden,true);assert(![...app.timers.values()].some(t=>t.ms===8000));
 await app.click('next');assert.equal(app.els['photo-video'].hidden,true);assert([...app.timers.values()].some(t=>t.ms===8000));
 // 导入取消不会替换旧照片，取消后释放本轮临时 URL。
 await app.run("importPhotos([{name:'01-old.png',size:1}])");const oldPhoto=app.read('photos[0].url');
 await app.run('decode=url=>new Promise(resolve=>globalThis.finishDecode=resolve)');
 const importing=app.run("importPhotos([{name:'02-new.png',size:1}])");assert(!app.els['import-status'].hidden);
 await app.click('cancel-import');app.context.finishDecode({naturalWidth:1200,naturalHeight:800});await importing;
 assert.equal(app.read('photos[0].url'),oldPhoto);assert(app.els['import-status'].hidden);assert.equal(app.objects.size,1);
 app=setup({reduce:true});assert.equal(app.els['motion-note'].hidden,false);await app.click('motion');assert.equal(app.read('calm'),true);await app.run("selectScene('cake')");await app.click('blow');assert.equal(app.els.confetti.children.length,0);
 // 倒数吹蜡烛、点蛋糕重新点亮、亲子模式自动开声音、相册内置音乐。
 app=setup();await app.run("selectScene('cake')");await app.click('countdown-blow');assert.equal(app.read('counting'),true);const finale=[...app.timers.values()].filter(t=>t.ms===3850);assert.equal(finale.length,1);finale[0].f();assert.equal(app.read('blown'),true);assert.equal(app.read('counting'),false);
 await app.run("cakeTap()");assert.equal(app.read('blown'),false);await app.run("cakeTap()");assert.equal(app.read('counting'),true);await app.run("selectScene('home')");assert.equal(app.read('counting'),false);
 app=setup();await app.click('child-play');assert.equal(app.read('sound'),true);assert(!app.els['kid-nav'].hidden);await app.run("selectScene('cake')");assert.equal(app.read('mode'),'cake');app.events.keydown({key:'Escape'});assert(app.els['kid-nav'].hidden);
 await app.run("importPhotos([{name:'01-a.jpg',size:1},{name:'02-b.jpg',size:1}])");assert(app.audio.loops>0);
 // 找一找：空闲后提问，点对目标会庆祝。
 await app.run("selectScene('game')");const ask=[...app.timers.values()].find(t=>t.ms===9000);assert(ask);ask.f();const target=app.read('findTarget');assert(target);assert.match(app.els.hello.textContent,/在哪里/);await app.run('lastGreeting=0');app.friends.find(f=>f.dataset.friend===target).onclick();assert.match(app.els.hello.textContent,/找到/);assert.equal(app.read('findTarget'),null);
 // 派对展示：自动轮播（跳过空相册）、角色自动表演、不再喊“点点…”，长按家长键退出。
 app=setup();const spoken=[];app.context.window.PartyVoice.speak=async(kind,text)=>{spoken.push(text);return true;};
 await app.click('show-play');assert.equal(app.read('showMode'),true);assert.equal(app.read('childMode'),true);assert(app.els['kid-nav'].hidden);assert(app.els.controls.hidden);assert.equal(app.read('sound'),true);
 assert(spoken.includes('派对开始啦！'));assert(app.audio.loops>0);
 const advance=[...app.timers.values()].find(t=>t.ms===45000);assert(advance);advance.f();assert.equal(app.read('mode'),'game');
 const perf=[...app.timers.values()].find(t=>t.ms===1200);assert(perf);perf.f();assert(app.read('danceOn'));
 await app.run('stopDance()');await app.run('performance.now=()=>21000');await app.run("armIdle()");const gameNext=[...app.timers.values()].find(t=>t.ms===16000);assert(gameNext,'game deadline must not restart after the dance');gameNext.f();assert.equal(app.read('mode'),'cake');await app.run('performance.now=()=>1000');
 assert(![...app.timers.values()].some(t=>t.ms===6000));
 app.els['parent-exit'].onpointerdown({preventDefault(){}});[...app.timers.values()].find(t=>t.ms===1100).f();assert.equal(app.read('showMode'),false);assert(!app.els.controls.hidden);
 // 有照片时相册放完最后一张才切走。
 app=setup();await app.run("importPhotos([{name:'01-a.jpg',size:1},{name:'02-b.jpg',size:1}])");await app.run("selectScene('home')");await app.click('show-play');
 [...app.timers.values()].find(t=>t.ms===45000).f();await new Promise(setImmediate);assert.equal(app.read('mode'),'album');assert.equal(app.read('photoIndex'),0);
 [...app.timers.values()].find(t=>t.ms===8000).f();await new Promise(setImmediate);assert.equal(app.read('photoIndex'),1);assert.equal(app.read('mode'),'album');
 [...app.timers.values()].filter(t=>t.ms===8000).pop().f();assert.equal(app.read('mode'),'game');
 // 生日仪式：唱歌 → 许愿 → 人声倒数 → 吹灭欢呼 → 继续轮播。
 app=setup();const lines2=[];app.context.window.PartyVoice.speak=async(kind,text)=>{lines2.push(text);return true;};
 await app.click('ceremony');assert.equal(app.read('mode'),'cake');assert.equal(app.read('ceremonyOn'),true);assert.equal(app.read('showMode'),true);
 [...app.timers.values()].find(t=>t.ms===3200).f();await new Promise(setImmediate);await new Promise(setImmediate);assert.equal(app.read('singing'),true);
 [...app.timers.values()].find(t=>t.ms===14000).f();assert.equal(app.read('singing'),false);assert(lines2.includes("许个愿，吹蜡烛吧！"));
 [...app.timers.values()].find(t=>t.ms===3400).f();assert.equal(app.read('counting'),true);
 for(const ms of [0,1000,2000,3000])[...app.timers.values()].find(t=>t.ms===ms&&String(t.f).includes('COUNTDOWN'))?.f();assert.deepEqual(lines2.filter(t=>/^[三二一呼]/.test(t)),['三！','二！','一！','呼——吹蜡烛！']);
 [...app.timers.values()].find(t=>t.ms===3850).f();assert.equal(app.read('blown'),true);assert.equal(app.read('ceremonyOn'),false);assert(app.els.confetti.children.length>=100);assert.equal(app.els.finale.children.length,5);
 [...app.timers.values()].find(t=>t.ms===30000).f();assert.equal(app.read('mode'),'home');
 // 再次轮播回到蛋糕时蜡烛重新点亮。
 await app.run("goShow('cake')");assert.equal(app.read('blown'),false);
 // 唱歌时宝宝点角色不会说话打断生日歌；吹灭后的欢呼台词等倒数最后一句说完再播。
 app=setup();const heard=[];app.context.window.PartyVoice.speak=async(kind,text)=>{heard.push(text);return true;};
 await app.run("selectScene('cake')");await app.click('sing');assert.equal(app.read('singing'),true);await app.run('lastGreeting=0');
 app.read("hotTap('rooster',{clientX:10,clientY:10},null)");assert(!heard.some(t=>/喔/.test(t)));assert.equal(app.read('singing'),true);
 await app.run('stopSong()');await app.click('blow');assert(!heard.includes('哇！齐齐，生日快乐！'));[...app.timers.values()].find(t=>t.ms===1000&&String(t.f).includes('哇')).f();assert(heard.includes('哇！齐齐，生日快乐！'));
 console.log('PASS: no speech over the song, cheer line waits for the countdown');
 console.log('PASS: party show carousel/auto perform/album round/exit, birthday ceremony (song → wish → voiced countdown → blow → resume)');
 console.log('PASS: rapid taps, peekaboo, dance party, back-button guard, album video, countdown/relight, child sound + kid nav, built-in album music, find game, play modes, candle persistence, song cancellation, sound, album decode/sort/loop/pause/failure/URL cleanup, photo mode, background timers, reduced motion, microphone cancellation, fullscreen fallback, wake lock race');
})().catch(e=>{console.error(e);process.exitCode=1;});
