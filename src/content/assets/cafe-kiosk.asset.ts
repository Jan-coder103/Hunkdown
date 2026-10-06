import { BoxGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildKiosk(close: boolean) {
  const root = createAssetRoot(close ? 'Street cafe kiosk — close LOD' : 'Street cafe kiosk — far LOD');
  const body = makeAssetMesh(new BoxGeometry(1.8, 1.05, 1.55), '#e6c889', 'cream plaster kiosk base');
  body.position.y = 0.525;
  root.add(body);
  const counter = makeAssetMesh(new BoxGeometry(1.95, 0.13, 1.68), '#bd7756', 'timber service counter');
  counter.position.set(0, 1.08, 0.015);
  root.add(counter);
  const canopy = makeAssetMesh(new BoxGeometry(2.1, 0.22, 1.85), '#bf6e55', 'terracotta kiosk canopy');
  canopy.position.y = 1.76;
  root.add(canopy);

  if (close) {
    const serviceWindow = makeAssetMesh(new BoxGeometry(1.08, 0.4, 0.06), '#96c9c0', 'service window glass', 0.34);
    serviceWindow.position.set(0, 1.35, 0.808);
    root.add(serviceWindow);
    const sill = makeAssetMesh(new BoxGeometry(1.3, 0.1, 0.2), '#f5dfb6', 'service window sill');
    sill.position.set(0, 1.13, 0.84);
    root.add(sill);
    for (const x of [-0.72, 0.72]) {
      const post = makeAssetMesh(new BoxGeometry(0.08, 0.63, 0.08), '#718879', 'sage canopy support post');
      post.position.set(x, 1.39, 0.79);
      root.add(post);
    }
    const fascia = makeAssetMesh(new BoxGeometry(1.58, 0.26, 0.08), '#718879', 'cafe name fascia');
    fascia.position.set(0, 1.68, 0.91);
    root.add(fascia);
    const fasciaStripe = makeAssetMesh(new BoxGeometry(1.28, 0.045, 0.03), '#f0d19a', 'fascia inset stripe');
    fasciaStripe.position.set(0, 1.68, 0.963);
    root.add(fasciaStripe);
    for (const [index, x] of [-0.85, -0.51, -0.17, 0.17, 0.51, 0.85].entries()) {
      const stripe = makeAssetMesh(new BoxGeometry(0.33, 0.2, 0.11), index % 2 === 0 ? '#f0d19a' : '#cf7256', 'striped canopy valance');
      stripe.position.set(x, 1.59, 0.92);
      root.add(stripe);
    }
    const sideMenu = makeAssetMesh(new BoxGeometry(0.05, 0.36, 0.31), '#dcb772', 'side menu board');
    sideMenu.position.set(0.92, 1.36, 0.43);
    root.add(sideMenu);
    for (const y of [1.43, 1.34, 1.25]) {
      const menuLine = makeAssetMesh(new BoxGeometry(0.025, 0.025, 0.2), '#5f7060', 'menu board mark');
      menuLine.position.set(0.95, y, 0.43);
      root.add(menuLine);
    }
  } else {
    const serving = makeAssetMesh(new BoxGeometry(1.2, 0.42, 0.06), '#96c9c0', 'service window');
    serving.position.set(0, 1.35, 0.8);
    root.add(serving);
    const fascia = makeAssetMesh(new BoxGeometry(1.7, 0.22, 0.08), '#718879', 'cafe fascia');
    fascia.position.set(0, 1.65, 0.9);
    root.add(fascia);
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
