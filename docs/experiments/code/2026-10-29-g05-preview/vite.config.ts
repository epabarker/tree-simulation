/** The G0.5/G1 preview pages: `npx vite build -c docs/experiments/code/2026-10-29-g05-preview/vite.config.ts`. */
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = import.meta.dirname;
const out = process.env.PREVIEW_OUT ?? resolve(here, "../../../../runs/preview-3d");

export default defineConfig({
  root: here,
  base: "./",
  publicDir: process.env.PREVIEW_PUBLIC ?? resolve(here, "../../../../runs/preview-3d-public"),
  worker: { format: "es" },
  build: {
    outDir: out,
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: {
      input: { index: resolve(here, "index.html"), kernel: resolve(here, "kernel.html"), proto: resolve(here, "proto.html"), g3: resolve(here, "g3.html") },
    },
  },
});
