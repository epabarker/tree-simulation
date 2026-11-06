"""Simulated-vs-simulated pair builder with a real reference strip (judge-sim).

Each image: top row "Reference: real trees" (4 real trees, same species if >= 4 available, else any broadleaf, same
regime; each scaled to its own height, random azimuth); bottom row "A" / "B": two simulated trees (same regime, season,
same coarsening, one scale = the larger tree's fit, front view). Sides randomised. Key written outside the image folder.

CLI (two configs, regimes, seeds):
  uv run --project /home/edbarker/Documents/Projects/tree-simulation/analysis python build_pairs.py \
     --set mytest --cfg1 shipped:oak --cfg2 gallery:oak-round3-parasol --regimes lone,stand --seeds 201-204
Config forms: shipped:<species> | gallery:<species>-<name> | a JSON object
  {"name":..,"species":..,"assign":{..},"worktree":"/path/to/worktree (needs src/wasm/pkg built)","seed_offset":0}
Options: --worktree1/--worktree2 PATH, --seed-offset2 N (cfg2 runs seed+N: self-vs-self), --stand-season 70,
  --lone-season match|N (match = cfg1's height-matched season, target 16 m), --n-ref 4, --batch 24.
Python API: build_set(name, specs, batch=24); a spec is dict(cfg1, cfg2, regime, seed, kind, [stand_pick]).
"""
from __future__ import annotations
import argparse, hashlib, json, math, os, random, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
REPO = Path("/home/edbarker/Documents/Projects/tree-simulation")
sys.path.insert(0, str(REPO / "analysis"))
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from treesim import coarsen as co, cylinders as cy, qsm, simtree

J = Path(__file__).resolve().parent
CACHE = J / "cache"
KEYS = Path("/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/keys-overseer")
D_MIN = json.loads((REPO / "analysis/fit/sources/level1-beech.json").read_text())["d_min_m"]
CELL, PW, PH, GROUND, TOP = 0.25, 400, 700, 18, 26
STAND_IDX = [4, 5, 6, 7]
WORKERS = 3
BROADLEAF_NOT = ("Pinus", "Picea", "Abies", "Larix", "Pseudotsuga", "Taxus", "Cedrus", "Juniperus", "PINUSY", "PICEAB")
# reference species matching: regime -> species key -> predicate on a catalogue row
SPECIES_MATCH = {
    "beech": lambda r: r["species"].startswith("Fagus"),
    "birch": lambda r: r["species"].lower().startswith("betula"),
    "hornbeam": lambda r: r["species"].startswith("Carpinus"),
    "oak": lambda r: r["species"].lower().startswith("quercus") or r["species"] == "QUERRO",
    "maple": lambda r: r["species"].startswith("Acer") or r["species"] == "ACERPS",
}

# ---- configs ----------------------------------------------------------------------------------------------------
def resolve_cfg(c, worktree=None, seed_offset=None):
    if isinstance(c, str) and not c.startswith("{"):
        kind, _, rest = c.partition(":")
        if kind == "shipped":
            assign = {}
            if rest == "beech":  # A6's "hand-beech": the hand form of the v4 pilot
                assign = json.load(open(REPO / "docs/experiments/fits/level1-pilot-v4/beech.json"))["hand"]["assign"]
            d = dict(name="shipped-" + rest, species=rest, assign=assign)
        elif kind == "gallery":
            e = json.load(open(REPO / "analysis/fit/gallery" / (rest + ".json")))
            d = dict(name="rej-" + rest, species=e["species"], assign=e["assign"])
        else:
            raise SystemExit(f"bad config {c}")
    else:
        d = json.loads(c) if isinstance(c, str) else dict(c)
        d.setdefault("assign", {}); d.setdefault("name", d["species"] + "-" + hashlib.sha1(json.dumps(d, sort_keys=True).encode()).hexdigest()[:6])
    if worktree: d["worktree"] = str(worktree)
    if seed_offset is not None: d["seed_offset"] = seed_offset
    d.setdefault("worktree", str(REPO)); d.setdefault("seed_offset", 0)
    d["hash"] = hashlib.sha1(json.dumps([d["species"], d["assign"], d["worktree"]], sort_keys=True).encode()).hexdigest()[:10]
    return d

def tpl(name, root):
    out = CACHE / f"{name}.{hashlib.sha1(root.encode()).hexdigest()[:8]}.ts"
    if not out.exists():
        out.write_text((J / "tpl" / f"{name}.tpl.ts").read_text().replace("__ROOT__", root))
    return out

def sh(cmd, cwd, timeout=1800):
    env = dict(os.environ); env["PATH"] = os.path.expanduser("~/.cargo/bin") + ":" + env["PATH"]
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=env, timeout=timeout)
    if r.returncode: raise RuntimeError(r.stderr[-400:])

