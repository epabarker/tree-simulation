// What a first-paint "picture" would weigh: the snapshot's drawn columns quantised (positions to
// 1/16 cell as u16, radius as u16 of 1/256 cell, parent as a delta varint, order, age and light as
// u8, the leafy buds as metamer deltas), gzipped. Against the full checkpoint and the raw snapshot.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { forestParams } from "../../../../src/core/presets.ts";
import { coreWasm, loadWorldsSync, RustWorld, snapshotTransferables } from "../../../../src/wasm/world.ts";

loadWorldsSync(readFileSync(coreWasm));

function varint(out: number[], v: number) {
  v = v >>> 0;
  while (v >= 128) { out.push((v & 127) | 128); v >>>= 7; }
  out.push(v);
}

for (const width of [66, 160, 220]) {
  const world = RustWorld.create(forestParams(width, 10));
  world.step(40, true);
  const s = world.snapshot(0, { junctions: false, field: false });
  const n = s.metamerCount;
  // Columns, each its own byte stream (gzip likes that), then concatenated.
  const u16 = (f: (j: number) => number) => { const a = new Uint16Array(n); for (let j = 0; j < n; j++) a[j] = Math.max(0, Math.min(65535, Math.round(f(j)))); return Buffer.from(a.buffer); };
  const u8 = (f: (j: number) => number) => { const a = new Uint8Array(n); for (let j = 0; j < n; j++) a[j] = Math.max(0, Math.min(255, Math.round(f(j)))); return Buffer.from(a.buffer); };
  const par: number[] = []; for (let j = 0; j < n; j++) varint(par, j - (s.parent[j] as number));
  const tree: number[] = []; let last = -1; for (let j = 0; j < n; j++) { const t = s.tree[j] as number; varint(tree, t === last ? 0 : t + 1); last = t; }
  const buds: number[] = []; let lastM = 0; for (let i = 0; i < s.budCount; i++) { varint(buds, (s.budMetamer[i] as number) - lastM); lastM = s.budMetamer[i] as number; buds.push(s.budState[i] as number); }
  const parts = [
    Buffer.from(par), Buffer.from(tree),
    u16((j) => s.x0[j] * 16), u16((j) => s.y0[j] * 16), u16((j) => s.z0[j] * 16),
    u16((j) => ((s.angle[j] + Math.PI) / (2 * Math.PI)) * 65535), u16((j) => s.length[j] * 4096),
    u16((j) => s.radius[j] * 256), u8((j) => s.order[j]), u8((j) => Math.min(255, s.age[j])), u8((j) => s.light[j] * 255),
    Buffer.from(buds),
  ];
  const raw = parts.reduce((a, b) => a + b.length, 0);
  const gz = gzipSync(Buffer.concat(parts), { level: 9 }).length;
  const snapBytes = snapshotTransferables(s).reduce((a: number, b: ArrayBuffer) => a + b.byteLength, 0);
  const snapGz = gzipSync(Buffer.from(snapshotTransferables(s)[0] as ArrayBuffer), { level: 9 }).length;
  const ckpt = gzipSync(world.save(), { level: 9 }).length;
  console.log(JSON.stringify({ width, metamers: n, buds: s.budCount, pictureRawKB: Math.round(raw / 1024), pictureGzKB: Math.round(gz / 1024), snapshotKB: Math.round(snapBytes / 1024), snapshotGzKB: Math.round(snapGz / 1024), checkpointGzKB: Math.round(ckpt / 1024) }));
  world.dispose();
}
