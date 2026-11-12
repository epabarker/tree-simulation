/**
 * Named starting points, shared by the page and the CLI. Each is a patch over defaultParams,
 * so it is type-checked against Params. Species presets (§9) use R2 (M7, ADR 0009).
 */

import { FLORA, type FloraName } from "./flora.ts";
import {
  defaultParams,
  mergeParams,
  type Params,
  type ParamsPatch,
  type TreeSpec,
} from "./params.ts";

export interface Preset {
  label: string;
  description: string;
  patch: ParamsPatch;
  /** Page only: how the page draws this preset's foliage (src/web/render/leaf-styles.ts). */
  leaf?: string;
}

/** Principles shared by every stand preset (C2–C6 on, λ = 0.5). */
const STAND = {
  c2: { enabled: true, model: "slab" },
  c3: { mode: "bh", lambda: 0.5 },
  c4: { enabled: true },
  c5: { enabled: true },
  c6: { enabled: true },
} satisfies ParamsPatch;

/**
 * Principles of the M6 presets: as STAND, with the Beer–Lambert sky sweep as the light model,
 * relative shedding (ADR 0007: a shade-tolerance floor T = 0.03 and T_rel = 0.12, so canopy trees
 * prune as at T = 0.1 while overtopped trees keep deeper crowns) and short shoots (ADR 0006:
 * Q_ss = 0.1, a_ss = 2, about half the leaf area on short shoots). Calibrated in
 * docs/experiments/2026-10-27-m6d-shedding-short-shoots.md. From M8 they also carry R1's carbon
 * balance (ADR 0010), with α = 3 so that net production keeps young trees as vigorous as before,
 * from M9 R3's mechanics (ADR 0011): limbs sag under their load and reaction wood rights them, and
 * from M10 R4's dormancy and release and R5's shade avoidance (ADR 0012).
 */
export const SKY = {
  ...STAND,
  c2: { enabled: true, model: "slab" },
  c3: { mode: "bh", lambda: 0.5, alpha: 3 },
  c5: { enabled: true, T: 0.03, Trel: 0.12 },
  r1: { enabled: true },
  r3: { enabled: true },
  r4: { enabled: true },
  r5: { enabled: true },
  r6: { enabled: true, qMin: 0.1, leafArea: 2 },
} satisfies ParamsPatch;

/**
 * The sky presets before R1 (M6–M7): resource α·Q_base with no costs, no mechanics, release or
 * shade avoidance. Tests of those milestones pin it, so their evidence holds with R1–R5 on.
 */
export const PRE_R1 = {
  c3: { alpha: 2 },
  r1: { enabled: false },
  r3: { enabled: false },
  r4: { enabled: false },
  r5: { enabled: false },
} satisfies ParamsPatch;

/**
 * The M6 sky sweep (columns, periodic laps) the light model had before M18's row march. The 2D
 * sweeps are gone with I2 (the slab replaced them), so this patch is empty; the M6–M7 tests that
 * pinned it are 2D-calibrated (tests/evidence-2d/).
 */
export const M6_LIGHT = {} satisfies ParamsPatch;

/** The sky presets before R4 and R5 (M8–M9): the tests of those milestones pin it. */
export const PRE_R4 = { r4: { enabled: false }, r5: { enabled: false } } satisfies ParamsPatch;

/**
 * M11 (ADR 0013): a forest without edges. Periodic sides wrap light and growth around, so the
 * stand continues for ever on both sides; O4 adds seeds from R1's reproductive sink (f_rep 0.1
 * above 40 cells), establishment in lit ground and background mortality.
 */
const FOREST = {
  ...SKY,
  // ADR 0032: the acclimated leaf cost (one global c), and T_rel scaled as hornbeam's from its
  // fitted 0.194 to the light of its lowest shade leaves, 0.025: 0.12 × 0.025/0.194.
  c5: { ...SKY.c5, Trel: 0.0155 },
  r1: { enabled: true, fRep: 0.1, maturity: 40, leafCost: "acclimated", leafCostShade: 0.3 },
  // M16: limbs rest on the ground; storms in 5% of seasons break exposed limbs and throw tall trees.
  // σ_break 7000 ≈ 2.3 × σ_target (ADR 0027): with thin pipes stress wood holds every branch near
  // σ_target, and a storm's load at the top is 2.5×, so 4500 broke whole crowns in every storm.
  r3: { ...SKY.r3, ground: true, sigmaBreak: 7000 },
  o2: { stormP: 0.05, stormLoad: 1.5 },
  o4: { enabled: true },
} satisfies ParamsPatch;

