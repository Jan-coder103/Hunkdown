import { CylinderGeometry, IcosahedronGeometry, Vector3 } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildTree(close: boolean) {
  const root = createAssetRoot(close ? 'Round street tree — close LOD' : 'Round street tree — far LOD');
  const collar = makeAssetMesh(new CylinderGeometry(0.43, 0.5, 0.13, close ? 9 : 6), '#bfae91', 'low stone tree collar');
  collar.position.y = 0.065;
  root.add(collar);
  const trunk = makeAssetMesh(new CylinderGeometry(0.18, 0.27, 1.95, close ? 7 : 5), '#806148', 'tapered tree trunk');
  trunk.position.y = 1.0;
  root.add(trunk);

  if (close) {
    for (const side of [-1, 1]) {
      const start = new Vector3(0, 1.3, 0);
      const end = new Vector3(side * 0.62, 2.25, 0);
      const direction = end.clone().sub(start);
      const branch = makeAssetMesh(new CylinderGeometry(0.075, 0.12, direction.length(), 5), '#806148', 'low branch');
      branch.position.copy(start).add(end).multiplyScalar(0.5);
      branch.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
      root.add(branch);
    }
    const leaves = [
      { position: [0, 2.79, 0] as const, radius: 0.79, color: '#718f61', name: 'upper faceted canopy' },
      { position: [-0.48, 2.48, 0.08] as const, radius: 0.57, color: '#829d68', name: 'west canopy cluster' },
      { position: [0.48, 2.48, 0.08] as const, radius: 0.57, color: '#67875c', name: 'east canopy cluster' },
      { position: [0, 2.48, -0.47] as const, radius: 0.56, color: '#789365', name: 'rear canopy cluster' },
    ];
    for (const leaf of leaves) {
      const canopy = makeAssetMesh(new IcosahedronGeometry(leaf.radius, 0), leaf.color, leaf.name);
      canopy.position.set(leaf.position[0], leaf.position[1], leaf.position[2]);
      root.add(canopy);
    }
  } else {
    const canopy = makeAssetMesh(new IcosahedronGeometry(0.98, 0), '#718f61', 'faceted tree crown');
    canopy.position.y = 2.62;
    root.add(canopy);
  }
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
