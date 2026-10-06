import { ASSET_DEFINITIONS } from '../../content/assets/registry';
import { createSeededRandom } from '../../engine/seeded-random';
import {
  doorSidesForLayout,
  getMapCell,
  oppositeDoorSide,
  validateMapDocument,
  type DoorSide,
  type GridPoint,
  type MapCell,
  type MapDocument,
} from './map-types';

export type BuildingPlacement = Readonly<{
  cell: GridPoint;
  position: Readonly<{ x: number; y: number; z: number }>;
  assetId: string;
  quarterTurns: number;
  enterable: boolean;
  doors: readonly DoorSide[];
}>;

export type DecorationPlacement = Readonly<{
  id: string;
  cell: GridPoint;
  position: Readonly<{ x: number; y: number; z: number }>;
  assetId: string;
  rotation: number;
  clearanceRadius: number;
}>;

export type ElevationPlacement = Readonly<{ cell: GridPoint; height: number }>;
export type SlopePlacement = Readonly<{ highCell: GridPoint; lowCell: GridPoint; direction: DoorSide; height: number; run: number }>;
export type NavigationLink = Readonly<{ from: GridPoint; to: GridPoint; viaSlope: boolean }>;
export type WorldCollision = Readonly<{
  cell: GridPoint;
  center: Readonly<{ x: number; y: number; z: number }>;
  size: Readonly<{ x: number; y: number; z: number }>;
  role: 'solid-building' | 'enterable-wall' | 'slope-ramp' | 'destructible-prop';
  id?: string;
  health?: number;
  direction?: DoorSide;
  lowCell?: GridPoint;
}>;

export type GeneratedMap = Readonly<{
  source: MapDocument;
  buildings: readonly BuildingPlacement[];
  decorations: readonly DecorationPlacement[];
  elevations: readonly ElevationPlacement[];
  slopes: readonly SlopePlacement[];
  navigationNodes: readonly GridPoint[];
  navigationLinks: readonly NavigationLink[];
  collisions: readonly WorldCollision[];
}>;

const CITY_ELEVATION = 1.25;
const HOUSE_DOOR_WIDTH = 1.5;
const DECORATION_CLEARANCE = 1.25;
const PATH_CLEARANCE = 1.15;
const DECORATION_CHANCE = 0.2;
const DECORATION_HEALTH = 68;
const ENTERABLE_WALL_HEALTH = 136;
const NAVIGATION_CLEARANCE = 0.42;

const buildingIds = ASSET_DEFINITIONS.filter((asset) => asset.category === 'building').map((asset) => asset.id);
const buildingsById = new Map(ASSET_DEFINITIONS.filter((asset) => asset.category === 'building').map((asset) => [asset.id, asset]));
const decorationIds = ASSET_DEFINITIONS.filter((asset) => asset.category === 'decoration').map((asset) => asset.id);
const decorationsById = new Map(ASSET_DEFINITIONS.filter((asset) => asset.category === 'decoration').map((asset) => [asset.id, asset]));

