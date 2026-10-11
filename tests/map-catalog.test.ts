import { describe, expect, it } from 'vitest';
import { createMapCatalog, MAP_CATALOG, mapOptionMarkup } from '../src/game/world/map-catalog';
import { createEmptyMap, paintMapCell, serializeMapDocument } from '../src/game/world/map-types';
import { createDefaultProfile, loadProfile, saveProfile, updateProfileSettings } from '../src/game/progression/profile';

describe('folder map catalog', () => {
  it('discovers the exported city in the maps folder', () => {
    expect(MAP_CATALOG.errors).toEqual([]);
    expect(MAP_CATALOG.maps.find(map => map.id === 'custom:city-draft')?.document.name).toBe('Test City');
  });
  it('keeps built-ins while reporting malformed, duplicate and unplayable drafts', () => {
    const map = createEmptyMap();
    let blocked = createEmptyMap({ id: 'blocked' });
    for (const cell of blocked.cells) blocked = paintMapCell(blocked, cell.x, cell.y, 'solid-house');
    const catalog = createMapCatalog({ 'a.json': serializeMapDocument(map), 'b.json': serializeMapDocument(map), 'c.json': '{', 'd.json': serializeMapDocument(blocked) });
    expect(catalog.maps.map(map => map.id)).toEqual(['midtown', 'garden-district', 'custom:city-draft']);
    expect(catalog.errors).toHaveLength(3);
    expect(catalog.errors[0]).toContain('Duplicate');
    expect(catalog.errors[2]).toContain('no navigable cells');
  });
  it('escapes authored names and persists custom selection', () => {
    const catalog = createMapCatalog({ 'map.json': serializeMapDocument(createEmptyMap({ name: '<City & birds>' })) });
    expect(mapOptionMarkup(catalog.maps[2]!)).toContain('&lt;City &amp; birds&gt;');
    let raw = '';
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
    const profile = updateProfileSettings(createDefaultProfile(), { selectedMap: 'custom:city-draft' });
    saveProfile(storage, profile);
    expect(loadProfile(storage).profile.selectedMap).toBe('custom:city-draft');
  });
});
