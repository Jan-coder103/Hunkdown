export type RectangleObstacle = Readonly<{
  id?: string;
  health?: number;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY: number;
}>;

export type RampSurface = Readonly<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  lowY: number;
  rise: number;
  risesAlong: 'x' | 'z';
  risesTowardPositive: boolean;
}>;

export type GroundSurface = Readonly<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}>;

export type HorizontalMoveResult = Readonly<{
  x: number;
  z: number;
  wallNormalX: number;
  wallNormalZ: number;
}>;

export type WorldRayHit = Readonly<{ distance: number; obstacleId?: string; destructible: boolean }>;

export type DestructibleObstacleSnapshot = Readonly<{
  id: string;
  center: Readonly<{ x: number; y: number; z: number }>;
  radius: number;
  health: number;
  maxHealth: number;
}>;

type MutableObstacle = {
  readonly definition: RectangleObstacle;
  health: number;
};

export type MovementWorldOptions = Readonly<{
  halfExtent: number;
  halfWidth?: number;
  halfDepth?: number;
  obstacles: readonly RectangleObstacle[];
  ramps?: readonly RampSurface[];
  groundSurfaces?: readonly GroundSurface[];
}>;

/** Kinematic horizontal collision and walkable ramp surfaces for the movement playground. */
export class MovementWorld {
  private readonly halfWidth: number;
  private readonly halfDepth: number;
  private readonly ramps: readonly RampSurface[];
  private readonly obstacles: MutableObstacle[];

  constructor(private readonly options: MovementWorldOptions) {
    if (!Number.isFinite(options.halfExtent) || options.halfExtent <= 0) {
      throw new RangeError('halfExtent must be a finite positive number');
    }
    this.halfWidth = options.halfWidth ?? options.halfExtent;
    this.halfDepth = options.halfDepth ?? options.halfExtent;
    if (![this.halfWidth, this.halfDepth].every((extent) => Number.isFinite(extent) && extent > 0)) {
      throw new RangeError('World width and depth must be finite and positive');
    }
    this.ramps = options.ramps ?? [];
    this.obstacles = options.obstacles.map((definition) => ({
      definition,
      health: definition.health ?? Number.POSITIVE_INFINITY,
    }));
  }

  get destructibleObstacles(): readonly DestructibleObstacleSnapshot[] {
    const groups = new Map<string, MutableObstacle[]>();
    for (const obstacle of this.obstacles) {
      const id = obstacle.definition.id;
      if (!id || !Number.isFinite(obstacle.definition.health)) continue;
      const group = groups.get(id) ?? [];
      group.push(obstacle);
      groups.set(id, group);
    }
    return [...groups].map(([id, group]) => {
      const minX = Math.min(...group.map(({ definition }) => definition.minX));
      const maxX = Math.max(...group.map(({ definition }) => definition.maxX));
      const minZ = Math.min(...group.map(({ definition }) => definition.minZ));
      const maxZ = Math.max(...group.map(({ definition }) => definition.maxZ));
      const minY = Math.min(...group.map(({ definition }) => definition.minY ?? 0));
      const maxY = Math.max(...group.map(({ definition }) => definition.maxY));
      return Object.freeze({
        id,
        center: Object.freeze({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 }),
        radius: Math.hypot(maxX - minX, maxZ - minZ) / 2,
        health: Math.min(...group.map(({ health }) => health)),
        maxHealth: Math.max(...group.map(({ definition }) => definition.health!)),
      });
    });
  }

  /** Applies finite damage to every collider belonging to a destructible object. */
  damageObstacle(id: string, amount: number): boolean {
    if (!id || !Number.isFinite(amount) || amount <= 0) return false;
    const group = this.obstacles.filter(({ definition }) => definition.id === id);
    if (group.length === 0 || group.some(({ definition }) => !Number.isFinite(definition.health))) return false;
    let remaining = Math.max(...group.map(({ health }) => health)) - amount;
    if (remaining <= 0) {
      for (let index = this.obstacles.length - 1; index >= 0; index -= 1) {
        if (this.obstacles[index]?.definition.id === id) this.obstacles.splice(index, 1);
      }
      return true;
    }
    remaining = Math.max(0, remaining);
    for (const obstacle of group) obstacle.health = remaining;
    return false;
  }

