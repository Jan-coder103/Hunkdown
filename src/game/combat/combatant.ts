import { Vector3 } from 'three';

export type CombatTeam = 'player' | 'friendly' | 'enemy' | 'neutral';
export type CombatantStatus = 'alive' | 'dead';

export function areOpponents(first: CombatTeam, second: CombatTeam): boolean {
  if (first === 'neutral' || second === 'neutral') return false;
  const firstSide = first === 'enemy' ? 'enemy' : 'player';
  const secondSide = second === 'enemy' ? 'enemy' : 'player';
  return firstSide !== secondSide;
}

export type DamageOutcome = Readonly<{
  applied: number;
  health: number;
  killed: boolean;
}>;

export const MAX_COMBATANT_IMPULSE_SPEED = 12;
const COMBATANT_GRAVITY = 18;
const GROUND_BOUNCE = 0.24;
const IMPACT_DRAG = 4.2;

/** Simulation-owned health, position, and short impact motion shared by players and bots. */
export class Combatant {
  readonly position: Vector3;
  readonly velocity = new Vector3();
  /** Horizontal displacement at the top of the feet-anchored leaning hit volume. */
  readonly leanOffset = new Vector3();
  poseHeight: number;

  aimPoint(): Readonly<{ x: number; y: number; z: number }> {
    const fraction = this.leanOffset.lengthSq() > 0.0001 ? 0.9 : 0.56;
    return { x: this.position.x + this.leanOffset.x * fraction,
      y: this.position.y + this.poseHeight * fraction,
      z: this.position.z + this.leanOffset.z * fraction };
  }
  health: number;
  status: CombatantStatus = 'alive';
  private deaths = 0;

  /** Identifies the death that a pending lifecycle action belongs to. */
  get deathVersion(): number { return this.deaths; }

  constructor(
    readonly id: string,
    readonly team: CombatTeam,
    spawn: Readonly<{ x: number; y: number; z: number }>,
    readonly maxHealth = 100,
    readonly radius = 0.38,
    readonly height = 1.7,
  ) {
    if (!id.trim()) throw new Error('Combatant id cannot be empty');
    if (![maxHealth, radius, height].every((value) => Number.isFinite(value) && value > 0)) {
      throw new RangeError(`Combatant ${id} has invalid health or hitbox dimensions`);
    }
    if (![spawn.x, spawn.y, spawn.z].every(Number.isFinite)) throw new RangeError(`Combatant ${id} has invalid spawn`);
    this.position = new Vector3(spawn.x, spawn.y, spawn.z);
    this.poseHeight = height;
    this.health = maxHealth;
  }

  applyDamage(amount: number, knockbackDirection?: Readonly<{ x: number; y: number; z: number }>, knockback = 0): DamageOutcome {
    if (this.status !== 'alive' || !Number.isFinite(amount) || amount <= 0) {
      return { applied: 0, health: this.health, killed: false };
    }
    const applied = Math.min(amount, this.health);
    this.health = Math.max(0, this.health - applied);
    if (knockbackDirection && Number.isFinite(knockback) && knockback > 0) this.applyImpulse(knockbackDirection, knockback);
    const killed = this.health === 0;
    if (killed) {
      this.status = 'dead';
      this.deaths += 1;
    }
    return { applied, health: this.health, killed };
  }

  /** Adds a cinematic impact kick while keeping stacked hits inside a fixed speed budget. */
  applyImpulse(direction: Readonly<{ x: number; y: number; z: number }>, speed: number): void {
    if (![direction.x, direction.y, direction.z, speed].every(Number.isFinite) || speed <= 0) return;
    const impulse = new Vector3(direction.x, direction.y, direction.z);
    if (impulse.lengthSq() === 0) return;
    this.velocity.addScaledVector(impulse.normalize(), speed);
    if (this.velocity.length() > MAX_COMBATANT_IMPULSE_SPEED) this.velocity.setLength(MAX_COMBATANT_IMPULSE_SPEED);
  }

