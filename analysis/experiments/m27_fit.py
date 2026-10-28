"""M27: fit a species' patch to literature traits by CMA-ES (ADR 0020; analysis/treesim/fit.py).

    uv run --project analysis python analysis/experiments/m27_fit.py --species birch
    uv run --project analysis python analysis/experiments/m27_fit.py --species birch --smoke

Needs Node 24 first on PATH. The full run takes about 20–40 minutes per species on a 12-core
laptop (up to 30,000 tree-runs of ≈ 0.6 s; see the handoff in docs/STATUS.md); --smoke checks the pipeline in a minute (2 generations, 2 seeds) and
writes only under runs/. A full run writes docs/experiments/fits/<species>.json (the fitted
patch, its traits beside the hand-tuned ones, each restart's end point) and
<species>-progress.csv, small enough to commit; the log of every candidate goes to
runs/m27-fit/<species>/log.parquet.
"""

import argparse
import os

from treesim import REPO
from treesim.fit import FitSettings, fit, load_spec, write_results

parser = argparse.ArgumentParser()
parser.add_argument("--species", required=True)
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
parser.add_argument("--generations", type=int, default=100)
parser.add_argument("--seeds", type=int, default=5)
parser.add_argument("--smoke", action="store_true", help="2 generations, 2 seeds, 1 restart; writes under runs/ only")
args = parser.parse_args()

spec = load_spec(args.species)
if args.smoke:
    settings = FitSettings(generations=2, popsize=6, seeds=2, warm_restarts=1, random_restarts=0,
                           finalists=2, final_seeds=2, workers=args.workers)
    out_dir = REPO / "runs" / "m27-fit-smoke" / args.species
else:
    settings = FitSettings(generations=args.generations, seeds=args.seeds, workers=args.workers)
    out_dir = REPO / "docs" / "experiments" / "fits"
result = fit(spec, settings)
path = write_results(result, out_dir, REPO / "runs" / ("m27-fit-smoke" if args.smoke else "m27-fit") / args.species)

print(f"\n{spec.species}: {result['candidates']} candidates in {result['seconds']} s")
print(f"loss: hand-tuned {result['hand']['loss']:.2f}, fitted {result['fit']['loss']:.2f}")
print(f"{'trait':24} {'target':>8} {'hand':>8} {'fitted':>8}")
for t in spec.traits:
    h = result["hand"]["traits"].get(t["name"])
    f = result["fit"]["traits"].get(t["name"])
    fmt = lambda v: "—" if v is None else f"{v:.3g}"
    print(f"{t['name']:24} {t['target']:>8} {fmt(h):>8} {fmt(f):>8}")
print(f"{'param':24} {'hand':>8} {'fitted':>8}")
for p in spec.paths:
    h = result["hand"]["values"].get(p)
    f = result["fit"]["assign"].get(p)
    print(f"{p:24} {('—' if h is None else f'{h:.3g}'):>8} {f:>8.3g}")
print(f"wrote {path}")
