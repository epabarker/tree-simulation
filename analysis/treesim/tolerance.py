"""Gate c's pre-registration (docs/plans/2026-11-03-reference-fidelity.md §j, the 1c brief, amendment E): every number
and rule the degradation test reads, computed from real QSMs only and committed before any simulated tree is
coarsened. Nothing in the file changes after a gate c result is seen; a change is a new commit with its reason in
the experiment note (docs/experiments/2026-11-03-phase1-converter.md).

Per species and descriptor:
- **between-tree SD**: the SD (ddof 2) of the residuals of an OLS fit of the descriptor on ln(measured DBH) (R2:
  measured, never DBHqsm), over the species' tolerance set: oak, Wytham's oaks with `DBH_pts`; field maple, Wytham's
  sycamores with `DBH_pts` (a proxy, decision 6); beech, Demol's 15 FSYL (tape DBH). BioDiv's beech are "Phase 1
  only" (R5): never a tolerance. With its 95% χ² interval for σ (Demol's 15 leave 13 degrees of freedom: about
  ×0.72 to ×1.61), so a hold-out can be read as "tolerance uncertain" (|shift| inside the upper bound) or
  "resolution-sensitive" (beyond it). Under MIN_TREES finite trees the tolerance is undefined and the descriptor is
  held out.
- **tolerance**: half the between-tree SD (the plan's rule, kept).
- **noise floor**: the between-model SD over Wytham's 10 models (R3: 8 middle sycamores; the 4 oaks of largest
  between-model DBH SD, so oak's floor leans conservative), pooled as the RMS of the per-tree SDs (the verdict), the
  median beside it. A floor of at least half the between-tree SD holds the descriptor out, whatever gate c says.
  Beech has no 10-model set: its floor is "not measured"; BioDiv's 5 repeats of the optimum's input set are
  reported beside it ("Phase 1 only, not a verdict").
- **H1** (the user, 2026-11-03): Wytham's radius descriptors are excluded for oak (TreeQSM 2.0 radii are
  taper-corrected); extended here to field maple, whose data are the same dataset's (a proposal for the user).

Per dataset, its resolution (coarsen.resolution), from its own one-model-per-tree QSMs.

    uv run --project analysis python -I -m treesim.tolerance      # writes TOLERANCES
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from pathlib import Path

import numpy as np
import scipy.io as sio
from scipy import stats

from treesim import coarsen as co
from treesim import qsm
from treesim.describe import FORM_COLUMNS, NEW, describe
from treesim.fetch import DATA, NOISE_DIR, NOISE_OAKS, NOISE_SYCAMORES, ROOT

TOLERANCES = ROOT / "analysis" / "fit" / "sources" / "phase1-tolerances.json"
CACHE = ROOT / "runs" / "phase1" / "real"
DESCRIPTORS = tuple(k for k in FORM_COLUMNS if k != "leafStemSlope") + ("p0", "p1", "p2", "p3") + NEW
MIN_TREES = 10
HOLD_NOISE = 0.5
TOLERANCE = 0.5
WYTHAM_RADIUS = ("junctionDelta", "ldSlope", "taper", "leaderDominance")
DESCRIBED = ("analysis/treesim/describe.py", "analysis/treesim/form.py", "analysis/treesim/cylinders.py",
             "analysis/treesim/qsm.py")
HASHED = DESCRIBED + ("analysis/treesim/coarsen.py",)

# The gate's rules, fixed here before any run (the 1c brief; the advisor's review at the plan, 2026-11-03).
RULES = {
    "seeds": list(range(1, 21)),
    "stand_season": 150,
    "lone_season": 100,
    "lone": "reported only",
    "bracket": [0.5, 1.0, 2.0],
    "inflation": "Demol et al. 2022 (Silva Fennica 56(1) 10550, §3.2, Table 3): diameter +73% under 2.5 cm, +4% "
                 "over 10 cm, both measured on two leaf-off Fraxinus; log-interpolated between (not measured). One "
                 "bracket point, at d_min × 1. Order: inflate, prune, re-cut",
    "datasets": {"oak": ["wytham", "biodiv"], "beech": ["demol", "biodiv"], "maple": ["wytham"]},
    "datasets_note": "BioDiv's resolution is measured on its beech (the only BioDiv QSMs fetched) and applied to oak",
    "shift": "per seed, the median over the stand's live measured trees (STAND_MEASURED, alive at 150) of "
             "describe(coarsen(tree)) − describe(tree)",
    "pass": "|shift| <= tolerance on >= 15 of the 20 seeds, at every bracket point and the inflation point, at each "
            "of the species' datasets",
    "pass_seeds": 15,
    "fail": "a seed with no live measured tree, or a NaN shift (the descriptor not computable at the resolution), "
            "counts as a fail",
    "held_out": "gate c failed, or noise floor >= 0.5 × between-tree SD, or fewer than MIN_TREES finite real trees",
    "survive": "per species, over its gated descriptors (DESCRIPTORS less report-only and H1-excluded): if fewer "
               "than half pass, stop and report; never loosen",
    "h2": "ldSlope under the inflation point moves toward the dataset's QSM median: the gap closed is "
          "median shift / (QSM median − simulated median, uncoarsened), on beech at Demol and BioDiv. 'Hard' means "
          "at least half the gap closed",
    "h3": "tortuosity and tortuosity05 (0.5 m resampling) reported on the real QSMs, the simulated trees and the "
          "coarsened ones",
    "control": "each real QSM coarsened at its own dataset's resolution (× 1, no inflation): the shift should be "
               "near zero; a large one says the re-cut moves the descriptor by construction",
}


def _csv(path: Path) -> list[dict]:
    with path.open() as f:
        return list(csv.DictReader(f))


def _num(s) -> float:
    try:
        return float(s)
    except (TypeError, ValueError):
        return math.nan


def real_sets() -> list[dict]:
    """Every one-model-per-tree QSM: dataset, species, tree, path, measured DBH (m)."""
    out = []
    demol = {r["tree_name"]: r for r in _csv(DATA / "demol" / "Destructive_and_qsm_data_DEMOL.csv")}
    for path in sorted((DATA / "demol" / "qsm").glob("*.mat")):
        site, n = re.match(r"([A-Z]+)(\d+)$", path.stem).groups()
        r = demol.get(f"{site}-{int(n):02d}", {})
        out.append({"dataset": "demol", "species": site, "tree": path.stem, "path": path,
                    "dbh_measured": _num(r.get("DBH")) / 100.0})
    tls = {r["Tree_ID"]: r for r in _csv(DATA / "wytham" / "analysis_and_figures" / "tls_summary.csv")}
    sp = {r["TLS_ID"]: r["species"] for r in _csv(DATA / "wytham" / "analysis_and_figures" / "trees_summary.csv")}
    for path in sorted((DATA / "wytham" / "qsm").glob("wytham_winter_*.mat")):
        tree = re.match(r"wytham_winter_([^-]+)-", path.name).group(1)
        out.append({"dataset": "wytham", "species": sp.get(tree, ""), "tree": tree, "path": path,
                    "dbh_measured": _num(tls[tree]["DBH_pts_[m]"])})
    labels = {r["treeID"]: r for r in _csv(DATA / "biodiv" / "labels.csv")}
    for path in sorted((DATA / "biodiv" / "qsm-all").rglob("*_all.mat")):
        tree = path.name.removesuffix("_all.mat")
        out.append({"dataset": "biodiv", "species": labels[tree]["species"], "tree": tree, "path": path,
                    "dbh_measured": _num(labels[tree]["dTLS"]) / 100.0})
    return out


SPECIES_SET = {"oak": ("wytham", "QUERRO"), "maple": ("wytham", "ACERPS"), "beech": ("demol", "FSYL")}


def _describe_cached(key: str, load) -> dict:
    """describe() of one table, cached as JSON under runs/phase1/real/ (keyed by the hashed code, so a change to
    describe() recomputes)."""
    store = CACHE / f"{key}.{code_hash()[:12]}.json"
    if store.exists():
        return json.loads(store.read_text())
    c = load()
    d = {k: (None if isinstance(v, float) and not math.isfinite(v) else v) for k, v in describe(c).items()}
    store.parent.mkdir(parents=True, exist_ok=True)
    store.write_text(json.dumps(d))
    return d


def _val(d: dict, k: str) -> float:
    v = d.get(k)
    return math.nan if v is None else float(v)


def code_hash() -> str:
    """What a real tree's descriptors depend on (the cache's key; coarsen.py is not among it)."""
    h = hashlib.sha256()
    for f in DESCRIBED:
        h.update((ROOT / f).read_bytes())
    return h.hexdigest()


def file_hashes() -> dict[str, str]:
    return {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in HASHED}


def between_tree(rows: list[dict], k: str) -> dict:
    x = np.array([math.log(r["dbh_measured"]) for r in rows if math.isfinite(r["dbh_measured"])
                  and math.isfinite(_val(r["d"], k))])
    y = np.array([_val(r["d"], k) for r in rows if math.isfinite(r["dbh_measured"]) and math.isfinite(_val(r["d"], k))])
    n = len(y)
    if n < MIN_TREES:
        return {"n": n, "sd": math.nan, "sd_lo": math.nan, "sd_hi": math.nan, "slope": math.nan, "median": math.nan}
    slope, icpt = np.polyfit(x, y, 1)
    res = y - (slope * x + icpt)
    df = n - 2
    sd = float(math.sqrt((res**2).sum() / df))
    return {"n": n, "sd": sd, "sd_lo": sd * math.sqrt(df / stats.chi2.ppf(0.975, df)),
            "sd_hi": sd * math.sqrt(df / stats.chi2.ppf(0.025, df)), "slope": float(slope),
            "median": float(np.median(y))}


def _pool(sds: list[float]) -> tuple[float, float, int]:
    s = [v for v in sds if math.isfinite(v)]
    if not s:
        return math.nan, math.nan, 0
    return float(math.sqrt(np.mean(np.square(s)))), float(np.median(s)), len(s)


def wytham_noise() -> dict[str, dict[str, list[float]]]:
    """Species → descriptor → per-tree between-model SDs (ddof 1) over each tree's 10 models."""
    out: dict[str, dict[str, list[float]]] = {}
    for species, trees in (("maple", NOISE_SYCAMORES), ("oak", NOISE_OAKS)):
        for tree in trees:
            paths = sorted(NOISE_DIR.glob(f"wytham_winter_{tree}-*.mat"))
            if len(paths) != 10:
                raise FileNotFoundError(f"wytham {tree}: {len(paths)} models of 10 under {NOISE_DIR}")
            ds = [_describe_cached(f"noise-{p.stem}", lambda p=p: qsm.read(p).cylinders) for p in paths]
            for k in DESCRIPTORS:
                v = [_val(d, k) for d in ds]
                v = [x for x in v if math.isfinite(x)]
                out.setdefault(species, {}).setdefault(k, []).append(float(np.std(v, ddof=1)) if len(v) >= 3 else math.nan)
    return out


