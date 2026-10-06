import {
  BufferGeometry,
  Camera,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import type { WeaponModelRig } from './weapon-types';

/** Camera-mounted, code-generated close weapon with bounded fire and reload animation. */
export class WeaponView {
  private readonly basePosition: Vector3;
  private readonly baseRotation: import('three').Euler;
  private readonly baseMagazinePosition: Vector3;
  private recoil = 0;
  private flashRemaining = 0;
  private reloadRemaining = 0;
  private reloadDuration = 0;
  private disposed = false;

  constructor(private readonly camera: Camera, private readonly rig: WeaponModelRig, private readonly reloadSeconds: number) {
    this.basePosition = this.rig.root.position.clone();
    this.baseRotation = this.rig.root.rotation.clone();
    this.baseMagazinePosition = this.rig.magazine.position.clone();
    this.camera.add(this.rig.root);
  }

  fire(): void {
    if (this.disposed) return;
    this.recoil = 1;
    this.flashRemaining = 0.055;
    this.rig.muzzleFlash.visible = true;
  }

  beginReload(): void {
    if (this.disposed) return;
    this.reloadDuration = this.reloadSeconds;
    this.reloadRemaining = this.reloadSeconds;
  }

  update(deltaSeconds: number): void {
    if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.recoil = Math.max(0, this.recoil - deltaSeconds * 11);
    this.rig.root.position.set(
      this.basePosition.x,
      this.basePosition.y - 0.012 * this.recoil,
      this.basePosition.z + 0.065 * this.recoil,
    );
    this.rig.root.rotation.set(
      this.baseRotation.x + 0.045 * this.recoil,
      this.baseRotation.y,
      this.baseRotation.z,
    );
    this.flashRemaining = Math.max(0, this.flashRemaining - deltaSeconds);
    this.rig.muzzleFlash.visible = this.flashRemaining > 0;

    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
      const progress = 1 - this.reloadRemaining / this.reloadDuration;
      const dip = Math.sin(Math.PI * progress);
      this.rig.magazine.position.set(
        this.baseMagazinePosition.x,
        this.baseMagazinePosition.y - 0.18 * dip,
        this.baseMagazinePosition.z + 0.02 * dip,
      );
      this.rig.root.rotation.z = this.baseRotation.z + 0.2 * dip;
    } else {
      this.rig.magazine.position.copy(this.baseMagazinePosition);
      this.rig.root.rotation.z = this.baseRotation.z;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.camera.remove(this.rig.root);
    disposeObjectResources(this.rig.root);
  }
}

/** Scene-owned grenade spheres and a visible ballistic preview while grenade mode is equipped. */
export class GrenadeView {
  private readonly trajectoryGeometry = new BufferGeometry();
  private readonly trajectoryMaterial = new LineBasicMaterial({ color: '#e9bc68', transparent: true, opacity: 0.82 });
  private readonly trajectory = new Line(this.trajectoryGeometry, this.trajectoryMaterial);
  private readonly projectileMeshes: Mesh[] = [];
  private disposed = false;

  constructor(private readonly scene: import('three').Scene) {
    this.trajectory.name = 'grenade trajectory';
    this.trajectory.visible = false;
    scene.add(this.trajectory);
  }

  updateTrajectory(points: readonly import('three').Vector3[], visible: boolean): void {
    if (this.disposed) return;
    if (!visible || points.length < 2) {
      this.trajectory.visible = false;
      return;
    }
    this.trajectoryGeometry.setFromPoints(points.map((point) => point));
    this.trajectory.visible = true;
  }

  updateProjectiles(positions: readonly import('three').Vector3[]): void {
    if (this.disposed) return;
    while (this.projectileMeshes.length < positions.length) {
      const grenade = new Mesh(
        new SphereGeometry(0.14, 8, 6),
        new MeshStandardMaterial({ color: '#69785a', roughness: 0.82 }),
      );
      grenade.name = 'thrown grenade';
      this.projectileMeshes.push(grenade);
      this.scene.add(grenade);
    }
    while (this.projectileMeshes.length > positions.length) {
      const grenade = this.projectileMeshes.pop();
      if (!grenade) continue;
      this.scene.remove(grenade);
      grenade.geometry.dispose();
      disposeMaterial(grenade.material);
    }
    for (let i = 0; i < positions.length; i += 1) {
      const position = positions[i];
      const grenade = this.projectileMeshes[i];
      if (position && grenade) grenade.position.copy(position);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.scene.remove(this.trajectory);
    this.trajectoryGeometry.dispose();
    this.trajectoryMaterial.dispose();
    for (const grenade of this.projectileMeshes) {
      this.scene.remove(grenade);
      grenade.geometry.dispose();
      disposeMaterial(grenade.material);
    }
    this.projectileMeshes.length = 0;
  }
}

function disposeObjectResources(object: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  object.traverse((child) => {
    if (child instanceof Mesh) {
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

function disposeMaterial(material: Material | Material[]): void {
  for (const item of Array.isArray(material) ? material : [material]) item.dispose();
}
