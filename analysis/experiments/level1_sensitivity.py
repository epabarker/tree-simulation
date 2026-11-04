"""Level 1 sensitivity (reference fidelity, phase 3; docs/experiments/2026-11-04-level1-sensitivity.md): what single
knobs can reach. For each Level 1 descriptor of registration v3 (beech), how far one knob moves it toward the real
target, and at what Level 0 cost. A reachability experiment, not a fit: it measures every descriptor, the held-out
ones too (the user, 2026-11-04), and writes them; the v3 hold-out rule is unaffected. Nothing here writes species
params, and nothing is accepted.

    uv run --project analysis python -I analysis/experiments/level1_sensitivity.py register
    uv run --project analysis python -I analysis/experiments/level1_sensitivity.py run [--smoke]
    uv run --project analysis python -I analysis/experiments/level1_sensitivity.py pairs
    uv run --project analysis python -I analysis/experiments/level1_sensitivity.py envelope
    uv run --project analysis python -I analysis/experiments/level1_sensitivity.py report

- **register** writes docs/experiments/fits/level1-sensitivity/registration.json before any simulated tree: the 18
  knobs (ten form, ADR 0029; eight physiology: Level 0's seven and r3.c), each at five points of its registered
  scale (u = 0, u_h/2, u_h, (u_h+1)/2, 1; u_h the hand's position), the seeds (v3's search seeds), the rules
  (reporting conventions, not gates) and the hashes.
- **run** measures the 73 conditions with the fit's own Measure (hide=False, all 16 descriptors, the stand at its
  size-matched season, the coarsened-simulation rule) → runs/level1-sensitivity/main.jsonl; resumable.
- **pairs** builds the interaction check's conditions from main.jsonl by the registered rule and measures them.
- **envelope** reads pilot v2's checkpoint (read-only): the joint-move envelope on the same seeds, fitted only.
- **report** bootstraps, applies the rules, and writes the tables and the heat maps.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import time
import tomllib
from concurrent.futures import ProcessPoolExecutor
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from treesim import level1 as l1
from treesim.fit import Spec, contributions, decode, encode, load_spec, mean_traits
from treesim.fit_level1 import Measure, Pool, clear_scratch, level1_spec
from treesim.host import scratch_root
from treesim.sweep import REPO

SPECIES = "beech"
SCRIPT = "analysis/experiments/level1_sensitivity.py"
OUT = REPO / "docs" / "experiments" / "fits" / "level1-sensitivity"
RUNS = REPO / "runs" / "level1-sensitivity"
FIGURES = REPO / "docs" / "experiments" / "figures"
PILOT_CKPT = REPO / "runs" / "level1-pilot-v2" / "beech" / "checkpoint.pkl"
#: The grid's labels in u order; the hand in the middle.
POINTS = ("lo", "lo_mid", "hand", "hi_mid", "hi")
#: Reporting conventions (the user, 2026-11-04), not gates.
CLOSE = 0.5
COST = 2.0
NOISE_SE = 2.0
SPREAD_OK = 1.0
BOOT_SEED = 20261109
BOOT_N = 2000
TOP_DESCRIPTORS = 3
TOP_KNOBS = 3
BATCH = 12
LATE = "stand.lateShare"

ADR_EVIDENCE = {
    "0052 limb loss / crown retreat": {
        "descriptors": ["centroidHeight", "p0", "p1", "profileCentre", "crownFullness", "widestAt"],
        "level0": ["stand.talloCR", "stand.lai"]},
    "tip upturn and tortuosity": {
        "descriptors": ["limbUpturn", "tortuosity05", "limbElevation05", "pendulousFraction05", "limbDroop"]},
    "individual variation": {
        "spread": ["leaderDominance", "centroidHeight", "limbDroop", "tortuosity05", "limbUpturn"],
        "spread_all": True},
    "the trunk increment (ADR 0050 option C)": {
        "descriptors": ["leaderDominance", "forkHeight", "length0"], "season_and_dbh": True,
        "level0": ["stand.talloH", "stand.height", "stand.height100"]},
}

RULES = {
    "unit": "Δz = z_condition − z_hand: the median of the detrended simulated trees, in real between-tree SDs (v3's "
            "real distributions); its SE from a paired bootstrap over the 10 seeds (BOOT_N resamples, numpy seed "
            "BOOT_SEED; the same seed draw for every condition; medians and the Level 0 sum recomputed, the matched "
            "season held)",
    "move": "m = −sign(z_hand) · Δz (toward the target is positive); f = m / |z_hand|, the fraction of the hand's gap "
            "closed. f ≥ 1 is reported as a bracket: the target crossed between two adjacent grid points on the "
            "knob's side, with ΔL0 as the range at those points (a bound may be a regime change: continuity is not "
            "assumed). Beside f, its bootstrap 5th percentile",
    "cost": "ΔL0 = the condition's Level 0 sum (loss − Σ fitted location terms; Level 0's scored traits and death "
            "penalties at their Level 0 weights) − the hand's; beside it ΔL0 without stand.lateShare; each with its "
            "bootstrap SE",
    "reach": "per descriptor, over the matched single-knob conditions: the largest f and the ΔL0 of that move. "
             "Verdicts: 'at target within noise' if |z_hand| < NOISE_SE · SE(z_hand); else 'unreachable by "
             "single-knob moves' if no condition has f > CLOSE; else 'reachable at cost' if the cheapest condition "
             "with f > CLOSE raises Level 0 by more than COST; else 'reachable'",
    "unmatched": "an unmatched or dead condition contributes no descriptor values; it is counted and greyed. Cells of "
                 "a condition flagged 'matched at the first season' or 'trees outside the real DBH range' are marked",
    "spread": "per descriptor: s = log2(sim SD / real SD); the largest single-knob rise of s toward 0, "
              "−sign(s_hand) · (s − s_hand), and whether any matched condition has |s| ≤ SPREAD_OK",
    "pairs": "the TOP_DESCRIPTORS descriptors (not at target within noise) with the largest remaining gap "
             "max(0, |z_hand| − max(0, m_best)), held out included; for each, its TOP_KNOBS single-knob movers "
             "(each knob's best matched non-hand point v* by m; knobs with m > 0, ranked by it); v½ halfway between "
             "the hand and v* on the knob's scale (u); for each pair (A ranked above B): (v*_A, v*_B), (v*_A, v½_B), "
             "(v½_A, v*_B). Identical conditions are measured once. Reported: the best pair's f and ΔL0, and its "
             "departure from additivity (Δz − Δz_A − Δz_B) where both singles are grid points",
    "envelope": "pilot v2's 120 candidates (registration v3, the same 10 seeds, joint form-knob moves; the checkpoint, "
                "read-only): per fitted descriptor the best f, that candidate's ΔL0 and its spread s, flagged when "
                "s < −1. Held-out descriptors have no pilot data",
    "verdict": "'needs a rule rather than a knob' only where the single-knob sweep, the pair check (where run for the "
               "descriptor) and the envelope (fitted descriptors) all fall short of f = CLOSE. Elsewhere: 'reached by "
               "a single knob' (with the cost verdict), 'reached jointly (pair check | pilot v2 envelope)', or 'not "
               "reached by the knobs tested; joint moves untested' where no joint evidence exists",
    "not_covered": "interactions outside the top-three pairs; compensated reach (a move stopped by a regime boundary "
                   "that a second knob lifts) across the physiology × form families; nonmonotone responses between "
                   "the far grid points of the lopsided knobs (u_h near a bound)",
    "adr_order": "an ADR item ranks higher the more of its evidence is 'needs a rule', the larger the gap that "
                 "remains, and the more a partial reach costs Level 0",
    "held_out": "held-out descriptors are measured and written because this is a reachability experiment, not a fit "
                "(the user, 2026-11-04); the v3 hold-out rule is unaffected",
}


# --- The grid ----------------------------------------------------------------------------------------------------


def one_knob(p: dict) -> Spec:
    return Spec(SPECIES, [], [p])


def u_of(p: dict, v: float) -> float:
    """A value's position on the knob's registered scale (fit.encode)."""
    return float(encode(one_knob(p), {p["path"]: v})[0])


def value_at(p: dict, u: float) -> float:
    """The knob's value at u (fit.decode: its scale, 4 significant figures)."""
    return decode(one_knob(p), np.array([u]))[p["path"]]


