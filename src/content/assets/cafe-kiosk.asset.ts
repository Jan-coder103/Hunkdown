import { BoxGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildKiosk(close: boolean) {
  const root = createAssetRoot(close ? 'Street cafe kiosk — close LOD' : 'Street cafe kiosk — far LOD');
  const body = makeAssetMesh(new BoxGeometry(1.8, 1.65, 1.55), '#e6c889', 'kiosk counter');
  body.position.y = 0.825;
  root.add(body);
  const roof = makeAssetMesh(new BoxGeometry(2.1, 0.28, 1.85), '#bf6e55', 'kiosk canopy');
  roof.position.y = 1.76;
  root.add(roof);
  if (close) {
    const serviceWindow = makeAssetMesh(new BoxGeometry(1.1, 0.52, 0.08), '#a8d0c8', 'service window', 0.4);
    serviceWindow.position.set(0, 1.15, 0.8);
    root.add(serviceWindow);
  }
  return root;
}

export const cafeKioskAsset: AssetDefinition = Object.freeze({
  id: 'cafe-kiosk',
  displayName: 'Cafe kiosk',
  category: 'decoration',
  bounds: { min: [-1.1, 0, -1] as const, max: [1.1, 1.9, 1] as const },
  collision: [{ id: 'kiosk-body', center: [0, 0.825, 0] as const, size: [1.8, 1.65, 1.55] as const }],
  lodFactories: { close: () => buildKiosk(true), far: () => buildKiosk(false) },
});