export function generateMap(map: MapDocument): GeneratedMap {
  validateMapDocument(map);
  const random = createSeededRandom(map.seed);
  const buildings: BuildingPlacement[] = [];
  const decorations: DecorationPlacement[] = [];
  const elevations: ElevationPlacement[] = [];
  const slopes: SlopePlacement[] = [];
  const collisions: WorldCollision[] = [];
  const pathCenters = map.paths.flatMap((path) => path.cells.map((point) => worldPosition(map, point)));
  const navigableCenters = map.cells.filter(isNavigableCell).map((cell) => worldPosition(map, cell));
  const buildingCenters = map.cells
    .filter((cell) => cell.kind === 'solid-house' || cell.kind === 'enterable-house')
    .map((cell) => worldPosition(map, cell));

  for (const cell of map.cells) {
    const position = worldPosition(map, cell);
    if (cell.kind === 'solid-house' || cell.kind === 'enterable-house') {
      if (buildingIds.length === 0) throw new Error('No generated building assets are registered');
      const assetId = buildingIds[Math.floor(random() * buildingIds.length)] ?? buildingIds[0];
      if (!assetId) throw new Error('No generated building assets are registered');
      const definition = buildingsById.get(assetId);
      if (!definition) throw new Error(`Generated building asset ${assetId} has no definition`);
      const buildingHeight = (definition.bounds.max[1] - definition.bounds.min[1]) * map.cellSize / 2.8;
      const doors = cell.kind === 'enterable-house' ? doorSidesForLayout(cell.doorLayout) : [];
      buildings.push(Object.freeze({
        cell: point(cell),
        position: Object.freeze({ x: position.x, y: 0, z: position.z }),
        assetId,
        quarterTurns: Math.floor(random() * 4),
        enterable: cell.kind === 'enterable-house',
        doors: Object.freeze([...doors]),
      }));
      if (cell.kind === 'solid-house') {
        collisions.push(Object.freeze({
          cell: point(cell),
          center: Object.freeze({ x: position.x, y: buildingHeight / 2, z: position.z }),
          size: Object.freeze({ x: map.cellSize, y: buildingHeight, z: map.cellSize }),
          role: 'solid-building',
        }));
      } else {
        collisions.push(...createEnterableWallCollisions(map, cell, doors, position, buildingHeight));
      }
    } else if (cell.kind === 'elevation') {
      elevations.push(Object.freeze({ cell: point(cell), height: CITY_ELEVATION }));
    }
  }

  for (const highCell of map.cells) {
    if (highCell.kind !== 'elevation') continue;
    for (const direction of ['north', 'east', 'south', 'west'] as const) {
      const lowPoint = neighbor(highCell, direction);
      const lowCell = getMapCell(map, lowPoint.x, lowPoint.y);
      if (!lowCell || lowCell.kind === 'elevation' || !canUseSlope(lowCell, oppositeDoorSide(direction))) continue;
      slopes.push(Object.freeze({
        highCell: point(highCell),
        lowCell: point(lowCell),
        direction,
        height: CITY_ELEVATION,
        run: Math.min(map.cellSize * 0.38, 2.8),
      }));
    }
  }
  for (const slope of slopes) {
    const high = worldPosition(map, slope.highCell);
    const low = worldPosition(map, slope.lowCell);
    const isNorthSouth = slope.direction === 'north' || slope.direction === 'south';
    collisions.push(Object.freeze({
      cell: slope.highCell,
      center: Object.freeze({ x: (high.x + low.x) / 2 + Math.sign(low.x - high.x) * slope.run / 2, y: slope.height / 2, z: (high.z + low.z) / 2 + Math.sign(low.z - high.z) * slope.run / 2 }),
      size: Object.freeze({ x: isNorthSouth ? Math.min(map.cellSize * 0.76, 5.6) : slope.run, y: slope.height, z: isNorthSouth ? slope.run : Math.min(map.cellSize * 0.76, 5.6) }),
      role: 'slope-ramp',
      direction: slope.direction,
      lowCell: slope.lowCell,
    }));
  }

  if (decorationIds.length > 0) {
    for (const cell of map.cells) {
      if (cell.kind !== 'street' && cell.kind !== 'elevation') continue;
      if (random() >= DECORATION_CHANCE) continue;
      const position = worldPosition(map, cell);
      const signX = random() < 0.5 ? -1 : 1;
      const signZ = random() < 0.5 ? -1 : 1;
      const offset = Math.min(map.cellSize * 0.27, map.cellSize / 2 - DECORATION_CLEARANCE);
      const candidate = { x: position.x + signX * offset, y: cell.kind === 'elevation' ? CITY_ELEVATION : 0, z: position.z + signZ * offset };
      if (isTooCloseToPath(candidate, pathCenters, DECORATION_CLEARANCE + PATH_CLEARANCE)) continue;
      if (decorations.some((decoration) => planarDistance(candidate, decoration.position) < decoration.clearanceRadius + DECORATION_CLEARANCE)) continue;
      const assetId = decorationIds[Math.floor(random() * decorationIds.length)] ?? decorationIds[0];
      if (!assetId) continue;
      const definition = decorationsById.get(assetId);
      if (!definition) continue;
      const scale = Math.min(1, map.cellSize / 4);
      const collisionRadius = Math.max(0, ...definition.collision.map((collider) => {
        const halfX = collider.size[0] * scale / 2;
        const halfZ = collider.size[2] * scale / 2;
        return Math.hypot(halfX, halfZ);
      }));
      if (isTooCloseToPath(candidate, navigableCenters, collisionRadius + NAVIGATION_CLEARANCE)) continue;
      if (isTooCloseToBuilding(candidate, buildingCenters, map.cellSize / 2, collisionRadius + 0.08)) continue;
      const id = `prop-${cell.x}-${cell.y}-${assetId}`;
      const rotation = random() * Math.PI * 2;
      decorations.push(Object.freeze({
        id,
        cell: point(cell),
        position: Object.freeze(candidate),
        assetId,
        rotation,
        clearanceRadius: DECORATION_CLEARANCE,
      }));
      for (const collider of definition.collision) {
        const rotated = rotateCollider(collider.center[0], collider.center[2], collider.size[0], collider.size[2], scale, rotation);
        collisions.push(Object.freeze({
          cell: point(cell),
          center: Object.freeze({
            x: candidate.x + rotated.centerX,
            y: candidate.y + collider.center[1] * scale,
            z: candidate.z + rotated.centerZ,
          }),
          size: Object.freeze({ x: rotated.sizeX, y: collider.size[1] * scale, z: rotated.sizeZ }),
          role: 'destructible-prop',
          id,
          health: DECORATION_HEALTH,
        }));
      }
    }
  }

  const navigationNodes = map.cells.filter(isNavigableCell).map((cell) => point(cell));
  const navigationLinks = buildNavigationLinks(map, slopes);
  return Object.freeze({
    source: map,
    buildings: Object.freeze(buildings),
    decorations: Object.freeze(decorations),
    elevations: Object.freeze(elevations),
    slopes: Object.freeze(slopes),
    navigationNodes: Object.freeze(navigationNodes),
    navigationLinks: Object.freeze(navigationLinks),
    collisions: Object.freeze(collisions),
  });
}

