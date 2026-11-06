"""The gallery of rejected crowns and its check (species round 5, §3.3; ADR 0029).

`analysis/fit/gallery/<species>-<name>.json` holds a patch the panel rejected: its assignments
(every fitted and form parameter, as the fit wrote them), the verdict and the date. With shape out
of the loss, a fit can drift back toward a form the eye has already turned down; the gallery is the
regression set that catches it.

A point (the hand form, a fit, a gallery entry) is grown as the lone trial's tree to 100 on
SEEDS, and read on the reported shape observables at 60 and at 100 (SHAPE, and the ten-band profile).
Each observable is standardised by a fixed scale (its report's band where the targets file gives
one, else SCALES: the described targets' bands), and the distance between two points is the root
mean square of their standardised differences, the profile's ten bands weighing as one observable.

**Separated** means further apart than the seeds can explain: the distance exceeds twice the noise
of a difference of two SEEDS-means (√(sd_a²/n + sd_b²/n) per observable, by the same scales).
A fit is **flagged** when it is nearer some reject than it is to the hand form.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

from treesim.fit import Pool, Spec, mean_traits, seed_traits
from treesim.sweep import REPO

GALLERY = REPO / "analysis" / "fit" / "gallery"
SEEDS = [1001, 1002, 1003]
#: The reported scalar observables (cli/trials.ts LoneShape), each at 60 and 100.
SHAPE = ["spread", "widestAt", "crownFullness", "forkHeight", "leaderDominance", "branchAngle", "limbDroop",
         "limbElevation"]
#: Standardising scales where the targets file's report gives no band: the described targets' bands
#: (round 4), and 10° for the limbs' elevation as for their droop.
SCALES = {"spread": 0.2, "widestAt": 0.1, "crownFullness": 0.1, "forkHeight": 0.2, "leaderDominance": 0.8,
          "branchAngle": 10.0, "limbDroop": 10.0, "limbElevation": 10.0, "profile": 0.1}
BANDS = 10


def entries(species: str) -> list[dict]:
    """The species' gallery entries, by file name."""
    out = []
    for path in sorted(GALLERY.glob(f"{species}-*.json")):
        e = json.loads(path.read_text())
        e["name"] = path.stem.removeprefix(f"{species}-")
        out.append(e)
    return out


def hand_form(spec: Spec) -> dict:
    """The hand form's assignments: the targets file's [fixed] and [form], physiology as the species
    grows by now (round 2's, FLORA)."""
    return {**spec.fixed, **spec.form}


def scales(spec: Spec) -> dict[str, float]:
    out = dict(SCALES)
    for r in spec.reports:
        name = r["name"].removeprefix("lone.")
        if name in out and "band" in r:
            out[name] = float(r["band"])
    return out


def observables(traits: dict) -> dict[str, float | None]:
    """The shape observables of flat traits: `spread`, `spread100`, …, `profile.k`, `profile100.k`."""
    out: dict[str, float | None] = {}
    for suffix in ("", "100"):
        for n in SHAPE:
            out[n + suffix] = traits.get(f"lone.{n}{suffix}")
        for k in range(BANDS):
            out[f"profile{suffix}.{k}"] = traits.get(f"lone.profile{suffix}.{k}")
    return out


def _scale_and_weight(key: str, sc: dict[str, float]) -> tuple[float, float]:
    base = key.split(".")[0].removesuffix("100")
    return sc[base], (1 / BANDS if base == "profile" else 1.0)


def distance(a: dict, b: dict, sc: dict[str, float]) -> float:
    """RMS standardised difference over the observables both points have (profile bands weigh 1/10)."""
    num = den = 0.0
    for k, va in a.items():
        vb = b.get(k)
        if va is None or vb is None or not (math.isfinite(va) and math.isfinite(vb)):
            continue
        s, w = _scale_and_weight(k, sc)
        num += w * ((va - vb) / s) ** 2
        den += w
    return math.sqrt(num / den) if den else math.nan


def noise(sd_a: dict, sd_b: dict, n: int, sc: dict[str, float]) -> float:
    """The RMS standardised noise of a difference of two n-seed means, from each point's seed sd."""
    num = den = 0.0
    for k, x in sd_a.items():
        y = sd_b.get(k)
        if x is None or y is None:
            continue
        s, w = _scale_and_weight(k, sc)
        num += w * (x * x + y * y) / n / s ** 2
        den += w
    return math.sqrt(num / den) if den else math.nan


def evaluate(pool: Pool, species: str, points: dict[str, dict], seeds: list[int] = SEEDS) -> dict[str, dict]:
    """Each named point's observables on the lone tree to 100: {"mean", "sd", "traits"}."""
    names = list(points)
    requests = [{"species": species, "assign": points[n], "seeds": [s], "trials": ["lone100"]}
                for n in names for s in seeds]
    replies = pool.map(requests)
    out = {}
    for i, n in enumerate(names):
        per_seed = [seed_traits(r) for r in replies[i * len(seeds):(i + 1) * len(seeds)]]
        obs = [observables(t) for t in per_seed]
        mean = observables(mean_traits(per_seed))
        sd = {}
        for k in mean:
            xs = [o[k] for o in obs if o[k] is not None and math.isfinite(o[k])]
            sd[k] = float(np.std(xs, ddof=1)) if len(xs) > 1 else None
        out[n] = {"mean": mean, "sd": sd, "traits": mean_traits(per_seed)}
    return out


def nearest(point: dict, gallery: dict[str, dict], sc: dict[str, float]) -> tuple[str | None, float]:
    """The gallery entry nearest `point` (an evaluate() result), and its distance."""
    best, d = None, math.inf
    for name, g in gallery.items():
        dg = distance(point["mean"], g["mean"], sc)
        if dg < d:
            best, d = name, dg
    return best, d


def shape_flag(pool: Pool, spec: Spec, assigns: dict[str, dict], log=print) -> dict:
    """The driver's check (§3.3): each of `assigns` (e.g. {"lm": …, "fit": …}) against the hand form and
    the gallery. A point nearer a reject than the hand form is flagged."""
    rejects = {f"gallery:{e['name']}": e["assign"] for e in entries(spec.species)}
    if not rejects:
        log(f"gallery: no entries for {spec.species}")
        return {"entries": 0}
    res = evaluate(pool, spec.species, {"hand": hand_form(spec), **rejects, **assigns})
    sc = scales(spec)
    gallery = {k: v for k, v in res.items() if k.startswith("gallery:")}
    out: dict = {"entries": len(gallery), "seeds": SEEDS}
    for name in assigns:
        near, d = nearest(res[name], gallery, sc)
        dh = distance(res[name]["mean"], res["hand"]["mean"], sc)
        flag = d < dh
        out[name] = {"nearest": near.removeprefix("gallery:") if near else None, "distance": d, "hand": dh,
                     "flag": flag}
        log(f"gallery: {name} nearest {out[name]['nearest']} at {d:.2f}, the hand form at {dh:.2f}"
            + (" — FLAGGED: nearer a reject than the hand form" if flag else ""))
    out["flag"] = any(out[n]["flag"] for n in assigns)
    return out


def write_entry(species: str, name: str, assign: dict, verdict: str, date: str, source: str) -> Path:
    GALLERY.mkdir(parents=True, exist_ok=True)
    path = GALLERY / f"{species}-{name}.json"
    path.write_text(json.dumps({"species": species, "verdict": verdict, "date": date, "source": source,
                                "assign": assign}, indent=2) + "\n")
    return path
