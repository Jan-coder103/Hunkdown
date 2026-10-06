import { BoxGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildCafe(close: boolean) {
  const root = createAssetRoot(close ? 'Corner cafe — close LOD' : 'Corner cafe — far LOD');
  const walls = makeAssetMesh(new BoxGeometry(2.8, 1.75, 2.8), '#d9a36f', 'cafe walls');
  walls.position.y = 0.875;
  root.add(walls);
  const roof = makeAssetMesh(new BoxGeometry(2.95, 0.2, 2.95), '#577b71', 'flat cafe roof');
  roof.position.y = 1.84;
  root.add(roof);
  if (close) {
    const awning = makeAssetMesh(new BoxGeometry(2.95, 0.28, 0.14), '#cf7256', 'striped street awning');
    awning.position.set(0, 1.38, 1.36);
    root.add(awning);
    const window = makeAssetMesh(new BoxGeometry(1.35, 0.72, 0.06), '#b9d9d2', 'front cafe window', 0.42);
    window.position.set(0.6, 0.94, 1.42);
    root.add(window);
  }
  return root;
}

export const cornerCafeAsset: AssetDefinition = Object.freeze({
  id: 'corner-cafe',
  displayName: 'Corner cafe',
  category: 'building',
  bounds: { min: [-1.5, 0, -1.5] as const, max: [1.5, 2, 1.5] as const },
  collision: [{ id: 'cafe-shell', center: [0, 0.875, 0] as const, size: [2.8, 1.75, 2.8] as const }],
  lodFactories: { close: () => buildCafe(true), far: () => buildCafe(false) },
});
