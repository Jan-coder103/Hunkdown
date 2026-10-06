import type { GeneratedMap } from '../world/map-generator';
import { BotSkirmishSimulation, createBotSkirmish, type BotRosterOptions, type BotSide, type BotSimulationOptions, type BotSimulationStep } from '../bots/bot-simulation';
import { CapturePoint, type CapturePointSnapshot } from './capture-point';
import { RoundCountdown, ROUND_COUNTDOWN_SECONDS } from './round-countdown';
import type { HitscanResult } from '../combat/hitscan';
import type { GrenadeExplosion } from '../combat/grenades';

const EMPTY_STEP: BotSimulationStep = Object.freeze({ shots: Object.freeze([]), killedIds: Object.freeze([]), destroyedObstacleIds: Object.freeze([]) });
const TIMER_EPSILON_SECONDS = 1e-9;

export type BotSkirmishMatchState = 'countdown' | 'active' | 'complete';
export type MatchOutcome = Readonly<{ winner: BotSide | 'draw'; reason: 'capture' | 'tickets' }>;
export type MatchTickets = Readonly<{ friendly: number; enemy: number }>;
export type BotCorpseSnapshot = Readonly<{
  id: string;
  botId: string;
  team: BotSide;
  position: Readonly<{ x: number; y: number; z: number }>;
  deathImpulse: Readonly<{ x: number; y: number; z: number }>;
  secondsRemaining: number;
}>;

export type BotCorpsePresentation = Readonly<{
  id: string;
  botId: string;
  team: BotSide;
  position: Readonly<{ x: number; y: number; z: number }>;
  deathImpulse: Readonly<{ x: number; y: number; z: number }>;
}>;
export type BotLifeSnapshot = Readonly<{
  botId: string;
  team: BotSide;
  respawnSecondsRemaining: number;
  reviveProgress: number | null;
}>;
export type CombatantScore = Readonly<{
  id: string;
  team: BotSide;
  damage: number;
  kills: number;
  healing: number;
  deaths: number;
  revives: number;
}>;
type MutableCombatantScore = { damage: number; kills: number; healing: number; deaths: number; revives: number };

export type BotSkirmishMatchRules = Readonly<{
  captureDurationSeconds: number;
  captureRadius?: number;
  respawnDelaySeconds: number;
  corpseLifetimeSeconds: number;
  initialTickets: number;
  reviveDurationSeconds: number;
  reviveHealthFraction: number;
}>;

type ResolvedBotSkirmishMatchRules = Omit<BotSkirmishMatchRules, 'captureRadius'> & { captureRadius: number };

export const DEFAULT_BOT_SKIRMISH_RULES: BotSkirmishMatchRules = Object.freeze({
  captureDurationSeconds: 30,
  respawnDelaySeconds: 20,
  corpseLifetimeSeconds: 30,
  initialTickets: 200,
  reviveDurationSeconds: 4,
  reviveHealthFraction: 0.5,
});

type MutableLife = {
  botId: string;
  team: BotSide;
  corpseId: string;
  respawnRemaining: number;
  reviveRemaining: number | null;
  reviverId: string | null;
};

type MutableCorpse = {
  id: string;
  botId: string;
  team: BotSide;
  position: { x: number; y: number; z: number };
  deathImpulse: { x: number; y: number; z: number };
  remaining: number;
};

/** Coordinates countdown, objective, tickets, and bot death lifecycles for the preview match. */
export class BotSkirmishMatch {
  readonly simulation: BotSkirmishSimulation;
  readonly countdown: RoundCountdown;
  readonly capture: CapturePoint;
  readonly captureRadius: number;
  readonly rules: ResolvedBotSkirmishMatchRules;
  private state: BotSkirmishMatchState = 'countdown';
  private outcomeState: MatchOutcome | null = null;
  private friendlyTickets: number;
  private enemyTickets: number;
  private readonly lives = new Map<string, MutableLife>();
  private readonly corpses = new Map<string, MutableCorpse>();
  private readonly deathCounts = new Map<string, number>();
  private readonly scores = new Map<string, MutableCombatantScore>();

