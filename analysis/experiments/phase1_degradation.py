"""Phase 1's degradation test, gate c v3.1 (docs/plans/2026-11-03-reference-fidelity.md §j, 1d-ii; ADR 0049): simulated
stand trees at their size-matched season, coarsened at each dataset's d_min and tier B's bracket, judged by the two
tiers (treesim/tiers.py) against the tolerances pre-registered in analysis/fit/sources/phase1-tolerances.json
(treesim/tolerance.py), which this script never writes. It refuses to run if a hashed file has changed since that file
was committed.

    uv run --project analysis python -I analysis/experiments/phase1_degradation.py sizematch  # the seasons (after the sweep)
    uv run --project analysis python -I analysis/experiments/phase1_degradation.py dump       # trees at those seasons
    uv run --project analysis python -I analysis/experiments/phase1_degradation.py gate       # gate c v3.1

The sweep is `node analysis/experiments/gate_c_sim.ts sizematch species seed out [assign.json]` (see the note). Beech
is run at its Level 0 fit (docs/experiments/fits/level0/beech.json, `fit.assign`); oak and maple at the shipped params
(their Level 0 fits are not accepted). Writes runs/gate-c/. The write-up is
docs/experiments/2026-11-03-phase1-converter.md.
"""

from __future__ import annotations

import csv
import json
import math
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

from treesim import coarsen as co
from treesim import control as ct
from treesim import simtree
from treesim import tiers
from treesim import tolerance as tol
from treesim.describe import describe

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "runs" / "gate-c"
SIZE = RUNS / "sizematch"
TREES = RUNS / "trees"
SPECIES = ("beech", "oak", "maple")
ASSIGN = {"beech": RUNS / "beech-assign.json"}  # oak and maple: the shipped params
LONE_SEASONS = (50, 60, 70, 80, 90, 100)
WORKERS = 12


def _num(v) -> float:
    return math.nan if v is None else float(v)


def _check_hashes(t: dict) -> None:
    now = tol.file_hashes()
    bad = [f for f, h in t["hashes"].items() if now.get(f) != h]
    if bad:
        sys.exit(f"refusing: changed since the tolerances were committed: {', '.join(bad)}")


def _check(t: dict) -> None:
    """The hashes, and that the registered file is the version this wiring is for."""
    _check_hashes(t)
    if t["version"] != 3.1:
        sys.exit(f"refusing: this wiring is gate c v3.1's, the file is v{t['version']}")


# ---------------------------------------------------------------------------------------------------------------
# Size matching (rules.size_match)

def match_season(by_season: dict[int, list[float]], reference: float, seasons) -> int | None:
    """The first season of `seasons` at which the median over seeds of the per-seed values reaches the reference."""
    for s in seasons:
        v = [x for x in by_season.get(s, []) if math.isfinite(x)]
        if v and float(np.median(v)) >= reference:
            return s
    return None


def _seed_values(trees: list[dict], key: str) -> float | None:
    v = [t[key] for t in trees if t.get("alive")]
    return float(np.median(v)) if v else None


def _by_season(species: str, rules: dict) -> tuple[dict, dict]:
    stand: dict[int, dict[str, list]] = {}
    lone: dict[int, dict[str, list]] = {}
    for seed in rules["seeds"]:
        d = json.loads((SIZE / f"{species}-{seed}.json").read_text())
        for s in d["stand"]:
            for key in ("dbh", "height"):
                v = _seed_values(s["trees"], key)
                if v is not None:
                    stand.setdefault(s["season"], {}).setdefault(key, []).append(v)
            stand.setdefault(s["season"], {}).setdefault("live", []).append(sum(t["alive"] for t in s["trees"]))
        for s in d["lone"]:
            if s["alive"]:
                for key in ("dbh", "height"):
                    lone.setdefault(s["season"], {}).setdefault(key, []).append(s[key])
    return stand, lone


