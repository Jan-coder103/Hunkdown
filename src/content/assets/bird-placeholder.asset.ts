import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

function buildTacticalBird(close: boolean) {
  const root = createAssetRoot(close ? 'Tactical bird placeholder — close LOD' : 'Tactical bird placeholder — far LOD');
  const body = makeAssetMesh(
    close ? new SphereGeometry(0.48, 10, 7) : new SphereGeometry(0.5, 6, 4),
    '#f4e8c7',
    'feathered body',
  );
  body.scale.set(0.9, 1.08, 0.82);
  body.position.y = 0.64;
  root.add(body);
  const head = makeAssetMesh(
    close ? new SphereGeometry(0.3, 9, 6) : new SphereGeometry(0.33, 6, 4),
    '#f7edcf',
    'head',
  );
  head.position.set(0, 1.2, 0.12);
  root.add(head);
  const helmet = makeAssetMesh(
    close ? new SphereGeometry(0.32, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2) : new BoxGeometry(0.56, 0.17, 0.5),
    '#748d76',
    'field helmet',
  );
  helmet.position.set(0, 1.39, 0.08);
  root.add(helmet);
  const beak = makeAssetMesh(new ConeGeometry(0.14, 0.32, close ? 5 : 4), '#e5a247', 'beak');
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 1.15, 0.43);
  root.add(beak);
  for (const x of [-0.19, 0.19]) {
    const foot = makeAssetMesh(new CylinderGeometry(0.045, 0.065, 0.32, close ? 6 : 4), '#dd9946', 'leg');
    foot.position.set(x, 0.16, 0);
    root.add(foot);
  }
  if (close) {
    const vest = makeAssetMesh(new BoxGeometry(0.76, 0.38, 0.24), '#65786e', 'simple tactical vest');
    vest.position.set(0, 0.63, 0.35);
    root.add(vest);
    const eye = makeAssetMesh(new SphereGeometry(0.035, 6, 4), '#34413b', 'eye');
    eye.position.set(0.2, 1.24, 0.36);
    root.add(eye);
  }
  return root;
}

export const birdPlaceholderAsset: AssetDefinition = Object.freeze({
  id: 'tactical-bird-placeholder',
  displayName: 'Tactical bird placeholder',
  category: 'bird',
  bounds: { min: [-0.7, 0, -0.45] as const, max: [0.7, 1.75, 0.7] as const },
  collision: [
    { id: 'body', center: [0, 0.67, 0] as const, size: [0.9, 1.25, 0.65] as const },
    { id: 'head', center: [0, 1.22, 0.12] as const, size: [0.62, 0.52, 0.58] as const },
  ],
  lodFactories: { close: () => buildTacticalBird(true), far: () => buildTacticalBird(false) },
});
