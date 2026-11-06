"""Phase 1's gate a (docs/plans/2026-11-03-reference-fidelity.md §j): DBH and height recomputed from each real QSM's
cylinders (cylinders.dbh, cylinders.height) against the publishers' own QSM-derived values, the same kind of
comparison on every dataset; ≥ 95% of trees within 5%, per dataset.

| dataset | DBH gated against | height gated against | ceilings (reported, never gated) |
|---|---|---|---|
| Demol (2.3) | `qsm_DBHqsm`, the published CSV | the .mat's `treedata.TreeHeight` | field DBH, felled height, `PC_treeheight` |
| Wytham (2.0) | the .mat's `TreeData[9]` | the .mat's `TreeData[3]` | `DBH_QSM_avg`, `DBH_pts`, `Hgt_pts` |
| BioDiv (2.4.1) | the model's `treedata.DBHqsm` | the model's `treedata.TreeHeight` | `dTLS`, `hTLS` (points, README) |
| TreeML (optcsv) | none: three files prove the reader | none | `DBH_m_`, `treeHeight_m_` |

Felled and point-cloud heights are ceilings: Demol's own point-cloud height is within 5% of felled height for only
91% of its 65 trees, and its QSM DBH within 5% of field DBH for 68% (§j, decision 1).

The internal checks (cylinders.internal_checks: height positive, the trunk's base the lowest point, parent before
child) are reported on every dataset (the 1b brief, R4) and gate height only on TreeML, which publishes none
(§j, B). Under the median-size model BioDiv's HEW21_GD_117 carried a 3.4 m cylinder of radius 2.5 cm diving from 2.1 m above its base to 1.1 m below it; under
TreeQSM's optimum (R1) no tree of any dataset has a cylinder starting or ending below its base.

Wytham's DBH is gated against the model read, as Demol's and BioDiv's are (symmetric: decision 1). tls_summary's
`DBH_QSM_avg` is the mean over the tree's 10 models, and one model of a big oak can sit far from it (tree 81:
between-model SD 23 cm on a mean of 86 cm): reported beside it as `mean10`, with that SD, never gated.

    uv run --project analysis python -I -m treesim.qsm_gate      # the table, as markdown
"""

from __future__ import annotations

import csv
import math
import re
from pathlib import Path

from treesim import cylinders as cy
from treesim import qsm
from treesim.fetch import DATA

WITHIN = 0.05
PASS = 0.95


def _err(ours: float, published: float) -> float:
    return ours / published - 1.0 if published and math.isfinite(published) else float("nan")


def _row(source: str, tree: str, species: str, q: qsm.QSM, dbh_gate: float, height_gate: float, **ceilings) -> dict:
    c = q.cylinders
    nxt = cy.continuation(c)
    dbh, height = cy.dbh(c, nxt), cy.height(c)
    checks = cy.internal_checks(c)
    return {
        "source": source, "tree": tree, "species": species, "cylinders": len(c),
        "dropped": q.meta["dropped"], "dropped_volume": q.meta["dropped_volume"], "model": q.meta["model"],
        "dbh": dbh, "dbh_gate": dbh_gate, "dbh_err": _err(dbh, dbh_gate),
        "dbh_own": q.meta["dbh_qsm"], "dbh_own_err": _err(dbh, q.meta["dbh_qsm"]),
        "height": height, "height_gate": height_gate, "height_err": _err(height, height_gate),
        **{k: v for k, v in ceilings.items()},
        **{f"check_{k}": bool(v) for k, v in checks.items()},
    }


def _csv(path: Path) -> list[dict]:
    with path.open() as f:
        return list(csv.DictReader(f))


def _num(s: str) -> float:
    try:
        return float(s)
    except (TypeError, ValueError):
        return float("nan")


def demol_rows() -> list[dict]:
    table = {r["tree_name"]: r for r in _csv(DATA / "demol" / "Destructive_and_qsm_data_DEMOL.csv")}
    out = []
    for path in sorted((DATA / "demol" / "qsm").glob("*.mat")):
        site, n = re.match(r"([A-Z]+)(\d+)$", path.stem).groups()
        r = table.get(f"{site}-{int(n):02d}")
        if r is None:  # FEXC12 has a QSM but no row in the published table: nothing to gate it against
            continue
        q = qsm.read(path)
        dbh = _num(r["DBH"]) / 100.0
        out.append(_row("demol", r["tree_name"], site, q, _num(r["qsm_DBHqsm"]), q.meta["height_qsm"],
                        field_dbh=dbh, felled=_num(r["TH_felled"]), pc_height=_num(r["PC_treeheight"]),
                        ceiling_dbh_err=_err(q.meta["dbh_qsm"], dbh),
                        ceiling_height_err=_err(_num(r["PC_treeheight"]), _num(r["TH_felled"]))))
    return out


