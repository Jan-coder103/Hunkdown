export type FixedStepResult = Readonly<{
  steps: number;
  interpolationAlpha: number;
  droppedSeconds: number;
}>;

const FLOAT_EPSILON = 1e-10;

/** Accumulates wall time and advances simulation only in bounded fixed-size steps. */
export class FixedStepSimulation {
  private accumulatorSeconds = 0;

  constructor(
    readonly stepSeconds = 1 / 60,
    readonly maxFrameSeconds = 0.25,
    readonly maxStepsPerFrame = 8,
  ) {
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
      throw new RangeError('stepSeconds must be a finite positive number');
    }
    if (!Number.isFinite(maxFrameSeconds) || maxFrameSeconds <= 0) {
      throw new RangeError('maxFrameSeconds must be a finite positive number');
    }
    if (!Number.isInteger(maxStepsPerFrame) || maxStepsPerFrame < 1) {
      throw new RangeError('maxStepsPerFrame must be a positive integer');
    }
  }

  advance(elapsedSeconds: number, update: (stepSeconds: number) => void): FixedStepResult {
    const requestedSeconds = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
    const acceptedSeconds = Math.min(requestedSeconds, this.maxFrameSeconds);
    let droppedSeconds = requestedSeconds - acceptedSeconds;
    this.accumulatorSeconds += acceptedSeconds;

    let steps = 0;
    while (
      this.accumulatorSeconds + FLOAT_EPSILON >= this.stepSeconds &&
      steps < this.maxStepsPerFrame
    ) {
      update(this.stepSeconds);
      this.accumulatorSeconds = Math.max(0, this.accumulatorSeconds - this.stepSeconds);
      steps += 1;
    }

    if (this.accumulatorSeconds + FLOAT_EPSILON >= this.stepSeconds) {
      const discardedSteps = Math.floor((this.accumulatorSeconds + FLOAT_EPSILON) / this.stepSeconds);
      this.accumulatorSeconds = Math.max(0, this.accumulatorSeconds - discardedSteps * this.stepSeconds);
      droppedSeconds += discardedSteps * this.stepSeconds;
    }

    return {
      steps,
      interpolationAlpha: Math.min(1, this.accumulatorSeconds / this.stepSeconds),
      droppedSeconds,
    };
  }

  reset(): void {
    this.accumulatorSeconds = 0;
  }
}
