"""Writes the path-length probe's round files under runs/pathlength/ (#121; EXPLORATORY).

    python3 docs/experiments/code/2026-11-11-garden-pathlength/rounds.py

Names: D = the d1 levers (dark-top signal theta_q 0.15 + hornbeam c_seed 300), N = without;
T<Lx>k<k> = c1.pathLimit "trunk", B<Lx>k<k> = "base", R<Lx>k<k> = "reach", with pathScale L_x
(cells) and steepness k. Round 1 is the "length" form, round 2 on the "chance" form.
"""

import json
from pathlib import Path

OUT = Path("runs/pathlength")
OUT.mkdir(parents=True, exist_ok=True)
D = {
    "params": {"o4": {"suppressionSignal": "topLight", "topLightThreshold": 0.15}},
    "species": {"hornbeam": {"o4": {"cSeed": 300}}},
}


def cond(mode, lx, k, levers=True, form="length", floor=None):
    p = {"params": {"c1": {"pathLimit": mode, "pathForm": form, "pathScale": lx, "pathSteepness": k}}}
    if floor is not None:
        p["params"]["c1"]["pathFloor"] = floor
    if levers:
        p["params"]["o4"] = D["params"]["o4"]
        p["species"] = D["species"]
    return p


files = {
    # Rule off: the lone baseline, and the garden's two baselines (P0-D is the occupancy note's O-D0).
    "lone-base.json": {"base": {}},
    "garden-base.json": {"P0-D": D, "P0-N": {}},
    "lone-1.json": {
        "T12k4": cond("trunk", 12, 4, False),
        "T16k4": cond("trunk", 16, 4, False),
        "T24k4": cond("trunk", 24, 4, False),
        "T16k8": cond("trunk", 16, 8, False),
        "B120k4": cond("base", 120, 4, False),
    },
    "garden-1.json": {
        "P1-D-T12k4": cond("trunk", 12, 4),
        "P1-D-T16k4": cond("trunk", 16, 4),
        "P1-D-T24k4": cond("trunk", 24, 4),
        "P1-D-T16k8": cond("trunk", 16, 8),
        "P1-N-T16k4": cond("trunk", 16, 4, False),
        "P1-D-B120k4": cond("base", 120, 4),
    },
    # Round 2: the "chance" form; "reach" (R) and the from-base form (B).
    "lone-2.json": {
        "R12k8": cond("reach", 12, 8, False, "chance"),
        "R16k8": cond("reach", 16, 8, False, "chance"),
        "R20k8": cond("reach", 20, 8, False, "chance"),
        "B120k4c": cond("base", 120, 4, False, "chance"),
    },
    "garden-2.json": {
        "P2-D-R12k8": cond("reach", 12, 8, True, "chance"),
        "P2-D-R16k8": cond("reach", 16, 8, True, "chance"),
        "P2-D-R20k8": cond("reach", 20, 8, True, "chance"),
        "P2-D-R16k4": cond("reach", 16, 4, True, "chance"),
        "P2-N-R16k8": cond("reach", 16, 8, False, "chance"),
        "P2-D-B120k4c": cond("base", 120, 4, True, "chance"),
    },
    # Round 3: the ends of the reach grid.
    "garden-3.json": {
        "P3-N-R20k8": cond("reach", 20, 8, False, "chance"),
        "P3-D-R24k8": cond("reach", 24, 8, True, "chance"),
    },
    # Round 4 (after the research note's revision): a floor g_min 0.1 (f), and Choi et al. 2001's
    # exposed-margin rates (0.48, 0.19, 0.08 cells a season at 10, 20, 30 m: L_x 40, k 2) read from
    # the path length from the stem base (B) or from the tree's height (H, the whole-tree signal).
    "lone-4.json": {
        "R16k8f": cond("reach", 16, 8, False, "chance", 0.1),
        "B40k2f": cond("base", 40, 2, False, "chance", 0.1),
        "H40k2f": cond("height", 40, 2, False, "chance", 0.1),
    },
    "garden-4.json": {
        "P4-D-R16k8f": cond("reach", 16, 8, True, "chance", 0.1),
        "P4-D-B40k2f": cond("base", 40, 2, True, "chance", 0.1),
        "P4-D-H40k2f": cond("height", 40, 2, True, "chance", 0.1),
    },
}
for name, rounds in files.items():
    (OUT / name).write_text(json.dumps(rounds, indent=1))
