"""M27: the hold-out checks of the fitted species (ADR 0020), none of which the fit saw.

    uv run --project analysis python analysis/experiments/m27_holdout.py --round round3   # 3D fits
    uv run --project analysis python analysis/experiments/m27_holdout.py --smoke    # on the smoke fits

Reads docs/experiments/fits/<round>/<species>.json for every species fitted so far and compares
the patches the woods grow now ("hand": FLORA, round 2 as adopted) and the fitted ones on:

0. the floor of each species' own wood, planted per area between opaque faces (τ 0), at season 100
   (and 150, for the record), 3 seeds, against the targets' [holdout] floor: a one-row stand trial
   lights its floor through the empty depth beside the row (the species plan of 2026-10-30, §0.3);

1. shade tolerance: the lowest light at which every seedling lives in the shade house, against
   the species' band, and its Spearman correlation over all ten species with Niinemets &
   Valladares's tolerance scores (2006; fitted patches where there are fits, hand-tuned otherwise);
2. the §10 allometries: Δ, the length–diameter and leaf–section slopes (M26);
3. release: epicormic shoots and lean into a felled neighbour's gap (M10);
4. the mixed wood (`mixedWood`, 400 seasons, 3 seeds) with every fitted patch swapped in at once:
   birch leads early and fades, beech ends with the most canopy trees (M25); canopy trees per
   species every 50 seasons, and the tallest tree against the top (200);
5. the lab species, which the mixed wood leaves out: fitted fir and pine in their own woods
   (`firWood`, `pineWood`, 200 seasons), against the hand-tuned ones;
6. plausibility: each fitted parameter against its bounds, and how far the restarts agree (CMA-ES).

Writes docs/experiments/fits/<round>/holdout.json, figures under docs/experiments/figures/ and lab
links. Needs Node 24 first on PATH. `--only floor` runs section 0 alone.
"""

import argparse
import base64
import json
import os

import numpy as np
import polars as pl
from plotnine import aes, facet_wrap, geom_line, geom_path, ggplot, labs, scale_linetype_manual, theme, theme_minimal
from treesim import REPO, Run, load_runs, run_many
from treesim.fit import SPECIES, Pool, load_spec

parser = argparse.ArgumentParser()
parser.add_argument("--smoke", action="store_true")
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
parser.add_argument("--round", default="round3", help="the fits' folder under docs/experiments/fits/")
parser.add_argument("--only", choices=["floor"], help="run one section")
args = parser.parse_args()

#: Lab species: not planted in the mixed wood, checked in their own woods instead.
LAB = ["fir", "pine"]
#: Species with a `<species>Wood` preset of their own.
WOODS = ["birch", "oak", "beech", "fir", "pine"]
FITS = REPO / ("runs/m27-fit-smoke" if args.smoke else f"docs/experiments/fits/{args.round}")
OUT = REPO / ("runs/m27-holdout-smoke" if args.smoke else f"docs/experiments/fits/{args.round}")
FIGURES = REPO / ("runs/m27-holdout-smoke" if args.smoke else "docs/experiments/figures")
RUNS = "runs/m27-holdout-smoke" if args.smoke else "runs/m27-holdout"
NOTE = f"2026-10-30-species-{args.round}"
SEEDS = [1, 2] if args.smoke else [1, 2, 3, 4, 5]
WOOD_SEEDS = [1] if args.smoke else [1, 2, 3]
FLOOR_SEEDS = [1] if args.smoke else [1, 2, 3]
WOOD_SEASONS = 100 if args.smoke else 400
LAB_SEASONS = 60 if args.smoke else 200
OUT.mkdir(parents=True, exist_ok=True)
FIGURES.mkdir(parents=True, exist_ok=True)


def fit_file(sp: str, name: str):
    return FITS / sp / name if args.smoke else FITS / name


FITTED = [sp for sp in SPECIES if fit_file(sp, f"{sp}.json").exists()]
if not FITTED:
    raise SystemExit(f"no fits under {FITS}: run m27_fit.py first")
print("fitted:", ", ".join(FITTED))
fits = {sp: json.loads(fit_file(sp, f"{sp}.json").read_text()) for sp in FITTED}
assign = {sp: fits[sp]["fit"]["assign"] for sp in FITTED}
patch = {sp: fits[sp]["fit"]["patch"] for sp in FITTED}
specs = {sp: load_spec(sp) for sp in SPECIES}

pool = Pool(args.workers)


