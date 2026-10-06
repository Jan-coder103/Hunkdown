import { describe, expect, it, vi } from 'vitest';
import { Scene, type BufferGeometry, type Material, type Object3D } from 'three';
import { createMovementPlayground } from '../src/game/player/movement-playground';

function renderResources(scene: Scene): Array<{ geometry: BufferGeometry; materials: Material[] }> {
  const resources: Array<{ geometry: BufferGeometry; materials: Material[] }> = [];
  scene.traverse((object: Object3D) => {
    const renderable = object as Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };
    if (!renderable.geometry || !renderable.material) return;
    resources.push({
      geometry: renderable.geometry,
      materials: Array.isArray(renderable.material) ? renderable.material : [renderable.material],
    });
  });
  return resources;
}

describe('createMovementPlayground', () => {
  it('builds the floor, collision obstacles, and an uphill traversal route', () => {
    const scene = new Scene();
    const playground = createMovementPlayground(scene);
    const beforeHeight = playground.world.groundHeightAt(5, -1);
    const uphillHeight = playground.world.groundHeightAt(5, -7);

    expect(scene.children.length).toBeGreaterThan(4);
    expect(uphillHeight).toBeGreaterThan(beforeHeight);
    expect(playground.world.moveHorizontal(0, -11.3, 0, -0.3, 0, 1.75, 0.34).wallNormalZ).toBe(1);

    playground.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it('disposes every generated geometry and material exactly once', () => {
    const scene = new Scene();
    const playground = createMovementPlayground(scene);
    const resources = renderResources(scene);
    const geometryDisposals = resources.map(({ geometry }) => vi.spyOn(geometry, 'dispose'));
    const materialDisposals = resources.flatMap(({ materials }) => materials.map((material) => vi.spyOn(material, 'dispose')));

    playground.dispose();
    playground.dispose();

    expect(geometryDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    expect(materialDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
  });
});
