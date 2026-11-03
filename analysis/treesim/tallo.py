"""Level 0 targets from Tallo (reference-fidelity plan §g phase 2; the plan's "Phase 2" section): per species, the
10/50/90% quantile curves of ln H and ln CR conditional on ln DBH, and the gate's threshold from a control on real
trees only. Pre-registered (one commit) before any simulated tree is read; a change is a new commit with its reason.

**v2 (2026-11-03, the user; docs/experiments/2026-11-03-level0-targets.md, "Level 0 targets v2"):** real data only.
- A geographic subset for climatic comparability with Britain, REGION (45–58° N, 10° W–25° E; the eastern edge takes in
  Białowieża), the same for every species. Chosen after the oak source audit (one Spanish inventory gave 73% of oak's
  European height rows); the criterion is geographic, never a source or an outcome.
- Thin is read from the subset: n_H < SMALL_N gets the borrowed band (re-pooled on the subset's well-sampled
  broadleaves, n_H ≥ SMALL_N); n_H < UNGATED_N: curves reported, the species not gated at Level 0. Borrowed T likewise.
- The control matches the gate: a pseudo-seed is SEASONS pseudo-seasons of TREES real trees each (independent draws
  across the support); its statistic is max |median z| over both traits and all three seasons.
v1 (pooled Europe, one draw of four) is 06915ac's; its fits are archived in docs/experiments/fits/level0-v1/.

Tallo v1.0.0 (Jucker et al. 2022, Global Change Biology 28:5254; Zenodo 10.5281/zenodo.6637599, CC-BY 4.0).

- **Filter:** the species' taxa; Europe by count_species.py's box (35–72° N, 25° W–45° E), then REGION (v2); per trait, the
  publishers' Mahalanobis outlier flag "N" and a value. Forest-grown by source (the audit: every source for these
  species is a forest plot or inventory); Tallo has no column for it, so nothing is filtered on it.
- **Curves:** linear quantile regression of ln y on [1, ln D] (+ (ln D)² when n ≥ QUADRATIC_N), τ 0.1, 0.5, 0.9,
  solved exactly as a linear program. The three predictions are sorted pointwise (rearrangement, Chernozhukov et al.
  2010) wherever they cross. Support: DBH [p2.5, p97.5] of the trait's rows; outside it a tree is not comparable.
- **Thin species** (v1: willow, rowan, holly; v2: n_H < SMALL_N in REGION): their own median line on [1, ln D], with the band
  borrowed from the well-sampled broadleaves' pooled ln residuals about their own medians (multiplicative); their own
  10/90% lines are reported beside it, ungated. They borrow T as well (the user, 2026-11-03): the pooled T of the
  broadleaves' control statistics; their own T, a small-pool artefact, is kept beside it as `T_own`.
- **z:** (ln y − q50) / (q90 − q50) above the median, / (q50 − q10) below; |z| ≤ 1 is inside the band.
- **Control** (the user's rulings, 2026-11-03; v2): a pseudo-seed is SEASONS pseudo-seasons, each 4 real trees with
  both H and CR drawn from the whole support (z is already conditional on DBH; no bins), so it reads no simulated DBH.
  Its statistic is the gate's: max |median z| over both traits and the three seasons; T, one per species, is its 90th
  percentile over CONTROL_SEEDS pseudo-seeds, so a seed drawn from Tallo passes with p = 0.9 (the 90th percentile of
  20 rests on two values; T over the first 20 is reported beside it). T by v1's statistic (one draw of four) on the
  same trees is reported beside it. Self-consistency: 20 fresh pseudo-seeds judged by the gate's own rule, ≥ 15.
- **Coverage** (the diagnostic for "is the band conditional enough"): the share of real trees inside their own band
  per tercile of ln D over the support; near 0.8 in each. Outside 0.65–0.95 is a note, never tuned on.

    uv run --project analysis python -I -m treesim.tallo      # writes TARGETS and CURVES (v2)
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import polars as pl
from scipy import sparse
from scipy.optimize import linprog

from treesim.sweep import REPO

TALLO = REPO / "data" / "reference" / "tallo" / "Tallo.csv"
TARGETS = REPO / "analysis" / "fit" / "sources" / "tallo-level0.json"
CURVES = REPO / "analysis" / "fit" / "sources" / "tallo-level0-curves.csv"
#: v1 (06915ac), archived with its fits: what the 2026-11-03 trunk diagnosis read.
TARGETS_V1 = REPO / "docs" / "experiments" / "fits" / "level0-v1" / "tallo-level0-v1.json"

#: The sim's species and their Tallo taxa; sycamore is a reference only (field maple's Level 1 proxy, never Level 0).
TAXA = {
    "beech": ["Fagus sylvatica"],
    "oak": ["Quercus robur", "Quercus petraea"],
    "birch": ["Betula pendula", "Betula pubescens"],
    "hornbeam": ["Carpinus betulus"],
    "maple": ["Acer campestre"],
    "willow": ["Salix caprea"],
    "rowan": ["Sorbus aucuparia"],
    "holly": ["Ilex aquifolium"],
    "pine": ["Pinus sylvestris"],
    "fir": ["Abies alba"],
    "sycamore": ["Acer pseudoplatanus"],
}
#: Sycamore is never gated; the rest are, unless REGION leaves them fewer than UNGATED_N height rows (v2).
REFERENCE_ONLY = ["sycamore"]
#: The broadleaves whose pooled residuals give the thin species' band, where REGION leaves them well sampled (n_H ≥
#: SMALL_N; v2).
BROADLEAVES = ["beech", "oak", "birch", "hornbeam", "maple", "sycamore"]
#: v2's geographic subset (the user, 2026-11-03): latitude, longitude, inclusive. Climatic comparability with Britain;
#: the eastern edge takes in Białowieża. One box for every species.
REGION = {"latitude": (45.0, 58.0), "longitude": (-10.0, 25.0)}
VERSION = 2
TRAITS = {"H": "height_m", "CR": "crown_radius_m"}
OUTLIER = {"H": "height_outlier", "CR": "crown_radius_outlier"}
TAUS = (0.1, 0.5, 0.9)
QUADRATIC_N = 300
SUPPORT = (2.5, 97.5)
BOOTSTRAP = 200
SMALL_N = 100
#: Below this many height rows in REGION a species' curves are reported and it is not gated at Level 0 (v2).
UNGATED_N = 30
#: The control: trees per pseudo-seed, pseudo-seeds for T, and the self-consistency draw, judged as the gate is.
TREES = 4
SEASONS = 3
CONTROL_SEEDS = 2000
CHECK_SEEDS = 20
GATE_PASS = 15
T_QUANTILE = 0.9
#: Coverage per tercile outside this range is a note for the write-up (the user, 2026-11-03), never tuned on.
COVERAGE_NOTE = (0.65, 0.95)
RNG_SEED = 2026


def load(path: Path = TALLO, region: bool = True) -> pl.DataFrame:
    """Tallo in count_species.py's Europe box and, unless region=False (v1's pooled Europe), REGION."""
    df = pl.read_csv(path, null_values=["NA", ""], infer_schema_length=100_000)
    df = df.filter(pl.col("latitude").is_between(35, 72) & pl.col("longitude").is_between(-25, 45))
    if region:
        (la0, la1), (lo0, lo1) = REGION["latitude"], REGION["longitude"]
        df = df.filter(pl.col("latitude").is_between(la0, la1) & pl.col("longitude").is_between(lo0, lo1))
    return df


def rows(df: pl.DataFrame, species: str, trait: str) -> pl.DataFrame:
    """The trait's rows of the species: its taxa, the outlier flag "N", a value and a positive DBH."""
    col = TRAITS[trait]
    return df.filter(
        pl.col("species").is_in(TAXA[species])
        & (pl.col(OUTLIER[trait]) == "N")
        & pl.col(col).is_not_null()
        & (pl.col(col) > 0)
        & (pl.col("stem_diameter_cm") > 0)
    ).select("species", "reference_id", pl.col("stem_diameter_cm").alias("dbh"), pl.col(col).alias("y"))


