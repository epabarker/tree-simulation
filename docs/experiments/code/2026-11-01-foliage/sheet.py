"""Track C (foliage): the contact sheets from shots.mjs's screenshots, before and after.

    uv run --project analysis python docs/experiments/code/2026-11-01-foliage/sheet.py \
        runs/foliage before after docs/experiments/figures/2026-11-01-foliage-bark [species,...]

Writes <out>-phone.jpg (each species a row: lone 60 and stand 100 at the phone's size, before and
after, then the after's close look at the lone trunk) and <out>-laptop.jpg (lone 60 and stand 100
at the laptop's size, before over after, and the stand's close look).
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

src, before, after, out = sys.argv[1:5]
ALL = "birch,oak,willow,beech,hornbeam,rowan,holly,maple,pine,fir"
species = (sys.argv[5] if len(sys.argv) > 5 else ALL).split(",")
FONT = ImageFont.load_default(size=22)


def load(name, width):
    p = Path(src) / f"{name}.png"
    if not p.exists():
        return Image.new("RGB", (width, int(width * 1.2)), "#ddd")
    im = Image.open(p).convert("RGB")
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def grid(rows, labels, path):
    """rows: [(row label, [images])]; every image in a column shares its width."""
    pad, head, side = 8, 36, 120
    widths = [max(r[1][i].width for r in rows) for i in range(len(rows[0][1]))]
    heights = [max(im.height for im in r[1]) for r in rows]
    W = side + sum(widths) + pad * (len(widths) + 1)
    H = head + sum(heights) + pad * (len(rows) + 1)
    sheet = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(sheet)
    x = side + pad
    for w, lab in zip(widths, labels):
        d.text((x + 4, 6), lab, fill="black", font=FONT)
        x += w + pad
    y = head + pad
    for (lab, ims), h in zip(rows, heights):
        d.text((8, y + 8), lab, fill="black", font=FONT)
        x = side + pad
        for w, im in zip(widths, ims):
            sheet.paste(im, (x, y))
            x += w + pad
        y += h + pad
    sheet.save(path, quality=86)
    print("wrote", path, sheet.size)


phone = []
for sp in species:
    ims = [load(f"{t}-{sp}-{v}-phone", 300) for v in ("lone60", "stand100") for t in (before, after)]
    ims.append(load(f"{after}-{sp}-lone60-close", 520))
    phone.append((sp, ims))
grid(phone, [f"lone 60 {before}", f"lone 60 {after}", f"stand 100 {before}", f"stand 100 {after}",
             f"lone 60 {after}, close"], f"{out}-phone.jpg")

laptop = []
for sp in species:
    for v in ("lone60", "stand100"):
        ims = [load(f"{t}-{sp}-{v}-laptop", 760) for t in (before, after)]
        ims.append(load(f"{after}-{sp}-{v}-close", 760))
        laptop.append((f"{sp}\n{v}", ims))
grid(laptop, [before, after, f"{after}, close"], f"{out}-laptop.jpg")
