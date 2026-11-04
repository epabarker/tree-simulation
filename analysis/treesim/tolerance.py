"""Gate c's pre-registration (docs/plans/2026-11-03-reference-fidelity.md §j; v1 the 1c brief and amendment E, commit
e74063c; v2 the 1d brief, session 1d-i, commit 3f13c29; v3 the user's rulings after v2, session 1d-i): every number and rule the degradation test reads, computed from real QSMs
only and committed before any simulated tree is coarsened. Nothing in the file changes after a gate c result is
seen; a change is a new commit with its reason in the experiment note (docs/experiments/2026-11-03-phase1-converter.md).

**v2** (designed after v1 failed; the note's "v2 instrument"): beech's tolerance set and noise floor are BioDiv's 53
and its 5 repeats (decision 4); d_min per dataset from the control curve on its own QSMs (control.py, decision 1);
the two tiers (tiers.py, decision 2); ldSlope and junctionDelta report-only (decision 7); the size-matching rule
(decision 6).

**v3** (designed after v2's control failed on the re-cut; the user's rulings, 2026-11-03): coarsening is prune only
(coarsen.py); every segment-length-dependent descriptor is read at describe()'s fixed 0.5 m step, the per-cylinder
ones (tortuosity, limbElevation, pendulousFraction) report-only; beech's per-tree value is the median over its 5
repeats, its floor the between-repeat SD / √5 against the between-tree SD of those medians (Wytham stays single-model:
only 12 trees have 10 models, an asymmetry the note records); amendment E's stop applies to the coarsening test over
the descriptors that pass the floor. The rest below is v1's and unchanged.

Per species and descriptor:
- **between-tree SD**: the SD (ddof 2) of the residuals of an OLS fit of the descriptor on ln(measured DBH) (R2:
  measured, never DBHqsm), over the species' tolerance set: oak, Wytham's oaks with `DBH_pts`; field maple, Wytham's
  sycamores with `DBH_pts` (a proxy, decision 6); beech, v2: BioDiv's 53 (dTLS; v1 Demol's 15 FSYL, tape DBH).
  With its 95% χ² interval for σ, so a hold-out can be read as "tolerance uncertain" (|shift| inside the upper bound) or
  "resolution-sensitive" (beyond it). Under MIN_TREES finite trees the tolerance is undefined and the descriptor is
  held out.
- **tolerance**: half the between-tree SD (the plan's rule, kept).
- **noise floor**: the between-model SD over Wytham's 10 models (R3: 8 middle sycamores; the 4 oaks of largest
  between-model DBH SD, so oak's floor leans conservative), pooled as the RMS of the per-tree SDs (the verdict), the
  median beside it. A floor of at least half the between-tree SD holds the descriptor out, whatever gate c says.
  Beech has no 10-model set: v2 takes BioDiv's 5 repeats of the optimum's input set as its floor (the verdict; v1
  reported them only).
- **H1** (the user, 2026-11-03): Wytham's radius descriptors are excluded for oak (TreeQSM 2.0 radii are
  taper-corrected); extended to field maple, whose data are the same dataset's (confirmed, the 1d brief, 3).

Per dataset, its resolution (coarsen.resolution), from its own one-model-per-tree QSMs.

    uv run --project analysis python -I -m treesim.tolerance      # writes TOLERANCES
"""

from __future__ import annotations

import csv
import hashlib
import subprocess
from concurrent.futures import ProcessPoolExecutor
import json
import math
import re
from pathlib import Path

import numpy as np
import scipy.io as sio
from scipy import stats

from treesim import coarsen as co
from treesim import control as ct
from treesim import qsm
from treesim import tiers
from treesim.describe import FORM_COLUMNS, NEW, describe
from treesim.fetch import DATA, NOISE_DIR, NOISE_OAKS, NOISE_SYCAMORES, ROOT

