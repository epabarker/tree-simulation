/**
 * The garden build (ADR 0014): `garden.js` and its worker, for a host page to import, without the
 * lab's panel and charts. `npm run build:garden` writes dist-garden/; scripts/size-gate.ts checks it.
 */

import { defineConfig } from "vite";

export default defineConfig({
  // Relative URLs: the worker and chunks resolve next to garden.js, wherever the host serves it.
  base: "./",
  worker: { format: "es" },
  build: {
    outDir: "dist-garden",
    emptyOutDir: true,
    target: "es2023",
    sourcemap: true,
    rollupOptions: {
      input: { garden: "src/web/garden.ts" },
      preserveEntrySignatures: "strict",
      output: { entryFileNames: "[name].js" },
    },
  },
});
