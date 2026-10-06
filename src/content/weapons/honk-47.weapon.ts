import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import type { WeaponModule } from '../../game/combat/weapon-types';

export const weaponDefinition = Object.freeze({
  id: 'honk-47',
  displayName: 'Honk-47',
  fireMode: 'automatic',
  magazineSize: 30,
  startingReserve: 120,
  reserveCapacity: 180,
  damage: 34,
  roundsPerMinute: 600,
  reloadSeconds: 1.8,
  range: 100,
  hipSpreadRadians: 0.024,
  aimedSpreadRadians: 0.006,
  recoilPitchRadians: 0.015,
  recoilYawRadians: 0.004,
} as const satisfies WeaponModule['weaponDefinition']);

type Honk47Model = Readonly<{
  root: Group;
  muzzleFlash: Mesh;
  magazine: Group;
}>;

/** Builds the detailed close-view Honk-47 from owned, code-generated geometry. */
export function createWeaponModel(): Honk47Model {
  const model = buildHonk47(true);
  model.root.position.set(0.36, -0.36, -1.05);
  model.root.scale.setScalar(0.72);
  model.root.rotation.set(-0.03, 0.62, -0.025);
  return model;
}

/** The asset viewer inspects the same rifle geometry used by the combat camera. */
export function createHonk47AssetLod(close: boolean): Group {
  const model = buildHonk47(close);
  model.root.scale.setScalar(0.72);
  model.muzzleFlash.visible = false;
  return model.root;
}