export function worldPosition(map: Pick<MapDocument, 'width' | 'height' | 'cellSize'>, cell: GridPoint): { x: number; z: number } {
  return {
    x: (cell.x - (map.width - 1) / 2) * map.cellSize,
    z: (cell.y - (map.height - 1) / 2) * map.cellSize,
  };
}

function buildNavigationLinks(map: MapDocument, slopes: readonly SlopePlacement[]): NavigationLink[] {
  const links: NavigationLink[] = [];
  for (const cell of map.cells) {
    if (!isNavigableCell(cell)) continue;
    for (const direction of ['east', 'south'] as const) {
      const nextPoint = neighbor(cell, direction);
      const next = getMapCell(map, nextPoint.x, nextPoint.y);
      if (!next || !isNavigableCell(next)) continue;
      if (cell.kind === 'enterable-house' && !doorSidesForLayout(cell.doorLayout).includes(direction)) continue;
      if (next.kind === 'enterable-house' && !doorSidesForLayout(next.doorLayout).includes(oppositeDoorSide(direction))) continue;
      const elevationChange = (cell.kind === 'elevation') !== (next.kind === 'elevation');
      const viaSlope = elevationChange;
      if (viaSlope && !slopes.some((slope) => (samePoint(slope.highCell, cell) && samePoint(slope.lowCell, next)) || (samePoint(slope.highCell, next) && samePoint(slope.lowCell, cell)))) continue;
      links.push(Object.freeze({ from: point(cell), to: point(next), viaSlope }));
    }
  }
  return links;
}

