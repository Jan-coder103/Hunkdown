import { BoxGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildStreetLamp(close: boolean) {
  const root = createAssetRoot(close ? 'Street lamp — close LOD' : 'Street lamp — far LOD');
  const metal = '#52665f';
  const base = makeAssetMesh(new CylinderGeometry(0.18, 0.23, 0.28, close ? 8 : 5), '#455b54', 'cast iron base');
  base.position.y = 0.14;
  root.add(base);
  const pole = makeAssetMesh(new CylinderGeometry(0.065, 0.1, 2.82, close ? 8 : 5), metal, 'tapered lamp post');
  pole.position.y = 1.65;
  root.add(pole);
  for (const y of [0.34, 2.88]) {
    const collar = makeAssetMesh(new CylinderGeometry(0.12, 0.13, 0.08, close ? 8 : 5), '#687b6d', 'decorative post collar');
    collar.position.y = y;
    root.add(collar);
  }
  const arm = makeAssetMesh(new BoxGeometry(close ? 0.82 : 0.66, 0.09, 0.09), metal, 'curved lantern arm');
  arm.position.set(-0.3, 3.02, 0);
  arm.rotation.z = -0.18;
  root.add(arm);
  const lamp = makeAssetMesh(close ? new BoxGeometry(0.3, 0.28, 0.28) : new BoxGeometry(0.26, 0.22, 0.24), '#f5d995', 'warm lantern glass', 0.42);
  lamp.position.set(-0.63, 2.99, 0);
  root.add(lamp);
  const cap = makeAssetMesh(new BoxGeometry(0.32, 0.08, 0.32), '#495a52', 'lantern roof cap');
  cap.position.set(-0.63, 3.17, 0);
  root.add(cap);
  const finial = makeAssetMesh(new SphereGeometry(close ? 0.07 : 0.055, close ? 6 : 4, 3), '#8b9a80', 'lantern finial');
  finial.position.set(-0.63, 3.25, 0);
  root.add(finial);
  if (close) {
    const strut = makeAssetMesh(new BoxGeometry(0.58, 0.055, 0.055), '#687b6d', 'arm support strut');
    strut.position.set(-0.31, 2.91, 0);
    strut.rotation.z = 0.34;
    root.add(strut);
    for (const x of [-0.78, -0.48]) {
      const frame = makeAssetMesh(new BoxGeometry(0.035, 0.27, 0.035), '#65786b', 'lantern glass guard');
      frame.position.set(x, 2.99, 0.15);
      root.add(frame);
    }
    const lowerRim = makeAssetMesh(new BoxGeometry(0.35, 0.055, 0.34), '#65786b', 'lantern lower rim');
    lowerRim.position.set(-0.63, 2.84, 0);
    root.add(lowerRim);
  }
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
