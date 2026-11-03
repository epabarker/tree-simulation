"""Phase 1c's degradation test, gate c (docs/plans/2026-11-03-reference-fidelity.md §j, the 1c brief, amendment E):
simulated trees coarsened to each dataset's resolution (treesim/coarsen.py) against the tolerances pre-registered in
analysis/fit/sources/phase1-tolerances.json (treesim/tolerance.py), which this script never writes. It refuses to
run if describe(), coarsen() or the readers have changed since that file was committed (its hashes).

    uv run --project analysis python -I analysis/experiments/phase1_degradation.py dump    # the simulated trees
    uv run --project analysis python -I analysis/experiments/phase1_degradation.py live    # live measured trees
    uv run --project analysis python -I analysis/experiments/phase1_degradation.py gate    # gate c, H2, H3, control

Writes runs/phase1/ (sim/, gate-c.csv, shifts.csv, gate-c.md). The write-up is
docs/experiments/2026-11-03-phase1-converter.md.
"""

from __future__ import annotations

import csv
import json
import math
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

from treesim import coarsen as co
from treesim import qsm
from treesim import simtree
from treesim import tolerance as tol
from treesim.describe import describe

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "runs" / "phase1"
SIM = OUT / "sim"
SPECIES = ("oak", "beech", "maple")
WORKERS = 12


def _dump_one(job: tuple[str, int]) -> str:
    species, seed = job
    out = SIM / f"{species}-{seed}.json"
    if not out.exists():
        part = out.with_suffix(".partial")
        subprocess.run(["node", "cli/dump-trees.ts", "--gate-c", species, str(seed), str(part)], cwd=ROOT, check=True)
        part.rename(out)
    return str(out)


def dump(rules: dict) -> None:
    jobs = [(s, k) for s in SPECIES for k in rules["seeds"]]
    with ProcessPoolExecutor(WORKERS) as ex:
        for path in ex.map(_dump_one, jobs):
            print(path, flush=True)


def _load(species: str, seed: int) -> list[simtree.SimTree]:
    with (SIM / f"{species}-{seed}.json").open() as f:
        return [simtree.from_dump(t) for t in json.load(f)["trees"]]


def live(rules: dict) -> dict[str, list[int]]:
    """Live measured trees per seed (the stand's four at 150); nothing is described."""
    out = {}
    for species in SPECIES:
        out[species] = [sum(t.meta["alive"] for t in _load(species, k) if t.meta["trial"] == "stand")
                        for k in rules["seeds"]]
        print(species, out[species], "seeds with a live tree:", sum(n > 0 for n in out[species]))
    return out


def _check_hashes(t: dict) -> None:
    now = tol.file_hashes()
    bad = [f for f, h in t["hashes"].items() if now.get(f) != h]
    if bad:
        sys.exit(f"refusing: changed since the tolerances were committed: {', '.join(bad)}")


def _res(t: dict, dataset: str, factor: float) -> co.Resolution:
    r = t["resolution"][dataset]
    ratio = tuple(math.nan if v is None else v for v in r["ratio"])
    return co.Resolution(r["d_min"] * factor, ratio, tuple(r["count"]))


def _num(v) -> float:
    return math.nan if v is None else float(v)


def _points(t: dict, species: str) -> list[tuple[str, str]]:
    """(dataset, point): the bracket at each dataset, and the inflation point."""
    return [(d, f"x{f:g}") for d in t["rules"]["datasets"][species] for f in t["rules"]["bracket"]] + \
           [(d, "inflated") for d in t["rules"]["datasets"][species]]


def _describe_tree(args) -> dict:
    """describe() of one simulated tree, and of its coarsened versions at every (dataset, point)."""
    tree, points, res = args
    c = tree.cylinders
    out = {"original": describe(c)}
    for dataset, point in points:
        r = res[(dataset, "x1" if point == "inflated" else point)]
        out[f"{dataset}:{point}"] = describe(co.coarsen(c, r, inflated=point == "inflated"))
    return out


