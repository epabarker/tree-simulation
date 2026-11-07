#!/usr/bin/env python3
"""G-forest / G-budget evidence on the garden's world (forestParams) for a worktree.

Usage:
  python3 -m treesim.gforest run  --worktree WT [--patch patch.json] [--seeds 1-20] [--width 160]
                           [--seasons 300] [--jobs 3] [--out DIR] [--label NAME]
  python3 -m treesim.gforest compare BASE.json NEW.json        # G-forest verdict vs a baseline

World: forestParams(width, seed) from WT/src/core/presets.ts (Node 24 runs the .ts), planted row of
~width/26.7 trees, O4 recruits, faces 0.2 (the garden's look). Run through WT's native treesim
(WT/rust/target/native/release/treesim, built by cargo before simulation), --preset mixedWood
--params <dumped forestParams>. Needs ~/.cargo/bin on PATH for the build.

--patch: JSON {species: {path: value | nested dict}}. A key with dots is a dotted path into that
species' entry in params.species ("r2.levels.1.setPoint": 58.7; arrays are indexed by number); a
nested dict is deep-merged (arrays replaced whole). Applied to the dumped params JSON BEFORE the run,
so it reaches the stand AND the lone comparators. (treesim's own --species-patch merges one level
only: {"r2": {...}} replaces the species' whole r2 incl. levels, so dotted paths via this script are safer.)

Comparison defaults to crown v2 (species-matched, five lone seeds); v1 stays explicitly selectable.

Checks (thresholds from docs/experiments/code/2026-10-30-form/evidence.py, same measures):
  floor100  1 - mean shade of light.csv row 0 at season 100 in [0.02, 0.10]
  hd300     median slenderness of planted trees alive at 300 in [60, 80]
  crown     median leafCrownRatio of planted-alive trees < median of lone-tree runs (the planted species,
            seed-1 comparator per species, open sides, O4 off; run once per species, not per seed, for cost: a lone oak takes ~5 CPU-min) at both 150 and 300
  plateau   planted trees alive at 250 and 300: median gain < 2 cells and tallest < 180
Original pass rule: >= 15 of 20. NOTE faces 0.2 puts floor100 out of band by construction (the 2026-11-02
record: 0 of 20 at tau 0.2), so for the mixed wood the gate is "within the baseline's distribution".
Extras: survival (planted & all live at 150/300), composition (share per species at 300), per-species
height/H-D/LCR at 300, metamers at 200 (sum over live trees), wall and CPU seconds per season.
"""
import argparse, copy, json, os, resource, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from statistics import median
import csv
from pathlib import Path
from .provenance import provenance, file_hash, build_native

HERE = os.path.dirname(os.path.abspath(__file__))
FLOOR_BAND, HD_BAND = (0.02, 0.10), (60, 80)


def seeds_arg(s):
    out = []
    for part in s.split(","):
        if "-" in part:
            a, b = part.split("-"); out += range(int(a), int(b) + 1)
        else:
            out.append(int(part))
    return out


def set_path(d, path, value):
    keys = path.split("."); cur = d
    for k, nxt in zip(keys, keys[1:] + [None]):
        idx = int(k) if isinstance(cur, list) else k
        if nxt is None:
            cur[idx] = value
        else:
            if isinstance(cur, dict) and idx not in cur:
                cur[idx] = {}
            cur = cur[idx]


def deep_merge(a, b):
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(a.get(k), dict):
            deep_merge(a[k], v)
        else:
            a[k] = copy.deepcopy(v)


def apply_patch(params, patch):
    for sp, assigns in (patch or {}).items():
        entry = params.setdefault("species", {}).setdefault(sp, {})
        for k, v in assigns.items():
            if "." in k:
                set_path(entry, k, v)
            elif isinstance(v, dict) and isinstance(entry.get(k), dict):
                deep_merge(entry[k], v)
            else:
                entry[k] = v


