"""M27: the hold-out checks of the fitted species (ADR 0020), none of which the fit saw.

    uv run --project analysis python analysis/experiments/m27_holdout.py            # after the fits
    uv run --project analysis python analysis/experiments/m27_holdout.py --smoke    # on the smoke fits

Reads docs/experiments/fits/<species>.json for the pilot species (birch, beech) and compares the
hand-tuned and fitted patches on:

1. shade tolerance: the lowest light at which every seedling lives in the shade house, against
   the species' band and the order of all ten species (Niinemets & Valladares 2006);
2. the §10 allometries: Δ, the length–diameter and leaf–section slopes (M26);
3. release: epicormic shoots and lean into a felled neighbour's gap (M10);
4. the mixed wood (`mixedWood`, 400 seasons, 6 seeds): birch leads early and fades, beech ends
   with the most canopy trees (M25);
5. plausibility: each fitted parameter against its bounds, and how far the restarts agree.

Writes docs/experiments/fits/holdout.json, figures under docs/experiments/figures/ and lab links.
Needs Node 24 first on PATH. A few minutes on 4 cores (a 400-season mixed wood takes ≈ 3.5 s).
"""

import argparse
import base64
import json
import os

import numpy as np
import polars as pl
from plotnine import aes, facet_wrap, geom_line, geom_path, geom_point, ggplot, labs, scale_linetype_manual, theme, theme_minimal
from treesim import REPO, Run, load_runs, run_many
from treesim.fit import Pool, load_spec

parser = argparse.ArgumentParser()
parser.add_argument("--smoke", action="store_true")
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
args = parser.parse_args()

PILOT = ["birch", "beech"]
ALL = ["birch", "oak", "beech", "fir", "hornbeam", "maple", "holly", "rowan", "willow", "pine"]
FITS = REPO / ("runs/m27-fit-smoke" if args.smoke else "docs/experiments/fits")
OUT = REPO / ("runs/m27-holdout-smoke" if args.smoke else "docs/experiments/fits")
FIGURES = REPO / ("runs/m27-holdout-smoke" if args.smoke else "docs/experiments/figures")
NOTE = "2026-10-28-m27"
SEEDS = [1, 2] if args.smoke else [1, 2, 3, 4, 5]
WOOD_SEEDS = [1] if args.smoke else [1, 2, 3, 4, 5, 6]
WOOD_SEASONS = 100 if args.smoke else 400
OUT.mkdir(parents=True, exist_ok=True)
FIGURES.mkdir(parents=True, exist_ok=True)

fits = {sp: json.loads(((FITS / sp / f"{sp}.json") if args.smoke else (FITS / f"{sp}.json")).read_text()) for sp in PILOT}
assign = {sp: fits[sp]["fit"]["assign"] for sp in PILOT}
patch = {sp: fits[sp]["fit"]["patch"] for sp in PILOT}

pool = Pool(args.workers)


def ask_all(species: str, a: dict, trials: list[str], seeds: list[int]) -> list[dict]:
    return pool.map([{"species": species, "assign": a, "seeds": [s], "trials": trials} for s in seeds])


# 1. Shade tolerance -----------------------------------------------------------------------------
def survival_light(species: str, a: dict) -> float | None:
    replies = ask_all(species, a, ["shade"], SEEDS)
    roofs = replies[0]["shade"].keys()
    lit = {r: float(np.mean([rep["light"][r] for rep in replies])) for r in roofs}
    ok = [lit[r] for r in roofs if all(rep["shade"][r][0] for rep in replies)]
    return min(ok) if ok else None


shade = {f"{sp} (hand)": survival_light(sp, {}) for sp in ALL}
for sp in PILOT:
    shade[f"{sp} (fitted)"] = survival_light(sp, assign[sp])
band = {sp: load_spec(sp).holdout.get("survivalLight") for sp in PILOT}

