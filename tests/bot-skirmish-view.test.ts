import { Group, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { BotSkirmishView } from '../src/game/bots/bot-skirmish-view';
import { createSkirmishShowcaseMap } from '../src/game/bots/skirmish-showcase';
import { generateMap } from '../src/game/world/map-generator';
import { createEmptyMap } from '../src/game/world/map-types';

describe('rendered bot skirmish', () => {
  it('renders team characters on the generated city and follows live simulation positions', () => {
    const scene = new Scene();
    const map = generateMap(createSkirmishShowcaseMap());
    const view = new BotSkirmishView(scene, map, { friendlyCount: 3, enemyCount: 3, seed: 61 });
    const before = view.snapshots;
    expect(before).toHaveLength(6);
    expect(scene.getObjectByName('central skirmish meeting point')).toBeTruthy();
    expect(scene.getObjectByName('skirmish friendly bot friendly-001')).toBeTruthy();
    expect(scene.getObjectByName('skirmish enemy bot enemy-001')).toBeTruthy();

    for (let frame = 0; frame < 300; frame += 1) view.step(1 / 60);

    const after = view.snapshots;
    expect(after.some((bot, index) => {
      const initial = before[index];
      return initial && Math.hypot(bot.position.x - initial.position.x, bot.position.z - initial.position.z) > 1;
    })).toBe(true);
    const renderedBot = scene.getObjectByName('skirmish friendly bot friendly-001');
    const stateBot = after.find((bot) => bot.id === 'friendly-001');
    expect(renderedBot?.position.x).toBeCloseTo(stateBot?.position.x ?? Number.NaN, 6);
    expect(renderedBot?.position.z).toBeCloseTo(stateBot?.position.z ?? Number.NaN, 6);
  });

  it('shows and cleans up bot shot tracers with their scene resources', () => {
    const scene = new Scene();
    const anchor = new Group();
    anchor.name = 'unrelated scene object';
    scene.add(anchor);
    const view = new BotSkirmishView(scene, generateMap(createEmptyMap({ width: 4, height: 3, seed: 44, cellSize: 4 })), {
      friendlyCount: 1,
      enemyCount: 1,
      seed: 44,
    });
    let sawTracer = false;
    let sawRenderedTracer = false;
    for (let frame = 0; frame < 240; frame += 1) {
      view.step(1 / 60);
      sawTracer ||= view.tracerCount > 0;
      sawRenderedTracer ||= scene.children.some((child) => child.name.endsWith('bot shot tracer'));
    }
    expect(sawTracer).toBe(true);
    expect(sawRenderedTracer).toBe(true);

    view.dispose();
    expect(view.tracerCount).toBe(0);
    expect(scene.children).toEqual([anchor]);
  });
});
