import { BoxGeometry, ExtrudeGeometry, Shape, Group, Mesh, MeshStandardMaterial } from 'three';
import type { WeaponModelRig, MeleeWeaponDefinition } from '../../game/combat/weapon-types';

export const meleeDefinition: MeleeWeaponDefinition = Object.freeze({
  id: 'tactical-knife', displayName: 'Tactical knife', damage: 55, range: 2,
  cooldownSeconds: 0.6, movementMultiplier: 1.25, equipSeconds: 0.5,
});

export function createWeaponModel(): WeaponModelRig {
  const root = new Group();
  root.name = 'tactical knife';
  root.position.set(0.24, -0.18, -0.5);
  root.rotation.set(0.55, 0.75, -0.25);
  const grip = new Mesh(new BoxGeometry(0.065, 0.075, 0.21), new MeshStandardMaterial({ color: '#263d38', roughness: 0.85 }));
  const guard = new Mesh(new BoxGeometry(0.17, 0.035, 0.04), new MeshStandardMaterial({ color: '#526567' }));
  guard.position.z = -0.12;
  const shape = new Shape();
  shape.moveTo(-0.04, 0); shape.lineTo(0.04, 0); shape.lineTo(0.035, 0.24);
  shape.lineTo(-0.015, 0.38); shape.lineTo(-0.04, 0.19); shape.closePath();
  const blade = new Mesh(new ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), new MeshStandardMaterial({ color: '#d8e9e6', metalness: 0.75, roughness: 0.28 }));
  blade.rotation.x = -Math.PI / 2;
  blade.position.z = -0.13;
  for (let i = 0; i < 4; i++) {
    const rib = new Mesh(new BoxGeometry(0.075, 0.082, 0.013), new MeshStandardMaterial({ color: '#415c4d' }));
    rib.position.z = -0.06 + i * 0.045;
    root.add(rib);
  }
  const muzzleFlash = new Group();
  root.add(grip, guard, blade, muzzleFlash);
  return { root, magazine: grip, muzzleFlash };
}
