"""Writes grid-stand.py's picks (runs/form-grid<tag>/<species>/pick.json) into each targets file's
[form], flagged "provisional, picked overnight by the agent" with the date and the grid cell. Each
pick sets the grid's three knobs; the rest of [form] is round 2's (the grids held them there).
Beech stays at round 2's form (ADR 0031).

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/write-picks.py [--tag=-adr32]
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
SPECIES = ["hornbeam", "birch", "oak", "maple", "willow", "rowan", "holly"]
DATE = "2026-11-01"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", default="-adr32")
    args = ap.parse_args()
    for sp in SPECIES:
        pick = json.loads((REPO / "runs" / f"form-grid{args.tag}" / sp / "pick.json").read_text())
        path = REPO / "analysis" / "fit" / "targets" / f"{sp}.toml"
        text = path.read_text()
        start = text.index("\n[form]\n") + len("\n[form]\n")
        end = text.find("\n[", start)
        body = text[start:end if end >= 0 else None]
        # The previous pick's comment goes; its knob lines are the same three, rewritten below.
        body = re.sub(r"(?m)^# 2026-10-31 pick[^\n]*\n(#[^\n]*\n)*", "", body)
        flag = (f"# {DATE} pick: grid cell {pick['cell']} of the ADR 0032 grid (form-grid.py --tag={args.tag}), "
                f"provisional, picked overnight by the agent\n# by grid-stand.py's rule (stand alive >= 0.8 "
                f"at 100, the deepest living crown, then the lone outline){'; FLAGGED: no cell kept its stand' if pick['flagged'] else ''}."
                f"\n# The lines marked \"pick\"; the rest are round 2's.\n")
        for p, v in pick["assign"].items():
            pat = re.compile(r'(?m)^"' + re.escape(p) + r'" = [^\n]*$')
            line = f'"{p}" = {v:g}  # pick, {DATE}, provisional'
            body, n = pat.subn(line, body)
            if n == 0:
                raise SystemExit(f"{sp}: {p} not in [form]")
        path.write_text(text[:start] + flag + body + (text[end:] if end >= 0 else ""))
        print(sp, pick["cell"], pick["assign"], "flagged" if pick["flagged"] else "")


if __name__ == "__main__":
    main()
