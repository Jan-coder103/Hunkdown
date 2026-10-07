import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, type ColorRepresentation } from 'three';
import { worldPosition, type GeneratedMap, type SlopePlacement } from '../../game/world/map-generator';
import type { MapDocument, GridPoint } from '../../game/world/map-types';
import type { AssetLodTier } from '../../content/assets/asset-types';

type FacadePalette = Readonly<{ wall: ColorRepresentation; base: ColorRepresentation; trim: ColorRepresentation; glass: ColorRepresentation; accent: ColorRepresentation }>;

const FACADE_PALETTES: Readonly<Record<string, FacadePalette>> = Object.freeze({
  'pastel-row-house': Object.freeze({ wall: '#e5a786', base: '#b77c66', trim: '#f1d8ae', glass: '#80b7b4', accent: '#647d70' }),
  'tall-townhouse': Object.freeze({ wall: '#8fb8aa', base: '#688e82', trim: '#eddbb7', glass: '#80b7b4', accent: '#c8755c' }),
  'corner-cafe': Object.freeze({ wall: '#d9a36f', base: '#a97851', trim: '#f1d19a', glass: '#9bc9c1', accent: '#58776c' }),
});

/** Draw a detailed, destructible facade while preserving the generated door openings. */
export function createEnterableBuilding(
  generated: GeneratedMap,
  cell: GridPoint,
  detail: AssetLodTier = 'close',
  assetId = 'pastel-row-house',
): Group {
  const root = new Group();
  root.name = `enterable house ${cell.x},${cell.y} — ${detail} LOD`;
  const palette = FACADE_PALETTES[assetId] ?? FACADE_PALETTES['pastel-row-house']!;
  const materials = {
    wall: new MeshStandardMaterial({ color: palette.wall, roughness: 0.88 }),
    base: new MeshStandardMaterial({ color: palette.base, roughness: 0.9 }),
    trim: new MeshStandardMaterial({ color: palette.trim, roughness: 0.78 }),
    glass: new MeshStandardMaterial({ color: palette.glass, roughness: 0.38, metalness: 0.06 }),
    accent: new MeshStandardMaterial({ color: palette.accent, roughness: 0.82 }),
  };
  for (const wall of generated.collisions) {
    if (wall.role !== 'enterable-wall' || wall.cell.x !== cell.x || wall.cell.y !== cell.y) continue;
    const panel = new Mesh(new BoxGeometry(wall.size.x, wall.size.y, wall.size.z), materials.wall);
    panel.name = wall.id ? `destructible building part ${wall.id}` : `enterable house wall ${wall.direction ?? 'side'}`;
    panel.position.set(wall.center.x, wall.center.y, wall.center.z);
    panel.castShadow = true;
    panel.receiveShadow = true;
    const localCenter = { x: 0, y: 0, z: 0 };
    addFacadeBand(panel, localCenter, wall.size, wall.direction, 0.23, 0.13, materials.base);
    addFacadeBand(panel, localCenter, wall.size, wall.direction, wall.size.y - 0.18, 0.16, materials.trim);
    const floorCount = Math.max(1, Math.ceil((wall.size.y - 2.2) / 2.55));
    for (let floor = 0; floor < floorCount; floor += 1) {
      const y = 1.45 + floor * 2.55;
      if (y + 0.55 >= wall.size.y - 0.25) continue;
      const length = wall.size.x > wall.size.z ? wall.size.x : wall.size.z;
      const windowCount = length > 5.4 ? 2 : 1;
      const windowWidth = Math.min(1.05, length / (windowCount + 1) * 0.62);
      for (let index = 0; index < windowCount; index += 1) {
        const along = (index + 1) * length / (windowCount + 1) - length / 2;
        addFacadeWindow(panel, localCenter, wall.size, wall.direction, along, y, windowWidth, detail, materials);
      }
    }
    root.add(panel);
  }

  for (const doorSide of generated.buildings.find((building) => building.cell.x === cell.x && building.cell.y === cell.y)?.doors ?? []) {
    addDoorwayTrim(root, generated, cell, doorSide, detail, materials);
  }
  return root;
}

function addFacadeBand(
  panel: Mesh,
  center: Readonly<{ x: number; y: number; z: number }>,
  wallSize: Readonly<{ x: number; y: number; z: number }>,
  side: 'north' | 'east' | 'south' | 'west' | undefined,
  y: number,
  height: number,
  material: MeshStandardMaterial,
): void {
  const horizontalLength = wallSize.x > wallSize.z ? wallSize.x : wallSize.z;
  addSurfaceBox(panel, center, wallSize, side, 0, y, horizontalLength - 0.1, height, Math.min(0.12, Math.min(wallSize.x, wallSize.z) * 0.42), material, 'facade band');
}

function addFacadeWindow(
  panel: Mesh,
  center: Readonly<{ x: number; y: number; z: number }>,
  wallSize: Readonly<{ x: number; y: number; z: number }>,
  side: 'north' | 'east' | 'south' | 'west' | undefined,
  along: number,
  y: number,
  width: number,
  detail: AssetLodTier,
  materials: Readonly<Record<'wall' | 'base' | 'trim' | 'glass' | 'accent', MeshStandardMaterial>>,
): void {
  const windowHeight = 1.0;
  if (detail === 'far') {
    addSurfaceBox(panel, center, wallSize, side, along, y, width, windowHeight, 0.055, materials.accent, 'far facade window');
    return;
  }
  addSurfaceBox(panel, center, wallSize, side, along, y, width + 0.16, windowHeight + 0.16, 0.09, materials.trim, 'window surround');
  addSurfaceBox(panel, center, wallSize, side, along, y, width, windowHeight, 0.065, materials.glass, 'window glass');
  addSurfaceBox(panel, center, wallSize, side, along, y, 0.055, windowHeight, 0.105, materials.trim, 'window mullion');
  addSurfaceBox(panel, center, wallSize, side, along, y, width + 0.24, 0.095, 0.14, materials.trim, 'projecting window sill');
  const shutterWidth = 0.1;
  for (const offset of [-1, 1]) {
    addSurfaceBox(panel, center, wallSize, side, along + offset * (width / 2 + 0.13), y, shutterWidth, windowHeight * 0.92, 0.075, materials.accent, 'painted shutter');
  }
}

