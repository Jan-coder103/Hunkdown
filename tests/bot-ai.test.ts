import { describe, expect, it } from 'vitest';
import { Combatant } from '../src/game/combat/combatant';
import { BotBrain } from '../src/game/bots/bot-brain';
import { BotNavigation } from '../src/game/bots/navigation';
import { generateMap, worldPosition } from '../src/game/world/map-generator';
import { createEmptyMap, paintMapCell } from '../src/game/world/map-types';

describe('bot navigation', () => {
  it('routes around blocking buildings and varies equal-length lanes deterministically by bot seed', () => {
    let map = createEmptyMap({ width: 7, height: 7, seed: 21, cellSize: 8 });
    map = paintMapCell(map, 3, 3, 'solid-house');
    const navigation = new BotNavigation(generateMap(map));
    const start = { x: 1, y: 3 };
    const goal = { x: 5, y: 3 };
    const path = navigation.findPath(start, goal);
    const replay = navigation.findPath(start, goal);
    const alternatives = new Set(
      Array.from({ length: 24 }, (_, seed) => navigation.findPath(start, goal, seed + 1))
        .map((route) => route?.map((cell) => `${cell.x},${cell.y}`).join('|')),
    );

    expect(path).toEqual(replay);
    expect(path).not.toBeNull();
    expect(path?.some((cell) => cell.x === 3 && cell.y === 3)).toBe(false);
    expect(path?.[0]).toEqual(start);
    expect(path?.at(-1)).toEqual(goal);
    expect(alternatives.size).toBeGreaterThan(1);
  });

  it('inherits door and slope connectivity from the generated map graph', () => {
    let map = createEmptyMap({ width: 5, height: 5, seed: 8 });
    map = paintMapCell(map, 2, 2, 'enterable-house', 'north-south');
    map = paintMapCell(map, 3, 2, 'elevation');
    const navigation = new BotNavigation(generateMap(map));

    expect(navigation.findPath({ x: 2, y: 1 }, { x: 2, y: 3 })).not.toBeNull();
    expect(navigation.neighborCells({ x: 2, y: 2 })).not.toContainEqual({ x: 3, y: 2 });
    expect(navigation.findPath({ x: 3, y: 2 }, { x: 4, y: 2 })).not.toBeNull();
  });

  it('opens a new flat route after an enterable-house wall panel collapses', () => {
    const draft = paintMapCell(createEmptyMap({ width: 5, height: 3, seed: 19, cellSize: 8 }), 2, 1, 'enterable-house', 'north-south');
    const map = generateMap(draft);
    const navigation = new BotNavigation(map);
    const wall = map.collisions.find((collision) => collision.cell.x === 2 && collision.cell.y === 1 && collision.id?.endsWith('-west-full'));
    if (!wall?.id) throw new Error('Expected the closed west wall panel');

    expect(navigation.neighborCells({ x: 2, y: 1 })).not.toContainEqual({ x: 1, y: 1 });
    expect(navigation.openDestroyedWall(wall.id)).toBe(true);
    expect(navigation.neighborCells({ x: 2, y: 1 })).toContainEqual({ x: 1, y: 1 });
    expect(navigation.openDestroyedWall(wall.id)).toBe(false);
  });

  it('finds reachable solid-building cover between a bot and a threat', () => {
    let map = createEmptyMap({ width: 7, height: 5, seed: 3, cellSize: 8 });
    map = paintMapCell(map, 3, 2, 'solid-house');
    const navigation = new BotNavigation(generateMap(map));
    const bot = worldPosition(map, { x: 1, y: 2 });
    const threat = worldPosition(map, { x: 5, y: 2 });
    const cover = navigation.findCover(bot, threat, 51);

    expect(cover).not.toBeNull();
    expect(cover?.x).toBeLessThan(3);
    expect(navigation.findPath({ x: 1, y: 2 }, cover!)).not.toBeNull();
  });
});

