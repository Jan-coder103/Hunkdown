import { BoxGeometry, Group, InstancedMesh, MeshStandardMaterial, Object3D, StaticDrawUsage } from 'three';
import type { MapDocument } from './map-types';
import { generateStreetLayout, type StreetSurface } from './street-layout';

const STYLES = {
  road: { color: '#41474e', top: 0.006 },
  sidewalk: { color: '#aeb4b8', top: 0.028 },
  curb: { color: '#d1d5d8', top: 0.04 },
  marking: { color: '#f1f2ed', top: 0.012 },
} as const;

/** Four material batches shared by the live city and editor preview. */
export function createStreetView(map: MapDocument): Group {
  const root = new Group();
  root.name = 'automatic streets and block sidewalks';
  const surfaces = generateStreetLayout(map);
  const geometry = new BoxGeometry(1, 1, 1);
  const transform = new Object3D();
  for (const kind of Object.keys(STYLES) as StreetSurface['kind'][]) {
    const pieces = surfaces.filter((surface) => surface.kind === kind);
    if (!pieces.length) continue;
    const style = STYLES[kind];
    const batch = new InstancedMesh(geometry, new MeshStandardMaterial({ color: style.color, roughness: 0.95 }), pieces.length);
    batch.name = `city ${kind}`;
    batch.instanceMatrix.setUsage(StaticDrawUsage);
    batch.receiveShadow = true;
    for (const [index, piece] of pieces.entries()) {
      transform.position.set(piece.x, style.top / 2, piece.z);
      transform.scale.set(piece.width, style.top, piece.depth);
      transform.updateMatrix();
      batch.setMatrixAt(index, transform.matrix);
    }
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    root.add(batch);
  }
  if (!root.children.length) geometry.dispose();
  return root;
}
