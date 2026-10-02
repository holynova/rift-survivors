import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true});const page=await browser.newPage();await page.goto('http://127.0.0.1:5188');
const rendered=await page.evaluate(async()=>{
 const {AudioMixer}=await import('/src/game/audio.ts');const sampleRate=22050,seconds=18,ctx=new OfflineAudioContext(2,sampleRate*seconds,sampleRate),mix=new AudioMixer(ctx,2048);mix.configure(true,true,0.75,0.42);
 for(let i=0;i<170;i++){const t=i/10;mix.update({phase:'battle',wave:t<8?2:8,hero:'gunner',danger:false},t);}
 const heroes=['gunner','knight','frost','engineer','reaper'];for(let i=0;i<heroes.length;i++){const at=1+i*3;mix.play('attack:'+heroes[i],at);mix.play('core:'+heroes[i],at+0.6);mix.play('ultimate:'+heroes[i],at+1.3);}
 const buffer=await ctx.startRendering();const channels=[...Array(buffer.numberOfChannels)].map((_,i)=>Array.from(buffer.getChannelData(i)));
 return {sampleRate,channels};
});
const n=rendered.channels[0].length,b=Buffer.alloc(44+n*4);b.write('RIFF',0);b.writeUInt32LE(36+n*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(rendered.sampleRate,24);b.writeUInt32LE(rendered.sampleRate*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
let peak=0,sum=0;for(let i=0;i<n;i++)for(let c=0;c<2;c++){const x=rendered.channels[c][i];peak=Math.max(peak,Math.abs(x));sum+=x*x;b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+(i*2+c)*2);}
fs.writeFileSync('evidence/audio-v6-preview.wav',b);const report={seconds:n/rendered.sampleRate,sampleRate:rendered.sampleRate,peak,rms:Math.sqrt(sum/(n*2)),clipped:peak>=1,note:'Offline rendering of actual original procedural music and five hero effects. Live scheduling tested separately.'};fs.writeFileSync('evidence/audio-v6-report.json',JSON.stringify(report,null,2));console.log(report);await browser.close();
