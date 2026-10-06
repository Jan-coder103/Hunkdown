import { describe, expect, it } from 'vitest';
import { FixedStepSimulation } from '../src/engine/fixed-step-simulation';

describe('FixedStepSimulation', () => {
  it('accumulates partial frames and exposes interpolation alpha', () => {
    const simulation = new FixedStepSimulation(0.1, 0.5, 4);
    const steps: number[] = [];

    expect(simulation.advance(0.05, (step) => steps.push(step))).toEqual({
      steps: 0,
      interpolationAlpha: 0.5,
      droppedSeconds: 0,
    });
    expect(simulation.advance(0.05, (step) => steps.push(step))).toEqual({
      steps: 1,
      interpolationAlpha: 0,
      droppedSeconds: 0,
    });
    expect(steps).toEqual([0.1]);
  });

  it('caps long frames and bounds catch-up work while reporting discarded time', () => {
    const simulation = new FixedStepSimulation(0.1, 1, 2);
    let updates = 0;
    const result = simulation.advance(0.55, () => { updates += 1; });

    expect(updates).toBe(2);
    expect(result.steps).toBe(2);
    expect(result.interpolationAlpha).toBeCloseTo(0.5);
    expect(result.droppedSeconds).toBeCloseTo(0.3);

    const capped = new FixedStepSimulation(0.1, 0.2, 8).advance(0.7, () => undefined);
    expect(capped.steps).toBe(2);
    expect(capped.droppedSeconds).toBeCloseTo(0.5);
  });

  it('discards fractional time on reset and sanitizes invalid deltas', () => {
    const simulation = new FixedStepSimulation(0.1, 0.5, 4);
    simulation.advance(0.05, () => undefined);
    simulation.reset();

    expect(simulation.advance(Number.NaN, () => undefined)).toEqual({
      steps: 0,
      interpolationAlpha: 0,
      droppedSeconds: 0,
    });
    expect(simulation.advance(-1, () => undefined).steps).toBe(0);
  });

  it('rejects invalid fixed-step configuration', () => {
    expect(() => new FixedStepSimulation(0)).toThrow(RangeError);
    expect(() => new FixedStepSimulation(0.1, 0)).toThrow(RangeError);
    expect(() => new FixedStepSimulation(0.1, 0.2, 0)).toThrow(RangeError);
  });
});
