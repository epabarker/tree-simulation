/**
 * Calibrated species (M19, ADR 0016; docs/experiments/2026-10-27-m19-species.md). Each is a
 * SpeciesPatch over the woodland principles (the `forest` preset's, with R5's neighbour signal),
 * fitted on several patterns at once in a lone open-grown tree, a pure stand and a shade house:
 *
 * - **Shade tolerance** sets the light a seedling survives at. Niinemets & Valladares 2006 score
 *   birch 2.03, oak 2.45, beech 4.56 and silver fir 4.6 (of 0–5); tolerant saplings survive at
 *   ≈ 1–3% of full light, intolerant ones need 10–15% (Kobe et al. 1995), and oak saplings need
 *   over 20% to grow well where beech does at 10% (Ligot et al. 2013). In the model the survival
 *   light is Q_ss (r6.qMin): below it a resting bud holds no leaves and the seedling starves.
 * - **Leaf economics** follow the same axis (Hallik et al. 2009): light-demanding species have a
 *   higher photosynthetic capacity and respiration per leaf (α, m_f) and sparser crowns (a_ss),
 *   tolerant ones cheap leaves in deep, dense crowns that cast the deepest shade.
 * - **Form:** steep fine branches in birch, wide-angled decurrent limbs in oak (apical control
 *   fades early), Troll's straightening axes in beech, Massart's tiers in fir (§9, ADR 0009).
 *   Open-grown trees are squat and broad, stand-grown ones slender (H/D 60–80; Watt et al. 2023).
 * - **Life history** (O4): birch makes many small wind-borne seeds that need open ground and dies
 *   young; oak and beech make few heavy seeds that land close, and beech establishes in shade.
 *
 * M25 (docs/experiments/2026-10-28-m25-species.md) adds hornbeam, field maple, holly, rowan and
 * goat willow, fitted the same way, and Scots pine. Niinemets & Valladares score them pine 1.67,
 * willow 2.16, rowan 2.73, maple 3.18, holly 3.86 and hornbeam 3.97; their survival lights run
 * from pine (19%) through willow (13%, birch's), rowan (8%) and maple (5%) to hornbeam and holly
 * (3%). Holly and hornbeam cast the deepest shade, pine and willow the lightest.
 *
 * Labels are the field guide's: a common name, a Latin name and the leaf style the page draws.
 * Fir and pine are lab species; the home forest (`mixedWood`) mixes the other nine.
 *
 * M27b (ADR 0023): these hand-tuned species are kept as HAND_FLORA; the woodland now grows FLORA,
 * the species fitted to literature traits by CMA-ES with hand adjustments (flora-fitted.ts).
 */

import { FITTED_FLORA } from "./flora-fitted.ts";
import type { PaLevel, SpeciesPatch } from "./params.ts";

/** One R2 table row (ADR 0009); unspecified fields take baseline values. */
export const level = (row: Partial<PaLevel>): PaLevel => ({
  lambda: 0.5,
  setPoint: 0,
  eta: 0.15,
  branchAngle: 45,
  generator: "distichous",
  tierEvery: 0,
  pTerm: 0,
  ...row,
});

/**
 * The hand-tuned species of M19 and M25, as they were before M27 adopted the fitted ones (FLORA,
 * below). Kept for comparison and as a record of the reasoning in their comments.
 */
