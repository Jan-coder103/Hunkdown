import { Group, InstancedMesh, PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { BotSkirmishView } from '../src/game/bots/bot-skirmish-view';
import { createSkirmishShowcaseMap } from '../src/game/bots/skirmish-showcase';
import { BotSkirmishMatch } from '../src/game/match/bot-skirmish-match';
import { generateMap } from '../src/game/world/map-generator';
import { createEmptyMap, paintMapCell } from '../src/game/world/map-types';

describe('rendered bot skirmish', () => {
  it('generates both selectable match map presets with connected routes', () => {
    const midtown = generateMap(createSkirmishShowcaseMap(91, 'midtown'));
    const garden = generateMap(createSkirmishShowcaseMap(91, 'garden-district'));
    expect(midtown.source.id).not.toBe(garden.source.id);
    expect(midtown.navigationNodes.length).toBeGreaterThan(20);
    expect(garden.navigationNodes.length).toBeGreaterThan(20);
    expect(garden.navigationNodes.some((cell) => cell.x === 0 && cell.y === 4)).toBe(true);
  });

  it('renders team characters on the generated city and follows live simulation positions', () => {
    const scene = new Scene();
    const map = generateMap(createSkirmishShowcaseMap());
    const view = new BotSkirmishView(scene, map, { friendlyCount: 3, enemyCount: 3, seed: 61, countdownSeconds: 0.1 });
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

  it('batches repeated map tiles and keeps bot simulation running while presentation is culled', () => {
    const scene = new Scene();
    const map = generateMap(createEmptyMap({ width: 7, height: 5, seed: 64, cellSize: 8 }));
    const view = new BotSkirmishView(scene, map, {
      friendlyCount: 4,
      enemyCount: 4,
      seed: 64,
      countdownSeconds: 0.01,
    });
    const batches: InstancedMesh[] = [];
    scene.traverse((object) => { if (object instanceof InstancedMesh) batches.push(object); });
    expect(batches.some((batch) => batch.count === map.source.cells.length)).toBe(true);

    const camera = new PerspectiveCamera(60, 1.4, 0.1, 300);
    camera.position.set(0, 80, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(view.botRenderDiagnostics).toMatchObject({
      totalCharacters: 8,
      visibleCharacters: 8,
      farLodCharacters: 8,
      closeLodCharacters: 0,
    });
    const bird = scene.getObjectByName('skirmish friendly bot friendly-001');
    expect(bird?.children.filter((child) => child.visible)).toHaveLength(1);
    expect(bird?.children.find((child) => child.visible)?.name).toContain('far LOD');

    camera.position.set(0, 80, 200);
    camera.lookAt(0, 80, 210);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(view.botRenderDiagnostics.visibleCharacters).toBe(0);
    const before = view.snapshots;
    for (let frame = 0; frame < 120; frame += 1) view.step(1 / 60);
    const after = view.snapshots;
    expect(after.some((bot, index) => {
      const initial = before[index];
      return initial && Math.hypot(bot.position.x - initial.position.x, bot.position.z - initial.position.z) > 0.1;
    })).toBe(true);
    view.dispose();
  });

  it('selects the far and close asset tiers by camera distance', () => {
    const scene = new Scene();
    const draft = paintMapCell(createEmptyMap({ width: 5, height: 3, seed: 43, cellSize: 8 }), 2, 1, 'solid-house');
    const map = generateMap(draft);
    const building = map.buildings.find((placement) => placement.cell.x === 2 && placement.cell.y === 1);
    if (!building) throw new Error('Expected the authored solid house');
    const view = new BotSkirmishView(scene, map, { friendlyCount: 0, enemyCount: 0, seed: 43 });
    const closeModel = scene.getObjectByName('city building 2-1 close LOD');
    const farModel = scene.getObjectByName('city building 2-1 far LOD');
    if (!closeModel || !farModel) throw new Error('Expected both building LOD models');

    const camera = new PerspectiveCamera(60, 1.5, 0.1, 300);
    camera.position.set(building.position.x, 80, building.position.z);
    camera.up.set(0, 0, -1);
    camera.lookAt(building.position.x, 0, building.position.z);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(closeModel.visible).toBe(false);
    expect(farModel.visible).toBe(true);

    camera.position.set(building.position.x, 2, building.position.z + 9);
    camera.up.set(0, 1, 0);
    camera.lookAt(building.position.x, 1.4, building.position.z);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(closeModel.visible).toBe(true);
    expect(farModel.visible).toBe(false);
    view.dispose();
  });

  it('keeps match state identical while repeatedly switching character detail tiers', () => {
    const scene = new Scene();
    const map = generateMap(createEmptyMap({ width: 7, height: 5, seed: 73, cellSize: 8 }));
    const options = { friendlyCount: 4, enemyCount: 4, seed: 73 } as const;
    const view = new BotSkirmishView(scene, map, { ...options, countdownSeconds: 0.01 });
    const reference = new BotSkirmishMatch(map, options, { seed: 73 }, 0.01);
    const camera = new PerspectiveCamera(60, 1.4, 0.1, 300);

    for (let frame = 0; frame < 1200; frame += 1) {
      const bot = scene.getObjectByName('skirmish friendly bot friendly-001');
      if (!bot) throw new Error('Expected the close-detail test bot');
      if (frame % 2 === 0) {
        camera.position.set(0, 80, 0);
        camera.up.set(0, 0, -1);
        camera.lookAt(0, 0, 0);
      } else {
        camera.position.set(bot.position.x, bot.position.y + 3, bot.position.z + 5);
        camera.up.set(0, 1, 0);
        camera.lookAt(bot.position.x, bot.position.y + 1, bot.position.z);
      }
      camera.updateMatrixWorld(true);
      view.updatePresentation(camera);
      if (frame < 2) {
        const activeRig = bot.children.find((child) => child.visible);
        expect(activeRig?.name).toContain(frame === 0 ? 'far LOD' : 'close LOD');
      }
      view.step(1 / 60);
      reference.step(1 / 60);
    }

    expect(view.match.simulation.snapshots).toEqual(reference.simulation.snapshots);
    expect(view.match.tickets).toEqual(reference.tickets);
    expect(view.match.scoreSnapshots).toEqual(reference.scoreSnapshots);
    view.dispose();
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
      countdownSeconds: 0.1,
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

  it('hides destroyed props and reuses a fixed debris pool until particles settle', () => {
    const scene = new Scene();
    const map = generateMap(createEmptyMap({ width: 9, height: 7, seed: 37, cellSize: 8 }));
    const view = new BotSkirmishView(scene, map, { friendlyCount: 0, enemyCount: 0, seed: 37 });
    const prop = map.decorations[0];
    if (!prop) throw new Error('Expected the seeded city to include a destructible street prop');
    const model = scene.getObjectByName(`destructible prop ${prop.id}`);
    expect(model?.visible).toBe(true);

    const camera = new PerspectiveCamera(55, 1, 0.1, 400);
    camera.position.set(0, 80, 200);
    camera.lookAt(0, 80, 210);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(model?.visible).toBe(false);

    view.showDestruction([prop.id]);
    expect(view.debrisCount).toBe(4);
    view.showDestruction([prop.id]);
    expect(view.debrisCount).toBe(4);
    camera.position.set(prop.position.x, prop.position.y + 4, prop.position.z + 8);
    camera.lookAt(prop.position.x, prop.position.y + 0.5, prop.position.z);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(model?.visible).toBe(false);
    expect(scene.getObjectByName(`destructible prop ${prop.id} far LOD`)?.visible).toBe(false);
    view.step(1.5);
    expect(view.debrisCount).toBe(0);

    view.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('renders enterable houses in two distance tiers and hides destroyed wall parts in both', () => {
    const scene = new Scene();
    const draft = paintMapCell(createEmptyMap({ width: 5, height: 3, seed: 18, cellSize: 8 }), 2, 1, 'enterable-house', 'west-east');
    const map = generateMap(draft);
    const wall = map.collisions.find((collision) => collision.role === 'enterable-wall');
    if (!wall?.id) throw new Error('Expected the enterable house to have a named wall segment');
    const view = new BotSkirmishView(scene, map, { friendlyCount: 0, enemyCount: 0, seed: 18 });
    const close = scene.getObjectByName(`enterable house ${wall.cell.x},${wall.cell.y} — close LOD`);
    const far = scene.getObjectByName(`enterable house ${wall.cell.x},${wall.cell.y} — far LOD`);
    const partName = `destructible building part ${wall.id}`;
    const closePart = close?.getObjectByName(partName);
    const farPart = far?.getObjectByName(partName);
    expect(closePart?.visible).toBe(true);
    expect(farPart?.visible).toBe(true);
    expect(far?.visible).toBe(false);

    const camera = new PerspectiveCamera(60, 1.5, 0.1, 300);
    camera.position.set(0, 80, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(close?.visible).toBe(false);
    expect(far?.visible).toBe(true);

    view.showDestruction([wall.id]);
    expect(closePart?.visible).toBe(false);
    expect(farPart?.visible).toBe(false);
    expect(view.debrisCount).toBe(4);
    camera.position.set(wall.center.x, 2, wall.center.z + 6);
    camera.up.set(0, 1, 0);
    camera.lookAt(wall.center.x, 2, wall.center.z);
    camera.updateMatrixWorld(true);
    view.updatePresentation(camera);
    expect(close?.visible).toBe(true);
    expect(far?.visible).toBe(false);
    expect(closePart?.visible).toBe(false);
    view.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('keeps a separate dead body through respawn eligibility and removes it at corpse cleanup', () => {
    const scene = new Scene();
    const view = new BotSkirmishView(scene, generateMap(createEmptyMap({ width: 4, height: 3, seed: 61, cellSize: 4 })), {
      friendlyCount: 2,
      enemyCount: 2,
      seed: 61,
      countdownSeconds: 0.01,
      rules: { captureDurationSeconds: 100, captureRadius: 0.1, respawnDelaySeconds: 10, corpseLifetimeSeconds: 0.2 },
    });
    for (let frame = 0; frame < 1200 && view.match.corpseSnapshots.length === 0; frame += 1) view.step(1 / 60);

    const corpse = view.match.corpseSnapshots[0];
    expect(corpse).toBeDefined();
    expect(scene.getObjectByName(`skirmish corpse ${corpse?.id}`)).toBeTruthy();
    expect(scene.getObjectByName(`skirmish ${corpse?.team} bot ${corpse?.botId}`)?.visible).toBe(false);
    view.step(0.21);
    expect(view.match.corpseSnapshots.some((entry) => entry.id === corpse?.id)).toBe(false);
    expect(scene.getObjectByName(`skirmish corpse ${corpse?.id}`)).toBeFalsy();

    view.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('reuses an expired corpse view for the next body from the same team', () => {
    const scene = new Scene();
    const view = new BotSkirmishView(scene, generateMap(createEmptyMap({ width: 5, height: 3, seed: 74, cellSize: 4 })), {
      friendlyCount: 3,
      enemyCount: 0,
      seed: 74,
      countdownSeconds: 0.01,
      rules: { captureDurationSeconds: 100, captureRadius: 0.1, respawnDelaySeconds: 10, corpseLifetimeSeconds: 0.1 },
    });
    view.step(0.02);
    view.simulation.getCombatant('friendly-001')?.applyDamage(100);
    view.step(1 / 60);
    const firstCorpse = view.match.corpseSnapshots.find((corpse) => corpse.botId === 'friendly-001');
    if (!firstCorpse) throw new Error('Expected the first friendly corpse');
    const firstView = scene.getObjectByName(`skirmish corpse ${firstCorpse.id}`);
    expect(firstView).toBeTruthy();

    view.step(0.11);
    expect(scene.getObjectByName(`skirmish corpse ${firstCorpse.id}`)).toBeFalsy();
    expect(firstView?.visible).toBe(false);
    view.simulation.getCombatant('friendly-002')?.applyDamage(100);
    view.step(1 / 60);
    const secondCorpse = view.match.corpseSnapshots.find((corpse) => corpse.botId === 'friendly-002');

    expect(secondCorpse).toBeDefined();
    expect(scene.getObjectByName(`skirmish corpse ${secondCorpse?.id}`)).toBe(firstView);
    view.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