# 0. The floor of each species' own wood ----------------------------------------------------------
def wood_floor(species: str, a: dict) -> dict:
    replies = pool.map([{"species": species, "assign": a, "seeds": [s], "trials": ["wood"]} for s in FLOOR_SEEDS])
    rec = [r["wood"][0] for r in replies]
    return {k: float(np.mean([x[k] for x in rec])) for k in ("floor100", "floor150")}


floor_rows = []
for sp in FITTED:
    target = specs[sp].holdout.get("floor")
    for which, a in [("hand", {}), ("fitted", assign[sp])]:
        f = wood_floor(sp, a)
        inside = None if target is None else abs(f["floor100"] - target["target"]) <= target["band"]
        floor_rows.append({"species": sp, "patch": which, **f,
                           "target": target and target["target"], "band": target and target["band"], "in band": inside})
print("0. the floor of each species' own wood at 100 (150), τ 0, per area, mean of seeds", FLOOR_SEEDS)
for r in floor_rows:
    print(f"   {r['species']:9} {r['patch']:7} {100 * r['floor100']:5.1f}% ({100 * r['floor150']:4.1f}%)  "
          f"target {100 * r['target']:.1f} ± {100 * r['band']:.1f}%  {'in band' if r['in band'] else 'OUT'}")
if args.only == "floor":
    pool.close()
    (OUT / "holdout-floor.json").write_text(json.dumps(floor_rows, indent=2) + "\n")
    raise SystemExit(0)


def ask_all(species: str, a: dict, trials: list[str], seeds: list[int]) -> list[dict]:
    return pool.map([{"species": species, "assign": a, "seeds": [s], "trials": trials} for s in seeds])


# 1. Shade tolerance -----------------------------------------------------------------------------
def survival_light(species: str, a: dict) -> float | None:
    replies = ask_all(species, a, ["shade"], SEEDS)
    roofs = replies[0]["shade"].keys()
    lit = {r: float(np.mean([rep["light"][r] for rep in replies])) for r in roofs}
    ok = [lit[r] for r in roofs if all(rep["shade"][r][0] for rep in replies)]
    return min(ok) if ok else None


def spearman(xs: list[float], ys: list[float]) -> float:
    rx = pl.Series(xs).rank("average").to_numpy()
    ry = pl.Series(ys).rank("average").to_numpy()
    return float(np.corrcoef(rx, ry)[0, 1])


hand_light = {sp: survival_light(sp, {}) for sp in SPECIES}
fitted_light = {sp: survival_light(sp, assign[sp]) for sp in FITTED}
shade = {f"{sp} (hand)": hand_light[sp] for sp in SPECIES}
shade.update({f"{sp} (fitted)": fitted_light[sp] for sp in FITTED})
band = {sp: specs[sp].holdout.get("survivalLight") for sp in FITTED}
in_band = {sp: v is not None and band[sp][0] <= v <= band[sp][1] for sp, v in fitted_light.items()}
# Tolerant species survive less light, so the expected correlation is strongly negative. A species
# none of whose seedlings survive even the lightest roof ranks as needing the most light.
score = {sp: specs[sp].holdout["shadeScore"] for sp in SPECIES}
light_or_top = lambda v: 1.0 if v is None else v
rho = {
    "hand": spearman([score[sp] for sp in SPECIES], [light_or_top(hand_light[sp]) for sp in SPECIES]),
    "fitted": spearman(
        [score[sp] for sp in SPECIES],
        [light_or_top(fitted_light.get(sp, hand_light[sp])) for sp in SPECIES],
    ),
}


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


allometry = {f"{sp} ({k})": summarise(sp, a) for sp in FITTED for k, a in [("hand", {}), ("fitted", assign[sp])]}
pool.close()


def canopy_counts(root: str, seeds: list[int]) -> pl.DataFrame:
    """Canopy trees (height ≥ 30) per run, by patch, season and species, every 25 seasons."""
    runs = load_runs(REPO / root).with_columns(pl.col("run").str.extract(r"^(\w+?)_").alias("patch"))
    return (
        runs.filter(pl.col("alive"), pl.col("height") >= 30, pl.col("season") % 25 == 0)
        .group_by("patch", "season", "species")
        .agg((pl.len() / len(seeds)).alias("trees"))
        .sort("patch", "season", "species")
    )


