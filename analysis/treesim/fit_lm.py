"""Fit a species' patch to literature traits by least squares (species plan of 2026-10-30, §2).

The loss of `fit.py` is a weighted sum of squares over 13–15 named traits, and in 3D a tree-run
costs 20–33× what it did in 2D, so the search uses every residual rather than folding them into one
number a candidate: Levenberg–Marquardt in the unit cube of `fit.py`'s encoding, from a near start
(the round-2 fit as adopted), with

- **residuals** r_i = √w_i·(s_i − t_i)/b_i for every trait in the targets file, the dead trees
  (lone: √25·(1 − alive); stand: √125·max(0, 0.8 − alive), `fit.py`'s penalties), and a Tikhonov
  term λ(θ − θ₀) so the solver prefers the smallest move from the start;
- **seeds fixed** for the whole fit (common random numbers): 3 for the lone tree and the shade
  house, 2 for the stand, whose six interior trees average its noise; fresh ones to verify;
- **a screening Jacobian** first: central differences on every parameter at the start, step 0.08
  (a secant over the distance to be moved: shedding and death are discrete), one seed, the stand to
  60. It names the active set, the parameters the iterations move;
- **iterations**: a forward-difference Jacobian on the active set at the fixed seeds, evaluated in
  parallel (each (point, trial, seed) a request of the pool), then a damped Gauss–Newton step,
  accepted only if the loss drops, halved otherwise. The stand runs to 60 until the step is small,
  then to 100 for the last two iterations (`stand.lateShare` needs 100, and it catches a runaway);
- **tip radius by its own rule** (§2.1): r0 is not a Jacobian column. m_w follows it so that
  m_w·r0² keeps its value at the start, 64·r0_start² (ADR 0027's m_w 64 with the species' own r0),
  and R1's sapwood cost does not move; each iteration r0 takes the closed-form update that puts the
  measured slenderness (∝ 1/r0 at a given shape) on its targets. The plan wrote m_w = 64·(0.0025/r0)²,
  the world's product: at a species' start (beech's r0 0.0031) that would cut its sapwood cost by a
  third before the fit moved anything.

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
#: Seconds a trial costs a seed, roughly (beech, the plan's §1): the dearest are sent first.
COST = {"stand": 3, "lone": 2, "shade": 1}


@dataclass
class LMSettings:
    seeds: dict = field(default_factory=lambda: {"lone": [1, 2, 3], "stand": [1, 2], "shade": [1, 2, 3]})
    verify_seeds: list = field(default_factory=lambda: [1001, 1002, 1003, 1004, 1005, 1006])
    screen_step: float = 0.08
    step: float = 0.08
    tikhonov: float = 0.1
    iterations: int = 10
    #: Iterations at the end with the stand run to 100.
    late_iterations: int = 2
    #: A step this small (∞-norm, unit cube) at the stand to 60 moves on to 100.
    small_step: float = 0.03
    #: The largest step (∞-norm, unit cube): the residuals are only nearly smooth.
    max_step: float = 0.25
    #: More consecutive rejected steps than this stops the fit (the plan's stop rule).
    max_rejections: int = 3
    #: A parameter is active if its screening column's norm, or its pull on the loss |Jᵀr|, is at
    #: least this share of the largest.
    active_share: float = 0.2
    #: r0's closed-form update is limited to this factor an iteration.
    r0_factor: float = 1.6
    workers: int = 12


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

    def traits(self, points: list[tuple[np.ndarray, float]], stand: int, seeds: dict | None = None) -> list[dict]:
        """Seed-mean traits of each point, every (point, trial, seed) a request of the pool."""
        seeds = seeds or self.settings.seeds
        trials = ["lone", "stand"] + (["shade"] if self.shade else [])
        requests = []
        for i, (x, r0) in enumerate(points):
            a = self.assign(x, r0)
            for t in trials:
                for s in seeds[t]:
                    requests.append((COST[t], i, t, {"species": self.spec.species, "assign": a,
                                                     "seeds": {t: [s]}, "trials": [t], "standSeasons": stand}))
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
            if stand < 100:
                merged.pop("stand.lateShare", None)
            out.append(merged)
        return out

    def names(self, stand: int) -> list[str]:
        traits = [t["name"] for t in self.spec.traits if stand >= 100 or t["name"] != "stand.lateShare"]
        return traits + ["dead.lone", "dead.stand"] + [f"tikhonov:{p}" for p in self.paths]

    def residuals(self, traits: dict, x: np.ndarray, stand: int) -> np.ndarray:
        r = []
        for t in self.spec.traits:
            if stand < 100 and t["name"] == "stand.lateShare":
                continue
            v = traits.get(t["name"])
            r.append(math.sqrt(t["weight"] * MISSING_PENALTY) if v is None
                     else math.sqrt(t["weight"]) * (v - t["target"]) / t["band"])
        lone, standing = traits.get("lone.alive"), traits.get("stand.alive")
        r.append(math.sqrt(DEATH_PENALTY) * (1 - lone) if lone is not None else 0.0)
        r.append(math.sqrt(5 * DEATH_PENALTY) * max(0.0, 0.8 - standing) if standing is not None else 0.0)
        r.extend(self.settings.tikhonov * (x - self.x0))
        return np.array(r)

    def trait_loss(self, traits: dict, stand: int) -> float:
        """`fit.py`'s loss over the traits measured (without stand.lateShare at the stand to 60)."""
        spec = Spec(self.spec.species, [t for t in self.spec.traits if stand >= 100 or t["name"] != "stand.lateShare"],
                    [])
        return loss(spec, traits)

    def r0_update(self, traits: dict, r0: float) -> float:
        """The r0 that puts slenderness on its targets: S ∝ 1/r0 at a given shape (the pipe radius is
        r0·√tips plus 10–30% stress wood), so with u = r0/r0' the weighted least squares over the
        slenderness traits Σ w(S·u − t)²/b² is solved by u = Σ w·S·t/b² / Σ w·S²/b²."""
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


