"""Level 1's fit (reference-fidelity phase 3, the beech pilot; treesim/level1.py): CMA-ES on the registered form knobs
against the registered real distributions, with Level 0's scored traits kept at their Level 0 weights (the user). The
Level 0 knobs are frozen at the species' Level 0 fit. Resumable and bounded as fit_level0.py.

One generation: every candidate on the same SEEDS_PER_CANDIDATE seeds (common random numbers, drawn afresh from
level1.FIT_SEEDS), each (candidate, seed) one request to analysis/experiments/level1_eval.ts, which grows the stand once
for both levels and leaves the measured trees' skeletons at DUMP_SEASONS in a RAM scratch directory. Per candidate:
the size-matched season from its own seeds, that season's trees described across a process pool, the loss. The
generation's scratch is then deleted. The held-out descriptors are computed by describe() and dropped before anything
is kept: no row, checkpoint or results file of the fit carries them (the user, 2026-11-04).

Provisional: every results file says so; nothing here writes species params.
"""

from __future__ import annotations

import json
import math
import pickle
import shutil
import subprocess
import time
from concurrent.futures import ProcessPoolExecutor
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np
from cmaes import CMA

from treesim import fit
from treesim import level1 as l1
from treesim.fit import Spec, contributions, load_spec, seed_traits
from treesim.fit_level0 import _load, _save
from treesim.host import mem_available_mb, scratch_root
from treesim.sweep import REPO

EVAL = "analysis/experiments/level1_eval.ts"


class Evaluator(fit.Evaluator):
    """fit.Evaluator on level1_eval.ts."""

    def __init__(self) -> None:
        self.proc = subprocess.Popen(["node", EVAL], cwd=REPO, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                     text=True, bufsize=1)
        self.next_id = 0


class Pool(fit.Pool):
    """fit.Pool on level1_eval.ts."""

    def __init__(self, workers: int) -> None:
        import queue
        from concurrent.futures import ThreadPoolExecutor

        self.evaluators = [Evaluator() for _ in range(workers)]
        self.free = queue.Queue()
        for e in self.evaluators:
            self.free.put(e)
        self.executor = ThreadPoolExecutor(workers)


@dataclass
class Level1Settings:
    max_evals: int
    max_hours: float = 12.0
    popsize: int = 12
    seeds: int = 5
    sigma: float = 0.15
    finalists: int = 3
    patience: int = 25
    workers: int = 12
    rng_seed: int = 2026
    scratch: str = field(default_factory=lambda: f"{scratch_root()}/level1-pilot")

    @property
    def reserve(self) -> int:
        """Evaluations held back for the finalists and the hand, each on FINAL_SEEDS."""
        return (self.finalists + 1) * len(l1.FINAL_SEEDS)


def level1_spec(species: str, reg: dict) -> Spec:
    """Level 0's spec (its scored traits, weights, trials) with the registered knobs free and the frozen Level 0 knobs
    and the [fixed] assignments in `fixed`; `form` is the registered start (the hand form)."""
    spec = load_spec(species, level=0)
    spec.params = reg["knobs"]
    spec.fixed = dict(reg["fixed"])
    spec.form = dict(reg["start"])
    return spec


def shm_usage(path: str) -> dict:
    """The scratch directory's size and its filesystem's and the machine's free memory, in MB (treesim/host.py)."""
    size = sum(f.stat().st_size for f in Path(path).glob("*")) if Path(path).exists() else 0
    shm = shutil.disk_usage(scratch_root())
    return {"scratch_mb": size / 1e6, "shm_free_mb": shm.free / 1e6, "mem_available_mb": mem_available_mb()}


def clear_scratch(path: str) -> None:
    shutil.rmtree(path, ignore_errors=True)


