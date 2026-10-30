"""Fit a species' patch to literature traits: least squares, then CMA-ES (species plan of 2026-10-30,
§2, as revised by the user after the first beech pilot).

The loss of `fit.py` is a weighted sum of squares over 13–15 named traits. The pipeline:

1. **Screening.** Central differences on every parameter at the start (round 2 as adopted), step
   0.08 in the unit cube (a secant: shedding and death are discrete), one seed. The centre is also
   run at four seeds, and a parameter is **active** if it moves some residual by more than that
   residual's seed noise (the standard deviation over the four), not by a share of the largest
   column (the first pilot's rule made fifteen of seventeen active).
2. **Least-squares descent.** Levenberg–Marquardt in the unit cube over the active set: residuals
   r_i = √w_i·(s_i − t_i)/b_i for every trait, the dead trees (`fit.py`'s penalties) and a Tikhonov
   term λ(θ − θ₀); seeds fixed (common random numbers: 3 lone, 2 stands, 3 shade houses); a
   forward-difference Jacobian in parallel; a damped Gauss–Newton step accepted only if the loss
   drops, halved otherwise. It ends when more than three steps in a row are rejected (the realisation
   noise has caught up with a step's gain) or after its iterations.
3. **CMA-ES finisher** (the plan's fallback) from the LM point over the active set and r0: initial
   covariance from (JᵀJ)⁻¹ at the LM point, population 10, 4 seeds drawn afresh each generation
   (common within it), 30 generations, stopping when the best has not improved by 1% for 15.
4. **Selection and verification.** The LM point and the CMA-ES run's best candidates are re-measured
   on 6 selection seeds; the one with the most measured targets in band (then the lowest loss) is
   verified on 6 fresh seeds. Acceptance is the measured targets inside their bands there; the loss is
   a progress indicator only.

**Tip radius** (§2.1) is not a Jacobian column in the descent: m_w follows it so that m_w·r0² keeps
its value at the start (ADR 0027's m_w 64 with the species' own r0), and each iteration r0 takes the
closed-form update that puts the measured slenderness (∝ 1/r0 at a given shape) on its targets. The
Jacobian carries an r0 column for the finisher's covariance only. In CMA-ES r0 is searched on its log
scale like the rest.

The stand is the closed one (`cli/trials.ts`: three rows of four between opaque faces), cheap enough
to run to season 100 throughout, so `stand.lateShare` is in every residual vector.

`scipy.optimize.least_squares` was the plan's driver; its trust region evaluates trial points one at
a time with its own acceptance rule, and r0's update between iterations has no place in it, so the
loop is written out here (the same algorithm: Marquardt-scaled damping in a box).
"""

from __future__ import annotations

import json
import math
import time
from dataclasses import dataclass, field

import numpy as np
from cmaes import CMA

from treesim.fit import (
    DEATH_PENALTY,
    MISSING_PENALTY,
    Pool,
    Spec,
    decode,
    encode,
    loss,
    mean_traits,
    seed_traits,
)

#: ADR 0027's m_w: with the species' r0 at the start, R1's sapwood cost m_w·π·r0²·path, held.
MW = 64.0
SLENDERNESS = ["lone.slenderness", "stand.slenderness"]
#: Rough cost of a trial a seed, so the dearest requests are sent first.
COST = {"stand": 3, "lone": 2, "shade": 1}
STAND = 100


@dataclass
class LMSettings:
    seeds: dict = field(default_factory=lambda: {"lone": [1, 2, 3], "stand": [1, 2], "shade": [1, 2, 3]})
    noise_seeds: list = field(default_factory=lambda: [1, 2, 3, 4])
    select_seeds: list = field(default_factory=lambda: [501, 502, 503, 504, 505, 506])
    verify_seeds: list = field(default_factory=lambda: [1001, 1002, 1003, 1004, 1005, 1006])
    screen_step: float = 0.08
    step: float = 0.08
    tikhonov: float = 0.1
    iterations: int = 10
    #: The largest step (∞-norm, unit cube): the residuals are only nearly smooth.
    max_step: float = 0.25
    #: More consecutive rejected steps than this ends the descent.
    max_rejections: int = 3
    #: A residual's seed noise is at least this (band units): below it a change is rounding.
    min_noise: float = 0.05
    #: r0's closed-form update is limited to this factor an iteration.
    r0_factor: float = 1.6
    # The CMA-ES finisher.
    popsize: int = 10
    cma_seeds: int = 4
    generations: int = 30
    patience: int = 15
    #: The largest initial standard deviation of any direction, unit cube.
    cma_sigma: float = 0.12
    finalists: int = 5
    workers: int = 12
    rng_seed: int = 2026


