import { Line, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createWeaponModel, WEAPON_REGISTRY } from '../src/content/weapons/registry';
import { Combatant, RespawnTimer, ReviveAction } from '../src/game/combat/combatant';
import { CombatFeedback } from '../src/game/combat/combat-feedback';
import { CombatSession } from '../src/game/combat/combat-session';
import { GRENADE_RULES, GrenadeSystem } from '../src/game/combat/grenades';
import { resolveHitscan } from '../src/game/combat/hitscan';
import { WeaponController } from '../src/game/combat/weapon-controller';
import { GrenadeView, WeaponView } from '../src/game/combat/weapon-view';
import { createWeaponRegistry, type WeaponDefinition } from '../src/game/combat/weapon-types';
import { MovementWorld } from '../src/game/player/movement-world';

const weapon = WEAPON_REGISTRY.get('honk-47');
if (!weapon) throw new Error('Honk-47 was not discovered');

const openWorld = () => new MovementWorld({ halfExtent: 20, obstacles: [] });
const combatant = (id: string, team: 'enemy' | 'friendly', x: number, z: number) =>
  new Combatant(id, team, { x, y: 0, z });

describe('weapon content and firing', () => {
  it('discovers the Honk-47 from its own module and gives each runtime independent ammo', () => {
    expect(weapon.displayName).toBe('Honk-47');
    const first = new WeaponController(weapon);
    const second = new WeaponController(weapon);
    first.step(1 / 60, { fireHeld: true, firePressed: true, reloadPressed: false }, false);
    expect(first.magazine).toBe(29);
    expect(second.magazine).toBe(30);
  });

  it('rejects duplicate IDs and malformed ammunition definitions', () => {
    expect(() => createWeaponRegistry([weapon, weapon])).toThrow(/Duplicate weapon id/);
    const invalid = { ...weapon, magazineSize: 0 } as WeaponDefinition;
    expect(() => createWeaponRegistry([invalid])).toThrow(/magazineSize/);
  });

  it('limits automatic fire cadence, reloads only available ammunition, and resumes firing', () => {
    const rifle = new WeaponController(weapon);
    expect(rifle.step(1 / 60, { fireHeld: true, firePressed: true, reloadPressed: false }, false)).toEqual([
      { type: 'shot', aimed: false },
    ]);
    expect(rifle.step(0.05, { fireHeld: true, firePressed: false, reloadPressed: false }, true)).toEqual([]);
    expect(rifle.step(0.05, { fireHeld: true, firePressed: false, reloadPressed: false }, true)).toEqual([
      { type: 'shot', aimed: true },
    ]);
    expect(rifle.magazine).toBe(28);

    const start = rifle.step(1 / 60, { fireHeld: false, firePressed: false, reloadPressed: true }, false);
    expect(start).toEqual([{ type: 'reload-started' }]);
    expect(rifle.step(1, { fireHeld: true, firePressed: false, reloadPressed: false }, false)).toEqual([]);
    expect(rifle.magazine).toBe(28);
    expect(rifle.step(1, { fireHeld: false, firePressed: false, reloadPressed: false }, false)).toEqual([
      { type: 'reload-completed' },
    ]);
    expect(rifle.magazine).toBe(30);
    expect(rifle.reserve).toBe(118);
  });

  it('does not fire while empty and leaves the magazine unchanged when reserve is empty', () => {
    const empty = new WeaponController({ ...weapon, startingReserve: 0 });
    empty.magazine = 0;
    expect(empty.step(0.2, { fireHeld: true, firePressed: true, reloadPressed: true }, false)).toEqual([]);
    expect(empty.snapshot.reloading).toBe(false);
    expect(empty.magazine).toBe(0);
  });

  it('fires semi-automatic weapons once per press, not continuously while held', () => {
    const sidearm = new WeaponController({ ...weapon, fireMode: 'semi-automatic' });
    expect(sidearm.step(0.2, { fireHeld: true, firePressed: true, reloadPressed: false }, false)).toHaveLength(1);
    expect(sidearm.step(0.2, { fireHeld: true, firePressed: false, reloadPressed: false }, false)).toEqual([]);
    expect(sidearm.magazine).toBe(29);
  });
});

