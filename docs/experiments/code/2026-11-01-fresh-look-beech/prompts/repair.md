# Repair prompt

You are the single repair worker in a fresh context, in the repository at {REPO} on the branch
`claude/fresh-look-beech`. Read {LEDGER}/task.md, {LEDGER}/notes.md (the Solver decision and the
Review, and the user's judgement appended under Review), AGENTS.md, and the code the solver
changed (`git log -3 --stat`). If the Review and the user's judgement name nothing to repair,
leave the code unchanged and record that under "Repair". Otherwise address the repair
instructions in order of the cue's weight, keeping to task.md's hard constraints and the ecology
guard; re-render with the harness to runs/fresh-look/repair-round1 (seeds 1,2,3), look at the
sheet, and iterate until the named cues are addressed or you can say why they cannot be within the
constraints. Run `npm run rust:check` and the tests you touched. Commit. Append a concise repair
explanation (what changed, the sheet path, the metrics, what is still open) under "Repair" in
notes.md before `<!-- repair -->`. Do not start another round, do not run seeds 1001–1006, do not
spawn agents.
