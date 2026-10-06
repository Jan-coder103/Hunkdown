import { describe, expect, it } from 'vitest';
import { PROJECT } from '../src/game/project';

describe('project configuration', () => {
  it('exposes a stable identity and a minimum 100-bot target', () => {
    expect(PROJECT.name).toBe('Operation Honkdown');
    expect(Number.isInteger(PROJECT.targetBotCount)).toBe(true);
    expect(PROJECT.targetBotCount).toBeGreaterThanOrEqual(100);
    expect(Object.isFrozen(PROJECT)).toBe(true);
  });
});
