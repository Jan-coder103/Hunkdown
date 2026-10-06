import type { GeneratedMap } from '../world/map-generator';
import { worldPosition } from '../world/map-generator';
import type { GridPoint } from '../world/map-types';

type Node = Readonly<{ cell: GridPoint; x: number; y: number; z: number }>;
type Edge = Readonly<{ to: string; viaSlope: boolean }>;
type QueueItem = { key: string; score: number };

/** Door- and slope-aware routes derived from the same graph used by map generation. */
export class BotNavigation {
  private readonly nodes = new Map<string, Node>();
  private readonly edges = new Map<string, Edge[]>();
  private readonly coverCells: readonly GridPoint[];

  constructor(readonly map: GeneratedMap) {
    const elevationHeights = new Map(map.elevations.map((elevation) => [keyOf(elevation.cell), elevation.height]));
    for (const cell of map.navigationNodes) {
      const world = worldPosition(map.source, cell);
      const node = Object.freeze({
        cell,
        x: world.x,
        y: elevationHeights.get(keyOf(cell)) ?? 0,
        z: world.z,
      });
      const key = keyOf(cell);
      this.nodes.set(key, node);
      this.edges.set(key, []);
    }

    for (const link of map.navigationLinks) {
      const from = keyOf(link.from);
      const to = keyOf(link.to);
      if (!this.nodes.has(from) || !this.nodes.has(to)) continue;
      this.edges.get(from)?.push(Object.freeze({ to, viaSlope: link.viaSlope }));
      this.edges.get(to)?.push(Object.freeze({ to: from, viaSlope: link.viaSlope }));
    }

    const covers = new Map<string, GridPoint>();
    for (const cell of map.source.cells) {
      if (cell.kind !== 'solid-house') continue;
      for (const neighbor of [
        { x: cell.x, y: cell.y - 1 },
        { x: cell.x + 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 },
        { x: cell.x - 1, y: cell.y },
      ]) {
        if (this.nodes.has(keyOf(neighbor))) covers.set(keyOf(neighbor), Object.freeze(neighbor));
      }
    }
    this.coverCells = Object.freeze([...covers.values()]);
  }

  hasCell(cell: GridPoint): boolean {
    return this.nodes.has(keyOf(cell));
  }

  reachableCells(start: GridPoint): readonly GridPoint[] {
    const startKey = keyOf(start);
    if (!this.nodes.has(startKey)) return Object.freeze([]);
    const visited = new Set<string>([startKey]);
    const queue = [startKey];
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      if (!current) continue;
      for (const edge of this.edges.get(current) ?? []) {
        if (visited.has(edge.to)) continue;
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
    return Object.freeze(queue.map((key) => this.nodes.get(key)!.cell));
  }

  /** Maps a world position to the nearest reachable map cell. */
  nearestCell(position: Readonly<{ x: number; z: number }>): GridPoint | null {
    const cellSize = this.map.source.cellSize;
    const gridCell = {
      x: Math.round(position.x / cellSize + (this.map.source.width - 1) / 2),
      y: Math.round(position.z / cellSize + (this.map.source.height - 1) / 2),
    };
    const direct = this.nodes.get(keyOf(gridCell));
    if (direct) return direct.cell;

    let nearest: Node | null = null;
    let nearestDistanceSq = Number.POSITIVE_INFINITY;
    for (const node of this.nodes.values()) {
      const dx = node.x - position.x;
      const dz = node.z - position.z;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < nearestDistanceSq) {
        nearest = node;
        nearestDistanceSq = distanceSq;
      }
    }
    return nearest?.cell ?? null;
  }

  isAtCell(position: Readonly<{ x: number; z: number }>, cell: GridPoint, tolerance = 0.45): boolean {
    const node = this.nodes.get(keyOf(cell));
    return Boolean(node && Math.hypot(node.x - position.x, node.z - position.z) <= tolerance);
  }

