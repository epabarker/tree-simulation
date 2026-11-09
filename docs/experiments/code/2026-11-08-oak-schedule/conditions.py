"""Exploratory (seeds 1-3): can the open-grown oak's top divide while it keeps its young spire and
wide low limbs? Wayfinder #92. Params only; the oak's species entry alone changes.

Writes runs/oak-schedule/params/<cond>-oak-s<seed>.json from #91's open-box base
(runs/oak-lambda/base, the 60 m open-grown box). r2.dLambda 0.12 unless named; shares are
dLambdaShare (ADR 0057) for pa 0 / 1 / 2 (trunk, limbs, twigs). HEAD, d12a13 and d12a30 are
reused from runs/oak-lambda (same probe binary and base).

  a18, a22    aC 18 / 22, every level falls
  a13r40      aC 13.5, ramp 40 (the fall spread over 40 seasons, HEAD 15)
  k101        aC 13.5, shares 1/0/1: the limbs' level keeps its lambda
  k001        aC 13.5, shares 0/0/1: only the twig level falls
  k101a22     k101 at aC 22
  k001d20     k001 with dLambda 0.20 (twig lambda 0.30)
  k110        aC 13.5, shares 1/1/0: twigs keep (ADR 0057's shape), trunk and limbs fall

    python3 docs/experiments/code/2026-11-08-oak-schedule/conditions.py runs/oak-lambda/base runs/oak-schedule
"""
import copy, json, os, sys

base_dir, d = sys.argv[1], sys.argv[2]
os.makedirs(f"{d}/params", exist_ok=True)
# name: (dLambda, aC, ramp, shares or None)
C = {
    "a18": (0.12, 18.0, 15, None),
    "a22": (0.12, 22.0, 15, None),
    "a13r40": (0.12, 13.51, 40, None),
    "k101": (0.12, 13.51, 15, (1, 0, 1)),
    "k001": (0.12, 13.51, 15, (0, 0, 1)),
    "k101a22": (0.12, 22.0, 15, (1, 0, 1)),
    "k001d20": (0.20, 13.51, 15, (0, 0, 1)),
    "k110": (0.12, 13.51, 15, (1, 1, 0)),
}
for seed in (1, 2, 3):
    base = json.load(open(f"{base_dir}/open-oak-s{seed}.json"))
    for name, (dl, ac, ramp, shares) in C.items():
        p = copy.deepcopy(base)
        r2 = p["species"]["oak"]["r2"]
        r2["dLambda"], r2["aC"], r2["ramp"] = dl, ac, ramp
        if shares:
            for lev, s in zip(r2["levels"], shares):
                lev["dLambdaShare"] = s
        json.dump(p, open(f"{d}/params/{name}-oak-s{seed}.json", "w"))
