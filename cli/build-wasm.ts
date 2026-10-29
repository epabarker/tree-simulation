/**
 * Builds the Rust core for the page and Node (ADR 0024): `cargo build` for wasm32 with WASM SIMD
 * (simd128), then wasm-bindgen, into src/wasm/pkg/ (generated, not committed).
 * Run by `npm run check` and the tests, so the TypeScript that imports a package always sees the
 * current Rust.
 *
 *   node cli/build-wasm.ts
 *
 * wasm-bindgen's CLI must match the crate's version exactly; the error says how to install it.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url).pathname;
const lock = readFileSync(`${root}rust/Cargo.lock`, "utf8");
const want = /name = "wasm-bindgen"\nversion = "([^"]+)"/.exec(lock)?.[1];

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

let have = "";
try {
  have = run("wasm-bindgen", ["--version"]).trim().split(" ")[1] ?? "";
} catch {
  // reported below
}
if (!want || have !== want) {
  console.error(
    `wasm-bindgen ${want} is needed (found ${have || "none"}): cargo install wasm-bindgen-cli --version ${want} --locked`,
  );
  process.exit(1);
}

const kb = (n: number) => (n / 1024).toFixed(1);

/** The build: cargo into its own target directory (so it does not rebuild the native one). */
function build(name: string, features: string[], rustflags: string): void {
  const target = `rust/target/${name}`;
  execFileSync(
    "cargo",
    [
      "build",
      "--quiet",
      "--release",
      "--locked",
      "--target",
      "wasm32-unknown-unknown",
      "--manifest-path",
      "rust/Cargo.toml",
      "--target-dir",
      target,
      "-p",
      "tree-wasm",
      ...features,
    ],
    {
      cwd: root,
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env, RUSTFLAGS: rustflags },
    },
  );
  const raw = `${root}${target}/wasm32-unknown-unknown/release/tree_wasm.wasm`;
  const dir = `src/wasm/${name}`;
  run("wasm-bindgen", [
    "--target",
    "web",
    "--remove-name-section",
    "--remove-producers-section",
    "--out-dir",
    dir,
    "--out-name",
    "core",
    raw,
  ]);
  const out = readFileSync(`${root}${dir}/core_bg.wasm`);
  console.log(
    `${dir}/core_bg.wasm: ${kb(statSync(raw).size)} kB from cargo, ${kb(out.length)} kB after wasm-bindgen, ${kb(gzipSync(out, { level: 9 }).length)} kB gzip`,
  );
}

build("pkg", [], "-C target-feature=+simd128");
