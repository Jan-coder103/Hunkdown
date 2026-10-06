import { describe, expect, it } from 'vitest';
import {
  appendPathPoint,
  createEmptyMap,
  getMapCell,
  loadMapFromStorage,
  paintMapCell,
  parseMapDocument,
  resizeMap,
  saveMapToStorage,
  serializeMapDocument,
  validateMapDocument,
} from '../src/game/world/map-types';

describe('versioned map documents', () => {
  it('creates row-major cells, paints door layouts, and round-trips the complete document', () => {
    let map = createEmptyMap({ width: 5, height: 4, seed: 77, name: 'Pastel blocks' });
    map = paintMapCell(map, 2, 1, 'enterable-house', 'north-south');
    map = appendPathPoint(map, { x: 2, y: 0 });
    map = appendPathPoint(map, { x: 2, y: 1 });
    map = appendPathPoint(map, { x: 2, y: 2 });

    const restored = parseMapDocument(serializeMapDocument(map));
    expect(restored).toEqual(map);
    expect(getMapCell(restored, 2, 1)).toMatchObject({ kind: 'enterable-house', doorLayout: 'north-south' });
    expect(Object.isFrozen(restored.cells)).toBe(true);
    expect(Object.isFrozen(restored.paths[0]?.cells[0])).toBe(true);
  });

  it('rejects unsupported versions, invalid cell ordering, and paths through houses or walls', () => {
    const map = createEmptyMap({ width: 4, height: 4 });
    expect(() => validateMapDocument({ ...map, version: 2 })).toThrow(/Unsupported map schema version/);
    expect(() => validateMapDocument({ ...map, cells: [...map.cells].reverse() })).toThrow(/row-major order/);

    const blocked = paintMapCell(map, 1, 1, 'solid-house');
    expect(() => appendPathPoint(appendPathPoint(blocked, { x: 0, y: 1 }), { x: 1, y: 1 })).toThrow(/solid house/);

    let closedDoor = paintMapCell(map, 1, 1, 'enterable-house', 'north-south');
    closedDoor = Object.freeze({
      ...closedDoor,
      paths: Object.freeze([{ id: 'side-door', name: 'Side door test', cells: Object.freeze([{ x: 0, y: 1 }, { x: 1, y: 1 }]) }]),
    });
    expect(() => validateMapDocument(closedDoor)).toThrow(/enters enterable house .* through a wall/);
    expect(() => parseMapDocument('{broken')).toThrow(/could not be parsed/);
  });

  it('keeps cell edits when resizing and trims paths that remain connected', () => {
    let map = createEmptyMap({ width: 5, height: 5 });
    map = paintMapCell(map, 1, 1, 'elevation');
    map = appendPathPoint(map, { x: 0, y: 0 });
    map = appendPathPoint(map, { x: 1, y: 0 });
    map = appendPathPoint(map, { x: 2, y: 0 });

    const resized = resizeMap(map, 3, 3);
    expect(resized.cells).toHaveLength(9);
    expect(getMapCell(resized, 1, 1)?.kind).toBe('elevation');
    expect(resized.paths[0]?.cells).toHaveLength(3);
  });

  it('saves to browser storage and reports missing or malformed saved data clearly', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const map = paintMapCell(createEmptyMap({ width: 3, height: 3 }), 1, 1, 'solid-house');

    expect(loadMapFromStorage(storage)).toBeNull();
    saveMapToStorage(storage, map);
    expect(loadMapFromStorage(storage)).toEqual(map);
    values.set('operation-honkdown.map.v1', '{invalid');
    expect(() => loadMapFromStorage(storage)).toThrow(/could not be parsed/);
  });
});


describe('map editing regressions', () => {
  it('rejects painting over a route or closing its doors without corrupting the original', () => {
    let map = createEmptyMap({ width: 4, height: 4 });
    for (let x = 0; x < 3; x += 1) map = appendPathPoint(map, { x, y: 1 });
    expect(() => paintMapCell(map, 1, 1, 'solid-house')).toThrow(/solid house/);
    expect(() => paintMapCell(map, 1, 1, 'enterable-house', 'north-south')).toThrow(/through a wall/);
    expect(getMapCell(map, 1, 1)?.kind).toBe('street');
    expect(() => serializeMapDocument(map)).not.toThrow();
    expect(() => paintMapCell(map, 1, 1, 'enterable-house', 'west-east')).not.toThrow();
  });

  it('splits a cropped winding route into connected pieces with unique IDs', () => {
    let map = createEmptyMap({ width: 4, height: 4 });
    for (const point of [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }]) {
      map = appendPathPoint(map, point);
    }
    map = appendPathPoint(map, { x: 0, y: 3 }, 'main-route-crop-1');
    const cropped = resizeMap(map, 3, 4);
    expect(cropped.paths.map((path) => path.cells)).toEqual([
      [{ x: 1, y: 0 }, { x: 2, y: 0 }],
      [{ x: 2, y: 2 }, { x: 1, y: 2 }],
      [{ x: 0, y: 3 }],
    ]);
    expect(new Set(cropped.paths.map((path) => path.id)).size).toBe(3);
    expect(parseMapDocument(serializeMapDocument(cropped))).toEqual(cropped);
  });
});
