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

  resetForRespawn(): void {
    if (this.disposed) return;
    this.recoil = 0;
    this.flashRemaining = 0;
    this.reloadRemaining = 0;
    this.rig.muzzleFlash.visible = false;
    this.rig.magazine.position.copy(this.baseMagazinePosition);
    this.rig.root.position.copy(this.basePosition);
    this.rig.root.rotation.copy(this.baseRotation);
  }

  setVisible(visible: boolean): void {
    if (this.disposed) return;
    this.rig.root.visible = visible;
  }

  update(deltaSeconds: number): void {
    if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.recoil = Math.max(0, this.recoil - deltaSeconds * 11);
    this.flashRemaining = Math.max(0, this.flashRemaining - deltaSeconds);
    this.rig.muzzleFlash.visible = this.flashRemaining > 0;

    let reloadDip = 0;
    let reloadRoll = 0;
    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
      const progress = 1 - this.reloadRemaining / this.reloadDuration;
      const drop = smoothstep(Math.min(1, progress / 0.22));
      const insert = smoothstep(Math.min(1, Math.max(0, (progress - 0.56) / 0.22)));
      const magazineOffset = 0.22 * (drop - insert);
      const magazineShift = 0.055 * (drop - insert);
      this.rig.magazine.position.set(
        this.baseMagazinePosition.x + magazineShift,
        this.baseMagazinePosition.y - magazineOffset,
        this.baseMagazinePosition.z + 0.03 * (drop - insert),
      );
      reloadDip = 0.025 * Math.sin(Math.PI * progress);
      reloadRoll = 0.12 * Math.sin(Math.PI * progress);
    } else {
      this.rig.magazine.position.copy(this.baseMagazinePosition);
    }

    this.rig.root.position.set(
      this.basePosition.x,
      this.basePosition.y + 0.012 * this.recoil - reloadDip,
      this.basePosition.z + 0.065 * this.recoil,
    );
    this.rig.root.rotation.set(
      this.baseRotation.x + 0.045 * this.recoil,
      this.baseRotation.y,
      this.baseRotation.z + reloadRoll,
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.camera.remove(this.rig.root);
    disposeObjectResources(this.rig.root);
  }
}

function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
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

  setVisible(visible: boolean): void {
    if (this.disposed) return;
    this.trajectory.visible = visible;
    for (const projectile of this.projectileMeshes) projectile.visible = visible;
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
