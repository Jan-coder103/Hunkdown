import { FrameDiagnostics, type FrameDiagnosticsSnapshot } from './frame-diagnostics';
import { FixedStepSimulation } from './fixed-step-simulation';
import { KeyboardInput, type KeyboardInputTargets } from './keyboard-input';
import { createSeededRandom, type RandomSource } from './seeded-random';
import { GameStateMachine, type GameState } from '../game/game-state';

export interface EngineView {
  render(interpolationAlpha: number): void;
  dispose(): void;
}

export interface FrameScheduler {
  request(callback: (timestampMs: number) => void): number;
  cancel(handle: number): void;
}

export type EngineRuntimeOptions = Readonly<{
  createView: () => EngineView;
  updateSimulation?: (stepSeconds: number, random: RandomSource) => void;
  frameScheduler?: FrameScheduler;
  inputTargets?: KeyboardInputTargets;
  now?: () => number;
  seed?: number;
  onStateChange?: (state: GameState) => void;
  onDiagnostics?: (snapshot: FrameDiagnosticsSnapshot) => void;
}>;

const browserFrameScheduler: FrameScheduler = {
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (handle) => window.cancelAnimationFrame(handle),
};

/** Coordinates the fixed-step world update, render loop, input, state, and diagnostics. */
export class EngineRuntime {
  private readonly stateMachine = new GameStateMachine();
  private readonly simulation = new FixedStepSimulation();
  private readonly diagnostics = new FrameDiagnostics();
  private readonly input: KeyboardInput;
  private readonly scheduler: FrameScheduler;
  private readonly now: () => number;
  private readonly random: RandomSource;
  private readonly updateSimulation: (stepSeconds: number, random: RandomSource) => void;
  private view: EngineView | null = null;
  private scheduledFrame: number | null = null;
  private lastFrameTimestamp: number | null = null;

  constructor(private readonly options: EngineRuntimeOptions) {
    this.input = new KeyboardInput(options.inputTargets);
    this.scheduler = options.frameScheduler ?? browserFrameScheduler;
    this.now = options.now ?? (() => performance.now());
    this.random = createSeededRandom(options.seed ?? 0x484f4e4b);
    this.updateSimulation = options.updateSimulation ?? (() => undefined);
  }

  get state(): GameState {
    return this.stateMachine.state;
  }

  get diagnosticsSnapshot(): FrameDiagnosticsSnapshot {
    return this.diagnostics.snapshot();
  }

  start(): boolean {
    if (this.state !== 'created') return false;

    try {
      this.view = this.options.createView();
      this.input.attach();
      this.stateMachine.start();
    } catch (error) {
      this.input.dispose();
      this.view?.dispose();
      this.view = null;
      this.stateMachine.dispose();
      this.options.onStateChange?.(this.state);
      throw error;
    }

    this.options.onStateChange?.(this.state);
    this.scheduleNextFrame();
    return true;
  }

  pause(): boolean {
    if (!this.stateMachine.pause()) return false;
    this.simulation.reset();
    this.input.clear();
    this.lastFrameTimestamp = null;
    this.options.onStateChange?.(this.state);
    return true;
  }

  resume(): boolean {
    if (!this.stateMachine.resume()) return false;
    this.simulation.reset();
    this.input.clear();
    this.lastFrameTimestamp = null;
    this.options.onStateChange?.(this.state);
    return true;
  }

  dispose(): void {
    if (!this.stateMachine.dispose()) return;
    if (this.scheduledFrame !== null) {
      this.scheduler.cancel(this.scheduledFrame);
      this.scheduledFrame = null;
    }
    this.lastFrameTimestamp = null;
    this.input.dispose();
    const view = this.view;
    this.view = null;
    view?.dispose();
    this.options.onStateChange?.(this.state);
  }

  private scheduleNextFrame(): void {
    if (this.state === 'disposed' || this.scheduledFrame !== null) return;
    this.scheduledFrame = this.scheduler.request((timestampMs) => {
      this.scheduledFrame = null;
      this.frame(timestampMs);
    });
  }

  private frame(timestampMs: number): void {
    if (this.state === 'disposed') return;
    const frameStartedAt = this.now();
    const frameTimeMs = this.lastFrameTimestamp === null
      ? 0
      : Math.max(0, timestampMs - this.lastFrameTimestamp);
    let elapsedSeconds = frameTimeMs / 1000;
    this.lastFrameTimestamp = timestampMs;

    let changedState = false;
    if (this.input.wasPressed('Escape')) {
      changedState = this.state === 'running' ? this.pause() : this.state === 'paused' ? this.resume() : false;
    }
    this.input.endFrame();
    if (changedState) {
      elapsedSeconds = 0;
      this.lastFrameTimestamp = timestampMs;
    }

    let fixedStepResult = { steps: 0, interpolationAlpha: 0, droppedSeconds: 0 };
    let simulationTimeMs = 0;
    if (this.state === 'running') {
      fixedStepResult = this.simulation.advance(elapsedSeconds, (stepSeconds) => {
        const simulationStartedAt = this.now();
        this.updateSimulation(stepSeconds, this.random);
        simulationTimeMs += Math.max(0, this.now() - simulationStartedAt);
      });
    } else {
      this.simulation.reset();
    }

    this.view?.render(this.state === 'running' ? fixedStepResult.interpolationAlpha : 0);
    const frameWorkMs = Math.max(0, this.now() - frameStartedAt);
    const snapshot = this.diagnostics.record(
      frameTimeMs,
      frameWorkMs,
      simulationTimeMs,
      fixedStepResult.steps,
      fixedStepResult.droppedSeconds,
    );
    this.options.onDiagnostics?.(snapshot);
    this.scheduleNextFrame();
  }
}
