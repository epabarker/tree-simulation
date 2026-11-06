import json, numpy as np, sys
sys.path.insert(0,".")
D = ["spacingCV","attachPerM","insertSD","elevSD","curvPersist","earlyFork"]
real = json.load(open("real.json")); sim = json.load(open("sim.json"))
cat = {r["tree"]: r for r in json.load(open("../a9/work/catalogue.json"))}
for r in real: r["h"] = cat[r["tree"]]["height"]
hl = lambda r: 12 <= r["h"] <= 22
RL = [r for r in real if r["set"]=="treeml" and r["species"]=="Carpinus betulus" and hl(r)]
RS = [r for r in real if r["set"]=="biodiv" and r["dbh"]>=0.10]
RS2 = [r for r in RS if hl(r)]
def v(rows, d): return np.array([r[d] for r in rows if r[d]==r[d]])
def auc(a,b):
    return np.mean([(x>y)+.5*(x==y) for x in a for y in b])
for name, rr, reg in (("lone",RL,"lone"),("stand(all-h beech)",RS,"stand"),("stand(h12-22 beech)",RS2,"stand")):
    print(name)
    for c in ["R0","R1","R2","R3","R4"]:
        x=[r for r in sim if r["cfg"]==c and r["regime"]==reg]
        out=[]
        for d in D:
            a=v(x,d); b=v(rr,d)
            z=(np.median(a)-np.median(b))/b.std(ddof=1)
            out.append(f"{z:+.1f}")
        print(" ",c," ".join(f"{d}:{o}" for d,o in zip(D,out)))
    # AUC R0 vs real
    x=[r for r in sim if r["cfg"]=="R0" and r["regime"]==reg]
    print("  AUC R0>real:", {d: round(auc(v(x,d),v(rr,d)),2) for d in D})
