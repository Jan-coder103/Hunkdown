import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { worldPosition, type GeneratedMap, type SlopePlacement } from '../../game/world/map-generator';
import type { MapDocument, GridPoint } from '../../game/world/map-types';

/** Draw the same open wall segments that define door collision. */
export function createEnterableBuilding(generated: GeneratedMap, cell: GridPoint): Group {
  const root = new Group();
  root.name = `enterable house ${cell.x},${cell.y}`;
  const material = new MeshStandardMaterial({ color: '#e8d18c', roughness: 0.9 });
  for (const wall of generated.collisions) {
    if (wall.role !== 'enterable-wall' || wall.cell.x !== cell.x || wall.cell.y !== cell.y) continue;
    const mesh = new Mesh(new BoxGeometry(wall.size.x, wall.size.y, wall.size.z), material);
    if (wall.id) mesh.name = `destructible building part ${wall.id}`;
    mesh.position.set(wall.center.x, wall.center.y, wall.center.z);
    root.add(mesh);
  }
  return root;
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
