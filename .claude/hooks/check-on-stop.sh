#!/usr/bin/env bash
# Stop hook (ADR 0047, P1): when code changed since the last green run, run the stamped check and block the stop on
# failure, feeding the log's tail back to Claude. Exit 0 lets Claude stop; exit 2 blocks it and stderr is Claude's reason
# (code.claude.com/docs/en/hooks). It runs on every stop, so an unchanged tree must cost milliseconds.
# The suite itself runs in check-stamped.sh, under the lock: if a check is already running (a human's, Claude's) this
# hook waits for it and reuses its result, never a second suite.
set -u
here=$(cd "$(dirname "$0")" && pwd)
. "$here/check-lib.sh"
fp=$(fingerprint)

# Unchanged since the last green run: nothing to do (docs-only turns, questions, the turn after a commit).
[ "$(cat "$state/green" 2>/dev/null)" = "$fp" ] && exit 0
# First run on a clean tree: HEAD was checked before it was committed, and by CI. Trust it once.
if [ ! -f "$state/green" ] && [ -z "$(git status --porcelain -- "${PATHS[@]}")" ]; then
  echo "$fp" >"$state/green"
  exit 0
fi
# The hook already blocked on this same failing state and Claude changed no code (it is asking the user): let it stop,
# and say so. `systemMessage` is the documented JSON field for a warning to the user; the docs do not say whether a Stop
# hook's one reaches Remote Control or the desktop app (2026-11-02, doc-lookup), so the final report names the log too.
if [ "$(cat "$state/red-shown" 2>/dev/null)" = "$fp" ]; then
  jq -n --arg m "Stop hook: npm run check is STILL RED and this stop was let through (the hook already blocked once on this same failing state). Log: $state/check.log" '{systemMessage: $m}'
  exit 0
fi

block() {
  echo "$fp" >"$state/red-shown"
  {
    echo "Stop hook: 'npm run check' failed (full log: $state/check.log). Fix it before stopping, or tell the user why you cannot. Last 40 lines:"
    tail -40 "$state/check.log"
  } >&2
  exit 2
}
# A failed run on this very tree already exists (someone ran check:stamp and it went red): feed its log back, do not re-run.
[ "$(cat "$state/red" 2>/dev/null)" = "$fp" ] && block

# Wait at most 600 s for a lock, then a cold suite of up to 600 s: both fit the 1200 s hook timeout in settings.json.
CHECK_LOCK_WAIT=600 "$here/check-stamped.sh" >/dev/null 2>&1
case $? in
  0) exit 0 ;;
  1) block ;;
  *) jq -n --arg m "Stop hook: could not run or wait for npm run check; this stop was let through UNCHECKED. Log: $state/check.log" '{systemMessage: $m}'
     exit 0 ;;
esac