def wytham_rows() -> list[dict]:
    tls = {r["Tree_ID"]: r for r in _csv(DATA / "wytham" / "analysis_and_figures" / "tls_summary.csv")}
    species = {r["TLS_ID"]: r["species"] for r in _csv(DATA / "wytham" / "analysis_and_figures" / "trees_summary.csv")}
    out = []
    for path in sorted((DATA / "wytham" / "qsm").glob("wytham_winter_*.mat")):
        tree = re.match(r"wytham_winter_([^-]+)-", path.name).group(1)
        r = tls[tree]
        q = qsm.read(path)
        row = _row("wytham", tree, species.get(tree, ""), q, q.meta["dbh_qsm"], q.meta["height_qsm"],
                   mean10_dbh=_num(r["DBH_QSM_avg_[m]"]), mean10_sd=_num(r["DBH_QSM_sd[m]"]),
                   pts_dbh=_num(r["DBH_pts_[m]"]), pts_height=_num(r["Hgt_pts_[m]"]),
                   ceiling_height_err=_err(q.meta["height_qsm"], _num(r["Hgt_pts_[m]"])))
        row["mean10_dbh_err"] = _err(row["dbh"], row["mean10_dbh"])
        out.append(row)
    return out


def biodiv_rows() -> list[dict]:
    labels = {r["treeID"]: r for r in _csv(DATA / "biodiv" / "labels.csv")}
    out = []
    for path in sorted((DATA / "biodiv" / "qsm-all").rglob("*_all.mat")):
        tree = path.name.removesuffix("_all.mat")
        r = labels[tree]
        q = qsm.read(path)
        dtls = _num(r["dTLS"]) / 100.0
        out.append(_row("biodiv", tree, r["species"], q, q.meta["dbh_qsm"], q.meta["height_qsm"],
                        plot=r["ep"], gap=r["gap"], pts_dbh=dtls, pts_height=_num(r["hTLS"]),
                        ceiling_dbh_err=_err(q.meta["dbh_qsm"], dtls),
                        ceiling_height_err=_err(q.meta["height_qsm"], _num(r["hTLS"]))))
    return out


def treeml_rows() -> list[dict]:
    paths = sorted((DATA / "treeml" / "optcsv").glob("OptQSM_*.csv"))
    if not paths:
        return []
    wanted = {p.stem.removeprefix("OptQSM_") for p in paths}
    table = {}
    with (DATA / "treeml" / "231025_TreeML_Dataset.csv").open() as f:
        for r in csv.DictReader(f):
            if r["treeID"] in wanted:
                table[r["treeID"]] = r
    out = []
    for path in paths:
        tree = path.stem.removeprefix("OptQSM_")
        r = table.get(tree, {})
        out.append(_row("treeml", tree, r.get("botanical_name", ""), qsm.read(path), float("nan"), float("nan"),
                        pts_dbh=_num(r.get("DBH_m_")), pts_height=_num(r.get("treeHeight_m_"))))
    return out


SOURCES = {"demol": demol_rows, "wytham": wytham_rows, "biodiv": biodiv_rows, "treeml": treeml_rows}


def within(rows: list[dict], key: str) -> float:
    """The share of trees with |key| ≤ WITHIN (NaN of none)."""
    errs = [r[key] for r in rows if math.isfinite(r[key])]
    return sum(abs(e) <= WITHIN for e in errs) / len(errs) if errs else float("nan")


def summary(rows_by_source: dict[str, list[dict]]) -> list[dict]:
    out = []
    for source, rows in rows_by_source.items():
        if not rows:
            continue
        out.append({
            "source": source, "trees": len(rows),
            "dbh": within(rows, "dbh_err"), "height": within(rows, "height_err"),
            "dbh_own": within(rows, "dbh_own_err"),
            "dbh_mean10": within(rows, "mean10_dbh_err") if "mean10_dbh_err" in rows[0] else float("nan"),
            "ceiling_dbh": within(rows, "ceiling_dbh_err") if "ceiling_dbh_err" in rows[0] else float("nan"),
            "ceiling_height": within(rows, "ceiling_height_err") if "ceiling_height_err" in rows[0] else float("nan"),
            "max_dbh_err": max((abs(r["dbh_err"]) for r in rows if math.isfinite(r["dbh_err"])), default=float("nan")),
            "max_height_err": max((abs(r["height_err"]) for r in rows if math.isfinite(r["height_err"])),
                                  default=float("nan")),
            "check_failures": [r["tree"] for r in rows if not all(v for k, v in r.items() if k.startswith("check_"))],
            "dropped_volume_max": max(r["dropped_volume"] for r in rows),
        })
    return out


def markdown(table: list[dict]) -> str:
    pct = lambda x: "–" if not math.isfinite(x) else f"{100 * x:.0f}%"  # noqa: E731
    lines = ["| dataset | trees | DBH ≤ 5% | H ≤ 5% | max DBH err | max H err | DBH vs 10-model mean | ceiling DBH "
             "| ceiling H | internal checks failed |", "|---|---|---|---|---|---|---|---|---|---|"]
    for s in table:
        lines.append(f"| {s['source']} | {s['trees']} | {pct(s['dbh'])} | {pct(s['height'])} | {pct(s['max_dbh_err'])} "
                     f"| {pct(s['max_height_err'])} | {pct(s['dbh_mean10'])} | {pct(s['ceiling_dbh'])} | {pct(s['ceiling_height'])} "
                     f"| {', '.join(s['check_failures']) or 'all pass'} |")
    return "\n".join(lines)


if __name__ == "__main__":
    print(markdown(summary({k: f() for k, f in SOURCES.items()})))
