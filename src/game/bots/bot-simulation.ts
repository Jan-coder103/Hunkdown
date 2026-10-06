import { createSeededRandom, type RandomSource } from '../../engine/seeded-random';
import { getWeaponDefinition } from '../../content/weapons/registry';
import { resolveHitscan, type HitscanResult } from '../combat/hitscan';
import { Combatant, type CombatTeam } from '../combat/combatant';
import { WeaponController } from '../combat/weapon-controller';
import { MovementWorld, type RampSurface, type RectangleObstacle } from '../player/movement-world';
import type { GridPoint } from '../world/map-types';
import { worldPosition, type GeneratedMap } from '../world/map-generator';
import { BotBrain, type BotIntent } from './bot-brain';
import { BotNavigation } from './navigation';

export type BotSide = Extract<CombatTeam, 'friendly' | 'enemy'>;

export type BotSpawn = Readonly<{
  id: string;
  team: BotSide;
  cell: GridPoint;
}>;

export type BotRosterOptions = Readonly<{
  friendlyCount: number;
  enemyCount: number;
  seed?: number;
}>;

export type BotSimulationOptions = Readonly<{
  seed?: number;
  weaponId?: string;
  movementSpeed?: number;
  thinkInterval?: number;
}>;

export type BotShot = Readonly<{ shooterId: string; result: HitscanResult }>;

export type BotSimulationStep = Readonly<{
  shots: readonly BotShot[];
  killedIds: readonly string[];
}>;

export type BotSnapshot = Readonly<{
  id: string;
  team: BotSide;
  status: Combatant['status'];
  health: number;
  position: Readonly<{ x: number; y: number; z: number }>;
  behavior: BotIntent['behavior'];
  targetId: string | null;
  shouldFire: boolean;
  magazine: number;
  reserve: number;
}>;

type BotActor = {
  readonly combatant: Combatant;
  readonly spawn: BotSpawn;
  readonly brain: BotBrain;
  readonly weapon: WeaponController;
  readonly random: RandomSource;
  intent: BotIntent;
  thinkRemaining: number;
  wasFireHeld: boolean;
};

type PendingShot = Readonly<{
  actor: BotActor;
  origin: Readonly<{ x: number; y: number; z: number }>;
  direction: Readonly<{ x: number; y: number; z: number }>;
}>;

const DEFAULT_THINK_INTERVAL = 0.2;
const DEFAULT_MOVEMENT_SPEED = 4.2;

/** Builds deterministic opposing spawn groups on navigable map cells connected to mid-map. */
export function createMapBotRoster(map: GeneratedMap, options: BotRosterOptions): readonly BotSpawn[] {
  assertCount(options.friendlyCount, 'friendlyCount');
  assertCount(options.enemyCount, 'enemyCount');
  const seed = options.seed ?? map.source.seed;
  assertSeed(seed);
  const navigation = new BotNavigation(map);
  const objective = navigation.nearestCell({ x: 0, z: 0 });
  if (!objective) throw new Error('Cannot create a bot roster for a map with no navigable cells');
  const connected = navigation.reachableCells(objective);
  const friendlyBoundary = Math.floor((map.source.width - 1) * 0.36);
  const enemyBoundary = Math.ceil((map.source.width - 1) * 0.64);
  const friendlyCells = connected.filter((cell) => cell.x <= friendlyBoundary);
  const enemyCells = connected.filter((cell) => cell.x >= enemyBoundary);
  const roster: BotSpawn[] = [];

  appendSide('friendly', options.friendlyCount, friendlyCells.length > 0 ? friendlyCells : connected, seed, roster);
  appendSide('enemy', options.enemyCount, enemyCells.length > 0 ? enemyCells : connected, seed ^ 0x9e3779b9, roster);
  return Object.freeze(roster);
}

/** A data-only two-team skirmish runner. Match timers, tickets, and respawns are deliberately separate. */
export class BotSkirmishSimulation {
  readonly navigation: BotNavigation;
  readonly objective: GridPoint;
  private readonly actors: readonly BotActor[];
  private readonly world: MovementWorld;
  private readonly movementSpeed: number;
  private readonly thinkInterval: number;

