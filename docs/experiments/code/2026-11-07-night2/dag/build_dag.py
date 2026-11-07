"""Causal DAG of the tree-simulation growth model (rust/core at the checked-out branch).

Hand-written edge table, read from rust/core/src/season.rs (phase order) and the principle files
(their headers and the params their bodies read). Writes dag.json, dag.dot, dag.mmd, reach.md's
generated tables (reach_tables.md) and the figures.

Run: uv run --project <repo>/analysis python -I build_dag.py <outdir>
"""

import json
import sys
from collections import defaultdict, deque
from pathlib import Path

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
EFF = json.loads((OUT / "species_effective_lone.json").read_text())

# ---------------------------------------------------------------- phases and principles
PHASES = ["Light", "Sample", "Allocate", "Grow", "Shed", "Girth", "Mechanics", "Commit", "Deaths"]

# id: (phase, order within phase, label, file)
PRINCIPLES = {
    "OBST": ("Light", 0, "Obstacles: shed branches inside obstacles", "obstacles.rs"),
    "STORM": ("Light", 1, "O2 storm draw (one per season)", "season.rs phase_light"),
    "C2_LIGHT": ("Light", 2, "C2 deposit foliage + Beer-Lambert sky sweep", "light/*.rs, season.rs deposit_buds"),
    "O2_TAG": ("Light", 3, "O2 owner grid (whose foliage is where)", "season.rs tag_foliage"),
    "C2_SAMPLE": ("Sample", 0, "C2 sample Q, V at every live bud", "season.rs sample_buds"),
    "R5_SHADE": ("Sample", 1, "R5 shade s = 1 - Q/C (x neighbours' share)", "r5.rs, season.rs sample_nodes"),
    "R2_CROWD": ("Sample", 2, "R2 relay gate signal s-bar (mean neighbour shade)", "season.rs phase_sample"),
    "C5_QTOP": ("Sample", 3, "C5 crown-top light Q_top (quantile of bud Q)", "c5.rs crown_top_light"),
    "C3_BASI": ("Allocate", 0, "C3 basipetal light sum Q_sum, n_b, Q_base", "c3.rs gather_light"),
    "R1_CARBON": ("Allocate", 1, "R1 carbon balance P - M -> reserve, seeds, v_base", "r1.rs carbon_balance"),
    "C3_ACRO": ("Allocate", 2, "C3 Borchert-Honda split (lambda by R2/R5/vigour drop)", "c3.rs allocate"),
    "R4_FATE": ("Grow", 0, "R4 bud fate: threshold, light release, stochastic break", "r4.rs, season.rs grow_buds"),
    "R2_FORM": ("Grow", 1, "R2 form: pa, relay, fork, set-point modifiers, p_term", "r2.rs"),
    "C4_DIR": ("Grow", 2, "C4 shoot direction (tropism, light, noise)", "c4.rs"),
    "C1_SHOOT": ("Grow", 3, "C1 shoot size, phyllotaxis, new metamers + buds", "c1.rs grow_shoot"),
    "R6_REST": ("Grow", 4, "R6 resting fate: short shoot / dormant / abort", "r6.rs, r4.rs aborts"),
    "C5_SHED": ("Shed", 0, "C5 self-pruning (carbon deficit or light)", "c5.rs shed_branches"),
    "C6_GIRTH": ("Girth", 0, "C6 pipe-model girth with scars", "c6.rs"),
    "R3_MECH": ("Mechanics", 0, "R3 sag, posture, stress wood, breakage, windthrow", "r3.rs"),
    "COMMIT": ("Commit", 0, "Commit: compact buds, tree age + 1", "season.rs phase_commit"),
    "O2_ABRADE": ("Deaths", 0, "O2 abrasion (crown shyness)", "o2.rs"),
    "R1_STARVE": ("Deaths", 1, "R1 starvation death (k_starve empty seasons)", "r1.rs starved_to_death"),
    "O4_STAND": ("Deaths", 2, "O4 stand dynamics: m0, seeds, establishment", "o4.rs"),
}


def ordinal(p):
    ph, k, _, _ = PRINCIPLES[p]
    return PHASES.index(ph) * 10 + k


STATES = {
    "S_light": "light field Q, V (start of season)",
    "S_owner": "owner grid (foliage by tree)",
    "S_storm": "storm flag",
    "S_budq": "bud Q, V",
    "S_shade": "node shade s (R5)",
    "S_crowd": "relay crowd s-bar",
    "S_qtop": "Q_top",
    "S_qsum": "Q_sum, n_b per node; Q_base",
    "S_PM": "production P, maintenance M (tree and per branch)",
    "S_reserve": "reserve",
    "S_starved": "starved seasons counter",
    "S_seedpool": "seed pool / reproduction",
    "S_vbase": "v_base (tree resource)",
    "S_vin": "v_in per node, v per bud",
    "S_setpoint": "set point and direction params per shoot",
    "S_budstate": "bud states (= foliage: active, short shoot, dormant ...)",
    "S_budage": "bud dormancy age",
    "S_geom": "metamers: topology, positions, headings, lengths, order/pa",
    "S_radius": "radius per metamer",
    "S_stress": "stress wood",
    "S_scars": "scars (pipe sums of shed branches)",
    "S_deficit": "branch deficit counter (R1 carbon shedding)",
    "S_age": "tree age (seasons)",
    "S_alive": "alive",
    "S_trees": "tree population (new seedlings)",
}

OUTCOMES = {
    "OUT_height": "height",
    "OUT_shape": "crown shape: dome D, W/H (crown.py on the dump)",
    "OUT_crownbase": "crown base: limbBase / leafCrownRatio",
    "OUT_floor": "floor light (groundLight)",
    "OUT_survival": "survival / mortality",
    "OUT_recruits": "recruits",
    "OUT_metamers": "metamers",
    "OUT_slender": "slenderness H/D",
}

OUTCOME_FROM = {
    "OUT_height": ["S_geom"],
    "OUT_shape": ["S_geom", "S_radius"],
    "OUT_crownbase": ["S_geom", "S_budstate"],
    "OUT_floor": ["S_light"],
    "OUT_survival": ["S_alive"],
    "OUT_recruits": ["S_trees"],
    "OUT_metamers": ["S_geom"],
    "OUT_slender": ["S_geom", "S_radius"],
}

