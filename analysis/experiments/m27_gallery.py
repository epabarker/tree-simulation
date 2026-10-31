"""Species round 5, §3.3: the gallery check (analysis/treesim/gallery.py; ADR 0029).

    uv run --project analysis python analysis/experiments/m27_gallery.py --workers 12
    uv run --project analysis python analysis/experiments/m27_gallery.py --species beech --fit docs/experiments/fits/round5/beech.json
    uv run --project analysis python analysis/experiments/m27_gallery.py --init     # writes the first entries

For each species with gallery entries: the hand form (the targets file's [form], physiology at round
2's), every rejected entry and, with --fit, a results file's fit, grown as the lone tree to 100 on
seeds 1001–1003. Prints the reported shape observables side by side at 60 and 100 (the profile as its
ten bands), then each reject's distance from the hand form in standardised observable space against
the seeds' noise. The check passes for a species when the hand form is separated from every reject;
where one is not, the observables cannot see the difference and the panel decides. With --fit, the
fit's nearest entry, and a flag where it is nearer a reject than the hand form.

--form-patches DIR writes each species' hand form as a whole patch, DIR/<species>.json ({"fit": {"patch"}}),
for the line-up panel's round "form" (panel-links.ts … form runs/panel-form), and stops.

--init writes the gallery's first entries (the round-5 plan, §3.3): round 2's spindles as adopted
(beech and birch: oak's and hornbeam's round-2 crowns are broad, W/H 1.07 and 1.04 at 60, not
spindles), round 3's beech cone, its oak and hornbeam parasols, and round 4's birch pagoda.
"""

import argparse
import json
import os

from treesim import REPO
from treesim.fit import Pool, load_spec
from treesim.gallery import SHAPE, distance, entries, evaluate, hand_form, nearest, noise, scales, write_entry, SEEDS

GARDEN = ["birch", "oak", "willow", "beech", "hornbeam", "rowan", "holly", "maple"]
FITS = REPO / "docs" / "experiments" / "fits"
#: Every parameter a gallery entry pins: the ten form knobs (an unset posture set point is left
#: out), the nine fitted physiology knobs, R1's sapwood cost (derived from r0 in the fits) and the
#: hydraulic discount's form.
PINNED = ["r2.levels.0.lambda", "r2.levels.1.lambda", "r2.levels.1.setPoint", "r2.levels.1.postureSetPoint",
          "r2.levels.1.branchAngle", "r2.levels.1.eta", "r2.levels.2.setPoint", "r2.aC", "r2.dLambda", "r2.kappa",
          "c3.alpha", "c5.Trel", "c6.r0", "r1.Lh", "r1.mf", "r3.c", "r6.qMin", "r6.leafArea", "r2.hJ",
          "r1.mw", "r1.hydraulic"]
INIT = [
    # (species, name, round, verdict); round 2 is FLORA as adopted, read through fit-eval.
    ("beech", "round2-spindle", "round2", "round 2 as adopted: a narrow spindle, widest at the base, where beech is a "
     "broad dome (the line-up panels, 2026-10-31)"),
    ("birch", "round2-spindle", "round2", "round 2 as adopted: a narrow spindle (the line-up panels, 2026-10-31)"),
    ("beech", "round3-cone", "round3", "not accepted: at 60 a tiered cone, widest at the base and pointed, with an "
     "overhanging top; at 100 a dome reached through tiers; the stand's crown 0.30 visibly short"),
    ("oak", "round3-parasol", "round3", "not accepted: at 60 a parasol, widest at the top, fanning out from a short "
     "trunk (at 100 nearly right, a broad mound)"),
    ("hornbeam", "round3-parasol", "round3", "not accepted: at 60 a parasol fanning from a short trunk; at 100 still "
     "an umbrella where it should be a dense egg; the stand a thin lid of leaf"),
    ("birch", "round4-pagoda", "round4", "not accepted: met its five measured targets as a tiered cone at 60 and a "
     "flat-topped pagoda of level limbs at 100 (setPoint 83°, κ 1.86)"),
]