/**
 * M19: the woodland the calibrated species (flora.ts) grow in, the forest's principles (R5 senses
 * its neighbours' shade, as every preset's has since C1 round 2: lone trees grow squat).
 * Storms are the forest's: harder ones snapped the young woodland's tops (the succession note).
 */
const WOODLAND = {
  ...FOREST,
  species: FLORA,
} satisfies ParamsPatch;

/** Spacing of a stand's trees, cells: the 2D stands' one tree every 21 cells, now per area. */
const SPACING = 21;

/**
 * A stand that fills the slab's depth (C1 round 2; the user, 2026-10-31): trees per area, not in
 * one row down the slab's middle. One row's `xs` is repeated in rows every ≈ SPACING cells across
 * the depth, each row shifted a fraction of the spacing along x so the planting is staggered
 * (wrapped on `width`). `spec(i, row)` gives tree i of a row its species. A lone tree and the
 * hedgerow (one row between open faces) keep a single row.
 */
export function perArea(
  xs: number[],
  width: number,
  spec: (i: number, row: number) => Omit<TreeSpec, "x" | "z"> = () => ({}),
): TreeSpec[] {
  const depth = defaultParams.world.depth ?? 64;
  const rows = Math.max(1, Math.round(depth / SPACING));
  return Array.from({ length: rows }, (_, r) =>
    xs.map((x, i) => ({
      ...spec(i, r),
      x: (x + (r * SPACING) / rows) % width,
      z: (depth * (r + 0.5)) / rows,
    })),
  ).flat();
}

/** A stand of one calibrated species, `xs` the positions of one row (perArea). */
const flora = (name: FloraName, xs: number[], width: number) =>
  perArea(xs, width, () => ({ species: name }));

/**
 * The woods' world top, cells. In 3D the trees' height has not levelled off by season 150 (C1), and
 * a crown pinned at the top runs away: its top row sees the open sky however dense it grows, so it
 * doubles every 15–20 seasons (the pre-C1 note). The light only marches up to the highest leafy
 * row, so headroom costs memory (W × D × 24 bytes a row), not time, until a tree grows into it.
 */
export const TOP = 200;

/**
 * The open-grown lone tree's box (ADR 0062, spec §C2): open sky on all four sides (τ = 1 on both z
 * faces, open x sides) in a square 60 m box (240 cells of 0.25 m), sized from the crown so that no
 * bud grows past a bound. The open-box note (2026-11-08) found the widest of the six exemplars at
 * season 100 (beech) needed ≥ 56 m. The top stays the woods' 50 m. Every species sees this light;
 * none carries a light-entry setting.
 */
export const OPEN_GROWN = {
  width: 240,
  depth: 240,
  height: TOP,
  faces: [1, 1],
  sidesZ: "open",
  walls: [],
} satisfies Params["world"];
/** The open-grown tree's root: the box's centre. */
export const OPEN_GROWN_ROOT = { x: 120, z: 120 };

/**
 * The half-walled world the lone tree had before ADR 0062 (160 wide, the slab's 16 m depth between
 * τ 0.2 faces): kept for the species trials' stands and shade house, which were calibrated in it,
 * and for the garden's specimen, whose worker budget (ADR 0026, plate.ts) was set in it.
 * Calibrations made in it are evidence, not baselines (ADR 0062).
 */
export const HALF_WALLED = {
  width: 160,
  height: TOP,
  depth: 64,
  faces: [0.2, 0.2],
  walls: [],
} satisfies Params["world"];

const RING = { width: 210, height: TOP, walls: [], sides: "periodic" } satisfies Params["world"];
/** One row of the ring's stand: a tree every 21 cells. */
const RING_X = [10, 31, 52, 73, 94, 115, 136, 157, 178, 199];

/**
 * The mixed wood's planting (M25), one tree every 21 cells: three birch and a goat willow
 * pioneering, with one of each of the others, spaced so no two of a kind stand side by side.
 */
const MIXED = [
  "birch",
  "oak",
  "willow",
  "beech",
  "birch",
  "hornbeam",
  "rowan",
  "birch",
  "holly",
  "maple",
] as const;

