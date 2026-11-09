"""Exploratory (seeds 1-3): does a falling lambda fill the open-grown oak's flank? Wayfinder #91.

Writes runs/oak-lambda/params/<cond>-<sp>-s<seed>.json from the 60 m open-box params
(code/2026-11-08-open-box/params.ts, dumped to runs/oak-lambda/base). Oak: r2.dLambda
0.04 (HEAD) / 0.08 / 0.12 at aC 13.5 (HEAD) or 30, each without and with c3.sink turgorLength
at s* 0.5 friction-heavy (#89's fric50: g 0.002, r 0.01 MPa/m, psiCrit -0.82). Birch: its own
schedule, HEAD and fric50 (psiCrit -0.79), as the contrast.

    python3 docs/experiments/code/2026-11-08-oak-lambda/conditions.py runs/oak-lambda
"""
import copy, json, os, sys

d = sys.argv[1]
os.makedirs(f"{d}/params", exist_ok=True)
PSI = {"oak": -0.82, "birch": -0.79}
OAK = {"head": None}
for dl in (8, 12):
    for ac in (13, 30):
        OAK[f"d{dl:02d}a{ac}"] = (dl / 100, 13.51 if ac == 13 else 30.0)
for sp, conds in (("oak", OAK), ("birch", {"head": None})):
    for seed in (1, 2, 3):
        base = json.load(open(f"{d}/base/open-{sp}-s{seed}.json"))
        for name, lam in conds.items():
            for fric in (False, True):
                p = copy.deepcopy(base)
                s = p["species"][sp]
                if lam:
                    s["r2"]["dLambda"], s["r2"]["aC"] = lam
                if fric:
                    s["c3"] = {**s["c3"], "sink": "turgorLength", "sinkG": 0.002, "sinkR": 0.01,
                               "psiCrit": PSI[sp]}
                cond = name + ("F" if fric else "")
                json.dump(p, open(f"{d}/params/{cond}-{sp}-s{seed}.json", "w"))
