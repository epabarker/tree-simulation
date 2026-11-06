"""The NW-FVA yield tables' top height H100 (Albert et al. 2021, after Schober; CRAN et.nwfva 0.2.0, its R/sysdata.rda)
for oak (110), beech (211) and pine (711), every yield class and age, as analysis/fit/sources/nwfva_h100.csv: the
source of Level 0 v2's height at 100 and 150 (docs/experiments/2026-11-03-level0-targets.md). Read from the CRAN source
tarball et.nwfva 0.2.0 (sha256 fc72949b5628b5b718bd39a8689b0162144b64975d6a646f62c5dde7b853460f, fetched 2026-10-31);
untar it into a folder of its own and pass its sysdata.rda:

    uv run --no-project --with rdata --with pandas python -I analysis/experiments/nwfva_extract.py PATH/sysdata.rda
"""

import csv
import sys
from pathlib import Path

import rdata

OUT = Path(__file__).resolve().parents[1] / "fit" / "sources" / "nwfva_h100.csv"
CODES = {"110": "oak", "211": "beech", "711": "pine"}

d = rdata.read_rda(sys.argv[1])
with OUT.open("w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["species", "table", "yield_class", "age_yr", "H100_m"])
    for code, species in CODES.items():
        df = d["et"][code]["tafel"]
        for _, r in df.sort_values(["Ekl", "Alter"]).iterrows():
            w.writerow([species, code, int(r["Ekl"]), int(r["Alter"]), f"{float(r['H100']):.1f}"])
print(f"wrote {OUT}")
