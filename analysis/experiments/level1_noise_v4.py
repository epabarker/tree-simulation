"""Pilots v3 and v4's noise check (Level 1, registrations v4 and v5; analysis/treesim/level1.py). Reported only: the seeds per candidate
stay at v3's 10 (the user, 2026-11-04). Provisional: nothing here writes species params.

    uv run --project analysis python -I analysis/experiments/level1_noise_v4.py --species beech

Run once on the v4 registration, after its commit and before the fit:
1. The hand (the Level 0 fit with [form]) on v3's three 10-seed draws (level1.noise_draws, numpy seed 20261106),
   each scored by the v4 loss: Level 0's scored terms (lateShare and height at 100 reported, not scored), the location
   terms and the spread penalty, at the registered weights (v5: lateShare scored again at the registered band).
2. Its SD over the three draws beside v3's on the same draws (0.40, docs/experiments/fits/level1-pilot-v2/noise.json).
3. A cross-check on the same trees: v3's noise.json holds each draw's contributions and each fitted descriptor's
   spread s, so the v4/v5 loss is arithmetic on it (v3's loss less the reported terms, a re-banded term rescaled,
   plus Σ w_k spread_penalty(s_k)).
   The simulated v4 loss must equal it to 1e-9 (determinism and the implementation at once).

Writes docs/experiments/fits/<out>/noise.json. The registration is not touched.
"""

import argparse
import json
import math
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np

from treesim import level1 as l1
from treesim.fit import MISSING_PENALTY
from treesim.fit_level1 import Measure, Pool, clear_scratch, level1_spec, reported_contributions, total
from treesim.host import scratch_root, workers_default
from treesim.sweep import REPO

V3_NOISE = REPO / "docs" / "experiments" / "fits" / "level1-pilot-v2" / "noise.json"
#: The user's threshold for a note (not a decision): the v4 10-seed SD above it is reported as such.
NOTE_SD = 0.6


def v4_from_v3(reg: dict, run: dict) -> float:
    """The v4 (or v5) loss of a v3 noise run, by arithmetic on its stored terms: the reported traits' terms out; a
    re-banded scalar trait's term scaled by (Level 0 band / registered band)² (v5); the spread penalty in."""
    from treesim.fit import load_spec

    c = run["contributions"]
    lo = run["loss"] - sum(c[k] for k in reg["loss"]["level0_reported"])
    bands = {t["name"]: t["band"] for t in load_spec(reg["species"], level=0).traits}
    for k, b in reg["loss"].get("level0_band", {}).items():
        lo += c[k] * ((bands[k] / b) ** 2 - 1)
    for k in reg["fitted"]:
        p = l1.spread_penalty(run["spread_s"].get(k), reg["loss"]["spread_floor"])
        lo += reg["location_weights"][k] * (MISSING_PENALTY if p is None else p)
    return lo


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", required=True)
    parser.add_argument("--workers", type=int, default=workers_default())
    parser.add_argument("--out", help="docs/experiments/fits/<out>/ (default: level1-pilot-v<version − 1>)")
    args = parser.parse_args()

    reg = l1.load(args.species)
    if reg["version"] < 4:
        sys.exit("refusing: this noise check is registration v4's and later")
    args.out = args.out or f"level1-pilot-v{reg['version'] - 1}"
    spec = level1_spec(args.species, reg)
    hand = {**spec.fixed, **spec.form}
    _, d10 = l1.noise_draws()
    v3 = json.loads(V3_NOISE.read_text())
    assert d10 == reg["seeds"]["noise"]["draws10"] == v3["draws10"], "the noise draws are not v3's"

    out_dir = REPO / "docs" / "experiments" / "fits" / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    scratch = f"{scratch_root()}/level1-noise-v4"
    clear_scratch(scratch)
    pool = Pool(args.workers)
    executor = ProcessPoolExecutor(args.workers)
    runs = []
    try:
        m = Measure(pool, spec, reg, scratch, executor)
        for i, seeds in enumerate(d10):
            t = m(f"noise10-{i}", [hand], seeds)[0][0]
            lo, c = total(spec, reg, t)
            loc = float(sum(v for k, v in c.items() if k.endswith(".loc")))
            spr = float(sum(v for k, v in c.items() if k.endswith(".spr")))
            runs.append({"seeds": seeds, "loss": lo, "level1_location": loc, "level1_spread": spr,
                         "level0": lo - loc - spr, "contributions": c,
                         "reported": reported_contributions(spec, reg, t), "season": t.get("l1.season"),
                         "trees": t.get("l1.trees"), "spread_s": {k: t.get(f"l1.{k}.s") for k in reg["fitted"]}})
            print(f"draw 10-{i}: loss {lo:.3f} (location {loc:.3f}, spread {spr:.3f}, Level 0 {lo - loc - spr:.3f}), "
                  f"season {t.get('l1.season')}", flush=True)
    finally:
        executor.shutdown()
        pool.close()
        clear_scratch(scratch)

    # The cross-check on the same trees.
    worst = 0.0
    for mine, theirs in zip(runs, v3["runs"]["10"]):
        assert mine["season"] == theirs["season"], (mine["season"], theirs["season"])
        worst = max(worst, abs(mine["loss"] - v4_from_v3(reg, theirs)))
    assert worst <= 1e-9, worst

    def stat(key):
        v = [r[key] for r in runs]
        return {"values": v, "mean": float(np.mean(v)), "sd": float(np.std(v, ddof=1))}

    keys = sorted(runs[0]["contributions"])
    v3_sd = v3["pilot_v2"]["10"]["loss"]["sd"]
    sd = stat("loss")["sd"]
    noise = {"species": args.species, "registration_version": reg["version"], "noise_seed": l1.NOISE_SEED,
             "draws10": d10, "hand": hand, "runs": runs,
             "v4": {"loss": stat("loss"), "level1_location": stat("level1_location"),
                    "level1_spread": stat("level1_spread"), "level0": stat("level0"),
                    "term_mean": {k: float(np.mean([r["contributions"][k] for r in runs])) for k in keys},
                    "term_sd": {k: float(np.std([r["contributions"][k] for r in runs], ddof=1)) for k in keys}},
             "v3_sd10": v3_sd, "v3_mean10": v3["pilot_v2"]["10"]["loss"]["mean"],
             "cross_check": {"max_abs": worst, "rule": "v3's loss on the same trees less the reported terms plus "
                                                       "Σ w_k spread_penalty(s_k), to 1e-9"},
             "note_sd": NOTE_SD, "over_note": bool(sd > NOTE_SD),
             "decision": "none: the seeds per candidate stay at 10 (the user)", "loss_rule": reg["loss"]["terms"],
             "measured": "2026-11-04, on the v4 registration before the fit"}
    (out_dir / "noise.json").write_text(json.dumps(noise, indent=1, default=float) + "\n")
    print(json.dumps({"v4_sd10": sd, "v4_mean10": noise["v4"]["loss"]["mean"], "v3_sd10": v3_sd,
                      "over_note": noise["over_note"], "cross_check": worst}, indent=1))
    if not math.isfinite(sd):
        sys.exit("the 10-seed SD is not finite")


if __name__ == "__main__":
    main()