# 4. The mixed wood, every fitted woodland species at once -----------------------------------------
wood = f"{RUNS}/wood"
wood_fitted = [sp for sp in FITTED if sp not in LAB]
runs = [Run(f"{wood}/hand_s{s}", "mixedWood", s, WOOD_SEASONS) for s in WOOD_SEEDS]
if wood_fitted:
    swapped = {"species": {sp: patch[sp] for sp in wood_fitted}}
    runs += [Run(f"{wood}/fitted_s{s}", "mixedWood", s, WOOD_SEASONS, swapped) for s in WOOD_SEEDS]
run_many(runs, workers=args.workers)
canopy = canopy_counts(wood, WOOD_SEEDS)
checkpoints = [s for s in range(50, 401, 50) if s <= WOOD_SEASONS]
wood_table = canopy.filter(pl.col("season").is_in(checkpoints))
# The tallest tree of each run against the woods' top (200): beech, hornbeam and oak levelling off
# below it is the 3D re-fit's bar (the species plan §2.5).
tallest = (
    load_runs(REPO / wood).with_columns(pl.col("run").str.extract(r"^(\w+?)_").alias("patch"))
    .filter(pl.col("alive"), pl.col("season").is_in(checkpoints))
    .group_by("patch", "run", "season").agg(pl.col("height").max().alias("tallest"))
    .group_by("patch", "season").agg(pl.col("tallest").mean().alias("mean"), pl.col("tallest").max().alias("max"))
    .sort("patch", "season")
)

# 5. The lab species in their own woods ----------------------------------------------------------------
lab_fitted = [sp for sp in FITTED if sp in LAB]
lab_rows: list[dict] = []
if lab_fitted:
    lab = f"{RUNS}/lab"
    runs = []
    for sp in lab_fitted:
        for s in WOOD_SEEDS:
            runs.append(Run(f"{lab}/{sp}/hand_s{s}", f"{sp}Wood", s, LAB_SEASONS))
            runs.append(Run(f"{lab}/{sp}/fitted_s{s}", f"{sp}Wood", s, LAB_SEASONS, {"species": {sp: patch[sp]}}))
    run_many(runs, workers=args.workers)
    for sp in lab_fitted:
        m = load_runs(REPO / lab / sp).with_columns(pl.col("run").str.extract(r"^(\w+?)_").alias("patch"))
        at = [s for s in [50, 100, 150, 200] if s <= LAB_SEASONS]
        lab_rows += (
            m.filter(pl.col("alive"), pl.col("season").is_in(at))
            .group_by("patch", "season")
            .agg(
                (pl.len() / len(WOOD_SEEDS)).alias("live trees"),
                ((pl.col("height") >= 30).sum() / len(WOOD_SEEDS)).alias("canopy trees"),
                pl.col("height").max().alias("tallest"),
                pl.col("slenderness").filter(pl.col("height") >= 30).median().alias("canopy H/D"),
            )
            .with_columns(pl.lit(sp).alias("species"))
            .sort("patch", "season")
            .to_dicts()
        )
lab_table = pl.DataFrame(lab_rows) if lab_rows else pl.DataFrame()

# 6. Plausibility ---------------------------------------------------------------------------------
plausibility = []
for sp in FITTED:
    ends = fits[sp].get("restarts", [])
    for p in specs[sp].params:
        path, lo, hi = p["path"], p["lo"], p["hi"]
        fitted = assign[sp][path]
        hand = (fits[sp]["hand"]["values"] if "hand" in fits[sp] else fits[sp]["start"]["assign"]).get(path)
        at_bound = min(fitted - lo, hi - fitted) < 0.02 * (hi - lo)
        spread = float(np.std([e["mean"][path] for e in ends]) / (hi - lo)) if len(ends) > 1 else float("nan")
        plausibility.append({
            "species": sp, "param": path, "hand": hand, "fitted": round(fitted, 4), "lo": lo, "hi": hi,
            "at bound": at_bound, "restart spread (of range)": round(spread, 2),
        })
plaus = pl.DataFrame(plausibility)