def run_one(wt, args, out):
    binary = os.path.join(wt, "rust/target/native/release/treesim")
    t0 = time.time()
    p = subprocess.Popen([binary, *args, "--quiet", "--out", out], stdout=subprocess.DEVNULL,
                         stderr=subprocess.PIPE)
    pid, status, ru = os.wait4(p.pid, 0)
    p.returncode = 0  # reaped by wait4
    wall = time.time() - t0
    if status != 0:
        raise RuntimeError(f"treesim failed ({status}) {args}: {p.stderr.read().decode()[:300]}")
    return wall, ru.ru_utime + ru.ru_stime


def read_metrics(run):
    rows = []
    with open(f"{run}/metrics.csv") as f:
        for r in csv.DictReader(f):
            rows.append(r)
    return rows


def fl(r, k):
    return float(r[k])


def dump_params(wt, width, seed, path):
    dumper = os.path.join(HERE, "dump_garden.ts")
    with open(path, "w") as f:
        subprocess.run(["node", dumper, wt, str(width), str(seed)], check=True, stdout=f)


def prep_seed(a, seed):
    base = os.path.join(a.out, f"s{seed}")
    os.makedirs(base, exist_ok=True)
    pj = f"{base}/params.json"
    dump_params(a.worktree, a.width, seed, pj)
    params = json.load(open(pj))
    apply_patch(params, a.patch_obj)
    json.dump(params, open(pj, "w"))
    return params


def stand_task(a, seed, params):
    base = os.path.join(a.out, f"s{seed}"); stand = f"{base}/stand"
    wall, cpu = run_one(a.worktree, ["--preset", "mixedWood", "--params", f"{base}/params.json",
                        "--seasons", str(a.seasons), "--snapshots", "100,150", "--light"], stand)
    for junk in ("metamers.csv", "form.csv", "buds.csv", "ground.csv"):
        try: os.remove(f"{stand}/{junk}")
        except OSError: pass
    return wall, cpu


LONE_CACHE = os.environ.get("EVIDENCE_LONE_CACHE", str(Path(HERE).parents[1] / "runs" / "lonecache"))


def lone_task(a, sp, params):
    """One lone tree of species sp (sides open, O4 off) on lone-seed params: the crown-base comparator.
    Crown v2 (2026-11-06, registered before any v2 result): cached by the exact lone params (and the
    worktree's binary SHA-256), so an unchanged species is not re-run across conditions."""
    import hashlib
    lp0 = copy.deepcopy(params)
    W0, D0 = lp0["world"]["width"], lp0["world"].get("depth", 64)
    lp0["trees"] = [{"species": sp, "x": W0 / 2, "z": D0 / 2}]; lp0["o4"]["enabled"] = False; lp0["world"]["sides"] = "open"
    binary = os.path.join(a.worktree, "rust/target/native/release/treesim")
    key = hashlib.sha256((json.dumps(lp0, sort_keys=True) + a.binary_hash + str(a.seasons)).encode()).hexdigest()[:20]
    os.makedirs(LONE_CACHE, exist_ok=True)
    cache = f"{LONE_CACHE}/{key}.json"
    if os.path.exists(cache):
        return json.load(open(cache))
    res = _lone_task(a, sp, params)
    json.dump(res, open(cache, "w"))
    return res


def _lone_task(a, sp, params):
    base = os.path.join(a.out, "lone"); os.makedirs(base, exist_ok=True)
    lp = copy.deepcopy(params)
    W, D = lp["world"]["width"], lp["world"].get("depth", 64)
    lp["trees"] = [{"species": sp, "x": W / 2, "z": D / 2}]
    lp["o4"]["enabled"] = False
    lp["world"]["sides"] = "open"
    tag = f"{sp}-s{int(lp.get('seed', 0))}"
    lpath = f"{base}/{tag}.json"; json.dump(lp, open(lpath, "w"))
    out = f"{base}/{tag}"
    run_one(a.worktree, ["--preset", "mixedWood", "--params", lpath, "--seasons", str(a.seasons)], out)
    m = {int(float(r["season"])): r for r in read_metrics(out) if r["tree"] == "0"}
    for junk in ("metamers.csv", "form.csv", "light.csv", "buds.csv", "ground.csv"):
        try: os.remove(f"{out}/{junk}")
        except OSError: pass
    last = m[max(m)]
    return {str(s): fl(m.get(s, last), "leafCrownRatio") for s in (150, 300)} | \
           {"height300": fl(m.get(300, last), "height"), "hd300": fl(m.get(300, last), "slenderness")}


