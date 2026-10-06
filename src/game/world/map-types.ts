export const MAP_FORMAT = 'operation-honkdown-map' as const;
export const MAP_SCHEMA_VERSION = 1 as const;
export const MAP_LIMITS = Object.freeze({ minDimension: 2, maxDimension: 64, minCellSize: 4, maxCellSize: 32 });

export const DOOR_SIDES = ['north', 'east', 'south', 'west'] as const;
export type DoorSide = (typeof DOOR_SIDES)[number];
export type DoorLayout = 'north-south' | 'west-east' | 'all-sides';
export type CellKind = 'street' | 'solid-house' | 'enterable-house' | 'elevation';

export type GridPoint = Readonly<{ x: number; y: number }>;
export type StreetCell = Readonly<GridPoint & { kind: 'street' }>;
export type SolidHouseCell = Readonly<GridPoint & { kind: 'solid-house' }>;
export type EnterableHouseCell = Readonly<GridPoint & { kind: 'enterable-house'; doorLayout: DoorLayout }>;
export type ElevationCell = Readonly<GridPoint & { kind: 'elevation' }>;
export type MapCell = StreetCell | SolidHouseCell | EnterableHouseCell | ElevationCell;

export type AuthoredPath = Readonly<{
  id: string;
  name: string;
  cells: readonly GridPoint[];
}>;

export type MapDocument = Readonly<{
  format: typeof MAP_FORMAT;
  version: typeof MAP_SCHEMA_VERSION;
  id: string;
  name: string;
  seed: number;
  width: number;
  height: number;
  cellSize: number;
  cells: readonly MapCell[];
  paths: readonly AuthoredPath[];
}>;

const DOOR_LAYOUTS = new Set<DoorLayout>(['north-south', 'west-east', 'all-sides']);
const CELL_KINDS = new Set<CellKind>(['street', 'solid-house', 'enterable-house', 'elevation']);

export function createEmptyMap(options: Partial<Pick<MapDocument, 'id' | 'name' | 'seed' | 'width' | 'height' | 'cellSize'>> = {}): MapDocument {
  const width = options.width ?? 16;
  const height = options.height ?? 16;
  const cellSize = options.cellSize ?? 8;
  const seed = options.seed ?? 1337;
  assertDimension(width, 'width');
  assertDimension(height, 'height');
  assertCellSize(cellSize);
  assertSeed(seed);
  const cells: StreetCell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) cells.push(Object.freeze({ x, y, kind: 'street' }));
  }
  return Object.freeze({
    format: MAP_FORMAT,
    version: MAP_SCHEMA_VERSION,
    id: options.id ?? 'city-draft',
    name: options.name ?? 'Untitled City',
    seed,
    width,
    height,
    cellSize,
    cells: Object.freeze(cells),
    paths: Object.freeze([]),
  });
}

export function getMapCell(map: MapDocument, x: number, y: number): MapCell | undefined {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) return undefined;
  return map.cells[y * map.width + x];
}

export function paintMapCell(map: MapDocument, x: number, y: number, kind: CellKind, doorLayout: DoorLayout = 'all-sides'): MapDocument {
  if (!getMapCell(map, x, y)) throw new Error(`Cell (${x}, ${y}) is outside the map`);
  const replacement: MapCell = kind === 'enterable-house'
    ? Object.freeze({ x, y, kind, doorLayout })
    : Object.freeze({ x, y, kind } as StreetCell | SolidHouseCell | ElevationCell);
  const cells = map.cells.map((cell) => cell.x === x && cell.y === y ? replacement : cell);
  const next = Object.freeze({ ...map, cells: Object.freeze(cells) });
  validateMapDocument(next);
  return next;
}

export function appendPathPoint(map: MapDocument, point: GridPoint, pathId = 'main-route'): MapDocument {
  const target = getMapCell(map, point.x, point.y);
  if (!target) throw new Error(`Path point (${point.x}, ${point.y}) is outside the map`);
  if (target.kind === 'solid-house') throw new Error(`Path cannot cross a solid house at (${point.x}, ${point.y})`);
  const pathIndex = map.paths.findIndex((path) => path.id === pathId);
  const paths = [...map.paths];
  if (pathIndex < 0) {
    paths.push(Object.freeze({ id: pathId, name: 'Main route', cells: Object.freeze([{ ...point }]) }));
  } else {
    const current = paths[pathIndex];
    if (!current) throw new Error('Path could not be found');
    const previous = current.cells.at(-1);
    if (!previous) throw new Error('Path has no starting point');
    if (previous.x === point.x && previous.y === point.y) return map;
    if (Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y) !== 1) {
      throw new Error('Route cells must be adjacent. Start a new route to draw a separate lane.');
    }
    paths[pathIndex] = Object.freeze({ ...current, cells: Object.freeze([...current.cells, { ...point }]) });
  }
  const next = Object.freeze({ ...map, paths: Object.freeze(paths) });
  validateMapDocument(next);
  return next;
}