# Figures -----------------------------------------------------------------------------------------
cols = min(5, len(FITTED))
rows = -(-len(FITTED) // cols)
progress = pl.concat([
    pl.read_csv(fit_file(sp, f"{sp}-progress.csv")).with_columns(pl.lit(sp).alias("species"))
    for sp in FITTED if fit_file(sp, f"{sp}-progress.csv").exists()
]) if any(fit_file(sp, f"{sp}-progress.csv").exists() for sp in FITTED) else None
fig = None if progress is None else (
    ggplot(progress, aes("generation", "best", colour="factor(restart)"))
    + geom_line()
    + facet_wrap("species", ncol=cols, scales="free_y")
    + labs(x="generation", y="best loss in the generation", colour="restart")
    + theme_minimal()
    + theme(figure_size=(2.6 * cols + 1, 2.6 * rows + 0.6))
)
if fig is not None:
    fig.save(FIGURES / f"{NOTE}-progress.png", dpi=100, verbose=False)

fig = (
    ggplot(canopy, aes("season", "trees", colour="species", linetype="patch"))
    + geom_line(size=1)
    + scale_linetype_manual(values={"hand": "dashed", "fitted": "solid"})
    + labs(x="season", y="canopy trees per run (height ≥ 30)", linetype="patches")
    + theme_minimal()
    + theme(figure_size=(7, 3.5))
)
fig.save(FIGURES / f"{NOTE}-mixed-wood.png", dpi=100, verbose=False)

# Crown silhouettes, hand-tuned against fitted (lone trees through the CLI, which writes form.csv).
lone_dir = f"{RUNS}/lone"
lone_runs = []
for sp in FITTED:
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
    + facet_wrap("sp", ncol=cols)
    + scale_linetype_manual(values={"hand": "dashed", "fitted": "solid"})
    + labs(x="crown width over the widest band", y="height in the crown", linetype="")
    + theme_minimal()
    + theme(figure_size=(2.2 * cols + 1, 2.4 * rows + 0.6))
)
fig.save(FIGURES / f"{NOTE}-profiles.png", dpi=100, verbose=False)


# Lab links (share.ts encodes ?p= as base64url JSON): each fitted species in its own wood, or in
# the mixed wood where it has none; alone in the open; and the mixed wood with every fit at once.
def lab_link(preset: str, p: dict) -> str:
    enc = base64.urlsafe_b64encode(json.dumps(p, separators=(",", ":")).encode()).decode().rstrip("=")
    return f"https://epabarker.github.io/tree-simulation/?preset={preset}&seed=1&p={enc}"


links = {}
for sp in FITTED:
    links[sp] = lab_link(f"{sp}Wood" if sp in WOODS else "mixedWood", {"species": {sp: patch[sp]}})
    links[f"{sp} (open)"] = lab_link(
        "oakOpen", {"trees": [{"x": 80, "species": sp}], "species": {sp: patch[sp]}}
    )
if wood_fitted:
    links["mixed wood (all fitted)"] = lab_link("mixedWood", {"species": {sp: patch[sp] for sp in wood_fitted}})

summary = {
    "fitted": FITTED,
    "floor": floor_rows,
    "shade": shade,
    "shadeBand": band,
    "shadeInBand": in_band,
    "shadeSpearman": rho,
    "allometry": allometry,
    "wood": wood_table.to_dicts(),
    "tallest": tallest.to_dicts(),
    "labWoods": lab_rows,
    "plausibility": plausibility,
    "links": links,
}
(OUT / "holdout.json").write_text(json.dumps(summary, indent=2) + "\n")

with pl.Config(tbl_cols=20, tbl_width_chars=200, tbl_rows=200):
    print("1. lowest light every seedling survives (fitted must stay in its band and order)")
    for k, v in sorted(shade.items(), key=lambda kv: (kv[1] is None, kv[1] or 0)):
        print(f"   {k:20} {'none' if v is None else f'{100 * v:.1f}%'}")
    print("   bands:", band)
    print("   in band:", in_band)
    print(f"   Spearman ρ against tolerance scores: hand {rho['hand']:.2f}, fitted {rho['fitted']:.2f} (expect ≈ −1)")
    print("2–3. allometry and release (medians / means over seeds)")
    print(pl.DataFrame([{"tree": k, **v} for k, v in allometry.items()]))
    print(f"4. canopy trees per run in the mixed wood (fitted: {', '.join(wood_fitted) or 'none'})")
    print(wood_table.pivot("species", index=["patch", "season"], values="trees").fill_null(0))
    print("   the tallest tree per run (mean and max over seeds; the top is 200)")
    print(tallest)
    if lab_rows:
        print("5. the lab species in their own woods (per run)")
        print(lab_table)
    print("6. plausibility")
    print(plaus)
print("lab links:")
for k, v in links.items():
    print(f"   {k}: {v}")
print(f"wrote {OUT / 'holdout.json'} and figures in {FIGURES}")
