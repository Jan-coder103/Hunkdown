import {
  Group,
  BoxGeometry,
  CylinderGeometry,
  TorusGeometry,
  MeshBasicMaterial,
  BufferGeometry,
  Camera,
  Quaternion,
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
  private readonly aimPosition: Vector3;
  private readonly hipQuaternion: Quaternion;
  private readonly aimQuaternion = new Quaternion();
  private aiming = false;
  private aimBlend = 0;
  private recoil = 0;
  private flashRemaining = 0;
  private reloadRemaining = 0;
  private reloadDuration = 0;
  private readonly hands: { primary: Mesh; support: Mesh } | null = null;
  private readonly supportPosition = new Vector3();
  private readonly magazineGripPosition = new Vector3();
  private disposed = false;

  constructor(private readonly camera: Camera, private readonly rig: WeaponModelRig, private readonly reloadSeconds: number) {
    this.basePosition = this.rig.root.position.clone();
    this.baseRotation = this.rig.root.rotation.clone();
    this.baseMagazinePosition = this.rig.magazine.position.clone();
    this.hipQuaternion = this.rig.root.quaternion.clone();
    const sightPosition = this.rig.sight?.position.clone() ?? new Vector3(0, 0.235, 0);
    this.aimPosition = sightPosition.multiply(this.rig.root.scale).negate();
    this.aimPosition.z -= 0.65;
    if (rig.grips) {
      const geometry = new SphereGeometry(0.075, 10, 8);
      const material = new MeshStandardMaterial({ color: '#f4c64f', roughness: 0.85, flatShading: true });
      const primary = new Mesh(geometry, material);
      const support = new Mesh(geometry, material);
      primary.name = 'primary sphere hand';
      support.name = 'support sphere hand';
      this.hands = { primary, support };
      rig.root.add(primary, support);
      this.updateHands(0);
    }
    this.camera.add(this.rig.root);
  }

  setAiming(aiming: boolean): void {
    if (!this.disposed) this.aiming = aiming;
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
    this.aiming = false;
    this.aimBlend = 0;
    if (this.rig.reticle) this.rig.reticle.visible = false;
    this.recoil = 0;
    this.flashRemaining = 0;
    this.reloadRemaining = 0;
    this.rig.muzzleFlash.visible = false;
    this.rig.magazine.position.copy(this.baseMagazinePosition);
    this.rig.root.position.copy(this.basePosition);
    this.rig.root.rotation.copy(this.baseRotation);
    this.updateHands(0);
  }

  setVisible(visible: boolean): void {
    if (this.disposed) return;
    this.rig.root.visible = visible;
  }

  update(deltaSeconds: number): void {
    if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const targetAim = this.aiming && this.reloadRemaining <= 0 ? 1 : 0;
    this.aimBlend += (targetAim - this.aimBlend) * (1 - Math.exp(-18 * deltaSeconds));
    if (Math.abs(targetAim - this.aimBlend) < 0.001) this.aimBlend = targetAim;
    if (this.rig.reticle) this.rig.reticle.visible = this.aimBlend > 0.95 && this.reloadRemaining <= 0;
    this.recoil = Math.max(0, this.recoil - deltaSeconds * 11);
    this.flashRemaining = Math.max(0, this.flashRemaining - deltaSeconds);
    this.rig.muzzleFlash.visible = this.flashRemaining > 0;

    let reloadDip = 0;
    let reloadRoll = 0;
    let handBlend = 0;
    if (this.reloadRemaining > 0) {
      this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
      const progress = 1 - this.reloadRemaining / this.reloadDuration;
      const drop = smoothstep((progress - 0.12) / 0.2);
      const insert = smoothstep(Math.min(1, Math.max(0, (progress - 0.56) / 0.22)));
      const travel = this.rig.reloadTravel ?? [0.055, -0.22, 0.03];
      const extraction = drop - insert;
      handBlend = smoothstep(progress / 0.12) * (1 - smoothstep((progress - 0.82) / 0.16));
      this.rig.magazine.position.set(
        this.baseMagazinePosition.x + travel[0] * extraction,
        this.baseMagazinePosition.y + travel[1] * extraction,
        this.baseMagazinePosition.z + travel[2] * extraction,
      );
      reloadDip = 0.025 * Math.sin(Math.PI * progress);
      reloadRoll = 0.12 * Math.sin(Math.PI * progress);
    } else {
      this.rig.magazine.position.copy(this.baseMagazinePosition);
    }

    this.rig.root.position.copy(this.basePosition).lerp(this.aimPosition, this.aimBlend);
    this.rig.root.position.y += 0.012 * this.recoil - reloadDip;
    this.rig.root.position.z += 0.065 * this.recoil;
    this.rig.root.quaternion.copy(this.hipQuaternion).slerp(this.aimQuaternion, this.aimBlend);
    this.rig.root.rotation.x += 0.045 * this.recoil;
    this.rig.root.rotation.z += reloadRoll;
    this.updateHands(handBlend);
  }

  private updateHands(magazineBlend: number): void {
    const grips = this.rig.grips;
    if (!this.hands || !grips) return;
    const localPosition = (anchor: Object3D, target: Vector3) => {
      anchor.getWorldPosition(target);
      this.rig.root.worldToLocal(target);
    };
    localPosition(grips.primary, this.hands.primary.position);
    localPosition(grips.support, this.supportPosition);
    this.hands.support.position.copy(this.supportPosition);
    if (grips.magazine && magazineBlend > 0) {
      localPosition(grips.magazine, this.magazineGripPosition);
      this.hands.support.position.lerp(this.magazineGripPosition, magazineBlend);
    }
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
  private readonly projectileMeshes: Group[] = [];
  private readonly blasts: { root: Group; age: number }[] = [];
  private disposed = false;

  showExplosion(position: Vector3): void {
    if (this.disposed) return;
    const root = new Group();
    root.name = 'cartoon grenade explosion';
    root.position.copy(position);
    for (let i = 0; i < 12; i++) {
      const puff = new Mesh(new SphereGeometry(0.45, 7, 5), new MeshBasicMaterial({ color: i < 5 ? '#ffe681' : i < 9 ? '#ff974a' : '#a39f9e', transparent: true, depthWrite: false }));
      const angle = i * 2.4;
      puff.position.set(Math.cos(angle) * 0.55, 0.4 + (i % 3) * 0.35, Math.sin(angle) * 0.55);
      root.add(puff);
    }
    this.scene.add(root);
    this.blasts.push({ root, age: 0 });
    if (this.blasts.length > 12) {
      const oldest = this.blasts.shift()!;
      this.scene.remove(oldest.root);
      disposeObjectResources(oldest.root);
    }
  }

  updateEffects(deltaSeconds: number): void {
    if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    for (const grenade of this.projectileMeshes) { grenade.rotation.x += deltaSeconds * 5; grenade.rotation.z += deltaSeconds * 2; }
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const blast = this.blasts[i]!;
      blast.age += deltaSeconds;
      blast.root.scale.setScalar(0.3 + blast.age * 3.5);
      blast.root.position.y += deltaSeconds * 0.6;
      for (const puff of blast.root.children) ((puff as Mesh).material as MeshBasicMaterial).opacity = Math.max(0, 1 - blast.age / 0.85);
      if (blast.age >= 0.85) {
        this.scene.remove(blast.root);
        disposeObjectResources(blast.root);
        this.blasts.splice(i, 1);
      }
    }
  }

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
      const grenade = new Group();
      const body = new Mesh(new SphereGeometry(0.14, 10, 7), new MeshStandardMaterial({ color: '#668458', roughness: 0.82, flatShading: true }));
      body.scale.y = 1.25;
      const collar = new Mesh(new CylinderGeometry(0.065, 0.075, 0.07, 8), new MeshStandardMaterial({ color: '#d7b750' }));
      collar.position.y = 0.17;
      const lever = new Mesh(new BoxGeometry(0.04, 0.055, 0.23), new MeshStandardMaterial({ color: '#38484b', metalness: 0.6 }));
      lever.position.set(0.05, 0.21, 0.025);
      const pin = new Mesh(new TorusGeometry(0.05, 0.009, 4, 10), lever.material);
      pin.position.set(-0.055, 0.21, 0);
      grenade.add(body, collar, lever, pin);
      grenade.name = 'thrown grenade';
      this.projectileMeshes.push(grenade);
      this.scene.add(grenade);
    }
    while (this.projectileMeshes.length > positions.length) {
      const grenade = this.projectileMeshes.pop();
      if (!grenade) continue;
      this.scene.remove(grenade);
      disposeObjectResources(grenade);
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
    for (const blast of this.blasts) { this.scene.remove(blast.root); disposeObjectResources(blast.root); }
    this.blasts.length = 0;
    this.scene.remove(this.trajectory);
    this.trajectoryGeometry.dispose();
    this.trajectoryMaterial.dispose();
    for (const grenade of this.projectileMeshes) {
      this.scene.remove(grenade);
      disposeObjectResources(grenade);
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
