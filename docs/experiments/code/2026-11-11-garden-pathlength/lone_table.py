"""The lone open-grown guard's table (#121's path-length probe; EXPLORATORY, seeds 1-3): per round
and species, min-max over the seeds of, at season 100: height, DBH, crown diameter and its ratio
to Pretzsch's open-grown 95% edge at that DBH; the crown diameter where the tree reaches DBH 40 cm
and its ratio; and the feature measures the core writes (metrics.csv): round in plan (min / max of
crownWidth, crownDepth; the open-grown evidence's measure, >= 0.75 wanted), budsOutside (the box
held the crown: 0 in every season), topFifthLeaf (rounded crown: 0.15-0.30 wanted), w90 (the top's
width over the widest: ~1 is a flat cap), liveCrownBase (the bare bole), metamers.

    python3 docs/experiments/code/2026-11-11-garden-pathlength/lone_table.py runs/pathlength/lone/<round> ...
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from anchors import pretzsch95  # noqa: E402
from matched import at_dbh, load, rng  # noqa: E402

print("| round | species | height (m) | DBH (cm) | crown diameter (m) | ÷ Pretzsch 95% | at DBH 40: season, height (m), crown (m), ÷ Pretzsch | W/H | round | box held | top-fifth leaf | w90 | live crown base | metamers (k) |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for rd in sys.argv[1:]:
    rd = Path(rd)
    runs = defaultdict(list)
    for run in sorted(rd.glob("*-s*")):
        if (run / "allometry.csv").exists():
            runs[run.name.rsplit("-s", 1)[0]].append(run)
    for sp, rs in runs.items():
        last, hits, feats, held = [], [], [], 0
        for run in rs:
            series = load(run)["0"]
            last.append(series[-1])
            hits.append(at_dbh(series, 40))
            rows = [r for r in csv.DictReader(open(run / "metrics.csv")) if r["tree"] == "0"]
            held += all(float(r["budsOutside"] or 0) == 0 for r in rows)
            feats.append(rows[-1])
        p = [pretzsch95(sp, s["dbh_cm"]) for s in last]
        ratio = rng([2 * s["cr_m"] / q for s, q in zip(last, p)], 2) if p[0] else "–"
        hit = [h for h in hits if h]
        p40 = pretzsch95(sp, 40)
        at40 = (
            f"{rng([h[0] for h in hit], 0)}, {rng([h[1] for h in hit])}, {rng([h[2] for h in hit])}, "
            f"{rng([h[2] / p40 for h in hit], 2) if p40 else '–'} ({len(hit)} of {len(rs)})"
            if hit
            else f"not reached (0 of {len(rs)})"
        )
        f = lambda k: [float(r[k]) for r in feats]
        w, d, h = f("crownWidth"), f("crownDepth"), f("height")
        print(
            f"| {rd.name} | {sp} | {rng([s['height_m'] for s in last])} | {rng([s['dbh_cm'] for s in last], 0)} | "
            f"{rng([2 * s['cr_m'] for s in last])} | {ratio} | {at40} | "
            f"{rng([2 * s['cr_m'] / s['height_m'] for s in last], 2)} | {rng([min(a, b) / max(a, b) for a, b in zip(w, d)], 2)} | "
            f"{held} of {len(rs)} | {rng(f('topFifthLeaf'), 2)} | {rng(f('w90'), 2)} | {rng(f('liveCrownBase'), 2)} | "
            f"{rng([s['n'] / 1000 for s in last], 0)} |"
        )
