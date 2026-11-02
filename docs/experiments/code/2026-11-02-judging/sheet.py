"""The judging sheets: labelled, for the user's eye on a phone, from the renders shots.mjs wrote.

    uv run --project analysis python docs/experiments/code/2026-11-02-judging/sheet.py <renders-dir> <figures-dir>

The garden's sheet is rows = seeds, columns = seasons, at the canvas's own pixels: the garden caps
its canvas at device pixel ratio 2 (MAX_DPR), which a phone at 3 only upsamples, so the dpr-3
screenshots are shrunk to 2/3 (the overlay's text loses a little, the trees nothing). Each species'
sheet is its lone tree at 60 and 100 and its stand at 100, side by side at the plates' one scale.
Each is saved as JPEG at quality 85, or lower in steps of 5 until it is under 1.5 MB (it prints the
quality used). Only the sheets whose renders are all present are drawn.

Environment, for the sheets after the first:
- SUFFIX is added to every sheet's name ("-fixed": round 2's birch fix; "-picked": the adopted picks).
- TAG is the renders' tag (shots.mjs's TAG): `<species>-<TAG>-<trial>-s4.png`, `garden-<TAG>-s<seed>`.
- GARDEN_ROWS ("label=tag:seed,…") draws the garden's rows from tagged renders instead of the seeds.
- VARIANTS ("tag=label;…", with VSPECIES) draws one sheet, `<VSPECIES>-variants`: a row per variant.
- LINEUP=1 draws the eight species on one sheet, `species<SUFFIX>`, a row each, in place of a sheet
  per species. Each row's plates lose the same band of empty sky (above that row's tallest crown),
  so every plate keeps the one scale and a row its common ground line; SCALE (default 1) shrinks
  the whole sheet.
"""

import io
import os
import sys
from pathlib import Path

import numpy as np
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
GARDEN_COLS = [("40", "40 seasons"), ("100", "100 seasons, leaf-on"), ("100-winter", "100 seasons, winter")]
LIMIT = 1.5e6
SUFFIX = os.environ.get("SUFFIX", "")
TAG = f"-{os.environ['TAG']}" if os.environ.get("TAG") else ""
CANVAS = 2 / 3  # MAX_DPR over the phone's 3


def save(sheet: Image.Image, out: Path) -> None:
    for q in range(85, 40, -5):
        buf = io.BytesIO()
        sheet.save(buf, "JPEG", quality=q, optimize=True)
        if buf.tell() <= LIMIT or q == 45:
            out.write_bytes(buf.getvalue())
            print(out, sheet.size, f"quality {q}", f"{buf.tell() / 1e6:.2f} MB")
            return


def garden_rows() -> list[tuple[str, str]]:
    """(label, file stem) per row: the seeds 10, 2 and 3, or GARDEN_ROWS's tagged runs."""
    rows = os.environ.get("GARDEN_ROWS")
    if not rows:
        return [(f"seed {s}", f"garden{TAG}-s{s}") for s in (10, 2, 3)]
    out = []
    for row in rows.split(","):
        label, run = row.split("=")
        tag, seed = run.split(":")
        out.append((label, f"garden-{tag}-s{seed}"))
    return out


