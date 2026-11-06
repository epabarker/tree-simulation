"""Crown base and bole (2026-11-05; docs/experiments/2026-11-05-crown-base-and-bole.md): the two probes, seeds 1-5.

- sinuosity: the trunk's set point (r2.levels.0.setPoint, beech 40°: the diagnosed rule) at ×1, ×0.5 and ×0 at the
  hand params (pilots' `hand.assign`). trunkTortuosity05 and crownBase80 from crownbase_sim (season by v5's size
  match), and the Level 0 terms from fit_level0.evaluate.
- limbloss (ADR 0052's probe): c5.Trel ×1, ×3, ×10 and O2 at ADR 0013's settings (pAbr 0.5, a world patch), at the
  hand and at pilot v4's finalist. crownBase80/70/90 as z against BioDiv (crownbase_sim), z_CR and z_H at 60/100/150
  and deaths of 12 at 150 from crown_dump.ts (crown_levers.zs), LAI, talloH and the loss terms from fit_level0.evaluate
  for the assign cells; O2's LAI is the dump's at 60 (labelled), since a world patch cannot reach the evaluator.
Nothing here is a candidate for adoption: neither knob is a fitted knob (ADR 0029, 0032), and nothing is fitted to CR.

- phototropism (added after sinuosity's own evidence): C4's ξ at ×1, ×0.5, ×0 at the hand, a world patch.

  uv run --project analysis python -I analysis/experiments/crownbase_probes.py sinuosity|phototropism|limbloss
"""

import json
import math
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "analysis"))

import crown_levers as cl  # noqa: E402
import crown_overlap as co_  # noqa: E402
import crownbase_sim as cs  # noqa: E402

from treesim.fit import Pool, load_spec  # noqa: E402
from treesim.fit_level0 import evaluate, summary  # noqa: E402

SEEDS = [1, 2, 3, 4, 5]
OUT = cs.OUT
co_.DUMPS = OUT / "crown-dumps"  # crown_overlap.run_job writes here


def level0(conditions: dict[str, dict], name: str) -> dict:
    """fit_level0.evaluate on seeds 1-5 for every assign-only condition (cached in runs/crown-base/NAME-eval.json)."""
    store = OUT / f"{name}-eval.json"
    res = json.loads(store.read_text()) if store.exists() else {}
    todo = [k for k, c in conditions.items() if not c.get("patch") and k not in res]
    if todo:
        spec = load_spec("beech", level=0)
        pool = Pool(12)
        try:
            traits, _ = evaluate(pool, spec, [conditions[k]["assign"] for k in todo], SEEDS)
        finally:
            pool.close()
        for k, t in zip(todo, traits):
            res[k] = summary(spec, conditions[k]["assign"], t)
        store.write_text(json.dumps(res, default=float, indent=1))
    return res


def described(conditions: dict[str, dict], lone: bool = False) -> dict:
    res = cs.run(conditions, SEEDS, lone=[50], describe_lone=lone)
    real = cs.real_distribution()
    out = {}
    for label, r in res.items():
        season, by_seed = r["season"], r["seeds"]
        trees = cs.stand_trees(by_seed, season) if season else []
        lone = [t for rows in by_seed.values() for t in rows if t["trial"] == "lone" and t["alive"]]
        out[label] = {"season": season, "trees": len(trees),
                      "z": {k: cs.zrow(trees, real, k) for k in cs.NAMES},
                      "raw": {k: float(np.nanmedian([t[k] for t in trees])) if trees else math.nan
                              for k in cs.NAMES + list(cs.DIAGNOSTIC) + list(cs.SWAY)},
                      "lone": {k: float(np.nanmedian([t[k] for t in lone])) if lone else math.nan
                               for k in ("trunkTortuosity05", "trunkTortuosity1", "crownBase80") + cs.SWAY}}
    return out


def crown(conditions: dict[str, dict]) -> dict:
    jobs = {f"{label}/{s}": {"species": "beech", "seed": s, "assign": c.get("assign", {}), "patch": c.get("patch", {}),
                             "checkParams": cl.CHECK} for label, c in conditions.items() for s in SEEDS}
    for k in list(jobs):
        if not jobs[k]["patch"]:
            del jobs[k]["patch"]
    co_.run_jobs(jobs, workers=8)
    curves = load_spec("beech", level=0).tallo
    out = {}
    for label in conditions:
        rows = [cl.zs(json.loads((co_.DUMPS / f"{label}/{s}.json").read_text()), curves, co_.MEASURED) for s in SEEDS]
        out[label] = {k: float(np.nanmean([r[k] for r in rows if r.get(k) is not None]))
                      for k in rows[0] if k != "dead150"}
        out[label]["dead150"] = float(np.mean([r["dead150"] for r in rows]))
    return out


