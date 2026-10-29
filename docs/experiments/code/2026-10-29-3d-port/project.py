"""The review's open-slab projections, second version (2026-10-29, after G1 and the 3D prototype).

Per-season ms at the end of the garden's intro (season 40, peak growth), for forest and panorama at
D = 32, 48, 64 (and D = 64 with light in 2x cells), tiers (a)-(d), on the user's laptop and phone.
Labels: G1 = measured on the device; VM = measured here; P = measured in the 3D prototype;
e = estimate. Every value is (central, low, high).
"""

# --- light, ms a season (forest's season-96 field; the prototype's season-40 field is shorter) ---
# G1, measured on each device. TS and scalar at D 48/64 scale D 32 by the VM's ratios (e).
G1 = {
    "phone": {"a": {32: 222.1}, "b": {32: 117.6}, "c": {32: 48.2, 48: 65.8, 64: 86.1, "64c": 19.6},
              "d": {32: 32.1, 48: 35.8, 64: 42.9, "64c": 11.9}},
    "laptop": {"a": {32: 217.4}, "b": {32: 118.4}, "c": {32: 42.2, 48: 64.4, 64: 88.4, "64c": 11.2},
               "d": {32: 13.1, 48: 27.5, 64: 31.6, "64c": 2.9}},
}
VM_LIGHT = {"a": {32: 241, 48: 362, 64: 472}, "b": {32: 119, 48: 220, 64: 241}}  # VM, forest
VM_SIMD = {32: 57, 48: 77, 64: 108, "64c": 14}  # VM, forest, 1 lane
VM_PANO = {"b": {32: 447, 48: 647, 64: 792, "64c": 171}, "c": {32: 191, 48: 242, 64: 335, "64c": 41}}
VM_PANO_A = {32: 826, 48: 1291, 64: 1613, "64c": 202}


def light(case, dev, tier, D):
    g = G1[dev]
    if case == "forest":
        if D in g[tier]:
            v = g[tier][D]
        elif tier in ("a", "b"):  # (e) scale the device's D 32 by the VM's ratio
            key = 64 if D == "64c" else D
            v = g[tier][32] * VM_LIGHT[tier][key] / VM_LIGHT[tier][32] / (8 if D == "64c" else 1)
        return (v, v * 0.95, v * 1.05)
    # panorama (e): the VM's measured panorama x the device's ratio to the VM on forest
    if tier == "a":
        f = g["a"][32] / VM_LIGHT["a"][32]
        v = VM_PANO_A[D] * f
    elif tier == "b":
        v = VM_PANO["b"][D] * g["b"][32] / VM_LIGHT["b"][32]
    else:
        one = VM_PANO["c"][D] * g["c"][D] / VM_SIMD[D]
        v = one if tier == "c" else one / (g["c"][D] / g["d"][D])
    return (v, v * 0.9, v * 1.15)


# --- tree passes -------------------------------------------------------------------------
# Full 2D model, VM: forest 2.0 ms for 1905 metamers (1.05 us each); panorama 6.8 ms / 5092 (1.34)
US_2D = {"forest": 1.05, "panorama": 1.34}
N_2D_S40 = {"forest": 1972, "panorama": 5092}  # forest at season 40 (VM); panorama at 100 (VM)
# P: the metamer multiplier m (3D / 2D, same rules) at season 40, with R6 (central); the R1-only
# plateau (low); the prototype's absolute 3D count over the full model's 2D count (high).
M = {32: (19.0, 8.2, 42.0), 48: (20.1, 8.3, 44.3), 64: (20.5, 8.3, 45.1)}
M["64c"] = M[64]
# P: 3D / 2D cost per metamer of the passes at season 40 with R6 (central); the range over every
# prototype row from season 20 to 100 (1.1-2.7).
RATIO = {32: (1.69, 1.1, 2.7), 48: (1.65, 1.1, 2.7), 64: (1.78, 1.1, 2.7)}
RATIO["64c"] = RATIO[64]
R = (1.6, 2.0, 1.3)  # e: Rust over TS on the passes (low cost = high speed-up)
DEV = {"phone": (0.92, 0.85, 1.0), "laptop": (0.90, 0.85, 1.0)}  # G1 TS kernel vs the VM
THREADS = {"phone": (1.5, 1.5, 1.5), "laptop": (2.0, 3.0, 1.5)}  # phone: the user's rule; laptop e
SNAP_US = 0.10 * 1.3  # VM, 2D lean snapshot per metamer x 1.3 columns (e)


def season(case, dev, tier, D):
    rows = []
    for k in range(3):
        L = light(case, dev, tier, D)[k]
        n = N_2D_S40[case] * M[D][k]
        passes = n * US_2D[case] * RATIO[D][k] / 1000 * DEV[dev][k]
        snap = n * SNAP_US / 1000 * DEV[dev][k]
        if tier != "a":
            passes /= R[k]
            snap /= 1.5
        if tier == "d":
            passes /= THREADS[dev][k]
        rows.append((L, passes, snap, L + passes + snap))
    return rows


def fmt(c, lo, hi):
    if hi >= 1000:
        return f"{c / 1000:.2f} s ({lo / 1000:.2f}–{hi / 1000:.2f})"
    return f"{c:.0f} ({lo:.0f}–{hi:.0f})"


NAMES = {"a": "(a) TypeScript", "b": "(b) scalar Rust/WASM", "c": "(c) Rust, SIMD f32", "d": "(d) SIMD + 4 lanes"}
if __name__ == "__main__":
    for case in ["forest", "panorama"]:
        for dev in ["phone", "laptop"]:
            print(f"\n**`{case}`, {dev}**, season 40: light · tree passes · snapshot = season, ms\n")
            print("| D | " + " | ".join(NAMES.values()) + " |")
            print("|---|" + "---|" * 4)
            for D in [32, 48, 64, "64c"]:
                cells = []
                for tier in "abcd":
                    s = season(case, dev, tier, D)
                    c, lo, hi = (x[3] for x in s)
                    cells.append(f"{s[0][0]:.0f} · {s[0][1]:.0f} · {s[0][2]:.0f} = **{fmt(c, lo, hi)}**")
                label = "64, light in 2× cells" if D == "64c" else str(D)
                print(f"| {label} | " + " | ".join(cells) + " |")
