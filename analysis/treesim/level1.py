"""Level 1 (reference-fidelity phase 3; ADR 0049 §1–4): a species' branching descriptors as distributions over real
trees at a matched size, against the same descriptors of its simulated closed stand. The beech pilot first (the
plan's §g: provisional, pending Level 0 and ADR 0052; nothing from it enters species params).

The registration (`analysis/fit/sources/level1-<species>.json`, written by analysis/experiments/level1_targets.py
before any simulated tree is scored) holds what this module reads: the descriptors and the held-out draw, the real
distributions, the frozen Level 0 knobs, the fitted knobs and the file hashes. This module holds the rules.

- **Descriptors.** Gate c v3.1's tier A and tier B for the species' dataset (the targets file's `[level1]`). Held-out
  values are computed and never written by the fit (the user, 2026-11-04): only the gate reads them.
- **Real.** Each tree's value (BioDiv: the median over its repeats, tolerance.median_of); OLS on ln measured DBH
  (tolerance.between_tree's fit): the slope b, the residual SD (df n − 2) and the median of the values detrended to the
  matched DBH, y − b (ln d − ln d*).
- **Correlation (registration v3, pilot v2; the user, 2026-11-04).** Pearson r between every two descriptors over the
  real trees, pairwise complete, on the values detrended as the targets are (each by its own registered slope).
- **Hold-outs (v3): whole clusters, to a third.** Average linkage on 1 − |r| cut at |r| = CLUSTER_CUT; each cluster
  (pair or singleton) is one unit. The clusters in canonical order (members sorted, clusters by their first member),
  drawn without replacement with HELD_OUT_SEED, are taken whole until the held-out descriptors number at least
  round(HELD_OUT_SHARE × n) (ADR 0049 §3). A pair inside a cluster never straddles the fitted/held-out line.
- **Weights (v3).** Each fitted descriptor's location term weighs 1 / Σ_j |r_ij| over all the descriptors, self
  included, after every |r| below the two-sided R_ALPHA critical value at the real n is zeroed (sampling noise must not
  compress independent descriptors).
- **Simulated.** The stand's live measured trees at the size-matched season, coarsened at the dataset's d_min with
  Demol 2022's inflation (coarsen.coarsen(inflated=True): `rules.assign`, the fit compares the coarsened simulator
  only), described, and detrended with the registered b on the uncoarsened tree's DBH (cylinders.dbh, describe()'s
  rule on a simulated tree).
- **Size match** (phase1-tolerances.json `rules.size_match`, per candidate on its own seeds): the first season of
  MATCH_SEASONS at which the median over seeds of the per-seed median DBH of the live measured trees (cli/allometry.ts,
  parity 1e-9 with cylinders.dbh) reaches d*. A match outside DUMP_SEASONS, or none, is unmatched.
- **Loss terms (v3: location only).** Per fitted descriptor, z = (median of the detrended simulated trees − real
  median) / real SD; its term is w z², or w × MISSING_PENALTY with fewer than MIN_TREES finite trees or an unmatched
  candidate. The spread s = ln(simulated SD / real SD) / ln 2 is computed and kept in the traits (reported); in v3 it
  is never in the loss, only a gate criterion (ADR 0049 §4).
- **Loss (v4, pilot v3; the user, 2026-11-04).** v3's terms, plus a one-sided spread penalty per fitted descriptor,
  `l1.<k>.spr` = w_k (ln(min(1, r / SPREAD_FLOOR)) / ln 2)² with r = simulated SD / real SD, i.e. w_k min(0, s + 1)²:
  0 while the simulated spread is at least half the real, 1 at a quarter, 4 at an eighth; w_k × MISSING_PENALTY where
  s cannot be read (fewer than MIN_TREES finite trees, a zero SD, or an unmatched candidate). Read where the
  registration's `loss.spread_floor` is set. Level 0's traits named in `loss.level0_reported` (v4: stand.lateShare and
  stand.height100) are reported, not scored (fit_level1.level1_spec moves them to the spec's reports).
- **Seeds (v3).** The search grows every candidate of every generation on the same seeds: the first
  `seeds_per_candidate` of the registered list (SEARCH_SEED; never the gate's, the finalists', the gallery's or the
  noise check's). `seeds_per_candidate` is set once, from the hand's noise floor on the v3 loss (level1_noise.py).
- **Gate** (ADR 0049 §4): on GATE_SEEDS, a seed passes when every held-out descriptor's |z| ≤ Z_GATE, z read on the
  median of that seed's trees; the species on ≥ PASS_SEEDS. Spread within ×2 on every descriptor, fitted and held out
  (v3, the user: spread is about the model, not the fit), over all the gate's trees. shapeFlag clear (gallery.py).
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
HELD_OUT_SEED = 20261104
HELD_OUT_SHARE = 1 / 3
#: The hold-out clusters (v3): average linkage on 1 − |r|, cut where |r| = CLUSTER_CUT.
CLUSTER_METHOD = "average"
CLUSTER_CUT = 0.5
#: The weights (v3): an |r| below this two-sided level's critical value at the real n counts as 0.
R_ALPHA = 0.05
MATCH_SEASONS = tuple(range(50, 151, 10))
DUMP_SEASONS = tuple(range(50, 101, 10))
MIN_TREES = 10
Z_GATE = 2.0
SPREAD_BAND = math.log(2.0)
#: The spread penalty's floor (v4): no penalty while simulated SD / real SD is at least this.
SPREAD_FLOOR = 0.5
PASS_SEEDS = 15
GATE_SEEDS = tuple(range(1, 21))
FINAL_SEEDS = tuple(range(101, 111))
#: The seed range of the fit and the noise check: never the gate's, the finalists' or the gallery's (1001–1003).
#: Registration v2 drew a candidate's seeds from it afresh each generation; v3 fixes them (`search_seeds`).
FIT_SEEDS = tuple(s for s in range(1000, 10_000) if s not in (1001, 1002, 1003))
#: The gallery's seeds in the pilot's post-fit check (1001–1006): never a search seed.
GALLERY_SEEDS = tuple(range(1001, 1007))
#: The hand's noise check: six 5-seed and three 10-seed draws from FIT_SEEDS (the pilot's postfit.py, and v3's).
NOISE_SEED = 20261106
#: The search's fixed seeds (v3): SEARCH_COUNT drawn once from FIT_SEEDS less the gallery's and the noise check's.
SEARCH_SEED = 20261107
SEARCH_COUNT = 10
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


# --- Descriptors, correlation, hold-outs and weights (v3) --------------------------------------------------------


def detrended_columns(trees: list[dict], names, real: dict, at: float) -> np.ndarray:
    """A trees × names matrix of the values detrended to DBH `at` by each descriptor's registered slope (NaN where a
    value or the DBH is missing). Trees in the simulated shape: descriptor keys at the top level (`as_sim`)."""
    x = np.full((len(trees), len(names)), np.nan)
    for i, t in enumerate(trees):
        d = t.get("dbh")
        if d is None or not math.isfinite(d) or d <= 0:
            continue
        for j, k in enumerate(names):
            y = t.get(k)
            if y is not None and math.isfinite(y):
                x[i, j] = detrend(y, d, real[k]["slope"], at)
    return x


def correlation(x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Pearson r between every two columns over the rows where both are finite (pairwise complete), and those row
    counts. Symmetric, with 1 on the diagonal."""
    n = x.shape[1]
    r, m = np.eye(n), np.zeros((n, n), dtype=int)
    for a in range(n):
        m[a, a] = int(np.isfinite(x[:, a]).sum())
        for b in range(a + 1, n):
            ok = np.isfinite(x[:, a]) & np.isfinite(x[:, b])
            m[a, b] = m[b, a] = int(ok.sum())
            r[a, b] = r[b, a] = float(np.corrcoef(x[ok, a], x[ok, b])[0, 1]) if ok.sum() > 2 else math.nan
    return r, m


