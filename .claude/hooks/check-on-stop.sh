#!/usr/bin/env bash
# Stop hook (ADR 0047, P1): when code changed since the last green run, run `npm run check`
# and block the stop on failure, feeding the log's tail back to Claude.
# Exit 0 lets Claude stop. Exit 2 blocks it; stderr is the message Claude receives
# (code.claude.com/docs/en/hooks). .claude/settings.json runs this on every stop, so it must be
# cheap when nothing changed: it fingerprints the files `npm run check` covers.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
export PATH="$HOME/.cargo/bin:$PATH"

# What `npm run check` covers. Tracked and untracked, ignoring the ignored (rust/target, src/wasm/pkg).
PATHS=(src rust tests cli package.json package-lock.json biome.json 'tsconfig*.json' .node-version rust-toolchain.toml)
fp=$(git ls-files -c -o --exclude-standard -z -- "${PATHS[@]}" | sort -z | xargs -0 sha1sum 2>/dev/null | sha1sum | cut -d' ' -f1)
state="${TMPDIR:-/tmp}/treesim-check-$(printf %s "$PWD" | sha1sum | cut -c1-8)"
mkdir -p "$state"

# Unchanged since the last green run: nothing to do (docs-only turns, questions, the turn after a commit).
[ -f "$state/green" ] && [ "$(cat "$state/green")" = "$fp" ] && exit 0
# First run on a clean tree: HEAD was checked before it was committed, and by CI. Trust it once.
if [ ! -f "$state/green" ] && [ -z "$(git status --porcelain -- "${PATHS[@]}")" ]; then
  echo "$fp" >"$state/green"
  exit 0
fi
# The same failing state a second time: Claude saw the log and changed no code (it is asking the user). Let it stop.
[ -f "$state/red" ] && [ "$(cat "$state/red")" = "$fp" ] && exit 0

if npm run check >"$state/check.log" 2>&1; then
  echo "$fp" >"$state/green"
  rm -f "$state/red"
  exit 0
fi
echo "$fp" >"$state/red"
{
  echo "Stop hook: 'npm run check' failed (full log: $state/check.log). Fix it before stopping, or tell the user why you cannot. Last 40 lines:"
  tail -40 "$state/check.log"
} >&2
exit 2
