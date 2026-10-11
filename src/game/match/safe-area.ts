import type { GeneratedMap } from '../world/map-generator';

export type SafeArea = Readonly<{ minX: number; maxX: number; minZ: number; maxZ: number }>;
/** Half the former spawn-side area, retaining the full map depth. */
export function teamSafeArea(map: GeneratedMap, team: string): SafeArea {
  const { width, height, cellSize } = map.source;
  const edge = width * cellSize / 2;
  const oldWidth = (Math.floor((width - 1) * 0.36) + 1) * cellSize;
  const boundary = -edge + oldWidth / 2;
  return Object.freeze({ minX: team === 'enemy' ? -boundary : -edge,
    maxX: team === 'enemy' ? edge : boundary, minZ: -height * cellSize / 2, maxZ: height * cellSize / 2 });
}
export function containsSafeArea(area: SafeArea, position: Readonly<{ x: number; z: number }>): boolean {
  return position.x >= area.minX && position.x <= area.maxX && position.z >= area.minZ && position.z <= area.maxZ;
}
