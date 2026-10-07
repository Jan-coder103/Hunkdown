export type FireMode = 'automatic' | 'semi-automatic';

/** Immutable authoring data. Mutable ammunition and cooldowns live in WeaponController. */
export type WeaponDefinition = Readonly<{
  id: string;
  displayName: string;
  fireMode: FireMode;
  magazineSize: number;
  startingReserve: number;
  reserveCapacity: number;
  damage: number;
  roundsPerMinute: number;
  reloadSeconds: number;
  range: number;
  hipSpreadRadians: number;
  aimedSpreadRadians: number;
  recoilPitchRadians: number;
  recoilYawRadians: number;
}>;

export type WeaponModule = Readonly<{
  weaponDefinition: WeaponDefinition;
  createWeaponModel: () => WeaponModelRig;
}>;

export type WeaponModelRig = Readonly<{
  root: import('three').Group;
  muzzleFlash: import('three').Object3D;
  magazine: import('three').Object3D;
  /** Local optical axis, parallel to model -Z. Used to center the camera through the optic. */
  sight?: import('three').Object3D;
  reticle?: import('three').Object3D;
}>;

export type WeaponRegistry = ReadonlyMap<string, WeaponDefinition>;

export function createWeaponRegistry(definitions: readonly WeaponDefinition[]): WeaponRegistry {
  const registry = new Map<string, WeaponDefinition>();
  for (const definition of definitions) {
    validateWeaponDefinition(definition);
    if (registry.has(definition.id)) throw new Error(`Duplicate weapon id: ${definition.id}`);
    registry.set(definition.id, Object.freeze({ ...definition }));
  }
  return registry;
}

export function validateWeaponDefinition(definition: WeaponDefinition): void {
  if (!definition || typeof definition !== 'object') throw new Error('Weapon definition must be an object');
  if (typeof definition.id !== 'string' || !definition.id.trim() || !/^[a-z0-9-]+$/.test(definition.id)) {
    throw new Error(`Weapon id must use lowercase letters, numbers, and hyphens: ${definition.id}`);
  }
  if (typeof definition.displayName !== 'string' || !definition.displayName.trim()) {
    throw new Error(`Weapon ${definition.id} needs a display name`);
  }
  if (definition.fireMode !== 'automatic' && definition.fireMode !== 'semi-automatic') {
    throw new Error(`Weapon ${definition.id} has an unsupported fire mode`);
  }
  for (const [field, value] of Object.entries({
    magazineSize: definition.magazineSize,
    startingReserve: definition.startingReserve,
    reserveCapacity: definition.reserveCapacity,
  })) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`Weapon ${definition.id} has invalid ${field}`);
  }
  if (definition.magazineSize < 1) throw new Error(`Weapon ${definition.id} has invalid magazineSize`);
  if (definition.startingReserve > definition.reserveCapacity) {
    throw new Error(`Weapon ${definition.id} has inconsistent ammunition capacity`);
  }
  for (const [field, value] of Object.entries({
    damage: definition.damage,
    roundsPerMinute: definition.roundsPerMinute,
    reloadSeconds: definition.reloadSeconds,
    range: definition.range,
  })) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`Weapon ${definition.id} has invalid ${field}`);
  }
  for (const [field, value] of Object.entries({
    hipSpreadRadians: definition.hipSpreadRadians,
    aimedSpreadRadians: definition.aimedSpreadRadians,
    recoilPitchRadians: definition.recoilPitchRadians,
    recoilYawRadians: definition.recoilYawRadians,
  })) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Weapon ${definition.id} has invalid ${field}`);
  }
  if (definition.aimedSpreadRadians > definition.hipSpreadRadians) {
    throw new Error(`Weapon ${definition.id} should not be less accurate while aiming`);
  }
}