class Problem:
    """A species' residuals at a point: x (unit cube, the free parameters but r0) and r0."""

    def __init__(self, spec: Spec, pool: Pool, settings: LMSettings, x0: np.ndarray, r0_bounds: tuple[float, float],
                 r0_start: float):
        self.full = spec
        self.spec = Spec(spec.species, spec.traits, [p for p in spec.params if p["path"] != "c6.r0"],
                         spec.holdout, spec.fixed)
        self.pool = pool
        self.settings = settings
        self.x0 = x0
        self.r0_bounds = r0_bounds
        self.r0_start = r0_start
        self.shade = any(t["name"].startswith("shade.") for t in spec.traits)
        self.evaluations = 0

    @property
    def paths(self) -> list[str]:
        return self.spec.paths

    def assign(self, x: np.ndarray, r0: float) -> dict:
        r0 = float(f"{r0:.4g}")
        mw = MW * (self.r0_start / r0) ** 2
        return {**decode(self.spec, x), "c6.r0": r0, "r1.mw": float(f"{mw:.4g}")}

    def r0_unit(self, r0: float) -> float:
        lo, hi = self.r0_bounds
        return math.log(r0 / lo) / math.log(hi / lo)

    def r0_of(self, u: float) -> float:
        lo, hi = self.r0_bounds
        return lo * (hi / lo) ** min(1.0, max(0.0, u))

    def traits(self, points: list[tuple[np.ndarray, float]], seeds: dict | None = None) -> list[dict]:
        """Seed-mean traits of each point, every (point, trial, seed) a request of the pool."""
        seeds = seeds or self.settings.seeds
        trials = ["lone", "stand"] + (["shade"] if self.shade else [])
        requests = []
        for i, (x, r0) in enumerate(points):
            a = self.assign(x, r0)
            for t in trials:
                for s in seeds[t]:
                    requests.append((COST[t], i, t, {"species": self.spec.species, "assign": a,
                                                     "seeds": {t: [s]}, "trials": [t], "standSeasons": STAND}))
        order = sorted(range(len(requests)), key=lambda k: -requests[k][0])
        replies = self.pool.map([requests[k][3] for k in order])
        by: dict[tuple[int, str], list[dict]] = {}
        for k, reply in zip(order, replies):
            _, i, t, _ = requests[k]
            by.setdefault((i, t), []).append(seed_traits(reply))
        self.evaluations += len(points)
        out = []
        for i in range(len(points)):
            merged: dict = {}
            for t in trials:
                # Each trial's own traits only: a stand reply derives lone.earlyShare as None.
                merged.update({k: v for k, v in mean_traits(by[(i, t)]).items() if v is not None or k not in merged})
            out.append(merged)
        return out

    def names(self) -> list[str]:
        return [t["name"] for t in self.spec.traits] + ["dead.lone", "dead.stand"] + \
            [f"tikhonov:{p}" for p in self.paths]

    @property
    def n_traits(self) -> int:
        return len(self.spec.traits) + 2

    def residuals(self, traits: dict, x: np.ndarray) -> np.ndarray:
        r = []
        for t in self.spec.traits:
            v = traits.get(t["name"])
            r.append(math.sqrt(t["weight"] * MISSING_PENALTY) if v is None
                     else math.sqrt(t["weight"]) * (v - t["target"]) / t["band"])
        lone, standing = traits.get("lone.alive"), traits.get("stand.alive")
        r.append(math.sqrt(DEATH_PENALTY) * (1 - lone) if lone is not None else 0.0)
        r.append(math.sqrt(5 * DEATH_PENALTY) * max(0.0, 0.8 - standing) if standing is not None else 0.0)
        r.extend(self.settings.tikhonov * (x - self.x0))
        return np.array(r)

    def objective(self, traits: dict, x: np.ndarray) -> float:
        r = self.residuals(traits, x)
        return float(r @ r)

    def r0_update(self, traits: dict, r0: float) -> float:
        """The r0 that puts slenderness on its targets: S ∝ 1/r0 at a given shape, so with
        u = r0/r0' the weighted least squares Σ w(S·u − t)²/b² over the slenderness traits is solved
        by u = Σ w·S·t/b² / Σ w·S²/b²."""
        num = den = 0.0
        for t in self.spec.traits:
            if t["name"] in SLENDERNESS and traits.get(t["name"]) is not None:
                s, w = traits[t["name"]], t["weight"] / t["band"] ** 2
                num += w * s * t["target"]
                den += w * s * s
        if den == 0:
            return r0
        k = min(self.settings.r0_factor, max(1 / self.settings.r0_factor, den / num))
        return min(self.r0_bounds[1], max(self.r0_bounds[0], r0 * k))

    def scaled_slenderness(self, traits: dict, k: float) -> dict:
        """Traits with slenderness as it will read once r0 is k times larger."""
        return {**traits, **{n: traits[n] / k for n in SLENDERNESS if traits.get(n) is not None}}


