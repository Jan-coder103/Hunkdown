import { Group, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createWeaponModel as rifle } from '../src/content/weapons/honk-47.weapon';
import { createWeaponModel as knife } from '../src/content/weapons/knife.melee';
import { WeaponView } from '../src/game/combat/weapon-view';

const world = (object: import('three').Object3D) => object.getWorldPosition(new Vector3());

describe('attached sphere hands', () => {
  it.each([rifle, knife])('keeps both hands on authored grips during recoil and camera movement', factory => {
    const camera = new PerspectiveCamera();
    const rig = factory();
    const view = new WeaponView(camera, rig, 1.8);
    const primary = rig.root.getObjectByName('primary sphere hand')!;
    const support = rig.root.getObjectByName('support sphere hand')!;
    camera.position.set(3, 4, 5); camera.rotation.set(0.2, 0.8, 0.1);
    view.fire(); view.setAiming(true); view.update(0.03);
    expect(world(primary).distanceTo(world(rig.grips!.primary))).toBeLessThan(1e-8);
    expect(world(support).distanceTo(world(rig.grips!.support))).toBeLessThan(1e-8);
    view.setVisible(false); expect(rig.root.visible).toBe(false);
    view.dispose(); expect(camera.children).toHaveLength(0);
  });

  it('grabs before extraction, carries the magazine, then returns to the handguard', () => {
    const rig = rifle(); const view = new WeaponView(new PerspectiveCamera(), rig, 1.8);
    const support = rig.root.getObjectByName('support sphere hand')!;
    const primary = rig.root.getObjectByName('primary sphere hand')!;
    const seated = rig.magazine.position.clone();
    view.beginReload(); view.update(1.8 * 0.12);
    expect(rig.magazine.position.distanceTo(seated)).toBeLessThan(1e-8);
    expect(world(support).distanceTo(world(rig.grips!.magazine!))).toBeLessThan(1e-8);
    view.update(1.8 * 0.28);
    expect(rig.magazine.position.y).toBeLessThan(seated.y - 0.2);
    expect(world(support).distanceTo(world(rig.grips!.magazine!))).toBeLessThan(1e-8);
    expect(world(primary).distanceTo(world(rig.grips!.primary))).toBeLessThan(1e-8);
    view.update(1.8 * 0.4);
    expect(rig.magazine.position.distanceTo(seated)).toBeLessThan(1e-8);
    expect(world(support).distanceTo(world(rig.grips!.magazine!))).toBeLessThan(1e-8);
    view.update(1);
    expect(world(support).distanceTo(world(rig.grips!.support))).toBeLessThan(1e-8);
    view.beginReload(); view.update(0.6); view.resetForRespawn();
    expect(rig.magazine.position.equals(seated)).toBe(true);
    expect(world(support).distanceTo(world(rig.grips!.support))).toBeLessThan(1e-8);
    view.dispose();
  });

  it('accepts differently positioned nested grip anchors for future weapons', () => {
    const rig = rifle();
    const mount = new Group(); mount.position.set(0.3, -0.1, 0.2); mount.rotation.z = 0.7;
    rig.root.add(mount); mount.add(rig.grips!.support);
    const view = new WeaponView(new PerspectiveCamera(), rig, 1.8);
    view.update(0.1);
    expect(world(rig.root.getObjectByName('support sphere hand')!).distanceTo(world(rig.grips!.support))).toBeLessThan(1e-8);
    view.dispose();
  });
});
