"""Level 1 pilot: fit one species' form knobs to its registered Level 1 targets (reference-fidelity phase 3; ADR 0049;
analysis/treesim/fit_level1.py). Provisional: nothing from it enters species params. Writes
docs/experiments/fits/<out>/<species>.json, <species>-progress.csv (a row a candidate, with its matched season) and,
after every generation, <species>-best.json; the checkpoint and the candidate log go to runs/<out>/<species>/.

    uv run --project analysis python -I analysis/experiments/level1_fit.py --species beech --max-evals 2000
    uv run --project analysis python -I analysis/experiments/level1_fit.py --species beech --max-evals 2000 --resume
    uv run --project analysis python -I analysis/experiments/level1_fit.py --species beech --dry-run

--max-evals counts simulator evaluations, one a (candidate, seed), the finalists and the hand included; --max-hours is a
safety stop after the current generation (resume with --resume). Refuses if a registered file has changed. Needs Node
24 first on PATH and the WASM build.
"""

import argparse
import json
import sys

from treesim import level1 as l1
from treesim.fit_level1 import Level1Settings, fit_level1, level1_spec, workers_default
from treesim.sweep import REPO


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", required=True)
    parser.add_argument("--max-evals", type=int, help="simulator evaluations (candidates × seeds), finalists included")
    parser.add_argument("--max-hours", type=float, default=12.0, help="safety stop after the current generation")
    parser.add_argument("--workers", type=int, default=workers_default())
    parser.add_argument("--popsize", type=int, default=12)
    parser.add_argument("--finalists", type=int, default=3)
    parser.add_argument("--out", default="level1-pilot", help="results under docs/experiments/fits/<out>/, runs/<out>/")
    parser.add_argument("--resume", action="store_true", help="continue from runs/<out>/<species>/checkpoint.pkl")
    parser.add_argument("--dry-run", action="store_true",
                        help="2 generations of 12 on 5 seeds, 2 finalists and the hand on 101–110; under "
                             "runs/level1-dry/")
    args = parser.parse_args()

    reg = l1.load(args.species)
    if args.dry_run:
        settings = Level1Settings(max_evals=2 * 12 * 5 + 3 * len(l1.FINAL_SEEDS), max_hours=2, finalists=2,
                                  workers=args.workers, scratch="/dev/shm/level1-dry")
        out_dir = run_dir = REPO / "runs" / "level1-dry" / args.species
    else:
        if args.max_evals is None:
            parser.error("--max-evals is required (or --dry-run)")
        settings = Level1Settings(max_evals=args.max_evals, max_hours=args.max_hours, popsize=args.popsize,
                                  finalists=args.finalists, workers=args.workers, scratch=f"/dev/shm/{args.out}")
        out_dir = REPO / "docs" / "experiments" / "fits" / args.out
        run_dir = REPO / "runs" / args.out / args.species

    spec = level1_spec(args.species, reg)
    print(f"=== {args.species} (provisional): knobs {spec.paths}; fitted {reg['fitted']}; groups "
          f"{list(reg['groups'])}; trials {spec.trials}; {settings}", flush=True)
    result = fit_level1(spec, reg, settings, out_dir, run_dir, resume=args.resume, log=lambda m: print(m, flush=True))
    if result["status"].startswith("stopped"):
        print(f"{args.species}: {result['status']}; best so far in {out_dir / (args.species + '-best.json')}")
        sys.exit(0)
    print(json.dumps({k: result[k] for k in ("status", "generations", "evaluations", "wall_seconds", "cpu_seconds",
                                             "memory")}))
    for who in ("hand", "fit"):
        r = result[who]
        if r is None:
            continue
        print(f"\n{who}: loss {r['loss']:.2f} (matched season {r['traits'].get('l1.season')}, median DBH "
              f"{r['traits'].get('l1.dbh')})")
        for k, v in sorted(r["contributions"].items(), key=lambda kv: -kv[1]):
            print(f"  {k:28s} {v:8.3f}")


if __name__ == "__main__":
    main()
