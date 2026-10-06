export const ROUND_COUNTDOWN_SECONDS = 20;
const COMPLETION_EPSILON_SECONDS = 1e-9;

/** Fixed-step countdown that advances only while its owning match is updating. */
export class RoundCountdown {
  private remaining: number;
  private completeState = false;

  constructor(durationSeconds = ROUND_COUNTDOWN_SECONDS) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new RangeError('Round countdown duration must be a finite positive number');
    }
    this.remaining = durationSeconds;
  }

  get secondsRemaining(): number {
    return this.remaining;
  }

  get isComplete(): boolean {
    return this.completeState;
  }

  /** Returns true only on the update that reaches zero. */
  update(deltaSeconds: number): boolean {
    if (this.completeState || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return false;
    this.remaining = Math.max(0, this.remaining - deltaSeconds);
    if (this.remaining > COMPLETION_EPSILON_SECONDS) return false;
    this.completeState = true;
    return true;
  }
}
