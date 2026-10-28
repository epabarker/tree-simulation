"""Fit a species' patch to literature traits by CMA-ES (M27, ADR 0020).

A candidate is a set of dotted-path assignments to the species' patch (src/core/trials.ts), plus the
targets file's fixed assignments (the hyperbolic hydraulic discount, ADR 0021). Each is grown in the
standard trials by a pool of long-lived evaluators (`node cli/fit-eval.ts`, one per worker), and
scored against the targets in analysis/fit/targets/<species>.toml:

    loss = Σ weight · ((seed-mean trait − target) / band)²  + penalties for dead trees

The search runs in [0, 1]^n (log scale where a parameter asks for it). Every candidate of a
generation sees the same seeds (common random numbers), drawn afresh each generation so no fit
learns one seed's quirks. Restarts: some from today's values, some from random points. At the end
the best candidates are re-measured on fixed seeds, beside the hand-tuned patch.
"""

from __future__ import annotations

import json
import math
import queue
import subprocess
import time
import tomllib
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from cmaes import CMA

from treesim.sweep import REPO

TARGETS = REPO / "analysis" / "fit" / "targets"
TRIALS = ["lone", "stand"]
#: Light a seedling that dies under every roof of the shade house is taken to need: above the
#: lightest roof (≈ 61%), so the loss still ranks how far a candidate is from surviving.
NO_SURVIVAL_LIGHT = 0.7
#: Loss added for each lone tree that dies, and for each fifth of a stand's interior lost.
DEATH_PENALTY = 25.0
#: Loss for a trait that could not be measured (a tree with no limbs to measure, say).
MISSING_PENALTY = 4.0


@dataclass
class Spec:
    species: str
    traits: list[dict]
    params: list[dict]
    holdout: dict = field(default_factory=dict)
    #: Assignments every candidate carries unchanged, e.g. {"r1.hydraulic": "hyperbolic"} (ADR 0021).
    fixed: dict = field(default_factory=dict)

    @property
    def paths(self) -> list[str]:
        return [p["path"] for p in self.params]

    @property
    def trials(self) -> list[str]:
        """The trials its traits need: the stand runs on to season 100 for stand.lateShare, and the
        shade house runs only for shade.survivalLight (each costs time)."""
        names = {t["name"] for t in self.traits}
        trials = ["lone", "stand100" if "stand.lateShare" in names else "stand"]
        if any(n.startswith("shade.") for n in names):
            trials.append("shade")
        return trials


def load_spec(species: str) -> Spec:
    data = tomllib.loads((TARGETS / f"{species}.toml").read_text())
    return Spec(data["species"], data["trait"], data["param"], data.get("holdout", {}), data.get("fixed", {}))


