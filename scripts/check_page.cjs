// 无第三方依赖的交互回归检查；不替代真实浏览器与投屏测试。
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', process.argv[2] || 'party', 'index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
function element() {
 const classes = new Set();
 return {
  hidden:false, disabled:false, open:false, clientHeight:900, textContent:'', attrs:{}, listeners:{}, children:[],
  style:{setProperty(k,v){this[k]=v;}},
  classList:{contains:x=>classes.has(x),toggle(x,force){const value=force??!classes.has(x);value?classes.add(x):classes.delete(x);return value;}},
  focus(){this.focused=true;}, setAttribute(k,v){this.attrs[k]=v;},
  addEventListener(k,f){this.listeners[k]=f;}, replaceChildren(){this.children=[];}, append(child){this.children.push(child);}
 };
}
function setup({reduced=false,wake=false}={}) {
 const els = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],element()]));
 const events={}, windowEvents={}, timers=new Map(); let timerId=0;
 const document={body:element(),documentElement:{},visibilityState:'visible',getElementById:id=>els[id],
  addEventListener:(k,f)=>events[k]=f,createElement:element,createDocumentFragment:element};
 const media={matches:reduced,addEventListener(){}};
 const navigator={};
 const locks=[];
 if(wake) navigator.wakeLock={async request(){const lock={listeners:{},addEventListener(k,f){this.listeners[k]=f;},async release(){this.released=true;this.listeners.release?.();}};locks.push(lock);return lock;}};
 const window={matchMedia:()=>media,addEventListener:(k,f)=>windowEvents[k]=f};
 vm.runInNewContext(source,{document,window,navigator,setTimeout:f=>{timers.set(++timerId,f);return timerId;},clearTimeout:id=>timers.delete(id)});
 return {els,events,windowEvents,document,navigator,locks,media,timers,click:id=>els[id].listeners.click(),tap:()=>events.click({target:{closest:()=>null}})};
}
(async()=>{
 let app=setup(),{els,click,tap,events}=app;
 click('photo');assert(els.stage.classList.contains('paused'));assert(els.controls.hidden);assert.equal(els.notice.textContent,'');
 tap();assert(!els.controls.hidden);assert(els.stage.classList.contains('paused'));
 click('photo');assert(!els.stage.classList.contains('paused'));
 click('pause');click('photo');events.keydown({key:'Escape'});click('photo');assert(els.stage.classList.contains('paused'));
 click('photo');tap();click('pause');assert(!els.stage.classList.contains('paused'));assert.equal(els.photo.attrs['aria-pressed'],'false');
 click('cake');assert.equal(els['farm-scene'].style.display,'none');assert.equal(els['cake-scene'].style.display,'');assert(!els.candles.hidden);
 click('candles');assert.equal(els.flames.style.display,'none');assert(els.controls.hidden);assert.equal(els.confetti.children[0].children.length,48);
 tap();assert.equal(els.flames.style.display,'none');click('photo');assert.equal(els.confetti.children.length,0);tap();click('photo');
 click('farm');assert(els.candles.hidden);click('cake');assert.equal(els.flames.style.display,'none');
 click('candles');assert.equal(els.flames.style.display,'');assert.equal(els.candles.textContent,'吹灭蜡烛');
 click('photo');tap();click('candles');assert.equal(els.confetti.children.length,0);assert(els.stage.classList.contains('paused'));
 tap();click('photo');click('hide');events.keydown({key:'h',ctrlKey:true});assert(els.controls.hidden);events.keydown({key:'h'});assert(!els.controls.hidden);
 await click('fullscreen');assert.match(els.notice.textContent,/不支持/);
 app.document.documentElement.requestFullscreen=async()=>{throw Error('denied');};await click('fullscreen');assert.match(els.notice.textContent,/暂时无法/);
 app.document.documentElement.requestFullscreen=async()=>{app.document.fullscreenElement={};events.fullscreenchange();};
 await click('fullscreen');assert(els.controls.hidden);assert.equal(els.fullscreen.textContent,'退出全屏');
 app.document.exitFullscreen=async()=>{app.document.fullscreenElement=null;events.fullscreenchange();};await click('fullscreen');assert(!els.controls.hidden);
 await click('awake');assert.match(els.notice.textContent,/不支持/);
 app=setup({reduced:true});app.click('cake');app.click('candles');assert.equal(app.els.confetti.children.length,0);assert.equal(app.els.flames.style.display,'none');
 app=setup({wake:true});await app.click('awake');assert.equal(app.els.awake.attrs['aria-pressed'],'true');assert(!app.els.awake.disabled);
 app.document.visibilityState='hidden';await app.locks[0].release();assert.equal(app.els.awake.attrs['aria-pressed'],'false');
 app.document.visibilityState='visible';app.events.visibilitychange();await new Promise(setImmediate);assert.equal(app.locks.length,2);assert.equal(app.els.awake.attrs['aria-pressed'],'true');
 await app.click('awake');assert(app.locks[1].released);assert.equal(app.els.awake.attrs['aria-pressed'],'false');
 app.navigator.wakeLock.request=async()=>{throw Error('denied');};await app.click('awake');assert.match(app.els.notice.textContent,/无法保持常亮/);assert.equal(app.els.awake.attrs['aria-pressed'],'false');assert(!app.els.awake.disabled);
 console.log('PASS: scene/candle state, photo restore, confetti cleanup, reduced motion, controls/keyboard, fullscreen success/failure, wake lock lifecycle/failure');
})().catch(error=>{console.error(error);process.exitCode=1;});