def knobs(reg: dict, species: str = SPECIES) -> list[dict]:
    """The 18 knobs: the v3 registration's ten form knobs, then Level 0's seven and r3.c from [[param]]."""
    data = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{species}.toml").read_text())
    by_path = {p["path"]: p for p in load_spec(species).params}
    form = [{**p, "family": "form"} for p in reg["knobs"]]
    phys = [{**by_path[k], "family": "physiology"} for k in [*data["level0"]["knobs"], "r3.c"]]
    return form + phys


def hand_of(reg: dict) -> dict:
    """The hand: v3's fixed assignments and its start, verbatim (= level1_spec's fixed + form)."""
    return {**reg["fixed"], **reg["start"]}


def grid(p: dict, hand_value: float) -> dict[str, tuple[float, float]]:
    """The five points: label → (u, value). The hand's own value at u_h, verbatim."""
    uh = u_of(p, hand_value)
    us = {"lo": 0.0, "lo_mid": uh / 2, "hand": uh, "hi_mid": (uh + 1) / 2, "hi": 1.0}
    return {k: (u, hand_value if k == "hand" else value_at(p, u)) for k, u in us.items()}


def conditions(reg: dict) -> list[dict]:
    hand = hand_of(reg)
    out = [{"id": "hand", "knob": None, "family": None, "point": "hand", "u": None, "value": None, "assign": hand}]
    for p in knobs(reg):
        for lab, (u, v) in grid(p, hand[p["path"]]).items():
            if lab != "hand":
                out.append({"id": f"{p['path']}@{lab}", "knob": p["path"], "family": p["family"], "point": lab,
                            "u": u, "value": v, "assign": {**hand, p["path"]: v}})
    return out


# --- The rules (pure) --------------------------------------------------------------------------------------------


def finite(x) -> bool:
    return x is not None and isinstance(x, (int, float)) and math.isfinite(x)


def toward(z_hand: float, z: float) -> float:
    """m: the move toward the target (0), positive when |z| falls on the hand's side; NaN where undefined."""
    if not (finite(z_hand) and finite(z)) or z_hand == 0:
        return math.nan
    return -math.copysign(1.0, z_hand) * (z - z_hand)


def fraction(z_hand: float, z: float) -> float:
    m = toward(z_hand, z)
    return m / abs(z_hand) if finite(m) else math.nan


def bracket(f_by_point: dict[str, float], point: str) -> tuple[str, str] | None:
    """For a point whose f ≥ 1: the adjacent grid points on its side of the hand between which f first reaches 1,
    walking out from the hand (the hand's f is 0). None if f < 1 at `point`."""
    if not finite(f_by_point.get(point)) or f_by_point[point] < 1:
        return None
    i, h = POINTS.index(point), POINTS.index("hand")
    step = 1 if i > h else -1
    prev = "hand"
    for j in range(h + step, i + step, step):
        p = POINTS[j]
        f = f_by_point.get(p)
        if finite(f) and f >= 1:
            return (prev, p)
        prev = p
    return (prev, point)


