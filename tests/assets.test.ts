import { Box3, Mesh, PerspectiveCamera, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ASSET_DEFINITIONS, createAsset } from '../src/content/assets/registry';
import { createGeneratedAsset, validateAssetDefinition, type AssetDefinition } from '../src/content/assets/asset-types';
import { AssetPreview } from '../src/tools/asset-viewer/asset-preview';
import { OrbitController } from '../src/tools/asset-viewer/orbit-controller';

describe('generated asset pipeline', () => {
  it('registers typed placeholder assets with two render LODs and collision metadata', () => {
    expect(ASSET_DEFINITIONS.map((asset) => asset.category)).toEqual([
      'building', 'building', 'building',
      'decoration', 'decoration', 'decoration', 'decoration', 'decoration',
      'weapon', 'bird',
    ]);
    for (const definition of ASSET_DEFINITIONS) {
      expect(Object.isFrozen(definition.bounds.min)).toBe(true);
      expect(Object.isFrozen(definition.collision)).toBe(true);
      const asset = createAsset(definition.id);
      expect(Object.keys(asset.lods)).toEqual(['close', 'far']);
      expect(asset.collision.length).toBeGreaterThan(0);
      expect(asset.lods.close.children.length).toBeGreaterThan(0);
      expect(asset.lods.far.children.length).toBeGreaterThan(0);
      const visualBounds = new Box3();
      for (const tier of Object.values(asset.lods)) {
        visualBounds.setFromObject(tier);
        expect(visualBounds.min.x, `${asset.id} ${tier.name} min x`).toBeGreaterThanOrEqual(asset.bounds.min[0] - 0.02);
        expect(visualBounds.min.y, `${asset.id} ${tier.name} min y`).toBeGreaterThanOrEqual(asset.bounds.min[1] - 0.02);
        expect(visualBounds.min.z, `${asset.id} ${tier.name} min z`).toBeGreaterThanOrEqual(asset.bounds.min[2] - 0.02);
        expect(visualBounds.max.x, `${asset.id} ${tier.name} max x`).toBeLessThanOrEqual(asset.bounds.max[0] + 0.02);
        expect(visualBounds.max.y, `${asset.id} ${tier.name} max y`).toBeLessThanOrEqual(asset.bounds.max[1] + 0.02);
        expect(visualBounds.max.z, `${asset.id} ${tier.name} max z`).toBeLessThanOrEqual(asset.bounds.max[2] + 0.02);
      }
      asset.dispose();
    }
  });

  it('reports malformed dimensions, collision extents, and incomplete LOD declarations', () => {
    const base = ASSET_DEFINITIONS[0];
    if (!base) throw new Error('Expected a building definition');
    expect(() => validateAssetDefinition({ ...base, bounds: { min: [0, 0, 0], max: [0, 2, 2] } })).toThrow(/min must be below max/);
    expect(() => validateAssetDefinition({ ...base, collision: [{ id: 'bad', center: [0, 0, 0], size: [3, 1, 1] }] })).toThrow(/extends outside declared bounds/);
    expect(() => validateAssetDefinition({ ...base, lodFactories: { close: base.lodFactories.close } })).toThrow(/exactly two LOD factories/);
  });

  it('disposes each unique geometry and material across both LODs once, including repeated disposal', () => {
    const definition = ASSET_DEFINITIONS[1];
    if (!definition) throw new Error('Expected a decoration definition');
    const asset = createAsset(definition.id);
    const geometries = new Set<import('three').BufferGeometry>();
    const materials = new Set<import('three').Material>();
    for (const root of Object.values(asset.lods)) {
      root.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      });
    }
    const geometryDisposals = [...geometries].map((geometry) => vi.spyOn(geometry, 'dispose'));
    const materialDisposals = [...materials].map((material) => vi.spyOn(material, 'dispose'));
    asset.dispose();
    asset.dispose();
    expect(geometryDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    expect(materialDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
  });
});

