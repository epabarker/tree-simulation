/**
 * Pointer input on the canvas: drag to pan, pinch or wheel to zoom, double-tap to refit,
 * tap to pick a world point. Pointer Events cover mouse, pen and touch alike.
 *
 * With `panZoom` off (the home page) only taps count: drags, pinches and the wheel are left to
 * the page, so it scrolls and zooms as usual. With it on, a tap waits out the double-tap window
 * before it counts, so the first tap of a double-tap never fells a tree.
 */

import type { Camera } from "./scene.ts";

export interface InputCallbacks {
  onChange(): void;
  onTap(worldX: number, worldY: number): void;
  onRefit(): void;
}

const TAP_SLOP_PX = 6;
const TAP_MS = 300;
const DOUBLE_TAP_MS = 320;

export function attachInput(
  renderer: InputTarget,
  cb: InputCallbacks,
  options: { panZoom: boolean } = { panZoom: true },
): () => void {
  const canvas = renderer.canvas;
  const { panZoom } = options;
  const pointers = new Map<number, { x: number; y: number }>();
  let down: { x: number; y: number; time: number; moved: boolean } | null = null;
  let lastTap = 0;
  let pendingTap = 0;
  let pinchDist = 0;

  const local = (e: PointerEvent | WheelEvent): [number, number] => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const zoomAt = (px: number, py: number, factor: number): void => {
    const [wx, wy] = renderer.screenToWorld(px, py);
    const cam = renderer.camera;
    cam.scale = Math.min(400, Math.max(0.5, cam.scale * factor));
    const [wx2, wy2] = renderer.screenToWorld(px, py);
    cam.cx += wx - wx2;
    cam.cy += wy - wy2;
    cb.onChange();
  };

  const onDown = (e: PointerEvent): void => {
    if (panZoom) canvas.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    pointers.set(e.pointerId, { x, y });
    if (pointers.size === 1) down = { x, y, time: performance.now(), moved: false };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      if (down) down.moved = true;
    }
  };

  const onMove = (e: PointerEvent): void => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const [x, y] = local(e);
    if (!panZoom) {
      if (down && Math.hypot(x - down.x, y - down.y) > TAP_SLOP_PX) down.moved = true;
      return;
    }
    if (pointers.size === 1) {
      const cam = renderer.camera;
      cam.cx -= (x - p.x) / cam.scale;
      cam.cy += (y - p.y) / cam.scale;
      if (down && Math.hypot(x - down.x, y - down.y) > TAP_SLOP_PX) down.moved = true;
      cb.onChange();
    }
    p.x = x;
    p.y = y;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()] as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / pinchDist);
      pinchDist = dist;
    }
  };

  const end = (e: PointerEvent): void => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0 && down) {
      const now = performance.now();
      if (!down.moved && now - down.time < TAP_MS) {
        const [wx, wy] = renderer.screenToWorld(down.x, down.y);
        if (!panZoom) {
          cb.onTap(wx, wy);
        } else if (now - lastTap < DOUBLE_TAP_MS) {
          lastTap = 0;
          window.clearTimeout(pendingTap);
          cb.onRefit();
        } else {
          lastTap = now;
          pendingTap = window.setTimeout(() => cb.onTap(wx, wy), DOUBLE_TAP_MS);
        }
      }
      down = null;
    }
  };
  const onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const [x, y] = local(e);
    zoomAt(x, y, Math.exp(-e.deltaY * 0.0015));
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  if (panZoom) canvas.addEventListener("wheel", onWheel, { passive: false });
  return () => {
    window.clearTimeout(pendingTap);
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", end);
    canvas.removeEventListener("pointercancel", end);
    canvas.removeEventListener("wheel", onWheel);
  };
}

/** What input needs from the view: the element, the camera it moves, and a coordinate mapping. */
export interface InputTarget {
  canvas: HTMLCanvasElement;
  camera: Camera;
  screenToWorld(px: number, py: number): [number, number];
}