def screen(prob: Problem, x: np.ndarray, r0: float, log) -> dict:
    """Central differences on every free parameter, one seed, the stand to 60 (§2, screening); and
    the centre at a second seed, so a column can be read against the seed noise."""
    s = prob.settings
    one = {"lone": [1], "stand": [1], "shade": [1]}
    two = {"lone": [2], "stand": [2], "shade": [2]}
    n = len(prob.paths)
    points, steps = [(x, r0)], []
    for j in range(n):
        up, down = x.copy(), x.copy()
        up[j] = min(1.0, x[j] + s.screen_step)
        down[j] = max(0.0, x[j] - s.screen_step)
        points += [(up, r0), (down, r0)]
        steps.append(up[j] - down[j])
    t0 = time.time()
    traits = prob.traits(points, 60, one)
    other = prob.traits([(x, r0)], 60, two)[0]
    names = prob.names(60)
    centre = prob.residuals(traits[0], x, 60)
    jac = np.zeros((len(names), n))
    for j in range(n):
        jac[:, j] = (prob.residuals(traits[1 + 2 * j], x, 60) - prob.residuals(traits[2 + 2 * j], x, 60)) / steps[j]
    # The Tikhonov rows are known exactly.
    k = len(names) - n
    jac[k:, :] = s.tikhonov * np.eye(n)
    noise = np.abs(prob.residuals(other, x, 60) - centre)[:k]
    norm = np.linalg.norm(jac[:k], axis=0)
    pull = np.abs(jac[:k].T @ centre[:k])
    active = [j for j in range(n) if norm[j] >= s.active_share * norm.max() or pull[j] >= s.active_share * pull.max()]
    log(f"screening: {len(points) + 1} evaluations in {time.time() - t0:.0f} s; "
        f"active: {', '.join(prob.paths[j] for j in active)}")
    return {
        "names": names[:k],
        "paths": prob.paths,
        "centre": centre[:k].tolist(),
        "noise": noise.tolist(),
        "jacobian": jac[:k].tolist(),
        "norm": norm.tolist(),
        "pull": pull.tolist(),
        "active": [prob.paths[j] for j in active],
        "seconds": round(time.time() - t0),
        "traits": traits[0],
    }


