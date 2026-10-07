import { describe, expect, it } from 'vitest';
import { BotSkirmishSimulation, createMapBotRoster, createBotSkirmish, type BotSpawn } from '../src/game/bots/bot-simulation';
import { generateMap } from '../src/game/world/map-generator';
import { createEmptyMap, paintMapCell } from '../src/game/world/map-types';
import { PerspectiveCamera } from 'three';
import { KeyboardInput } from '../src/engine/keyboard-input';
import { PlayerController } from '../src/game/player/player-controller';
import { FakeEventTarget, FakeVisibilityTarget, makeKeyEvent } from './helpers/engine-fixtures';

describe('map-backed bot skirmish', () => {
  it('lets the player traverse a generated ramp, stand on its raised tile, and jump back onto it', () => {
    const map = generateMap(paintMapCell(createEmptyMap({ width: 5, height: 3, seed: 40, cellSize: 8 }), 2, 1, 'elevation'));
    const simulation = new BotSkirmishSimulation(map, []);
    expect(simulation.world.moveHorizontal(0, 11.6, 0, 1, 0, 1.75, 0.34).z).toBeCloseTo(11.66);
    const keyboard = new FakeEventTarget();
    const input = new KeyboardInput({ windowTarget: keyboard, documentTarget: new FakeVisibilityTarget() });
    input.attach();
    const player = new PlayerController(new PerspectiveCamera(), simulation.world, { spawn: { x: -8, y: 0, z: 0 } });
    keyboard.dispatchEvent(makeKeyEvent('keydown', 'KeyD'));
    for (let step = 0; step < 104; step += 1) { player.update(1 / 60, input, false); input.endFrame(); }
    keyboard.dispatchEvent(makeKeyEvent('keyup', 'KeyD'));
    expect(player.position.x).toBeCloseTo(0, 1);
    for (let step = 0; step < 60; step += 1) player.update(1 / 60, input, false);
    expect(player.position.y).toBeCloseTo(1.25);
    keyboard.dispatchEvent(makeKeyEvent('keydown', 'Space'));
    player.update(1 / 60, input, false);
    input.endFrame();
    expect(player.position.y).toBeGreaterThan(1.25);
    for (let step = 0; step < 90; step += 1) player.update(1 / 60, input, false);
    expect(player.position.y).toBeCloseTo(1.25);
    expect(player.isGrounded).toBe(true);
    input.dispose();
  });

  it('keeps bot elevation continuous throughout ascent and descent', () => {
    const map = generateMap(paintMapCell(createEmptyMap({ width: 5, height: 3, seed: 40, cellSize: 8 }), 3, 1, 'elevation'));
    const simulation = new BotSkirmishSimulation(map, [{ id: 'runner', team: 'friendly', cell: { x: 4, y: 1 } }]);
    let previousY = 0;
    let maximumY = 0;
    for (let step = 0; step < 240; step += 1) {
      simulation.step(1 / 60);
      const runner = simulation.getCombatant('runner')!;
      expect(Math.abs(runner.position.y - previousY)).toBeLessThan(0.05);
      expect(runner.position.y).toBeCloseTo(simulation.world.groundHeightAt(runner.position.x, runner.position.z), 8);
      previousY = runner.position.y;
      maximumY = Math.max(maximumY, previousY);
    }
    expect(maximumY).toBe(1.25);
    expect(previousY).toBe(0);
  });

  it('creates repeatable opposing spawn rosters from cells connected to the center objective', () => {
    const map = generateMap(createEmptyMap({ width: 9, height: 7, seed: 35, cellSize: 8 }));
    const first = createMapBotRoster(map, { friendlyCount: 12, enemyCount: 12, seed: 928 });
    const replay = createMapBotRoster(map, { friendlyCount: 12, enemyCount: 12, seed: 928 });
    const simulation = createBotSkirmish(map, { friendlyCount: 12, enemyCount: 12, seed: 928 });

    expect(replay).toEqual(first);
    expect(first).toHaveLength(24);
    expect(first.filter((bot) => bot.team === 'friendly')).toHaveLength(12);
    expect(first.filter((bot) => bot.team === 'enemy')).toHaveLength(12);
    expect(first.filter((bot) => bot.team === 'friendly').every((bot) => bot.cell.x <= 2)).toBe(true);
    expect(first.filter((bot) => bot.team === 'enemy').every((bot) => bot.cell.x >= 6)).toBe(true);
    expect(simulation.snapshots).toHaveLength(24);
  });

  it('moves, fires, applies damage, and replays the same skirmish deterministically', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 44, cellSize: 4 }));
    const roster: readonly BotSpawn[] = [
      { id: 'friendly-1', team: 'friendly', cell: { x: 1, y: 1 } },
      { id: 'enemy-1', team: 'enemy', cell: { x: 2, y: 1 } },
    ];
    const first = new BotSkirmishSimulation(map, roster, { seed: 18 });
    const replay = new BotSkirmishSimulation(map, roster, { seed: 18 });
    let aimedShots = 0;
    for (let step = 0; step < 120; step += 1) {
      aimedShots += first.step(1 / 60).shots.filter((shot) => shot.result.targetId !== null).length;
      replay.step(1 / 60);
    }

    expect(aimedShots).toBeGreaterThan(0);
    expect(first.snapshots.some((bot) => bot.health < 100)).toBe(true);
    expect(first.snapshots).toEqual(replay.snapshots);
  });

  it('continues the authoritative simulation for 100 bots without a rendered-view dependency', () => {
    const map = generateMap(createEmptyMap({ width: 11, height: 9, seed: 217, cellSize: 8 }));
    const simulation = createBotSkirmish(map, { friendlyCount: 50, enemyCount: 50, seed: 217 });
    const initial = simulation.snapshots;
    expect(initial).toHaveLength(100);

    for (let frame = 0; frame < 120; frame += 1) simulation.step(1 / 60);

    const current = simulation.snapshots;
    expect(current).toHaveLength(100);
    expect(new Set(current.map((bot) => bot.id)).size).toBe(100);
    expect(current.some((bot, index) => {
      const start = initial[index];
      return start && Math.hypot(bot.position.x - start.position.x, bot.position.z - start.position.z) > 0.1;
    })).toBe(true);
  });

  it('gives an actively firing bot a bounded recoil push away from its target', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 33, cellSize: 4 }));
    const simulation = new BotSkirmishSimulation(map, [
      { id: 'friendly-1', team: 'friendly', cell: { x: 1, y: 1 } },
    ], {
      seed: 33,
      movementSpeed: 0.001,
      humanPlayer: { id: 'player-target', team: 'enemy', spawn: { x: 1, y: 0, z: 0 } },
    });
    const start = simulation.snapshots[0]?.position;
    if (!start) throw new Error('Expected the firing bot');
    const fired = simulation.step(1 / 60).shots.find((shot) => shot.shooterId === 'friendly-1');
    expect(fired?.result.targetId).toBe('player-target');
    simulation.step(1 / 60);
    const after = simulation.snapshots.find((bot) => bot.id === 'friendly-1')?.position;
    if (!after || !fired) throw new Error('Expected the bot recoil step');
    const displacementTowardTarget = (after.x - start.x) * fired.result.direction.x + (after.z - start.z) * fired.result.direction.z;
    expect(displacementTowardTarget).toBeLessThan(0);
  });

  it('moves through a generated enterable-house door gap without clipping its wall colliders', () => {
    let draft = createEmptyMap({ width: 5, height: 3, seed: 18, cellSize: 8 });
    draft = paintMapCell(draft, 2, 1, 'enterable-house', 'west-east');
    const map = generateMap(draft);
    const simulation = new BotSkirmishSimulation(map, [
      { id: 'visitor', team: 'friendly', cell: { x: 1, y: 1 } },
    ]);

    for (let step = 0; step < 120; step += 1) simulation.step(1 / 60);
    const visitor = simulation.snapshots[0];
    expect(visitor?.position.x).toBeCloseTo(0, 1);
    expect(visitor?.position.z).toBeCloseTo(0, 1);
  });

  it('updates bot route connectivity after a player or bot destroys an enterable-house panel', () => {
    const draft = paintMapCell(createEmptyMap({ width: 5, height: 3, seed: 19, cellSize: 8 }), 2, 1, 'enterable-house', 'north-south');
    const map = generateMap(draft);
    const simulation = new BotSkirmishSimulation(map, []);
    const wall = map.collisions.find((collision) => collision.cell.x === 2 && collision.cell.y === 1 && collision.id?.endsWith('-west-full'));
    if (!wall?.id) throw new Error('Expected the closed west wall panel');

    expect(simulation.navigation.neighborCells({ x: 2, y: 1 })).not.toContainEqual({ x: 1, y: 1 });
    simulation.applyDestroyedObstacles([wall.id]);
    expect(simulation.navigation.neighborCells({ x: 2, y: 1 })).toContainEqual({ x: 1, y: 1 });
  });

  it('follows generated ramp surfaces between raised and street cells', () => {
    let draft = createEmptyMap({ width: 5, height: 3, seed: 40, cellSize: 8 });
    draft = paintMapCell(draft, 3, 1, 'elevation');
    const map = generateMap(draft);
    const simulation = new BotSkirmishSimulation(map, [
      { id: 'runner', team: 'friendly', cell: { x: 4, y: 1 } },
    ]);

    for (let step = 0; step < 240; step += 1) simulation.step(1 / 60);
    const runner = simulation.snapshots[0];
    expect(runner?.position.x).toBeCloseTo(0, 1);
    expect(runner?.position.y).toBeCloseTo(0, 2);
  });

  it('uses generated building collision to stop bots targeting through solid cover', () => {
    let draft = createEmptyMap({ width: 7, height: 5, seed: 3, cellSize: 8 });
    draft = paintMapCell(draft, 3, 2, 'solid-house');
    const map = generateMap(draft);
    // Place one bot on either side of the central building to isolate its sight blocking.
    const manual = new BotSkirmishSimulation(map, [
      { id: 'left', team: 'friendly', cell: { x: 1, y: 2 } },
      { id: 'right', team: 'enemy', cell: { x: 5, y: 2 } },
    ]);

    manual.step(1 / 60);
    expect(manual.snapshots.find((bot) => bot.id === 'left')).toMatchObject({ targetId: null, shouldFire: false });
    expect(manual.snapshots.find((bot) => bot.id === 'right')).toMatchObject({ targetId: null, shouldFire: false });
  });

  it('includes the locally controlled player in shared hit targets and lifecycle operations', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 44, cellSize: 4 }));
    const simulation = new BotSkirmishSimulation(map, [], {
      humanPlayer: { id: 'player', team: 'friendly', spawn: { x: -4, y: 0, z: 0 } },
    });
    const player = simulation.playerCombatant;

    expect(player).not.toBeNull();
    expect(simulation.combatants).toContain(player);
    expect(simulation.getCombatant('player')).toBe(player);
    player?.applyDamage(100);
    expect(simulation.reviveBot('player', 0.5)).toBe(true);
    expect(player?.health).toBe(50);
    player?.applyDamage(100);
    expect(simulation.respawnBot('player')).toBe(true);
    expect(player?.health).toBe(100);
    expect(player?.position.toArray()).toEqual([-4, 0, 0]);
  });

  it('lets opposing bots acquire and damage the locally controlled player', () => {
    const map = generateMap(createEmptyMap({ width: 4, height: 3, seed: 16, cellSize: 4 }));
    const simulation = new BotSkirmishSimulation(map, [
      { id: 'enemy-001', team: 'enemy', cell: { x: 3, y: 1 } },
    ], {
      seed: 16,
      thinkInterval: 0.1,
      humanPlayer: { id: 'player', team: 'friendly', spawn: { x: 2, y: 0, z: 0 } },
    });

    simulation.step(1 / 60);
    expect(simulation.snapshots[0]).toMatchObject({ targetId: 'player', shouldFire: true });
    for (let step = 0; step < 240; step += 1) simulation.step(1 / 60);
    expect(simulation.playerCombatant?.health).toBeLessThan(100);
  });
});