function buildHonk47(close: boolean): Honk47Model {
  const root = new Group();
  root.name = close ? 'Honk-47 — close LOD' : 'Honk-47 — far LOD';

  const receiverMaterial = new MeshStandardMaterial({ color: '#52675b', roughness: 0.68, metalness: 0.12 });
  const darkMaterial = new MeshStandardMaterial({ color: '#303d39', roughness: 0.75, metalness: 0.08 });
  const handguardMaterial = new MeshStandardMaterial({ color: '#40554b', roughness: 0.78, metalness: 0.08 });
  const stockMaterial = new MeshStandardMaterial({ color: '#9b7452', roughness: 0.9 });
  const accentMaterial = new MeshStandardMaterial({ color: '#d2b879', roughness: 0.55, metalness: 0.15 });
  const lensMaterial = new MeshStandardMaterial({ color: '#88bbb1', roughness: 0.32, metalness: 0.12 });

  const box = (
    name: string,
    size: readonly [number, number, number],
    material: MeshStandardMaterial,
    position: readonly [number, number, number],
    target = root,
  ): Mesh => {
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  };
  const cylinder = (
    name: string,
    radius: number,
    length: number,
    material: MeshStandardMaterial,
    position: readonly [number, number, number],
    target = root,
    radialSegments = 8,
  ): Mesh => {
    const mesh = new Mesh(new CylinderGeometry(radius, radius, length, radialSegments), material);
    mesh.name = name;
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  };

  box('upper receiver', [0.15, 0.115, 0.43], receiverMaterial, [0, 0.012, -0.015]);
  box('lower receiver', [0.14, 0.09, 0.31], handguardMaterial, [0, -0.085, 0.025]);
  box('buttstock', [0.13, 0.145, 0.27], stockMaterial, [0, -0.005, 0.29]);
  box('stock cheek rest', [0.12, 0.035, 0.2], darkMaterial, [0, 0.085, 0.27]);
  box('rubber stock pad', [0.14, 0.15, 0.035], darkMaterial, [0, -0.005, 0.44]);

  box('rifle handguard', [0.14, 0.145, 0.33], handguardMaterial, [0, 0.005, -0.36]);
  cylinder('rifle barrel', 0.025, 0.43, darkMaterial, [0, 0, -0.68]);
  cylinder('muzzle brake', 0.042, 0.075, accentMaterial, [0, 0, -0.93]);

  box('top accessory rail', [0.055, 0.027, 0.52], darkMaterial, [0, 0.122, -0.22]);
  if (close) {
    for (let index = 0; index < 7; index += 1) {
      box('rail tooth', [0.067, 0.012, 0.035], accentMaterial, [0, 0.142, -0.43 + index * 0.07]);
    }
    for (const side of [-1, 1]) {
      for (let index = 0; index < 5; index += 1) {
        box('handguard vent', [0.012, 0.026, 0.035], darkMaterial, [side * 0.073, 0.005, -0.47 + index * 0.065]);
      }
    }

    box('rear sight base', [0.07, 0.04, 0.055], darkMaterial, [0, 0.157, 0.035]);
    box('rear sight aperture', [0.035, 0.065, 0.035], accentMaterial, [0, 0.205, 0.035]);
    box('front sight base', [0.07, 0.04, 0.055], darkMaterial, [0, 0.157, -0.62]);
    box('front sight post', [0.035, 0.08, 0.035], accentMaterial, [0, 0.212, -0.62]);
    box('optic mount', [0.075, 0.035, 0.12], darkMaterial, [0, 0.165, -0.19]);
    cylinder('optic housing', 0.052, 0.12, receiverMaterial, [0, 0.222, -0.19], root, 10);
    cylinder('optic glass', 0.039, 0.008, lensMaterial, [0, 0.222, -0.257], root, 10);
    cylinder('optic rear glass', 0.039, 0.008, lensMaterial, [0, 0.222, -0.123], root, 10);

    box('ejection port', [0.014, 0.055, 0.12], darkMaterial, [0.083, 0.015, -0.02]);
    box('charging handle', [0.035, 0.035, 0.075], accentMaterial, [-0.093, 0.04, 0.055]);
    const selector = new Mesh(new SphereGeometry(0.027, 6, 4), accentMaterial);
    selector.name = 'fire selector';
    selector.position.set(0.087, -0.065, 0.06);
    selector.castShadow = true;
    root.add(selector);
    box('trigger', [0.025, 0.095, 0.024], accentMaterial, [0, -0.16, 0.055]).rotation.x = -0.18;

    const guard = new Mesh(new TorusGeometry(0.082, 0.012, 4, 8, Math.PI), darkMaterial);
    guard.name = 'trigger guard';
    guard.position.set(0, -0.155, 0.045);
    guard.rotation.z = Math.PI;
    guard.castShadow = true;
    root.add(guard);
  } else {
    box('low optic', [0.09, 0.11, 0.14], accentMaterial, [0, 0.2, -0.19]);
  }

  const grip = box('pistol grip', [0.105, 0.21, 0.12], stockMaterial, [0, -0.18, 0.09]);
  grip.rotation.x = 0.16;

  const magazine = new Group();
  magazine.name = 'magazine';
  magazine.position.set(0, -0.2, -0.04);
  root.add(magazine);
  box('magazine body', [0.12, 0.235, 0.14], darkMaterial, [0, 0, 0], magazine);
  box('magazine floorplate', [0.13, 0.025, 0.15], stockMaterial, [0, -0.125, 0], magazine);
  if (close) {
    for (const y of [-0.07, 0, 0.07]) {
      box('magazine groove', [0.124, 0.012, 0.008], receiverMaterial, [0, y, 0.074], magazine);
    }
  }

  if (close) {
    const slingMount = box('rear sling mount', [0.045, 0.06, 0.06], darkMaterial, [0, -0.015, 0.42]);
    slingMount.rotation.x = 0.25;
  }

  const muzzleFlash = new Mesh(
    new OctahedronGeometry(0.105, 0),
    new MeshStandardMaterial({ color: '#ffe5a1', emissive: '#ffad37', emissiveIntensity: 4, roughness: 0.3 }),
  );
  muzzleFlash.name = 'muzzle flash';
  muzzleFlash.position.set(0, 0, -0.99);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);

  return { root, muzzleFlash, magazine };
}

const weaponModule: WeaponModule = { weaponDefinition, createWeaponModel };
export default weaponModule;
