import { describe, expect, it } from 'vitest';
import { MovementWorld } from '../src/game/player/movement-world';

describe('MovementWorld', () => {
  it('resolves a circular player footprint against obstacles and reports wall normals', () => {
    const world = new MovementWorld({
      halfExtent: 10,
      obstacles: [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1, maxY: 2 }],
    });

    const blocked = world.moveHorizontal(0, 1.2, 0, -0.3, 0, 1.75, 0.34);
    expect(blocked.z).toBe(1.2);
    expect(blocked.wallNormalZ).toBe(1);

    const aboveObstacle = world.moveHorizontal(0, 1.2, 0, -0.3, 2, 1.75, 0.34);
    expect(aboveObstacle.z).toBeCloseTo(0.9);
    expect(aboveObstacle.wallNormalZ).toBe(0);
  });

  it('clamps movement to the map edge while keeping the player radius inside', () => {
    const world = new MovementWorld({ halfExtent: 5, obstacles: [] });
    const move = world.moveHorizontal(4.7, 0, 1, 0, 0, 1.75, 0.34);
    expect(move.x).toBeCloseTo(4.66);
    expect(move.wallNormalX).toBe(-1);
  });

  it('computes slope heights consistently at low, middle, and high points', () => {
    const world = new MovementWorld({
      halfExtent: 8,
      obstacles: [],
      ramps: [{
        minX: 0,
        maxX: 4,
        minZ: 0,
        maxZ: 8,
        lowY: 1,
        rise: 2,
        risesAlong: 'z',
        risesTowardPositive: false,
      }],
    });

    expect(world.groundHeightAt(2, 8)).toBeCloseTo(1);
    expect(world.groundHeightAt(2, 4)).toBeCloseTo(2);
    expect(world.groundHeightAt(2, 0)).toBeCloseTo(3);
    expect(world.groundHeightAt(5, 4)).toBe(0);
  });
});
