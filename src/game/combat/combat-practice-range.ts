import { Scene } from 'three';
import { ChickenCharacterView } from '../player/chicken-character-view';
import { Combatant } from './combatant';

const TARGET_SPAWNS = [
  { x: -7.4, y: 0, z: -5.2 },
  { x: 0, y: 0, z: -5.2 },
  { x: 7.4, y: 0, z: -5.2 },
] as const;

/** Low-poly chicken targets for exercising hit registration and character poses. */
export function createCombatPracticeRange(scene: Scene) {
  const combatants: Combatant[] = [];
  const characters: ChickenCharacterView[] = [];
  const previousHealth: number[] = [];

  for (let i = 0; i < TARGET_SPAWNS.length; i += 1) {
    const spawn = TARGET_SPAWNS[i];
    if (!spawn) continue;
    const combatant = new Combatant(`range-target-${i + 1}`, 'enemy', spawn, 100, 0.48, 1.9);
    const character = new ChickenCharacterView(scene, 'enemy', 'third-person');
    character.object.name = `practice chicken target ${i + 1}`;
    character.object.position.set(spawn.x, spawn.y, spawn.z);
    combatants.push(combatant);
    characters.push(character);
    previousHealth.push(combatant.health);
  }

  let disposed = false;
  return {
    combatants,
    characters,
    setVisible(visible: boolean) {
      for (const character of characters) character.object.visible = visible;
    },
    update(deltaSeconds: number) {
      for (let i = 0; i < combatants.length; i += 1) {
        const combatant = combatants[i];
        const character = characters[i];
        if (!combatant || !character) continue;
        combatant.update(deltaSeconds);
        character.object.position.copy(combatant.position);
        if (combatant.health < (previousHealth[i] ?? combatant.health)) character.triggerDamage();
        previousHealth[i] = combatant.health;
        character.setPose({
          movementSpeed: combatant.velocity.length(),
          grounded: true,
          aiming: false,
          dead: combatant.status === 'dead',
        });
        character.update(deltaSeconds);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const character of characters) character.dispose();
    },
  };
}
