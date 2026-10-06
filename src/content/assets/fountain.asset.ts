import { CylinderGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildFountain(close: boolean) {
  const root = createAssetRoot(close ? 'Low-poly fountain — close LOD' : 'Low-poly fountain — far LOD');
  const basin = makeAssetMesh(new CylinderGeometry(1.05, 1.18, 0.42, close ? 8 : 6), '#d8c9a9', 'stone fountain basin');
  basin.position.y = 0.21;
  root.add(basin);
  const water = makeAssetMesh(new CylinderGeometry(0.86, 0.9, 0.08, close ? 8 : 6), '#86c8c3', 'fountain water', 0.3);
  water.position.y = 0.44;
  root.add(water);
  if (close) {
    const jet = makeAssetMesh(new CylinderGeometry(0.12, 0.22, 0.62, 6), '#9bd8d0', 'water jet', 0.25);
    jet.position.y = 0.78;
    root.add(jet);
  }
  return root;
}

export const fountainAsset: AssetDefinition = Object.freeze({
  id: 'plaza-fountain',
  displayName: 'Plaza fountain',
  category: 'decoration',
  bounds: { min: [-1.2, 0, -1.2] as const, max: [1.2, 1.1, 1.2] as const },
  collision: [{ id: 'fountain-basin', center: [0, 0.21, 0] as const, size: [2.36, 0.42, 2.36] as const }],
  lodFactories: { close: () => buildFountain(true), far: () => buildFountain(false) },
});