  constructor(
    map: GeneratedMap,
    rosterOptions: BotRosterOptions,
    simulationOptions: BotSimulationOptions = {},
    countdownSeconds = ROUND_COUNTDOWN_SECONDS,
    ruleOverrides: Partial<BotSkirmishMatchRules> = {},
  ) {
    this.simulation = createBotSkirmish(map, rosterOptions, simulationOptions);
    this.countdown = new RoundCountdown(countdownSeconds);
    const merged = { ...DEFAULT_BOT_SKIRMISH_RULES, ...ruleOverrides };
    this.captureRadius = ruleOverrides.captureRadius ?? map.source.cellSize * 0.4;
    this.rules = Object.freeze({ ...merged, captureRadius: this.captureRadius });
    validateRules(this.rules);
    this.capture = new CapturePoint(this.rules.captureDurationSeconds);
    this.friendlyTickets = this.rules.initialTickets;
    this.enemyTickets = this.rules.initialTickets;
    for (const actor of this.simulation.combatants) {
      this.scores.set(actor.id, { damage: 0, kills: 0, healing: 0, deaths: 0, revives: 0 });
    }
  }

  get matchState(): BotSkirmishMatchState {
    return this.state;
  }

  get outcome(): MatchOutcome | null {
    return this.outcomeState;
  }

  get tickets(): MatchTickets {
    return Object.freeze({ friendly: this.friendlyTickets, enemy: this.enemyTickets });
  }

  get captureStatus(): CapturePointSnapshot {
    return this.capture.snapshot;
  }

  get corpseSnapshots(): readonly BotCorpseSnapshot[] {
    return Object.freeze([...this.corpses.values()].map((corpse) => Object.freeze({
      id: corpse.id,
      botId: corpse.botId,
      team: corpse.team,
      position: Object.freeze({ ...corpse.position }),
      deathImpulse: Object.freeze({ ...corpse.deathImpulse }),
      secondsRemaining: corpse.remaining,
    })));
  }

  get lifeSnapshots(): readonly BotLifeSnapshot[] {
    return Object.freeze([...this.lives.values()].map((life) => Object.freeze({
      botId: life.botId,
      team: life.team,
      respawnSecondsRemaining: life.respawnRemaining,
      reviveProgress: life.reviveRemaining === null ? null : 1 - life.reviveRemaining / this.rules.reviveDurationSeconds,
    })));
  }

  getLifeSnapshot(botId: string): BotLifeSnapshot | null {
    const life = this.lives.get(botId);
    if (!life) return null;
    return Object.freeze({
      botId: life.botId,
      team: life.team,
      respawnSecondsRemaining: life.respawnRemaining,
      reviveProgress: life.reviveRemaining === null ? null : 1 - life.reviveRemaining / this.rules.reviveDurationSeconds,
    });
  }

  /** Visits match-owned corpse anchors directly for rendering without materializing a snapshot array. */
  forEachCorpse(visitor: (corpse: BotCorpsePresentation) => void): void {
    for (const corpse of this.corpses.values()) visitor(corpse);
  }

  get scoreSnapshots(): readonly CombatantScore[] {
    return Object.freeze(this.simulation.combatants.map((actor) => {
      const score = this.scores.get(actor.id);
      return Object.freeze({
        id: actor.id,
        team: actor.team as BotSide,
        damage: score?.damage ?? 0,
        kills: score?.kills ?? 0,
        healing: score?.healing ?? 0,
        deaths: score?.deaths ?? 0,
        revives: score?.revives ?? 0,
      });
    }));
  }

  /** Records local-player hits and grenade impacts resolved outside the bot simulation step. */
  recordPlayerCombat(shooterId: string, shots: readonly HitscanResult[], explosions: readonly GrenadeExplosion[] = []): void {
    if (this.state !== 'active' || this.outcomeState) return;
    const shooter = this.simulation.getCombatant(shooterId);
    if (!shooter || shooter.team !== 'friendly') return;
    for (const shot of shots) this.recordHit(shooterId, shot.targetId, shot.damage, shot.killed);
    for (const explosion of explosions) {
      const killed = new Set(explosion.killedIds);
      for (const hit of explosion.damageById) this.recordHit(shooterId, hit.id, hit.amount, killed.has(hit.id));
    }
  }

