"""M27: fit a species' patch to literature traits by CMA-ES (ADR 0020; analysis/treesim/fit.py).

    uv run --project analysis python analysis/experiments/m27_fit.py --species birch
    uv run --project analysis python analysis/experiments/m27_fit.py --species all --skip-done
    uv run --project analysis python analysis/experiments/m27_fit.py --species all --budget quick
    uv run --project analysis python analysis/experiments/m27_fit.py --species birch --smoke
    uv run --project analysis python analysis/experiments/m27_fit.py --species all --skip-done \
        --start round1 --restarts 2,0 --generations 50 --seeds 3     # a later round, from round 1's fits
    uv run --project analysis python analysis/experiments/m27_fit.py --method lm --start round2 \
        --species garden --workers 12                                # 3D: least squares (fit_lm.py)

Needs Node 24 first on PATH. The full budget takes about 20–40 minutes per species on a 12-core
laptop (up to 30,000 tree-runs of ≈ 0.6 s; see the handoff in docs/STATUS.md); `--budget quick`
(2 restarts, 50 generations, 4 seeds) about a sixth of that. --smoke checks the pipeline in a
minute (2 generations, 2 seeds) and writes only under runs/.

A run writes docs/experiments/fits/<species>.json (the fitted patch, its traits beside the
hand-tuned ones, each restart's end point, the budget) and <species>-progress.csv, small enough
to commit; the log of every candidate goes to runs/m27-fit/<species>/log.parquet. With
`--species all` each species is written as soon as it finishes, so `--skip-done` resumes an
interrupted run where it stopped.

`--method lm` (the species plan of 2026-10-30, §2; analysis/treesim/fit_lm.py) fits by least squares
then CMA-ES from `--start`'s fits as adopted (the hand overrides on top, r0 in ADR 0027's units) and writes
docs/experiments/fits/<--out>/<species>.json, <species>-lm.csv (the loss per iteration) and
<species>-jacobian.csv (the screening). With several species, each after the first starts from its
own start shifted by the mean shift (in the unit cube, and r0's in log) of those already fitted,
where that start's loss is lower than its own: the plan's transfer.
"""

import argparse
import json
import os

import tomllib

import numpy as np
from treesim import REPO
from treesim.fit import SPECIES, FitSettings, Pool, Spec, decode, encode, fit, load_spec, write_results
from treesim.fit_lm import LMSettings, Problem, fit_lm, write_lm

#: The garden's eight (`MIXED`), fitted first in 3D; fir and pine are the lab's.
GARDEN = ["birch", "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple"]
#: ADR 0027: in 3D, r0 ÷ 8 of a 2D fit's.
GIRTH_SCALE = 8

parser = argparse.ArgumentParser()
parser.add_argument("--species", required=True,
                    help=f"one of {', '.join(SPECIES)}, a comma list, all, or garden (the mixed wood's eight)")
parser.add_argument("--method", choices=["cmaes", "lm"], default="cmaes")
parser.add_argument("--out", default="round3", help="lm: the results' folder under docs/experiments/fits/")
parser.add_argument("--active", help="lm: comma list of parameters to move, instead of the screening's active set")
parser.add_argument("--iterations", type=int, help="lm: overrides the 10 iterations")
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
parser.add_argument("--budget", choices=["full", "quick"], default="full")
parser.add_argument("--generations", type=int, help="overrides the budget's")
parser.add_argument("--seeds", type=int, help="overrides the budget's")
parser.add_argument("--restarts", help="warm,random restarts, e.g. 2,1; overrides the budget's")
parser.add_argument("--start", default="hand",
                    help="warm restarts start from the hand-tuned values (hand) or an earlier round's fits, e.g. round1")
parser.add_argument("--skip-done", action="store_true", help="skip species that already have a results file")
parser.add_argument("--smoke", action="store_true", help="2 generations, 2 seeds, 1 restart; writes under runs/ only")
args = parser.parse_args()

