"""Structure vs drawing: tiles captures into labelled 2×2 figures (rows: structure, columns:
renderer), downscaling renderer B's 2000 px frames with Lanczos (its supersampling).
usage: figure.py <capture-dir> <out.png> <season> <real-tree> <our-tree> <real-label> <our-label>
"""

import sys

from PIL import Image, ImageDraw, ImageFont

cap, dest, season, real, ours, real_label, our_label = sys.argv[1:8]
T, LW, TH = 480, 170, 34
try:
    font = ImageFont.truetype("/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", 19)
except OSError:
    font = ImageFont.load_default()
fig = Image.new("RGB", (LW + 2 * T, TH + 2 * T), "white")
d = ImageDraw.Draw(fig)
for c, label in enumerate(["A: our renderer", "B: better renderer"]):
    d.text((LW + c * T + 10, 7), label, fill="black", font=font)
for r, (tree, label) in enumerate([(real, real_label), (ours, our_label)]):
    d.multiline_text((10, TH + r * T + T // 2 - 40), label.replace("|", "\n"), fill="black", font=font)
    for c, rend in enumerate("AB"):
        im = Image.open(f"{cap}/{tree}-{rend}-{season}.png").convert("RGB").resize((T, T), Image.LANCZOS)
        fig.paste(im, (LW + c * T, TH + r * T))
fig.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(dest, optimize=True)
