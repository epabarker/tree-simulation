"""Level 1 (reference-fidelity phase 3; ADR 0049 §1–4): a species' branching descriptors as distributions over real
trees at a matched size, against the same descriptors of its simulated closed stand. The beech pilot first (the
plan's §g: provisional, pending Level 0 and ADR 0052; nothing from it enters species params).

The registration (`analysis/fit/sources/level1-<species>.json`, written by analysis/experiments/level1_targets.py
before any simulated tree is scored) holds what this module reads: the descriptors and the held-out draw, the real
distributions, the frozen Level 0 knobs, the fitted knobs and the file hashes. This module holds the rules.

- **Descriptors.** Gate c v3.1's tier A and tier B for the species' dataset (the targets file's `[level1]`). A seeded
  draw of a third holds out (ADR 0049 §3); the rest are the loss. Held-out values are computed and never written by
  the fit (the user, 2026-11-04): only the gate reads them.
- **Weights (the user, 2026-11-04, a general rule):** correlated summaries of a single measurement share one unit of
  weight. OUTLINE (the crown's height distribution: the profile bands and their summaries) is one group, whatever
  members the draw leaves in the loss; every other descriptor is its own group.
- **Real.** Each tree's value (BioDiv: the median over its repeats, tolerance.median_of); OLS on ln measured DBH
  (tolerance.between_tree's fit): the slope b, the residual SD (df n − 2) and the median of the values detrended to the
  matched DBH, y − b (ln d − ln d*).
- **Simulated.** The stand's live measured trees at the size-matched season, coarsened at the dataset's d_min with
  Demol 2022's inflation (coarsen.coarsen(inflated=True): `rules.assign`, the fit compares the coarsened simulator
  only), described, and detrended with the registered b on the uncoarsened tree's DBH (cylinders.dbh, describe()'s
  rule on a simulated tree).
- **Size match** (phase1-tolerances.json `rules.size_match`, per candidate on its own seeds): the first season of
  MATCH_SEASONS at which the median over seeds of the per-seed median DBH of the live measured trees (cli/allometry.ts,
  parity 1e-9 with cylinders.dbh) reaches d*. A match outside DUMP_SEASONS, or none, is unmatched.
- **Loss terms.** Per fitted descriptor, z = (median of the detrended simulated trees − real median) / real SD and
  s = ln(simulated SD / real SD) / ln 2 (ADR 0049 §4's factor 2 as the band). A group's location term is the mean of its
  members' z², its spread term the mean of their s²; a member with fewer than MIN_TREES finite trees, or an unmatched
  candidate, costs MISSING_PENALTY in place of each.
- **Gate** (ADR 0049 §4): on GATE_SEEDS, a seed passes when every held-out descriptor's |z| ≤ Z_GATE, z read on the
  median of that seed's trees; the species on ≥ PASS_SEEDS. Spread within ×2 on every fitted descriptor over all the
  gate's trees. shapeFlag clear (gallery.py).
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path

import numpy as np

from treesim import coarsen as co
from treesim import cylinders as cy
from treesim import simtree
from treesim.describe import describe
from treesim.fit import MISSING_PENALTY
from treesim.sweep import REPO

SOURCES = REPO / "analysis" / "fit" / "sources"
#: The crown's height distribution and its summaries (describe.py: profile p0–p3, widestAt, profileCentre,
#: crownFullness; centroidHeight, the wood's mean height): one measurement, one unit of weight.
OUTLINE = ("p0", "p1", "p2", "p3", "widestAt", "profileCentre", "crownFullness", "centroidHeight")
HELD_OUT_SEED = 20261104
HELD_OUT_SHARE = 1 / 3
MATCH_SEASONS = tuple(range(50, 151, 10))
DUMP_SEASONS = tuple(range(50, 101, 10))
MIN_TREES = 10
Z_GATE = 2.0
SPREAD_BAND = math.log(2.0)
PASS_SEEDS = 15
GATE_SEEDS = tuple(range(1, 21))
FINAL_SEEDS = tuple(range(101, 111))
#: The fit's seeds, drawn afresh each generation: never the gate's, the finalists' or the gallery's (1001–1003).
FIT_SEEDS = tuple(s for s in range(1000, 10_000) if s not in (1001, 1002, 1003))
CONTROL_SEED = 20261105
CONTROL_SETS = 2000
#: The files whose bytes define the targets and the measurement; every Level 1 script refuses on a mismatch. The
#: drivers (fit_level1.py, level1_fit.py, level1_gate.py, the shell wrapper) are plumbing over this module and are not
#: hashed.
HASHED = (
    "analysis/treesim/level1.py", "analysis/experiments/level1_eval.ts", "analysis/experiments/level1_targets.py",
    "analysis/treesim/describe.py", "analysis/treesim/form.py", "analysis/treesim/cylinders.py",
    "analysis/treesim/coarsen.py", "analysis/treesim/simtree.py", "analysis/treesim/tolerance.py",
    "analysis/fit/sources/phase1-tolerances.json", "cli/trials.ts", "cli/allometry.ts",
)


#: The species' own hashed files: its targets file and its Level 0 fit (the frozen knobs).
def species_files(species: str) -> tuple[str, ...]:
    return (f"analysis/fit/targets/{species}.toml", f"docs/experiments/fits/level0/{species}.json")


def registration_path(species: str) -> Path:
    return SOURCES / f"level1-{species}.json"


def file_hashes(files=HASHED) -> dict[str, str]:
    return {f: hashlib.sha256((REPO / f).read_bytes()).hexdigest() for f in files}


def load(species: str, check: bool = True) -> dict:
    """The registration; refuses (SystemExit) if a hashed file changed since it was written."""
    reg = json.loads(registration_path(species).read_text())
    if check:
        now = file_hashes(tuple(reg["hashes"]))
        bad = [f for f, h in reg["hashes"].items() if now.get(f) != h]
        if bad:
            raise SystemExit(f"refusing: changed since Level 1's registration: {', '.join(bad)}")
    return reg


# --- Descriptors and weights -------------------------------------------------------------------------------------


def draw_held_out(names, seed: int = HELD_OUT_SEED, share: float = HELD_OUT_SHARE) -> list[str]:
    """The held-out third: a seeded draw from the sorted names, round(share × n) of them, sorted."""
    pool = sorted(names)
    k = round(share * len(pool))
    return sorted(np.random.default_rng(seed).choice(pool, k, replace=False).tolist())


def groups(fitted) -> dict[str, list[str]]:
    """Weight groups: OUTLINE's fitted members as "outline", every other descriptor alone."""
    out: dict[str, list[str]] = {}
    for k in sorted(fitted):
        out.setdefault("outline" if k in OUTLINE else k, []).append(k)
    return out


