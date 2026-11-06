import json, sys, numpy as np
from collections import defaultdict
D = ["spacingCV","attachPerM","insertSD","elevSD","curvPersist","earlyFork"]
def load(sp, hmin=None):
    rs = [r for r in json.load(open(f"/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/a14/rep_{sp}.json")) if "err" not in r]
    g = defaultdict(list)
    for r in rs: g[r["tree"]].append(r)
    return g
def noise(g, filt):
    out = {}
    trees = {t: v for t, v in g.items() if filt(v)}
    for d in D:
        W, M = [], []
        for t, v in trees.items():
            x = np.array([r[d] for r in v if r[d] == r[d]])
            if len(x) >= 3: W.append(x.var(ddof=1)); M.append(x.mean())
        if len(M) < 5: out[d] = None; continue
        wv = np.mean(W); tot = np.var(M, ddof=1); k = np.mean([len([r for r in v if r[d]==r[d]]) for v in trees.values()])
        bv = max(tot - wv / k, 0)   # between-tree var of true means (mean of k repeats has noise var wv/k)
        out[d] = dict(n=len(M), within=wv**.5, between_obs=tot**.5, between_corr=bv**.5, ratio=wv**.5 / (bv**.5 if bv > 0 else np.nan), ratio_obs=wv**.5/tot**.5,
                      med1=np.median([x for v in trees.values() for x in [v[0][d]] if x==x]), medmean=np.median(M),
                      shift=np.median([x for v in trees.values() for x in [v[0][d]] if x==x]) )
    return out
if __name__ == "__main__":
    for sp in sys.argv[1:]:
        g = load(sp)
        for nm, f in (("all DBH>=0.10", lambda v: np.median([r["dbh"] for r in v]) >= 0.10),):
            o = noise(g, f)
            print(sp, nm, len([1 for v in g.values() if f(v)]), "trees")
            for d, x in o.items():
                print(f"  {d:12s}", None if x is None else {k: round(float(v), 3) for k, v in x.items()})
