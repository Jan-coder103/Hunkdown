import { getMapCell, type MapDocument } from './map-types';
import { worldPosition } from './map-generator';

export type StreetSurface = Readonly<{
  kind: 'road' | 'sidewalk' | 'curb' | 'marking';
  x: number; z: number; width: number; depth: number;
}>;

/** Visual paving only: shallow curbs do not alter navigation or authored ground heights. */
export function generateStreetLayout(map: MapDocument): StreetSurface[] {
  const surfaces: StreetSurface[] = [];
  const size = map.cellSize;
  const width = Math.min(1.4, size * 0.18);
  const half = size / 2;
  const cuts = [-half, -half + width, half - width, half];
  const isBuilding = (x: number, y: number) => {
    const kind = getMapCell(map, x, y)?.kind;
    return kind === 'solid-house' || kind === 'enterable-house';
  };
  const isRoad = (x: number, y: number) => getMapCell(map, x, y)?.kind === 'street';
  // Find the middle of each uninterrupted street span. Wide open areas get a
  // central lane rather than a separate set of lane lines in every grid cell.
  const horizontalCenters = new Set<string>();
  const verticalCenters = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let x = 0; x < map.width; x += 1) {
    for (let y = 0; y < map.height;) {
      if (!isRoad(x, y)) { y += 1; continue; }
      const start = y;
      while (isRoad(x, y)) y += 1;
      horizontalCenters.add(key(x, Math.floor((start + y - 1) / 2)));
    }
  }
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width;) {
      if (!isRoad(x, y)) { x += 1; continue; }
      const start = x;
      while (isRoad(x, y)) x += 1;
      verticalCenters.add(key(Math.floor((start + x - 1) / 2), y));
    }
  }
  const horizontalLane = (x: number, y: number) => isRoad(x, y) && (horizontalCenters.has(key(x, y))
    || (horizontalCenters.has(key(x - 1, y)) && horizontalCenters.has(key(x + 1, y))));
  const verticalLane = (x: number, y: number) => isRoad(x, y) && (verticalCenters.has(key(x, y))
    || (verticalCenters.has(key(x, y - 1)) && verticalCenters.has(key(x, y + 1))));
  const isSidewalk = (x: number, y: number, column: number, row: number): boolean => {
    // Wrap the 3x3 paving grid when checking curb edges across tile boundaries.
    if (column < 0) return isSidewalk(x - 1, y, 2, row);
    if (column > 2) return isSidewalk(x + 1, y, 0, row);
    if (row < 0) return isSidewalk(x, y - 1, column, 2);
    if (row > 2) return isSidewalk(x, y + 1, column, 0);
    if (!isRoad(x, y)) return false;
    const dx = column === 0 ? -1 : column === 2 ? 1 : 0;
    const dy = row === 0 ? -1 : row === 2 ? 1 : 0;
    return (dx !== 0 && isBuilding(x + dx, y))
      || (dy !== 0 && isBuilding(x, y + dy))
      || (dx !== 0 && dy !== 0 && isBuilding(x + dx, y + dy));
  };
  for (const cell of map.cells) {
    if (cell.kind !== 'street') continue;
    const center = worldPosition(map, cell);
    surfaces.push({ kind: 'road', x: center.x, z: center.z, width: size, depth: size });
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        if (!isSidewalk(cell.x, cell.y, column, row)) continue;
        const minX = center.x + cuts[column]!;
        const maxX = center.x + cuts[column + 1]!;
        const minZ = center.z + cuts[row]!;
        const maxZ = center.z + cuts[row + 1]!;
        surfaces.push({ kind: 'sidewalk', x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ });
        for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
          const nx = cell.x + (column + dx < 0 ? -1 : column + dx > 2 ? 1 : 0);
          const ny = cell.y + (row + dz < 0 ? -1 : row + dz > 2 ? 1 : 0);
          if (!isRoad(nx, ny) || isSidewalk(cell.x, cell.y, column + dx, row + dz)) continue;
          surfaces.push({ kind: 'curb', x: dx < 0 ? minX + 0.035 : dx > 0 ? maxX - 0.035 : (minX + maxX) / 2,
            z: dz < 0 ? minZ + 0.035 : dz > 0 ? maxZ - 0.035 : (minZ + maxZ) / 2,
            width: dx ? 0.07 : maxX - minX, depth: dz ? 0.07 : maxZ - minZ });
        }
      }
    }
    // Connected lane centers form a road graph. Leave junction centers clear; on
    // straight streets the dashes continue through the center of each tile.
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
    const exits = directions.filter(([dx, dy]) => dx
      ? horizontalLane(cell.x, cell.y) && horizontalLane(cell.x + dx, cell.y)
      : verticalLane(cell.x, cell.y) && verticalLane(cell.x, cell.y + dy));
    const straight = exits.length === 2 && exits[0]![0] === -exits[1]![0] && exits[0]![1] === -exits[1]![1];
    for (const [dx, dy] of exits) {
      for (const distance of [0.32, 0.44]) {
        surfaces.push({ kind: 'marking', x: center.x + dx * size * distance, z: center.z + dy * size * distance,
          width: dx ? size * 0.075 : 0.10, depth: dy ? size * 0.075 : 0.10 });
      }
    }
    if (straight) surfaces.push({ kind: 'marking', x: center.x, z: center.z,
      width: exits[0]![0] ? size * 0.22 : 0.10, depth: exits[0]![1] ? size * 0.22 : 0.10 });
  }
  return surfaces;
}
