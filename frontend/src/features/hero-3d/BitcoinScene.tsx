import type { RefObject } from 'react';
import { StudioEnvironment } from './StudioEnvironment';
import { BitcoinModel } from './BitcoinModel';
import type { HeroPointerState } from './interaction';

type BitcoinSceneProps = {
  pointer: RefObject<HeroPointerState>;
  reducedMotion: boolean;
  paused: boolean;
};

/** Dark studio lighting + local RoomEnvironment (no CDN HDRI). */
export function BitcoinScene({ pointer, reducedMotion, paused }: BitcoinSceneProps) {
  return (
    <>
      <StudioEnvironment />

      <ambientLight intensity={0.42} color="#B4BAB5" />
      <directionalLight
        name="fw-key-light"
        intensity={1.85}
        color="#F2F0E8"
        position={[2.8, 2.2, 3.8]}
      />
      <directionalLight intensity={0.55} color="#D6FF3F" position={[-2.8, 0.2, 1.6]} />
      <directionalLight intensity={1.05} color="#8B948E" position={[-1.6, 2.8, -2.4]} />
      <directionalLight intensity={0.7} color="#F2F0E8" position={[0.2, 0.4, 4.2]} />
      <pointLight intensity={0.55} color="#E8E6DC" position={[0.2, -1.4, 3.2]} distance={10} />
      <hemisphereLight intensity={0.32} color="#4A5451" groundColor="#080A0B" />

      <BitcoinModel pointer={pointer} reducedMotion={reducedMotion} paused={paused} />
    </>
  );
}