export const STAND_X = [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x }));

/**
 * The 0062/0063 garden (#121): the depth is periodic (ADR 0062, decision 3; ADR 0058), so side
 * light follows from the stand's own density; the stand starts from `o4.planting`'s saplings per
 * hectare over the whole width × depth (ADR 0063, decision 5), `MIXED` cycled by the seed, and
 * thins by the two-part mortality (decision 3). Its rates were probed on seeds 1–3, exploratory
 * (`experiments/2026-11-10-garden-schedule.md`): no rate meets the mature-forest criteria, because
 * understorey trees that pay their maintenance are never suppressed; m_c = 0.003 (a third of the
 * bare params' 0.01) keeps the canopy trees, which 0.01 killed, and every other rate is the default.
 */
const GARDEN_WORLD = { ...RING, sidesZ: "periodic" } satisfies Params["world"];
const GARDEN_O4 = {
  ...WOODLAND.o4,
  mortality: "twoPart",
  mCanopy: 0.003,
  planting: { density: 400, spacing: 12, species: [...MIXED] },
} satisfies ParamsPatch["o4"];

export const presets = {
  explosion: {
    label: "M0: unchecked growth",
    description: "Every bud grows every season: the Borchert–Slade explosion (spec §1, §7 M0).",
    patch: {
      world: { width: 80, height: 60, walls: [] },
      trees: [{ x: 40 }],
      c2: { enabled: false },
      c3: { mode: "none" },
    },
  },
  shadow: {
    label: "M1: shadow regulates density",
    description: "C2 on: buds in another bud's shadow triangle stop growing (spec §7 M1).",
    patch: {
      world: { width: 100, height: 70, walls: [] },
      trees: [{ x: 50 }],
      c2: { enabled: true, model: "slab" },
      c3: { mode: "none" },
    },
  },
  bh: {
    label: "M2: Borchert–Honda, λ = 0.5",
    description: "C3 on: resource flows to well-lit branches; λ biases it to the main axis (§C3).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "slab" },
      c3: { mode: "bh", lambda: 0.5 },
    },
  },
  leader: {
    label: "M2: dominant leader, λ = 0.56",
    description: "Strong apical control: an excurrent tree with a clear trunk (Guerra: 0.56).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "slab" },
      c3: { mode: "bh", lambda: 0.56 },
    },
  },
  spreading: {
    label: "M2: spreading crown, λ = 0.46",
    description: "Weak apical control: a decurrent, spreading crown (Guerra: 0.46).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "slab" },
      c3: { mode: "bh", lambda: 0.46 },
    },
  },
  direction: {
    label: "M3: shoots bend to light and tropism",
    description: "C4 on: each new metamer turns toward light V and its set-point (§C4).",
    patch: {
      world: { width: 120, height: 90, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "slab" },
      c3: { mode: "bh", lambda: 0.5 },
      c4: { enabled: true },
    },
  },
  wall: {
    label: "M3: lean away from a wall",
    description: "A shaded wall left of the tree: the crown grows away from it (§7 M3).",
    patch: {
      world: { width: 100, height: 80, walls: [{ x: 36, y: 0, width: 8, height: 80, shade: 3 }] },
      trees: [{ x: 50 }],
      c2: { enabled: true, model: "slab" },
      c3: { mode: "bh", lambda: 0.5 },
      c4: { enabled: true },
    },
  },
  pruned: {
    label: "M4: shedding and pipe girth",
    description: "C5 sheds shaded laterals; C6 thickens stems by the pipe model (§C5, §C6).",
    patch: {
      world: { width: 120, height: 100, walls: [] },
      trees: [{ x: 60 }],
      c2: { enabled: true, model: "slab" },
      c3: { mode: "bh", lambda: 0.5 },
      c4: { enabled: true },
      c5: { enabled: true },
      c6: { enabled: true },
    },
  },
  pair: {
    label: "M5: two trees",
    description: "Two trees share one light grid: crowns grow away from each other (§7 M5).",
    patch: {
      world: { width: 120, height: 100, walls: [] },
      trees: [{ x: 48 }, { x: 72 }],
      ...STAND,
    },
  },
  late: {
    label: "M5: a late tree is suppressed",
    description: "A seedling planted at season 12 between two older trees stays small (§7 M5).",
    patch: {
      world: { width: 140, height: 100, walls: [] },
      trees: [{ x: 45 }, { x: 70, plantSeason: 12 }, { x: 95 }],
      ...STAND,
    },
  },
  grove: {
    label: "M5: grove of four",
    description: "Four trees: the stand at a size that reads well on a phone.",
    patch: {
      world: { width: 110, height: 100, walls: [] },
      trees: [22, 44, 66, 88].map((x) => ({ x })),
      ...STAND,
    },
  },
  stand: {
    label: "M5: stand of ten",
    description: "Ten trees: edge trees lean out, interior trees grow tall and narrow (§8).",
    patch: {
      world: { width: 230, height: 110, walls: [] },
      trees: [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x })),
      ...STAND,
    },
  },
  skyLate: {
    label: "M6d: an overtopped tree keeps its crown",
    description:
      "The M5 late tree under the sky sweep: relative shedding lets it keep a deeper crown (ADR 0007).",
    patch: {
      world: { width: 140, height: 100, walls: [] },
      trees: [{ x: 45 }, { x: 70, plantSeason: 12 }, { x: 95 }],
      ...SKY,
    },
  },
  skyStand: {
    label: "M6: stand under a full sky",
    description:
      "Beer–Lambert sky sweep: edge trees lean out, crowns lift, gaps get filled (§C2, M6).",
    patch: {
      world: { width: 230, height: 110, walls: [] },
      trees: [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x })),
      ...SKY,
    },
  },
  skyGrove: {
    label: "M6: grove under a full sky",
    description: "Four trees under the sky sweep, sized for a phone.",
    patch: {
      world: { width: 110, height: 100, walls: [] },
      trees: [22, 44, 66, 88].map((x) => ({ x })),
      ...SKY,
    },
  },
  skyTree: {
    label: "M6: one tree under a full sky",
    description: "An open-grown tree keeps its low, side-lit branches.",
    patch: {
      world: { width: 120, height: 160, walls: [] },
      trees: [{ x: 60 }],
      ...SKY,
    },
  },
  overcast: {
    label: "M6e: stand under an overcast sky",
    description:
      "The stand under a standard overcast sky (zenith three times as bright as the horizon, p = 1.5).",
    patch: {
      world: { width: 230, height: 110, walls: [] },
      trees: [20, 41, 62, 83, 104, 125, 146, 167, 188, 209].map((x) => ({ x })),
      ...SKY,
      c2: { enabled: true, model: "slab", skyExponent: 1.5 },
    },
  },
  obliqueSun: {
    label: "M6: oblique sun",
    description: "A sky brighter to the right (tilt 0.5): the crown grows toward the sun (§C2.6).",
    patch: {
      world: { width: 120, height: 100, walls: [] },
      trees: [{ x: 50 }],
      ...SKY,
      c2: { enabled: true, model: "slab", skyTilt: 0.5 },
    },
  },
  forest: {
    label: "M11: a forest without edges",
    description:
      "Periodic sides and stand dynamics: seeds land, seedlings wait in the shade, and gaps refill when canopy trees die (O4).",
    patch: {
      world: RING,
      trees: perArea(RING_X, RING.width),
      ...FOREST,
    },
  },
  clearing: {
    label: "D2: a clearing (obstacles)",
    description:
      "The forest grows around a solid region that casts no shade, as it grows around a page's text (ADR 0015).",
    patch: {
      world: { ...RING, obstacles: [{ x: 70, y: 32, width: 70, height: 22 }] },
      trees: perArea(RING_X, RING.width),
      ...FOREST,
    },
  },
  oakOpen: {
    label: "M19: an oak grown in the open",
    description:
      "Quercus robur alone in a field: wide-angled limbs, a broad decurrent crown and a squat trunk (Plate II).",
    // A specimen: no seedlings around it, and no storms, which throw tall trees by height alone.
    // The woods' top (C1 round 3): at 120 the lone oak reached it and its crown was clipped flat.
    // Open-grown (ADR 0062): it was 160 wide in the slab's 16 m between τ 0.2 faces.
    patch: {
      world: OPEN_GROWN,
      trees: [{ ...OPEN_GROWN_ROOT, species: "oak" }],
      ...WOODLAND,
      o2: { stormP: 0 },
      o4: { enabled: false },
    },
  },
  beechOpen: {
    label: "A beech grown in the open",
    description:
      "Fagus sylvatica alone in a field: the fresh-look round's lone tree (ADR 0039–0043, proposed), in a world wide enough for its crown.",
    // oakOpen's specimen with the beech: 240 wide, as the fresh-look round's repair measured it
    // (160 clipped a broad crown at the world's sides). A golden case: the open-grown beech is
    // where the round's vigour-gated rules act. Open-grown (ADR 0062): it was 240 wide in the
    // slab's 16 m between τ 0.2 faces.
    patch: {
      world: OPEN_GROWN,
      trees: [{ ...OPEN_GROWN_ROOT, species: "beech" }],
      ...WOODLAND,
      o2: { stormP: 0 },
      o4: { enabled: false },
    },
  },
  birchWood: {
    leaf: "small",
    label: "M19: a birch wood",
    description:
      "Betula pendula: quick to grow, light-demanding, clean boles under a light canopy.",
    patch: {
      world: { width: 230, height: TOP, walls: [] },
      trees: flora(
        "birch",
        STAND_X.map((t) => t.x),
        230,
      ),
      ...WOODLAND,
    },
  },
  oakWood: {
    label: "M19: an oak wood",
    description: "Quercus robur in a stand: tall and slender, with crowns lifted to the light.",
    patch: {
      world: { width: 230, height: TOP, walls: [] },
      trees: flora(
        "oak",
        STAND_X.map((t) => t.x),
        230,
      ),
      ...WOODLAND,
    },
  },
  beechWood: {
    label: "M19: a beech wood",
    description:
      "Fagus sylvatica: deep, dense crowns over a dark floor, a few per cent of the sky.",
    patch: {
      world: { width: 230, height: TOP, walls: [] },
      trees: flora(
        "beech",
        STAND_X.map((t) => t.x),
        230,
      ),
      ...WOODLAND,
    },
  },
  firWood: {
    leaf: "needle",
    label: "M19: a silver fir wood",
    description: "Abies alba: tiered spires that keep their shaded branches (a lab species).",
    patch: {
      world: { width: 230, height: TOP, walls: [] },
      trees: flora(
        "fir",
        STAND_X.map((t) => t.x),
        230,
      ),
      ...WOODLAND,
    },
  },
  pineWood: {
    leaf: "pine",
    label: "M25: a Scots pine wood",
    description:
      "Pinus sylvestris: light-demanding whorled pines that shed their lower limbs, high crowns over a light floor (a lab species).",
    patch: {
      world: { width: 230, height: TOP, walls: [] },
      trees: flora(
        "pine",
        STAND_X.map((t) => t.x),
        230,
      ),
      ...WOODLAND,
    },
  },
  mixedWood: {
    label: "M25: a mixed wood",
    description:
      "Nine native species around a ring: birch and goat willow pioneer, rowan and field maple fill gaps, holly and hornbeam wait beneath, and beech and oak take the canopy.",
    patch: {
      // The garden's world and schedule at the ring's width (#121): `o4.planting` plants it.
      world: GARDEN_WORLD,
      trees: [],
      ...WOODLAND,
      o4: GARDEN_O4,
    },
  },
  succession: {
    label: "M19: succession, birch to beech",
    description:
      "Birch pioneers with a few oak and beech among them: beech grows up in their shade and takes the canopy, and storms reopen gaps for birch and oak.",
    patch: {
      world: RING,
      trees: perArea(RING_X, RING.width, (i, r) => {
        const k = (i + 3 * r) % 10;
        return { species: k === 2 || k === 6 ? "oak" : k === 4 || k === 8 ? "beech" : "birch" };
      }),
      ...WOODLAND,
    },
  },
  thinning: {
    label: "M11: self-thinning",
    description:
      "Sixty seedlings 3.5 cells apart on an edgeless ring: the suppressed starve and the stand thins itself (§10).",
    patch: {
      world: RING,
      trees: Array.from({ length: 60 }, (_, k) => ({ x: 1.75 + 3.5 * k })),
      ...SKY,
    },
  },
} satisfies Record<string, Preset>;

