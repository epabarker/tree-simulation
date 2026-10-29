/**
 * Retired presets (M26, ADR 0019): the M7 species types and the M9 mechanics demonstrations. They
 * predate the carbon balance and the calibrated flora (flora.ts), so the lab no longer offers them,
 * but the R2 and R3 evidence tests still grow them: no calibrated species has Massart's or
 * Aubréville's tiers, a weeping habit or Troll's straightening drawn this plainly. Their golden
 * hashes are kept under the same keys (tests/golden-cases.ts).
 */

import { level } from "./flora.ts";
import { defaultParams, mergeParams, type Params, type ParamsPatch } from "./params.ts";
import { type Preset, SKY, STAND_X } from "./presets.ts";

/**
 * The species keep the M7 resource scale and no carbon balance: under R1 their strong leaders
 * still reach the world's top or grow far too slender (M8 note), so they need their own R1
 * calibration (ROADMAP follow-up).
 */
const SPECIES_PRE_R1 = {
  c3: { mode: "bh", lambda: 0.5, alpha: 2 },
  r1: { enabled: false },
  r3: { enabled: false },
  r4: { enabled: false },
  r5: { enabled: false },
} satisfies ParamsPatch;

/**
 * M7 species (§9, ADR 0009): generic types named after a real example, with qualitative values.
 * Light knobs follow the ROADMAP anchors: k_ext higher for plagiotropic crowns (Kitajima et al.
 * 2004), the shedding floor T low for shade-tolerant and high for light-demanding species.
 */
const CONIFER = {
  ...SKY,
  ...SPECIES_PRE_R1,
  c2: { enabled: true, model: "slab", kExt: 0.6 },
  c5: { enabled: true, T: 0.02, Trel: 0.12 },
  // Whorls carry few tips, so the pipe model gives a thin trunk; a thicker tip radius brings
  // stand H/D to ≈ 78 (stand-grown conifers 60–80, Watt et al. 2023; M7 note).
  c6: { enabled: true, r0: 0.035 },
  r2: {
    enabled: true,
    levels: [
      // Massart: monopodial orthotropic trunk with a whorl at the start of each growth unit,
      level({ lambda: 0.58, setPoint: 0, eta: 0.4, generator: "whorled" }),
      // plagiotropic branches and branchlets in the plane of the tier.
      level({ lambda: 0.52, setPoint: 85, eta: 2, branchAngle: 80 }),
      level({ lambda: 0.5, setPoint: 90, eta: 0.5, branchAngle: 45 }),
    ],
  },
} satisfies ParamsPatch;

const BIRCH = {
  ...SKY,
  ...SPECIES_PRE_R1,
  c2: { enabled: true, model: "slab", kExt: 0.35 },
  c5: { enabled: true, T: 0.08, Trel: 0.2 },
  r2: {
    enabled: true,
    // Excurrent when young; apical control fades from age 15 (λ −0.06 over 20 seasons).
    aC: 15,
    dLambda: 0.06,
    ramp: 20,
    levels: [
      level({ lambda: 0.56, setPoint: 0, eta: 0.3 }),
      // Fine, steep laterals; the finest twigs hang (A_set > 90°).
      level({ lambda: 0.53, setPoint: 40, eta: 0.2, branchAngle: 35 }),
      level({ lambda: 0.5, setPoint: 120, eta: 0.25, branchAngle: 40 }),
    ],
  },
} satisfies ParamsPatch;

const TROPICAL = {
  ...SKY,
  ...SPECIES_PRE_R1,
  c2: { enabled: true, model: "slab", kExt: 0.6 },
  r2: {
    enabled: true,
    levels: [
      // Aubréville: orthotropic trunk with a tier every 7 nodes,
      level({ lambda: 0.6, setPoint: 0, eta: 0.5, generator: "whorled", tierEvery: 7 }),
      // plagiotropic sympodial modules: each season's shoot ends and two relays fork on.
      level({ lambda: 0.5, setPoint: 88, eta: 2, branchAngle: 20, generator: "whorled", pTerm: 1 }),
    ],
  },
} satisfies ParamsPatch;

