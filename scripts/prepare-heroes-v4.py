from pathlib import Path
from PIL import Image
import json,math
root=Path('public/assets/v4');root.mkdir(exist_ok=True)
for id in ['frost','engineer','reaper']:
 im=Image.open(f'art/source/v4/{id}.png').convert('RGBA');im=im.crop(im.getchannel('A').point(lambda a:255 if a>12 else 0).getbbox())
 for suffix,size,pad in [('idle',128,8),('portrait',256,16)]:
  out=Image.new('RGBA',(size,size));art=im.copy();art.thumbnail((size-pad*2,size-pad*2),Image.Resampling.LANCZOS);out.alpha_composite(art,((size-art.width)//2,size-pad-art.height));out.save(root/f'{id}-{suffix}.png')
paths={
'frost-step':'<path d="M15 56h30m-8-8 8 8-8 8M53 24v44m-19-33 38 22M34 57l38-22M45 28l8 8 8-8M45 64l8-8 8 8"/>',
'frost-zone':'<ellipse cx="48" cy="65" rx="31" ry="13"/><path d="M48 22v39M31 31l34 22M31 53l34-22M42 26l6 6 6-6M42 57l6-6 6 6"/>',
'frost-bolt':'<path d="m46 13-8 32 10 13 10-13-8-32zM25 37l-6 22 7 12 7-12-6-22zM70 37l-6 22 7 12 7-12-6-22zM48 59v23"/>',
'engineer-swap':'<path d="M20 33h49m-10-10 10 10-10 10M76 63H27m10-10L27 63l10 10"/><circle cx="22" cy="64" r="8"/><circle cx="74" cy="32" r="8"/>',
'engineer-turret':'<path d="M28 71V48l10-10h22l9 10v23zM48 38V22h28v10H57v15M21 76h55M35 50v13M61 50v13"/><circle cx="48" cy="56" r="6"/>',
'engineer-army':'<path d="M33 71V41h30v30zM48 42V20h20v10H56v15M13 68V50h14v18M21 50V38h10M70 68V50h14v18M77 50V38h-9M26 78h44"/><circle cx="48" cy="55" r="6"/>',
'reaper-dash':'<path d="m72 18-9 29-29 21 10-27zM34 63l-8 13M24 57l16 17M14 36h24M10 48h20"/>',
'reaper-drain':'<path d="M48 17S25 47 25 59a23 23 0 0 0 46 0c0-12-23-42-23-42zM48 47v22M37 58h22"/>',
'reaper-harvest':'<path d="m22 18 14 29 27 18-8-28zM74 18 60 47 33 65l8-28zM25 64l10 12M61 76l10-12M18 59l18 21M60 80l18-21"/>',
}
for name,shape in paths.items():
 color='#a3e6ff' if name.startswith('frost') else '#e8c66e' if name.startswith('engineer') else '#ee8aa5'
 root.joinpath(f'icon-{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="40" fill="#18271f" stroke="{color}" stroke-opacity=".25"/><g fill="none" stroke="#121b19" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">{shape}</g><g fill="none" stroke="{color}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">{shape}</g></svg>')
checks=[{'file':str(p),'bytes':p.stat().st_size} for p in sorted(root.glob('*'))]
Path('art/previews/asset-check-v4.json').write_text(json.dumps(checks,indent=2))
