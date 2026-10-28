/**
 * Crown form and allometry (M26; spec §9 species character, §10 validation targets).
 *
 * The measures that tell species apart by shape, and the §10 allometries that should emerge
 * whatever the species: the crown's width profile by height (cone, ellipse, column, vase), apical
 * control (where the trunk forks, how much thicker the leader stays than its laterals), branch
 * angles by order, limb droop, the junction exponent Δ, the length–diameter slope of limbs
 * (l ∝ d^(2/3) under elastic similarity; McMahon & Kronauer 1976) and the leaf-area–section-area
 * slope (≈ 1 by the pipe model; Shinozaki et al. 1964).
 *
 * Costlier than `treeMetrics` (a few O(M) passes and a median), so the CLI writes them only at
 * snapshot seasons (form.csv). Reads the tables only; nothing here touches the simulation.
 */

import type { Params } from "./params.ts";
import { isLiveBud } from "./principles/c3-allocation.ts";
import { junctionExponents } from "./principles/c6-girth.ts";
import { depositArea } from "./principles/r6-short-shoots.ts";
import { Slot, type Tree } from "./tree.ts";

/** Height bands in the crown profile. */
export const PROFILE_BANDS = 10;
/** A lateral this thick, relative to the continuation, takes over the trunk (forkHeight). */
const FORK_RATIO = 0.7;
/** Limbs and sections need this many metamers above them to count (tips are all r₀). */
const MIN_SUBTREE = 5;
/** First-order limbs need this many metamers on their axis for droop and upturn (M9). */
const MIN_LIMB = 10;

export interface FormMetrics {
  /** Relative crown height (0 = crown base, 1 = top) of the widest profile band. */
  widestAt: number;
  /** Width-weighted mean relative height of the profile: cone 1/3, ellipse or column 1/2. */
  profileCentre: number;
  /** Mean of the profile (each band's width over the widest): triangle 0.5, ellipse ≈ 0.79, column 1. */
  crownFullness: number;
  /**
   * Relative height where a lateral of ≥ 5 metamers first reaches 0.7 × the trunk's continuation
   * in radius, or where the trunk ends under its laterals; 1 if neither (excurrent to the top).
   */
  forkHeight: number;
  /** Median, over trunk nodes in the crown with a limb of ≥ 5 metamers, of continuation radius / thickest lateral radius. */
  leaderDominance: number;
  /** Mean angle from vertical, degrees, of second-order axes where they leave their first-order limb. */
  branchAngle2: number;
  /** Median droop and upturn, degrees, of first-order limbs of ≥ 10 metamers (M9's measure). */
  limbDroop: number;
  limbUpturn: number;
  /** Median Leonardo exponent Δ over the junctions (§10: 1.8–2.3). */
  junctionDelta: number;
  /** Slope of log reach on log base diameter over order-1 and order-2 limbs (§10: 2/3). */
  ldSlope: number;
  /** Slope of log leaf area above a section on log pipe section area (§10: ≈ 1). */
  leafStemSlope: number;
  /** The crown's width in each of PROFILE_BANDS height bands, over the widest band. */
  profile: number[];
}

export const FORM_COLUMNS = [
  "widestAt",
  "profileCentre",
  "crownFullness",
  "forkHeight",
  "leaderDominance",
  "branchAngle2",
  "limbDroop",
  "limbUpturn",
  "junctionDelta",
  "ldSlope",
  "leafStemSlope",
] as const satisfies readonly (keyof FormMetrics)[];

/** Elevation of a direction above the horizontal, degrees, whichever side it heads. */
const elevation = (a: number) => (Math.atan2(Math.sin(a), Math.abs(Math.cos(a))) * 180) / Math.PI;
/** Angle of a direction from straight up, degrees. */
const fromVertical = (a: number) =>
  Math.acos(Math.max(-1, Math.min(1, Math.sin(a)))) * (180 / Math.PI);

function median(xs: number[]): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 === 1 ? (s[k] as number) : ((s[k - 1] as number) + (s[k] as number)) / 2;
}

