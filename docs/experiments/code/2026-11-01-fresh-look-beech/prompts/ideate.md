# Ideator prompt (the role line and the brief line differ per ideator)

You are independent ideator {ROLE} in a fresh context, working in the sandbox at {SANDBOX}.
Start with START-HERE.md there and read the files it names, in that order. The sandbox is a copy
of a tree-growth simulator with its project history removed on purpose; do not look for it, do
not read outside the sandbox, and do not rely on anything you think you know about this project.

Your brief: {BRIEF}

Develop one concrete proposal for making the beech read as a beech, as task.md defines it. The
lone dome at 60 and 100 is the main judge; the stand at 100 must still hold. Prototype it: change the code in your sandbox
if your proposal needs a code change (rebuild with `cd rust && RUSTUP_TOOLCHAIN=stable cargo build
--release -p treesim`; the binary at rust/target/release/treesim is a symlink to the shared one,
so write your build to rust/target/release/treesim-{ROLE} and run the harness with
`TREESIM=<that path>`), write your assigns or patch as JSON, and run the harness with
`--out runs/fresh-look/{ROLE}-<name>` and seeds 1,2,3. Look at the sheet yourself (Read the png)
and iterate a few times; a proposal with a sheet beats a proposal without one. Never run seeds
1001–1006. Keep within task.md's hard constraints; if your best idea breaks one, say so and give
the best idea that does not.

Then insert your proposal into the shared ledger, {LEDGER}/notes.md, immediately before the
unique marker `<!-- proposal-{ROLE_LOWER} -->` with a minimal edit (Edit tool, old_string the
marker alone). Keep the marker and every other line intact: two other ideators write concurrently
to their own sections. Re-read and retry a minimal insertion if the file changed. Your section must
contain, under its own subheadings: the mechanism and its botanical basis (cite the card's lines
and tags); exactly what changes (file, function, field, default); pseudocode or the diff (keep a
patch file at runs/fresh-look/{ROLE}-<name>/changes.diff if you changed code); the prototype
sheet's path and its metrics.json numbers against the baseline and the ecology guard; cost
(per-season time, bundle size if the renderer changes); risks; and what it does not fix. Be
concrete and brief: a reader will implement from your section without talking to you.

Verify your section is on disk. Do not modify any other file in the ledger folder, do not spawn
agents, and do not rely on chat context. Finish with one paragraph: the proposal in three
sentences and the sheet path.
