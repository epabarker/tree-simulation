"""lonesum.py TAG... : lone beech medians of H (m) and D at 100 and 150; gates H150 <= 44.3, D150 in 0.22-0.77."""
import sys, json, glob, statistics as st
D = "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1/lone/"
for tag in sys.argv[1:]:
    rows = [r for f in glob.glob(D + tag + "__*.json") for r in json.load(open(f))]
    out = [tag, f"n={len({r['seed'] for r in rows})}"]
    for s in (100, 150):
        x = [r for r in rows if r["season"] == s]
        if not x: continue
        H = st.median(r["H"] for r in x); Dm = st.median(r["D"] for r in x); WH = st.median(r["WH"] for r in x)
        out.append(f"s{s}: H {H:.1f} D {Dm:.3f} W/H {WH:.2f}")
        if s == 150:
            out.append(f"gate H<=44.3 {'pass' if H <= 44.3 else 'FAIL'}, D in 0.22-0.77 {'pass' if 0.22 <= Dm <= 0.77 else 'FAIL'}; D per seed {sorted(round(r['D'],2) for r in x)}")
    print("  ".join(out))
