"""The host's differences, in one place (the X1 is Linux, the MacBook is Darwin): where RAM-backed scratch lives, how
many evaluators to run, and how much memory is free. Everything else in the fit scripts is portable.

- `scratch_root()`: /dev/shm where it exists (Linux's tmpfs), else the temp directory (macOS has no tmpfs; the SSD does).
- `workers_default()`: `TREESIM_WORKERS` if set; else min(12, cores) on Linux; 8 on Darwin (4 P + 6 E cores on the
  M5 test: 8 workers match 10–12 in throughput, and each evaluation is faster, 2026-11-04 probe).
- `mem_available_mb()`: /proc/meminfo's MemAvailable on Linux; on Darwin vm_stat's free + inactive + speculative pages.

The shell scripts' twin is analysis/experiments/host.sh (`treesim_workers`): keep the two defaults equal.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
import tempfile

LINUX_CAP = 12
DARWIN_WORKERS = 8


def scratch_root() -> str:
    return "/dev/shm" if os.path.isdir("/dev/shm") else tempfile.gettempdir()


def workers_default() -> int:
    env = os.environ.get("TREESIM_WORKERS")
    if env:
        return max(1, int(env))
    if sys.platform == "darwin":
        return DARWIN_WORKERS
    return min(LINUX_CAP, os.cpu_count() or 4)


def parse_vm_stat(text: str) -> float:
    """Available memory in MB from `vm_stat`'s output: free + inactive + speculative pages (what macOS can hand out
    without swapping; purgeable and file-backed pages are ignored, so this is a floor)."""
    size = int(re.search(r"page size of (\d+) bytes", text).group(1))
    pages = 0
    for label in ("Pages free", "Pages inactive", "Pages speculative"):
        m = re.search(rf"^{label}:\s+(\d+)\.", text, re.MULTILINE)
        pages += int(m.group(1)) if m else 0
    return pages * size / 1e6


def mem_available_mb() -> float:
    if sys.platform == "darwin":
        return parse_vm_stat(subprocess.run(["vm_stat"], capture_output=True, text=True, check=True).stdout)
    with open("/proc/meminfo") as f:
        mem = {line.split(":")[0]: int(line.split()[1]) for line in f}
    return mem["MemAvailable"] / 1e3
