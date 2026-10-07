import {
  BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  TorusGeometry,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { MovementWorld, type RectangleObstacle, type RampSurface } from './movement-world';

const OBSTACLES: readonly RectangleObstacle[] = [
  { minX: -5.2, maxX: -3.2, minZ: -6.2, maxZ: -4.2, maxY: 1.5 },
  { minX: 1.2, maxX: 2.6, minZ: -7.3, maxZ: -6.1, maxY: 0.65 },
  { minX: -4.1, maxX: 4.1, minZ: -12.3, maxZ: -11.75, maxY: 2.8 },
  ...[-8, 0, 8].map((lane) => ({
    id: `range-backstop-${lane}`,
    minX: lane - 1.8,
    maxX: lane + 1.8,
    minZ: -15.8,
    maxZ: -15.3,
    maxY: 3.8,
  })),
];

const RAMPS: readonly RampSurface[] = [
  {
    minX: 3,
    maxX: 7,
    minZ: -8,
    maxZ: 0,
    lowY: 0,
    rise: 1.8,
    risesAlong: 'z',
    risesTowardPositive: false,
  },
];

export const MOVEMENT_PLAYGROUND_CLASS = Object.freeze({
  name: 'Movement Test Class',
  crouchMode: 'hold' as const,
  capabilities: Object.freeze({ boostedDoubleJump: true, wallJump: true }),
});

function createRampGeometry(width: number, depth: number, rise: number): BufferGeometry {
  const x0 = -width / 2;
  const x1 = width / 2;
  const z0 = -depth / 2;
  const z1 = depth / 2;
  const lowLeft = new Vector3(x0, 0, z1);
  const lowRight = new Vector3(x1, 0, z1);
  const highLeft = new Vector3(x0, rise, z0);
  const highRight = new Vector3(x1, rise, z0);
  const bottomLowLeft = new Vector3(x0, 0, z1);
  const bottomLowRight = new Vector3(x1, 0, z1);
  const bottomHighLeft = new Vector3(x0, 0, z0);
  const bottomHighRight = new Vector3(x1, 0, z0);
  const positions: number[] = [];

  const triangle = (a: Vector3, b: Vector3, c: Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const quad = (a: Vector3, b: Vector3, c: Vector3, d: Vector3) => {
    triangle(a, b, c);
    triangle(a, c, d);
  };

  quad(lowLeft, lowRight, highRight, highLeft);
  quad(bottomHighLeft, bottomHighRight, bottomLowRight, bottomLowLeft);
  quad(bottomLowLeft, bottomLowRight, lowRight, lowLeft);
  quad(highLeft, highRight, bottomHighRight, bottomHighLeft);
  quad(lowLeft, highLeft, bottomHighLeft, bottomLowLeft);
  quad(lowRight, highRight, bottomHighRight, bottomLowRight);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function disposeObjectResources(object: Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof Mesh || child instanceof LineSegments)) return;
    child.geometry.dispose();
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material.dispose();
  });
}

