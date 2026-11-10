// 无第三方依赖的状态/生命周期回归；浏览器与设备表现仍需实测。
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
function element(){const classes=new Set();return {hidden:false,disabled:false,checked:true,open:false,value:'8',textContent:'',clientHeight:900,offsetWidth:10,children:[],attrs:{},listeners:{},style:{setProperty(k,v){this[k]=v;}},classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,force){const v=force??!classes.has(k);v?classes.add(k):classes.delete(k);return v;}},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this[k];},append(c){this.children.push(c);c.parentNode=this;},replaceChildren(){this.children=[];},get firstElementChild(){return this.children[0];},focus(){},closest(){return null;},addEventListener(k,f){this.listeners[k]=f;},click(){return this.onclick?.({target:this});},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(x=>x!==this);},showModal(){this.open=true;},close(){this.open=false;}};}
function setup({reduce=false}={}){
 const els=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],element()]));
 els['album-progress'].append(element());const bgm=els.bgm;bgm.paused=true;bgm.play=async()=>{bgm.paused=false;};bgm.pause=()=>{bgm.paused=true;};
 const tabs=['home','album','cake','game'].map(scene=>Object.assign(element(),{dataset:{scene}}));const friends=['dragon','mouse','rooster','tractor'].map(friend=>Object.assign(element(),{dataset:{friend}}));const friendParent=element();friends.forEach(f=>friendParent.append(f));
 const events={},windowEvents={},timers=new Map();let tid=0,uid=0;const objects=new Map(),revoked=[];
 const document={hidden:false,documentElement:{},body:element(),getElementById:id=>els[id],querySelectorAll:selector=>selector==='[data-scene]'?tabs:friends,addEventListener:(k,f)=>events[k]=f,createElement:element};
 const audio={enabled:false,songCount:0,stopped:0,async setEnabled(v){this.enabled=v;},async effect(){},async suspend(){},async song(){this.songCount++;return {lines:[0,3,6,10],total:14};},stopSong(){this.stopped++;}};
 const window={PartyAudio:audio,addEventListener:(k,f)=>windowEvents[k]=f};
 class Image{set src(v){if(!v)return;const file=objects.get(v);queueMicrotask(()=>{if(file?.bad)this.onerror?.();else{this.naturalWidth=1200;this.naturalHeight=800;this.onload?.();}});}}
 const URL={createObjectURL(f){const url='blob:'+ ++uid;objects.set(url,f);return url;},revokeObjectURL(url){revoked.push(url);objects.delete(url);}};
 const timeout=(f,ms)=>{timers.set(++tid,{f,ms});return tid;};
 const context=vm.createContext({document,window,navigator:{},matchMedia:()=>({matches:reduce,addEventListener(){}}),performance:{now:()=>1000},setTimeout:timeout,clearTimeout:id=>timers.delete(id),setInterval:timeout,clearInterval:id=>timers.delete(id),Image,URL,location:{href:''},console});vm.runInContext(source,context);
 return {els,tabs,friends,events,windowEvents,timers,revoked,objects,audio,context,document,read:s=>vm.runInContext(s,context),click:async id=>{await els[id].click();await new Promise(setImmediate);},run:async s=>{await vm.runInContext(s,context);await new Promise(setImmediate);}};
}
(async()=>{
 let app=setup();const {els}=app;
 assert.equal(app.read('mode'),'home');assert.equal(els.sound.attrs['aria-pressed'],'false');
 await app.run("selectScene('cake')");await app.click('blow');assert.equal(app.read('blown'),true);assert(els.controls.hidden);assert.equal(els.confetti.children.length,44);
 await app.run("selectScene('home');selectScene('cake')");assert(els['birthday-cake'].classList.contains('out'));await app.click('relight');assert(!els['birthday-cake'].classList.contains('out'));assert.equal(els.confetti.children.length,0);
 await app.click('photo');assert(els.controls.hidden);assert(els.stage.classList.contains('paused'));await app.click('blow');assert.equal(els.confetti.children.length,0);await app.click('photo');assert(!els.stage.classList.contains('paused'));
 await app.click('pause');await app.click('photo');await app.click('photo');assert(els.stage.classList.contains('paused'));await app.click('pause');assert(!els.stage.classList.contains('paused'));
 await app.click('relight');await app.click('sing');assert.equal(app.read('singing'),true);assert.equal(app.audio.songCount,1);await app.run("selectScene('game')");assert.equal(app.read('singing'),false);assert.equal(app.read('songTimers.length'),0);
 await app.run("selectScene('cake')");await app.click('sing');await app.click('sound');assert.equal(app.read('singing'),false);assert.equal(app.read('sound'),false);
 await app.run("importPhotos([{name:'02-第一次坐拖拉机.jpg',size:12},{name:'01-刚出生.png',size:12},{name:'03-broken.jpg',size:12,bad:true},{name:'ignore.txt',size:4}])");
 assert.equal(app.read('photos.length'),2);assert.equal(app.read('photos[0].cap'),'刚出生');assert.equal(app.read('mode'),'album');assert.equal(els['photo-caption'].textContent,'刚出生');assert.equal(app.read('albumPlaying'),true);assert(app.revoked.length>=1);assert(!els['next'].disabled);
 await app.click('next');assert.equal(els['photo-caption'].textContent,'第一次坐拖拉机');await app.click('next');assert.equal(els['photo-caption'].textContent,'刚出生');await app.click('previous');assert.equal(app.read('photoIndex'),1);
 await app.click('album-toggle');assert.equal(app.read('albumPlaying'),false);assert(![...app.timers.values()].some(t=>t.ms===8000));await app.click('album-toggle');assert([...app.timers.values()].some(t=>t.ms===8000));
 app.document.hidden=true;app.events.visibilitychange();assert(![...app.timers.values()].some(t=>t.ms===8000));app.document.hidden=false;app.events.visibilitychange();assert([...app.timers.values()].some(t=>t.ms===8000));
 await app.click('photo');assert(![...app.timers.values()].some(t=>t.ms===8000));await app.click('photo');assert([...app.timers.values()].some(t=>t.ms===8000));
 await app.run("importPhotos([{name:'bad.heic',size:5,bad:true}])");assert.equal(app.read('photos.length'),2);assert.match(els.notice.textContent,/无法显示/);
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
 await app.run("selectScene('game')");app.friends[1].onclick();assert.match(app.els.hello.textContent,/鼠妈妈/);
 await app.run('lastGreeting=0');app.friends[2].onclick();assert.match(app.els.hello.textContent,/公鸡爸爸/);
 await app.click('celebrate');assert(app.els.controls.hidden);assert.equal(app.els.confetti.children.length,44);
 app=setup({reduce:true});await app.run("selectScene('cake')");await app.click('blow');assert.equal(app.els.confetti.children.length,0);
 console.log('PASS: play modes, candle persistence, song cancellation, sound, album decode/sort/loop/pause/failure/URL cleanup, photo mode, background timers, reduced motion, microphone cancellation, fullscreen fallback, wake lock race');
})().catch(e=>{console.error(e);process.exitCode=1;});
