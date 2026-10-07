import { Scene } from 'three';
import { ChickenCharacterView } from '../player/chicken-character-view';
import { Combatant } from './combatant';
import type { GrenadeExplosion } from './grenades';
import type { HitscanResult } from './hitscan';

const LANE_CENTERS = [-8, 0, 8] as const;
const TARGET_ROWS = [
  { z: -1, distanceMeters: 10 },
  { z: -6, distanceMeters: 15 },
  { z: -11, distanceMeters: 20 },
] as const;
const TARGET_RESPAWN_SECONDS = 1.6;

export type PracticeTarget = Readonly<{
  id: string;
  lane: number;
  distanceMeters: number;
  combatant: Combatant;
  character: ChickenCharacterView;
}>;

export type PracticeRangeStats = Readonly<{
  shots: number;
  hits: number;
  accuracy: number;
  damage: number;
  targetKills: number;
}>;

/** Nine reusable chicken dummies across 10 m, 15 m, and 20 m lanes. */
export function createCombatPracticeRange(scene: Scene) {
  const targets: PracticeTarget[] = [];
  const previousHealth: number[] = [];
  const respawnRemaining: Array<number | null> = [];
  const stats = { shots: 0, hits: 0, damage: 0, targetKills: 0 };

  for (let laneIndex = 0; laneIndex < LANE_CENTERS.length; laneIndex += 1) {
    const lane = LANE_CENTERS[laneIndex];
    if (lane === undefined) continue;
    for (const row of TARGET_ROWS) {
      const id = `range-target-${targets.length + 1}`;
      const spawn = Object.freeze({ x: lane, y: 0, z: row.z });
      const combatant = new Combatant(id, 'enemy', spawn, 100, 0.48, 1.9);
      const character = new ChickenCharacterView(scene, 'enemy', 'third-person');
      character.object.name = `practice chicken target ${targets.length + 1} · lane ${laneIndex + 1} · ${row.distanceMeters} m`;
      character.object.position.copy(combatant.position);
      targets.push(Object.freeze({ id, lane: laneIndex + 1, distanceMeters: row.distanceMeters, combatant, character }));
      previousHealth.push(combatant.health);
      respawnRemaining.push(null);
    }
  }

  let disposed = false;
  return {
    targets,
    combatants: targets.map(({ combatant }) => combatant),
    characters: targets.map(({ character }) => character),
    get stats(): PracticeRangeStats {
      return Object.freeze({
        ...stats,
        accuracy: stats.shots > 0 ? stats.hits / stats.shots : 0,
      });
    },
    setVisible(visible: boolean) {
      for (const { character } of targets) character.object.visible = visible;
    },
    recordShots(shotsFired: number, results: readonly HitscanResult[]) {
      if (!Number.isInteger(shotsFired) || shotsFired < 0) throw new RangeError('Practice shots fired must be a non-negative integer');
      stats.shots += shotsFired;
      for (const result of results) {
        if (!result.targetId || !targets.some((target) => target.id === result.targetId)) continue;
        stats.hits += 1;
        stats.damage += result.damage;
        if (result.killed) stats.targetKills += 1;
      }
    },
    recordExplosions(explosions: readonly GrenadeExplosion[]) {
      for (const explosion of explosions) {
        for (const damage of explosion.damageById) {
          if (targets.some((target) => target.id === damage.id)) stats.damage += damage.amount;
        }
        for (const id of explosion.killedIds) {
          if (targets.some((target) => target.id === id)) stats.targetKills += 1;
        }
      }
    },
    resetStats() {
      stats.shots = 0;
      stats.hits = 0;
      stats.damage = 0;
      stats.targetKills = 0;
    },
    resetTargets() {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        if (!target) continue;
        const { combatant, character } = target;
        if (combatant.status === 'dead') combatant.respawn(combatant.position);
        combatant.health = combatant.maxHealth;
        combatant.position.set(LANE_CENTERS[target.lane - 1] ?? 0, 0, TARGET_ROWS.find((row) => row.distanceMeters === target.distanceMeters)?.z ?? -1);
        combatant.velocity.set(0, 0, 0);
        character.setPose({ dead: false, movementSpeed: 0, grounded: true, aiming: false });
        character.object.position.copy(combatant.position);
        if (index < previousHealth.length) previousHealth[index] = combatant.health;
        if (index < respawnRemaining.length) respawnRemaining[index] = null;
      }
    },
    reset() {
      this.resetTargets();
      this.resetStats();
    },
    update(deltaSeconds: number) {
      for (let index = 0; index < targets.length; index += 1) {
        const target = targets[index];
        if (!target) continue;
        const { combatant, character } = target;
        if (combatant.health < (previousHealth[index] ?? combatant.health)) character.triggerDamage();
        if (combatant.status === 'dead') {
          const remaining = respawnRemaining[index] ?? TARGET_RESPAWN_SECONDS;
          const nextRemaining = Math.max(0, remaining - deltaSeconds);
          respawnRemaining[index] = nextRemaining;
          if (nextRemaining === 0) {
            combatant.respawn(combatant.position);
            combatant.health = combatant.maxHealth;
            combatant.velocity.set(0, 0, 0);
            character.setPose({ dead: false, movementSpeed: 0, grounded: true, aiming: false });
            respawnRemaining[index] = null;
          }
        } else {
          respawnRemaining[index] = null;
          combatant.update(deltaSeconds);
        }
        previousHealth[index] = combatant.health;
        character.object.position.copy(combatant.position);
        character.setPose({
          movementSpeed: combatant.velocity.length(),
          grounded: true,
          aiming: false,
          dead: combatant.status === 'dead',
        });
        character.update(deltaSeconds);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { character } of targets) character.dispose();
    },
  };
}