def biodiv_repeats(rows: list[dict]) -> dict[str, list[float]]:
    """Descriptor → per-tree SDs over the 5 repeats of the optimum's input set (Phase 1 only, not a verdict)."""
    out: dict[str, list[float]] = {}
    for r in rows:
        if r["dataset"] != "biodiv":
            continue
        ds = []
        for k in _optimum_set(r["path"]):
            ds.append(_describe_cached(f"biodiv-{r['tree']}-m{k}", lambda k=k, r=r: qsm.read(r["path"], model=k).cylinders))
        for key in DESCRIPTORS:
            v = [x for x in (_val(d, key) for d in ds) if math.isfinite(x)]
            out.setdefault(key, []).append(float(np.std(v, ddof=1)) if len(v) >= 3 else math.nan)
    return out


def _optimum_set(path: Path) -> list[int]:
    store = CACHE / f"biodiv-{path.name}.set.json"
    if store.exists():
        return json.loads(store.read_text())
    d = sio.loadmat(path, squeeze_me=True, struct_as_record=False)
    ks = [int(k) for k in qsm.optimum_set(list(np.atleast_1d(d["QSMs"])))]
    store.parent.mkdir(parents=True, exist_ok=True)
    store.write_text(json.dumps(ks))
    return ks


def _clean(x):
    if isinstance(x, float) and not math.isfinite(x):
        return None
    if isinstance(x, dict):
        return {k: _clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [_clean(v) for v in x]
    return x


def build() -> dict:
    rows = real_sets()
    for r in rows:
        r["d"] = _describe_cached(f"{r['dataset']}-{r['tree']}", lambda r=r: qsm.read(r["path"]).cylinders)
    resolution = {}
    for dataset in ("demol", "wytham", "biodiv"):
        res = co.resolution([qsm.read(r["path"]).cylinders for r in rows if r["dataset"] == dataset])
        resolution[dataset] = {"d_min": res.d_min, "ratio": list(res.ratio), "count": list(res.count),
                               "trees": sum(r["dataset"] == dataset for r in rows)}
    noise = wytham_noise()
    repeats = biodiv_repeats(rows)
    table = []
    for species, (dataset, code) in SPECIES_SET.items():
        sel = [r for r in rows if r["dataset"] == dataset and r["species"] == code]
        for k in DESCRIPTORS:
            bt = between_tree(sel, k)
            rms, med, nn = _pool(noise.get(species, {}).get(k, []))
            brms, bmed, bn = _pool(repeats.get(k, [])) if species == "beech" else (math.nan, math.nan, 0)
            excluded = dataset == "wytham" and k in WYTHAM_RADIUS
            ratio = rms / bt["sd"] if math.isfinite(rms) and bt["sd"] > 0 else math.nan
            verdict = ("excluded (H1)" if excluded else "held out (too few trees)" if bt["n"] < MIN_TREES
                       else "not measured" if not math.isfinite(rms)
                       else "held out (noise)" if ratio >= HOLD_NOISE else "clear")
            table.append({"species": species, "descriptor": k, "set": f"{dataset} {code}", "n": bt["n"],
                          "median": bt["median"], "slope_lnDBH": bt["slope"], "between_sd": bt["sd"],
                          "between_sd_lo95": bt["sd_lo"], "between_sd_hi95": bt["sd_hi"],
                          "tolerance": TOLERANCE * bt["sd"], "noise_rms": rms, "noise_median": med, "noise_trees": nn,
                          "noise_ratio": ratio, "noise_verdict": verdict,
                          "biodiv_repeats_rms": brms, "biodiv_repeats_trees": bn,
                          "biodiv_repeats_ratio": brms / bt["sd"] if math.isfinite(brms) and bt["sd"] > 0 else math.nan})
    qsm_medians = {}
    for dataset in ("demol", "wytham", "biodiv"):
        for species in {"demol": ["FSYL"], "wytham": ["QUERRO", "ACERPS"], "biodiv": ["Fagus_sylvatica"]}[dataset]:
            sel = [r for r in rows if r["dataset"] == dataset and r["species"] == species]
            qsm_medians[f"{dataset} {species}"] = {k: float(np.nanmedian([_val(r["d"], k) for r in sel]))
                                                   for k in ("ldSlope", "tortuosity", "tortuosity05")}
    return _clean({
        "written": "2026-11-03, before any simulated tree was coarsened (phase 1c, step 2)",
        "hashes": file_hashes(), "rules": RULES, "descriptors": list(DESCRIPTORS), "min_trees": MIN_TREES,
        "tolerance_factor": TOLERANCE, "hold_noise": HOLD_NOISE, "h1_excluded": {"oak": list(WYTHAM_RADIUS),
        "maple": list(WYTHAM_RADIUS)}, "h1_note": "oak: the user's ruling; maple: extended (same dataset), the user's "
        "to confirm", "edges": [e if math.isfinite(e) else None for e in co.EDGES], "resolution": resolution,
        "qsm_medians": qsm_medians, "table": table,
    })


if __name__ == "__main__":
    t = build()
    TOLERANCES.write_text(json.dumps(t, indent=1) + "\n")
    print(f"{TOLERANCES}: {len(t['table'])} rows")
