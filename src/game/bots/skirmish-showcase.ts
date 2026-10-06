import { createEmptyMap, paintMapCell, type MapDocument } from '../world/map-types';

/** Small authored city block used by the Phase 9 live bot preview. */
export function createSkirmishShowcaseMap(seed = 0x484f4e4b): MapDocument {
  let map = createEmptyMap({
    id: 'midtown-skirmish',
    name: 'Midtown Skirmish',
    seed,
    width: 13,
    height: 9,
    cellSize: 8,
  });

  const solidHouses = [
    [1, 1], [3, 1], [9, 1], [11, 1],
    [2, 3], [10, 3],
    [1, 7], [4, 7], [8, 7], [11, 7],
  ] as const;
  for (const [x, y] of solidHouses) map = paintMapCell(map, x, y, 'solid-house');

  map = paintMapCell(map, 4, 3, 'enterable-house', 'north-south');
  map = paintMapCell(map, 8, 5, 'enterable-house', 'west-east');
  map = paintMapCell(map, 6, 1, 'elevation');
  map = paintMapCell(map, 6, 7, 'elevation');
  return map;
}