def summarise(seed, stand, n, planted, lone, wall, cpu, seasons, lone5=None):
    rows = read_metrics(stand)
    by = {}
    for r in rows:
        by.setdefault(int(float(r["season"])), []).append(r)
    live = lambda s: [r for r in by.get(s, []) if r["alive"] == "1"]
    pl_live = lambda s: [r for r in live(s) if int(r["tree"]) < n]
    light = {}
    with open(f"{stand}/light.csv") as f:
        for r in csv.DictReader(f):
            if r["row"] == "0":
                light.setdefault(int(r["season"]), []).append(float(r["shade"]))
    floor = {s: 1 - sum(v) / len(v) for s, v in light.items()}
    h = lambda s: {int(r["tree"]): fl(r, "height") for r in pl_live(s)}
    h250, h300 = h(250), h(300)
    gains = [h300[t] - h250[t] for t in h250 if t in h300]
    med = lambda xs: median(xs) if xs else float("nan")
    lcr = lambda s: med([fl(r, "leafCrownRatio") for r in pl_live(s)])
    lone_lcr = lambda s: med([lone[sp][str(s)] for sp in {t["species"] for t in planted}])
    # Crown v2: each planted tree against its own species' lone median over LONE_SEEDS seeds.
    def crown_v2(s):
        d = [fl(r, "leafCrownRatio") - lone5[r["species"]][str(s)] for r in pl_live(s) if r["species"] in (lone5 or {})]
        return med(d)
    hd300 = med([fl(r, "slenderness") for r in pl_live(300)])
    res = {
        "seed": seed, "planted": n,
        "planted_species": [t["species"] for t in planted],
        "floor": {str(s): floor.get(s) for s in (100, 150)},
        "hd300": hd300, "hd300_all": med([fl(r, "slenderness") for r in live(300)]),
        "lcr150": lcr(150), "lcr300": lcr(300),
        "lone_lcr150": lone_lcr(150), "lone_lcr300": lone_lcr(300),
        "plateau_gain": med(gains), "plateau_n": len(gains),
        "tallest300": max(h300.values()) if h300 else float("nan"),
        "released10": sum(g >= 10 for g in gains),
        "planted_alive150": len(pl_live(150)), "planted_alive300": len(pl_live(300)),
        "live150": len(live(150)), "live300": len(live(300)),
        "composition300": {}, "per_species300": {},
        "metamers200": sum(fl(r, "metamers") for r in live(200)),
        "metamers300": sum(fl(r, "metamers") for r in live(300)),
        "wall_per_season": wall / seasons, "cpu_per_season": cpu / seasons,
    }
    L = live(300)
    for r in L:
        res["composition300"][r["species"]] = res["composition300"].get(r["species"], 0) + 1
    for sp in {r["species"] for r in L}:
        P = [r for r in L if r["species"] == sp and int(r["tree"]) < n]
        if P:
            res["per_species300"][sp] = {"n": len(P), "height": med([fl(r, "height") for r in P]),
                                         "hd": med([fl(r, "slenderness") for r in P]),
                                         "lcr": med([fl(r, "leafCrownRatio") for r in P])}
    res["lone"] = lone
    res["ok"] = {
        "floor100": FLOOR_BAND[0] <= (res["floor"]["100"] or -1) <= FLOOR_BAND[1],
        "hd300": HD_BAND[0] <= hd300 <= HD_BAND[1],
        "hd300_all": HD_BAND[0] <= res["hd300_all"] <= HD_BAND[1],
        "crown": res["lcr150"] < res["lone_lcr150"] and res["lcr300"] < res["lone_lcr300"],
        "crown_v2": (lone5 is not None) and crown_v2(150) < 0 and crown_v2(300) < 0,
        "plateau": res["plateau_gain"] < 2 and res["tallest300"] < 180,
    }
    return res


