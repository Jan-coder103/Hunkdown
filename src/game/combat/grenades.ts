import { Vector3 } from 'three';
import { MovementWorld } from '../player/movement-world';
import { areOpponents, Combatant } from './combatant';

export const GRENADE_RULES = Object.freeze({
  startingCount: 2,
  fuseSeconds: 2.2,
  blastRadius: 4.2,
  maximumDamage: 90,
  throwSpeed: 11,
  upwardBoost: 3.2,
  gravity: 9.81,
});

export type GrenadeExplosion = Readonly<{
  position: Vector3;
  damagedIds: readonly string[];
  killedIds: readonly string[];
  damageById: readonly Readonly<{ id: string; amount: number }>[];
  destroyedObstacleIds: readonly string[];
}>;

type Projectile = {
  position: Vector3;
  velocity: Vector3;
  age: number;
};

/** Throwable grenades, predicted arc, and line-of-sight radial damage. */
export class GrenadeSystem {
  readonly projectiles: Vector3[] = [];
  private readonly active: Projectile[] = [];
  private remaining: number = GRENADE_RULES.startingCount;
  equipped = false;

  get count(): number {
    return this.remaining;
  }

  toggleEquipped(): boolean {
    if (this.remaining === 0) {
      this.equipped = false;
      return false;
    }
    this.equipped = !this.equipped;
    return this.equipped;
  }

  trajectory(
    origin: Readonly<{ x: number; y: number; z: number }>,
    direction: Readonly<{ x: number; y: number; z: number }>,
    world: MovementWorld,
    segments = 24,
  ): readonly Vector3[] {
    if (!Number.isInteger(segments) || segments < 2) throw new RangeError('Grenade trajectory needs at least two segments');
    const start = new Vector3(origin.x, origin.y, origin.z);
    const velocity = initialVelocity(direction);
    const points: Vector3[] = [start.clone()];
    const step = GRENADE_RULES.fuseSeconds / segments;
    let previous = start;
    for (let i = 1; i <= segments; i += 1) {
      const time = i * step;
      const point = start.clone().addScaledVector(velocity, time);
      point.y -= 0.5 * GRENADE_RULES.gravity * time * time;
      const segment = point.clone().sub(previous);
      const distance = segment.length();
      const wall = distance > 0 ? world.raycast(previous, segment, distance) : null;
      if (wall) {
        points.push(previous.clone().addScaledVector(segment.normalize(), wall.distance));
        break;
      }
      const groundY = world.groundHeightAt(point.x, point.z);
      if (point.y <= groundY) {
        point.y = groundY;
        points.push(point);
        break;
      }
      points.push(point);
      previous = point;
    }
    return points;
  }

  throw(
    origin: Readonly<{ x: number; y: number; z: number }>,
    direction: Readonly<{ x: number; y: number; z: number }>,
  ): boolean {
    if (!this.equipped || this.remaining === 0) return false;
    const position = new Vector3(origin.x, origin.y, origin.z);
    const velocity = initialVelocity(direction);
    position.addScaledVector(velocity.clone().normalize(), 0.42);
    this.active.push({ position, velocity, age: 0 });
    this.projectiles.push(position);
    this.remaining -= 1;
    if (this.remaining === 0) this.equipped = false;
    return true;
  }

  update(deltaSeconds: number, world: MovementWorld, combatants: readonly Combatant[], shooterTeam: Combatant['team']): readonly GrenadeExplosion[] {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return [];
    const explosions: GrenadeExplosion[] = [];
    let remainingTime = deltaSeconds;
    while (remainingTime > 0) {
      const stepSeconds = Math.min(1 / 60, remainingTime);
      this.updateProjectiles(stepSeconds, world, combatants, shooterTeam, explosions);
      remainingTime -= stepSeconds;
    }
    return explosions;
  }

