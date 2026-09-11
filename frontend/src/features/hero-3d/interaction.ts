import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

export type HeroPointerState = {
  /** Normalized pointer in stage bounds, -1..1 (x right, y down) */
  nx: number;
  ny: number;
  /** Seconds since last meaningful move */
  idleSeconds: number;
  /** Pointer is currently over the stage */
  active: boolean;
  /** Primary-button drag orbit in progress */
  dragging: boolean;
  /**
   * Pixel deltas since last consume (useFrame reads then zeros).
   * Positive dx = drag right; positive dy = drag down.
   */
  dragDx: number;
  dragDy: number;
};

const IDLE_EPS = 0.0015;

/**
 * Pointer tracking for the hero canvas. Updates refs only — never React state.
 * Hover: absolute nx/ny. Drag: accumulates pixel deltas for free orbit.
 */
export function useHeroPointer(enabled: boolean): {
  containerRef: RefObject<HTMLDivElement | null>;
  pointer: RefObject<HeroPointerState>;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<HeroPointerState>({
    nx: 0,
    ny: 0,
    idleSeconds: 10,
    active: false,
    dragging: false,
    dragDx: 0,
    dragDy: 0,
  });

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    let lastNormX = 0;
    let lastNormY = 0;
    let lastClientX = 0;
    let lastClientY = 0;
    let lastMove = performance.now();
    let inside = false;
    let raf = 0;

    el.style.cursor = 'grab';
    el.style.touchAction = 'none';

    const tickIdle = () => {
      pointer.current.idleSeconds = (performance.now() - lastMove) / 1000;
      raf = requestAnimationFrame(tickIdle);
    };
    raf = requestAnimationFrame(tickIdle);

    const updateNorm = (clientX: number, clientY: number, markActive: boolean) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((clientY - rect.top) / rect.height) * 2 - 1;
      const clampedX = Math.max(-1, Math.min(1, nx));
      const clampedY = Math.max(-1, Math.min(1, ny));

      const dx = clampedX - lastNormX;
      const dy = clampedY - lastNormY;
      if (Math.hypot(dx, dy) > IDLE_EPS) {
        lastMove = performance.now();
        pointer.current.idleSeconds = 0;
      }
      lastNormX = clampedX;
      lastNormY = clampedY;
      pointer.current.nx = clampedX;
      pointer.current.ny = clampedY;
      if (markActive) pointer.current.active = true;
    };

    const inBounds = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    };

    const onEnter = (e: PointerEvent) => {
      inside = true;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      updateNorm(e.clientX, e.clientY, true);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      inside = true;
      pointer.current.dragging = true;
      pointer.current.active = true;
      pointer.current.idleSeconds = 0;
      lastMove = performance.now();
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      updateNorm(e.clientX, e.clientY, true);
      el.style.cursor = 'grabbing';
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      e.preventDefault();
    };

    const applyDragDelta = (clientX: number, clientY: number) => {
      const dx = clientX - lastClientX;
      const dy = clientY - lastClientY;
      lastClientX = clientX;
      lastClientY = clientY;
      if (dx !== 0 || dy !== 0) {
        pointer.current.dragDx += dx;
        pointer.current.dragDy += dy;
        lastMove = performance.now();
        pointer.current.idleSeconds = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!inside && !pointer.current.dragging) {
        if (!inBounds(e.clientX, e.clientY)) return;
        inside = true;
        lastClientX = e.clientX;
        lastClientY = e.clientY;
      }
      if (pointer.current.dragging) {
        applyDragDelta(e.clientX, e.clientY);
      }
      updateNorm(e.clientX, e.clientY, true);
    };

    const onWindowMove = (e: PointerEvent) => {
      if (pointer.current.dragging) {
        applyDragDelta(e.clientX, e.clientY);
        updateNorm(e.clientX, e.clientY, true);
        return;
      }
      if (!inside) return;
      if (!inBounds(e.clientX, e.clientY)) {
        inside = false;
        pointer.current.active = false;
        lastMove = performance.now();
        return;
      }
      updateNorm(e.clientX, e.clientY, true);
    };

    const endDrag = (e: PointerEvent) => {
      if (!pointer.current.dragging) return;
      pointer.current.dragging = false;
      el.style.cursor = 'grab';
      try {
        if (el.hasPointerCapture(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      inside = inBounds(e.clientX, e.clientY);
      pointer.current.active = inside;
      lastMove = performance.now();
    };

    const onLeave = () => {
      if (pointer.current.dragging) return;
      inside = false;
      pointer.current.active = false;
      lastMove = performance.now();
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove, { passive: false });
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointermove', onWindowMove, { passive: true });
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    return () => {
      cancelAnimationFrame(raf);
      el.style.cursor = '';
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', endDrag);
      el.removeEventListener('pointercancel', endDrag);
      el.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [enabled]);

  return { containerRef, pointer };
}

/** Critically-damped-ish spring step toward a target (heavy feel). */
export function springStep(
  current: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness: number,
  damping: number,
): { value: number; velocity: number } {
  const accel = (target - current) * stiffness;
  const nextV = (velocity + accel * dt) * Math.exp(-damping * dt);
  return { value: current + nextV * dt, velocity: nextV };
}
