import type { BotSide } from '../bots/bot-simulation';

export type CaptureControl = BotSide | 'contested' | 'neutral';
export type CapturePointSnapshot = Readonly<{
  control: CaptureControl;
  friendlyProgress: number;
  enemyProgress: number;
  durationSeconds: number;
  winner: BotSide | null;
}>;

const COMPLETION_EPSILON_SECONDS = 1e-9;

/** Persistent two-team capture progress; neutral and contested time does not change it. */
export class CapturePoint {
  private controlState: CaptureControl = 'neutral';
  private friendlyElapsed = 0;
  private enemyElapsed = 0;
  private winnerState: BotSide | null = null;

  constructor(readonly durationSeconds = 30) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new RangeError('Capture duration must be a finite positive number');
    }
  }

  get snapshot(): CapturePointSnapshot {
    return Object.freeze({
      control: this.controlState,
      friendlyProgress: Math.min(1, this.friendlyElapsed / this.durationSeconds),
      enemyProgress: Math.min(1, this.enemyElapsed / this.durationSeconds),
      durationSeconds: this.durationSeconds,
      winner: this.winnerState,
    });
  }

  update(deltaSeconds: number, friendlyPresent: boolean, enemyPresent: boolean): BotSide | null {
    if (this.winnerState || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return this.winnerState;
    this.controlState = friendlyPresent && enemyPresent
      ? 'contested'
      : friendlyPresent
        ? 'friendly'
        : enemyPresent
          ? 'enemy'
          : 'neutral';

    if (this.controlState === 'friendly') this.friendlyElapsed = Math.min(this.durationSeconds, this.friendlyElapsed + deltaSeconds);
    if (this.controlState === 'enemy') this.enemyElapsed = Math.min(this.durationSeconds, this.enemyElapsed + deltaSeconds);
    if (this.friendlyElapsed >= this.durationSeconds - COMPLETION_EPSILON_SECONDS) this.winnerState = 'friendly';
    if (this.enemyElapsed >= this.durationSeconds - COMPLETION_EPSILON_SECONDS) this.winnerState = 'enemy';
    return this.winnerState;
  }
}