def sinuosity() -> None:
    hand = cs.hand_assign()
    sp = 40.0  # beech's r2.levels.0.setPoint (flora-fitted.ts; the hand does not assign it)
    conditions = {f"setPoint0x{f}": {"assign": {**hand, "r2.levels.0.setPoint": f * sp}} for f in (1.0, 0.5, 0.0)}
    d = described(conditions, lone=True)
    ev = level0(conditions, "sinuosity")
    (OUT / "sinuosity.json").write_text(json.dumps({"described": d, "level0": ev}, default=float, indent=1))
    for k in conditions:
        z = d[k]["z"]
        print(k, "season", d[k]["season"], "n", d[k]["trees"],
              f"trunkTort05 {d[k]['raw']['trunkTortuosity05']:.4f} (z {z['trunkTortuosity05']['z']:+.2f})",
              f"1m {d[k]['raw']['trunkTortuosity1']:.4f} sway {d[k]['raw']['trunkSway']:.3f} m",
              f"lone(50) tort {d[k]['lone']['trunkTortuosity05']:.4f} sway {d[k]['lone']['trunkSway']:.3f}",
              f"cb80 z {z['crownBase80']['z']:+.2f}", "loss", round(ev[k]["loss"], 2),
              {t: round(v, 2) for t, v in ev[k]["contributions"].items() if v})


def phototropism() -> None:
    """Added after the registered sinuosity probe, whose own run showed the stand's sway is neighbour-dependent (lone
    0.12 m against stand 0.50 m): C4's light term ξ (c4.rs:46-54; 0.3, world-level, so a patch) at ×1, ×0.5, ×0 at the
    hand. Level 0 terms come from the crown dump (z_H, z_CR, LAI at 60, deaths), not the evaluator."""
    hand = cs.hand_assign()
    conditions = {f"xi{f}": {"assign": hand, "patch": {"c4": {"xi": f * 0.3}}} for f in (1.0, 0.5, 0.0)}
    d = described(conditions, lone=True)
    cr = crown(conditions)
    (OUT / "phototropism.json").write_text(json.dumps({"described": d, "crown": cr}, default=float, indent=1))
    for k in conditions:
        print(k, "season", d[k]["season"], "n", d[k]["trees"], f"trunkTort05 {d[k]['raw']['trunkTortuosity05']:.4f}",
              f"sway {d[k]['raw']['trunkSway']:.3f} m lone(50) sway {d[k]['lone']['trunkSway']:.3f}",
              f"cb80 z {d[k]['z']['crownBase80']['z']:+.2f}", "zH", [round(cr[k][f"zH.{i}"], 2) for i in range(3)],
              "zCR", [round(cr[k][f"zCR.{i}"], 2) for i in range(3)], f"LAI60 {cr[k]['lai60']:.2f}",
              "dead150", cr[k]["dead150"])


def limbloss() -> None:
    sets = {"hand": cs.hand_assign(), "v4": cs.fit_assign("v4")}
    conditions = {}
    for s, a in sets.items():
        t = a["c5.Trel"]
        for f in (1, 3, 10):
            conditions[f"{s}-Trel{f}"] = {"assign": {**a, "c5.Trel": f * t}}
        conditions[f"{s}-O2"] = {"assign": a, "patch": {"o2": {"enabled": True, "pAbr": 0.5}}}
    d = described(conditions)
    cr = crown(conditions)
    ev = level0(conditions, "limbloss")
    (OUT / "limbloss.json").write_text(json.dumps({"described": d, "crown": cr, "level0": ev}, default=float, indent=1))
    for k in conditions:
        z = d[k]["z"]
        e = ev.get(k)
        lai = e["traits"]["stand.lai"] if e else cr[k]["lai60"]
        print(k, "season", d[k]["season"], f"cb80 {d[k]['raw']['crownBase80']:.3f} z {z['crownBase80']['z']:+.2f}",
              f"(70 {z['crownBase70']['z']:+.2f}, 90 {z['crownBase90']['z']:+.2f})",
              "zCR", [round(cr[k][f"zCR.{i}"], 2) for i in range(3)], f"LAI {lai:.2f} z {(lai - 8.4) / 1.5:+.2f}",
              "talloH", round(e["traits"]["stand.talloH.0"], 2) if e else "-", "dead150", cr[k]["dead150"],
              "zH", [round(cr[k][f"zH.{i}"], 2) for i in range(3)])


if __name__ == "__main__":
    {"sinuosity": sinuosity, "phototropism": phototropism, "limbloss": limbloss}[sys.argv[1]]()
