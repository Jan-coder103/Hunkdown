import { CylinderGeometry, TorusGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildFountain(close: boolean) {
  const root = createAssetRoot(close ? 'Low-poly fountain — close LOD' : 'Low-poly fountain — far LOD');
  const segments = close ? 10 : 7;
  const foot = makeAssetMesh(new CylinderGeometry(0.96, 1.12, 0.18, segments), '#c7b99f', 'wide carved fountain foot');
  foot.position.y = 0.09;
  root.add(foot);
  const basin = makeAssetMesh(new CylinderGeometry(1.05, 1.18, 0.36, segments), '#d8c9a9', 'stone fountain basin');
  basin.position.y = 0.31;
  root.add(basin);
  const rim = makeAssetMesh(new TorusGeometry(1.02, 0.09, close ? 5 : 4, segments), '#e6d8bb', 'raised basin rim');
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.5;
  root.add(rim);
  const water = makeAssetMesh(new CylinderGeometry(0.89, 0.94, 0.035, segments), '#86c8c3', 'still blue fountain water', 0.3);
  water.position.y = 0.46;
  root.add(water);

  const pedestal = makeAssetMesh(new CylinderGeometry(0.17, 0.24, 0.5, close ? 6 : 5), '#c9b897', 'central fountain pedestal');
  pedestal.position.y = 0.72;
  root.add(pedestal);
  const upperBowl = makeAssetMesh(new CylinderGeometry(0.48, 0.3, 0.16, close ? 8 : 6), '#d8c9a9', 'upper fountain bowl');
  upperBowl.position.y = 0.99;
  root.add(upperBowl);
  const upperWater = makeAssetMesh(new CylinderGeometry(0.37, 0.4, 0.025, close ? 8 : 6), '#8acbc5', 'upper bowl water');
  upperWater.position.y = 1.075;
  root.add(upperWater);

  if (close) {
    const jet = makeAssetMesh(new CylinderGeometry(0.08, 0.13, 0.42, 5), '#9bd8d0', 'central water spout', 0.25);
    jet.position.y = 0.79;
    root.add(jet);
    for (let index = 0; index < 4; index += 1) {
      const arc = makeAssetMesh(new CylinderGeometry(0.025, 0.045, 0.27, 4), '#9bd8d0', 'small water arc', 0.25);
      arc.position.set(index % 2 ? 0.17 : -0.17, 0.91, index < 2 ? 0.11 : -0.11);
      arc.rotation.z = index % 2 ? -0.5 : 0.5;
      root.add(arc);
    }
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