class Evaluator:
    """One `node cli/fit-eval.ts` process: a JSON line out, a JSON line back."""

    def __init__(self) -> None:
        self.proc = subprocess.Popen(
            ["node", "cli/fit-eval.ts"],
            cwd=REPO,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self.next_id = 0

    def ask(self, request: dict) -> dict:
        self.next_id += 1
        assert self.proc.stdin and self.proc.stdout
        self.proc.stdin.write(json.dumps({**request, "id": self.next_id}) + "\n")
        self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        if not line:
            raise RuntimeError("fit-eval stopped (is Node 24 first on PATH?)")
        reply = json.loads(line)
        if "error" in reply:
            raise RuntimeError(reply["error"])
        return reply

    def close(self) -> None:
        if self.proc.stdin:
            self.proc.stdin.close()
        self.proc.wait(timeout=10)


class Pool:
    """Evaluators shared by threads: each request takes a free one."""

    def __init__(self, workers: int) -> None:
        self.evaluators = [Evaluator() for _ in range(workers)]
        self.free: queue.Queue[Evaluator] = queue.Queue()
        for e in self.evaluators:
            self.free.put(e)
        self.executor = ThreadPoolExecutor(workers)

    def _run(self, request: dict) -> dict:
        e = self.free.get()
        try:
            return e.ask(request)
        finally:
            self.free.put(e)

    def map(self, requests: list[dict]) -> list[dict]:
        return list(self.executor.map(self._run, requests))

    def ask(self, request: dict) -> dict:
        return self._run(request)

    def close(self) -> None:
        self.executor.shutdown()
        for e in self.evaluators:
            e.close()


# --- Encoding --------------------------------------------------------------------------------


def decode(spec: Spec, x: np.ndarray) -> dict:
    """Unit-cube point → the candidate's assignments: the fixed ones, then the free parameters to 4
    significant figures (short patches and links)."""
    out = dict(spec.fixed)
    for p, u in zip(spec.params, np.clip(x, 0, 1)):
        lo, hi = p["lo"], p["hi"]
        if p.get("log"):
            v = math.exp(math.log(lo) + u * (math.log(hi) - math.log(lo)))
        else:
            v = lo + u * (hi - lo)
        out[p["path"]] = float(f"{v:.4g}")
    return out


def encode(spec: Spec, values: dict[str, float | None]) -> np.ndarray:
    """Parameter values → unit cube (a missing value, e.g. an unset κ, sits at its lower bound)."""
    x = []
    for p in spec.params:
        lo, hi = p["lo"], p["hi"]
        v = values.get(p["path"])
        v = lo if v is None else min(hi, max(lo, float(v)))
        if p.get("log"):
            x.append((math.log(v) - math.log(lo)) / (math.log(hi) - math.log(lo)))
        else:
            x.append((v - lo) / (hi - lo))
    return np.array(x)


# --- Traits and loss -------------------------------------------------------------------------


def seed_traits(reply: dict) -> dict[str, float | None]:
    """Flat traits of one seed's reply, `trial.trait`, with derived ones: lone.earlyShare (H30/H60),
    stand.lateShare (H100/H60) and shade.survivalLight (the lowest light the seedling survives)."""
    flat: dict[str, float | None] = {}
    for trial in TRIALS:
        for rec in reply.get(trial, []):
            for k, v in rec.items():
                # Booleans (alive) count as 0 or 1; null is a trait that could not be measured.
                flat[f"{trial}.{k}"] = None if v is None else float(v)
    h30, h60 = flat.get("lone.height30"), flat.get("lone.height60")
    flat["lone.earlyShare"] = h30 / h60 if h30 is not None and h60 else None
    s60, s100 = flat.get("stand.height"), flat.get("stand.height100")
    flat["stand.lateShare"] = s100 / s60 if s100 is not None and s60 else None
    if "shade" in reply:
        lit = [reply["light"][roof] for roof, alive in reply["shade"].items() if alive[0]]
        flat["shade.survivalLight"] = min(lit) if lit else NO_SURVIVAL_LIGHT
    return flat


def mean_traits(per_seed: list[dict[str, float | None]]) -> dict[str, float | None]:
    keys = {k for t in per_seed for k in t}
    out: dict[str, float | None] = {}
    for k in keys:
        xs = [t[k] for t in per_seed if t.get(k) is not None and math.isfinite(t[k])]
        out[k] = float(np.mean(xs)) if xs else None
    return out


def loss(spec: Spec, traits: dict[str, float | None]) -> float:
    total = 0.0
    for t in spec.traits:
        v = traits.get(t["name"])
        if v is None:
            total += t["weight"] * MISSING_PENALTY
        else:
            total += t["weight"] * ((v - t["target"]) / t["band"]) ** 2
    lone_alive = traits.get("lone.alive")
    if lone_alive is not None:
        total += DEATH_PENALTY * (1 - lone_alive)
    stand_alive = traits.get("stand.alive")
    if stand_alive is not None:
        total += DEATH_PENALTY * 5 * max(0.0, 0.8 - stand_alive)
    return total


def measure(pool: Pool, spec: Spec, assigns: list[dict], seeds: list[int]) -> list[dict]:
    """Seed-mean traits of each candidate, every (candidate, seed) a request of its own."""
    requests = [
        {"species": spec.species, "assign": a, "seeds": [s], "trials": spec.trials}
        for a in assigns
        for s in seeds
    ]
    replies = pool.map(requests)
    n = len(seeds)
    return [mean_traits([seed_traits(r) for r in replies[i * n : (i + 1) * n]]) for i in range(len(assigns))]


# --- The search --------------------------------------------------------------------------------


@dataclass
class FitSettings:
    generations: int = 100
    popsize: int = 12
    seeds: int = 5
    warm_restarts: int = 3
    random_restarts: int = 2
    #: Stop a restart when its best loss has not improved by 1% in this many generations.
    patience: int = 25
    #: Candidates re-measured at the end, on `final_seeds` fixed seeds.
    finalists: int = 10
    final_seeds: int = 10
    workers: int = 4
    rng_seed: int = 2026

    @classmethod
    def budget(cls, name: str, **overrides) -> FitSettings:
        """A named budget: "full" (ADR 0020's), or "quick" (2 restarts, 50 generations, 4 seeds;
        about a sixth of the candidates, for a first look at every species)."""
        presets = {
            "full": {},
            "quick": {"generations": 50, "seeds": 4, "warm_restarts": 1, "random_restarts": 1},
        }
        return cls(**{**presets[name], **overrides})


#: Every species with a targets file, the pilot species first.
SPECIES = ["birch", "beech", "oak", "fir", "hornbeam", "maple", "holly", "rowan", "willow", "pine"]


def fit(spec: Spec, settings: FitSettings, log=print, start: dict | None = None) -> dict:
    """Fits `spec`. Warm restarts start from the hand-tuned values, or from `start` (an earlier fit's
    assignments) where given; a parameter `start` lacks (one added since) starts mid-range."""
    rng = np.random.default_rng(settings.rng_seed)
    pool = Pool(settings.workers)
    rows: list[dict] = []
    try:
        start_values = pool.ask({"describe": spec.species, "paths": spec.paths})["values"]
        x_hand = encode(spec, start_values)
        if start is not None:
            x_hand = np.array([
                encode(Spec(spec.species, [], [p]), {p["path"]: start[p["path"]]})[0] if p["path"] in start else 0.5
                for p in spec.params
            ])
        n = len(spec.params)
        bounds = np.array([[0.0, 1.0]] * n)
        restarts = ["warm"] * settings.warm_restarts + ["random"] * settings.random_restarts
        ends: list[dict] = []
        t0 = time.time()
        for r, kind in enumerate(restarts):
            mean = x_hand if kind == "warm" else rng.uniform(0.1, 0.9, n)
            cma = CMA(
                mean=mean.copy(),
                sigma=0.15 if kind == "warm" else 0.3,
                bounds=bounds,
                population_size=settings.popsize,
                seed=int(rng.integers(1 << 30)),
            )
            best = math.inf
            since = 0
            for g in range(settings.generations):
                seeds = [int(s) for s in rng.choice(np.arange(1, 10_000), settings.seeds, replace=False)]
                xs = [cma.ask() for _ in range(cma.population_size)]
                assigns = [decode(spec, x) for x in xs]
                traits = measure(pool, spec, assigns, seeds)
                losses = [loss(spec, t) for t in traits]
                cma.tell(list(zip(xs, losses)))
                for x, a, t, lo in zip(xs, assigns, traits, losses):
                    rows.append({"restart": r, "kind": kind, "generation": g, "loss": lo, **a,
                                 **{f"trait:{k}": v for k, v in t.items()}})
                gen_best = min(losses)
                if gen_best < best * 0.99:
                    best, since = gen_best, 0
                else:
                    since += 1
                log(f"restart {r} ({kind}) gen {g}: best {gen_best:.2f}, median {np.median(losses):.2f}, "
                    f"run best {best:.2f}, {time.time() - t0:.0f} s")
                if since >= settings.patience or cma.should_stop():
                    break
            sd = np.sqrt(np.diag(cma._C)) * cma._sigma if hasattr(cma, "_C") else np.full(n, np.nan)
            ends.append({"restart": r, "kind": kind, "mean": decode(spec, cma._mean), "best": best,
                         "sd_unit": dict(zip(spec.paths, map(float, sd)))})

        # Finalists: the lowest-loss candidates over the whole search, re-measured on fixed seeds.
        ranked = sorted(rows, key=lambda row: row["loss"])
        finalists: list[dict] = []
        for row in ranked:
            a = {**spec.fixed, **{p: row[p] for p in spec.paths}}
            if a not in finalists:
                finalists.append(a)
            if len(finalists) >= settings.finalists:
                break
        fixed_seeds = list(range(1, settings.final_seeds + 1))
        hand_traits = measure(pool, spec, [{}], fixed_seeds)[0]
        final_traits = measure(pool, spec, finalists, fixed_seeds)
        final_losses = [loss(spec, t) for t in final_traits]
        k = int(np.argmin(final_losses))
        patch = pool.ask({"amend": spec.species, "assign": finalists[k]})["patch"]
        return {
            "species": spec.species,
            "settings": settings.__dict__,
            "seconds": round(time.time() - t0),
            "candidates": len(rows),
            "hand": {"values": start_values, "loss": loss(spec, hand_traits), "traits": hand_traits},
            "fit": {"assign": finalists[k], "loss": final_losses[k], "traits": final_traits[k], "patch": patch},
            "finalists": [{"assign": a, "loss": lo} for a, lo in zip(finalists, final_losses)],
            "restarts": ends,
            "rows": rows,
        }
    finally:
        pool.close()


def write_results(result: dict, out_dir: Path, log_dir: Path) -> Path:
    """The full log as parquet under runs/; the small, committable summary as JSON in `out_dir`."""
    import polars as pl

    log_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = result.pop("rows")
    pl.DataFrame(rows, infer_schema_length=None).write_parquet(log_dir / "log.parquet")
    progress = (
        pl.DataFrame(rows, infer_schema_length=None)
        .group_by("restart", "generation")
        .agg(pl.col("loss").min().alias("best"), pl.col("loss").median().alias("median"))
        .sort("restart", "generation")
    )
    progress.write_csv(out_dir / f"{result['species']}-progress.csv")
    path = out_dir / f"{result['species']}.json"
    path.write_text(json.dumps(result, indent=2, default=float) + "\n")
    return path
