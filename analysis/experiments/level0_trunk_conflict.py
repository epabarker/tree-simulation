"""Level 0 trunk diagnosis (docs/experiments/2026-11-03-level0-trunk.md, step 4, rival "target conflict"): where the
yield-table trees the loss also scores sit in Tallo's band. A stand tree that met stand.height and stand.lateShare at the
yield tables' own H/D would score this z_H; if it is above the gate's T, the scored height anchors and Tallo's H|D
cannot both be met, and positive z_H is the targets', not the trunk's.

Pairs from the repo's targets files: H at 60 (stand.height's source), H at 100 = H60 × stand.lateShare, D = H / (H/D)
with H/D from stand.slenderness's source (top height over Weise's diameter at 60; the range given at 100).

  uv run --project analysis python -I analysis/experiments/level0_trunk_conflict.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from treesim import tallo  # noqa: E402

T = tallo.load_targets(tallo.TARGETS_V1)["species"]  # v1: what the diagnosis read
# species: (season, H m, H/D lo, H/D hi)
PAIRS = {
    "oak": [(60, 18.1, 74, 76), (60, 21.0, 74, 76), (100, 18.1 * 1.31, 59, 70), (100, 21.0 * 1.31, 59, 70)],
    "beech": [(60, 20.0, 78, 83), (60, 22.0, 78, 83), (100, 20.0 * 1.43, 59, 82), (100, 22.0 * 1.43, 59, 82)],
}

print("species season  H m  H/D  DBH cm | z_H   | gate T")
for s, pairs in PAIRS.items():
    for season, h, lo, hi in pairs:
        for hd in (lo, hi):
            d = 100 * h / hd
            z = tallo.z_score(T[s]["H"], d, h)
            print(f"{s:6} {season:5} {h:5.1f} {hd:4} {d:6.1f} | {z:+.2f} | {T[s]['control']['T']:.2f}")
