/**
 * Shareable lab links (M26): `?preset=name&seed=n&p=<patch>` reproduces the lab's start state. The
 * patch is diffParams against the preset (only what the panel changed, or a fitted species from an
 * experiment note), as base64url JSON. The run starts again from season 0 with those params, so a
 * mid-run edit becomes a param from the start.
 */

import { diffParams, mergeParams, type Params, type ParamsPatch } from "../../core/params.ts";

/** base64url (RFC 4648 §5, no padding) of the patch's JSON in UTF-8. */
export function encodePatch(patch: ParamsPatch): string {
  const bytes = new TextEncoder().encode(JSON.stringify(patch));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** The patch in a `p` value; throws on anything that is not base64url JSON of an object. */
export function decodePatch(text: string): ParamsPatch {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("a link's params must be a JSON object");
  }
  return value as ParamsPatch;
}

/**
 * The start params a link asks for: the preset's, with its seed and patch. `error` says why a
 * patch was ignored (the preset's params are used instead).
 */
export function paramsFromQuery(
  query: URLSearchParams,
  base: Params,
): { params: Params; error?: string } {
  let params = base;
  const seed = query.get("seed");
  if (seed !== null && Number.isFinite(Number(seed))) params = { ...params, seed: Number(seed) };
  const p = query.get("p");
  if (p === null || p === "") return { params };
  try {
    return { params: mergeParams(params, decodePatch(p)) };
  } catch (e) {
    return { params, error: `The link's params could not be read (${(e as Error).message}).` };
  }
}

/** Sets `preset`, `seed` and `p` on a query for `current` started from `base`, keeping other keys. */
export function writeQuery(
  query: URLSearchParams,
  preset: string,
  base: Params,
  current: Params,
): URLSearchParams {
  const out = new URLSearchParams(query);
  out.set("preset", preset);
  out.set("seed", String(current.seed));
  const { seed: _seed, ...patch } = diffParams(base, current) as ParamsPatch & { seed?: number };
  if (Object.keys(patch).length > 0) out.set("p", encodePatch(patch));
  else out.delete("p");
  return out;
}