# 2–3. Allometry and release ----------------------------------------------------------------------
def summarise(species: str, a: dict) -> dict:
    lone = [r["lone"][0] for r in ask_all(species, a, ["lone"], SEEDS)]
    rel = [r["release"][0] for r in ask_all(species, a, ["release"], SEEDS)]
    med = lambda k: float(np.nanmedian([np.nan if x[k] is None else x[k] for x in lone]))
    return {
        "junctionDelta": med("junctionDelta"),
        "ldSlope": med("ldSlope"),
        "leafStemSlope": med("leafStemSlope"),
        "epicormic": float(np.mean([x["epicormic"] for x in rel])),
        "lean": float(np.mean([x["lean"] for x in rel])),
    }


allometry = {f"{sp} ({k})": summarise(sp, a) for sp in PILOT for k, a in [("hand", {}), ("fitted", assign[sp])]}
pool.close()

# 4. The mixed wood -------------------------------------------------------------------------------
wood = "runs/m27-holdout/wood"
fitted_species = {"species": {sp: patch[sp] for sp in PILOT}}
runs = [Run(f"{wood}/hand_s{s}", "mixedWood", s, WOOD_SEASONS) for s in WOOD_SEEDS]
runs += [Run(f"{wood}/fitted_s{s}", "mixedWood", s, WOOD_SEASONS, fitted_species) for s in WOOD_SEEDS]
run_many(runs, workers=args.workers)
succ = load_runs(REPO / wood).with_columns(pl.col("run").str.extract(r"^(\w+?)_").alias("patch"))
canopy = (
    succ.filter(pl.col("alive"), pl.col("height") >= 30, pl.col("season") % 25 == 0)
    .group_by("patch", "season", "species")
    .agg((pl.len() / len(WOOD_SEEDS)).alias("trees"))
    .sort("patch", "season", "species")
)
checkpoints = [s for s in [50, 100, 200, 300, 400] if s <= WOOD_SEASONS]
wood_table = canopy.filter(pl.col("season").is_in(checkpoints), pl.col("species").is_in(PILOT))

# 5. Plausibility ---------------------------------------------------------------------------------
plausibility = []
for sp in PILOT:
    spec = load_spec(sp)
    ends = fits[sp]["restarts"]
    for p in spec.params:
        path, lo, hi = p["path"], p["lo"], p["hi"]
        fitted = assign[sp][path]
        hand = fits[sp]["hand"]["values"].get(path)
        at_bound = min(fitted - lo, hi - fitted) < 0.02 * (hi - lo)
        spread = float(np.std([e["mean"][path] for e in ends]) / (hi - lo)) if len(ends) > 1 else float("nan")
        plausibility.append({
            "species": sp, "param": path, "hand": hand, "fitted": round(fitted, 4), "lo": lo, "hi": hi,
            "at bound": at_bound, "restart spread (of range)": round(spread, 2),
        })
plaus = pl.DataFrame(plausibility)

# Figures -----------------------------------------------------------------------------------------
progress = pl.concat([
    pl.read_csv((FITS / sp / f"{sp}-progress.csv") if args.smoke else (FITS / f"{sp}-progress.csv"))
    .with_columns(pl.lit(sp).alias("species"))
    for sp in PILOT
])
fig = (
    ggplot(progress, aes("generation", "best", colour="factor(restart)"))
    + geom_line()
    + facet_wrap("species")
    + labs(x="generation", y="best loss in the generation", colour="restart")
    + theme_minimal()
    + theme(figure_size=(8, 3.2))
)
fig.save(FIGURES / f"{NOTE}-progress.png", dpi=100, verbose=False)

fig = (
    ggplot(canopy.filter(pl.col("species").is_in(PILOT + ["oak", "hornbeam"])), aes("season", "trees", colour="species", linetype="patch"))
    + geom_line(size=1)
    + scale_linetype_manual(values={"hand": "dashed", "fitted": "solid"})
    + labs(x="season", y="canopy trees per run (height ≥ 30)", linetype="birch and beech")
    + theme_minimal()
    + theme(figure_size=(7, 3.5))
)
fig.save(FIGURES / f"{NOTE}-mixed-wood.png", dpi=100, verbose=False)