TOLERANCES = ROOT / "analysis" / "fit" / "sources" / "phase1-tolerances.json"
CACHE = ROOT / "runs" / "phase1" / "real"
DESCRIPTORS = tuple(k for k in FORM_COLUMNS if k != "leafStemSlope") + ("p0", "p1", "p2", "p3") + NEW
MIN_TREES = 10
HOLD_NOISE = 0.5
TOLERANCE = 0.5
WYTHAM_RADIUS = ("junctionDelta", "ldSlope", "taper", "leaderDominance")
# The 1d brief, 7; v3: the per-cylinder readings, whose 0.5 m versions are gated (tortuosity05, limbElevation05,
# pendulousFraction05).
REPORT_ONLY = ("ldSlope", "junctionDelta", "tortuosity", "limbElevation", "pendulousFraction")
REPEATS = 5  # BioDiv's repeats of the optimum's input set
DESCRIBED = ("analysis/treesim/describe.py", "analysis/treesim/form.py", "analysis/treesim/cylinders.py",
             "analysis/treesim/qsm.py")
# v2, v3: every file the gate reads (code; the manifest; the data are digested per dataset, `data_digests`).
HASHED = DESCRIBED + ("analysis/treesim/coarsen.py", "analysis/treesim/fetch.py", "analysis/treesim/simtree.py",
                      "analysis/treesim/tolerance.py", "analysis/treesim/control.py", "analysis/treesim/tiers.py",
                      "cli/dump-trees.ts", "analysis/fit/sources/reference-manifest.csv")
V1, V2, V3 = "e74063c", "3f13c29", "6610fb4"
WORKERS = 12

