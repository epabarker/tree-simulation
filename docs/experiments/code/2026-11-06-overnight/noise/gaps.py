import json, numpy as np
A11="/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/a11"
D = ["spacingCV","attachPerM","insertSD","elevSD","curvPersist","earlyFork"]
real=json.load(open(f"{A11}/real.json")); sim=json.load(open(f"{A11}/sim.json"))
cat={r["tree"]:r for r in json.load(open(f"{A11}/../a9/work/catalogue.json"))}
for r in real: r["h"]=cat[r["tree"]]["height"]
RL=[r for r in real if r["set"]=="treeml" and r["species"]=="Carpinus betulus" and 12<=r["h"]<=22]
med=lambda rows,d:np.nanmedian([r[d] for r in rows])
print("real lone hornbeam med:",[round(med(RL,d),3) for d in D])
for reg in ("lone","stand"):
    for c in ["R0","R1","R2","R3","R4"]:
        x=[r for r in sim if r["cfg"]==c and r["regime"]==reg]
        print(reg,c,[round(med(x,d),3) for d in D])