# Crown silhouettes, hand-tuned against fitted (lone trees through the CLI, which writes form.csv).
lone_dir = "runs/m27-holdout/lone"
lone_runs = []
for sp in PILOT:
    for s in SEEDS:
        world = {"world": {"width": 160, "height": 160, "walls": []}, "trees": [{"x": 80, "species": sp}]}
        lone_runs.append(Run(f"{lone_dir}/{sp}_hand_s{s}", "oakOpen", s, 60, world))
        lone_runs.append(Run(f"{lone_dir}/{sp}_fitted_s{s}", "oakOpen", s, 60, {**world, "species": {sp: patch[sp]}}))
run_many(lone_runs, workers=args.workers)
form = load_runs(REPO / lone_dir, "form").filter(pl.col("season") == 60).with_columns(
    pl.col("run").str.extract(r"^(\w+?)_").alias("sp"), pl.col("run").str.extract(r"_(hand|fitted)_").alias("patch")
)
bands = [f"p{k}" for k in range(10)]
prof = (
    form.group_by("sp", "patch").agg([pl.col(b).mean() for b in bands])
    .unpivot(index=["sp", "patch"], on=bands, variable_name="band", value_name="w")
    .with_columns(((pl.col("band").str.slice(1).cast(pl.Int32) + 0.5) / 10).alias("h"))
)
sil = pl.concat([
    prof.with_columns((pl.col("w") / 2).alias("x"), pl.col("h").alias("order")),
    prof.with_columns((-pl.col("w") / 2).alias("x"), (2 - pl.col("h")).alias("order")),
]).sort("sp", "patch", "order")
fig = (
    ggplot(sil, aes("x", "h", linetype="patch", group="patch"))
    + geom_path(size=0.8)
    + facet_wrap("sp")
    + scale_linetype_manual(values={"hand": "dashed", "fitted": "solid"})
    + labs(x="crown width over the widest band", y="height in the crown", linetype="")
    + theme_minimal()
    + theme(figure_size=(6, 3.2))
)
fig.save(FIGURES / f"{NOTE}-profiles.png", dpi=100, verbose=False)

# Lab links: the fitted species in their own wood (share.ts encodes ?p= as base64url JSON).
def lab_link(sp: str) -> str:
    p = json.dumps({"species": {sp: patch[sp]}}, separators=(",", ":"))
    enc = base64.urlsafe_b64encode(p.encode()).decode().rstrip("=")
    return f"https://epabarker.github.io/tree-simulation/?preset={sp}Wood&seed=1&p={enc}"


links = {sp: lab_link(sp) for sp in PILOT}
links.update({f"{sp} (open)": lab_link(sp).replace(f"preset={sp}Wood", "preset=oakOpen") for sp in PILOT})

summary = {
    "shade": shade,
    "shadeBand": band,
    "allometry": allometry,
    "wood": wood_table.to_dicts(),
    "plausibility": plausibility,
    "links": links,
}
(OUT / "holdout.json").write_text(json.dumps(summary, indent=2) + "\n")

with pl.Config(tbl_cols=20, tbl_width_chars=200, tbl_rows=60):
    print("1. lowest light every seedling survives (fitted must stay in its band and order)")
    for k, v in sorted(shade.items(), key=lambda kv: (kv[1] is None, kv[1] or 0)):
        print(f"   {k:20} {'none' if v is None else f'{100 * v:.1f}%'}")
    print("   bands:", band)
    print("2–3. allometry and release (medians / means over seeds)")
    print(pl.DataFrame([{"tree": k, **v} for k, v in allometry.items()]))
    print("4. canopy trees per run in the mixed wood")
    print(wood_table.pivot("species", index=["patch", "season"], values="trees").fill_null(0))
    print("5. plausibility")
    print(plaus)
print("lab links:")
for k, v in links.items():
    print(f"   {k}: {v}")
print(f"wrote {OUT / 'holdout.json'} and figures in {FIGURES}")
