import { BoxGeometry, CylinderGeometry, TorusGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildBicycle(close: boolean) {
  const root = createAssetRoot(close ? 'Leaning bicycle — close LOD' : 'Leaning bicycle — far LOD');
  for (const x of [-0.58, 0.58]) {
    const wheel = makeAssetMesh(new TorusGeometry(0.4, 0.055, close ? 5 : 4, close ? 10 : 7), '#4b5b58', 'bicycle wheel');
    wheel.position.set(x, 0.5, 0);
    wheel.rotation.y = Math.PI / 2;
    root.add(wheel);
  }
  const frame = makeAssetMesh(new BoxGeometry(1.2, 0.08, 0.08), '#c76d50', 'bicycle frame');
  frame.position.set(0, 0.72, 0);
  root.add(frame);
  if (close) {
    const seat = makeAssetMesh(new BoxGeometry(0.32, 0.08, 0.18), '#514c42', 'bicycle saddle');
    seat.position.set(-0.12, 1.02, 0);
    root.add(seat);
    const handle = makeAssetMesh(new CylinderGeometry(0.035, 0.035, 0.42, 5), '#596761', 'bicycle handlebar');
    handle.position.set(0.53, 0.98, 0);
    root.add(handle);
  }
  return root;
}

export const bicycleAsset: AssetDefinition = Object.freeze({
  id: 'street-bicycle',
  displayName: 'Street bicycle',
  category: 'decoration',
  bounds: { min: [-1.1, 0, -0.5] as const, max: [1.1, 1.25, 0.5] as const },
  collision: [{ id: 'bicycle-frame', center: [0, 0.62, 0] as const, size: [1.3, 0.72, 0.18] as const }],
  lodFactories: { close: () => buildBicycle(true), far: () => buildBicycle(false) },
});
