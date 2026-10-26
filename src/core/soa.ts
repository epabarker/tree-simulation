/**
 * Structure-of-arrays tables (spec §5): one typed array per column, rows addressed by index.
 *
 * Rows are only ever appended, and `compact` removes rows while keeping the order of the rest.
 * Together these keep a tree's metamers in parent-before-child order for free, and keep each
 * table's stable `birthId` column sorted ascending.
 */

type TypedArrayCtor =
  | Float64ArrayConstructor
  | Float32ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Int8ArrayConstructor
  | Uint8ArrayConstructor;

export type Schema = Record<string, TypedArrayCtor>;
export type Columns<S extends Schema> = { -readonly [K in keyof S]: InstanceType<S[K]> };

type AnyColumn = InstanceType<TypedArrayCtor>;

export class Table<S extends Schema> {
  length = 0;
  capacity: number;
  readonly cols: Columns<S>;
  private readonly schema: S;

  constructor(schema: S, capacity = 64) {
    this.schema = schema;
    this.capacity = Math.max(1, capacity);
    const cols: Record<string, AnyColumn> = {};
    for (const name of Object.keys(schema)) {
      const Ctor = schema[name];
      cols[name] = new Ctor(this.capacity);
    }
    this.cols = cols as Columns<S>;
  }

  /** Appends a zeroed row and returns its index. Re-read `cols` columns after calling: they may be reallocated. */
  add(): number {
    if (this.length === this.capacity) this.grow(this.capacity * 2);
    const i = this.length++;
    for (const col of Object.values(this.cols) as AnyColumn[]) col[i] = 0;
    return i;
  }

  grow(capacity: number): void {
    if (capacity <= this.capacity) return;
    const cols = this.cols as Record<string, AnyColumn>;
    for (const name of Object.keys(this.schema)) {
      const Ctor = this.schema[name];
      const next = new Ctor(capacity);
      next.set(cols[name] as never);
      cols[name] = next;
    }
    this.capacity = capacity;
  }

  /**
   * Removes rows whose `keep` flag is 0, keeping the order of the others.
   * Returns old index → new index (-1 for removed rows), for remapping references.
   */
  compact(keep: Uint8Array): I32 {
    const n = this.length;
    const oldToNew = new Int32Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) oldToNew[i] = keep[i] ? j++ : -1;
    if (j === n) return oldToNew;
    for (const col of Object.values(this.cols) as AnyColumn[]) {
      for (let i = 0; i < n; i++) {
        const t = oldToNew[i];
        if (t >= 0) col[t] = col[i];
      }
    }
    this.length = j;
    return oldToNew;
  }

  clear(): void {
    this.length = 0;
  }
}

// Typed arrays over plain (non-shared) buffers, as created by `new Float64Array(n)`.
export type F64 = Float64Array<ArrayBuffer>;
export type F32 = Float32Array<ArrayBuffer>;
export type I32 = Int32Array<ArrayBuffer>;
export type U8 = Uint8Array<ArrayBuffer>;

/** Grows a scratch array to at least `n` elements, discarding its contents. */
export function ensureFloat64(a: F64, n: number): F64 {
  return a.length >= n ? a : new Float64Array(Math.max(n, a.length * 2));
}

export function ensureInt32(a: I32, n: number): I32 {
  return a.length >= n ? a : new Int32Array(Math.max(n, a.length * 2));
}

export function ensureUint8(a: U8, n: number): U8 {
  return a.length >= n ? a : new Uint8Array(Math.max(n, a.length * 2));
}