# The gate's rules, v3 (the 1d brief; the user's rulings at the 1d-i plan and after v2, 2026-11-03; the advisor's
# review at the plan). v1's and v2's are in the file's `v1` and `v2` blocks.
RULES = {
    "seeds": list(range(1, 21)),
    "datasets": {"oak": ["wytham"], "beech": ["biodiv"], "maple": ["wytham"]},
    "datasets_note": "oak is gated at Wytham only (the user, 2026-11-03): BioDiv has no oaks, so no control can set "
                     "an oak d_min there; v1 gated oak at BioDiv's beech resolution and failed it there (×1: 7 of 19). "
                     "Demol is beech's held-out site (the 1d brief, 4): its control curve is reported, never gated",
    "coarsen": "prune only (v3): every cylinder under d_min goes with its subtree; the re-cut of v1 and v2 is "
               "withdrawn (coarsen.py)",
    "describe": "every segment-length-dependent descriptor at the fixed 0.5 m step on both sides (droop, upturn, "
                "branchAngle2 as 0.5 m chords; tortuosity05, limbElevation05, pendulousFraction05 resampled at 0.5 m); "
                "tortuosity, limbElevation and pendulousFraction (per cylinder) report-only",
    "beech_estimator": f"a tree's descriptor is the median over its {REPEATS} repeats of the optimum's input set "
                       "(finite values; NaN under 3), for the tolerance, the floor and the control alike; Wytham's and "
                       "Demol's trees are single-model (only 12 Wytham trees have 10 models)",
    "floor": f"oak, maple: the RMS over Wytham's noise trees of the SD across 10 models; beech: the RMS over BioDiv's "
             f"trees of the SD across its {REPEATS} repeats, / √{REPEATS} (the SD of a median-of-repeats value), "
             "against the between-tree SD of the medians. Hold-out at >= 0.5 × the between-tree SD: reported as "
             "noise-limited at that dataset",
    "d_min": f"per dataset, the largest point of the grid (the {list(ct.GRID)} percentiles of its pooled terminal raw "
             f"diameters) at which, for every gated species of the dataset, >= {ct.DESCRIPTORS:.0%} of its gated "
             f"descriptors have >= {ct.TREES:.0%} of its real trees within tolerance after coarsen() (control.py). "
             "Gated: not report-only, not H1-excluded, not held out by the noise floor. A NaN original leaves the "
             "tree; a NaN after coarsening is outside. No point passes: the dataset stops. The bracket ×0.5/×2 is "
             "withdrawn",
    "stress": {"d": ct.STRESS, "use": "reported, never gated", "source": "Demol et al. 2022, Silva Fennica 56(1) "
               "10550: branches under ≈ 5 cm carry 80–83% of the QSM volume overestimate (Table 3); the completeness "
               "threshold the 1d brief names"},
    "inflation": "Demol et al. 2022 (§3.2, Table 3): diameter +73% under 2.5 cm, +4% over 10 cm, log-interpolated "
                 "between (not measured). Gated at d_min for both tiers (the user, 2026-11-03). Order: inflate, "
                 "prune",
    "evaluation_points": "v3.1 (the user, 2026-11-03, from the control curves): d_min, every grid point strictly inside "
                         "(d_min, upper), the upper end, and inflation at d_min (tiers.evaluation_points). The upper "
                         "end is the first grid point above d_min at which the dataset's control fails "
                         "(tiers.upper_end): Wytham 12.1 mm (p50), BioDiv 11.0 mm (p5). Set after seeing the control "
                         "curves, by the criterion 'first failing grid point' and not a chosen width; no simulated "
                         "value entered. v3 had [d_min, 2·d_min]",
    "tier_a": "resolution-independent: per seed, the median over the stand's live measured trees of the signed "
              "describe(coarsen(tree)) − describe(tree); |median| <= tolerance on >= 15 of the 20 seeds at every "
              "evaluation point (tiers.tier_a)",
    "tier_b": "valid at matched resolution: per seed, the median of the signed v(p) − v(d_min); |median| <= tolerance "
              "on >= 15 of the 20 seeds at every other evaluation point of [d_min, upper], inflation against "
              "v(d_min); and the descriptor's control neutral at d_min (>= 90% of real trees within tolerance) (tiers.tier_b)",
    "assign": "A if tier A passes, else B if tier B passes, else held out (tiers.assign). Both tiers are targets; the "
              "fit always compares the coarsened simulator against the real QSMs, never fine simulated values",
    "pass_seeds": tiers.PASS_SEEDS,
    "fail": "a seed with no live measured tree, or a NaN difference on any tree, fails that seed",
    "held_out": "noise floor >= 0.5 × between-tree SD (noise-limited at the dataset), fewer than MIN_TREES finite "
                "real trees, or neither tier passes (resolution-sensitive). Report-only and H1-excluded descriptors "
                "are neither targets nor hold-outs",
    "survive": "amendment E applies to the coarsening test (v3, the user): per species, over its descriptors that "
               "pass the floor (gated, clear): if fewer than half reach a tier, stop and report; never loosen. Floor "
               "hold-outs are reported as noise-limited at that dataset",
    "size_match": {
        "reference": "the median measured DBH of the species' tolerance set (R2): oak Wytham's DBH_pts, maple "
                     "Wytham's sycamores' DBH_pts, beech BioDiv's dTLS (the user, 2026-11-03, extending the 1d "
                     "brief's 4); values in `reference_dbh`",
        "simulated": "the converter's DBH (describe()'s, cylinders.py's rule) on the uncoarsened live measured trees",
        "stand_seasons": list(range(50, 301, 10)),
        "stand": "the first season of stand_seasons at which the median over seeds 1–20 of the per-seed median DBH "
                 "of the stand's live measured trees reaches the reference median. None by 300 (a compute bound): "
                 "report and stop",
        "lone": "the same on the lone tree's DBH, at seasons 50–100 by 10. Not reached by 100: read at 100 and "
                "report the shortfall",
        "report": "the median height at the chosen season, beside the reference's",
    },
    "control": "every gated species' real QSMs of each dataset coarsened at each grid point and at the stress point; "
               "TreeML's 3 optcsv trees' shifts at each d_min reported with no verdict (phase 7's)",
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


SPECIES_SET = {"oak": ("wytham", "QUERRO"), "maple": ("wytham", "ACERPS"), "beech": ("biodiv", "Fagus_sylvatica")}


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


def biodiv_models(row: dict) -> list[dict]:
    """describe() of each of a BioDiv tree's repeats of the optimum's input set (cached)."""
    return [_describe_cached(f"biodiv-{row['tree']}-m{k}", lambda k=k: qsm.read(row["path"], model=k).cylinders)
            for k in _optimum_set(row["path"])]


def median_of(ds: list[dict]) -> dict:
    """A tree's value over its repeats (v3, beech): the median of the finite values; NaN under 3."""
    out = {}
    for key in DESCRIPTORS:
        v = [x for x in (_val(d, key) for d in ds) if math.isfinite(x)]
        out[key] = float(np.median(v)) if len(v) >= 3 else math.nan
    return out


def biodiv_repeats(rows: list[dict]) -> dict[str, list[float]]:
    """Descriptor → per-tree SDs (ddof 1) over the repeats of the optimum's input set."""
    out: dict[str, list[float]] = {}
    for r in rows:
        if r["dataset"] != "biodiv":
            continue
        ds = biodiv_models(r)
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


def _verdict(species: str, dataset: str, k: str, n: int, ratio: float) -> str:
    if k in REPORT_ONLY:
        return "report-only"
    if dataset == "wytham" and k in WYTHAM_RADIUS:
        return "excluded (H1)"
    if n < MIN_TREES:
        return "held out (too few trees)"
    if not math.isfinite(ratio):
        return "not measured"
    return "held out (noise)" if ratio >= HOLD_NOISE else "clear"


def _sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def data_files(rows: list[dict]) -> dict[str, list[Path]]:
    """Every data file the build reads, per dataset (the QSMs, the noise sets, the tables of measured DBH)."""
    out = {"demol": [DATA / "demol" / "Destructive_and_qsm_data_DEMOL.csv"],
           "wytham": [DATA / "wytham" / "analysis_and_figures" / f for f in ("tls_summary.csv", "trees_summary.csv")]
           + sorted(NOISE_DIR.glob("*.mat")), "biodiv": [DATA / "biodiv" / "labels.csv"],
           "treeml": sorted((DATA / "treeml" / "optcsv").glob("*.csv"))}
    for r in rows:
        out[r["dataset"]].append(r["path"])
    return {k: sorted(set(v)) for k, v in out.items()}


def data_digests(rows: list[dict]) -> dict[str, dict]:
    """Per dataset: the file count and sha256 over the sorted lines "relative path, sha256 of the file"."""
    out = {}
    for dataset, paths in data_files(rows).items():
        lines = "".join(f"{p.relative_to(ROOT)} {_sha(p)}\n" for p in paths)
        out[dataset] = {"files": len(paths), "sha256": hashlib.sha256(lines.encode()).hexdigest()}
    return out


def prior_block(commit: str) -> dict:
    """An earlier registration, read from git: its rules, resolution, control and table, for the side-by-side."""
    text = subprocess.run(["git", "show", f"{commit}:analysis/fit/sources/phase1-tolerances.json"], cwd=ROOT,
                          check=True, capture_output=True, text=True).stdout
    t = json.loads(text)
    keep = ("species", "descriptor", "set", "n", "between_sd", "between_sd_lo95", "between_sd_hi95", "tolerance",
            "noise_ratio", "noise_verdict", "biodiv_repeats_ratio")
    return {"commit": commit, "rules": t["rules"], "resolution": t["resolution"], "control": t.get("control"),
            "table": [{k: r.get(k) for k in keep} for r in t["table"]]}


# The control (control.py): one real tree per job, every version described; BioDiv's beech as the median over its
# repeats.
def _control_tree(job) -> dict:
    path, models, points = job
    keep = lambda d: {k: d.get(k) for k in DESCRIPTORS}  # noqa: E731
    per = []
    for model in models:
        c = qsm.read(Path(path), model=model).cylinders if model is not None else qsm.read(Path(path)).cylinders
        out = {"original": keep(describe(c))}
        for name, d in points.items():
            out[name] = keep(describe(co.coarsen(c, co.Resolution(d, (), ()))))
        per.append(out)
    if len(per) == 1:
        return per[0]
    return {v: median_of([x[v] for x in per]) for v in per[0]}


def _control_cached(row: dict, points: dict) -> dict:
    key = hashlib.sha256(json.dumps([points, file_hashes()], sort_keys=True).encode()).hexdigest()[:12]
    store = CACHE / f"control3-{row['dataset']}-{row['tree']}.{key}.json"
    if store.exists():
        return json.loads(store.read_text())
    models = _optimum_set(row["path"]) if row["dataset"] == "biodiv" else [None]
    return {"_job": (str(row["path"]), models, points), "_store": str(store)}


def _run(plan: list) -> list:
    jobs = [(i, p["_job"]) for i, (_, _, p) in enumerate(plan) if "_job" in p]
    if jobs:
        with ProcessPoolExecutor(WORKERS) as ex:
            for (i, _), d in zip(jobs, ex.map(_control_tree, [j for _, j in jobs], chunksize=1)):
                Path(plan[i][2]["_store"]).write_text(json.dumps(_clean(d)))
                plan[i] = (plan[i][0], plan[i][1], d)
    return plan


def control(rows: list[dict], table: list[dict]) -> dict:
    """Per dataset: the grid, the share of trees within tolerance per (species, descriptor, point), the rule at
    each point and d_min (control.py's rules), the operator prune only (v3)."""
    tol = {(r["species"], r["descriptor"]): r for r in table}
    info, plan = {}, []
    for dataset in ("wytham", "biodiv", "demol"):
        species = ct.GATED.get(dataset, ()) + ct.REPORTED.get(dataset, ())
        sel = [r for r in rows if r["dataset"] == dataset and r["species"] in {code for _, code in species}]
        diam = ct.terminal_diameters([qsm.read(r["path"]).cylinders for r in rows if r["dataset"] == dataset])
        g = ct.grid(diam)
        points = {f"p{p}": d for p, d in g.items()} | {"stress": ct.STRESS}
        info[dataset] = {"grid": g, "terminals": int(len(diam)), "species": species, "points": points}
        plan += [(dataset, r, _control_cached(r, points)) for r in sel]
    plan = _run(plan)
    result = {}
    for dataset, i in info.items():
        described = [(r, d) for ds, r, d in plan if ds == dataset]
        shares: dict[str, dict] = {}
        for sp, code in i["species"]:
            trees = [d for r, d in described if r["species"] == code]
            for k in DESCRIPTORS:
                row = tol[(sp, k)]
                orig = [_val(d["original"], k) for d in trees]
                for v in i["points"]:
                    s = ct.share_within(orig, [_val(d[v], k) for d in trees], _num(row["tolerance"]))
                    shift = [_val(d[v], k) - a for d, a in zip(trees, orig)]
                    shares.setdefault(v, {}).setdefault(sp, {})[k] = {
                        "share": s, "gated": row["noise_verdict"] == "clear", "trees": len(trees),
                        "median_shift": float(np.nanmedian(shift)) if any(math.isfinite(x) for x in shift) else None}
        rule = {v: ct.rule_holds({sp: {k: c["share"] for k, c in by.items() if c["gated"]}
                                  for sp, by in per.items()}) for v, per in shares.items()}
        curve = {p: rule[f"p{p}"] for p in ct.GRID}
        d_min = ct.choose(curve, i["grid"])
        result[dataset] = {"grid": i["grid"], "terminals": i["terminals"], "species": [s for s, _ in i["species"]],
                           "gated": dataset in ct.GATED, "rule": rule, "curve": curve, "d_min": d_min,
                           "d_min_percentile": next((p for p, d in i["grid"].items() if d == d_min), None),
                           "shares": shares, "trees": {sp: sum(r["species"] == code for r, _ in described)
                                                       for sp, code in i["species"]}}
    return result


def treeml(ctl: dict) -> dict:
    """TreeML's 3 optcsv trees (phase 7's dataset; no tolerance set in phase 1): each descriptor's median shift at
    each dataset's d_min, with no verdict."""
    paths = sorted((DATA / "treeml" / "optcsv").glob("*.csv"))
    points = {d: c["d_min"] for d, c in ctl.items() if c["d_min"] is not None}
    plan = _run([("treeml", {"dataset": "treeml", "tree": p.stem, "path": p}, _control_cached(
        {"dataset": "treeml", "tree": p.stem, "path": p}, points)) for p in paths])
    out = {"trees": [p.name for p in paths], "d_min": points, "median_shift": {}}
    for name in points:
        for k in DESCRIPTORS:
            s = [_val(d[name], k) - _val(d["original"], k) for _, _, d in plan]
            s = [x for x in s if math.isfinite(x)]
            out["median_shift"].setdefault(name, {})[k] = float(np.median(s)) if s else None
    return out


def candidates(table: list[dict], ctl: dict) -> list[dict]:
    """Before any simulated tree: each descriptor's standing (report-only, H1, noise-limited at the dataset, or a
    candidate for tier A or B, or A only where its control is not neutral at d_min)."""
    out = []
    for species, (dataset, _) in SPECIES_SET.items():
        c = ctl[dataset]
        at = c["shares"].get(f"p{c['d_min_percentile']}", {}).get(species, {}) if c["d_min"] else {}
        for r in (r for r in table if r["species"] == species):
            k = r["descriptor"]
            share = at.get(k, {}).get("share", math.nan)
            if r["noise_verdict"] != "clear":
                standing = r["noise_verdict"]
            elif c["d_min"] is None:
                standing = "no d_min (stop)"
            else:
                standing = "candidate A or B" if ct.neutral(share) else "candidate A only (control not neutral)"
            out.append({"species": species, "descriptor": k, "dataset": dataset, "standing": standing,
                        "control_share_at_dmin": share})
    return out


def tolerances(rows: list[dict]) -> tuple[list[dict], dict]:
    for r in rows:
        if r["dataset"] == "biodiv":
            r["d"] = median_of(biodiv_models(r))  # v3: the median over its repeats
        else:
            r["d"] = _describe_cached(f"{r['dataset']}-{r['tree']}", lambda r=r: qsm.read(r["path"]).cylinders)
    noise = wytham_noise()
    repeats = biodiv_repeats(rows)
    table = []
    for species, (dataset, code) in SPECIES_SET.items():
        sel = [r for r in rows if r["dataset"] == dataset and r["species"] == code]
        floor = repeats if species == "beech" else noise.get(species, {})
        scale = 1.0 / math.sqrt(REPEATS) if species == "beech" else 1.0
        for k in DESCRIPTORS:
            bt = between_tree(sel, k)
            rms, med, nn = _pool(floor.get(k, []))
            rms, med = rms * scale, med * scale
            ratio = rms / bt["sd"] if math.isfinite(rms) and bt["sd"] > 0 else math.nan
            table.append({"species": species, "descriptor": k, "set": f"{dataset} {code}", "n": bt["n"],
                          "median": bt["median"], "slope_lnDBH": bt["slope"], "between_sd": bt["sd"],
                          "between_sd_lo95": bt["sd_lo"], "between_sd_hi95": bt["sd_hi"],
                          "tolerance": TOLERANCE * bt["sd"], "noise_rms": rms, "noise_median": med, "noise_trees": nn,
                          "noise_source": f"biodiv {REPEATS} repeats, SD / √{REPEATS}" if species == "beech"
                          else "wytham 10 models",
                          "noise_ratio": ratio, "noise_verdict": _verdict(species, dataset, k, bt["n"], ratio)})
    reference = {}
    for species, (dataset, code) in SPECIES_SET.items():
        d = [r["dbh_measured"] for r in rows if r["dataset"] == dataset and r["species"] == code
             and math.isfinite(r["dbh_measured"])]
        reference[species] = {"median_dbh": float(np.median(d)), "trees": len(d), "set": f"{dataset} {code}"}
    return table, reference


def build() -> tuple[dict, dict]:
    rows = real_sets()
    table, reference = tolerances(rows)
    resolution = {}
    for dataset in ("demol", "wytham", "biodiv"):
        res = co.resolution([qsm.read(r["path"]).cylinders for r in rows if r["dataset"] == dataset])
        resolution[dataset] = {"median_terminal": res.d_min, "ratio_reported": list(res.ratio),
                               "count": list(res.count), "trees": sum(r["dataset"] == dataset for r in rows)}
    ctl = control(rows, table)
    for dataset, c in ctl.items():
        if c["gated"]:  # v3.1: tier B's bracket ends at the control's first failing grid point above d_min
            name, d = tiers.upper_end(c["grid"], c["curve"], c["d_min"])
            c["upper_end"] = resolution[dataset]["upper_end"] = {"name": name, "d": d}
    for dataset, c in ctl.items():
        resolution[dataset]["d_min"] = c["d_min"]
        resolution[dataset]["d_min_percentile"] = c["d_min_percentile"]
        resolution[dataset]["grid"] = c["grid"]
    qsm_medians = {}
    for dataset in ("demol", "wytham", "biodiv"):
        for species in {"demol": ["FSYL"], "wytham": ["QUERRO", "ACERPS"], "biodiv": ["Fagus_sylvatica"]}[dataset]:
            sel = [r for r in rows if r["dataset"] == dataset and r["species"] == species]
            qsm_medians[f"{dataset} {species}"] = {k: float(np.nanmedian([_val(r["d"], k) for r in sel]))
                                                   for k in ("ldSlope", "tortuosity", "tortuosity05")}
    return _clean({
        "version": 3.1, "supersedes": [V3, V2, V1],
        "written": "2026-11-04, session 1d-ii: v3 (1d-i, from real QSMs only) with tier B's bracket from the control "
                   "curves; nothing simulated has been measured since v1",
        "hashes": file_hashes(), "data": data_digests(rows), "rules": RULES, "descriptors": list(DESCRIPTORS),
        "min_trees": MIN_TREES, "tolerance_factor": TOLERANCE, "hold_noise": HOLD_NOISE, "repeats": REPEATS,
        "control_rule": {"grid": list(ct.GRID), "trees": ct.TREES, "descriptors": ct.DESCRIPTORS},
        "report_only": list(REPORT_ONLY), "h1_excluded": {"oak": list(WYTHAM_RADIUS), "maple": list(WYTHAM_RADIUS)},
        "h1_note": "oak: the user's ruling; maple: extended (same dataset), confirmed (the 1d brief, 3)",
        "edges": [e if math.isfinite(e) else None for e in co.EDGES], "resolution": resolution,
        "reference_dbh": reference, "qsm_medians": qsm_medians, "table": table,
        "control": {d: {k: v for k, v in c.items() if k != "shares"} for d, c in ctl.items()},
        "treeml": treeml(ctl), "candidates": candidates(table, ctl), "v2": prior_block(V2), "v1": prior_block(V1),
    }), ctl


def _control_rows(ctl: dict) -> list[dict]:
    out = []
    for dataset, c in ctl.items():
        for v, per in c["shares"].items():
            for sp, by in per.items():
                for k, x in by.items():
                    out.append({"dataset": dataset, "version": v, "species": sp, "descriptor": k, **x})
    return out


if __name__ == "__main__":
    t, ctl = build()
    TOLERANCES.write_text(json.dumps(t, indent=1) + "\n")
    out = ROOT / "runs" / "phase1" / "control-grid.csv"
    rows = _control_rows(_clean(ctl))
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, list(rows[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    print(f"{TOLERANCES}: {len(t['table'])} rows; {out}")
    for dataset, c in t["control"].items():
        print(dataset, "d_min", c["d_min"], "at p", c["d_min_percentile"], "curve", c["curve"])
