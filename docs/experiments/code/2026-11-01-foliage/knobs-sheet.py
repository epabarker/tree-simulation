"""Track C step 3: the knob sheet from knobs.mjs's shots and knobs-<seasons>.json.

    uv run --project analysis python docs/experiments/code/2026-11-01-foliage/knobs-sheet.py \
        runs/knobs 40 docs/experiments/figures/2026-11-01-foliage-knobs.jpg
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, seasons, out = sys.argv[1:4]
data = json.loads((Path(src) / f"knobs-{seasons}.json").read_text())["settings"]
order = ["opacity-0.7", "default", "opacity-1", "minpx-0", "minpx-6"]
font = ImageFont.load_default(size=20)
W = 390
ims = []
for name in order:
    im = Image.open(Path(src) / f"knobs-{seasons}-{name}.png").convert("RGB")
    ims.append(im.resize((W, round(im.height * W / im.width)), Image.LANCZOS))
head = 96
sheet = Image.new("RGB", (len(ims) * (W + 8) + 8, ims[0].height + head + 8), "white")
d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(zip(order, ims)):
    x = 8 + i * (W + 8)
    s = data[name]
    c = s["coverage"]
    d.text((x, 6), f"opacity {s['leafOpacity']}, min {s['leafMinPx']} px", fill="black", font=font)
    d.text((x, 32), f"leaf pixels {c['pixelCover']:.3f} (upper {c['pixelCoverHigh']:.3f})", fill="black", font=font)
    d.text((x, 58), f"cells {c['coverLow']:.2f} / {c['coverHigh']:.2f}, {c['perCellHigh']} a cell", fill="black", font=font)
    sheet.paste(im, (x, head))
sheet.save(out, quality=86)
print("wrote", out, sheet.size)
