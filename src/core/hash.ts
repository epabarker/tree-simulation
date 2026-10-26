/**
 * A fingerprint of the whole simulation state, for golden tests (AGENTS.md: goldens change only
 * intentionally). FNV-1a over the raw bytes of every table column, in schema order.
 */

import type { World } from "./world.ts";

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

function fnvBytes(h: number, bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

function fnvInt(h: number, value: number): number {
  for (let s = 0; s < 32; s += 8) {
    h ^= (value >>> s) & 0xff;
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

/** Hashes the first `length` rows of every column. (All typed arrays share the members used.) */
function hashTable(h: number, table: { length: number; cols: object }): number {
  h = fnvInt(h, table.length);
  for (const col of Object.values(table.cols) as Float64Array[]) {
    h = fnvBytes(
      h,
      new Uint8Array(col.buffer, col.byteOffset, table.length * col.BYTES_PER_ELEMENT),
    );
  }
  return h;
}

export function hashWorld(world: World): string {
  let h = fnvInt(FNV_OFFSET, world.season);
  for (const tree of world.trees) {
    h = fnvInt(h, tree.id);
    h = fnvInt(h, tree.alive ? 1 : 0);
    h = hashTable(h, tree.m);
    h = hashTable(h, tree.b);
  }
  return h.toString(16).padStart(8, "0");
}
