import {chromium} from '@playwright/test';import fs from 'node:fs';
const b=await chromium.launch();try{
const p=await b.newPage();await p.goto('http://127.0.0.1:5188');
const renders=await p.evaluate(async()=>{
 const New=await import('/src/game/audio.ts'),Old=await import('/art/audio-source/v7/audio-before.ts');const outputs=[];
 for(const [name,Mixer] of [['before',Old.AudioMixer],['after',New.AudioMixer]]){
  const rate=44100,seconds=22,ctx=new OfflineAudioContext(2,rate*seconds,rate),m=new Mixer(ctx,2048);m.configure(true,false,.75,.42);if(m.loadSamples)await m.loadSamples();
  const heroes=['gunner','knight','frost','engineer','reaper'];
  for(const [i,hero] of heroes.entries()){const t=.5+i*4;for(let j=0;j<3;j++)m.play('attack:'+hero,t+j*.34,{x:420+j*80,y:325});m.play('core:'+hero,t+1.2);m.play('skill:'+hero,t+1.8);m.play('ultimate:'+hero,t+2.6);}
  m.play('parry',20.5);m.play('hurt',21.2);
  const buffer=await ctx.startRendering();outputs.push({name,rate,channels:[...Array(2)].map((_,i)=>Array.from(buffer.getChannelData(i))),stats:m.stats()});
 }return outputs;
});
const report=[];
for(const r of renders){const n=r.channels[0].length,wav=Buffer.alloc(44+n*4);wav.write('RIFF');wav.writeUInt32LE(36+n*4,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(r.rate,24);wav.writeUInt32LE(r.rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*4,40);
let peak=0,sum=0;for(let i=0;i<n;i++)for(let c=0;c<2;c++){const x=r.channels[c][i];peak=Math.max(peak,Math.abs(x));sum+=x*x;wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+(i*2+c)*2);}
fs.writeFileSync(`evidence/audio-v7-${r.name}.wav`,wav);report.push({name:r.name,seconds:n/r.rate,peak,rms:Math.sqrt(sum/(n*2)),stats:r.stats});}
fs.writeFileSync('evidence/audio-v7-ab.json',JSON.stringify(report,null,2));console.log(report);if(report.some(r=>r.peak>=.99)||report[1].stats.samplesLoaded!==25||report[1].stats.failedSamples.length)process.exitCode=1;
}finally{await b.close();}
