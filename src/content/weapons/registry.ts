import { createWeaponRegistry, type WeaponModule, type MeleeWeaponModule } from '../../game/combat/weapon-types';

const weaponModules = import.meta.glob<WeaponModule>('./*.weapon.ts', { eager: true });
const modules = Object.values(weaponModules);

if (modules.length === 0) throw new Error('No weapon definitions were discovered');
for (const [path, module] of Object.entries(weaponModules)) {
  if (!module || !module.weaponDefinition || typeof module.createWeaponModel !== 'function') {
    throw new Error(`Weapon module ${path} must export weaponDefinition and createWeaponModel`);
  }
}

export const WEAPON_REGISTRY = createWeaponRegistry(modules.map((module) => module.weaponDefinition));
export const WEAPON_MODEL_FACTORIES: ReadonlyMap<string, WeaponModule['createWeaponModel']> = new Map(
  modules.map((module) => [module.weaponDefinition.id, module.createWeaponModel]),
);

export function getWeaponDefinition(id: string) {
  const definition = WEAPON_REGISTRY.get(id);
  if (!definition) throw new Error(`Unknown weapon: ${id}`);
  return definition;
}

export function createWeaponModel(id: string) {
  const factory = WEAPON_MODEL_FACTORIES.get(id);
  if (!factory) throw new Error(`No visual model registered for weapon: ${id}`);
  return factory();
}

const meleeModules = Object.values(import.meta.glob<MeleeWeaponModule>('./*.melee.ts', { eager: true }));
export const MELEE_WEAPON_REGISTRY = new Map(meleeModules.map(module => {
  const definition = module.meleeDefinition;
  if (!definition || !definition.id || !definition.displayName || typeof module.createWeaponModel !== 'function'
    || ![definition.damage, definition.range, definition.cooldownSeconds, definition.movementMultiplier, definition.equipSeconds].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Invalid melee weapon module');
  }
  return [definition.id, definition] as const;
}));
if (MELEE_WEAPON_REGISTRY.size !== meleeModules.length) throw new Error('Duplicate melee weapon id');
export function getMeleeWeaponDefinition(id: string) {
  const definition = MELEE_WEAPON_REGISTRY.get(id);
  if (!definition) throw new Error(`Unknown melee weapon: ${id}`);
  return definition;
}
export function createMeleeWeaponModel(id: string) {
  const module = meleeModules.find(module => module.meleeDefinition.id === id);
  if (!module) throw new Error(`Unknown melee weapon model: ${id}`);
  return module.createWeaponModel();
}
