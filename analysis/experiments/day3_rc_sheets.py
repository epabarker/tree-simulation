"""Compose RC-only sheets from provenance-checked unchanged current renderings."""
import json,subprocess
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
from treesim.provenance import provenance,file_hash
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'runs/day3-step7/sheets'
old=ROOT/'runs/day3-step6'
assert json.loads((old/'snapshots/manifest.json').read_text())['source']['source_sha256']==provenance(ROOT)['source_sha256']
assert json.loads((old/'snapshots/manifest.json').read_text())['wasm_sha256']==file_hash(ROOT/'src/wasm/pkg/core_bg.wasm')
assert not subprocess.check_output(['git','diff','9ca76b2','--','src/web/render','analysis/experiments/day3_layered_sheet.mjs'],cwd=ROOT)
OUT.mkdir(parents=True,exist_ok=True)
font=ImageFont.load_default(size=20);records=[]
for w in [160,66]:
    tw,th=(600,372) if w==160 else (390,640)
    for age in [100,150]:
        sheet=Image.new('RGB',(tw*6,th+90),'white');d=ImageDraw.Draw(sheet)
        d.text((10,5),f'0.17.0 RC: retained current garden, width {w}, age {age}',font=font,fill='#202020')
        for col,seed in enumerate([6,2,3,9,10,12]):
            witness=old/'snapshots'/f'current-w{w}-s{seed}.witness.json'
            params=subprocess.check_output(['node',str(ROOT/'analysis/experiments/day3_layered_worker.ts'),'params','current',str(seed),str(w),'/dev/stdout'],cwd=ROOT,text=True)
            assert json.loads(params)==json.loads(witness.read_text())['params']
            image=old/'render'/f'w{w}'/f'current-w{w}-s{seed}-{age}-on.png'
            records.append({'image':str(image.relative_to(ROOT)),'sha256':file_hash(image),'witness_sha256':file_hash(witness)})
            x=col*tw;y=35
            sheet.paste(Image.open(image).convert('RGB').resize((tw,th),Image.Resampling.LANCZOS),(x,y))
            d.rectangle((x+2,y+2,x+105,y+29),fill='white');d.text((x+5,y+4),f'Seed {seed}',font=font,fill='#202020')
        d.text((10,th+52),'Opening seeds; one periodic lap; crowns may crop as in garden. Look materials, not validation or phone soak.',font=font,fill='#555555')
        sheet.save(OUT/f'rc-w{w}-age{age}.jpg',quality=88)
(OUT/'provenance.json').write_text(json.dumps({'source':provenance(ROOT),'reused_renderings':records},indent=2)+'\n')
