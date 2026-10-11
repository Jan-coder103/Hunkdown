import { createSkirmishShowcaseMap } from '../bots/skirmish-showcase';
import { createMapBotRoster } from '../bots/bot-simulation';
import { generateMap } from './map-generator';
import { parseMapDocument, type MapDocument } from './map-types';

export type CatalogMap = Readonly<{ id: string; document: MapDocument }>;

/** Bad files are reported individually so one draft cannot prevent game startup. */
export function createMapCatalog(files: Record<string, string>): { maps: CatalogMap[]; errors: string[] } {
  const maps: CatalogMap[] = ['midtown', 'garden-district'].map(id => ({
    id, document: createSkirmishShowcaseMap(undefined, id as 'midtown' | 'garden-district'),
  }));
  const errors: string[] = [];
  for (const [filename, json] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    try {
      const document = parseMapDocument(json);
      const id = `custom:${document.id}`;
      if (maps.some(map => map.id === id)) throw new Error(`Duplicate map id: ${document.id}`);
      createMapBotRoster(generateMap(document), { friendlyCount: 1, enemyCount: 1 });
      maps.push({ id, document });
    } catch (error) {
      errors.push(`${filename.split('/').at(-1)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { maps, errors };
}

export const MAP_CATALOG = createMapCatalog(import.meta.glob('../../../maps/**/*.json', {
  query: '?raw', import: 'default', eager: true,
}));

export function mapOptionMarkup(map: CatalogMap): string {
  return `<button type="button" data-map-option="${map.id}" aria-pressed="false"><span class="map-art map-art-midtown" aria-hidden="true"></span><strong>${escapeHtml(map.document.name)}</strong><small>${map.document.width} × ${map.document.height} cells · custom map</small></button>`;
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
