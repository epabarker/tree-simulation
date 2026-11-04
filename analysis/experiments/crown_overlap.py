"""Crown competition diagnosis (2026-11-04; docs/experiments/2026-11-04-crown-competition.md), step 1 and helpers.

Runs analysis/experiments/crown_dump.ts on the closed stand and measures how far each tree's live-bud tips reach into
its neighbours' ground: per tree and season, CR by direction (all live buds, as cli/allometry.ts reads it; leafy only;
Voronoi-clipped; 95th percentile), the nearest stem in each direction, the share of tips nearer another stem than
their own (by bud state), where those tips sit against the neighbour's foliage there (above, within, below, or where it
has none), whether they are new and fed (encroachment) or laid down before canopy closure (legacy), their light
against own-side tips at the same height, and ADR 0013's shyness metric in 3D (canopy cells with leafy tips of two or
more trees).

  uv run --project analysis python -I analysis/experiments/crown_overlap.py dump [--species ...] [--seeds 1-5]
  uv run --project analysis python -I analysis/experiments/crown_overlap.py table
Dumps in runs/crown-competition/dumps/ (git-ignored); per-tree records in runs/crown-competition/trees.csv.
"""

import argparse
import json
import subprocess
import sys
from multiprocessing import Pool
from pathlib import Path

import numpy as np
import polars as pl

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "runs" / "crown-competition"
DUMPS = RUNS / "dumps"
CELL = 0.25
MEASURED = [4, 5, 6, 7]
ACTIVE, DORMANT, SHORT = 1, 2, 5
RECENT = 10  # seasons: a tip born this recently is new growth


def fit_assign(species: str) -> dict:
    # As level0_bounds_probe.py reads a fit: S.json's fit.assign (with its [fixed] and [form]).
    return json.loads((ROOT / f"docs/experiments/fits/level0/{species}.json").read_text())["fit"]["assign"]


