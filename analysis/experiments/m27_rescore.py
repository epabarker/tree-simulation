"""M27 round 4, step B.5: a round's fits re-scored against the targets as they stand now, no search.

    uv run --project analysis python analysis/experiments/m27_rescore.py --round round3 --workers 12

For each species with a results file in docs/experiments/fits/<round>/, its fitted assignments and
the start it was fitted from (the results file's `start`: round 2 as adopted, shifted where the
driver shifted it) are measured on the verification's fresh seeds (1001–1006) through `fit-eval`,
against the targets files in analysis/fit/targets/ (revised for round 4: per-species H/D, the limb
crown ratio, stand LAI, the crown profile). It says which species move out of band under the new
targets before any compute is spent on a re-fit (species plan of 2026-10-31, step C).

Writes docs/experiments/fits/<round>/<species>-rescore.json and prints the margins table: each
trait's distance to its band's edge (a profile's worst band's), positive inside.
"""

import argparse
import json
import os

from treesim import REPO
from treesim.fit import Pool, load_spec
from treesim.fit_lm import LMSettings, Problem, in_band, margins

parser = argparse.ArgumentParser()
parser.add_argument("--round", default="round3", help="the fits' folder under docs/experiments/fits/")
parser.add_argument("--species", help="comma list (default: every species with a results file)")
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
args = parser.parse_args()

FITS = REPO / "docs" / "experiments" / "fits" / args.round
SEEDS = LMSettings().verify_seeds
fresh = {"lone": SEEDS, "stand": SEEDS, "shade": SEEDS}
names = args.species.split(",") if args.species else sorted(
    p.stem for p in FITS.glob("*.json") if "-" not in p.stem and p.stem != "holdout"
)
fmt = lambda m, band: "—" if m is None else f"{m / band:+.2f}"

pool = Pool(args.workers)
rows = []
try:
    for sp in names:
        result = json.loads((FITS / f"{sp}.json").read_text())
        spec = load_spec(sp)
        start, fitted = result["start"]["assign"], result["fit"]["assign"]
        prob = Problem(spec, pool, LMSettings(workers=args.workers), None, (0, 1), start["c6.r0"])
        start_t, fit_t = prob.traits_of([start, fitted], fresh)
        m = margins(spec, start_t, fit_t)
        inside, n, outside = in_band(spec, fit_t)
        was = result.get("measuredInBand", "—")
        out = {"species": sp, "round": args.round, "seeds": SEEDS, "measuredInBand": f"{inside} of {n}",
               "measuredOutside": outside, "before": {"measuredInBand": was,
                                                      "measuredOutside": result.get("measuredOutside")},
               "margins": m, "start": {"assign": start, "traits": start_t}, "fit": {"assign": fitted, "traits": fit_t}}
        (FITS / f"{sp}-rescore.json").write_text(json.dumps(out, indent=2, default=float) + "\n")
        rows.append((sp, was, f"{inside} of {n}", outside, m))
        print(f"{sp}: measured in band {was} → {inside} of {n} (outside: {', '.join(outside) or 'none'})", flush=True)
finally:
    pool.close()

print(f"\nmargins at the {args.round} fits on seeds {SEEDS[0]}–{SEEDS[-1]} (in bands: + inside, − outside; start → fit; * measured)")
for sp, was, now, outside, m in rows:
    print(f"\n{sp}: {was} → {now}")
    for r in m:
        star = "*" if r["kind"] == "measured" else " "
        print(f"  {star} {r['trait']:24} {fmt(r['startMargin'], r['band']):>6} → {fmt(r['fitMargin'], r['band']):>6}")
