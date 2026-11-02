#!/usr/bin/env bash
# Build a stripped copy of the repo for one fresh-context role, so "fresh" means fresh: the brief,
# the identity cards, the simulator survey, spec.md as background, and the code, with the
# project's history (ADRs, experiment notes, plans, STATUS, devlog, reviews, the fit targets and
# gallery, the agent instructions and skills) removed. The ledger folder is shared by symlink, so
# every role writes to the one notes.md. The native binary and the Python env are shared too.
#
#   bash docs/experiments/code/2026-11-01-fresh-look-beech/sandbox.sh <role> [<repo>] [<dest>]
#   → <dest>/<role>  (default /home/claude/sandbox/<role>)
set -euo pipefail
role=${1:?role}
repo=${2:-$(cd "$(dirname "$0")/../../../.." && pwd)}
dest=${3:-/home/claude/sandbox}/$role
ledger=docs/experiments/code/2026-11-01-fresh-look-beech

rm -rf "$dest"
mkdir -p "$dest"
# The code and its build config, without node_modules, runs, dist or the git history.
(cd "$repo" && tar -c --exclude=./node_modules --exclude=./runs --exclude=./dist --exclude=./dist-garden \
  --exclude=./.git --exclude=./rust/target --exclude=./src/wasm/pkg --exclude=./analysis/.venv .) | tar -x -C "$dest"

# History out.
rm -rf "$dest/docs/decisions" "$dest/docs/experiments" "$dest/docs/plans" "$dest/docs/reviews" \
  "$dest/docs/background" "$dest/docs/STATUS.md" "$dest/docs/devlog.md" "$dest/docs/ROADMAP.md" \
  "$dest/docs/research/2026-10-27-literature-review.md" "$dest/docs/research/2026-10-28-species-traits.md" \
  "$dest/CLAUDE.md" "$dest/AGENTS.md" "$dest/.claude" "$dest/analysis/fit" "$dest/README.md" \
  "$dest/analysis/experiments" "$dest/tests/golden.json"
# flora.ts carries the calibration story in its comments; the fitted patches are the data.
sed -i '1,/^import/{/^import/!d}' "$dest/src/core/flora.ts" 2>/dev/null || true

# The ledger folder: shared, so proposals land in one notes.md; the baseline and brief with it.
mkdir -p "$dest/docs/experiments/code"
ln -s "$repo/$ledger" "$dest/$ledger"
# Shared build products and env.
mkdir -p "$dest/rust/target/release" "$dest/runs"
ln -s "$repo/rust/target/release/treesim" "$dest/rust/target/release/treesim"
ln -s "$repo/analysis/.venv" "$dest/analysis/.venv"
ln -s "$repo/node_modules" "$dest/node_modules"
[ -d "$repo/src/wasm/pkg" ] && ln -s "$repo/src/wasm/pkg" "$dest/src/wasm/pkg"
ln -s "$repo/runs/fresh-look" "$dest/runs/fresh-look"

cat > "$dest/START-HERE.md" <<EOF
# $role

Read, in this order: $ledger/task.md, $ledger/notes.md, $ledger/review-checklist.md,
$ledger/species-identity-beech.md (then -models.md and -table.md), docs/research/2026-11-01-simulators.md,
and docs/spec.md as background. Then the code: rust/core/src (the model), src/core (params, species, presets),
src/web/render (the picture). This copy has no project history on purpose. Write only to your own section of
$ledger/notes.md and to runs/fresh-look/<your-name>-*/ for prototypes; edit code only under this copy.
EOF
echo "$dest"
