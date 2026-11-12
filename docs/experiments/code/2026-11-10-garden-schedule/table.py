"""Markdown tables per round from sweep.ts' summary.json (#121; EXPLORATORY), in the schedule
note's shape: per width and seed, drawn (/ha), canopy share and top species at 100/200/300,
seasons at the cap, a canopy tree in every season after 50, hornbeam's share.

    python3 docs/experiments/code/2026-11-10-garden-schedule/table.py sA1-q30 ...
"""

import json
import sys

for rnd in sys.argv[1:]:
    d = json.load(open(f"runs/garden-schedule/{rnd}/summary.json"))
    print(f"**{rnd}** `{json.dumps(d['patch'])}`\n")
    print("| width | seed | 100 | 200 | 300 | seasons at cap | canopy after 50 | hornbeam 100/200/300 |")
    print("|---|---|---|---|---|---|---|---|")
    for r in d["summary"]:
        cells = [f"{a['drawn']} ({a['perHa']}), {a['canopyShare']:.2f}, {a['topSpecies']}" for a in r["at"]]
        hb = "/".join(f"{h:.2f}" for h in r.get("hornbeam", []))
        print(f"| {r['width']} | {r['seed']} | {' | '.join(cells)} | {r['capSeasons']} | "
              f"{'yes' if r['minCanopy'] >= 1 else 'no'} | {hb} |")
    print()