# principle -> (states read, states written)
RW = {
    "OBST": (["S_geom"], ["S_geom", "S_budstate", "S_scars", "S_alive"]),
    "STORM": ([], ["S_storm"]),
    "C2_LIGHT": (["S_geom", "S_budstate", "S_alive"], ["S_light"]),
    "O2_TAG": (["S_geom", "S_budstate"], ["S_owner"]),
    "C2_SAMPLE": (["S_light", "S_geom", "S_budstate"], ["S_budq"]),
    "R5_SHADE": (["S_light", "S_geom", "S_owner"], ["S_shade"]),
    "R2_CROWD": (["S_shade"], ["S_crowd"]),
    "C5_QTOP": (["S_budq", "S_budstate"], ["S_qtop"]),
    "C3_BASI": (["S_budq", "S_budstate", "S_geom"], ["S_qsum"]),
    "R1_CARBON": (["S_budq", "S_budstate", "S_geom", "S_reserve", "S_age"],
                  ["S_PM", "S_reserve", "S_seedpool", "S_vbase", "S_starved"]),
    "C3_ACRO": (["S_vbase", "S_qsum", "S_shade", "S_geom", "S_age"], ["S_vin"]),
    "R4_FATE": (["S_vin", "S_budstate", "S_budage", "S_shade", "S_budq", "S_reserve"],
                ["S_budstate", "S_reserve"]),
    "R2_FORM": (["S_geom", "S_budq", "S_vbase", "S_age", "S_crowd", "S_budstate", "S_vin", "S_radius"],
                ["S_setpoint", "S_budstate", "S_geom"]),
    "C4_DIR": (["S_setpoint", "S_budq", "S_geom", "S_shade"], ["S_geom"]),
    "C1_SHOOT": (["S_vin", "S_geom", "S_shade", "S_budstate", "S_alive"], ["S_geom", "S_budstate", "S_radius"]),
    "R6_REST": (["S_budq", "S_budstate", "S_geom", "S_budage"], ["S_budstate", "S_budage"]),
    "C5_SHED": (["S_qsum", "S_qtop", "S_PM", "S_deficit", "S_geom", "S_vbase", "S_radius", "S_stress"],
                ["S_geom", "S_budstate", "S_scars", "S_deficit"]),
    "C6_GIRTH": (["S_geom", "S_scars", "S_stress", "S_radius"], ["S_radius"]),
    "R3_MECH": (["S_geom", "S_radius", "S_budstate", "S_setpoint", "S_storm", "S_stress"],
                ["S_geom", "S_radius", "S_stress", "S_alive", "S_budstate"]),
    "COMMIT": (["S_budstate"], ["S_budstate", "S_age"]),
    "O2_ABRADE": (["S_owner", "S_budq", "S_geom", "S_radius", "S_budstate"], ["S_budstate"]),
    "R1_STARVE": (["S_starved"], ["S_alive"]),
    "O4_STAND": (["S_alive", "S_seedpool", "S_light", "S_geom", "S_trees"], ["S_alive", "S_trees", "S_seedpool"]),
}

# ---------------------------------------------------------------- gates
# A gate is evaluated on a species' effective params p and a context ctx
# (ctx["neighbours"]: other trees' foliage around; ctx keys may override o2/o4).


def g(path, default=None):
    def get(p):
        cur = p
        for k in path.split("."):
            if isinstance(cur, list):
                k = int(k)
                cur = cur[k] if k < len(cur) else None
            elif isinstance(cur, dict):
                cur = cur.get(k)
            else:
                return default
            if cur is None:
                return default
        return cur
    return get


on = lambda path: (lambda p, c: bool(g(path, False)(p)))  # noqa: E731
carbon = lambda p, c: bool(p["r1"]["enabled"]) and p["r1"].get("shed") == "carbon"  # noqa: E731
shade_live = lambda p, c: p["r5"]["enabled"] and (p["r5"].get("signal") != "neighbours" or c["neighbours"])  # noqa: E731
relay_on = lambda p, c: p["r2"]["enabled"] and ((p["r2"].get("relay") or 0) >= 1 or any((l.get("relay") or 0) >= 1 for l in p["r2"]["levels"]))  # noqa: E731
vig_drop = lambda p, c: p["r2"]["enabled"] and (p["r2"].get("vigourShare") or 0) > 0 and (p["r2"].get("vigourLambda") or 0) != 0  # noqa: E731
light_ortho = lambda p, c: p["r2"]["enabled"] and p["r2"].get("lightSetPoint") is not None  # noqa: E731
tvig = lambda p, c: (p["c5"].get("Tvig") or 0) > 0  # noqa: E731
storms = lambda p, c: (c.get("stormP", p["o2"].get("stormP")) or 0) > 0  # noqa: E731
o4on = lambda p, c: c.get("o4", p["o4"]["enabled"])  # noqa: E731
o2on = lambda p, c: c.get("o2", p["o2"]["enabled"])  # noqa: E731
r2on = on("r2.enabled")
always = lambda p, c: True  # noqa: E731
obstacles = lambda p, c: bool(p["world"].get("obstacles"))  # noqa: E731
stochastic = lambda p, c: (p["c1"].get("budBreak") or {}).get("mode") == "stochastic"  # noqa: E731

GATE_TEXT = {
    carbon: "r1.shed = carbon", shade_live: "R5 shade varies (r5.enabled; signal 'neighbours' needs neighbours)",
    relay_on: "relay on (r2.relay >= 1 or a level's relay)", vig_drop: "vigour drop on (r2.vigourShare > 0, vigourLambda != 0)",
    light_ortho: "r2.lightSetPoint set", tvig: "c5.Tvig > 0", storms: "o2.stormP > 0", o4on: "o4.enabled",
    o2on: "o2.enabled", r2on: "r2.enabled", always: "", obstacles: "world.obstacles non-empty",
    stochastic: "c1.budBreak.mode = stochastic",
}


def AND(*fs):
    f = lambda p, c: all(x(p, c) for x in fs)  # noqa: E731
    GATE_TEXT[f] = " and ".join(GATE_TEXT.get(x, "?") for x in fs if GATE_TEXT.get(x))
    return f


def NOT(x):
    f = lambda p, c: not x(p, c)  # noqa: E731
    GATE_TEXT[f] = "not (" + GATE_TEXT.get(x, "?") + ")"
    return f


def OR(*fs):
    f = lambda p, c: any(x(p, c) for x in fs)  # noqa: E731
    GATE_TEXT[f] = " or ".join(GATE_TEXT.get(x, "?") for x in fs)
    return f


for grp in ["c2", "c4", "c5", "c6", "r1", "r3", "r4", "r5", "r6"]:
    GATE_TEXT[on(f"{grp}.enabled")] = f"{grp}.enabled"
PRINCIPLE_GATE = {
    "OBST": obstacles, "STORM": storms, "C2_LIGHT": always, "O2_TAG": OR(o2on, on("r5.enabled")),
    "C2_SAMPLE": always, "R5_SHADE": shade_live, "R2_CROWD": AND(shade_live, lambda p, c: p["r2"].get("relayCrowd") is not None),
    "C5_QTOP": lambda p, c: (p["c5"]["enabled"] or carbon(p, c)) and p["c5"]["Trel"] > 0,
    "C3_BASI": always, "R1_CARBON": on("r1.enabled"), "C3_ACRO": always, "R4_FATE": always,
    "R2_FORM": r2on, "C4_DIR": on("c4.enabled"), "C1_SHOOT": always, "R6_REST": always,
    "C5_SHED": lambda p, c: p["c5"]["enabled"] or carbon(p, c), "C6_GIRTH": on("c6.enabled"),
    "R3_MECH": on("r3.enabled"), "COMMIT": always, "O2_ABRADE": o2on, "R1_STARVE": on("r1.enabled"),
    "O4_STAND": o4on,
}
GATE_TEXT[PRINCIPLE_GATE["R2_CROWD"]] = "R5 shade varies and r2.relayCrowd set"
GATE_TEXT[PRINCIPLE_GATE["C5_QTOP"]] = "(c5.enabled or carbon) and c5.Trel > 0"
GATE_TEXT[PRINCIPLE_GATE["C5_SHED"]] = "c5.enabled or r1.shed = carbon"

