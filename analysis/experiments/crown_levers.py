"""Crown competition diagnosis (2026-11-04; docs/experiments/2026-11-04-crown-competition.md), steps 3 and 5: the
rivals' probes and the lever probes, oak and beech, seeds 1–5, each cell one change from the hand or fitted params.

- Species levers (an assign: r6.qMin, r5.eS, r4.lDorm, c5.Trel) are measured twice: as the fitter measures them
  (fit_level0.evaluate: loss, its contributions, LAI, the shade house, deaths) and from the stand's dump (crown_dump.ts:
  overlap, CR readings, z per tree).
- World-level cells (O2 on, the light's K and sky exponent, open faces, a 6-row slab) cannot be reached by a species
  assign, so they are dump-only; the lone tree and the shade house hold one tree and no neighbour, so O2 leaves them as
  they are.
Nothing here is a candidate for adoption; bounds are lifted for the probe only.

  uv run --project analysis python -I analysis/experiments/crown_levers.py run      # dumps and evaluations
  uv run --project analysis python -I analysis/experiments/crown_levers.py table    # → runs/crown-competition/levers.csv
"""

import json
import sys
from pathlib import Path

import numpy as np
import polars as pl

sys.path.insert(0, str(Path(__file__).resolve().parent))
from crown_overlap import DUMPS, RUNS, analyse, fit_assign, run_jobs  # noqa: E402

from treesim import tallo  # noqa: E402
from treesim.fit import Pool, load_spec  # noqa: E402
from treesim.fit_level0 import evaluate, summary  # noqa: E402

SPECIES = ["oak", "beech"]
SEEDS = [1, 2, 3, 4, 5]
CHECK = ["r6.qMin", "r5.eS", "r4.lDorm", "c5.Trel", "o2.enabled", "o2.pAbr", "c2.K", "c2.skyExponent"]


def base_assign(sp: str, st: str) -> dict:
    return fit_assign(sp) if st == "fit" else {}


def trel(sp: str, st: str) -> float:
    a = base_assign(sp, st)
    if "c5.Trel" in a:
        return a["c5.Trel"]
    return {"oak": 0.063, "beech": 0.008}[sp]


def cells(sp: str, st: str) -> dict[str, dict]:
    """Cell name → {assign} or {patch}/{depth}: one change from the base."""
    t = trel(sp, st)
    out = {
        "qMin=0.3": {"assign": {"r6.qMin": 0.3}},
        "qMin=0.5": {"assign": {"r6.qMin": 0.5}},
        "eS=0": {"assign": {"r5.eS": 0.0}},
        "eS=0.3": {"assign": {"r5.eS": 0.3}},
        "lDorm=10": {"assign": {"r4.lDorm": 10}},
        "lDorm=20": {"assign": {"r4.lDorm": 20}},
        "Trel×3": {"assign": {"c5.Trel": 3 * t}},
        "Trel×10": {"assign": {"c5.Trel": 10 * t}},
        "O2 pAbr=0.5": {"patch": {"o2": {"enabled": True, "pAbr": 0.5}}},
        "O2 pAbr=1": {"patch": {"o2": {"enabled": True, "pAbr": 1.0}}},
    }
    if st == "fit":  # the rivals: on the fitted params only
        out |= {
            "faces open": {"patch": {"world": {"faces": [1, 1]}}},
            "depth 128": {"depth": 128, "measured": [8, 9, 10, 11]},
            "K=32": {"patch": {"c2": {"K": 32}}},
            "sky p=0.5": {"patch": {"c2": {"skyExponent": 0.5}}},
        }
    return out


def safe(name: str) -> str:
    return name.replace(" ", "_").replace("×", "x")


def dump_jobs() -> dict[str, dict]:
    jobs = {}
    for sp in SPECIES:
        for st in ["hand", "fit"]:
            for cell, c in cells(sp, st).items():
                for s in SEEDS:
                    job = {"species": sp, "seed": s, "assign": {**base_assign(sp, st), **c.get("assign", {})},
                           "checkParams": CHECK}
                    for k in ("patch", "depth", "measured"):
                        if k in c:
                            job[k] = c[k]
                    jobs[f"probes/{safe(cell)}/{sp}-{st}-{s}"] = job
    return jobs


def run() -> None:
    run_jobs(dump_jobs(), workers=8)
    pool = Pool(8)
    out = RUNS / "levers-eval.json"
    res = json.loads(out.read_text()) if out.exists() else {}
    try:
        for sp in SPECIES:
            spec = load_spec(sp, level=0)
            for st in ["hand", "fit"]:
                names = ["base"] + [n for n, c in cells(sp, st).items() if set(c) == {"assign"}]
                todo = [n for n in names if f"{sp}/{st}/{n}" not in res]
                if not todo:
                    continue
                assigns = [{**base_assign(sp, st), **(cells(sp, st)[n]["assign"] if n != "base" else {})} for n in todo]
                traits, _ = evaluate(pool, spec, assigns, SEEDS)
                for n, a, t in zip(todo, assigns, traits):
                    res[f"{sp}/{st}/{n}"] = summary(spec, a, t)
                out.write_text(json.dumps(res, default=float))
                print("evaluated", sp, st, flush=True)
    finally:
        pool.close()


def zs(dump: dict, curves: dict, measured: list[int]) -> dict:
    out = {}
    for k, snap in enumerate(dump["snaps"]):
        rows = [t for t in snap["trees"] if t["index"] in measured and t["alive"]]
        for trait, key in (("H", "height"), ("CR", "crownRadius")):
            z = [tallo.z_score(curves[trait], 100 * t["allometry"]["dbh"], t["allometry"][key]) for t in rows]
            z = [v for v in z if v is not None]
            out[f"z{trait}.{k}"] = float(np.median(z)) if z else None
        out[f"CR.{k}"] = float(np.median([t["allometry"]["crownRadius"] for t in rows])) if rows else None
        out[f"H.{k}"] = float(np.median([t["allometry"]["height"] for t in rows])) if rows else None
    out["dead150"] = sum(not t["alive"] for t in dump["snaps"][-1]["trees"])
    out["lai60"] = dump["snaps"][0]["lai"]
    return out


def table() -> None:
    rows = []
    for sp in SPECIES:
        curves = load_spec(sp, level=0).tallo
        for st in ["hand", "fit"]:
            for cell, c in {"base": {}, **cells(sp, st)}.items():
                for s in SEEDS:
                    p = DUMPS / (f"{sp}-{st}-{s}.json" if cell == "base" else f"probes/{safe(cell)}/{sp}-{st}-{s}.json")
                    if not p.exists():
                        continue
                    d = json.loads(p.read_text())
                    measured = c.get("measured", [4, 5, 6, 7])
                    recs = analyse(d, measured)
                    agg = {}
                    for k, season in enumerate([60, 100, 150]):
                        r = [x for x in recs if x["season"] == season]
                        for m in ("foreign", "cr_own", "cr_leafy", "extreme_dormant", "extreme_short"):
                            vals = [x[m] for x in r if x.get(m) is not None and x[m] == x[m]]
                            agg[f"{m}.{k}"] = float(np.mean(vals)) if vals else None
                    rows.append({"species": sp, "set": st, "cell": cell, "seed": s, **zs(d, curves, measured), **agg,
                                 **{f"eff:{k}": str(v) for k, v in (d.get("effective") or {}).items()}})
    df = pl.DataFrame(rows, infer_schema_length=None)
    df.write_csv(RUNS / "levers.csv")
    print(f"{len(df)} rows → {RUNS / 'levers.csv'}")


if __name__ == "__main__":
    {"run": run, "table": table}[sys.argv[1]]()