def in_band(spec: Spec, traits: dict, kind: str = "measured") -> tuple[int, int, list[str]]:
    """(inside, of, the names outside) over the targets of `kind`."""
    outside, n = [], 0
    for t in spec.traits:
        if t["kind"] != kind:
            continue
        n += 1
        v = traits.get(t["name"])
        if v is None or abs(v - t["target"]) > t["band"]:
            outside.append(t["name"])
    return n - len(outside), n, outside


def screen(prob: Problem, x: np.ndarray, r0: float, log) -> dict:
    """Central differences on every free parameter, one seed; the centre at four seeds for each
    residual's seed noise. Active: a parameter whose central difference moves some residual by more
    than that residual's noise."""
    s = prob.settings
    one = {"lone": [1], "stand": [1], "shade": [1]}
    n = len(prob.paths)
    points, steps = [], []
    for j in range(n):
        up, down = x.copy(), x.copy()
        up[j] = min(1.0, x[j] + s.screen_step)
        down[j] = max(0.0, x[j] - s.screen_step)
        points += [(up, r0), (down, r0)]
        steps.append(up[j] - down[j])
    t0 = time.time()
    traits = prob.traits(points, one)
    centres = [prob.traits([(x, r0)], {"lone": [k], "stand": [k], "shade": [k]})[0] for k in s.noise_seeds]
    names = prob.names()
    k = prob.n_traits
    per_seed = np.array([prob.residuals(c, x)[:k] for c in centres])
    noise = np.maximum(per_seed.std(axis=0, ddof=1), s.min_noise)
    moved = np.zeros((k, n))
    for j in range(n):
        moved[:, j] = prob.residuals(traits[2 * j], x)[:k] - prob.residuals(traits[2 * j + 1], x)[:k]
    jac = moved / np.array(steps)
    active = [j for j in range(n) if np.any(np.abs(moved[:, j]) > noise)]
    log(f"screening: {len(points) + len(centres)} evaluations in {time.time() - t0:.0f} s; "
        f"active ({len(active)}): {', '.join(prob.paths[j] for j in active)}")
    return {
        "names": names[:k],
        "paths": prob.paths,
        "centre": per_seed[0].tolist(),
        "noise": noise.tolist(),
        "moved": moved.tolist(),
        "jacobian": jac.tolist(),
        "active": [prob.paths[j] for j in active],
        "seconds": round(time.time() - t0),
        "traits": centres[0],
    }