# ---- seasons ----------------------------------------------------------------------------------------------------
def lone_season(cfg, target=16.0):
    f = CACHE / "seasons.json"; d = json.loads(f.read_text()) if f.exists() else {}
    if cfg["hash"] in d: return d[cfg["hash"]]
    script = tpl("heights", cfg["worktree"])
    def one(seed):
        job = CACHE / "dumps" / f"h.{cfg['hash']}.{seed}.job.json"; out = CACHE / "dumps" / f"h.{cfg['hash']}.{seed}.json"
        job.write_text(json.dumps(dict(species=cfg["species"], seed=seed, assign=cfg["assign"])))
        sh(["node", str(script), str(job), str(out)], cfg["worktree"]); return json.load(open(out))
    with ThreadPoolExecutor(WORKERS) as ex: hs = list(ex.map(one, range(101, 105)))
    best = None
    for s in range(10, 151, 5):
        v = [h[str(s)] for h in hs if h[str(s)] is not None]
        if len(v) < 3: continue
        m = float(np.median(v))
        if best is None or abs(m - target) < abs(best[1] - target): best = (s, m)
    d = json.loads(f.read_text()) if f.exists() else {}; d[cfg["hash"]] = best[0]; f.write_text(json.dumps(d)); return best[0]

# ---- simulations ------------------------------------------------------------------------------------------------
def sim_records(cfg, seed, lone_s, stand_s):
    """Run (cached) one config at one seed: the stand's measured trees at stand_s and the lone tree at lone_s."""
    key = f"{cfg['hash']}.s{seed}.L{lone_s}.S{stand_s}"
    idx = CACHE / "sims" / f"{key}.idx.json"
    if idx.exists(): return json.loads(idx.read_text())
    dump = CACHE / "dumps" / f"{key}.json"; job = CACHE / "dumps" / f"{key}.job.json"
    job.write_text(json.dumps(dict(species=cfg["species"], seed=seed, assign=cfg["assign"], patch={}, stand=[stand_s], lone=[lone_s])))
    sh(["node", str(tpl("dump", cfg["worktree"])), str(job), str(dump)], cfg["worktree"])
    d = json.loads(dump.read_text()); recs = []
    for t in d["trees"]:
        if not t["alive"]: continue
        st = simtree.from_dump(t)
        c = co.coarsen(st.cylinders, co.Resolution(D_MIN, (), ()), inflated=True)
        sid = f"sim:{key}:{t['trial']}:i{t['index']}"
        tid = "t" + hashlib.sha1(sid.encode()).hexdigest()[:10]
        (CACHE / "t" / f"{tid}.json").write_text(json.dumps({"start": np.round(c.start, 4).tolist(), "axis": np.round(c.axis, 5).tolist(),
            "length": np.round(c.length, 4).tolist(), "radius": np.round(c.radius, 5).tolist(), "parent": c.parent.tolist()}))
        recs.append(dict(tid=tid, regime=t["trial"], index=t["index"], season=t["season"], height=float(cy.height(c)),
                         dbh=float(cy.dbh(st.cylinders)), n=len(c)))
    idx.write_text(json.dumps(recs)); dump.unlink(missing_ok=True); return recs

def ok_sim(r): return r["n"] >= 200 and (r["regime"] == "lone" or (r["height"] >= 10 and r["dbh"] >= 0.12))

# ---- real pools -------------------------------------------------------------------------------------------------
def real_pools():
    cat = [r for r in json.load(open(CACHE / "catalogue.json")) if r.get("dbh") is not None]
    for r in cat: r["rid"] = f'{r["set"]}:{r["tree"]}'
    lone = [r for r in cat if r["regime"] == "lone" and r["dbh"] >= 0.10 and 12 <= r["height"] <= 22]
    stand = [r for r in cat if r["regime"] == "stand" and r["dbh"] >= 0.12 and r["height"] >= 10]
    return {"lone": lone, "stand": stand}

def real_tid(r, az_tag="ref"):
    return "r" + hashlib.sha1((r["rid"] + az_tag).encode()).hexdigest()[:10]

def export_real(r):
    tid = real_tid(r); f = CACHE / "t" / f"{tid}.json"
    if f.exists(): return tid
    c = qsm.read(r["path"]).cylinders
    az = random.Random(r["rid"] + "ref").uniform(0, 2 * math.pi); ca, sa = math.cos(az), math.sin(az)
    R = np.array([[ca, -sa, 0], [sa, ca, 0], [0, 0, 1]])
    f.write_text(json.dumps({"start": np.round(c.start @ R.T, 4).tolist(), "axis": np.round(c.axis @ R.T, 5).tolist(),
        "length": np.round(c.length, 4).tolist(), "radius": np.round(c.radius, 5).tolist(), "parent": c.parent.tolist()}))
    return tid

