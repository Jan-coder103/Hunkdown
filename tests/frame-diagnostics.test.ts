import { describe, expect, it } from 'vitest';
import { FrameDiagnostics } from '../src/engine/frame-diagnostics';

describe('FrameDiagnostics', () => {
  it('records frame and simulation timings plus cumulative step/drop totals', () => {
    const diagnostics = new FrameDiagnostics();
    diagnostics.record(16, 3, 2.5, 1, 0.01);
    const snapshot = diagnostics.record(20, 5, 4, 2, 0.005);

    expect(snapshot).toEqual({
      frameCount: 2,
      frameTimeMs: 20,
      frameWorkMs: 5,
      simulationTimeMs: 4,
      framesPerSecond: 50,
      fixedSteps: 2,
      totalFixedSteps: 3,
      totalDroppedSimulationMs: 15,
    });
  });
});