describe('hitscan and combatant lifecycle', () => {
  it('damages the nearest enemy, applies impact motion, and ignores friendly targets', () => {
    const friendly = combatant('friendly', 'friendly', 0, -2);
    const enemy = combatant('enemy', 'enemy', 0, -4);
    const result = resolveHitscan({
      world: openWorld(), combatants: [friendly, enemy], shooterTeam: 'player',
      origin: { x: 0, y: 0.9, z: 0 }, direction: { x: 0, y: 0, z: -1 }, range: 20,
      damage: 34, knockback: 2,
    });
    expect(result.targetId).toBe('enemy');
    expect(friendly.health).toBe(100);
    expect(enemy.health).toBe(66);
    expect(enemy.velocity.z).toBeLessThan(0);
  });

  it('respects cover and reports the nearest obstruction instead of applying damage', () => {
    const target = combatant('enemy', 'enemy', 0, -5);
    const world = new MovementWorld({
      halfExtent: 10,
      obstacles: [{ minX: -1, maxX: 1, minZ: -2, maxZ: -1.5, maxY: 2 }],
    });
    const result = resolveHitscan({
      world, combatants: [target], shooterTeam: 'player', origin: { x: 0, y: 1, z: 0 },
      direction: { x: 0, y: 0, z: -1 }, range: 20, damage: 50,
    });
    expect(result.blocked).toBe(true);
    expect(result.targetId).toBeNull();
    expect(result.distance).toBeCloseTo(1.5);
    expect(target.health).toBe(100);
  });

  it('supports one-identity death, cancellable revive at half health, and delayed full respawn', () => {
    const target = combatant('bird-17', 'enemy', 2, -4);
    expect(target.applyDamage(100).killed).toBe(true);
    expect(target.applyDamage(30).applied).toBe(0);

    const revive = new ReviveAction();
    expect(revive.start(target)).toBe(true);
    expect(revive.start(target)).toBe(false);
    expect(revive.update(3.99)).toBe(false);
    expect(target.status).toBe('dead');
    expect(revive.update(0.01)).toBe(true);
    expect(target.status).toBe('alive');
    expect(target.health).toBe(50);
    expect(target.position.toArray()).toEqual([2, 0, -4]);

    target.applyDamage(100);
    const respawn = new RespawnTimer();
    expect(respawn.start(target, 2)).toBe(true);
    expect(respawn.update(1)).toBe(false);
    expect(respawn.secondsRemaining).toBe(1);
    expect(respawn.update(1, { x: -3, y: 0, z: 8 })).toBe(true);
    expect(target.status).toBe('alive');
    expect(target.health).toBe(100);
    expect(target.position.toArray()).toEqual([-3, 0, 8]);
  });

  it('uses deterministic spread and rejects a zero aim direction', () => {
    const target = combatant('enemy', 'enemy', 0, -5);
    const values = [0.25, 0.5];
    let next = 0;
    const result = resolveHitscan({
      world: openWorld(), combatants: [target], shooterTeam: 'player',
      origin: { x: 0, y: 0.9, z: 0 }, direction: { x: 0, y: 0, z: -1 },
      range: 20, damage: 10, spreadRadians: 0.01, random: () => values[next++] ?? 0,
    });
    expect(result.direction.x).toBeGreaterThan(0);
    expect(result.direction.length()).toBeCloseTo(1);
    expect(() => resolveHitscan({
      world: openWorld(), combatants: [], shooterTeam: 'player', origin: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 0 }, range: 10, damage: 10,
    })).toThrow(/non-zero/);
  });
});

describe('combat session integration', () => {
  it('fires into the shared hit resolver and prioritizes grenade mode without spending rifle ammo', () => {
    const target = combatant('enemy', 'enemy', 0, -5);
    const session = new CombatSession(openWorld(), [target], {
      ...weapon,
      hipSpreadRadians: 0,
      aimedSpreadRadians: 0,
    });
    const random = () => 0.5;
    const shot = session.step(1 / 60, {
      fireHeld: true, firePressed: true, reloadPressed: false,
      grenadeTogglePressed: false, aiming: false,
    }, { x: 0, y: 0.9, z: 0 }, { x: 0, y: 0, z: -1 }, random);
    expect(shot.shots[0]?.targetId).toBe('enemy');
    expect(target.health).toBe(66);
    expect(session.weapon.magazine).toBe(29);

    session.step(1 / 60, {
      fireHeld: false, firePressed: false, reloadPressed: false,
      grenadeTogglePressed: true, aiming: false,
    }, { x: 0, y: 0.9, z: 0 }, { x: 0, y: 0, z: -1 }, random);
    const grenade = session.step(1 / 60, {
      fireHeld: true, firePressed: true, reloadPressed: false,
      grenadeTogglePressed: false, aiming: false,
    }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, random);
    expect(grenade.grenadeThrown).toBe(true);
    expect(grenade.shots).toEqual([]);
    expect(session.weapon.magazine).toBe(29);
    expect(grenade.grenadeCount).toBe(1);
  });
});

