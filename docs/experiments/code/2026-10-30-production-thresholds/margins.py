"""Joins two margin logs (margins-setup.ts) by assertion site: the worst margin each build reaches.

Margin is the distance past the threshold as a share of the threshold's size (|threshold|, or 1
when it is 0): positive holds, negative fails. toBeCloseTo is reported as |actual − expected|
against its tolerance 10^-digits / 2.

  python3 margins.py runs/margins/parity.jsonl runs/margins/production.jsonl
"""
import json
import sys
from collections import defaultdict


def margin(r):
    a, e, op = r["actual"], r["expected"], r["op"]
    if op == "toBeCloseTo":
        tol = 10 ** -(r.get("digits") or 2) / 2
        return (tol - abs(a - e)) / tol
    scale = abs(e) if e != 0 else 1.0
    m = (a - e) / scale if op.startswith("toBeGreater") else (e - a) / scale
    return -m if r["negate"] else m


def load(path):
    out = defaultdict(list)
    for line in open(path):
        r = json.loads(line)
        out[r["site"]].append((margin(r), r))
    return out


a, b = load(sys.argv[1]), load(sys.argv[2])
rows = []
for site in sorted(set(a) | set(b), key=lambda s: (s.split(":")[0], int(s.split(":")[1]))):
    wa = min(a.get(site, [(float("nan"), None)]), key=lambda x: x[0])
    wb = min(b.get(site, [(float("nan"), None)]), key=lambda x: x[0])
    r = (wa[1] or wb[1])
    rows.append((site, r["op"], len(a.get(site, [])), wa, wb))
print(f"{'site':34} {'op':22} {'n':>5} {'parity worst':>26} {'production worst':>26}")
for site, op, n, wa, wb in rows:
    fa = f"{wa[0]:+.3f} ({wa[1]['actual']:.4g} vs {wa[1]['expected']:.4g})" if wa[1] else "—"
    fb = f"{wb[0]:+.3f} ({wb[1]['actual']:.4g} vs {wb[1]['expected']:.4g})" if wb[1] else "—"
    flag = "  FAIL" if wb[1] and wb[0] < 0 else ("  thin" if wb[1] and wb[0] < 0.05 else "")
    print(f"{site:34} {op:22} {n:5} {fa:>26} {fb:>26}{flag}")