species = {"all": SPECIES, "garden": GARDEN}.get(args.species, args.species.split(","))
overrides = {k: v for k, v in {"generations": args.generations, "seeds": args.seeds}.items() if v is not None}
if args.restarts:
    warm, rand = (int(n) for n in args.restarts.split(","))
    overrides.update(warm_restarts=warm, random_restarts=rand)
if args.smoke:
    settings = FitSettings(generations=2, popsize=6, seeds=2, warm_restarts=1, random_restarts=0,
                           finalists=2, final_seeds=2, workers=args.workers)
else:
    settings = FitSettings.budget(args.budget, workers=args.workers, **overrides)
log_root = REPO / "runs" / ("m27-fit-smoke" if args.smoke else "m27-fit")


def out_dir(sp: str):
    return log_root / sp if args.smoke else REPO / "docs" / "experiments" / "fits"


def report(spec, result: dict, path) -> None:
    fmt = lambda v: "—" if v is None else f"{v:.3g}"
    print(f"\n{spec.species}: {result['candidates']} candidates in {result['seconds']} s")
    print(f"loss: hand-tuned {result['hand']['loss']:.2f}, fitted {result['fit']['loss']:.2f}")
    print(f"{'trait':24} {'target':>8} {'hand':>8} {'fitted':>8}")
    for t in spec.traits:
        h = result["hand"]["traits"].get(t["name"])
        f = result["fit"]["traits"].get(t["name"])
        print(f"{t['name']:24} {t['target']:>8} {fmt(h):>8} {fmt(f):>8}")
    print(f"{'param':24} {'hand':>8} {'fitted':>8}")
    for p in spec.paths:
        h = result["hand"]["values"].get(p)
        f = result["fit"]["assign"].get(p)
        print(f"{p:24} {fmt(h):>8} {f:>8.3g}")
    print(f"wrote {path}")


def round2_start(sp: str, earlier_round: str) -> dict:
    """An earlier 2D round's fit as adopted (m27_adopt.py): its assignments, the hand overrides, and
    r0 in ADR 0027's 3D units."""
    earlier = json.loads((REPO / "docs" / "experiments" / "fits" / earlier_round / f"{sp}.json").read_text())
    overrides = tomllib.loads((REPO / "analysis" / "fit" / "hand-overrides.toml").read_text())
    a = {**earlier["fit"]["assign"], **overrides.get(sp, {})}
    a["c6.r0"] = float(f"{a['c6.r0'] / GIRTH_SCALE:.4g}")
    return a


def shifted(spec: Spec, a: dict, shifts: list[dict]) -> dict:
    """`a` moved by the mean of earlier species' shifts (unit cube; r0 in log)."""
    free = Spec(spec.species, [], [p for p in spec.params if p["path"] != "c6.r0"])
    x = encode(free, a)
    for j, p in enumerate(free.params):
        moves = [d[p["path"]] for d in shifts if p["path"] in d]
        if moves:
            x[j] = min(1.0, max(0.0, x[j] + float(np.mean(moves))))
    out = {**a, **decode(free, x)}
    out["c6.r0"] = float(f"{a['c6.r0'] * np.exp(np.mean([d['log r0'] for d in shifts])):.4g}")
    return out


def lm_start(spec: Spec, a: dict, shifts: list[dict], workers: int) -> dict:
    """Own start, or shifted by the earlier species' fits where that start's loss is lower (the
    fit's seeds)."""
    if not shifts:
        return a
    b = shifted(spec, a, shifts)
    pool = Pool(min(workers, 16))
    try:
        free = Spec(spec.species, [], [p for p in spec.params if p["path"] != "c6.r0"])
        prob = Problem(spec, pool, LMSettings(workers=workers), encode(free, a), (0, 1), a["c6.r0"])
        xa, xb = encode(free, a), encode(free, b)
        ta, tb = prob.traits([(xa, a["c6.r0"]), (xb, b["c6.r0"])])
        la, lb = prob.objective(ta, xa), prob.objective(tb, xb)
    finally:
        pool.close()
    print(f"{spec.species}: own start loss {la:.2f}, shifted by {len(shifts)} species' fits {lb:.2f}", flush=True)
    return b if lb < la else a


