"""Bar counts per round from sweep.ts' summary.json (#121; EXPLORATORY): cap-free runs, frames in
band (200-400 drawn/ha), frames with canopy share >= 0.6, frames with no species over 70%, runs
with a canopy tree in every season after 50; per width. Also median native wall seconds.

    python3 docs/experiments/code/2026-11-10-garden-schedule/bars.py r6 sA1-q30 ...
"""

import json
import statistics as st
import sys

for rnd in sys.argv[1:]:
    s = json.load(open(f"runs/garden-schedule/{rnd}/summary.json"))["summary"]
    parts = []
    for w in (160, 66):
        x = [r for r in s if r["width"] == w]
        frames = [a for r in x for a in r["at"]]
        walls = [r["wallSeconds"] for r in x if r.get("wallSeconds") == r.get("wallSeconds") and r.get("wallSeconds")]
        parts.append(
            f"{w}: capfree {sum(r['capSeasons'] == 0 for r in x)}/3, band {sum(200 <= a['perHa'] <= 400 for a in frames)}/9, "
            f"canopy {sum(a['canopyShare'] >= 0.6 for a in frames)}/9, mix {sum(a['topShare'] <= 0.7 for a in frames)}/9, "
            f"all three {sum(200 <= a['perHa'] <= 400 and a['canopyShare'] >= 0.6 and a['topShare'] <= 0.7 for a in frames)}/9, "
            f"nogap {sum(r['minCanopy'] >= 1 for r in x)}/3, "
            f"hornbeam med {st.median([h for r in x for h in r.get('hornbeam', [])] or [float('nan')]):.2f}, "
            f"cap seasons {[r['capSeasons'] for r in x]}, wall {st.median(walls) if walls else '-'}s"
        )
    print(rnd, "|", " | ".join(parts))