export type PresetName = keyof typeof presets;

export const defaultPreset: PresetName = "skyStand";

export function presetParams(name: PresetName, seed?: number): Params {
  const params = mergeParams(defaultParams, presets[name].patch);
  if (seed !== undefined) params.seed = seed;
  return params;
}

export function isPresetName(name: string): name is PresetName {
  return Object.hasOwn(presets, name);
}

/**
 * How the garden is planted and bounded (ADR 0063; a host page may override any of it):
 * `density` saplings per hectare over the whole width × depth, none closer than `spacing` cells
 * (`o4.planting`); the cap on live trees, seedlings included, at `cap` stems per hectare, a compute
 * guard that a settled garden never reaches (decision 2); and the depth's `faces`: "wood" (the
 * default, a periodic depth, ADR 0062 decision 3), or the open faces a host page may still show
 * (decision 5), "woodEdge" (τ 1 in front, 0.2 behind) and "hedgerow" (1, 1).
 */
export interface Planting {
  density: number;
  spacing: number;
  cap: number;
  faces: "wood" | "woodEdge" | "hedgerow";
}

/** The garden's planting: about 400 saplings a hectare (ADR 0063, decision 5). */
export const GARDEN_PLANTING: Planting = { density: 400, spacing: 12, cap: 2500, faces: "wood" };

