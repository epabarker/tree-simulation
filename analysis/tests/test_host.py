"""treesim/host.py: scratch root, default workers and available memory per platform (the X1 is Linux, the Mac Darwin)."""

import os
import sys

import pytest

from treesim import host

VM_STAT = """Mach Virtual Memory Statistics: (page size of 16384 bytes)
Pages free:                                5000.
Pages active:                            400000.
Pages inactive:                           20000.
Pages speculative:                         1000.
Pages throttled:                              0.
"""


def test_parse_vm_stat_sums_free_inactive_speculative():
    assert host.parse_vm_stat(VM_STAT) == pytest.approx((5000 + 20000 + 1000) * 16384 / 1e6)


def test_scratch_root_prefers_dev_shm(monkeypatch):
    monkeypatch.setattr(os.path, "isdir", lambda p: p == "/dev/shm")
    assert host.scratch_root() == "/dev/shm"


def test_scratch_root_falls_back_to_the_temp_directory(monkeypatch):
    monkeypatch.setattr(os.path, "isdir", lambda p: False)
    monkeypatch.setattr(host.tempfile, "gettempdir", lambda: "/tmp/x")
    assert host.scratch_root() == "/tmp/x"


def test_workers_env_wins(monkeypatch):
    monkeypatch.setenv("TREESIM_WORKERS", "3")
    assert host.workers_default() == 3


def test_workers_defaults_by_platform(monkeypatch):
    monkeypatch.delenv("TREESIM_WORKERS", raising=False)
    monkeypatch.setattr(sys, "platform", "darwin")
    assert host.workers_default() == 8
    monkeypatch.setattr(sys, "platform", "linux")
    monkeypatch.setattr(os, "cpu_count", lambda: 20)
    assert host.workers_default() == 12
    monkeypatch.setattr(os, "cpu_count", lambda: 4)
    assert host.workers_default() == 4


def test_mem_available_on_this_host_is_positive():
    assert host.mem_available_mb() > 0
