"""Level 0 v2, night 1: the bound report's probe (the plan's §k bound rule; the user, 2026-11-04). The fit's params with
one knob moved, past its bound where asked, on seeds 1–5, measured as the fitter measures them (fit_level0.evaluate,
the v2 spec). Bounds are lifted for the probe only; nothing here is a candidate for adoption.

    uv run --project analysis python -I analysis/experiments/level0_bounds_probe.py OUT.json oak r1.mf 0.01 0.0226 0.04 0.06
"""

import json
import sys

from treesim.fit import Pool, load_spec
from treesim.fit_level0 import evaluate, summary

out, species, knob, values = sys.argv[1], sys.argv[2], sys.argv[3], [float(v) for v in sys.argv[4:]]
SEEDS = [1, 2, 3, 4, 5]
spec = load_spec(species, level=0)
fit = json.load(open(f"docs/experiments/fits/level0/{species}.json"))["fit"]["assign"]
assigns = [{**fit, knob: v} for v in values]
pool = Pool(12)
try:
    traits, _ = evaluate(pool, spec, assigns, SEEDS)
finally:
    pool.close()
res = [{"value": v, **summary(spec, a, t)} for v, a, t in zip(values, assigns, traits)]
json.dump({"species": species, "knob": knob, "fit_value": fit[knob], "seeds": SEEDS, "points": res},
          open(out, "w"), indent=1, default=float)
KEYS = ["stand.height", "stand.height100", "stand.height150", "stand.lateShare", "stand.lai", "shade.survivalLight",
        "stand.alive", "stand.alive100"] + [f"stand.tallo{t}.{i}" for t in ("H", "CR") for i in range(3)] + [
        f"stand.{m}.{i}" for m in ("dbh", "H", "CR") for i in range(3)]
print(f"{species}: {knob} (fit {fit[knob]:.4g}), seeds {SEEDS}")
print("| " + knob + " | loss | " + " | ".join(KEYS) + " |")
for r in res:
    t = {**r["traits"], **r.get("reports", {})}
    cells = ["—" if t.get(k) is None else f"{t[k]:.3g}" for k in KEYS]
    print(f"| {r['value']:.4g} | {r['loss']:.2f} | " + " | ".join(cells) + " |")
print("contributions:")
for r in res:
    print(f"  {r['value']:.4g}: " + ", ".join(f"{k} {v:.2f}" for k, v in r["contributions"].items() if v > 0.005))
