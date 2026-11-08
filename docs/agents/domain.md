# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, if it exists.
- **`docs/decisions/`**: the ADRs. Read the ones that touch the area you're about to work in.

If `GLOSSARY.md` doesn't exist, **proceed silently**. Don't flag its absence; don't suggest creating it upfront. The `/domain-modeling` skill creates it lazily when terms actually get resolved.

Until a glossary exists, the vocabulary is `docs/spec.md`: principles C1–C6, R1–R6, O1–O4, and the spec symbols that param names follow (`lambda`, `alpha`, `qMax`, …). It is ≈25k tokens: never read it whole; ask the `Explore` sub-agent for the § you need.

## Where ADRs live

This repo keeps ADRs in `docs/decisions/`, not `docs/adr/`. Number a new one `NNNN-slug.md` after the highest existing number, in the format of `docs/decisions/0000-template.md` (Status, Date, Spec; Context, Decision, Consequences). Never create `docs/adr/`, even where a skill's own instructions say to.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md` (or the spec, until the glossary exists). Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Spec and ADR conflicts

If your output would contradict `docs/spec.md` or an ADR, stop and ask the user before acting on it (AGENTS.md, "Ask before diverging"). Name what it contradicts:

> _Contradicts ADR 0024 (Rust core), but worth reopening because…_

Once the user agrees, record the decision as a new ADR in `docs/decisions/`.
