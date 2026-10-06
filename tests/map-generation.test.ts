import { describe, expect, it } from 'vitest';
import { ASSET_DEFINITIONS } from '../src/content/assets/registry';
import { appendPathPoint, createEmptyMap, paintMapCell, type GridPoint } from '../src/game/world/map-types';
import { generateMap, worldPosition } from '../src/game/world/map-generator';

describe('seeded city generation', () => {
  it('repeats building variants, prop placements, slopes, and navigation from the same seed', () => {
    let map = createEmptyMap({ width: 8, height: 7, seed: 218, cellSize: 8 });
    map = paintMapCell(map, 2, 2, 'solid-house');
    map = paintMapCell(map, 3, 2, 'enterable-house', 'all-sides');
    map = paintMapCell(map, 4, 4, 'elevation');
    const first = generateMap(map);
    const replay = generateMap(map);

    expect(replay.buildings).toEqual(first.buildings);
    expect(replay.decorations).toEqual(first.decorations);
    expect(replay.slopes).toEqual(first.slopes);
    expect(replay.navigationLinks).toEqual(first.navigationLinks);
    expect(first.buildings.every((building) => ASSET_DEFINITIONS.some((asset) => asset.id === building.assetId && asset.category === 'building'))).toBe(true);
  });

  it('makes enterable navigation obey the chosen doors and produces wall segments around openings', () => {
    let map = createEmptyMap({ width: 5, height: 5, seed: 1 });
    map = paintMapCell(map, 2, 2, 'enterable-house', 'north-south');
    const generated = generateMap(map);
    const centerLinks = generated.navigationLinks.filter((link) => link.from.x === 2 && link.from.y === 2 || link.to.x === 2 && link.to.y === 2);
    const centerNeighbors = centerLinks.flatMap((link) => link.from.x === 2 && link.from.y === 2 ? [link.to] : [link.from]);

    expect(centerNeighbors).toEqual([{ x: 2, y: 1 }, { x: 2, y: 3 }]);
    expect(generated.collisions.filter((item) => item.cell.x === 2 && item.cell.y === 2)).toHaveLength(6);
    expect(generated.buildings[0]).toMatchObject({ enterable: true, doors: ['north', 'south'] });
  });

  it('builds a ramp and navigation link at each accessible elevation boundary', () => {
    let map = createEmptyMap({ width: 5, height: 5, seed: 9 });
    map = paintMapCell(map, 2, 2, 'elevation');
    const generated = generateMap(map);

    expect(generated.slopes).toHaveLength(4);
    expect(generated.collisions.filter((collision) => collision.role === 'slope-ramp')).toHaveLength(4);
    const linkedNeighbors = generated.navigationLinks
      .filter((link) => link.from.x === 2 && link.from.y === 2 || link.to.x === 2 && link.to.y === 2)
      .filter((link) => link.viaSlope);
    expect(linkedNeighbors).toHaveLength(4);
  });

  it('keeps street props out of buildings and outside the authored route clearance band', () => {
    let map = createEmptyMap({ width: 9, height: 7, seed: 37, cellSize: 8 });
    map = paintMapCell(map, 4, 3, 'solid-house');
    for (let x = 0; x < 9; x += 1) map = appendPathPoint(map, { x, y: 1 });
    const generated = generateMap(map);
    const route = map.paths[0]?.cells ?? [];
    const routeCenters = route.map((cell) => worldPosition(map, cell));

    for (const decoration of generated.decorations) {
      expect(decoration.cell).not.toEqual({ x: 4, y: 3 });
      const nearestRoute = Math.min(...routeCenters.map((center) => Math.hypot(center.x - decoration.position.x, center.z - decoration.position.z)));
      expect(nearestRoute).toBeGreaterThanOrEqual(decoration.clearanceRadius + 1.15);
      expect(ASSET_DEFINITIONS.some((asset) => asset.id === decoration.assetId && asset.category === 'decoration')).toBe(true);
    }
  });

  it('keeps the generated model inside the selected grid-cell center convention', () => {
    const map = createEmptyMap({ width: 4, height: 6, cellSize: 10 });
    const position = worldPosition(map, { x: 0, y: 0 } satisfies GridPoint);
    expect(position).toEqual({ x: -15, z: -25 });
  });
});
