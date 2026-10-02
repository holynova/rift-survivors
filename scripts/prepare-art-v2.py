"""Normalize generated assets without changing their designs; retain original sources."""
from pathlib import Path
from PIL import Image
import json, shutil
root=Path(__file__).resolve().parents[1]
source=root/'art/source/v2';out=root/'public/assets/v2';out.mkdir(parents=True,exist_ok=True)
framesroot=root/'art/frames/v2';framesroot.mkdir(parents=True,exist_ok=True)
def bbox(im, threshold=12):
 return im.getchannel('A').point(lambda a:255 if a>threshold else 0).getbbox()
def normalize(im,size,pad=8):
 im=im.convert('RGBA');b=bbox(im);im=im.crop(b) if b else im
 im.thumbnail((size-pad*2,size-pad*2),Image.Resampling.LANCZOS)
 frame=Image.new('RGBA',(size,size));frame.alpha_composite(im,((size-im.width)//2,size-pad-im.height));return frame
# Normalize strips once with shared scale using the plugin's pipeline, before this pack step.
for hero in ['gunner','knight']:
 old=out/f'{hero}-run';target=framesroot/f'{hero}-run'
 if old.exists() and not target.exists():shutil.move(str(old),target)
 frames=[Image.open(target/f'{i:02d}.png').convert('RGBA') for i in range(1,7)]
 atlas=Image.new('RGBA',(128*6,128));
 for i,frame in enumerate(frames):atlas.alpha_composite(frame,(i*128,0))
 atlas.save(out/f'{hero}-run.png',optimize=True)
 frames[0].save(out/f'{hero}-idle.png',optimize=True)
 normalize(Image.open(root/f'public/assets/{hero}.png'),256,12).save(out/f'{hero}-portrait.png',optimize=True)
for name in ['husk','runner','archer','elite','boss']:
 normalize(Image.open(source/f'enemy-{name}.png'),192 if name=='boss' else 128,10).save(out/f'enemy-{name}.png',optimize=True)
floor=Image.open(source/'arena-floor.png').convert('RGB').resize((1100,650),Image.Resampling.LANCZOS)
floor.save(out/'arena-floor.webp',quality=90,method=6)
for atlas, names in [('relic-icons',['stone','feather','ruby','wall','magnet','leech']),('skill-icons',['blink','recall','pulse','roll','parry','storm'])]:
 if not (source/f'{atlas}.png').exists():continue
 im=Image.open(source/f'{atlas}.png').convert('RGBA');cw=im.width/3;ch=im.height/2
 for i,name in enumerate(names):
  cell=im.crop((round((i%3)*cw),round((i//3)*ch),round((i%3+1)*cw),round((i//3+1)*ch)))
  normalize(cell,96,8).save(out/f'icon-{name}.png',optimize=True)
metrics=[]
for p in sorted(out.glob('*.png')):
 im=Image.open(p);metrics.append({'file':p.name,'size':im.size,'bytes':p.stat().st_size,'alpha':im.getchannel('A').getextrema(),'bbox':bbox(im)})
(root/'art/previews/asset-check-v2.json').write_text(json.dumps(metrics,indent=2))
print(f'Normalized {len(metrics)} textures, packed two six-frame strips; floor WebP { (out/"arena-floor.webp").stat().st_size } bytes')