# --- Real distributions ------------------------------------------------------------------------------------------


def detrend(y: float, dbh: float, slope: float, at: float) -> float:
    """A value moved along the real ln-DBH slope to DBH `at` (metres)."""
    return y - slope * (math.log(dbh) - math.log(at))


def distribution(values: list[float], dbhs: list[float], at: float) -> dict:
    """OLS of the values on ln DBH (finite pairs): slope, residual SD (df n − 2) with its 95% CI, the median of the
    values detrended to `at`, and n."""
    from scipy import stats

    pairs = [(y, d) for y, d in zip(values, dbhs) if math.isfinite(y) and math.isfinite(d) and d > 0]
    n = len(pairs)
    if n < MIN_TREES:
        return {"n": n, "slope": math.nan, "sd": math.nan, "sd_lo95": math.nan, "sd_hi95": math.nan,
                "median": math.nan}
    y = np.array([p[0] for p in pairs])
    x = np.log([p[1] for p in pairs])
    slope, icpt = np.polyfit(x, y, 1)
    df = n - 2
    sd = float(math.sqrt(((y - (slope * x + icpt)) ** 2).sum() / df))
    return {"n": n, "slope": float(slope), "sd": sd,
            "sd_lo95": sd * math.sqrt(df / stats.chi2.ppf(0.975, df)),
            "sd_hi95": sd * math.sqrt(df / stats.chi2.ppf(0.025, df)),
            "median": float(np.median([detrend(yy, d, slope, at) for yy, d in pairs]))}


