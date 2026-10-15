import { describe, expect, it, vi } from 'vitest';
import { Mesh, PerspectiveCamera, Vector3 } from 'three';
import { createSkylineView } from '../src/game/world/skyline-view';
import { createSky } from '../src/engine/sky';

const map = { width: 16, height: 8, cellSize: 8, seed: 42 };
const meshes = (view: ReturnType<typeof createSkylineView>) => view.root.children as Mesh[];

describe('distant city scenery', () => {
  it('is reproducible, varies by seed, and stays within four draws and 5,000 triangles', () => {
    const first = createSkylineView(map);
    const same = createSkylineView(map);
    const other = createSkylineView({ ...map, seed: 43 });
    const positions = (view: typeof first) => meshes(view).map(mesh => Array.from(mesh.geometry.getAttribute('position').array));
    expect(positions(first)).toEqual(positions(same));
    expect(positions(first)).not.toEqual(positions(other));
    expect(meshes(first)).toHaveLength(4);
    expect(meshes(first).reduce((count, mesh) => count + mesh.geometry.getAttribute('position').count / 3, 0)).toBeLessThan(5000);
    expect(new Set(meshes(first).map(mesh => mesh.material)).size).toBe(1);
    first.dispose(); same.dispose(); other.dispose();
  });

  it.each([{ ...map }, { ...map, width: 2, height: 64, cellSize: 32 }])('keeps buildings outside rectangular playable bounds: %j', options => {
    const view = createSkylineView(options);
    for (const mesh of meshes(view)) {
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i += 1) {
        if (positions.getY(i) <= 0) continue;
        expect(Math.abs(positions.getX(i)) > options.width * options.cellSize / 2 || Math.abs(positions.getZ(i)) > options.height * options.cellSize / 2).toBe(true);
      }
    }
    view.dispose();
  });

  it('has true parallax and roofs visible to an aerial camera', () => {
    const view = createSkylineView(map);
    const mesh = meshes(view)[0]!;
    const point = new Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position'), 36);
    const camera = new PerspectiveCamera(65, 1, 0.1, 3500);
    camera.position.set(0, 1.6, 0); camera.updateMatrixWorld();
    const before = point.clone().project(camera);
    camera.position.x += 10; camera.updateMatrixWorld();
    expect(point.clone().project(camera).x).not.toBeCloseTo(before.x);
    expect(Array.from(mesh.geometry.getAttribute('normal').array).some((v, i) => i % 3 === 1 && v === 1)).toBe(true);
    view.dispose();
  });

  it('releases shared resources once and detaches scenery on disposal', () => {
    const view = createSkylineView(map);
    const geometrySpies = meshes(view).map(mesh => vi.spyOn(mesh.geometry, 'dispose'));
    const material = meshes(view)[0]!.material;
    if (Array.isArray(material)) throw new Error('Expected shared material');
    const materialSpy = vi.spyOn(material, 'dispose');
    view.dispose(); view.dispose();
    for (const spy of geometrySpies) expect(spy).toHaveBeenCalledTimes(1);
    expect(materialSpy).toHaveBeenCalledTimes(1);
  });

  it('draws sky behind opaque scenery without writing depth or being culled', () => {
    const sky = createSky();
    expect(sky.mesh.material.depthWrite).toBe(false);
    expect(sky.mesh.material.depthTest).toBe(false);
    expect(sky.mesh.frustumCulled).toBe(false);
    expect(sky.mesh.renderOrder).toBeLessThan(0);
    sky.dispose();
  });
});
