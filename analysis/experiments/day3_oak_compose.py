"""Shared sheet scale and composition for registered step5 snapshots.
uv run --project analysis --with pillow python analysis/experiments/day3_oak_compose.py scale|compose SNAPDIR RENDERDIR OUTDIR
"""
import argparse,json
from pathlib import Path
import numpy as np

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['scale','compose']);p.add_argument('snap',type=Path);p.add_argument('render',type=Path);p.add_argument('out',type=Path);a=p.parse_args()
    if a.mode=='scale':
        top=half=0.
        for f in a.snap.glob('*.bin'):
            head=json.loads(f.with_suffix('.json').read_text());b=f.read_bytes();ctors={'Float32Array':np.float32,'Float64Array':np.float64,'Int32Array':np.int32,'Uint8Array':np.uint8}
            s={k:v['v'] if 'v'in v else np.frombuffer(b,ctors[v['t']],v['len'],v['off']) for k,v in head.items()}
            x=s['x0']+s['dirX']*s['length'];y=s['y0']+s['dirY']*s['length']
            top=max(top,float(np.max(y)));half=max(half,float(np.max(np.abs(x-s['width']/2))))
        (a.snap/'scale.json').write_text(json.dumps({'scale':min(590/(2*half),496/top),'maxTipY':top,'maxRootSideExtent':half,'tiles':[600,520]},indent=2)+'\n');return
    from PIL import Image,ImageDraw,ImageFont
    a.out.mkdir(parents=True,exist_ok=True)
    font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
    for leaves in ['on','off']:
        for age in [100,150]:
            sheet=Image.new('RGB',(2400,1120),'white');d=ImageDraw.Draw(sheet)
            d.text((12,8),f'Oak, age {age}: current (top) / N3 T55p25 (bottom) — leaves {leaves}',fill='#202020',font=font)
            for col,seed in enumerate(range(10001,10005)):
                for row,c in enumerate(['current','n3']):
                    img=Image.open(a.render/f'{c}-{seed}-{age}-{leaves}.png').convert('RGB');x=col*600;y=40+row*540;sheet.paste(img,(x,y));d.text((x+10,y+5),f'{c} · seed {seed}',fill='#202020',font=font)
            d.text((12,1092),'Fixed first four fresh seeds; shared scale/view. User look decision, not biological validation.',fill='#555555',font=font)
            sheet.save(a.out/f'oak-n3-{age}-{leaves}.jpg',quality=90)
if __name__=='__main__':main()
