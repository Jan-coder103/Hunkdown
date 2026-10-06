import type { EngineView, FrameScheduler } from '../../src/engine/engine-runtime';

export class FakeEventTarget implements EventTarget {
  private readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
  ): void {
    if (!callback) return;
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
  ): void {
    if (!callback) return;
    this.listeners.get(type)?.delete(callback);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === 'function') listener.call(this, event);
      else listener.handleEvent(event);
    }
    return !event.defaultPrevented;
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

export class FakeVisibilityTarget extends FakeEventTarget {
  hidden = false;

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

export function makeKeyEvent(type: 'keydown' | 'keyup', code: string, repeat = false): Event {
  const event = new Event(type);
  Object.defineProperties(event, {
    code: { value: code },
    repeat: { value: repeat },
  });
  return event;
}

export class ManualFrameScheduler implements FrameScheduler {
  private nextId = 1;
  private readonly callbacks = new Map<number, (timestampMs: number) => void>();

  request(callback: (timestampMs: number) => void): number {
    const handle = this.nextId++;
    this.callbacks.set(handle, callback);
    return handle;
  }

  cancel(handle: number): void {
    this.callbacks.delete(handle);
  }

  runFrame(timestampMs: number): void {
    const [handle, callback] = this.callbacks.entries().next().value ?? [];
    if (handle === undefined || callback === undefined) throw new Error('No frame is scheduled');
    this.callbacks.delete(handle);
    callback(timestampMs);
  }

  get pendingCount(): number {
    return this.callbacks.size;
  }
}

export class FakeEngineView implements EngineView {
  readonly renderedAlphas: number[] = [];
  disposeCount = 0;

  render(interpolationAlpha: number): void {
    this.renderedAlphas.push(interpolationAlpha);
  }

  dispose(): void {
    this.disposeCount += 1;
  }
}