  constructor(readonly map: GeneratedMap, roster: readonly BotSpawn[], options: BotSimulationOptions = {}) {
    const seed = options.seed ?? map.source.seed;
    assertSeed(seed);
    this.movementSpeed = options.movementSpeed ?? DEFAULT_MOVEMENT_SPEED;
    this.thinkInterval = options.thinkInterval ?? DEFAULT_THINK_INTERVAL;
    if (!Number.isFinite(this.movementSpeed) || this.movementSpeed <= 0) throw new RangeError('Bot movement speed must be positive');
    if (!Number.isFinite(this.thinkInterval) || this.thinkInterval <= 0) throw new RangeError('Bot think interval must be positive');
    this.navigation = new BotNavigation(map);
    const objective = this.navigation.nearestCell({ x: 0, z: 0 });
    if (!objective) throw new Error('Cannot simulate bots on a map with no navigable cells');
    this.objective = objective;
    this.world = createMapWorld(map);

    const weapon = getWeaponDefinition(options.weaponId ?? 'honk-47');
    const ids = new Set<string>();
    this.actors = Object.freeze(roster.map((spawn) => {
      if (ids.has(spawn.id)) throw new Error(`Duplicate bot id: ${spawn.id}`);
      ids.add(spawn.id);
      if (spawn.team !== 'friendly' && spawn.team !== 'enemy') throw new Error(`Bot ${spawn.id} must belong to a battle team`);
      const position = this.navigation.worldPosition(spawn.cell);
      if (!position) throw new Error(`Bot ${spawn.id} spawn cell (${spawn.cell.x}, ${spawn.cell.y}) is not navigable`);
      const combatant = new Combatant(spawn.id, spawn.team, position);
      const botSeed = seedFromString(`${seed}:${spawn.id}`);
      return {
        combatant,
        spawn,
        brain: new BotBrain(this.navigation, botSeed),
        weapon: new WeaponController(weapon),
        random: createSeededRandom(botSeed ^ 0xa511e9b3),
        intent: idleIntent(),
        thinkRemaining: 0,
        wasFireHeld: false,
      };
    }));
  }

  get snapshots(): readonly BotSnapshot[] {
    return Object.freeze(this.actors.map(({ combatant, intent, weapon }) => Object.freeze({
      id: combatant.id,
      team: combatant.team as BotSide,
      status: combatant.status,
      health: combatant.health,
      position: Object.freeze({ x: combatant.position.x, y: combatant.position.y, z: combatant.position.z }),
      behavior: intent.behavior,
      targetId: intent.targetId,
      shouldFire: intent.shouldFire,
      magazine: weapon.magazine,
      reserve: weapon.reserve,
    })));
  }

  /** Revives a dead bot at its team's spawn point and restores half health. */
  reviveBot(id: string, healthFraction = 0.5): boolean {
    const actor = this.actors.find((candidate) => candidate.combatant.id === id);
    if (!actor || actor.combatant.status !== 'dead') return false;
    const spawn = this.navigation.worldPosition(actor.spawn.cell);
    if (!spawn || !actor.combatant.revive(healthFraction)) return false;
    actor.combatant.position.set(spawn.x, spawn.y, spawn.z);
    this.resetActorAfterLifecycle(actor);
    return true;
  }

  /** Respawns a dead bot at its team's spawn point with full health and ammunition. */
  respawnBot(id: string): boolean {
    const actor = this.actors.find((candidate) => candidate.combatant.id === id);
    if (!actor) return false;
    const spawn = this.navigation.worldPosition(actor.spawn.cell);
    if (!spawn || !actor.combatant.respawn(spawn)) return false;
    actor.weapon.resetForRespawn();
    this.resetActorAfterLifecycle(actor);
    return true;
  }

