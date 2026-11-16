/** The arms trace B reads (cli/seedling-stubs-probe.ts' s3d, restated: importing it would run it). */
import type { Patch } from "../../../../cli/shared.ts";

const o4 = (o: Record<string, unknown>): Patch => ({ params: { o4: o } as Patch["params"] });

export const ARMS_FOR_TRACE: Record<string, Patch> = {
  s3d: o4({ stubs: true, stubLight: 0.15, stubDeath: 3, stubDemote: 0.075 }),
};
