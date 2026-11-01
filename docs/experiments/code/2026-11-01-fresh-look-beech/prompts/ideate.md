# Ideator prompt (the role line and the brief line differ per ideator)

You are independent ideator {ROLE} in a fresh context, working in the sandbox at {SANDBOX}.
Start with START-HERE.md there and read the files it names, in that order. The sandbox is a copy
of a tree-growth simulator with its project history removed on purpose; do not look for it, do
not read outside the sandbox (the ledger folder inside it is a link, and the only shared place),
and do not rely on anything you think you know about this project.

Your brief: {BRIEF}

Develop one concrete proposal for making the beech read as a beech, as task.md defines it. The
lone dome at 60 and 100 is the main judge; the stand at 100 must still hold. Prototype it:

- A code change goes in your sandbox only. Rebuild with
  `cd {SANDBOX}/rust && RUSTUP_TOOLCHAIN=stable cargo build --release -p treesim`
  (about 15 s); the binary is {SANDBOX}/rust/target/release/treesim, yours alone.
- Parameter values, including any new field your Rust reads, go in a JSON file as dotted assigns
  (`{"r2.levels.1.setPoint": 28, "r2.myNewField": 0.3}`) or a nested `--patch`; the harness merges
  them over the species' patch and the Rust reads unknown fields as its own optional ones (see how
  rust/core/src/params.rs reads `curve`, `relay`, `pendulous`). You do not need to touch presets.json
  or the TypeScript for a prototype; say in your proposal where the field would live.
- Run the harness from the sandbox:
  `cd {SANDBOX} && TREESIM={SANDBOX}/rust/target/release/treesim analysis/.venv/bin/python {LEDGER}/render.py --species beech --assign my.json --seeds 1,2,3 --out runs/fresh-look/{ROLE_LOWER}-<name> --label "..."`
  (about a minute). Look at the sheet yourself (Read the png) and iterate a few times; a proposal
  with a sheet beats one without. runs/fresh-look is shared with the other roles: use your prefix.
- A renderer-only proposal (src/web/render) cannot be rendered by this harness; prototype what
  you can (a mock sheet drawn from the metamers is fine) and be precise about the code.
- Never run seeds 1001–1006. Keep within task.md's hard constraints; if your best idea breaks one,
  say so and give the best idea that does not.

Then insert your proposal into the shared ledger, {LEDGER}/notes.md, immediately before the
unique marker `<!-- proposal-{ROLE_LOWER} -->` with a minimal edit (Edit tool, old_string the
marker alone, new_string your section followed by the marker). Keep the marker and every other
line intact: two other ideators write concurrently to their own sections. Re-read and retry a
minimal insertion if the file changed. Your section must contain, under its own subheadings: the
mechanism and its botanical basis (cite the card's lines and tags); exactly what changes (file,
function, field, default); pseudocode or the diff (save `git diff` of your sandbox to
runs/fresh-look/{ROLE_LOWER}-<name>/changes.diff if you changed code; the sandbox is not a git
repository, so use `diff -ru` against {REPO} for the files you changed); the prototype sheet's
path and its metrics.json numbers against the baseline and the ecology guard; cost (per-season
time, bundle size if the renderer changes); risks; and what it does not fix. Be concrete and
brief: a reader will implement from your section without talking to you.

Verify your section is on disk. Do not modify any other file in the ledger folder, do not spawn
agents, and do not rely on chat context. Finish with one paragraph: the proposal in three
sentences and the sheet path.
