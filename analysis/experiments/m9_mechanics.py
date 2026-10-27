"""M9: R3 mechanics (ADR 0011). Which sag, posture and stress-girth settings give the §7 M9 visible
test (drooping limbs with upturned tips, a weeping form, Troll straightening) and §10's Δ > 2 at
heavy junctions, without spoiling the stand patterns of M6–M8?

Conditions on the open tree: no R3; the recommended settings now in the sky presets (sag from the
load increment, E 1e6, φ 1, β_g 0.1, γ 0.2, c 0.05, σ_target 3000, girth gain 0.3); and one-change
variants: the spec's creep sag, posture off (§8 ablation), stress girth off, stiffer wood, slower and
faster reaction wood, a lower σ_target. The stand with and without R3. The weeping and Troll
presets with R3, without posture, and without R3.

    uv run --project analysis python analysis/experiments/m9_mechanics.py
"""

import math

import polars as pl
from plotnine import (
    aes,
    coord_fixed,
    facet_wrap,
    geom_segment,
    ggplot,
    labs,
    scale_colour_manual,
    scale_size_identity,
    theme,
    theme_void,
)
from treesim import REPO, Run, load_run, load_runs, run_many

EXPERIMENT = "runs/m9-mechanics"
FIGURE = REPO / "docs" / "experiments" / "figures" / "2026-10-27-m9-forms.png"
SEEDS = range(1, 6)
SEASONS = 100
SNAP = 60


def r3(**kw) -> dict:
    return {"r3": kw}


OPEN = {
    "off": r3(enabled=False),
    "rec": {},
    "creep": r3(sag="creep"),
    "noPosture": r3(posture=False),
    "noGirth": r3(girthGain=0),
    "E2e6": r3(E=2e6),
    "c0.02": r3(c=0.02),
    "c0.2": r3(c=0.2),
    "sigma1500": r3(sigmaTarget=1500),
}
SPECIES = {"rec": {}, "noPosture": r3(posture=False), "off": r3(enabled=False)}

runs = [
    Run(f"{EXPERIMENT}/skyTree_{c}_s{s}", "skyTree", s, SEASONS, p, snapshots=[SNAP])
    for c, p in OPEN.items()
    for s in SEEDS
]
runs += [
    Run(f"{EXPERIMENT}/skyStand_{c}_s{s}", "skyStand", s, SEASONS, p, snapshots=[SNAP])
    for c, p in {"off": OPEN["off"], "rec": {}}.items()
    for s in SEEDS
]
runs += [
    Run(f"{EXPERIMENT}/{preset}_{c}_s{s}", preset, s, SNAP, p)
    for preset in ["weeping", "troll"]
    for c, p in SPECIES.items()
    for s in SEEDS
]
run_many(runs)

root = REPO / EXPERIMENT
meta = pl.col("run").str.extract(r"^([A-Za-z]+)_").alias("preset"), pl.col("run").str.extract(
    r"^[A-Za-z]+_([\w.]+)_s\d+$"
).alias("condition")
m = load_runs(root, "metamers").with_columns(*meta)
metrics = load_runs(root).with_columns(*meta)

# Elevation above the horizontal (either side) and tilt from vertical, degrees.
m = m.with_columns(
    (pl.arctan2(pl.col("angle").sin(), pl.col("angle").cos().abs()) * 180 / math.pi).alias("elev"),
    (pl.arctan2(pl.col("angle").cos(), pl.col("angle").sin()).abs() * 180 / math.pi).alias("tilt"),
)
at_snap = m.filter(pl.col("season") == SNAP)

# Limb shape: per first-order axis of ≥ 10 metamers, droop = base − lowest elevation, upturn = tip −
# lowest (metamers.csv rows are in table order, so an axis's rows run base to tip).
limbs = (
    at_snap.filter(pl.col("order") == 1)
    .group_by("run", "preset", "condition", "tree", "axis", maintain_order=True)
    .agg(pl.len().alias("n"), pl.col("elev").first().alias("base"), pl.col("elev").min().alias("low"), pl.col("elev").last().alias("tip"))
    .filter(pl.col("n") >= 10)
    .group_by("preset", "condition")
    .agg(
        pl.len().alias("limbs"),
        (pl.col("base") - pl.col("low")).median().round(0).alias("droop°"),
        (pl.col("tip") - pl.col("low")).median().round(0).alias("upturn°"),
    )
)
trunk = (
    at_snap.filter(pl.col("order") == 0)
    .group_by("run", "preset", "condition", "tree")
    .agg(pl.col("tilt").median().alias("t"), pl.col("tilt").filter(pl.col("birthSeason") <= SNAP - 10).median().alias("old"))
    .group_by("preset", "condition")
    .agg(pl.col("t").median().round(1).alias("trunk tilt°"), pl.col("old").median().round(1).alias("old trunk tilt°"))
)
# Young twigs (formed in the last 3 seasons, order ≥ 1) hanging below −30°: the weeping share.
hang = (
    at_snap.filter(pl.col("order") >= 1, pl.col("birthSeason") >= SNAP - 3)
    .group_by("preset", "condition")
    .agg((pl.col("elev") < -30).mean().round(2).alias("hanging twigs"))
)


