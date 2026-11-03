"""Stems and bark (2026-11-03): contact sheets of a set's renders, rows by condition, columns lone 60,
lone 100 and stand 100 at the set's seeds, every plate shrunk by one factor (v3's one scale kept).

    uv run --project analysis python sheet.py <renders> <out.jpg> <row,row,...> [seeds]

TRIALS (a comma list) narrows the columns. A row is a render tag (beechM, beechC, hornbeamIk145, ...); a missing plate leaves its cell blank.
"""

import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

renders, out, rows = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3].split(",")
seeds = [int(s) for s in (sys.argv[4] if len(sys.argv) > 4 else "1,2,3").split(",")]
F = 0.4  # one factor for every plate
trials = os.environ.get("TRIALS", "lone60,lone100,stand100").split(",")
cols = [(t, s) for t in trials for s in seeds]
W = {"lone60": int(666 * F), "lone100": int(666 * F), "stand100": int(234 * F)}
H, PAD, LEFT, TOP = int(654 * F), 6, 150, 24
width = LEFT + sum(W[t] + PAD for t, _ in cols)
sheet = Image.new("RGB", (width, TOP + len(rows) * (H + PAD)), "white")
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("DejaVuSans.ttf", 13)
except OSError:
    font = ImageFont.load_default()
x = LEFT
for t, s in cols:
    d.text((x + 2, 4), f"{t} · {s}", fill="black", font=font)
    x += W[t] + PAD
for i, row in enumerate(rows):
    y = TOP + i * (H + PAD)
    d.text((6, y + H // 2 - 7), row, fill="black", font=font)
    x = LEFT
    for t, s in cols:
        f = renders / f"{row}-{t}-s{s}.png"
        if f.exists():
            sheet.paste(Image.open(f).convert("RGB").resize((W[t], H)), (x, y))
        x += W[t] + PAD
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out, quality=85)
print(out, sheet.size)
