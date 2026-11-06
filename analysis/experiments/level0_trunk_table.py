"""Level 0 trunk diagnosis: the probe tables (docs/experiments/2026-11-03-level0-trunk.md). Two tables per file: the
loss and its contributions, then DBH, H, z_H and z_CR at 60, 100, 150 with lateShare, LAI and the stand's survival.

  uv run --project analysis python -I analysis/experiments/level0_trunk_table.py docs/experiments/fits/level0-trunk/*.json
"""

import json
import sys

C = ["stand.height", "stand.lateShare", "stand.lai", "shade.survivalLight", "stand.talloH", "stand.talloCR", "death.stand"]


def f(x, fmt):
    return format(x, fmt) if x is not None else "–"


for path in sys.argv[1:]:
    d = json.load(open(path))
    print(f"\n### {d['species']}, {d['grid']} (seeds {d['seeds'][0]}–{d['seeds'][-1]}, {d['wall_seconds']:.0f} s)\n")
    print("| condition | loss | " + " | ".join(c.split(".", 1)[1] if not c.startswith("death") else c for c in C) + " |")
    print("|---" * (len(C) + 2) + "|")
    for c in d["conditions"]:
        k = c["contributions"]
        print(f"| {c['label']} | {c['loss']:.2f} | " + " | ".join(f(k.get(x), ".2f") for x in C) + " |")
    print()
    print("| condition | DBH cm 60/100/150 | H m 60/100/150 | z_H | z_CR | lateShare | LAI | alive 60/100 |")
    print("|---|---|---|---|---|---|---|---|")
    for c in d["conditions"]:
        t = c["traits"]
        tri = lambda key, fmt, s=1: "/".join(  # noqa: E731
            f(None if t.get(f"{key}.{i}") is None else s * t[f"{key}.{i}"], fmt) for i in range(3))
        print(f"| {c['label']} | {tri('stand.dbh', '.1f', 100)} | {tri('stand.H', '.1f')} | {tri('stand.talloH', '+.2f')}"
              f" | {tri('stand.talloCR', '+.2f')} | {f(t.get('stand.lateShare'), '.3f')} | {f(t.get('stand.lai'), '.1f')}"
              f" | {f(t.get('stand.alive'), '.2f')}/{f(t.get('stand.alive100'), '.2f')} |")
