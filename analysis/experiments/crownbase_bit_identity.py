"""Bit-identity of the 16 registered Level 1 descriptors across the describe.py edit that adds crownBase80 and
trunkTortuosity05 (docs/experiments/2026-11-05-crown-base-and-bole.md; the user's addition 1).

`snap OUT` writes, for every beech gate-c dump (runs/gate-c/trees, seeds 1-20, every tree, fine and coarsened at
BioDiv's d_min with inflation, as level1.describe_sim) and every BioDiv beech repeat (uncached), the 16 values as
float.hex (NaN as "nan"). `compare A B` asserts equality, value by value.

  uv run --project analysis python -I analysis/experiments/crownbase_bit_identity.py snap runs/crown-base/before.json
  uv run --project analysis python -I analysis/experiments/crownbase_bit_identity.py compare A B
  (--with-new: the four 2026-11-05 descriptors as well, for the boleSway edit)
"""

import json
import math
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "analysis"))

from treesim import coarsen as co  # noqa: E402
from treesim import qsm, simtree  # noqa: E402
from treesim import tolerance as tol  # noqa: E402
from treesim.describe import describe  # noqa: E402

REG = json.loads((ROOT / "analysis/fit/sources/level1-beech.json").read_text())
# The 16 registered, and (from the boleSway edit on) the four added on 2026-11-05.
NAMES = sorted(REG["descriptors"]) + (["crownBase80", "crownBase70", "crownBase90", "trunkTortuosity05"]
                                      if "--with-new" in sys.argv else [])
D_MIN = REG["d_min_m"]
DUMPS = ROOT / "runs/gate-c/trees"


def _hex(v) -> str:
    v = float(v)
    return "nan" if not math.isfinite(v) else v.hex()


def _row(d: dict) -> dict:
    return {k: _hex(d[k]) for k in NAMES}


def _sim(path: Path) -> dict:
    out = {}
    for k, t in enumerate(json.loads(path.read_text())["trees"]):
        c = simtree.from_dump(t).cylinders
        out[f"{path.stem}/{k}/fine"] = _row(describe(c))
        out[f"{path.stem}/{k}/dmin"] = _row(describe(co.coarsen(c, co.Resolution(D_MIN, (), ()), inflated=True)))
    return out


def _real(row: dict) -> dict:
    return {f"biodiv/{row['tree']}/m{k}": _row(describe(qsm.read(row["path"], model=k).cylinders))
            for k in tol._optimum_set(row["path"])}


def snap(out: Path) -> None:
    sims = sorted(DUMPS.glob("beech-*.json"))
    reals = [r for r in tol.real_sets() if r["dataset"] == "biodiv" and r["species"] == "Fagus_sylvatica"]
    res = {}
    with ProcessPoolExecutor(12) as ex:
        for part in ex.map(_sim, sims):
            res.update(part)
        for part in ex.map(_real, reals):
            res.update(part)
    out.write_text(json.dumps(res, indent=0, sort_keys=True))
    print(f"{len(res)} tables ({len(sims)} dumps, {len(reals)} BioDiv trees), {len(NAMES)} descriptors → {out}")


def compare(a: Path, b: Path) -> None:
    x, y = json.loads(a.read_text()), json.loads(b.read_text())
    assert x.keys() == y.keys(), "the table sets differ"
    bad = [(t, k, x[t][k], y[t][k]) for t in x for k in NAMES if x[t][k] != y[t][k]]
    print(f"{len(x)} tables × {len(NAMES)} descriptors = {len(x) * len(NAMES)} values; differing: {len(bad)}")
    for b_ in bad[:20]:
        print(b_)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    {"snap": lambda: snap(Path(sys.argv[2])), "compare": lambda: compare(Path(sys.argv[2]), Path(sys.argv[3]))}[sys.argv[1]]()
