import { BoxGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildCafe(close: boolean) {
  const root = createAssetRoot(close ? 'Corner cafe — close LOD' : 'Corner cafe — far LOD');
  const walls = makeAssetMesh(new BoxGeometry(2.8, 1.75, 2.8), '#d9a36f', 'cafe walls');
  walls.position.y = 0.875;
  root.add(walls);

  const roof = makeAssetMesh(new BoxGeometry(2.95, 0.2, 2.95), '#577b71', 'flat cafe roof');
  roof.position.y = 1.84;
  root.add(roof);

  if (close) {
    const trim = '#f0d19a';
    const frame = '#765e4c';
    const glass = '#a8d0c8';
    const awningColors = ['#cf7256', '#f0d19a', '#cf7256', '#f0d19a', '#cf7256', '#f0d19a'];

    for (const [index, x] of [-1.2, -0.72, -0.24, 0.24, 0.72, 1.2].entries()) {
      const stripe = makeAssetMesh(new BoxGeometry(0.48, 0.25, 0.14), awningColors[index] ?? '#cf7256', 'front striped awning');
      stripe.position.set(x, 1.4, 1.36);
      root.add(stripe);

      const sideStripe = makeAssetMesh(new BoxGeometry(0.14, 0.25, 0.48), awningColors[index] ?? '#cf7256', 'side striped awning');
      sideStripe.position.set(1.36, 1.4, x);
      root.add(sideStripe);
    }

    for (const x of [-0.7, 0]) {
      const windowFrame = makeAssetMesh(new BoxGeometry(0.66, 0.82, 0.07), frame, 'front cafe window frame');
      windowFrame.position.set(x, 0.91, 1.42);
      root.add(windowFrame);
      const window = makeAssetMesh(new BoxGeometry(0.56, 0.7, 0.045), glass, 'front cafe display window', 0.42);
      window.position.set(x, 0.93, 1.46);
      root.add(window);
      const sill = makeAssetMesh(new BoxGeometry(0.73, 0.075, 0.12), trim, 'front cafe window sill');
      sill.position.set(x, 0.48, 1.45);
      root.add(sill);
    }

    const doorFrame = makeAssetMesh(new BoxGeometry(0.56, 1.03, 0.075), frame, 'cafe door frame');
    doorFrame.position.set(0.89, 0.535, 1.42);
    root.add(doorFrame);
    const door = makeAssetMesh(new BoxGeometry(0.44, 0.88, 0.04), '#687c70', 'cafe front door');
    door.position.set(0.89, 0.49, 1.465);
    root.add(door);
    const doorGlass = makeAssetMesh(new BoxGeometry(0.28, 0.3, 0.018), glass, 'cafe door glass', 0.42);
    doorGlass.position.set(0.89, 0.69, 1.48);
    root.add(doorGlass);
    const handle = makeAssetMesh(new BoxGeometry(0.025, 0.11, 0.025), trim, 'cafe door handle');
    handle.position.set(0.73, 0.43, 1.48);
    root.add(handle);

    const sideFrame = makeAssetMesh(new BoxGeometry(0.07, 0.82, 0.78), frame, 'side cafe window frame');
    sideFrame.position.set(1.42, 0.91, -0.42);
    root.add(sideFrame);
    const sideWindow = makeAssetMesh(new BoxGeometry(0.045, 0.7, 0.68), glass, 'side cafe display window', 0.42);
    sideWindow.position.set(1.46, 0.93, -0.42);
    root.add(sideWindow);
    const sideSill = makeAssetMesh(new BoxGeometry(0.12, 0.075, 0.84), trim, 'side cafe window sill');
    sideSill.position.set(1.45, 0.48, -0.42);
    root.add(sideSill);

    const sign = makeAssetMesh(new BoxGeometry(0.62, 0.19, 0.055), '#d7b66d', 'corner cafe signboard');
    sign.position.set(-0.42, 1.64, 1.425);
    root.add(sign);
    const signInset = makeAssetMesh(new BoxGeometry(0.48, 0.075, 0.02), '#577b71', 'corner cafe sign inset');
    signInset.position.set(-0.42, 1.64, 1.463);
    root.add(signInset);
  } else {
    const awning = makeAssetMesh(new BoxGeometry(2.95, 0.25, 0.14), '#cf7256', 'street awning');
    awning.position.set(0, 1.4, 1.36);
    root.add(awning);
    const sideAwning = makeAssetMesh(new BoxGeometry(0.14, 0.25, 2.95), '#cf7256', 'side street awning');
    sideAwning.position.set(1.36, 1.4, 0);
    root.add(sideAwning);
    const window = makeAssetMesh(new BoxGeometry(1.35, 0.72, 0.06), '#b9d9d2', 'front cafe window', 0.42);
    window.position.set(-0.28, 0.94, 1.42);
    root.add(window);
  }
  return root;
}

export const cornerCafeAsset: AssetDefinition = Object.freeze({
  id: 'corner-cafe',
  displayName: 'Corner cafe',
  category: 'building',
  bounds: { min: [-1.5, 0, -1.5] as const, max: [1.5, 2, 1.5] as const },
  collision: [{ id: 'cafe-shell', center: [0, 0.875, 0] as const, size: [2.8, 1.75, 2.8] as const }],
  lodFactories: { close: () => buildCafe(true), far: () => buildCafe(false) },
});