def design(lnd: np.ndarray, degree: int) -> np.ndarray:
    return np.column_stack([lnd**k for k in range(degree + 1)])


def quantreg(x: np.ndarray, y: np.ndarray, tau: float) -> np.ndarray:
    """Exact linear quantile regression: min Σ τ u⁺ + (1 − τ) u⁻ subject to Xβ + u⁺ − u⁻ = y."""
    n, p = x.shape
    c = np.concatenate([np.zeros(p), np.full(n, tau), np.full(n, 1 - tau)])
    eye = sparse.identity(n, format="csr")
    a = sparse.hstack([sparse.csr_matrix(x), eye, -eye], format="csr")
    bounds = [(None, None)] * p + [(0, None)] * (2 * n)
    res = linprog(c, A_eq=a, b_eq=y, bounds=bounds, method="highs")
    if res.status != 0:
        raise RuntimeError(f"quantile regression failed: {res.message}")
    return res.x[:p]


def predict(curve: dict, dbh_cm: np.ndarray | float) -> np.ndarray:
    """ln q10, ln q50, ln q90 at DBH (cm), rows sorted pointwise (rearrangement where curves cross)."""
    lnd = np.log(np.atleast_1d(np.asarray(dbh_cm, float)))
    q50 = design(lnd, len(curve["coef"]["0.5"]) - 1) @ np.array(curve["coef"]["0.5"])
    if curve["band"] == "borrowed":
        q = np.column_stack([q50 + curve["borrowed"]["r10"], q50, q50 + curve["borrowed"]["r90"]])
    else:
        q = np.column_stack([design(lnd, len(curve["coef"][str(t)]) - 1) @ np.array(curve["coef"][str(t)])
                             for t in TAUS])
    return np.sort(q, axis=1)


