import {
  Component,
  Suspense,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
  type RefObject,
} from 'react';
import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from 'motion/react';
import { BitcoinScene } from './BitcoinScene';
import { useHeroPointer } from './interaction';

type WebGlGateProps = {
  children: ReactNode;
  onFail: () => void;
};

class WebGlErrorBoundary extends Component<WebGlGateProps, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.onFail();
  }

  override render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function useHeroVisibility(ref: RefObject<HTMLDivElement | null>) {
  const [visible, setVisible] = useState(true);
  const [pageVisible, setPageVisible] = useState(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.05, rootMargin: '10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    const onVis = () => setPageVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return visible && pageVisible;
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

/**
 * Right-side Bitcoin hero canvas. Pointer/spring interaction lives in refs;
 * no per-frame React state.
 */
export function BitcoinHero() {
  const reduceMotion = useReducedMotion();
  const reducedMotion = Boolean(reduceMotion);
  const [webglOk, setWebglOk] = useState(true);
  const { containerRef, pointer } = useHeroPointer(webglOk);
  const inView = useHeroVisibility(containerRef);
  const paused = !inView;

  useEffect(() => {
    setWebglOk(supportsWebGL());
  }, []);

  if (!webglOk) {
    return (
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-hidden
        data-hero-3d="unavailable"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      aria-hidden
      data-hero-3d="bitcoin"
    >
      <WebGlErrorBoundary onFail={() => setWebglOk(false)}>
        <Canvas
          className="h-full w-full"
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            stencil: false,
            depth: true,
          }}
          camera={{ position: [0.2, 0.08, 6.2], fov: 32, near: 0.1, far: 40 }}
          frameloop={paused ? 'never' : 'always'}
          onCreated={({ gl }) => {
            gl.setClearColor(0x000000, 0);
            gl.toneMappingExposure = 1.1;
          }}
        >
          <Suspense fallback={null}>
            <BitcoinScene
              pointer={pointer}
              reducedMotion={reducedMotion}
              paused={paused}
            />
          </Suspense>
        </Canvas>
      </WebGlErrorBoundary>
    </div>
  );
}
