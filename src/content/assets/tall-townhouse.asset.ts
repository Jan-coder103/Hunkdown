import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildTownhouse(close: boolean) {
  const root = createAssetRoot(close ? 'Tall townhouse — close LOD' : 'Tall townhouse — far LOD');
  const body = makeAssetMesh(new BoxGeometry(2.7, 2.5, 2.7), '#8fb8aa', 'sea-glass townhouse facade');
  body.position.y = 1.25;
  root.add(body);
  const foundation = makeAssetMesh(new BoxGeometry(2.76, 0.16, 2.76), '#d3c3a5', 'stone foundation');
  foundation.position.y = 0.08;
  root.add(foundation);
  const roofEave = makeAssetMesh(new BoxGeometry(2.94, 0.12, 2.94), '#f2dfbd', 'wide roof cornice');
  roofEave.position.y = 2.52;
  root.add(roofEave);
  const roof = makeAssetMesh(new ConeGeometry(1.38, 0.7, 4), '#cb775c', 'terracotta mansard roof');
  roof.position.y = 2.84;
  root.add(roof);

  for (const y of [0.82, 1.82]) {
    for (const x of [-0.68, 0.68]) {
      const surround = makeAssetMesh(new BoxGeometry(0.58, 0.72, 0.085), '#f1dfbd', 'townhouse window surround');
      surround.position.set(x, y, 1.39);
      root.add(surround);
      const glass = makeAssetMesh(new BoxGeometry(0.42, 0.54, 0.03), '#94c5c0', 'tall blue-green window glass', 0.32);
      glass.position.set(x, y, 1.445);
      root.add(glass);
      const mullion = makeAssetMesh(new BoxGeometry(0.035, 0.54, 0.035), '#f8ebcf', 'vertical window mullion');
      mullion.position.set(x, y, 1.47);
      root.add(mullion);
      const crossbar = makeAssetMesh(new BoxGeometry(0.42, 0.035, 0.035), '#f8ebcf', 'horizontal window mullion');
      crossbar.position.set(x, y, 1.47);
      root.add(crossbar);
      const sill = makeAssetMesh(new BoxGeometry(0.68, 0.09, 0.17), '#ebd3aa', 'projecting townhouse sill');
      sill.position.set(x, y - 0.39, 1.39);
      root.add(sill);
      if (close) {
        for (const side of [-1, 1]) {
          const shutter = makeAssetMesh(new BoxGeometry(0.075, 0.6, 0.06), '#cf7a60', 'coral window shutter');
          shutter.position.set(x + side * 0.37, y, 1.4);
          root.add(shutter);
        }
      }
    }
  }

  const entrySurround = makeAssetMesh(new BoxGeometry(0.72, 1.05, 0.1), '#e8d3ad', 'arched-look entry surround');
  entrySurround.position.set(0, 0.525, 1.39);
  root.add(entrySurround);
  const door = makeAssetMesh(new BoxGeometry(0.48, 0.84, 0.06), '#725849', 'dark oak townhouse door');
  door.position.set(0, 0.45, 1.42);
  root.add(door);
  const doorPanel = makeAssetMesh(new BoxGeometry(0.3, 0.3, 0.025), '#92705b', 'raised door panel');
  doorPanel.position.set(0, 0.56, 1.458);
  root.add(doorPanel);
  const brassKnob = makeAssetMesh(new SphereGeometry(0.035, 5, 3), '#e6bd65', 'brass door handle');
  brassKnob.position.set(0.17, 0.42, 1.46);
  root.add(brassKnob);
  const doorstep = makeAssetMesh(new BoxGeometry(0.86, 0.13, 0.24), '#d2c0a0', 'stone entry step');
  doorstep.position.set(0, 0.065, 1.38);
  root.add(doorstep);

  if (close) {
    const belt = makeAssetMesh(new BoxGeometry(2.76, 0.08, 0.09), '#efdbb7', 'second-floor belt course');
    belt.position.set(0, 1.35, 1.395);
    root.add(belt);
    for (const x of [-1.28, 1.28]) {
      const pilaster = makeAssetMesh(new BoxGeometry(0.11, 2.3, 0.09), '#d6b995', 'front facade pilaster');
      pilaster.position.set(x, 1.25, 1.395);
      root.add(pilaster);
    }
    const chimney = makeAssetMesh(new CylinderGeometry(0.13, 0.16, 0.48, 5), '#a9594d', 'roof chimney');
    chimney.position.set(-0.82, 3.0, -0.48);
    root.add(chimney);
    const dormer = makeAssetMesh(new BoxGeometry(0.52, 0.42, 0.42), '#8fb8aa', 'front roof dormer');
    dormer.position.set(0.55, 2.78, 1.02);
    root.add(dormer);
    const dormerRoof = makeAssetMesh(new ConeGeometry(0.38, 0.22, 4), '#bf6e55', 'small dormer roof');
    dormerRoof.position.set(0.55, 2.99, 1.02);
    root.add(dormerRoof);
    const dormerWindow = makeAssetMesh(new BoxGeometry(0.27, 0.2, 0.035), '#94c5c0', 'dormer window');
    dormerWindow.position.set(0.55, 2.79, 1.24);
    root.add(dormer);
    root.add(dormerWindow);
  }
  return root;
}

export const tallTownhouseAsset: AssetDefinition = Object.freeze({
  id: 'tall-townhouse',
  displayName: 'Tall townhouse',
  category: 'building',
  bounds: { min: [-1.5, 0, -1.5] as const, max: [1.5, 3.25, 1.5] as const },
  collision: [{ id: 'townhouse-shell', center: [0, 1.25, 0] as const, size: [2.7, 2.5, 2.7] as const }],
  lodFactories: { close: () => buildTownhouse(true), far: () => buildTownhouse(false) },
});
