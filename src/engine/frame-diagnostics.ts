export type FrameDiagnosticsSnapshot = Readonly<{
  frameCount: number;
  frameTimeMs: number;
  frameWorkMs: number;
  simulationTimeMs: number;
  framesPerSecond: number;
  fixedSteps: number;
  totalFixedSteps: number;
  totalDroppedSimulationMs: number;
}>;

/** Collects lightweight timing and fixed-step counters for the engine HUD. */
export class FrameDiagnostics {
  private frameCount = 0;
  private frameTimeMs = 0;
  private frameWorkMs = 0;
  private simulationTimeMs = 0;
  private fixedSteps = 0;
  private totalFixedSteps = 0;
  private totalDroppedSimulationMs = 0;

  record(
    frameTimeMs: number,
    frameWorkMs: number,
    simulationTimeMs: number,
    fixedSteps: number,
    droppedSimulationSeconds: number,
  ): FrameDiagnosticsSnapshot {
    this.frameCount += 1;
    this.frameTimeMs = Math.max(0, frameTimeMs);
    this.frameWorkMs = Math.max(0, frameWorkMs);
    this.simulationTimeMs = Math.max(0, simulationTimeMs);
    this.fixedSteps = Math.max(0, Math.floor(fixedSteps));
    this.totalFixedSteps += this.fixedSteps;
    this.totalDroppedSimulationMs += Math.max(0, droppedSimulationSeconds) * 1000;
    return this.snapshot();
  }

  snapshot(): FrameDiagnosticsSnapshot {
    return {
      frameCount: this.frameCount,
      frameTimeMs: this.frameTimeMs,
      frameWorkMs: this.frameWorkMs,
      simulationTimeMs: this.simulationTimeMs,
      framesPerSecond: this.frameTimeMs > 0 ? 1000 / this.frameTimeMs : 0,
      fixedSteps: this.fixedSteps,
      totalFixedSteps: this.totalFixedSteps,
      totalDroppedSimulationMs: this.totalDroppedSimulationMs,
    };
  }
}
