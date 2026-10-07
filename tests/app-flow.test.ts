import { afterEach, describe, expect, it, vi } from 'vitest';
import { Scene, PerspectiveCamera, Vector3 } from 'three';
import type { BotSkirmishView } from '../src/game/bots/bot-skirmish-view';
import type { SceneViewOptions } from '../src/engine/scene-view';
import { AppElement } from './helpers/app-dom';
import { FakeEventTarget, FakeVisibilityTarget, ManualFrameScheduler, makeKeyEvent } from './helpers/engine-fixtures';

const harness = vi.hoisted(() => ({ battles: [] as BotSkirmishView[], cameras: [] as PerspectiveCamera[], countdownSeconds: 0.01, canvas: null as AppElement | null }));

vi.mock('../src/engine/scene-view', () => ({
  SceneView: class {
    readonly scene = new Scene();
    readonly camera = new PerspectiveCamera(65, 1, 0.1, 500);
    readonly renderer = { domElement: new AppElement() };
    readonly rendererPerformanceStats = null;
    constructor(_options: SceneViewOptions) { this.scene.add(this.camera); harness.cameras.push(this.camera); harness.canvas = this.renderer.domElement; }
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
        super(args[0], args[1], { ...args[2], countdownSeconds: harness.countdownSeconds, rules: {
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
  return { app, root, frame, element, windowTarget, documentTarget, stored };
}

afterEach(() => { vi.unstubAllGlobals(); harness.battles.length = 0; harness.cameras.length = 0; harness.countdownSeconds = 0.01; });

describe('application match flow', () => {
  it('shows the live countdown, pauses its timer, and hides it when combat starts', () => {
    harness.countdownSeconds = 1;
    const { app, frame, element } = createHarness();
    try {
      element('menu-join-button').click();
      frame(); frame();
      expect(element('round-countdown').hidden).toBe(false);
      expect(element('round-countdown').textContent).toBe('Round starts in 1');
      app.runtime.pause();
      const remaining = harness.battles[0]!.match.countdown.secondsRemaining;
      for (let i = 0; i < 60; i += 1) frame();
      expect(harness.battles[0]!.match.countdown.secondsRemaining).toBe(remaining);
      app.runtime.resume();
      for (let i = 0; i < 60; i += 1) frame();
      expect(element('round-countdown').hidden).toBe(true);
    } finally { app.dispose(); }
  });

  it('scales damage feedback and zooms only the live death view with bounded wheel input', () => {
    const { app, root, frame, element } = createHarness();
    const wheel = (deltaY: number) => {
      const event = Object.assign(new Event('wheel', { cancelable: true }), { deltaY, deltaMode: 0 });
      root.dispatchEvent(event);
      return event;
    };
    try {
      element('menu-join-button').click(); frame(); frame();
      const actor = harness.battles[0]!.simulation.playerCombatant!;
      const camera = harness.cameras[0]!;
      expect(element('damage-vignette').style.opacity).toBe('0');
      expect(wheel(-100).defaultPrevented).toBe(false);
      actor.applyDamage(20); frame();
      const light = Number(element('damage-vignette').style.opacity);
      expect(light).toBeGreaterThan(0);
      actor.applyDamage(50); frame();
      expect(Number(element('damage-vignette').style.opacity)).toBeGreaterThan(light);
      actor.applyDamage(100); frame(); frame();
      expect(element('death-overlay').hidden).toBe(false);
      expect(element('damage-vignette').style.opacity).toBe('0');
      expect(camera.position.y).toBe(90);
      expect(wheel(-100).defaultPrevented).toBe(true);
      expect(camera.position.y).toBeLessThan(90);
      for (let i = 0; i < 10; i += 1) wheel(-1000);
      expect(camera.position.y).toBe(25);
      for (let i = 0; i < 10; i += 1) wheel(1000);
      expect(camera.position.y).toBe(180);
      app.runtime.pause();
      expect(wheel(-100).defaultPrevented).toBe(false);
      app.runtime.resume();
      for (let i = 0; i < 20; i += 1) frame();
      expect(actor.status).toBe('alive');
      expect(element('death-overlay').hidden).toBe(true);
      expect(element('damage-vignette').style.opacity).toBe('0');
      expect(wheel(-100).defaultPrevented).toBe(false);
    } finally { app.dispose(); }
  });

  it('connects held right mouse to the centered sight and lowers it when released', () => {
    const { app, frame, element, documentTarget } = createHarness();
    try {
      element('menu-range-button').click(); frame(); frame();
      const camera = harness.cameras[0]!;
      const rifle = camera.children.find(child => child.name === 'Honk-47 — close LOD')!;
      const dot = rifle.getObjectByName('red-dot reticle')!;
      // The renderer's DOM port is the canvas PointerLockControls attaches to.
      documentTarget.pointerLockElement = harness.canvas as never;
      documentTarget.dispatchEvent(new Event('pointerlockchange'));
      documentTarget.dispatchEvent(Object.assign(new Event('mousedown'), { button: 2 }));
      for (let i = 0; i < 60; i += 1) frame();
      camera.updateMatrixWorld(true);
      expect(dot.visible).toBe(true);
      expect(dot.getWorldPosition(new Vector3()).project(camera).x).toBeCloseTo(0, 6);
      expect(dot.getWorldPosition(new Vector3()).project(camera).y).toBeCloseTo(0, 6);
      documentTarget.dispatchEvent(Object.assign(new Event('mouseup'), { button: 2 }));
      for (let i = 0; i < 60; i += 1) frame();
      expect(dot.visible).toBe(false);
      expect(rifle.position.x).toBeCloseTo(0.32);
    } finally { app.dispose(); }
  });

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
