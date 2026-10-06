import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  OctahedronGeometry,
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

/** Builds the Phase 4 close-view rifle entirely from owned Three.js geometry. */
export function createWeaponModel() {
  const root = new Group();
  root.position.set(0.36, -0.36, -1.05);
  root.scale.setScalar(0.72);
  root.rotation.set(-0.03, 0.62, -0.025);

  const receiverMaterial = new MeshStandardMaterial({ color: '#465a50', roughness: 0.68, metalness: 0.12 });
  const darkMaterial = new MeshStandardMaterial({ color: '#283733', roughness: 0.75 });
  const stockMaterial = new MeshStandardMaterial({ color: '#c18f61', roughness: 0.9 });
  const accentMaterial = new MeshStandardMaterial({ color: '#d9bd75', roughness: 0.55, metalness: 0.15 });

  const box = (name: string, size: readonly [number, number, number], material: MeshStandardMaterial, position: readonly [number, number, number]) => {
    const mesh = new Mesh(new BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  const cylinder = (name: string, radius: number, length: number, material: MeshStandardMaterial, z: number) => {
    const mesh = new Mesh(new CylinderGeometry(radius, radius, length, 8), material);
    mesh.name = name;
    mesh.rotation.x = Math.PI / 2;
    mesh.position.z = z;
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };

  box('rifle receiver', [0.15, 0.17, 0.39], receiverMaterial, [0, 0, -0.02]);
  box('rifle stock', [0.12, 0.14, 0.27], stockMaterial, [0, -0.01, 0.29]);
  box('rifle handguard', [0.12, 0.14, 0.31], darkMaterial, [0, 0.005, -0.34]);
  cylinder('rifle barrel', 0.027, 0.37, darkMaterial, -0.64);
  cylinder('rifle muzzle', 0.045, 0.055, accentMaterial, -0.84);
  box('upper rail', [0.07, 0.045, 0.32], darkMaterial, [0, 0.105, -0.2]);
  box('optic body', [0.09, 0.11, 0.14], accentMaterial, [0, 0.18, -0.18]);
  box('pistol grip', [0.1, 0.21, 0.11], stockMaterial, [0, -0.17, 0.04]);
  const magazine = box('magazine', [0.11, 0.25, 0.14], darkMaterial, [0, -0.2, -0.04]);
  magazine.rotation.x = -0.08;

  const flash = new Mesh(
    new OctahedronGeometry(0.105, 0),
    new MeshStandardMaterial({ color: '#ffe5a1', emissive: '#ffad37', emissiveIntensity: 4, roughness: 0.3 }),
  );
  flash.name = 'muzzle flash';
  flash.position.set(0, 0, -0.89);
  flash.visible = false;
  root.add(flash);
  return { root, muzzleFlash: flash, magazine };
}

const weaponModule: WeaponModule = { weaponDefinition, createWeaponModel };
export default weaponModule;
