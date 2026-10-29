"""Stacked slices: the note's figures from the flat captures (capture_flat.mjs) and their
silhouette measures (profile.py output, one JSON object a line).

usage: uv run --project analysis python slices_figures.py <capture-dir> <profiles.jsonl> <figures-dir>
"""

import json
import statistics as st
import sys

import polars as pl
from PIL import Image, ImageDraw, ImageFont
from plotnine import (aes, element_text, facet_wrap, geom_path, geom_polygon, ggplot, labs,
                      scale_color_manual, theme, theme_minimal)

cap, jsonl, figs = sys.argv[1:4]
font = ImageFont.truetype("/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf", 17)

ROWS = [
    ("Wood, 12 m apart", "limbs-wood12"),
    ("Open-grown, 24 m", "limbs-open24"),
]
COLS = [("N = 1 (today)", "N1"), ("N = 8", "N8"), ("N = 32", "N32")]
REAL = [("Scanned: typical (393)", "wy-393"), ("Scanned: tree 6", "wy-6")]


def grid(season: str, dest: str, mask: bool = False) -> None:
    T, LW, TH = 300, 150, 30
    cols = COLS + REAL
    out = Image.new("RGB", (LW + len(cols) * T, TH + len(ROWS) * T), "white")
    d = ImageDraw.Draw(out)
    for c, (label, _) in enumerate(cols):
        d.text((LW + c * T + 8, 6), label, fill="black", font=font)
    for r, (label, prefix) in enumerate(ROWS):
        d.multiline_text((8, TH + r * T + T // 2 - 20), label.replace(", ", ",\n"), fill="black", font=font)
        for c, (_, key) in enumerate(cols):
            # N = 1 is today's page: the same slice for both composition levels.
            name = key if key.startswith("wy-") else (f"slices-{prefix.split('-')[1]}-N1" if key == "N1" else f"{prefix}-{key}")
            path = f"{cap}/{name}-{season}{'-mask' if mask else ''}.png"
            out.paste(Image.open(path).convert("RGB").resize((T, T), Image.LANCZOS), (LW + c * T, TH + r * T))
    out.quantize(colors=256, method=Image.Quantize.MEDIANCUT).save(dest, optimize=True)


grid("summer", f"{figs}/2026-10-29-slices-summer.png")
grid("winter", f"{figs}/2026-10-29-slices-winter.png")
grid("summer", f"{figs}/2026-10-29-slices-silhouettes.png", mask=True)

# Width profiles, drawn as mirrored silhouettes: the scans' mean ± SD as a grey band, the
# composites at N = 1, 8 and 32 as lines.
rows = {}
for line in open(jsonl):
    r = json.loads(line)
    rows[r["file"].replace("-mask.png", "")] = r
scans = [r for k, r in rows.items() if k.startswith("wy-") and k.endswith("-summer")]
bands = range(10)
mean = [st.mean(r["profile"][k] for r in scans) for k in bands]
sd = [st.stdev(r["profile"][k] for r in scans) for k in bands]
band, lines = [], []
for setting, prefix in ROWS:
    hi = [(m + s) / 2 for m, s in zip(mean, sd)]
    lo = [max(0.0, (m - s) / 2) for m, s in zip(mean, sd)]
    h = [(k + 0.5) / 10 for k in bands]
    # The band's outline: right edge up (outer), down (inner), then the left side mirrored.
    for side in (1, -1):
        xs = [side * x for x in hi] + [side * x for x in reversed(lo)]
        ys = h + list(reversed(h))
        band += [dict(setting=setting, side=side, x=x, y=y) for x, y in zip(xs, ys)]
    for key, label in [("N1", "N = 1 (today)"), ("N8", "N = 8"), ("N32", "N = 32")]:
        name = f"slices-{prefix.split('-')[1]}-N1" if key == "N1" else f"{prefix}-{key}"
        p = rows[f"{name}-summer"]["profile"]
        for side in (1, -1):
            lines += [dict(setting=setting, series=label, side=side, x=side * w / 2, y=(k + 0.5) / 10)
                      for k, w in enumerate(p)]
band_df, line_df = pl.DataFrame(band), pl.DataFrame(lines)
line_df = line_df.with_columns(group=pl.col("series") + pl.col("side").cast(pl.Utf8))
plot = (
    ggplot()
    + geom_polygon(band_df.to_pandas(), aes("x", "y", group="side"), fill="#d9d8d3", color=None)
    + geom_path(line_df.to_pandas(), aes("x", "y", color="series", group="group"), size=0.9)
    + facet_wrap("setting")
    + scale_color_manual(values={"N = 1 (today)": "#2a78d6", "N = 8": "#eb6834", "N = 32": "#1baf7a"},
                         breaks=["N = 1 (today)", "N = 8", "N = 32"])
    + labs(x="silhouette width over its widest (grey: 35 scanned oaks, mean ± SD)",
           y="height in the tree", color="composite")
    + theme_minimal()
    + theme(figure_size=(8, 4.2), legend_position="right", axis_title=element_text(size=9))
)
plot.save(f"{figs}/2026-10-29-slices-profiles.png", dpi=110, verbose=False)
print("wrote 4 figures")