  /**
   * Finds a weighted shortest path. A stable per-bot seed breaks equal-cost ties
   * differently, so squads spread through equivalent lanes without map nondeterminism.
   */
  findPath(start: GridPoint, goal: GridPoint, routeSeed = 0): readonly GridPoint[] | null {
    const startKey = keyOf(start);
    const goalKey = keyOf(goal);
    if (!this.nodes.has(startKey) || !this.nodes.has(goalKey)) return null;
    if (startKey === goalKey) return Object.freeze([this.nodes.get(startKey)!.cell]);

    const open = new MinQueue();
    const cameFrom = new Map<string, string>();
    const costSoFar = new Map<string, number>([[startKey, 0]]);
    const closed = new Set<string>();
    open.push({ key: startKey, score: this.heuristic(startKey, goalKey) });

    while (open.size > 0) {
      const current = open.pop();
      if (!current || closed.has(current.key)) continue;
      if (current.key === goalKey) return this.reconstruct(cameFrom, goalKey);
      closed.add(current.key);
      const currentCost = costSoFar.get(current.key);
      if (currentCost === undefined) continue;

      for (const edge of this.edges.get(current.key) ?? []) {
        if (closed.has(edge.to)) continue;
        const routeBias = routeSeed === 0 ? 0 : stableEdgeBias(routeSeed, current.key, edge.to);
        const stepCost = this.map.source.cellSize * (edge.viaSlope ? 1.08 : 1) * (1 + routeBias * 0.12);
        const nextCost = currentCost + stepCost;
        if (nextCost >= (costSoFar.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
        cameFrom.set(edge.to, current.key);
        costSoFar.set(edge.to, nextCost);
        open.push({ key: edge.to, score: nextCost + this.heuristic(edge.to, goalKey) });
      }
    }
    return null;
  }

  /** Returns the next cell on a route, or null when already at the destination. */
  nextWaypoint(
    position: Readonly<{ x: number; z: number }>,
    goal: GridPoint,
    routeSeed = 0,
    occupiedCells: readonly GridPoint[] = [],
  ): GridPoint | null {
    const start = this.nearestCell(position);
    if (!start) return null;
    const path = this.findPath(start, goal, routeSeed);
    const preferred = path && path.length > 1 ? path[1] ?? null : null;
    if (!preferred || !occupiedCells.some((cell) => samePoint(cell, preferred))) return preferred;

    const occupancy = new Map<string, number>();
    for (const cell of occupiedCells) occupancy.set(keyOf(cell), (occupancy.get(keyOf(cell)) ?? 0) + 1);
    const options = this.neighborCells(start)
      .map((cell) => ({ cell, path: this.findPath(cell, goal, routeSeed) }))
      .filter((option): option is { cell: GridPoint; path: readonly GridPoint[] } => option.path !== null)
      .map((option) => ({
        ...option,
        steps: option.path.length - 1,
        score: option.path.length - 1 + (occupancy.get(keyOf(option.cell)) ?? 0) * 3,
      }));
    const shortest = Math.min(...options.map((option) => option.steps));
    const alternative = options
      .filter((option) => option.steps <= shortest + 2)
      .sort((a, b) => a.score - b.score || a.steps - b.steps)[0];
    return alternative?.cell ?? preferred;
  }

  /** Finds a reachable cell with a solid house between it and the nearest threat. */
  findCover(
    position: Readonly<{ x: number; z: number }>,
    threat: Readonly<{ x: number; z: number }>,
    routeSeed = 0,
  ): GridPoint | null {
    const start = this.nearestCell(position);
    if (!start) return null;
    const travelCosts = this.reachableCosts(start, routeSeed);
    let best: GridPoint | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of this.coverCells) {
      const node = this.nodes.get(keyOf(candidate));
      if (!node || !this.isShielded(node, threat)) continue;
      const travelCost = travelCosts.get(keyOf(candidate));
      if (travelCost === undefined) continue;
      const threatDistance = Math.hypot(node.x - threat.x, node.z - threat.z);
      const score = threatDistance - travelCost * 0.65;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    return best;
  }

  neighborCells(cell: GridPoint): readonly GridPoint[] {
    return Object.freeze((this.edges.get(keyOf(cell)) ?? [])
      .map((edge) => this.nodes.get(edge.to)?.cell)
      .filter((neighbor): neighbor is GridPoint => neighbor !== undefined));
  }

  worldPosition(cell: GridPoint): Readonly<{ x: number; y: number; z: number }> | null {
    const node = this.nodes.get(keyOf(cell));
    return node ? Object.freeze({ x: node.x, y: node.y, z: node.z }) : null;
  }

  private heuristic(from: string, to: string): number {
    const a = this.nodes.get(from)!;
    const b = this.nodes.get(to)!;
    return (Math.abs(a.cell.x - b.cell.x) + Math.abs(a.cell.y - b.cell.y)) * this.map.source.cellSize * 0.94;
  }

  private reachableCosts(start: GridPoint, routeSeed: number): ReadonlyMap<string, number> {
    const startKey = keyOf(start);
    const costs = new Map<string, number>([[startKey, 0]]);
    const closed = new Set<string>();
    const open = new MinQueue();
    open.push({ key: startKey, score: 0 });
    while (open.size > 0) {
      const current = open.pop();
      if (!current || closed.has(current.key)) continue;
      closed.add(current.key);
      const currentCost = costs.get(current.key);
      if (currentCost === undefined) continue;
      for (const edge of this.edges.get(current.key) ?? []) {
        if (closed.has(edge.to)) continue;
        const routeBias = routeSeed === 0 ? 0 : stableEdgeBias(routeSeed, current.key, edge.to);
        const stepCost = this.map.source.cellSize * (edge.viaSlope ? 1.08 : 1) * (1 + routeBias * 0.12);
        const nextCost = currentCost + stepCost;
        if (nextCost >= (costs.get(edge.to) ?? Number.POSITIVE_INFINITY)) continue;
        costs.set(edge.to, nextCost);
        open.push({ key: edge.to, score: nextCost });
      }
    }
    return costs;
  }

  private reconstruct(cameFrom: ReadonlyMap<string, string>, goal: string): readonly GridPoint[] {
    const path: GridPoint[] = [this.nodes.get(goal)!.cell];
    let current = goal;
    while (cameFrom.has(current)) {
      current = cameFrom.get(current)!;
      path.push(this.nodes.get(current)!.cell);
    }
    path.reverse();
    return Object.freeze(path);
  }

  private isShielded(candidate: Node, threat: Readonly<{ x: number; z: number }>): boolean {
    const half = this.map.source.cellSize / 2;
    return this.map.source.cells.some((cell) => {
      if (cell.kind !== 'solid-house') return false;
      const center = worldPosition(this.map.source, cell);
      return segmentIntersectsRectangle(candidate.x, candidate.z, threat.x, threat.z,
        center.x - half, center.x + half, center.z - half, center.z + half);
    });
  }
}

function keyOf(point: GridPoint): string {
  return `${point.x},${point.y}`;
}

function samePoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function stableEdgeBias(seed: number, from: string, to: string): number {
  let hash = seed >>> 0;
  for (const character of `${from}>${to}`) hash = Math.imul(hash ^ character.charCodeAt(0), 0x45d9f3b) >>> 0;
  return hash / 0xffff_ffff;
}

function segmentIntersectsRectangle(
  ax: number, az: number, bx: number, bz: number,
  minX: number, maxX: number, minZ: number, maxZ: number,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  let low = 0;
  let high = 1;
  const clips: readonly (readonly [number, number])[] = [
    [-dx, ax - minX], [dx, maxX - ax], [-dz, az - minZ], [dz, maxZ - az],
  ];
  for (const [p, q] of clips) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) low = Math.max(low, ratio);
    else high = Math.min(high, ratio);
    if (low > high) return false;
  }
  return high >= 0 && low <= 1;
}

class MinQueue {
  private readonly items: QueueItem[] = [];

  get size(): number { return this.items.length; }

  push(item: QueueItem): void {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent]!.score <= this.items[index]!.score) break;
      [this.items[parent], this.items[index]] = [this.items[index]!, this.items[parent]!];
      index = parent;
    }
  }

  pop(): QueueItem | null {
    const first = this.items[0];
    const last = this.items.pop();
    if (!first) return null;
    if (last && this.items.length > 0) {
      this.items[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.items[left]!.score < this.items[smallest]!.score) smallest = left;
        if (right < this.items.length && this.items[right]!.score < this.items[smallest]!.score) smallest = right;
        if (smallest === index) break;
        [this.items[index], this.items[smallest]] = [this.items[smallest]!, this.items[index]!];
        index = smallest;
      }
    }
    return first;
  }
}