/** Ordinary least-squares slope of y on x; NaN with fewer than 5 points or no spread in x. */
export function olsSlope(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 5) return Number.NaN;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += x[i] as number;
    my += y[i] as number;
  }
  mx /= n;
  my /= n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    const dx = (x[i] as number) - mx;
    sxy += dx * ((y[i] as number) - my);
    sxx += dx * dx;
  }
  return sxx > 1e-12 ? sxy / sxx : Number.NaN;
}

/** Per first-order limb of ≥ 10 metamers: droop (base − lowest elevation), upturn (tip − lowest), degrees. */
export function limbShapes(tree: Tree): { droop: number; upturn: number }[] {
  const c = tree.m.cols;
  const axes = new Map<number, number[]>();
  for (let i = 0; i < tree.m.length; i++) {
    if (c.order[i] !== 1) continue;
    const list = axes.get(c.axis[i]) ?? [];
    list.push(elevation(c.angle[i] as number));
    axes.set(c.axis[i], list);
  }
  return [...axes.values()]
    .filter((e) => e.length >= MIN_LIMB)
    .map((e) => {
      const low = Math.min(...e);
      return { droop: (e[0] as number) - low, upturn: (e[e.length - 1] as number) - low };
    });
}

/**
 * The crown's width in `bands` height bands between the crown base (the lowest first-order
 * branch, as `boleHeight`) and the top, each over the widest band. Tips are binned by height.
 */
export function crownProfile(tree: Tree, bands = PROFILE_BANDS): number[] {
  const nm = tree.m.length;
  const c = tree.m.cols;
  let height = 0;
  let bole = Number.POSITIVE_INFINITY;
  for (let i = 0; i < nm; i++) {
    const y = tree.tipY(i);
    if (y > height) height = y;
    const p = c.parent[i];
    if (c.order[i] === 1 && p >= 0 && c.order[p] === 0 && c.baseY[i] < bole) bole = c.baseY[i];
  }
  if (!Number.isFinite(bole) || bole >= height) bole = 0;
  const lo = new Float64Array(bands).fill(Number.POSITIVE_INFINITY);
  const hi = new Float64Array(bands).fill(Number.NEGATIVE_INFINITY);
  const span = height - bole;
  for (let i = 0; i < nm && span > 0; i++) {
    const y = tree.tipY(i);
    if (y < bole) continue;
    const k = Math.min(bands - 1, Math.floor(((y - bole) / span) * bands));
    const x = tree.tipX(i);
    if (x < lo[k]) lo[k] = x;
    if (x > hi[k]) hi[k] = x;
  }
  const widths: number[] = [];
  let widest = 0;
  for (let k = 0; k < bands; k++) {
    const w = hi[k] > lo[k] ? hi[k] - lo[k] : 0;
    widths.push(w);
    if (w > widest) widest = w;
  }
  return widths.map((w) => (widest > 0 ? w / widest : 0));
}