def solve_step(jac: np.ndarray, r: np.ndarray, mu: float, max_step: float) -> np.ndarray:
    """The damped Gauss–Newton step: (JᵀJ + μ·diag(JᵀJ)) δ = −Jᵀr (Marquardt's scaling; the
    Tikhonov rows in J keep it regular), cut to `max_step` in the ∞-norm."""
    jtj = jac.T @ jac
    delta = -np.linalg.solve(jtj + mu * np.diag(np.diag(jtj)), jac.T @ r)
    big = np.abs(delta).max()
    return delta * (max_step / big) if big > max_step else delta


def fit_lm(spec: Spec, settings: LMSettings, start: dict, log=print, active: list[str] | None = None) -> dict:
    """Fits `spec` from `start` (the assignments of the point to start from, r0 included)."""
    s = settings
    pool = Pool(s.workers)
    t_start = time.time()
    rows: list[dict] = []
    try:
        r0_param = next(p for p in spec.params if p["path"] == "c6.r0")
        free = Spec(spec.species, spec.traits, [p for p in spec.params if p["path"] != "c6.r0"])
        x0 = encode(free, start)
        r0 = float(start["c6.r0"])
        prob = Problem(spec, pool, s, x0, (r0_param["lo"], r0_param["hi"]), r0)
        screening = screen(prob, x0, r0, log)
        act = [prob.paths.index(p) for p in (active or screening["active"])]

        x, stand = x0.copy(), 60
        traits = prob.traits([(x, r0)], stand)[0]
        res = prob.residuals(traits, x, stand)
        current = float(res @ res)
        mu, rejections, stop = 1e-2, 0, None
        iteration, late_done = 0, 0
        log(f"start: loss {current:.2f} (traits {prob.trait_loss(traits, stand):.2f}), r0 {r0:.4g}")
        rows.append({"iteration": 0, "stand": stand, "loss": current, "traitLoss": prob.trait_loss(traits, stand),
                     "accepted": True, "mu": mu, "step": 0.0, "r0": r0, "seconds": round(time.time() - t_start),
                     "evaluations": prob.evaluations})
        while iteration < s.iterations:
            iteration += 1
            t_it = time.time()
            # The Jacobian on the active set, forward differences at the fixed seeds.
            points = []
            for j in act:
                p = x.copy()
                p[j] = x[j] + s.step if x[j] + s.step <= 1 else x[j] - s.step
                points.append((p, r0))
            perturbed = prob.traits(points, stand)
            k = len(prob.names(stand)) - len(prob.paths)
            jac = np.zeros((len(res), len(act)))
            for c, (j, tr) in enumerate(zip(act, perturbed)):
                jac[:, c] = (prob.residuals(tr, x, stand) - res) / (points[c][0][j] - x[j])
                jac[k:, c] = 0.0
                jac[k + j, c] = s.tikhonov
            # r0 by its own rule; the step is solved against the slenderness it will read.
            r0_new = prob.r0_update(traits, r0)
            res_r0 = prob.residuals(prob.scaled_slenderness(traits, r0_new / r0), x, stand)
            delta = solve_step(jac, res_r0, mu, s.max_step)
            accepted, scale = False, 1.0
            while True:
                trial = x.copy()
                trial[act] = np.clip(x[act] + scale * delta, 0, 1)
                r0_trial = r0 * (r0_new / r0) ** scale
                t_traits = prob.traits([(trial, r0_trial)], stand)[0]
                t_res = prob.residuals(t_traits, trial, stand)
                t_loss = float(t_res @ t_res)
                step = float(np.abs(trial - x).max())
                if t_loss < current:
                    accepted = True
                    x, r0, traits, res, current = trial, r0_trial, t_traits, t_res, t_loss
                    mu, rejections = mu / 3, 0
                else:
                    rejections += 1
                    mu *= 2
                rows.append({"iteration": iteration, "stand": stand, "loss": t_loss,
                             "traitLoss": prob.trait_loss(t_traits, stand), "accepted": accepted, "mu": mu,
                             "step": step, "r0": r0_trial, "seconds": round(time.time() - t_start),
                             "evaluations": prob.evaluations})
                log(f"iteration {iteration} (stand {stand}): {'accepted' if accepted else 'rejected'} loss "
                    f"{t_loss:.2f} (current {current:.2f}), step {step:.3f}, r0 {r0_trial:.4g}, "
                    f"{time.time() - t_it:.0f} s")
                if accepted:
                    break
                if rejections > s.max_rejections:
                    stop = f"{rejections} consecutive rejected steps"
                    break
                scale /= 2
            if stop:
                break
            if stand == 100:
                late_done += 1
                if late_done >= s.late_iterations:
                    break
            elif step < s.small_step or iteration >= s.iterations - s.late_iterations:
                stand = 100
                traits = prob.traits([(x, r0)], stand)[0]
                res = prob.residuals(traits, x, stand)
                current = float(res @ res)
                log(f"the stand to 100 from here: loss {current:.2f}")
                rows.append({"iteration": iteration, "stand": stand, "loss": current,
                             "traitLoss": prob.trait_loss(traits, stand), "accepted": True, "mu": mu,
                             "step": 0.0, "r0": r0, "seconds": round(time.time() - t_start),
                             "evaluations": prob.evaluations})

        # Verification: the start and the fit on fresh seeds, at full fidelity.
        fresh = {"lone": s.verify_seeds, "stand": s.verify_seeds, "shade": s.verify_seeds}
        x_start = x0
        start_v, fit_v = prob.traits([(x_start, float(start["c6.r0"])), (x, r0)], 100, fresh)
        assign = prob.assign(x, r0)
        patch = pool.ask({"amend": spec.species, "assign": assign})["patch"]
        return {
            "species": spec.species,
            "method": "lm",
            "settings": s.__dict__,
            "seconds": round(time.time() - t_start),
            "evaluations": prob.evaluations,
            "stopped": stop,
            "start": {"assign": prob.assign(x_start, float(start["c6.r0"])), "loss": loss(spec, start_v),
                      "traits": start_v},
            "fit": {"assign": assign, "loss": loss(spec, fit_v), "traits": fit_v, "patch": patch,
                    "lmLoss": current},
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
        row = {"trait": t["name"], "target": t["target"], "band": t["band"], "weight": t["weight"]}
        for k, traits in (("start", start), ("fit", fit)):
            v = traits.get(t["name"])
            row[k] = v
            row[f"{k}Margin"] = None if v is None else t["band"] - abs(v - t["target"])
        out.append(row)
    return out


def write_lm(result: dict, out_dir) -> None:
    """The results file (`fit.py`'s shape, with the screening), the per-iteration losses and the
    screening Jacobian as CSVs beside it."""
    import polars as pl

    out_dir.mkdir(parents=True, exist_ok=True)
    sp = result["species"]
    (out_dir / f"{sp}.json").write_text(json.dumps(result, indent=2, default=float) + "\n")
    pl.DataFrame(result["iterations"]).write_csv(out_dir / f"{sp}-lm.csv")
    sc = result["screening"]
    rows = [{"residual": n, "centre": c, "noise": z, **dict(zip(sc["paths"], row))}
            for n, c, z, row in zip(sc["names"], sc["centre"], sc["noise"], sc["jacobian"])]
    pl.DataFrame(rows).write_csv(out_dir / f"{sp}-jacobian.csv", float_precision=3)