  step(deltaSeconds: number): BotSimulationStep {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return Object.freeze({ shots: Object.freeze([]), killedIds: Object.freeze([]) });
    const combatants = this.actors.map((actor) => actor.combatant);
    const aliveBefore = new Set(combatants.filter((combatant) => combatant.status === 'alive').map((combatant) => combatant.id));
    const pendingShots: PendingShot[] = [];

    for (const actor of this.actors) {
      if (actor.combatant.status === 'alive') this.applyImpactMotion(actor.combatant, deltaSeconds);
    }
    for (const actor of this.actors) {
      const bot = actor.combatant;
      if (bot.status !== 'alive') continue;
      actor.thinkRemaining -= deltaSeconds;
      if (actor.thinkRemaining <= 0) {
        actor.intent = actor.brain.decide(bot, combatants, this.objective, (observer, target) => this.canSee(observer, target));
        actor.thinkRemaining = this.thinkInterval;
      }
    }

    for (const actor of this.actors) {
      const bot = actor.combatant;
      if (bot.status !== 'alive') continue;
      this.moveTowardIntent(bot, actor.intent.destination, deltaSeconds);
    }

    for (const actor of this.actors) {
      const bot = actor.combatant;
      if (bot.status !== 'alive') continue;
      const fireHeld = actor.intent.shouldFire;
      const reloadPressed = actor.weapon.magazine === 0 && actor.weapon.reserve > 0;
      const events = actor.weapon.step(deltaSeconds, {
        fireHeld,
        firePressed: fireHeld && !actor.wasFireHeld,
        reloadPressed,
      }, false);
      actor.wasFireHeld = fireHeld;
      for (const event of events) {
        if (event.type !== 'shot' || !actor.intent.aimPoint) continue;
        const origin = { x: bot.position.x, y: bot.position.y + bot.height * 0.62, z: bot.position.z };
        const direction = {
          x: actor.intent.aimPoint.x - origin.x,
          y: actor.intent.aimPoint.y - origin.y,
          z: actor.intent.aimPoint.z - origin.z,
        };
        pendingShots.push(Object.freeze({ actor, origin, direction }));
      }
    }

    const shots = pendingShots.map(({ actor, origin, direction }) => Object.freeze({
      shooterId: actor.combatant.id,
      result: resolveHitscan({
        world: this.world,
        combatants,
        shooterTeam: actor.combatant.team,
        origin,
        direction,
        range: actor.weapon.definition.range,
        spreadRadians: actor.weapon.definition.hipSpreadRadians,
        random: actor.random,
        damage: actor.weapon.definition.damage,
        knockback: 1.8,
      }),
    }));
    const killedIds = combatants
      .filter((combatant) => aliveBefore.has(combatant.id) && combatant.status === 'dead')
      .map((combatant) => combatant.id);
    return Object.freeze({ shots: Object.freeze(shots), killedIds: Object.freeze(killedIds) });
  }

  private canSee(observer: Combatant, target: Combatant): boolean {
    const origin = { x: observer.position.x, y: observer.position.y + observer.height * 0.56, z: observer.position.z };
    const destination = { x: target.position.x, y: target.position.y + target.height * 0.56, z: target.position.z };
    const direction = { x: destination.x - origin.x, y: destination.y - origin.y, z: destination.z - origin.z };
    const distance = Math.hypot(direction.x, direction.y, direction.z);
    if (distance === 0) return true;
    const hit = this.world.raycast(origin, direction, distance);
    return hit === null || hit.distance >= distance - target.radius;
  }

  private resetActorAfterLifecycle(actor: BotActor): void {
    actor.intent = idleIntent();
    actor.thinkRemaining = 0;
    actor.wasFireHeld = false;
  }

  private moveTowardIntent(bot: Combatant, destination: GridPoint | null, deltaSeconds: number): void {
    if (!destination) return;
    const target = this.navigation.worldPosition(destination);
    if (!target) return;
    const deltaX = target.x - bot.position.x;
    const deltaZ = target.z - bot.position.z;
    const distance = Math.hypot(deltaX, deltaZ);
    if (distance <= 0.015) {
      bot.position.set(target.x, target.y, target.z);
      return;
    }
    const travel = Math.min(distance, this.movementSpeed * deltaSeconds);
    const moved = this.world.moveHorizontal(
      bot.position.x,
      bot.position.z,
      deltaX / distance * travel,
      deltaZ / distance * travel,
      bot.position.y,
      bot.height,
      bot.radius,
    );
    bot.position.x = moved.x;
    bot.position.z = moved.z;
    bot.position.y = this.groundHeightAt(moved.x, moved.z);
    if (distance <= travel + 0.015) bot.position.set(target.x, target.y, target.z);
  }

  private applyImpactMotion(bot: Combatant, deltaSeconds: number): void {
    if (bot.velocity.lengthSq() < 0.0004) {
      bot.velocity.set(0, 0, 0);
      return;
    }
    const moved = this.world.moveHorizontal(
      bot.position.x,
      bot.position.z,
      bot.velocity.x * deltaSeconds,
      bot.velocity.z * deltaSeconds,
      bot.position.y,
      bot.height,
      bot.radius,
    );
    bot.position.x = moved.x;
    bot.position.z = moved.z;
    bot.position.y = this.groundHeightAt(moved.x, moved.z);
    bot.velocity.multiplyScalar(Math.exp(-7 * deltaSeconds));
  }

