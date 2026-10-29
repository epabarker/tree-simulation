"""I2's m and passes' cost from runs.sh's --bench series: 3D (this commit) over 2D (the tag).

m = live metamers 3D / 2D at seasons 20, 30, 40, 60, 100. The passes' cost is μs per metamer per
season (every phase but light), the mean over the 10 seasons before each report, as the prototype's
note measured it; light in ms per season over the same windows.

  python3 docs/experiments/code/2026-10-30-i2/analyze.py runs/i2-timing
"""
import json
import sys
from pathlib import Path

d = Path(sys.argv[1] if len(sys.argv) > 1 else "runs/i2-timing")
AT = [20, 30, 40, 60, 100]


def series(name):
    s = json.loads((d / name).read_text())["series"]
    return {int(r[0]): r for r in s}


def window(s, end):
    rows = [s[k] for k in range(end - 9, end + 1)]
    us = sum(1000 * r[3] / max(1, r[1]) for r in rows) / len(rows)
    light = sum(r[2] for r in rows) / len(rows)
    return us, light


for rules in ["proto", "full"]:
    two = series(f"2d-{rules}.json")
    print(f"\n## {rules}: 2D metamers " + ", ".join(f"s{k} {int(two[k][1])}" for k in AT))
    print("| look | 3D metamers (s20, 30, 40, 60, 100) | m | 3D μs/metamer (11–20, 31–40, 51–60, 91–100) | 2D μs/metamer | ratio | 3D light ms (same windows) |")
    print("|---|---|---|---|---|---|---|")
    w2 = [window(two, e)[0] for e in (20, 40, 60, 100)]
    for look in ["interior", "edge", "hedgerow", "fade"]:
        f = d / f"3d-{rules}-{look}.json"
        if not f.exists():
            continue
        th = series(f.name)
        m = [th[k][1] / two[k][1] for k in AT]
        w3 = [window(th, e) for e in (20, 40, 60, 100)]
        print(
            f"| {look} | {', '.join(str(int(th[k][1])) for k in AT)} | {', '.join(f'{x:.1f}' for x in m)} | "
            f"{', '.join(f'{u:.2f}' for u, _ in w3)} | {', '.join(f'{u:.2f}' for u in w2)} | "
            f"{', '.join(f'{a[0] / b:.1f}' for a, b in zip(w3, w2))} | {', '.join(f'{l:.0f}' for _, l in w3)} |"
        )
