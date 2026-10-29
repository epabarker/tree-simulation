"""M27: fit a species' patch to literature traits by CMA-ES (ADR 0020; analysis/treesim/fit.py).

    uv run --project analysis python analysis/experiments/m27_fit.py --species birch
    uv run --project analysis python analysis/experiments/m27_fit.py --species all --skip-done
    uv run --project analysis python analysis/experiments/m27_fit.py --species all --budget quick
    uv run --project analysis python analysis/experiments/m27_fit.py --species birch --smoke
    uv run --project analysis python analysis/experiments/m27_fit.py --species all --skip-done \
        --start round1 --restarts 2,0 --generations 50 --seeds 3     # a later round, from round 1's fits

Needs Node 24 first on PATH. The full budget takes about 20–40 minutes per species on a 12-core
laptop (up to 30,000 tree-runs of ≈ 0.6 s; see the handoff in docs/STATUS.md); `--budget quick`
(2 restarts, 50 generations, 4 seeds) about a sixth of that. --smoke checks the pipeline in a
minute (2 generations, 2 seeds) and writes only under runs/.

A run writes docs/experiments/fits/<species>.json (the fitted patch, its traits beside the
hand-tuned ones, each restart's end point, the budget) and <species>-progress.csv, small enough
to commit; the log of every candidate goes to runs/m27-fit/<species>/log.parquet. With
`--species all` each species is written as soon as it finishes, so `--skip-done` resumes an
interrupted run where it stopped.
"""

import argparse
import json
import os

from treesim import REPO
from treesim.fit import SPECIES, FitSettings, fit, load_spec, write_results

parser = argparse.ArgumentParser()
parser.add_argument("--species", required=True, help=f"one of {', '.join(SPECIES)}, or all")
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

species = SPECIES if args.species == "all" else [args.species]
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
