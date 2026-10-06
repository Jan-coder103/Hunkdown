import {
  BufferGeometry,
  BoxGeometry,
  DoubleSide,
  Float32BufferAttribute,
  GridHelper,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { MovementWorld, type RectangleObstacle, type RampSurface } from './movement-world';

const OBSTACLES: readonly RectangleObstacle[] = [
  { minX: -5.2, maxX: -3.2, minZ: -6.2, maxZ: -4.2, maxY: 1.5 },
  { minX: -1.7, maxX: -0.3, minZ: -7.3, maxZ: -6.1, maxY: 0.65 },
  { minX: -4.1, maxX: 4.1, minZ: -12.3, maxZ: -11.75, maxY: 2.8 },
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

/** Creates the test floor, grid, ramp, and matching collision definitions. */
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

  let disposed = false;
  return {
    world: new MovementWorld({ halfExtent: 18, obstacles: OBSTACLES, ramps: RAMPS }),
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