def gate(t: dict) -> None:
    _check_hashes(t)
    rules = t["rules"]
    res = {(d, f"x{f:g}"): _res(t, d, f) for d in ("demol", "wytham", "biodiv") for f in rules["bracket"]}
    tolerance = {(r["species"], r["descriptor"]): r for r in t["table"]}
    descriptors = t["descriptors"]
    shift_rows, sim_rows = [], []
    for species in SPECIES:
        points = _points(t, species)
        jobs, keys = [], []
        for seed in rules["seeds"]:
            for k, tree in enumerate(_load(species, seed)):
                if tree.meta["trial"] == "stand" and not tree.meta["alive"]:
                    continue
                jobs.append((tree, points, res))
                keys.append((seed, tree.meta["trial"], k, tree.meta["alive"]))
        with ProcessPoolExecutor(WORKERS) as ex:
            described = list(ex.map(_describe_tree, jobs, chunksize=1))
        for (seed, trial, k, alive), d in zip(keys, described):
            for name, values in d.items():
                sim_rows.append({"species": species, "seed": seed, "trial": trial, "tree": k, "version": name,
                                 **{key: values.get(key) for key in descriptors + ["dbh", "height"]}})
        for seed in rules["seeds"]:
            stand = [d for (s, trial, _, _), d in zip(keys, described) if s == seed and trial == "stand"]
            for dataset, point in points:
                v = f"{dataset}:{point}"
                for key in descriptors:
                    diffs = [_num(d[v][key]) - _num(d["original"][key]) for d in stand]
                    finite = [x for x in diffs if math.isfinite(x)]
                    shift = float(np.median(finite)) if finite and len(finite) == len(diffs) else math.nan
                    shift_rows.append({"species": species, "seed": seed, "dataset": dataset, "point": point,
                                       "descriptor": key, "live": len(stand), "shift": shift})
        print(species, "described", len(jobs), flush=True)
    _write(OUT / "shifts.csv", shift_rows)
    _write(OUT / "sim-describe.csv", sim_rows)
    table = []
    for species in SPECIES:
        for key in descriptors:
            row = tolerance[(species, key)]
            tl = _num(row["tolerance"])
            cells = {}
            worst = None
            for dataset, point in _points(t, species):
                s = [r["shift"] for r in shift_rows if r["species"] == species and r["dataset"] == dataset
                     and r["point"] == point and r["descriptor"] == key]
                ok = sum(math.isfinite(x) and math.isfinite(tl) and abs(x) <= tl for x in s)
                med = float(np.nanmedian(np.abs(s))) if any(math.isfinite(x) for x in s) else math.nan
                cells[f"{dataset}:{point}"] = ok
                cells[f"{dataset}:{point}:median|shift|"] = med
                if worst is None or ok < worst[0]:
                    worst = (ok, f"{dataset}:{point}", med)
            gated = row["noise_verdict"] != "excluded (H1)"
            passed = worst[0] >= rules["pass_seeds"]
            if not gated:
                verdict = "excluded (H1)"
            elif row["noise_verdict"].startswith("held out"):
                verdict = row["noise_verdict"]
            elif not passed:
                hi = _num(row["between_sd_hi95"]) * t["tolerance_factor"]
                verdict = ("held out: tolerance uncertain" if math.isfinite(worst[2]) and worst[2] <= hi
                           else "held out: resolution-sensitive")
            else:
                verdict = "survives"
            table.append({"species": species, "descriptor": key, "tolerance": tl,
                          "tolerance_hi95": _num(row["between_sd_hi95"]) * t["tolerance_factor"],
                          "noise_ratio": _num(row["noise_ratio"]), "noise_verdict": row["noise_verdict"],
                          "gate_c": "pass" if passed else "fail", "worst_point": worst[1], "worst_seeds": worst[0],
                          "worst_median_shift": worst[2], "verdict": verdict, **cells})
    _write(OUT / "gate-c.csv", table)
    (OUT / "gate-c.md").write_text(markdown(table, t))
    print(markdown(table, t))