def q(xs, p):
    xs = sorted(x for x in xs if x is not None and x == x)
    if not xs: return float("nan")
    k = (len(xs) - 1) * p; i = int(k)
    return xs[i] + (xs[min(i + 1, len(xs) - 1)] - xs[i]) * (k - i)


def dist(xs):
    return {"median": q(xs, .5), "min": q(xs, 0), "max": q(xs, 1), "p10": q(xs, .1), "p90": q(xs, .9)}


def aggregate(results, a):
    N = len(results)
    agg = {"label": a.label, "worktree": a.worktree, "patch": a.patch_obj, "seeds": [r["seed"] for r in results],
           "width": a.width, "seasons": a.seasons, "N": N}
    agg["pass"] = {k: sum(r["ok"][k] for r in results) for k in results[0]["ok"]}
    agg["dist"] = {
        "floor100": dist([r["floor"]["100"] for r in results]),
        "floor150": dist([r["floor"]["150"] for r in results]),
        "hd300": dist([r["hd300"] for r in results]),
        "hd300_all": dist([r["hd300_all"] for r in results]),
        "lcr300_minus_lone": dist([r["lcr300"] - r["lone_lcr300"] for r in results]),
        "plateau_gain": dist([r["plateau_gain"] for r in results]),
        "tallest300": dist([r["tallest300"] for r in results]),
        "planted_alive150": dist([r["planted_alive150"] for r in results]),
        "planted_alive300": dist([r["planted_alive300"] for r in results]),
        "live150": dist([r["live150"] for r in results]),
        "live300": dist([r["live300"] for r in results]),
        "metamers200": dist([r["metamers200"] for r in results]),
        "wall_per_season": dist([r["wall_per_season"] for r in results]),
        "cpu_per_season": dist([r["cpu_per_season"] for r in results]),
    }
    agg["planted_survival300"] = sum(r["planted_alive300"] for r in results) / sum(r["planted"] for r in results)
    agg["planted_survival150"] = sum(r["planted_alive150"] for r in results) / sum(r["planted"] for r in results)
    comp = {}
    for r in results:
        tot = sum(r["composition300"].values()) or 1
        for sp, c in r["composition300"].items():
            comp.setdefault(sp, []).append(c / tot)
    agg["composition300_mean_share"] = {sp: sum(v) / N for sp, v in sorted(comp.items())}
    ps = {}
    for r in results:
        for sp, d in r["per_species300"].items():
            for k in ("height", "hd", "lcr"):
                ps.setdefault(sp, {}).setdefault(k, []).append(d[k])
            ps[sp].setdefault("n", []).append(d["n"])
    agg["per_species300"] = {sp: {"n_trees": sum(d["n"]), **{k: q(d[k], .5) for k in ("height", "hd", "lcr")}}
                             for sp, d in sorted(ps.items())}
    agg["per_seed"] = results
    return agg


def f3(x): return f"{x:.3g}"


