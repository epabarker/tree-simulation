"""Fetch the reference QSMs phase 1 needs (docs/plans/2026-11-03-reference-fidelity.md §j), never whole
archives: Wytham's 39.5 GB zip and TreeML's 4.8 GB zip by HTTP range requests on their central directories,
BioDiv's 108 GB tarball by streaming its head (one zstd frame: no seeking), Demol's 16 MB zip whole.

Everything lands under data/reference/<source>/ (git-ignored), each source in its own directory. Every member
fetched is appended to the committed manifest (analysis/fit/sources/reference-manifest.csv) for
reproducibility and CC-BY attribution. Downloaded files are data: read them with `python -I`.

    uv run --project analysis python -I -m treesim.fetch wytham|demol|biodiv|treeml|all
"""

from __future__ import annotations

import csv
import re
import struct
import subprocess
import sys
import tarfile
import zlib
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "reference"
MANIFEST = ROOT / "analysis" / "fit" / "sources" / "reference-manifest.csv"
MANIFEST_COLUMNS = ["source", "tree", "member", "model", "bytes", "url", "licence", "citation"]

WYTHAM_URL = "https://zenodo.org/records/7307956/files/DATA_QSM_opt.zip?download=1"
WYTHAM_CITE = "Calders et al. 2022, Wytham Woods TLS, doi 10.5281/zenodo.7307956"
DEMOL_URL = "https://zenodo.org/records/4557401/files/optimal_QSMs.zip?download=1"
DEMOL_CITE = "Demol et al. 2021, doi 10.5281/zenodo.4557401"
BIODIV_URL = "https://data.goettingen-research-online.de/api/access/datafile/142308"
BIODIV_CITE = "Griese et al. 2025, BioDiv-3DTrees, doi 10.25625/8PB1IF"
TREEML_URL = "https://ndownloader.figshare.com/files/41991153"
TREEML_CITE = "Yazdi et al. 2024, TreeML-Data, doi 10.6084/m9.figshare.c.6788358.v1"

# The Wytham subset (§j): every oak; sycamores of DBH >= 10 cm, stratified by DBH (5% of a 4 cm stem is 2 mm).
WYTHAM_SYCAMORES = 40
WYTHAM_MIN_DBH = 0.10
BIODIV_BEECH = 100
BIODIV_MAX_MEMBERS = 400


def _curl(url: str, lo: int, hi: int) -> bytes:
    """Bytes [lo, hi] of `url` (an HTTP range request); retried, as the git practice asks of the network."""
    for attempt in range(4):
        out = subprocess.run(["curl", "-sfL", "-r", f"{lo}-{hi}", url], capture_output=True)
        if out.returncode == 0 and len(out.stdout) == hi - lo + 1:
            return out.stdout
        subprocess.run(["sleep", str(2 ** (attempt + 1))])
    raise OSError(f"range {lo}-{hi} of {url} failed")


def _size(url: str) -> int:
    """The size from a one-byte range GET's Content-Range (figshare's store refuses HEAD)."""
    head = subprocess.run(["curl", "-sfL", "-r", "0-0", "-D", "-", "-o", "/dev/null", url], capture_output=True, text=True)
    sizes = re.findall(r"(?im)^content-range:\s*bytes 0-0/(\d+)", head.stdout)
    if not sizes:
        raise OSError(f"no Content-Range for {url}")
    return int(sizes[-1])


@dataclass(frozen=True)
class Entry:
    name: str
    method: int
    csize: int
    usize: int
    offset: int


class RangeZip:
    """A remote zip (zip64 too) read by range requests: its central directory once (cached beside the data),
    then each member's local header and bytes."""

    def __init__(self, url: str, cache: Path):
        self.url = url
        if not cache.exists():
            size = _size(url)
            tail = _curl(url, size - 65536, size - 1)
            z64 = tail.rfind(b"PK\x06\x06")
            if z64 >= 0:
                cd_size, cd_offset = struct.unpack("<QQ", tail[z64 + 40 : z64 + 56])
            else:
                eocd = tail.rfind(b"PK\x05\x06")
                cd_size, cd_offset = struct.unpack("<II", tail[eocd + 12 : eocd + 20])
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_bytes(_curl(url, cd_offset, cd_offset + cd_size - 1))
        self.entries = {e.name: e for e in _central_directory(cache.read_bytes())}

    def read(self, name: str) -> bytes:
        e = self.entries[name]
        head = _curl(self.url, e.offset, e.offset + 29)
        n, m = struct.unpack("<HH", head[26:30])
        start = e.offset + 30 + n + m
        data = _curl(self.url, start, start + e.csize - 1) if e.csize else b""
        if e.method == 8:
            data = zlib.decompress(data, -15)
        elif e.method != 0:
            raise ValueError(f"{name}: compression method {e.method}")
        if len(data) != e.usize:
            raise OSError(f"{name}: {len(data)} bytes, expected {e.usize}")
        return data


