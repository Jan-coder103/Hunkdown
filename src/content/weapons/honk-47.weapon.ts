import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
  CircleGeometry,
  DoubleSide,
  ExtrudeGeometry,
  MeshBasicMaterial,
  Shape,
  TorusGeometry,
} from 'three';
import type { WeaponModule, WeaponModelRig } from '../../game/combat/weapon-types';

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

/** Camera-mounted close model; the sight anchor defines its actual optical axis. */
export function createWeaponModel(): WeaponModelRig {
  const model = buildHonk47(true);
  model.root.position.set(0.32, -0.29, -0.82);
  model.root.scale.setScalar(0.72);
  model.root.rotation.set(-0.025, 0.24, -0.035);
  return model;
}

export function createHonk47AssetLod(close: boolean): Group {
  const model = buildHonk47(close);
  model.root.scale.setScalar(0.72);
  return model.root;
}

function buildHonk47(close: boolean): WeaponModelRig {
  const root = new Group();
  root.name = close ? 'Honk-47 — close LOD' : 'Honk-47 — far LOD';
  const steel = new MeshStandardMaterial({ color: '#363d40', roughness: 0.6, metalness: 0.45 });
  const polymer = new MeshStandardMaterial({ color: '#242b2d', roughness: 0.88, metalness: 0.08 });
  const edge = new MeshStandardMaterial({ color: '#525b60', roughness: 0.52, metalness: 0.65 });
  const black = new MeshStandardMaterial({ color: '#101719', roughness: 0.85 });
  const silver = new MeshStandardMaterial({ color: '#a4afb2', roughness: 0.4, metalness: 0.8 });
  const box = (name: string, size: readonly [number, number, number], material: MeshStandardMaterial,
    position: readonly [number, number, number], target = root): Mesh => {
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  };
  const cylinder = (name: string, radius: number, length: number, material: MeshStandardMaterial,
    position: readonly [number, number, number], segments = close ? 12 : 6): Mesh => {
    const mesh = new Mesh(new CylinderGeometry(radius, radius, length, segments), material);
    mesh.name = name;
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(...position);
    root.add(mesh);
    return mesh;
  };
  const ring = (name: string, radius: number, thickness: number, z: number, y = 0, material = steel): Mesh => {
    const mesh = new Mesh(new TorusGeometry(radius, thickness, 4, close ? 16 : 8), material);
    mesh.name = name;
    mesh.position.set(0, y, z);
    root.add(mesh);
    return mesh;
  };

  // Layered stamped receiver with a sloping dust cover and exposed controls.
  box('upper receiver', [0.145, 0.11, 0.43], steel, [0, 0.012, 0]);
  box('lower receiver', [0.13, 0.095, 0.30], polymer, [0, -0.087, 0.025]);
  const cover = box('faceted dust cover', [0.13, 0.045, 0.36], steel, [0, 0.082, 0.015]);
  cover.rotation.x = -0.025;
  box('receiver rear trunnion', [0.155, 0.13, 0.07], polymer, [0, 0.006, 0.215]);
  box('magazine well', [0.145, 0.035, 0.14], steel, [0, -0.145, -0.085]);

  cylinder('stock extension tube', 0.029, 0.32, edge, [0, 0.025, 0.40]);
  box('stock lower brace', [0.036, 0.03, 0.29], steel, [0, -0.032, 0.40]);
  box('buttstock', [0.095, 0.15, 0.075], polymer, [0, -0.025, 0.555]);
  box('rubber stock pad', [0.104, 0.17, 0.025], black, [0, -0.025, 0.602]);
  box('stock cheek rest', [0.078, 0.035, 0.16], polymer, [0, 0.064, 0.47]);

  box('rifle handguard', [0.125, 0.115, 0.39], polymer, [0, 0, -0.41]);
  box('handguard upper bevel', [0.095, 0.026, 0.36], steel, [0, 0.07, -0.41]);
  box('handguard end collar', [0.14, 0.13, 0.045], steel, [0, 0, -0.61]);
  cylinder('rifle barrel', 0.023, 0.25, steel, [0, 0, -0.745]);
  cylinder('suppressor body', 0.045, 0.27, polymer, [0, 0, -0.99]);
  ring('suppressor rear collar', 0.044, 0.006, -0.862);
  ring('muzzle brake', 0.035, 0.009, -1.13);
  cylinder('muzzle bore', 0.026, 0.003, black, [0, 0, -1.141]);

  box('top accessory rail', [0.055, 0.018, 0.46], black, [0, 0.117, -0.13]);
  box('optic mount', [0.083, 0.045, 0.115], polymer, [0, 0.151, -0.08]);
  box('optic mount clamp', [0.10, 0.022, 0.055], edge, [0, 0.143, -0.08]);
  // Open tube and annular rims: no opaque primitive crosses the sight line.
  const housing = new Mesh(new CylinderGeometry(0.064, 0.064, 0.14, close ? 16 : 8, 1, true),
    new MeshStandardMaterial({ color: '#242b2d', roughness: 0.64, metalness: 0.35, side: DoubleSide }));
  housing.name = 'optic housing';
  housing.rotation.x = Math.PI / 2;
  housing.position.set(0, 0.235, -0.08);
  root.add(housing);
  ring('optic rear rim', 0.058, 0.009, -0.008, 0.235);
  ring('optic front rim', 0.058, 0.009, -0.152, 0.235);
  const sight = new Group();
  sight.name = 'red-dot sight axis';
  sight.position.set(0, 0.235, -0.008);
  root.add(sight);
  const reticle = new Mesh(new CircleGeometry(0.003, 12), new MeshBasicMaterial({ color: '#ff3838', toneMapped: false }));
  reticle.name = 'red-dot reticle';
  reticle.position.set(0, 0.235, -0.15);
  reticle.visible = false;
  root.add(reticle);
  if (close) {
    const glass = new Mesh(new CircleGeometry(0.049, 16), new MeshBasicMaterial({ color: '#9bc9cb', transparent: true, opacity: 0.09, depthWrite: false, side: DoubleSide }));
    glass.name = 'optic glass';
    glass.position.set(0, 0.235, -0.151);
    root.add(glass);
    const dial = cylinder('optic windage dial', 0.024, 0.026, polymer, [0.076, 0.235, -0.072]);
    dial.rotation.set(0, 0, Math.PI / 2);
    box('optic elevation turret', [0.034, 0.021, 0.038], black, [0, 0.308, -0.075]);
    for (let i = 0; i < 12; i += 1) box('rail tooth', [0.065, 0.012, 0.016], edge, [0, 0.13, -0.34 + i * 0.038]);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i += 1) {
        box('handguard vent', [0.004, 0.02, 0.037], black, [side * 0.064, 0.015, -0.55 + i * 0.054]);
        box('handguard lower rib', [0.005, 0.018, 0.009], edge, [side * 0.065, -0.042, -0.55 + i * 0.054]);
      }
    }
    box('ejection port recess', [0.004, 0.044, 0.12], black, [0.074, 0.024, -0.035]);
    box('exposed bolt', [0.006, 0.032, 0.075], silver, [0.077, 0.023, -0.02]);
    box('charging handle', [0.044, 0.018, 0.04], steel, [0.096, 0.037, 0.023]);
    const selector = box('fire selector', [0.009, 0.012, 0.055], edge, [0.071, -0.07, 0.08]);
    selector.rotation.x = -0.22;
    for (const z of [-0.13, 0.14]) {
      const pin = cylinder('receiver pin', 0.008, 0.15, edge, [0, -0.06, z], 8);
      pin.rotation.set(0, 0, Math.PI / 2);
    }
    box('front sight base', [0.065, 0.023, 0.04], steel, [0, 0.086, -0.65]);
    box('front sight post', [0.012, 0.042, 0.014], black, [0, 0.117, -0.65]);
    for (const side of [-1, 1]) box('front sight guard', [0.014, 0.06, 0.027], steel, [side * 0.032, 0.125, -0.65]);
    ring('rear sling mount', 0.022, 0.005, 0.57, -0.065);
  }
  const grip = box('pistol grip', [0.09, 0.20, 0.10], polymer, [0, -0.22, 0.13]);
  grip.rotation.x = -0.27;
  box('trigger guard bottom', [0.04, 0.016, 0.14], steel, [0, -0.205, 0.014]);
  box('trigger guard front', [0.04, 0.065, 0.016], steel, [0, -0.17, -0.053]);
  const trigger = box('trigger', [0.014, 0.047, 0.014], black, [0, -0.168, 0.045]);
  trigger.rotation.x = -0.23;
  if (close) for (let i = 0; i < 4; i += 1) box('grip texture rib', [0.093, 0.008, 0.076], steel, [0, -0.18 - i * 0.03, 0.135 + i * 0.008]);

  const magazine = new Group();
  magazine.name = 'magazine';
  magazine.position.set(0, -0.18, -0.08);
  root.add(magazine);
  // One continuous bent profile instead of disconnected box segments.
  const profile = new Shape();
  profile.moveTo(-0.065, 0.04);
  profile.lineTo(0.07, 0.04);
  profile.lineTo(0.09, -0.13);
  profile.lineTo(0.15, -0.29);
  profile.lineTo(0.205, -0.40);
  profile.lineTo(0.095, -0.445);
  profile.lineTo(0.035, -0.32);
  profile.lineTo(-0.035, -0.14);
  profile.closePath();
  const magazineMesh = new Mesh(new ExtrudeGeometry(profile, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.004, bevelSegments: 1, steps: 1 }), polymer);
  magazineMesh.name = 'curved magazine body';
  magazineMesh.rotation.y = Math.PI / 2;
  magazineMesh.position.x = -0.045;
  magazine.add(magazineMesh);
  const floor = box('magazine floorplate', [0.103, 0.019, 0.128], steel, [0, -0.423, -0.15], magazine);
  floor.rotation.x = -0.36;
  if (close) for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const rib = box('magazine pressed rib', [0.004, 0.24, 0.009], edge, [side * 0.05, -0.19, -0.025 - i * 0.026], magazine);
      rib.rotation.x = 0.36;
    }
  }
  const muzzleFlash = new Mesh(new OctahedronGeometry(0.105, 0), new MeshBasicMaterial({ color: '#ffda88', toneMapped: false }));
  muzzleFlash.name = 'muzzle flash';
  muzzleFlash.position.set(0, 0, -1.18);
  muzzleFlash.visible = false;
  root.add(muzzleFlash);
  return { root, muzzleFlash, magazine, sight, reticle };
}

const weaponModule: WeaponModule = { weaponDefinition, createWeaponModel };
export default weaponModule;
