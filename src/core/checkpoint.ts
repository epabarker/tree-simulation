/**
 * World checkpoints (M21): a whole world as bytes, so a page can open on a grown forest and keep
 * growing it, and the CLI can save one at a chosen season. Restoring at season N and running k
 * seasons gives the same world, hash for hash, as running N + k from scratch.
 *
 * Layout: a little-endian u32 header length, a JSON header (params, season, flags, event log and
 * queue, each tree's scalar fields and table lengths), padding to 8 bytes, then for each tree its
 * metamer columns and its bud columns in schema order, each the rows in use, padded to 8 bytes.
 * Only what carries from one season to the next is kept: the light field, the owner grid and the
 * per-season scratch are rebuilt by the season that reads them. Compression is the caller's (the
 * page's CompressionStream, the CLI's zlib), so the core stays free of both.
 */

import type { Params } from "./params.ts";
import { BUD_SCHEMA, METAMER_SCHEMA, Tree } from "./tree.ts";
import { type RunEvent, World } from "./world.ts";

const VERSION = 1;

type Scalar = number | boolean | string;

interface TreeHeader {
  id: number;
  rootX: number;
  /** Every number, boolean and string field of the tree (alive, age, reserve, …). */
  scalars: Record<string, Scalar>;
  metamers: number;
  buds: number;
}

interface Header {
  version: number;
  initialParams: Params;
  params: Params;
  season: number;
  recruits: number;
  storm: boolean;
  log: RunEvent[];
  pending: RunEvent[];
  trees: TreeHeader[];
}

type Column = Float64Array | Int32Array | Uint8Array;

const pad8 = (n: number): number => (n + 7) & ~7;

/**
 * JSON as ASCII bytes: anything beyond ASCII is written as a \uXXXX escape, which JSON reads
 * back unchanged, so the core needs no text codec (it has neither DOM nor Node).
 */
function asciiJson(value: unknown): Uint8Array {
  const text = JSON.stringify(value).replace(
    /[\u007f-\uffff]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i);
  return out;
}

function readAscii(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return text;
}

function scalarsOf(tree: Tree): Record<string, Scalar> {
  const out: Record<string, Scalar> = {};
  for (const [key, value] of Object.entries(tree)) {
    if (key === "id" || key === "rootX") continue;
    const t = typeof value;
    if (t === "number" || t === "boolean" || t === "string") out[key] = value as Scalar;
  }
  return out;
}

/** The world as checkpoint bytes. */
export function saveWorld(world: World): Uint8Array {
  const header: Header = {
    version: VERSION,
    initialParams: world.initialParams,
    params: world.params,
    season: world.season,
    recruits: world.recruits,
    storm: world.storm,
    log: world.log,
    pending: [...world.queued],
    trees: world.trees.map((t) => ({
      id: t.id,
      rootX: t.rootX,
      scalars: scalarsOf(t),
      metamers: t.m.length,
      buds: t.b.length,
    })),
  };
  const json = asciiJson(header);
  const columns: Column[] = [];
  for (const t of world.trees) {
    for (const name of Object.keys(METAMER_SCHEMA)) {
      columns.push((t.m.cols as Record<string, Column>)[name]?.subarray(0, t.m.length) as Column);
    }
    for (const name of Object.keys(BUD_SCHEMA)) {
      columns.push((t.b.cols as Record<string, Column>)[name]?.subarray(0, t.b.length) as Column);
    }
  }
  let size = pad8(4 + json.length);
  for (const c of columns) size += pad8(c.byteLength);
  const out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, json.length, true);
  out.set(json, 4);
  let at = pad8(4 + json.length);
  for (const c of columns) {
    out.set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength), at);
    at += pad8(c.byteLength);
  }
  return out;
}

/** A world from checkpoint bytes, ready to step on from the saved season. */
export function loadWorld(bytes: Uint8Array): World {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const jsonLength = view.getUint32(0, true);
  const header = JSON.parse(readAscii(bytes.subarray(4, 4 + jsonLength))) as Header;
  if (header.version !== VERSION) throw new Error(`Unknown checkpoint version ${header.version}`);
  let at = pad8(4 + jsonLength);
  // Copies the next column's bytes into `target` (aligned, so a typed view over them is safe).
  const fill = (target: Column, rows: number): void => {
    const n = rows * target.BYTES_PER_ELEMENT;
    new Uint8Array(target.buffer, target.byteOffset, n).set(bytes.subarray(at, at + n));
    at += pad8(n);
  };
  const trees = header.trees.map((h) => {
    const tree = new Tree(h.id, h.rootX);
    Object.assign(tree, h.scalars);
    tree.m.grow(h.metamers);
    tree.m.length = h.metamers;
    for (const name of Object.keys(METAMER_SCHEMA)) {
      fill((tree.m.cols as Record<string, Column>)[name] as Column, h.metamers);
    }
    tree.b.grow(h.buds);
    tree.b.length = h.buds;
    for (const name of Object.keys(BUD_SCHEMA)) {
      fill((tree.b.cols as Record<string, Column>)[name] as Column, h.buds);
    }
    return tree;
  });
  const world = new World(header.initialParams);
  world.restoreState({
    params: header.params,
    season: header.season,
    recruits: header.recruits,
    storm: header.storm,
    log: header.log,
    pending: header.pending,
    trees,
  });
  return world;
}
