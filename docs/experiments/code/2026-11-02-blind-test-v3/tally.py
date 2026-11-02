"""The blind test v3's tally: v2's scoring, unchanged, on a set's replies (namer-N.md, verbatim)
against its key.json, and the same tables for an earlier set beside them. First guesses per namer
and pooled, per source and trial; blind-test.md's pass rule per namer and pooled; agreement between
namers (pairwise and Fleiss' kappa over the 54 plates); the deciding features for oak and the beech
stands.

    python3 tally.py <set-dir> [<before-dir>] > <set-dir>/tally.md

<set-dir> is this folder (the baseline), or clearbole/, bark/, candidate/ or judge/. <before-dir>
holds an earlier set's key.json and namer-N.md: v2's (on claude/blind-v2, in
docs/experiments/code/2026-11-02-blind-test-v2/) for the baseline, this folder for the later sets.

A guess counts as the source's species when its normalised name equals it: any "oak" is oak, any
"birch" is birch, beech and hornbeam by name, and "fir" only as "silver fir" or a bare "fir" (a
Douglas fir is not Abies alba). The pass rule (blind-test.md): named on ≥ 2 of 3 seeds in the lone
tree at 60, at 100, and in the stand at 100. Pooled: a seed counts when a majority of the set's
namers named it (≥ 2 of 3, ≥ 3 of 5). The seeds are each set's own, read from its key.
"""

import json
import re
import sys
from collections import Counter
from itertools import combinations
from pathlib import Path

TRUE = {"beech": "beech", "today": "beech", "hornbeam": "hornbeam", "oak": "oak", "birch": "birch", "fir": "silver fir"}
SOURCES = ["beech", "today", "hornbeam", "oak", "birch", "fir"]
LABEL = {"beech": "beech", "today": "beech (today)", "hornbeam": "hornbeam", "oak": "oak", "birch": "birch", "fir": "silver fir"}
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


def read(path: Path) -> dict:
    rows = {}
    for line in path.read_text().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        m = re.search(r"(\d+)", cells[0]) if cells else None
        if len(cells) >= 4 and m and not set(cells[0]) <= set("-: "):
            rows[f"plate-{int(m.group(1)):02d}.png"] = {"first": cells[1], "second": cells[2], "why": cells[3]}
    return rows


class Set:
    """One set's namers, seeds and guesses: guesses[(source, trial, seed)][namer] = (first raw,
    first norm, second norm, why)."""

    def __init__(self, folder: Path):
        key = json.loads((folder / "key.json").read_text())
        self.namers = sorted(key, key=lambda n: int(n.split("-")[1]))
        self.seeds = sorted({k["seed"] for plates in key.values() for k in plates.values()})
        self.need = len(self.namers) // 2 + 1
        self.g: dict = {}
        for n in self.namers:
            rows = read(folder / f"{n}.md")
            assert len(rows) == 54, (folder, n, len(rows))
            for plate, k in key[n].items():
                r = rows[plate]
                self.g.setdefault((k["source"], k["trial"], k["seed"]), {})[n] = (r["first"], norm(r["first"]), norm(r["second"]), r["why"])

    def hit(self, src, trial, seed, n, which=1):
        return self.g[(src, trial, seed)][n][which] == TRUE[src]

    def per_namer(self, src):
        """Seeds named of 3 per namer and trial, and each namer's pass."""
        counts = {n: [sum(self.hit(src, t, s, n) for s in self.seeds) for t in TRIALS] for n in self.namers}
        return counts, {n: all(c >= 2 for c in counts[n]) for n in self.namers}

    def pooled(self, src):
        total = [sum(self.hit(src, t, s, n) for s in self.seeds for n in self.namers) for t in TRIALS]
        seeds = [sum(sum(self.hit(src, t, s, n) for n in self.namers) >= self.need for s in self.seeds) for t in TRIALS]
        either = sum(self.hit(src, t, s, n) or self.hit(src, t, s, n, 2) for t in TRIALS for s in self.seeds for n in self.namers)
        return total, seeds, all(x >= 2 for x in seeds), either

    def called(self, src, t):
        c = Counter(self.g[(src, t, s)][n][1] for s in self.seeds for n in self.namers)
        return ", ".join(f"{k} {v}" for k, v in c.most_common())


here = Path(sys.argv[1])
earlier = Set(Path(sys.argv[2])) if len(sys.argv) > 2 else None
before = Path(sys.argv[2]).resolve().name if earlier else ""
S = Set(here)
namers, g, seeds = S.namers, S.g, S.seeds
cell = len(namers) * len(seeds)
# This set's own labels: the key names each source's species and build.
for plates in json.loads((here / "key.json").read_text()).values():
    for k in plates.values():
        LABEL[k["source"]] = k["species"]
out = []
p = out.append

