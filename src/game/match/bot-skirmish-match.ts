import type { GeneratedMap } from '../world/map-generator';
import { BotSkirmishSimulation, createBotSkirmish, type BotRosterOptions, type BotSimulationOptions, type BotSimulationStep } from '../bots/bot-simulation';
import { RoundCountdown, ROUND_COUNTDOWN_SECONDS } from './round-countdown';

const EMPTY_STEP: BotSimulationStep = Object.freeze({ shots: Object.freeze([]), killedIds: Object.freeze([]) });

export type BotSkirmishMatchState = 'countdown' | 'active';

/** Coordinates the specified round start countdown with the data-only skirmish simulation. */
export class BotSkirmishMatch {
  readonly simulation: BotSkirmishSimulation;
  readonly countdown: RoundCountdown;
  private state: BotSkirmishMatchState = 'countdown';

  constructor(
    map: GeneratedMap,
    rosterOptions: BotRosterOptions,
    simulationOptions: BotSimulationOptions = {},
    countdownSeconds = ROUND_COUNTDOWN_SECONDS,
  ) {
    this.simulation = createBotSkirmish(map, rosterOptions, simulationOptions);
    this.countdown = new RoundCountdown(countdownSeconds);
  }

  get matchState(): BotSkirmishMatchState {
    return this.state;
  }

  step(deltaSeconds: number): BotSimulationStep {
    if (this.state === 'countdown') {
      this.countdown.update(deltaSeconds);
      if (!this.countdown.isComplete) return EMPTY_STEP;
      this.state = 'active';
    }
    return this.simulation.step(deltaSeconds);
  }
}
