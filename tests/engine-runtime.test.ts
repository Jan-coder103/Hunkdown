import { describe, expect, it } from 'vitest';
import { EngineRuntime } from '../src/engine/engine-runtime';
import { createSeededRandom } from '../src/engine/seeded-random';
import { FakeEngineView, FakeEventTarget, FakeVisibilityTarget, ManualFrameScheduler, makeKeyEvent } from './helpers/engine-fixtures';

describe('EngineRuntime', () => {
  it('pauses simulation, keeps rendering, and resumes without catching up paused time', () => {
    const windowTarget = new FakeEventTarget();
    const documentTarget = new FakeVisibilityTarget();
    const scheduler = new ManualFrameScheduler();
    const view = new FakeEngineView();
    const states: string[] = [];
    let updates = 0;
    const runtime = new EngineRuntime({
      createView: () => view,
      frameScheduler: scheduler,
      inputTargets: { windowTarget, documentTarget },
      updateSimulation: () => { updates += 1; },
      onStateChange: (state) => states.push(state),
    });

    expect(runtime.start()).toBe(true);
    scheduler.runFrame(0);
    scheduler.runFrame(20);
    expect(updates).toBe(1);

    windowTarget.dispatchEvent(makeKeyEvent('keydown', 'Escape'));
    scheduler.runFrame(40);
    expect(runtime.state).toBe('paused');
    scheduler.runFrame(1000);
    expect(updates).toBe(1);
    expect(view.renderedAlphas).toHaveLength(4);
    expect(view.renderedAlphas[3]).toBe(0);

    windowTarget.dispatchEvent(makeKeyEvent('keyup', 'Escape'));
    windowTarget.dispatchEvent(makeKeyEvent('keydown', 'Escape'));
    scheduler.runFrame(1020);
    expect(runtime.state).toBe('running');
    expect(updates).toBe(1);
    scheduler.runFrame(1040);
    expect(updates).toBe(2);
    expect(states).toEqual(['running', 'paused', 'running']);

    runtime.dispose();
  });

  it('passes interpolation alpha to rendering between fixed simulation steps', () => {
    const scheduler = new ManualFrameScheduler();
    const view = new FakeEngineView();
    const runtime = new EngineRuntime({
      createView: () => view,
      frameScheduler: scheduler,
      inputTargets: { windowTarget: new FakeEventTarget(), documentTarget: new FakeVisibilityTarget() },
    });
    runtime.start();

    scheduler.runFrame(0);
    scheduler.runFrame(8);
    expect(view.renderedAlphas[1]).toBeCloseTo(0.48);

    runtime.dispose();
  });

  it('supplies a reproducible random source to fixed simulation updates', () => {
    const scheduler = new ManualFrameScheduler();
    const randomValues: number[] = [];
    const seed = 42;
    const runtime = new EngineRuntime({
      createView: () => new FakeEngineView(),
      frameScheduler: scheduler,
      inputTargets: { windowTarget: new FakeEventTarget(), documentTarget: new FakeVisibilityTarget() },
      seed,
      updateSimulation: (_stepSeconds, random) => randomValues.push(random()),
    });
    runtime.start();
    scheduler.runFrame(0);
    scheduler.runFrame(20);

    expect(randomValues).toEqual([createSeededRandom(seed)()]);
    runtime.dispose();
  });

  it('keeps one-shot keys until a fixed step consumes them, then clears them between catch-up steps', () => {
    const scheduler = new ManualFrameScheduler();
    const windowTarget = new FakeEventTarget();
    const presses: boolean[] = [];
    const held: boolean[] = [];
    const runtime = new EngineRuntime({
      createView: () => new FakeEngineView(),
      frameScheduler: scheduler,
      inputTargets: { windowTarget, documentTarget: new FakeVisibilityTarget() },
      updateSimulation: (_stepSeconds, _random, input) => {
        presses.push(input.wasPressed('Space'));
        held.push(input.isDown('Space'));
      },
    });
    runtime.start();
    scheduler.runFrame(0);
    windowTarget.dispatchEvent(makeKeyEvent('keydown', 'Space'));
    scheduler.runFrame(8);
    expect(presses).toEqual([]);
    scheduler.runFrame(108);

    expect(presses.length).toBeGreaterThan(1);
    expect(presses[0]).toBe(true);
    expect(presses.slice(1).every((pressed) => !pressed)).toBe(true);
    expect(held.every(Boolean)).toBe(true);
    runtime.dispose();
  });

  it('repeated start/dispose cycles release frame callbacks, keyboard listeners, and views', () => {
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const windowTarget = new FakeEventTarget();
      const documentTarget = new FakeVisibilityTarget();
      const scheduler = new ManualFrameScheduler();
      const view = new FakeEngineView();
      const runtime = new EngineRuntime({
        createView: () => view,
        frameScheduler: scheduler,
        inputTargets: { windowTarget, documentTarget },
      });

      expect(runtime.start()).toBe(true);
      expect(runtime.start()).toBe(false);
      expect(windowTarget.listenerCount('keydown')).toBe(1);
      expect(scheduler.pendingCount).toBe(1);
      runtime.dispose();
      runtime.dispose();

      expect(scheduler.pendingCount).toBe(0);
      expect(view.disposeCount).toBe(1);
      expect(windowTarget.listenerCount('keydown')).toBe(0);
      expect(windowTarget.listenerCount('keyup')).toBe(0);
      expect(windowTarget.listenerCount('blur')).toBe(0);
      expect(documentTarget.listenerCount('visibilitychange')).toBe(0);
    }
  });

  it('does not restart a frame loop after disposal', () => {
    const scheduler = new ManualFrameScheduler();
    const view = new FakeEngineView();
    const runtime = new EngineRuntime({
      createView: () => view,
      frameScheduler: scheduler,
      inputTargets: { windowTarget: new FakeEventTarget(), documentTarget: new FakeVisibilityTarget() },
    });
    runtime.start();
    scheduler.runFrame(0);
    expect(scheduler.pendingCount).toBe(1);
    runtime.dispose();
    expect(scheduler.pendingCount).toBe(0);
    expect(runtime.state).toBe('disposed');
  });
});