L = "r2.levels[k]."
# (param, group, [(principle, gate)])  -- the param is read by the principle when gate holds.
PARAMS = [
    # world / C2
    ("world.width", "world", [("C2_LIGHT", always), ("O4_STAND", o4on)]),
    ("world.height", "world", [("C2_LIGHT", always)]),
    ("world.depth", "world", [("C2_LIGHT", always)]),
    ("world.faces (tau)", "world", [("C2_LIGHT", always)]),
    ("world.fade", "world", [("C2_LIGHT", always)]),
    ("world.periodic / periodicZ", "world", [("C2_LIGHT", always), ("O2_TAG", always), ("O4_STAND", o4on)]),
    ("world.walls", "world", [("C2_LIGHT", always)]),
    ("world.obstacles", "world", [("OBST", obstacles), ("C1_SHOOT", obstacles)]),
    ("c2.model", "c2", [("C2_LIGHT", always)]),
    ("c2.C", "c2", [("C2_LIGHT", always), ("R5_SHADE", shade_live), ("O4_STAND", o4on)]),
    ("c2.K", "c2", [("C2_LIGHT", always)]),
    ("c2.kExt", "c2", [("C2_LIGHT", always)]),
    ("c2.skyExponent", "c2", [("C2_LIGHT", always)]),
    ("c2.skyTilt", "c2", [("C2_LIGHT", always)]),
    ("c2.minElevation", "c2", [("C2_LIGHT", always)]),
    ("c2.rotate", "c2", [("C2_LIGHT", always)]),
    # C1
    ("c1.phyllotaxis", "c1", [("C1_SHOOT", NOT(r2on))]),
    ("c1.divergence", "c1", [("C1_SHOOT", always)]),
    ("c1.branchAngle", "c1", [("C1_SHOOT", NOT(r2on))]),
    ("c1.internodeLength", "c1", [("C1_SHOOT", always), ("R4_FATE", on("r4.enabled"))]),
    ("c1.maxMetamersPerShoot", "c1", [("C1_SHOOT", always), ("R2_FORM", AND(relay_on, lambda p, c: (p["r2"].get("forkAt") or 0) > 0))]),
    ("c1.shootLengthSD", "c1", [("C1_SHOOT", always)]),
    ("c1.betaSD", "c1", [("C1_SHOOT", always)]),
    ("c1.budBreak.width", "c1", [("R4_FATE", stochastic)]),
    # C3
    ("c3.mode", "c3", [("C3_ACRO", always)]),
    ("c3.lambda", "c3", [("C3_ACRO", NOT(r2on))]),
    ("c3.alpha", "c3", [("C3_ACRO", NOT(on("r1.enabled"))), ("R1_CARBON", on("r1.enabled"))]),
    # C4
    ("c4.wd", "c4", [("C4_DIR", on("c4.enabled"))]),
    ("c4.xi", "c4", [("C4_DIR", on("c4.enabled"))]),
    ("c4.eta", "c4", [("C4_DIR", NOT(r2on))]),
    ("c4.setPoint", "c4", [("C4_DIR", NOT(r2on)), ("R3_MECH", on("r3.enabled"))]),
    ("c4.epsilon", "c4", [("C4_DIR", on("c4.enabled"))]),
    ("c4.sigma", "c4", [("C4_DIR", on("c4.enabled"))]),
    ("c4.axisSD", "c4", [("C4_DIR", on("c4.enabled")), ("R3_MECH", on("r3.enabled"))]),
    # C5
    ("c5.T", "c5", [("C5_SHED", NOT(carbon))]),
    ("c5.g", "c5", [("C5_SHED", always)]),
    ("c5.Trel", "c5", [("C5_SHED", always), ("C5_QTOP", always)]),
    ("c5.topQuantile", "c5", [("C5_QTOP", always)]),
    ("c5.Tvig", "c5", [("C5_SHED", always)]),
    # C6
    ("c6.n", "c6", [("C6_GIRTH", always), ("R1_CARBON", on("r1.enabled")), ("C5_SHED", always)]),
    ("c6.r0", "c6", [("C6_GIRTH", always), ("R1_CARBON", on("r1.enabled")), ("C1_SHOOT", always)]),
    # R1
    ("r1.mw", "r1", [("R1_CARBON", always)]),
    ("r1.mf", "r1", [("R1_CARBON", always)]),
    ("r1.Lh", "r1", [("R1_CARBON", always)]),
    ("r1.hydraulic", "r1", [("R1_CARBON", lambda p, c: (p["r1"].get("Lh") or 0) > 0)]),
    ("r1.qHalf", "r1", [("R1_CARBON", lambda p, c: p["r1"].get("response") == "saturating")]),
    ("r1.leafCostShade", "r1", [("R1_CARBON", lambda p, c: p["r1"].get("leafCost") == "acclimated")]),
    ("r1.response", "r1", [("R1_CARBON", always)]),
    ("r1.leafCost", "r1", [("R1_CARBON", always)]),
    ("r1.sr", "r1", [("R1_CARBON", always)]),
    ("r1.store", "r1", [("R1_CARBON", always)]),
    ("r1.reserve0", "r1", [("R1_CARBON", always)]),
    ("r1.fRep", "r1", [("R1_CARBON", always)]),
    ("r1.maturity", "r1", [("R1_CARBON", lambda p, c: (p["r1"].get("fRep") or 0) > 0), ("O4_STAND", o4on)]),
    ("r1.kStarve", "r1", [("R1_STARVE", always)]),
    ("r1.shed", "r1", [("C5_SHED", always)]),
    ("r1.kShed", "r1", [("C5_SHED", carbon)]),
    # R2 tree-level
    ("r2.aC", "r2", [("C3_ACRO", r2on)]),
    ("r2.dLambda", "r2", [("C3_ACRO", r2on)]),
    ("r2.ramp", "r2", [("C3_ACRO", r2on)]),
    ("r2.kappa", "r2", [("C3_ACRO", r2on)]),
    ("r2.hJ", "r2", [("C1_SHOOT", r2on), ("R2_FORM", AND(relay_on, lambda p, c: (p["r2"].get("forkAt") or 0) > 0))]),
    ("r2.relay", "r2", [("R2_FORM", r2on)]),
    ("r2.relayAge", "r2", [("R2_FORM", relay_on)]),
    ("r2.relayPTerm", "r2", [("R2_FORM", relay_on)]),
    ("r2.relayCrowd", "r2", [("R2_FORM", AND(relay_on, shade_live))]),
    ("r2.forkAt", "r2", [("R2_FORM", relay_on)]),
    ("r2.forkAngle", "r2", [("R2_FORM", AND(relay_on, lambda p, c: (p["r2"].get("forkAt") or 0) > 0))]),
    ("r2.vigourShare", "r2", [("C3_ACRO", lambda p, c: (p["r2"].get("vigourLambda") or 0) != 0)]),
    ("r2.vigourLambda", "r2", [("C3_ACRO", lambda p, c: (p["r2"].get("vigourShare") or 0) > 0)]),
    ("r2.vigourTreeLo / Hi", "r2", [("C3_ACRO", vig_drop), ("R2_FORM", light_ortho), ("R3_MECH", AND(light_ortho, on("r3.enabled"))), ("C5_SHED", tvig)]),
    ("r2.lightSetPoint", "r2", [("R2_FORM", r2on), ("R3_MECH", AND(r2on, on("r3.enabled")))]),
    ("r2.lightLo / lightHi / lightOver", "r2", [("R2_FORM", light_ortho), ("R3_MECH", AND(light_ortho, on("r3.enabled")))]),
    # R2 per level
    (L + "lambda", "r2.levels", [("C3_ACRO", r2on)]),
    (L + "dLambdaShare", "r2.levels", [("C3_ACRO", r2on)]),
    (L + "kappa", "r2.levels", [("C3_ACRO", r2on)]),
    (L + "setPoint", "r2.levels", [("R2_FORM", r2on), ("R3_MECH", AND(r2on, on("r3.enabled")))]),
    (L + "postureSetPoint", "r2.levels", [("R3_MECH", AND(r2on, on("r3.enabled")))]),
    (L + "eta", "r2.levels", [("R2_FORM", r2on)]),
    (L + "branchAngle", "r2.levels", [("C1_SHOOT", r2on)]),
    (L + "generator / whorl / tierEvery", "r2.levels", [("C1_SHOOT", r2on)]),
    (L + "lateralEvery", "r2.levels", [("C1_SHOOT", r2on)]),
    (L + "pTerm", "r2.levels", [("R2_FORM", r2on)]),
    (L + "relay", "r2.levels", [("R2_FORM", r2on)]),
    (L + "curve / curveLength", "r2.levels", [("R2_FORM", r2on), ("R3_MECH", AND(r2on, on("r3.enabled")))]),
    (L + "pendulous / pendulousRadius", "r2.levels", [("R2_FORM", r2on), ("R3_MECH", AND(r2on, on("r3.enabled")))]),
    (L + "agedSetPoint / agedOver / agedBy", "r2.levels", [("R2_FORM", r2on), ("R3_MECH", AND(r2on, on("r3.enabled")))]),
    # R3
    ("r3.rho", "r3", [("R3_MECH", on("r3.enabled"))]),
    ("r3.leafMass", "r3", [("R3_MECH", on("r3.enabled"))]),
    ("r3.E", "r3", [("R3_MECH", on("r3.enabled"))]),
    ("r3.sag / phi", "r3", [("R3_MECH", on("r3.enabled"))]),
    ("r3.posture / betaG / gamma / c", "r3", [("R3_MECH", on("r3.enabled"))]),
    ("r3.sigmaTarget / girthGain", "r3", [("R3_MECH", on("r3.enabled"))]),
    ("r3.sigmaBreak", "r3", [("R3_MECH", on("r3.enabled"))]),
    ("r3.ground", "r3", [("R3_MECH", on("r3.enabled"))]),
    # R4
    ("r4.vBreak", "r4", [("R4_FATE", on("r4.enabled"))]),
    ("r4.vCont", "r4", [("R4_FATE", on("r4.enabled"))]),
    ("r4.qRel", "r4", [("R4_FATE", on("r4.enabled"))]),
    ("r4.delta", "r4", [("R4_FATE", on("r4.enabled"))]),
    ("r4.lDorm", "r4", [("R6_REST", on("r4.enabled"))]),
    ("r4.juvenile", "r4", [("R4_FATE", on("r4.enabled"))]),
    ("r4.bank", "r4", [("C5_SHED", on("r4.enabled"))]),
    # R5
    ("r5.eS", "r5", [("C1_SHOOT", shade_live)]),
    ("r5.dLambda", "r5", [("C3_ACRO", shade_live)]),
    ("r5.dB", "r5", [("R4_FATE", AND(shade_live, on("r4.enabled")))]),
    ("r5.dA", "r5", [("C4_DIR", shade_live)]),
    ("r5.signal", "r5", [("R5_SHADE", on("r5.enabled"))]),
    # R6
    ("r6.qMin", "r6", [("R6_REST", on("r6.enabled"))]),
    ("r6.leafArea", "r6", [("C2_LIGHT", on("r6.enabled")), ("C3_BASI", on("r6.enabled")), ("R1_CARBON", on("r6.enabled")), ("R3_MECH", on("r6.enabled"))]),
    ("r6.lifespan", "r6", [("R6_REST", on("r6.enabled"))]),
    # O2
    ("o2.sway / maxSway / pAbr", "o2", [("O2_ABRADE", o2on)]),
    ("o2.stormP", "o2", [("STORM", always)]),
    ("o2.stormLoad", "o2", [("R3_MECH", storms)]),
    # O4
    ("o4.m0", "o4", [("O4_STAND", o4on)]),
    ("o4.cSeed / d", "o4", [("O4_STAND", o4on)]),
    ("o4.qEst / pEst", "o4", [("O4_STAND", o4on)]),
    ("o4.maxTrees / rain / band", "o4", [("O4_STAND", o4on)]),
    ("seed", "world", [("C4_DIR", always), ("R4_FATE", stochastic), ("C1_SHOOT", always), ("STORM", storms), ("O4_STAND", o4on), ("O2_ABRADE", o2on)]),
]

