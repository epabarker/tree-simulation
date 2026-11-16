"""#132's ramp re-probe: the B2 arms' stand bars (docs/experiments/2026-11-16-understorey-ramp-memory-probe.md,
bars fixed before any run), read by #134's stand check script (code/2026-11-16-beech-stand-check/stand.py) on this
probe's runs: bar 6 against Tallo per species, and the canopy's species shares at 300 (160 cells).

    uv run --project analysis python -I docs/experiments/code/2026-11-16-understorey-ramp-memory-probe/b2.py [-j 10]

Writes runs/132-ramp-memory/{measure/, summary.json, tables.md} through stand.py, and b2.json; prints the tables.
"""

import importlib.util
import json
import multiprocessing
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("stand", HERE.parent / "2026-11-16-beech-stand-check" / "stand.py")
stand = importlib.util.module_from_spec(_spec)
sys.modules["stand"] = stand  # the pool's workers pickle stand.measure by its module's name
_spec.loader.exec_module(stand)

stand.ROOT = stand.REPO / "runs" / "132-ramp-memory"
stand.ARMS = ("M", "Mr15", "MB2", "Mr15B2")
stand.BASELINE = {"MB2": "M", "Mr15B2": "Mr15"}  # stand.py's own verdicts are printed, not this probe's bars
PAIRS = {"MB2": "M", "Mr15B2": "Mr15"}


def shares(arm, season=300, width=160):
    """Each species' share of the canopy trees at `season`, seeds pooled."""
    c = defaultdict(int)
    for s in stand.SEEDS:
        if not (stand.run_dir(arm, width, s) / "hash.txt").exists():
            continue
        for t in stand.read_run(arm, width, s)["trees"]:
            if t["season"] == season:
                c[t["species"]] += 1
    n = sum(c.values()) or 1
    return {k: v / n for k, v in c.items()}, dict(c)


def main():
    multiprocessing.set_start_method("fork", force=True)  # the workers keep this module's ROOT and ARMS
    stand.main()
    gate = json.loads((stand.ROOT / "summary.json").read_text())["gate"]
    out = {}
    print("\n## This probe's B2 stand bars (160 cells)\n")
    print("| arm | vs | beech z 100 / 300 (B2a) | hornbeam 100 / 300: inside, z (B2b) | hornbeam largest share at 300 (B2b) "
          "| beech share at 300 ≤ 0.4 (B2c) | maple@300 kept (B2d) |")
    print("|---|---|---|---|---|---|---|")
    for arm, base in PAIRS.items():
        g, gb = gate.get(arm, {}), gate.get(base, {})
        cell = lambda gg, k: gg.get(k, {"readable": False, "inside": 0})  # noqa: E731
        b2a = all(cell(g, f"beech@{s}").get("passes", False) for s in (100, 300))
        hb = [cell(g, f"hornbeam@{s}") for s in (100, 300)]
        sh, n = shares(arm)
        top = max(sh, key=sh.get) if sh else None
        b2b = all(c.get("readable") and c.get("passes") for c in hb) and top == "hornbeam"
        b2c = sh.get("beech", 0) <= 0.4
        mb = cell(gb, "maple@300")
        b2d = (not mb.get("passes", False)) or bool(cell(g, "maple@300").get("passes", False))
        out[arm] = {"vs": base, "B2a": b2a, "B2b": b2b, "B2c": b2c, "B2d": b2d, "shares300": sh, "canopy300": n,
                    "top300": top, "maple300": cell(g, "maple@300"), "maple300Base": mb,
                    "beech": [cell(g, f"beech@{s}") for s in (100, 300)], "hornbeam": hb}
        z = lambda c: f"{c['medianZ']:.2f}" if c.get("readable") else "unreadable"  # noqa: E731
        print(f"| {arm} | {base} | {' / '.join(z(cell(g, f'beech@{s}')) for s in (100, 300))} {'✓' if b2a else '✗'} | "
              f"{' / '.join(str(c['inside']) + ', ' + z(c) for c in hb)} | {top} ({sh.get('hornbeam', 0):.2f}) "
              f"{'✓' if b2b else '✗'} | {sh.get('beech', 0):.2f} {'✓' if b2c else '✗'} | "
              f"{z(cell(g, 'maple@300'))} (base {z(mb)}) {'✓' if b2d else '✗'} |")
    for arm in PAIRS.values():
        sh, n = shares(arm)
        out[arm] = {"shares300": sh, "canopy300": n}
        print(f"\n{arm}: canopy shares at 300: {', '.join(f'{k} {v:.2f}' for k, v in sorted(sh.items(), key=lambda kv: -kv[1]))}")
    (stand.ROOT / "b2.json").write_text(json.dumps(out, indent=1, default=str))


if __name__ == "__main__":
    main()
