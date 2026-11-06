"""Level 0: fit one species' physiology knobs to Tallo's H–DBH and CR–DBH bands (reference-fidelity phase 2, the
plan's §k; analysis/treesim/fit_level0.py). Writes docs/experiments/fits/<out>/<species>.json (the fit, the shipped
species beside it, each trait's loss share), <species>-progress.csv and, after every generation, <species>-best.json;
the checkpoint and the candidate log go to runs/<out>/<species>/. Species params change only through these files.

    uv run --project analysis python -I analysis/experiments/level0_fit.py --species beech --max-evals 6000
    uv run --project analysis python -I analysis/experiments/level0_fit.py --species beech --max-evals 6000 --resume
    uv run --project analysis python -I analysis/experiments/level0_fit.py --species beech --smoke   # the dry run

--max-evals counts simulator evaluations, one a (candidate, seed), finalists included; --max-hours is a safety stop
after the current generation (resume with --resume). Needs Node 24 first on PATH and the WASM build.
"""

import argparse
import json
import os
import sys

from treesim.fit import load_spec
from treesim.fit_level0 import FINAL_SEEDS, Level0Settings, fit_level0
from treesim.sweep import REPO

parser = argparse.ArgumentParser()
parser.add_argument("--species", required=True)
parser.add_argument("--max-evals", type=int, help="simulator evaluations (candidates × seeds), finalists included")
parser.add_argument("--max-hours", type=float, default=12.0, help="safety stop after the current generation")
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
parser.add_argument("--seeds", type=int, default=5, help="seeds a candidate, drawn afresh each generation")
parser.add_argument("--popsize", type=int, default=12)
parser.add_argument("--finalists", type=int, default=5)
parser.add_argument("--out", default="level0", help="results under docs/experiments/fits/<out>/, runs/<out>/")
parser.add_argument("--resume", action="store_true", help="continue from runs/<out>/<species>/checkpoint.pkl")
parser.add_argument("--smoke", action="store_true",
                    help="the dry run: 2 generations of 12 on 2 seeds, 2 finalists; everything under runs/level0-smoke/")
args = parser.parse_args()

if args.smoke:
    settings = Level0Settings(max_evals=2 * 12 * 2 + 3 * len(FINAL_SEEDS), max_hours=1, popsize=12, seeds=2,
                              finalists=2, workers=args.workers)
    out_dir = run_dir = REPO / "runs" / "level0-smoke" / args.species
else:
    if args.max_evals is None:
        parser.error("--max-evals is required (or --smoke)")
    settings = Level0Settings(max_evals=args.max_evals, max_hours=args.max_hours, popsize=args.popsize,
                              seeds=args.seeds, finalists=args.finalists, workers=args.workers)
    out_dir = REPO / "docs" / "experiments" / "fits" / args.out
    run_dir = REPO / "runs" / args.out / args.species

spec = load_spec(args.species, level=0)
print(f"=== {args.species}: knobs {spec.paths}; trials {spec.trials}; {settings}", flush=True)
result = fit_level0(spec, settings, out_dir, run_dir, resume=args.resume, log=lambda m: print(m, flush=True))
if result["status"].startswith("stopped"):
    print(f"{args.species}: {result['status']}; best so far in {out_dir / (args.species + '-best.json')}")
    sys.exit(0)
print(json.dumps({k: result[k] for k in ("status", "generations", "evaluations", "wall_seconds", "cpu_seconds")}))
for who in ("hand", "fit"):
    r = result[who]
    if r is None:
        continue
    print(f"\n{who}: loss {r['loss']:.2f}")
    for k, v in sorted(r["contributions"].items(), key=lambda kv: -kv[1]):
        print(f"  {k:24s} {v:8.3f}")
    print("  " + ", ".join(f"{k} {v:.3g}" for k, v in r["traits"].items() if v is not None))