# Named feedback loops: (id, label, the states that carry them across seasons, note)
LOOPS = [
    ("L1", "light-foliage (self- and mutual shading)", ["S_light", "S_budq"],
     "new foliage and positions -> next season's light field -> Q -> allocation -> growth"),
    ("L2", "cost of size", ["S_PM", "S_vbase"],
     "topology (tips, path length) -> R1 maintenance and hydraulic discount -> v_base -> growth"),
    ("L3", "reserve and starvation", ["S_reserve", "S_starved"],
     "reserve carried over; k_starve empty seasons kill the tree"),
    ("L4", "carbon shedding memory", ["S_deficit"],
     "a branch must run a deficit r1.kShed seasons in a row before C5 sheds it"),
    ("L5", "mechanics", ["S_stress", "S_setpoint"],
     "load -> sag/posture/stress wood -> positions and radius -> next season's light and load"),
    ("L6", "height thresholds", ["S_geom"],
     "height -> r2.hJ juvenile cap on shoot size; height >= r1.maturity diverts fRep of net production"),
    ("L7", "clocks", ["S_age", "S_budage"],
     "tree age -> lambda's fall (aC, ramp), relayAge, fork, aged set points; bud age -> R4 vBreak(1 + delta age), lDorm; wood age -> c5.g, r6.lifespan"),
    ("L8", "neighbours (stand only)", ["S_owner", "S_shade", "S_crowd"],
     "other trees' foliage -> owner grid and R5 shade -> lambda, elongation, break threshold, relay gate"),
    ("L9", "demography (stand only)", ["S_seedpool", "S_trees"],
     "seed pool -> recruits -> foliage -> floor light -> establishment"),
]