export function clearPaths(map: MapDocument): MapDocument {
  return Object.freeze({ ...map, paths: Object.freeze([]) });
}

export function resizeMap(map: MapDocument, width: number, height: number): MapDocument {
  assertDimension(width, 'width');
  assertDimension(height, 'height');
  const cells: MapCell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      cells.push(getMapCell(map, x, y) ?? Object.freeze({ x, y, kind: 'street' }));
    }
  }
  // Cropping can cut the middle of a winding route. Preserve each connected piece.
  const paths: AuthoredPath[] = [];
  const usedIds = new Set(map.paths.map((path) => path.id));
  for (const path of map.paths) {
    let segment: GridPoint[] = [];
    let segmentIndex = 0;
    const flush = () => {
      if (segment.length === 0) return;
      let id = path.id;
      if (segmentIndex > 0) {
        let suffix = segmentIndex;
        do { id = `${path.id.slice(0, 48)}-crop-${suffix++}`; } while (usedIds.has(id));
        usedIds.add(id);
      }
      paths.push(Object.freeze({ ...path, id, cells: Object.freeze(segment) }));
      segment = [];
      segmentIndex += 1;
    };
    for (const point of path.cells) {
      if (point.x < width && point.y < height) segment.push(point);
      else flush();
    }
    flush();
  }
  const resized = Object.freeze({ ...map, width, height, cells: Object.freeze(cells), paths: Object.freeze(paths) });
  validateMapDocument(resized);
  return resized;
}

export function validateMapDocument(value: unknown): asserts value is MapDocument {
  if (!isRecord(value)) throw new Error('Map document must be an object');
  if (value.format !== MAP_FORMAT) throw new Error(`Map format must be ${MAP_FORMAT}`);
  if (value.version !== MAP_SCHEMA_VERSION) throw new Error(`Unsupported map schema version: ${String(value.version)}`);
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value.id)) throw new Error('Map id must use lowercase letters, numbers, and hyphens');
  if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > 80) throw new Error('Map name must contain 1–80 characters');
  assertSeed(value.seed);
  assertDimension(value.width, 'width');
  assertDimension(value.height, 'height');
  assertCellSize(value.cellSize);
  if (!Array.isArray(value.cells) || value.cells.length !== value.width * value.height) {
    throw new Error(`Map must contain exactly ${value.width * value.height} cells`);
  }
  const seenCells = new Set<string>();
  for (const [index, rawCell] of value.cells.entries()) {
    if (!isRecord(rawCell) || !Number.isInteger(rawCell.x) || !Number.isInteger(rawCell.y)) throw new Error(`Map cell ${index} needs integer coordinates`);
    if (typeof rawCell.kind !== 'string' || !CELL_KINDS.has(rawCell.kind as CellKind)) throw new Error(`Map cell ${index} has an unsupported kind`);
    const x = rawCell.x as number;
    const y = rawCell.y as number;
    if (x !== index % value.width || y !== Math.floor(index / value.width)) throw new Error(`Map cells must be stored in row-major order; cell ${index} should be (${index % value.width}, ${Math.floor(index / value.width)})`);
    if (x < 0 || y < 0 || x >= value.width || y >= value.height) throw new Error(`Map cell (${x}, ${y}) is outside the grid`);
    const key = `${x},${y}`;
    if (seenCells.has(key)) throw new Error(`Duplicate map cell (${x}, ${y})`);
    seenCells.add(key);
    if (rawCell.kind === 'enterable-house' && (typeof rawCell.doorLayout !== 'string' || !DOOR_LAYOUTS.has(rawCell.doorLayout as DoorLayout))) {
      throw new Error(`Enterable house (${x}, ${y}) needs a supported door layout`);
    }
    if (rawCell.kind !== 'enterable-house' && 'doorLayout' in rawCell) throw new Error(`Only enterable houses may define doors at (${x}, ${y})`);
  }
  if (!Array.isArray(value.paths)) throw new Error('Map paths must be an array');
  const pathIds = new Set<string>();
  for (const [pathIndex, rawPath] of value.paths.entries()) {
    if (!isRecord(rawPath) || typeof rawPath.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(rawPath.id)) {
      throw new Error(`Map path ${pathIndex} needs a valid id`);
    }
    if (pathIds.has(rawPath.id)) throw new Error(`Duplicate path id: ${rawPath.id}`);
    pathIds.add(rawPath.id);
    if (typeof rawPath.name !== 'string' || !rawPath.name.trim()) throw new Error(`Map path ${rawPath.id} needs a name`);
    if (!Array.isArray(rawPath.cells) || rawPath.cells.length === 0) throw new Error(`Map path ${rawPath.id} must contain at least one cell`);
    const seenPoints = new Set<string>();
    const points: GridPoint[] = [];
    for (const [pointIndex, rawPoint] of rawPath.cells.entries()) {
      if (!isRecord(rawPoint) || !Number.isInteger(rawPoint.x) || !Number.isInteger(rawPoint.y)) throw new Error(`Path ${rawPath.id} point ${pointIndex} needs integer coordinates`);
      const point = { x: rawPoint.x as number, y: rawPoint.y as number };
      const cell = getMapCell(value as unknown as MapDocument, point.x, point.y);
      if (!cell) throw new Error(`Path ${rawPath.id} point (${point.x}, ${point.y}) is outside the grid`);
      if (cell.kind === 'solid-house') throw new Error(`Path ${rawPath.id} crosses a solid house at (${point.x}, ${point.y})`);
      const key = `${point.x},${point.y}`;
      if (seenPoints.has(key)) throw new Error(`Path ${rawPath.id} revisits cell (${point.x}, ${point.y})`);
      seenPoints.add(key);
      const previous = points.at(-1);
      if (previous) {
        if (Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y) !== 1) throw new Error(`Path ${rawPath.id} cells must be orthogonally adjacent`);
        validateDoorConnection(cellAt(value.cells, value.width, previous), cell, previous, point, rawPath.id);
      }
      points.push(point);
    }
  }
}

