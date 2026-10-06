import { birdPlaceholderAsset } from './bird-placeholder.asset';
import { bicycleAsset } from './bicycle.asset';
import { buildingAsset } from './building.asset';
import { cafeKioskAsset } from './cafe-kiosk.asset';
import { cornerCafeAsset } from './corner-cafe.asset';
import { decorationAsset } from './decoration.asset';
import { fountainAsset } from './fountain.asset';
import { honk47Asset } from './honk-47.asset';
import { tallTownhouseAsset } from './tall-townhouse.asset';
import { treeAsset } from './tree.asset';
import { createGeneratedAsset, freezeAssetDefinition, validateAssetDefinition, type AssetDefinition, type GeneratedAsset } from './asset-types';

const authoredDefinitions: readonly AssetDefinition[] = [
  buildingAsset,
  cornerCafeAsset,
  tallTownhouseAsset,
  decorationAsset,
  treeAsset,
  cafeKioskAsset,
  fountainAsset,
  bicycleAsset,
  honk47Asset,
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