# ---------------------------------------------------------------- build the graph
def build(p=None, ctx=None):
    """Edges, optionally pruned by a species' params p in context ctx."""
    live = (lambda f: True) if p is None else (lambda f: bool(f(p, ctx)))
    edges = []
    princ_live = {k: live(PRINCIPLE_GATE[k]) for k in PRINCIPLES}
    for name, grp, reads in PARAMS:
        for pr, gate in reads:
            if princ_live[pr] and live(gate):
                edges.append(dict(src=f"P:{name}", dst=pr, kind="reads", gate=GATE_TEXT.get(gate, "")))
    for pr, (rs, ws) in RW.items():
        if not princ_live[pr]:
            continue
        for s in rs:
            if s == "S_shade" and p is not None and not shade_live(p, ctx):
                continue  # s is identically 0: carries no variation
            edges.append(dict(src=s, dst=pr, kind="reads"))
        for s in ws:
            edges.append(dict(src=pr, dst=s, kind="writes"))
    for o, ss in OUTCOME_FROM.items():
        for s in ss:
            edges.append(dict(src=s, dst=o, kind="feeds"))
    edges.append(dict(src="P:r6.leafArea", dst="OUT_crownbase", kind="reads"))
    # principle -> principle via a state: feeds within the season, feedback across seasons
    writers, readers = defaultdict(set), defaultdict(set)
    for e in edges:
        if e["kind"] == "writes":
            writers[e["dst"]].add(e["src"])
        elif e["kind"] == "reads" and e["src"] in STATES:
            readers[e["src"]].add(e["dst"])
    pp = {}
    for s in STATES:
        for a in writers[s]:
            for b in readers[s]:
                kind = "feeds" if ordinal(a) < ordinal(b) else "feedback"
                key = (a, b)
                if key in pp and pp[key]["kind"] == "feeds":
                    pp[key]["via"].append(s)
                    continue
                if key in pp and kind == "feedback":
                    pp[key]["via"].append(s)
                    continue
                pp[key] = dict(src=a, dst=b, kind=kind, via=[s])
    return edges, list(pp.values()), princ_live


def assert_acyclic(pp):
    adj = defaultdict(list)
    for e in pp:
        if e["kind"] == "feeds":
            adj[e["src"]].append(e["dst"])
    color = {}

    def dfs(u, stack):
        color[u] = 1
        for v in adj[u]:
            if color.get(v) == 1:
                raise AssertionError(f"cycle within a season: {stack + [u, v]}")
            if not color.get(v):
                dfs(v, stack + [u])
        color[u] = 2

    for u in list(adj):
        if not color.get(u):
            dfs(u, [])


def lags(edges, pp):
    """0-1 BFS: for each param, the fewest season boundaries (feedback edges) on a path to
    each outcome. Returns {param: {outcome: lag}}; absent = unreachable."""
    out_of = defaultdict(list)  # principle -> outcomes it writes into this season (weight 0)
    writes = defaultdict(set)
    for e in edges:
        if e["kind"] == "writes":
            writes[e["src"]].add(e["dst"])
    for o, ss in OUTCOME_FROM.items():
        for pr, ws in writes.items():
            if any(s in ws for s in ss):
                out_of[pr].append(o)
    adj = defaultdict(list)
    for e in pp:
        adj[e["src"]].append((e["dst"], 0 if e["kind"] == "feeds" else 1))
    res = {}
    params = defaultdict(list)
    for e in edges:
        if e["src"].startswith("P:") and e["dst"] in PRINCIPLES:
            params[e["src"][2:]].append(e["dst"])
    for prm, starts in params.items():
        dist = {s: 0 for s in starts}
        dq = deque(starts)
        while dq:
            u = dq.popleft()
            for v, w in adj[u]:
                nd = dist[u] + w
                if nd < dist.get(v, 1e9):
                    dist[v] = nd
                    (dq.appendleft if w == 0 else dq.append)(v)
        best = {}
        for pr, d in dist.items():
            for o in out_of[pr]:
                best[o] = min(best.get(o, 1e9), d)
        res[prm] = best
    # metrics' own read
    for e in edges:
        if e["src"].startswith("P:") and e["dst"] in OUTCOMES:
            res.setdefault(e["src"][2:], {})[e["dst"]] = 0
    return res


def loops_on(edges, outcome):
    """Loops whose carrying states are ancestors of the outcome (state-level graph)."""
    radj = defaultdict(set)
    for e in edges:
        radj[e["dst"]].add(e["src"])
    seen, stack = set(), [outcome]
    while stack:
        u = stack.pop()
        for v in radj[u]:
            if v not in seen:
                seen.add(v)
                stack.append(v)
    return [lid for lid, _, ss, _ in LOOPS if any(s in seen for s in ss)]


# Params that switch their own rule on: dead at today's value (off), live once set.
SELF_GATED = {"world.obstacles", "o2.stormP"}

CONTEXTS = {
    "lone": dict(neighbours=False),  # loneParams as run by the sweep: o2, o4 off, stormP 0
    "stand": dict(neighbours=True, o4=True, stormP=0.05),  # the forest preset's o4 and storms
}


def main():
    edges, pp, _ = build()
    assert_acyclic(pp)
    grp_of = {name: grp for name, grp, _ in PARAMS}
    nodes = []
    for grp in sorted(set(grp_of.values())):
        nodes.append(dict(id=f"G:{grp}", kind="param-group", label=grp))
    for name, grp, _ in PARAMS:
        nodes.append(dict(id=f"P:{name}", kind="param", label=name, group=grp))
    for k, (ph, i, lab, f) in PRINCIPLES.items():
        nodes.append(dict(id=k, kind="principle", label=lab, phase=ph, order=ordinal(k), file=f,
                          gate=GATE_TEXT.get(PRINCIPLE_GATE[k], "")))
    for k, lab in STATES.items():
        nodes.append(dict(id=k, kind="state", label=lab,
                          scope="world" if k in ("S_light", "S_owner", "S_storm", "S_trees") else
                          ("per-metamer/bud" if k in ("S_budq", "S_shade", "S_qsum", "S_vin", "S_setpoint",
                                                      "S_budstate", "S_budage", "S_geom", "S_radius", "S_stress",
                                                      "S_scars", "S_deficit") else "per-tree")))
    for k, lab in OUTCOMES.items():
        nodes.append(dict(id=k, kind="outcome", label=lab))
    all_edges = []
    for name, grp, _ in PARAMS:
        all_edges.append(dict(src=f"P:{name}", dst=f"G:{grp}", kind="member"))
    all_edges += [dict(e) for e in edges]
    all_edges += [dict(e, via=list(e["via"])) for e in pp]
    for e in all_edges:
        e["from"], e["to"] = e.pop("src"), e.pop("dst")
    # per species and context: dead params
    per_species = {}
    lag_struct = lags(edges, pp)
    for ctxname, ctx in CONTEXTS.items():
        for sp, p in EFF.items():
            e2, pp2, pl = build(p, ctx)
            lg = lags(e2, pp2)
            dead = sorted(n for n, _, _ in PARAMS if not lg.get(n) and n not in SELF_GATED)
            per_species.setdefault(ctxname, {})[sp] = dict(
                dead=dead, principles_off=sorted(k for k, v in pl.items() if not v),
                lags={n: lg.get(n, {}) for n, _, _ in PARAMS})
    dag = dict(
        about="Causal DAG of the tree-simulation growth model (rust/core). Within a season, "
              "principle->state->principle edges follow spec §6's phase order (kind 'feeds'); a write read by an "
              "earlier phase acts next season (kind 'feedback'). 'reads' edges from params carry a gate: "
              "the condition under which the principle reads the param.",
        phases=PHASES, nodes=nodes, edges=all_edges,
        loops=[dict(id=a, label=b, states=c, note=d) for a, b, c, d in LOOPS],
        reach_structural=lag_struct, per_species=per_species)
    (OUT / "dag.json").write_text(json.dumps(dag, indent=1))
    write_text_graphs(pp)
    write_tables(edges, pp, lag_struct, per_species, grp_of)
    figures(pp, lag_struct, per_species, grp_of)


