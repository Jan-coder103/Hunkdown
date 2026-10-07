import { BoxGeometry, Mesh, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createEmptyMap, paintMapCell } from '../src/game/world/map-types';
import { generateMap, worldPosition } from '../src/game/world/map-generator';
import { createEnterableBuilding, createSlopeGeometry } from '../src/tools/map-editor/map-geometry';

describe('generated city preview geometry', () => {
  it('renders open doorways and solid walls from the same collision records', () => {
    const generated = generateMap(paintMapCell(createEmptyMap({ width: 3, height: 3 }), 1, 1, 'enterable-house', 'north-south'));
    for (const detail of ['close', 'far'] as const) {
      const building = createEnterableBuilding(generated, { x: 1, y: 1 }, detail);
      building.updateMatrixWorld(true);
      const northDoor = new Raycaster(new Vector3(0, 1, -6), new Vector3(0, 0, 1));
      expect(northDoor.intersectObject(building, true)).toHaveLength(0);
      const closedWest = new Raycaster(new Vector3(-6, 1, 0), new Vector3(1, 0, 0));
      expect(closedWest.intersectObject(building, true).length).toBeGreaterThan(0);

      const wallParts = building.children.filter((child) => child.name.startsWith('destructible building part '));
      const expectedWalls = generated.collisions.filter((item) => item.role === 'enterable-wall');
      expect(wallParts).toHaveLength(expectedWalls.length);
      for (const child of wallParts) {
        expect(child).toBeInstanceOf(Mesh);
        const mesh = child as Mesh;
        const id = child.name.replace('destructible building part ', '');
        const wall = expectedWalls.find((item) => item.id === id);
        expect(wall).toBeDefined();
        const dimensions = (mesh.geometry as BoxGeometry).parameters;
        expect(dimensions.width).toBeCloseTo(wall!.size.x);
        expect(dimensions.height).toBeCloseTo(wall!.size.y);
        expect(dimensions.depth).toBeCloseTo(wall!.size.z);
        expect(mesh.children.length).toBeGreaterThan(detail === 'close' ? 4 : 2);
      }
    }
  });

  it('keeps each authored doorway clear at both visual detail levels', () => {
    const generated = generateMap(paintMapCell(createEmptyMap({ width: 3, height: 3 }), 1, 1, 'enterable-house', 'all-sides'));
    const crossings = [
      [new Vector3(0, 1, -6), new Vector3(0, 0, 1)],
      [new Vector3(0, 1, 6), new Vector3(0, 0, -1)],
      [new Vector3(-6, 1, 0), new Vector3(1, 0, 0)],
      [new Vector3(6, 1, 0), new Vector3(-1, 0, 0)],
    ] as const;
    for (const detail of ['close', 'far'] as const) {
      const building = createEnterableBuilding(generated, { x: 1, y: 1 }, detail);
      building.updateMatrixWorld(true);
      for (const [origin, direction] of crossings) {
        expect(new Raycaster(origin, direction).intersectObject(building, true)).toHaveLength(0);
      }
    }
  });

  it('keeps all ramp surfaces outside the raised tile and aligned with collision width', () => {
    const map = paintMapCell(createEmptyMap({ width: 3, height: 3 }), 1, 1, 'elevation');
    const generated = generateMap(map);
    const high = worldPosition(map, { x: 1, y: 1 });
    for (const slope of generated.slopes) {
      const geometry = createSlopeGeometry(map, slope);
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox!;
      const collider = generated.collisions.find((item) => item.role === 'slope-ramp' && item.direction === slope.direction)!;
      expect(bounds.getSize(new Vector3()).x).toBeCloseTo(collider.size.x);
      expect(bounds.getSize(new Vector3()).z).toBeCloseTo(collider.size.z);
      expect(bounds.getCenter(new Vector3()).x).toBeCloseTo(collider.center.x);
      expect(bounds.getCenter(new Vector3()).z).toBeCloseTo(collider.center.z);
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i += 1) {
        expect(Math.max(Math.abs(positions.getX(i) - high.x), Math.abs(positions.getZ(i) - high.z))).toBeGreaterThanOrEqual(map.cellSize / 2);
      }
      expect(positions.getY(0)).toBe(slope.height);
      geometry.dispose();
    }
  });
});