def z_score(curve: dict, dbh_cm: float, y: float) -> float | None:
    """The tree's position in the band: 0 at the median, ±1 at the 90/10% curves; None outside the support."""
    lo, hi = curve["support"]
    if not (lo <= dbh_cm <= hi) or not y > 0:
        return None
    q10, q50, q90 = predict(curve, dbh_cm)[0]
    ly = float(np.log(y))
    return (ly - q50) / (q90 - q50) if ly >= q50 else (ly - q50) / (q50 - q10)


def fit_curve(d: pl.DataFrame, thin: bool, rng: np.random.Generator) -> dict:
    dbh = d["dbh"].to_numpy().astype(float)
    lnd, ly = np.log(dbh), np.log(d["y"].to_numpy().astype(float))
    n = len(d)
    degree = 2 if n >= QUADRATIC_N else 1
    x = design(lnd, degree)
    own = {str(t): quantreg(x, ly, t).tolist() for t in TAUS}
    lo, hi = np.percentile(dbh, SUPPORT)
    grid = np.exp(np.linspace(np.log(lo), np.log(hi), 50))
    raw = np.column_stack([design(np.log(grid), degree) @ np.array(own[str(t)]) for t in TAUS])
    curve = {
        "n": n,
        "taxa": {k: int(v) for k, v in d.group_by("species").len().iter_rows()},
        "sources": d["reference_id"].n_unique(),
        "support": [float(lo), float(hi)],
        "observed": [float(dbh.min()), float(dbh.max())],
        "form": "quadratic in ln D" if degree == 2 else "linear in ln D",
        "band": "borrowed" if thin else "own",
        "coef": own if not thin else {"0.5": own["0.5"]},
        "crossing": bool(np.any(np.diff(raw, axis=1) < 0)),
        "small_n": n < SMALL_N,
    }
    if thin:
        curve["own_tails_ungated"] = {"0.1": own["0.1"], "0.9": own["0.9"]}
    if n < QUADRATIC_N:
        mid = np.array([np.median(lnd)])
        widths = []
        for _ in range(BOOTSTRAP):
            k = rng.integers(0, n, n)
            q = [design(mid, degree) @ quantreg(x[k], ly[k], t) for t in (0.1, 0.9)]
            widths.append(float(q[1][0] - q[0][0]))
        point = float((design(mid, degree) @ (np.array(own["0.9"]) - np.array(own["0.1"])))[0])
        curve["bootstrap_band_ln"] = {"at_dbh": float(np.exp(mid[0])), "own": point,
                                      "ci90": [float(np.percentile(widths, 5)), float(np.percentile(widths, 95))]}
    return curve


