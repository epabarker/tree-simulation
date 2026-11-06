"""patch.py PARAMS.json PATCH.json: apply {species|"*"|"world": {"dotted.path": value}} in place.
"*" sets the path on the top-level params and on every species; "world" on the top level only."""
import json, sys

p = json.load(open(sys.argv[1]))
patch = json.load(open(sys.argv[2]))


def set_path(d, path, v):
    ks = path.split(".")
    for k in ks[:-1]:
        d = d.setdefault(k, {})
    d[ks[-1]] = v


for who, kv in patch.items():
    targets = []
    if who == "world":
        targets = [p]
    elif who == "*":
        targets = [p] + list(p["species"].values())
    else:
        targets = [p["species"][who]]
    for t in targets:
        for k, v in kv.items():
            set_path(t, k, v)
json.dump(p, open(sys.argv[1], "w"))