def markdown(g):
    N, P, D = g["N"], g["pass"], g["dist"]
    ds = lambda d: f"median {f3(d['median'])} (p10 {f3(d['p10'])}, p90 {f3(d['p90'])}; range {f3(d['min'])}-{f3(d['max'])})"
    L = [f"# Evidence: {g['label']}", "",
         f"Worktree `{g['worktree']}`, width {g['width']}, seeds {g['seeds'][0]}-{g['seeds'][-1]} (N={N}), {g['seasons']} seasons. Patch: `{json.dumps(g['patch'])}`", "",
         "| check | pass (of N) | distribution |", "|---|---|---|",
         f"| floor at 100 in 2-10% (faces 0.2: out of band by construction) | {P['floor100']} | {ds(D['floor100'])} |",
         f"| H/D at 300 in 60-80 | {P['hd300']} | {ds(D['hd300'])} |",
         f"| H/D at 300 over ALL live trees incl. recruits (extra) | {P['hd300_all']} | {ds(D['hd300_all'])} |",
         f"| crown base: stand LCR < lone's at 150 and 300 | {P['crown']} | stand-lone at 300: {ds(D['lcr300_minus_lone'])} |",
         f"| crown v2: species-matched lone comparator | {P.get('crown_v2', 0)} | 5 lone comparator seeds/species; verdict over N stand seeds |",
         f"| plateau: gain 250-300 < 2, tallest < 180 | {P['plateau']} | gain {ds(D['plateau_gain'])}; tallest {ds(D['tallest300'])} |",
         f"| floor at 150 (reported) | - | {ds(D['floor150'])} |", "",
         "## Survival and composition", "",
         f"- planted trees alive: at 150 {g['planted_survival150']:.1%}, at 300 {g['planted_survival300']:.1%} (count at 300 per seed: {ds(D['planted_alive300'])})",
         f"- all live trees (with recruits): at 150 {ds(D['live150'])}; at 300 {ds(D['live300'])}",
         "- composition at 300 (mean share of live trees per species): " + ", ".join(f"{k} {v:.2f}" for k, v in g["composition300_mean_share"].items()), "",
         "| species | planted trees alive at 300 | median height | median H/D | median LCR |", "|---|---|---|---|---|"]
    for sp, d in g["per_species300"].items():
        L.append(f"| {sp} | {d['n_trees']} | {f3(d['height'])} | {f3(d['hd'])} | {f3(d['lcr'])} |")
    L += ["", "## Budget", "",
          f"- metamers at 200 (sum over live trees): {ds(D['metamers200'])}",
          f"- native wall s/season (machine was loaded, 3 parallel runs): {ds(D['wall_per_season'])}; CPU s/season: {ds(D['cpu_per_season'])}"]
    return "\n".join(L) + "\n"