parser = argparse.ArgumentParser()
parser.add_argument("--species", help="comma list (default: every garden species with gallery entries)")
parser.add_argument("--fit", help="a results file whose fit is checked against the gallery")
parser.add_argument("--workers", type=int, default=os.cpu_count() or 4)
parser.add_argument("--init", action="store_true", help="write the first gallery entries and stop")
parser.add_argument("--form-patches", help="write each species' hand form as a patch into this folder and stop")
args = parser.parse_args()

pool = Pool(args.workers)
try:
    if args.init:
        for sp, name, rnd, verdict in INIT:
            if rnd == "round2":
                values = pool.ask({"describe": sp, "paths": PINNED})["values"]
                assign = {k: v for k, v in values.items() if v is not None}
                source = "FITTED_FLORA (round 2 as adopted, src/core/flora-fitted.ts)"
            else:
                fit = json.loads((FITS / rnd / f"{sp}.json").read_text())["fit"]["assign"]
                assign = {k: fit[k] for k in PINNED if k in fit}
                source = f"docs/experiments/fits/{rnd}/{sp}.json (fit.assign)"
            print("wrote", write_entry(sp, name, assign, verdict, "2026-10-31", source))
        raise SystemExit(0)

    if args.form_patches:
        out = REPO / args.form_patches
        out.mkdir(parents=True, exist_ok=True)
        for sp in args.species.split(",") if args.species else GARDEN:
            patch = pool.ask({"amend": sp, "assign": hand_form(load_spec(sp))})["patch"]
            (out / f"{sp}.json").write_text(json.dumps({"fit": {"patch": patch}}, indent=1) + "\n")
            print("wrote", out / f"{sp}.json")
        raise SystemExit(0)

    names = args.species.split(",") if args.species else [sp for sp in GARDEN if entries(sp)]
    fitted = json.loads(open(args.fit).read())["fit"]["assign"] if args.fit else None
    for sp in names:
        spec = load_spec(sp)
        gallery = {e["name"]: e["assign"] for e in entries(sp)}
        points = {"hand": hand_form(spec), **gallery, **({"fit": fitted} if fitted else {})}
        res = evaluate(pool, sp, points)
        sc = scales(spec)
        cols = list(points)
        print(f"\n== {sp}: the lone tree, seeds {SEEDS[0]}–{SEEDS[-1]} (hand: [form] "
              f"{'from the targets file' if spec.form else 'absent: round 2 as adopted'}) ==")
        print(f"{'observable':18}" + "".join(f"{c[:16]:>17}" for c in cols))
        for suffix in ("", "100"):
            for n in SHAPE:
                k = n + suffix
                row = [res[c]["mean"].get(k) for c in cols]
                print(f"{k:18}" + "".join(f"{'—' if v is None else f'{v:.3g}':>17}" for v in row))
            k = f"profile{suffix}"
            row = ["/".join("–" if res[c]["mean"][f"{k}.{b}"] is None else f"{res[c]['mean'][f'{k}.{b}'] * 10:.0f}"
                            for b in range(10)) for c in cols]
            print(f"{k + ' (×10)':18}" + "".join(f" {v:>16}" for v in row))
        print("\nthe hand form against each reject (RMS standardised distance; noise of the difference; separated "
              "when the distance > 2 × noise):")
        passed = True
        for g in gallery:
            d = distance(res["hand"]["mean"], res[g]["mean"], sc)
            z = noise(res["hand"]["sd"], res[g]["sd"], len(SEEDS), sc)
            sep = d > 2 * z
            passed &= sep
            print(f"  {g:20} distance {d:.2f}, noise {z:.2f}: {'separated' if sep else 'COINCIDES'}")
        print(f"  check: {'passes' if passed else 'fails: the panel decides between the coinciding ones'}")
        if fitted:
            gal = {g: res[g] for g in gallery}
            near, d = nearest(res["fit"], gal, sc)
            dh = distance(res["fit"]["mean"], res["hand"]["mean"], sc)
            print(f"  fit: nearest {near} at {d:.2f}, the hand form at {dh:.2f}"
                  + (" — FLAGGED" if d < dh else ""))
finally:
    pool.close()
