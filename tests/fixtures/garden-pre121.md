# Frozen pre-#121 garden checkpoint

`garden-pre121-66-1-s6.bin.gz` was written before #121 (the 0062/0063 garden flip) by the native
build of `spec/111-feature-playbook` **46f3cf4**, from that commit's own `forestParams(66, 1)`
(the one planted row, `sizeBlind` mortality, no `o4.suppressionSignal`):

    treesim --replay <46f3cf4's forestParams(66, 1)> --seasons 6 --checkpoint-at 6

The sources were exported with `git archive 46f3cf4 rust src/core rust-toolchain.toml` and built
with `cargo build --release -p treesim` (#122, 2026-11-12).

- Gzipped bytes: 43,326; uncompressed: 99,280
- Season: 6
- State hash at 6: `37377bcf`; the same build grown from scratch to 16: `083d0cb6`
- SHA-256 (gzipped): `8ed6b7b7903427f8c5f6e57c4b022a8fcc668e8fd3d1064a2f1aef605fadcb16`

Retain these bytes. `tests/checkpoint-pre121.test.ts` requires it to load at HEAD and grow on to
`083d0cb6`.