  /** Starts a same-team revive. The match completes it after four seconds by default. */
  beginRevive(targetId: string, reviverId: string): boolean {
    if (this.state !== 'active' || this.outcomeState) return false;
    const life = this.lives.get(targetId);
    if (!life || life.reviveRemaining !== null || life.respawnRemaining <= 0) return false;
    const target = this.simulation.getCombatant(targetId);
    const reviver = this.simulation.getCombatant(reviverId);
    if (!target || target.status !== 'dead' || !reviver || reviver.status !== 'alive' || reviver.team !== target.team) return false;
    life.reviveRemaining = this.rules.reviveDurationSeconds;
    life.reviverId = reviverId;
    return true;
  }

  cancelRevive(targetId: string): boolean {
    const life = this.lives.get(targetId);
    if (!life || life.reviveRemaining === null) return false;
    life.reviveRemaining = null;
    life.reviverId = null;
    return true;
  }

  step(deltaSeconds: number): BotSimulationStep {
    let activeDelta = deltaSeconds;
    if (this.state === 'countdown') {
      const countdownBefore = this.countdown.secondsRemaining;
      this.countdown.update(deltaSeconds);
      if (!this.countdown.isComplete) return EMPTY_STEP;
      this.state = 'active';
      activeDelta = Math.max(0, deltaSeconds - countdownBefore);
    }
    if (this.state === 'complete' || !Number.isFinite(activeDelta) || activeDelta <= 0) return EMPTY_STEP;

    this.advanceLifecycle(activeDelta);
    if (this.outcomeState) return EMPTY_STEP;

    const result = this.simulation.step(activeDelta);
    for (const shot of result.shots) this.recordHit(shot.shooterId, shot.result.targetId, shot.result.damage, shot.result.killed);
    this.recordDeaths();
    this.advanceCapture(activeDelta);
    if (!this.outcomeState) this.resolveTicketOutcome();
    return result;
  }

  private advanceLifecycle(deltaSeconds: number): void {
    for (const [id, corpse] of this.corpses) {
      corpse.remaining = Math.max(0, corpse.remaining - deltaSeconds);
      if (corpse.remaining <= TIMER_EPSILON_SECONDS) this.corpses.delete(id);
    }

    for (const [actorId, life] of this.lives) {
      const actor = this.simulation.getCombatant(actorId);
      if (!actor || actor.status !== 'dead') {
        this.lives.delete(actorId);
        this.corpses.delete(life.corpseId);
        continue;
      }

      if (life.reviveRemaining !== null) {
        const reviver = life.reviverId ? this.simulation.getCombatant(life.reviverId) : null;
        if (!reviver || reviver.status !== 'alive' || reviver.team !== life.team) {
          life.reviveRemaining = null;
          life.reviverId = null;
        }
      }

      const reviveCompletes = life.reviveRemaining !== null
        && life.reviveRemaining <= deltaSeconds + TIMER_EPSILON_SECONDS
        && life.reviveRemaining <= life.respawnRemaining + TIMER_EPSILON_SECONDS;
      if (reviveCompletes) {
        if (this.simulation.reviveBot(actorId, this.rules.reviveHealthFraction)) {
          const reviverScore = life.reviverId ? this.scores.get(life.reviverId) : null;
          if (reviverScore) {
            reviverScore.healing += actor.maxHealth * this.rules.reviveHealthFraction;
            reviverScore.revives += 1;
          }
          this.lives.delete(actorId);
          this.corpses.delete(life.corpseId);
          continue;
        }
        life.reviveRemaining = null;
        life.reviverId = null;
      }

      if (life.respawnRemaining <= deltaSeconds + TIMER_EPSILON_SECONDS) {
        if (this.simulation.respawnBot(actorId)) {
          if (life.team === 'friendly') this.friendlyTickets -= 1;
          else this.enemyTickets -= 1;
        }
        this.lives.delete(actorId);
        continue;
      }

      life.respawnRemaining = Math.max(0, life.respawnRemaining - deltaSeconds);
      if (life.reviveRemaining !== null) life.reviveRemaining = Math.max(0, life.reviveRemaining - deltaSeconds);
    }
    this.resolveTicketOutcome();
  }

