"""Gate c's pre-registration (docs/plans/2026-11-03-reference-fidelity.md §j; v1 the 1c brief and amendment E, commit
e74063c; v2 the 1d brief, session 1d-i): every number and rule the degradation test reads, computed from real QSMs
only and committed before any simulated tree is coarsened. Nothing in the file changes after a gate c result is
seen; a change is a new commit with its reason in the experiment note (docs/experiments/2026-11-03-phase1-converter.md).

**v2** (designed after v1 failed; the note's "v2 instrument"): beech's tolerance set and noise floor are BioDiv's 53
and its 5 repeats (decision 4); d_min per dataset from the control curve on its own QSMs (control.py, decision 1);
the two tiers (tiers.py, decision 2); ldSlope and junctionDelta report-only (decision 7); the size-matching rule
(decision 6). The rest below is v1's and unchanged.

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
REPORT_ONLY = ("ldSlope", "junctionDelta")  # the 1d brief, 7
DESCRIBED = ("analysis/treesim/describe.py", "analysis/treesim/form.py", "analysis/treesim/cylinders.py",
             "analysis/treesim/qsm.py")
# v2: every file the gate reads (code; the manifest; the data are digested per dataset, `data_digests`).
HASHED = DESCRIBED + ("analysis/treesim/coarsen.py", "analysis/treesim/fetch.py", "analysis/treesim/simtree.py",
                      "analysis/treesim/tolerance.py", "analysis/treesim/control.py", "analysis/treesim/tiers.py",
                      "cli/dump-trees.ts", "analysis/fit/sources/reference-manifest.csv")
V1 = "e74063c"
WORKERS = 12

# The gate's rules, v2 (the 1d brief; the user's rulings at the 1d-i plan, 2026-11-03; the advisor's review at the
# plan). v1's are in the file's `v1` block.
RULES = {
    "seeds": list(range(1, 21)),
    "datasets": {"oak": ["wytham"], "beech": ["biodiv"], "maple": ["wytham"]},
    "datasets_note": "oak is gated at Wytham only (the user, 2026-11-03): BioDiv has no oaks, so no control can set "
                     "an oak d_min there; v1 gated oak at BioDiv's beech resolution and failed it there (×1: 7 of 19). "
                     "Demol is beech's held-out site (the 1d brief, 4): its control curve is reported, never gated",
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
                 "prune, re-cut",
    "evaluation_points": "d_min, every grid point strictly inside (d_min, 2·d_min), 2·d_min, and inflation at d_min "
                         "(tiers.evaluation_points)",
    "tier_a": "resolution-independent: per seed, the median over the stand's live measured trees of the signed "
              "describe(coarsen(tree)) − describe(tree); |median| <= tolerance on >= 15 of the 20 seeds at every "
              "evaluation point (tiers.tier_a)",
    "tier_b": "valid at matched resolution: per seed, the median of the signed v(p) − v(d_min); |median| <= tolerance "
              "on >= 15 of the 20 seeds at every other evaluation point, inflation against v(d_min); and the "
              "descriptor's control neutral at d_min (>= 90% of real trees within tolerance) (tiers.tier_b)",
    "assign": "A if tier A passes, else B if tier B passes, else held out (tiers.assign). Both tiers are targets; the "
              "fit always compares the coarsened simulator against the real QSMs, never fine simulated values",
    "pass_seeds": tiers.PASS_SEEDS,
    "fail": "a seed with no live measured tree, or a NaN difference on any tree, fails that seed",
    "held_out": "noise floor >= 0.5 × between-tree SD, fewer than MIN_TREES finite real trees, or neither tier "
                "passes. Report-only (ldSlope, junctionDelta) and H1-excluded descriptors are neither targets nor "
                "hold-outs",
    "survive": "per species, over its gated descriptors: if fewer than half reach a tier, stop and report; never "
               "loosen (amendment E)",
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
    "control": "every gated species' real QSMs of each dataset coarsened at each grid point and at the stress point "
               "(full coarsen(), and prune only); re-cut only once (it does not depend on d). Reported in full",
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
           + sorted(NOISE_DIR.glob("*.mat")), "biodiv": [DATA / "biodiv" / "labels.csv"]}
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


def v1_block() -> dict:
    """v1's registration, read from git (commit e74063c): its rules, resolution and table, for the side-by-side."""
    text = subprocess.run(["git", "show", f"{V1}:analysis/fit/sources/phase1-tolerances.json"], cwd=ROOT,
                          check=True, capture_output=True, text=True).stdout
    t = json.loads(text)
    keep = ("species", "descriptor", "set", "n", "between_sd", "between_sd_lo95", "between_sd_hi95", "tolerance",
            "noise_ratio", "noise_verdict", "biodiv_repeats_ratio")
    return {"commit": V1, "rules": t["rules"], "resolution": t["resolution"],
            "table": [{k: r.get(k) for k in keep} for r in t["table"]]}