function createEnterableWallCollisions(
  map: MapDocument,
  cell: MapCell,
  doors: readonly DoorSide[],
  position: Readonly<{ x: number; z: number }>,
  buildingHeight: number,
): WorldCollision[] {
  const half = map.cellSize / 2;
  const thickness = 0.3;
  const sideSize = map.cellSize - HOUSE_DOOR_WIDTH;
  const colliders: WorldCollision[] = [];
  for (const side of ['north', 'east', 'south', 'west'] as const) {
    const doorOpen = doors.includes(side);
    const longSize = doorOpen ? sideSize / 2 : map.cellSize;
    const centerY = buildingHeight / 2;
    if (side === 'north' || side === 'south') {
      for (const sign of doorOpen ? [-1, 1] : [0]) {
        const segment = sign < 0 ? 'left' : sign > 0 ? 'right' : 'full';
        colliders.push(Object.freeze({
          cell: point(cell),
          center: Object.freeze({ x: position.x + (doorOpen ? sign * (HOUSE_DOOR_WIDTH / 2 + longSize / 2) : 0), y: centerY, z: position.z + (side === 'north' ? -half : half) }),
          size: Object.freeze({ x: longSize, y: buildingHeight, z: thickness }),
          role: 'enterable-wall',
          id: `house-${cell.x}-${cell.y}-${side}-${segment}`,
          health: ENTERABLE_WALL_HEALTH,
        }));
      }
    } else {
      for (const sign of doorOpen ? [-1, 1] : [0]) {
        const segment = sign < 0 ? 'left' : sign > 0 ? 'right' : 'full';
        colliders.push(Object.freeze({
          cell: point(cell),
          center: Object.freeze({ x: position.x + (side === 'west' ? -half : half), y: centerY, z: position.z + (doorOpen ? sign * (HOUSE_DOOR_WIDTH / 2 + longSize / 2) : 0) }),
          size: Object.freeze({ x: thickness, y: buildingHeight, z: longSize }),
          role: 'enterable-wall',
          id: `house-${cell.x}-${cell.y}-${side}-${segment}`,
          health: ENTERABLE_WALL_HEALTH,
        }));
      }
    }
  }
  return colliders;
}

function canUseSlope(cell: MapCell, sideFacingHighCell: DoorSide): boolean {
  if (cell.kind === 'street' || cell.kind === 'elevation') return true;
  return cell.kind === 'enterable-house' && doorSidesForLayout(cell.doorLayout).includes(sideFacingHighCell);
}

function isNavigableCell(cell: MapCell): boolean {
  return cell.kind !== 'solid-house';
}

function isTooCloseToPath(candidate: Readonly<{ x: number; z: number }>, centers: readonly Readonly<{ x: number; z: number }>[], minDistance: number): boolean {
  return centers.some((center) => planarDistance(candidate, center) < minDistance);
}

function planarDistance(a: Readonly<{ x: number; z: number }>, b: Readonly<{ x: number; z: number }>): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function isTooCloseToBuilding(
  candidate: Readonly<{ x: number; z: number }>,
  centers: readonly Readonly<{ x: number; z: number }>[],
  halfSize: number,
  clearance: number,
): boolean {
  return centers.some((center) => {
    const outsideX = Math.max(0, Math.abs(candidate.x - center.x) - halfSize);
    const outsideZ = Math.max(0, Math.abs(candidate.z - center.z) - halfSize);
    return Math.hypot(outsideX, outsideZ) < clearance;
  });
}

function rotateCollider(
  centerX: number,
  centerZ: number,
  sizeX: number,
  sizeZ: number,
  scale: number,
  rotation: number,
): Readonly<{ centerX: number; centerZ: number; sizeX: number; sizeZ: number }> {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    centerX: (cosine * centerX + sine * centerZ) * scale,
    centerZ: (-sine * centerX + cosine * centerZ) * scale,
    sizeX: (Math.abs(cosine) * sizeX + Math.abs(sine) * sizeZ) * scale,
    sizeZ: (Math.abs(sine) * sizeX + Math.abs(cosine) * sizeZ) * scale,
  };
}

function neighbor(cell: GridPoint, direction: DoorSide): GridPoint {
  if (direction === 'north') return { x: cell.x, y: cell.y - 1 };
  if (direction === 'east') return { x: cell.x + 1, y: cell.y };
  if (direction === 'south') return { x: cell.x, y: cell.y + 1 };
  return { x: cell.x - 1, y: cell.y };
}

function point(cell: GridPoint): GridPoint {
  return Object.freeze({ x: cell.x, y: cell.y });
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}
