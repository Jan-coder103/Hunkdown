import { Mesh } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { MenuBackdrop } from '../src/ui/menu-backdrop';

describe('title scene ownership', () => {
  it('frames the chicken for the current aspect without moving the gameplay camera', () => {
    const backdrop = new MenuBackdrop();
    backdrop.frame(16 / 9);
    expect(backdrop.camera.aspect).toBe(16 / 9);
    expect(backdrop.scene.getObjectByName('orange beak')).toBeTruthy();
    expect(backdrop.scene.getObjectByName('movement playground')).toBeUndefined();
    const matrix = backdrop.camera.projectionMatrix.clone();
    backdrop.frame(0.6);
    expect(backdrop.camera.aspect).toBe(0.6);
    expect(backdrop.camera.projectionMatrix.equals(matrix)).toBe(false);
    backdrop.dispose();
  });

  it('releases shared geometry and materials exactly once across repeated disposal', () => {
    const backdrop = new MenuBackdrop();
    const resources = new Set<{ dispose(): void }>();
    backdrop.scene.traverse((part) => {
      if (!(part instanceof Mesh)) return;
      resources.add(part.geometry);
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) resources.add(material);
    });
    const spies = [...resources].map(resource => vi.spyOn(resource, 'dispose'));
    backdrop.dispose();
    backdrop.dispose();
    expect(backdrop.scene.children).toHaveLength(0);
    expect(spies.every(spy => spy.mock.calls.length === 1)).toBe(true);
  });
});
