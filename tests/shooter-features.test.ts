import { describe, expect, it } from 'vitest';
import { Scene, Vector3, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { CombatSession } from '../src/game/combat/combat-session';
import { Combatant } from '../src/game/combat/combatant';
import { getWeaponDefinition } from '../src/content/weapons/registry';
import { MovementWorld } from '../src/game/player/movement-world';
import { GrenadeView } from '../src/game/combat/weapon-view';
import { GrenadeSystem } from '../src/game/combat/grenades';
import { resolveHitscan } from '../src/game/combat/hitscan';
import { CombatFeedback } from '../src/game/combat/combat-feedback';
import { BotSkirmishMatch } from '../src/game/match/bot-skirmish-match';
import { BotSkirmishView } from '../src/game/bots/bot-skirmish-view';
import { createEmptyMap } from '../src/game/world/map-types';
import { generateMap } from '../src/game/world/map-generator';
import { PlayerController } from '../src/game/player/player-controller';
import { KeyboardInput } from '../src/engine/keyboard-input';
import { FakeEventTarget, FakeVisibilityTarget, makeKeyEvent } from './helpers/engine-fixtures';

const idle = { fireHeld: false, firePressed: false, reloadPressed: false, grenadeTogglePressed: false, aiming: false };
const origin = new Vector3(0, 0.8, 0);
const direction = new Vector3(0, 0, -1);
const world = () => new MovementWorld({ halfExtent: 30, obstacles: [] });
const map = () => generateMap(createEmptyMap({ width: 9, height: 5, cellSize: 4, seed: 12 }));

describe('requested shooter features', () => {
  it('locks attacks for half a second in both switch directions and stabs only at melee range', () => {
    const near = new Combatant('near', 'enemy', { x: 0, y: 0, z: -1.5 });
    const far = new Combatant('far', 'enemy', { x: 0, y: 0, z: -4 });
    const session = new CombatSession(world(), [near, far], getWeaponDefinition('honk-47'));
    const step = (dt: number, input = idle) => session.step(dt, input, origin, direction, () => 0.5);
    step(0.01, { ...idle, switchPressed: true } as typeof idle);
    expect(session.knifeReady).toBe(false);
    expect(step(0.49, { ...idle, firePressed: true }).shots).toHaveLength(0);
    expect(step(0.01, { ...idle, firePressed: true }).shots).toHaveLength(0);
    expect(session.knifeReady).toBe(true);
    expect(step(0.01, { ...idle, firePressed: true }).shots[0]?.damage).toBe(55);
    expect(near.health).toBe(45);
    expect(far.health).toBe(100);
    step(0.01, { ...idle, switchPressed: true } as typeof idle);
    expect(step(0.49, { ...idle, fireHeld: true }).weaponEvents).toHaveLength(0);
    step(0.01);
    expect(step(0.01, { ...idle, fireHeld: true }).weaponEvents[0]?.type).toBe('shot');
    session.resetForRespawn();
    expect(session.heldWeapon).toBe('rifle');
    expect(session.switchRemaining).toBe(0);
  });

  it('increases walking speed by 25 percent while the knife movement modifier is active', () => {
    const keyboard = new FakeEventTarget();
    const input = new KeyboardInput({ windowTarget: keyboard, documentTarget: new FakeVisibilityTarget() });
    input.attach();
    keyboard.dispatchEvent(makeKeyEvent('keydown', 'KeyW'));
    const normal = new PlayerController(new PerspectiveCamera(), world());
    const boosted = new PlayerController(new PerspectiveCamera(), world());
    boosted.movementMultiplier = 1.25;
    for (let i = 0; i < 60; i++) { normal.update(1 / 60, input, false); boosted.update(1 / 60, input, false); input.endFrame(); }
    expect(boosted.horizontalSpeed / normal.horizontalSpeed).toBeCloseTo(1.25);
    input.dispose();
  });

  it('protects both team spawn areas and permits damage as soon as an actor leaves', () => {
    const match = new BotSkirmishMatch(map(), { friendlyCount: 1, enemyCount: 1 });
    for (const actor of match.simulation.combatants) {
      expect(match.isInSafeArea(actor.team, actor.position)).toBe(true);
      expect(actor.applyDamage(100).applied).toBe(0);
      actor.position.x = 0;
      expect(actor.applyDamage(25).applied).toBe(25);
      actor.position.x = actor.team === 'enemy' ? 17 : -17;
      expect(actor.applyDamage(100).applied).toBe(0);
    }
  });

  it('blocks real bullet and grenade damage inside spawn without preventing damage outside', () => {
    const match = new BotSkirmishMatch(map(), { friendlyCount: 0, enemyCount: 1 });
    const actor = match.simulation.combatants[0]!;
    actor.position.set(17, 0, 0);
    const shot = resolveHitscan({ world: match.simulation.world, combatants: [actor], shooterTeam: 'friendly', origin: { x: 17, y: 0.8, z: 3 }, direction: { x: 0, y: 0, z: -1 }, range: 10, damage: 30 });
    expect(shot.targetId).toBe(actor.id);
    expect(shot.damage).toBe(0);
    const grenade = new GrenadeSystem();
    grenade.toggleEquipped();
    grenade.throw({ x: 17, y: 0.4, z: 0 }, { x: 0, y: -1, z: 0 });
    expect(grenade.update(0.2, match.simulation.world, [actor], 'friendly')[0]?.damagedIds).toEqual([]);
    actor.position.set(0, 0, 0);
    grenade.throw({ x: 0, y: 0.4, z: 0 }, { x: 0, y: -1, z: 0 });
    expect(grenade.update(0.2, match.simulation.world, [actor], 'friendly')[0]?.damagedIds).toContain(actor.id);
    expect(actor.health).toBeLessThan(100);
  });

  it('shows a fading expanding blast after actual detonation, removes it, and limits camera shake by distance', () => {
    const session = new CombatSession(world(), [], getWeaponDefinition('honk-47'));
    session.step(0.01, { ...idle, grenadeTogglePressed: true, firePressed: true }, origin, direction, () => 0.5);
    const result = session.step(3, idle, origin, direction, () => 0.5);
    expect(result.explosions).toHaveLength(1);
    expect(session.grenades.projectiles).toHaveLength(0);
    const scene = new Scene();
    const view = new GrenadeView(scene);
    view.showExplosion(result.explosions[0]!.position);
    const blast = scene.getObjectByName('cartoon grenade explosion')!;
    view.updateEffects(0.2);
    const scale = blast.scale.x;
    view.updateEffects(0.2);
    expect(blast.scale.x).toBeGreaterThan(scale);
    expect(((blast.children[0] as Mesh).material as MeshBasicMaterial).opacity).toBeLessThan(1);
    view.updateEffects(1);
    expect(scene.getObjectByName('cartoon grenade explosion')).toBeUndefined();
    const feedback = new CombatFeedback();
    const camera = new PerspectiveCamera();
    feedback.registerExplosion(100, 4.2); feedback.update(0.01); feedback.applyCameraShake(camera);
    expect(camera.position.length()).toBe(0);
    feedback.registerExplosion(1, 4.2); feedback.update(0.01); feedback.applyCameraShake(camera);
    expect(camera.position.length()).toBeGreaterThan(0);
    view.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('raises and fades sleep letters and clears them when the corpse is removed', () => {
    const scene = new Scene();
    const view = new BotSkirmishView(scene, map(), { friendlyCount: 1, enemyCount: 0, countdownSeconds: 0.01, rules: { corpseLifetimeSeconds: 4 } });
    const actor = view.simulation.combatants[0]!;
    actor.position.x = 0;
    actor.applyDamage(100);
    view.step(0.02);
    const letters = scene.getObjectByName('sleeping z zzz')!;
    expect(letters.children).toHaveLength(2);
    const height = letters.children[0]!.position.y;
    view.step(0.1);
    expect(letters.children[0]!.position.y).toBeGreaterThan(height);
    view.step(1.9);
    const material = (letters.children[0]!.children[0] as import('three').Line).material as import('three').LineBasicMaterial;
    const opacity = material.opacity;
    view.step(0.5);
    expect(material.opacity).toBeLessThan(opacity);
    view.step(2);
    expect(scene.getObjectByName('sleeping z zzz')).toBeUndefined();
    view.dispose();
  });
});

