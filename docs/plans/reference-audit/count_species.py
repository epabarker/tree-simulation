"""Count the garden species in the reference datasets' metadata files (the reference-fidelity
plan, 2026-11-03, step 2). Reads only label and summary tables under data/reference/ (git-ignored;
each audit file names the URL it came from), never point clouds. Prints one markdown table per
dataset: count, DBH range (cm) and height range (m) per species, split by the column that says
how the tree was scanned or where it grew, where the file has one.

    uv run --project analysis python docs/plans/reference-audit/count_species.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import polars as pl

ROOT = Path(__file__).resolve().parents[3] / "data" / "reference"

# The garden's species, plus the document's proxies and the two conifers (plan §e).
SPECIES = {
    "Betula pendula": "birch",
    "Betula pubescens": "birch",
    "Quercus robur": "oak",
    "Quercus petraea": "oak",
    "Fagus sylvatica": "beech",
    "Carpinus betulus": "hornbeam",
    "Acer campestre": "field maple",
    "Salix caprea": "goat willow",
    "Sorbus aucuparia": "rowan",
    "Ilex aquifolium": "holly",
    "Acer pseudoplatanus": "sycamore",
    "Pinus sylvestris": "Scots pine",
    "Abies alba": "silver fir",
}

# Wytham's census codes (trees_summary.csv); the first four letters of genus and species.
WYTHAM_CODES = {
    "BETUPE": "Betula pendula",
    "BETUPU": "Betula pubescens",
    "QUERRO": "Quercus robur",
    "FAGUSY": "Fagus sylvatica",
    "CARPBE": "Carpinus betulus",
    "ACERCA": "Acer campestre",
    "SALICA": "Salix caprea",
    "SORBAU": "Sorbus aucuparia",
    "ILEXAQ": "Ilex aquifolium",
    "ACERPS": "Acer pseudoplatanus",
}

# Demol's site codes: species in the code (Demol et al. 2022, the record's description).
DEMOL_SITES = {"FSYL": "Fagus sylvatica", "PSYLA": "Pinus sylvestris", "PSYLB": "Pinus sylvestris"}


def summary(df: pl.DataFrame, by: list[str]) -> pl.DataFrame:
    """Count and ranges per species (and `by`), over rows whose species is a garden one."""
    df = df.filter(pl.col("species").is_in(list(SPECIES)))
    aggs = [pl.len().alias("n")]
    for col, unit in (("dbh_cm", "DBH cm"), ("height_m", "H m")):
        if col in df.columns:
            aggs.append(
                pl.format(
                    "{}–{}",
                    pl.col(col).min().round(1),
                    pl.col(col).max().round(1),
                ).alias(unit)
            )
    return (
        df.group_by(["species", *by])
        .agg(aggs)
        .with_columns(pl.col("species").replace_strict(SPECIES).alias("garden"))
        .sort(["garden", "species", *by])
    )


def show(name: str, df: pl.DataFrame) -> None:
    print(f"\n## {name}\n")
    cols = df.columns
    print("| " + " | ".join(cols) + " |")
    print("|" + "---|" * len(cols))
    for row in df.iter_rows():
        print("| " + " | ".join("" if v is None else str(v) for v in row) + " |")


def wytham() -> None:
    p = ROOT / "wytham" / "analysis_and_figures" / "trees_summary.csv"
    df = pl.read_csv(p, infer_schema_length=0)
    all_codes = df.group_by("species").len().sort("len", descending=True)
    print("\n## Wytham: every census code (trees_summary.csv, 835 trees linked to the census)\n")
    print(", ".join(f"{s} {n}" for s, n in all_codes.iter_rows()))
    df = df.select(
        pl.col("species").replace_strict(WYTHAM_CODES, default=None).alias("species"),
        (pl.col("DBH_TLS_[m]").cast(pl.Float64) * 100).alias("dbh_cm"),
        pl.col("Hgt_pts_[m]").cast(pl.Float64).alias("height_m"),
    )
    show("Wytham (forest, TLS, leaf-off; QSMs for all)", summary(df, []))


def for_species20k() -> None:
    p = ROOT / "for-species20k" / "tree_metadata_dev.csv"
    df = pl.read_csv(p).select(
        pl.col("species").str.replace("_", " ").alias("species"),
        pl.col("dataset").alias("source"),
        pl.col("data_type").alias("platform"),
        pl.col("tree_H").alias("height_m"),
    )
    show("FOR-species20K dev split (point clouds only, no QSMs)", summary(df, ["platform"]))


def demol() -> None:
    p = ROOT / "demol" / "Destructive_and_qsm_data_DEMOL.csv"
    df = pl.read_csv(p, null_values="NA").select(
        pl.col("site_name").replace_strict(DEMOL_SITES, default=None).alias("species"),
        pl.col("DBH").alias("dbh_cm"),
        pl.col("TH_felled").alias("height_m"),
    )
    show("Demol (forest, TLS + QSMs + harvest)", summary(df, []))


def tallo() -> None:
    p = ROOT / "tallo" / "Tallo.csv"
    df = pl.read_csv(p, null_values=["NA", ""], infer_schema_length=100_000)
    # Europe by a box (Tallo has no country column): 35–72° N, 25° W–45° E.
    df = df.with_columns(
        ((pl.col("latitude").is_between(35, 72)) & (pl.col("longitude").is_between(-25, 45))).alias(
            "europe"
        ),
        (pl.col("latitude").is_between(49.8, 61) & pl.col("longitude").is_between(-8.7, 2)).alias(
            "britain"
        ),
    )
    df = df.filter(pl.col("species").is_in(list(SPECIES)))
    out = (
        df.group_by("species")
        .agg(
            pl.len().alias("n"),
            pl.col("europe").sum().alias("Europe"),
            pl.col("britain").sum().alias("GB box"),
            (pl.col("height_m").is_not_null() & (pl.col("height_outlier") == "N")).sum().alias("H ok"),
            (pl.col("crown_radius_m").is_not_null() & (pl.col("crown_radius_outlier") == "N"))
            .sum()
            .alias("CR ok"),
            pl.format(
                "{}–{}",
                pl.col("stem_diameter_cm").min().round(0),
                pl.col("stem_diameter_cm").max().round(0),
            ).alias("DBH cm"),
            pl.col("reference_id").n_unique().alias("sources"),
        )
        .with_columns(pl.col("species").replace_strict(SPECIES).alias("garden"))
        .sort(["garden", "species"])
    )
    show("Tallo (allometry; no regime column)", out)


def biodiv() -> None:
    p = ROOT / "biodiv" / "labels.csv"
    df = pl.read_csv(p, infer_schema_length=0).select(
        # Oak and birch are labelled by genus ("Quercus_spec"): counted under the garden's names.
        pl.col("species")
        .str.replace("_", " ")
        .replace({"Quercus spec": "Quercus petraea", "Betula spec": "Betula pendula"})
        .alias("species"),
        (pl.col("QSMsuccess") == "True").alias("qsm"),
        (pl.col("validQSM") == "True").alias("valid"),
        pl.col("dTLS").cast(pl.Float64, strict=False).alias("dbh_cm"),
        pl.col("hTLS").cast(pl.Float64, strict=False).alias("height_m"),
    )
    out = summary(df, []).join(
        df.group_by("species").agg(pl.col("qsm").sum().alias("QSM ok"), pl.col("valid").sum().alias("valid QSM")),
        on="species",
    )
    show("BioDiv-3DTrees (forest, leaf-off; oak and birch are genus labels)", out)


def treeml() -> None:
    p = ROOT / "treeml" / "231025_TreeML_Dataset.csv"
    cols = ["botanical_name", "DBH_m_", "treeHeight_m_", "crownDiameterMax_m_"]
    df = pl.read_csv(p, infer_schema_length=0, columns=cols).select(
        pl.col("botanical_name").replace({"Quercus species": "Quercus robur"}).alias("species"),
        (pl.col("DBH_m_").cast(pl.Float64, strict=False) * 100).alias("dbh_raw"),
        pl.col("treeHeight_m_").cast(pl.Float64, strict=False).alias("height_m"),
        pl.col("crownDiameterMax_m_").cast(pl.Float64, strict=False).alias("crown"),
    )
    # 101 of 3,755 trees read DBH > 150 cm (to 5,194): a segmentation or unit error, so not ranged.
    out = summary(df, []).join(
        df.group_by("species").agg(
            (pl.col("dbh_raw") > 150).sum().alias("DBH > 150 cm"),
            pl.col("crown").median().round(1).alias("crown Ø median"),
            pl.col("crown").max().round(1).alias("crown Ø max"),
        ),
        on="species",
    )
    show("TreeML-Data (urban street trees, leaf-off; oak is 'Quercus species')", out)


def weiser() -> None:
    import json

    rows = []
    for f in sorted((ROOT / "weiser" / "geojsons").rglob("*.geojson")):
        p = json.loads(f.read_text())["properties"]
        ms = p["measurements"]
        dbh = [m["DBH_cm"] for m in ms if m.get("DBH_cm")]
        h = [m["height_m"] for m in ms if m.get("height_m")]
        rows.append({
            "species": p["species"],
            "tls": any(m.get("source") == "TLS" for m in ms),
            "dbh_cm": min(dbh) if dbh else None,
            "height_m": max(h) if h else None,
        })
    df = pl.DataFrame(rows)
    out = summary(df, []).join(df.group_by("species").agg(pl.col("tls").sum().alias("with TLS")), on="species")
    show("Weiser / pytreedb (forest; TLS leaf-on; no QSMs)", out)


if __name__ == "__main__":
    which = sys.argv[1:] or ["wytham", "for_species20k", "demol", "tallo", "biodiv", "treeml", "weiser"]
    for w in which:
        globals()[w]()
