import { describe, expect, it } from 'vitest';
import { RoundCountdown, ROUND_COUNTDOWN_SECONDS } from '../src/game/match/round-countdown';

describe('round countdown', () => {
  it('counts down for the specified 20 seconds and completes once', () => {
    const countdown = new RoundCountdown();
    expect(countdown.secondsRemaining).toBe(ROUND_COUNTDOWN_SECONDS);
    expect(countdown.update(12.5)).toBe(false);
    expect(countdown.secondsRemaining).toBeCloseTo(7.5);
    expect(countdown.update(7.4)).toBe(false);
    expect(countdown.update(0.1)).toBe(true);
    expect(countdown.isComplete).toBe(true);
    expect(countdown.secondsRemaining).toBe(0);
    expect(countdown.update(1)).toBe(false);

    const fixedSteps = new RoundCountdown();
    for (let step = 0; step < 1200; step += 1) fixedSteps.update(1 / 60);
    expect(fixedSteps.isComplete).toBe(true);
    expect(fixedSteps.secondsRemaining).toBe(0);
  });

  it('ignores invalid and zero elapsed time and rejects invalid durations', () => {
    const countdown = new RoundCountdown(2);
    expect(countdown.update(0)).toBe(false);
    expect(countdown.update(-1)).toBe(false);
    expect(countdown.update(Number.NaN)).toBe(false);
    expect(countdown.secondsRemaining).toBe(2);
    expect(() => new RoundCountdown(0)).toThrow(RangeError);
    expect(() => new RoundCountdown(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