function addDoorwayTrim(
  root: Group,
  generated: GeneratedMap,
  cell: GridPoint,
  side: 'north' | 'east' | 'south' | 'west',
  detail: AssetLodTier,
  materials: Readonly<Record<'wall' | 'base' | 'trim' | 'glass' | 'accent', MeshStandardMaterial>>,
): void {
  const building = generated.buildings.find((candidate) => candidate.cell.x === cell.x && candidate.cell.y === cell.y);
  if (!building) return;
  const position = building.position;
  const cellSize = generated.source.cellSize;
  const height = Math.max(1.8, ...generated.collisions
    .filter((collision) => collision.role === 'enterable-wall' && collision.cell.x === cell.x && collision.cell.y === cell.y)
    .map((collision) => collision.size.y));
  const wallThickness = 0.3;
  const outward = detail === 'close' ? 0.08 : 0.055;
  const postWidth = detail === 'close' ? 0.14 : 0.1;
  const openingWidth = 1.5;
  const horizontal = side === 'north' || side === 'south';
  const z = position.z + (side === 'north' ? -cellSize / 2 - wallThickness / 2 - outward / 2 : side === 'south' ? cellSize / 2 + wallThickness / 2 + outward / 2 : 0);
  const x = position.x + (side === 'west' ? -cellSize / 2 - wallThickness / 2 - outward / 2 : side === 'east' ? cellSize / 2 + wallThickness / 2 + outward / 2 : 0);
  const frameMaterial = detail === 'close' ? materials.trim : materials.accent;
  for (const offset of [-1, 1]) {
    const post = new Mesh(new BoxGeometry(horizontal ? postWidth : outward, 1.98, horizontal ? outward : postWidth), frameMaterial);
    post.name = `doorway trim ${side} post`;
    const postOffset = openingWidth / 2 + postWidth / 2;
    post.position.set(x + (horizontal ? offset * postOffset : 0), 0.99, z + (horizontal ? 0 : offset * postOffset));
    root.add(post);
  }
  const lintel = new Mesh(new BoxGeometry(horizontal ? openingWidth + 0.18 : outward, 0.14, horizontal ? outward : openingWidth + 0.18), frameMaterial);
  lintel.name = `doorway trim ${side} lintel`;
  lintel.position.set(x, 2.04, z);
  root.add(lintel);
  if (detail === 'close') {
    const sign = new Mesh(new BoxGeometry(horizontal ? 0.44 : outward, 0.16, horizontal ? outward : 0.44), materials.accent);
    sign.name = `doorway marker ${side}`;
    sign.position.set(x, Math.min(height - 0.25, 2.32), z);
    root.add(sign);
  }
}

function addSurfaceBox(
  parent: Mesh,
  center: Readonly<{ x: number; y: number; z: number }>,
  wallSize: Readonly<{ x: number; y: number; z: number }>,
  side: 'north' | 'east' | 'south' | 'west' | undefined,
  along: number,
  y: number,
  width: number,
  height: number,
  depth: number,
  material: MeshStandardMaterial,
  name: string,
): void {
  const horizontalWall = side === 'north' || side === 'south' || (side === undefined && wallSize.x >= wallSize.z);
  const faceSign = side === 'north' || side === 'west' ? -1 : 1;
  const normalHalf = horizontalWall ? wallSize.z / 2 : wallSize.x / 2;
  const faceX = horizontalWall ? center.x + along : center.x + faceSign * (normalHalf + depth / 2 + 0.008);
  const faceZ = horizontalWall ? center.z + faceSign * (normalHalf + depth / 2 + 0.008) : center.z + along;
  const geometry = horizontalWall
    ? new BoxGeometry(width, height, depth)
    : new BoxGeometry(depth, height, width);
  const piece = new Mesh(geometry, material);
  piece.name = name;
  piece.position.set(faceX, y - wallSize.y / 2, faceZ);
  parent.add(piece);
}

export function createSlopeGeometry(map: MapDocument, slope: SlopePlacement): BufferGeometry {
  const high = worldPosition(map, slope.highCell);
  const low = worldPosition(map, slope.lowCell);
  const dx = Math.sign(low.x - high.x);
  const dz = Math.sign(low.z - high.z);
  const boundaryX = (high.x + low.x) / 2;
  const boundaryZ = (high.z + low.z) / 2;
  const halfWidth = Math.min(map.cellSize * 0.38, 2.8);
  const perpendicularX = -dz;
  const perpendicularZ = dx;
  const topX = boundaryX;
  const topZ = boundaryZ;
  const bottomX = boundaryX + dx * slope.run;
  const bottomZ = boundaryZ + dz * slope.run;
  const positions = [
    topX - perpendicularX * halfWidth, slope.height, topZ - perpendicularZ * halfWidth,
    topX + perpendicularX * halfWidth, slope.height, topZ + perpendicularZ * halfWidth,
    bottomX - perpendicularX * halfWidth, 0.025, bottomZ - perpendicularZ * halfWidth,
    bottomX + perpendicularX * halfWidth, 0.025, bottomZ + perpendicularZ * halfWidth,
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}
