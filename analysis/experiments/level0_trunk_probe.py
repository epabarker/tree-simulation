"""Level 0 trunk diagnosis probes (docs/experiments/2026-11-03-level0-trunk.md): the hand params of a species with
multipliers on single params, seeds 1–5, measured as the fitter measures (treesim.fit.measure, Level 0's trials).
Bounds do not apply: a probe may leave the fit's box. Nothing here is a candidate for adoption.

  uv run --project analysis python -I analysis/experiments/level0_trunk_probe.py SPECIES GRID OUT.json [--workers 4]

GRID names a set of conditions below. Each condition is a label and {param: multiplier of the hand value} (or a
literal value with "=": {"r3.girthGain": "=0"}).
"""

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from treesim.fit import Pool, contributions, load_spec, loss, measure  # noqa: E402

GRIDS = {
    # Step 1: r0 alone.
    "r0": [("r0x1", {}), ("r0x1.5", {"c6.r0": 1.5}), ("r0x2", {"c6.r0": 2})],
    # Step 5: r0 crossed with m_w, plus the cost-neutral cells (m_w·r0² held: R1's sapwood cost unchanged, ADR 0027)
    # and m_w alone.
    "r0mw": [
        ("r0x1", {}),
        ("r0x1 mw/2", {"r1.mw": 0.5}),
        ("r0x2", {"c6.r0": 2}),
        ("r0x2 mw/2", {"c6.r0": 2, "r1.mw": 0.5}),
        ("r0x2 mw/4", {"c6.r0": 2, "r1.mw": 0.25}),
        ("r0x3", {"c6.r0": 3}),
        ("r0x3 mw/2", {"c6.r0": 3, "r1.mw": 0.5}),
        ("r0x3 mw/9", {"c6.r0": 3, "r1.mw": 1 / 9}),
    ],
    # Step 4: rivals. R3's stress wood off; the pipe exponent; R3 off with r0 doubled at constant cost.
    "rivals": [
        ("stress off", {"r3.girthGain": "=0"}),
        ("stress off r0x2 mw/4", {"r3.girthGain": "=0", "c6.r0": 2, "r1.mw": 0.25}),
        ("n 1.8", {"c6.n": "=1.8"}),
        ("n 2.5", {"c6.n": "=2.5"}),
    ],
    # Step 4, after the advisor: R3's share of the DBH radius (stress wood above σ_target).
    "sigma": [("sigmaT x0.7", {"r3.sigmaTarget": 0.7})],
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("species")
    ap.add_argument("grid", choices=sorted(GRIDS))
    ap.add_argument("out")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--seeds", default="1,2,3,4,5")
    a = ap.parse_args()
    spec = load_spec(a.species, level=0)
    seeds = [int(s) for s in a.seeds.split(",")]
    conds = GRIDS[a.grid]
    paths = sorted({p for _, m in conds for p in m})
    t0 = time.time()
    pool = Pool(a.workers)
    try:
        hand = pool.ask({"describe": a.species, "paths": paths})["values"] if paths else {}
        assigns = [{p: float(v[1:]) if isinstance(v, str) else hand[p] * v for p, v in mult.items()}
                   for _, mult in conds]
        res = measure(pool, spec, assigns, seeds)
    finally:
        pool.close()
    out = {"species": a.species, "grid": a.grid, "seeds": seeds, "hand": hand, "wall_seconds": time.time() - t0,
           "conditions": []}
    for (label, _), assign, t in zip(conds, assigns, res):
        out["conditions"].append({"label": label, "assign": assign, "loss": loss(spec, t),
                                  "contributions": contributions(spec, t), "traits": t})
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(out, open(a.out, "w"), indent=1, default=float)
    print(f"{a.species} {a.grid}: {len(conds)} conditions × {len(seeds)} seeds in {out['wall_seconds']:.0f} s → {a.out}")


if __name__ == "__main__":
    main()
