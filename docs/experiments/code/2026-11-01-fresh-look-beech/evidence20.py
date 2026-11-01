"""20-seed evidence for the fresh-look beech (review, 2026-11-01): the lone tree and the closed stand
under a configuration, seeds 1–20 (AGENTS.md: a claim about all seeds needs N ≥ 20 and a stated pass
rate; seeds 1001–1006 are held out and never run here).

Reuses render.py's worlds (`run`, `load`, `draw`) so the trials are the round's own: the lone tree
in a world `--lone-width` wide (the repair's 240), the closed stand 84 wide, periodic, opaque faces,
12 trees, both to season 100 with a snapshot at 60.

    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/evidence20.py \
        --label repair --out runs/fresh-look/evidence20-repair
    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/evidence20.py \
        --label today --off --out runs/fresh-look/evidence20-today

`--off` sets every new rule of the round to its off value (the relay, the fork, the drop, light
orthotropy, own-crown pruning, the level-0 curve), which is beech as it was before the round.

The pass criteria are fixed here, before the runs (stand at 100; lone at 60 and 100):
- ecology guard (task.md): alive ≥ 10 of 12; floor 3–5%; LAI "about 7", read as 6–8 (and 5.5–8.5
  reported); middle-row H/D 70–110; and the vigour gate shut in the stand (every tree's v_base below
  r2.vigourTreeLo 3000), the round's own claim that the stand is untouched;
- shape (the checklist and the photograph note): W/H 0.6–1.0 (checklist) and 1.3–1.5 (photograph);
  the trunk divides low, forkHeight ≤ 0.5; the crown clears the world's sides (W ≤ width − 4); the
  lower trunk clears (the user's observation): lowest leaf ≥ 0.06·H and leaf below H/6 ≤ 7% (the
  repair's own claim).
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import polars as pl  # noqa: E402

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location("render", HERE / "render.py")
render = importlib.util.module_from_spec(spec)
spec.loader.exec_module(render)

OFF = {
    "r2.relay": 0,
    "r2.forkAt": 0,
    "r2.vigourShare": 0,
    "r2.lightSetPoint": None,  # JSON null: absent, as the params reader takes it
    "c5.Tvig": 0,
    "r2.levels.0.curve": 0,
}
GATE_LO = 3000.0


def lone_row(out: Path, season: int, width: int) -> dict:
    m, b, mt, f, _ = render.load(out, season)
    r, fr = mt.row(0, named=True), f.row(0, named=True)
    h = r["height"]
    w = max(r["crownWidth"], r["crownDepth"])
    leaf = b["leaf"].sum()
    low = b.filter(pl.col("y") < h / 6)["leaf"].sum() if leaf else 0.0
    return {
        "H": h,
        "W/H": w / h if h else None,
        "clears sides": r["crownWidth"] <= width - 4,
        "forkHeight": fr["forkHeight"],
        "leaderDominance": fr["leaderDominance"],
        "limbCrownRatio": r["limbCrownRatio"],
        "lowest leaf / H": float(b["y"].min()) / h if b.height and h else None,
        "leaf below H/6": float(low / leaf) if leaf else None,
        "vBase": r["vBase"],
    }


def stand_row(out: Path) -> dict:
    _, _, mt, _, g = render.load(out, 100)
    nums = render.stand_numbers(mt, g)
    alive = mt.filter(pl.col("alive") == 1)
    # The gate over the whole run, not only at 100: the largest v_base any stand tree reached.
    allm = pl.read_csv(out / "metrics.csv", infer_schema_length=None)
    return {
        "alive": int(nums["alive"].split("/")[0]),
        "H/D": nums["H/D"],
        "crownRatio(limb)": nums["crownRatio(limb)"],
        "crownRatio(leaf)": nums["crownRatio(leaf)"],
        "floor": float(nums["floor"].rstrip("%")) / 100,
        "LAI": nums["LAI"],
        "max vBase (any tree, any season)": float(allm["vBase"].max()),
        "H": nums["height"],
        "n": alive.height,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--label", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--off", action="store_true", help="every new rule off: beech before the round")
    ap.add_argument("--seeds", default="1-20")
    ap.add_argument("--lone-width", type=int, default=240)
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--no-run", action="store_true")
    a = ap.parse_args()
    lo, hi = (int(x) for x in a.seeds.split("-"))
    seeds = list(range(lo, hi + 1))
    assert not any(1001 <= s <= 1006 for s in seeds), "seeds 1001–1006 are held out"
    render.LONE_W = a.lone_width
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    patch = render.species_patch("beech", OFF if a.off else None, None)
    (out / "species-patch.json").write_text(json.dumps(patch, indent=1))
    if not a.no_run:
        jobs = [(t, s) for s in seeds for t in ("lone", "stand")]
        with ThreadPoolExecutor(a.workers) as ex:
            list(ex.map(lambda j: render.run(j[0], "beech", patch, j[1], out / f"{j[0]}-{j[1]}"), jobs))

    rows = []
    for s in seeds:
        row = {"seed": s}
        for season in (60, 100):
            for k, v in lone_row(out / f"lone-{s}", season, a.lone_width).items():
                row[f"lone{season} {k}"] = v
        for k, v in stand_row(out / f"stand-{s}").items():
            row[f"stand {k}"] = v
        rows.append(row)
    df = pl.DataFrame(rows)
    df.write_csv(out / "evidence.csv")

    n = len(seeds)

    def count(expr) -> int:
        return int(df.select(expr.cast(pl.Int32).sum()).item())

    c = pl.col
    tests = {
        "guard: alive ≥ 10 of 12": count(c("stand alive") >= 10),
        "guard: floor 3–5%": count(c("stand floor").is_between(0.03, 0.05)),
        "guard: LAI 6–8": count(c("stand LAI").is_between(6, 8)),
        "guard: LAI 5.5–8.5": count(c("stand LAI").is_between(5.5, 8.5)),
        "guard: H/D 70–110": count(c("stand H/D").is_between(70, 110)),
        "guard: all four (alive, floor, LAI 6–8, H/D)": count(
            (c("stand alive") >= 10)
            & c("stand floor").is_between(0.03, 0.05)
            & c("stand LAI").is_between(6, 8)
            & c("stand H/D").is_between(70, 110)
        ),
        "gate shut in the stand (max v_base < 3000)": count(c("stand max vBase (any tree, any season)") < GATE_LO),
    }
    for season in (60, 100):
        p = f"lone{season} "
        tests |= {
            f"lone {season}: W/H 0.6–1.0 (checklist)": count(c(p + "W/H").is_between(0.6, 1.0)),
            f"lone {season}: W/H 1.3–1.5 (photograph)": count(c(p + "W/H").is_between(1.3, 1.5)),
            f"lone {season}: forkHeight ≤ 0.5": count(c(p + "forkHeight") <= 0.5),
            f"lone {season}: crown clears the sides": count(c(p + "clears sides")),
            f"lone {season}: lowest leaf ≥ 0.06·H": count(c(p + "lowest leaf / H") >= 0.06),
            f"lone {season}: leaf below H/6 ≤ 7%": count(c(p + "leaf below H/6") <= 0.07),
        }
    summary = {"label": a.label, "seeds": f"{lo}–{hi}", "n": n, "lone width": a.lone_width,
               "passes": {k: f"{v} of {n}" for k, v in tests.items()}}
    num = df.drop("seed").select([c for c in df.columns if df[c].dtype != pl.Boolean and c != "seed"])
    summary["median"] = {k: round(float(num[k].median()), 3) for k in num.columns}
    summary["range"] = {k: [round(float(num[k].min()), 3), round(float(num[k].max()), 3)] for k in num.columns}
    (out / "summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False))
    print(json.dumps(summary["passes"], indent=1, ensure_ascii=False))

    # Thumbnails: the lone tree at 100 and the stand at 100, leaf-on, every seed.
    for trial, width in (("lone", a.lone_width), ("stand", render.STAND_W)):
        fig, axes = plt.subplots(4, 5, figsize=(15, 4 * (4.3 if trial == "lone" else 3.6)))
        for ax, s in zip(axes.flat, seeds):
            m, b, mt, f, g = render.load(out / f"{trial}-{s}", 100)
            render.draw(ax, m, b, width, True)
            ax.set_title(f"seed {s}", fontsize=8)
        fig.suptitle(f"{a.label}: {trial} at 100, seeds {lo}–{hi}, leaf-on", fontsize=11)
        fig.savefig(out / f"{trial}100-thumbs.png", dpi=80, bbox_inches="tight")
        plt.close(fig)


if __name__ == "__main__":
    main()
