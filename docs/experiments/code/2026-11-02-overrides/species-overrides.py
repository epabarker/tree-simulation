"""Override candidates for the judging pass's "nearly"s that no accepted pick covers (holly, rowan,
hornbeam; the user's words in reviews/2026-11-02-judging-pass.md), run as the oak was: the fresh-
look harness's lone tree (240 wide) and closed stand (84 wide, 12 trees), the judging seeds 4–6,
60 and 100. Each variant is a dotted assignment set over the species' patch. Draws one dots sheet
per species (rows: variants; columns: lone 60, lone 100, stand 100; seed 4) and prints the shape
numbers (medians over seeds): H, W/H, fork height, limb elevation, the thickest path's kinks
(> 20° between metamers) and its top as a share of H; the stand's survival, LAI, H/D and kinks.

    uv run --project analysis python docs/experiments/code/2026-11-02-overrides/species-overrides.py runs/overrides [holly rowan hornbeam]
"""

from __future__ import annotations

import importlib.util
import math
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import polars as pl  # noqa: E402

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("render", HERE.parent / "2026-11-01-fresh-look-beech" / "render.py")
render = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render)
render.LONE_W = 240
SEEDS = (4, 5, 6)

VARIANTS: dict[str, dict[str, dict]] = {
    # "spire too narrow with a pointed tip; holly broadens with age" (lone 100).
    "holly": {
        "today": {},
        "fork40": {"r2.relay": 2, "r2.relayAge": 40, "r2.relayPTerm": 0.3, "r2.relayCrowd": 10,
                   "r2.forkAt": 1.3, "r2.forkAngle": 45, "r2.vigourTreeLo": 3000, "r2.vigourTreeHi": 10000},
        "eta09": {"r2.levels.1.eta": 0.9},
        "drop40": {"r2.aC": 40, "r2.ramp": 20, "r2.dLambda": 0.08},
        "sp75": {"r2.levels.1.setPoint": 75},
    },
    # "stacked lumpy tiers with a flat cap leaning off to one side" (lone 100); "stand stems snake
    # from the base like coppice". Level 1's lambda is 0.4917 (below 0.5 from birth), posture c 0.028.
    "rowan": {
        "today": {},
        "l1hold": {"r2.levels.1.lambda": 0.53},
        "l1hold-c06": {"r2.levels.1.lambda": 0.53, "r3.c": 0.06},
        "l1hold-dl0": {"r2.levels.1.lambda": 0.53, "r2.dLambda": 0.0},
        "kappa1": {"r2.levels.1.lambda": 0.53, "r2.kappa": 1.0},
    },
    # "crown is a V that runs to the ground, no trunk shown" (lone); "stand crowns too thin for the
    # stem girth". hJ 8.8 (laterals from the start), dLambda 0.079 takes the trunk to 0.50.
    "hornbeam": {
        "today": {},
        "hj30": {"r2.hJ": 30},
        "hj30-dl05": {"r2.hJ": 30, "r2.dLambda": 0.05},
        "hj30-sp55": {"r2.hJ": 30, "r2.levels.1.setPoint": 55},
        "hj40-dl05-sp55": {"r2.hJ": 40, "r2.dLambda": 0.05, "r2.levels.1.setPoint": 55},
    },
}


def thick_path(tm: pl.DataFrame) -> dict:
    tm = tm.sort("birthId")
    bid = tm["birthId"].to_list(); parent = tm["parentBirthId"].to_list(); rad = tm["radius"].to_list()
    x0, y0, z0, x1, y1, z1 = (tm[c].to_list() for c in ("x0", "y0", "z0", "x1", "y1", "z1"))
    children: dict[int, list[int]] = {}
    for i, p in enumerate(parent):
        children.setdefault(p, []).append(i)
    i = next(k for k, p in enumerate(parent) if p < 0)
    path = [i]
    while True:
        ch = children.get(bid[i], [])
        if not ch:
            break
        i = max(ch, key=lambda k: rad[k])
        path.append(i)
    H = max(y1); kinks = 0
    for a, b in zip(path, path[1:]):
        va = (x1[a] - x0[a], y1[a] - y0[a], z1[a] - z0[a]); vb = (x1[b] - x0[b], y1[b] - y0[b], z1[b] - z0[b])
        na, nb = math.hypot(*va), math.hypot(*vb)
        if na and nb:
            kinks += math.degrees(math.acos(max(-1.0, min(1.0, sum(p * q for p, q in zip(va, vb)) / (na * nb))))) > 20
    return {"top/H": y1[path[-1]] / H, "kinks": kinks}