export const HAND_FLORA = {
  /** Pioneer: fast, light-demanding, short-lived, a light open crown (§9 "pioneer"). */
  birch: {
    common: "Silver birch",
    latin: "Betula pendula",
    leaf: "small",
    c3: { mode: "bh", lambda: 0.5, alpha: 4 },
    // Sheds limbs that get under 40% of the crown top's light, and wakes dormant buds only in
    // strong light: a clean bole in a stand, yet a lone birch keeps branches down its stem.
    c5: { enabled: true, T: 0.1, Trel: 0.4 },
    c6: { enabled: true, r0: 0.004125 },
    // A short hydraulic scale: birch levels off lower than oak and beech.
    r1: { mf: 0.1, Lh: 45 },
    r2: {
      enabled: true,
      aC: 15,
      dLambda: 0.06,
      ramp: 20,
      levels: [
        level({ lambda: 0.56, setPoint: 0, eta: 0.3 }),
        level({ lambda: 0.53, setPoint: 55, eta: 0.3, branchAngle: 45, postureSetPoint: 70 }),
        // The finest twigs hang.
        level({ lambda: 0.5, setPoint: 120, eta: 0.25, branchAngle: 40 }),
      ],
    },
    // Light leaves and little permanent sag, or the hanging twigs bow the slender leaders into
    // hoops; firm posture control keeps the leader upright while the limbs settle to 70°.
    r3: { leafMass: 0.001, phi: 0.5 },
    r4: { qRel: 0.3 },
    r6: { enabled: true, qMin: 0.12, leafArea: 1.6 },
    // Seed rain (ADR 0018): wind-borne seed from birches beyond the world reaches large gaps.
    o4: { cSeed: 2, d: 40, qEst: 0.25, pEst: 0.3, m0: 0.008, rain: 0.2 },
  },
  /** Mid-tolerant, long-lived, broad and decurrent when grown in the open. */
  oak: {
    common: "Pedunculate oak",
    latin: "Quercus robur",
    leaf: "oak",
    c3: { mode: "bh", lambda: 0.5, alpha: 3.5 },
    c5: { enabled: true, T: 0.05, Trel: 0.08 },
    r1: { mf: 0.08, Lh: 75 },
    r2: {
      enabled: true,
      // Apical control fades early, and acrotony favours the laterals at the top of each year's
      // shoot, so the trunk divides into a few big ascending limbs (decurrent, §R2.4).
      aC: 8,
      dLambda: 0.07,
      ramp: 15,
      kappa: 3,
      levels: [
        level({ lambda: 0.54, setPoint: 0, eta: 0.25 }),
        level({ lambda: 0.5, setPoint: 60, eta: 0.3, branchAngle: 55 }),
        level({ lambda: 0.5, setPoint: 75, eta: 0.2, branchAngle: 50 }),
      ],
    },
    // Dense, stiff wood and strong posture control: limbs reach out level instead of drooping.
    r3: { E: 2.5e6, c: 0.15, betaG: 0.2 },
    r6: { enabled: true, qMin: 0.07, leafArea: 1.6 },
    // Acorns: few, heavy, carried a little way by jays and mice.
    o4: { cSeed: 10, d: 25, qEst: 0.1, pEst: 0.3, m0: 0.002 },
  },
  /** Shade-tolerant late-successional: dense, deep crowns and the darkest shade. */
  beech: {
    common: "Beech",
    latin: "Fagus sylvatica",
    leaf: "beech",
    c5: { enabled: true, T: 0.01, Trel: 0.03 },
    r1: { mf: 0.035 },
    // Troll's model (§9): axes grow out sideways and the trunk straightens behind them.
    r2: {
      enabled: true,
      levels: [
        level({ lambda: 0.51, setPoint: 40, eta: 0.4, postureSetPoint: 0 }),
        level({ lambda: 0.5, setPoint: 55, eta: 0.4, branchAngle: 45 }),
        level({ lambda: 0.5, setPoint: 85, eta: 0.4, branchAngle: 45 }),
      ],
    },
    r3: { c: 0.15, betaG: 0.2 },
    r6: { enabled: true, qMin: 0.025, leafArea: 2.6 },
    o4: { cSeed: 10, d: 12, qEst: 0.03, pEst: 0.3, m0: 0.002 },
  },
  /** Shade-tolerant conifer, Massart's model (a lab species). */
  fir: {
    common: "Silver fir",
    latin: "Abies alba",
    leaf: "needle",
    c5: { enabled: true, T: 0.02, Trel: 0.25 },
    // Whorls carry few tips, so the pipe model needs thicker tips for a realistic H/D (M7).
    c6: { enabled: true, r0: 0.004375 },
    r1: { mf: 0.05, Lh: 50 },
    r2: {
      enabled: true,
      levels: [
        level({ lambda: 0.55, setPoint: 0, eta: 0.4, generator: "whorled" }),
        level({ lambda: 0.52, setPoint: 85, eta: 2, branchAngle: 80 }),
        level({ lambda: 0.5, setPoint: 90, eta: 0.5, branchAngle: 45 }),
      ],
    },
    r6: { enabled: true, qMin: 0.02, leafArea: 2.4 },
    o4: { cSeed: 6, d: 25, qEst: 0.02, pEst: 0.3, m0: 0.002 },
  },
  /** Shade-tolerant, slower than beech: a dense, rounded crown of fine, ascending limbs. */
  hornbeam: {
    common: "Hornbeam",
    latin: "Carpinus betulus",
    leaf: "hornbeam",
    c5: { enabled: true, T: 0.01, Trel: 0.02 },
    // Costlier leaves than beech's: less tolerant (3.97 against 4.56), so beech outgrows it in shade.
    r1: { mf: 0.045, Lh: 50 },
    // Troll's model, like beech (Hallé et al. 1978), with weaker apical control.
    r2: {
      enabled: true,
      aC: 20,
      dLambda: 0.05,
      ramp: 20,
      levels: [
        level({ lambda: 0.51, setPoint: 30, eta: 0.4, postureSetPoint: 0 }),
        level({ lambda: 0.5, setPoint: 50, eta: 0.4, branchAngle: 45 }),
        level({ lambda: 0.5, setPoint: 75, eta: 0.4, branchAngle: 45 }),
      ],
    },
    r3: { c: 0.15, betaG: 0.2 },
    r6: { enabled: true, qMin: 0.03, leafArea: 2.3 },
    // Winged nutlets on the wind, a little further than beechmast.
    o4: { cSeed: 5, d: 20, qEst: 0.04, pEst: 0.3, m0: 0.003 },
  },
  /** Mid-tolerant small tree: opposite buds, a low, rounded, dense crown. */
  maple: {
    common: "Field maple",
    latin: "Acer campestre",
    leaf: "maple",
    c3: { mode: "bh", lambda: 0.5, alpha: 3.2 },
    c5: { enabled: true, T: 0.02, Trel: 0.06 },
    // A lighter crown than beech's (fewer short-shoot leaves, M25 follow-up): its floor sits
    // between oak's and beech's; cheaper leaves and thicker tips keep saplings and stems as before.
    c6: { enabled: true, r0: 0.003 },
    r1: { mf: 0.04, Lh: 45, maturity: 30 },
    // Maple's buds are opposite and decussate: each pair turns 90° from the last, so only every
    // other pair lies in the plane. That is one bud a node, as distichous gives; the "opposite"
    // generator doubled the in-plane buds and cast a floor darker than beech's.
    r2: {
      enabled: true,
      aC: 12,
      dLambda: 0.06,
      ramp: 15,
      levels: [
        level({ lambda: 0.52, setPoint: 0, eta: 0.25 }),
        level({ lambda: 0.5, setPoint: 45, eta: 0.3, branchAngle: 45 }),
        level({ lambda: 0.5, setPoint: 65, eta: 0.25, branchAngle: 45 }),
      ],
    },
    // Hard, dense wood (as oak's): ascending limbs hold a rounded crown instead of sagging flat.
    r3: { E: 2.5e6, c: 0.15, betaG: 0.2 },
    r6: { enabled: true, qMin: 0.045, leafArea: 1.5 },
    o4: { cSeed: 5, d: 25, qEst: 0.05, pEst: 0.3, m0: 0.004 },
  },
  /** Evergreen understorey tree: a deep, dark, conical crown that keeps its lower limbs in shade. */
  holly: {
    common: "Holly",
    latin: "Ilex aquifolium",
    leaf: "holly",
    c3: { mode: "bh", lambda: 0.5, alpha: 2.6 },
    c5: { enabled: true, T: 0.01, Trel: 0.02 },
    c6: { enabled: true, r0: 0.00325 },
    // Evergreen leaves live several years, so their yearly cost is low; a short tree.
    r1: { mf: 0.03, Lh: 25, maturity: 30 },
    r2: {
      enabled: true,
      levels: [
        level({ lambda: 0.52, setPoint: 0, eta: 0.4 }),
        level({ lambda: 0.5, setPoint: 70, eta: 0.35, branchAngle: 60 }),
        level({ lambda: 0.5, setPoint: 75, eta: 0.25, branchAngle: 45 }),
      ],
    },
    r3: { c: 0.15, betaG: 0.2 },
    r6: { enabled: true, qMin: 0.03, leafArea: 2.6 },
    // Berries carried by thrushes; seedlings establish under trees and hedges. Holly is dioecious,
    // so only about half the trees fruit: twice the seed cost stands in for that.
    o4: { cSeed: 8, d: 40, qEst: 0.03, pEst: 0.3, m0: 0.003 },
  },
  /** Light-demanding small tree: steep, ascending limbs and an open, oval crown. */
  rowan: {
    common: "Rowan",
    latin: "Sorbus aucuparia",
    leaf: "rowan",
    c3: { mode: "bh", lambda: 0.5, alpha: 3.6 },
    c5: { enabled: true, T: 0.05, Trel: 0.2 },
    c6: { enabled: true, r0: 0.00325 },
    r1: { mf: 0.08, Lh: 38, maturity: 25 },
    r2: {
      enabled: true,
      aC: 12,
      dLambda: 0.05,
      ramp: 20,
      levels: [
        level({ lambda: 0.54, setPoint: 0, eta: 0.3 }),
        level({ lambda: 0.52, setPoint: 40, eta: 0.35, branchAngle: 35 }),
        level({ lambda: 0.5, setPoint: 60, eta: 0.25, branchAngle: 40 }),
      ],
    },
    r4: { qRel: 0.25 },
    r6: { enabled: true, qMin: 0.06, leafArea: 1.5 },
    // Berries carried far by birds; seedlings wait in light shade, saplings need a gap.
    o4: { cSeed: 3, d: 50, qEst: 0.06, pEst: 0.3, m0: 0.006 },
  },
  /** Pioneer: the most light-demanding, short-lived, a broad, many-limbed crown. */
  willow: {
    common: "Goat willow",
    latin: "Salix caprea",
    leaf: "willow",
    c3: { mode: "bh", lambda: 0.5, alpha: 5.5 },
    // Sheds less than birch: limbs stay low on a short, stout stem.
    c5: { enabled: true, T: 0.1, Trel: 0.25 },
    c6: { enabled: true, r0: 0.00375 },
    r1: { mf: 0.12, Lh: 30, maturity: 20 },
    // Weak apical control from early on: the stem soon divides into several spreading limbs.
    r2: {
      enabled: true,
      aC: 6,
      dLambda: 0.07,
      ramp: 10,
      levels: [
        level({ lambda: 0.52, setPoint: 0, eta: 0.25 }),
        level({ lambda: 0.5, setPoint: 55, eta: 0.25, branchAngle: 50 }),
        level({ lambda: 0.49, setPoint: 70, eta: 0.2, branchAngle: 45 }),
      ],
    },
    r4: { qRel: 0.3 },
    // Survives birch's shade, no deeper: Niinemets & Valladares score it 2.16, birch 2.03.
    r6: { enabled: true, qMin: 0.12, leafArea: 1.5 },
    // Tiny plumed seeds blow far but need bare, lit ground; a short life. Seed rain (ADR 0018)
    // brings willow back to clearings after it has died out in the wood.
    o4: { cSeed: 1.5, d: 60, qEst: 0.3, pEst: 0.3, m0: 0.012, rain: 1 },
  },
  /** Light-demanding pine, Rauh's model: whorls, a clean bole and a high crown (a lab species). */
  pine: {
    common: "Scots pine",
    latin: "Pinus sylvestris",
    leaf: "pine",
    c3: { mode: "bh", lambda: 0.5, alpha: 3.8 },
    // Sheds hard in a stand (a high crown on a clean bole), yet keeps low limbs in the open.
    c5: { enabled: true, T: 0.1, Trel: 0.3 },
    c6: { enabled: true, r0: 0.00375 },
    r1: { mf: 0.09, Lh: 60 },
    // Strong apical control while young, fading late: old pines' crowns flatten.
    r2: {
      enabled: true,
      aC: 30,
      dLambda: 0.06,
      ramp: 30,
      levels: [
        level({ lambda: 0.51, setPoint: 0, eta: 0.4, generator: "whorled" }),
        level({ lambda: 0.51, setPoint: 75, eta: 1.5, branchAngle: 70 }),
        level({ lambda: 0.5, setPoint: 80, eta: 0.4, branchAngle: 45 }),
      ],
    },
    r4: { qRel: 0.3 },
    r6: { enabled: true, qMin: 0.15, leafArea: 1.4 },
    // Winged seeds from cones; seedlings need open ground.
    o4: { cSeed: 3, d: 40, qEst: 0.3, pEst: 0.3, m0: 0.003 },
  },
} satisfies Record<string, SpeciesPatch>;

