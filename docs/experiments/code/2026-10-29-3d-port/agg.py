import json, glob, os, statistics as st, sys
SP = os.environ.get("SLAB_DIR", "runs/slab")
rows = []
for f in sorted(glob.glob(f"{SP}/runs/*.json")):
    d = json.load(open(f)); name = os.path.basename(f)[:-5]
    case = list(d["cases"])[0]; c = d["cases"][case]; s = c["slab"]
    spec = s["spec"].split(":")
    med = lambda a: st.median(a) if a else 0
    rows.append(dict(case=case, model=spec[0], D=int(spec[1]), K=int(spec[2]), prec=spec[3], z=spec[4] if len(spec) > 4 else "open",
        deposit=med(s["depositMs"]), compute=med(s["computeMs"]), sample=med(s["sampleMs"]), updates=med(s["updates"]),
        deposits=med(s["deposits"]), samples=med(s["samples"]), searched=med(s["searched"]), light2d=c["phases"]["light"], hash=c["hash"], season=c["mean"]))
json.dump(rows, open(f"{SP}/agg.json", "w"), indent=1)
hashes = {(r["case"]): set() for r in rows}
for r in rows: hashes[r["case"]].add(r["hash"])
print("hashes per case:", {k: sorted(v) for k, v in hashes.items()})
def fit(xs, ys):
    n = len(xs); mx = sum(xs)/n; my = sum(ys)/n
    b = sum((x-mx)*(y-my) for x, y in zip(xs, ys)) / sum((x-mx)**2 for x in xs); a = my - b*mx
    ss = sum((y-a-b*x)**2 for x, y in zip(xs, ys)); tot = sum((y-my)**2 for y in ys)
    return a, b, 1 - ss/tot
for model in ["sweep", "fused"]:
    for case in ["forest", "wideForest"]:
        for prec in ["f64", "f32"]:
            rs = sorted([r for r in rows if r["model"] == model and r["case"] == case and r["prec"] == prec and r["z"] == "open"], key=lambda r: (r["D"], r["K"]))
            if not rs: continue
            print(f"\n{model} {case} {prec}")
            print("   D   K   D·K  ms(compute)  Mupd   ns/upd")
            for r in rs: print(f"{r['D']:4d}{r['K']:4d}{r['D']*r['K']:6d}  {r['compute']:10.1f}  {r['updates']/1e6:6.2f}  {1e6*r['compute']/r['updates']:6.2f}")
            a, b, r2 = fit([r["D"]*r["K"] for r in rs], [r["compute"] for r in rs])
            a2, b2, r22 = fit([r["updates"] for r in rs], [r["compute"] for r in rs])
            print(f"  fit ms = {a:.2f} + {b:.4f}·D·K (R²={r2:.4f});  ms = {a2:.2f} + {b2*1e6:.2f} ns × updates (R²={r22:.4f})")
print("\npyramid")
for r in sorted([r for r in rows if r["model"] == "pyramid"], key=lambda r: (r["case"], r["prec"], r["z"], r["D"])):
    print(f"{r['case']:11s} {r['prec']} {r['z']:8s} D={r['D']:3d} deposit {r['deposit']:7.2f} ms ({r['deposits']:.0f} buds, {r['updates']/1e6:.2f} M cell adds, {1e6*r['deposit']/max(1,r['updates']):.2f} ns/add)  sample {r['sample']:7.2f} ms ({r['samples']:.0f} samples, {r['searched']/1e6:.2f} M cells searched, {1e6*r['sample']/max(1,r['searched']):.2f} ns/cell)")
print("\nperiodic z")
for r in rows:
    if r["z"] != "open": print(r["case"], r["model"], r["D"], r["K"], r["prec"], f"compute {r['compute']:.1f} deposit {r['deposit']:.2f} sample {r['sample']:.2f}")
print("\n2D light phase (whole-season mean) per case:", {r["case"]: round(r["light2d"], 2) for r in rows})