def draw_refs(pools, species, regime, rng, n):
    pool = pools[regime]
    same = [r for r in pool if species in SPECIES_MATCH and SPECIES_MATCH[species](r)]
    if len(same) >= n: src, kind = same, "same-species"
    else: src, kind = [r for r in pool if not r["species"].startswith(BROADLEAF_NOT)], "broadleaf"
    return rng.sample(src, n), kind

# ---- geometry (mirrors render/page.ts's fit) ---------------------------------------------------------------------
def fit_scale(tid):
    q = json.load(open(CACHE / "t" / f"{tid}.json"))
    s = np.array(q["start"]); a = np.array(q["axis"]); L = np.array(q["length"]); r = np.array(q["radius"])
    root = s[q["parent"].index(-1)]
    e = s + a * L[:, None]
    zMin, zMax = s[:, 2].min(), max(s[:, 2].max(), e[:, 2].max())
    x0 = np.concatenate([s[:, 0], e[:, 0]]) - root[0]; rr = np.concatenate([r, r])
    wC = (x0 + rr).max() - (x0 - rr).min()
    hC = (zMax - zMin) / CELL; wC /= CELL
    return min((PH - GROUND - TOP) / hC, (PW - 24) / wC), hC

# ---- build ------------------------------------------------------------------------------------------------------
def render(ids):
    todo = [i for i in dict.fromkeys(ids) if not (CACHE / "png" / f"{i}.png").exists()]
    if not todo: return
    lst = CACHE / "render.list"; lst.write_text("\n".join(todo) + "\n")
    for attempt in range(2):
        r = subprocess.run(["node", str(J / "render/render.mjs"), str(lst), str(CACHE / "png")], cwd=J, capture_output=True, text=True, timeout=3600)
        print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-300:])
        sk = json.load(open(CACHE / "png" / "_skipped.json"))
        todo = [i for i in todo if not (CACHE / "png" / f"{i}.png").exists()]
        if not todo: return
        lst.write_text("\n".join(todo) + "\n")

def flat(path):
    im = Image.open(path).convert("RGBA"); bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); return bg.convert("RGB")

