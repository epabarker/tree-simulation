# Principles: multi-agent harnesses for Claude Code

_Living doc. First version 2026-11-02, derived from the literature review in the "multi-agent harness" chat (sources listed at the end). Each principle is tagged with evidence strength: **[S]** strong (controlled benchmark or primary vendor docs), **[M]** moderate (preprint, vendor internal eval, consistent practitioner reports), **[A]** anecdotal._

**Decisions so far**
- 2026-11-02: Main model **Opus**, advisor **Fable**, reviewer sub-agents on **Fable**, searcher on **Haiku**. Rationale: the evidence favours a stronger single writer over scaffolding a weaker one; tiering is kept for *finding* (Haiku) and for decision points (Fable advisor). Sonnet-main is the cheaper alternative to A/B against (3g).

## 0. The one-line version

One writer, short contexts, deterministic gates, state on disk, and a few narrow read-only helpers. Add agents only when work is parallel and read-heavy, when one context would otherwise overflow, or when the base model is weak. On sequential reasoning, more agents cost more and usually do worse.

## 1. Principles

### P1. Verification is deterministic, and it outranks any agent. [S]
- Every repo's CLAUDE.md lists the exact check commands. The model is asked for evidence (command + output), not "tests pass".
- Rules with zero exceptions live in hooks, deny rules or CI, not in prose. CLAUDE.md is advisory; hooks are enforced.
- A reviewer may **flag**; only an executed check may **overturn** working code. (GVS5H's and memdoor's reported failure: a confident reviewer invented a counterexample and the team overwrote a correct solution. Huang et al. 2024: self-correction without external feedback often degrades.)

### P2. One writer; parallelise reads, serialise writes. [S]
- A single main session makes all edits. Parallel agents never touch the same file.
- Kim et al. (Google/MIT): +81% on decomposable read-heavy tasks, −39% to −70% on sequential planning; independent agents amplify errors 17× vs 4× with a central orchestrator. Tran & Kiela: at equal token budgets, single agents match or beat multi-agent.
- Cognition (2026): multi-agent works "when writes stay single-threaded and the extra agents contribute intelligence rather than actions".

### P3. Sub-agents are a fix for context rot, not a smarter architecture. [S]
- All models degrade as context grows (Chroma 2025; "Lost in the Middle"). A sub-agent earns its tokens when it keeps noise (search output, logs, a 25k-token spec) out of the main window and returns a condensed result.
- Test: if you would have read the sub-agent's output anyway, it saved nothing.
- `/clear` between tasks. Keep CLAUDE.md under ~100 lines; path-scoped `.claude/rules/` and skills for the rest; disable unused MCP servers (their schemas cost context every turn).

### P4. State lives in files, not transcripts (the file-ledger pattern). [M]
- GVS5H (arXiv 2608.26480): fresh context per task; shared `plan.md` / `notes.md` / solution; notes **rewritten as a curated whole, not appended**; hard size caps (4k / 8k chars); a no-progress stop; a non-LLM verifier. Qwen3.8-27B went 66.8 → 92.4 pass@1 on LiveCodeBench Hard at ~3× output tokens. No equal-token control, no component ablation, gains shrink with model strength, some configs regress.
- Same idea in Anthropic's context-engineering guidance (NOTES.md, compaction, clean sub-agents), the Claude Code best-practices "SPEC.md then fresh session", and the Ralph Wiggum loop.
- Per project: a capped PLAN (question, definition of done, decisions), a capped STATUS/NOTES that is rewritten, a decision log (ADRs), and one canonical artefact.

