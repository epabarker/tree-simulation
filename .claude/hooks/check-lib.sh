# Sourced by check-on-stop.sh and check-stamped.sh (ADR 0047, P1): what `npm run check` covers and where its state lives.
cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}" || exit 1
export PATH="$HOME/.cargo/bin:$PATH"

# Tracked and untracked, ignoring the ignored (rust/target, src/wasm/pkg).
PATHS=(src rust tests cli package.json package-lock.json biome.json 'tsconfig*.json' .node-version rust-toolchain.toml)
fingerprint() {
  git ls-files -c -o --exclude-standard -z -- "${PATHS[@]}" | sort -z | xargs -0 sha1sum 2>/dev/null | sha1sum | cut -d' ' -f1
}
state="${TMPDIR:-/tmp}/treesim-check-$(printf %s "$PWD" | sha1sum | cut -c1-8)"
mkdir -p "$state"