describe('asset viewer preview ownership', () => {
  it('switches the visible LOD and releases the previous asset during repeated swaps', () => {
    const scene = new Scene();
    const preview = new AssetPreview(scene);
    const first = preview.load('pastel-row-house');
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    const previous = first.asset;
    const oldGeometries = new Set<import('three').BufferGeometry>();
    previous.lods.close.traverse((object) => {
      if (object instanceof Mesh) oldGeometries.add(object.geometry);
    });
    const oldDisposals = [...oldGeometries].map((geometry) => vi.spyOn(geometry, 'dispose'));

    preview.selectLod('far');
    expect(scene.children).toContain(previous.lods.far);
    expect(scene.children).not.toContain(previous.lods.close);
    const second = preview.load('street-lamp');
    expect(second.ok).toBe(true);
    expect(oldDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    expect(scene.children).not.toContain(previous.lods.far);
    if (!second.ok) throw new Error(second.error);
    const currentGeometry = new Set<import('three').BufferGeometry>();
    second.asset.lods.far.traverse((object) => {
      if (object instanceof Mesh) currentGeometry.add(object.geometry);
    });
    const currentDisposals = [...currentGeometry].map((geometry) => vi.spyOn(geometry, 'dispose'));
    preview.dispose();
    preview.dispose();
    expect(currentDisposals.every((dispose) => dispose.mock.calls.length === 1)).toBe(true);
    expect(scene.children).toHaveLength(0);
  });

  it('returns metadata validation errors for the viewer to display', () => {
    const definition = ASSET_DEFINITIONS[0];
    if (!definition) throw new Error('Expected a building definition');
    const invalid = { ...definition, collision: [{ id: 'outside', center: [0, 0, 0], size: [9, 1, 1] }] } as unknown as AssetDefinition;
    const preview = new AssetPreview(new Scene(), () => createGeneratedAsset(invalid));
    const result = preview.load(invalid.id);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Invalid metadata should not load');
    expect(result.error).toMatch(/extends outside declared bounds/);
  });
});

describe('asset viewer orbit controls', () => {
  it('orbits, zooms, and releases pointer and wheel listeners on disposal', () => {
    class FakeCanvas extends EventTarget {
      readonly style: Record<string, string> = {};
      readonly capturePointer = vi.fn<(pointerId: number) => void>();
      readonly releasePointer = vi.fn<(pointerId: number) => void>();
      readonly setPointerCapture = this.capturePointer;
      readonly releasePointerCapture = this.releasePointer;
      readonly hasPointerCapture = vi.fn(() => true);
    }

    const canvas = new FakeCanvas();
    const camera = new PerspectiveCamera(42, 1, 0.1, 100);
    const orbit = new OrbitController(canvas as unknown as HTMLElement, camera);
    const start = camera.position.clone();
    canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { button: 0, pointerId: 3, clientX: 20, clientY: 20 }));
    canvas.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 3, clientX: 60, clientY: 34 }));
    const orbited = camera.position.clone();
    expect(orbited.equals(start)).toBe(false);
    expect(canvas.capturePointer).toHaveBeenCalledWith(3);

    const wheel = Object.assign(new Event('wheel', { cancelable: true }), { deltaY: 120 });
    canvas.dispatchEvent(wheel);
    const zoomed = camera.position.clone();
    expect(wheel.defaultPrevented).toBe(true);
    expect(zoomed.equals(orbited)).toBe(false);

    orbit.dispose();
    expect(canvas.releasePointer).toHaveBeenCalledWith(3);
    canvas.dispatchEvent(Object.assign(new Event('pointermove'), { pointerId: 3, clientX: 120, clientY: 80 }));
    canvas.dispatchEvent(Object.assign(new Event('wheel', { cancelable: true }), { deltaY: 120 }));
    expect(camera.position.equals(zoomed)).toBe(true);
  });
});
