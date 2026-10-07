import { Scene, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createCombatPracticeRange } from '../src/game/combat/combat-practice-range';
import type { GrenadeExplosion } from '../src/game/combat/grenades';
import { resolveHitscan } from '../src/game/combat/hitscan';
import { createMovementPlayground } from '../src/game/player/movement-playground';
import type { HitscanResult } from '../src/game/combat/hitscan';

function hit(targetId: string, damage: number, killed = false): HitscanResult {
  return { direction: new Vector3(0, 0, -1), distance: 10, blocked: false, targetId, damage, killed };
}

describe('shooting practice range', () => {
  it('places nine chicken targets across three lanes and three marked distances', () => {
    const scene = new Scene();
    const range = createCombatPracticeRange(scene);

    expect(range.targets).toHaveLength(9);
    expect(range.targets.map((target) => target.lane)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);
    expect(range.targets.map((target) => target.distanceMeters)).toEqual([10, 15, 20, 10, 15, 20, 10, 15, 20]);
    expect(range.targets.every(({ combatant }) => combatant.status === 'alive')).toBe(true);

    range.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('tracks accuracy, damage, and knockdowns, and resets its score', () => {
    const range = createCombatPracticeRange(new Scene());
    const first = range.targets[0]!;
    const second = range.targets[1]!;
    range.recordShots(4, [hit(first.id, 35), hit(first.id, 65, true)]);

    expect(range.stats).toEqual({ shots: 4, hits: 2, accuracy: 0.5, damage: 100, targetKills: 1 });
    range.resetStats();
    expect(range.stats).toEqual({ shots: 0, hits: 0, accuracy: 0, damage: 0, targetKills: 0 });
    expect(second.combatant.status).toBe('alive');
    range.dispose();
  });

  it('includes grenade damage and target knockdowns in the range score', () => {
    const range = createCombatPracticeRange(new Scene());
    const target = range.targets[0]!;
    const explosion: GrenadeExplosion = {
      position: new Vector3(0, 0, 0),
      damagedIds: [target.id],
      killedIds: [target.id],
      damageById: [{ id: target.id, amount: 45 }],
      destroyedObstacleIds: [],
    };
    range.recordExplosions([explosion]);

    expect(range.stats).toMatchObject({ shots: 0, hits: 0, damage: 45, targetKills: 1 });
    range.dispose();
  });

  it('keeps every distance target reachable in its marked lane', () => {
    const scene = new Scene();
    const playground = createMovementPlayground(scene);
    const range = createCombatPracticeRange(scene);

    for (const target of range.targets) {
      for (const nearer of range.targets) {
        if (nearer.lane === target.lane && nearer.distanceMeters < target.distanceMeters) {
          nearer.combatant.applyDamage(100);
        }
      }
      const result = resolveHitscan({
        world: playground.world,
        combatants: range.combatants,
        shooterTeam: 'player',
        origin: { x: target.combatant.position.x, y: 1.2, z: 9 },
        direction: { x: 0, y: 0, z: -1 },
        range: 30,
        damage: 10,
      });
      expect(result.targetId).toBe(target.id);
      range.resetTargets();
    }

    range.dispose();
    playground.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('stands knocked-down targets back up automatically and supports an immediate full reset', () => {
    const range = createCombatPracticeRange(new Scene());
    const target = range.targets[0]!;
    target.combatant.applyDamage(100);
    range.update(1 / 60);
    expect(target.combatant.status).toBe('dead');

    range.update(1.6);
    expect(target.combatant.status).toBe('alive');
    expect(target.combatant.health).toBe(100);
    expect(target.character.object.position.z).toBe(-1);

    target.combatant.applyDamage(100);
    range.resetTargets();
    expect(target.combatant.status).toBe('alive');
    expect(target.combatant.health).toBe(100);
    expect(target.combatant.position.toArray()).toEqual([-8, 0, -1]);
    range.dispose();
  });

  it('rejects invalid shot counts', () => {
    const range = createCombatPracticeRange(new Scene());
    expect(() => range.recordShots(-1, [])).toThrow(/non-negative integer/);
    expect(() => range.recordShots(0.5, [])).toThrow(/non-negative integer/);
    range.dispose();
  });
});