def write_text_graphs(pp):
    lines = ["digraph growth {", "  rankdir=LR; node [shape=box, fontsize=10];"]
    for ph in PHASES:
        lines.append(f'  subgraph "cluster_{ph}" {{ label="{ph}";')
        for k, (p_, i, lab, f) in PRINCIPLES.items():
            if p_ == ph:
                lines.append(f'    {k} [label="{lab}"];')
        lines.append("  }")
    for e in pp:
        if e["src"] == e["dst"]:
            continue
        style = "solid" if e["kind"] == "feeds" else "dashed, color=gray50, constraint=false"
        lines.append(f'  {e["src"]} -> {e["dst"]} [style={style}, label="{",".join(s[2:] for s in e["via"])}", fontsize=7];')
    lines.append("}")
    (OUT / "dag.dot").write_text("\n".join(lines))
    m = ["flowchart LR"]
    for ph in PHASES:
        m.append(f"  subgraph {ph}")
        for k, (p_, i, lab, f) in PRINCIPLES.items():
            if p_ == ph:
                m.append(f'    {k}["{lab}"]')
        m.append("  end")
    for e in pp:
        if e["src"] == e["dst"]:
            continue
        arrow = "-->" if e["kind"] == "feeds" else "-.->"
        m.append(f"  {e['src']} {arrow} {e['dst']}")
    (OUT / "dag.mmd").write_text("\n".join(m))


def write_tables(edges, pp, lag_struct, per_species, grp_of):
    md = []
    md.append("## Reach by outcome (structural: every gate open)\n")
    md.append("Lag = the fewest season boundaries on a path from the param to the outcome: 0 means it acts in the "
              "season it is read; 1 or more means only through a feedback loop. Every param below reaches the "
              "outcome; groups in bold reach it with lag 0.\n")
    for o, lab in OUTCOMES.items():
        by_lag = defaultdict(list)
        for prm, d in lag_struct.items():
            if o in d:
                by_lag[d[o]].append(prm)
        groups0 = sorted({grp_of.get(x, "metrics") for x in by_lag.get(0, [])})
        groups_all = sorted({grp_of.get(x, "metrics") for v in by_lag.values() for x in v})
        unreached = sorted(n for n, _, _ in PARAMS if o not in lag_struct.get(n, {}))
        md.append(f"### {lab}\n")
        md.append("- groups: " + ", ".join(f"**{gg}**" if gg in groups0 else gg for gg in groups_all))
        for k in sorted(by_lag):
            md.append(f"- lag {k}: " + ", ".join(f"`{x}`" for x in sorted(by_lag[k])))
        if unreached:
            md.append("- cannot reach it: " + ", ".join(f"`{x}`" for x in unreached))
        md.append("- loops on its paths: " + ", ".join(loops_on(edges, o)))
        md.append("")
    md.append("## Dead levers by species (gates evaluated on each species' effective params)\n")
    md.append("A param is dead when no gated path reaches any outcome: changing it cannot change the run "
              "(bit for bit). Context 'lone' is the sweep's lone tree (o2, o4 off, no storms, no neighbours, "
              "so R5's neighbour shade is 0); 'stand' assumes neighbours, o4 on and storms (the forest preset).\n")
    common = None
    for ctxname, sps in per_species.items():
        for sp, d in sps.items():
            s = set(d["dead"])
            common = s if common is None else common & s
    md.append("Not listed: `world.obstacles` and `o2.stormP` (lone), which are off at their value and switch their own "
              "rule on when set. A lever listed dead may still come alive when another param opens its gate "
              "(e.g. r2.forkAt needs the relay on).\n")
    md.append("Dead in every species and both contexts: " + ", ".join(f"`{x}`" for x in sorted(common)) + "\n")
    for ctxname, sps in per_species.items():
        md.append(f"### {ctxname}\n")
        md.append("| species | dead params (beyond the common set) | principles off |")
        md.append("|---|---|---|")
        for sp, d in sps.items():
            extra = [x for x in d["dead"] if x not in common]
            md.append(f"| {sp} | {', '.join(f'`{x}`' for x in extra) or '-'} | {', '.join(d['principles_off'])} |")
        md.append("")
    md.append("## Within-season principle edges (feeds) and across-season ones (feedback)\n")
    md.append("| from | to | kind | via |")
    md.append("|---|---|---|---|")
    for e in sorted(pp, key=lambda e: (e["kind"], ordinal(e["src"]), ordinal(e["dst"]))):
        md.append(f"| {e['src']} | {e['dst']} | {e['kind']} | {', '.join(e['via'])} |")
    (OUT / "reach_tables.md").write_text("\n".join(md) + "\n")


