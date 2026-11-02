"""The blind test v3's contact sheet: a row per source, columns lone 60, lone 100 and stand 100 by
seed 1–3, from the renders shots.mjs wrote. Every plate is shrunk by the same factor, so the sheet
keeps the plates' one scale (a lone plate is the 240-cell field, a stand plate one 84-cell lap).

    uv run --project analysis python docs/experiments/code/2026-11-02-blind-test-v3/sheet.py <renders-dir> <out.jpg> [sources]

[sources] is a comma list of the rows to draw (default: all six), e.g. "beech,clearbole" for the
addendum's sheet, its renders folder holding the baseline's beech-*.png and the clearBole plates
renamed clearbole-*.png.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

renders, out = Path(sys.argv[1]), Path(sys.argv[2])
LABELS = {
    "beech": "beech (accepted)",
    "today": "beech (today)",
    "hornbeam": "hornbeam",
    "oak": "oak",
    "birch": "birch",
    "fir": "silver fir",
    "clearbole": "beech, clearBole",
    "bark": "beech, measured bark",
    "candidate": "beech, all three",
}
SOURCES = sys.argv[3].split(",") if len(sys.argv) > 3 else ["beech", "today", "hornbeam", "oak", "birch", "fir"]
TRIALS = [("lone60", "lone 60"), ("lone100", "lone 100"), ("stand100", "stand 100")]
TRIALS = [t for t in TRIALS if any((renders / f"{s}-{t[0]}-s1.png").exists() for s in SOURCES)]
F, GAP, LEFT, TOP = 0.4, 6, 190, 44
font = ImageFont.load_default(size=16)
# Column widths from the first source's plates (all plates of a trial share a width).
cols = []
for trial, label in TRIALS:
    w, h = Image.open(next(renders / f"{s}-{trial}-s1.png" for s in SOURCES if (renders / f"{s}-{trial}-s1.png").exists())).size
    cols += [(trial, label, k, round(w * F), round(h * F)) for k in (1, 2, 3)]
H = max(c[4] for c in cols)
sheet = Image.new("RGB", (LEFT + sum(c[3] + GAP for c in cols), TOP + (H + GAP) * len(SOURCES)), "white")
d = ImageDraw.Draw(sheet)
x = LEFT
for trial, label, k, w, h in cols:
    d.text((x + 4, 12), f"{label} · {k}" if w < 200 else f"{label} · seed {k}", fill="black", font=font)
    for i, src in enumerate(SOURCES):
        f = renders / f"{src}-{trial}-s{k}.png"
        if f.exists():
            im = Image.open(f).convert("RGB")
            sheet.paste(im.resize((round(im.width * F), round(im.height * F))), (x, TOP + i * (H + GAP)))
    x += w + GAP
for i, src in enumerate(SOURCES):
    d.text((8, TOP + i * (H + GAP) + H // 2 - 8), LABELS[src], fill="black", font=font)
sheet.save(out, quality=85)
print(out, sheet.size)
