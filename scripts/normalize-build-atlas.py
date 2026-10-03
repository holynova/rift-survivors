"""Normalize an AI sprite atlas into padded individual alpha sprites. No repainting."""
import argparse,json
from pathlib import Path
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('target');p.add_argument('--columns',type=int,required=True);p.add_argument('--ids',required=True);a=p.parse_args()
ids=a.ids.split(',');rows=(len(ids)+a.columns-1)//a.columns
src=Image.open(a.source).convert('RGBA');out=Path(a.target);out.mkdir(parents=True,exist_ok=True)
report=[]
for i,id in enumerate(ids):
 col=i%a.columns;row=i//a.columns
 tile=src.crop((round(col*src.width/a.columns),round(row*src.height/rows),round((col+1)*src.width/a.columns),round((row+1)*src.height/rows)))
 # The alpha channel identifies the object; use one padded display scale per square tile.
 box=tile.getchannel('A').getbbox()
 if not box:raise ValueError('Empty tile '+id)
 tile=tile.crop(box);tile.thumbnail((108,108),Image.Resampling.LANCZOS)
 result=Image.new('RGBA',(128,128));result.alpha_composite(tile,((128-tile.width)//2,(128-tile.height)//2));result.save(out/(id+'.png'),optimize=True)
 report.append({'id':id,'alphaBounds':box,'size':[tile.width,tile.height],'file':id+'.png'})
(out/'atlas.json').write_text(json.dumps({'source':a.source,'grid':[a.columns,rows],'sourceSize':list(src.size),'sprites':report},indent=2))
print(src.size,len(ids))
