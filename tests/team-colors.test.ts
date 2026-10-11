import { Color, Mesh, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { CHICKEN_COLORS, type ChickenColor } from '../src/content/assets/tactical-chicken.asset';
import { chooseRoundTeamColors } from '../src/game/match/team-colors';
import { ChickenCharacterView } from '../src/game/player/chicken-character-view';
import { BotSkirmishView } from '../src/game/bots/bot-skirmish-view';
import { generateMap } from '../src/game/world/map-generator';
import { createEmptyMap } from '../src/game/world/map-types';

describe('round chicken colors', () => {
  it.each([[0, 'green'], [0.34, 'red'], [0.99, 'blue']] as const)('chooses yellow versus %s roll color %s', (sample, color) => {
    expect(chooseRoundTeamColors(() => sample)).toEqual({ friendly: 'yellow', enemy: color });
  });

  it.each(['green', 'red', 'blue'] as const)('preserves %s feathers through LOD changes, damage and first-person rendering', (color: ChickenColor) => {
    const scene = new Scene();
    const view = new ChickenCharacterView(scene, 'enemy', 'third-person', 'close', color);
    expect(view.thirdPersonRig!.featherMaterial.color.getHexString()).toBe(CHICKEN_COLORS[color].feather.slice(1));
    view.triggerDamage(); view.update(0.3);
    view.setDetail('far');
    const mesh = view.thirdPersonRig!.root.children[0] as Mesh;
    const vertexColor = new Color().fromBufferAttribute(mesh.geometry.getAttribute('color'), 0);
    expect(vertexColor.getHexString()).toBe(CHICKEN_COLORS[color].feather.slice(1));
    view.setDetail('close');
    expect(view.thirdPersonRig!.featherMaterial.color.getHexString()).toBe(CHICKEN_COLORS[color].feather.slice(1));
    const arms = new ChickenCharacterView(scene, 'enemy', 'first-person', 'close', color);
    expect(arms.firstPersonRig!.featherMaterial.color.getHexString()).toBe(CHICKEN_COLORS[color].feather.slice(1));
    view.dispose(); arms.dispose();
  });

  it('samples only once per new round, independent of the map seed, and colors actual bots and zones', () => {
    const map = generateMap(createEmptyMap({ width: 7, height: 5, seed: 71, cellSize: 8 }));
    const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.99);
    for (const color of ['green', 'blue'] as const) {
      const scene = new Scene();
      const view = new BotSkirmishView(scene, map, { friendlyCount: 1, enemyCount: 1, colorRandom: random });
      expect(view.teamColors).toEqual({ friendly: 'yellow', enemy: color });
      const bot = scene.getObjectByName('skirmish enemy bot enemy-001')!;
      const mesh = bot.getObjectByName('far low-poly chicken silhouette') as Mesh;
      expect(new Color().fromBufferAttribute(mesh.geometry.getAttribute('color'), 0).getHexString()).toBe(CHICKEN_COLORS[color].feather.slice(1));
      const zone = scene.getObjectByName('enemy safe spawn area') as Mesh;
      expect((zone.material as import('three').MeshBasicMaterial).color.getHexString()).toBe(CHICKEN_COLORS[color].feather.slice(1));
      view.step(1 / 60);
      expect(view.teamColors.enemy).toBe(color);
      view.dispose();
    }
    expect(random).toHaveBeenCalledTimes(2);
  });
});