def remaining_gap(z_hand: float, m_best: float) -> float:
    if not finite(z_hand):
        return math.nan
    return max(0.0, abs(z_hand) - max(0.0, m_best if finite(m_best) else 0.0))


def reach_verdict(at_target: bool, f_best: float, cheapest_cost: float | None) -> str:
    if at_target:
        return "at target within noise"
    if not finite(f_best) or f_best <= CLOSE:
        return "unreachable by single-knob moves"
    if cheapest_cost is not None and finite(cheapest_cost) and cheapest_cost > COST:
        return "reachable at cost"
    return "reachable"


def three_source(reach: str, pair_f: float | None, envelope_f: float | None) -> str:
    """The registered verdict over the three sources; None means the source was not available."""
    if reach == "at target within noise":
        return reach
    if reach != "unreachable by single-knob moves":
        return f"reached by a single knob ({reach})"
    if pair_f is not None and finite(pair_f) and pair_f > CLOSE:
        return "reached jointly (pair check)"
    if envelope_f is not None and finite(envelope_f) and envelope_f > CLOSE:
        return "reached jointly (pilot v2 envelope)"
    if pair_f is None and envelope_f is None:
        return "not reached by the knobs tested; joint moves untested"
    return "needs a rule rather than a knob"


def pair_conditions(ranked: list[str], moves: dict[str, dict[str, dict[str, float]]], kn: dict[str, dict],
                    hand: dict) -> list[dict]:
    """The interaction check's conditions. `ranked`: descriptors by remaining gap (the top ones are taken);
    `moves[descriptor][knob][point]` = m for each matched non-hand grid point; `kn`: knob path → knob (bounds, scale)
    with `points` label → (u, value)."""
    out, seen = [], {}
    for d in ranked[:TOP_DESCRIPTORS]:
        best = {}
        for k, by_point in moves[d].items():
            pts = [(m, lab) for lab, m in by_point.items() if finite(m)]
            if pts:
                m, lab = max(pts, key=lambda t: (t[0], -POINTS.index(t[1])))
                if m > 0:
                    best[k] = (m, lab)
        order = sorted(best, key=lambda k: (-best[k][0], list(kn).index(k)))[:TOP_KNOBS]
        levels = {}
        for k in order:
            p = kn[k]
            u_star, v_star = p["points"][best[k][1]]
            uh = p["points"]["hand"][0]
            levels[k] = {"best": (best[k][1], u_star, v_star), "half": (None, (uh + u_star) / 2,
                                                                         value_at(p, (uh + u_star) / 2))}
        for i in range(len(order)):
            for j in range(i + 1, len(order)):
                a, b = order[i], order[j]
                for la, lb in (("best", "best"), ("best", "half"), ("half", "best")):
                    va, vb = levels[a][la][2], levels[b][lb][2]
                    key = (a, va, b, vb)
                    if key in seen:
                        seen[key]["for"].append(d)
                        continue
                    c = {"id": f"{a}={va:g}+{b}={vb:g}", "for": [d], "a": a, "a_level": la, "a_value": va,
                         "a_point": levels[a][la][0], "b": b, "b_level": lb, "b_value": vb,
                         "b_point": levels[b][lb][0], "assign": {**hand, a: va, b: vb}}
                    seen[key] = c
                    out.append(c)
    return out


# --- Files -------------------------------------------------------------------------------------------------------


def sha(path: str | Path) -> str:
    return hashlib.sha256((REPO / path).read_bytes()).hexdigest()