def residuals(curve: dict, d: pl.DataFrame) -> np.ndarray:
    dbh = d["dbh"].to_numpy().astype(float)
    return np.log(d["y"].to_numpy().astype(float)) - predict(curve, dbh)[:, 1]


def joint_rows(df: pl.DataFrame, species: str, curves: dict) -> tuple[np.ndarray, np.ndarray]:
    """Each real tree with both H and CR inside both supports: its z for H and for CR (a simulated seed's four trees
    give both traits, so the control's pseudo-trees do too)."""
    d = df.filter(
        pl.col("species").is_in(TAXA[species])
        & (pl.col("height_outlier") == "N") & (pl.col("crown_radius_outlier") == "N")
        & (pl.col("height_m") > 0) & (pl.col("crown_radius_m") > 0) & (pl.col("stem_diameter_cm") > 0)
    )
    zs = {t: np.array([z_score(curves[t], a, b) if z_score(curves[t], a, b) is not None else np.nan
                       for a, b in zip(d["stem_diameter_cm"].to_numpy(), d[TRAITS[t]].to_numpy())], float)
          for t in TRAITS}
    keep = np.isfinite(zs["H"]) & np.isfinite(zs["CR"])
    return zs["H"][keep], zs["CR"][keep]


def coverage(curve: dict, d: pl.DataFrame) -> list[float]:
    """The share of the trait's real trees inside their own 10–90% band, per tercile of ln D over the support: near
    0.8 in each when the band is conditional enough (the user, 2026-11-03: a diagnostic, never tuned on)."""
    lo, hi = curve["support"]
    d = d.filter(pl.col("dbh").is_between(lo, hi))
    dbh, ly = d["dbh"].to_numpy().astype(float), np.log(d["y"].to_numpy().astype(float))
    q = predict(curve, dbh)
    inside = (ly >= q[:, 0]) & (ly <= q[:, 2])
    # Terciles by rank, so tied DBHs (holly's whole centimetres) still split three ways.
    k = np.empty(len(dbh), int)
    k[np.argsort(dbh, kind="stable")] = np.arange(len(dbh)) * 3 // len(dbh)
    return [float(inside[k == i].mean()) for i in range(3)]


