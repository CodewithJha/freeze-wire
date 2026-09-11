import { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { RefObject } from 'react';
import { applyFreezeWireMaterials } from './materials';
import { springStep, type HeroPointerState } from './interaction';

const MODEL_URL = '/models/bitcoin.glb';

/** Resting cinematic pose — slight depth, ₿ face remains primary */
const BASE_X = 0.18;
const BASE_Y = 0.22;
const BASE_Z = -0.08;

/** Hover tilt amplitude (absolute position → temporary lean) */
const MAX_YAW = 0.96;
const MAX_PITCH = 0.7;
const MAX_ROLL = 0.38;

const STIFF_HOVER = 30;
const DAMP_HOVER = 6.2;

/** Drag: radians per pixel — continuous orbit (many revolutions OK) */
const DRAG_SENS = 0.0065;
/** Inertia decay after release (1/s) — heavy coin coast */
const INERTIA_FRICTION = 3.4;

type BitcoinModelProps = {
  pointer: RefObject<HeroPointerState>;
  reducedMotion: boolean;
  /** Soft pause — keep last pose, skip integration */
  paused: boolean;
};

/**
 * Sketchfab coin lies in YZ (thin on X). Rotate so the face reads toward camera.
 * Hover = absolute tilt. Drag = delta orbit that can spin freely.
 */
export function BitcoinModel({ pointer, reducedMotion, paused }: BitcoinModelProps) {
  const root = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_URL);

  const clone = useMemo(() => scene.clone(true), [scene]);

  useLayoutEffect(() => {
    // Sketchfab coin is thin on X (face in YZ).
    // -π/2 presents the ₿-logo face toward +Z (camera); +π/2 showed the reverse/circuit-dominant side.
    clone.rotation.set(0, -Math.PI / 2, 0);
    clone.scale.setScalar(0.34);
    const disposeMats = applyFreezeWireMaterials(clone);
    return () => {
      disposeMats();
    };
  }, [clone]);

  const phys = useRef({
    /** Free orbit from drag (unbounded) */
    orbitX: BASE_X,
    orbitY: BASE_Y,
    vOrbitX: 0,
    vOrbitY: 0,
    /** Temporary hover lean (springs to 0 when idle) */
    hoverX: 0,
    hoverY: 0,
    hoverZ: 0,
    vHoverX: 0,
    vHoverY: 0,
    vHoverZ: 0,
    camX: 0.2,
    camY: 0.08,
    camVX: 0,
    camVY: 0,
    float: 0,
  });

  useFrame((state, delta) => {
    if (paused || !spin.current || !root.current) return;
    const dt = Math.min(delta, 0.048);
    const p = phys.current;
    const ptr = pointer.current;
    const allowIdle = !reducedMotion;

    // Consume drag deltas → free orbit + velocity for release inertia
    const ddx = ptr.dragDx;
    const ddy = ptr.dragDy;
    if (ddx !== 0 || ddy !== 0) {
      ptr.dragDx = 0;
      ptr.dragDy = 0;
      // Drag right → yaw right; drag up → pitch up
      const dYaw = ddx * DRAG_SENS;
      const dPitch = -ddy * DRAG_SENS;
      p.orbitY += dYaw;
      p.orbitX += dPitch;
      // EMA velocity for coast after release
      const invDt = 1 / Math.max(dt, 1 / 120);
      p.vOrbitY = p.vOrbitY * 0.35 + dYaw * invDt * 0.65;
      p.vOrbitX = p.vOrbitX * 0.35 + dPitch * invDt * 0.65;
    }

    if (ptr.dragging) {
      // Drag dominates — kill hover lean quickly toward 0
      let step = springStep(p.hoverY, p.vHoverY, 0, dt, 40, 8);
      p.hoverY = step.value;
      p.vHoverY = step.velocity;
      step = springStep(p.hoverX, p.vHoverX, 0, dt, 40, 8);
      p.hoverX = step.value;
      p.vHoverX = step.velocity;
      step = springStep(p.hoverZ, p.vHoverZ, 0, dt, 40, 8);
      p.hoverZ = step.value;
      p.vHoverZ = step.velocity;

      // Soft camera follow while dragging
      const camTargetX = 0.2 + Math.sin(p.orbitY) * 0.12;
      const camTargetY = 0.08 + Math.sin(p.orbitX) * 0.08;
      step = springStep(p.camX, p.camVX, camTargetX, dt, 12, 5.5);
      p.camX = step.value;
      p.camVX = step.velocity;
      step = springStep(p.camY, p.camVY, camTargetY, dt, 12, 5.5);
      p.camY = step.value;
      p.camVY = step.velocity;
    } else {
      // Coast orbit with inertia
      if (Math.abs(p.vOrbitY) > 0.0005 || Math.abs(p.vOrbitX) > 0.0005) {
        p.orbitY += p.vOrbitY * dt;
        p.orbitX += p.vOrbitX * dt;
        const decay = Math.exp(-INERTIA_FRICTION * dt);
        p.vOrbitY *= decay;
        p.vOrbitX *= decay;
      } else {
        p.vOrbitY = 0;
        p.vOrbitX = 0;
      }

      const hovering = ptr.active && ptr.idleSeconds < 1.25;
      if (hovering) {
        const targetY = ptr.nx * MAX_YAW;
        const targetX = -ptr.ny * MAX_PITCH;
        const targetZ = ptr.nx * -MAX_ROLL * 0.55 + -ptr.ny * MAX_ROLL * 0.25;

        let step = springStep(p.hoverY, p.vHoverY, targetY, dt, STIFF_HOVER, DAMP_HOVER);
        p.hoverY = step.value;
        p.vHoverY = step.velocity;
        step = springStep(p.hoverX, p.vHoverX, targetX, dt, STIFF_HOVER, DAMP_HOVER);
        p.hoverX = step.value;
        p.vHoverX = step.velocity;
        step = springStep(p.hoverZ, p.vHoverZ, targetZ, dt, STIFF_HOVER - 4, DAMP_HOVER);
        p.hoverZ = step.value;
        p.vHoverZ = step.velocity;

        const camTargetX = 0.2 + ptr.nx * 0.28;
        const camTargetY = 0.08 + -ptr.ny * 0.16;
        step = springStep(p.camX, p.camVX, camTargetX, dt, 14, 5.5);
        p.camX = step.value;
        p.camVX = step.velocity;
        step = springStep(p.camY, p.camVY, camTargetY, dt, 14, 5.5);
        p.camY = step.value;
        p.camVY = step.velocity;
      } else {
        // Settle hover lean; keep orbit where drag left it
        let step = springStep(p.hoverY, p.vHoverY, 0, dt, 18, 5.8);
        p.hoverY = step.value;
        p.vHoverY = step.velocity;
        step = springStep(p.hoverX, p.vHoverX, 0, dt, 16, 5.8);
        p.hoverX = step.value;
        p.vHoverX = step.velocity;
        step = springStep(p.hoverZ, p.vHoverZ, 0, dt, 16, 6);
        p.hoverZ = step.value;
        p.vHoverZ = step.velocity;

        if (allowIdle && Math.abs(p.vOrbitY) < 0.01 && Math.abs(p.vOrbitX) < 0.01) {
          // Breathe only — do not yaw-drift away from the default B face
          p.float += dt * 0.5;
        }

        step = springStep(p.camX, p.camVX, 0.2, dt, 10, 5);
        p.camX = step.value;
        p.camVX = step.velocity;
        step = springStep(p.camY, p.camVY, 0.08, dt, 10, 5);
        p.camY = step.value;
        p.camVY = step.velocity;
      }
    }

    const idleX =
      allowIdle && !ptr.dragging && Math.abs(p.vOrbitX) < 0.01
        ? Math.sin(p.float) * 0.018
        : 0;

    spin.current.rotation.set(
      p.orbitX + p.hoverX + idleX,
      p.orbitY + p.hoverY,
      BASE_Z + p.hoverZ,
    );
    root.current.position.y =
      allowIdle && !ptr.dragging ? Math.sin(p.float) * 0.035 : 0;

    state.camera.position.x = p.camX;
    state.camera.position.y = p.camY;
    state.camera.position.z = 6.2;
    state.camera.lookAt(0.05, 0, 0);

    const key = state.scene.getObjectByName('fw-key-light') as
      | { position: { x: number; y: number } }
      | undefined;
    if (key) {
      key.position.x = 2.4 + p.camX * 0.7;
      key.position.y = 1.8 + p.camY * 0.45;
    }
  });

  return (
    <group ref={root}>
      <group ref={spin}>
        <primitive object={clone} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
