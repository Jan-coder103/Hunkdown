import type { WeaponDefinition } from './weapon-types';

export type WeaponInput = Readonly<{
  fireHeld: boolean;
  firePressed: boolean;
  reloadPressed: boolean;
}>;

export type WeaponEvent =
  | Readonly<{ type: 'shot'; aimed: boolean }>
  | Readonly<{ type: 'reload-started' }>
  | Readonly<{ type: 'reload-completed' }>;

export type WeaponSnapshot = Readonly<{
  magazine: number;
  reserve: number;
  reloading: boolean;
  reloadProgress: number;
  cooldownSeconds: number;
}>;

/** Runtime ammunition and cadence for one immutable content definition. */
export class WeaponController {
  magazine: number;
  reserve: number;
  private cooldown = 0;
  private reloadRemaining = 0;

  constructor(readonly definition: WeaponDefinition) {
    this.magazine = definition.magazineSize;
    this.reserve = definition.startingReserve;
  }

  get isReloading(): boolean {
    return this.reloadRemaining > 0;
  }

  get snapshot(): WeaponSnapshot {
    return {
      magazine: this.magazine,
      reserve: this.reserve,
      reloading: this.isReloading,
      reloadProgress: this.isReloading ? 1 - this.reloadRemaining / this.definition.reloadSeconds : 0,
      cooldownSeconds: this.cooldown,
    };
  }

  step(deltaSeconds: number, input: WeaponInput, aiming: boolean): readonly WeaponEvent[] {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return [];
    const events: WeaponEvent[] = [];

    if (this.isReloading) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
      if (this.reloadRemaining === 0) {
        const transferred = Math.min(this.definition.magazineSize - this.magazine, this.reserve);
        this.magazine += transferred;
        this.reserve -= transferred;
        this.cooldown = 0;
        events.push({ type: 'reload-completed' });
      }
      return events;
    }

    this.cooldown = Math.max(0, this.cooldown - deltaSeconds);
    if (input.reloadPressed && this.magazine < this.definition.magazineSize && this.reserve > 0) {
      this.reloadRemaining = this.definition.reloadSeconds;
      events.push({ type: 'reload-started' });
      return events;
    }

    const trigger = this.definition.fireMode === 'automatic' ? input.fireHeld || input.firePressed : input.firePressed;
    // Six 1/60 steps leave a tiny positive residue for a 600 RPM cooldown.
    if (!trigger || this.cooldown > 1e-9 || this.magazine === 0) return events;
    this.magazine -= 1;
    this.cooldown = 60 / this.definition.roundsPerMinute;
    events.push({ type: 'shot', aimed: aiming });
    return events;
  }

  cancelReload(): void {
    this.reloadRemaining = 0;
  }

  /** Restores the initial ammunition state when a combatant respawns. */
  resetForRespawn(): void {
    this.magazine = this.definition.magazineSize;
    this.reserve = this.definition.startingReserve;
    this.cooldown = 0;
    this.reloadRemaining = 0;
  }
}
