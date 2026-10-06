import { BoxGeometry, ConeGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildBuilding(close: boolean) {
  const root = createAssetRoot(close ? 'Pastel city house — close LOD' : 'Pastel city house — far LOD');
  const body = makeAssetMesh(new BoxGeometry(2, 1.65, 2), '#e7a787', 'stucco walls');
  body.position.y = 0.825;
  root.add(body);
  const roof = makeAssetMesh(new ConeGeometry(1.35, 0.85, 4), '#b85f52', 'terracotta roof');
  roof.position.y = 2.05;
  root.add(roof);
  if (close) {
    for (const x of [-0.62, 0.62]) {
      const window = makeAssetMesh(new BoxGeometry(0.38, 0.48, 0.055), '#b5d7d3', 'street-facing window', 0.4);
      window.position.set(x, 1.12, 1.025);
      root.add(window);
      const sill = makeAssetMesh(new BoxGeometry(0.48, 0.075, 0.1), '#f5d9a2', 'window sill');
      sill.position.set(x, 0.85, 1.045);
      root.add(sill);
    }
    const door = makeAssetMesh(new BoxGeometry(0.46, 0.9, 0.06), '#6f665a', 'front door');
    door.position.set(0, 0.45, 1.03);
    root.add(door);
  }
  return root;
}

export const buildingAsset: AssetDefinition = Object.freeze({
  id: 'pastel-row-house',
  displayName: 'Pastel row house',
  category: 'building',
  bounds: { min: [-1.4, 0, -1.4] as const, max: [1.4, 2.5, 1.4] as const },
  collision: [{ id: 'building-shell', center: [0, 0.825, 0] as const, size: [2, 1.65, 2] as const }],
  lodFactories: { close: () => buildBuilding(true), far: () => buildBuilding(false) },
});
