import { createEmptyMap, paintMapCell, type MapDocument } from '../world/map-types';

export type SkirmishMapPreset = 'midtown' | 'garden-district';

/** Small authored city blocks used by the live bot match. */
export function createSkirmishShowcaseMap(seed = 0x484f4e4b, preset: SkirmishMapPreset = 'midtown'): MapDocument {
  const garden = preset === 'garden-district';
  let map = createEmptyMap({
    id: garden ? 'garden-district-skirmish' : 'midtown-skirmish',
    name: garden ? 'Garden District Skirmish' : 'Midtown Skirmish',
    seed,
    width: 13,
    height: 9,
    cellSize: 8,
  });

  const solidHouses = garden
    ? [[1, 2], [3, 1], [9, 2], [11, 1], [1, 6], [3, 7], [9, 6], [11, 7]] as const
    : [[1, 1], [3, 1], [9, 1], [11, 1], [2, 3], [10, 3], [1, 7], [4, 7], [8, 7], [11, 7]] as const;
  for (const [x, y] of solidHouses) map = paintMapCell(map, x, y, 'solid-house');

  map = paintMapCell(map, 4, garden ? 2 : 3, 'enterable-house', 'north-south');
  map = paintMapCell(map, 8, garden ? 6 : 5, 'enterable-house', 'west-east');
  map = paintMapCell(map, 6, 1, 'elevation');
  map = paintMapCell(map, 6, 7, 'elevation');
  return map;
}