def markdown(table: list[dict], t: dict) -> str:
    f = lambda x: "–" if not math.isfinite(x) else f"{x:.3g}"  # noqa: E731
    lines = []
    for species in SPECIES:
        rows = [r for r in table if r["species"] == species]
        gated = [r for r in rows if r["verdict"] != "excluded (H1)"]
        surv = sum(r["verdict"] == "survives" for r in gated)
        lines += [f"\n**{species}**: {surv} of {len(gated)} gated descriptors survive"
                  f"{' (fewer than half: stop)' if surv < len(gated) / 2 else ''}\n",
                  "| descriptor | tolerance | noise / SD | gate c (worst point: seeds of 20) | median \\|shift\\| there | verdict |",
                  "|---|---|---|---|---|---|"]
        for r in rows:
            lines.append(f"| {r['descriptor']} | {f(r['tolerance'])} | {f(r['noise_ratio'])} | {r['gate_c']} "
                         f"({r['worst_point']}: {r['worst_seeds']}) | {f(r['worst_median_shift'])} | {r['verdict']} |")
    return "\n".join(lines) + "\n"


def _write(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    keys = list(dict.fromkeys(k for r in rows for k in r))
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, keys, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def control(t: dict) -> None:
    """Each real QSM coarsened at its own dataset's resolution (× 1): the shift per descriptor, median over trees."""
    _check_hashes(t)
    rows = []
    for r in tol.real_sets():
        if r["dataset"] not in t["resolution"]:
            continue
        c = qsm.read(r["path"]).cylinders
        a, b = describe(c), describe(co.coarsen(c, _res(t, r["dataset"], 1.0)))
        rows.append({"dataset": r["dataset"], "species": r["species"], "tree": r["tree"], "cylinders": len(c),
                     "coarsened": None, **{k: _num(b.get(k)) - _num(a.get(k)) for k in t["descriptors"]}})
    _write(OUT / "control.csv", rows)


def bias() -> None:
    """H4: the median QSM-against-measured DBH bias with its sign, per dataset and species (the model read; DBHqsm's
    rule), beside the reference's kind: Demol's tape, Wytham's and BioDiv's point clouds."""
    from treesim import qsm_gate as qg

    kinds = {"demol": ("field_dbh", "tape"), "wytham": ("pts_dbh", "points (DBH_pts)"), "biodiv": ("pts_dbh", "points (dTLS)")}
    lines = ["| dataset | species | reference | trees | median bias | IQR | share > 0 |", "|---|---|---|---|---|---|---|"]
    for source, rows in (("demol", qg.demol_rows()), ("wytham", qg.wytham_rows()), ("biodiv", qg.biodiv_rows())):
        key, kind = kinds[source]
        for sp in sorted({r["species"] for r in rows}):
            e = np.array([r["dbh"] / r[key] - 1 for r in rows if r["species"] == sp and math.isfinite(r[key]) and r[key] > 0])
            if len(e):
                q1, q3 = np.percentile(e, [25, 75])
                lines.append(f"| {source} | {sp} | {kind} | {len(e)} | {100 * np.median(e):+.1f}% | "
                             f"{100 * q1:+.1f}% to {100 * q3:+.1f}% | {np.mean(e > 0):.0%} |")
    (OUT / "dbh-bias.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "gate"
    t = json.loads(tol.TOLERANCES.read_text()) if tol.TOLERANCES.exists() else None
    rules = t["rules"] if t else tol.RULES
    if what == "dump":
        dump(rules)
    elif what == "live":
        live(rules)
    elif what == "gate":
        gate(t)
    elif what == "bias":
        bias()
    elif what == "control":
        control(t)