class Measure:
    """A generation's evaluation: requests, the size match, the describe pool, the traits; the held-out dropped."""

    def __init__(self, pool: Pool, spec: Spec, reg: dict, scratch: str, executor: ProcessPoolExecutor,
                 hide: bool = True) -> None:
        """`hide`: drop every held-out-named trait (the fit); the gate passes False."""
        self.pool, self.spec, self.reg, self.scratch, self.executor = pool, spec, reg, scratch, executor
        self.hide = hide
        self.names = reg["fitted"]
        self.peak = {"scratch_mb": 0.0, "shm_free_mb": math.inf, "mem_available_mb": math.inf}

    def _watch(self) -> None:
        u = shm_usage(self.scratch)
        self.peak["scratch_mb"] = max(self.peak["scratch_mb"], u["scratch_mb"])
        self.peak["shm_free_mb"] = min(self.peak["shm_free_mb"], u["shm_free_mb"])
        self.peak["mem_available_mb"] = min(self.peak["mem_available_mb"], u["mem_available_mb"])

    def __call__(self, tag: str, assigns: list[dict], seeds: list[int], names=None,
                 trials: list[str] | None = None) -> tuple[list[dict], float, list]:
        """Each candidate's traits (Level 0's and Level 1's), the evaluators' CPU seconds, and its described trees
        (the `names` descriptors: the fit's by default; the gate passes every candidate descriptor, and the stand
        only). `self.per_seed` keeps each candidate's per-seed traits (the gate reads Level 0's statistic there)."""
        names = self.names if names is None else names
        trials = self.spec.trials if trials is None else trials
        requests = [{"species": self.spec.species, "assign": a, "seeds": [s], "trials": trials,
                     "level1": {"scratch": self.scratch, "key": f"{tag}-c{i}", "dumpSeasons": list(l1.DUMP_SEASONS)}}
                    for i, a in enumerate(assigns) for s in seeds]
        try:
            replies = self.pool.map(requests)
            self._watch()
            n = len(seeds)
            jobs, where, seasons, flags = [], [], [], []
            for i in range(len(assigns)):
                rs = replies[i * n:(i + 1) * n]
                per_seed = [l1.seed_dbh(r["level1"][0]["allometry"]) for r in rs]
                season = l1.match_season(per_seed, self.reg["size_match"]["dbh"])
                f = []
                if season == l1.MATCH_SEASONS[0]:
                    f.append("matched at the first season")
                if season is None or season not in l1.DUMP_SEASONS:
                    f.append(f"unmatched (season {season})")
                    season_ok = None
                else:
                    season_ok = season
                seasons.append(season)
                flags.append(f)
                if season_ok is not None:
                    for s, r in zip(seeds, rs):
                        jobs.append((r["level1"][0]["dumps"][str(season_ok)], s, self.reg["d_min_m"], names))
                        where.append(i)
            described = l1.describe_files(jobs, self.executor)
        finally:
            clear_scratch(self.scratch)
        trees: list[list[dict] | None] = [None if seasons[i] not in l1.DUMP_SEASONS else []
                                          for i in range(len(assigns))]
        for i, ts in zip(where, described):
            trees[i].extend(ts)
        out = []
        self.per_seed = []
        for i in range(len(assigns)):
            rs = replies[i * len(seeds):(i + 1) * len(seeds)]
            self.per_seed.append([seed_traits(r, self.spec.tallo) for r in rs])
            if self.hide:
                self.per_seed[-1] = [without_held_out(self.reg, x) for x in self.per_seed[-1]]
            t = fit.mean_traits(self.per_seed[-1])
            lo, hi = self.reg["real_dbh_range_m"]
            if trees[i] is not None:
                outside = sum(not lo <= x["dbh"] <= hi for x in trees[i])
                if outside:
                    flags[i].append(f"{outside} trees outside the real DBH range")
            t.update(l1.level1_traits(self.reg, trees[i], seasons[i], flags[i]))
            out.append(without_held_out(self.reg, t) if self.hide else t)
        return out, sum(r.get("ms", 0) for r in replies) / 1000, trees


def total(spec: Spec, reg: dict, t: dict) -> tuple[float, dict]:
    c = {**contributions(spec, t), **l1.level1_contributions(reg, t)}
    return float(sum(c.values())), c


def summary(spec: Spec, reg: dict, a: dict, t: dict) -> dict:
    lo, c = total(spec, reg, t)
    return {"assign": a, "loss": lo, "contributions": c,
            "traits": {k: v for k, v in sorted(t.items()) if k.startswith(("l1.", "stand.", "shade.", "lone.alive"))}}