def _central_directory(b: bytes) -> list[Entry]:
    out, i = [], 0
    while b[i : i + 4] == b"PK\x01\x02":
        method = struct.unpack("<H", b[i + 10 : i + 12])[0]
        csize, usize = struct.unpack("<II", b[i + 20 : i + 28])
        n, m, k = struct.unpack("<HHH", b[i + 28 : i + 34])
        offset = struct.unpack("<I", b[i + 42 : i + 46])[0]
        name = b[i + 46 : i + 46 + n].decode()
        extra = b[i + 46 + n : i + 46 + n + m]
        j = 0
        while j + 4 <= len(extra):
            hid, hl = struct.unpack("<HH", extra[j : j + 4])
            if hid == 1:  # zip64: the 0xffffffff fields, in this order
                vals = list(struct.unpack("<" + "Q" * (hl // 8), extra[j + 4 : j + 4 + hl // 8 * 8]))
                if usize == 0xFFFFFFFF:
                    usize = vals.pop(0)
                if csize == 0xFFFFFFFF:
                    csize = vals.pop(0)
                if offset == 0xFFFFFFFF:
                    offset = vals.pop(0)
            j += 4 + hl
        out.append(Entry(name, method, csize, usize, offset))
        i += 46 + n + m + k
    return out


def _manifest(rows: list[dict]) -> None:
    """Appends rows to the manifest, keeping one row per (source, member, model)."""
    old = []
    if MANIFEST.exists():
        with MANIFEST.open() as f:
            old = list(csv.DictReader(f))
    seen = {(r["source"], r["member"], str(r["model"])) for r in rows}
    keep = [r for r in old if (r["source"], r["member"], r["model"]) not in seen]
    with MANIFEST.open("w", newline="") as f:
        w = csv.DictWriter(f, MANIFEST_COLUMNS, lineterminator="\n")
        w.writeheader()
        for r in sorted(keep + rows, key=lambda r: (r["source"], r["member"], str(r["model"]))):
            w.writerow({k: r.get(k, "") for k in MANIFEST_COLUMNS})


def lower_median(items: list, key) -> object:
    """The lower median of `items` by `key` (ties by position): the deterministic "median-size model" rule
    (§j), never the smallest (that picks the coarsest reconstruction)."""
    ranked = sorted(range(len(items)), key=lambda i: (key(items[i]), i))
    return items[ranked[(len(items) - 1) // 2]]


WYTHAM_MEMBER = re.compile(r"^DATA_QSM_opt/wytham_winter_([^-]+)-.*-(\d+)\.mat$")


def wytham_members(z: RangeZip) -> dict[str, list[tuple[int, Entry]]]:
    """Tree id → [(model index, entry)] (ten models a tree; the trailing number of the name)."""
    trees: dict[str, list[tuple[int, Entry]]] = {}
    for e in z.entries.values():
        m = WYTHAM_MEMBER.match(e.name)
        if m:
            trees.setdefault(m.group(1), []).append((int(m.group(2)), e))
    return trees


def wytham_selection(summary: Path) -> list[tuple[str, str]]:
    """(tree id, species code): every oak, and WYTHAM_SYCAMORES sycamores of DBH >= WYTHAM_MIN_DBH, the trees at
    evenly spaced ranks of DBH."""
    with summary.open() as f:
        rows = [r for r in csv.DictReader(f) if r["DBH_QSM_avg_[m]"] not in ("", "NA")]
    oaks = sorted(r["TLS_ID"] for r in rows if r["species"] == "QUERRO")
    syc = sorted(
        (float(r["DBH_QSM_avg_[m]"]), r["TLS_ID"])
        for r in rows
        if r["species"] == "ACERPS" and float(r["DBH_QSM_avg_[m]"]) >= WYTHAM_MIN_DBH
    )
    n = len(syc)
    picks = sorted({round(k * (n - 1) / (WYTHAM_SYCAMORES - 1)) for k in range(WYTHAM_SYCAMORES)})
    return [(t, "QUERRO") for t in oaks] + [(syc[k][1], "ACERPS") for k in picks]


def fetch_wytham(trees: list[tuple[str, str]] | None = None, all_models: bool = False) -> None:
    """One model per tree (the median-size member of its ten), or all ten with `all_models` (the noise floor)."""
    dest = DATA / "wytham" / "qsm"
    dest.mkdir(parents=True, exist_ok=True)
    z = RangeZip(WYTHAM_URL, DATA / "wytham" / "qsm-central-directory.bin")
    members = wytham_members(z)
    summary = DATA / "wytham" / "analysis_and_figures" / "trees_summary.csv"
    rows = []
    for tree, species in trees or wytham_selection(summary):
        models = sorted(members[tree], key=lambda me: me[0])
        chosen = models if all_models else [lower_median(models, key=lambda me: me[1].usize)]
        for model, e in chosen:
            out = dest / Path(e.name).name
            if not out.exists():
                out.write_bytes(z.read(e.name))
            rows.append(
                {"source": "wytham", "tree": tree, "member": e.name, "model": model, "bytes": e.usize,
                 "url": WYTHAM_URL, "licence": "CC-BY-4.0", "citation": f"{WYTHAM_CITE} ({species})"}
            )
            print(f"wytham {tree} {species} model {model}: {e.usize / 1e6:.1f} MB", flush=True)
    _manifest(rows)


def fetch_demol() -> None:
    dest = DATA / "demol"
    zipped = dest / "optimal_QSMs.zip"
    if not zipped.exists():
        subprocess.run(["curl", "-sfL", "-o", str(zipped), DEMOL_URL], check=True)
    import zipfile

    with zipfile.ZipFile(zipped) as z:
        names = [n for n in z.namelist() if n.endswith(".mat") and "/" not in n]
        z.extractall(dest / "qsm", members=names)
    _manifest(
        [{"source": "demol", "tree": Path(n).stem, "member": n, "model": "", "bytes": (dest / "qsm" / n).stat().st_size,
          "url": DEMOL_URL, "licence": "CC-BY-4.0", "citation": DEMOL_CITE} for n in names]
    )


def biodiv_valid_beech(labels: Path) -> set[str]:
    with labels.open() as f:
        return {r["treeID"] for r in csv.DictReader(f) if r["species"] == "Fagus_sylvatica" and r["validQSM"] == "True"}


def fetch_biodiv(n: int = BIODIV_BEECH, max_members: int = BIODIV_MAX_MEMBERS) -> None:
    """The first `n` valid beech of QSM/all/ at the head of the stream: "Phase 1 only" (§j; never a source of
    tolerances or targets: the head of a tar is an archive's order, not a sample; phase 1's 53 span 19 plots, G and
    GD). Each tree's all.mat holds its 80 candidate models;
    qsm.read picks TreeQSM's default optimum (R1). The stream is cut once `n` are kept or `max_members` read."""
    dest = DATA / "biodiv" / "qsm-all"
    dest.mkdir(parents=True, exist_ok=True)
    beech = biodiv_valid_beech(DATA / "biodiv" / "labels.csv")
    curl = subprocess.Popen(["curl", "-sfL", BIODIV_URL], stdout=subprocess.PIPE)
    zstd = subprocess.Popen(["zstd", "-dc"], stdin=curl.stdout, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    kept, seen = 0, 0
    try:
        with tarfile.open(fileobj=zstd.stdout, mode="r|") as tar:
            for m in tar:
                if not (m.isfile() and m.name.startswith("QSM/all/") and m.name.endswith("_all.mat")):
                    continue
                seen += 1
                tree = Path(m.name).name.removesuffix("_all.mat")
                if tree in beech:
                    # Under a temporary name, renamed when whole: a reader never sees a partial file.
                    part = dest / ".partial"
                    tar.extract(m, part, filter="data")
                    final = dest / m.name
                    final.parent.mkdir(parents=True, exist_ok=True)
                    (part / m.name).rename(final)
                    kept += 1
                    print(f"biodiv {tree}: {m.size / 1e6:.1f} MB ({kept} of {n}, {seen} read)", flush=True)
                if kept >= n or seen >= max_members:
                    break
    finally:
        for p in (zstd, curl):
            p.kill()
            p.wait()
        record_biodiv()


def record_biodiv() -> None:
    """The manifest's BioDiv rows from the files on disk (a stream cut short still leaves a true record)."""
    from treesim import qsm  # qsm imports this module

    dest = DATA / "biodiv" / "qsm-all"
    _manifest(
        [{"source": "biodiv", "tree": f.name.removesuffix("_all.mat"), "member": str(f.relative_to(dest)),
          "model": f"optimum {qsm.read(f).meta['model'] + 1} of 80", "bytes": f.stat().st_size, "url": BIODIV_URL, "licence": "CC-BY-4.0",
          "citation": BIODIV_CITE} for f in sorted((dest / "QSM" / "all").glob("*_all.mat"))]
    )


TREEML_MEMBERS = 3


def fetch_treeml(names: list[str]) -> None:
    """Named optcsv members of Dataset_QSM.zip (three, to prove the reader)."""
    dest = DATA / "treeml" / "optcsv"
    dest.mkdir(parents=True, exist_ok=True)
    z = RangeZip(TREEML_URL, DATA / "treeml" / "qsm-central-directory.bin")
    rows = []
    for name in names:
        out = dest / Path(name).name
        if not out.exists():
            out.write_bytes(z.read(name))
        rows.append({"source": "treeml", "tree": Path(name).stem, "member": name, "model": "optcsv",
                     "bytes": z.entries[name].usize, "url": TREEML_URL, "licence": "CC0-1.0", "citation": TREEML_CITE})
    _manifest(rows)


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("demol", "all"):
        fetch_demol()
    if what in ("wytham", "all"):
        fetch_wytham()
    if what in ("biodiv", "all"):
        fetch_biodiv()
    if what == "biodiv-manifest":
        record_biodiv()
    if what == "treeml":
        fetch_treeml(sys.argv[2:])
