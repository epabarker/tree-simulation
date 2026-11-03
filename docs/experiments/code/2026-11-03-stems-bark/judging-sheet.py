"""Stems and bark (2026-11-03): the user's judging sheet (the garden's overlay text cropped off), A (HEAD's default) beside B (&bark=pale&interior).
Garden at phone scale (seed 10, 40 and 100 seasons, and 100 in winter), then the eight species'
stands at 100 and lone trees at 100 (seed 4), from 2026-11-02-judging/shots.mjs renders.

    uv run --project analysis python judging-sheet.py <A-dir> <B-dir> <out.jpg>
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

A, B, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
SPECIES = ["birch", "beech", "oak", "hornbeam", "maple", "willow", "rowan", "holly"]
try:
    font = ImageFont.truetype("DejaVuSans.ttf", 22)
except OSError:
    font = ImageFont.load_default()


def b(name: str) -> str:  # B's file: the tag after the species or "garden"
    head, rest = name.split("-", 1)
    return f"{head}-B-{rest}"


def fit(path: Path, w: int | None = None, h: int | None = None, top: float = 0) -> Image.Image:
    im = Image.open(path).convert("RGB")
    if top:  # the garden's overlay text: B's comes back "undefined" from shots.mjs under TAG
        im = im.crop((0, round(top * im.height), im.width, im.height))
    if h:
        return im.resize((round(im.width * h / im.height), h))
    return im.resize((w, round(im.height * w / im.width)))


GAP = 12
garden = [("garden-s10-40.png", "40"), ("garden-s10-100.png", "100"), ("garden-s10-100-winter.png", "100 winter")]
gh = 760
gardens = [(lbl, fit(A / f, h=gh, top=0.2), fit(B / b(f), h=gh, top=0.2)) for f, lbl in garden]
sw = 132
stands = [(sp, fit(A / f"{sp}-stand100-s4.png", w=sw), fit(B / b(f"{sp}-stand100-s4.png"), w=sw)) for sp in SPECIES]
lones = [(sp, fit(A / f"{sp}-lone100-s4.png", w=sw), fit(B / b(f"{sp}-lone100-s4.png"), w=sw)) for sp in SPECIES]
gw = sum(a.width + bb.width + 3 * GAP for _, a, bb in gardens)
lw = len(SPECIES) * (2 * sw + 3 * GAP)
W = max(gw, lw) + 2 * GAP + 130
sh, lh = stands[0][1].height, lones[0][1].height
H = 60 + gh + 50 + sh + 50 + lh + 40
sheet = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(sheet)
d.text((GAP, 14), "Stems and bark: A | B in each pair (key in the note). Garden: phone, seed 10.", fill="black", font=font)
x, y = GAP, 60
for lbl, a, bb in gardens:
    d.text((x, y - 28), f"garden {lbl}: A | B", fill="black", font=font)
    sheet.paste(a, (x, y))
    sheet.paste(bb, (x + a.width + GAP, y))
    x += a.width + bb.width + 3 * GAP
for row, (title, items, hh) in enumerate([("stand 100", stands, sh), ("lone 100", lones, lh)]):
    y = 60 + gh + 50 if row == 0 else 60 + gh + 50 + sh + 50
    x = GAP
    for sp, a, bb in items:
        d.text((x, y - 28), f"{sp}", fill="black", font=font)
        sheet.paste(a, (x, y))
        sheet.paste(bb, (x + sw + GAP // 2, y))
        x += 2 * sw + 3 * GAP
    d.text((x, y + hh // 2), title, fill="black", font=font)
sheet.save(out, quality=85)
print(out, sheet.size)
