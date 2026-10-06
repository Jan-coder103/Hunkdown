import { BoxGeometry, ConeGeometry, SphereGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildBuilding(close: boolean) {
  const root = createAssetRoot(close ? 'Pastel row house — close LOD' : 'Pastel row house — far LOD');
  const walls = makeAssetMesh(new BoxGeometry(2, 1.65, 2), '#e7a787', 'peach stucco facade');
  walls.position.y = 0.825;
  root.add(walls);

  const foundation = makeAssetMesh(new BoxGeometry(2.06, 0.16, 2.06), '#c58e72', 'stone foundation course');
  foundation.position.y = 0.08;
  root.add(foundation);
  const eaves = makeAssetMesh(new BoxGeometry(2.42, 0.11, 2.42), '#f2d9ac', 'painted roof eaves');
  eaves.position.y = 1.69;
  root.add(eaves);
  const roof = makeAssetMesh(new ConeGeometry(1.34, 0.78, 4), '#b85f52', 'low-poly terracotta hip roof');
  roof.position.y = 2.08;
  root.add(roof);

  // Recessed-looking upper windows and a centered entry make this house readable at street scale.
  for (const x of [-0.62, 0.62]) {
    const frame = makeAssetMesh(new BoxGeometry(0.54, 0.68, 0.075), '#f4d9ad', 'upper window surround');
    frame.position.set(x, 1.2, 1.035);
    root.add(frame);
    const glass = makeAssetMesh(new BoxGeometry(0.4, 0.5, 0.025), '#82b8b4', 'blue-green window glass', 0.32);
    glass.position.set(x, 1.2, 1.083);
    root.add(glass);
    const sash = makeAssetMesh(new BoxGeometry(0.035, 0.5, 0.035), '#f6edda', 'window center mullion');
    sash.position.set(x, 1.2, 1.105);
    root.add(sash);
    const sill = makeAssetMesh(new BoxGeometry(0.66, 0.085, 0.16), '#f5d9a2', 'projecting stone sill');
    sill.position.set(x, 0.84, 1.09);
    root.add(sill);
    if (close) {
      for (const side of [-1, 1]) {
        const shutter = makeAssetMesh(new BoxGeometry(0.09, 0.57, 0.065), '#718879', 'sage window shutter');
        shutter.position.set(x + side * 0.34, 1.2, 1.04);
        root.add(shutter);
      }
      const flowerBox = makeAssetMesh(new BoxGeometry(0.48, 0.095, 0.14), '#9a694d', 'window flower box');
      flowerBox.position.set(x, 0.75, 1.14);
      root.add(flowerBox);
      for (const flowerX of [x - 0.13, x, x + 0.13]) {
        const bloom = makeAssetMesh(new SphereGeometry(0.055, 5, 3), flowerX === x ? '#e7ad61' : '#cf715f', 'flower box bloom');
        bloom.position.set(flowerX, 0.85, 1.16);
        root.add(bloom);
      }
    }
  }

  const doorFrame = makeAssetMesh(new BoxGeometry(0.62, 1.0, 0.09), '#f3d7ab', 'painted entry surround');
  doorFrame.position.set(0, 0.5, 1.04);
  root.add(doorFrame);
  const door = makeAssetMesh(new BoxGeometry(0.43, 0.86, 0.055), '#6f665a', 'sage front door');
  door.position.set(0, 0.46, 1.098);
  root.add(door);
  const doorGlass = makeAssetMesh(new BoxGeometry(0.25, 0.28, 0.02), '#a9d1c9', 'door upper glass');
  doorGlass.position.set(0, 0.65, 1.132);
  root.add(doorGlass);
  const knob = makeAssetMesh(new SphereGeometry(0.035, 5, 3), '#e5bd69', 'brass door knob');
  knob.position.set(0.14, 0.43, 1.15);
  root.add(knob);
  const step = makeAssetMesh(new BoxGeometry(0.72, 0.13, 0.3), '#d6c3a3', 'front doorstep');
  step.position.set(0, 0.065, 1.16);
  root.add(step);

  if (close) {
    for (const x of [-0.93, 0.93]) {
      const pilaster = makeAssetMesh(new BoxGeometry(0.1, 1.58, 0.07), '#f0d3a9', 'front corner pilaster');
      pilaster.position.set(x, 0.85, 1.025);
      root.add(pilaster);
    }
    const belt = makeAssetMesh(new BoxGeometry(2.05, 0.075, 0.09), '#f3d9b2', 'facade belt course');
    belt.position.set(0, 1.66, 1.035);
    root.add(belt);
    const chimney = makeAssetMesh(new BoxGeometry(0.28, 0.48, 0.28), '#b65f50', 'terracotta chimney');
    chimney.position.set(0.78, 2.04, -0.37);
    root.add(chimney);
    const chimneyCap = makeAssetMesh(new BoxGeometry(0.36, 0.08, 0.36), '#8c5148', 'chimney cap');
    chimneyCap.position.set(0.78, 2.32, -0.37);
    root.add(chimneyCap);
  }
  return root;
}

export const buildingAsset: AssetDefinition = Object.freeze({
  id: 'pastel-row-house',
  displayName: 'Pastel row house',
  category: 'building',
  bounds: { min: [-1.4, 0, -1.4] as const, max: [1.4, 2.5, 1.4] as const },
  collision: [{ id: 'building-shell', center: [0, 0.825, 0] as const, size: [2, 1.65, 2] as const }],
  lodFactories: { close: () => buildBuilding(true), far: () => buildBuilding(false) },
});
