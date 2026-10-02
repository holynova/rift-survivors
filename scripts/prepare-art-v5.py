"""Normalize whole-strip imagegen outputs; retain sources and per-frame audit data."""
from pathlib import Path
from PIL import Image
import json,subprocess
root=Path(__file__).resolve().parents[1]
plugin=Path('/Users/sym/.codex/plugins/cache/openai-curated-remote/game-studio/0.1.2/scripts')
source=root/'art/source/v5';out=root/'public/assets/v5';out.mkdir(parents=True,exist_ok=True)
specs=json.loads((root/'art/animation-specs-v5.json').read_text());records=[]
for spec in specs:
 name=spec['id'];size=spec['size'];n=spec['frames'];target=root/'art/frames/v5'/name
 subprocess.run(['python3',str(plugin/'normalize_sprite_strip.py'),'--input',str(source/f'{name}.png'),'--out-dir',str(target),'--frames',str(n),'--frame-size',str(size)],check=True,stdout=subprocess.DEVNULL)
 frames=[Image.open(target/f'{i:02d}.png').convert('RGBA') for i in range(1,n+1)]
 atlas=Image.new('RGBA',(size*n,size))
 for i,frame in enumerate(frames):
  if not frame.getchannel('A').getbbox():raise ValueError(f'Empty {name} frame {i}')
  atlas.alpha_composite(frame,(i*size,0))
 atlas.save(out/f'{name}.png',optimize=True);frames[0].save(out/f'{name.removesuffix("-run") + "-idle"}.png',optimize=True)
 subprocess.run(['python3',str(plugin/'render_sprite_preview_sheet.py'),'--frames-dir',str(target),'--out',str(root/f'art/previews/v5-{name}.png'),'--columns',str(n)],check=True,stdout=subprocess.DEVNULL)
 records.append({'name':name,'frames':n,'frameSize':size,'bboxes':[f.getchannel('A').getbbox() for f in frames],'uniqueFrames':len(set(f.tobytes() for f in frames))})
def normalize(im,size,pad):
 im=im.convert('RGBA');box=im.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox();im=im.crop(box);im.thumbnail((size-pad*2,size-pad*2),Image.Resampling.LANCZOS);frame=Image.new('RGBA',(size,size));frame.alpha_composite(im,((size-im.width)//2,size-pad-im.height));return frame
normalize(Image.open(source/'turret.png'),128,8).save(out/'turret.png',optimize=True)
im=Image.open(source/'new-skill-icons-clean.png').convert('RGBA');cw=im.width/3;ch=im.height/3
names=['frost-step','frost-zone','frost-bolt','engineer-swap','engineer-turret','engineer-army','reaper-dash','reaper-drain','reaper-harvest']
for i,name in enumerate(names):
 cell=im.crop((round((i%3)*cw),round((i//3)*ch),round((i%3+1)*cw),round((i//3+1)*ch)))
 normalize(cell,96,8).save(out/f'icon-{name}.png',optimize=True)
files=[{'file':p.name,'bytes':p.stat().st_size,'size':Image.open(p).size} for p in sorted(out.glob('*.png'))]
(root/'art/previews/asset-check-v5.json').write_text(json.dumps({'animations':records,'textures':files,'totalBytes':sum(f['bytes'] for f in files)},indent=2))
print({'newFrames':sum(s['frames'] for s in specs),'textures':len(files),'bytes':sum(f['bytes'] for f in files)})