  /** Applies a short, damped impact impulse without changing the combatant's identity. */
  update(deltaSeconds: number): void {
    if (this.status !== 'alive' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.position.x += this.velocity.x * deltaSeconds;
    this.position.z += this.velocity.z * deltaSeconds;
    this.position.y += this.velocity.y * deltaSeconds;
    this.velocity.x *= Math.exp(-IMPACT_DRAG * deltaSeconds);
    this.velocity.z *= Math.exp(-IMPACT_DRAG * deltaSeconds);
    if (this.position.y > 0 || this.velocity.y > 0) this.velocity.y -= COMBATANT_GRAVITY * deltaSeconds;
    if (this.position.y <= 0) {
      this.position.y = 0;
      if (this.velocity.y < 0) this.velocity.y = -this.velocity.y * GROUND_BOUNCE;
      if (this.velocity.y < 0.55) this.velocity.y = 0;
    }
    if (this.velocity.lengthSq() < 0.0004) this.velocity.set(0, 0, 0);
  }

  revive(healthFraction = 0.5): boolean {
    if (this.status !== 'dead' || !Number.isFinite(healthFraction) || healthFraction <= 0 || healthFraction > 1) return false;
    this.health = Math.max(1, this.maxHealth * healthFraction);
    this.velocity.set(0, 0, 0);
    this.status = 'alive';
    this.leanOffset.set(0, 0, 0);
    this.poseHeight = this.height;
    return true;
  }

  respawn(spawn?: Readonly<{ x: number; y: number; z: number }>): boolean {
    if (this.status !== 'dead') return false;
    if (spawn && ![spawn.x, spawn.y, spawn.z].every(Number.isFinite)) return false;
    if (spawn) this.position.set(spawn.x, spawn.y, spawn.z);
    this.health = this.maxHealth;
    this.velocity.set(0, 0, 0);
    this.status = 'alive';
    this.leanOffset.set(0, 0, 0);
    this.poseHeight = this.height;
    return true;
  }
}

/** A cancellable revive timer. Completing it restores one half of maximum health. */
export class ReviveAction {
  private target: Combatant | null = null;
  private deathVersion = 0;
  private elapsed = 0;

  constructor(readonly durationSeconds = 4, readonly healthFraction = 0.5) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new RangeError('Revive duration must be positive');
    if (!Number.isFinite(healthFraction) || healthFraction <= 0 || healthFraction > 1) throw new RangeError('Revive health fraction must be in (0, 1]');
  }

  get progress(): number {
    return this.target ? Math.min(1, this.elapsed / this.durationSeconds) : 0;
  }

  start(target: Combatant): boolean {
    if (this.target || target.status !== 'dead') return false;
    this.target = target;
    this.deathVersion = target.deathVersion;
    this.elapsed = 0;
    return true;
  }

  update(deltaSeconds: number): boolean {
    if (!this.target || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
    if (this.target.status !== 'dead' || this.target.deathVersion !== this.deathVersion) {
      this.cancel();
      return false;
    }
    this.elapsed = Math.min(this.durationSeconds, this.elapsed + deltaSeconds);
    if (this.elapsed < this.durationSeconds) return false;
    const completed = this.target.revive(this.healthFraction);
    this.target = null;
    this.elapsed = 0;
    return completed;
  }

  cancel(): void {
    this.target = null;
    this.elapsed = 0;
  }
}

/** Reusable delayed full-health respawn; match rules supply the delay and spawn point. */
export class RespawnTimer {
  private target: Combatant | null = null;
  private deathVersion = 0;
  private remaining = 0;

  start(target: Combatant, delaySeconds: number): boolean {
    if (this.target || target.status !== 'dead' || !Number.isFinite(delaySeconds) || delaySeconds < 0) return false;
    this.target = target;
    this.deathVersion = target.deathVersion;
    this.remaining = delaySeconds;
    return true;
  }

  update(deltaSeconds: number, spawn?: Readonly<{ x: number; y: number; z: number }>): boolean {
    if (!this.target || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return false;
    if (this.target.status !== 'dead' || this.target.deathVersion !== this.deathVersion) {
      this.cancel();
      return false;
    }
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    if (this.remaining > 0) return false;
    const completed = this.target.respawn(spawn);
    this.target = null;
    return completed;
  }

  cancel(): void {
    this.target = null;
    this.remaining = 0;
  }

  get secondsRemaining(): number {
    return this.target ? this.remaining : 0;
  }
}