def reference_height(species: str) -> float:
    """The median measured height of the species' size-match reference set (Wytham's Hgt_pts, BioDiv's hTLS)."""
    dataset, code = tol.SPECIES_SET[species]
    sel = [r for r in tol.real_sets()
           if r["dataset"] == dataset and r["species"] == code and math.isfinite(r["dbh_measured"])]
    if dataset == "wytham":
        tls = {r["Tree_ID"]: r for r in tol._csv(tol.DATA / "wytham" / "analysis_and_figures" / "tls_summary.csv")}
        h = [tol._num(tls[r["tree"]]["Hgt_pts_[m]"]) for r in sel]
    else:
        labels = {r["treeID"]: r for r in tol._csv(tol.DATA / "biodiv" / "labels.csv")}
        h = [tol._num(labels[r["tree"]]["hTLS"]) for r in sel]
    return float(np.nanmedian(h))


def sizematch(t: dict) -> None:
    rules = t["rules"]
    out = {}
    lines = []
    for species in SPECIES:
        ref = t["reference_dbh"][species]["median_dbh"]
        stand, lone = _by_season(species, rules)
        seasons = rules["size_match"]["stand_seasons"]
        s_season = match_season({s: v["dbh"] for s, v in stand.items()}, ref, seasons)
        l_season = match_season({s: v["dbh"] for s, v in lone.items()}, ref, LONE_SEASONS)
        l_at = l_season if l_season is not None else LONE_SEASONS[-1]
        med = lambda d, s, k: float(np.median(d[s][k])) if s in d and d[s].get(k) else math.nan  # noqa: E731
        out[species] = {
            "reference_dbh": ref, "reference_height": reference_height(species),
            "stand_season": s_season, "lone_season": l_at, "lone_reached": l_season is not None,
            "stand_by_season": {s: {"dbh": med(stand, s, "dbh"), "height": med(stand, s, "height"),
                                    "live_trees": med(stand, s, "live"), "seeds": len(stand[s].get("dbh", []))}
                                for s in seasons},
            "lone_by_season": {s: {"dbh": med(lone, s, "dbh"), "height": med(lone, s, "height"),
                                   "seeds": len(lone.get(s, {}).get("dbh", []))} for s in LONE_SEASONS},
        }
        o = out[species]
        lines.append(f"\n**{species}** (reference DBH {ref:.3f} m, height {o['reference_height']:.1f} m)")
        lines.append(f"- stand: season {s_season}" + ("" if s_season is None else
                     f", median DBH {o['stand_by_season'][s_season]['dbh']:.3f} m, height "
                     f"{o['stand_by_season'][s_season]['height']:.1f} m, median live measured trees "
                     f"{o['stand_by_season'][s_season]['live_trees']:g} of 4, "
                     f"{o['stand_by_season'][s_season]['seeds']} seeds with a live tree"))
        lo = o["lone_by_season"][l_at]
        lines.append(f"- lone: season {l_at}{'' if l_season is not None else ' (not reached by 100: read at 100)'}, "
                     f"median DBH {lo['dbh']:.3f} m, height {lo['height']:.1f} m")
        lines.append("")
        lines.append("| stand season | median DBH (m) | median height (m) | live of 4 | seeds |")
        lines.append("|---|---|---|---|---|")
        for s, v in o["stand_by_season"].items():
            lines.append(f"| {s} | {v['dbh']:.3f} | {v['height']:.1f} | {v['live_trees']:g} | {v['seeds']} |")
            if s_season is not None and s >= s_season + 20:
                break
        lines.append("")
        lines.append("| lone season | median DBH (m) | median height (m) | seeds |")
        lines.append("|---|---|---|---|")
        lines += [f"| {s} | {v['dbh']:.3f} | {v['height']:.1f} | {v['seeds']} |" for s, v in o["lone_by_season"].items()]
    RUNS.mkdir(parents=True, exist_ok=True)
    (RUNS / "sizematch.json").write_text(json.dumps(out, indent=1))
    (RUNS / "sizematch.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


# ---------------------------------------------------------------------------------------------------------------
# The dump at the chosen seasons

def _dump_one(job: tuple[str, int, int, int]) -> str:
    species, seed, stand, lone = job
    out = TREES / f"{species}-{seed}.json"
    if not out.exists():
        part = out.with_suffix(".partial")
        cmd = ["node", "analysis/experiments/gate_c_sim.ts", "dump", species, str(seed), str(part), str(stand),
               str(lone)] + ([str(ASSIGN[species])] if species in ASSIGN else [])
        subprocess.run(cmd, cwd=ROOT, check=True)
        part.rename(out)
    return str(out)


def dump(rules: dict) -> None:
    sm = json.loads((RUNS / "sizematch.json").read_text())
    jobs = []
    for species in SPECIES:
        if sm[species]["stand_season"] is None:  # rules.size_match.stand: "None by 300: report and stop"
            print(f"{species}: the stand does not reach the reference DBH by 300 (a compute bound): reported, not run")
            continue
        jobs += [(species, seed, sm[species]["stand_season"], sm[species]["lone_season"]) for seed in rules["seeds"]]
    with ProcessPoolExecutor(WORKERS) as ex:
        for path in ex.map(_dump_one, jobs):
            print(path, flush=True)


def _load(species: str, seed: int) -> list[simtree.SimTree]:
    with (TREES / f"{species}-{seed}.json").open() as f:
        return [simtree.from_dump(t) for t in json.load(f)["trees"]]


# ---------------------------------------------------------------------------------------------------------------
# Gate c v3.1

def _describe_tree(args) -> dict:
    """describe() of one simulated tree, and of its coarsened versions: each evaluation point (prune only), and the
    inflation at d_min (inflate, then prune)."""
    tree, points, d_min = args
    c = tree.cylinders
    out = {tiers.FINE: describe(c)}
    if tree.meta["trial"] != "stand":
        return out
    for name, d in points:
        out[name] = describe(co.coarsen(c, co.Resolution(d, (), ())))
    out[tiers.INFLATED] = describe(co.coarsen(c, co.Resolution(d_min, (), ()), inflated=True))
    return out


def _shift(values, version: str, reference: str) -> list[float]:
    return [tiers._seed_median(by.get(version, []), by.get(reference, [])) for by in values.values()]


def judge(row: dict, values: dict, points: list[str], neutral_share: float) -> dict:
    """One clear descriptor's tiers (tiers.assign) with the evidence: seeds within tolerance at each point under
    each tier, the worst point of the deciding tier, and the signed median shift there."""
    tl = _num(row["tolerance"])
    neutral = ct.neutral(neutral_share)
    a = {p: tiers.seeds_within(values, p, tiers.FINE, tl) for p in [*points, tiers.INFLATED]}
    b = {p: tiers.seeds_within(values, p, points[0], tl) for p in [*points[1:], tiers.INFLATED]}
    tier = tiers.assign(values, points, tl, neutral)
    wa = min(a, key=lambda p: (a[p], p))
    wb = min(b, key=lambda p: (b[p], p))
    deciding = (tier if tier in ("A", "B") else "A")
    worst, ref = (wa, tiers.FINE) if deciding == "A" else (wb, points[0])
    shifts = [x for x in _shift(values, worst, ref) if math.isfinite(x)]
    med_shift = float(np.median(shifts)) if shifts else math.nan
    med_abs = float(np.median(np.abs(shifts))) if shifts else math.nan
    if tier == "A":
        reason = f"A: within tolerance on >= {tiers.PASS_SEEDS} of 20 seeds at every point (fewest {a[wa]} at {wa})"
    elif tier == "B":
        reason = f"A fails ({wa}: {a[wa]} of 20); B passes (fewest {b[wb]} at {wb}); control neutral at d_min"
    else:
        why_b = (f"B: control not neutral at d_min ({neutral_share:.2f} of trees)" if not neutral
                 else f"B fails ({wb}: {b[wb]} of 20)")
        reason = f"A fails ({wa}: {a[wa]} of 20); {why_b}"
    held = tier == "held out"
    return {"tier": "–" if held else tier, "verdict": "held out (resolution-sensitive)" if held else f"tier {tier}",
            "worst_point": worst, "worst_seeds": a[wa] if deciding == "A" else b[wb],
            "shift": med_shift, "median_abs_shift": med_abs, "reason": reason,
            "control_share_at_dmin": neutral_share, "control_neutral": neutral,
            **{f"A:{p}": n for p, n in a.items()}, **{f"B:{p}": n for p, n in b.items()}}


def evaluate(species: str, table: list[dict], described: dict, points: list[str], shares: dict,
             descriptors: list[str]) -> list[dict]:
    """The species' table: every descriptor with its standing (report-only, H1, the floor) and, for the clear ones,
    the tier. `described[seed]` is the list over the seed's live measured trees of {version: {descriptor: value}}."""
    out = []
    for key in descriptors:
        row = next(r for r in table if r["species"] == species and r["descriptor"] == key)
        base = {"species": species, "descriptor": key, "tolerance": _num(row["tolerance"]),
                "noise_ratio": _num(row["noise_ratio"]), "floor": row["noise_verdict"]}
        if row["noise_verdict"] != "clear":
            out.append({**base, "tier": "–", "verdict": row["noise_verdict"], "reason": row["noise_verdict"]})
            continue
        values = {seed: {v: [_num(tree[v].get(key)) for tree in trees] for v in (tiers.FINE, *points, tiers.INFLATED)}
                  for seed, trees in described.items()}
        out.append({**base, **judge(row, values, points, _num(shares.get(key)))})
    return out


def amendment_e(rows: list[dict]) -> tuple[int, int, bool]:
    """(descriptors that pass the floor, those that reach a tier, whether fewer than half do)."""
    clear = [r for r in rows if r["floor"] == "clear"]
    surv = sum(r["tier"] in ("A", "B") for r in clear)
    return len(clear), surv, surv < len(clear) / 2


def gate(t: dict) -> None:
    _check(t)
    rules = t["rules"]
    if rules["pass_seeds"] != tiers.PASS_SEEDS:
        sys.exit("refusing: tiers.PASS_SEEDS differs from the registered pass_seeds")
    sm = json.loads((RUNS / "sizematch.json").read_text())
    descriptors = t["descriptors"]
    sim_rows, tables, summary = [], {}, {}
    for species in SPECIES:
        if sm[species]["stand_season"] is None:
            continue
        dataset = tol.SPECIES_SET[species][0]
        res = t["resolution"][dataset]
        d_min = res["d_min"]
        grid = {int(k): v for k, v in res["grid"].items()}
        points = tiers.evaluation_points(grid, d_min, res["upper_end"]["d"])
        names = [n for n, _ in points]
        jobs, keys = [], []
        for seed in rules["seeds"]:
            for k, tree in enumerate(_load(species, seed)):
                if tree.meta["trial"] == "stand" and not tree.meta["alive"]:
                    continue
                jobs.append((tree, points, d_min))
                keys.append((seed, tree.meta["trial"], k, tree.meta["season"]))
        with ProcessPoolExecutor(WORKERS) as ex:
            described = list(ex.map(_describe_tree, jobs, chunksize=1))
        for (seed, trial, k, season), d in zip(keys, described):
            for v, values in d.items():
                sim_rows.append({"species": species, "seed": seed, "trial": trial, "tree": k, "season": season,
                                 "version": v, **{key: values.get(key) for key in descriptors + ["dbh", "height"]}})
        by_seed = {seed: [d for (s, trial, _, _), d in zip(keys, described) if s == seed and trial == "stand"]
                   for seed in rules["seeds"]}
        shares = {c["descriptor"]: c["control_share_at_dmin"] for c in t["candidates"] if c["species"] == species}
        rows = evaluate(species, t["table"], by_seed, names, shares, descriptors)
        tables[species] = rows
        n_clear, n_surv, stop = amendment_e(rows)
        # The registered rule reads describe()'s DBH: the dumped trees must reproduce the sweep's size match.
        per_seed = [float(np.median([d[tiers.FINE]["dbh"] for d in trees])) for trees in by_seed.values() if trees]
        py_dbh = float(np.median(per_seed))
        if py_dbh < sm[species]["reference_dbh"]:
            print(f"WARNING {species}: describe()'s median DBH {py_dbh:.4f} m is under the reference "
                  f"{sm[species]['reference_dbh']:.4f} m: the size match is not reproduced", flush=True)
        summary[species] = {"points": [(n, d) for n, d in points], "stand_season": sm[species]["stand_season"],
                            "describe_median_dbh": py_dbh, "reference_dbh": sm[species]["reference_dbh"],
                            "live_trees_per_seed": [len(by_seed[s]) for s in rules["seeds"]],
                            "clear": n_clear, "survivors": n_surv, "amendment_e_stop": stop}
        print(species, "described", len(jobs), "survivors", n_surv, "of", n_clear, flush=True)
    _write(RUNS / "sim-describe.csv", sim_rows)
    flat = [r for rows in tables.values() for r in rows]
    _write(RUNS / "gate-c.csv", flat)
    (RUNS / "gate-c.json").write_text(json.dumps({"summary": summary, "tables": tables}, indent=1, default=str))
    md = markdown(tables, summary)
    (RUNS / "gate-c.md").write_text(md)
    print(md)


def markdown(tables: dict, summary: dict) -> str:
    f = lambda x: "–" if not isinstance(x, (int, float)) or not math.isfinite(x) else f"{x:.3g}"  # noqa: E731
    lines = []
    for species, rows in tables.items():
        s = summary[species]
        pts = ", ".join(f"{n} {d * 1000:.1f} mm" for n, d in s["points"])
        lines += [f"\n**{species}** (stand season {s['stand_season']}, describe() median DBH {s['describe_median_dbh']:.3f} m "
                  f"against the reference {s['reference_dbh']:.3f}; points {pts}; inflation at d_min): "
                  f"{s['survivors']} of {s['clear']} floor-clear descriptors reach a tier"
                  f"{' (fewer than half: STOP, amendment E)' if s['amendment_e_stop'] else ''}\n",
                  "| descriptor | tier | shift | tolerance | floor ratio | verdict | reason |", "|---|---|---|---|---|---|---|"]
        for r in rows:
            lines.append(f"| {r['descriptor']} | {r['tier']} | {f(r.get('shift'))} | {f(r['tolerance'])} | "
                         f"{f(r['noise_ratio'])} | {r['verdict']} | {r['reason']} |")
    return "\n".join(lines) + "\n"


def _write(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    keys = list(dict.fromkeys(k for r in rows for k in r))
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, keys, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def bias() -> None:
    """H4: the median QSM-against-measured DBH bias with its sign, per dataset and species (the model read; DBHqsm's
    rule), beside the reference's kind: Demol's tape, Wytham's and BioDiv's point clouds."""
    from treesim import qsm_gate as qg

    kinds = {"demol": ("field_dbh", "tape"), "wytham": ("pts_dbh", "points (DBH_pts)"), "biodiv": ("pts_dbh", "points (dTLS)")}
    lines = ["| dataset | species | reference | trees | median bias | IQR | share > 0 |", "|---|---|---|---|---|---|---|"]
    for source, rows in (("demol", qg.demol_rows()), ("wytham", qg.wytham_rows()), ("biodiv", qg.biodiv_rows())):
        key, kind = kinds[source]
        for sp in sorted({r["species"] for r in rows}):
            e = np.array([r["dbh"] / r[key] - 1 for r in rows if r["species"] == sp and math.isfinite(r[key]) and r[key] > 0])
            if len(e):
                q1, q3 = np.percentile(e, [25, 75])
                lines.append(f"| {source} | {sp} | {kind} | {len(e)} | {100 * np.median(e):+.1f}% | "
                             f"{100 * q1:+.1f}% to {100 * q3:+.1f}% | {np.mean(e > 0):.0%} |")
    (RUNS / "dbh-bias.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "gate"
    t = json.loads(tol.TOLERANCES.read_text())
    if what == "sizematch":
        _check(t)
        sizematch(t)
    elif what == "dump":
        _check(t)
        dump(t["rules"])
    elif what == "gate":
        gate(t)
    elif what == "bias":
        bias()
