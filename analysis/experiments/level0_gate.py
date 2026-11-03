"""Level 0's gate (reference-fidelity phase 2, the plan's §k): a species' closed stand on seeds 1–20, to season 150;
a seed passes when max(|median z_H|, |median z_CR|) ≤ T at every season (60, 100, 150) with a measured tree inside
Tallo's support; the species passes on ≥ 15 of 20. A seed whose trees are outside the support at every season fails (it cannot show it is
in band); a species with no comparable season on any seed is not gateable. T and the curves are the pre-registered
analysis/fit/sources/tallo-level0.json's, from real trees only.

    uv run --project analysis python -I analysis/experiments/level0_gate.py --species beech            # shipped
    uv run --project analysis python -I analysis/experiments/level0_gate.py --species beech \\
        --fit docs/experiments/fits/level0/beech.json                                                   # a fit

Also prints, per seed and season, the median DBH, H and CR, and counts the trees with a codominant stem below breast
height (Tallo pools those as √Σd²: the user rules before any pooling) and with a limb longer than half the ring.
"""

import argparse
import json
import os
from pathlib import Path

import numpy as np

from treesim import tallo
from treesim.fit import LEVEL0_SEASONS, Pool, seed_traits
from treesim.sweep import REPO

SEEDS = list(range(1, 21))
NEED = 15
HALF_RING_M = 0.5 * 84 * 0.25

parser = argparse.ArgumentParser()
parser.add_argument("--species", required=True)
parser.add_argument("--fit", help="a results file whose fit.assign (or assign, for a -best.json) is applied")
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
parser.add_argument("--json", help="also write the per-seed table here")
args = parser.parse_args()

entry = tallo.load_targets()["species"][args.species]
T = entry["control"]["T"]
assign = {}
if args.fit:
    r = json.loads(Path(args.fit).read_text())
    assign = (r.get("fit") or r)["assign"]

pool = Pool(args.workers)
try:
    replies = pool.map([{"species": args.species, "assign": assign, "seeds": [s], "trials": ["stand150"]}
                        for s in SEEDS])
finally:
    pool.close()

rows, passed, comparable_any = [], 0, False
codominant = long_limb = trees = 0
for s, reply in zip(SEEDS, replies):
    t = seed_traits(reply, entry)
    zs = [t[f"stand.tallo{k}.{i}"] for k in tallo.TRAITS for i in range(len(LEVEL0_SEASONS))]
    zs = [z for z in zs if z is not None]
    stat = max(abs(z) for z in zs) if zs else None
    comparable_any |= stat is not None
    ok = stat is not None and stat <= T
    passed += ok
    for a in reply["stand"][0].get("allometry", []):
        trees += 1
        codominant += a["codominant"]
        long_limb += a["maxOffset"] > HALF_RING_M
    rows.append({"seed": s, "stat": stat, "pass": ok, **{k: v for k, v in t.items() if k.startswith(
        ("stand.tallo", "stand.dbh.", "stand.H.", "stand.CR.", "stand.height", "stand.alive"))}})

fmt = lambda v, d=2: "—" if v is None else f"{v:.{d}f}"  # noqa: E731
print(f"{args.species} ({'fit ' + args.fit if args.fit else 'shipped'}): T {T:.2f} (control self-consistency "
      f"{entry['control']['self_consistency']['pass']}/20); support H {entry['H']['support']}, CR "
      f"{entry['CR']['support']} cm\n")
head = " | ".join(f"{s}: DBH cm, H m, CR m, zH, zCR" for s in LEVEL0_SEASONS)
print(f"| seed | {head} | stat | pass |")
print("|---|" + "---|" * len(LEVEL0_SEASONS) + "---|---|")
for r in rows:
    cells = []
    for i in range(len(LEVEL0_SEASONS)):
        d = r.get(f"stand.dbh.{i}")
        cells.append(f"{fmt(None if d is None else 100 * d, 1)}, {fmt(r.get(f'stand.H.{i}'), 1)}, "
                     f"{fmt(r.get(f'stand.CR.{i}'), 1)}, {fmt(r.get(f'stand.talloH.{i}'))}, "
                     f"{fmt(r.get(f'stand.talloCR.{i}'))}")
    print(f"| {r['seed']} | " + " | ".join(cells) + f" | {fmt(r['stat'])} | {'yes' if r['pass'] else 'no'} |")
for i, s in enumerate(LEVEL0_SEASONS):
    for k in tallo.TRAITS:
        zs = [r[f"stand.tallo{k}.{i}"] for r in rows if r.get(f"stand.tallo{k}.{i}") is not None]
        if zs:
            print(f"median z_{k} at {s}: {np.median(zs):+.2f} over {len(zs)} seeds")
print(f"\ncodominant below 1.3 m: {codominant} of {trees} tree-readings; a limb past half the ring: {long_limb}")
verdict = ("not gateable at Level 0 (no measured tree inside the support)" if not comparable_any
           else f"{'PASS' if passed >= NEED else 'FAIL'}: {passed} of {len(SEEDS)} seeds (need {NEED})")
print(f"{args.species}: {verdict}")
if args.json:
    Path(args.json).write_text(json.dumps({"species": args.species, "T": T, "passed": passed, "verdict": verdict,
                                           "codominant": codominant, "long_limb": long_limb, "rows": rows},
                                          indent=1, default=float) + "\n")