def figures(pp, lag_struct, per_species, grp_of):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

    INK, INK2, MUTED = "#0b0b0b", "#52514e", "#9a9893"
    C_FEED, C_BACK = "#2a78d6", "#eb6834"

    # -------- overview: principles by phase, param groups left, outcomes right
    fig, ax = plt.subplots(figsize=(17, 9.5), dpi=110)
    ax.set_xlim(-2.6, len(PHASES) + 1.9)
    ax.set_ylim(-5.6, 0.9)
    ax.axis("off")
    pos = {}
    for j, ph in enumerate(PHASES):
        ax.text(j, 0.55, f"{j + 1}. {ph}", ha="center", fontsize=10, color=INK, weight="bold")
        ax.axvspan(j - 0.48, j + 0.48, color="#f3f2ef" if j % 2 else "#fafaf8", zorder=0)
        items = [k for k, v in PRINCIPLES.items() if v[0] == ph]
        for i, k in enumerate(items):
            y = -0.35 - i * 1.15
            pos[k] = (j, y)
    short = {
        "OBST": "Obstacles", "STORM": "O2 storm draw", "C2_LIGHT": "C2 light field\n(deposit + sweep)",
        "O2_TAG": "O2 owner grid", "C2_SAMPLE": "C2 sample Q, V", "R5_SHADE": "R5 shade s",
        "R2_CROWD": "R2 crowd s-bar", "C5_QTOP": "C5 Q_top", "C3_BASI": "C3 basipetal\nQ sum",
        "R1_CARBON": "R1 carbon\nP - M, v_base", "C3_ACRO": "C3 B-H split\n(lambda)", "R4_FATE": "R4 bud fate",
        "R2_FORM": "R2 form\n(pa, relay, fork)", "C4_DIR": "C4 direction", "C1_SHOOT": "C1 shoots,\nnew metamers",
        "R6_REST": "R6 short shoot /\ndormant", "C5_SHED": "C5 shedding", "C6_GIRTH": "C6 girth",
        "R3_MECH": "R3 mechanics", "COMMIT": "Commit:\nage + 1", "O2_ABRADE": "O2 abrasion",
        "R1_STARVE": "R1 starvation", "O4_STAND": "O4 recruits,\nm0 deaths",
    }
    for k, (x, y) in pos.items():
        ax.add_patch(FancyBboxPatch((x - 0.42, y - 0.38), 0.84, 0.76, boxstyle="round,pad=0.02,rounding_size=0.08",
                                    fc="white", ec=INK2, lw=1.0, zorder=3))
        ax.text(x, y, short[k], ha="center", va="center", fontsize=8.2, color=INK, zorder=4)
    # param groups on the left, with the principles each feeds
    groups = ["world", "c2", "c1", "c3", "c4", "c5", "c6", "r1", "r2", "r2.levels", "r3", "r4", "r5", "r6", "o2", "o4"]
    gy = {gname: 0.2 - i * 0.36 for i, gname in enumerate(groups)}
    for gname, y in gy.items():
        ax.text(-2.0, y, gname, ha="right", va="center", fontsize=8.5, color=INK2, family="monospace")
        targets = sorted({pr for n, gg, reads in PARAMS if gg == gname for pr, _ in reads})
        for pr in targets:
            x1, y1 = pos[pr]
            ax.plot([-1.95, x1 - 0.42], [y, y1], color="#c9c7c1", lw=0.5, zorder=1)
    ax.text(-2.0, 0.6, "param groups", ha="right", fontsize=9, color=INK2, style="italic")
    # outcomes on the right
    ox = len(PHASES) + 0.25
    oy = {o: -0.3 - i * 0.68 for i, o in enumerate(OUTCOMES)}
    outshort = {"OUT_height": "height", "OUT_shape": "crown shape D, W/H", "OUT_crownbase": "crown base",
                "OUT_floor": "floor light", "OUT_survival": "survival", "OUT_recruits": "recruits",
                "OUT_metamers": "metamers", "OUT_slender": "slenderness H/D"}
    ax.text(ox, 0.55, "outcomes\n(end of season)", ha="left", fontsize=9, color=INK2, style="italic")
    writes = defaultdict(set)
    for pr, (rs, ws) in RW.items():
        writes[pr] |= set(ws)
    for o, y in oy.items():
        ax.text(ox + 0.05, y, outshort[o], ha="left", va="center", fontsize=9, color=INK, weight="bold")
        for pr, ws in writes.items():
            if any(s in ws for s in OUTCOME_FROM[o]):
                x1, y1 = pos[pr]
                ax.plot([x1 + 0.42, ox], [y1, y], color="#d8d6d0", lw=0.45, zorder=1)
    # principle edges
    for e in pp:
        a, b = e["src"], e["dst"]
        if a == b:
            continue
        (x0, y0), (x1, y1) = pos[a], pos[b]
        if e["kind"] == "feeds":
            arr = FancyArrowPatch((x0 + 0.42, y0), (x1 - 0.42, y1), arrowstyle="-|>", mutation_scale=7,
                                  color=C_FEED, lw=0.7, alpha=0.55, connectionstyle="arc3,rad=0.08", zorder=2)
        else:
            arr = FancyArrowPatch((x0, y0 - 0.38), (x1, y1 - 0.38), arrowstyle="-|>", mutation_scale=7,
                                  color=C_BACK, lw=0.7, alpha=0.45, ls="--",
                                  connectionstyle="arc3,rad=0.35", zorder=2)
        ax.add_patch(arr)
    ax.plot([], [], color=C_FEED, lw=1.5, label="feeds: within the season (phase order, spec §6)")
    ax.plot([], [], color=C_BACK, lw=1.5, ls="--", label="feedback: read by an earlier phase, so it acts next season")
    ax.legend(loc="lower left", bbox_to_anchor=(0.0, -0.02), frameon=False, fontsize=9)
    ax.set_title("All principle-to-principle edges (full detail; see dag.png for the readable overview)",
                 fontsize=12, color=INK, loc="left")
    fig.tight_layout()
    fig.savefig(OUT / "dag_full.svg")
    fig.savefig(OUT / "dag_full.png")
    plt.close(fig)

    # -------- dead levers: params dead somewhere, species x context
    names = [n for n, _, _ in PARAMS]
    sps = list(EFF)
    cols = [("lone", sp) for sp in sps] + [("stand", sp) for sp in sps]
    rows = [n for n in names if any(n in per_species[c][sp]["dead"] for c, sp in cols)]
    fig, ax = plt.subplots(figsize=(10.5, 0.27 * len(rows) + 2.2), dpi=120)
    ax.set_xlim(-0.5, len(cols) - 0.5 + 0.6)
    ax.set_ylim(len(rows) - 0.5, -0.6)
    for i, n in enumerate(rows):
        for j, (c, sp) in enumerate(cols):
            x = j + (0.6 if c == "stand" else 0)
            dead = n in per_species[c][sp]["dead"]
            ax.add_patch(plt.Rectangle((x - 0.46, i - 0.42), 0.92, 0.84, fc="#e4e2dd" if dead else "#2a78d6", ec="white"))
            if dead:
                ax.text(x, i, "dead", ha="center", va="center", fontsize=6, color=INK2)
    ax.set_xticks([j + (0.6 if c == "stand" else 0) for j, (c, sp) in enumerate(cols)])
    ax.set_xticklabels([sp for c, sp in cols], rotation=45, ha="left", fontsize=8)
    ax.xaxis.tick_top()
    ax.set_yticks(range(len(rows)))
    ax.set_yticklabels(rows, fontsize=7.5, family="monospace")
    ax.tick_params(length=0)
    for sp_ in ax.spines.values():
        sp_.set_visible(False)
    ax.set_title("Levers the code cannot let matter (grey: no gated path to any outcome); blue: live.\n"
                 "Left block: lone tree (the sweep). Right block: stand (neighbours, o4 on, storms).\n"
                 "All params not shown are live for every species in both contexts.", fontsize=9.5, color=INK, loc="left", pad=95)
    fig.tight_layout()
    fig.savefig(OUT / "dead_levers.png")
    fig.savefig(OUT / "dead_levers.svg")
    plt.close(fig)
    overview()


