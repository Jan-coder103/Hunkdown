import { Box3, InstancedMesh, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createEmptyMap, paintMapCell, type MapDocument } from '../src/game/world/map-types';
import { generateMap, worldPosition } from '../src/game/world/map-generator';
import { generateStreetLayout, type StreetSurface } from '../src/game/world/street-layout';
import { createStreetView } from '../src/game/world/street-view';
import { BotSkirmishView } from '../src/game/bots/bot-skirmish-view';
import { Scene } from 'three';

const covers = (piece: StreetSurface, x: number, z: number) => Math.abs(piece.x - x) < piece.width / 2 && Math.abs(piece.z - z) < piece.depth / 2;
function blockMap() {
  let map = createEmptyMap({ width: 5, height: 5 });
  for (const [x, y] of [[1, 1], [2, 1], [1, 2], [2, 2]]) map = paintMapCell(map, x!, y!, 'solid-house');
  return map;
}
function pavedAt(map: MapDocument, x: number, z: number) {
  return generateStreetLayout(map).some((piece) => piece.kind === 'sidewalk' && covers(piece, x, z));
}

describe('automatic city streets', () => {
  it('wraps a connected building block with continuous sidewalks and outside corners', () => {
    const map = blockMap();
    // The 2x2 block occupies x/z -12..4; its outer sidewalk joins across tile seams.
    for (const x of [-11.5, -8.1, -7.9, -0.1, 0.1, 3.5]) expect(pavedAt(map, x, -12.5)).toBe(true);
    expect(pavedAt(map, -12.5, -12.5)).toBe(true);
    expect(pavedAt(map, 4.5, 4.5)).toBe(true);
    expect(pavedAt(map, -4, -4)).toBe(false); // No paving through shared walls.
    expect(pavedAt(map, 8, 8)).toBe(false); // Remaining open space is road.
    const surfaces = generateStreetLayout(map);
    expect(surfaces.filter((piece) => piece.kind === 'road')).toHaveLength(21);
    expect(generateStreetLayout(map)).toEqual(surfaces);
  });

  it('handles isolated, enterable, boundary and L-shaped buildings without filling courtyards', () => {
    let map = createEmptyMap({ width: 5, height: 5 });
    for (const [x, y] of [[0, 0], [1, 0], [0, 1]]) map = paintMapCell(map, x!, y!, 'enterable-house');
    const street = worldPosition(map, { x: 1, y: 1 });
    expect(pavedAt(map, street.x - 3.5, street.z)).toBe(true);
    expect(pavedAt(map, street.x, street.z - 3.5)).toBe(true);
    expect(pavedAt(map, street.x, street.z)).toBe(false);
    for (const surface of generateStreetLayout(map)) {
      expect(Math.abs(surface.x) + surface.width / 2).toBeLessThanOrEqual(20.001);
      expect(Math.abs(surface.z) + surface.depth / 2).toBeLessThanOrEqual(20.001);
    }
  });

  it('continues white dashes on straight roads and leaves T junction centers clear', () => {
    let map = createEmptyMap({ width: 5, height: 5 });
    for (const cell of map.cells) if (cell.y !== 2) map = paintMapCell(map, cell.x, cell.y, 'solid-house');
    const center = worldPosition(map, { x: 2, y: 2 });
    const markings = generateStreetLayout(map).filter((piece) => piece.kind === 'marking');
    expect(markings.some((piece) => covers(piece, center.x, center.z))).toBe(true);
    expect(markings.every((piece) => piece.width > piece.depth)).toBe(true);
    map = paintMapCell(map, 2, 1, 'street');
    const junction = generateStreetLayout(map).filter((piece) => piece.kind === 'marking');
    expect(junction.some((piece) => covers(piece, center.x, center.z))).toBe(false);
    expect(junction.some((piece) => piece.x === center.x && piece.z < center.z && piece.depth > piece.width)).toBe(true);
    for (const line of junction) expect(pavedAt(map, line.x, line.z)).toBe(false);
  });

  it('marks the middle of broad roads instead of drawing a lane grid across open ground', () => {
    const map = createEmptyMap({ width: 5, height: 5 });
    const lines = generateStreetLayout(map).filter((piece) => piece.kind === 'marking');
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((piece) => piece.x === 0 || piece.z === 0)).toBe(true);
  });

  it('keeps raised terrain unpainted and preserves collision, doors and navigation', () => {
    let map = paintMapCell(blockMap(), 3, 3, 'elevation');
    map = paintMapCell(map, 1, 1, 'enterable-house', 'all-sides');
    const before = generateMap(map);
    const street = generateStreetLayout(map);
    const high = worldPosition(map, { x: 3, y: 3 });
    expect(street.some((piece) => covers(piece, high.x, high.z))).toBe(false);
    expect(generateMap(map)).toEqual(before);
    for (const door of before.buildings.find((building) => building.enterable)!.doors) expect(['north', 'east', 'south', 'west']).toContain(door);
  });

  it('batches paving into four draws with shallow curbs and releases resources with the live city', () => {
    const map = blockMap();
    const street = createStreetView(map);
    expect(street.children).toHaveLength(4);
    expect(street.children.every((child) => child instanceof InstancedMesh)).toBe(true);
    const box = new Box3().setFromObject(street);
    expect(box.max.y).toBeCloseTo(0.04);
    expect(box.getSize(new Vector3()).x).toBeCloseTo(40);
    const scene = new Scene();
    const view = new BotSkirmishView(scene, generateMap(map), { friendlyCount: 1, enemyCount: 1 });
    const paving = scene.getObjectByName('city sidewalk') as InstancedMesh;
    const geometryDispose = vi.spyOn(paving.geometry, 'dispose');
    const instanceDispose = vi.spyOn(paving, 'dispose');
    view.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(instanceDispose).toHaveBeenCalledTimes(1);
    // Dispose this standalone inspection model too (geometry is shared among batches).
    const geometry = (street.children[0] as InstancedMesh).geometry;
    for (const child of street.children as InstancedMesh[]) {
      child.dispose();
      const material = child.material;
      for (const item of Array.isArray(material) ? material : [material]) item.dispose();
    }
    geometry.dispose();
  });
});
