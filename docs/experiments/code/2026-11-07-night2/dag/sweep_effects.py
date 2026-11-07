"""Sweep effects: per species x param x step (m10 / p10) and season, the median paired change
(patched - base, same seed) in D, W/H and H over the seeds both have, and flags.

Rerunnable while the sweep fills in: python3 -I sweep_effects.py <sweep dir> <out csv>
"""

import csv
import json
import statistics as st
import sys
from collections import defaultdict
from pathlib import Path

SW = Path(sys.argv[1])
OUT = Path(sys.argv[2])
BANDS = {  # real bands (Level 0 references): D and W/H
    "beech": dict(D=(0.22, 0.77), WH=(0.55, 0.73)),
    "hornbeam": dict(D=(0.07, 1.04), WH=(0.51, 0.73)),
    "birch": dict(D=(0.07, 0.61), WH=(0.38, 0.66)),
    "oak": dict(D=(0.16, 0.59), WH=(0.55, 0.82)),
}

rows = defaultdict(dict)  # (tag) -> {(seed, season): rec}
for f in (SW / "res").glob("*.json"):
    for r in json.loads(f.read_text()):
        rows[r["tag"]][(r["seed"], r["season"])] = r
patch = {}
for line in (SW / "jobs.tsv").read_text().splitlines():
    tag, sp, seed, pj = line.split("\t")
    patch[tag] = json.loads(pj)
base_vals = json.loads((SW / "values.json").read_text())


def inside(v, band):
    return band[0] <= v <= band[1]


out = []
for tag in sorted(rows):
    if tag.endswith("_base"):
        continue
    sp, rest = tag.split("_", 1)
    pname, step = rest.rsplit("_", 1)
    pname = pname.replace("-", ".")
    base = rows.get(f"{sp}_base", {})
    pv = next(iter(patch.get(tag, {}).values()), "")
    for season in (100, 150):
        seeds = sorted(s for (s, se) in rows[tag] if se == season and (s, season) in base)
        if not seeds:
            continue
        rec = dict(species=sp, param=pname, step=step, season=season, base_value=base_vals.get(sp, {}).get(pname, ""),
                   patched_value=pv, n_seeds=len(seeds))
        ident = True
        for m in ("D", "WH", "H"):
            b = [base[(s, season)][m] for s in seeds]
            p = [rows[tag][(s, season)][m] for s in seeds]
            d = [x - y for x, y in zip(p, b)]
            ident &= all(abs(x) < 1e-12 for x in d)
            rec[f"d{m}_median"] = round(st.median(d), 4)
            rec[f"base_{m}_median"] = round(st.median(b), 4)
            rec[f"base_{m}_spread"] = round(max(b) - min(b), 4)
            rec[f"{m}_median"] = round(st.median(p), 4)
            # effect larger than the base's own seed spread: worth a closer look at N >= 20
            rec[f"d{m}_beyond_spread"] = abs(st.median(d)) > (max(b) - min(b))
        rec["identical_to_base"] = ident
        flags = []
        if sp in BANDS:
            for m in ("D", "WH"):
                bi, pi = inside(rec[f"base_{m}_median"], BANDS[sp][m]), inside(rec[f"{m}_median"], BANDS[sp][m])
                if bi != pi:
                    noisy = "" if rec[f"d{m}_beyond_spread"] else " (within seed spread)"
                    flags.append(f"{m} {'leaves' if bi else 'enters'} band{noisy}")
        rec["band_flag"] = "; ".join(flags)
        out.append(rec)

with OUT.open("w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(out[0]))
    w.writeheader()
    w.writerows(out)
print(f"{len(out)} rows, species: {sorted({r['species'] for r in out})}")
dead = sorted({(r["species"], r["param"]) for r in out if r["identical_to_base"]})
print("identical to base (both steps, all seeds) candidates:")
by = defaultdict(set)
for r in out:
    by[(r["species"], r["param"])].add(r["identical_to_base"])
for k, v in sorted(by.items()):
    if v == {True}:
        print("  ", *k)
for r in out:
    if r["band_flag"]:
        print("band:", r["species"], r["param"], r["step"], r["season"], r["band_flag"])

# Monotonicity: per species x param x season, the sign of (p10 - m10) per seed, for D.
pairs = defaultdict(dict)
for tag in rows:
    if tag.endswith("_base"):
        continue
    sp, rest = tag.split("_", 1)
    pname, step = rest.rsplit("_", 1)
    for (seed, season), r in rows[tag].items():
        pairs[(sp, pname, season, seed)][step] = r["D"]
agree = defaultdict(list)
for (sp, pname, season, seed), v in pairs.items():
    if "m10" in v and "p10" in v:
        agree[(sp, pname, season)].append(v["p10"] - v["m10"])
full = {k: v for k, v in agree.items() if len(v) == 3}
cons = sum(1 for v in full.values() if all(x > 0 for x in v) or all(x < 0 for x in v))
print(f"D: p10 - m10 has one sign on all 3 seeds in {cons} of {len(full)} species x param x season cases")
