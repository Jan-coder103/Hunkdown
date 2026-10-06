import { createWeaponRegistry, type WeaponModule } from '../../game/combat/weapon-types';

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