  groundHeightAt(x: number, z: number): number {
    let height = 0;
    for (const surface of this.options.groundSurfaces ?? []) {
      if (x >= surface.minX && x <= surface.maxX && z >= surface.minZ && z <= surface.maxZ) {
        height = Math.max(height, surface.height);
      }
    }
    for (const ramp of this.ramps) {
      if (x < ramp.minX || x > ramp.maxX || z < ramp.minZ || z > ramp.maxZ) continue;
      const coordinate = ramp.risesAlong === 'x' ? x : z;
      const min = ramp.risesAlong === 'x' ? ramp.minX : ramp.minZ;
      const max = ramp.risesAlong === 'x' ? ramp.maxX : ramp.maxZ;
      const linearProgress = (coordinate - min) / (max - min);
      const progress = ramp.risesTowardPositive ? linearProgress : 1 - linearProgress;
      height = Math.max(height, ramp.lowY + ramp.rise * Math.min(1, Math.max(0, progress)));
    }
    return height;
  }

  /** Returns the nearest ray hit against solid movement obstacles, if any. */
  raycast(
    origin: Readonly<{ x: number; y: number; z: number }>,
    direction: Readonly<{ x: number; y: number; z: number }>,
    maxDistance: number,
    ignoreObstacleId?: string,
  ): WorldRayHit | null {
    if (!Number.isFinite(maxDistance) || maxDistance < 0) return null;
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (length === 0 || !Number.isFinite(length)) return null;
    const dx = direction.x / length;
    const dy = direction.y / length;
    const dz = direction.z / length;
    let nearest = Number.POSITIVE_INFINITY;
    let nearestId: string | undefined;
    let nearestDestructible = false;

    for (const { definition: obstacle, health } of this.obstacles) {
      if (ignoreObstacleId && obstacle.id === ignoreObstacleId) continue;
      const distance = rayBoxDistance(
        origin.x, origin.y, origin.z, dx, dy, dz,
        obstacle.minX, obstacle.minY ?? 0, obstacle.minZ, obstacle.maxX, obstacle.maxY, obstacle.maxZ,
      );
      if (distance !== null && distance <= maxDistance && distance < nearest) {
        nearest = distance;
        nearestId = obstacle.id;
        nearestDestructible = Boolean(obstacle.id) && Number.isFinite(obstacle.health) && health > 0;
      }
    }

    // Raised terrain blocks shots and projectiles as well as supporting feet.
    for (const surface of this.options.groundSurfaces ?? []) {
      const distance = rayBoxDistance(origin.x, origin.y, origin.z, dx, dy, dz,
        surface.minX, 0, surface.minZ, surface.maxX, surface.height, surface.maxZ);
      if (distance !== null && distance <= maxDistance && distance < nearest) {
        nearest = distance;
        nearestId = undefined;
        nearestDestructible = false;
      }
    }
    for (const ramp of this.ramps) {
      const distance = rayRampDistance(origin, { x: dx, y: dy, z: dz }, ramp, maxDistance);
      if (distance !== null && distance < nearest) {
        nearest = distance;
        nearestId = undefined;
        nearestDestructible = false;
      }
    }

    return Number.isFinite(nearest)
      ? { distance: nearest, ...(nearestId ? { obstacleId: nearestId } : {}), destructible: nearestDestructible }
      : null;
  }

  moveHorizontal(
    x: number,
    z: number,
    deltaX: number,
    deltaZ: number,
    feetY: number,
    bodyHeight: number,
    radius: number,
  ): HorizontalMoveResult {
    let nextX = x;
    let nextZ = z;
    let wallNormalX = 0;
    let wallNormalZ = 0;

    const requestedX = x + deltaX;
    const boundedX = Math.min(this.halfWidth - radius, Math.max(-this.halfWidth + radius, requestedX));
    if (boundedX !== requestedX) {
      wallNormalX = requestedX > boundedX ? -1 : 1;
      nextX = boundedX;
    } else if (deltaX !== 0 && this.collides(boundedX, z, feetY, bodyHeight, radius)) {
      wallNormalX = deltaX > 0 ? -1 : 1;
    } else {
      nextX = boundedX;
    }

    const requestedZ = z + deltaZ;
    const boundedZ = Math.min(this.halfDepth - radius, Math.max(-this.halfDepth + radius, requestedZ));
    if (boundedZ !== requestedZ) {
      wallNormalZ = requestedZ > boundedZ ? -1 : 1;
      nextZ = boundedZ;
    } else if (deltaZ !== 0 && this.collides(nextX, boundedZ, feetY, bodyHeight, radius)) {
      wallNormalZ = deltaZ > 0 ? -1 : 1;
    } else {
      nextZ = boundedZ;
    }

    return { x: nextX, z: nextZ, wallNormalX, wallNormalZ };
  }

