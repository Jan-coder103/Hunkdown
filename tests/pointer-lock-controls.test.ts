import { describe, expect, it } from 'vitest';
import { PointerLockControls, type PointerLockCanvas, type PointerLockDocument } from '../src/game/player/pointer-lock-controls';
import { FakeEventTarget } from './helpers/engine-fixtures';

class FakeCanvas extends FakeEventTarget {
  requestCount = 0;

  requestPointerLock(): void {
    this.requestCount += 1;
  }
}

class FakePointerLockDocument extends FakeEventTarget {
  pointerLockElement: Element | null = null;
  hidden = false;
  exitCount = 0;

  exitPointerLock(): void {
    this.exitCount += 1;
    this.pointerLockElement = null;
    this.dispatchEvent(new Event('pointerlockchange'));
  }
}

function mouseEvent(
  type: string,
  properties: Readonly<{ button?: number; movementX?: number; movementY?: number }> = {},
): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperties(event, {
    button: { value: properties.button ?? 0 },
    movementX: { value: properties.movementX ?? 0 },
    movementY: { value: properties.movementY ?? 0 },
  });
  return event;
}

describe('PointerLockControls', () => {
  it('captures mouse look only while locked and reports right-button aim', () => {
    const canvas = new FakeCanvas();
    const documentTarget = new FakePointerLockDocument();
    const windowTarget = new FakeEventTarget();
    const looks: Array<[number, number, boolean]> = [];
    const control = new PointerLockControls(canvas as unknown as PointerLockCanvas, {
      documentTarget: documentTarget as unknown as PointerLockDocument,
      windowTarget,
      onLook: (x, y, aiming) => looks.push([x, y, aiming]),
    });
    control.attach();

    documentTarget.dispatchEvent(mouseEvent('mousemove', { movementX: 10, movementY: 4 }));
    expect(looks).toEqual([]);
    canvas.dispatchEvent(new Event('click'));
    expect(canvas.requestCount).toBe(1);

    documentTarget.pointerLockElement = canvas as unknown as Element;
    documentTarget.dispatchEvent(new Event('pointerlockchange'));
    expect(control.isLocked).toBe(true);
    documentTarget.dispatchEvent(mouseEvent('mousedown', { button: 2 }));
    expect(control.isAiming).toBe(true);
    documentTarget.dispatchEvent(mouseEvent('mousemove', { movementX: 10, movementY: 4 }));
    expect(looks).toEqual([[10, 4, true]]);

    expect(documentTarget.dispatchEvent(mouseEvent('contextmenu'))).toBe(false);
    documentTarget.dispatchEvent(mouseEvent('mouseup', { button: 2 }));
    expect(control.isAiming).toBe(false);
    control.dispose();
  });

  it('releases pointer lock on focus loss and removes listeners for recovery', () => {
    const canvas = new FakeCanvas();
    const documentTarget = new FakePointerLockDocument();
    const windowTarget = new FakeEventTarget();
    const lockStates: boolean[] = [];
    const control = new PointerLockControls(canvas as unknown as PointerLockCanvas, {
      documentTarget: documentTarget as unknown as PointerLockDocument,
      windowTarget,
      onLook: () => undefined,
      onLockChange: (locked) => lockStates.push(locked),
    });
    control.attach();
    canvas.dispatchEvent(new Event('click'));
    expect(canvas.requestCount).toBe(1);
    documentTarget.pointerLockElement = canvas as unknown as Element;
    documentTarget.dispatchEvent(new Event('pointerlockchange'));
    windowTarget.dispatchEvent(new Event('blur'));

    expect(documentTarget.exitCount).toBe(1);
    expect(control.isLocked).toBe(false);
    expect(lockStates).toEqual([false, true, false]);
    canvas.dispatchEvent(new Event('click'));
    expect(canvas.requestCount).toBe(2);

    control.dispose();
    expect(canvas.listenerCount('click')).toBe(0);
    expect(documentTarget.listenerCount('mousemove')).toBe(0);
    expect(documentTarget.listenerCount('mousedown')).toBe(0);
    expect(documentTarget.listenerCount('pointerlockchange')).toBe(0);
    expect(windowTarget.listenerCount('blur')).toBe(0);
  });

  it('releases mouse aim and pointer lock when the page becomes hidden', () => {
    const canvas = new FakeCanvas();
    const documentTarget = new FakePointerLockDocument();
    const control = new PointerLockControls(canvas as unknown as PointerLockCanvas, {
      documentTarget: documentTarget as unknown as PointerLockDocument,
      windowTarget: new FakeEventTarget(),
      onLook: () => undefined,
    });
    control.attach();
    documentTarget.pointerLockElement = canvas as unknown as Element;
    documentTarget.dispatchEvent(new Event('pointerlockchange'));
    documentTarget.dispatchEvent(mouseEvent('mousedown', { button: 2 }));
    documentTarget.hidden = true;
    documentTarget.dispatchEvent(new Event('visibilitychange'));

    expect(documentTarget.exitCount).toBe(1);
    expect(control.isLocked).toBe(false);
    expect(control.isAiming).toBe(false);
    control.dispose();
  });
});
