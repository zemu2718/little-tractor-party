const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../audio.js'),'utf8');
let context,oscillators=0;
function node(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},frequency:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){return this;},disconnect(){this.disconnected=true;},start(){},stop(){}};}
class Context{constructor(){context=this;this.state='running';this.currentTime=0;this.destination={};}createGain(){return node();}createOscillator(){oscillators++;return node();}async resume(){this.state='running';}async suspend(){this.state='suspended';}}
const window={AudioContext:Context},document={hidden:false};vm.runInNewContext(code,{window,document});const audio=window.PartyAudio;
(async()=>{
 await audio.effect('dragon');assert.equal(oscillators,0);await audio.setEnabled(true);const song=await audio.song();assert.equal(song.lines.length,4);assert(song.total>10);assert(oscillators>0);audio.stopSong();await audio.setEnabled(false);const before=oscillators;await audio.effect('mouse');assert.equal(oscillators,before);
 await audio.setEnabled(true);await audio.suspend();let resume;context.resume=()=>new Promise(r=>resume=r);const pending=audio.song();audio.stopSong();resume();assert.equal(await pending,null);assert.equal(oscillators,before);
 context.state='running';document.hidden=true;await audio.effect('rooster');assert.equal(oscillators,before);assert.equal(await audio.song(),null);
 console.log('PASS: audio opt-in, song timing, mute, cancelled pending audio, hidden-page silence');
})().catch(e=>{console.error(e);process.exitCode=1;});
