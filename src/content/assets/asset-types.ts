import {
  Box3,
  BufferGeometry,
  Group,
  Material,
  Mesh,
  Object3D,
  Vector3,
} from 'three';

export const ASSET_LOD_TIERS = ['close', 'far'] as const;
export type AssetLodTier = (typeof ASSET_LOD_TIERS)[number];
export type AssetCategory = 'building' | 'decoration' | 'weapon' | 'bird';
export type Vector3Tuple = readonly [number, number, number];

export type AssetBounds = Readonly<{
  min: Vector3Tuple;
  max: Vector3Tuple;
}>;

export type AssetCollider = Readonly<{
  id: string;
  center: Vector3Tuple;
  size: Vector3Tuple;
}>;

/** Authoring data for an asset. Builders return fresh objects and fresh render resources per LOD. */
export type AssetDefinition = Readonly<{
  id: string;
  displayName: string;
  category: AssetCategory;
  bounds: AssetBounds;
  collision: readonly AssetCollider[];
  lodFactories: Readonly<Record<AssetLodTier, () => Object3D>>;
}>;

/** A generated asset owns both of its LOD trees and every unique geometry/material below them. */
export type GeneratedAsset = Readonly<{
  id: string;
  displayName: string;
  category: AssetCategory;
  bounds: AssetBounds;
  collision: readonly AssetCollider[];
  lods: Readonly<Record<AssetLodTier, Object3D>>;
  dispose(): void;
}>;

const CATEGORY_SET = new Set<AssetCategory>(['building', 'decoration', 'weapon', 'bird']);
const LOD_SET = new Set<string>(ASSET_LOD_TIERS);

export function isAssetLodTier(value: string): value is AssetLodTier {
  return LOD_SET.has(value);
}

export function validateAssetDefinition(value: unknown): asserts value is AssetDefinition {
  if (!isRecord(value)) throw new Error('Asset definition must be an object');
  if (typeof value.id !== 'string' || !/^[a-z0-9-]+$/.test(value.id)) {
    throw new Error(`Asset id must use lowercase letters, numbers, and hyphens: ${String(value.id)}`);
  }
  if (typeof value.displayName !== 'string' || !value.displayName.trim()) {
    throw new Error(`Asset ${value.id} needs a display name`);
  }
  if (typeof value.category !== 'string' || !CATEGORY_SET.has(value.category as AssetCategory)) {
    throw new Error(`Asset ${value.id} has an unsupported category`);
  }

  const bounds = readBounds(value.bounds, `Asset ${value.id} bounds`);
  if (!Array.isArray(value.collision)) throw new Error(`Asset ${value.id} collision metadata must be an array`);
  const colliderIds = new Set<string>();
  for (const [index, rawCollider] of value.collision.entries()) {
    if (!isRecord(rawCollider)) throw new Error(`Asset ${value.id} collision ${index} must be an object`);
    if (typeof rawCollider.id !== 'string' || !rawCollider.id.trim() || colliderIds.has(rawCollider.id)) {
      throw new Error(`Asset ${value.id} has an invalid or duplicate collision id at index ${index}`);
    }
    colliderIds.add(rawCollider.id);
    const center = readVector(rawCollider.center, `Asset ${value.id} collision ${rawCollider.id} center`);
    const size = readVector(rawCollider.size, `Asset ${value.id} collision ${rawCollider.id} size`);
    if (size.some((component) => component <= 0)) {
      throw new Error(`Asset ${value.id} collision ${rawCollider.id} size must be positive`);
    }
    for (let axis = 0; axis < 3; axis += 1) {
      const halfSize = (size[axis] ?? 0) / 2;
      const position = center[axis] ?? 0;
      if (position - halfSize < (bounds.min[axis] ?? 0) - 1e-6 || position + halfSize > (bounds.max[axis] ?? 0) + 1e-6) {
        throw new Error(`Asset ${value.id} collision ${rawCollider.id} extends outside declared bounds`);
      }
    }
  }

  if (!isRecord(value.lodFactories)) throw new Error(`Asset ${value.id} needs close and far LOD factories`);
  const factoryKeys = Object.keys(value.lodFactories).sort();
  const expectedKeys = [...ASSET_LOD_TIERS].sort();
  if (factoryKeys.length !== expectedKeys.length || factoryKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`Asset ${value.id} must define exactly two LOD factories: close and far`);
  }
  for (const tier of ASSET_LOD_TIERS) {
    if (typeof value.lodFactories[tier] !== 'function') {
      throw new Error(`Asset ${value.id} is missing its ${tier} LOD factory`);
    }
  }
}

