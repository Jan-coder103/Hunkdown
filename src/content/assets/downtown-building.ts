import { BoxGeometry, Group } from 'three';
import { createAssetRoot, type AssetDefinition } from './asset-types';
import { makeAssetMesh } from './asset-mesh';

/** The structural shell, rather than roof overhangs, occupies the entire tile. */
export function downtownBuilding(id: string, displayName: string, floors: number, color: string): AssetDefinition {
  const height = floors * 0.82 + 0.12;
  function build(close: boolean) {
    const root = createAssetRoot(`${displayName} — ${close ? 'close' : 'far'} LOD`);
    const box = (parent: Group, name: string, size: [number, number, number], position: [number, number, number], tint: string) => {
      const mesh = makeAssetMesh(new BoxGeometry(...size), tint, name);
      mesh.position.set(...position);
      parent.add(mesh);
    };
    box(root, 'full tile structural shell', [2.8, height, 2.8], [0, height / 2, 0], color);
    box(root, 'flat roof cornice', [2.8, 0.12, 2.8], [0, height - 0.06, 0], '#434e59');
    if (!close) return root; // 24 triangles; no individual windows or roof equipment.
    box(root, 'inset flat roof', [2.55, 0.035, 2.55], [0, height + 0.0175, 0], '#414a53');
    box(root, 'roof ventilation housing', [0.5, 0.22, 0.42], [0.52, height + 0.11, -0.4], '#a5afb8');
    for (let side = 0; side < 4; side += 1) {
      const facade = new Group();
      facade.rotation.y = side * Math.PI / 2;
      root.add(facade);
      // Details stay inside the footprint, so neighboring shells meet on all four sides.
      for (let floor = 0; floor < floors; floor += 1) {
        const y = floor * 0.82 + 0.4;
        box(facade, 'floor string course', [2.8, 0.055, 0.025], [0, floor * 0.82 + 0.04, 1.392], '#434e59');
        for (const x of [-0.9, 0, 0.9]) {
          box(facade, 'window surround', [0.72, 0.67, 0.025], [x, y, 1.39], '#434e59');
          box(facade, floor === 0 ? 'storefront glazing' : 'upper window glass', [0.65, 0.59, 0.018], [x, y, 1.391], '#567e99');
          box(facade, 'window mullion', [0.025, 0.59, 0.02], [x, y, 1.39], '#434e59');
          box(facade, 'stone window sill', [0.65, 0.045, 0.07], [x, y - 0.29, 1.37], '#c9ced3');
        }
      }
      for (const x of [-1.32, 1.32]) box(facade, 'corner masonry pier', [0.12, height - 0.15, 0.035], [x, height / 2, 1.39], '#434e59');
      box(facade, 'shop sign fascia', [1.9, 0.13, 0.055], [0, 0.74, 1.38], '#303c49');
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