def clean(x):
    """NaN → None, recursively (committed JSON is strict)."""
    if isinstance(x, float):
        return x if math.isfinite(x) else None
    if isinstance(x, dict):
        return {k: clean(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [clean(v) for v in x]
    return x


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.exists() else []


def load_registration(check: bool = True) -> dict:
    sreg = json.loads((OUT / "registration.json").read_text())
    if check:
        bad = [f for f, h in sreg["hashes"].items() if f != SCRIPT and sha(f) != h]
        if bad:
            raise SystemExit(f"refusing: changed since the sensitivity registration: {', '.join(bad)}")
    return sreg


def register(_args) -> None:
    reg = l1.load(SPECIES)
    hand = hand_of(reg)
    kn = knobs(reg)
    table = []
    for p in kn:
        g = grid(p, hand[p["path"]])
        table.append({"path": p["path"], "family": p["family"], "lo": p["lo"], "hi": p["hi"],
                      "log": bool(p.get("log")), "hand": hand[p["path"]], "u_h": g["hand"][0],
                      "points": {k: v for k, (u, v) in g.items()}, "u": {k: u for k, (u, v) in g.items()}})
    conds = conditions(reg)
    ids = [c["id"] for c in conds]
    assert len(set(ids)) == len(ids) == 1 + 4 * len(kn)
    files = [*reg["hashes"], str(l1.registration_path(SPECIES).relative_to(REPO)), SCRIPT]
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, capture_output=True, text=True).stdout.strip()
    out = {
        "experiment": "level1-sensitivity", "species": SPECIES, "version": 1,
        "written": datetime.now(UTC).isoformat(timespec="seconds"), "parent_commit": head,
        "question": "for each Level 1 descriptor, how far can any single knob move it toward the real target, and at "
                    "what Level 0 cost (the user, 2026-11-04)",
        "targets": {"registration": str(l1.registration_path(SPECIES).relative_to(REPO)),
                    "version": reg["version"], "note": "v3's real distributions, real data only; unchanged"},
        "descriptors": sorted(reg["descriptors"]), "fitted": reg["fitted"], "held_out": reg["held_out"],
        "seeds": l1.fit_seeds(reg), "seeds_note": "v3's search seeds (registration seeds.search), the first 10: the "
                                                  "same for every condition; pilot v2 grew every candidate on them",
        "measure": "treesim.fit_level1.Measure, hide=False, names = all 16 descriptors, the spec's trials "
                   f"{level1_spec(SPECIES, reg).trials}; the size match, the coarsened-simulation rule and the "
                   "scoring of level1.py (score, detrended)",
        "hand": hand, "knobs": table,
        "lopsided": {t["path"]: round(t["u_h"], 3) for t in table if t["u_h"] < 0.25 or t["u_h"] > 0.7},
        "conditions": [{k: c[k] for k in ("id", "knob", "family", "point", "u", "value")} for c in conds],
        "constants": {"close": CLOSE, "cost": COST, "noise_se": NOISE_SE, "spread_ok": SPREAD_OK,
                      "boot_seed": BOOT_SEED, "boot_n": BOOT_N, "top_descriptors": TOP_DESCRIPTORS,
                      "top_knobs": TOP_KNOBS},
        "rules": RULES, "adr_evidence": ADR_EVIDENCE,
        "hashes": {f: sha(f) for f in files},
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "registration.json").write_text(json.dumps(clean(out), indent=1, ensure_ascii=False) + "\n")
    print(f"registered {len(conds)} conditions over {len(kn)} knobs; lopsided {out['lopsided']}")


# --- Measuring ---------------------------------------------------------------------------------------------------


def record(reg: dict, spec, c: dict, t: dict, trees, per_seed, names) -> tuple[dict, dict]:
    """One condition's summary row (main.jsonl) and its raw trees and per-seed traits (runs/ only)."""
    c0 = contributions(spec, t)
    loc = l1.level1_contributions(reg, t)
    at = reg["size_match"]["dbh"]
    desc = {}
    for k in names:
        desc[k] = (l1.score(l1.detrended(trees, k, reg["real"][k]["slope"], at), reg["real"][k])
                   if trees is not None else {"n": 0, "median": None, "sd": None, "z": None, "s": None})
    row = {"id": c["id"], **{k: c.get(k) for k in ("knob", "family", "point", "u", "value", "for", "a", "a_value",
                                                    "b", "b_value", "a_level", "b_level")
                             if k in c},
           "season": t.get("l1.season"), "flags": t.get("l1.flags"), "trees": t.get("l1.trees"),
           "dbh": t.get("l1.dbh"), "level0": float(sum(c0.values())), "l1_location": float(sum(loc.values())),
           "contributions": {**c0, **loc}, "descriptors": desc}
    return clean(row), {"trees": trees, "per_seed": per_seed}


def measure_all(conds: list[dict], out_path: Path, tag: str, workers: int, seeds: list[int]) -> None:
    reg = l1.load(SPECIES)
    spec = level1_spec(SPECIES, reg)
    names = sorted(reg["descriptors"])
    done = {r["id"] for r in read_jsonl(out_path)}
    todo = [c for c in conds if c["id"] not in done]
    if not todo:
        print(f"{out_path.name}: nothing to do")
        return
    raw = RUNS / "raw"
    raw.mkdir(parents=True, exist_ok=True)
    scratch = f"{scratch_root()}/level1-sensitivity-{tag}"
    clear_scratch(scratch)
    pool = Pool(workers)
    executor = ProcessPoolExecutor(workers)
    script_sha = sha(SCRIPT)
    try:
        measure = Measure(pool, spec, reg, scratch, executor, hide=False)
        batches = np.array_split(np.arange(len(todo)), max(1, len(todo) // BATCH))
        for bi, ix in enumerate(batches):
            batch = [todo[i] for i in ix]
            t0 = time.time()
            traits, cpu, trees = measure(f"{tag}{bi}", [c["assign"] for c in batch], seeds, names=names)
            with out_path.open("a") as f:
                for c, t, ts, ps in zip(batch, traits, trees, measure.per_seed):
                    row, rw = record(reg, spec, c, t, ts, ps, names)
                    row["script_sha256"] = script_sha
                    (raw / f"{tag}-{c['id'].replace('/', '_')}.json").write_text(json.dumps(clean(rw)))
                    f.write(json.dumps(row) + "\n")
            print(f"{tag} batch {bi + 1}/{len(batches)}: {len(batch)} conditions, {time.time() - t0:.0f} s, "
                  f"{cpu / len(batch):.0f} CPU-s a condition; seasons "
                  f"{[t.get('l1.season') for t in traits]}", flush=True)
    finally:
        executor.shutdown()
        pool.close()
        clear_scratch(scratch)


def run(args) -> None:
    sreg = load_registration()
    reg = l1.load(SPECIES)
    by_id = {c["id"]: c for c in conditions(reg)}
    conds = [by_id[c["id"]] for c in sreg["conditions"]]
    for c, r in zip(conds, sreg["conditions"]):
        assert c["value"] == r["value"], c["id"]
    RUNS.mkdir(parents=True, exist_ok=True)
    if args.smoke:
        measure_all(conds[:1], RUNS / "smoke.jsonl", "smoke", 1, sreg["seeds"][:1])
        return
    measure_all(conds, RUNS / "main.jsonl", "main", args.workers, sreg["seeds"])


# --- Analysis ----------------------------------------------------------------------------------------------------


def singles(rows: list[dict]) -> tuple[dict, list[dict]]:
    hand = next(r for r in rows if r["id"] == "hand")
    return hand, [r for r in rows if r["id"] != "hand"]


def matched(r: dict) -> bool:
    return r.get("season") is not None and r.get("trees") not in (None, 0)


def moves_table(rows: list[dict], names: list[str]) -> dict[str, dict[str, dict[str, float]]]:
    hand, rest = singles(rows)
    out = {k: {} for k in names}
    for r in rest:
        if not matched(r):
            continue
        for k in names:
            m = toward(hand["descriptors"][k]["z"], r["descriptors"][k]["z"])
            out[k].setdefault(r["knob"], {})[r["point"]] = m
    return out


def knob_points(sreg: dict) -> dict[str, dict]:
    return {t["path"]: {"path": t["path"], "lo": t["lo"], "hi": t["hi"], "log": t["log"],
                        "points": {k: (t["u"][k], t["points"][k]) for k in POINTS}} for t in sreg["knobs"]}


def pairs(args) -> None:
    sreg = load_registration()
    rows = read_jsonl(RUNS / "main.jsonl")
    if len(rows) < len(sreg["conditions"]):
        raise SystemExit(f"refusing: main.jsonl has {len(rows)} of {len(sreg['conditions'])} conditions")
    names = sreg["descriptors"]
    hand, _ = singles(rows)
    se = bootstrap_hand_se(sreg, names)
    mv = moves_table(rows, names)
    gaps = {}
    for k in names:
        zh = hand["descriptors"][k]["z"]
        if finite(zh) and abs(zh) < NOISE_SE * se[k]:
            continue
        m_best = max([m for by in mv[k].values() for m in by.values() if finite(m)], default=math.nan)
        gaps[k] = remaining_gap(zh, m_best)
    ranked = sorted(gaps, key=lambda k: (-gaps[k], names.index(k)))
    conds = pair_conditions(ranked, mv, knob_points(sreg), sreg["hand"])
    (RUNS / "pairs-conditions.json").write_text(json.dumps(clean(
        {"ranked": [(k, gaps[k]) for k in ranked], "conditions": conds}), indent=1))
    print(f"pairs for {ranked[:TOP_DESCRIPTORS]} (remaining gaps "
          f"{[round(gaps[k], 3) for k in ranked[:TOP_DESCRIPTORS]]}): {len(conds)} conditions")
    measure_all(conds, RUNS / "pairs.jsonl", "pairs", args.workers, sreg["seeds"])


def raw_of(tag: str, cid: str) -> dict:
    return json.loads((RUNS / "raw" / f"{tag}-{cid.replace('/', '_')}.json").read_text())


def boot_index(n_seeds: int) -> np.ndarray:
    return np.random.default_rng(BOOT_SEED).integers(0, n_seeds, (BOOT_N, n_seeds))


def boot_condition(reg: dict, spec, raw: dict, seeds: list[int], names: list[str], idx: np.ndarray) -> dict:
    """Per resample: each descriptor's z (median of the resampled seeds' trees, with multiplicity) and the Level 0
    sum with and without lateShare (seed-mean traits of the resampled seeds)."""
    at = reg["size_match"]["dbh"]
    out = {k: np.full(len(idx), np.nan) for k in names}
    l0 = np.full(len(idx), np.nan)
    l0x = np.full(len(idx), np.nan)
    trees = raw["trees"]
    if trees:
        pos = {s: i for i, s in enumerate(seeds)}
        for k in names:
            real = reg["real"][k]
            vals, who = [], []
            for t in trees:
                y = t.get(k)
                if finite(y) and finite(t.get("dbh")) and t["dbh"] > 0:
                    vals.append(l1.detrend(y, t["dbh"], real["slope"], at))
                    who.append(pos[t["seed"]])
            vals, who = np.array(vals), np.array(who, dtype=int)
            if len(vals) == 0:
                continue
            for b, row in enumerate(idx):
                w = np.bincount(row, minlength=len(seeds))[who]
                if w.sum() >= l1.MIN_TREES:
                    out[k][b] = (float(np.median(np.repeat(vals, w))) - real["median"]) / real["sd"]
    for b, row in enumerate(idx):
        c = contributions(spec, mean_traits([raw["per_seed"][i] for i in row]))
        l0[b] = sum(c.values())
        l0x[b] = l0[b] - c.get(LATE, 0.0)
    return {"z": out, "l0": l0, "l0x": l0x}


def bootstrap_hand_se(sreg: dict, names: list[str]) -> dict[str, float]:
    reg = l1.load(SPECIES)
    spec = level1_spec(SPECIES, reg)
    b = boot_condition(reg, spec, raw_of("main", "hand"), sreg["seeds"], names, boot_index(len(sreg["seeds"])))
    return {k: float(np.nanstd(b["z"][k], ddof=1)) for k in names}


def envelope(_args) -> None:
    """Pilot v2's 120 candidates on the same seeds: per fitted descriptor the best f, its ΔL0 and its spread."""
    import pickle

    sreg = load_registration()
    rows = read_jsonl(RUNS / "main.jsonl")
    hand = next(r for r in rows if r["id"] == "hand")
    with PILOT_CKPT.open("rb") as f:
        st = pickle.load(f)
    cands = st["rows"]
    out = {"source": str(PILOT_CKPT.relative_to(REPO)), "candidates": len(cands), "generations": st["generation"],
           "hand_level0": hand["level0"], "descriptors": {}}
    for k in sreg["fitted"]:
        zh = hand["descriptors"][k]["z"]
        best = None
        for r in cands:
            z = r.get(f"trait:l1.{k}.z")
            fr = fraction(zh, z)
            if finite(fr) and (best is None or fr > best[0]):
                best = (fr, r)
        if best is None:
            continue
        fr, r = best
        l0 = r["loss"] - sum(v for kk, v in r.items() if kk.startswith("loss:l1."))
        s_all = {kk: r.get(f"trait:l1.{kk}.s") for kk in sreg["fitted"]}
        out["descriptors"][k] = {
            "z_hand": zh, "f": fr, "z": r.get(f"trait:l1.{k}.z"), "generation": r["generation"],
            "loss": r["loss"], "dL0": l0 - hand["level0"], "dL0_without_lateShare":
                (l0 - r.get(f"loss:{LATE}", 0.0)) - (hand["level0"] - hand["contributions"].get(LATE, 0.0)),
            "s": r.get(f"trait:l1.{k}.s"), "s_collapsed": finite(r.get(f"trait:l1.{k}.s")) and r[f"trait:l1.{k}.s"] < -1,
            "fitted_below_half": sum(1 for v in s_all.values() if finite(v) and v < -1), "season": r.get("trait:l1.season")}
    (OUT / "envelope.json").write_text(json.dumps(clean(out), indent=1) + "\n")
    print(json.dumps({k: round(v["f"], 2) for k, v in out["descriptors"].items()}))


# --- The report --------------------------------------------------------------------------------------------------


def short(path: str) -> str:
    """r2.levels.1.branchAngle → branchAngle (1); r2.aC → aC; r1.Lh → Lh."""
    parts = path.split(".")
    if parts[:2] == ["r2", "levels"]:
        return f"{parts[3]} ({parts[2]})"
    return parts[-1] if parts[0] in ("r2", "r1", "r6", "c3", "c6") else path


def analyse(sreg: dict, rows: list[dict], tag: str, hand_boot: dict, spec, reg, idx) -> list[dict]:
    """Long rows (condition × descriptor) with Δz, its SE, m, f, f's 5th percentile, s, ΔL0 and their SEs."""
    names = sreg["descriptors"]
    hand = next(r for r in read_jsonl(RUNS / "main.jsonl") if r["id"] == "hand")
    out = []
    for r in rows:
        b = boot_condition(reg, spec, raw_of(tag, r["id"]), sreg["seeds"], names, idx) if matched(r) else None
        dl0 = r["level0"] - hand["level0"]
        dl0x = dl0 - (r["contributions"].get(LATE, 0.0) - hand["contributions"].get(LATE, 0.0))
        se_l0 = float(np.nanstd(b["l0"] - hand_boot["l0"], ddof=1)) if b else math.nan
        se_l0x = float(np.nanstd(b["l0x"] - hand_boot["l0x"], ddof=1)) if b else math.nan
        for k in names:
            zh, z = hand["descriptors"][k]["z"], r["descriptors"][k]["z"]
            sh, sv = hand["descriptors"][k]["s"], r["descriptors"][k]["s"]
            row = {"id": r["id"], "knob": r.get("knob"), "family": r.get("family"), "point": r.get("point"),
                   "value": r.get("value"), "season": r.get("season"), "flags": r.get("flags") or "",
                   "trees": r.get("trees"), "dbh": r.get("dbh"), "descriptor": k,
                   "held_out": k in sreg["held_out"], "z_hand": zh, "z": z, "s_hand": sh, "s": sv,
                   "dz": z - zh if finite(z) and finite(zh) else math.nan, "m": toward(zh, z), "f": fraction(zh, z),
                   "ds_toward": (-math.copysign(1.0, sh) * (sv - sh)) if finite(sv) and finite(sh) and sh else
                   math.nan, "dL0": dl0, "se_dL0": se_l0, "dL0x": dl0x, "se_dL0x": se_l0x,
                   "se_dz": math.nan, "f_lo5": math.nan}
            if b is not None and finite(zh) and zh != 0:
                d = b["z"][k] - hand_boot["z"][k]
                row["se_dz"] = float(np.nanstd(d, ddof=1))
                fb = -math.copysign(1.0, zh) * d / abs(zh)
                row["f_lo5"] = float(np.nanpercentile(fb, 5)) if np.isfinite(fb).any() else math.nan
            out.append(row)
    return out


def reach_summary(sreg: dict, long: list[dict], hand_se: dict, pair_long: list[dict], env: dict,
                  pair_targets: list[str]) -> dict:
    names = sreg["descriptors"]
    pts = {t["path"]: t["points"] for t in sreg["knobs"]}
    out = {}
    for k in names:
        rs = [r for r in long if r["descriptor"] == k and r["id"] != "hand"]
        ok = [r for r in rs if finite(r["f"])]
        zh = next(r["z_hand"] for r in long if r["descriptor"] == k)
        sh = next(r["s_hand"] for r in long if r["descriptor"] == k)
        at_target = finite(zh) and abs(zh) < NOISE_SE * hand_se[k]
        best = max(ok, key=lambda r: r["f"]) if ok else None
        closing = [r for r in ok if r["f"] > CLOSE]
        cheap = min(closing, key=lambda r: r["dL0"]) if closing else None
        verdict = reach_verdict(at_target, best["f"] if best else math.nan, cheap["dL0"] if cheap else None)
        br = None
        if best and best["f"] >= 1:
            fp = {r["point"]: r["f"] for r in ok if r["knob"] == best["knob"]}
            fp["hand"] = 0.0
            a, bb = bracket(fp, best["point"])
            cost = {r["point"]: r["dL0"] for r in rs if r["knob"] == best["knob"]}
            cost["hand"] = 0.0
            br = {"from": a, "to": bb, "values": [pts[best["knob"]][a], pts[best["knob"]][bb]],
                  "dL0_range": [cost.get(a), cost.get(bb)]}
        m_best = max([r["m"] for r in ok], default=math.nan)
        sp_ok = [r for r in rs if finite(r["ds_toward"])]
        sp_best = max(sp_ok, key=lambda r: r["ds_toward"]) if sp_ok else None
        within = sorted({r["id"] for r in rs if finite(r["s"]) and abs(r["s"]) <= SPREAD_OK})
        pr = [r for r in pair_long if r["descriptor"] == k and k in (r.get("for") or [])]
        if pr:
            check = "run"
        elif k in pair_targets:
            check = "no pair: fewer than two knobs move it toward the target"
        else:
            check = None
        pbest = max([r for r in pr if finite(r["f"])], key=lambda r: r["f"], default=None)
        e = env.get("descriptors", {}).get(k) if k in sreg["fitted"] else None
        keep = ("id", "knob", "point", "value", "f", "f_lo5", "m", "z", "dL0", "se_dL0", "dL0x", "se_dL0x",
                "season", "flags", "s")
        out[k] = {
            "held_out": k in sreg["held_out"], "z_hand": zh, "se_z_hand": hand_se[k], "s_hand": sh,
            "at_target": at_target, "best": {x: best[x] for x in keep} if best else None, "bracket": br,
            "cheapest_closing": {x: cheap[x] for x in keep} if cheap else None, "closing_count": len(closing),
            "reach": verdict, "remaining_gap": remaining_gap(zh, m_best),
            "unmatched": sorted(r["id"] for r in rs if not finite(r["z"])),
            "spread": {"best": {x: sp_best[x] for x in ("id", "s", "ds_toward", "dL0")} if sp_best else None,
                       "within_x2": within},
            "pair": ({x: pbest[x] for x in ("id", "f", "m", "z", "dL0", "dL0x", "additivity", "s")} if pbest else
                     None) if pr else None,
            "pair_check": check, "envelope": e,
            "verdict": three_source(verdict, (pbest["f"] if pbest else math.nan) if pr else
                                    (0.0 if check else None),
                                    e["f"] if e else None),
        }
    return out


def heatmap(sreg: dict, long: list[dict], value: str, title: str, limit: float, path: Path,
            cost: bool = True) -> None:
    import polars as pl
    from plotnine import (aes, element_blank, element_rect, element_text, facet_grid, geom_point, geom_text,
                          geom_tile, ggplot, labs, position_nudge, scale_fill_gradient2, scale_x_discrete, scale_y_discrete, theme,
                          theme_minimal)

    order_desc = list(sreg["fitted"]) + list(sreg["held_out"])
    order_rows = [f"{short(t['path'])} · {p}" for t in sreg["knobs"] for p in POINTS if p != "hand"]
    rows = []
    for r in long:
        if r["id"] == "hand":
            continue
        lab = f"{short(r['knob'])} · {r['point']}"
        v = r[value]
        rows.append({"row": lab, "family": r["family"], "col": r["descriptor"],
                     "panel": "held out" if r["held_out"] else "fitted",
                     "fill": max(-limit, min(limit, v)) if finite(v) else None,
                     "text": f"{v:+.1f}" if finite(v) and abs(v) >= 0.5 else "",
                     "unmatched": not finite(r["z"]),
                     "flag": bool(r["flags"]) and finite(r["z"])})
        if cost and r["descriptor"] == order_desc[0]:
            for c, key in (("ΔL0", "dL0"), ("ΔL0 − lateShare", "dL0x")):
                x = r[key]
                rows.append({"row": lab, "family": r["family"], "col": c, "panel": "Level 0 cost", "fill": None,
                             "text": f"{x:+.1f}" if finite(x) else "", "unmatched": False, "flag": False})
    df = pl.DataFrame(rows).to_pandas()
    import pandas as pd

    cols = order_desc + (["ΔL0", "ΔL0 − lateShare"] if cost else [])
    df["row"] = pd.Categorical(df["row"], categories=list(reversed(order_rows)), ordered=True)
    df["col"] = pd.Categorical(df["col"], categories=cols, ordered=True)
    df["panel"] = pd.Categorical(df["panel"], categories=["fitted", "held out", "Level 0 cost"], ordered=True)
    df["family"] = pd.Categorical(df["family"], categories=["form", "physiology"], ordered=True)
    desc = df[df["panel"] != "Level 0 cost"]
    costs = df[df["panel"] == "Level 0 cost"]
    g = (ggplot(desc, aes("col", "row"))
         + geom_tile(aes(fill="fill"), color="#fcfcfb", size=0.4)
         + geom_tile(desc[desc["unmatched"]], fill="#8a8984", color="#fcfcfb", size=0.4)
         + geom_text(aes(label="text"), size=5.5, color="#0b0b0b")
         + geom_point(desc[desc["flag"]], shape="o", size=0.9, color="#52514e",
                      position=position_nudge(x=0.36, y=0.28)))
    if cost:
        g = (g + geom_tile(costs, fill="#fcfcfb", color="#e6e5e0", size=0.4)
             + geom_text(costs, aes(label="text"), size=5.5, color="#0b0b0b"))
    g = (g + facet_grid("family ~ panel", scales="free", space="free")
         + scale_fill_gradient2(low="#d6452a", mid="#f0efec", high="#2a78d6", midpoint=0, limits=(-limit, limit),
                                na_value="#fcfcfb", name=title)
         + scale_x_discrete() + scale_y_discrete()
         + labs(x="", y="", caption="Grey: unmatched or dead (no descriptor values). Dot: matched at the first "
                                    "season or trees outside the real DBH range. Text where |value| ≥ 0.5. "
                                    "Beech, registration v3, seeds = v3's 10 search seeds.")
         + theme_minimal(base_size=8)
         + theme(figure_size=(11.5, 15.5), axis_text_x=element_text(rotation=60, ha="right", size=7),
                 axis_text_y=element_text(size=6.5), panel_grid=element_blank(),
                 strip_background=element_rect(fill="#f0efec", color="none"), legend_position="bottom",
                 plot_background=element_rect(fill="#fcfcfb", color="none")))
    path.parent.mkdir(parents=True, exist_ok=True)
    g.save(path, dpi=130, verbose=False)


def report(_args) -> None:
    import polars as pl

    sreg = load_registration()
    reg = l1.load(SPECIES)
    spec = level1_spec(SPECIES, reg)
    names = sreg["descriptors"]
    rows = read_jsonl(RUNS / "main.jsonl")
    idx = boot_index(len(sreg["seeds"]))
    hand_boot = boot_condition(reg, spec, raw_of("main", "hand"), sreg["seeds"], names, idx)
    hand_se = {k: float(np.nanstd(hand_boot["z"][k], ddof=1)) for k in names}
    long = analyse(sreg, rows, "main", hand_boot, spec, reg, idx)
    prs = read_jsonl(RUNS / "pairs.jsonl")
    pair_long = analyse(sreg, prs, "pairs", hand_boot, spec, reg, idx) if prs else []
    singles_dz = {(r["knob"], r["value"], r["descriptor"]): r["dz"] for r in long if r["id"] != "hand"}
    by_pid = {r["id"]: r for r in prs}
    for r in pair_long:
        p = by_pid[r["id"]]
        r["for"] = p.get("for")
        r.update({x: p.get(x) for x in ("a", "a_value", "b", "b_value", "a_level", "b_level")})
        da = singles_dz.get((p["a"], p["a_value"], r["descriptor"]))
        db = singles_dz.get((p["b"], p["b_value"], r["descriptor"]))
        r["additivity"] = r["dz"] - da - db if all(finite(x) for x in (r["dz"], da, db)) else math.nan
    env = json.loads((OUT / "envelope.json").read_text()) if (OUT / "envelope.json").exists() else {}
    pc = RUNS / "pairs-conditions.json"
    pair_targets = [k for k, _ in json.loads(pc.read_text())["ranked"][:TOP_DESCRIPTORS]] if pc.exists() else []
    reach = reach_summary(sreg, long, hand_se, pair_long, env, pair_targets)
    hand = next(r for r in rows if r["id"] == "hand")
    l0_terms = sorted(k for k in hand["contributions"] if not k.startswith("l1."))
    l0 = [{"id": r["id"], "knob": r.get("knob"), "family": r.get("family"), "point": r.get("point"),
           "value": r.get("value"), "season": r.get("season"), "flags": r.get("flags"),
           **{t: r["contributions"].get(t) for t in l0_terms}, "level0": r["level0"], "l1_location": r["l1_location"]}
          for r in rows]
    late = [r for r in long if r["descriptor"] == names[0] and r["family"] == "form"]
    per_seed_late = [ps.get(LATE) for ps in raw_of("main", "hand")["per_seed"]]
    lateshare = {"hand_per_seed": per_seed_late, "hand_per_seed_sd": float(np.std(per_seed_late, ddof=1)),
                 "band": next(t["band"] for t in spec.traits if t["name"] == LATE),
                 "target": next(t["target"] for t in spec.traits if t["name"] == LATE),
                 "hand_contribution": hand["contributions"].get(LATE),
                 "se_hand_contribution": float(np.nanstd(hand_boot["l0"] - hand_boot["l0x"], ddof=1)),
                 "form_conditions_dLateShare": [{"id": r["id"], "d": r["dL0"] - r["dL0x"]} for r in late]}
    OUT.mkdir(parents=True, exist_ok=True)
    pl.DataFrame(clean(long), infer_schema_length=None).write_csv(OUT / "conditions.csv")
    pl.DataFrame(clean(l0), infer_schema_length=None).write_csv(OUT / "conditions-level0.csv")
    if pair_long:
        pl.DataFrame(clean([{**r, "for": ";".join(r["for"] or [])} for r in pair_long]),
                     infer_schema_length=None).write_csv(OUT / "pairs.csv")
    (OUT / "reach.json").write_text(json.dumps(clean({
        "provisional": True, "registration": "docs/experiments/fits/level1-sensitivity/registration.json",
        "hand": {"loss": hand["level0"] + hand["l1_location"], "level0": hand["level0"],
                 "l1_location": hand["l1_location"], "season": hand["season"], "trees": hand["trees"]},
        "unmatched_conditions": sorted(r["id"] for r in rows if not matched(r)),
        "flagged_conditions": {r["id"]: r["flags"] for r in rows if r.get("flags")},
        "pair_targets": pair_targets, "descriptors": reach, "lateShare": lateshare}), indent=1, ensure_ascii=False) + "\n")
    heatmap(sreg, long, "m", "move toward the target (real SDs)", 2.0,
            FIGURES / "2026-11-04-level1-sensitivity.png")
    heatmap(sreg, long, "ds_toward", "spread: rise of s toward 0 (log2 units)", 1.5,
            FIGURES / "2026-11-04-level1-sensitivity-spread.png", cost=False)
    for k, v in reach.items():
        b = v["best"]
        best = f"{b['id']} f {b['f']:+.2f} dL0 {b['dL0']:+.2f}" if b else "—"
        print(f"{k:20s} z_h {v['z_hand']:+.2f} (SE {v['se_z_hand']:.2f}) | best {best} | {v['reach']} | "
              f"{v['verdict']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("register").set_defaults(fn=register)
    p = sub.add_parser("run")
    p.add_argument("--smoke", action="store_true", help="the hand at one seed, to runs/level1-sensitivity/smoke.jsonl")
    p.add_argument("--workers", type=int, default=12)
    p.set_defaults(fn=run)
    p = sub.add_parser("pairs")
    p.add_argument("--workers", type=int, default=12)
    p.set_defaults(fn=pairs)
    sub.add_parser("envelope").set_defaults(fn=envelope)
    sub.add_parser("report").set_defaults(fn=report)
    args = parser.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
