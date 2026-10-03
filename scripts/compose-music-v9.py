"""Original 16-bar fantasy arena score. Generated instruments; no third-party audio.
Requires numpy. Exports loop-ready PCM masters and browser AAC files using ffmpeg.
"""
import numpy as np, wave, subprocess, json
from pathlib import Path
SR=32000
rng=np.random.default_rng(9302026)
def hz(m):return 440*2**((m-69)/12)
def instrument(note,dur,voice):
 t=np.arange(round(dur*SR))/SR;f=hz(note);x=np.zeros(len(t))
 if voice=='pluck':
  for h in range(1,12):x+=np.sin(2*np.pi*f*h*(1+.00016*h*h)*t+h*.19)*np.exp(-t*(1.4+h*.35))/(h**1.2)
  x*=np.minimum(1,t/.007)
 elif voice=='bow':
  phase=2*np.pi*f*t+.018*f*np.sin(2*np.pi*4.8*t)/(4.8)
  for h in range(1,9):x+=np.sin(phase*h+.13*h)/h**1.55
  x*=np.minimum(1,t/.24)*np.minimum(1,(dur-t)/.32)*(.9+.04*np.sin(2*np.pi*2.1*t))
 elif voice=='bell':
  for h,g,d in [(1,1,1.3),(2.01,.3,2),(3.98,.13,3),(5.1,.07,5)]:x+=g*np.sin(2*np.pi*f*h*t)*np.exp(-t*d)
  x*=np.minimum(1,t/.005)
 elif voice=='bass':
  x=(np.sin(2*np.pi*f*t)+.35*np.sin(4*np.pi*f*t)+.12*np.sin(6*np.pi*f*t))*np.exp(-t*3)*np.minimum(1,t/.018)
 x*=np.minimum(1,np.maximum(0,(dur-t)/.025));return x*.28
cache={}
def sound(note,dur,voice):
 k=(note,round(dur,3),voice)
 if k not in cache:cache[k]=instrument(note,dur,voice)
 return cache[k]
def drum(kind):
 dur=.6 if kind=='low' else .32;t=np.arange(round(dur*SR))/SR
 n=rng.normal(0,1,len(t));smooth=np.convolve(n,np.ones(12)/12,mode='same')
 if kind=='low':x=np.sin(2*np.pi*(49*t+50*(1-np.exp(-t*18))/18))*np.exp(-t*12)+smooth*.2*np.exp(-t*30)
 elif kind=='rim':x=(n*.23+np.sin(2*np.pi*185*t)*.32)*np.exp(-t*24)
 else:x=(n-smooth)*.13*np.exp(-t*45)
 return x*.4
kit={k:drum(k) for k in ['low','rim','hat']}
tracks=[('first-light',108,0),('iron-march',118,1),('rift-storm',128,2),('last-guardian',136,3)]
masters=Path('work/music-v9');masters.mkdir(parents=True,exist_ok=True)
public=Path('public/assets/audio/v9');public.mkdir(parents=True,exist_ok=True)
reports=[]
# D minor, Bb, F, C; second half varies voicing and introduces a countermelody.
roots=[50,46,53,48,50,46,43,45,50,46,53,48,55,46,43,45]
melody=[0,7,10,12,7,5,3,2,0,3,7,5,2,0,-2,0]
for name,bpm,intensity in tracks:
 beat=60/bpm;duration=16*4*beat;length=round(duration*SR);mix=np.zeros((length,2))
 def add(x,at,gain=1,pan=0):
  start=round(at*SR);a=np.cos((pan+1)*np.pi/4)*gain;b=np.sin((pan+1)*np.pi/4)*gain
  # Circular tails make the loop boundary continuous without cutting reverb.
  indexes=(np.arange(len(x))+start)%length
  np.add.at(mix[:,0],indexes,x*a);np.add.at(mix[:,1],indexes,x*b)
 for bar,root in enumerate(roots):
  at=bar*4*beat;minor=bar%8 in [0,6,7] or bar==12;third=3 if minor else 4
  for j,note in enumerate([root,root+third,root+7]):add(sound(note+12,4*beat+.35,'bow'),at,.15 if intensity<2 else .2,[-.65,.15,.65][j])
  for step in range(8):
   note=root+12+[0,7,12,third+12,7,12,third+12,7][step]
   add(sound(note,beat*1.6,'pluck'),at+step*beat/2,.37 if intensity==0 else .43,(-.35 if step%2 else .35))
  for k in range(4):
   add(sound(root-12+(7 if k==3 and intensity>0 else 0),beat*.85,'bass'),at+k*beat,.9)
   if k%2==0 or intensity>=1:add(kit['low'],at+k*beat,.8 if intensity<2 else 1)
   if k in [1,3]:add(kit['rim'],at+k*beat,.6,-.12)
   if intensity>=1 or k%2==0:add(kit['hat'],at+k*beat+beat*.5,.55,.35)
  if bar%4>=1 or intensity>=1:
   for k in range(4):
    note=root+24+melody[(bar*3+k)%len(melody)]
    add(sound(note,beat*1.7,'bell'),at+k*beat+beat*.05,.17 if intensity<2 else .21,.2)
  if intensity>=2:
   for k in [1,3,5,7]:add(sound(root+12+[0,7,3,7][k//2],beat*.7,'pluck'),at+k*beat/2,.2,-.5)
  if intensity==3 and bar%4==3:
   for k in range(6):add(kit['low'],at+3*beat+k*beat/6,.5+k*.06)
 # Stereo early reflections and a diffuse tail; wrap keeps tails across loop boundary.
 dry=mix.copy()
 for delay,gain in [(.071,.13),(.137,.10),(.223,.075),(.389,.055),(.613,.035)]:mix+=np.roll(dry[:,::-1],round(delay*SR),axis=0)*gain
 mix=np.tanh(mix*1.1);peak=float(np.max(np.abs(mix)));mix*=.72/max(peak,.01)
 pcm=(mix*32767).astype('<i2');master=masters/(name+'.wav')
 with wave.open(str(master),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
 output=public/(name+'.m4a')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(master),'-c:a','aac','-b:a','144k','-movflags','+faststart',str(output)],check=True)
 reports.append({'id':name,'bpm':bpm,'bars':16,'duration':duration,'peak':float(np.max(np.abs(mix))),'rms':float(np.sqrt(np.mean(mix**2))),'bytes':output.stat().st_size,'composer':'Original code-authored score and synthesized instrument samples'})
(public/'manifest.json').write_text(json.dumps({'tracks':reports,'source':'scripts/compose-music-v9.py','license':'Original project composition; no external music samples.'},indent=2))
print(json.dumps(reports,indent=2))