/** A cell's side in metres (ADR 0064; the core's `stand::CELL_METRES`). */
const CELL_METRES = 0.25;

/** The open faces' τ (front, back), ADR 0024's looks. */
const OPEN_FACES = { woodEdge: [1, 0.2], hedgerow: [1, 1] } as const;

/**
 * The `mixedWood` woodland (M25), the 0062/0063 garden, on a ring `width` cells wide: about as
 * wide as the host is wide relative to the world's height, so a phone gets a narrower forest at
 * the same density per area (user story 15). The seed turns the planting's positions and its mix
 * (`MIXED`), so each forest starts differently.
 */
export function forestParams(width = 210, seed?: number, planting: Partial<Planting> = {}): Params {
  const { density, spacing, cap, faces } = { ...GARDEN_PLANTING, ...planting };
  const base = presetParams("mixedWood", seed);
  // A phone in portrait gets a narrow ring, drawn large (D1).
  const W = Math.round(Math.min(520, Math.max(54, width)));
  const D = base.world.depth ?? 64;
  const hectares = (W * D * CELL_METRES * CELL_METRES) / 10_000;
  const maxTrees = Math.max(20, Math.round(cap * hectares));
  const world: Params["world"] =
    faces === "wood"
      ? { ...base.world, width: W }
      : { ...base.world, width: W, sidesZ: "open", faces: [...OPEN_FACES[faces]] };
  return mergeParams(base, {
    world,
    trees: [],
    o4: { ...base.o4, maxTrees, planting: { ...GARDEN_O4.planting, density, spacing } },
  });
}

