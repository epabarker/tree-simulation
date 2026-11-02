"""The judging sheets: labelled, for the user's eye on a phone, from the renders shots.mjs wrote.

    uv run --project analysis python docs/experiments/code/2026-11-02-judging/sheet.py <renders-dir> <figures-dir>

The garden's sheet is rows = seeds, columns = seasons, at the canvas's own pixels: the garden caps
its canvas at device pixel ratio 2 (MAX_DPR), which a phone at 3 only upsamples, so the dpr-3
screenshots are shrunk to 2/3 (the overlay's text loses a little, the trees nothing). Each species'
sheet is its lone tree at 60 and 100 and its stand at 100, side by side at the plates' one scale.
Each is saved as JPEG at quality 85, or lower in steps of 5 until it is under 1.5 MB (it prints the
quality used).
"""

import io
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

renders, figures = Path(sys.argv[1]), Path(sys.argv[2])
SPECIES = {
    "birch": "Silver birch",
    "beech": "Beech",
    "oak": "Pedunculate oak",
    "hornbeam": "Hornbeam",
    "maple": "Field maple",
    "willow": "Goat willow",
    "rowan": "Rowan",
    "holly": "Holly",
}
TRIALS = [
    ("lone60", "lone, 60 seasons"),
    ("lone100", "lone, 100 seasons"),
    ("stand100", "stand, 100 seasons"),
]
GARDEN_SEEDS = [10, 2, 3]
GARDEN_COLS = [("40", "40 seasons"), ("100", "100 seasons, leaf-on"), ("100-winter", "100 seasons, winter")]
LIMIT = 1.5e6
CANVAS = 2 / 3  # MAX_DPR over the phone's 3


def save(sheet: Image.Image, out: Path) -> None:
    for q in range(85, 40, -5):
        buf = io.BytesIO()
        sheet.save(buf, "JPEG", quality=q, optimize=True)
        if buf.tell() <= LIMIT or q == 45:
            out.write_bytes(buf.getvalue())
            print(out, sheet.size, f"quality {q}", f"{buf.tell() / 1e6:.2f} MB")
            return


def garden() -> None:
    cols = [c for c in GARDEN_COLS if (renders / f"garden-s{GARDEN_SEEDS[0]}-{c[0]}.png").exists()]
    w, h = (round(x * CANVAS) for x in Image.open(renders / f"garden-s{GARDEN_SEEDS[0]}-{cols[0][0]}.png").size)
    gap, left, top = 16, 200, 80
    font = ImageFont.load_default(size=40)
    sheet = Image.new("RGB", (left + len(cols) * (w + gap), top + len(GARDEN_SEEDS) * (h + gap)), "white")
    d = ImageDraw.Draw(sheet)
    for j, (_, label) in enumerate(cols):
        d.text((left + j * (w + gap) + 8, 20), label, fill="black", font=font)
    for i, seed in enumerate(GARDEN_SEEDS):
        y = top + i * (h + gap)
        d.text((16, y + h // 2 - 20), f"seed {seed}", fill="black", font=font)
        for j, (key, _) in enumerate(cols):
            f = renders / f"garden-s{seed}-{key}.png"
            if f.exists():
                im = Image.open(f).convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
                sheet.paste(im, (left + j * (w + gap), y))
    save(sheet, figures / "2026-11-02-judging-garden.jpg")


def species(sp: str, name: str) -> None:
    plates = [(Image.open(renders / f"{sp}-{t}-s4.png").convert("RGB"), label) for t, label in TRIALS]
    gap, top = 16, 150
    h = max(im.height for im, _ in plates)
    sheet = Image.new("RGB", (sum(im.width for im, _ in plates) + gap * (len(plates) - 1), top + h), "white")
    d = ImageDraw.Draw(sheet)
    d.text((16, 14), f"{name} · seed 4", fill="black", font=ImageFont.load_default(size=56))
    font = ImageFont.load_default(size=36)
    x = 0
    for im, label in plates:
        d.text((x + 12, top - 52), label, fill="black", font=font)
        sheet.paste(im, (x, top))
        x += im.width + gap
    save(sheet, figures / f"2026-11-02-judging-{sp}.jpg")


if (renders / f"garden-s{GARDEN_SEEDS[0]}-40.png").exists():
    garden()
for sp, name in SPECIES.items():
    if all((renders / f"{sp}-{t}-s4.png").exists() for t, _ in TRIALS):
        species(sp, name)
