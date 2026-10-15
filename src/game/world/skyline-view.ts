import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '../../engine/seeded-random';
import type { MapDocument } from './map-types';

const PALETTE = ['#737f80', '#918574', '#7b8b7b', '#878394', '#7a8d98'];
const HORIZON = new Color('#dce8df');

/** Static scenery only. Four opaque batches, no collision or simulation entities. */
export function createSkylineView(map: Pick<MapDocument, 'width' | 'height' | 'cellSize' | 'seed'>) {
  const root = new Group();
  root.name = 'distant city skyline';
  const material = new MeshBasicMaterial({ vertexColors: true });
  const random = createSeededRandom((map.seed ^ 0x51c17e) >>> 0);
  const halfX = map.width * map.cellSize / 2;
  const halfZ = map.height * map.cellSize / 2;
  const owned: BufferGeometry[] = [];

  for (let side = 0; side < 4; side += 1) {
    const parts: BufferGeometry[] = [];
    function box(x: number, y: number, z: number, width: number, height: number, depth: number, color: Color) {
      const source = new BoxGeometry(width, height, depth);
      const geometry = source.toNonIndexed();
      source.dispose();
      const normals = geometry.getAttribute('normal');
      const colors: number[] = [];
      for (let i = 0; i < normals.count; i += 1) {
        const shade = normals.getY(i) > 0 ? 1.08 : normals.getX(i) > 0 ? 0.82 : 0.94;
        colors.push(color.r * shade, color.g * shade, color.b * shade);
      }
      geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
      geometry.translate(x, y, z);
      parts.push(geometry);
    }
    const horizontal = side < 2;
    const sign = side % 2 === 0 ? -1 : 1;
    const along = horizontal ? halfX : halfZ;
    const across = horizontal ? halfZ : halfX;
    // Four non-overlapping strips leave the playable ground untouched, even on rectangular maps.
    // Approximate the warm, lit asphalt appearance using the unlit scenery material.
    const groundColor = new Color('#625f4d');
    if (horizontal) box(0, -0.16, sign * (across + 115), (halfX + 230) * 2, 0.2, 230, groundColor);
    else box(sign * (across + 115), -0.16, 0, 230, 0.2, halfZ * 2, groundColor);
    for (let layer = 0; layer < 3; layer += 1) {
      for (let index = 0; index < 8; index += 1) {
        const t = (index + 0.2 + random() * 0.6) / 8;
        const span = along + layer * 38;
        const u = (t * 2 - 1) * span;
        const v = sign * (across + 32 + layer * 62 + random() * 16);
        const x = horizontal ? u : v;
        const z = horizontal ? v : u;
        const width = 10 + random() * 15;
        const depth = 10 + random() * 13;
        const height = 12 + random() * 22 + layer * 7;
        const color = new Color(PALETTE[Math.floor(random() * PALETTE.length)]!).lerp(HORIZON, 0.04 + layer * 0.30);
        box(x, height / 2, z, width, height, depth, color);
        // Stepped roof silhouettes and occasional taller landmark crowns, visible from above too.
        const crown = 2 + random() * (index % 4 === 0 ? 12 : 4);
        box(x, height + crown / 2, z, width * 0.55, crown, depth * 0.6, color);
      }
    }
    const geometry = mergeGeometries(parts, false)!;
    for (const part of parts) part.dispose();
    geometry.computeBoundingSphere();
    owned.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.name = `skyline sector ${side}`;
    root.add(mesh);
  }
  let disposed = false;
  return { root, dispose() {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    for (const geometry of owned) geometry.dispose();
    material.dispose();
  } };
}