def compose(refs, a_id, b_id, out, hpx):
    top = int(max(0, PH - GROUND - hpx - 60)); W, H = 1000, 520 + PH - top + 8
    im = Image.new("RGB", (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
    big = ImageFont.load_default(size=26); small = ImageFont.load_default(size=22)
    d.text((16, 6), "Reference: real trees", fill=(30, 30, 30), font=big)
    for k, rid in enumerate(refs):
        p = flat(CACHE / "png" / f"{rid}.png").resize((250, 437), Image.LANCZOS); im.paste(p, (k * 250, 40))
    d.line([(0, 492), (W, 492)], fill=(150, 150, 150), width=2)
    for k, (lab, pid) in enumerate((("A", a_id), ("B", b_id))):
        x = 70 + k * 460; im.paste(flat(CACHE / "png" / f"{pid}.png").crop((0, top, PW, PH)), (x, 520)); d.text((x + 6, 524), lab, fill=(30, 30, 30), font=big)
    im.save(out)

def build_set(name, specs, batch=24, stand_season=70, lone_season_arg="match", n_ref=4, rng_seed=20261106):
    rng = random.Random(f"{rng_seed}:{name}")
    pools = real_pools()
    for p in (CACHE / "t", CACHE / "sims", CACHE / "dumps", CACHE / "png"): p.mkdir(parents=True, exist_ok=True)
    # 1. seasons and simulations
    cfgs = {}
    for s in specs:
        for k in ("cfg1", "cfg2"): cfgs[id(s[k])] = s[k]
    lone_s = {}
    for s in specs:
        c1 = s["cfg1"]
        lone_s[s["cfg1"]["hash"]] = int(lone_season_arg) if str(lone_season_arg).isdigit() else lone_season(c1)
    jobs = {}
    for s in specs:
        ls = lone_s[s["cfg1"]["hash"]]; s["lone_season"] = ls
        for k in ("cfg1", "cfg2"):
            c = s[k]; seed = s["seed"] + c["seed_offset"]
            jobs[(c["hash"], seed, ls)] = (c, seed, ls)
    print("simulations", len(jobs), flush=True)
    res = {}
    def runjob(kv):
        k, (c, seed, ls) = kv
        try: res[k] = sim_records(c, seed, ls, stand_season)
        except Exception as e: print("SIMFAIL", k, str(e)[:200], flush=True); res[k] = []
    with ThreadPoolExecutor(WORKERS) as ex: list(ex.map(runjob, jobs.items()))
    # 2. pair up
    items, skips = [], []
    for n_, s in enumerate(specs):
        ls = s["lone_season"]
        r1 = [r for r in res[(s["cfg1"]["hash"], s["seed"] + s["cfg1"]["seed_offset"], ls)] if r["regime"] == s["regime"] and ok_sim(r)]
        r2 = [r for r in res[(s["cfg2"]["hash"], s["seed"] + s["cfg2"]["seed_offset"], ls)] if r["regime"] == s["regime"] and ok_sim(r)]
        if s["regime"] == "lone": cand = [(a, b) for a in r1 for b in r2]
        else:
            i1 = {r["index"]: r for r in r1}; i2 = {r["index"]: r for r in r2}
            cand = [(i1[i], i2[i]) for i in STAND_IDX if i in i1 and i in i2]
        if not cand: skips.append(dict(seed=s["seed"], regime=s["regime"], kind=s.get("kind"), why="no tree passes filters in both")); continue
        a, b = cand[rng.randrange(len(cand))]
        refs, rkind = draw_refs(pools, s["cfg1"]["species"], s["regime"], rng, n_ref)
        fa, fb = fit_scale(a["tid"]), fit_scale(b["tid"]); sc = min(fa[0], fb[0]); hpx = max(fa[1], fb[1]) * sc
        items.append(dict(spec=s, t1=a, t2=b, scale=sc, hpx=hpx, refs=refs, rkind=rkind))
    # 3. render
    ids = []
    for it in items:
        it["rid"] = [export_real(r) for r in it["refs"]]
        it["p1"] = f"{it['t1']['tid']}@{it['scale']:.5f}"; it["p2"] = f"{it['t2']['tid']}@{it['scale']:.5f}"
        ids += it["rid"] + [it["p1"], it["p2"]]
    print("panels", len(set(ids)), flush=True)
    render(ids)
    # 4. compose, batch, key
    rng.shuffle(items)
    nb = max(1, round(len(items) / batch))
    names = set(); key = []
    for i, it in enumerate(items):
        b = i % nb
        while True:
            nm = "q" + "".join(rng.choice("0123456789abcdef") for _ in range(5))
            if nm not in names: names.add(nm); break
        c1_side = rng.choice("AB")
        a_id, b_id = (it["p1"], it["p2"]) if c1_side == "A" else (it["p2"], it["p1"])
        out = J / name / "batches" / f"b{b + 1}"; out.mkdir(parents=True, exist_ok=True)
        compose(it["rid"], a_id, b_id, out / f"{nm}.png", it["hpx"])
        s = it["spec"]
        key.append(dict(batch=f"b{b + 1}", name=nm + ".png", cfg1_side=c1_side, cfg1=s["cfg1"]["name"], cfg2=s["cfg2"]["name"],
                        seed1=s["seed"] + s["cfg1"]["seed_offset"], seed2=s["seed"] + s["cfg2"]["seed_offset"], regime=s["regime"],
                        season=(it["t1"]["season"], it["t2"]["season"]), kind=s.get("kind"), ref_kind=it["rkind"],
                        refs=[r["rid"] for r in it["refs"]], tree_index=(it["t1"]["index"], it["t2"]["index"]),
                        heights=(round(it["t1"]["height"], 1), round(it["t2"]["height"], 1))))
    KEYS.mkdir(exist_ok=True)
    (KEYS / f"{name}.json").write_text(json.dumps(dict(set=name, items=key, skips=skips), indent=1))
    by = {}
    for k in key: by.setdefault(k["batch"], []).append(k["name"])
    (J / name / "batches.json").write_text(json.dumps({b: sorted(v) for b, v in sorted(by.items())}, indent=1))
    print("built", len(key), "images in", nb, "batches; skipped", len(skips), flush=True)
    return key, skips

def parse_seeds(t):
    out = []
    for part in t.split(","):
        a, _, b = part.partition("-"); out += list(range(int(a), int(b or a) + 1))
    return out

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", required=True); ap.add_argument("--cfg1", required=True); ap.add_argument("--cfg2", required=True)
    ap.add_argument("--worktree1"); ap.add_argument("--worktree2"); ap.add_argument("--seed-offset2", type=int, default=0)
    ap.add_argument("--regimes", default="lone,stand"); ap.add_argument("--seeds", required=True)
    ap.add_argument("--stand-season", type=int, default=70); ap.add_argument("--lone-season", default="match")
    ap.add_argument("--n-ref", type=int, default=4); ap.add_argument("--batch", type=int, default=24)
    a = ap.parse_args()
    c1 = resolve_cfg(a.cfg1, a.worktree1); c2 = resolve_cfg(a.cfg2, a.worktree2, a.seed_offset2 or None)
    specs = [dict(cfg1=c1, cfg2=c2, regime=rg, seed=sd, kind="cli") for rg in a.regimes.split(",") for sd in parse_seeds(a.seeds)]
    build_set(a.set, specs, a.batch, a.stand_season, a.lone_season, a.n_ref)
