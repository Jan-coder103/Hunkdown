import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildStreetLamp(close: boolean) {
  const root = createAssetRoot(close ? 'Street lamp — close LOD' : 'Street lamp — far LOD');
  const pole = makeAssetMesh(new CylinderGeometry(0.07, 0.1, 3.35, close ? 8 : 5), '#52665f', 'lamp post');
  pole.position.y = 1.675;
  root.add(pole);
  const arm = makeAssetMesh(new BoxGeometry(close ? 0.85 : 0.65, 0.09, 0.09), '#52665f', 'lamp arm');
  arm.position.set(-0.28, 3.1, 0);
  root.add(arm);
  const lamp = makeAssetMesh(
    close ? new SphereGeometry(0.2, 8, 5) : new BoxGeometry(0.28, 0.2, 0.25),
    '#f5d995',
    'warm lamp globe',
    0.45,
  );
  lamp.position.set(-0.58, 3.02, 0);
  root.add(lamp);
  return root;
}

export const decorationAsset: AssetDefinition = Object.freeze({
  id: 'street-lamp',
  displayName: 'Street lamp',
  category: 'decoration',
  bounds: { min: [-0.8, 0, -0.3] as const, max: [0.3, 3.35, 0.3] as const },
  collision: [{ id: 'lamp-post', center: [0, 1.65, 0] as const, size: [0.2, 3.3, 0.2] as const }],
  lodFactories: { close: () => buildStreetLamp(true), far: () => buildStreetLamp(false) },
});
