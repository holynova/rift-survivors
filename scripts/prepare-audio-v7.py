"""Curate licensed Kenney samples into short, softly filtered, peak-matched PCM assets."""
from pathlib import Path
import json,subprocess,wave,struct,math,concurrent.futures
root=Path(__file__).resolve().parents[1];raw=root/'art/audio-source/v7';out=root/'public/assets/audio/v7';out.mkdir(parents=True,exist_ok=True)
selections=[]
def add(key,pack,file,duration,cutoff=6500):selections.append(dict(key=key,pack=pack,file=file,duration=duration,cutoff=cutoff))
for i in range(3):
 add(f'gun-{i}','sci-fi-sounds',f'explosionCrunch_{i:03d}.ogg',.24,4200)
 add(f'ice-{i}','impact-sounds',f'impactGlass_medium_{i:03d}.ogg',.6,5400)
 add(f'punch-{i}','impact-sounds',f'impactPunch_medium_{i:03d}.ogg',.25,3800)
 add(f'metal-{i}','impact-sounds',f'impactMetal_light_{i:03d}.ogg',.3,4800)
for i,file in enumerate(['knifeSlice.ogg','knifeSlice2.ogg']):add(f'blade-{i}','rpg-audio',file,.42,5500)
for i in range(2):
 add(f'cloth-{i}','rpg-audio',f'cloth{i+1}.ogg',.35,4600)
 add(f'heavy-{i}','impact-sounds',f'impactPunch_heavy_{i:03d}.ogg',.38,2400)
 add(f'boom-{i}','sci-fi-sounds',f'lowFrequency_explosion_{i:03d}.ogg',1.1,3000)
 add(f'energy-{i}','sci-fi-sounds',f'forceField_{i:03d}.ogg',.75,3800)
add('gear','rpg-audio','metalLatch.ogg',.32,4200)
add('coin','rpg-audio','handleCoins.ogg',.5,5500)
add('bell','impact-sounds','impactBell_heavy_000.ogg',.75,4200)
def process(spec):
 source=next(raw.joinpath(spec['pack']).rglob(spec['file']));dest=out/(spec['key']+'.wav');duration=spec['duration']
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-af',f'highpass=f=55,lowpass=f={spec["cutoff"]},silenceremove=start_periods=1:start_duration=0.002:start_threshold=-50dB,atrim=duration={duration},afade=t=in:d=0.002,afade=t=out:st={duration-.025}:d=0.025','-ar','44100','-ac','1','-c:a','pcm_s16le',str(dest)],check=True)
 with wave.open(str(dest),'rb') as f:params=f.getparams();data=f.readframes(f.getnframes())
 values=struct.unpack('<'+'h'*(len(data)//2),data);peak=max(map(abs,values))
 if peak<10:raise ValueError('Silent sample '+spec['key'])
 gain=min(4,23197/peak);samples=[round(v*gain) for v in values]
 # Fade actual tail too, including source clips shorter than requested duration.
 n=min(1102,len(samples)//5)
 for i in range(n):samples[-n+i]=round(samples[-n+i]*(n-i)/n)
 with wave.open(str(dest),'wb') as f:f.setparams(params);f.writeframes(struct.pack('<'+'h'*len(samples),*samples))
 return {**spec,'source':str(source.relative_to(root)),'output':str(dest.relative_to(root)),'bytes':dest.stat().st_size,'seconds':len(samples)/44100,'peak':max(map(abs,samples))/32768,'rms':math.sqrt(sum(v*v for v in samples)/len(samples))/32768}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:records=list(ex.map(process,selections))
(raw/'selection.json').write_text(json.dumps(records,indent=2)+'\n')
(root/'src/game/audio-bank.ts').write_text('// Curated Kenney CC0 samples. Provenance: art/audio-source/v7/selection.json\nexport const audioSamples = '+json.dumps({r['key']:'assets/audio/v7/'+r['key']+'.wav' for r in records},indent=2)+' as const;\n')
license_out=root/'public/assets/audio/v7/LICENSE.txt'
license_out.write_text('Kenney audio samples, Creative Commons CC0 1.0.\nSources:\nhttps://kenney.nl/assets/impact-sounds\nhttps://kenney.nl/assets/rpg-audio\nhttps://kenney.nl/assets/sci-fi-sounds\nhttps://creativecommons.org/publicdomain/zero/1.0/\nTrimmed, filtered, resampled and gain matched by this project.\n')
print({'samples':len(records),'bytes':sum(r['bytes'] for r in records)})
