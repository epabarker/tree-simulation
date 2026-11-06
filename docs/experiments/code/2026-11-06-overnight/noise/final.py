import json, sys, numpy as np
from collections import defaultdict
sys.path.insert(0, "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/a14")
D = ["spacingCV","attachPerM","insertSD","elevSD","curvPersist","earlyFork"]
S="/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/a14"
def load(sp):
    g=defaultdict(list)
    for r in json.load(open(f"{S}/rep_{sp}.json")):
        if "err" not in r: g[r["tree"]].append(r)
    return {t:v for t,v in g.items() if np.median([r["dbh"] for r in v])>=0.10}
def noise(g):
    o={}
    for d in D:
        W,M,K=[],[],[]
        for v in g.values():
            x=np.array([r[d] for r in v if r[d]==r[d]])
            if len(x)>=3: W.append(x.var(ddof=1)); M.append(x.mean()); K.append(len(x))
        wv=np.mean(W); tot=np.var(M,ddof=1); bv=max(tot-wv/np.mean(K),0)
        o[d]=(len(M),wv**.5,bv**.5,wv**.5/bv**.5 if bv>0 else np.inf)
    return o
def q(vals):
    v=np.array([x for x in vals if x==x]); return f"{np.median(v):.2f} [{np.percentile(v,10):.2f}-{np.percentile(v,90):.2f}]"
for sp in sys.argv[1:]:
    g=load(sp); o=noise(g)
    print(f"\n{sp}: {len(g)} trees DBH>=10cm, {np.mean([len(v) for v in g.values()]):.1f} repeats/tree")
    print("| descriptor | n | within SD | between SD (corrected) | within/between |\n|---|---|---|---|---|")
    for d,(n,w,b,r) in o.items(): print(f"| {d} | {n} | {w:.3f} | {b:.3f} | {r:.2f} |")
    tm={t:{d:np.nanmedian([r[d] for r in v]) for d in D} for t,v in g.items()}
    hm={t:np.median([r["height"] for r in v]) for t,v in g.items()}
    print("stand median over repeats [10-90%], all:", " | ".join(q([m[d] for m in tm.values()]) for d in D))
    sel=[t for t in tm if 12<=hm[t]<=22]
    print(f"stand H12-22 (n {len(sel)}):", " | ".join(q([tm[t][d] for t in sel]) for d in D))
    print("single-repeat (first) median:", " | ".join(q([v[0][d] for v in g.values()]) for d in D))
