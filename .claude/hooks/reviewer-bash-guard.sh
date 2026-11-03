#!/usr/bin/env bash
# PreToolUse guard for the spec-reviewer sub-agent (ADR 0047, run 2): Bash may only read and run tests.
# Best-effort: the docs call hook filters best-effort and do not say a hook deny survives auto mode,
# so the reviewer also ends with `git status --short` (detector). Exit 2 blocks the call (stderr is the reason).
set -u
cmd=$(jq -r '.tool_input.command // empty')
deny() { echo "reviewer-bash-guard: blocked ($1). Allowed: git diff/status/log/show, npm run test, npx vitest run, cargo test, node cli/run.ts --out /tmp/review-*, grep/ls/cat/head/tail/wc." >&2; exit 2; }
[ -n "$cmd" ] || exit 0
case "$cmd" in *'>'*|*'<'*|*'|'*|*'`'*|*'$('*|*$'\n'*|*'--output'*|*' -u'*|*'--update'*) deny "redirect, pipe, substitution or a writing flag";; esac
IFS=$'&;' read -ra parts <<<"${cmd//&&/;}"
for p in "${parts[@]}"; do
  p=$(echo "$p" | sed 's/^ *//; s/ *$//'); [ -z "$p" ] && continue
  case "$p" in
    'export PATH="$HOME/.cargo/bin:$PATH"'|'git diff'*|'git status'*|'git log'*|'git show'*) ;;
    'npm run test'|'npx vitest run'*|'cargo test'*|'cd rust'|'cd '"${CLAUDE_PROJECT_DIR:-.}"|'cd '"${CLAUDE_PROJECT_DIR:-.}"/rust) ;;
    'node cli/run.ts '*'--out /tmp/review-'*) ;;
    grep\ *|ls|ls\ *|cat\ *|head\ *|tail\ *|wc\ *) ;;
    *) deny "$p";;
  esac
done
exit 0
