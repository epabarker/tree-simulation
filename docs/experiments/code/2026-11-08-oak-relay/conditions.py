"""Exploratory (seeds 1-3): does treating a takeover as a relay let the open-grown oak divide its
top while keeping its spire and low limbs? Wayfinder #94.

Writes runs/oak-relay/params/<cond>-<sp>-s<seed>.json from #91's open-box base
(runs/oak-lambda/base, the 60 m open-grown box; beech is the oak's file with the species swapped).
`R` = r2.relayOvertop on (the overtop relay: a lateral whose branch tops its host's main branch
takes the host's level). Shares are dLambdaShare (ADR 0057) for pa 0 / 1 / 2.

  R           relay only, HEAD's lambda schedule (dLambda 0.04)
  Rk101       relay, dLambda 0.12 at aC 13.5, shares 1/0/1 (the limbs keep lambda)
  Rk100       relay, as Rk101 but only pa 0 falls
  Rk101r40    Rk101 with ramp 40 (#92's slow fall)
  Rd12a13     relay, every level falls (#91's early dome, d12a13, with the relay)
  k101        no relay, as Rk101 (#92's k101, re-run here as the control)
  birch, beech: head and R (no-harm checks)

    python3 docs/experiments/code/2026-11-08-oak-relay/conditions.py runs/oak-lambda/base runs/oak-relay
"""
import copy, json, os, sys

base_dir, d = sys.argv[1], sys.argv[2]
os.makedirs(f"{d}/params", exist_ok=True)
# name: (relay, dLambda, aC, ramp, shares)
OAK = {
    "head": (False, None, None, None, None),
    "R": (True, None, None, None, None),
    "Rk101": (True, 0.12, 13.51, 15, (1, 0, 1)),
    "Rk100": (True, 0.12, 13.51, 15, (1, 0, 0)),
    "Rk101r40": (True, 0.12, 13.51, 40, (1, 0, 1)),
    "Rd12a13": (True, 0.12, 13.51, 15, None),
    "k101": (False, 0.12, 13.51, 15, (1, 0, 1)),
}
OTHER = {"head": OAK["head"], "R": OAK["R"]}
for seed in (1, 2, 3):
    for sp, conds in (("oak", OAK), ("birch", OTHER), ("beech", OTHER)):
        src = "birch" if sp == "birch" else "oak"
        base = json.load(open(f"{base_dir}/open-{src}-s{seed}.json"))
        if sp == "beech":
            base["trees"][0]["species"] = "beech"
        for name, (relay, dl, ac, ramp, shares) in conds.items():
            p = copy.deepcopy(base)
            r2 = p["species"][sp]["r2"]
            if relay:
                r2["relayOvertop"] = True
            if dl is not None:
                r2["dLambda"], r2["aC"], r2["ramp"] = dl, ac, ramp
            if shares:
                for lev, s in zip(r2["levels"], shares):
                    lev["dLambdaShare"] = s
            json.dump(p, open(f"{d}/params/{name}-{sp}-s{seed}.json", "w"))
