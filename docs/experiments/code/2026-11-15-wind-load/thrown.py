"""Who R3 throws (#133's probe, a re-read of its runs; EXPLORATORY, seeds 1-3, no new simulation).

R3's windthrow (r3.rs, ADR 0027): in a storm season, a tree is thrown with chance
THROW * stormLoad * min(1, H/100 cells)^2 * slenderness_risk(H / (2 r_base)), the ramp 0 up to
H/D 80, 1 at 110 and 2 from 140, over the root metamer's radius after this season's stress wood.
So a throw needs a storm and H/D > 80. This reads, for every planted tree at 160 cells that dies
thrown (its death row's `broken` is the whole tree), its last living row: H/D (the core's
`slenderness`), height, whether it is a canopy tree (over half the top height), and whether the
season was a storm. Beside that, the exposure: living planted trees in storm seasons by H/D bin,
and the throw rate per bin.

    python3 docs/experiments/code/2026-11-15-wind-load/thrown.py [arm ...]
"""

import csv
import json
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3] / "runs" / "probe"
SEEDS = (1, 2, 3)
CELL = 0.25
BINS = ((0, 60), (60, 80), (80, 95), (95, 110), (110, 1e9))
STAND_BAND = (74, 98)  # hornbeam's stand.slenderness


def run_dir(arm, seed):
    if arm == "base":
        return ROOT / "129-base-hornbeam" / "head" / f"garden160-seed{seed}"
    return ROOT / f"133-{arm}-hornbeam" / "patch" / f"garden160-seed{seed}"


def read(arm, storms):
    thrown, exposure = [], defaultdict(lambda: [0, 0])  # bin -> [tree-storm-seasons, throws]
    for seed in SEEDS:
        run = run_dir(arm, seed)
        stand = list(csv.DictReader(open(run / "stand.csv")))
        n = int(stand[0]["live"])
        top = {int(r["season"]): float(r["topHeight100"]) for r in stand}
        last = {}
        for r in csv.DictReader(open(run / "metrics.csv")):
            t, s = int(r["tree"]), int(r["season"])
            if t >= n:
                continue
            if r["alive"] == "1":
                last[t] = r
                continue
            if t not in last or last[t] is None:
                continue
            lv = last[t]
            last[t] = None
            if float(r["broken"] or 0) <= 0:
                continue  # not thrown (O4's draw or R1's starvation)
            h = float(lv["height"])
            thrown.append({
                "seed": seed, "tree": t, "season": s, "hd": float(lv["slenderness"]), "h_m": h * CELL,
                "canopy": h > top.get(int(lv["season"]), 0) / 2, "storm": s in storms[seed],
            })
        # exposure: each living planted tree's H/D in the season before a storm
        prev = {}
        for r in csv.DictReader(open(run / "metrics.csv")):
            t, s = int(r["tree"]), int(r["season"])
            if t >= n:
                continue
            if s in storms[seed] and t in prev:
                hd = prev[t]
                b = next(i for i, (lo, hi) in enumerate(BINS) if lo <= hd < hi)
                exposure[b][0] += 1
                if r["alive"] != "1" and float(r["broken"] or 0) > 0:
                    exposure[b][1] += 1
            if r["alive"] == "1":
                prev[t] = float(r["slenderness"])
            else:
                prev.pop(t, None)
    return thrown, exposure


def main():
    arms = sys.argv[1:] or ["base", "H4k8", "H4k8W1", "H4k8W2", "H4k8W4", "H4k8L2", "H4k8S2", "W1", "W2", "W4", "L2", "S2"]
    storms = {int(k): set(v) for k, v in json.load(open(ROOT / "133-storms.json")).items()}
    print("| arm | thrown | in a storm season | canopy trees | H/D at the last living season: median (range) | "
          "H/D ≤ 80 | in hornbeam's stand band 74–98 | height (m), median |")
    print("|---|---|---|---|---|---|---|---|")
    expo = {}
    for arm in arms:
        th, ex = read(arm, storms)
        expo[arm] = ex
        hd = sorted(x["hd"] for x in th)
        med = hd[len(hd) // 2] if hd else None
        band = sum(STAND_BAND[0] <= x <= STAND_BAND[1] for x in hd)
        hs = sorted(x["h_m"] for x in th)
        print(f"| {arm} | {len(th)} | {sum(x['storm'] for x in th)} | {sum(x['canopy'] for x in th)} | "
              f"{f'{med:.0f} ({hd[0]:.0f}–{hd[-1]:.0f})' if hd else '–'} | {sum(x <= 80 for x in hd)} | {band} | "
              f"{f'{hs[len(hs) // 2]:.1f}' if hs else '–'} |")
    print()
    print("Exposure: living planted trees going into a storm season, by H/D the season before; throws / tree-storms.\n")
    print("| arm | " + " | ".join(f"H/D {lo}–{hi if hi < 1e9 else '∞'}" for lo, hi in BINS) + " |")
    print("|---|" + "---|" * len(BINS))
    for arm in arms:
        ex = expo[arm]
        print(f"| {arm} | " + " | ".join(f"{ex[b][1]}/{ex[b][0]}" for b in range(len(BINS))) + " |")


main()
