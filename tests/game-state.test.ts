import { describe, expect, it } from 'vitest';
import { GameStateMachine } from '../src/game/game-state';

describe('GameStateMachine', () => {
  it('allows the lifecycle from created through running and pause to disposal', () => {
    const states = new GameStateMachine();
    expect(states.state).toBe('created');
    expect(states.start()).toBe(true);
    expect(states.pause()).toBe(true);
    expect(states.resume()).toBe(true);
    expect(states.dispose()).toBe(true);
    expect(states.state).toBe('disposed');
  });

  it('ignores transitions that are invalid for the current state', () => {
    const states = new GameStateMachine();
    expect(states.pause()).toBe(false);
    expect(states.resume()).toBe(false);
    expect(states.start()).toBe(true);
    expect(states.start()).toBe(false);
    expect(states.dispose()).toBe(true);
    expect(states.resume()).toBe(false);
    expect(states.dispose()).toBe(false);
  });
});
