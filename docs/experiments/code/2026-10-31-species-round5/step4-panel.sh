#!/usr/bin/env bash
# Overnight step 4's lab panels: the picked [form] (ADR 0032), round "form" beside round 2, lone 60 and
# 100 and the closed stand at 100, against the lab on $1 (npm run dev); NODE_PATH holds puppeteer-core.
set -euo pipefail
cd "$(dirname "$0")/../../../.."
export PATH="$HOME/.cargo/bin:$PATH"
origin=${1:-http://localhost:5174/}
tag=${2:--form-adr32}   # the figures' suffix and runs/panel<tag>
uv run --project analysis python analysis/experiments/m27_gallery.py --form-patches runs/form --workers 4
node docs/experiments/code/2026-10-31-species-round4/panel-links.ts "$origin" form runs/panel$tag
node docs/experiments/code/2026-10-31-species-round4/panel-shots.mjs runs/panel$tag
uv run --project analysis python docs/experiments/code/2026-10-31-species-round4/panel-figure.py runs/panel$tag docs/experiments/figures $tag
echo "== done $(date +%T)"
