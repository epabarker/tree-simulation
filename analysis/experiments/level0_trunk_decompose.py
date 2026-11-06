"""Level 0 trunk diagnosis (docs/experiments/2026-11-03-level0-trunk.md, step 3): what the DBH cylinder's radius is made
of, from a dump of the closed stand's measured trees (cli/level0-dump.ts's format: runs/level0-parity/trees.json, or
analysis/experiments/level0_trunk_dump.ts's). For the trunk metamer at 1.3 m (cli/allometry.ts's rule):

  live   = r0·√(childless metamers above)       the live pipe area R1 charges (r1.rs: pipes, n = 2)
  memory = √((r − stressWood)² − live²)          C6's memory and the scars (c6.rs: max-ever, scar_sum_n)
  stress = stressWood                            R3's mechanical wood (r3.rs: σ above σ_target)

Shares are of the radius r (stress) and of the pipe area (r − stressWood)² (live, memory+scars).

  uv run --project analysis python -I analysis/experiments/level0_trunk_decompose.py runs/level0-parity/trees.json
"""

import json
import statistics
import sys

CELL = 0.25


def trunk_at_bh(m):
    parent, length, radius = m["parent"], m["length"], m["radius"]
    n = len(parent)
    kids = [[] for _ in range(n)]
    for i in range(1, n):
        kids[parent[i]].append(i)
    vol = [radius[i] ** 2 * length[i] for i in range(n)]
    for i in range(n - 1, 0, -1):
        vol[parent[i]] += vol[i]
    i, along = 0, 0.0
    while True:
        along += length[i] * CELL
        if along >= 1.3 or not kids[i]:
            return i, kids
        i = max(kids[i], key=lambda k: vol[k])


def decompose(t, r0):
    m = t["m"]
    bh, kids = trunk_at_bh(m)
    n = len(m["parent"])
    tips = [0] * n
    for i in range(n - 1, -1, -1):
        if not kids[i]:
            tips[i] += 1
        if i > 0:
            tips[m["parent"][i]] += tips[i]
    r = m["radius"][bh]
    sw = m["stressWood"][bh]
    pipe2 = (r - sw) ** 2
    live2 = r0**2 * tips[bh]
    return {
        "dbh": 2 * r * CELL,
        "tips": tips[bh],
        "stress_of_r": sw / r,
        "live_of_pipe": live2 / pipe2 if pipe2 > 0 else float("nan"),
        "H": t["allometry"]["height"],
    }


def main(path):
    trees = json.load(open(path))["trees"]
    rows = {}
    for t in trees:
        if not t.get("alive", True):
            continue
        r0 = t.get("r0", R0[t["species"]])
        key = (t["species"], t.get("label", ""), t["season"])
        rows.setdefault(key, []).append(decompose(t, r0))
    print("species label season n | DBH m  H m  tips | stress/r  live/pipe  (memory+scars)/pipe")
    for key in sorted(rows):
        v = rows[key]
        med = lambda k: statistics.median(x[k] for x in v)  # noqa: E731
        print(
            f"{key[0]:6} {key[1]:14} {key[2]:4} {len(v):2} | {med('dbh'):.3f} {med('H'):5.1f} {med('tips'):6.0f} |"
            f" {med('stress_of_r'):.3f}    {med('live_of_pipe'):.3f}      {1 - med('live_of_pipe'):.3f}"
        )


# The shipped species' r0 (flora-fitted.ts), for dumps that do not carry their params.
R0 = {"oak": 0.002824, "beech": 0.003096, "birch": 0.005524}

if __name__ == "__main__":
    main(sys.argv[1])
