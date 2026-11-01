"""The blind test v2's contact sheet: a row per source, columns lone 60, lone 100 and stand 100 by
seed 1–3, from the renders shots.mjs wrote.

    uv run --project analysis python docs/experiments/code/2026-11-02-blind-test-v2/sheet.py <renders-dir> <out.jpg>
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

renders, out = Path(sys.argv[1]), Path(sys.argv[2])
SOURCES = [("beech", "beech (branch)"), ("today", "beech (today)"), ("hornbeam", "hornbeam"), ("oak", "oak"), ("birch", "birch"), ("fir", "silver fir")]
TRIALS = [("lone60", "lone 60"), ("lone100", "lone 100"), ("stand100", "stand 100")]
W, H, LEFT, TOP = 320, 187, 130, 44
font = ImageFont.load_default(size=16)
sheet = Image.new("RGB", (LEFT + W * 9, TOP + H * len(SOURCES)), "white")
d = ImageDraw.Draw(sheet)
for j, (trial, tlabel) in enumerate(TRIALS):
    for k in range(3):
        d.text((LEFT + (3 * j + k) * W + 8, 12), f"{tlabel} · seed {k + 1}", fill="black", font=font)
for i, (src, label) in enumerate(SOURCES):
    d.text((8, TOP + i * H + H // 2 - 8), label, fill="black", font=font)
    for j, (trial, _) in enumerate(TRIALS):
        for k in range(3):
            im = Image.open(renders / f"{src}-{trial}-s{k + 1}.png").convert("RGB").resize((W - 4, H - 4))
            sheet.paste(im, (LEFT + (3 * j + k) * W + 2, TOP + i * H + 2))
sheet.save(out, quality=85)
print(out, sheet.size)
