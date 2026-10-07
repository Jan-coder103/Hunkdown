import { Mesh, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createWeaponModel } from '../src/content/weapons/registry';
import { WeaponView } from '../src/game/combat/weapon-view';

function setup() {
  const camera = new PerspectiveCamera(52, 16 / 9, 0.1, 500);
  const rig = createWeaponModel('honk-47');
  const view = new WeaponView(camera, rig, 1.8);
  const advance = (seconds = 1, step = 1 / 60) => {
    for (let i = 0; i < Math.round(seconds / step); i += 1) view.update(step);
    camera.updateMatrixWorld(true);
  };
  return { camera, rig, view, advance };
}

describe('rifle sight presentation', () => {
  it('moves smoothly from hip carry into a centered, unobstructed optical axis', () => {
    const { camera, rig, view, advance } = setup();
    try {
      const hip = rig.root.position.clone();
      view.setAiming(true);
      advance(1 / 60);
      expect(rig.root.position.x).toBeGreaterThan(0);
      expect(rig.root.position.x).toBeLessThan(hip.x);
      expect(rig.reticle!.visible).toBe(false);
      advance();
      const optic = rig.sight!.getWorldPosition(new Vector3()).project(camera);
      const dot = rig.reticle!.getWorldPosition(new Vector3()).project(camera);
      expect(optic.x).toBeCloseTo(0, 6);
      expect(optic.y).toBeCloseTo(0, 6);
      expect(dot.x).toBeCloseTo(0, 6);
      expect(dot.y).toBeCloseTo(0, 6);
      expect(rig.reticle!.visible).toBe(true);
      const ray = new Raycaster(camera.position, camera.getWorldDirection(new Vector3()), 0.1, 2);
      const hits = ray.intersectObject(rig.root, true).filter(hit => hit.object instanceof Mesh && hit.object.visible);
      expect(hits.some(hit => hit.object === rig.reticle)).toBe(true);
      expect(hits.filter(hit => hit.object !== rig.reticle && hit.object.name !== 'optic glass')).toHaveLength(0);
      // Alignment remains exact when the player's camera looks and rolls elsewhere.
      camera.position.set(12, 2, -8);
      camera.rotation.set(0.2, 1.3, 0.14, 'YXZ');
      camera.updateMatrixWorld(true);
      const rotatedDot = rig.reticle!.getWorldPosition(new Vector3()).project(camera);
      expect(rotatedDot.x).toBeCloseTo(0, 6);
      expect(rotatedDot.y).toBeCloseTo(0, 6);
      view.setAiming(false); advance();
      expect(rig.root.position.distanceTo(hip)).toBeLessThan(0.0001);
      expect(rig.reticle!.visible).toBe(false);
    } finally { view.dispose(); }
  });

  it('lowers the sight for reload, restores held aim, and recovers from recoil and respawn', () => {
    const { camera, rig, view, advance } = setup();
    try {
      const hip = rig.root.position.clone();
      view.setAiming(true); advance();
      const restingMuzzle = rig.muzzleFlash.getWorldPosition(new Vector3());
      view.fire(); advance(1 / 60);
      expect(rig.muzzleFlash.getWorldPosition(new Vector3()).y).toBeGreaterThan(restingMuzzle.y);
      advance();
      expect(rig.reticle!.getWorldPosition(new Vector3()).project(camera).y).toBeCloseTo(0, 6);
      view.beginReload(); advance(0.4);
      expect(rig.reticle!.visible).toBe(false);
      expect(rig.magazine.position.y).toBeLessThan(-0.18);
      advance(2.4);
      expect(rig.reticle!.visible).toBe(true);
      expect(rig.reticle!.getWorldPosition(new Vector3()).project(camera).x).toBeCloseTo(0, 6);
      view.resetForRespawn();
      expect(rig.root.position.equals(hip)).toBe(true);
      expect(rig.reticle!.visible).toBe(false);
      expect(rig.muzzleFlash.visible).toBe(false);
    } finally { view.dispose(); }
  });

  it('blends aiming consistently across presentation update rates', () => {
    const at30 = setup(); const at120 = setup();
    try {
      at30.view.setAiming(true); at120.view.setAiming(true);
      at30.advance(0.2, 1 / 30); at120.advance(0.2, 1 / 120);
      expect(at30.rig.root.position.distanceTo(at120.rig.root.position)).toBeLessThan(1e-6);
      expect(at30.rig.root.quaternion.angleTo(at120.rig.root.quaternion)).toBeLessThan(1e-6);
    } finally { at30.view.dispose(); at120.view.dispose(); }
  });
});