def r_critical(n: int, alpha: float = R_ALPHA) -> float:
    """The two-sided `alpha` critical value of Pearson's r at n pairs: t / √(t² + n − 2)."""
    from scipy import stats

    df = n - 2
    t = float(stats.t.ppf(1 - alpha / 2, df))
    return t / math.sqrt(t * t + df)


def location_weights(r: np.ndarray, names, r_crit: float) -> dict[str, float]:
    """Each descriptor's weight: 1 / Σ_j |r_ij| over all the descriptors, self included, with every |r| below r_crit
    zeroed first."""
    a = np.abs(np.asarray(r, dtype=float))
    a[a < r_crit] = 0.0
    np.fill_diagonal(a, 1.0)
    return {k: float(1.0 / a[i].sum()) for i, k in enumerate(names)}


def clusters(r: np.ndarray, names, cut: float = CLUSTER_CUT, method: str = CLUSTER_METHOD) -> list[list[str]]:
    """Hierarchical clusters on the distance 1 − |r|, cut at the distance 1 − cut; canonical order: members sorted,
    clusters by their first member."""
    from scipy.cluster.hierarchy import fcluster, linkage
    from scipy.spatial.distance import squareform

    d = 1.0 - np.abs(np.asarray(r, dtype=float))
    d = (d + d.T) / 2
    np.fill_diagonal(d, 0.0)
    labels = fcluster(linkage(squareform(d, checks=False), method=method), t=1.0 - cut, criterion="distance")
    out: dict[int, list[str]] = {}
    for k, c in zip(names, labels):
        out.setdefault(int(c), []).append(k)
    return sorted((sorted(v) for v in out.values()), key=lambda v: v[0])


