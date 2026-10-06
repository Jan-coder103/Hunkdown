import { BoxGeometry, ConeGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildTownhouse(close: boolean) {
  const root = createAssetRoot(close ? 'Tall townhouse — close LOD' : 'Tall townhouse — far LOD');
  const body = makeAssetMesh(new BoxGeometry(2.7, 2.5, 2.7), '#8fb8aa', 'townhouse facade');
  body.position.y = 1.25;
  root.add(body);
  const roof = makeAssetMesh(new ConeGeometry(1.35, 0.72, 4), '#cb775c', 'steep roof');
  roof.position.y = 2.84;
  root.add(roof);
  if (close) {
    for (const y of [0.75, 1.72]) {
      for (const x of [-0.68, 0.68]) {
        const window = makeAssetMesh(new BoxGeometry(0.38, 0.48, 0.06), '#d2e4df', 'upper townhouse window', 0.42);
        window.position.set(x, y, 1.39);
        root.add(window);
      }
    }
    const door = makeAssetMesh(new BoxGeometry(0.46, 0.78, 0.06), '#725849', 'townhouse door');
    door.position.set(0, 0.4, 1.39);
    root.add(door);
  }
  return root;
}

export const tallTownhouseAsset: AssetDefinition = Object.freeze({
  id: 'tall-townhouse',
  displayName: 'Tall townhouse',
  category: 'building',
  bounds: { min: [-1.5, 0, -1.5] as const, max: [1.5, 3.25, 1.5] as const },
  collision: [{ id: 'townhouse-shell', center: [0, 1.25, 0] as const, size: [2.7, 2.5, 2.7] as const }],
  lodFactories: { close: () => buildTownhouse(true), far: () => buildTownhouse(false) },
});
