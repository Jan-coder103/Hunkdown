import { birdPlaceholderAsset } from './bird-placeholder.asset';
import { buildingAsset } from './building.asset';
import { decorationAsset } from './decoration.asset';
import { weaponPlaceholderAsset } from './weapon-placeholder.asset';
import { createGeneratedAsset, freezeAssetDefinition, validateAssetDefinition, type AssetDefinition, type GeneratedAsset } from './asset-types';

const authoredDefinitions: readonly AssetDefinition[] = [
  buildingAsset,
  decorationAsset,
  weaponPlaceholderAsset,
  birdPlaceholderAsset,
];

export const ASSET_DEFINITIONS: readonly AssetDefinition[] = Object.freeze(authoredDefinitions.map((definition) => {
  validateAssetDefinition(definition);
  return freezeAssetDefinition(definition);
}));

const definitionsById = new Map<string, AssetDefinition>();
for (const definition of ASSET_DEFINITIONS) {
  if (definitionsById.has(definition.id)) throw new Error(`Duplicate asset id: ${definition.id}`);
  definitionsById.set(definition.id, definition);
}

export function getAssetDefinition(id: string): AssetDefinition {
  const definition = definitionsById.get(id);
  if (!definition) throw new Error(`Unknown asset: ${id}`);
  return definition;
}

export function createAsset(id: string): GeneratedAsset {
  return createGeneratedAsset(getAssetDefinition(id));
}
