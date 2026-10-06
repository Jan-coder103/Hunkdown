import { Vector3 } from 'three';
import type { RandomSource } from '../../engine/seeded-random';
import { MovementWorld } from '../player/movement-world';
import { areOpponents, Combatant, type CombatTeam } from './combatant';

export type HitscanResult = Readonly<{
  direction: Vector3;
  distance: number | null;
  blocked: boolean;
  targetId: string | null;
  damage: number;
  killed: boolean;
}>;

/** Resolves one ray against solid cover and living opponents. The nearest surface wins. */
export function resolveHitscan(options: Readonly<{
  world: MovementWorld;
  combatants: readonly Combatant[];
  shooterTeam: CombatTeam;
  origin: Readonly<{ x: number; y: number; z: number }>;
  direction: Readonly<{ x: number; y: number; z: number }>;
  range: number;
  spreadRadians?: number;
  random?: RandomSource;
  damage: number;
  knockback?: number;
}>): HitscanResult {
  const inputDirection = new Vector3(options.direction.x, options.direction.y, options.direction.z);
  if (inputDirection.lengthSq() === 0 || !Number.isFinite(inputDirection.lengthSq())) {
    throw new RangeError('Hitscan direction must be finite and non-zero');
  }
  if (!Number.isFinite(options.range) || options.range <= 0) throw new RangeError('Hitscan range must be positive');
  const direction = applySpread(
    inputDirection.normalize(),
    options.spreadRadians ?? 0,
    options.random,
  );
  const coverHit = options.world.raycast(options.origin, direction, options.range);
  let nearestTarget: Combatant | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const target of options.combatants) {
    if (target.status !== 'alive' || !areOpponents(options.shooterTeam, target.team)) continue;
    const distance = rayBoxDistance(
      options.origin.x, options.origin.y, options.origin.z,
      direction.x, direction.y, direction.z,
      target.position.x - target.radius, target.position.y, target.position.z - target.radius,
      target.position.x + target.radius, target.position.y + target.height, target.position.z + target.radius,
    );
    if (distance !== null && distance <= options.range && distance < nearestDistance) {
      nearestTarget = target;
      nearestDistance = distance;
    }
  }

  if (nearestTarget && (!coverHit || nearestDistance < coverHit.distance)) {
    const outcome = nearestTarget.applyDamage(
      options.damage,
      direction,
      options.knockback ?? 0,
    );
    return {
      direction,
      distance: nearestDistance,
      blocked: false,
      targetId: nearestTarget.id,
      damage: outcome.applied,
      killed: outcome.killed,
    };
  }
  if (coverHit) {
    return { direction, distance: coverHit.distance, blocked: true, targetId: null, damage: 0, killed: false };
  }
  return { direction, distance: null, blocked: false, targetId: null, damage: 0, killed: false };
}

function applySpread(direction: Vector3, spreadRadians: number, random?: RandomSource): Vector3 {
  if (!Number.isFinite(spreadRadians) || spreadRadians < 0) throw new RangeError('Weapon spread cannot be negative');
  if (spreadRadians === 0 || !random) return direction;
  const helper = Math.abs(direction.y) < 0.95 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const right = new Vector3().crossVectors(direction, helper).normalize();
  const up = new Vector3().crossVectors(right, direction).normalize();
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(random()) * Math.tan(spreadRadians);
  return direction.clone().addScaledVector(right, Math.cos(angle) * radius).addScaledVector(up, Math.sin(angle) * radius).normalize();
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
