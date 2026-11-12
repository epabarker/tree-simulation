"""Crown-edge advance of the lone tree by decade (#121's path-length probe; EXPLORATORY): the
gain in mean crown radius (allometry.csv cr_m) per season, cm, between 10-season snapshots, and
the tree's height at the decade's end; the median of seeds 1-3.

    python3 docs/experiments/code/2026-11-11-garden-pathlength/rates.py runs/pathlength/lone/<round> ...
"""

import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from matched import load  # noqa: E402

for rd in sys.argv[1:]:
    rd = Path(rd)
    runs = defaultdict(list)
    for run in sorted(rd.glob("*-s*")):
        if (run / "allometry.csv").exists():
            runs[run.name.rsplit("-s", 1)[0]].append(load(run)["0"])
    decades = [f"{a}–{a + 10}" for a in range(10, 100, 10)]
    print(f"\n| {rd.name}: species | " + " | ".join(decades) + " |")
    print("|---|" + "---|" * len(decades))
    for sp, seeds in runs.items():
        cells = []
        for k in range(len(decades)):
            adv = [100 * (s[k + 1]["cr_m"] - s[k]["cr_m"]) / 10 for s in seeds if len(s) > k + 1]
            h = [s[k + 1]["height_m"] for s in seeds if len(s) > k + 1]
            cells.append(f"{st.median(adv):.0f} ({st.median(h):.0f} m)" if adv else "–")
        print(f"| {sp} | " + " | ".join(cells) + " |")
