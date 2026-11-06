#!/usr/bin/env bash
# The stamped check (ADR 0047, P1; docs/background/harness-principles.md). `npm run check:stamp` is the one way to run
# the suite, for Claude and for humans, in the FOREGROUND; the Stop hook calls this script too. One lock, so one suite at
# a time: a caller that finds the lock held waits, then reuses that run's result when the tree is the same. A green run
# writes $state/green (the fingerprint), which the hook reads, so a manual green run counts.
# Exit 0 green, 1 red, 3 gave up waiting (CHECK_LOCK_WAIT seconds, default 840). Quiet: a line on green, the log's tail
# on red; CHECK_VERBOSE=1 streams the suite. CHECK_CMD replaces `npm run check` (to test the lock; use another TMPDIR).
set -u
. "$(cd "$(dirname "$0")" && pwd)/check-lib.sh"

exec 9>"$state/lock"
waited=0
if ! flock -n 9; then
  waited=1
  echo "check: another run holds the lock; waiting for it (up to ${CHECK_LOCK_WAIT:-840} s)" >&2
  flock -w "${CHECK_LOCK_WAIT:-840}" 9 || { echo "check: gave up waiting for the lock" >&2; exit 3; }
fi

fp=$(fingerprint)
if [ "$(cat "$state/green" 2>/dev/null)" = "$fp" ]; then
  echo "check: green already for this tree (stamp $fp)"
  exit 0
fi
# We waited and the run we waited for failed on this very tree: reuse its verdict and log instead of a second suite.
if [ "$waited" = 1 ] && [ "$(cat "$state/red" 2>/dev/null)" = "$fp" ]; then
  { echo "check: the run we waited for FAILED on this tree (log $state/check.log). Last 40 lines:"; tail -40 "$state/check.log"; } >&2
  exit 1
fi

rm -f "$state/red" # a run killed midway leaves no stale verdict
# 9>&- keeps vitest, cargo and vite children from inheriting the lock and holding it after this script exits.
if [ "${CHECK_VERBOSE:-}" = 1 ]; then
  bash -c "${CHECK_CMD:-npm run check}" 9>&- 2>&1 | tee "$state/check.log"
  rc=${PIPESTATUS[0]}
else
  bash -c "${CHECK_CMD:-npm run check}" 9>&- >"$state/check.log" 2>&1
  rc=$?
fi
if [ "$rc" -eq 0 ]; then
  echo "$fp" >"$state/green"
  echo "check: green (stamped $fp)"
  exit 0
fi
echo "$fp" >"$state/red"
{ echo "check: FAILED (log $state/check.log). Last 40 lines:"; tail -40 "$state/check.log"; } >&2
exit 1
