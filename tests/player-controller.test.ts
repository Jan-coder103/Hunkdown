import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { Combatant } from '../src/game/combat/combatant';
import { resolveHitscan } from '../src/game/combat/hitscan';
import { createWeaponModel } from '../src/content/weapons/registry';
import { WeaponView } from '../src/game/combat/weapon-view';
import { KeyboardInput } from '../src/engine/keyboard-input';
import { PlayerController, type PlayerControllerOptions } from '../src/game/player/player-controller';
import { MovementWorld, type MovementWorldOptions } from '../src/game/player/movement-world';
import { FakeEventTarget, FakeVisibilityTarget, makeKeyEvent } from './helpers/engine-fixtures';

function createHarness(
  worldOptions: MovementWorldOptions = { halfExtent: 40, obstacles: [] },
  options: PlayerControllerOptions = {},
) {
  const keyboard = new FakeEventTarget();
  const page = new FakeVisibilityTarget();
  const input = new KeyboardInput({ windowTarget: keyboard, documentTarget: page });
  input.attach();
  const camera = new PerspectiveCamera(65, 1, 0.1, 500);
  const world = new MovementWorld(worldOptions);
  const player = new PlayerController(camera, world, options);
  return { keyboard, page, input, camera, world, player };
}

function tick(player: PlayerController, input: KeyboardInput, seconds = 1 / 60, aiming = false): void {
  player.update(seconds, input, aiming);
  input.endFrame();
}

function keyDown(keyboard: FakeEventTarget, code: string): void {
  keyboard.dispatchEvent(makeKeyEvent('keydown', code));
}

function keyUp(keyboard: FakeEventTarget, code: string): void {
  keyboard.dispatchEvent(makeKeyEvent('keyup', code));
}

