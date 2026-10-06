import { BoxGeometry, CylinderGeometry, TorusGeometry, Vector3 } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

const TIRE = '#465650';
const FRAME = '#c76d50';
const METAL = '#687a73';

function addTube(root: ReturnType<typeof createAssetRoot>, name: string, start: Vector3, end: Vector3, radius: number, color: string, segments: number): void {
  const direction = end.clone().sub(start);
  const tube = makeAssetMesh(new CylinderGeometry(radius * 0.84, radius, direction.length(), segments), color, name);
  tube.position.copy(start).add(end).multiplyScalar(0.5);
  tube.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), direction.normalize());
  root.add(tube);
}

function buildBicycle(close: boolean) {
  const root = createAssetRoot(close ? 'Leaning bicycle — close LOD' : 'Leaning bicycle — far LOD');
  const wheels = [-0.58, 0.58].map((x) => new Vector3(x, 0.49, 0));
  const spokes = close ? 7 : 0;
  for (const center of wheels) {
    const wheel = makeAssetMesh(new TorusGeometry(0.39, 0.055, close ? 5 : 4, close ? 12 : 8), TIRE, 'rubber bicycle tire');
    wheel.position.copy(center);
    wheel.rotation.y = Math.PI / 2;
    root.add(wheel);
    if (close) {
      const rim = makeAssetMesh(new TorusGeometry(0.32, 0.022, 4, 10), '#b5b9a4', 'steel wheel rim');
      rim.position.copy(center);
      rim.rotation.y = Math.PI / 2;
      root.add(rim);
      const hub = makeAssetMesh(new CylinderGeometry(0.065, 0.065, 0.16, 6), '#ad7956', 'wheel hub');
      hub.position.copy(center);
      hub.rotation.z = Math.PI / 2;
      root.add(hub);
      for (let index = 0; index < spokes; index += 1) {
        const angle = (index / spokes) * Math.PI * 2;
        const endpoint = center.clone().add(new Vector3(0, Math.cos(angle) * 0.3, Math.sin(angle) * 0.3));
        addTube(root, 'fine wheel spoke', center, endpoint, 0.008, '#abb1a4', 4);
      }
    }
  }

  const rear = wheels[0] ?? new Vector3(-0.58, 0.49, 0);
  const front = wheels[1] ?? new Vector3(0.58, 0.49, 0);
  const crank = new Vector3(-0.1, 0.53, 0);
  const seat = new Vector3(-0.18, 0.99, 0);
  const head = new Vector3(0.34, 0.91, 0);
  const frameSegments = close ? 6 : 4;
  addTube(root, 'rear chain stay', rear, crank, 0.035, FRAME, frameSegments);
  addTube(root, 'seat tube', crank, seat, 0.04, FRAME, frameSegments);
  addTube(root, 'seat stay', rear, seat, 0.03, FRAME, frameSegments);
  addTube(root, 'top tube', seat, head, 0.035, FRAME, frameSegments);
  addTube(root, 'down tube', crank, head, 0.042, FRAME, frameSegments);
  addTube(root, 'front fork', front, head, 0.032, METAL, frameSegments);

  const seatPost = makeAssetMesh(new CylinderGeometry(0.035, 0.035, 0.23, 5), METAL, 'seat post');
  seatPost.position.set(seat.x, 1.035, 0);
  seatPost.rotation.z = -0.1;
  root.add(seatPost);
  const saddle = makeAssetMesh(new BoxGeometry(0.34, 0.08, 0.18), '#514c42', 'leather saddle');
  saddle.position.set(-0.22, 1.16, 0);
  root.add(saddle);
  const stem = makeAssetMesh(new CylinderGeometry(0.035, 0.04, 0.24, 5), METAL, 'handlebar stem');
  stem.position.set(0.36, 1.02, 0);
  stem.rotation.z = -0.18;
  root.add(stem);
  const handlebar = makeAssetMesh(new CylinderGeometry(0.025, 0.025, 0.44, 5), '#4d5b55', 'swept handlebar');
  handlebar.position.set(0.4, 1.13, 0);
  handlebar.rotation.x = Math.PI / 2;
  root.add(handlebar);

  if (close) {
    const crankArm = makeAssetMesh(new BoxGeometry(0.32, 0.04, 0.045), METAL, 'crank arm');
    crankArm.position.copy(crank);
    crankArm.rotation.z = -0.45;
    root.add(crankArm);
    const chainring = makeAssetMesh(new TorusGeometry(0.12, 0.022, 4, 8), '#8d9a80', 'chain ring');
    chainring.position.copy(crank);
    chainring.rotation.y = Math.PI / 2;
    root.add(chainring);
    const pedal = makeAssetMesh(new BoxGeometry(0.12, 0.045, 0.09), '#485851', 'near pedal');
    pedal.position.set(0.05, 0.39, 0.07);
    root.add(pedal);
    const basket = makeAssetMesh(new BoxGeometry(0.34, 0.25, 0.3), '#a98a60', 'small wicker front basket');
    basket.position.set(0.53, 1.12, 0.02);
    root.add(basket);
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
