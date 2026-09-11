import type { Material, Mesh, Object3D, Texture } from 'three';
import {
  CanvasTexture,
  Color,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';

/** FreezeWire signal — sparse accent only */
export const FW_SIGNAL = '#D6FF3F';

const GRAPHITE = new Color('#343C3A');
const GUNMETAL = new Color('#4A5451');
const SIGNAL = new Color(FW_SIGNAL);

/**
 * Crush gold/orange albedo toward FreezeWire graphite while preserving logo
 * contrast and a selective chartreuse lift in the brightest metal.
 */
function toFreezeWireAlbedo(source: Texture): CanvasTexture | null {
  const image = source.image as
    | HTMLImageElement
    | HTMLCanvasElement
    | ImageBitmap
    | undefined;
  if (!image) return null;

  const width =
    'naturalWidth' in image
      ? image.naturalWidth || image.width
      : 'width' in image
        ? Number(image.width)
        : 0;
  const height =
    'naturalHeight' in image
      ? image.naturalHeight || image.height
      : 'height' in image
        ? Number(image.height)
        : 0;
  if (!width || !height) return null;

  // Cap processing cost — 2048 is enough for hero close-up
  const maxDim = 2048;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(image as CanvasImageSource, 0, 0, w, h);
  const frame = ctx.getImageData(0, 0, w, h);
  const data = frame.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]! / 255;
    const g = data[i + 1]! / 255;
    const b = data[i + 2]! / 255;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    // Graphite / gunmetal — preserve logo contrast, sparse signal only
    let nr = 0.14 + luma * 0.38;
    let ng = 0.15 + luma * 0.39;
    let nb = 0.145 + luma * 0.36;
    const accent = Math.max(0, (luma - 0.62) / 0.38);
    if (accent > 0) {
      const t = accent * 0.18;
      nr = nr * (1 - t) + 0.84 * t;
      ng = ng * (1 - t) + 1.0 * t;
      nb = nb * (1 - t) + 0.25 * t;
    }
    data[i] = Math.round(Math.min(1, nr) * 255);
    data[i + 1] = Math.round(Math.min(1, ng) * 255);
    data[i + 2] = Math.round(Math.min(1, nb) * 255);
  }

  ctx.putImageData(frame, 0, 0);
  const next = new CanvasTexture(canvas);
  next.colorSpace = SRGBColorSpace;
  next.flipY = source.flipY;
  next.needsUpdate = true;
  next.name = 'fw-bitcoin-albedo';
  return next;
}

/**
 * Remap Sketchfab gold/orange Bitcoin materials to FreezeWire
 * graphite / gunmetal product finish with a selective chartreuse tint.
 */
export function applyFreezeWireMaterials(root: Object3D): () => void {
  const createdMaterials: Material[] = [];
  const createdTextures: Texture[] = [];

  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !mesh.material) return;

    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!source) return;
    if (source.name?.startsWith('fw-')) return;

    const name = (source.name || mesh.name || '').toLowerCase();
    const isFace = name.includes('bitcoin');
    const prevMap =
      'map' in source ? ((source as { map?: Texture | null }).map ?? null) : null;

    let map: Texture | null = null;
    if (prevMap) {
      const remapped = toFreezeWireAlbedo(prevMap);
      if (remapped) {
        map = remapped;
        createdTextures.push(remapped);
      }
    }

    const mat = new MeshStandardMaterial({
      name: `fw-${source.name || 'bitcoin'}`,
      // Map already encodes FreezeWire graphite — keep color near-white so it doesn't crush.
      color: map ? new Color('#D8DDD8') : isFace ? GUNMETAL.clone() : GRAPHITE.clone(),
      map,
      metalness: isFace ? 0.72 : 0.82,
      roughness: isFace ? 0.28 : 0.22,
      envMapIntensity: 1.05,
      emissive: isFace ? new Color(0x000000) : SIGNAL.clone(),
      emissiveIntensity: isFace ? 0 : 0.045,
    });

    mesh.material = mat;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    createdMaterials.push(mat);
  });

  return () => {
    for (const mat of createdMaterials) mat.dispose();
    for (const tex of createdTextures) tex.dispose();
  };
}
