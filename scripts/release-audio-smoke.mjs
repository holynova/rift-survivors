import {chromium} from '@playwright/test';import fs from 'node:fs';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on("response",r=>{if(r.status()>=400&&!r.url().endsWith("/favicon.ico"))errors.push(`HTTP ${r.status()}: ${r.url()}`);});p.on("requestfailed",r=>errors.push(r.url()));p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{
 const Native=window.AudioContext;const connect=AudioNode.prototype.connect;
 window.AudioContext=class extends Native {constructor(...args){super(...args);const probe=this.createAnalyser();probe.fftSize=2048;const zero=this.createGain();zero.gain.value=0;connect.call(probe,zero);connect.call(zero,this.destination);window.__audioProbe=probe;window.__audioDestination=this.destination;}};
 AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);if(destination===window.__audioDestination&&this instanceof DynamicsCompressorNode)connect.call(this,window.__audioProbe);return result;};
});
await p.goto(process.env.RIFT_TEST_URL || 'http://127.0.0.1:5189/?v=0.6');await p.getByRole('button',{name:'进入竞技场'}).click();await p.getByRole('button',{name:'Ⅱ 暂停'}).waitFor();await p.waitForTimeout(1000);
const rms=()=>p.evaluate(()=>{const a=window.__audioProbe,buffer=new Float32Array(a.fftSize);a.getFloatTimeDomainData(buffer);return Math.sqrt(buffer.reduce((s,x)=>s+x*x,0)/buffer.length);});
const music=[];for(let i=0;i<4;i++){music.push(await rms());await p.waitForTimeout(120);}
await p.keyboard.down('KeyD');await p.waitForTimeout(250);await p.keyboard.up('KeyD');await p.keyboard.press('Space');await p.keyboard.press('KeyE');await p.keyboard.press('KeyQ');await p.waitForTimeout(900);
await p.getByRole('button',{name:'关闭音乐'}).click();await p.keyboard.press('Space');await p.waitForTimeout(100);
const effects=[];for(let i=0;i<4;i++){effects.push(await rms());await p.waitForTimeout(100);}
await p.getByRole('button',{name:'关闭音效'}).click();await p.waitForTimeout(550);const muted=await rms();
await p.getByRole('button',{name:'打开音乐'}).click();await p.waitForTimeout(450);const resumed=await rms();
await p.keyboard.press('Escape');await p.getByRole('button',{name:'继续战斗'}).waitFor();await p.waitForTimeout(450);const paused=await rms();await p.screenshot({path:process.env.RIFT_TEST_URL ? 'evidence/19-public-game.png' : 'evidence/18-production-audio-v6.png'});
const report={url:process.env.RIFT_TEST_URL || "http://127.0.0.1:5189/",music,effects,muted,resumed,paused,errors,debugRemoved:await p.evaluate(()=>typeof window.__rift==='undefined'),note:'Readback of actual production master output via silent parallel analyser tap. AudioContext unlocked by real button click.'};
fs.writeFileSync(process.env.RIFT_TEST_URL ? 'evidence/public-audio-smoke.json' : 'evidence/production-audio-v6.json',JSON.stringify(report,null,2));console.log(report);await b.close();if(!music.some(x=>x>.001)||!effects.some(x=>x>.001)||resumed<.001||muted>.001||paused>.001||errors.length||!report.debugRemoved)process.exit(1);