def control(zh: np.ndarray, zc: np.ndarray, rng: np.random.Generator) -> dict:
    """T from real trees only (the user, 2026-11-03; v2): a pseudo-seed is SEASONS pseudo-seasons of TREES real trees
    each, drawn independently from the whole support; its statistic is the gate's, max |median z| over both traits and
    the SEASONS seasons; T its T_QUANTILE over CONTROL_SEEDS pseudo-seeds, so a seed drawn from Tallo passes with
    p = T_QUANTILE. A simulated seed's seasons are the same trees growing (correlated), so under a perfect model it
    passes with p ≥ T_QUANTILE. Self-consistency: CHECK_SEEDS fresh pseudo-seeds judged by the species gate's own rule
    (≥ GATE_PASS). `T_v1_statistic`: v1's statistic (one draw of TREES) on the same trees, its own draws."""

    def draw(seeds: int, seasons: int) -> np.ndarray:
        out = np.empty(seeds)
        for s in range(seeds):
            m = 0.0
            for _ in range(seasons):
                k = rng.choice(len(zh), min(TREES, len(zh)), replace=False)
                m = max(m, abs(np.median(zh[k])), abs(np.median(zc[k])))
            out[s] = m
        return out

    stat = draw(CONTROL_SEEDS, SEASONS)
    t = float(np.quantile(stat, T_QUANTILE))
    fresh = draw(CHECK_SEEDS, SEASONS)
    passed = int((fresh <= t).sum())
    v1 = float(np.quantile(draw(CONTROL_SEEDS, 1), T_QUANTILE))
    return {"T": t, "T_kind": "own", "T_first20": float(np.quantile(stat[:CHECK_SEEDS], T_QUANTILE)),
            "T_v1_statistic": v1, "trees": int(len(zh)),
            "self_consistency": {"pass": passed, "of": CHECK_SEEDS, "need": GATE_PASS, "ok": passed >= GATE_PASS},
            "_stat": stat, "_fresh": fresh}


def borrow_t(species: dict[str, dict], pool: list[str], thin: list[str]) -> dict:
    """The thin species' T (the user, 2026-11-03): their own T is a small-pool resampling artefact (holly 0.51 from 24
    trees, willow 0.97 from 17), so they take the pooled T of `pool` (v2: BROADLEAVES well sampled in REGION): the
    T_QUANTILE of those species' control
    statistics together, each species' CONTROL_SEEDS pseudo-seeds weighing alike. Real data only, no further draws.
    Their own T stays beside it (`T_own`), and their self-consistency is judged by the borrowed T on their own draws."""
    stats = np.concatenate([species[s]["control"]["_stat"] for s in pool])
    t = float(np.quantile(stats, T_QUANTILE))
    pooled = {"T": t, "pseudo_seeds": int(len(stats)), "trees": int(sum(species[s]["control"]["trees"]
                                                                        for s in pool)), "from": pool}
    for s in thin:
        c = species[s]["control"]
        passed = int((c["_fresh"] <= t).sum())
        c["T_own"], c["T"], c["T_kind"], c["T_pooled"] = c["T"], t, "borrowed T", pooled
        c["self_consistency_own_T"] = c["self_consistency"]
        c["self_consistency"] = {"pass": passed, "of": CHECK_SEEDS, "need": GATE_PASS, "ok": passed >= GATE_PASS}
    for e in species.values():
        if e.get("control"):
            e["control"].pop("_stat")
            e["control"].pop("_fresh")
    return pooled


def classify(data: dict[str, dict[str, pl.DataFrame]]) -> tuple[list[str], list[str], list[str]]:
    """v2: from REGION's height rows alone. Thin (the borrowed band and T): n_H < SMALL_N. Ungated (curves
    reported, not gated at Level 0): n_H < UNGATED_N. The pool: BROADLEAVES with n_H ≥ SMALL_N."""
    n = {s: len(data[s]["H"]) for s in data}
    thin = [s for s in TAXA if n[s] < SMALL_N]
    ungated = [s for s in TAXA if n[s] < UNGATED_N]
    pool = [s for s in BROADLEAVES if n[s] >= SMALL_N]
    return thin, ungated, pool