def main() -> None:
    root = Path(sys.argv[1]); species = sys.argv[2:] or list(VARIANTS)
    for sp in species:
        out = root / sp; out.mkdir(parents=True, exist_ok=True)
        jobs = []
        for name, assigns in VARIANTS[sp].items():
            patch = render.species_patch(sp, assigns or None, None)
            for s in SEEDS:
                jobs.append(("lone", patch, s, out / f"lone-{name}-{s}"))
                jobs.append(("stand", patch, s, out / f"stand-{name}-{s}"))
        with ThreadPoolExecutor(4) as ex:
            list(ex.map(lambda j: render.run(j[0], sp, j[1], j[2], j[3]), jobs))
        rows = []
        for name in VARIANTS[sp]:
            for s in SEEDS:
                for season in (60, 100):
                    m, b, mt, f, _ = render.load(out / f"lone-{name}-{s}", season)
                    r, fr = mt.row(0, named=True), f.row(0, named=True)
                    rows.append({"variant": name, "trial": f"lone{season}", "seed": s, "H": r["height"],
                                 "W/H | LAI": max(r["crownWidth"], r["crownDepth"]) / r["height"],
                                 "fork | alive": fr["forkHeight"], "elev | H/D": fr["limbElevation"], **thick_path(m)})
                m, b, mt, f, g = render.load(out / f"stand-{name}-{s}", 100)
                nums = render.stand_numbers(mt, g)
                for t in mt.filter(pl.col("alive") == 1).iter_rows(named=True):
                    rows.append({"variant": name, "trial": "stand", "seed": s, "H": t["height"], "W/H | LAI": nums["LAI"],
                                 "fork | alive": float(nums["alive"].split("/")[0]), "elev | H/D": nums["H/D"],
                                 **thick_path(m.filter(pl.col("tree") == t["tree"]))})
        df = pl.DataFrame(rows); df.write_csv(out / "numbers.csv")
        print(f"== {sp}")
        with pl.Config(tbl_rows=40, tbl_width_chars=170):
            print(df.group_by("trial", "variant", maintain_order=True).agg(
                pl.col("H").median().round(0), pl.col("W/H | LAI").median().round(2), pl.col("fork | alive").median().round(2),
                pl.col("elev | H/D").median().round(0), pl.col("top/H").median().round(2), pl.col("kinks").median()).sort("trial", "variant"))
        names = list(VARIANTS[sp])
        fig, axes = plt.subplots(len(names), 3, figsize=(3 * 4.2, len(names) * 4.6), squeeze=False)
        for r_, name in enumerate(names):
            for c, (trial, season, width) in enumerate((("lone", 60, 240), ("lone", 100, 240), ("stand", 100, 84))):
                m, b, mt, f, _ = render.load(out / f"{trial}-{name}-4", season)
                ax = axes[r_][c]; render.draw(ax, m, b, width, True); ax.set_ylim(0, 200)
                ax.set_title(f"{sp} {name}: {trial} {season}", fontsize=8)
        fig.suptitle(f"{sp}: override candidates, seed 4, leaf-on (dots)", fontsize=10)
        fig.savefig(root.parent / "overrides-sheets" / f"{sp}.png" if (root.parent / "overrides-sheets").exists() else out / "sheet.png", dpi=60, bbox_inches="tight")
        plt.close(fig)
        print(out / "sheet.png")


if __name__ == "__main__":
    main()
