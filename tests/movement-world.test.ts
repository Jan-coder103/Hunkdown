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

  it('returns the nearest solid obstruction along normalized hitscan rays', () => {
    const world = new MovementWorld({
      halfExtent: 10,
      obstacles: [
        { minX: -1, maxX: 1, minZ: -2, maxZ: -1, maxY: 2 },
        { minX: -1, maxX: 1, minZ: -6, maxZ: -5, maxY: 2 },
      ],
    });
    expect(world.raycast({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -4 }, 20)?.distance).toBe(1);
    expect(world.raycast({ x: 4, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 20)).toBeNull();
    expect(world.raycast({ x: 0, y: 3, z: 0 }, { x: 0, y: 0, z: -1 }, 20)).toBeNull();
    expect(world.raycast({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 0.5)).toBeNull();
  });

  it('keeps a destructible obstacle blocking movement and rays until its health reaches zero', () => {
    const world = new MovementWorld({
      halfExtent: 10,
      obstacles: [{ id: 'street-kiosk', health: 68, minX: -1, maxX: 1, minZ: -1, maxZ: 1, maxY: 2 }],
    });
    const ray = { origin: { x: 0, y: 1, z: 3 }, direction: { x: 0, y: 0, z: -1 } };
    expect(world.raycast(ray.origin, ray.direction, 10)).toMatchObject({ obstacleId: 'street-kiosk', destructible: true });
    expect(world.damageObstacle('street-kiosk', 34)).toBe(false);
    expect(world.moveHorizontal(-2, 0, 2, 0, 0, 1.75, 0.34).x).toBe(-2);
    expect(world.raycast(ray.origin, ray.direction, 10)?.obstacleId).toBe('street-kiosk');

    expect(world.damageObstacle('street-kiosk', 34)).toBe(true);
    expect(world.raycast(ray.origin, ray.direction, 10)).toBeNull();
    expect(world.moveHorizontal(-2, 0, 2, 0, 0, 1.75, 0.34).x).toBe(0);
  });
});
