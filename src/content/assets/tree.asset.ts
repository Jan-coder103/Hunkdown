import { ConeGeometry, CylinderGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildTree(close: boolean) {
  const root = createAssetRoot(close ? 'Round street tree — close LOD' : 'Round street tree — far LOD');
  const trunk = makeAssetMesh(new CylinderGeometry(0.2, 0.28, 1.8, close ? 7 : 5), '#806148', 'tree trunk');
  trunk.position.y = 0.9;
  root.add(trunk);
  const canopy = makeAssetMesh(new ConeGeometry(1.05, 2.2, close ? 7 : 5), '#718f61', 'leaf canopy');
  canopy.position.y = 2.55;
  root.add(canopy);
  return root;
}

export const treeAsset: AssetDefinition = Object.freeze({
  id: 'street-tree',
  displayName: 'Street tree',
  category: 'decoration',
  bounds: { min: [-1.1, 0, -1.1] as const, max: [1.1, 3.65, 1.1] as const },
  collision: [{ id: 'tree-trunk', center: [0, 0.9, 0] as const, size: [0.56, 1.8, 0.56] as const }],
  lodFactories: { close: () => buildTree(true), far: () => buildTree(false) },
});