def real_trees(dataset: str, code: str) -> list[dict]:
    """The dataset's trees of one species: {tree, dbh, gap, d: descriptor values} (BioDiv: median over repeats)."""
    from treesim import qsm
    from treesim import tolerance as tol

    labels = {}
    if dataset == "biodiv":
        labels = {r["treeID"]: r for r in tol._csv(tol.DATA / "biodiv" / "labels.csv")}
    out = []
    for r in tol.real_sets():
        if r["dataset"] != dataset or r["species"] != code:
            continue
        if dataset == "biodiv":
            d = tol.median_of(tol.biodiv_models(r))
        else:
            d = tol._describe_cached(f"{dataset}-{r['tree']}", lambda r=r: qsm.read(r["path"]).cylinders)
        out.append({"tree": r["tree"], "dbh": r["dbh_measured"], "gap": labels.get(r["tree"], {}).get("gap"),
                    "d": {k: tol._val(d, k) for k in d if not k.startswith("check_")}})
    return out


# --- Size match --------------------------------------------------------------------------------------------------


def seed_dbh(sizes: list[dict]) -> dict[int, float]:
    """One seed's evaluator `level1.allometry`: season → median DBH of the live measured trees (absent: none live)."""
    out = {}
    for s in sizes:
        d = [t["dbh"] for t in s["trees"] if t.get("alive")]
        if d:
            out[int(s["season"])] = float(np.median(d))
    return out


def match_season(per_seed: list[dict[int, float]], reference: float, seasons=MATCH_SEASONS) -> int | None:
    """The first season at which the median over seeds of the per-seed median DBH reaches the reference."""
    for s in seasons:
        v = [d[s] for d in per_seed if s in d and math.isfinite(d[s])]
        if v and float(np.median(v)) >= reference:
            return s
    return None


# --- Simulated trees ---------------------------------------------------------------------------------------------


def describe_sim(tree: dict, d_min: float, names) -> dict:
    """One dumped tree: the descriptors `names` of its coarsened skeleton (inflate, prune at d_min) and the DBH of the
    uncoarsened one."""
    st = simtree.from_dump(tree)
    v = describe(co.coarsen(st.cylinders, co.Resolution(d_min, (), ()), inflated=True))
    return {"dbh": cy.dbh(st.cylinders), **{k: float(v[k]) for k in names}}


def _describe_job(job) -> dict:
    path, seed, d_min, names = job
    with Path(path).open() as f:
        trees = json.load(f)["trees"]
    return [{"seed": seed, "tree": t["index"], **describe_sim(t, d_min, names)}
            for t in trees if t["alive"] and t["trial"] == "stand"]


def describe_files(jobs: list[tuple], executor=None) -> list[list[dict]]:
    """Each (path, seed, d_min, names) job's live trees described; across `executor` (a process pool) where given.
    The same function on the same input in either case (test_level1.py checks the values against gate c's)."""
    return list(executor.map(_describe_job, jobs)) if executor is not None else [_describe_job(j) for j in jobs]


# --- Scoring -----------------------------------------------------------------------------------------------------


def detrended(trees: list[dict], k: str, slope: float, at: float) -> list[float]:
    return [detrend(t[k], t["dbh"], slope, at) for t in trees
            if math.isfinite(t.get(k, math.nan)) and math.isfinite(t["dbh"]) and t["dbh"] > 0]


def score(values: list[float], real: dict) -> dict:
    """A descriptor's simulated median, SD (ddof 1), n, z and spread term s against the real distribution."""
    n = len(values)
    if n < MIN_TREES or not math.isfinite(real["sd"]) or real["sd"] <= 0:
        return {"n": n, "median": math.nan, "sd": math.nan, "z": math.nan, "s": math.nan}
    med = float(np.median(values))
    sd = float(np.std(values, ddof=1))
    return {"n": n, "median": med, "sd": sd, "z": (med - real["median"]) / real["sd"],
            "s": math.log(sd / real["sd"]) / SPREAD_BAND if sd > 0 else math.nan}


