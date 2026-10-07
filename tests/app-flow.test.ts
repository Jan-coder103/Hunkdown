import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scene, PerspectiveCamera } from 'three';
import type { BotSkirmishView } from '../src/game/bots/bot-skirmish-view';
import type { SceneViewOptions } from '../src/engine/scene-view';
import { AppElement } from './helpers/app-dom';
import { FakeEventTarget, FakeVisibilityTarget, ManualFrameScheduler, makeKeyEvent } from './helpers/engine-fixtures';

const harness = vi.hoisted(() => ({ battles: [] as BotSkirmishView[] }));

vi.mock('../src/engine/scene-view', () => ({
  SceneView: class {
    readonly scene = new Scene();
    readonly camera = new PerspectiveCamera(65, 1, 0.1, 500);
    readonly renderer = { domElement: new AppElement() };
    readonly rendererPerformanceStats = null;
    constructor(_options: SceneViewOptions) { this.scene.add(this.camera); }
    render(): void {}
    dispose(): void { this.scene.clear(); }
  },
}));

vi.mock('../src/game/bots/bot-skirmish-view', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/game/bots/bot-skirmish-view')>();
  return {
    ...original,
    BotSkirmishView: class extends original.BotSkirmishView {
      constructor(...args: ConstructorParameters<typeof original.BotSkirmishView>) {
        super(args[0], args[1], { ...args[2], countdownSeconds: 0.01, rules: {
          initialTickets: 1, respawnDelaySeconds: 0.2, captureDurationSeconds: 1000,
        } });
        harness.battles.push(this);
      }
    },
  };
});

import { mountApp } from '../src/app';

function createHarness() {
  const root = new AppElement();
  const scheduler = new ManualFrameScheduler();
  const windowTarget = new FakeEventTarget();
  const documentTarget = Object.assign(new FakeVisibilityTarget(), {
    pointerLockElement: null,
    exitPointerLock: () => {},
    createElement: () => new AppElement(),
  });
  const stored = new Map<string, string>();
  vi.stubGlobal('document', documentTarget);
  vi.stubGlobal('window', Object.assign(windowTarget, {
    requestAnimationFrame: scheduler.request.bind(scheduler), cancelAnimationFrame: scheduler.cancel.bind(scheduler),
  }));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => { stored.set(key, value); },
  });
  const app = mountApp(root as unknown as HTMLElement);
  let time = 0;
  const frame = () => { scheduler.runFrame(time); time += 20; };
  const element = (id: string) => root.querySelector(`#${id}`)!;
  return { app, root, frame, element, windowTarget, stored };
}

afterEach(() => { vi.unstubAllGlobals(); harness.battles.length = 0; });

describe('application match flow', () => {
  it('opens the shooting range from the ready room and returns to it from pause', () => {
    const { app, frame, element, windowTarget } = createHarness();
    try {
      element('menu-range-button').click();
      for (let index = 0; index < 12; index += 1) frame();
      expect(app.runtime.state).toBe('running');
      expect(element('main-menu').hidden).toBe(true);
      expect(element('mode-heading').textContent).toBe('Shooting range');
      expect(element('scene-viewport').attributes.get('aria-label')).toContain('testing range');
      expect(element('reset-range-button').hidden).toBe(false);

      windowTarget.dispatchEvent(makeKeyEvent('keydown', 'Escape'));
      frame();
      windowTarget.dispatchEvent(makeKeyEvent('keyup', 'Escape'));
      expect(element('pause-overlay').hidden).toBe(false);
      element('return-menu-button').click();
      expect(element('main-menu').hidden).toBe(false);
      expect(element('menu-range-button').hidden).toBe(false);

      element('menu-range-button').click();
      frame();
      expect(app.runtime.state).toBe('running');
      expect(element('main-menu').hidden).toBe(true);
      expect(element('mode-heading').textContent).toBe('Shooting range');
    } finally { app.dispose(); }
  });

  it.each(['alive', 'dead'] as const)('finishes, pays once, and starts the next round when the player is %s', (status) => {
    const { app, frame, element, windowTarget, stored } = createHarness();
    try {
      windowTarget.dispatchEvent(makeKeyEvent('keydown', 'Escape'));
      frame();
      expect(app.runtime.state).toBe('paused');
      expect(element('main-menu').hidden).toBe(false);
      windowTarget.dispatchEvent(makeKeyEvent('keyup', 'Escape'));
      element('menu-join-button').click();
      frame(); frame();
      const battle = harness.battles[0]!;
      expect(battle.match.matchState).toBe('active');
      battle.simulation.getCombatant('friendly-001')!.applyDamage(100);
      if (status === 'dead') battle.simulation.playerCombatant!.applyDamage(100);
      for (let index = 0; index < 30; index += 1) frame();

      expect(battle.match.matchState).toBe('complete');
      expect(battle.simulation.playerCombatant!.status).toBe(status);
      expect(app.runtime.state).toBe('paused');
      expect(element('results-overlay').hidden).toBe(false);
      expect(element('death-overlay').hidden).toBe(true);
      expect(element('results-outcome').textContent).toBe('Enemy victory');
      element('continue-results-button').click();
      expect(element('reward-screen').hidden).toBe(false);
      expect(element('reward-summary').textContent).toContain('+100 XP');
      const profile = [...stored.values()][0]!;
      expect(JSON.parse(profile)).toMatchObject({ xp: 100, credits: 50 });

      windowTarget.dispatchEvent(makeKeyEvent('keydown', 'Escape'));
      for (let index = 0; index < 12; index += 1) frame();
      expect(app.runtime.state).toBe('paused');
      expect([...stored.values()][0]).toBe(profile);
      expect(element('death-overlay').hidden).toBe(true);

      element('results-menu-button').click();
      expect(element('main-menu').hidden).toBe(false);
      expect(element('results-overlay').hidden).toBe(true);
      element('menu-join-button').click();
      frame(); frame();
      expect(harness.battles).toHaveLength(2);
      expect(app.runtime.state).toBe('running');
      expect(harness.battles[1]!.simulation.playerCombatant!.status).toBe('alive');
    } finally { app.dispose(); }
  });
});
