import {
  BufferGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
import {
  createFirstPersonChickenArms,
  createTacticalChickenModel,
  type ChickenArmsRig,
  type ChickenDetail,
  type ChickenModelRig,
  type ChickenTeam,
} from '../../content/assets/tactical-chicken.asset';

export type ChickenCharacterRepresentation = 'first-person' | 'third-person';

export type ChickenCharacterPose = Readonly<{
  movementSpeed?: number;
  sprinting?: boolean;
  crouched?: boolean;
  grounded?: boolean;
  aiming?: boolean;
  leanRadians?: number;
  dead?: boolean;
  deathImpulse?: Readonly<{ x: number; y: number; z: number }>;
}>;

/** Camera arms or a third-person body driven by presentation state, separate from gameplay simulation. */
export class ChickenCharacterView {
  readonly object = new Group();
  readonly firstPersonRig: ChickenArmsRig | null;
  readonly representation: ChickenCharacterRepresentation;
  private readonly thirdPersonRigs = new Map<ChickenDetail, ChickenModelRig>();
  private readonly team: ChickenTeam;
  private activeThirdPersonRig: ChickenModelRig | null = null;
  private activeDetail: ChickenDetail | null = null;
  private pose: ChickenCharacterPose = {};
  private elapsed = 0;
  private deathElapsed = 0;
  private damageRemaining = 0;
  private reloadRemaining = 0;
  private reloadDuration = 0;
  private disposed = false;

  constructor(
    parent: Object3D,
    team: ChickenTeam,
    representation: ChickenCharacterRepresentation,
    initialDetail: ChickenDetail = 'close',
  ) {
    this.team = team;
    this.representation = representation;
    this.object.name = `${representation} chicken character — ${team}`;
    if (representation === 'first-person') {
      this.firstPersonRig = createFirstPersonChickenArms(team);
      this.object.add(this.firstPersonRig.root);
    } else {
      this.firstPersonRig = null;
      this.activeThirdPersonRig = this.createThirdPersonRig(initialDetail);
      this.activeDetail = initialDetail;
      this.activeThirdPersonRig.root.visible = true;
    }
    parent.add(this.object);
  }

  get thirdPersonRig(): ChickenModelRig | null {
    return this.activeThirdPersonRig;
  }

  get detail(): ChickenDetail | null {
    return this.activeDetail;
  }

  get teamSide(): ChickenTeam {
    return this.team;
  }

  setPose(pose: ChickenCharacterPose): void {
    if (this.disposed) return;
    if (pose.dead === true && this.pose.dead !== true) this.deathElapsed = 0;
    if (pose.dead === false) this.deathElapsed = 0;
    this.pose = { ...this.pose, ...pose };
  }

  /** Brief feather flash and flinch hook for damage events. */
  triggerDamage(): void {
    if (this.disposed) return;
    this.damageRemaining = 0.24;
    this.damageMaterial.emissive.set('#cf554a');
    this.damageMaterial.emissiveIntensity = 0.85;
  }

  /** Starts the shared magazine-change beat used by the first- and third-person wings. */
  beginReload(durationSeconds = 1.8): void {
    if (this.disposed || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
    this.reloadDuration = durationSeconds;
    this.reloadRemaining = durationSeconds;
  }

  update(deltaSeconds: number): void {
    if (this.disposed || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    this.elapsed += deltaSeconds;
    if (this.pose.dead) this.deathElapsed = Math.min(1.2, this.deathElapsed + deltaSeconds);
    this.damageRemaining = Math.max(0, this.damageRemaining - deltaSeconds);
    this.reloadRemaining = Math.max(0, this.reloadRemaining - deltaSeconds);
    this.applyPose();
  }

  /** Selects one of the two authored render tiers; simulation state is unchanged. */
  setDetail(detail: ChickenDetail): void {
    if (this.disposed || this.representation !== 'third-person' || this.detail === detail) return;
    if (this.activeThirdPersonRig) this.activeThirdPersonRig.root.visible = false;
    this.activeThirdPersonRig = this.thirdPersonRigs.get(detail) ?? this.createThirdPersonRig(detail);
    this.activeDetail = detail;
    this.activeThirdPersonRig.root.visible = true;
    this.applyPose();
  }

  private createThirdPersonRig(detail: ChickenDetail): ChickenModelRig {
    const existing = this.thirdPersonRigs.get(detail);
    if (existing) return existing;
    const rig = createTacticalChickenModel(this.team, detail);
    rig.root.visible = false;
    this.object.add(rig.root);
    this.thirdPersonRigs.set(detail, rig);
    return rig;
  }

  private applyPose(): void {
    if (this.disposed) return;
    const damageMaterial = this.damageMaterial;
    if (this.damageRemaining > 0) {
      damageMaterial.emissive.set('#cf554a');
      damageMaterial.emissiveIntensity = 0.85;
    } else {
      damageMaterial.emissiveIntensity = 0;
    }
    const speed = clamp(Number.isFinite(this.pose.movementSpeed) ? this.pose.movementSpeed ?? 0 : 0, 0, 8);
    const moving = speed > 0.18;
    const dead = this.pose.dead ?? false;
    const crouched = this.pose.crouched ?? false;
    const airborne = !(this.pose.grounded ?? true);
    const aiming = this.pose.aiming ?? false;
    const phase = this.elapsed * ((this.pose.sprinting ?? speed > 5.8) ? 16 : 11);
    const stride = Math.sin(phase);
    const flap = airborne ? Math.sin(this.elapsed * 19) : moving ? Math.sin(phase * 1.25) * 0.12 : 0;
    const reloadProgress = this.reloadDuration > 0 && this.reloadRemaining > 0
      ? 1 - this.reloadRemaining / this.reloadDuration
      : 0;
    const reloadDip = this.reloadRemaining > 0 ? Math.sin(Math.PI * clamp(reloadProgress, 0, 1)) : 0;

    if (this.activeThirdPersonRig) {
      const rig = this.activeThirdPersonRig;
      const deathProgress = dead ? Math.min(1, this.deathElapsed / 0.8) : 0;
      const deathImpulse = this.pose.deathImpulse ?? { x: 0.6, y: 0.2, z: -0.6 };
      const impulseLength = Math.max(0.001, Math.hypot(deathImpulse.x, deathImpulse.y, deathImpulse.z));
      const flop = deathProgress * (0.48 + Math.min(0.5, impulseLength * 0.035));
      const bounce = dead ? Math.sin(this.deathElapsed * 13) * 0.11 * Math.exp(-4.2 * this.deathElapsed) : 0;
      rig.root.position.y = dead ? -0.08 + bounce : (moving ? Math.abs(stride) * 0.025 : 0) + (airborne ? 0.045 : 0);
      rig.root.rotation.x = dead ? (deathImpulse.z / impulseLength) * flop : 0;
      rig.root.rotation.y = dead ? Math.sin(this.deathElapsed * 19) * 0.16 * Math.exp(-3.8 * this.deathElapsed) : 0;
      rig.root.rotation.z = dead ? (-deathImpulse.x / impulseLength) * flop : clamp(this.pose.leanRadians ?? 0, -0.28, 0.28);
      rig.body.rotation.x = dead ? -0.48 : aiming ? -0.12 : crouched ? 0.14 : 0;
      rig.body.rotation.z = dead ? 0.52 : moving ? stride * 0.045 : 0;
      rig.head.rotation.x = dead ? 0.36 : aiming ? -0.08 : 0;
      rig.head.rotation.z = dead ? -0.38 : moving ? -stride * 0.025 : 0;
      const wingSpan = dead ? 0.92 : airborne ? 0.46 + flap * 0.32 : aiming ? 0.3 : moving ? 0.1 : 0;
      rig.leftWing.rotation.z = -wingSpan;
      rig.rightWing.rotation.z = wingSpan;
      rig.leftWing.rotation.x = dead ? -0.35 : aiming ? -0.46 : airborne ? -Math.abs(flap) * 0.35 : 0;
      rig.rightWing.rotation.x = dead ? -0.35 : aiming ? -0.46 : airborne ? -Math.abs(flap) * 0.35 : 0;
      rig.leftLeg.rotation.x = dead ? -0.25 : moving ? stride * 0.42 : 0;
      rig.rightLeg.rotation.x = dead ? 0.2 : moving ? -stride * 0.42 : 0;
      rig.leftLeg.rotation.z = dead ? -0.24 : 0;
      rig.rightLeg.rotation.z = dead ? 0.22 : 0;
      if (this.reloadRemaining > 0) {
        rig.leftWing.rotation.x -= reloadDip * 0.35;
      }
    } else if (this.firstPersonRig) {
      const rig = this.firstPersonRig;
      rig.root.position.set(0, (moving ? Math.abs(stride) * 0.018 : 0) - (crouched ? 0.035 : 0) + (aiming ? 0.012 : 0) - reloadDip * 0.035, -0.32 + reloadDip * 0.035);
      rig.root.rotation.set(aiming ? -0.035 : 0, 0, this.reloadRemaining > 0 ? Math.sin(Math.PI * reloadProgress) * 0.075 : 0);
      const wingSwing = airborne ? 0.28 + flap * 0.16 : moving ? stride * 0.045 : 0;
      rig.leftWing.rotation.set(aiming ? -0.12 : -wingSwing, 0, airborne ? -Math.abs(flap) * 0.16 : 0);
      rig.rightWing.rotation.set(aiming ? -0.16 : wingSwing, 0, airborne ? Math.abs(flap) * 0.16 : 0);
      if (this.reloadRemaining > 0) rig.leftWing.rotation.z -= reloadDip * 0.12;
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.object.removeFromParent();
    disposeObjectResources(this.object);
  }

  private get damageMaterial(): MeshStandardMaterial {
    const material = this.thirdPersonRig?.featherMaterial ?? this.firstPersonRig?.featherMaterial;
    if (!material) throw new Error('Chicken character has no damageable feather material');
    return material;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function disposeObjectResources(object: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
