"""Compose actual-garden one-lap views, fixed camera per width; no simulation.
uv run --project analysis --with pillow python analysis/experiments/day3_layered_compose.py RENDERDIR OUTDIR
"""
import argparse
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

def main():
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('render',type=Path);a.add_argument('out',type=Path);p=a.parse_args();p.out.mkdir(parents=True,exist_ok=True)
    font=ImageFont.load_default(size=20);seeds=[6,2,3,9,10,12]
    for w in [160,66]:
        tw,th=(600,372) if w==160 else (390,640)
        for age in [100,150]:
            sheet=Image.new('RGB',(tw*6,th*2+90),'white');d=ImageDraw.Draw(sheet)
            d.text((10,5),f'Width {w}, age {age}: current (top) / fixed A6b layered wood (bottom)',font=font,fill='#202020')
            for row,c in enumerate(['current','base']):
                for col,seed in enumerate(seeds):
                    img=Image.open(p.render/f'w{w}'/f'{c}-w{w}-s{seed}-{age}-on.png').convert('RGB')
                    img=img.resize((tw,th),Image.Resampling.LANCZOS);x=col*tw;y=35+row*(th+10);sheet.paste(img,(x,y));d.text((x+5,y+4),f'{c} seed {seed}',font=font,fill='#202020')
            d.text((10,th*2+58),'Fixed opening seeds; one periodic lap at common mature zoom. Tops may crop as in the garden. Look is not validation.',font=font,fill='#555555')
            sheet.save(p.out/f'layered-w{w}-age{age}.jpg',quality=88)
if __name__=='__main__':main()