def build(path: Path = TALLO) -> dict:
    rng = np.random.default_rng(RNG_SEED)
    df = load(path)
    data = {s: {t: rows(df, s, t) for t in TRAITS} for s in TAXA}
    thin, ungated, pool = classify(data)
    out: dict = {"species": {}}
    for s in TAXA:
        if s not in thin:
            out["species"][s] = {t: fit_curve(data[s][t], False, rng) for t in TRAITS}
    pooled = {}
    for t in TRAITS:
        r = np.concatenate([residuals(out["species"][s][t], data[s][t]) for s in pool])
        pooled[t] = {"r10": float(np.quantile(r, 0.1)), "r90": float(np.quantile(r, 0.9)), "n": int(len(r)),
                     "from": pool}
    for s in thin:
        out["species"][s] = {}
        for t in TRAITS:
            d = data[s][t]
            if len(d) < 3:
                # Nothing to fit (holly: no rows in REGION); the entry says so and is reported, never gated.
                out["species"][s][t] = {"n": len(d), "sources": d["reference_id"].n_unique(), "band": "none",
                                        "form": "no curve: fewer than 3 rows in REGION", "small_n": True}
                continue
            c = fit_curve(d, True, rng)
            c["borrowed"] = pooled[t]
            out["species"][s][t] = c
    for s in TAXA:
        e = out["species"][s]
        e["gated"] = s not in REFERENCE_ONLY and s not in ungated
        e["n_H_region"] = len(data[s]["H"])
        if s in ungated:
            e["not_gated_reason"] = f"n_H {len(data[s]['H'])} < {UNGATED_N} in REGION: curves reported only"
            e["control"] = None
            continue
        e["control"] = control(*joint_rows(df, s, e), rng)
        for t in TRAITS:
            e[t]["coverage_terciles"] = coverage(e[t], data[s][t])
    pooled_t = borrow_t(out["species"], pool, [s for s in thin if s not in ungated])
    out["meta"] = {
        "version": VERSION,
        "supersedes": "v1, 06915ac (pooled Europe; one draw of four trees): docs/experiments/fits/level0-v1/",
        "source": "Tallo v1.0.0, Jucker et al. 2022 (Global Change Biology 28:5254), "
                  "doi 10.5281/zenodo.6637599, CC-BY 4.0",
        "tallo_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "filter": {
            "europe_box": "latitude 35–72, longitude −25–45 (count_species.py)",
            "region": {**REGION, "why": "climatic comparability with Britain, the same box for every species; chosen "
                       "after the oak source audit (one Spanish inventory, ref 35, gave 73% of oak's European height "
                       "rows); geographic, never by source or outcome"},
            "H": "height_outlier == 'N', height_m > 0", "CR": "crown_radius_outlier == 'N', crown_radius_m > 0",
            "regime": "forest-grown by source (docs/plans/reference-audit/tallo.md); no column to filter on",
            "taxa": TAXA,
        },
        "model": {"taus": TAUS, "quadratic_n": QUADRATIC_N, "support_percentiles": SUPPORT, "solver": "linprog highs",
                  "rearrangement": "pointwise sort of the three predictions", "bootstrap": BOOTSTRAP},
        "thin": {"rule": f"n_H < {SMALL_N} in REGION: borrowed band and T; n_H < {UNGATED_N}: not gated",
                 "species": thin, "ungated": ungated, "pool": pool,
                 "band": "pooled ln residuals of the pool about their own medians", "pooled": pooled,
                 "T": "borrowed: the pooled T of the pool's control statistics (each species' pseudo-seeds alike)",
                 "pooled_T": pooled_t},
        "z": "(ln y − q50)/(q90 − q50) above the median, (ln y − q50)/(q50 − q10) below; None outside the support",
        "gate": {
            "per_seed": "max |median z| over H and CR of the comparable measured trees, over every season (60, 100, "
                        "150) with a comparable median, ≤ T (one T per species)",
            "species": f"≥ {GATE_PASS} of seeds 1–20; no comparable season: not gateable at Level 0",
            "control": f"pseudo-seeds of {SEASONS} pseudo-seasons × {TREES} real trees with both H and CR, each "
                       f"season drawn independently from the whole support; statistic max |median z| over both "
                       f"traits and the {SEASONS} seasons (the gate's); T its {T_QUANTILE:.0%} quantile over "
                       f"{CONTROL_SEEDS} pseudo-seeds; self-consistency: {CHECK_SEEDS} fresh pseudo-seeds judged by "
                       f"the gate's rule, ≥ {GATE_PASS}. T_v1_statistic: one draw of {TREES} on the same trees",
            "seasons_note": "a simulated seed's three seasons are the same trees growing (correlated), the control's "
                            "independent: under a perfect model a seed passes with p ≥ 0.9",
            "coverage": f"share of real trees inside their own band per tercile of ln D; outside {COVERAGE_NOTE} is a "
                        "note for the write-up, never tuned on",
            "rng_seed": RNG_SEED,
        },
        "measurement": {
            "dbh": "phase 1's rule (cylinders.dbh): the trunk (continuation by subtree wood volume) cylinder spanning "
                   "1.3 m of stem length, ×2; wood only, no bark (the same bias as Level 1's size matching)",
            "height": "highest point above the root's base (cylinders.height)",
            "crown_radius": "mean over ±x, ±z of the largest offset of a live-bud metamer's tip from the trunk at 1.3 m",
            "cell_m": 0.25,
        },
    }
    return out