def level1_traits(reg: dict, trees: list[dict] | None, season: int | None, flags: list[str]) -> dict:
    """The fit's Level 1 traits of one candidate: per fitted descriptor median, sd, n, z, s; the season, the trees'
    median DBH, their count. Held-out descriptors are left out (the user: the fit never writes them)."""
    out: dict = {"l1.season": season, "l1.flags": ";".join(flags)}
    if trees is None:
        return out
    out["l1.trees"] = len(trees)
    out["l1.dbh"] = float(np.median([t["dbh"] for t in trees])) if trees else math.nan
    at = reg["size_match"]["dbh"]
    for k in reg["fitted"]:
        real = reg["real"][k]
        sc = score(detrended(trees, k, real["slope"], at), real)
        out.update({f"l1.{k}.{m}": v for m, v in sc.items()})
    return out


def level1_contributions(reg: dict, traits: dict) -> dict[str, float]:
    """Per weight group, `l1.<group>.loc` = mean of members' z² and `l1.<group>.sd` = mean of their s², weight 1
    each; MISSING_PENALTY in place of a member that could not be scored (or of all, unmatched)."""
    out = {}
    for g, members in reg["groups"].items():
        loc, spr = [], []
        for k in members:
            z, s = traits.get(f"l1.{k}.z"), traits.get(f"l1.{k}.s")
            loc.append(z * z if z is not None and math.isfinite(z) else MISSING_PENALTY)
            spr.append(s * s if s is not None and math.isfinite(s) else MISSING_PENALTY)
        out[f"l1.{g}.loc"] = float(np.mean(loc))
        out[f"l1.{g}.sd"] = float(np.mean(spr))
    return out


# --- Gate and control --------------------------------------------------------------------------------------------


def seed_z(reg: dict, trees: list[dict], names) -> dict[str, float]:
    """Each descriptor's z on the median of one seed's trees (detrended); NaN with no finite tree."""
    at = reg["size_match"]["dbh"]
    out = {}
    for k in names:
        real = reg["real"][k]
        v = detrended(trees, k, real["slope"], at)
        out[k] = (float(np.median(v)) - real["median"]) / real["sd"] if v else math.nan
    return out


def seed_passes(z: dict[str, float]) -> bool:
    """Every held-out |z| ≤ Z_GATE (a NaN fails)."""
    return all(math.isfinite(v) and abs(v) <= Z_GATE for v in z.values())


def spread_ratios(reg: dict, trees: list[dict], names) -> dict[str, float]:
    """Simulated SD over all `trees` (detrended, ddof 1) over the real SD, per descriptor."""
    at = reg["size_match"]["dbh"]
    out = {}
    for k in names:
        real = reg["real"][k]
        v = detrended(trees, k, real["slope"], at)
        out[k] = float(np.std(v, ddof=1)) / real["sd"] if len(v) > 1 else math.nan
    return out


def spread_passes(ratios: dict[str, float]) -> bool:
    return all(math.isfinite(r) and r > 0 and abs(math.log(r)) <= SPREAD_BAND for r in ratios.values())


def pseudo_seeds(trees: list[dict], n_seeds: int, per_seed: int, rng: np.random.Generator) -> list[list[dict]]:
    """Real trees as pseudo-seeds: `per_seed` drawn without replacement within a seed, independently across seeds."""
    return [[trees[i] for i in rng.choice(len(trees), per_seed, replace=False)] for _ in range(n_seeds)]


def as_sim(real: list[dict]) -> list[dict]:
    """Real trees in the simulated trees' shape (descriptor keys at the top level), for the gate's own functions."""
    return [{**t["d"], "dbh": t["dbh"]} for t in real]


def gap_strata(reg: dict) -> dict[str, dict[str, float]]:
    """Each descriptor's real median by BioDiv gap stratum, detrended, in real-SD units from the pooled median."""
    rows = reg["real_trees_by_gap"]
    out = {}
    for k in reg["fitted"] + reg["held_out"]:
        real = reg["real"][k]
        out[k] = {g: (v[k] - real["median"]) / real["sd"] if v.get(k) is not None else math.nan
                  for g, v in rows.items()}
    return out


def write_csv(path: Path, rows: list[dict]) -> None:
    keys = list(dict.fromkeys(k for r in rows for k in r))
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, keys, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
