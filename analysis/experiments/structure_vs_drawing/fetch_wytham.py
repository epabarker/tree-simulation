"""Structure vs drawing: fetches two Wytham Woods oak QSMs (Calders et al. 2022, Zenodo 7307956,
CC BY 4.0) without downloading the 39 GB archive: zipfile reads the remote zip through HTTP range
requests, so only its table of contents (≈ 1.4 MB) and the two members (≈ 90 MB) are transferred.

The trees are the two Quercus robur with the largest crowns in the plot (trees_summary.csv in the
record's analysis_and_figures.zip): tree 6 (24.3 m, 243 m² crown) and tree 195 (23.5 m, 201 m²).

usage: python fetch_wytham.py <out-dir>
"""

import io
import sys
import urllib.request
import zipfile

URL = "https://zenodo.org/api/records/7307956/files/DATA_QSM_opt.zip/content"
MEMBERS = [
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


if __name__ == "__main__":
    out = sys.argv[1]
    f = HttpFile(URL)
    z = zipfile.ZipFile(io.BufferedReader(f, buffer_size=1 << 20))
    for name in MEMBERS:
        data = z.read(name)
        with open(f"{out}/{name.split('/')[-1]}", "wb") as fh:
            fh.write(data)
        print(name, f"{len(data) / 1e6:.1f} MB")
    print(f"transferred {f.fetched / 1e6:.1f} MB")
