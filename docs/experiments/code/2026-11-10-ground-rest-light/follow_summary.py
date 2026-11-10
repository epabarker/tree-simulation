"""#104: totals of follow.ts's outputs, <dir>/<species>-<base|fix>-<seed>.json, per species and build.
  python3 follow_summary.py <dir>"""
import glob, json, sys

d = sys.argv[1]
for sp in ("holly", "beech", "oak"):
    for build in ("base", "fix"):
        rs = [json.load(open(f)) for f in glob.glob(f"{d}/{sp}-{build}-*.json")]
        tot = {k: sum(r[k] for r in rs) for k in ("checked", "equal", "litFloor", "darkLit")}
        firsts = sorted(r["first"] for r in rs if r["first"])
        print(
            f"{sp} {build}: {len(rs)} seeds, {tot}; seeds with resting buds {sum(r['checked'] > 0 for r in rs)},"
            f" all equal in {sum(r['checked'] > 0 and r['equal'] == r['checked'] for r in rs)},"
            f" any dark over a lit floor in {sum(r['darkLit'] > 0 for r in rs)};"
            f" first rest season {firsts[0] if firsts else None}..{firsts[-1] if firsts else None}"
        )
