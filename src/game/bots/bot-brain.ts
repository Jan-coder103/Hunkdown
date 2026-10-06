import { createSeededRandom, type RandomSource } from '../../engine/seeded-random';
import type { GridPoint } from '../world/map-types';
import { areOpponents, Combatant } from '../combat/combatant';
import { BotNavigation } from './navigation';

export const BOT_RULES = Object.freeze({
  sightRange: 34,
  nearbyGroupRange: 14,
  engageRange: 27,
  keepDistance: 6,
  lowHealthFraction: 0.4,
});

export type BotBehavior = 'advance' | 'engage' | 'seek-cover' | 'retreat';

export type BotIntent = Readonly<{
  behavior: BotBehavior;
  destination: GridPoint | null;
  targetId: string | null;
  shouldFire: boolean;
  /** Deliberately noisy aim point; the weapon system still owns hit registration. */
  aimPoint: Readonly<{ x: number; y: number; z: number }> | null;
}>;

/** Produces one fixed-step tactical decision for a bot; movement and firing stay in their systems. */
export class BotBrain {
  private readonly random: RandomSource;
  private routeGoal: GridPoint | null = null;
  private routeWaypoint: GridPoint | null = null;

  constructor(readonly navigation: BotNavigation, seed: number) {
    this.random = createSeededRandom(seed >>> 0);
  }

  decide(
    bot: Combatant,
    combatants: readonly Combatant[],
    objective: GridPoint,
    canSee: (observer: Combatant, target: Combatant) => boolean,
  ): BotIntent {
    if (bot.status !== 'alive') return idleIntent();
    if (!this.navigation.hasCell(objective)) throw new Error('Bot objective must be a navigable map cell');

    const visibleEnemies = combatants
      .filter((other) => other.id !== bot.id && other.status === 'alive' && areOpponents(bot.team, other.team))
      .map((other) => ({ other, distance: bot.position.distanceTo(other.position) }))
      .filter(({ other, distance }) => distance <= BOT_RULES.sightRange && canSee(bot, other))
      .sort((a, b) => a.distance - b.distance || a.other.id.localeCompare(b.other.id));
    const target = visibleEnemies[0] ?? null;
    const nearbyEnemies = visibleEnemies.filter(({ distance }) => distance <= BOT_RULES.nearbyGroupRange).length;
    const nearbyAllies = combatants.filter((other) =>
      other.id !== bot.id
      && other.status === 'alive'
      && other.team !== 'neutral'
      && !areOpponents(bot.team, other.team)
      && bot.position.distanceTo(other.position) <= BOT_RULES.nearbyGroupRange,
    ).length + 1;
    const occupiedCells = combatants
      .filter((other) => other.id !== bot.id && other.status === 'alive' && other.team !== 'neutral' && !areOpponents(bot.team, other.team))
      .map((other) => this.navigation.nearestCell(other.position))
      .filter((cell): cell is GridPoint => cell !== null);
    const needsCover = target !== null
      && (bot.health / bot.maxHealth <= BOT_RULES.lowHealthFraction || nearbyEnemies > nearbyAllies);

    if (needsCover && target) {
      const threatPosition = { x: target.other.position.x, z: target.other.position.z };
      const routeSeed = seedFromId(bot.id);
      const cover = this.navigation.findCover(bot.position, threatPosition, routeSeed);
      if (cover) {
        const reachedCover = this.navigation.isAtCell(bot.position, cover);
        const destination = reachedCover
          ? null
          : this.nextAlongRoute(bot.position, cover, routeSeed, occupiedCells);
        if (reachedCover) this.clearRoute();
        return Object.freeze({
          behavior: 'seek-cover',
          destination,
          targetId: target.other.id,
          shouldFire: false,
          aimPoint: null,
        });
      }
      this.clearRoute();
      const retreat = this.chooseRetreat(bot, visibleEnemies.map(({ other }) => other));
      return Object.freeze({
        behavior: 'retreat',
        destination: retreat,
        targetId: target.other.id,
        shouldFire: false,
        aimPoint: null,
      });
    }

    if (!target) {
      return Object.freeze({
        behavior: 'advance',
        destination: this.nextAlongRoute(bot.position, objective, seedFromId(bot.id), occupiedCells),
        targetId: null,
        shouldFire: false,
        aimPoint: null,
      });
    }

    let destination: GridPoint | null = null;
    if (target.distance < BOT_RULES.keepDistance) {
      this.clearRoute();
      destination = this.chooseRetreat(bot, [target.other]);
    } else if (target.distance > BOT_RULES.engageRange) {
      destination = this.nextAlongRoute(
        bot.position,
        this.navigation.nearestCell(target.other.position) ?? objective,
        seedFromId(bot.id),
        occupiedCells,
      );
    } else {
      this.clearRoute();
    }
    return Object.freeze({
      behavior: 'engage',
      destination,
      targetId: target.other.id,
      shouldFire: target.distance <= BOT_RULES.engageRange,
      aimPoint: noisyAimPoint(bot, target.other, this.random),
    });
  }

  private chooseRetreat(bot: Combatant, threats: readonly Combatant[]): GridPoint | null {
    const current = this.navigation.nearestCell(bot.position);
    if (!current) return null;
    const currentWorld = this.navigation.worldPosition(current);
    if (!currentWorld) return null;
    const currentThreatDistance = nearestThreatDistance(currentWorld, threats);
    let best: GridPoint | null = null;
    let bestScore = currentThreatDistance;
    for (const candidate of this.navigation.neighborCells(current)) {
      const world = this.navigation.worldPosition(candidate);
      if (!world) continue;
      const distance = nearestThreatDistance(world, threats);
      const score = distance - this.navigation.map.source.cellSize * 0.12;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  private nextAlongRoute(
    position: Readonly<{ x: number; z: number }>,
    goal: GridPoint,
    routeSeed: number,
    occupiedCells: readonly GridPoint[],
  ): GridPoint | null {
    if (this.routeWaypoint && samePoint(this.routeGoal, goal) && !this.navigation.isAtCell(position, this.routeWaypoint)) {
      return this.routeWaypoint;
    }
    this.routeGoal = goal;
    this.routeWaypoint = this.navigation.nextWaypoint(position, goal, routeSeed, occupiedCells);
    return this.routeWaypoint;
  }

  private clearRoute(): void {
    this.routeGoal = null;
    this.routeWaypoint = null;
  }
}

function noisyAimPoint(observer: Combatant, target: Combatant, random: RandomSource): Readonly<{ x: number; y: number; z: number }> {
  const distance = Math.max(1, observer.position.distanceTo(target.position));
  const horizontalError = distance * 0.018;
  const verticalError = distance * 0.009;
  return Object.freeze({
    x: target.position.x + (random() * 2 - 1) * horizontalError,
    y: target.position.y + target.height * 0.56 + (random() * 2 - 1) * verticalError,
    z: target.position.z + (random() * 2 - 1) * horizontalError,
  });
}

function seedFromId(id: string): number {
  let hash = 0x811c9dc5;
  for (const character of id) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  return hash;
}

function samePoint(a: GridPoint | null, b: GridPoint): boolean {
  return a?.x === b.x && a.y === b.y;
}

function nearestThreatDistance(position: Readonly<{ x: number; z: number }>, threats: readonly Combatant[]): number {
  if (threats.length === 0) return 0;
  return Math.min(...threats.map((threat) => Math.hypot(position.x - threat.position.x, position.z - threat.position.z)));
}

function idleIntent(): BotIntent {
  return Object.freeze({ behavior: 'advance', destination: null, targetId: null, shouldFire: false, aimPoint: null });
}
