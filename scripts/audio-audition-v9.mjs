import {chromium} from '@playwright/test';import fs from 'node:fs';
const b=await chromium.launch();try{
 const p=await b.newPage();await p.goto('http://127.0.0.1:5188');
 const render=await p.evaluate(async()=>{
  const {AudioMixer}=await import('/src/game/audio.ts');const rate=32000,seconds=32,ctx=new OfflineAudioContext(2,rate*seconds,rate),m=new AudioMixer(ctx,128);m.configure(false,true,.75,.42);await m.loadSamples();
  for(let i=0;i<320;i++){const t=i/10;m.update({phase:'battle',wave:[1,4,8,12][Math.floor(t/8)],hero:'gunner',danger:false},t);}
  const buffer=await ctx.startRendering();const pcm=new Int16Array(buffer.length*2);const segments=[];let peak=0,sum=0;
  for(let i=0;i<buffer.length;i++)for(let c=0;c<2;c++){const x=buffer.getChannelData(c)[i];peak=Math.max(peak,Math.abs(x));sum+=x*x;pcm[i*2+c]=Math.round(Math.max(-1,Math.min(1,x))*32767);}
  for(let stage=0;stage<4;stage++){let e=0;for(let i=stage*rate*8;i<(stage+1)*rate*8;i++)e+=buffer.getChannelData(0)[i]**2;segments.push(Math.sqrt(e/(rate*8)));}
  const bytes=new Uint8Array(pcm.buffer);let str='';for(let i=0;i<bytes.length;i+=16384)str+=String.fromCharCode(...bytes.subarray(i,i+16384));return {pcm:btoa(str),rate,seconds,peak,rms:Math.sqrt(sum/(buffer.length*2)),segments,stats:m.stats()};
 });
 const pcm=Buffer.from(render.pcm,'base64'),wav=Buffer.alloc(44+pcm.length);wav.write('RIFF');wav.writeUInt32LE(36+pcm.length,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(render.rate,24);wav.writeUInt32LE(render.rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);fs.writeFileSync('evidence/audio-v9-score.wav',wav);delete render.pcm;fs.writeFileSync('evidence/audio-v9-report.json',JSON.stringify(render,null,2));console.log(render);if(render.peak>=.99||render.segments.some(r=>r<.005)||render.stats.failedMusicTracks.length)throw new Error('Audio render verification failed');
}finally{await b.close();}
