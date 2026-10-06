import { BoxGeometry, CylinderGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildPracticeRifle(close: boolean) {
  const root = createAssetRoot(close ? 'Practice rifle — close LOD' : 'Practice rifle — far LOD');
  const receiver = makeAssetMesh(new BoxGeometry(0.92, 0.32, 0.34), '#66736a', 'receiver');
  root.add(receiver);
  const barrel = makeAssetMesh(new CylinderGeometry(0.075, 0.075, close ? 0.95 : 0.82, close ? 8 : 5), '#434e49', 'barrel');
  barrel.rotation.z = -Math.PI / 2;
  barrel.position.x = 0.88;
  root.add(barrel);
  const stock = makeAssetMesh(new BoxGeometry(0.5, 0.23, 0.31), '#a97553', 'wooden stock');
  stock.position.x = -0.66;
  root.add(stock);
  const grip = makeAssetMesh(new BoxGeometry(0.18, close ? 0.42 : 0.3, 0.23), '#725944', 'grip');
  grip.position.set(-0.12, -0.32, 0);
  root.add(grip);
  if (close) {
    const sight = makeAssetMesh(new BoxGeometry(0.14, 0.17, 0.14), '#39443f', 'simple sight');
    sight.position.set(0.1, 0.23, 0);
    root.add(sight);
  }
  return root;
}

export const weaponPlaceholderAsset: AssetDefinition = Object.freeze({
  id: 'practice-rifle',
  displayName: 'Practice rifle placeholder',
  category: 'weapon',
  bounds: { min: [-1.2, -0.6, -0.35] as const, max: [1.5, 0.6, 0.35] as const },
  collision: [{ id: 'weapon-body', center: [0.12, 0, 0] as const, size: [2.45, 0.7, 0.62] as const }],
  lodFactories: { close: () => buildPracticeRifle(true), far: () => buildPracticeRifle(false) },
});
