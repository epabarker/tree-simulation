"""The blind test v2's tally: each namer's table (namer-N.md, their reply verbatim) against key.json.
First guesses per namer and pooled, per source and trial; blind-test.md's pass rule per namer and
pooled; agreement between namers (pairwise and Fleiss' kappa over the 54 plates).

    python3 docs/experiments/code/2026-11-02-blind-test-v2/tally.py > tally.md

A guess counts as the source's species when its normalised name equals it: any "oak" is oak, any
"birch" is birch, beech and hornbeam by name, and "fir" only as "silver fir" or a bare "fir" (a
Douglas fir is not Abies alba). The pass rule (blind-test.md): named on ≥ 2 of 3 seeds in the lone
tree at 60, at 100, and in the stand at 100. Pooled: a seed counts when ≥ 2 of the 3 namers named it.
"""

import json
import re
from collections import Counter
from itertools import combinations
from pathlib import Path

HERE = Path(__file__).parent
key = json.loads((HERE / "key.json").read_text())
TRUE = {"beech": "beech", "today": "beech", "hornbeam": "hornbeam", "oak": "oak", "birch": "birch", "fir": "silver fir"}
SOURCES = ["beech", "today", "hornbeam", "oak", "birch", "fir"]
LABEL = {"beech": "beech (branch)", "today": "beech (today)", "hornbeam": "hornbeam", "oak": "oak", "birch": "birch", "fir": "silver fir"}
TRIALS = ["lone60", "lone100", "stand100"]


def norm(name: str) -> str:
    n = re.sub(r"[*_`]", "", name).strip().lower()
    n = re.sub(r"\(.*?\)", "", n).strip()
    if "oak" in n:
        return "oak"
    if "birch" in n:
        return "birch"
    if "hornbeam" in n:
        return "hornbeam"
    if "beech" in n:
        return "beech"
    if n in ("fir", "silver fir", "european silver fir"):
        return "silver fir"
    return n


def read(n: str) -> dict:
    rows = {}
    for line in (HERE / f"{n}.md").read_text().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        m = re.search(r"(\d+)", cells[0]) if cells else None
        if len(cells) >= 4 and m and not set(cells[0]) <= set("-: "):
            rows[f"plate-{int(m.group(1)):02d}.png"] = {"first": cells[1], "second": cells[2], "why": cells[3]}
    return rows


namers = sorted(key)
# guesses[(source, trial, seed)][namer] = (first raw, first norm, second norm)
guesses: dict = {}
for n in namers:
    rows = read(n)
    assert len(rows) == 54, (n, len(rows))
    for plate, k in key[n].items():
        r = rows[plate]
        guesses.setdefault((k["source"], k["trial"], k["seed"]), {})[n] = (r["first"], norm(r["first"]), norm(r["second"]), r["why"])

out = []
p = out.append


def hit(src, trial, seed, n, which=1):
    return guesses[(src, trial, seed)][n][which] == TRUE[src]


p("## First guesses per plate\n")
p("| source | trial | seed | " + " | ".join(namers) + " |")
p("|---|---|---|" + "---|" * len(namers))
for src in SOURCES:
    for t in TRIALS:
        for s in (1, 2, 3):
            g = guesses[(src, t, s)]
            p(f"| {LABEL[src]} | {t} | {s} | " + " | ".join(("**" + g[n][1] + "**") if hit(src, t, s, n) else g[n][1] for n in namers) + " |")

p("\n## Named (first guess) per namer: seeds of 3, per trial; pass = ≥ 2 of 3 in all three\n")
p("| source | " + " | ".join(f"{n} {t}" for n in namers for t in TRIALS) + " | " + " | ".join(f"{n} pass" for n in namers) + " |")
p("|---|" + "---|" * (len(namers) * 4))
summary = {}
for src in SOURCES:
    cells, passes = [], []
    for n in namers:
        counts = [sum(hit(src, t, s, n) for s in (1, 2, 3)) for t in TRIALS]
        cells += [str(c) for c in counts]
        ok = all(c >= 2 for c in counts)
        passes.append("pass" if ok else "fail")
        summary[(src, n)] = ok
    p(f"| {LABEL[src]} | " + " | ".join(cells) + " | " + " | ".join(passes) + " |")

p("\n## Pooled: first guesses of 9 (3 namers × 3 seeds); seeds with ≥ 2 of 3 namers; the pass rule on those\n")
p("| source | lone60 /9 | lone100 /9 | stand100 /9 | lone60 seeds | lone100 seeds | stand100 seeds | pooled pass | second guess too /9 (all trials /27) |")
p("|---|---|---|---|---|---|---|---|---|")
for src in SOURCES:
    nine = [sum(hit(src, t, s, n) for s in (1, 2, 3) for n in namers) for t in TRIALS]
    seeds = [sum(sum(hit(src, t, s, n) for n in namers) >= 2 for s in (1, 2, 3)) for t in TRIALS]
    either = sum(hit(src, t, s, n) or hit(src, t, s, n, 2) for t in TRIALS for s in (1, 2, 3) for n in namers)
    p(f"| {LABEL[src]} | " + " | ".join(map(str, nine)) + " | " + " | ".join(map(str, seeds)) + f" | {'pass' if all(x >= 2 for x in seeds) else 'fail'} | {either} |")

p("\n## What each source was called (first guesses, all namers, seeds and trials)\n")
p("| source | trial | first guesses (count) |")
p("|---|---|---|")
for src in SOURCES:
    for t in TRIALS:
        c = Counter(guesses[(src, t, s)][n][1] for s in (1, 2, 3) for n in namers)
        p(f"| {LABEL[src]} | {t} | " + ", ".join(f"{k} {v}" for k, v in c.most_common()) + " |")

p("\n## Agreement between namers (normalised first guesses, 54 plates)\n")
items = list(guesses)
for a, b in combinations(namers, 2):
    agree = sum(guesses[i][a][1] == guesses[i][b][1] for i in items)
    p(f"- {a} and {b}: {agree} of {len(items)} plates ({100 * agree / len(items):.0f}%)")
all3 = sum(len({guesses[i][n][1] for n in namers}) == 1 for i in items)
p(f"- all three the same: {all3} of {len(items)}")
cats = sorted({guesses[i][n][1] for i in items for n in namers})
N, R = len(items), len(namers)
P_i = []
pj = Counter()
for i in items:
    c = Counter(guesses[i][n][1] for n in namers)
    pj.update(c)
    P_i.append((sum(v * v for v in c.values()) - R) / (R * (R - 1)))
Pbar = sum(P_i) / N
Pe = sum((v / (N * R)) ** 2 for v in pj.values())
p(f"- Fleiss' kappa: {(Pbar - Pe) / (1 - Pe):.2f} (observed {Pbar:.2f}, chance {Pe:.2f}; {len(cats)} distinct names)")
print("\n".join(out))
