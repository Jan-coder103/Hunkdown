export type RectangleObstacle = Readonly<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
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

export type HorizontalMoveResult = Readonly<{
  x: number;
  z: number;
  wallNormalX: number;
  wallNormalZ: number;
}>;

export type WorldRayHit = Readonly<{ distance: number }>;

export type MovementWorldOptions = Readonly<{
  halfExtent: number;
  obstacles: readonly RectangleObstacle[];
  ramps?: readonly RampSurface[];
}>;

/** Kinematic horizontal collision and walkable ramp surfaces for the movement playground. */
export class MovementWorld {
  private readonly ramps: readonly RampSurface[];

  constructor(private readonly options: MovementWorldOptions) {
    if (!Number.isFinite(options.halfExtent) || options.halfExtent <= 0) {
      throw new RangeError('halfExtent must be a finite positive number');
    }
    this.ramps = options.ramps ?? [];
  }

  groundHeightAt(x: number, z: number): number {
    let height = 0;
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
  raycast(origin: Readonly<{ x: number; y: number; z: number }>, direction: Readonly<{ x: number; y: number; z: number }>, maxDistance: number): WorldRayHit | null {
    if (!Number.isFinite(maxDistance) || maxDistance < 0) return null;
    const length = Math.hypot(direction.x, direction.y, direction.z);
    if (length === 0 || !Number.isFinite(length)) return null;
    const dx = direction.x / length;
    const dy = direction.y / length;
    const dz = direction.z / length;
    let nearest = Number.POSITIVE_INFINITY;

    for (const obstacle of this.options.obstacles) {
      const distance = rayBoxDistance(
        origin.x, origin.y, origin.z, dx, dy, dz,
        obstacle.minX, 0, obstacle.minZ, obstacle.maxX, obstacle.maxY, obstacle.maxZ,
      );
      if (distance !== null && distance <= maxDistance && distance < nearest) nearest = distance;
    }

    return Number.isFinite(nearest) ? { distance: nearest } : null;
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
    const boundedX = Math.min(this.options.halfExtent - radius, Math.max(-this.options.halfExtent + radius, requestedX));
    if (boundedX !== requestedX) {
      wallNormalX = requestedX > boundedX ? -1 : 1;
      nextX = boundedX;
    } else if (deltaX !== 0 && this.collides(boundedX, z, feetY, bodyHeight, radius)) {
      wallNormalX = deltaX > 0 ? -1 : 1;
    } else {
      nextX = boundedX;
    }

    const requestedZ = z + deltaZ;
    const boundedZ = Math.min(this.options.halfExtent - radius, Math.max(-this.options.halfExtent + radius, requestedZ));
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

  private collides(x: number, z: number, feetY: number, bodyHeight: number, radius: number): boolean {
    return this.options.obstacles.some((obstacle) => {
      if (feetY >= obstacle.maxY || feetY + bodyHeight <= 0) return false;
      const nearestX = Math.min(obstacle.maxX, Math.max(obstacle.minX, x));
      const nearestZ = Math.min(obstacle.maxZ, Math.max(obstacle.minZ, z));
      const offsetX = x - nearestX;
      const offsetZ = z - nearestZ;
      return offsetX * offsetX + offsetZ * offsetZ < radius * radius;
    });
  }
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
