import { Box3, Box3Helper, Color, Group, Scene, Vector3 } from 'three';
import { createAsset } from '../../content/assets/registry';
import { isAssetLodTier, type AssetLodTier, type GeneratedAsset } from '../../content/assets/asset-types';

export type AssetPreviewLoadResult =
  | Readonly<{ ok: true; asset: GeneratedAsset }>
  | Readonly<{ ok: false; error: string }>;

export type AssetCreator = (id: string) => GeneratedAsset;

/** Owns the selected generated asset and inspection helpers in the viewer scene. */
export class AssetPreview {
  private currentAsset: GeneratedAsset | null = null;
  private currentTier: AssetLodTier = 'close';
  private helperGroup: Group | null = null;
  private boundsVisible = true;
  private disposed = false;

  constructor(private readonly scene: Scene, private readonly create: AssetCreator = createAsset) {}

  get asset(): GeneratedAsset | null {
    return this.currentAsset;
  }

  get tier(): AssetLodTier {
    return this.currentTier;
  }

  load(id: string): AssetPreviewLoadResult {
    this.clearCurrent();
    if (this.disposed) return { ok: false, error: 'Asset viewer has been disposed' };
    try {
      this.currentAsset = this.create(id);
      this.scene.add(this.currentAsset.lods[this.currentTier]);
      this.createBoundsHelpers(this.currentAsset);
      return { ok: true, asset: this.currentAsset };
    } catch (error) {
      this.clearCurrent();
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  selectLod(tier: AssetLodTier): void {
    if (this.disposed) return;
    if (!isAssetLodTier(tier)) throw new Error(`Unsupported asset LOD tier: ${String(tier)}`);
    if (tier === this.currentTier) return;
    if (this.currentAsset) {
      this.scene.remove(this.currentAsset.lods[this.currentTier]);
      this.currentTier = tier;
      this.scene.add(this.currentAsset.lods[this.currentTier]);
    } else {
      this.currentTier = tier;
    }
  }

  setBoundsVisible(visible: boolean): void {
    this.boundsVisible = visible;
    if (this.helperGroup) this.helperGroup.visible = visible;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearCurrent();
  }

  private createBoundsHelpers(asset: GeneratedAsset): void {
    const helpers = new Group();
    helpers.name = 'asset collision and bounds guides';
    const bounds = new Box3(new Vector3(...asset.bounds.min), new Vector3(...asset.bounds.max));
    const boundsHelper = new Box3Helper(bounds, new Color('#fff4c7'));
    boundsHelper.name = 'declared asset bounds';
    helpers.add(boundsHelper);
    for (const collider of asset.collision) {
      const center = new Vector3(...collider.center);
      const halfSize = new Vector3(...collider.size).multiplyScalar(0.5);
      const helper = new Box3Helper(new Box3(center.clone().sub(halfSize), center.clone().add(halfSize)), new Color('#71d8c7'));
      helper.name = `collision: ${collider.id}`;
      helpers.add(helper);
    }
    helpers.visible = this.boundsVisible;
    this.helperGroup = helpers;
    this.scene.add(helpers);
  }

  private clearCurrent(): void {
    if (this.currentAsset) {
      this.scene.remove(this.currentAsset.lods[this.currentTier]);
      this.currentAsset.dispose();
      this.currentAsset = null;
    }
    if (this.helperGroup) {
      this.scene.remove(this.helperGroup);
      disposeHelperGroup(this.helperGroup);
      this.helperGroup = null;
    }
  }
}

function disposeHelperGroup(group: Group): void {
  const geometries = new Set<import('three').BufferGeometry>();
  const materials = new Set<import('three').Material>();
  group.traverse((object) => {
    if (!(object instanceof Box3Helper)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