  private updateProjectiles(
    deltaSeconds: number,
    world: MovementWorld,
    combatants: readonly Combatant[],
    shooterTeam: Combatant['team'],
    explosions: GrenadeExplosion[],
  ): void {
    for (let i = this.active.length - 1; i >= 0; i -= 1) {
      const projectile = this.active[i];
      if (!projectile) continue;
      const oldPosition = projectile.position.clone();
      projectile.age += deltaSeconds;
      projectile.velocity.y -= GRENADE_RULES.gravity * deltaSeconds;
      projectile.position.addScaledVector(projectile.velocity, deltaSeconds);

      const movement = projectile.position.clone().sub(oldPosition);
      const movementDistance = movement.length();
      const wall = movementDistance > 0 ? world.raycast(oldPosition, movement, movementDistance) : null;
      const hitGround = projectile.position.y <= world.groundHeightAt(projectile.position.x, projectile.position.z);
      const detonated = projectile.age >= GRENADE_RULES.fuseSeconds || Boolean(wall) || hitGround;
      if (!detonated) continue;

      if (wall && movementDistance > 0) {
        projectile.position.copy(oldPosition).addScaledVector(movement.normalize(), wall.distance);
      } else if (hitGround) {
        projectile.position.y = world.groundHeightAt(projectile.position.x, projectile.position.z);
      }
      explosions.push(detonate(projectile.position, world, combatants, shooterTeam));
      this.active.splice(i, 1);
      this.projectiles.splice(i, 1);
    }
  }
}

function initialVelocity(direction: Readonly<{ x: number; y: number; z: number }>): Vector3 {
  const aim = new Vector3(direction.x, direction.y, direction.z);
  if (aim.lengthSq() === 0 || !Number.isFinite(aim.lengthSq())) throw new RangeError('Grenade direction must be finite and non-zero');
  return aim.normalize().multiplyScalar(GRENADE_RULES.throwSpeed).add(new Vector3(0, GRENADE_RULES.upwardBoost, 0));
}

function detonate(position: Vector3, world: MovementWorld, combatants: readonly Combatant[], shooterTeam: Combatant['team']): GrenadeExplosion {
  const damagedIds: string[] = [];
  const killedIds: string[] = [];
  const damageById: { id: string; amount: number }[] = [];
  const propDamage: { id: string; amount: number }[] = [];
  for (const target of combatants) {
    if (target.status !== 'alive' || !areOpponents(shooterTeam, target.team)) continue;
    const center = target.position.clone().add(new Vector3(0, target.height * 0.5, 0));
    const offset = center.clone().sub(position);
    const distance = offset.length();
    if (distance > GRENADE_RULES.blastRadius) continue;
    if (distance > 1e-6) {
      const occlusion = world.raycast(position, offset, distance);
      if (occlusion && occlusion.distance < distance - 0.08) continue;
    }
    const falloff = 1 - distance / GRENADE_RULES.blastRadius;
    const damage = GRENADE_RULES.maximumDamage * falloff;
    const outcome = target.applyDamage(damage, distance > 1e-6 ? offset : { x: 0, y: 1, z: 0 }, 9 * falloff);
    if (outcome.applied > 0) {
      damagedIds.push(target.id);
      damageById.push({ id: target.id, amount: outcome.applied });
    }
    if (outcome.killed) killedIds.push(target.id);
  }
  for (const obstacle of world.destructibleObstacles) {
    const offset = new Vector3(obstacle.center.x, obstacle.center.y, obstacle.center.z).sub(position);
    const distance = Math.max(0, offset.length() - obstacle.radius);
    if (distance > GRENADE_RULES.blastRadius) continue;
    const centerDistance = offset.length();
    if (centerDistance > 1e-6) {
      const occlusion = world.raycast(position, offset, centerDistance, obstacle.id);
      if (occlusion && occlusion.distance < centerDistance - obstacle.radius - 0.08) continue;
    }
    propDamage.push({ id: obstacle.id, amount: GRENADE_RULES.maximumDamage * (1 - distance / GRENADE_RULES.blastRadius) });
  }
  const destroyedObstacleIds: string[] = [];
  for (const impact of propDamage) {
    if (world.damageObstacle(impact.id, impact.amount)) destroyedObstacleIds.push(impact.id);
  }
  return { position: position.clone(), damagedIds, killedIds, damageById, destroyedObstacleIds };
}