/**
 * M9 R3 demonstrations (§9, ADR 0011), not yet calibrated species (ADR 0009 keeps willow and beech
 * for later). Both keep the sky presets' R1 and R3 and strengthen posture control.
 *
 * Weeping (willow-like, §9): an upright scaffold with hanging curtains. The trunk's posture holds it
 * vertical; limbs grow out at 50° but their reaction wood bends them toward 140°, and twigs grow and
 * set toward 150–175°, so limbs arch over and twigs hang (pendulous axes; the peach WEEP gene,
 * Hollender et al. 2018). A stiffer wood and thicker tips keep the slender trunk from buckling.
 */
const WEEPING = {
  ...SKY,
  c6: { enabled: true, r0: 0.03 },
  r3: { enabled: true, E: 2e6, c: 0.3, betaG: 0.2 },
  r2: {
    enabled: true,
    aC: 10,
    dLambda: 0.05,
    ramp: 15,
    levels: [
      level({ lambda: 0.53, setPoint: 0, eta: 0.4 }),
      level({ lambda: 0.5, setPoint: 50, eta: 0.3, branchAngle: 40, postureSetPoint: 140 }),
      level({ lambda: 0.5, setPoint: 150, eta: 1, branchAngle: 45, postureSetPoint: 175 }),
    ],
  },
} satisfies ParamsPatch;

/**
 * Troll's model (beech-like, §9: "Fagus type"): every axis grows plagiotropic, the trunk's leader
 * too (A_set 70°), and the trunk straightens secondarily because its posture set-point is vertical.
 * Without R3 the same tree sprawls (spec §9: "impossible without R3").
 */
const TROLL = {
  ...SKY,
  r3: { enabled: true, c: 0.15, betaG: 0.2 },
  r2: {
    enabled: true,
    levels: [
      level({ lambda: 0.52, setPoint: 70, eta: 0.5, postureSetPoint: 0 }),
      level({ lambda: 0.5, setPoint: 80, eta: 0.6, branchAngle: 45 }),
    ],
  },
} satisfies ParamsPatch;

export const fixtures = {
  conifer: {
    label: "M7: conifer (fir-like)",
    description:
      "Massart's model, as in Abies: a straight trunk with a tier of flat branches each season (§9).",
    patch: { world: { width: 120, height: 160, walls: [] }, trees: [{ x: 60 }], ...CONIFER },
  },
  coniferStand: {
    label: "M7: conifer stand",
    description: "Ten fir-like trees: narrow spires with clear boles (§9).",
    patch: { world: { width: 230, height: 160, walls: [] }, trees: STAND_X, ...CONIFER },
  },
  birch: {
    label: "M7: pioneer (birch-like)",
    description:
      "Light-demanding and slender, like Betula: a leader when young, fine steep branches, hanging twigs (§9).",
    patch: { world: { width: 120, height: 160, walls: [] }, trees: [{ x: 60 }], ...BIRCH },
  },
  birchStand: {
    label: "M7: pioneer stand",
    description: "Ten birch-like trees: open, slender crowns that lift fast (§9).",
    patch: { world: { width: 230, height: 160, walls: [] }, trees: STAND_X, ...BIRCH },
  },
  tropical: {
    label: "M7: tiered tropical tree (Terminalia-like)",
    description:
      "Aubréville's model, as in Terminalia catappa: a pagoda of flat tiers of forking branch modules (§9).",
    patch: { world: { width: 140, height: 160, walls: [] }, trees: [{ x: 70 }], ...TROPICAL },
  },
  weeping: {
    label: "M9: weeping form (willow-like)",
    description:
      "R3 mechanics: limbs arch over and twigs hang in curtains, because their reaction wood sets them toward pendulous angles (§9).",
    patch: { world: { width: 120, height: 120, walls: [] }, trees: [{ x: 60 }], ...WEEPING },
  },
  troll: {
    label: "M9: Troll straightening (beech-like)",
    description:
      "Troll's model, as in Fagus: the leader grows out sideways and the trunk rights itself behind it with reaction wood (§9).",
    patch: { world: { width: 120, height: 140, walls: [] }, trees: [{ x: 60 }], ...TROLL },
  },
} satisfies Record<string, Preset>;

export type FixtureName = keyof typeof fixtures;

export function fixtureParams(name: FixtureName, seed?: number): Params {
  const params = mergeParams(defaultParams, fixtures[name].patch);
  if (seed !== undefined) params.seed = seed;
  return params;
}

export function isFixtureName(name: string): name is FixtureName {
  return Object.hasOwn(fixtures, name);
}
