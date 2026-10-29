/** I1's preview page: `npx vite build -c docs/experiments/code/2026-10-29-i1/preview/vite.config.ts`. */
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = import.meta.dirname;

export default defineConfig({
  root: here,
  base: "./",
  build: {
    outDir: process.env.PREVIEW_OUT ?? resolve(here, "../../../../../runs/preview-i1"),
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: { input: { i1: resolve(here, "i1.html") } },
  },
  server: { fs: { allow: [resolve(here, "../../../../..")] } },
});