def cluster_held_out(groups: list[list[str]], seed: int = HELD_OUT_SEED,
                     share: float = HELD_OUT_SHARE) -> tuple[list[str], list[int], int]:
    """Whole clusters held out to a third: the clusters (canonical order) drawn without replacement with `seed`, taken
    in the drawn order until the held-out descriptors number at least round(share × n). Returns the held-out
    descriptors (sorted), the full draw order (indices into `groups`) and how many of it were taken."""
    n = sum(len(g) for g in groups)
    need = round(share * n)
    order = [int(i) for i in np.random.default_rng(seed).choice(len(groups), len(groups), replace=False)]
    held: list[str] = []
    taken = 0
    for i in order:
        if len(held) >= need:
            break
        held += groups[i]
        taken += 1
    return sorted(held), order, taken


def spread_names(reg: dict) -> list[str]:
    """The descriptors the spread criterion reads (v3, the user): all of them, fitted and held out."""
    return sorted(reg["descriptors"])


# --- Seeds (v3) --------------------------------------------------------------------------------------------------


def noise_draws(seed: int = NOISE_SEED) -> tuple[list[list[int]], list[list[int]]]:
    """The noise check's six 5-seed and three 10-seed draws, disjoint, from FIT_SEEDS (the pilot's postfit.py's)."""
    pool = np.random.default_rng(seed).choice(np.array(FIT_SEEDS), 6 * 5 + 3 * 10, replace=False).tolist()
    return [pool[5 * i:5 * i + 5] for i in range(6)], [pool[30 + 10 * i:40 + 10 * i] for i in range(3)]


def search_seeds(seed: int = SEARCH_SEED, count: int = SEARCH_COUNT) -> list[int]:
    """The search's fixed seeds: `count` drawn once from FIT_SEEDS less the gallery's and the noise check's."""
    d5, d10 = noise_draws()
    taken = {s for d in d5 + d10 for s in d} | set(GALLERY_SEEDS)
    pool = np.array([s for s in FIT_SEEDS if s not in taken])
    return [int(s) for s in np.random.default_rng(seed).choice(pool, count, replace=False)]


def fit_seeds(reg: dict) -> list[int]:
    """Every candidate's seeds in every generation: the first `seeds_per_candidate` of the registered list."""
    n = reg["loss"].get("seeds_per_candidate")
    if n is None:
        raise SystemExit("refusing: seeds_per_candidate is not set (analysis/experiments/level1_noise.py sets it)")
    return list(reg["seeds"]["search"]["list"][:n])


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


def spread_penalty(s: float | None, floor: float = SPREAD_FLOOR) -> float | None:
    """The one-sided spread term (v4) of s = log2(simulated SD / real SD): (ln(min(1, r / floor)) / ln 2)², r = 2^s;
    0 for r ≥ floor. None where s is missing or not finite."""
    if s is None or not math.isfinite(s):
        return None
    return min(0.0, s - math.log2(floor)) ** 2


def level1_contributions(reg: dict, traits: dict) -> dict[str, float]:
    """Per fitted descriptor, `l1.<k>.loc` = w_k z² (the registered weights); w_k × MISSING_PENALTY for a descriptor
    that could not be scored (or for every one, unmatched). v3: location only. v4 (`loss.spread_floor` set): also
    `l1.<k>.spr` = w_k × spread_penalty(s), or w_k × MISSING_PENALTY where s cannot be read."""
    w = reg["location_weights"]
    floor = reg.get("loss", {}).get("spread_floor")
    out = {}
    for k in reg["fitted"]:
        z = traits.get(f"l1.{k}.z")
        out[f"l1.{k}.loc"] = w[k] * (z * z if z is not None and math.isfinite(z) else MISSING_PENALTY)
        if floor is not None:
            p = spread_penalty(traits.get(f"l1.{k}.s"), floor)
            out[f"l1.{k}.spr"] = w[k] * (MISSING_PENALTY if p is None else p)
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