def solve_step(jac: np.ndarray, r: np.ndarray, mu: float, max_step: float) -> np.ndarray:
    """The damped Gauss–Newton step: (JᵀJ + μ·diag(JᵀJ)) δ = −Jᵀr (Marquardt's scaling; the
    Tikhonov rows in J keep it regular), cut to `max_step` in the ∞-norm."""
    jtj = jac.T @ jac
    delta = -np.linalg.solve(jtj + mu * np.diag(np.diag(jtj)), jac.T @ r)
    big = np.abs(delta).max()
    return delta * (max_step / big) if big > max_step else delta


def descend(prob: Problem, x0: np.ndarray, r0: float, act: list[int], rows: list[dict], t_start: float, log):
    """LM over the active set from (x0, r0). Returns the point, its traits, and the last Jacobian
    over the active set and r0 (trait rows and the Tikhonov rows), for the finisher's covariance."""
    s = prob.settings
    x = x0.copy()
    traits = prob.traits([(x, r0)])[0]
    res = prob.residuals(traits, x)
    current = float(res @ res)
    mu, rejections, iteration = 1e-2, 0, 0
    jac_full = None
    log(f"LM start: loss {current:.2f}, r0 {r0:.4g}")
    rows.append({"stage": "lm", "iteration": 0, "loss": current, "accepted": True, "step": 0.0, "r0": r0,
                 "inBand": in_band(prob.full, traits)[0], "seconds": round(time.time() - t_start),
                 "evaluations": prob.evaluations})
    k = prob.n_traits
    while iteration < s.iterations:
        iteration += 1
        t_it = time.time()
        # The Jacobian on the active set, forward differences at the fixed seeds; r0's column (in its
        # log unit) for the finisher only.
        points = []
        for j in act:
            p = x.copy()
            p[j] = x[j] + s.step if x[j] + s.step <= 1 else x[j] - s.step
            points.append((p, r0))
        u = prob.r0_unit(r0)
        du = s.step if u + s.step <= 1 else -s.step
        points.append((x, prob.r0_of(u + du)))
        perturbed = prob.traits(points)
        jac = np.zeros((len(res), len(act)))
        for c, (j, tr) in enumerate(zip(act, perturbed[:-1])):
            jac[:, c] = (prob.residuals(tr, x) - res) / (points[c][0][j] - x[j])
            jac[k:, c] = 0.0
            jac[k + j, c] = s.tikhonov
        r0_col = (prob.residuals(perturbed[-1], x) - res)[:k] / du
        jac_full = np.vstack([np.column_stack([jac[:k], r0_col]),
                              np.column_stack([jac[k:][act], np.zeros(len(act))])])
        # r0 by its own rule; the step is solved against the slenderness it will read.
        r0_new = prob.r0_update(traits, r0)
        res_r0 = prob.residuals(prob.scaled_slenderness(traits, r0_new / r0), x)
        delta = solve_step(jac, res_r0, mu, s.max_step)
        accepted, scale, stop = False, 1.0, False
        while True:
            trial = x.copy()
            trial[act] = np.clip(x[act] + scale * delta, 0, 1)
            r0_trial = r0 * (r0_new / r0) ** scale
            t_traits = prob.traits([(trial, r0_trial)])[0]
            t_loss = prob.objective(t_traits, trial)
            step = float(np.abs(trial - x).max())
            if t_loss < current:
                accepted = True
                x, r0, traits, current = trial, r0_trial, t_traits, t_loss
                res = prob.residuals(traits, x)
                mu, rejections = mu / 3, 0
            else:
                rejections += 1
                mu *= 2
            inside = in_band(prob.full, t_traits)[0]
            rows.append({"stage": "lm", "iteration": iteration, "loss": t_loss, "accepted": accepted, "step": step,
                         "r0": r0_trial, "inBand": inside, "seconds": round(time.time() - t_start),
                         "evaluations": prob.evaluations})
            log(f"LM {iteration}: {'accepted' if accepted else 'rejected'} loss {t_loss:.2f} "
                f"(current {current:.2f}), step {step:.3f}, r0 {r0_trial:.4g}, measured in band {inside}, "
                f"{time.time() - t_it:.0f} s")
            if accepted:
                break
            if rejections > s.max_rejections:
                stop = True
                break
            scale /= 2
        if stop:
            log(f"LM ends: {rejections} consecutive rejected steps")
            break
    return x, r0, traits, current, jac_full