def run_job(args: tuple[str, dict]) -> str:
    name, job = args
    out = DUMPS / f"{name}.json"
    if out.exists():
        return name
    out.parent.mkdir(parents=True, exist_ok=True)
    jf = DUMPS / f"{name}.job.json"
    jf.write_text(json.dumps(job))
    r = subprocess.run(["node", str(ROOT / "analysis/experiments/crown_dump.ts"), str(jf), str(out)], cwd=ROOT,
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{name}: {r.stderr[-2000:]}")
    return name


def run_jobs(jobs: dict[str, dict], workers: int = 8) -> None:
    DUMPS.mkdir(parents=True, exist_ok=True)
    with Pool(workers) as pool:
        for name in pool.imap_unordered(run_job, list(jobs.items())):
            print("done", name, flush=True)


def closure_season(lai: list) -> int:
    """First season the ring's LAI reaches 90% of its maximum over seasons ≤ 60."""
    early = [(s, v) for s, v in lai if s <= 60]
    peak = max(v for _, v in early)
    return next(s for s, v in early if v >= 0.9 * peak)


def wrap(dx: np.ndarray, width: float) -> np.ndarray:
    return (dx + width / 2) % width - width / 2


def analyse(dump: dict, measured: list[int] | None = None) -> list[dict]:
    """One record per measured live tree and dumped season."""
    width, depth = dump["width"], dump["depth"]
    closure = closure_season(dump["lai"])
    measured = measured if measured is not None else dump["job"].get("measured", MEASURED)
    recs = []
    for snap in dump["snaps"]:
        season = snap["season"]
        trees = snap["trees"]
        live = [t for t in trees if t["alive"]]
        roots = np.array([[t["rootX"], t["rootZ"]] for t in live])
        ids = [t["index"] for t in live]
        tips = {t["index"]: np.array(t["tips"], dtype=float).reshape(-1, 10) for t in live}
        # Leafy tips of every tree, for the neighbour's foliage and the shyness metric.
        leafy_all = {k: a[(a[:, 3] == ACTIVE) | (a[:, 3] == SHORT)] for k, a in tips.items()}
        base = np.median([np.percentile(a[:, 1], 5) for a in leafy_all.values() if len(a)])
        # ADR 0013's metric in 3D: canopy cells (above the stand's crown base) with leafy tips of ≥ 2 trees.
        owner: dict[tuple, set] = {}
        for k, a in leafy_all.items():
            for x, y, z in a[:, :3]:
                if y < base:
                    continue
                owner.setdefault((int(np.floor(x)) % width, int(np.floor(y)), int(np.floor(z))), set()).add(k)
        shared_cells = np.mean([len(v) > 1 for v in owner.values()]) if owner else np.nan
        cols: dict[tuple, set] = {}
        for (x, y, z), v in owner.items():
            cols.setdefault((x, z), set()).update(v)
        shared_cols = np.mean([len(v) > 1 for v in cols.values()]) if cols else np.nan
        vox: dict[tuple, set] = {}
        for (x, y, z), v in owner.items():
            vox.setdefault((x // 4, y // 4, z // 4), set()).update(v)
        shared_vox = np.mean([len(v) > 1 for v in vox.values()]) if vox else np.nan
        dead_ids = {t["index"] for t in trees if not t["alive"]}
        all_roots = np.array([[t["rootX"], t["rootZ"]] for t in trees])
        for k in measured:
            if k not in tips or len(tips[k]) == 0 or len(ids) < 2:
                continue
            t = trees[k]
            a = tips[k]
            rx, rz = t["rootX"], t["rootZ"]
            dx, dz = wrap(a[:, 0] - rx, width), a[:, 2] - rz
            state, q, v, birth, y = a[:, 3], a[:, 4], a[:, 5], a[:, 7], a[:, 1]
            # Nearest other live stem for each tip (Voronoi side), periodic in x.
            others = [i for i in ids if i != k]
            ox = np.array([trees[i]["rootX"] for i in others])
            oz = np.array([trees[i]["rootZ"] for i in others])
            ddx = wrap(a[:, 0][:, None] - ox[None, :], width)
            ddz = a[:, 2][:, None] - oz[None, :]
            dn = np.hypot(ddx, ddz)
            nearest = dn.argmin(axis=1)
            own_d = np.hypot(dx, dz)
            foreign = dn.min(axis=1) < own_d
            leafy = (state == ACTIVE) | (state == SHORT)
            rec = {
                "season": season, "tree": k, "closure": closure,
                "cr_gate": t["allometry"]["crownRadius"], "dbh": t["allometry"]["dbh"], "H": t["allometry"]["height"],
                "maxOffset": t["allometry"]["maxOffset"], "n_tips": len(a), "shared_cells": shared_cells,
                "shared_cols": shared_cols, "shared_vox1m": shared_vox, "stand_base": base * CELL,
            }
            # CR by direction: all live (the gate's reading, from the root rather than the trunk at 1.3 m), leafy only,
            # Voronoi-clipped (own side only), and the 95th percentile of the projection within ±45° of the axis.
            axes = {"+x": (dx, 1), "-x": (dx, -1), "+z": (dz, 1), "-z": (dz, -1)}
            for name, sel in {"all": np.ones(len(a), bool), "leafy": leafy, "own": ~foreign,
                              "dormant": state == DORMANT}.items():
                ext = []
                for ax, (d, sgn) in axes.items():
                    p = sgn * d[sel]
                    e = max(p.max(), 0.0) if len(p) else 0.0
                    ext.append(e)
                    if name == "all":
                        rec[f"ext{ax}"] = e * CELL
                rec[f"cr_{name}"] = float(np.mean(ext)) * CELL
            p95 = []
            for ax, (d, sgn) in axes.items():
                other = dz if ax[1] == "x" else dx
                cone = (sgn * d > 0) & (np.abs(other) <= sgn * d)
                p95.append(np.percentile(sgn * d[cone], 95) if cone.any() else 0.0)
            rec["cr_p95"] = float(np.mean(p95)) * CELL
            # Which bud sets each direction's extreme (the gate's CR): its state, side, age class.
            ex_states, ex_foreign, ex_legacy, ex_age = [], [], [], []
            for ax, (d, sgn) in axes.items():
                j = int(np.argmax(sgn * d))
                ex_states.append(int(state[j]))
                ex_foreign.append(bool(foreign[j]))
                ex_legacy.append(bool(birth[j] < closure))
                ex_age.append(season - birth[j])
            rec["extreme_dormant"] = np.mean([s == DORMANT for s in ex_states])
            rec["extreme_short"] = np.mean([s == SHORT for s in ex_states])
            rec["extreme_active"] = np.mean([s == ACTIVE for s in ex_states])
            rec["extreme_foreign"] = np.mean(ex_foreign)
            rec["extreme_legacy"] = np.mean(ex_legacy)
            rec["extreme_wood_age"] = float(np.mean(ex_age))
            rec["extreme_recent"] = np.mean([g < RECENT for g in ex_age])
            # Nearest stem in each direction (within ±45° of the axis), live trees, m.
            rel = np.c_[wrap(all_roots[:, 0] - rx, width), all_roots[:, 1] - rz]
            for ax in ["+x", "-x", "+z", "-z"]:
                i, sgn = (0, 1) if ax == "+x" else (0, -1) if ax == "-x" else (1, 1) if ax == "+z" else (1, -1)
                along, across = sgn * rel[:, i], np.abs(rel[:, 1 - i])
                ok = (along > 0) & (across <= along) & np.array([tt["alive"] for tt in trees])
                rec[f"nn{ax}"] = float(np.hypot(along[ok], across[ok]).min()) * CELL if ok.any() else np.nan
            # Tips on a neighbour's side.
            rec["foreign"] = foreign.mean()
            for sname, sv in [("active", ACTIVE), ("short", SHORT), ("dormant", DORMANT)]:
                s = state == sv
                rec[f"share_{sname}"] = s.mean()
                rec[f"foreign_{sname}"] = foreign[s].mean() if s.any() else np.nan
            f = foreign
            if f.any():
                # Encroaching: this season's shoot ends (active buds are formed at the tip of a shoot grown this
                # season, age 0; the bud that grew handed its v on); new: wood born in the last RECENT seasons.
                rec["enc_new_shoot"] = (state[f] == ACTIVE).mean()
                rec["enc_recent"] = (birth[f] >= season - RECENT).mean()
                rec["enc_fed"] = ((v[f] > 0) & (state[f] != ACTIVE)).mean()  # resting buds handed resource
                rec["enc_legacy"] = (birth[f] < closure).mean()  # laid down before canopy closure
                rec["enc_dormant"] = (state[f] == DORMANT).mean()
                rec["enc_short"] = (state[f] == SHORT).mean()
                # Against the neighbour's foliage within 1 m of the tip.
                cls = {"above": 0, "within": 0, "below": 0, "gap": 0}
                for j in np.flatnonzero(f):
                    nk = others[nearest[j]]
                    nl = leafy_all[nk]
                    near = nl[np.hypot(wrap(nl[:, 0] - a[j, 0], width), nl[:, 2] - a[j, 2]) <= 4] if len(nl) else nl
                    if len(near) == 0:
                        cls["gap"] += 1
                    elif y[j] > near[:, 1].max():
                        cls["above"] += 1
                    elif y[j] < near[:, 1].min():
                        cls["below"] += 1
                    else:
                        cls["within"] += 1
                for c, n in cls.items():
                    rec[f"v_{c}"] = n / f.sum()
                # Light: foreign leafy tips against own-side leafy tips in the same 2 m height band (median ratio).
                ratios = []
                band = np.floor(y / 8)
                for bnd in np.unique(band[f & leafy]):
                    fo = q[f & leafy & (band == bnd)]
                    ow = q[~f & leafy & (band == bnd)]
                    if len(fo) >= 3 and len(ow) >= 3 and np.median(ow) > 0:
                        ratios.append(np.median(fo) / np.median(ow))
                rec["q_ratio"] = float(np.median(ratios)) if ratios else np.nan
                rec["q_foreign"] = float(np.median(q[f & leafy])) if (f & leafy).any() else np.nan
            rec["q_own"] = float(np.median(q[~foreign & leafy])) if (~foreign & leafy).any() else np.nan
            # Dead neighbours: among the six nearest stems.
            d_all = np.hypot(rel[:, 0], rel[:, 1])
            d_all[k] = np.inf
            six = np.argsort(d_all)[:6]
            rec["dead_neighbours"] = int(sum(1 for i in six if trees[i]["index"] in dead_ids))
            recs.append(rec)
    return recs


def outer_lean(dump: dict) -> list[dict]:
    """Outer rows' leafy-crown centroid offset in z (+ = toward the slab's middle), and the middle row's ±z asymmetry."""
    depth = dump["depth"]
    out = []
    for snap in dump["snaps"]:
        for t in snap["trees"]:
            if not t["alive"]:
                continue
            a = np.array(t["tips"], dtype=float).reshape(-1, 10)
            lf = a[(a[:, 3] == ACTIVE) | (a[:, 3] == SHORT)]
            if not len(lf):
                continue
            inward = np.sign(depth / 2 - t["rootZ"])
            out.append({"season": snap["season"], "tree": t["index"], "rootZ": t["rootZ"],
                        "lean_in": float((lf[:, 2].mean() - t["rootZ"]) * inward) * CELL if inward else np.nan,
                        "cr": t["allometry"]["crownRadius"], "H": t["allometry"]["height"]})
    return out


def jobs_for(species: list[str], seeds: list[int], sets: list[str]) -> dict[str, dict]:
    jobs = {}
    for sp in species:
        for st in sets:
            for s in seeds:
                job = {"species": sp, "seed": s}
                if st == "fit":
                    job["assign"] = fit_assign(sp)
                jobs[f"{sp}-{st}-{s}"] = job
    return jobs


def load_records(pattern: str = "*-*-*.json") -> pl.DataFrame:
    rows = []
    for p in sorted(DUMPS.glob(pattern)):
        if p.name.endswith(".job.json"):
            continue
        sp, st, seed = p.stem.rsplit("-", 2)
        d = json.loads(p.read_text())
        for r in analyse(d):
            rows.append({"species": sp, "set": st, "seed": int(seed), **r})
    return pl.DataFrame(rows)


def seeds_arg(s: str) -> list[int]:
    a, b = s.split("-")
    return list(range(int(a), int(b) + 1))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["dump", "table"])
    ap.add_argument("--species", nargs="+", default=["oak", "beech", "birch"])
    ap.add_argument("--seeds", default="1-5")
    ap.add_argument("--sets", nargs="+", default=["hand", "fit"])
    a = ap.parse_args()
    if a.cmd == "dump":
        run_jobs(jobs_for(a.species, seeds_arg(a.seeds), a.sets))
        return
    df = load_records()
    df.write_csv(RUNS / "trees.csv")
    print(f"{len(df)} tree-seasons → {RUNS / 'trees.csv'}", file=sys.stderr)


if __name__ == "__main__":
    main()