def held_out_key(reg: dict, key: str) -> bool:
    """A trait named after a held-out descriptor: Level 1's own (`l1.<k>.…`), or the simulator's form.rs reading of the
    same name in Level 0's trials (`stand.widestAt`, `lone.widestAt`: a different measurement, dropped all the same)."""
    parts = key.removeprefix("trait:").split(".")
    return any(p == k or (p.startswith(k) and p[len(k):].isdigit()) for p in parts for k in reg["held_out"])


def without_held_out(reg: dict, traits: dict) -> dict:
    return {k: v for k, v in traits.items() if not held_out_key(reg, k)}


def assert_no_held_out(reg: dict, obj) -> None:
    """The fit's outputs never name a held-out descriptor (the user, 2026-11-04)."""
    def keys(x):
        if isinstance(x, dict):
            for k, v in x.items():
                yield k
                yield from keys(v)
        elif isinstance(x, list):
            for v in x:
                yield from keys(v)

    bad = [k for k in keys(obj) if held_out_key(reg, str(k))]
    if bad:
        raise AssertionError(f"held-out descriptors in the fit's output: {sorted(set(bad))}")


def fit_level1(spec: Spec, reg: dict, settings: Level1Settings, out_dir: Path, run_dir: Path, resume: bool = False,
               log=print) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    run_dir.mkdir(parents=True, exist_ok=True)
    ckpt = run_dir / "checkpoint.pkl"
    clear_scratch(settings.scratch)
    pool = Pool(settings.workers)
    side = fit.Pool(1)
    executor = ProcessPoolExecutor(settings.workers)
    measure = Measure(pool, spec, reg, settings.scratch, executor)
    try:
        if resume and ckpt.exists():
            st = _load(ckpt)
            log(f"resumed at generation {st['generation']}, {st['evals']} evaluations")
        else:
            species_values = side.ask({"describe": spec.species, "paths": spec.paths})["values"]
            start = {p: reg["start"].get(p, species_values.get(p)) for p in spec.paths}
            rng = np.random.default_rng(settings.rng_seed)
            st = {
                "settings": asdict(settings), "start": start, "generation": 0, "evals": 0, "cpu": 0.0, "wall": 0.0,
                "rows": [], "best": math.inf, "since": 0, "rng": rng,
                "cma": CMA(mean=fit.encode(spec, start), sigma=settings.sigma,
                           bounds=np.array([[0.0, 1.0]] * len(spec.params)), population_size=settings.popsize,
                           seed=int(rng.integers(1 << 30))),
            }
        cma, rng = st["cma"], st["rng"]
        started = time.time()
        per_gen = settings.popsize * settings.seeds
        status = "complete"
        while True:
            if st["evals"] + per_gen > settings.max_evals - settings.reserve:
                break
            if st["since"] >= settings.patience or cma.should_stop():
                status = "converged"
                break
            if (time.time() - started) / 3600 >= settings.max_hours:
                status = "stopped: max-hours (resumable)"
                break
            t0 = time.time()
            g = st["generation"]
            seeds = [int(s) for s in rng.choice(np.array(l1.FIT_SEEDS), settings.seeds, replace=False)]
            xs = [cma.ask() for _ in range(cma.population_size)]
            assigns = [fit.decode(spec, x) for x in xs]
            traits, cpu, _ = measure(f"g{g}", assigns, seeds)
            losses = [total(spec, reg, t)[0] for t in traits]
            cma.tell(list(zip(xs, losses)))
            for a, t, lo in zip(assigns, traits, losses):
                st["rows"].append({"generation": g, "loss": lo, **a, **{f"trait:{k}": v for k, v in t.items()},
                                   **{f"loss:{k}": v for k, v in total(spec, reg, t)[1].items()}})
            assert_no_held_out(reg, st["rows"][-len(assigns):])
            gen_best = min(losses)
            if gen_best < st["best"] * 0.99:
                st["best"], st["since"] = gen_best, 0
            else:
                st["since"] += 1
            st["generation"] += 1
            st["evals"] += len(assigns) * len(seeds)
            st["cpu"] += cpu
            st["wall"] += time.time() - t0
            _save(ckpt, st)
            progress(spec.species, st["rows"], out_dir)
            k = int(np.argmin([r["loss"] for r in st["rows"]]))
            row = st["rows"][k]
            best_a = {**spec.fixed, **spec.form, **{p: row[p] for p in spec.paths}}
            best_t = {key[6:]: v for key, v in row.items() if key.startswith("trait:")}
            best = {"species": spec.species, "provisional": reg["provisional"], "generation": row["generation"],
                    "evaluations": st["evals"], **summary(spec, reg, best_a, best_t),
                    "patch": side.ask({"amend": spec.species, "assign": best_a})["patch"]}
            assert_no_held_out(reg, best)
            (out_dir / f"{spec.species}-best.json").write_text(json.dumps(best, indent=1, default=float) + "\n")
            seasons = [t["l1.season"] for t in traits]
            log(f"gen {g}: best {gen_best:.2f}, median {np.median(losses):.2f}, run best {st['best']:.2f}; seasons "
                f"{sorted(set(map(str, seasons)))}; {st['evals']} evals, {time.time() - t0:.0f} s this generation, "
                f"{st['wall']:.0f} s wall, {cpu / len(assigns):.1f} CPU-s a candidate; scratch peak "
                f"{measure.peak['scratch_mb']:.0f} MB, scratch filesystem free ≥ {measure.peak['shm_free_mb']:.0f} MB, "
                f"memory available ≥ {measure.peak['mem_available_mb']:.0f} MB")
        if status.startswith("stopped"):
            return {"species": spec.species, "status": status}

        # Finalists: the lowest-loss distinct candidates, re-measured beside the hand on FINAL_SEEDS.
        finalists: list[dict] = []
        for row in sorted(st["rows"], key=lambda r: r["loss"]):
            a = {**spec.fixed, **spec.form, **{p: row[p] for p in spec.paths}}
            if a not in finalists:
                finalists.append(a)
            if len(finalists) >= settings.finalists:
                break
        hand = {**spec.fixed, **spec.form}
        t0 = time.time()
        measured, cpu, _ = measure("final", [hand] + finalists, list(l1.FINAL_SEEDS))
        st["evals"] += (len(finalists) + 1) * len(l1.FINAL_SEEDS)
        st["cpu"] += cpu
        st["wall"] += time.time() - t0
        final = measured[1:]
        losses = [total(spec, reg, t)[0] for t in final]
        k = int(np.argmin(losses)) if final else -1
        result = {
            "species": spec.species,
            "provisional": reg["provisional"],
            "status": status,
            "settings": st["settings"],
            "knobs": spec.paths,
            "generations": st["generation"],
            "evaluations": st["evals"],
            "wall_seconds": round(st["wall"]),
            "cpu_seconds": round(st["cpu"]),
            "final_seeds": list(l1.FINAL_SEEDS),
            "memory": measure.peak,
            "hand": {"values": st["start"], **summary(spec, reg, hand, measured[0])},
            "fit": {**summary(spec, reg, finalists[k], final[k]),
                    "patch": side.ask({"amend": spec.species, "assign": finalists[k]})["patch"]} if final else None,
            "finalists": [{"assign": a, "loss": lo} for a, lo in zip(finalists, losses)],
        }
        assert_no_held_out(reg, result)
        write(result, st["rows"], out_dir, run_dir)
        return result
    finally:
        executor.shutdown()
        pool.close()
        side.close()
        clear_scratch(settings.scratch)


def progress(species: str, rows: list[dict], out_dir: Path) -> None:
    """One row a candidate: its generation, loss, the generation's best, its matched season, the trees' median DBH
    and its flags. Rewritten after every generation."""
    import polars as pl

    df = pl.DataFrame([{"generation": r["generation"], "loss": r["loss"], "season": r.get("trait:l1.season"),
                        "dbh": r.get("trait:l1.dbh"), "trees": r.get("trait:l1.trees"),
                        "flags": r.get("trait:l1.flags")} for r in rows], infer_schema_length=None)
    df = df.with_columns(pl.col("loss").min().over("generation").alias("generation_best"))
    df.write_csv(out_dir / f"{species}-progress.csv")


def write(result: dict, rows: list[dict], out_dir: Path, run_dir: Path) -> Path:
    """The candidate log as parquet under runs/; the committable summary beside the progress and the best-so-far."""
    import polars as pl

    pl.DataFrame(rows, infer_schema_length=None).write_parquet(run_dir / "log.parquet")
    progress(result["species"], rows, out_dir)
    path = out_dir / f"{result['species']}.json"
    path.write_text(json.dumps(result, indent=1, default=float) + "\n")
    return path