describe('bot tactical decisions', () => {
  const openNavigation = () => new BotNavigation(generateMap(createEmptyMap({ width: 7, height: 5, seed: 14, cellSize: 8 })));
  const location = (cell: { x: number; y: number }) => worldPosition(createEmptyMap({ width: 7, height: 5, cellSize: 8 }), cell);

  it('advances by a navigable waypoint toward the objective when no enemy is visible', () => {
    const navigation = openNavigation();
    const botPosition = location({ x: 1, y: 2 });
    const bot = new Combatant('friendly-1', 'friendly', { ...botPosition, y: 0 });
    const intent = new BotBrain(navigation, 12).decide(bot, [bot], { x: 5, y: 2 }, () => false);

    expect(intent.behavior).toBe('advance');
    expect(intent.destination).toEqual({ x: 2, y: 2 });
    expect(intent.targetId).toBeNull();
    expect(intent.shouldFire).toBe(false);
  });

  it('routes around an occupied next cell when an equally short local lane is open', () => {
    const navigation = openNavigation();
    const map = createEmptyMap({ width: 7, height: 5, cellSize: 8 });
    const botPosition = worldPosition(map, { x: 1, y: 2 });
    const allyPosition = worldPosition(map, { x: 2, y: 2 });
    const bot = new Combatant('friendly-1', 'friendly', { ...botPosition, y: 0 });
    const ally = new Combatant('friendly-2', 'friendly', { ...allyPosition, y: 0 });
    const intent = new BotBrain(navigation, 12).decide(bot, [bot, ally], { x: 5, y: 2 }, () => false);

    expect(intent.behavior).toBe('advance');
    expect(intent.destination).not.toEqual({ x: 2, y: 2 });
  });

  it('engages visible opponents in range with a stable but imperfect aim point', () => {
    const navigation = openNavigation();
    const map = createEmptyMap({ width: 7, height: 5, cellSize: 8 });
    const botPosition = worldPosition(map, { x: 1, y: 2 });
    const enemyPosition = worldPosition(map, { x: 3, y: 2 });
    const bot = new Combatant('blue-1', 'friendly', { ...botPosition, y: 0 });
    const enemy = new Combatant('red-1', 'enemy', { ...enemyPosition, y: 0 });
    const first = new BotBrain(navigation, 95).decide(bot, [bot, enemy], { x: 5, y: 2 }, () => true);
    const replay = new BotBrain(navigation, 95).decide(bot, [bot, enemy], { x: 5, y: 2 }, () => true);

    expect(first).toEqual(replay);
    expect(first.behavior).toBe('engage');
    expect(first.targetId).toBe('red-1');
    expect(first.shouldFire).toBe(true);
    expect(first.aimPoint).not.toEqual({ x: enemy.position.x, y: enemy.position.y + enemy.height * 0.56, z: enemy.position.z });
  });

  it('does not target enemies behind blocked sight and seeks cover when hurt', () => {
    let map = createEmptyMap({ width: 7, height: 5, seed: 2, cellSize: 8 });
    map = paintMapCell(map, 3, 2, 'solid-house');
    const navigation = new BotNavigation(generateMap(map));
    const botPosition = worldPosition(map, { x: 1, y: 2 });
    const enemyPosition = worldPosition(map, { x: 5, y: 2 });
    const bot = new Combatant('blue-1', 'friendly', { ...botPosition, y: 0 });
    const enemy = new Combatant('red-1', 'enemy', { ...enemyPosition, y: 0 });
    const brain = new BotBrain(navigation, 61);

    const occluded = brain.decide(bot, [bot, enemy], { x: 0, y: 0 }, () => false);
    expect(occluded.behavior).toBe('advance');
    expect(occluded.targetId).toBeNull();

    bot.applyDamage(65);
    const hurt = brain.decide(bot, [bot, enemy], { x: 0, y: 0 }, () => true);
    expect(hurt.behavior).toBe('seek-cover');
    expect(hurt.destination).not.toBeNull();
    expect(hurt.shouldFire).toBe(false);
  });
});
