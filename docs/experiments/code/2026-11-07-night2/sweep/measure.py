import sys, json
sys.path.insert(0, "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/t")
sys.path.insert(0, "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/a11")
sys.path.insert(0, "/home/edbarker/Documents/Projects/tree-simulation/analysis")
from treesim import coarsen as co, cylinders as cy, simtree
from crown import crown
D_MIN = 0.008621381595730782
src, out, tag = sys.argv[1], sys.argv[2], sys.argv[3]
res = []
for t in json.load(open(src))["trees"]:
    st = simtree.from_dump(t); raw = st.cylinders
    c = co.coarsen(raw, co.Resolution(D_MIN, (), ()), inflated=True)
    x = crown(c, f"{t['species']}-{t['seed']}-{t['season']}")
    res.append(dict(tag=tag, species=t["species"], seed=t["seed"], season=t["season"], H=cy.height(raw), D=x["D"], WH=x["WH"], n=len(t["m"]["parent"])))
json.dump(res, open(out, "w"))
