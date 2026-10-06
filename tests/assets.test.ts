import { Box3, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ASSET_DEFINITIONS, createAsset } from '../src/content/assets/registry';
import { createGeneratedAsset, validateAssetDefinition, type AssetDefinition } from '../src/content/assets/asset-types';
import { createWeaponModel } from '../src/content/weapons/registry';
import { createTacticalChickenModel } from '../src/content/assets/tactical-chicken.asset';
import { AssetPreview } from '../src/tools/asset-viewer/asset-preview';
import { OrbitController } from '../src/tools/asset-viewer/orbit-controller';

describe('generated asset pipeline', () => {
  it('registers typed code-generated assets with two render LODs and collision metadata', () => {
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

  it('provides a detailed close LOD and a lighter far LOD for the Phase 11 city review set', () => {
    const reviewSet = [
      ['pastel-row-house', ['painted roof eaves', 'sage window shutter', 'terracotta chimney']],
      ['tall-townhouse', ['wide roof cornice', 'coral window shutter', 'front roof dormer']],
      ['street-lamp', ['cast iron base', 'warm lantern glass', 'lantern roof cap']],
      ['street-tree', ['upper faceted canopy', 'east canopy cluster']],
      ['cafe-kiosk', ['striped canopy valance', 'side menu board']],
      ['plaza-fountain', ['upper fountain bowl', 'central water spout']],
      ['street-bicycle', ['chain ring', 'small wicker front basket']],
    ] as const;

    for (const [id, expectedCloseParts] of reviewSet) {
      const asset = createAsset(id);
      const closeParts = new Set<string>();
      let closeMeshes = 0;
      let farMeshes = 0;
      asset.lods.close.traverse((object) => {
        if (object.name) closeParts.add(object.name);
        if (object instanceof Mesh) closeMeshes += 1;
      });
      asset.lods.far.traverse((object) => { if (object instanceof Mesh) farMeshes += 1; });

      expect(expectedCloseParts.every((part) => closeParts.has(part)), id).toBe(true);
      expect(closeMeshes, `${id} close LOD should retain street-level detail`).toBeGreaterThan(farMeshes);
      asset.dispose();
    }

    expect(ASSET_DEFINITIONS.some((asset) => asset.id.includes('placeholder') || asset.displayName.toLowerCase().includes('placeholder'))).toBe(false);
  });

  it('builds a recognizable tactical chicken with team markings and reduced far detail', () => {
    const close = createTacticalChickenModel('enemy', 'close');
    const far = createTacticalChickenModel('friendly', 'far');
    const closeNames = new Set<string>();
    close.root.traverse((object) => { if (object.name) closeNames.add(object.name); });
    let closeMeshes = 0;
    let farMeshes = 0;
    close.root.traverse((object) => { if (object instanceof Mesh) closeMeshes += 1; });
    far.root.traverse((object) => { if (object instanceof Mesh) farMeshes += 1; });
    const enemyMark = close.teamMark.material;
    const friendlyMark = far.teamMark.material;
    if (!(enemyMark instanceof MeshStandardMaterial) || !(friendlyMark instanceof MeshStandardMaterial)) {
      throw new Error('Team markings should use standard materials');
    }

    expect(closeNames).toContain('orange beak');
    expect(closeNames).toContain('red comb');
    expect(closeNames).toContain('tactical vest');
    expect(closeNames).toContain('goggle lens');
    expect(enemyMark.color.getHexString()).toBe('d96d64');
    expect(friendlyMark.color.getHexString()).toBe('55b8a0');
    expect(closeMeshes).toBeGreaterThan(farMeshes);

    for (const rig of [close, far]) {
      rig.root.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
      });
      for (const material of rig.ownedMaterials) material.dispose();
    }
  });

  it('uses the same detailed Honk-47 model in combat and the asset viewer', () => {
    const asset = createAsset('honk-47');
    const weapon = createWeaponModelForAssetCheck();
    const viewerParts = new Set<string>();
    const combatParts = new Set<string>();
    asset.lods.close.traverse((object) => { if (object.name) viewerParts.add(object.name); });
    weapon.root.traverse((object) => { if (object.name) combatParts.add(object.name); });

    expect(asset.displayName).toBe('Honk-47');
    expect(ASSET_DEFINITIONS.some((definition) => definition.id === 'practice-rifle')).toBe(false);
    expect(asset.bounds.max[2] - asset.bounds.min[2]).toBeCloseTo(1.28);
    expect(viewerParts).toContain('muzzle brake');
    expect(viewerParts).toContain('optic housing');
    expect(combatParts).toContain('muzzle brake');
    expect(combatParts).toContain('optic housing');
    asset.dispose();
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

    const rifle = ASSET_DEFINITIONS.find((asset) => asset.id === 'honk-47');
    const cafe = ASSET_DEFINITIONS.find((asset) => asset.id === 'corner-cafe');
    if (!rifle || !cafe) throw new Error('Expected revised weapon and cafe review assets');
    orbit.frameBounds(rifle.bounds);
    const rifleCenter = new Vector3(...rifle.bounds.min).add(new Vector3(...rifle.bounds.max)).multiplyScalar(0.5);
    const rifleRadius = camera.position.distanceTo(rifleCenter);
    orbit.frameBounds(cafe.bounds);
    const cafeCenter = new Vector3(...cafe.bounds.min).add(new Vector3(...cafe.bounds.max)).multiplyScalar(0.5);
    const cafeRadius = camera.position.distanceTo(cafeCenter);
    camera.updateMatrixWorld();
    const cameraDirection = camera.getWorldDirection(new Vector3());
    expect(cafeRadius).toBeGreaterThan(rifleRadius);
    expect(cameraDirection.dot(cafeCenter.clone().sub(camera.position).normalize())).toBeCloseTo(1);

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

function createWeaponModelForAssetCheck() {
  return createWeaponModel('honk-47');
}
