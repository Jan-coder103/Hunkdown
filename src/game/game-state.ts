export type GameState = 'created' | 'running' | 'paused' | 'disposed';

/** Small state machine for the engine lifecycle. Invalid repeated actions are harmless. */
export class GameStateMachine {
  private currentState: GameState = 'created';

  get state(): GameState {
    return this.currentState;
  }

  start(): boolean {
    if (this.currentState !== 'created') return false;
    this.currentState = 'running';
    return true;
  }

  pause(): boolean {
    if (this.currentState !== 'running') return false;
    this.currentState = 'paused';
    return true;
  }

  resume(): boolean {
    if (this.currentState !== 'paused') return false;
    this.currentState = 'running';
    return true;
  }

  dispose(): boolean {
    if (this.currentState === 'disposed') return false;
    this.currentState = 'disposed';
    return true;
  }
}
