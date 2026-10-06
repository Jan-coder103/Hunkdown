import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '../src/engine/keyboard-input';
import { FakeEventTarget, FakeVisibilityTarget, makeKeyEvent } from './helpers/engine-fixtures';

describe('KeyboardInput', () => {
  it('tracks held keys and exposes a press for one frame only', () => {
    const windowTarget = new FakeEventTarget();
    const documentTarget = new FakeVisibilityTarget();
    const input = new KeyboardInput({ windowTarget, documentTarget });
    input.attach();

    windowTarget.dispatchEvent(makeKeyEvent('keydown', 'KeyW'));
    expect(input.isDown('KeyW')).toBe(true);
    expect(input.wasPressed('KeyW')).toBe(true);

    input.endFrame();
    expect(input.wasPressed('KeyW')).toBe(false);
    expect(input.isDown('KeyW')).toBe(true);

    windowTarget.dispatchEvent(makeKeyEvent('keyup', 'KeyW'));
    expect(input.isDown('KeyW')).toBe(false);
    input.dispose();
  });

  it('ignores key repeat and clears held input on blur or hidden document', () => {
    const windowTarget = new FakeEventTarget();
    const documentTarget = new FakeVisibilityTarget();
    const input = new KeyboardInput({ windowTarget, documentTarget });
    input.attach();

    windowTarget.dispatchEvent(makeKeyEvent('keydown', 'KeyW', true));
    expect(input.isDown('KeyW')).toBe(false);
    windowTarget.dispatchEvent(makeKeyEvent('keydown', 'KeyW'));
    windowTarget.dispatchEvent(new Event('blur'));
    expect(input.isDown('KeyW')).toBe(false);
    expect(input.wasPressed('KeyW')).toBe(false);

    windowTarget.dispatchEvent(makeKeyEvent('keydown', 'KeyA'));
    documentTarget.setHidden(true);
    expect(input.isDown('KeyA')).toBe(false);
    input.dispose();
  });

  it('removes every registered listener during disposal', () => {
    const windowTarget = new FakeEventTarget();
    const documentTarget = new FakeVisibilityTarget();
    const input = new KeyboardInput({ windowTarget, documentTarget });
    input.attach();
    input.attach();

    expect(windowTarget.listenerCount('keydown')).toBe(1);
    expect(windowTarget.listenerCount('keyup')).toBe(1);
    expect(windowTarget.listenerCount('blur')).toBe(1);
    expect(documentTarget.listenerCount('visibilitychange')).toBe(1);

    input.dispose();
    expect(windowTarget.listenerCount('keydown')).toBe(0);
    expect(windowTarget.listenerCount('keyup')).toBe(0);
    expect(windowTarget.listenerCount('blur')).toBe(0);
    expect(documentTarget.listenerCount('visibilitychange')).toBe(0);
  });
});
