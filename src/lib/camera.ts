import type { Rect } from "../../shared/layout";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Viewport {
  w: number;
  h: number;
}

export function clampZoom(zoom: number): number {
  return Math.min(1.65, Math.max(0.08, zoom));
}

export function zoomAt(
  camera: Camera,
  clientX: number,
  clientY: number,
  nextZoom: number,
  origin: { left: number; top: number },
): Camera {
  const zoom = clampZoom(nextZoom);
  const worldX = (clientX - origin.left - camera.x) / camera.zoom;
  const worldY = (clientY - origin.top - camera.y) / camera.zoom;
  return {
    zoom,
    x: clientX - origin.left - worldX * zoom,
    y: clientY - origin.top - worldY * zoom,
  };
}

export function cameraFit(bounds: Rect, viewport: Viewport, padding = 32): Camera {
  const zoom = clampZoom(
    Math.min((viewport.w - padding * 2) / Math.max(bounds.w, 1), (viewport.h - padding * 2) / Math.max(bounds.h, 1), 1.05),
  );
  return {
    zoom,
    x: padding + (viewport.w - padding * 2 - bounds.w * zoom) / 2 - bounds.x * zoom,
    y: padding + (viewport.h - padding * 2 - bounds.h * zoom) / 2 - bounds.y * zoom,
  };
}

/** Readable zoom on the left of a frame, so Measure and Learn can sit off to the right. */
export function cameraFocusFrame(frame: Rect, viewport: Viewport, top = 86): Camera {
  const readable = Math.min(1.02, Math.max(0.8, (viewport.w - 72) / Math.min(frame.w, 1320)));
  const zoom = clampZoom(readable);
  return { zoom, x: 32 - frame.x * zoom, y: top - frame.y * zoom };
}