  /** Clearance for an offset body/head volume, including world edges and raised ground. */
  isBodyClear(x: number, z: number, feetY: number, bodyHeight: number, radius: number): boolean {
    return x >= -this.halfWidth + radius && x <= this.halfWidth - radius
      && z >= -this.halfDepth + radius && z <= this.halfDepth - radius
      && !this.collides(x, z, feetY, bodyHeight, radius);
  }

  private collides(x: number, z: number, feetY: number, bodyHeight: number, radius: number): boolean {
    // Ramps remain walkable, but an unsupported ledge cannot snap the actor
    // straight up onto a raised tile. Jumping above it still permits entry.
    if (this.groundHeightAt(x, z) > feetY + 0.2 + 1e-9) return true;
    return this.obstacles.some(({ definition: obstacle }) => {
      const minY = obstacle.minY ?? 0;
      if (feetY >= obstacle.maxY || feetY + bodyHeight <= minY) return false;
      const nearestX = Math.min(obstacle.maxX, Math.max(obstacle.minX, x));
      const nearestZ = Math.min(obstacle.maxZ, Math.max(obstacle.minZ, z));
      const offsetX = x - nearestX;
      const offsetZ = z - nearestZ;
      return offsetX * offsetX + offsetZ * offsetZ < radius * radius;
    });
  }
}

/** Intersects the ramp's solid wedge using its rectangular footprint and sloping top. */
function rayRampDistance(
  origin: Readonly<{ x: number; y: number; z: number }>,
  direction: Readonly<{ x: number; y: number; z: number }>,
  ramp: RampSurface,
  maxDistance: number,
): number | null {
  const min = ramp.risesAlong === 'x' ? ramp.minX : ramp.minZ;
  const max = ramp.risesAlong === 'x' ? ramp.maxX : ramp.maxZ;
  const gradient = ramp.rise / (max - min) * (ramp.risesTowardPositive ? 1 : -1);
  const intercept = ramp.lowY + (ramp.risesTowardPositive ? 0 : ramp.rise) - gradient * min;
  // Each plane describes ax + by + cz <= d.
  const planes: readonly (readonly [number, number, number, number])[] = [
    [-1, 0, 0, -ramp.minX], [1, 0, 0, ramp.maxX],
    [0, 0, -1, -ramp.minZ], [0, 0, 1, ramp.maxZ], [0, -1, 0, 0],
    [ramp.risesAlong === 'x' ? -gradient : 0, 1, ramp.risesAlong === 'z' ? -gradient : 0, intercept],
  ];
  let near = 0;
  let far = maxDistance;
  for (const [a, b, c, d] of planes) {
    const available = d - a * origin.x - b * origin.y - c * origin.z;
    const rate = a * direction.x + b * direction.y + c * direction.z;
    if (Math.abs(rate) < 1e-10) {
      if (available < 0) return null;
      continue;
    }
    const distance = available / rate;
    if (rate < 0) near = Math.max(near, distance);
    else far = Math.min(far, distance);
    if (near > far) return null;
  }
  return near;
}

function rayBoxDistance(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number,
): number | null {
  let near = Number.NEGATIVE_INFINITY;
  let far = Number.POSITIVE_INFINITY;
  const axes: readonly (readonly [number, number, number, number])[] = [
    [ox, dx, minX, maxX], [oy, dy, minY, maxY], [oz, dz, minZ, maxZ],
  ];
  for (const [origin, direction, min, max] of axes) {
    if (Math.abs(direction) < 1e-10) {
      if (origin < min || origin > max) return null;
      continue;
    }
    const first = (min - origin) / direction;
    const second = (max - origin) / direction;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near > far) return null;
  }
  if (far < 0) return null;
  return Math.max(0, near);
}
