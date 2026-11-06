from build_pairs import resolve_cfg, build_set
B="/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-a5c5be7297b01990f"
R="/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-af97922d851c2fc19"
import sys
which=sys.argv[1]
specs=[]
for sp in ("hornbeam","beech","oak","rowan"):
    c1=resolve_cfg({"species":sp,"assign":{},"worktree":B,"name":"base-"+sp})
    c2=resolve_cfg({"species":sp,"assign":{},"worktree":R,"name":"rc-"+sp})
    seeds=range(201,209) if which=="lone-rc" else range(209,215)
    for sd in seeds: specs.append(dict(cfg1=c1,cfg2=c2,regime="lone",seed=sd,kind="cli"))
print(len(specs))
if which=="lone-rc": build_set("lone-rc",specs,batch=24)
else: build_set("lone-rc-100",specs,batch=24,lone_season_arg="100")
