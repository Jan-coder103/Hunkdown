import { describe, expect, it } from 'vitest';
import { CapturePoint } from '../src/game/match/capture-point';

describe('capture point', () => {
  it('pauses progress while contested or neutral and preserves each side’s earned time', () => {
    const capture = new CapturePoint(4);
    capture.update(1, true, false);
    expect(capture.snapshot.friendlyProgress).toBeCloseTo(0.25);

    capture.update(2, true, true);
    expect(capture.snapshot.control).toBe('contested');
    expect(capture.snapshot.friendlyProgress).toBeCloseTo(0.25);
    expect(capture.snapshot.enemyProgress).toBe(0);

    capture.update(3, false, true);
    expect(capture.snapshot.enemyProgress).toBeCloseTo(0.75);
    capture.update(2, false, false);
    expect(capture.snapshot.control).toBe('neutral');
    expect(capture.snapshot.enemyProgress).toBeCloseTo(0.75);
    expect(capture.snapshot.friendlyProgress).toBeCloseTo(0.25);
  });

  it('finishes only after one team has accumulated the full control duration', () => {
    const capture = new CapturePoint(2);
    expect(capture.update(1.25, true, false)).toBeNull();
    expect(capture.update(5, true, true)).toBeNull();
    expect(capture.update(0.75, true, false)).toBe('friendly');
    expect(capture.snapshot.winner).toBe('friendly');
    expect(capture.update(1, false, true)).toBe('friendly');
  });

  it('rejects invalid capture durations', () => {
    expect(() => new CapturePoint(0)).toThrow(RangeError);
    expect(() => new CapturePoint(Number.NaN)).toThrow(RangeError);
  });
});