describe('PlayerController', () => {
  it('moves at the same horizontal distance when integrated at different frame rates', () => {
    const simulate = (step: number, frames: number) => {
      const { keyboard, input, player } = createHarness();
      keyDown(keyboard, 'KeyW');
      for (let frame = 0; frame < frames; frame += 1) tick(player, input, step);
      const position = player.position.clone();
      input.dispose();
      return position;
    };
    const at60Fps = simulate(1 / 60, 60);
    const at120Fps = simulate(1 / 120, 120);

    expect(at60Fps.z).toBeCloseTo(at120Fps.z, 8);
    expect(at60Fps.z).toBeCloseTo(3.4, 6);
  });

  it('interpolates camera position between fixed simulation states', () => {
    const { keyboard, input, camera, player } = createHarness();
    keyDown(keyboard, 'KeyW');
    tick(player, input);
    const currentZ = player.position.z;

    player.render(0.5);
    expect(camera.position.z).toBeCloseTo((8 + currentZ) / 2, 8);
    player.render(1);
    expect(camera.position.z).toBeCloseTo(currentZ, 8);
  });

  it('clears movement and interpolation when match respawn assigns a new spawn', () => {
    const { keyboard, input, camera, player } = createHarness();
    keyDown(keyboard, 'KeyW');
    for (let frame = 0; frame < 20; frame += 1) tick(player, input);
    player.setSpawn({ x: -12, y: 1.25, z: 6 });
    player.render(0);

    expect(player.position.toArray()).toEqual([-12, 1.25, 6]);
    expect(player.velocity.toArray()).toEqual([0, 0, 0]);
    expect(player.isGrounded).toBe(true);
    expect(camera.position.x).toBeCloseTo(-12);
    expect(camera.position.y).toBeCloseTo(2.83);
    expect(camera.position.z).toBeCloseTo(6);
  });

  it('carries recoil impulses through input movement and can pop the player into the air', () => {
    const { input, player } = createHarness(undefined, { spawn: { x: 0, y: 0, z: 0 } });
    player.applyImpulse({ x: 0, y: 0, z: -1 }, 4);
    for (let frame = 0; frame < 12; frame += 1) tick(player, input);
    expect(player.position.z).toBeLessThan(-0.35);

    player.setSpawn({ x: 0, y: 0, z: 0 });
    player.applyImpulse({ x: 0.1, y: 1, z: 0 }, 3);
    for (let frame = 0; frame < 8; frame += 1) tick(player, input);
    expect(player.position.y).toBeGreaterThan(0.15);
    expect(player.isGrounded).toBe(false);
    input.dispose();
  });

  it('stops at an obstacle and stays within the playground boundary', () => {
    const { keyboard, input, player } = createHarness({
      halfExtent: 10,
      obstacles: [{ minX: -1, maxX: 1, minZ: -2, maxZ: 0, maxY: 2.4 }],
    }, { spawn: { x: 0, y: 0, z: 1.2 } });
    keyDown(keyboard, 'KeyW');
    for (let frame = 0; frame < 90; frame += 1) tick(player, input);

    expect(player.position.z).toBeGreaterThanOrEqual(0.34);
    expect(player.position.z).toBeLessThan(0.43);
    keyUp(keyboard, 'KeyW');
    keyDown(keyboard, 'KeyD');
    for (let frame = 0; frame < 200; frame += 1) tick(player, input);
    expect(player.position.x).toBeLessThanOrEqual(9.66);
  });

  it('walks up and down the defined ramp surface without falling through it', () => {
    const { keyboard, input, player, world } = createHarness({
      halfExtent: 12,
      obstacles: [],
      ramps: [{
        minX: -2,
        maxX: 2,
        minZ: -4,
        maxZ: 4,
        lowY: 0,
        rise: 2,
        risesAlong: 'z',
        risesTowardPositive: false,
      }],
    }, { spawn: { x: 0, y: 0, z: 3.8 } });
    keyDown(keyboard, 'KeyW');
    for (let frame = 0; frame < 36; frame += 1) tick(player, input);

    expect(player.position.z).toBeLessThan(1.2);
    expect(player.position.y).toBeGreaterThan(0.6);
    expect(player.position.y).toBeCloseTo(world.groundHeightAt(player.position.x, player.position.z), 5);
    expect(player.isGrounded).toBe(true);
  });

  it('supports held crouch, sprint, slide, and camera lean', () => {
    const { keyboard, input, camera, player } = createHarness();
    keyDown(keyboard, 'KeyW');
    keyDown(keyboard, 'ShiftLeft');
    tick(player, input);
    expect(player.horizontalSpeed).toBeCloseTo(7.4);

    keyDown(keyboard, 'KeyC');
    tick(player, input);
    expect(player.isSliding).toBe(true);
    expect(player.isCrouched).toBe(true);
    expect(player.horizontalSpeed).toBeGreaterThan(7.4);

    keyDown(keyboard, 'KeyQ');
    for (let frame = 0; frame < 10; frame += 1) tick(player, input);
    expect(camera.rotation.z).toBeGreaterThan(0);
    for (let frame = 0; frame < 50; frame += 1) tick(player, input);
    expect(player.isSliding).toBe(false);

    keyUp(keyboard, 'KeyC');
    keyUp(keyboard, 'KeyQ');
    tick(player, input);
    expect(player.isCrouched).toBe(false);
    for (let frame = 0; frame < 60; frame += 1) tick(player, input);
    expect(camera.position.y).toBeCloseTo(1.58);
  });

  it.each([['KeyQ', 1], ['KeyE', -1]] as const)('leans with %s in the expected screen direction and recenters', (key, sign) => {
    const { keyboard, input, camera, player } = createHarness();
    keyDown(keyboard, key);
    for (let i = 0; i < 30; i += 1) tick(player, input);
    player.render(1);
    expect(camera.rotation.z * sign).toBeGreaterThan(0.27);
    keyUp(keyboard, key);
    for (let i = 0; i < 60; i += 1) tick(player, input);
    player.render(1);
    expect(camera.rotation.z).toBeCloseTo(0, 4);
    input.dispose();
  });

  it('peeks and shoots around a corner with planted feet and an exposed body hitbox', () => {
    const { keyboard, input, camera, player, world } = createHarness({ halfExtent: 40,
      obstacles: [{ minX: 0, maxX: 2, minZ: -2, maxZ: -1, maxY: 3 }] },
      { spawn: { x: 0.2, y: 0, z: 0 } });
    const target = new Combatant('enemy', 'enemy', { x: -0.23, y: 0, z: -4 }, 100, 0.1);
    const rig = createWeaponModel('honk-47');
    const weapon = new WeaponView(camera, rig, 1.8);
    const shot = () => resolveHitscan({ world, combatants: [target], shooterTeam: 'friendly',
      origin: camera.position, direction: camera.getWorldDirection(new Vector3()), range: 20, damage: 10 });
    try {
      expect(shot().blocked).toBe(true);
      const feet = player.position.clone();
      keyDown(keyboard, 'KeyQ');
      for (let i = 0; i < 60; i += 1) tick(player, input);
      player.render(1);
      camera.updateMatrixWorld(true);
      expect(player.position.equals(feet)).toBe(true);
      expect(camera.position.x).toBeLessThan(-0.22);
      expect(camera.position.y).toBeLessThan(1.58);
      expect(shot().targetId).toBe('enemy');
      const gunPosition = rig.root.getWorldPosition(new Vector3());
      keyUp(keyboard, 'KeyQ');
      for (let i = 0; i < 60; i += 1) tick(player, input);
      player.render(1); camera.updateMatrixWorld(true);
      expect(rig.root.getWorldPosition(new Vector3()).x).toBeGreaterThan(gunPosition.x + 0.3);
      expect(camera.position.x).toBeCloseTo(feet.x, 2);

      const defender = new Combatant('player', 'friendly', feet);
      // Return fire can strike the tilted upper body outside cover.
      keyDown(keyboard, 'KeyQ');
      for (let i = 0; i < 60; i += 1) tick(player, input);
      defender.leanOffset.copy(player.bodyLeanOffset);
      defender.poseHeight = player.leanedBodyHeight;
      const returnFire = () => resolveHitscan({ world, combatants: [defender], shooterTeam: 'enemy',
        origin: { x: -0.23, y: 1.5, z: -4 }, direction: { x: 0, y: 0, z: 1 }, range: 20, damage: 10 });
      expect(returnFire().targetId).toBe('player');
      defender.leanOffset.set(0, 0, 0);
      expect(returnFire().targetId).toBeNull();
    } finally { weapon.dispose(); input.dispose(); }
  });

  it('limits leaning against adjacent walls, including interpolated views and turns', () => {
    const { keyboard, input, camera, player } = createHarness({ halfExtent: 40,
      obstacles: [{ minX: -2, maxX: -0.4, minZ: -2, maxZ: 2, maxY: 3 }] },
      { spawn: { x: 0, y: 0, z: 0 } });
    keyDown(keyboard, 'KeyQ');
    for (let i = 0; i < 60; i += 1) tick(player, input);
    expect(camera.position.x).toBeGreaterThan(-0.22);
    expect(player.leanRadians).toBeLessThan(0.15);
    for (const alpha of [0, 0.5, 1]) {
      player.render(alpha);
      expect(camera.position.x).toBeGreaterThan(-0.22);
    }
    keyUp(keyboard, 'KeyQ'); keyDown(keyboard, 'KeyE');
    for (let i = 0; i < 60; i += 1) tick(player, input);
    expect(camera.position.x).toBeGreaterThan(0.4);
    player.handleMouseMove(-Math.PI / player.lookSensitivity, 0);
    expect(camera.position.x).toBeGreaterThan(-0.22);
    input.dispose();
  });

  it('leans relative to facing direction and handles crouch, simultaneous keys, and spawn reset', () => {
    const { keyboard, input, camera, player } = createHarness(undefined, { spawn: { x: 0, y: 0, z: 0 } });
    player.handleMouseMove(-Math.PI / 2 / player.lookSensitivity, 0);
    keyDown(keyboard, 'KeyQ');
    for (let i = 0; i < 60; i += 1) tick(player, input);
    expect(camera.position.x).toBeCloseTo(0);
    expect(camera.position.z).toBeGreaterThan(0.4);
    keyDown(keyboard, 'KeyC');
    for (let i = 0; i < 60; i += 1) tick(player, input);
    expect(camera.position.z).toBeGreaterThan(0.27);
    expect(camera.position.z).toBeLessThan(0.3);
    expect(camera.position.y).toBeLessThan(1.02);
    keyDown(keyboard, 'KeyE');
    for (let i = 0; i < 60; i += 1) tick(player, input);
    expect(camera.position.z).toBeCloseTo(0, 2);
    player.setSpawn({ x: 3, y: 0, z: 2 });
    player.render(0.5);
    expect(player.leanRadians).toBe(0);
    expect(player.bodyLeanOffset.lengthSq()).toBe(0);
    expect(camera.position.x).toBe(3);
    expect(camera.position.z).toBe(2);
    input.dispose();
  });

  it('supports configurable crouch toggle and keeps it engaged until toggled again', () => {
    const { keyboard, input, player } = createHarness(undefined, { crouchMode: 'toggle' });
    keyDown(keyboard, 'KeyC');
    tick(player, input);
    expect(player.isCrouched).toBe(true);
    keyUp(keyboard, 'KeyC');
    tick(player, input);
    expect(player.isCrouched).toBe(true);
    keyDown(keyboard, 'KeyC');
    tick(player, input);
    expect(player.isCrouched).toBe(false);
  });

  it('supports a normal jump and class-gated boosted double jump', () => {
    const disabled = createHarness();
    keyDown(disabled.keyboard, 'Space');
    tick(disabled.player, disabled.input);
    const firstJumpSpeed = disabled.player.velocity.y;
    expect(disabled.player.jumpCount).toBe(1);
    keyUp(disabled.keyboard, 'Space');
    tick(disabled.player, disabled.input);
    keyDown(disabled.keyboard, 'Space');
    tick(disabled.player, disabled.input);
    expect(disabled.player.jumpCount).toBe(1);
    expect(disabled.player.velocity.y).toBeLessThan(firstJumpSpeed);

    const enabled = createHarness(undefined, {
      capabilities: { boostedDoubleJump: true, wallJump: false },
    });
    keyDown(enabled.keyboard, 'Space');
    tick(enabled.player, enabled.input);
    keyUp(enabled.keyboard, 'Space');
    tick(enabled.player, enabled.input);
    keyDown(enabled.keyboard, 'Space');
    tick(enabled.player, enabled.input);
    expect(enabled.player.jumpCount).toBe(2);
    expect(enabled.player.velocity.y).toBeGreaterThan(firstJumpSpeed);
  });

  it('wall-jumps away from a wall with a horizontal speed boost', () => {
    const { keyboard, input, player } = createHarness({
      halfExtent: 10,
      obstacles: [{ minX: -2, maxX: 2, minZ: -1.5, maxZ: -0.5, maxY: 2.8 }],
    }, {
      spawn: { x: 0, y: 0, z: 0.7 },
      capabilities: { boostedDoubleJump: false, wallJump: true },
    });
    keyDown(keyboard, 'KeyW');
    keyDown(keyboard, 'Space');
    tick(player, input);
    keyUp(keyboard, 'Space');
    for (let frame = 0; frame < 16; frame += 1) tick(player, input);
    const wallApproachZ = player.position.z;
    expect(wallApproachZ).toBeGreaterThanOrEqual(-0.16);

    keyDown(keyboard, 'Space');
    tick(player, input);
    expect(player.velocity.y).toBeGreaterThan(6);
    expect(player.velocity.z).toBeGreaterThan(0);
    const beforeImpulseStep = player.position.z;
    tick(player, input);
    expect(player.position.z).toBeGreaterThan(beforeImpulseStep);
  });

  it('applies held aiming zoom and reduces pointer sensitivity to 80 percent', () => {
    const normal = createHarness();
    const aimed = createHarness();
    normal.player.handleMouseMove(100, 100);
    aimed.player.handleMouseMove(100, 100, true);
    expect(Math.abs(aimed.player.yaw)).toBeCloseTo(Math.abs(normal.player.yaw) * 0.8);
    expect(Math.abs(aimed.player.pitch)).toBeCloseTo(Math.abs(normal.player.pitch) * 0.8);

    tick(aimed.player, aimed.input, 1 / 60, true);
    expect(aimed.camera.fov).toBeLessThan(65);
    for (let frame = 0; frame < 60; frame += 1) tick(aimed.player, aimed.input, 1 / 60, true);
    expect(aimed.camera.fov).toBeCloseTo(48, 3);
    tick(aimed.player, aimed.input, 1 / 60, false);
    expect(aimed.camera.fov).toBeGreaterThan(48);
  });

  it('updates look sensitivity safely while settings are open', () => {
    const { player } = createHarness();
    player.setLookSensitivity(0.003);
    player.handleMouseMove(100, 0);
    expect(Math.abs(player.yaw)).toBeCloseTo(0.3);
    expect(() => player.setLookSensitivity(0)).toThrow(RangeError);
  });

  it('applies weapon recoil to the live aim ray and smoothly returns to the look direction', () => {
    const { input, camera, player } = createHarness();
    player.applyRecoil(0.08, 0.03);
    expect(camera.rotation.x).toBeCloseTo(0.08);
    expect(camera.rotation.y).toBeCloseTo(0.03);
    expect(camera.getWorldDirection(new Vector3()).y).toBeGreaterThan(0);
    for (let frame = 0; frame < 40; frame += 1) tick(player, input);
    expect(camera.rotation.x).toBeLessThan(0.08);
    expect(camera.rotation.x).toBeCloseTo(0, 2);
    expect(camera.rotation.y).toBeCloseTo(0, 2);
    input.dispose();
  });

  it('clamps extreme vertical mouse movement before camera pitch flips', () => {
    const { player, camera } = createHarness();
    player.handleMouseMove(0, 100_000);
    expect(camera.rotation.x).toBeGreaterThan(-Math.PI / 2);
    expect(camera.rotation.x).toBeLessThan(0);
  });
});