/**
 * The species the woodland presets grow (M27b, ADR 0023): the round-2 CMA-ES fits to literature
 * traits with hand adjustments (flora-fitted.ts, generated). They grow with the hyperbolic
 * hydraulic discount (ADR 0021) and a juvenile phase (ADR 0022), set in each patch.
 */
/**
 * I2 (ADR 0025): the fitted species as they grow in 3D. Two things the 2D fits could not hold:
 * - **Phyllotaxis**, a species trait the plane could not draw (2D's only planar sequence was
 *   distichous): every distichous row takes the species' own, whorls stay. Spiral alternate
 *   (2/5) in birch, oak, holly, rowan, goat willow and Scots pine's laterals; distichous in beech,
 *   hornbeam and silver fir's flat sprays; decussate in field maple.
 * - **Stiffness:** wood's own E (4·10⁶ in the model's units) for every species, where 2D had
 *   lowered it (1–2.5·10⁶) for limbs that carried less foliage than a real one (ADR 0011).
 *   Species' own stiffnesses are calibration's (C2).
 */
const PHYLLOTAXIS: Record<keyof typeof FITTED_FLORA, PaLevel["generator"]> = {
  birch: "spiral",
  beech: "distichous",
  oak: "spiral",
  fir: "distichous",
  hornbeam: "distichous",
  maple: "opposite",
  holly: "spiral",
  rowan: "spiral",
  willow: "spiral",
  pine: "spiral",
};

function in3d<T extends SpeciesPatch>(name: keyof typeof FITTED_FLORA, sp: T): T {
  const levels = sp.r2?.levels?.map((l) =>
    l.generator === "distichous" ? { ...l, generator: PHYLLOTAXIS[name] } : l,
  );
  return {
    ...sp,
    ...(sp.r2 ? { r2: { ...sp.r2, ...(levels ? { levels } : {}) } } : {}),
    ...(sp.r3 ? { r3: { ...sp.r3, E: 4e6 } } : {}),
  };
}

export const FLORA = Object.fromEntries(
  Object.entries(FITTED_FLORA).map(([name, sp]) => [
    name,
    in3d(name as keyof typeof FITTED_FLORA, sp),
  ]),
) as typeof FITTED_FLORA;

export type FloraName = keyof typeof FLORA;
