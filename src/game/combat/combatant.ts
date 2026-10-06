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

/** Simulation-owned health, position, and short impact motion shared by players and bots. */
export class Combatant {
  readonly position: Vector3;
  readonly velocity = new Vector3();
  health: number;
  status: CombatantStatus = 'alive';

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
    this.health = maxHealth;
  }

  applyDamage(amount: number, knockbackDirection?: Readonly<{ x: number; y: number; z: number }>, knockback = 0): DamageOutcome {
    if (this.status !== 'alive' || !Number.isFinite(amount) || amount <= 0) {
      return { applied: 0, health: this.health, killed: false };
    }
    const applied = Math.min(amount, this.health);
    this.health = Math.max(0, this.health - applied);
    if (knockbackDirection && Number.isFinite(knockback) && knockback > 0) {
      const impulse = new Vector3(knockbackDirection.x, knockbackDirection.y, knockbackDirection.z);
      if (impulse.lengthSq() > 0) this.velocity.addScaledVector(impulse.normalize(), knockback);
    }
    const killed = this.health === 0;
    if (killed) this.status = 'dead';
    return { applied, health: this.health, killed };
  }

  /** Applies a short, damped impact impulse without changing the combatant's identity. */
  update(deltaSeconds: number): void {
    if (this.status !== 'alive' || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.position.addScaledVector(this.velocity, deltaSeconds);
    this.velocity.multiplyScalar(Math.exp(-7 * deltaSeconds));
    if (this.velocity.lengthSq() < 0.0004) this.velocity.set(0, 0, 0);
  }

  revive(healthFraction = 0.5): boolean {
    if (this.status !== 'dead' || !Number.isFinite(healthFraction) || healthFraction <= 0 || healthFraction > 1) return false;
    this.health = Math.max(1, this.maxHealth * healthFraction);
    this.velocity.set(0, 0, 0);
    this.status = 'alive';
    return true;
  }

  respawn(spawn?: Readonly<{ x: number; y: number; z: number }>): boolean {
    if (this.status !== 'dead') return false;
    if (spawn && ![spawn.x, spawn.y, spawn.z].every(Number.isFinite)) return false;
    if (spawn) this.position.set(spawn.x, spawn.y, spawn.z);
    this.health = this.maxHealth;
    this.velocity.set(0, 0, 0);
    this.status = 'alive';
    return true;
  }
}

/** A cancellable revive timer. Completing it restores one half of maximum health. */
export class ReviveAction {
  private target: Combatant | null = null;
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
    this.elapsed = 0;
    return true;
  }

  update(deltaSeconds: number): boolean {
    if (!this.target || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
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
  private remaining = 0;

  start(target: Combatant, delaySeconds: number): boolean {
    if (this.target || target.status !== 'dead' || !Number.isFinite(delaySeconds) || delaySeconds < 0) return false;
    this.target = target;
    this.remaining = delaySeconds;
    return true;
  }

  update(deltaSeconds: number, spawn?: Readonly<{ x: number; y: number; z: number }>): boolean {
    if (!this.target || !Number.isFinite(deltaSeconds) || deltaSeconds < 0) return false;
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
