"""Fetches Wytham Woods oak QSMs (Calders et al. 2022, Zenodo 7307956, CC BY 4.0) without
downloading the 39 GB archive: zipfile reads the remote zips through HTTP range requests, so only
their tables of contents and the chosen members are transferred.

- default: the two oaks with the largest crowns, trees 6 (24.3 m, 243 m² crown) and 195 (23.5 m,
  201 m²), as used by the structure-vs-drawing note (≈ 90 MB);
- `--all-oaks`: every live Quercus robur in the plot (35 trees, ≈ 575 MB), one QSM each (the
  smallest of its ten TreeQSM iterations), chosen from trees_summary.csv in the record's
  analysis_and_figures.zip.

usage: python fetch_wytham.py <out-dir> [--all-oaks]
"""

import csv
import io
import os
import re
import sys
import urllib.request
import zipfile

RECORD = "https://zenodo.org/api/records/7307956/files"
QSM_ZIP = f"{RECORD}/DATA_QSM_opt.zip/content"
ANALYSIS_ZIP = f"{RECORD}/analysis_and_figures.zip/content"
DEFAULT = [
    "DATA_QSM_opt/wytham_winter_6-0.2-0.22-3-0.055-0.0605-2-5-1-3.mat",
    "DATA_QSM_opt/wytham_winter_195-0.2-0.22-4-0.045-0.0495-3-5-1-2.mat",
]


class HttpFile(io.RawIOBase):
    """A seekable read-only file over HTTP range requests."""

    def __init__(self, url):
        self.url, self.pos, self.fetched = url, 0, 0
        with urllib.request.urlopen(urllib.request.Request(url, method="HEAD")) as r:
            self.size = int(r.headers["Content-Length"])

    def seekable(self):
        return True

    def readable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.size - self.pos
        if n == 0 or self.pos >= self.size:
            return b""
        end = min(self.size, self.pos + n) - 1
        req = urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{end}"})
        with urllib.request.urlopen(req) as r:
            if r.status != 206:
                raise RuntimeError(f"the server ignored the range request ({r.status})")
            data = r.read()
        self.pos += len(data)
        self.fetched += len(data)
        return data

    def readinto(self, b):
        d = self.read(len(b))
        b[: len(d)] = d
        return len(d)


def remote_zip(url):
    f = HttpFile(url)
    return f, zipfile.ZipFile(io.BufferedReader(f, buffer_size=1 << 20))


def all_oaks(qsm):
    """One member per live oak: the smallest of its QSM iterations."""
    _, analysis = remote_zip(ANALYSIS_ZIP)
    rows = csv.DictReader(io.TextIOWrapper(analysis.open("analysis_and_figures/trees_summary.csv")))
    oaks = {r["TLS_ID"] for r in rows if r["species"] == "QUERRO" and r["Dead"] != "Y"}
    best = {}
    for info in qsm.infolist():
        m = re.match(r"DATA_QSM_opt/wytham_winter_([0-9a-z]+)-", info.filename)
        if m and m.group(1) in oaks:
            t = m.group(1)
            if t not in best or info.file_size < best[t].file_size:
                best[t] = info
    return [best[t].filename for t in sorted(best, key=str)]


if __name__ == "__main__":
    out = sys.argv[1]
    f, qsm = remote_zip(QSM_ZIP)
    members = all_oaks(qsm) if "--all-oaks" in sys.argv else DEFAULT
    for name in members:
        dest = f"{out}/{name.split('/')[-1]}"
        if os.path.exists(dest):
            continue
        data = qsm.read(name)
        with open(dest, "wb") as fh:
            fh.write(data)
        print(name, f"{len(data) / 1e6:.1f} MB", flush=True)
    print(f"{len(members)} trees; transferred {f.fetched / 1e6:.1f} MB")
