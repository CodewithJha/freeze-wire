import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Local dark-studio reflections (no remote HDRI). Metals need an env map
 * or they read as flat black.
 */
export function StudioEnvironment() {
  const { gl, scene } = useThree();

  useLayoutEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    const envTexture = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envTexture;
      scene.environmentIntensity = 0.62;

    return () => {
      scene.environment = null;
      envTexture.dispose();
      pmrem.dispose();
      // RoomEnvironment has no dispose in all three versions; drop refs.
    };
  }, [gl, scene]);

  return null;
}