# The control (control.py): one real tree per job, every version described.
def _control_tree(job) -> dict:
    path, points, ratio, count = job
    c = qsm.read(Path(path)).cylinders
    ratio = tuple(math.nan if v is None else v for v in ratio)
    keep = lambda d: {k: d.get(k) for k in DESCRIPTORS}  # noqa: E731
    out = {"original": keep(describe(c)), "recut": keep(describe(ct.apply(c, co.Resolution(0.0, ratio, count),
                                                                         "recut")))}
    for name, d in points.items():
        res = co.Resolution(d, ratio, count)
        out[f"full:{name}"] = keep(describe(ct.apply(c, res, "full")))
        out[f"prune:{name}"] = keep(describe(ct.apply(c, res, "prune")))
    return out


def _control_cached(row: dict, points: dict, res: dict) -> dict:
    key = hashlib.sha256(json.dumps([points, res["ratio"], file_hashes()], sort_keys=True).encode()).hexdigest()[:12]
    store = CACHE / f"control-{row['dataset']}-{row['tree']}.{key}.json"
    if store.exists():
        return json.loads(store.read_text())
    return {"_job": (str(row["path"]), points, res["ratio"], res["count"]), "_store": str(store)}


def control(rows: list[dict], table: list[dict], resolution: dict, recut_only: bool = False) -> dict:
    """Per dataset: the grid, the share of trees within tolerance per (species, descriptor, version), the rule at
    each point and d_min (control.py's rules). recut_only: the probe (re-cut alone, and its rule)."""
    tol = {(r["species"], r["descriptor"]): r for r in table}
    out = {}
    plan = []
    for dataset in ("wytham", "biodiv", "demol"):
        species = ct.GATED.get(dataset, ()) + ct.REPORTED.get(dataset, ())
        sel = [r for r in rows if r["dataset"] == dataset and r["species"] in {code for _, code in species}]
        diam = ct.terminal_diameters([qsm.read(r["path"]).cylinders for r in rows if r["dataset"] == dataset])
        g = ct.grid(diam)
        points = {f"p{p}": d for p, d in g.items()} | {"stress": ct.STRESS}
        if recut_only:
            points = {}
        res = resolution[dataset]
        out[dataset] = {"grid": g, "terminals": int(len(diam)), "species": [s for s, _ in species],
                        "gated": dataset in ct.GATED, "trees": sel, "points": points}
        plan += [(dataset, r, _control_cached(r, points, res)) for r in sel]
    jobs = [(i, p["_job"]) for i, (_, _, p) in enumerate(plan) if "_job" in p]
    if jobs:
        with ProcessPoolExecutor(WORKERS) as ex:
            for (i, _), d in zip(jobs, ex.map(_control_tree, [j for _, j in jobs], chunksize=1)):
                Path(plan[i][2]["_store"]).write_text(json.dumps(_clean(d)))
                plan[i] = (plan[i][0], plan[i][1], d)
    result = {}
    for dataset, info in out.items():
        described = [(r, d) for ds, r, d in plan if ds == dataset]
        versions = ["recut"] + [f"{m}:{n}" for n in info["points"] for m in ("full", "prune")]
        shares: dict[str, dict] = {}
        for sp, code in ct.GATED.get(dataset, ()) + ct.REPORTED.get(dataset, ()):
            trees = [d for r, d in described if r["species"] == code]
            for k in DESCRIPTORS:
                row = tol[(sp, k)]
                gated = row["noise_verdict"] == "clear"
                orig = [_val(d["original"], k) for d in trees]
                for v in versions:
                    s = ct.share_within(orig, [_val(d[v], k) for d in trees], _num(row["tolerance"]))
                    shift = [_val(d[v], k) - a for d, a in zip(trees, orig)]
                    shares.setdefault(v, {}).setdefault(sp, {})[k] = {
                        "share": s, "gated": gated, "trees": len(trees),
                        "median_shift": float(np.nanmedian(shift)) if any(math.isfinite(x) for x in shift) else None}
        rule = {v: ct.rule_holds({sp: {k: c["share"] for k, c in by.items() if c["gated"]}
                                  for sp, by in per.items()}) for v, per in shares.items()}
        curve = {p: rule[f"full:p{p}"] for p in ct.GRID} if info["points"] else {}
        d_min = ct.choose(curve, info["grid"]) if curve else None
        result[dataset] = {"grid": info["grid"], "terminals": info["terminals"], "species": info["species"],
                           "gated": info["gated"], "rule": rule, "curve": curve, "d_min": d_min,
                           "d_min_percentile": next((p for p, d in info["grid"].items() if d == d_min), None),
                           "shares": shares, "trees": {sp: sum(r["species"] == code for r in info["trees"])
                                                       for sp, code in ct.GATED.get(dataset, ())
                                                       + ct.REPORTED.get(dataset, ())}}
    return result


