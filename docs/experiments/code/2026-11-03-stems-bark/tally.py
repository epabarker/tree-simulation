"""Stems and bark (2026-11-03): v3's scoring (tally.py there) on a set whose sources are conditions.
A guess names the source when its normalised first guess is the condition's species (v3's `norm`).
Per source and trial: first guesses naming it, of namers × seeds, and the commonest other names.
Pass rule (blind-test.md): per namer, named on ≥ 2 of 3 seeds in each trial the source has; pooled,
a seed counts when a majority of namers (≥ 2 of 3, ≥ 3 of 5) named it. Fleiss' kappa over plates.

    python3 tally.py <set-dir> > <set-dir>/tally.md     (key.json and namer-N.md in <set-dir>)
"""

import json
import re
import sys
from collections import Counter
from pathlib import Path

SPECIES = {"beech": "beech", "hornbeam": "hornbeam", "oak": "oak", "birch": "birch"}
TRIALS = ["lone60", "lone100", "stand100"]
ORDER = ["beechM", "beechP", "beechC", "beechMI", "hornbeam", "hornbeamI", "oak", "oakI", "birch", "birchI"]


def species_of(tag: str) -> str:
    return next(v for k, v in SPECIES.items() if tag.startswith(k))


def norm(name: str) -> str:
    n = re.sub(r"[*_`]", "", name).strip().lower()
    n = re.sub(r"\(.*?\)", "", n).strip()
    for sp in ("oak", "birch", "hornbeam", "beech"):
        if sp in n:
            return sp
    if n in ("fir", "silver fir", "european silver fir"):
        return "silver fir"
    return n


def read(path: Path) -> dict:
    rows = {}
    for line in path.read_text().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        m = re.search(r"(\d+)", cells[0]) if cells else None
        if len(cells) >= 4 and m and not set(cells[0]) <= set("-: "):
            rows[f"plate-{int(m.group(1)):02d}.png"] = (cells[1], cells[3])
    return rows


d = Path(sys.argv[1])
key = json.loads((d / "key.json").read_text())
namers = sorted(key)
replies = {n: read(d / f"{n}.md") for n in namers}
guess = {}  # (source, trial, seed) -> {namer: normalised first guess}
why = {}
for n in namers:
    for plate, k in key[n].items():
        first, reason = replies[n].get(plate, ("(missing)", ""))
        guess.setdefault((k["source"], k["trial"], k["seed"]), {})[n] = norm(first)
        why.setdefault((k["source"], k["trial"]), []).append(f"{n}: {first}: {reason}")
seeds = sorted({s for (_, _, s) in guess})
tags = sorted({g[0] for g in guess})
sources = [s for s in ORDER if s in tags] + [s for s in tags if s not in ORDER]
major = len(namers) // 2 + 1

print(f"# Tally: {d.name} ({len(namers)} namers, seeds {seeds})\n")
print("| source | " + " | ".join(TRIALS) + " | namers passing | pooled |")
print("|---|" + "---|" * (len(TRIALS) + 2))
for src in sources:
    sp = species_of(src)
    cells, has = [], []
    for t in TRIALS:
        g = [guess[(src, t, s)] for s in seeds if (src, t, s) in guess]
        if not g:
            cells.append("–")
            continue
        has.append(t)
        allg = [x for gg in g for x in gg.values()]
        hit = sum(x == sp for x in allg)
        other = Counter(x for x in allg if x != sp).most_common(2)
        cells.append(f"{hit}/{len(allg)}" + (" (" + ", ".join(f"{k} {v}" for k, v in other) + ")" if other else ""))
    passing = sum(
        all(sum(guess[(src, t, s)].get(n) == sp for s in seeds) >= 2 for t in has) for n in namers
    )
    pooled_t = {t: sum(sum(v == sp for v in guess[(src, t, s)].values()) >= major for s in seeds) for t in has}
    pooled = "pass" if all(v >= 2 for v in pooled_t.values()) else "fail (" + ", ".join(f"{t} {v}/3" for t, v in pooled_t.items()) + ")"
    print(f"| {src} | " + " | ".join(cells) + f" | {passing} of {len(namers)} | {pooled} |")

# Fleiss' kappa over every plate (each namer's first guess, normalised).
items = list(guess.values())
cats = sorted({x for g in items for x in g.values()})
N, R = len(items), len(namers)
P = [(sum(sum(1 for x in g.values() if x == c) ** 2 for c in cats) - R) / (R * (R - 1)) for g in items]
pj = [sum(sum(1 for x in g.values() if x == c) for g in items) / (N * R) for c in cats]
Pbar, Pe = sum(P) / N, sum(p * p for p in pj)
print(f"\nFleiss' kappa {(Pbar - Pe) / (1 - Pe):.2f} (observed {Pbar:.2f}, chance {Pe:.2f}; {N} plates, {len(cats)} names)\n")
print("## Deciding features, beech conditions\n")
for src in [s for s in sources if s.startswith("beech")]:
    for t in TRIALS:
        if (src, t) in why:
            print(f"- **{src}, {t}:** " + " · ".join(why[(src, t)][:4]))