/** Form metrics of one tree; `params` are the tree's own (World.paramsOf) for its leaf areas. */
export function formMetrics(tree: Tree, params: Params): FormMetrics {
  const nm = tree.m.length;
  const c = tree.m.cols;
  const profile = crownProfile(tree);
  let widestAt = Number.NaN;
  let sumW = 0;
  let sumWH = 0;
  let best = -1;
  profile.forEach((w, k) => {
    const h = (k + 0.5) / profile.length;
    sumW += w;
    sumWH += w * h;
    if (w > best) {
      best = w;
      widestAt = h;
    }
  });

  // Subtree metamer counts, leaf area above each metamer, and the farthest path to a tip.
  const count = new Int32Array(nm);
  const leaf = new Float64Array(nm);
  const dist = new Float64Array(nm); // path length from the root base to each tip
  const reach = new Float64Array(nm); // farthest tip in the subtree, as a path from the root base
  for (let i = 0; i < nm; i++) {
    const p = c.parent[i];
    dist[i] = (p >= 0 ? dist[p] : 0) + c.length[i];
  }
  const b = tree.b.cols;
  for (let j = 0; j < tree.b.length; j++) {
    if (isLiveBud(b.state[j])) leaf[b.metamer[j]] += depositArea(b.state[j], params.r6);
  }
  for (let i = nm - 1; i >= 0; i--) {
    count[i] += 1;
    if (dist[i] > reach[i]) reach[i] = dist[i];
    const p = c.parent[i];
    if (p < 0) continue;
    count[p] += count[i];
    leaf[p] += leaf[i];
    if (reach[i] > reach[p]) reach[p] = reach[i];
  }

  // Children by slot, for the walk up the trunk.
  const mainChild = new Int32Array(nm).fill(-1);
  /** Thickest lateral child with ≥ MIN_SUBTREE metamers above it (young tips are all r₀). */
  const thickestLateral = new Float64Array(nm);
  const anyLateral = new Uint8Array(nm);
  let height = 0;
  let bole = Number.POSITIVE_INFINITY;
  for (let i = 0; i < nm; i++) {
    const y = tree.tipY(i);
    if (y > height) height = y;
    const p = c.parent[i];
    if (p < 0) continue;
    if (c.slot[i] === Slot.main) mainChild[p] = i;
    else {
      anyLateral[p] = 1;
      if (count[i] >= MIN_SUBTREE && c.radius[i] > thickestLateral[p]) {
        thickestLateral[p] = c.radius[i];
      }
    }
    if (c.order[i] === 1 && c.order[p] === 0 && c.baseY[i] < bole) bole = c.baseY[i];
  }
  if (!Number.isFinite(bole)) bole = height;

  let forkHeight = 1;
  const dominance: number[] = [];
  for (let i = nm > 0 ? 0 : -1; i >= 0; i = mainChild[i]) {
    const next = mainChild[i];
    const y = tree.tipY(i);
    if (next < 0 || c.order[next] !== 0) {
      // The trunk ends here: a fork if laterals carry on above it.
      if (anyLateral[i] && forkHeight === 1 && height > 0) forkHeight = y / height;
      break;
    }
    if (thickestLateral[i] <= 0) continue;
    const ratio = thickestLateral[i] / c.radius[next];
    if (ratio >= FORK_RATIO && forkHeight === 1 && height > 0) forkHeight = y / height;
    if (y >= bole) dominance.push(c.radius[next] / thickestLateral[i]);
  }

  // Limbs: the first metamer of each order-1 and order-2 axis with enough above it.
  const logD: number[] = [];
  const logL: number[] = [];
  let angle2 = 0;
  let n2 = 0;
  for (let i = 0; i < nm; i++) {
    const p = c.parent[i];
    if (p < 0 || c.slot[i] === Slot.main) continue;
    if (c.order[i] === 2 && c.order[p] === 1) {
      angle2 += fromVertical(c.angle[i]);
      n2 += 1;
    }
    if ((c.order[i] === 1 || c.order[i] === 2) && count[i] >= MIN_SUBTREE && c.radius[i] > 0) {
      logD.push(Math.log(2 * c.radius[i]));
      logL.push(Math.log(reach[i] - dist[p]));
    }
  }

  // Sections: every metamer with enough above it and leaves above it; the pipe radius only.
  const logA: number[] = [];
  const logLeaf: number[] = [];
  for (let i = 0; i < nm; i++) {
    const r = c.radius[i] - c.stressWood[i];
    if (count[i] < MIN_SUBTREE || leaf[i] <= 0 || r <= 0) continue;
    logA.push(Math.log(Math.PI * r * r));
    logLeaf.push(Math.log(leaf[i]));
  }

  const shapes = limbShapes(tree);
  return {
    widestAt,
    profileCentre: sumW > 0 ? sumWH / sumW : Number.NaN,
    crownFullness: profile.length > 0 ? sumW / profile.length : Number.NaN,
    forkHeight,
    leaderDominance: median(dominance),
    branchAngle2: n2 > 0 ? angle2 / n2 : Number.NaN,
    limbDroop: median(shapes.map((s) => s.droop)),
    limbUpturn: median(shapes.map((s) => s.upturn)),
    junctionDelta: median(junctionExponents(tree)),
    ldSlope: olsSlope(logD, logL),
    leafStemSlope: olsSlope(logA, logLeaf),
    profile,
  };
}