  private groundHeightAt(x: number, z: number): number {
    const cell = this.navigation.nearestCell({ x, z });
    const tileHeight = cell ? this.navigation.worldPosition(cell)?.y ?? 0 : 0;
    return Math.max(tileHeight, this.world.groundHeightAt(x, z));
  }
}

export function createBotSkirmish(map: GeneratedMap, rosterOptions: BotRosterOptions, simulationOptions: BotSimulationOptions = {}): BotSkirmishSimulation {
  const seed = simulationOptions.seed ?? rosterOptions.seed ?? map.source.seed;
  return new BotSkirmishSimulation(map, createMapBotRoster(map, rosterOptions), { ...simulationOptions, seed });
}

function appendSide(team: BotSide, count: number, cells: readonly GridPoint[], seed: number, roster: BotSpawn[]): void {
  if (count === 0) return;
  if (cells.length === 0) throw new Error(`No connected spawn cells are available for ${team} bots`);
  const random = createSeededRandom(seed >>> 0);
  const shuffled = [...cells];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  for (let index = 0; index < count; index += 1) {
    const cell = shuffled[index % shuffled.length];
    if (!cell) continue;
    roster.push(Object.freeze({ id: `${team}-${String(index + 1).padStart(3, '0')}`, team, cell }));
  }
}

function createMapWorld(map: GeneratedMap): MovementWorld {
  const obstacles: RectangleObstacle[] = map.collisions
    .filter((collision) => collision.role === 'solid-building' || collision.role === 'enterable-wall')
    .map((collision) => Object.freeze({
      minX: collision.center.x - collision.size.x / 2,
      maxX: collision.center.x + collision.size.x / 2,
      minZ: collision.center.z - collision.size.z / 2,
      maxZ: collision.center.z + collision.size.z / 2,
      maxY: collision.center.y + collision.size.y / 2,
    }));
  const ramps: RampSurface[] = map.slopes.map((slope) => {
    const high = worldPosition(map.source, slope.highCell);
    const low = worldPosition(map.source, slope.lowCell);
    const cross = Math.min(map.source.cellSize * 0.76, 5.6);
    const boundaryX = (high.x + low.x) / 2;
    const boundaryZ = (high.z + low.z) / 2;
    if (slope.direction === 'north') {
      return Object.freeze({ minX: high.x - cross / 2, maxX: high.x + cross / 2, minZ: boundaryZ - slope.run, maxZ: boundaryZ, lowY: 0, rise: slope.height, risesAlong: 'z', risesTowardPositive: true });
    }
    if (slope.direction === 'south') {
      return Object.freeze({ minX: high.x - cross / 2, maxX: high.x + cross / 2, minZ: boundaryZ, maxZ: boundaryZ + slope.run, lowY: 0, rise: slope.height, risesAlong: 'z', risesTowardPositive: false });
    }
    if (slope.direction === 'east') {
      return Object.freeze({ minX: boundaryX, maxX: boundaryX + slope.run, minZ: high.z - cross / 2, maxZ: high.z + cross / 2, lowY: 0, rise: slope.height, risesAlong: 'x', risesTowardPositive: false });
    }
    return Object.freeze({ minX: boundaryX - slope.run, maxX: boundaryX, minZ: high.z - cross / 2, maxZ: high.z + cross / 2, lowY: 0, rise: slope.height, risesAlong: 'x', risesTowardPositive: true });
  });
  return new MovementWorld({
    halfExtent: Math.max(map.source.width, map.source.height) * map.source.cellSize / 2,
    obstacles: Object.freeze(obstacles),
    ramps: Object.freeze(ramps),
  });
}

function idleIntent(): BotIntent {
  return Object.freeze({ behavior: 'advance', destination: null, targetId: null, shouldFire: false, aimPoint: null });
}

function assertCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 512) throw new RangeError(`${label} must be an integer from 0 to 512`);
}

function assertSeed(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) throw new RangeError('Bot simulation seed must be an unsigned 32-bit integer');
}

function seedFromString(value: string): number {
  let hash = 0x811c9dc5;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  return hash;
}