def curves_table(t: dict) -> pl.DataFrame:
    recs = []
    for s, e in t["species"].items():
        for trait in TRAITS:
            c = e[trait]
            if "support" not in c:
                continue
            lo, hi = c["support"]
            for d in np.exp(np.linspace(np.log(lo), np.log(hi), 12)):
                q = np.exp(predict(c, d)[0])
                recs.append({"species": s, "trait": trait, "band": c["band"], "dbh_cm": round(float(d), 2),
                             "q10": round(float(q[0]), 3), "q50": round(float(q[1]), 3), "q90": round(float(q[2]), 3)})
    return pl.DataFrame(recs)


def load_targets(path: Path = TARGETS) -> dict:
    return json.loads(path.read_text())


if __name__ == "__main__":
    t = build()
    TARGETS.write_text(json.dumps(t, indent=1, ensure_ascii=False) + "\n")
    curves_table(t).write_csv(CURVES)
    v1_path = REPO / "docs" / "experiments" / "fits" / "level0-v1" / "tallo-level0-v1.json"
    v1 = json.loads(v1_path.read_text())["species"] if v1_path.exists() else {}
    print("| species | trait | n | taxa | sources | DBH support cm | form | band | n<100 | coverage by tercile |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for s, e in t["species"].items():
        for trait in TRAITS:
            c = e[trait]
            if "support" not in c:
                print(f"| {s} | {trait} | {c['n']} | | {c['sources']} | | {c['form']} | {c['band']} | yes | |")
                continue
            cov = ", ".join(f"{x:.2f}" + ("*" if not COVERAGE_NOTE[0] <= x <= COVERAGE_NOTE[1] else "")
                            for x in c.get("coverage_terciles", []))
            print(f"| {s} | {trait} | {c['n']} | {c['taxa']} | {c['sources']} | {c['support'][0]:.1f}–"
                  f"{c['support'][1]:.1f} | {c['form']} | {c['band']} | {'yes' if c['small_n'] else ''} | {cov} |")
    print("\n| species | gated | T v2 | T v2 (first 20) | T, v1's statistic on v2's trees | T v1 (registered) | "
          "control trees | self-consistency |")
    print("|---|---|---|---|---|---|---|---|")
    for s, e in t["species"].items():
        k = e["control"]
        t1 = v1.get(s, {}).get("control", {}).get("T")
        t1s = "—" if t1 is None else f"{t1:.2f}"
        if k is None:
            print(f"| {s} | no ({e['not_gated_reason']}) | — | — | — | {t1s} | — | — |")
            continue
        sc = k["self_consistency"]
        own = f" (own {k['T_own']:.2f})" if k["T_kind"] != "own" else ""
        print(f"| {s}{' (borrowed T)' if k['T_kind'] != 'own' else ''} | {'yes' if e['gated'] else 'no'} | "
              f"{k['T']:.2f}{own} | {k['T_first20']:.2f} | {k['T_v1_statistic']:.2f} | {t1s} | {k['trees']} | "
              f"{sc['pass']}/{sc['of']}{'' if sc['ok'] else ' BELOW'} |")