  private recordDeaths(): void {
    // Scan authoritative actors so external player shots are recorded on the same lifecycle path as bot shots.
    for (const actor of this.simulation.combatants) {
      if (actor.status !== 'dead' || this.lives.has(actor.id)) continue;
      const actorId = actor.id;
      const deathNumber = (this.deathCounts.get(actorId) ?? 0) + 1;
      this.deathCounts.set(actorId, deathNumber);
      const score = this.scores.get(actorId);
      if (score) score.deaths += 1;
      const corpseId = `${actorId}-corpse-${deathNumber}`;
      const team = actor.team as BotSide;
      this.lives.set(actorId, {
        botId: actorId,
        team,
        corpseId,
        respawnRemaining: this.rules.respawnDelaySeconds,
        reviveRemaining: null,
        reviverId: null,
      });
      this.corpses.set(corpseId, {
        id: corpseId,
        botId: actorId,
        team,
        position: { x: actor.position.x, y: actor.position.y, z: actor.position.z },
        deathImpulse: { x: actor.velocity.x, y: actor.velocity.y, z: actor.velocity.z },
        remaining: this.rules.corpseLifetimeSeconds,
      });
    }
  }

  private advanceCapture(deltaSeconds: number): void {
    const center = this.simulation.navigation.worldPosition(this.simulation.objective);
    if (!center) return;
    let friendlyPresent = false;
    let enemyPresent = false;
    for (const actor of this.simulation.combatants) {
      if (actor.status !== 'alive') continue;
      if (Math.hypot(actor.position.x - center.x, actor.position.z - center.z) > this.captureRadius) continue;
      if (actor.team === 'friendly') friendlyPresent = true;
      else enemyPresent = true;
    }
    const winner = this.capture.update(deltaSeconds, friendlyPresent, enemyPresent);
    if (winner) this.finish({ winner, reason: 'capture' });
  }

  private resolveTicketOutcome(): void {
    if (this.outcomeState || this.friendlyTickets > 0 && this.enemyTickets > 0) return;
    const winner = this.friendlyTickets === 0 && this.enemyTickets === 0
      ? 'draw'
      : this.friendlyTickets === 0
        ? 'enemy'
        : 'friendly';
    this.finish({ winner, reason: 'tickets' });
  }

  private finish(outcome: MatchOutcome): void {
    if (this.outcomeState) return;
    this.outcomeState = Object.freeze(outcome);
    this.state = 'complete';
  }

  private recordHit(shooterId: string, targetId: string | null, damage: number, killed: boolean): void {
    if (!targetId || !Number.isFinite(damage) || damage <= 0) return;
    const score = this.scores.get(shooterId);
    if (!score) return;
    score.damage += damage;
    if (killed) score.kills += 1;
  }
}

function validateRules(rules: ResolvedBotSkirmishMatchRules): void {
  for (const [label, value] of [
    ['captureDurationSeconds', rules.captureDurationSeconds],
    ['captureRadius', rules.captureRadius],
    ['respawnDelaySeconds', rules.respawnDelaySeconds],
    ['corpseLifetimeSeconds', rules.corpseLifetimeSeconds],
    ['reviveDurationSeconds', rules.reviveDurationSeconds],
  ] as const) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} must be finite and positive`);
  }
  if (!Number.isInteger(rules.initialTickets) || rules.initialTickets < 0) throw new RangeError('initialTickets must be a non-negative integer');
  if (!Number.isFinite(rules.reviveHealthFraction) || rules.reviveHealthFraction <= 0 || rules.reviveHealthFraction > 1) {
    throw new RangeError('reviveHealthFraction must be in (0, 1]');
  }
}