### P5. Tier models by risk, not by habit. [M]
- A stronger single writer beats scaffolding a weaker one (GVS5H: a single frontier call, 90.4, is within a few points of the whole scaffold on a smaller model). So the main model is the strongest you can afford for the task class: **Opus** for implementation, spec-heavy and statistical work; Sonnet is the cost alternative for routine refactors (measure, don't assume).
- **Fable as advisor.** Decision points (plan commits, recurring errors, sign-off) are where the data-science benchmarks say models fail, so that is where the strongest judgement goes. The advisor is model-driven (cannot be forced or capped) and re-reads the whole transcript uncached at the advisor's rates each call, so short contexts matter doubly. `/advisor off` for doc-only or single-file tasks. Opus main accepts Fable or Opus 5+ as advisor; Fable main accepts only Fable.
- **Fable on reviewer sub-agents.** Short-lived, read-only, small context: cheap in absolute terms, and the sharpest eye where it counts.
- **Haiku for finding** (grep, file lookup, spec-section retrieval). Never for **judging** (test interpretation, method choice, review).
- Agent teams: ~7× tokens; off by default; leave off for routine work.

### P6. Fan out only for independent, read-only, or separate-output work. [S principle / M specifics]
Good: multi-repo or doc search; literature/API lookups; pre-specified robustness or parameter sweeps where each agent writes its **own** output file; two independent fresh-context attempts at a hard problem judged by a numeric/test oracle.
Bad: parallel writers on shared files; routing every search through a sub-agent; persona teams; reviewers that rewrite.

### P7. A clean-context reviewer, narrow mandate, no write access. [M]
- Starts from a fresh context (`omitClaudeMd: true`, given only the diff + the governing spec/plan section).
- Reports only correctness / spec-divergence / statistical-validity issues; skips style ("a reviewer asked to find problems will always find something" — Claude Code docs).
- Any claimed counterexample must be demonstrated by running code, with command and output.

### P8. For data science, aim review at method choice, not code execution. [S]
- Agents mostly produce code that runs; they fail at estimator choice, identification, applicability of tests, honest uncertainty (BLADE <13% coverage of expert decisions; StatQA "applicability errors"; CauSciBench ~49% mean relative error; P-Bench "subtle inferential errors despite correctly executed analyses").
- Write estimand, DAG/identification strategy and planned sensitivity analyses into PLAN.md **before** code. The reviewer checks the diff against that file.
- Data assertions as tests: row counts after joins, no duplicate IDs, NA rates, known published totals, balance tables.

### P9. Protect sensitive data deterministically. [S mechanism]
`permissions.deny` on raw/patient-level paths and `.env`; `/sandbox`; agents work on synthetic or aggregated fixtures; the real-data run is a script you execute.

### P10. Measure your own harness. [M]
`/usage` weekly (attributes spend to sub-agents, skills, MCP); `ccusage` for history; `maxTurns` on sub-agents; `--max-budget-usd` on headless runs. Where a project is deterministic, A/B harness changes against bit-identical outputs.

## 2. Anti-patterns (practitioner consensus + measured)
Big persona teams · parallel writers · every search via sub-agent · long ALL-CAPS CLAUDE.md · reviewers allowed to edit · agent teams for routine work · unbounded loops without test backpressure · delegating test *interpretation* to a small model (a lossy summary between evidence and reasoner).

## 3. Worked setup: `epabarker/tree-simulation`

**Already in place (keep):** AGENTS.md; STATUS.md ≤40 lines, rewritten not appended (= P4 ledger); devlog + ADRs; `/wrap-up`, `/implement-principle`, `/run-experiment` as fresh-context checklists; `npm run check` + golden hashes + `bench --compare` (= P1 gate, stronger than GVS5H's); allow-list permissions.

**Add:**

**3a. Stop hook — enforce the check (P1).** `.claude/settings.json`:
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && npm run check >/tmp/check.log 2>&1 || { tail -40 /tmp/check.log >&2; exit 2; }"
          }
        ]
      }
    ]
  }
}
```
Exit 2 blocks the stop and feeds stderr back; Claude Code caps consecutive blocks. Also fixes the "Node 22 fails goldens" note in STATUS by failing loudly instead of relying on memory. If `check` is too slow for every stop, run `npm run test` here and the full check in `/wrap-up`.

**3b. Spec-grounded reviewer (P7).** `.claude/agents/spec-reviewer.md`:
```markdown
---
name: spec-reviewer
description: Read-only review of the current diff against docs/spec.md and the ADRs. Use after implementing or changing a principle, before wrap-up.
tools: Read, Grep, Glob, Bash
model: fable
omitClaudeMd: true
---
You review a diff of the tree simulation against its design. You have no write access.
1. Run `git diff` (and `git diff --staged`). Identify the principle(s) touched (C*/R*/O*).
2. Read ONLY the matching § of docs/spec.md and any ADR in docs/decisions/ that names it.
3. Report only: (a) behaviour that contradicts the spec § or an ADR; (b) violations of the AGENTS.md invariants (parent-before-child, rng purposes, staging, pure core); (c) correctness bugs. Skip style and naming.
4. Any claimed bug or counterexample must be demonstrated: run `npm run test` or a `node cli/run.ts` case and quote the command and output. Undemonstrated concerns go in a separate "unverified" list.
5. Output ≤ 30 lines: verdict (no divergences / divergences found), then items with file:line and spec § refs.
```
If `model: fable` is refused on the account, fall back to `model: inherit` (= Opus). CLAUDE.md line: "After any principle change, run the spec-reviewer sub-agent. Act on demonstrated items; treat unverified ones as questions for the user. Never change passing code on an undemonstrated claim."

**3c. Haiku spec searcher (P3, P5).** `.claude/agents/Explore.md` (overrides the built-in Explore, which otherwise runs on the main model):
```markdown
---
name: Explore
description: Fast read-only lookup in this repo — find the spec §, ADR, file or test relevant to a question and return the paths plus short excerpts. Use before reading docs/spec.md directly.
tools: Read, Grep, Glob
model: haiku
---
Find, don't judge. Return: file path, line range, and ≤15-line excerpt per hit, max 6 hits. For docs/spec.md return only the sections asked about. No recommendations.
```
CLAUDE.md line: "docs/spec.md is ~25k tokens. Never read it whole; ask Explore for the § you need."

**3d. Parallel experiments (P6).** In `/run-experiment`, after `run_many`: for sweeps with ≥3 conditions or ≥2 questions, spawn one sub-agent per condition/question with `tools: Read, Bash` and `maxTurns`, each writing `docs/experiments/figures/<note>-<condition>-*.png` and `runs/<experiment>/findings-<condition>.md` (≤20 lines, numbers only). The main session reads the findings files, writes the single experiment note, and updates STATUS. Workers never edit docs/ or src/.

**3e. Two attempts, one judge (P6).** For an open calibration/realism problem (e.g. crown base ≈7 cells low): write the target metrics into a short PLAN block in STATUS, run two fresh sessions (or two `isolation: worktree` sub-agents, after committing — worktrees branch from the default branch) and pick by `metrics.csv` against the targets, not by reading the code.

**3f. Model tiering.** Opus main + Fable advisor (`/model opus`, `/advisor fable`, saved to user settings; or `claude --model opus --advisor fable` for a one-off). CLAUDE.md: "Consult the advisor before committing to an implementation approach for a principle, when the same golden/test fails twice, and before `/wrap-up`." `/advisor off` for doc-only or single-file tasks. On some plans Fable needs a one-time usage-credits consent via `/model fable` before it will save as advisor.

**3g. Measure it (P10).** Because goldens must stay bit-identical for behaviour-neutral changes, a harness change can be A/B'd: same task with and without 3b/3c, and Opus+Fable vs Sonnet+Opus; compare `/usage` tokens, wall-clock, advisor call count and whether `check` went green first time. Record results in this doc.

**Don't add:** the five-role planner/ideator/solver/manager/repair loop for principle implementation; agent teams; Haiku for test interpretation.

## 4. Worked setup: R / data-science work (Mayden, care-pathway report, attendance model)

- `analysis/PLAN.md` (≤60 lines): question, estimand, DAG / identification, primary model, sensitivity analyses, definition of done. Draft in claude.ai by interview, implement in a fresh Claude Code session.
- `analysis/NOTES.md` (≤150 lines, rewritten): decision log.
- CLAUDE.md: exact commands (`Rscript -e 'testthat::test_local()'`, `lintr`, render command, DB `EXPLAIN` / dry-run), plus "Read PLAN.md and NOTES.md at start; rewrite NOTES.md at end."
- `method-reviewer` sub-agent (same shape as 3b, `model: fable`): checks the diff against PLAN.md for estimator choice, identification, leakage, join errors, uncertainty; counterexamples must be run.
- Data assertions as tests (P8); `permissions.deny` on raw extracts (P9); synthetic fixtures for agents.
- Fan-out: multiverse / specification-curve checks, one sub-agent per spec writing `results/spec_NN.rds`; aggregation in the main session.

## 5. Open questions / to test
- Does 3b catch real spec divergences on this codebase, or only noise? (Log hits vs. false alarms for a month.)
- Token delta of 3c vs. reading spec § directly in the main session.
- Opus+Fable vs Sonnet+Opus on the same principle implementation: first-time-green rate, advisor calls, `/usage`.
- Whether frontier models show the R-vs-Python gap measured on small models (Zhao & Fard 2024). Nothing measured it.
- Claude Code frontmatter keys (`omitClaudeMd`, `isolation`, `maxTurns`, `model: fable`) and the `--advisor` flag are experimental and version-gated; re-check against code.claude.com/docs when something doesn't take.

## 6. Key sources
- Kim et al., *Towards a Science of Scaling Agent Systems*, arXiv 2512.08296; Google Research blog.
- Tran & Kiela (Stanford, 2026), arXiv 2604.02460.
- Cemri et al., *Why Do Multi-Agent LLM Systems Fail?* (MAST), arXiv 2503.13657, NeurIPS 2025.
- Gao … Lee, *GVS5H: Zero-Shot Self-Orchestration with Ledger-Based Control*, arXiv 2608.26480 (full text read); memdoor team-solve reproduction (github.com/guregodevo/memdoor).
- Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet*, ICLR 2024.
- Xia et al., *Agentless*, FSE 2025.
- Chroma, *Context Rot* (2025); Liu et al., *Lost in the Middle*.
- Anthropic: *How we built our multi-agent research system*; *Effective context engineering for AI agents*; Claude Code docs — best-practices, sub-agents, advisor, agent-teams, costs.
- Cognition: *Don't Build Multi-Agents* (2025) → *Multi-Agents: What's Actually Working* (2026).
- Huntley, *Ralph Wiggum* loop (2025). Cherny, X thread 2 Jan 2026 on verification loops.
- Data science: DSBench (ICLR 2025), DA-Code, StatQA (NeurIPS 2024), QRData, BLADE, P-Bench/Fisher-R1 (arXiv 2608.07437), CauSciBench (ICML 2026), CausalDS (arXiv 2607.08093), Zhao & Fard arXiv 2410.07793.
- FrugalGPT (2023); RouteLLM.
- Viral tiering post: x.com/xsmryze/status/2116659187317186583 — verified against docs; adopt ~half (see P5, 3c, 3f).