export function parseMapDocument(json: string): MapDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(`Map JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
  validateMapDocument(parsed);
  return cloneMapDocument(parsed);
}

export function serializeMapDocument(map: MapDocument): string {
  validateMapDocument(map);
  return `${JSON.stringify(map, null, 2)}\n`;
}

export function cloneMapDocument(map: MapDocument): MapDocument {
  validateMapDocument(map);
  const cells = map.cells.map((cell) => Object.freeze({ ...cell } as MapCell));
  const paths = map.paths.map((path) => Object.freeze({ ...path, cells: Object.freeze(path.cells.map((point) => Object.freeze({ ...point }))) }));
  return Object.freeze({ ...map, cells: Object.freeze(cells), paths: Object.freeze(paths) });
}

export const DEFAULT_MAP_STORAGE_KEY = 'operation-honkdown.map.v1';

export function saveMapToStorage(storage: Pick<Storage, 'setItem'>, map: MapDocument, key = DEFAULT_MAP_STORAGE_KEY): void {
  storage.setItem(key, serializeMapDocument(map));
}

export function loadMapFromStorage(storage: Pick<Storage, 'getItem'>, key = DEFAULT_MAP_STORAGE_KEY): MapDocument | null {
  const value = storage.getItem(key);
  return value === null ? null : parseMapDocument(value);
}

export function doorSidesForLayout(layout: DoorLayout): readonly DoorSide[] {
  if (layout === 'north-south') return ['north', 'south'];
  if (layout === 'west-east') return ['west', 'east'];
  return DOOR_SIDES;
}

export function oppositeDoorSide(side: DoorSide): DoorSide {
  if (side === 'north') return 'south';
  if (side === 'east') return 'west';
  if (side === 'south') return 'north';
  return 'east';
}

export function directionBetween(from: GridPoint, to: GridPoint): DoorSide | null {
  if (to.x === from.x && to.y === from.y - 1) return 'north';
  if (to.x === from.x + 1 && to.y === from.y) return 'east';
  if (to.x === from.x && to.y === from.y + 1) return 'south';
  if (to.x === from.x - 1 && to.y === from.y) return 'west';
  return null;
}

export function cellAt(cells: readonly unknown[], width: number, point: GridPoint): MapCell {
  return cells[point.y * width + point.x] as MapCell;
}

function validateDoorConnection(a: MapCell, b: MapCell, from: GridPoint, to: GridPoint, pathId: string): void {
  const direction = directionBetween(from, to);
  if (!direction) return;
  const reverse = oppositeDoorSide(direction);
  if (a.kind === 'enterable-house' && !doorSidesForLayout(a.doorLayout).includes(direction)) {
    throw new Error(`Path ${pathId} leaves enterable house (${a.x}, ${a.y}) through a wall`);
  }
  if (b.kind === 'enterable-house' && !doorSidesForLayout(b.doorLayout).includes(reverse)) {
    throw new Error(`Path ${pathId} enters enterable house (${b.x}, ${b.y}) through a wall`);
  }
}

function assertDimension(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < MAP_LIMITS.minDimension || value > MAP_LIMITS.maxDimension) {
    throw new Error(`Map ${label} must be an integer from ${MAP_LIMITS.minDimension} to ${MAP_LIMITS.maxDimension}`);
  }
}

function assertCellSize(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < MAP_LIMITS.minCellSize || value > MAP_LIMITS.maxCellSize) {
    throw new Error(`Map cell size must be between ${MAP_LIMITS.minCellSize} and ${MAP_LIMITS.maxCellSize} meters`);
  }
}

function assertSeed(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 0xffff_ffff) throw new Error('Map seed must be an unsigned 32-bit integer');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
