import { Mesh, PerspectiveCamera, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ChickenCharacterView } from '../src/game/player/chicken-character-view';
import { createCombatPracticeRange } from '../src/game/combat/combat-practice-range';

describe('chicken character presentations', () => {
  it('animates third-person movement, jumping, aim, reload, damage, and death poses', () => {
    const scene = new Scene();
    const view = new ChickenCharacterView(scene, 'enemy', 'third-person');
    const rig = view.thirdPersonRig;
    if (!rig) throw new Error('Expected the third-person chicken rig');
    expect(scene.children).toContain(view.object);

    view.setPose({ movementSpeed: 4, grounded: true, aiming: false, dead: false });
    view.update(0.08);
    expect(rig.leftLeg.rotation.x).not.toBe(rig.rightLeg.rotation.x);

    view.setPose({ movementSpeed: 0, grounded: false, aiming: false });
    view.update(0.05);
    expect(Math.abs(rig.leftWing.rotation.z)).toBeGreaterThan(0.1);

    view.setPose({ grounded: true, aiming: true });
    view.update(0.05);
    expect(rig.body.rotation.x).toBeLessThan(0);
    const aimedWing = rig.leftWing.rotation.x;
    view.beginReload(1);
    view.update(0.25);
    expect(rig.leftWing.rotation.x).toBeLessThan(aimedWing);

    view.triggerDamage();
    expect(rig.featherMaterial.emissiveIntensity).toBeGreaterThan(0);
    view.update(0.3);
    expect(rig.featherMaterial.emissiveIntensity).toBe(0);

    view.setPose({ dead: true, aiming: false });
    view.update(1 / 60);
    expect(rig.body.rotation.x).toBeLessThan(-0.4);
    expect(rig.leftWing.rotation.z).toBeLessThan(-0.9);
    expect(view.object.visible).toBe(true);

    const meshes: Mesh[] = [];
    view.object.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
    const disposeGeometry = vi.spyOn(meshes[0]!.geometry, 'dispose');
    view.dispose();
    view.dispose();
    expect(scene.children).not.toContain(view.object);
    expect(disposeGeometry).toHaveBeenCalledOnce();
  });

  it('mounts camera arms and animates locomotion, aim, reload, and damage', () => {
    const camera = new PerspectiveCamera();
    const view = new ChickenCharacterView(camera, 'player', 'first-person');
    const rig = view.firstPersonRig;
    if (!rig) throw new Error('Expected the first-person chicken arms');
    expect(camera.children).toContain(view.object);

    view.setPose({ movementSpeed: 7, sprinting: true, grounded: false, aiming: true });
    view.update(0.06);
    expect(rig.root.position.y).toBeGreaterThan(0);
    expect(rig.leftWing.rotation.x).not.toBe(rig.rightWing.rotation.x);

    view.beginReload(1.8);
    view.update(0.3);
    expect(rig.root.rotation.z).toBeGreaterThan(0);
    view.triggerDamage();
    expect(rig.featherMaterial.emissiveIntensity).toBeGreaterThan(0);
    view.update(0.3);
    expect(rig.featherMaterial.emissiveIntensity).toBe(0);

    view.dispose();
    expect(camera.children).not.toContain(view.object);
  });

  it('uses enemy chickens as range targets and keeps a visible death pose until disposal', () => {
    const scene = new Scene();
    const range = createCombatPracticeRange(scene);
    const target = range.combatants[0];
    const character = range.characters[0];
    if (!target || !character?.thirdPersonRig) throw new Error('Expected a third-person range target');
    expect(character.object.name).toBe('practice chicken target 1');

    target.applyDamage(20);
    range.update(1 / 60);
    expect(character.thirdPersonRig.featherMaterial.emissiveIntensity).toBeGreaterThan(0);
    target.applyDamage(80);
    range.update(1 / 60);
    expect(character.object.visible).toBe(true);
    expect(character.thirdPersonRig.body.rotation.x).toBeLessThan(-0.4);

    range.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
