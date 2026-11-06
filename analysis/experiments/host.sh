# Sourced by the sweep and fit wrappers: the host's differences in one place (twin of analysis/treesim/host.py; keep
# the defaults equal). `treesim_workers`: TREESIM_WORKERS if set; else min(12, cores) on Linux and 8 on Darwin (the
# M5's 4 P + 6 E cores, 2026-11-04 probe: 8 workers match 10-12 in throughput).
treesim_workers() {
  if [[ -n "${TREESIM_WORKERS:-}" ]]; then
    echo "$TREESIM_WORKERS"
  elif [[ "$(uname)" == Darwin ]]; then
    echo 8
  else
    local n
    n=$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)
    echo $((n < 12 ? n : 12))
  fi
}
