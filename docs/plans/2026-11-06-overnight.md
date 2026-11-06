# Overnight plan, 2026-11-06 (unattended, about 00:30–09:00)

_The user: "make a plan for an overnight, unattended session … you must either achieve the main goal, or get
really close. Be ambitious." The overseer (this session) orchestrates the agents and applies the gates below.
Nothing needs the user before morning._

## State (rewritten after every agent report; read this first after any compaction)
- **Closed (2026-11-06, morning):** the user merged #48 and #49 into `3d-port` (39eaaab), tagged `garden-v0.16.0` and merged the site's PR #8; 0.16.0 is live with the height commit. ADR 0055 accepted. The next box: [STATUS](../STATUS.md).
- **Phase:** done (05:00). The morning report is published; the RC is pushed as draft PR #49; the preview is redeployed.
- (started 00:15)
- **The user's approvals (00:12):**
  - push work branches plus one **draft** PR into `3d-port`;
  - **redeploy preview-3d with the RC**;
  - include A9's per-limb offset (ADR 0053 (b)) in the tuning;
  - keep the laptop awake (`systemd-inhibit` until about 09:30, plus the app's keep-awake).
- **Running (00:20):**
  - T: per-species targets, dome-ness, heights;
  - **R**: regularity tuning, worktree branch `r-regularity` from 5f7ae79, hard stop 04:15;
- **A (00:37):** crown shape, worktree branch `a-crown` from b783d73, hard stop 04:30.
- **Done:** A (branch `a-crown` = b783d73, no new core code; `a/results.md`, `a/sheet.png`).
  - **The lone flat cap is a size effect.** F0 is a dome to about 20 m and flat by 25 m (k < 0.8).
  - **F3** (`r2.dLambdaTrunk`) keeps D at 0.27–0.35 through 30 m, but reads as a tiered column. Its stand crowns
    are shallower (limb crown ratio 0.47 → 0.28), and it shifts the garden's composition (rowan 16 → 44%).
    **Not adopted in the RC**; it goes into the proposed ADR.
  - **Rejected:** geometry-only arching, skyExponent 0, raised limb λ, L_h 10.
  - **The next mechanism:** λ's fall by level, with level 2 (twigs) keeping λ.
- **Y2 (02:20):** a height fix that keeps the crown (milder L_h or R1's reproductive sink). Gate: height in
  band, metamers ≥ 0.6×, W/H in band, D ≥ 0.25. Hard stop 04:30.
- **Done:** Y (`y/results.md`). **Late height, not juvenile rate, was the problem.** The adopted height
  patches (G1; params only):

  | species | patch | height at 20 / 40 / 60 / 100 / 150 | today |
  |---|---|---|---|
  | hornbeam | `{"r1.Lh":10,"r2.dLambda":0.06}` | 11.6 / 15.1 / 17.9 / 20.6 / 23.8 m | … / 37.0 / 48.8 m |
  | rowan | `{"r1.Lh":8}` | 8.8 / 13.9 / 15.1 / 16.5 / 17.8 m | |
  | oak | `{"r1.Lh":15}` | 11.5 / 19.8 / 23.8 / 29.7 / 37.8 m | |

  - Garden cost of G1: canopy at 40 is 6% lower; metamers at 150 are 4% higher.
  - **WITHDRAWN at 02:20 (agent A, `a/sheet-Y.png`): L_h 10 collapses the lone hornbeam into a sparse pole**
    (3.7k metamers against 67k, W/H 0.36, D −0.34). The garden-wide check hid it. **Not in the RC.**
    Y2 is looking for a height fix that keeps the crown.
  - maxMetamersPerShoot 2 is for age-matching only (canopy at 40 is 16% lower, at 20 it is 29% lower).
  - A was asked to measure D for hornbeam with G1 (does a 22 m tree stay a dome?).
- **Done:** B0, the **G-forest baseline on the garden world** (`forestParams(160, seed)`, seeds 1–20, 300
  seasons, d2c4f53; `b0/baseline.json`).
  - **Pass counts of 20:**

    | check | pass |
    |---|---|
    | floor100 | 2 (median 0.109; τ 0.2 faces put it out of band by construction) |
    | H/D of planted survivors | 3 (median 39) |
    | crown base | 11 |
    | plateau | 11 |

    The H/D over all live trees is 20/20 (median 71).
  - Planted trees alive: 44% at 150, 31% at 300.
  - **Composition at 300:** hornbeam 0.43, beech 0.25, maple 0.16, holly 0.08, rowan 0.07, oak 0.01, birch
    and willow 0.
  - Metamers at 200: median 70.1k.
  - **The gate:** `python3 b0/evidence.py compare base.json new.json`, each check ≥ base − 2. One full run is
    about 50 min wall with 3 jobs.
  - **Patches go through evidence.py's dotted paths**, never treesim's `--species-patch`: that does a shallow
    merge and replaces whole sub-objects.
- **Done:** T (`t/targets-by-species.md`, `t/targets.json`, `t/heights.json`).
  - **Real lone trees are domes:** hornbeam D 0.55 (n 23, shape ratio 0.53), beech 0.38, oak 0.36.
  - **Real stand trees are flat:** D 0.08–0.2.
  - The simulated lone hornbeam is a dome at 17 m (D 0.41, season 30) and flattens only at 27–38 m. It
    reaches 49 m by season 150, against real lone trees ≤ 22 m.
  - **Hypothesis:** the flat cap is mainly overgrowth. A was told to score at matched height (D against H);
    Y's brief now covers mature height (`L_h` allowed), with its stop moved to 03:30.
  - **Lone height flags:** rowan 1.75×, oak 1.35×, hornbeam 49 m, willow, holly.
- **Done:** A14 (`a14/noise.md`).
  - **Usable, with noise bands:** spacingCV ±0.05, attachPerM, insertSD ±6°, elevSD ±5°.
  - **Weak:** earlyFork ±0.09, a check only.
  - **Noise-dominated:** curvPersist, which is dropped.
  - **Real BioDiv hornbeam stand (n 38):** spacingCV 0.40, attachPerM 1.79, insertSD 26.9°, elevSD 26.2°,
    earlyFork 0.30. R was told to use these.
- **Done:** J (`judge-sim/build_pairs.py`; gate1 failed, see Gates).
- **Done:** A12, draft PR #48 (`claude/garden-0.16.0` = ff4a406 + 63de6db + d2c4f53 devlog); check green.
  - **The memory "blocker" was a measuring artefact** (M, 00:50): tm.ts grew five worlds in one process, and
    WASM memory never shrinks.
    - One process per run at width 160 shows no change from ADR 0054: 120–199 MB at 0.15.0 and at f1d937c,
      seeds 1–6.
    - **The 200-cell plate alone at season 200:** 201 MB (seed 10), **232 MB (seed 12)**, 207 MB (seed 9).
    - PR #48's body is corrected and still a draft.
    - **For G-budget, the RC must confirm seed 12 with the specimen under 230 MB, or lower `PLATE_MAX` to
      about 180.**
- **The early I1 probe (01:50, the overseer):** worktree `scratchpad/i0/wt` at R's f6dda9d (native treesim built).
  It runs G-forest on R's best-so-far patch (`i0/patch-r-best0.json`: shootLengthSD 0.5, axisSD 50, betaSD 60,
  stochastic budBreak width 1) for all 8 broadleaves, seeds 1–20, 3 jobs. Out: `i0/ev-r-best0`, log
  `i0/ev-r-best0.log`.
- **The early I1 probe PASSED G-forest** (02:11). r-best0 on all 8 broadleaves, against the base:

  | check | r-best0 | base |
  |---|---|---|
  | floor | 2 | 2 |
  | planted H/D | 2 | 3 |
  | crown base | 10 | 11 |
  | plateau | 10 | 11 |
  | survival at 150 / 300 | 0.43 / 0.29 | 0.44 / 0.31 |
  | metamers | 1.04× | |

  - **Warning:** H/D over all live trees is 16/20 against 20/20 (B0's extra check, not in the gate).
  - **Composition:** beech 0.25 → 0.33, hornbeam 0.43 → 0.33.
  - R was asked to wrap up by 03:00.
- **Done:** R (branch `r-regularity` = f6dda9d, pushed; check green; `r/results.md`, `r/sheet.png`).
  - **The β rule:** `c1.betaSD`, purpose 17 (provisional), off by default.
  - **Setting 1:** `{"c1.shootLengthSD":0.5,"c4.axisSD":40,"c1.betaSD":50,"c1.budBreak":{"mode":"stochastic","width":1}}`.
    - Loss 5.1 / 4.8 (seeds 101–108 / held-out 109–116) against R0's 23.1, a 78–80% reduction.
    - All 4 usable descriptors in band, lone and stand.
    - Stand survival 32/32 and 30/32; metamers 0.88× / 0.98×.
  - **Setting 2:** betaSD 60, loss 4.5 / 5.0, survival 28/32.
  - **Margins:** lone attachPerM is the thinnest (1.56–1.61 against a band top of 1.63); curvPersist drifts to
    +0.25 (noise-dominated, not gated).
  - **The overseer's look** (`r/sheet.png`): R0 is a symmetric, even fan, lone and stand (a uniform zigzag
    umbrella canopy). Setting 1 is asymmetric, with varied crowns, gaps and irregular limbs, and **reads
    clearly more natural.**
- **G-forest on setting 1 FAILED** (02:55): planted H/D 0 against the base's 3. The other checks pass: floor 3,
  crown 13, plateau 12, all-tree H/D 18/20; metamers 1.05×.
  - **G\* = r-best0:** `{"c1.shootLengthSD":0.5,"c4.axisSD":50,"c1.betaSD":60,"c1.budBreak":{"mode":"stochastic","width":1}}`.
    It passes G-reg (4/4 lone and stand), G-forest (2/2/10/10 against 2/3/11/11) and G-budget (1.04×).
  - Its caveats: closed-hornbeam-stand survival 26/32; all-tree H/D 16/20.
  - RC told to switch to it.
- **RC stage 1 done (03:40).** Worktree `.claude/worktrees/agent-af97922d851c2fc19`, branch
  `claude/overnight-rc`, not pushed.
  - **Commits:**
    - 7cc78d3, merging r-regularity;
    - f2d6810, the G\* base for the 8 broadleaves via a `[broadleaf]` table in hand-overrides.toml plus
      m27_adopt (flora-fitted.ts: 16 lines);
    - 358effe, **`PLATE_MAX` 200 → 170**, because seed 10 needs 247 MB with the specimen at 200 cells, while
      at 170 the worst is 216 MB.
  - **Goldens 4 of 16:** mixedWood s15 c95b46b9 → 75a77cae; oakOpen s15 0877b79b → f51af727; beechOpen s40
    200f5a55 → 3588317e; beechWood s30 f8b1fe35 → 296aeb6e.
  - **The check is red only on 30 s vitest timeouts** (load 13–17); every one passes alone. It needs a quiet
    re-run.
  - The overseer wrote ADR 0055 (proposed) and copied the figure into the RC worktree.
- **Done:** S (`s/results.md`). The per-species patches, on the G\* base, each holding on fresh seeds 109–116:

  | species | patch | loss on fresh seeds | in band | caveats |
  |---|---|---|---|---|
  | beech | shootLengthSD 0.35, axisSD 50, betaSD 70, budBreak w 1 | 6.28 → 3.44 | 4/4 lone, 4/4 stand | stand survival 26/32 |
  | oak | shootLengthSD 0.3, axisSD 35, betaSD 40, budBreak w 1 | 9.71 → 3.20 | 4/4 lone, 3/4 stand | stand attachPerM 0.96 against ≥ 1.15 (no knob reaches it; the stand is 28 m against Wytham's 19.9 m); height 1.35× at 100 |
  | birch | = G\* | 1.84 | 4/4 lone | |

- **G-forest on the species patches PASSED** (03:54): floor 2/2, planted H/D 3/3, crown 13/11, plateau 11/11,
  metamers 0.93×, planted survival at 150 0.42/0.44. All-tree H/D 16/20 against 20 (the same warning).
  **Beech and oak overrides adopted.**
- **Done:** Y2 (`y2/results.md`, `y2/sheet.png`). **R1's reproductive sink is a height ceiling that keeps the
  crown** (L_h starves it). All params only:

  | species | patch | height | metamers | other |
  |---|---|---|---|---|
  | hornbeam | `{"r1.fRep":0.8,"r1.maturity":115,"r2.dLambda":0.0725}` | 29.1 m, flat from 100 (shipped 37/49) | 0.62× | W/H 0.65, D 0.34 on 5/5 |
  | rowan | `{"r1.fRep":0.8,"r1.maturity":85}` | 21.6 m | 0.84× | D 0.33 |
  | oak | `{"r1.fRep":0.8,"r1.maturity":130}` | 33.2 m | 1.05× | |

  - The overseer's look: the hornbeam patch is a compact, rounded crown, more like a real open-grown hornbeam
    than the shipped flat top.
  - Caveat: dLambda 0.0725 is fragile (the crown flips within ±0.01).
  - **G-forest on the species patches plus the height patches PASSED, at the margin** (04:09).

    | check | result | base | minimum |
    |---|---|---|---|
    | floor | 1 | 2 | 0 |
    | planted H/D | 1 | 3 | exactly the minimum |
    | crown base | 12 | 11 | |
    | plateau | 13 | 11 | |
    | metamers | 0.96× | | |
    | survival at 150 | 0.42 | | |

    - All-tree H/D 16/20 (the same warning).
    - **The composition shifts strongly:** hornbeam 0.43 → 0.20, beech 0.25 → 0.37, maple 0.16 → 0.21, oak
      0.01 → 0.06.
    - **Adopted as a separate commit (stage 2b)**, so it can be reverted alone.
- **RC done (04:35): draft PR #49** (`claude/overnight-rc`, stacked on #48).
  - **Commits:** 8b6f0b2 (species), ce7ebb3 (a review fix: the off test now reaches the species), 7b105ae
    (heights, separate), and e7116bf (the overseer's docs).
  - **Check:** green, 99/99.
  - **Review:** Fable had no credits, so an Opus stand-in ran it.
  - **Goldens:** mixedWood s15 c95b46b9 → 3ee70704 → 93042bbc; oakOpen 29e5921a; beechOpen ef0a754d;
    beechWood 6b8af072.
  - **Preview:** preview-3d now runs the RC (main merged in, no force).
  - **Bench:** RC phone seed 12 at 1.31× the base (over the frozen 1.3×), now being re-measured.
  - **Base 0.16.0 at 200 cells:** 242 MB for the plate alone (seed 12). #48's body now says "don't tag alone".
- **The advisor's pre-report checks (04:45):**
  1. **PASSED (05:00).** The RC build at e7116bf with no patch gives **identical** simulation results to the gated `ev-height` run: every per-seed value matches; only timing, labels and NaNs differ. PR #49 ships what was gated.
  2. **PASSED.** Memory with the specimen at the final commit is 197–211 MB on the 170-cell plate and 113–117 MB on the 80-cell phone plate (seeds 9, 10, 12; one fresh process per run).
  3. **PASSED.** Phone time, re-measured (fresh processes), is 0.95–1.16× the base (medians of 3). The 1.31× was load noise. It is a laptop measurement, not the phone.
  4. **DONE.** The lone sheet from the RC build (`figures/2026-11-06-lone-016-vs-rc.jpg`), in the overseer's reading:
     - **Clearly better:** hornbeam (a compact, rounded, irregular crown, 29 m flat) and rowan.
     - **Slightly better:** beech (fuller, but a flat "table" crown at 39 m).
     - **Unchanged and wrong:** oak (a spire-like leader over low limbs) and birch (a pale column at 45–49 m).
- **The morning report** (05:00): https://claude.ai/artifact/GL222vHH83bMQe3kzNb5LK
- **RC stages 2 and 3 (03:55, done):** species overrides, goldens, a quiet check, review, garden sheets, bench, push and
  draft PR, the preview-3d redeploy. Hard stop 07:30.
- (Earlier: G-forest on the species patches: the first run failed at 03:20 when /tmp (a 16 GB tmpfs) filled. The bulky intermediates of finished agents were deleted (to 43%), and the run restarted at 03:25 → `i0/ev-species`. **Rule from now on:** delete raw run outputs after extraction; Y2 was told.)
- **S (02:15, done):** beech, oak and birch departures on the r-best0 base plus Y's oak height, using the i0/wt build (read-only), hard stop 05:15 → `s/results.md`.
- **Next:** pick setting 1 or r-best0 by G-forest → RC stage 2 (S's species patches, when S reports) → stage 3 (push, draft PR, preview-3d, sheets).
- **Artifacts:** the scratchpad (in /tmp) is gone after a reboot. The code and summaries are kept in `docs/experiments/code/2026-11-06-overnight/`; its README maps the folder names. Originally (scratchpad `/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/`):
  - `a6/` the pair pipeline;
  - `a7/flat-cap.md`;
  - `a11/targets.md`;
  - `a14/noise.md` (pending);
  - `keys-overseer/` (never shown to judges).
- **Branches:**
  - A9 rules `worktree-agent-a3335ccda2a3fb0f2` (363f58f, 5f7ae79);
  - A10 cap `worktree-agent-a5b0da13584a0b015` (b783d73);
  - A5 framing `worktree-agent-a88003568ca134f6e` (63de6db);
  - docs ff4a406 on `claude/reference-fidelity`.
- **Gates:** frozen at launch (below).
  - **G-judge FAILED its gate (00:33; frozen and not rescued).** 6 fresh Opus judges, 160 answers:

    | test | regime | n | pick chosen |
    |---|---|---|---|
    | picks vs rejects | all | 96 | 68.8% (needs ≥ 75%) |
    | picks vs rejects | lone | 48 | 79.2% |
    | picks vs rejects | stand | 48 | 58.3% |
    | self vs self | all | 64 | 48.4% (passes) |

    - By pair: beech against its spindle 4/16 (the judge prefers the reject), beech against its cone 10/16,
      birch 13/16 and 16/16, hornbeam 14/16, oak 9/16.
    - **So tonight's gates are objective only.** The judge's lone-regime readings may be reported as
      advisory: post hoc, not gating.
- **The heartbeat:** a background `sleep 2700` is restarted on every wake.

## The goal, and what "achieved" means by morning
**The main goal:** the garden's trees look like trees, and like their species, through simple local rules,
and that look is shippable.

**By morning, a release candidate is ready for one decision ("merge and tag").** It consists of:
1. **A generic broadleaf** (on hornbeam) whose within-tree regularity sits inside the real trees' bands, lone
   and in the stand. It also passes `forest`'s 20-seed evidence and the phone's budget, and the gated judge
   prefers it to today's tree.
2. **The species as departures from it:** per-species params tuned on data where it exists (beech, oak,
   hornbeam, birch), and natural mature heights for every species (Level 0: rowan is too tall today).
3. **The flat cap improved, or a recorded negative** with the next mechanism named.
4. **A release candidate:**
   - branch `claude/overnight-rc` on top of `claude/garden-0.16.0`;
   - check green, goldens updated with reasons;
   - proposed ADRs for each new rule;
   - before/after garden sheets and the phone and laptop bench;
   - a draft PR into `3d-port`;
   - the morning report as an artifact page.

**Really close** means items 1, 2 and 4 are done with item 3 recorded, or item 1 is done with a list of what
blocked item 2.

## Hard rules (unattended)
- **Never merge into `3d-port` or `main`, never tag, never deploy.** Pushes go to work branches only, and the
  one PR is a draft.
- **New rules are off by default in the core** (goldens unchanged at off). The look is adopted only through
  species params on the RC branch.
- **Instruments are frozen once gated** (no re-registration overnight). A candidate that fails a gate is
  dropped, not rescued by changing the gate.
- **Heavy work:** at most 2 CPU-heavy agents at once (12 cores; check-timeout memory). `check:stamp` only in
  integration steps, in the foreground.
- **No browser pane.** Headless Firefox with timeouts.
- **Licences:** summary statistics only from CC-BY-SA and GPL sources.
- **Model tiers:** Opus for rules and integration, Sonnet for builds, data and runs, fresh Opus judges.
  spec-reviewer runs on Fable, falling back to an Opus reviewer if Fable's credits are out (as at 23:30).
- **Each agent:** a time cap, a stop condition, a report of at most 300 words, worktrees for code, and only
  the overseer writes `docs/`.
- **Decisions that need the user** go into the morning report's question list, never guessed.

## Gates (fixed now, before any result)
- **G-reg (regularity).** Use the A11/A14 descriptors that A14 marks usable, with noise-corrected bands. The
  candidate's median must fall inside the real 10–90% band on all usable descriptors, and on at least min(4, usable), lone and stand
  each, over 8 seeds. The summed |z| gap must fall at least 50% from R0.
- **G-forest.** Run on **the world the RC changes**: `mixedWood`, or the garden's `forestParams` with its
  species, over 20 seeds. First verify that species patches reach it; plain `forest` may not see species
  params (A10: R2 is off there).
  - The four checks (floor, H/D, crown base, plateau), plus survival and composition, each stay at or above
    **B0's HEAD value on the same world minus 2 of 20**.
  - B0 measures that baseline first. The 2026-11-02 record predates ADR 0054.
- **G-budget.**
  - Garden metamers at season 200: at most 1.25× today's.
  - The worker: under 230 MB, with the specimen beside the 200-cell plate.
  - Phone plate time per season: within 1.3× of 0.16.0's.
- **G-judge.**
  - **The instrument:** a simulated-against-simulated test with a real reference strip. Same seed, regime,
    framing and coarsening, both trees rotated alike. The question: "which is closer to the real trees?"
  - **Its gate, run before it judges any candidate:**
    - the user's picks against their gallery rejects: the pick preferred ≥ 75% over n ≥ 24;
    - a configuration against itself on other seeds: 40–60% over n ≥ 24;
    - fresh judges per batch.
  - **A candidate passes** when it is preferred to R0 (today) ≥ 65% over n ≥ 24.
  - **If the instrument fails its gate**, there is no visual gate: the gates are objective only, and the
    morning report says so.
- **G-height (an outlier fix, not a hard gate).** Fix only clear outliers: rowan at about 23 m against a
  real maximum of about 15 m, and any species over 1.3× its Level 0 upper band.
  - Every other species is reported as moving toward or away from its band.
  - **No Level 0 fitting overnight** (it took sessions before).

## Phases (the critical path and parallel tracks; times approximate)

### Phase 0 (00:30–01:15): finish what's running, and baselines
- A12: the 0.16.0 PR plus its quiet bench (running). A14: the noise floor and BioDiv hornbeam (running).
- **B0 (Sonnet):**
  - G-forest's world (`mixedWood` or the garden's `forestParams`), 20 seeds, at HEAD: the baseline;
  - whether species patches reach it;
  - the garden bench baseline (metamers and memory at 200), from A12's branch.

### Phase 1 (01:00–02:30): instruments and targets, in parallel
- **J (Sonnet build, Opus judges): build and gate G-judge.**
  - Pairs: hand pick against gallery reject (beech, birch, hornbeam, oak; lone and stand), and self against
    self.
  - The judges follow the protocol above.
  - **Frozen** after the gate, pass or fail.
- **T (Sonnet): per-species targets for the data-rich species** (beech, oak, hornbeam, birch; ash and sycamore
  for the record):
  - A11's descriptors;
  - crown shape on real QSMs: D, shape ratio, W/H, crown base, lone and stand;
  - Level 0 mature-height bands for all eleven garden species.
  - It also answers: **is the real lone hornbeam a dome by D?** If real trees are flat by D, the cap target
    changes.

### Phase 2 (01:15–05:00): the generic broadleaf (hornbeam), three tracks
- **R (Opus, worktree on A9's branch): regularity.**
  - Add per-branch angle variation: a β offset per axis, extending `c4.axisSD` or a separate `c1.betaSD`,
    off by default.
  - Then a small search (a grid, then a 15-candidate local search) over shootLengthSD, axisSD, betaSD and
    budBreak width against G-reg's noise-corrected targets.
  - Constraint: stand survival at 70 ≥ 28 of 32.
  - **Output:** the best two settings.
- **A (Opus, worktree on A10's branch): crown shape.**
  - Troll's arching (A7's candidate 5) on top of trunk-only dΛ, and A7's `c2.skyExponent` 0.
  - Scored on D, shape ratio and W/H against **T's real-crown targets** (not the hemisphere).
  - Budget ≤ 1.25× metamers.
  - Stop at 04:30 with the best setting or a negative.
- **Y (Sonnet): age and height.**
  - Slow the lone juvenile growth (r2.hJ, maxMetamersPerShoot, params only) so that the lone hornbeam's height
    at age matches the Lockow yield table and Tallo.
  - Then hand R and A that setting as the shared base by 02:30.
  - **The garden's cost:** compare the garden's canopy height at seasons 40 and 80 with today's. If the
    opening time-lapse is visibly emptier (canopy 20% lower or more at 40), use Y only to match ages for
    judging, and keep it out of the RC.
- **Integration I1 (Opus, 05:00–06:00).**
  - Combine R's best, A's best (if it passes) and Y on one branch. Run G-reg, G-forest (20 seeds), G-budget
    and G-judge (vs R0).
  - Pass → it becomes **G\***. Fail → drop A, then Y, in that order, and re-test. If all fail, G\* = R's best
    alone, provided it passes G-reg and G-forest.

### Phase 3 (05:00–07:30): the species (by data, the user's ruling)
- **S (Opus, worktree on G\*): beech, oak, hornbeam, birch.** Start from each species' current params plus
  G\*'s regularity and age params.
  - Tune at most 3 species knobs each against that species' T targets and its Level 0 height (a small local
    search, ≤ 20 candidates per species, 8 seeds).
  - Keep the user's per-species picks (ADR 0033–0044) unless a target demands otherwise. If so, report it;
    don't override.
- **H (Sonnet): the data-poor species** (maple, willow, rowan, holly). G\*'s regularity params plus a height
  fix to Level 0 only (rowan first).
- Each species: G-height, the species' descriptors, and the judge's species-against-today (G-judge's
  protocol, n 24).

### Phase 4 (06:30–08:30): the release candidate
- **RC (Opus, worktree):**
  1. `claude/overnight-rc` from `claude/garden-0.16.0`; merge the chosen rule commits (A9's, R's, A's if it
     passed).
  2. Write the species params into `hand-overrides.toml` / flora (`m27_adopt.py`'s path).
  3. `golden:update` with reasons, `check:stamp` green, and the spec-reviewer on the diff.
  4. The headless garden sheets: before (0.15.0) / 0.16.0 / RC, seeds 12, 9, 10, 2, 3, 6; laptop and phone;
     seasons 40, 80, 150.
  5. The bench, and G-budget.
  6. Push the branch and open a **draft** PR into `3d-port`.
- **The overseer:**
  - proposed ADRs (the rules, the judge instrument, the generic-base approach);
  - an experiment note, the devlog, STATUS, and this plan's log;
  - the morning report as an artifact page: the verdict per goal item, the sheets, the gates' tables, the
    decisions for the user and the exact merge and tag commands.

## The clock (hard cutoffs)
- **06:30:** RC starts with whatever has passed by then.
- **07:00:** any Phase 3 species not finished is dropped from the RC and reported.
- **08:30:** the morning report is published whatever state the RC is in.
- **The usage budget:** if Opus runs short, keep R → I1 → RC on Opus and move S's searches to Sonnet first.

## Fallbacks, so the night always ends with something shippable
- **G-judge fails its gate:** objective gates only, stated plainly.
- **R fails G-reg:** RC = 0.16.0 plus the height fixes (H) only. The regularity work goes to the report with
  its best numbers.
- **Every look candidate fails G-forest:** RC = 0.16.0 plus Level 0 heights. The flat-cap and regularity
  findings go in as proposed ADRs.
- **The machine overheats or the checks time out:** serialise phases, drop Phase 3's tuning first (keep H),
  and keep Phase 4.

## Log
- 05:20: the advisory lone judge: RC preferred 79% at season 100 (beech 12/12, hornbeam 12/12, oak 10/12, rowan 4/12) but 42% at young matched height (the RC's young hornbeam and beech lose their clear trunk). The report was updated.
- 05:00: checks 2–4 done. The lone sheet replaces the setting-1 figure. The morning report is published.
- 05:00: check 1 passed (the RC equals the gated run).
- 04:45: RC done (PR #49, preview). The advisor's four checks are running. PR #48 warned.
- 04:09: height patches passed G-forest at the margin; adopted as a separate commit (RC stage 2b); RC resumes stage 3.
- 03:57: Y2 done (the reproductive sink keeps the crown); G-forest on height patches started; RC check held.
- 03:55: species G-forest passed; RC stages 2 and 3 started.
- 03:40: RC stage 1 done (check red on timeouts only; PLATE_MAX 170). ADR 0055 drafted.
- 03:25: /tmp filled (a disk-quota error); cleaned; species evidence restarted.
- 03:15: S done; G-forest on the species patches started.
- 02:55: setting 1 failed G-forest (planted H/D); G* = r-best0; RC switched.
- 02:20: R done (setting 1, −78%, looks clearly more natural). G-forest on setting 1 started; RC stage 1 started.
- 02:20: A done (the flat cap is a size effect; F3 is a column; Y's L_h makes poles, G1 withdrawn). Y2 started. S told to drop oak's L_h. R asked for a visual sheet.
- 02:11: the early I1 probe passed G-forest; R asked to finish by 03:00.
- 01:54: Y done (G1 height patches, adopt). A asked for D with G1.
- 01:45: B0 done (baseline above). R's grid: best loss 5.5 against 23.3 at R0, 4/4 usable descriptors in band lone and stand, but stand survival 26/32 (the constraint is ≥ 28).
- 01:10: T done (real lone trees are domes; ours overgrow). A and Y redirected.
- 00:55: M done (no regression); PR #48 corrected.
- 00:33: J built gate1; the judge failed its gate (above). B0 started.
- 00:20: A12 done (PR #48, the memory blocker). R, J and M started.
- 00:05 written. 00:10: revised after the advisor's review (G-forest's world and baseline, G-height an
  outlier fix, cutoffs, the heartbeat, State).