def garden(rows: list[tuple[str, str]]) -> None:
    cols = [c for c in GARDEN_COLS if (renders / f"{rows[0][1]}-{c[0]}.png").exists()]
    w, h = (round(x * CANVAS) for x in Image.open(renders / f"{rows[0][1]}-{cols[0][0]}.png").size)
    gap, left, top = 16, 200, 80
    font = ImageFont.load_default(size=40)
    sheet = Image.new("RGB", (left + len(cols) * (w + gap), top + len(rows) * (h + gap)), "white")
    d = ImageDraw.Draw(sheet)
    for j, (_, label) in enumerate(cols):
        d.text((left + j * (w + gap) + 8, 20), label, fill="black", font=font)
    for i, (label, stem) in enumerate(rows):
        y = top + i * (h + gap)
        d.text((16, y + h // 2 - 20), label, fill="black", font=font)
        for j, (key, _) in enumerate(cols):
            f = renders / f"{stem}-{key}.png"
            if f.exists():
                im = Image.open(f).convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
                sheet.paste(im, (left + j * (w + gap), y))
    save(sheet, figures / f"2026-11-02-judging-garden{SUFFIX}.jpg")


def species(sp: str, name: str) -> None:
    plates = [(Image.open(renders / f"{sp}{TAG}-{t}-s4.png").convert("RGB"), label) for t, label in TRIALS]
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
    save(sheet, figures / f"2026-11-02-judging-{sp}{SUFFIX}.jpg")


def variants(sp: str, rows: list[tuple[str, str]]) -> None:
    """One row per variant (tag, label) of species `sp`: lone 60, lone 100 and stand 100."""
    grid = [[Image.open(renders / f"{sp}-{tag}-{t}-s4.png").convert("RGB") for t, _ in TRIALS] for tag, _ in rows]
    gap, title, head, band = 16, 100, 60, 64
    widths = [im.width for im in grid[0]]
    h = max(im.height for row in grid for im in row)
    W = sum(widths) + gap * (len(widths) - 1)
    sheet = Image.new("RGB", (W, title + head + len(rows) * (band + h + gap)), "white")
    d = ImageDraw.Draw(sheet)
    d.text((16, 14), f"{SPECIES[sp]} · seed 4 · variants", fill="black", font=ImageFont.load_default(size=56))
    font = ImageFont.load_default(size=36)
    x = 0
    for (_, label), w in zip(TRIALS, widths, strict=True):
        d.text((x + 12, title + 8), label, fill="black", font=font)
        x += w + gap
    for i, ((_, label), row) in enumerate(zip(rows, grid, strict=True)):
        y = title + head + i * (band + h + gap)
        d.text((16, y + 12), label, fill="black", font=ImageFont.load_default(size=44))
        x = 0
        for im in row:
            sheet.paste(im, (x, y + band))
            x += im.width + gap
    save(sheet, figures / f"2026-11-02-judging-{sp}-variants.jpg")


def sky_rows(im: Image.Image) -> int:
    """How many rows at the top of a plate hold only sky: a row is sky while every pixel is within 40
    of the row's median (the sky is level across the plate, a crown is not)."""
    a = np.asarray(im, dtype=np.int16)
    off = np.abs(a - np.median(a, axis=1, keepdims=True)).max(axis=2)
    content = np.flatnonzero((off > 40).sum(axis=1) > 2)
    return int(content[0]) if content.size else im.height


def lineup() -> None:
    """The eight species, a row each (lone 60, lone 100, stand 100), at the plates' one scale."""
    grid = [[Image.open(renders / f"{sp}{TAG}-{t}-s4.png").convert("RGB") for t, _ in TRIALS] for sp in SPECIES]
    crops = [max(0, min(sky_rows(im) for im in row) - 48) for row in grid]
    grid = [[im.crop((0, c, im.width, im.height)) for im in row] for row, c in zip(grid, crops, strict=True)]
    gap, title, head, band = 16, 100, 60, 64
    widths = [im.width for im in grid[0]]
    heights = [max(im.height for im in row) for row in grid]
    W = sum(widths) + gap * (len(widths) - 1)
    sheet = Image.new("RGB", (W, title + head + sum(band + h + gap for h in heights)), "white")
    d = ImageDraw.Draw(sheet)
    d.text((16, 14), "The eight species · seed 4 · one scale", fill="black", font=ImageFont.load_default(size=56))
    font = ImageFont.load_default(size=36)
    x = 0
    for (_, label), w in zip(TRIALS, widths, strict=True):
        d.text((x + 12, title + 8), label, fill="black", font=font)
        x += w + gap
    y = title + head
    for name, row, h in zip(SPECIES.values(), grid, heights, strict=True):
        d.text((16, y + 12), name, fill="black", font=ImageFont.load_default(size=44))
        x = 0
        for im in row:
            sheet.paste(im, (x, y + band))
            x += im.width + gap
        y += band + h + gap
    scale = float(os.environ.get("SCALE", "1"))
    if scale != 1:
        sheet = sheet.resize((round(sheet.width * scale), round(sheet.height * scale)), Image.Resampling.LANCZOS)
    print("rows of sky cropped per species:", dict(zip(SPECIES, crops, strict=True)))
    save(sheet, figures / f"2026-11-02-judging-species{SUFFIX}.jpg")


if os.environ.get("VARIANTS"):
    variants(os.environ["VSPECIES"], [tuple(v.split("=", 1)) for v in os.environ["VARIANTS"].split(";")])
else:
    rows = garden_rows()
    if (renders / f"{rows[0][1]}-40.png").exists():
        garden(rows)
    if os.environ.get("LINEUP"):
        lineup()
    else:
        for sp, name in SPECIES.items():
            if all((renders / f"{sp}{TAG}-{t}-s4.png").exists() for t, _ in TRIALS):
                species(sp, name)