def candidates(table: list[dict], ctl: dict) -> list[dict]:
    """Before any simulated tree: each descriptor's standing (report-only, H1, held out by noise, or a candidate for
    tier A or B, or A only where its control is not neutral at d_min)."""
    out = []
    for species, (dataset, _) in SPECIES_SET.items():
        c = ctl[dataset]
        at = c["shares"].get(f"full:p{c['d_min_percentile']}", {}).get(species, {}) if c["d_min"] else {}
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
        r["d"] = _describe_cached(f"{r['dataset']}-{r['tree']}", lambda r=r: qsm.read(r["path"]).cylinders)
    noise = wytham_noise()
    repeats = biodiv_repeats(rows)
    table = []
    for species, (dataset, code) in SPECIES_SET.items():
        sel = [r for r in rows if r["dataset"] == dataset and r["species"] == code]
        floor = repeats if species == "beech" else noise.get(species, {})
        for k in DESCRIPTORS:
            bt = between_tree(sel, k)
            rms, med, nn = _pool(floor.get(k, []))
            ratio = rms / bt["sd"] if math.isfinite(rms) and bt["sd"] > 0 else math.nan
            table.append({"species": species, "descriptor": k, "set": f"{dataset} {code}", "n": bt["n"],
                          "median": bt["median"], "slope_lnDBH": bt["slope"], "between_sd": bt["sd"],
                          "between_sd_lo95": bt["sd_lo"], "between_sd_hi95": bt["sd_hi"],
                          "tolerance": TOLERANCE * bt["sd"], "noise_rms": rms, "noise_median": med, "noise_trees": nn,
                          "noise_source": "biodiv 5 repeats" if species == "beech" else "wytham 10 models",
                          "noise_ratio": ratio, "noise_verdict": _verdict(species, dataset, k, bt["n"], ratio)})
    reference = {}
    for species, (dataset, code) in SPECIES_SET.items():
        d = [r["dbh_measured"] for r in rows if r["dataset"] == dataset and r["species"] == code
             and math.isfinite(r["dbh_measured"])]
        reference[species] = {"median_dbh": float(np.median(d)), "trees": len(d), "set": f"{dataset} {code}"}
    return table, reference


def build() -> dict:
    rows = real_sets()
    table, reference = tolerances(rows)
    resolution = {}
    for dataset in ("demol", "wytham", "biodiv"):
        res = co.resolution([qsm.read(r["path"]).cylinders for r in rows if r["dataset"] == dataset])
        resolution[dataset] = {"median_terminal": res.d_min, "ratio": list(res.ratio), "count": list(res.count),
                               "trees": sum(r["dataset"] == dataset for r in rows)}
    ctl = control(rows, table, resolution)
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
        "version": 2, "supersedes": V1,
        "written": "2026-11-03, session 1d-i: from real QSMs only, before any simulated tree was measured again "
                   "(designed after v1 failed)",
        "hashes": file_hashes(), "data": data_digests(rows), "rules": RULES, "descriptors": list(DESCRIPTORS),
        "min_trees": MIN_TREES, "tolerance_factor": TOLERANCE, "hold_noise": HOLD_NOISE,
        "control_rule": {"grid": list(ct.GRID), "trees": ct.TREES, "descriptors": ct.DESCRIPTORS},
        "report_only": list(REPORT_ONLY), "h1_excluded": {"oak": list(WYTHAM_RADIUS), "maple": list(WYTHAM_RADIUS)},
        "h1_note": "oak: the user's ruling; maple: extended (same dataset), confirmed (the 1d brief, 3)",
        "edges": [e if math.isfinite(e) else None for e in co.EDGES], "resolution": resolution,
        "reference_dbh": reference, "qsm_medians": qsm_medians, "table": table,
        "control": {d: {k: v for k, v in c.items() if k != "shares"} for d, c in ctl.items()},
        "candidates": candidates(table, ctl), "v1": v1_block(),
    }), ctl


def probe() -> dict:
    """The advisor's probe before the grid: re-cut alone (no prune) on the real QSMs, per dataset, and its rule."""
    rows = real_sets()
    table, _ = tolerances(rows)
    resolution = {d: {"ratio": list(r.ratio), "count": list(r.count)} for d, r in
                  ((d, co.resolution([qsm.read(x["path"]).cylinders for x in rows if x["dataset"] == d]))
                   for d in ("demol", "wytham", "biodiv"))}
    return control(rows, table, resolution, recut_only=True)


def _control_rows(ctl: dict) -> list[dict]:
    out = []
    for dataset, c in ctl.items():
        for v, per in c["shares"].items():
            for sp, by in per.items():
                for k, x in by.items():
                    out.append({"dataset": dataset, "version": v, "species": sp, "descriptor": k, **x})
    return out


if __name__ == "__main__":
    import sys

    if sys.argv[1:] == ["probe"]:
        ctl = probe()
        for dataset, c in ctl.items():
            print(dataset, "re-cut only, rule holds:", c["rule"]["recut"])
            for sp, by in c["shares"]["recut"].items():
                bad = {k: round(x["share"], 2) for k, x in by.items() if x["gated"] and not ct.neutral(x["share"])}
                print(" ", sp, f"{sum(x['gated'] for x in by.values())} gated; not neutral:", bad)
    else:
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
