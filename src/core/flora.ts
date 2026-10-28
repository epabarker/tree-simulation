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
 * Labels are the field guide's: a common name, a Latin name and the leaf style the page draws.
 * Conifer (fir) is a lab species; the home forest mixes birch, oak and beech.
 */

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

export const FLORA = {
  /** Pioneer: fast, light-demanding, short-lived, a light open crown (§9 "pioneer"). */
  birch: {
    common: "Silver birch",
    latin: "Betula pendula",
    leaf: "small",
    c3: { mode: "bh", lambda: 0.5, alpha: 4 },
    // Sheds dim limbs early and wakes dormant buds only in strong light: a clean bole in a stand.
    c5: { enabled: true, T: 0.12, Trel: 0.6 },
    c6: { enabled: true, r0: 0.033 },
    // A short hydraulic scale: birch levels off lower than oak and beech.
    r1: { mf: 0.1, Lh: 45 },
    r2: {
      enabled: true,
      aC: 15,
      dLambda: 0.06,
      ramp: 20,
      levels: [
        level({ lambda: 0.56, setPoint: 0, eta: 0.3 }),
        level({ lambda: 0.53, setPoint: 55, eta: 0.3, branchAngle: 45 }),
        // The finest twigs hang.
        level({ lambda: 0.5, setPoint: 120, eta: 0.25, branchAngle: 40 }),
      ],
    },
    // Slender trunks need firm posture control, or the hanging twigs bow them into hoops.
    r3: { leafMass: 0.001, phi: 0.5 },
    r4: { qRel: 0.3 },
    r6: { enabled: true, qMin: 0.12, leafArea: 1.6 },
    o4: { cSeed: 2, d: 40, qEst: 0.25, pEst: 0.3, m0: 0.008 },
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
      // Apical control fades early, so the crown breaks up into wide-angled limbs.
      aC: 8,
      dLambda: 0.07,
      ramp: 15,
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
    c6: { enabled: true, r0: 0.035 },
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
} satisfies Record<string, SpeciesPatch>;

export type FloraName = keyof typeof FLORA;