/** Creates the shooting lanes, reactive range backstops, movement obstacles, and traversal ramp. */
export function createMovementPlayground(scene: Scene) {
  const ownedObjects: Object3D[] = [];
  const addOwned = <T extends Object3D>(object: T): T => {
    ownedObjects.push(object);
    scene.add(object);
    return object;
  };

  const ground = new Mesh(
    new PlaneGeometry(36, 36),
    new MeshStandardMaterial({ color: '#e9e4d1', roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  addOwned(ground);

  const grid = new GridHelper(36, 36, '#829d8e', '#bdcbb9');
  grid.position.y = 0.006;
  const gridMaterials: Material[] = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const material of gridMaterials) {
    material.transparent = true;
    material.opacity = 0.42;
  }
  addOwned(grid);

  // Three clear firing lanes run from the firing line to the far backstops.
  // Their floor markings stay low enough not to interfere with hitscan shots.
  const laneCenters = [-8, 0, 8] as const;
  for (let laneIndex = 0; laneIndex < laneCenters.length; laneIndex += 1) {
    const lane = laneCenters[laneIndex];
    if (lane === undefined) continue;
    for (const edge of [-1.65, 1.65]) {
      const stripe = new Mesh(
        new BoxGeometry(0.075, 0.018, 25),
        new MeshStandardMaterial({ color: laneIndex === 1 ? '#f0d895' : '#9db9a5', roughness: 1 }),
      );
      stripe.name = `shooting lane ${laneIndex + 1} boundary`;
      stripe.position.set(lane + edge, 0.012, -2.5);
      addOwned(stripe);
    }
    const backstop = new Mesh(
      new BoxGeometry(3.6, 3.8, 0.5),
      new MeshStandardMaterial({ color: laneIndex === 1 ? '#c77b55' : '#748d78', roughness: 0.9 }),
    );
    backstop.name = `shooting lane ${laneIndex + 1} backstop`;
    backstop.position.set(lane, 1.9, -15.55);
    backstop.castShadow = true;
    backstop.receiveShadow = true;
    addOwned(backstop);

    // Small ground bars mark the 10 m, 15 m, and 20 m target lines.
    for (const [markIndex, z] of [-1, -6, -11].entries()) {
      const marker = new Mesh(
        new BoxGeometry(2.8, 0.025, 0.12),
        new MeshStandardMaterial({ color: markIndex === 0 ? '#e8c879' : '#d8e0cb', roughness: 1 }),
      );
      marker.name = `shooting lane ${laneIndex + 1} distance mark ${10 + markIndex * 5} m`;
      marker.position.set(lane, 0.02, z + 1.1);
      addOwned(marker);
    }
  }

  const firingLine = new Mesh(
    new BoxGeometry(25, 0.03, 0.22),
    new MeshStandardMaterial({ color: '#d8a85e', roughness: 1 }),
  );
  firingLine.name = 'shooting range firing line';
  firingLine.position.set(0, 0.025, 9);
  addOwned(firingLine);

  for (const obstacle of OBSTACLES) {
    const width = obstacle.maxX - obstacle.minX;
    const depth = obstacle.maxZ - obstacle.minZ;
    const height = obstacle.maxY;
    const color = height < 1 ? '#e9b99f' : width > 4 ? '#d79e9c' : '#99bdb0';
    const block = new Mesh(
      new BoxGeometry(width, height, depth),
      new MeshStandardMaterial({ color, roughness: 0.82 }),
    );
    block.position.set(
      (obstacle.minX + obstacle.maxX) / 2,
      height / 2,
      (obstacle.minZ + obstacle.maxZ) / 2,
    );
    block.castShadow = true;
    block.receiveShadow = true;
    addOwned(block);
  }

  const ramp = new Mesh(
    createRampGeometry(4, 8, 1.8),
    new MeshStandardMaterial({ color: '#e2c47b', roughness: 0.88, side: DoubleSide }),
  );
  ramp.position.set(5, 0, -4);
  ramp.castShadow = true;
  ramp.receiveShadow = true;
  addOwned(ramp);

  // Low-poly bullseyes sit behind each chicken, so aim practice has a clear
  // visual anchor without replacing the game's actual hitboxes.
  for (const lane of laneCenters) {
    for (const z of [-1, -6, -11]) {
      const plate = new Mesh(
        new CylinderGeometry(0.76, 0.76, 0.12, 12),
        new MeshStandardMaterial({ color: '#f5e7be', roughness: 0.78 }),
      );
      plate.name = `shooting target plate ${lane},${z}`;
      plate.rotation.x = Math.PI / 2;
      plate.position.set(lane, 1.05, z - 0.72);
      addOwned(plate);
      const ring = new Mesh(
        new TorusGeometry(0.43, 0.055, 5, 12),
        new MeshStandardMaterial({ color: '#cf7652', roughness: 0.75 }),
      );
      ring.name = `shooting target bullseye ${lane},${z}`;
      ring.rotation.x = Math.PI / 2;
      ring.position.set(lane, 1.05, z - 0.64);
      addOwned(ring);
    }
  }

  let disposed = false;
  return {
    world: new MovementWorld({ halfExtent: 18, obstacles: OBSTACLES, ramps: RAMPS }),
    setVisible(visible: boolean) {
      for (const object of ownedObjects) object.visible = visible;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const object of ownedObjects) {
        scene.remove(object);
        disposeObjectResources(object);
      }
    },
  };
}
