"""The light-memory probe's M2 miss read per seed (docs/experiments/2026-11-16-understorey-ramp-memory-probe.md, §M2):
cap seasons at 66 cells, s3d against each memory arm, paired by seed. Reads the light-memory probe's runs only.

    python3 -I docs/experiments/code/2026-11-16-understorey-ramp-memory-probe/m2.py <runs/light-memory-probe>

Prints, per memory arm and width: the medians, the paired differences, the sign test (two-sided, exact), the
sign-flip permutation test on the mean difference (exact, 2^20), and a bootstrap 95% interval (10,000 resamples of
seeds, seed 1) for the difference of medians and for the median of the paired differences.
"""

import json
import random
import statistics as st
import sys
from math import comb
from pathlib import Path

root = Path(sys.argv[1])
SEEDS = range(1, 21)


def caps(arm, width):
    return [json.loads((root / arm / f"w{width}-s{s}" / "run.json").read_text())["meta"]["capSeasons"] for s in SEEDS]


def sign_test(d):
    pos, neg = sum(x > 0 for x in d), sum(x < 0 for x in d)
    n, k = pos + neg, min(pos, neg)
    return pos, neg, min(1.0, 2 * sum(comb(n, i) for i in range(k + 1)) / 2**n)


def flip_test(d):
    obs = abs(sum(d))
    n, hits = len(d), 0
    for mask in range(2**n):
        s = sum(x if mask >> i & 1 else -x for i, x in enumerate(d))
        hits += abs(s) >= obs - 1e-9
    return hits / 2**n


def boot(a, b, rng, n=10_000):
    idx = list(range(len(a)))
    dm, pm = [], []
    for _ in range(n):
        r = [rng.choice(idx) for _ in idx]
        dm.append(st.median(b[i] for i in r) - st.median(a[i] for i in r))
        pm.append(st.median(b[i] - a[i] for i in r))
    q = lambda xs: (sorted(xs)[int(0.025 * n)], sorted(xs)[int(0.975 * n) - 1])  # noqa: E731
    return q(dm), q(pm)


for width in (66, 160):
    base = caps("s3d", width)
    print(f"\nwidth {width}: s3d per seed {base} (median {st.median(base)})")
    for arm in ("s3dT25", "s3dT5", "s3dT10"):
        x = caps(arm, width)
        d = [b - a for a, b in zip(base, x)]
        pos, neg, p = sign_test(d)
        (dlo, dhi), (plo, phi) = boot(base, x, random.Random(1))
        print(f"- {arm}: per seed {x} (median {st.median(x)}); difference of medians {st.median(x) - st.median(base):+g}"
              f" [boot 95% {dlo:+g}, {dhi:+g}]; paired d = {d}; median d {st.median(d):+g} [boot {plo:+g}, {phi:+g}],"
              f" mean d {st.mean(d):+.2f}; worse in {pos}, better in {neg}, equal in {20 - pos - neg}; sign test p {p:.2f};"
              f" sign-flip p {flip_test(d):.2f}")
