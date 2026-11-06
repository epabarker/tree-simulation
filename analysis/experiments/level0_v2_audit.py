"""Level 0 targets v2 (docs/experiments/2026-11-03-level0-targets.md): the source audit of every species' Tallo rows in
the Europe box, and the pooled-Europe (v1) and REGION (v2) curves side by side. Real data only; reads no simulated tree.

    uv run --project analysis python -I analysis/experiments/level0_v2_audit.py OUT.md FIGURE.png

Per species and reference_id: median latitude and longitude, n_H, n_CR, rows inside REGION, median DBH and H, and the
median H inside the species' DBH window when ≥ WINDOW_MIN trees fall in it. The window is fixed before reading any
source's H: the species' pooled-Europe median DBH (height rows) m, from m/1.25 to 1.25·m, the same rule for every species.
"""

import json
import sys
from pathlib import Path

import numpy as np
import polars as pl
from plotnine import (aes, element_text, facet_wrap, geom_line, geom_ribbon, ggplot, labs, scale_color_manual,
                      scale_fill_manual, scale_x_log10, scale_y_log10, theme, theme_minimal)

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from treesim import tallo  # noqa: E402
from treesim.sweep import REPO  # noqa: E402

WINDOW = 1.25
WINDOW_MIN = 20
V1 = REPO / "docs" / "experiments" / "fits" / "level0-v1" / "tallo-level0-v1.json"
# Fixed categorical order (the dataviz reference palette, light): blue for v1, orange for v2.
SERIES = {"v1 pooled Europe": "#2a78d6", "v2 REGION": "#eb6834"}

out_md, out_png = Path(sys.argv[1]), Path(sys.argv[2])
europe = tallo.load(region=False)
(la0, la1), (lo0, lo1) = tallo.REGION["latitude"], tallo.REGION["longitude"]
refs = pl.read_csv(tallo.TALLO.parent / "Tallo_references.csv", encoding="utf8-lossy")
src = dict(zip(refs["reference_id"], refs["source"]))
v1 = json.loads(V1.read_text())["species"]
v2 = tallo.load_targets()["species"]


def in_region(d: pl.DataFrame) -> pl.Expr:
    return pl.col("latitude").is_between(la0, la1) & pl.col("longitude").is_between(lo0, lo1)


def f(v, d=1):
    return "—" if v is None else f"{v:.{d}f}"


lines = []
for s in tallo.TAXA:
    base = europe.filter(pl.col("species").is_in(tallo.TAXA[s]) & (pl.col("stem_diameter_cm") > 0))
    H = base.filter((pl.col("height_outlier") == "N") & (pl.col("height_m") > 0))
    CR = base.filter((pl.col("crown_radius_outlier") == "N") & (pl.col("crown_radius_m") > 0))
    m = float(H["stem_diameter_cm"].median())
    lo, hi = m / WINDOW, m * WINDOW
    total = H.shape[0]
    lines += [f"### {s}", "",
              f"Europe box: n_H {total}, n_CR {CR.shape[0]}; REGION: n_H {H.filter(in_region(H)).shape[0]}, "
              f"n_CR {CR.filter(in_region(CR)).shape[0]}. DBH window {lo:.1f}–{hi:.1f} cm (pooled median {m:.1f} cm "
              f"÷/× {WINDOW}).", "",
              "| ref | source | lat | lon | in REGION | n_H (share) | n_CR | median DBH cm | median H m | "
              f"n in window | median H in window m |",
              "|---|---|---|---|---|---|---|---|---|---|---|"]
    ids = sorted(set(H["reference_id"]) | set(CR["reference_id"]),
                 key=lambda r: -(H.filter(pl.col("reference_id") == r).shape[0]
                                 + CR.filter(pl.col("reference_id") == r).shape[0]))
    for r in ids:
        h = H.filter(pl.col("reference_id") == r)
        c = CR.filter(pl.col("reference_id") == r)
        g = h if h.shape[0] else c
        w = h.filter(pl.col("stem_diameter_cm").is_between(lo, hi))
        inr = g.filter(in_region(g)).shape[0]
        lines.append(
            f"| {r} | {src.get(r, '?')[:70]} | {f(g['latitude'].median())} | {f(g['longitude'].median())} | "
            f"{inr}/{g.shape[0]} | {h.shape[0]} ({100 * h.shape[0] / max(total, 1):.0f}%) | {c.shape[0]} | "
            f"{f(g['stem_diameter_cm'].median())} | {f(h['height_m'].median() if h.shape[0] else None)} | "
            f"{w.shape[0]} | {f(w['height_m'].median() if w.shape[0] >= WINDOW_MIN else None)} |")
    lines.append("")

# Side by side: q10/q50/q90 at fixed DBHs inside each version's support.
lines += ["### Curves side by side (H m and CR m at DBH; q10 / q50 / q90; — outside the version's support)", "",
          "| species | trait | version | n | form | band | 10 cm | 20 cm | 30 cm | 40 cm | 50 cm | 60 cm |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|"]
recs = []
for s in tallo.TAXA:
    for trait in tallo.TRAITS:
        for name, e in (("v1 pooled Europe", v1[s][trait]), ("v2 REGION", v2[s][trait])):
            if "support" not in e:
                lines.append(f"| {s} | {trait} | {name} | {e['n']} | {e['form']} | {e['band']} |" + " — |" * 6)
                continue
            a, b = e["support"]
            cells = []
            for d in (10, 20, 30, 40, 50, 60):
                if a <= d <= b:
                    q = np.exp(tallo.predict(e, d)[0])
                    cells.append(f"{q[0]:.1f} / {q[1]:.1f} / {q[2]:.1f}")
                else:
                    cells.append("—")
            lines.append(f"| {s} | {trait} | {name} | {e['n']} | {e['form']} | {e['band']} | " + " | ".join(cells)
                         + " |")
            for d in np.exp(np.linspace(np.log(a), np.log(b), 40)):
                q = np.exp(tallo.predict(e, d)[0])
                recs.append({"species": s, "trait": trait, "version": name, "dbh": float(d),
                             "q10": float(q[0]), "q50": float(q[1]), "q90": float(q[2])})
out_md.write_text("\n".join(lines) + "\n")

df = pl.DataFrame(recs).with_columns(pl.concat_str([pl.col("species"), pl.lit(" "), pl.col("trait")]).alias("panel"))
order = [f"{s} {t}" for s in tallo.TAXA for t in tallo.TRAITS if f"{s} {t}" in set(df["panel"])]
pdf = df.to_pandas()
pdf["panel"] = pdf["panel"].astype("category").cat.set_categories(order)
p = (ggplot(pdf, aes("dbh", "q50", color="version", fill="version"))
     + geom_ribbon(aes(ymin="q10", ymax="q90"), alpha=0.18, color="none")
     + geom_line(size=0.8)
     + facet_wrap("panel", ncol=4, scales="free_y")
     + scale_x_log10() + scale_y_log10()
     + scale_color_manual(values=SERIES) + scale_fill_manual(values=SERIES)
     + labs(x="DBH, cm (log)", y="H or CR, m (log): median and 10–90% band", color="", fill="",
            title="Tallo Level 0 curves: v1 (pooled Europe) against v2 (45–58° N, 10° W–25° E)")
     + theme_minimal() + theme(figure_size=(12, 15), legend_position="top", plot_title=element_text(size=11)))
p.save(out_png, dpi=110, verbose=False)
print(f"wrote {out_md} and {out_png}")
