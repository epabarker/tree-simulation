import json, numpy as np, math, collections
D = ["spacingCV","attachPerM","insertSD","elevSD","curvPersist","earlyFork"]
real = json.load(open("real.json")); sim = json.load(open("sim.json"))
cat = {r["tree"]: r for r in json.load(open("../a9/work/catalogue.json"))}
for r in real: r["h"] = cat[r["tree"]]["height"]
def q(v):
    v = np.array([x for x in v if x == x]); 
    if len(v) == 0: return "n/a"
    return f"{np.median(v):.2f} [{np.percentile(v,10):.2f}-{np.percentile(v,90):.2f}]"
def row(name, rows):
    n = len(rows); print(f"| {name} (n={n}, H {np.median([r['height'] if 'height' in r else 0 for r in rows]):.1f}) | " + " | ".join(q([r[d] for r in rows]) + f" ({sum(r[d]==r[d] for r in rows)})" for d in D) + " |")
print("| row | "+" | ".join(D)+" |")
groups = {}
hl = lambda r: 12 <= r["h"] <= 22
rl = [r for r in real if r["set"]=="treeml" and r["species"]=="Carpinus betulus" and hl(r)]
for r in rl: r["height"]=r["h"]
row("real hornbeam lone", rl)
bl = [r for r in real if r["set"]=="treeml" and r["species"]=="Fagus sylvatica" and hl(r)]
for r in bl: r["height"]=r["h"]
row("real beech lone", bl)
bs = [r for r in real if r["set"]=="biodiv" and r["dbh"]>=0.10]
for r in bs: r["height"]=r["h"]
row("real beech stand (all h)", bs)
row("real beech stand (h12-22)", [r for r in bs if hl(r)])
for reg in ("lone","stand"):
    for c in ["R0","R1","R2","R3","R4","R5"]:
        x = [r for r in sim if r["cfg"]==c and r["regime"]==reg]
        if x: row(f"{c} {reg}", x)
