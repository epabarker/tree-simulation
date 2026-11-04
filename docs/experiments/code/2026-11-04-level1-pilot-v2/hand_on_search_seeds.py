"""Pilot v2 (registration v3): the hand scored on the run's own fixed search seeds, so the run's in-run losses can be
read against it on identical seeds. The same Measure as the fit (hide=True, the spec's trials, the registration's
fit_seeds), on a scratch directory of its own (never the run's). Reads nothing the fit does not; writes no held-out
value.

    uv run --project analysis python -I docs/experiments/code/2026-11-04-level1-pilot-v2/hand_on_search_seeds.py

Writes docs/experiments/fits/level1-pilot-v2/hand-search-seeds.json.
"""

import argparse
import json
from concurrent.futures import ProcessPoolExecutor

from treesim import level1 as l1
from treesim.fit_level1 import Measure, Pool, assert_no_held_out, clear_scratch, level1_spec, total
from treesim.host import scratch_root
from treesim.sweep import REPO


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=4, help="few: the run holds 12")
    args = parser.parse_args()
    reg = l1.load("beech")
    spec = level1_spec("beech", reg)
    hand = {**spec.fixed, **spec.form}
    seeds = l1.fit_seeds(reg)
    scratch = f"{scratch_root()}/level1-hand-search"
    assert scratch != f"{scratch_root()}/level1-pilot-v2"
    clear_scratch(scratch)
    pool = Pool(args.workers)
    executor = ProcessPoolExecutor(args.workers)
    try:
        t = Measure(pool, spec, reg, scratch, executor)("hand", [hand], seeds)[0][0]
    finally:
        executor.shutdown()
        pool.close()
        clear_scratch(scratch)
    lo, c = total(spec, reg, t)
    loc = float(sum(v for k, v in c.items() if k.startswith("l1.")))
    out = {"registration_version": reg["version"], "seeds": seeds, "hand": hand, "loss": lo, "level1_location": loc,
           "level0": lo - loc, "contributions": c, "season": t.get("l1.season"), "trees": t.get("l1.trees"),
           "dbh": t.get("l1.dbh"), "flags": t.get("l1.flags"),
           "spread_s": {k: t.get(f"l1.{k}.s") for k in reg["fitted"]}}
    assert_no_held_out(reg, out)
    path = REPO / "docs" / "experiments" / "fits" / "level1-pilot-v2" / "hand-search-seeds.json"
    path.write_text(json.dumps(out, indent=1, default=float) + "\n")
    print(json.dumps({k: out[k] for k in ("loss", "level1_location", "level0", "season", "trees", "dbh", "flags")},
                     default=float))
    for k, v in sorted(c.items(), key=lambda kv: -kv[1]):
        print(f"  {k:28s} {v:8.3f}")


if __name__ == "__main__":
    main()
