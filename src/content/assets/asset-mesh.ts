import { Mesh, type BufferGeometry, MeshStandardMaterial, type ColorRepresentation } from 'three';

export function makeAssetMesh(
  geometry: BufferGeometry,
  color: ColorRepresentation,
  name: string,
  roughness = 0.84,
): Mesh {
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ color, roughness }));
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