def lm_report(spec: Spec, result: dict) -> None:
    fmt = lambda v: "—" if v is None else f"{v:.3g}"
    print(f"\n{spec.species}: {result['evaluations']} evaluations in {result['seconds']} s "
          f"({', '.join(f'{k} {v} s' for k, v in result['stageSeconds'].items())})"
          + (f"; stopped: {result['stopped']}" if result["stopped"] else ""))
    print(f"accepted: {result['accepted']} (measured targets in band on fresh seeds: {result['measuredInBand']}; "
          f"outside: {', '.join(result['measuredOutside']) or 'none'}); fit from {result['fit']['from']}")
    print(f"loss on fresh seeds (progress only): start {result['start']['loss']:.2f}, fitted {result['fit']['loss']:.2f}")
    print(f"{'trait':24} {'kind':>9} {'target':>8} {'band':>7} {'start':>8} {'fitted':>8} {'margin':>8}")
    for m in result["margins"]:
        print(f"{m['trait']:24} {m['kind']:>9} {m['target']:>8} {m['band']:>7} {fmt(m['start']):>8} "
              f"{fmt(m['fit']):>8} {fmt(m['fitMargin']):>8}")
    print(f"active: {', '.join(result['activeSet'])}")
    for p in spec.paths + ["r1.mw"]:
        print(f"{p:24} {fmt(result['start']['assign'].get(p)):>8} {fmt(result['fit']['assign'].get(p)):>8}")


if args.method == "lm":
    out = REPO / "docs" / "experiments" / "fits" / args.out
    settings = LMSettings(workers=args.workers, **({"iterations": args.iterations} if args.iterations else {}))
    shifts: list[dict] = []
    for sp in species:
        if args.skip_done and (out / f"{sp}.json").exists():
            # Its shift still carries to the species after it (the plan's transfer).
            spec = load_spec(sp)
            own = round2_start(sp, args.start)
            done_fit = json.loads((out / f"{sp}.json").read_text())["fit"]["assign"]
            free = Spec(sp, [], [p for p in spec.params if p["path"] != "c6.r0"])
            d = dict(zip(free.paths, encode(free, done_fit) - encode(free, own)))
            d["log r0"] = float(np.log(done_fit["c6.r0"] / own["c6.r0"]))
            shifts.append(d)
            print(f"skipped (done): {sp}; its shift carries on")
            continue
        print(f"\n=== {sp} (least squares) ===", flush=True)
        spec = load_spec(sp)
        own = round2_start(sp, args.start)
        start = lm_start(spec, own, shifts, args.workers)
        active = args.active.split(",") if args.active else None
        result = fit_lm(spec, settings, start, log=lambda s: print(s, flush=True), active=active)
        result["startFrom"] = {"round": args.start, "shifted": start != own}
        write_lm(result, out)
        lm_report(spec, result)
        free = Spec(sp, [], [p for p in spec.params if p["path"] != "c6.r0"])
        d = dict(zip(free.paths, encode(free, result["fit"]["assign"]) - encode(free, own)))
        d["log r0"] = float(np.log(result["fit"]["assign"]["c6.r0"] / own["c6.r0"]))
        shifts.append(d)
        print(f"wrote {out / (sp + '.json')}", flush=True)
    raise SystemExit(0)

done, skipped = [], []
for sp in species:
    if args.skip_done and (out_dir(sp) / f"{sp}.json").exists():
        skipped.append(sp)
        continue
    print(f"\n=== {sp} ({'smoke' if args.smoke else args.budget}) ===", flush=True)
    spec = load_spec(sp)
    start = None
    if args.start != "hand":
        earlier = json.loads((REPO / "docs" / "experiments" / "fits" / args.start / f"{sp}.json").read_text())
        start = earlier["fit"]["assign"]
    result = fit(spec, settings, log=lambda s: print(s, flush=True), start=start)
    result["start"] = args.start
    path = write_results(result, out_dir(sp), log_root / sp)
    report(spec, result, path)
    done.append(sp)

if len(species) > 1:
    print(f"\nfitted: {', '.join(done) or 'none'}" + (f"; skipped (done): {', '.join(skipped)}" if skipped else ""))