export function freezeAssetDefinition(definition: AssetDefinition): AssetDefinition {
  return Object.freeze({
    ...definition,
    bounds: freezeBounds(definition.bounds),
    collision: Object.freeze(definition.collision.map((item) => Object.freeze({
      id: item.id,
      center: Object.freeze([...item.center]) as Vector3Tuple,
      size: Object.freeze([...item.size]) as Vector3Tuple,
    }))),
    lodFactories: Object.freeze({ ...definition.lodFactories }),
  });
}

export function createGeneratedAsset(definitionValue: unknown): GeneratedAsset {
  validateAssetDefinition(definitionValue);
  const definition = definitionValue;
  const lods = {} as Record<AssetLodTier, Object3D>;
  try {
    for (const tier of ASSET_LOD_TIERS) {
      const root = definition.lodFactories[tier]();
      if (!(root instanceof Object3D)) throw new Error(`Asset ${definition.id} ${tier} LOD factory must return an Object3D`);
      lods[tier] = root;
    }
  } catch (error) {
    disposeRoots(Object.values(lods));
    throw error;
  }

  let disposed = false;
  const bounds = freezeBounds(definition.bounds);
  const collision = Object.freeze(definition.collision.map((item) => Object.freeze({
    id: item.id,
    center: Object.freeze([...item.center]) as Vector3Tuple,
    size: Object.freeze([...item.size]) as Vector3Tuple,
  })));
  return Object.freeze({
    id: definition.id,
    displayName: definition.displayName,
    category: definition.category,
    bounds,
    collision,
    lods: Object.freeze(lods),
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeRoots(Object.values(lods));
    },
  });
}

function readBounds(value: unknown, label: string): AssetBounds {
  if (!isRecord(value)) throw new Error(`${label} must provide min and max vectors`);
  const min = readVector(value.min, `${label} min`);
  const max = readVector(value.max, `${label} max`);
  for (let axis = 0; axis < 3; axis += 1) {
    if ((min[axis] ?? 0) >= (max[axis] ?? 0)) throw new Error(`${label} min must be below max on every axis`);
  }
  return { min, max };
}

function readVector(value: unknown, label: string): Vector3Tuple {
  if (!Array.isArray(value) || value.length !== 3 || value.some((component) => typeof component !== 'number' || !Number.isFinite(component))) {
    throw new Error(`${label} must be a finite [x, y, z] vector`);
  }
  return [value[0] as number, value[1] as number, value[2] as number];
}

function freezeBounds(bounds: AssetBounds): AssetBounds {
  return Object.freeze({
    min: Object.freeze([...bounds.min]) as Vector3Tuple,
    max: Object.freeze([...bounds.max]) as Vector3Tuple,
  });
}

function disposeRoots(roots: readonly Object3D[]): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  for (const root of roots) {
    root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    root.removeFromParent();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Utility for tests and editor tooling that need to inspect the authored bounds as a Three.js box. */
export function toThreeBox(bounds: AssetBounds): Box3 {
  return new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max));
}

/** A minimal root helper shared by simple generated content. */
export function createAssetRoot(name: string): Group {
  const group = new Group();
  group.name = name;
  return group;
}
