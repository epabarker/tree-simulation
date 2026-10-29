/**
 * The evidence tests with every numeric comparison logged (margins-setup.ts), for one build:
 *   TREE_BUILD=production MARGINS_OUT=runs/margins/production.jsonl \
 *     npx vitest run -c docs/experiments/code/2026-10-30-production-thresholds/vitest.config.ts
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: fileURLToPath(new URL("../../../..", import.meta.url)),
    include: ["tests/evidence/**/*.test.ts"],
    environment: "node",
    testTimeout: 300_000,
    setupFiles: [fileURLToPath(new URL("./margins-setup.ts", import.meta.url))],
  },
});
