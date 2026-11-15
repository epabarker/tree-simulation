"""#138: what the understorey saplings' surplus buys (the sapling probe's CSVs, seeds 1-3).

    python3 -I docs/experiments/code/2026-11-15-sapling-growth/summary.py runs/sapling-138

A sapling here is a live tree 1-5 m tall (4-20 cells) at seasons 40-199. Resource v is in units of
one metamer: a bud grows floor(v) metamers once v reaches its threshold (R4: vCont 1 for an active
bud, vBreak 2 and more for a dormant one).
"""
import csv, sys, statistics as st
from collections import defaultdict
from pathlib import Path

d = Path(sys.argv[1])
rows = []
for s in (1, 2, 3):
    for r in csv.DictReader(open(d / f"s{s}.csv")):
        r = {k: (v if k == "species" else float(v)) for k, v in r.items()}
        r["seed"] = s
        rows.append(r)
sap = [r for r in rows if 4 <= r["height"] <= 20]
med = lambda v: st.median(v) if v else float("nan")
q = lambda v, p: sorted(v)[int(p * (len(v) - 1))] if v else float("nan")

print(f"sapling tree-seasons (1-5 m): {len(sap)}; trees: {len({(r['seed'], r['tree']) for r in sap})}")
print("\nby species: n | P/M median | surplus N | vBase | live buds | vBase per bud | largest bud v | top bud v / its threshold | buds at threshold | share of seasons with no growth | share of vBase left at buds below threshold")
for sp in sorted({r["species"] for r in sap}):
    v = [r for r in sap if r["species"] == sp and r["M"] > 0]
    if len(v) < 30:
        continue
    pos = [r for r in v if r["vBase"] > 0]
    print(f"{sp:9s} {len(v):5d} | {med([r['P']/r['M'] for r in v]):5.2f} | {med([r['P']-r['M'] for r in v]):6.2f} | {med([r['vBase'] for r in v]):6.2f} | {med([r['liveBuds'] for r in v]):5.0f} | {med([r['vBase']/r['liveBuds'] for r in v if r['liveBuds']]):.3f} | {med([r['maxV'] for r in v]):.3f} | {med([r['topV'] for r in v]):.3f} / {med([r['topThreshold'] for r in v]):.2f} | {med([r['reached'] for r in v]):.0f} | {sum(r['grew']==0 for r in v)/len(v):.2f} | {med([r['belowV']/r['vBase'] for r in pos]):.2f}")

print("\nall saplings, by P/M band: n | no growth | median vBase | median largest bud v | P90 largest bud v | reserve at its cap | median metamers grown")
for lo, hi in ((0, 1), (1, 2), (2, 4), (4, 6), (6, 99)):
    v = [r for r in sap if r["M"] > 0 and lo <= r["P"] / r["M"] < hi]
    if v:
        print(f"  P/M {lo}-{hi if hi < 99 else ''}: {len(v):5d} | {sum(r['grew']==0 for r in v)/len(v):.2f} | {med([r['vBase'] for r in v]):6.2f} | {med([r['maxV'] for r in v]):.3f} | {q([r['maxV'] for r in v], .9):.3f} | {sum(r['reserve'] >= 0.999*r['reserveCap'] for r in v)/len(v):.2f} | {med([r['grew'] for r in v]):.0f}")

# The accounting over all sapling tree-seasons with a surplus: where N goes.
pos = [r for r in sap if r["P"] > r["M"]]
N = sum(r["P"] - r["M"] for r in pos)
vb = sum(r["vBase"] for r in pos)
below = sum(r["belowV"] for r in pos)
print(f"\nsurplus tree-seasons: {len(pos)} of {len(sap)}. Of the summed surplus N = {N:.0f}: v_base {vb/N:.2f}; left at buds below their threshold {below/N:.2f} (lost); the rest reserve (mostly at its cap) and what growing buds spent")
print(f"metamers grown in those tree-seasons: {sum(r['grew'] for r in pos):.0f}, so {vb/max(1,sum(r['grew'] for r in pos)):.1f} units of v_base per metamer grown (1 = none wasted)")

# The threshold arithmetic: what share of saplings could have grown one metamer had v_base gone to one bud.
could = [r for r in pos if r["grew"] == 0]
print(f"\nsaplings with a surplus that grew nothing: {len(could)}; v_base >= 1 (one metamer's worth, if one bud had it): {sum(r['vBase'] >= 1 for r in could)/len(could):.2f}; >= 2: {sum(r['vBase'] >= 2 for r in could)/len(could):.2f}; median buds sharing it {med([r['liveBuds'] for r in could]):.0f}")

# Height growth of long-lived saplings: m per decade.
by = defaultdict(list)
for r in rows:
    by[r["seed"], r["tree"]].append(r)
rates = defaultdict(list)
for k, v in by.items():
    v.sort(key=lambda r: r["season"])
    sp = v[0]["species"]
    for a in v:
        b = next((x for x in v if x["season"] == a["season"] + 10), None)
        if b and 4 <= a["height"] <= 20:
            rates[sp].append((b["height"] - a["height"]) * 0.25)
print("\nheight gain of a 1-5 m sapling over the next 10 seasons, m: median [P10-P90], share with none")
for sp, v in sorted(rates.items()):
    if len(v) >= 30:
        print(f"  {sp:9s} n {len(v):5d}: {med(v):.2f} [{q(v,.1):.2f}-{q(v,.9):.2f}]  none: {sum(x <= 0 for x in v)/len(v):.2f}")