describe('grenades and presentation feedback', () => {
  it('shows a ballistic path, spends one grenade per throw, and damages opponents on detonation', () => {
    const grenade = new GrenadeSystem();
    const world = openWorld();
    const target = combatant('enemy', 'enemy', 0, -10.35);
    const arc = grenade.trajectory({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, world);
    expect(arc.length).toBeGreaterThan(2);
    expect(arc.at(-1)?.y).toBeCloseTo(0);
    expect(grenade.throw({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 })).toBe(false);
    expect(grenade.toggleEquipped()).toBe(true);
    expect(grenade.throw({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 })).toBe(true);
    expect(grenade.count).toBe(GRENADE_RULES.startingCount - 1);
    const events = grenade.update(GRENADE_RULES.fuseSeconds, world, [target], 'player');
    expect(events).toHaveLength(1);
    expect(events[0]?.damagedIds).toContain('enemy');
    expect(target.health).toBeLessThan(100);
  });

  it('does not damage teammates through the blast and clears equipment when out of grenades', () => {
    const grenade = new GrenadeSystem();
    const teammate = combatant('teammate', 'friendly', 0, -10.35);
    grenade.toggleEquipped();
    expect(grenade.throw({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 })).toBe(true);
    grenade.update(10, openWorld(), [teammate], 'player');
    expect(teammate.health).toBe(100);
    grenade.throw({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 });
    expect(grenade.toggleEquipped()).toBe(false);
    grenade.throw({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 });
    expect(grenade.count).toBe(0);
    expect(grenade.equipped).toBe(false);
  });

  it('limits hit-stop to visual state and fades nearby explosion shake', () => {
    const feedback = new CombatFeedback();
    feedback.registerHit();
    expect(feedback.showHitFlash).toBe(true);
    expect(feedback.freezeWeaponPose).toBe(true);
    feedback.update(0.05);
    expect(feedback.freezeWeaponPose).toBe(false);
    expect(feedback.showHitFlash).toBe(true);
    feedback.registerExplosion(2, 4);
    const camera = { position: { x: 0, y: 0 }, rotation: { z: 0 } };
    feedback.applyCameraShake(camera as never);
    expect(camera.position.x !== 0 || camera.position.y !== 0).toBe(true);
    feedback.update(1);
    expect(feedback.showHitFlash).toBe(false);
  });

  it('attaches, animates, and disposes the generated rifle and grenade visuals', () => {
    const camera = new PerspectiveCamera();
    const rig = createWeaponModel('honk-47');
    const firstMesh = rig.root.children[0];
    if (!(firstMesh instanceof Mesh)) throw new Error('Generated rifle has no mesh');
    const geometryDispose = vi.spyOn(firstMesh.geometry, 'dispose');
    const weaponView = new WeaponView(camera, rig, 1.8);
    expect(camera.children).toContain(rig.root);
    expect(rig.muzzleFlash.visible).toBe(false);
    weaponView.fire();
    expect(rig.muzzleFlash.visible).toBe(true);
    weaponView.update(0.06);
    expect(rig.muzzleFlash.visible).toBe(false);
    const magazineY = rig.magazine.position.y;
    weaponView.beginReload();
    weaponView.update(0.45);
    const magazineDroppedY = rig.magazine.position.y;
    expect(magazineDroppedY).toBeLessThan(magazineY);
    weaponView.update(0.72);
    expect(rig.magazine.position.y).toBeGreaterThan(magazineDroppedY);
    weaponView.update(0.72);
    expect(rig.magazine.position.y).toBeCloseTo(magazineY);
    weaponView.dispose();
    expect(camera.children).not.toContain(rig.root);
    expect(geometryDispose).toHaveBeenCalledOnce();

    const scene = new Scene();
    const grenadeView = new GrenadeView(scene);
    const trajectory = scene.getObjectByName('grenade trajectory');
    if (!(trajectory instanceof Line)) throw new Error('Grenade arc line was not created');
    const setFromPoints = vi.spyOn(trajectory.geometry, 'setFromPoints');
    grenadeView.updateTrajectory([], false);
    expect(setFromPoints).not.toHaveBeenCalled();
    grenadeView.updateTrajectory([new Vector3(), new Vector3(0, 1, -1)], true);
    expect(setFromPoints).toHaveBeenCalledOnce();
    grenadeView.updateProjectiles([new Vector3(1, 2, 3)]);
    expect(scene.children.some((child) => child.name === 'grenade trajectory' && child.visible)).toBe(true);
    expect(scene.children.some((child) => child.name === 'thrown grenade')).toBe(true);
    grenadeView.updateProjectiles([]);
    grenadeView.dispose();
    expect(scene.children).toHaveLength(0);
  });
});


describe('review regressions', () => {
  it('maintains 600 RPM at the engine fixed step without floating-point delays', () => {
    const rifle = new WeaponController({ ...weapon, magazineSize: 100 });
    let shots = 0;
    for (let step = 0; step < 60; step += 1) {
      shots += rifle.step(1 / 60, { fireHeld: true, firePressed: false, reloadPressed: false }, false).length;
    }
    expect(shots).toBe(10);
    expect(rifle.magazine).toBe(90);
  });

  it.each(['revive', 'respawn'] as const)('cancels a stale %s action after revival and another death', (kind) => {
    const target = combatant('bird', 'enemy', 0, 0);
    target.applyDamage(100);
    const action = kind === 'revive' ? new ReviveAction(4) : new RespawnTimer();
    if (action instanceof ReviveAction) action.start(target);
    else action.start(target, 4);
    action.update(3);
    target.revive();
    target.applyDamage(100);
    expect(action.update(1)).toBe(false);
    expect(target.status).toBe('dead');
    if (action instanceof ReviveAction) {
      expect(action.progress).toBe(0);
      expect(action.start(target)).toBe(true);
    } else {
      expect(action.secondsRemaining).toBe(0);
      expect(action.start(target, 4)).toBe(true);
    }
    expect(action.update(3)).toBe(false);
    expect(action.update(1)).toBe(true);
  });
});