def compare(base, new, crown_version=2):
    """Four hard counts only. All-tree H/D and composition never change the verdict."""
    crown = "crown_v2" if crown_version == 2 else "crown"
    checks = ("floor100", "hd300", crown, "plateau")
    if base["N"] != new["N"] or new["N"] < 20:
        raise ValueError("G-forest comparison requires matching sample sizes of at least 20 seeds")
    print(f"G-forest: {new['label']} against {base['label']} (each count >= base - 2; crown v{crown_version})")
    ok = True
    for k in checks:
        b, n = base["pass"][k], new["pass"][k]
        bar = b - 2
        passed = n >= bar
        ok &= passed
        status = "FAIL" if not passed else "at its limit" if n == bar else "ok"
        print(f"  {k}: {n}/{new['N']} vs bar {bar} (base {b})  {status}")
    for k in ("hd300_all",):
        print(f"  diagnostic {k}: {new['pass'].get(k)} vs base {base['pass'].get(k)}")
    for k in ("planted_survival150", "planted_survival300"):
        print(f"  {k}: {new[k]:.3f} vs base {base[k]:.3f}")
    for sp in sorted(set(base["composition300_mean_share"]) | set(new["composition300_mean_share"])):
        print(f"  share {sp}: {new['composition300_mean_share'].get(sp, 0):.2f} vs {base['composition300_mean_share'].get(sp, 0):.2f}")
    bm, nm = base["dist"]["metamers200"]["median"], new["dist"]["metamers200"]["median"]
    budget_ok = bm > 0 and nm <= 1.25 * bm
    ratio = nm / bm if bm > 0 else float("nan")
    print(f"  G-budget (separate): {'PASS' if budget_ok else 'FAIL'}; metamers200 {nm:.0f} vs {bm:.0f} ({ratio:.2f}x; bar <= 1.25x)")
    print("  VERDICT (four checks):", "PASS" if ok else "FAIL")
    return ok


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("--worktree", required=True); r.add_argument("--patch")
    r.add_argument("--seeds", default="1-20"); r.add_argument("--width", type=int, default=160)
    r.add_argument("--seasons", type=int, default=300); r.add_argument("--jobs", type=int, default=3)
    r.add_argument("--out", required=True); r.add_argument("--label", default="run")
    ra = sub.add_parser("reaggregate"); ra.add_argument("json")
    c = sub.add_parser("compare"); c.add_argument("base"); c.add_argument("new")
    c.add_argument("--crown-version", type=int, choices=(1, 2), default=2)
    a = ap.parse_args()
    if a.cmd == "reaggregate":  # recompute pass/dist/md from an evidence.json's per_seed
        g = json.load(open(a.json))
        for r in g["per_seed"]:
            r["ok"]["hd300_all"] = HD_BAND[0] <= r["hd300_all"] <= HD_BAND[1]
        a.label, a.worktree, a.patch_obj, a.width, a.seasons = g["label"], g["worktree"], g["patch"], g["width"], g["seasons"]
        metadata = {k: g[k] for k in ("provenance", "binary_sha256", "params_sha256") if k in g}
        g = aggregate(g["per_seed"], a)
        g.update(metadata)
        json.dump(g, open(a.json, "w"), indent=1); open(a.json.replace(".json", ".md"), "w").write(markdown(g)); return
    if a.cmd == "compare":
        raise SystemExit(0 if compare(json.load(open(a.base)), json.load(open(a.new)), a.crown_version) else 1)
    a.worktree = os.path.abspath(a.worktree); a.out = os.path.abspath(a.out)
    a.patch_obj = json.load(open(a.patch)) if a.patch else {}
    os.makedirs(a.out, exist_ok=True)
    seeds = seeds_arg(a.seeds)
    if not seeds or len(seeds) != len(set(seeds)):
        ap.error("supply distinct seeds")
    if not 1 <= a.jobs <= 12 or a.seasons < 300:
        ap.error("jobs must be 1-12 and seasons at least 300 for G-forest")
    # Build before direct binary calls and fingerprint exactly the executable used.
    build_native(a.worktree)
    a.binary_hash = file_hash(Path(a.worktree) / "rust/target/native/release/treesim")
    a.provenance = provenance(a.worktree)
    allp = {sd: prep_seed(a, sd) for sd in seeds}
    species = sorted({t["species"] for p in allp.values() for t in p["trees"]})
    LONE_SEEDS = seeds[:5]  # crown v2: five lone seeds per species
    with ThreadPoolExecutor(a.jobs) as ex:
        sf = {sd: ex.submit(stand_task, a, sd, allp[sd]) for sd in seeds}
        lf5 = {(sp, sd): ex.submit(lone_task, a, sp, allp[sd]) for sp in species for sd in LONE_SEEDS}
        lone = {sp: lf5[(sp, seeds[0])].result() for sp in species}
        lone5 = {sp: {s: median([lf5[(sp, sd)].result()[s] for sd in LONE_SEEDS]) for s in ("150", "300")} for sp in species}
        results = []
        for sd in seeds:
            wall, cpu = sf[sd].result()
            p = allp[sd]
            results.append(summarise(sd, f"{a.out}/s{sd}/stand", len(p["trees"]), p["trees"], lone, wall, cpu, a.seasons, lone5))
    g = aggregate(results, a)
    g["provenance"] = a.provenance
    g["binary_sha256"] = a.binary_hash
    g["params_sha256"] = {str(sd): file_hash(Path(a.out) / f"s{sd}/params.json") for sd in seeds}
    json.dump(g, open(f"{a.out}/evidence.json", "w"), indent=1)
    open(f"{a.out}/evidence.md", "w").write(markdown(g))
    print(markdown(g))


if __name__ == "__main__":
    main()
