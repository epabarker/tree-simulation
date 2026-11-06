"""Phase 1's gate b (docs/plans/2026-11-03-reference-fidelity.md §j, amendment A): form.py with the simulator's
labels and form.rs's rules reproduces the Rust core's own form metrics on 30 trees (oak, beech, birch × seeds 1, 2;
the lone tree at 60, the stand's four measured trees at 100; `cli/dump-trees.ts`): all 12 values and 10 bands
within 1e-9·max(1, |rust|), NaN equal to NaN. Two of the stand's beech are dead at 100: their skeletons stand, and
both sides read them.

And, reported, never gated: the relabelling table. The same 30 trees, the same rules (form.rs's counts and 10
bands), the simulator's labels against geometric ones (continuation by subtree wood volume, cylinders.py): what
reading a tree's topology from its geometry alone, as describe() must for a QSM, moves.

    node cli/dump-trees.ts                                        # runs/gate-b/trees.json, ≈ 90 s
    uv run --project analysis python -I -m treesim.form_gate      # both tables, as markdown
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

from treesim import cylinders as cy
from treesim import simtree
from treesim.form import FORM_COLUMNS, SIM, Labels, form

TOL = 1e-9


def close(a: float, b: float) -> bool:
    if math.isnan(b) or math.isnan(a):
        return math.isnan(a) and math.isnan(b)
    return abs(a - b) <= TOL * max(1.0, abs(b))


def ported(t: simtree.SimTree) -> dict:
    return form(t.cylinders, t.labels, SIM, leaf=t.leaf, pipe=t.pipe)


def geometric(c: cy.Cylinders) -> Labels:
    nxt = cy.continuation(c)
    order, axis = cy.order_and_axis(c, nxt)
    return Labels(nxt=nxt, order=order, axis=axis)


def gate(trees: list[simtree.SimTree]) -> list[dict]:
    """One row a tree: the largest relative error over the 22 numbers and the names that fail."""
    rows = []
    for t in trees:
        ours = ported(t)
        fails, worst = [], 0.0
        pairs = [(k, ours[k], t.form[k]) for k in FORM_COLUMNS]
        pairs += [(f"p{k}", a, b) for k, (a, b) in enumerate(zip(ours["profile"], t.form["profile"]))]
        if len(ours["profile"]) != len(t.form["profile"]):
            fails.append("profile length")
        for k, a, b in pairs:
            if not close(a, b):
                fails.append(k)
            elif not math.isnan(b):
                worst = max(worst, abs(a - b) / max(1.0, abs(b)))
        rows.append({**t.meta, "cylinders": len(t.cylinders), "worst": worst, "fails": fails})
    return rows


def relabel(trees: list[simtree.SimTree]) -> list[dict]:
    """Per descriptor: how many of the trees move, and the median and largest |geometric − simulator|."""
    diffs: dict[str, list[float]] = {k: [] for k in FORM_COLUMNS}
    nan_change = {k: 0 for k in FORM_COLUMNS}
    for t in trees:
        a = ported(t)
        b = form(t.cylinders, geometric(t.cylinders), SIM, leaf=t.leaf, pipe=t.pipe)
        for k in FORM_COLUMNS:
            if math.isnan(a[k]) != math.isnan(b[k]):
                nan_change[k] += 1
            elif not math.isnan(a[k]):
                diffs[k].append(b[k] - a[k])
    out = []
    for k in FORM_COLUMNS:
        d = sorted(abs(x) for x in diffs[k])
        out.append({
            "descriptor": k, "moved": sum(x > TOL for x in d), "of": len(d), "nan_changed": nan_change[k],
            "median_abs": d[len(d) // 2] if d else math.nan, "max_abs": d[-1] if d else math.nan,
            "mean_signed": sum(diffs[k]) / len(diffs[k]) if diffs[k] else math.nan,
        })
    return out


def markdown(rows: list[dict], table: list[dict]) -> str:
    passed = sum(not r["fails"] for r in rows)
    lines = [f"Gate b: {passed} of {len(rows)} trees pass (22 numbers each, 1e-9·max(1, |b|), NaN = NaN).", "",
             "| species | seed | trial | alive | cylinders | worst rel. err | fails |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['species']} | {r['seed']} | {r['trial']} | {r['alive']} | {r['cylinders']} "
                     f"| {r['worst']:.1e} | {', '.join(r['fails']) or '–'} |")
    lines += ["", "Relabelling (reported): form.rs's rules, simulator labels → geometric labels.", "",
              "| descriptor | trees moved | NaN changed | median abs | max abs | mean signed |", "|---|---|---|---|---|---|"]
    for s in table:
        lines.append(f"| {s['descriptor']} | {s['moved']} of {s['of']} | {s['nan_changed']} | {s['median_abs']:.3g} "
                     f"| {s['max_abs']:.3g} | {s['mean_signed']:+.3g} |")
    return "\n".join(lines)


if __name__ == "__main__":
    trees = simtree.load(Path(sys.argv[1]) if len(sys.argv) > 1 else simtree.DUMP)
    print(markdown(gate(trees), relabel(trees)))
