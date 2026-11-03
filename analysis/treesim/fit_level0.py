"""Level 0's fit (reference-fidelity phase 2, the plan's §k): CMA-ES on the species' `[level0] knobs` against
Tallo's bands and the time anchors (fit.load_spec(species, level=0)), resumable and bounded.

One warm restart from the shipped species (`describe`). Every candidate of a generation sees the same seeds, drawn
afresh each generation (common random numbers, as fit.py). The budget is in simulator evaluations, one a
(candidate, seed) (the user, 2026-11-03): the search stops before a generation would leave too few for the
finalists' re-measure; `max_hours` is a safety stop after the current generation. After every generation the
checkpoint (the CMA object, the rng, the rows) and the best-so-far candidate are written, so a killed run resumes
where it stopped and a stopped one keeps its best. The finalists are re-measured on FINAL_SEEDS, never on the gate's
seeds 1–20.
"""

from __future__ import annotations

import json
import math
import pickle
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
from cmaes import CMA

from treesim.fit import Pool, Spec, contributions, decode, encode, loss, mean_traits, report_names, seed_traits

#: The finalists' seeds: apart from the gate's 1–20, so the choice never reads the gate's seeds.
FINAL_SEEDS = list(range(101, 111))


@dataclass
class Level0Settings:
    max_evals: int
    max_hours: float = 12.0
    popsize: int = 12
    seeds: int = 5
    sigma: float = 0.15
    finalists: int = 5
    patience: int = 25
    workers: int = 12
    rng_seed: int = 2026

    @property
    def reserve(self) -> int:
        """Evaluations held back for the finalists and the shipped species, each on FINAL_SEEDS."""
        return (self.finalists + 1) * len(FINAL_SEEDS)


def evaluate(pool: Pool, spec: Spec, assigns: list[dict], seeds: list[int]) -> tuple[list[dict], float]:
    """Seed-mean traits of each candidate and the evaluator's CPU seconds (the replies' ms)."""
    requests = [{"species": spec.species, "assign": a, "seeds": [s], "trials": spec.trials}
                for a in assigns for s in seeds]
    replies = pool.map(requests)
    n = len(seeds)
    traits = [mean_traits([seed_traits(r, spec.tallo) for r in replies[i * n:(i + 1) * n]])
              for i in range(len(assigns))]
    return traits, sum(r.get("ms", 0) for r in replies) / 1000


def summary(spec: Spec, a: dict, t: dict) -> dict:
    """A candidate as written: its assignment, loss, each trait's share, the scored and reported traits."""
    scored = [k for k in t if any(k == x["name"] or k.startswith(x["name"] + ".") for x in spec.traits)]
    reports = set(report_names(spec, ("",)))
    extra = [k for k in t if k.startswith(("stand.dbh.", "stand.H.", "stand.CR."))]
    return {
        "assign": a,
        "loss": loss(spec, t),
        "contributions": contributions(spec, t),
        "traits": {k: t[k] for k in sorted(scored + extra)},
        "reports": {k: t[k] for k in sorted(t) if k in reports},
    }


def _save(path: Path, state: dict) -> None:
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(pickle.dumps(state))
    tmp.replace(path)


