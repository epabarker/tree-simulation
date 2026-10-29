"""The review's open-slab projections (2026-10-29, third session): per-season ms for forest and
panorama at D = 32, 48, 64 and D = 64 in 2x light cells, tiers (a)-(d), desktop and phone.
Inputs are labelled: m = measured (2026-10-29-open-slab-cost.md), e = estimate. Central (low-high)."""

# light, desktop ms: (central, low, high)
LIGHT = {
    "forest": {
        32: {"a": (241, 222, 260), "b": (119, 118, 120), "c": (57, 54, 59), "d": (23, 21, 25)},
        48: {"a": (362, 333, 391), "b": (220, 220, 220), "c": (77, 76, 77), "d": (32, 28, 37)},
        64: {"a": (472, 434, 510), "b": (241, 241, 241), "c": (108, 105, 111), "d": (43, 40, 46)},
        "64c": {"a": (59, 54, 64), "b": (43, 43, 43), "c": (14, 12, 15), "d": (6, 5, 7)},
    },
    "panorama": {
        32: {"a": (826, 760, 892), "b": (447, 447, 447), "c": (191, 191, 191)},
        48: {"a": (1291, 1188, 1394), "b": (647, 647, 647), "c": (242, 242, 242)},
        64: {"a": (1613, 1484, 1742), "b": (792, 792, 792), "c": (335, 335, 335)},
        "64c": {"a": (202, 186, 218), "b": (171, 171, 171), "c": (41, 41, 41)},
    },
}
# measured as noted in the open-slab note; 'a' ±8% (one run each), '64c' TS = fine/8 (e)
for D in LIGHT["panorama"]:  # panorama 4 lanes: forest's 1-to-4 ratio at the same D (e)
    c = LIGHT["panorama"][D]["c"][0]
    r = {32: 2.6, 48: 2.8, 64: 2.5, "64c": 2.4}[D]
    LIGHT["panorama"][D]["d"] = (c / r, c / 3.2, c / 2.2)

TREES_2D = {"forest": 2.0, "panorama": 6.8}  # ms, mature seasons (m: bench x last-20/mean)
SNAP_2D = {"forest": 0.25, "panorama": 0.94}
M = {32: (32, 22, 46), 48: (45, 29, 69), 64: (57, 35, 92), "64c": (57, 35, 92)}  # e
P = (2.0, 1.5, 3.0)  # e: per-metamer cost, 3D against 2D
R = (1.6, 2.0, 1.3)  # e: Rust over TS on tree passes (low cost = high speed-up)
TT_DESK = (2.5, 3.0, 2.0)  # e: threads on tree passes
TT_PHONE = (2.0, 2.3, 1.7)
TL_PHONE = (2.2, 2.5, 2.0)  # e: lanes on light, phone
PHONE = 2.7  # m once (M15), assumed for WASM


def season(case, D, tier, phone):
    out = []
    for k in range(3):  # central, low, high
        light = LIGHT[case][D][tier][k]
        if phone:
            light = (LIGHT[case][D]["c"][k] * PHONE / TL_PHONE[k]) if tier == "d" else light * PHONE
        trees = TREES_2D[case] * M[D][k] * P[k]
        snap = SNAP_2D[case] * M[D][k] * 1.3
        if tier != "a":
            trees /= R[k]
            snap /= 1.5
        if tier == "d":
            trees /= (TT_PHONE if phone else TT_DESK)[k]
        if phone:
            trees *= PHONE if tier != "d" else PHONE
            snap *= PHONE
        out.append((light, trees, snap, light + trees + snap))
    return out


def fmt(t):
    c, lo, hi = t
    if hi >= 1000:
        return f"{c / 1000:.2f} s ({lo / 1000:.2f}–{hi / 1000:.2f})"
    return f"{c:.0f} ({lo:.0f}–{hi:.0f})"


NAMES = {"a": "(a) TypeScript", "b": "(b) scalar Rust/WASM", "c": "(c) Rust, SIMD f32", "d": "(d) SIMD + 4 lanes"}
for case in ["forest", "panorama"]:
    for phone in [False, True]:
        print(f"\n**`{case}`, {'phone (×2.7)' if phone else 'desktop'}**: light · tree passes · snapshot = season, ms\n")
        print("| D | " + " | ".join(NAMES.values()) + " |")
        print("|---|" + "---|" * 4)
        for D in [32, 48, 64, "64c"]:
            cells = []
            for tier in "abcd":
                s = season(case, D, tier, phone)
                L, T, S, tot = (tuple(x[i] for x in s) for i in range(4))
                cells.append(f"{L[0]:.0f} · {T[0]:.0f} · {S[0]:.0f} = **{fmt(tot)}**")
            label = "64, light in 2× cells" if D == "64c" else str(D)
            print(f"| {label} | " + " | ".join(cells) + " |")