/**
 * The lone-tree stage: one tree of `species` alone, under the woodland's growth rules without
 * recruitment or storms (`oakOpen`'s world, its oak swapped for `species`). The one source the
 * species trials (cli/trials.ts) and the feature probe (cli/probe.ts) both read, so a change to
 * the stage reaches both. It is open-grown (ADR 0062): `oakOpen`'s square 60 m box, open on all
 * four sides, the tree at its centre.
 */
export function loneTreeParams(species: string, seed?: number): Params {
  return mergeParams(presetParams("oakOpen", seed), {
    trees: [{ ...OPEN_GROWN_ROOT, species }],
  });
}

/**
 * `oakOpen`'s rules in the half-walled world it had before ADR 0062 (`HALF_WALLED`), its oak at
 * x 80: the species trials' base (cli/trials.ts), whose stands and shade house were calibrated
 * there.
 */
export function halfWalledParams(seed?: number): Params {
  return {
    ...presetParams("oakOpen", seed),
    world: { ...HALF_WALLED },
    trees: [{ x: 80, species: "oak" }],
  };
}

/**
 * Plate II (M19): an oak grown alone in the open, a new one for each seed. The garden swaps it
 * into its own worker, whose budget (ADR 0026, plate.ts) was set with this half-walled world; the
 * lab's open-grown box (about 530 MB in WASM, the open-box note) would not fit it. Whether the
 * garden's specimen takes the open-grown box is not decided (ADR 0062, ticket #115).
 */
export function specimenParams(seed: number): Params {
  return halfWalledParams(seed);
}