p(f"_{len(namers)} namers; seeds {', '.join(map(str, seeds))}; pooled: a seed counts when ≥ {S.need} of {len(namers)} namers named it._\n")
p("## First guesses per plate\n")
p("| source | trial | seed | " + " | ".join(namers) + " |")
p("|---|---|---|" + "---|" * len(namers))
for src in SOURCES:
    for t in TRIALS:
        for s in seeds:
            row = g[(src, t, s)]
            p(f"| {LABEL[src]} | {t} | {s} | " + " | ".join(("**" + row[n][1] + "**") if S.hit(src, t, s, n) else row[n][1] for n in namers) + " |")

p("\n## Named (first guess) per namer: seeds of 3, per trial; pass = ≥ 2 of 3 in all three\n")
p("| source | " + " | ".join(f"{n} {t}" for n in namers for t in TRIALS) + " | " + " | ".join(f"{n} pass" for n in namers) + " |")
p("|---|" + "---|" * (len(namers) * 4))
for src in SOURCES:
    counts, ok = S.per_namer(src)
    p(f"| {LABEL[src]} | " + " | ".join(str(c) for n in namers for c in counts[n]) + " | " + " | ".join("pass" if ok[n] else "fail" for n in namers) + " |")

p(f"\n## Pooled: first guesses of {cell} ({len(namers)} namers × {len(seeds)} seeds); seeds named by ≥ {S.need} of {len(namers)}; the pass rule on those\n")
p(f"| source | lone60 /{cell} | lone100 /{cell} | stand100 /{cell} | lone60 seeds | lone100 seeds | stand100 seeds | pooled pass | second guess too /{3 * cell} |")
p("|---|---|---|---|---|---|---|---|---|")
for src in SOURCES:
    total, sd, ok, either = S.pooled(src)
    p(f"| {LABEL[src]} | " + " | ".join(map(str, total)) + " | " + " | ".join(map(str, sd)) + f" | {'pass' if ok else 'fail'} | {either} |")

p("\n## What each source was called (first guesses, all namers and seeds)\n")
p("| source | trial | first guesses (count) |")
p("|---|---|---|")
for src in SOURCES:
    for t in TRIALS:
        p(f"| {LABEL[src]} | {t} | {S.called(src, t)} |")

if earlier:
    E = earlier
    ecell = len(E.namers) * len(E.seeds)
    p(f"\n## Beside {before}: first guesses named, per trial ({before}, of {ecell} → this set, of {cell})\n")
    p(f"| source | lone60 | lone100 | stand100 | per-namer passes, {before} | per-namer passes, this set | pooled, {before} | pooled, this set |")
    p("|---|---|---|---|---|---|---|---|")
    for src in SOURCES:
        a, b = E.pooled(src), S.pooled(src)
        pa, pb = E.per_namer(src)[1], S.per_namer(src)[1]
        cells = " | ".join(f"{x} → {y}" for x, y in zip(a[0], b[0]))
        p(f"| {LABEL[src]} | {cells} | {sum(pa.values())} of {len(E.namers)} | {sum(pb.values())} of {len(namers)} | {'pass' if a[2] else 'fail'} | {'pass' if b[2] else 'fail'} |")
    p(f"\n## Beside {before}: what each was called ({before} | this set)\n")
    p(f"| source | trial | {before} | this set |")
    p("|---|---|---|---|")
    for src in SOURCES:
        for t in TRIALS:
            p(f"| {LABEL[src]} | {t} | {E.called(src, t)} | {S.called(src, t)} |")

p(f"\n## Agreement between namers (normalised first guesses, {len(g)} plates)\n")
items = list(g)
for a, b in combinations(namers, 2):
    agree = sum(g[i][a][1] == g[i][b][1] for i in items)
    p(f"- {a} and {b}: {agree} of {len(items)} plates ({100 * agree / len(items):.0f}%)")
alln = sum(len({g[i][n][1] for n in namers}) == 1 for i in items)
p(f"- all {len(namers)} the same: {alln} of {len(items)}")
same_seeds = sum(len({g[(src, t, s)][n][1] for s in seeds}) == 1 for src in SOURCES for t in TRIALS for n in namers)
p(f"- a namer's first guess the same on all three seeds of a cell: {same_seeds} of {len(SOURCES) * len(TRIALS) * len(namers)}")
cats = sorted({g[i][n][1] for i in items for n in namers})
N, R = len(items), len(namers)
P_i = []
pj = Counter()
for i in items:
    c = Counter(g[i][n][1] for n in namers)
    pj.update(c)
    P_i.append((sum(v * v for v in c.values()) - R) / (R * (R - 1)))
Pbar = sum(P_i) / N
Pe = sum((v / (N * R)) ** 2 for v in pj.values())
p(f"- Fleiss' kappa: {(Pbar - Pe) / (1 - Pe):.2f} (observed {Pbar:.2f}, chance {Pe:.2f}; {len(cats)} distinct names)")

p("\n## Deciding features (verbatim): oak, and the beech stands\n")
for src, trials in (("oak", TRIALS), ("beech", ["stand100"]), ("today", ["stand100"])):
    for t in trials:
        p(f"\n**{LABEL[src]}, {t}**\n")
        for s in seeds:
            for n in namers:
                first, _, _, why = g[(src, t, s)][n]
                p(f"- seed {s}, {n}: {first} — {why}")
print("\n".join(out))
