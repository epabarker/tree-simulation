# The fresh-look beech, round 2: the stand, and oak's and fir's look in the renderer (brief, 2026-11-02)

Track E's brief. It follows the user's decisions of 2026-11-02 on the round-1 review
([review](../experiments/2026-11-01-fresh-look-beech-review.md),
[overnight note](../experiments/2026-11-02-beech-overnight.md) §4):

- own-crown pruning is rejected ([ADR 0043](../decisions/0043-own-crown-pruning.md));
- the round's other four rules are accepted for beech, at the repair's values without `c5.Tvig` and under the resource vigour gate ([ADR 0039](../decisions/0039-relay-neighbour-gate.md)–[0042](../decisions/0042-light-orthotropy.md));
- round 2 targets the beech stand, and oak's and fir's leaf styles in the renderer, measured with the real-renderer blind test using three namers.

## What the evidence says

The real-renderer blind test ([v2](https://github.com/epabarker/tree-simulation/blob/claude/blind-v2/docs/experiments/2026-11-02-blind-test-v2.md)) used three blind namers in the lab's WebGL2 renderer with track C's bark and foliage, seeds 1–3:

- **The round's lone beech passes:** it was named beech on 18 of 18 plates, against today's 9 of 18. Those plates were drawn with own-crown pruning on, so whether the accepted build (without it) still passes is untested.
- **The beech stand fails:** at 100 seasons both builds were named beech by one namer of three. The namers' deciding features, on seed 1:
  - lime: "pale grey stems with leafy sprouts carry rounded upper crowns";
  - aspen: "pale, slightly wavy stems with lumpy, irregular crowns";
  - the one beech: "tall, pale, slightly wavy stems with leafy heads only near the top".

  The leads are two:
  - **leaf on the boles below the crown:** "sprouts" are lime's epicormics, while a beech high forest has clean boles;
  - **wavy boles under lumpy tops:** the relay and the vigour fork act on the stand's old dominants (ADR 0039's s̄ falls to 0.05–0.10 after 50).
- **Oak was named hawthorn on all 27 plates.** The namers named:
  - "dark zigzag limbs";
  - "a vase from ground level" and "multi-stemmed from a short base";
  - "twiggy, ragged crown".

  That is bark colour, the scaffold and twig density as much as leaf style. And **the plates carry no scale:** the lab fits each scene to its plate, so a 25 m oak and a 6 m hawthorn look the same size. The garden draws every tree at one scale.
- **Silver fir was named holly, yew or alder on all 27 plates:** "dense, very dark green, narrow spire", "narrow dark grey-green leaves". The silhouette is a conifer's, and the foliage reads broadleaved and dark. Fir is after shipping (the tracks plan, §3), so its part comes last.

## The measure (fixed before any change)

The blind-v2 protocol (`code/2026-11-02-blind-test-v2/`: `shots.mjs`, `shuffle.py`, `tally.py`) has two changes:

1. **One scale for every plate.** Every plate is drawn at the same metres per pixel, the garden's at its phone plate, so size is a cue as it is for a visitor. The camera is fixed by the world's height, not fitted to the trees. Re-run today's six sources at seeds 1–3 under it first: that is the baseline for this round, and it tests whether scale alone moves oak.
2. **The judging seeds are 4–6.** Seeds 1–3 are for development. Any claim is made on fresh namers at seeds 4–6, never on seeds 1001–1006.

The pass rule is blind-test.md's: named on at least 2 of 3 seeds, for at least 2 of 3 fresh namers, in each of lone 60, lone 100 and stand 100. The sources:
- beech, the accepted build (the branch's beech without `c5.Tvig`);
- hornbeam, oak, birch and silver fir, each with its own entry.

Hornbeam and birch must not regress. The user's look on the phone stays the final gate.

## Part 1: the renderer (track C, `claude/foliage`)

Renderer and leaf-style changes only (`src/web/render/`, the leaf styles in `src/core/`). There is no core change and no golden change. This is the fast loop: seconds a change, and judged on seeds 1–3 in the lab.

1. **Oak:**
   - bark: the namers read "dark" as hawthorn, and an oak's bark is grey-brown, fissured and paler on old stems;
   - leaf: clumping on short shoots, a mid-to-dark green that is not black, and leaf size at true scale;
   - drawn twig density: "twiggy" is hawthorn's.

   Track A's identity card for oak is the reference, with photographs linked.
2. **Silver fir:** needle sprays drawn as flat, dark-green-above, with a pale underside where seen. It must not read as a broadleaf's leaf. This is the last item: fir is after shipping.
3. **Re-test** at seeds 1–3 with three fresh namers, then at seeds 4–6 if the dev seeds pass.

If oak still reads as hawthorn at one scale with its own bark and leaf, the cause is its form: the low vase and the zigzag scaffold. That goes to the user as a picture and a finding. It is not grounds for a fit.

## Part 2: the beech stand (form, track B's files; this branch's rules)

1. **Diagnose before changing anything.** On the stand at 100, seeds 1–3, measure:
   - the leaf on the boles below the limb crown base: where it comes from (shoots of which pa and age, held by which rule);
   - the boles' straightness: the lateral offset of the trunk's axis over its clear length, and when the relay or the vigour fork acted on it.

   Do this with the rules on, then with each of ADR 0039–0042 off in turn. It is cheap: native runs and a CSV, no fit.
2. **Then at most two candidate changes, each switchable and default-off,** with an ADR proposal, unit tests and goldens unchanged by default. They are judged first on the dev seeds in the renderer, then on 4–6.
3. **The ecology guard holds at 20 seeds** (`evidence20.py`, seeds 1–20):
   - alive ≥ 10 of 12;
   - floor 3–5%;
   - LAI 6–8;
   - H/D 70–110.

   At least 8 of 20 seeds must pass all four, as the accepted build does. Any change that moves the stand's ecology numbers goes to the user before adoption: that decision is theirs.

## Out of scope

- Other species' form.
- Any fit or form round for other species.
- Own-crown pruning, or another shedding rule for the lone tree's skirt.
- The vigour gate's units (revisit only if α, R1's costs or the cell size change: ADR 0041's outcome).
- Merging, which is the user's, and main and tags, which are never touched.

## Stop rule

The round stops in any of these cases:
- two passes of Part 2 do not move the stand's names on the dev seeds;
- the guard falls below 8 of 20;
- Part 1's oak still fails at one scale with its own bark and leaf.

Then the pictures and the finding go to the user, and nothing further is built.

## Who runs it

- **The renders:** the laptop, on its GPU (the v2 renders took 24–71 s each in headless Chromium).
- **The namers:** fresh sub-agents with their own shuffled folders, as v2 ran them.
- **The native runs and the diagnosis:** a cloud session.

Each part reports to track E with the paths and one paragraph (the tracks plan, §2).