def overview():
    """The readable overview: one season's main causal chain, params as tags, named feedback loops."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

    INK, INK2 = "#0b0b0b", "#52514e"
    C_FEED, C_BACK = "#2a78d6", "#eb6834"
    W, H = 1.55, 1.0
    B = {
        "light": (0, 0, "C2 light field Q, V\n(all trees' foliage,\nsky sweep)", "c2.*  world.*\nr6.leafArea"),
        "sample": (2.0, 0, "Q, V at each bud;\nR5 shade s;\ncrown-top Q_top", "c5.topQuantile\nr5.signal  c2.C"),
        "qsum": (4.0, 1.5, "C3 basipetal:\nQ_sum per branch", "r6.leafArea"),
        "r1": (4.0, -1.5, "R1 carbon P - M\n-> reserve, seeds,\nv_base", "r1.*  c3.alpha\nc6.r0  c6.n"),
        "split": (6.0, 0, "C3 Borchert-Honda:\nv per bud; lambda by\nage, shade, vigour", "c3.mode  r2.aC\nr2.dLambda  r2.ramp\nlevels.lambda\nlevels.dLambdaShare\nr2.kappa  r2.vigour*\nr5.dLambda"),
        "fate": (8.0, 1.5, "R4/R6 bud fate:\ngrow, short shoot,\ndormant, abort", "r4.*  r6.qMin\nr6.lifespan\nc1.budBreak  r5.dB"),
        "shoots": (8.0, -1.5, "C1 + C4 + R2:\nnew shoots: size,\nangle, direction", "c1.*  c4.*  r2.hJ\nr2.relay* fork*\nr2.light*\nlevels.setPoint ...\nr5.eS  r5.dA"),
        "shed": (10.0, 0, "C5 shedding:\nbranch carbon deficit\nor light < Trel Q_top", "c5.g  c5.Trel\nr1.kShed  r4.bank\n(c5.T: dead, carbon)"),
        "girth": (12.0, 1.5, "C6 pipe girth\n(+ scars)", "c6.n  c6.r0"),
        "mech": (12.0, -1.5, "R3 sag, posture,\nstress wood,\nbreakage", "r3.*  o2.stormLoad\nr2 set points"),
        "deaths": (14.0, 0, "Deaths: R1 starvation;\nO4: m0, seeds\n-> recruits", "r1.kStarve  o4.*\nr1.fRep maturity"),
    }
    PH = [("1 Light", 0), ("2 Sample", 2.0), ("3 Allocate", 5.0), ("4 Grow", 8.0), ("5 Shed", 10.0),
          ("6-7 Girth,\nMechanics", 12.0), ("8-9 Commit,\nDeaths", 14.0)]
    fig, ax = plt.subplots(figsize=(20, 11.5), dpi=100)
    ax.set_xlim(-1.1, 18.6)
    ax.set_ylim(-6.6, 3.4)
    ax.axis("off")
    for lab, x in PH:
        ax.text(x, 2.75, lab, ha="center", va="bottom", fontsize=11, weight="bold", color=INK)

    for k, (x, y, t, prm) in B.items():
        ax.add_patch(FancyBboxPatch((x - W / 2, y - H / 2), W, H, boxstyle="round,pad=0.02,rounding_size=0.08",
                                    fc="white", ec=INK2, lw=1.1, zorder=3))
        ax.text(x, y, t, ha="center", va="center", fontsize=9, color=INK, zorder=4)
        ax.text(x, y - H / 2 - 0.07, prm, ha="center", va="top", fontsize=7.5, color=INK2, family="monospace",
                zorder=4, bbox=dict(fc="white", ec="none", pad=0.5, alpha=0.85))

    def side(k, d, off=0.0):
        x, y = B[k][0], B[k][1]
        return {"r": (x + W / 2, y + off), "l": (x - W / 2, y + off), "t": (x + off, y + H / 2),
                "b": (x + off, y - H / 2)}[d]

    feeds = [("light", "r", "sample", "l"), ("sample", "r", "qsum", "l"), ("sample", "r", "r1", "l"),
             ("qsum", "r", "split", "l"), ("r1", "r", "split", "l"), ("split", "r", "fate", "l"),
             ("fate", "b", "shoots", "t"), ("split", "r", "shoots", "l"), ("qsum", "r", "shed", "l"),
             ("r1", "r", "shed", "l"), ("shed", "r", "girth", "l"), ("shoots", "r", "girth", "l"),
             ("girth", "b", "mech", "t"), ("r1", "r", "deaths", "l"), ("mech", "r", "deaths", "l")]
    for a, da, b_, db in feeds:
        ax.add_patch(FancyArrowPatch(side(a, da), side(b_, db), arrowstyle="-|>", mutation_scale=12,
                                     color=C_FEED, lw=1.4, alpha=0.85, zorder=2, shrinkA=1, shrinkB=1))
    ax.add_patch(FancyArrowPatch(side("light", "t"), side("deaths", "t"), arrowstyle="-|>", mutation_scale=10,
                                 color=C_FEED, lw=1.0, alpha=0.6, ls=":", zorder=1,
                                 connectionstyle="arc3,rad=-0.13"))
    ax.text(7.0, 2.35, "floor light -> O4 establishment (stand only)", fontsize=8.5, color=C_FEED, ha="center")
    # loops across seasons: orthogonal routes through lanes under the boxes
    lanes = [
        ("mech", 0.3, "light", 0.0, -3.75, "L1 light and foliage: new leaves and positions shade next season's buds (self- and mutual shading)"),
        ("shoots", 0.3, "r1", 0.3, -4.3, "L2 cost of size: more tips and longer paths -> more maintenance, more hydraulic discount -> less v_base"),
        ("shoots", -0.3, "r1", -0.3, -4.85, "L6 height thresholds: height -> r2.hJ cap on shoot size (C1); height >= r1.maturity -> fRep of net to seeds (R1)"),
        ("deaths", 0.0, "split", 0.0, -5.4, "L7 clocks: tree age -> lambda's fall (aC, ramp), relayAge, forks, aged set points; bud age -> R4; wood age -> c5.g, r6.lifespan"),
    ]
    for a, oa, b_, ob, y, lab in lanes:
        xa, ya = side(a, "b", oa)
        xb, yb = side(b_, "b", ob)
        y0 = ya - (2.25 if a in ("shoots", "mech") else 1.9 if a == "deaths" else 0)
        y1 = yb - (2.25 if b_ in ("shoots", "mech", "r1", "split") else 0.75)
        ax.plot([xa, xa, xb], [ya, y, y], color=C_BACK, lw=1.4, ls="--", zorder=1)
        ax.add_patch(FancyArrowPatch((xb, y), (xb, yb), arrowstyle="-|>", mutation_scale=12, color=C_BACK,
                                     lw=1.4, ls="--", zorder=1, shrinkA=0, shrinkB=1))
        ax.text(min(xa, xb) + 0.1, y + 0.08, lab, fontsize=8.6, color=INK, va="bottom",
                bbox=dict(fc="white", ec="none", pad=0.6, alpha=0.9), zorder=5)
    selfs = [("r1", "L3 reserve carried over;\nk_starve empty seasons kill", B["r1"][0] - W / 2 - 0.08, B["r1"][1] + 0.1, "right"),
             ("shed", "L4 deficit counter: kShed\nseasons in a row", B["shed"][0], -1.2, "center"),
             ("mech", "L5 sag, stress wood\n-> next season's load", B["mech"][0] + W / 2 + 0.08, -1.95, "left")]
    for k, lab, x, y, ha in selfs:
        ax.text(x, y, "\u21bb " + lab, fontsize=8, color=C_BACK, va="top", ha=ha, zorder=5)
    # outcomes
    OX = 16.0
    outs = ["height  <- shoots, mechanics", "crown shape D, W/H  <- shoots, shedding,\n    girth, mechanics",
            "crown base  <- shedding, bud fate", "floor light  <- light field", "survival  <- deaths, windthrow",
            "recruits (stand)  <- O4", "metamers  <- shoots, shedding", "slenderness H/D  <- girth, shoots"]
    ax.text(OX, 2.75, "outcomes", ha="left", va="bottom", fontsize=11, weight="bold", color=INK)
    for i, lab in enumerate(outs):
        ax.text(OX, 2.3 - i * 0.62, lab, ha="left", va="top", fontsize=8.8, color=INK)
    ax.text(OX, 2.3 - 8 * 0.62, "Measured at the end of a season.\nFloor light is the field built\nfrom last season's foliage.",
            fontsize=8, color=INK2, va="top")
    ax.plot([], [], color=C_FEED, lw=2, label="feeds: within a season, in spec §6's phase order")
    ax.plot([], [], color=C_BACK, lw=2, ls="--", label="feedback: read by an earlier phase, so it acts next season")
    ax.legend(loc="lower left", bbox_to_anchor=(0.0, 0.0), frameon=False, fontsize=9.5)
    ax.set_title("The growth model as a causal graph: one season's chain (blue), and the loops that carry it into the next (orange)."
                 "  Grey text: the params each step reads.", fontsize=12.5, color=INK, loc="left")
    fig.tight_layout()
    fig.savefig(OUT / "dag.svg")
    fig.savefig(OUT / "dag.png")
    plt.close(fig)


if __name__ == "__main__":
    main()
