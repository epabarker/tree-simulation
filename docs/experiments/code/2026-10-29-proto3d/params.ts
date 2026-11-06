/** THROWAWAY PROTOTYPE. The `forest` planting with only C1–C6 and R1: what the prototype implements. */
import { mergeParams, type Params } from "../../../../src/core/params.ts";
import { presetParams } from "../../../../src/core/presets.ts";

/**
 * `r6`: also R6 (short shoots; dormant buds leafless), which needs no prototype code (its
 * functions are imported) and lets the stand grow past the subset's plateau at height 48.
 */
export function protoParams(seed = 1, r6 = false): Params {
  const base = presetParams("forest", seed);
  return mergeParams(base, {
    r2: { enabled: false },
    r3: { enabled: false },
    r4: { enabled: false },
    r5: { enabled: false },
    r6: { enabled: r6 },
    o2: { enabled: false, stormP: 0 },
    o4: { enabled: false },
  });
}