def finish(prob: Problem, x: np.ndarray, r0: float, act: list[int], jac: np.ndarray, rows: list[dict],
           t_start: float, log) -> tuple[list[tuple[np.ndarray, float, float]], str | None]:
    """CMA-ES over the active set and r0's log unit from the LM point. Returns every generation's
    best (x, r0, loss), best first, and the stop rule's message if it applied."""
    s = prob.settings
    rng = np.random.default_rng(s.rng_seed)
    m = len(act) + 1
    jtj = jac.T @ jac + 1e-6 * np.eye(m)
    cov = np.linalg.inv(jtj)
    sd = np.sqrt(np.diag(cov))
    scale = sd.max()
    sigma = min(s.cma_sigma, scale)
    mean = np.append(x[act], prob.r0_unit(r0))
    cma = CMA(mean=mean, sigma=sigma, bounds=np.array([[0.0, 1.0]] * m), cov=cov / scale ** 2,
              population_size=s.popsize, seed=int(rng.integers(1 << 30)))
    log(f"CMA-ES: σ {sigma:.3f}; initial sd by (JᵀJ)⁻¹ (unit cube) "
        + ", ".join(f"{p} {sigma * v / scale:.3f}" for p, v in zip([prob.paths[j] for j in act] + ["c6.r0"], sd)))
    bests: list[tuple[np.ndarray, float, float]] = []
    best, since, stop = math.inf, 0, None
    for g in range(s.generations):
        t_g = time.time()
        seeds = [int(v) for v in rng.choice(np.arange(2000, 100_000), s.cma_seeds, replace=False)]
        zs = [cma.ask() for _ in range(cma.population_size)]
        points = []
        for z in zs:
            p = x.copy()
            p[act] = z[:-1]
            points.append((p, prob.r0_of(z[-1])))
        traits = prob.traits(points, {"lone": seeds, "stand": seeds, "shade": seeds})
        losses = [prob.objective(t, p) for t, (p, _) in zip(traits, points)]
        cma.tell(list(zip(zs, losses)))
        k = int(np.argmin(losses))
        bests.append((points[k][0], points[k][1], losses[k]))
        inside, n, outside = in_band(prob.full, traits[k])
        if losses[k] < best * 0.99:
            best, since = losses[k], 0
        else:
            best, since = min(best, losses[k]), since + 1
        rows.append({"stage": "cma", "iteration": g, "loss": losses[k], "median": float(np.median(losses)),
                     "accepted": True, "step": 0.0, "r0": points[k][1], "inBand": inside,
                     "seconds": round(time.time() - t_start), "evaluations": prob.evaluations})
        log(f"CMA {g}: best {losses[k]:.2f}, median {np.median(losses):.2f}, run best {best:.2f}, "
            f"measured in band {inside}/{n}, {time.time() - t_g:.0f} s")
        if since >= s.patience:
            if outside:
                stop = f"CMA-ES's best not improved for {s.patience} generations; measured outside: {', '.join(outside)}"
            break
    bests.sort(key=lambda b: b[2])
    return bests, stop