def fit_level0(spec: Spec, settings: Level0Settings, out_dir: Path, run_dir: Path, resume: bool = False,
               log=print) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    run_dir.mkdir(parents=True, exist_ok=True)
    ckpt = run_dir / "checkpoint.pkl"
    pool = Pool(settings.workers)
    try:
        if resume and ckpt.exists():
            st = pickle.loads(ckpt.read_bytes())
            log(f"resumed at generation {st['generation']}, {st['evals']} evaluations")
        else:
            start = pool.ask({"describe": spec.species, "paths": spec.paths})["values"]
            rng = np.random.default_rng(settings.rng_seed)
            st = {
                "settings": asdict(settings), "start": start, "generation": 0, "evals": 0, "cpu": 0.0,
                "wall": 0.0, "rows": [], "best": math.inf, "since": 0, "rng": rng,
                "cma": CMA(mean=encode(spec, start), sigma=settings.sigma, bounds=np.array([[0.0, 1.0]] * len(spec.params)),
                           population_size=settings.popsize, seed=int(rng.integers(1 << 30))),
            }
        cma, rng = st["cma"], st["rng"]
        # max_hours bounds this invocation, not the run: a resumed run gets its hours afresh.
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
            seeds = [int(s) for s in rng.choice(np.arange(1, 10_000), settings.seeds, replace=False)]
            xs = [cma.ask() for _ in range(cma.population_size)]
            assigns = [decode(spec, x) for x in xs]
            traits, cpu = evaluate(pool, spec, assigns, seeds)
            losses = [loss(spec, t) for t in traits]
            cma.tell(list(zip(xs, losses)))
            g = st["generation"]
            for a, t, lo in zip(assigns, traits, losses):
                st["rows"].append({"generation": g, "loss": lo, **a, **{f"trait:{k}": v for k, v in t.items()}})
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
            k = int(np.argmin([r["loss"] for r in st["rows"]]))
            best_row = st["rows"][k]
            best_a = {**spec.fixed, **spec.form, **{p: best_row[p] for p in spec.paths}}
            best_t = {key[6:]: v for key, v in best_row.items() if key.startswith("trait:")}
            (out_dir / f"{spec.species}-best.json").write_text(json.dumps({
                "species": spec.species, "generation": best_row["generation"], "evaluations": st["evals"],
                **summary(spec, best_a, best_t),
                "patch": pool.ask({"amend": spec.species, "assign": best_a})["patch"],
            }, indent=1, default=float) + "\n")
            log(f"gen {g}: best {gen_best:.2f}, median {np.median(losses):.2f}, run best {st['best']:.2f}; "
                f"{st['evals']} evals, {st['wall']:.0f} s wall, {st['cpu'] / max(1, len(assigns)):.1f} s CPU a "
                f"candidate this run")
        if status.startswith("stopped"):
            return {"species": spec.species, "status": status}

        # Finalists: the lowest-loss distinct candidates, re-measured with the shipped species on FINAL_SEEDS.
        finalists: list[dict] = []
        for row in sorted(st["rows"], key=lambda r: r["loss"]):
            a = {**spec.fixed, **spec.form, **{p: row[p] for p in spec.paths}}
            if a not in finalists:
                finalists.append(a)
            if len(finalists) >= settings.finalists:
                break
        t0 = time.time()
        measured, cpu = evaluate(pool, spec, [{}] + finalists, FINAL_SEEDS)
        st["evals"] += (len(finalists) + 1) * len(FINAL_SEEDS)
        st["cpu"] += cpu
        st["wall"] += time.time() - t0
        hand, final = measured[0], measured[1:]
        losses = [loss(spec, t) for t in final]
        k = int(np.argmin(losses)) if final else -1
        result = {
            "species": spec.species,
            "status": status,
            "settings": st["settings"],
            "knobs": spec.paths,
            "generations": st["generation"],
            "evaluations": st["evals"],
            "wall_seconds": round(st["wall"]),
            "cpu_seconds": round(st["cpu"]),
            "final_seeds": FINAL_SEEDS,
            "hand": {"values": st["start"], **summary(spec, {}, hand)},
            "fit": {**summary(spec, finalists[k], final[k]),
                    "patch": pool.ask({"amend": spec.species, "assign": finalists[k]})["patch"]} if final else None,
            "finalists": [{"assign": a, "loss": lo} for a, lo in zip(finalists, losses)],
        }
        write(result, st["rows"], out_dir, run_dir)
        return result
    finally:
        pool.close()


def write(result: dict, rows: list[dict], out_dir: Path, run_dir: Path) -> Path:
    """The full log as parquet under runs/; the committable summary and progress beside the best-so-far."""
    import polars as pl

    df = pl.DataFrame(rows, infer_schema_length=None)
    df.write_parquet(run_dir / "log.parquet")
    (df.group_by("generation").agg(pl.col("loss").min().alias("best"), pl.col("loss").median().alias("median"))
     .sort("generation").write_csv(out_dir / f"{result['species']}-progress.csv"))
    path = out_dir / f"{result['species']}.json"
    path.write_text(json.dumps(result, indent=1, default=float) + "\n")
    return path
