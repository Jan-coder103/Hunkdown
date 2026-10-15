import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAssetRoot, type AssetDefinition } from './asset-types';

/** Full-width structural bands meet neighboring tiles; recessed wall bays expose the glazing. */
export function downtownBuilding(id: string, displayName: string, floors: number, color: string): AssetDefinition {
  const height = floors * 0.82 + 0.12;
  function build(close: boolean) {
    const root = createAssetRoot(`${displayName} — ${close ? 'close' : 'far'} LOD`);
    const materials = new Map<string, MeshStandardMaterial>();
    const material = (tint: string) => {
      if (!materials.has(tint)) materials.set(tint, new MeshStandardMaterial({ color: tint, roughness: tint === '#567e99' ? 0.42 : 0.88 }));
      return materials.get(tint)!;
    };
    const box = (parent: Group, name: string, size: [number, number, number], position: [number, number, number], tint: string) => {
      const mesh = new Mesh(new BoxGeometry(...size), material(tint));
      mesh.name = name;
      mesh.position.set(...position);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    if (!close) {
      box(root, 'full tile structural shell', [2.8, height, 2.8], [0, height / 2, 0], color);
      box(root, 'flat roof cornice', [2.8, 0.12, 2.8], [0, height - 0.06, 0], '#8b949b');
      return root;
    }
    // One structural mesh: an inset body plus flush corner masonry and floor bands.
    const shellParts: BoxGeometry[] = [];
    const shellBox = (size: [number, number, number], position: [number, number, number]) => {
      const geometry = new BoxGeometry(...size);
      geometry.translate(...position);
      shellParts.push(geometry);
    };
    shellBox([2.64, height, 2.64], [0, height / 2, 0]);
    for (const x of [-1.33, 1.33]) for (const z of [-1.33, 1.33]) shellBox([0.14, height, 0.14], [x, height / 2, z]);
    for (let floor = 0; floor <= floors; floor += 1) {
      shellBox([2.8, 0.10, 2.8], [0, Math.min(height - 0.05, floor * 0.82 + 0.05), 0]);
    }
    const shell = new Mesh(mergeGeometries(shellParts, false)!, material(color));
    shell.name = 'full tile structural shell';
    shell.castShadow = true;
    shell.receiveShadow = true;
    root.add(shell);
    for (const geometry of shellParts) geometry.dispose();
    box(root, 'flat roof cornice', [2.8, 0.10, 2.8], [0, height - 0.05, 0], '#8b949b');
    box(root, 'inset flat roof', [2.55, 0.035, 2.55], [0, height + 0.0175, 0], '#66717c');
    box(root, 'roof ventilation housing', [0.5, 0.22, 0.42], [0.52, height + 0.11, -0.4], '#a5afb8');
    for (let side = 0; side < 4; side += 1) {
      const facade = new Group();
      facade.name = `street facade ${side}`;
      facade.rotation.y = side * Math.PI / 2;
      root.add(facade);
      for (let floor = 0; floor < floors; floor += 1) {
        const ground = floor === 0;
        const y = floor * 0.82 + 0.43;
        for (const x of [-0.86, 0, 0.86]) {
          const width = ground ? 0.62 : 0.43;
          const windowHeight = ground ? 0.56 : 0.44;
          // Every layer has a distinct outward face: shell 1.32, surround 1.344,
          // glass 1.361, mullion 1.381. All remain within the 1.4 tile boundary.
          box(facade, 'window surround', [width + 0.09, windowHeight + 0.09, 0.024], [x, y, 1.332], '#c9ced3');
          box(facade, ground ? 'storefront glazing' : 'upper window glass', [width, windowHeight, 0.018], [x, y, 1.352], '#567e99');
          box(facade, 'window mullion', [0.022, windowHeight, 0.02], [x, y, 1.371], '#a5afb8');
          box(facade, 'stone window sill', [width + 0.12, 0.045, 0.075], [x, y - windowHeight / 2 - 0.025, 1.36], '#c9ced3');
        }
      }
      box(facade, 'shop sign fascia', [2.42, 0.12, 0.04], [0, 0.76, 1.36], id === 'corner-cafe' ? '#627e75' : '#66717c');
      box(facade, 'entrance door frame', [0.37, 0.61, 0.035], [0, 0.355, 1.36], '#434e59');
      box(facade, 'entrance door glass', [0.28, 0.49, 0.012], [0, 0.37, 1.383], '#567e99');
      box(facade, 'entrance door handle', [0.018, 0.09, 0.012], [0.09, 0.34, 1.393], '#c9ced3');
    }
    return root;
  }
  return Object.freeze({
    id, displayName, category: 'building',
    bounds: { min: [-1.4, 0, -1.4] as const, max: [1.4, height + 0.22, 1.4] as const },
    collision: [{ id: 'building-shell', center: [0, height / 2, 0] as const, size: [2.8, height, 2.8] as const }],
    lodFactories: { close: () => build(true), far: () => build(false) },
  });
}