def fit_lm(spec: Spec, settings: LMSettings, start: dict, log=print, active: list[str] | None = None) -> dict:
    """Fits `spec` from `start` (the assignments of the point to start from, r0 included)."""
    s = settings
    pool = Pool(s.workers)
    t_start = time.time()
    rows: list[dict] = []
    stages: dict[str, float] = {}
    try:
        r0_param = next(p for p in spec.params if p["path"] == "c6.r0")
        free = Spec(spec.species, spec.traits, [p for p in spec.params if p["path"] != "c6.r0"])
        x0 = encode(free, start)
        r0_start = float(start["c6.r0"])
        prob = Problem(spec, pool, s, x0, (r0_param["lo"], r0_param["hi"]), r0_start)
        screening = screen(prob, x0, r0_start, log)
        stages["screening"] = time.time() - t_start
        act = [prob.paths.index(p) for p in (active or screening["active"])]

        t = time.time()
        x_lm, r0_lm, lm_traits, lm_loss, jac = descend(prob, x0, r0_start, act, rows, t_start, log)
        stages["lm"] = time.time() - t
        t = time.time()
        bests, stop = finish(prob, x_lm, r0_lm, act, jac, rows, t_start, log)
        stages["cma"] = time.time() - t

        # Selection on seeds of its own, then verification on fresh ones.
        t = time.time()
        sel = {"lone": s.select_seeds, "stand": s.select_seeds, "shade": s.select_seeds}
        candidates = [(x_lm, r0_lm)] + [(b[0], b[1]) for b in bests[: s.finalists]]
        sel_traits = prob.traits(candidates, sel)
        ranked = sorted(range(len(candidates)),
                        key=lambda i: (-in_band(spec, sel_traits[i])[0], prob.objective(sel_traits[i], candidates[i][0])))
        win = ranked[0]
        x, r0 = candidates[win]
        selection = [{"candidate": "lm" if i == 0 else f"cma {i}", "inBand": in_band(spec, sel_traits[i])[0],
                      "loss": prob.objective(sel_traits[i], candidates[i][0])} for i in range(len(candidates))]
        log("selection: " + "; ".join(f"{c['candidate']} {c['inBand']} in band, loss {c['loss']:.2f}" for c in selection))
        fresh = {"lone": s.verify_seeds, "stand": s.verify_seeds, "shade": s.verify_seeds}
        start_v, fit_v = prob.traits([(x0, r0_start), (x, r0)], fresh)
        stages["verification"] = time.time() - t
        assign = prob.assign(x, r0)
        patch = pool.ask({"amend": spec.species, "assign": assign})["patch"]
        inside, n, outside = in_band(spec, fit_v)
        return {
            "species": spec.species,
            "method": "lm+cmaes",
            "settings": s.__dict__,
            "seconds": round(time.time() - t_start),
            "stageSeconds": {k: round(v) for k, v in stages.items()},
            "evaluations": prob.evaluations,
            "stopped": stop,
            "accepted": not outside,
            "measuredInBand": f"{inside} of {n}",
            "measuredOutside": outside,
            "start": {"assign": prob.assign(x0, r0_start), "loss": loss(spec, start_v), "traits": start_v},
            "lm": {"assign": prob.assign(x_lm, r0_lm), "loss": lm_loss},
            "fit": {"assign": assign, "loss": loss(spec, fit_v), "traits": fit_v, "patch": patch,
                    "from": selection[win]["candidate"]},
            "selection": selection,
            "margins": margins(spec, start_v, fit_v),
            "screening": screening,
            "activeSet": [prob.paths[j] for j in act],
            "iterations": rows,
        }
    finally:
        pool.close()


def margins(spec: Spec, start: dict, fit: dict) -> list[dict]:
    """Each trait's distance to its band's edge (positive inside the band), start and fit."""
    out = []
    for t in spec.traits:
        row = {"trait": t["name"], "kind": t["kind"], "target": t["target"], "band": t["band"], "weight": t["weight"]}
        for k, traits in (("start", start), ("fit", fit)):
            v = traits.get(t["name"])
            row[k] = v
            row[f"{k}Margin"] = None if v is None else t["band"] - abs(v - t["target"])
        out.append(row)
    return out


def write_lm(result: dict, out_dir) -> None:
    """The results file (`fit.py`'s shape, with the screening), the loss per iteration and
    generation, and the screening's moves against the seed noise, as CSVs beside it."""
    import polars as pl

    out_dir.mkdir(parents=True, exist_ok=True)
    sp = result["species"]
    (out_dir / f"{sp}.json").write_text(json.dumps(result, indent=2, default=float) + "\n")
    pl.DataFrame(result["iterations"], infer_schema_length=None).write_csv(out_dir / f"{sp}-lm.csv")
    sc = result["screening"]
    rows = [{"residual": n, "centre": c, "noise": z, **dict(zip(sc["paths"], row))}
            for n, c, z, row in zip(sc["names"], sc["centre"], sc["noise"], sc["moved"])]
    pl.DataFrame(rows).write_csv(out_dir / f"{sp}-jacobian.csv", float_precision=3)
