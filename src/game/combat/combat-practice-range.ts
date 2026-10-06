import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SphereGeometry,
  type Material,
  type Object3D,
} from 'three';
import { Combatant } from './combatant';

const TARGET_SPAWNS = [
  { x: -7.4, y: 0, z: -5.2, color: '#d48978' },
  { x: 0, y: 0, z: -5.2, color: '#d6a64f' },
  { x: 7.4, y: 0, z: -5.2, color: '#7da99c' },
] as const;

/** Small range targets for exercising hit registration before Phase 8 character assets. */
export function createCombatPracticeRange(scene: Scene) {
  const combatants: Combatant[] = [];
  const visuals: Group[] = [];
  const owned: Object3D[] = [];

  for (let i = 0; i < TARGET_SPAWNS.length; i += 1) {
    const spawn = TARGET_SPAWNS[i];
    if (!spawn) continue;
    const combatant = new Combatant(`range-target-${i + 1}`, 'enemy', spawn, 100, 0.48, 1.95);
    const visual = createTarget(spawn.color);
    visual.position.set(spawn.x, spawn.y, spawn.z);
    scene.add(visual);
    combatants.push(combatant);
    visuals.push(visual);
    owned.push(visual);
  }

  let disposed = false;
  return {
    combatants,
    update(deltaSeconds: number) {
      for (let i = 0; i < combatants.length; i += 1) {
        const combatant = combatants[i];
        const visual = visuals[i];
        if (!combatant || !visual) continue;
        combatant.update(deltaSeconds);
        visual.position.copy(combatant.position);
        visual.visible = combatant.status === 'alive';
        visual.rotation.z = Math.max(-0.28, Math.min(0.28, combatant.velocity.x * -0.04));
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const object of owned) {
        scene.remove(object);
        disposeObjectResources(object);
      }
    },
  };
}

function createTarget(color: string): Group {
  const group = new Group();
  group.name = 'practice target';
  const wood = new MeshStandardMaterial({ color: '#8f7050', roughness: 0.92 });
  const body = new MeshStandardMaterial({ color, roughness: 0.82 });
  const cream = new MeshStandardMaterial({ color: '#f6edcf', roughness: 0.76 });
  const dark = new MeshStandardMaterial({ color: '#455750', roughness: 0.8 });

  const post = new Mesh(new BoxGeometry(0.09, 1.52, 0.1), wood);
  post.position.set(0, 0.76, 0);
  group.add(post);
  const feet = new Mesh(new BoxGeometry(0.7, 0.09, 0.28), wood);
  feet.position.set(0, 0.08, 0.03);
  group.add(feet);
  const target = new Mesh(new CylinderGeometry(0.49, 0.49, 0.1, 10), body);
  target.rotation.x = Math.PI / 2;
  target.position.set(0, 1.5, 0.02);
  group.add(target);
  const center = new Mesh(new CylinderGeometry(0.2, 0.2, 0.108, 10), cream);
  center.rotation.x = Math.PI / 2;
  center.position.set(0, 1.5, 0.025);
  group.add(center);
  const eye = new Mesh(new SphereGeometry(0.055, 6, 4), dark);
  eye.position.set(0.29, 1.7, 0.01);
  group.add(eye);
  const beak = new Mesh(new CylinderGeometry(0.02, 0.09, 0.13, 5), new MeshStandardMaterial({ color: '#e9ad53', roughness: 0.75 }));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.38, 1.59, 0.02);
  group.add(beak);
  return group;
}

function disposeObjectResources(object: Object3D): void {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<Material>();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    geometries.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}
