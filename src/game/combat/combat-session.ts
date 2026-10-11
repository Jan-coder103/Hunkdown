import { getMeleeWeaponDefinition } from '../../content/weapons/registry';
import { Vector3 } from 'three';
import type { RandomSource } from '../../engine/seeded-random';
import { MovementWorld } from '../player/movement-world';
import { Combatant } from './combatant';
import { GRENADE_RULES, GrenadeSystem, type GrenadeExplosion } from './grenades';
import { resolveHitscan, type HitscanResult } from './hitscan';
import { WeaponController, type WeaponEvent } from './weapon-controller';

export type CombatInput = Readonly<{
  fireHeld: boolean;
  firePressed: boolean;
  reloadPressed: boolean;
  grenadeTogglePressed: boolean;
  aiming: boolean;
  switchPressed?: boolean;
}>;

export type CombatStepResult = Readonly<{
  weaponEvents: readonly WeaponEvent[];
  shots: readonly HitscanResult[];
  grenadeThrown: boolean;
  grenadeEquipped: boolean;
  grenadeCount: number;
  explosions: readonly GrenadeExplosion[];
}>;

/** Fixed-step combat orchestration shared by range targets now and full teams later. */
export class CombatSession {
  readonly knife = getMeleeWeaponDefinition('tactical-knife');
  heldWeapon: 'rifle' | 'knife' = 'rifle';
  switchRemaining = 0;
  private knifeCooldown = 0;
  get knifeReady(): boolean { return this.heldWeapon === 'knife' && this.switchRemaining <= 1e-9; }
  readonly weapon: WeaponController;
  readonly grenades = new GrenadeSystem();

  constructor(
    readonly world: MovementWorld,
    readonly combatants: readonly Combatant[],
    weapon: ConstructorParameters<typeof WeaponController>[0],
    readonly shooterTeam: Combatant['team'] = 'player',
  ) {
    this.weapon = new WeaponController(weapon);
  }

  resetForRespawn(): void {
    this.heldWeapon = 'rifle';
    this.switchRemaining = 0;
    this.knifeCooldown = 0;
    this.weapon.resetForRespawn();
    this.grenades.resetForRespawn();
  }

  step(
    deltaSeconds: number,
    input: CombatInput,
    origin: Readonly<{ x: number; y: number; z: number }>,
    direction: Readonly<{ x: number; y: number; z: number }>,
    random: RandomSource,
    allowPlayerActions = true,
  ): CombatStepResult {
    if (!allowPlayerActions) {
      return {
        weaponEvents: [], shots: [], grenadeThrown: false,
        grenadeEquipped: this.grenades.equipped, grenadeCount: this.grenades.count,
        explosions: this.grenades.update(deltaSeconds, this.world, this.combatants, this.shooterTeam),
      };
    }
    const switching = this.switchRemaining > 0;
    this.switchRemaining = Math.max(0, this.switchRemaining - deltaSeconds);
    if (this.switchRemaining < 1e-9) this.switchRemaining = 0;
    this.knifeCooldown = Math.max(0, this.knifeCooldown - deltaSeconds);
    if (input.switchPressed && !switching) {
      this.heldWeapon = this.heldWeapon === 'rifle' ? 'knife' : 'rifle';
      this.switchRemaining = this.knife.equipSeconds;
      this.grenades.equipped = false;
      this.weapon.cancelReload();
    }
    if (input.grenadeTogglePressed && this.switchRemaining <= 0) this.grenades.toggleEquipped();
    let grenadeThrown = false;
    let weaponEvents: readonly WeaponEvent[] = [];
    const shots: HitscanResult[] = [];

    if (this.grenades.equipped) {
      grenadeThrown = input.firePressed && this.grenades.throw(origin, direction);
      weaponEvents = this.weapon.step(deltaSeconds, {
        fireHeld: false,
        firePressed: false,
        reloadPressed: false,
      }, input.aiming);
    } else if (this.heldWeapon === 'knife' || switching || this.switchRemaining > 0) {
      this.weapon.step(deltaSeconds, { fireHeld: false, firePressed: false, reloadPressed: false }, false);
      if (this.knifeReady && !switching && input.firePressed && this.knifeCooldown <= 0) {
        this.knifeCooldown = this.knife.cooldownSeconds;
        shots.push(resolveHitscan({ world: this.world, combatants: this.combatants, shooterTeam: this.shooterTeam,
          origin, direction, range: this.knife.range, spreadRadians: 0, random, damage: this.knife.damage, knockback: 2 }));
      }
    } else {
      weaponEvents = this.weapon.step(deltaSeconds, input, input.aiming);
      for (const event of weaponEvents) {
        if (event.type !== 'shot') continue;
        shots.push(resolveHitscan({
          world: this.world,
          combatants: this.combatants,
          shooterTeam: this.shooterTeam,
          origin,
          direction,
          range: this.weapon.definition.range,
          spreadRadians: event.aimed
            ? this.weapon.definition.aimedSpreadRadians
            : this.weapon.definition.hipSpreadRadians,
          random,
          damage: this.weapon.definition.damage,
          knockback: 1.8,
        }));
      }
    }

    const explosions = this.grenades.update(deltaSeconds, this.world, this.combatants, this.shooterTeam);
    return {
      weaponEvents,
      shots,
      grenadeThrown,
      grenadeEquipped: this.grenades.equipped,
      grenadeCount: this.grenades.count,
      explosions,
    };
  }

  trajectory(origin: Readonly<{ x: number; y: number; z: number }>, direction: Readonly<{ x: number; y: number; z: number }>): readonly Vector3[] {
    return this.grenades.trajectory(origin, direction, this.world);
  }

  static readonly grenadeBlastRadius = GRENADE_RULES.blastRadius;
}