def junction_deltas(run_dir) -> list[tuple[float, bool]]:
    """Leonardo exponent Δ at every junction at the snapshot, and whether a lateral there is reinforced."""
    mm = load_run(run_dir)["metamers"].filter(pl.col("season") == SNAP)
    rows = {(r["tree"], r["birthId"]): r for r in mm.iter_rows(named=True)}
    kids: dict = {}
    for r in rows.values():
        if r["parentBirthId"] >= 0:
            kids.setdefault((r["tree"], r["parentBirthId"]), []).append(r)
    out = []
    for key, ks in kids.items():
        if len(ks) < 2:
            continue
        rp = rows[key]["radius"]
        ratios = [k["radius"] / rp for k in ks]
        if any(x >= 1 for x in ratios):
            continue
        lo, hi = 0.5, 8.0
        for _ in range(50):
            mid = (lo + hi) / 2
            lo, hi = (mid, hi) if sum(x**mid for x in ratios) > 1 else (lo, mid)
        # A lateral is the first metamer of its axis; "heavy" = it carries > 10% stress wood.
        heavy = any(k["stressWood"] > 0.1 * k["radius"] and k["axis"] == k["birthId"] for k in ks)
        out.append(((lo + hi) / 2, heavy))
    return out


deltas = pl.DataFrame(
    [
        {"preset": p, "condition": c, "delta": d, "heavy": h}
        for c in OPEN
        for p in ["skyTree"]
        for s in SEEDS
        for d, h in junction_deltas(root / f"{p}_{c}_s{s}")
    ]
).group_by("preset", "condition").agg(
    pl.col("delta").filter(pl.col("heavy")).median().round(2).alias("Δ heavy"),
    pl.col("heavy").sum().alias("heavy junctions"),
    pl.col("delta").filter(~pl.col("heavy")).median().round(2).alias("Δ other"),
)

size = (
    metrics.filter(pl.col("season") == SNAP - 1)
    .filter(~((pl.col("preset") == "skyStand") & pl.col("tree").is_in([0, 9])))
    .group_by("preset", "condition")
    .agg(
        pl.col("height").median().round(0).alias("height"),
        pl.col("crownWidth").median().round(0).alias("width"),
        pl.col("slenderness").median().round(0).alias("H/D"),
        pl.col("boleHeight").median().round(0).alias("bole"),
    )
)
late = (
    metrics.filter(pl.col("preset") == "skyTree", pl.col("season") == SEASONS - 1)
    .group_by("preset", "condition")
    .agg(pl.col("height").median().round(0).alias("height 100"))
)
edge = (
    metrics.filter(pl.col("preset") == "skyStand", pl.col("season") == SNAP - 1, pl.col("tree") == 0)
    .group_by("preset", "condition")
    .agg(pl.col("centroidOffset").median().round(1).alias("edge lean"))
)

summary = size
for t in [limbs, trunk, hang, deltas, late, edge]:
    summary = summary.join(t, on=["preset", "condition"], how="left")
with pl.Config(tbl_cols=20, tbl_width_chars=240, tbl_rows=40):
    print(summary.sort("preset", "condition"))

# Figure: seed 1 at the snapshot, one panel per form.
PANELS = {
    "skyTree_off": "open tree, no R3",
    "skyTree_rec": "open tree, R3",
    "skyTree_noPosture": "open tree, sag without posture",
    "weeping_off": "weeping preset, no R3",
    "weeping_rec": "weeping preset, R3",
    "troll_noPosture": "Troll preset, no posture",
    "troll_rec": "Troll preset, R3",
}
seg = (
    at_snap.with_columns((pl.col("preset") + "_" + pl.col("condition")).alias("key"))
    .filter(pl.col("key").is_in(list(PANELS)), pl.col("seed") == 1)
    .with_columns(
        pl.col("key").replace_strict(PANELS).cast(pl.Enum(list(PANELS.values()))).alias("panel"),
        (pl.col("radius") * 2 + 0.1).alias("w"),
        pl.when(pl.col("stressWood") > 0).then(pl.lit("stress wood")).otherwise(pl.lit("wood")).alias("kind"),
    )
)
fig = (
    ggplot(seg, aes(x="x0", y="y0", xend="x1", yend="y1", size="w", colour="kind"))
    + geom_segment(lineend="round")
    + facet_wrap("panel", nrow=1)
    + coord_fixed()
    + scale_colour_manual({"wood": "#5a4632", "stress wood": "#b0442c"})
    + labs(title=f"Forms at season {SNAP} (seed 1)", colour="")
    + scale_size_identity()
    + theme_void()
    + theme(legend_position="bottom")
)
fig.save(FIGURE, width=14, height=3.6, dpi=110, verbose=False)
print("figure written")
