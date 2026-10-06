import { describe, expect, it, vi } from 'vitest';
import { SceneView, type RendererPort, type ResizeObserverPort } from '../src/engine/scene-view';
import type { PerspectiveCamera, Scene } from 'three';

class FakeContainer {
  clientWidth = 800;
  clientHeight = 600;
  child: HTMLElement | null = null;

  appendChild(element: HTMLElement): HTMLElement {
    this.child = element;
    (element as unknown as { parentElement: HTMLElement | null }).parentElement = this as unknown as HTMLElement;
    return element;
  }

  removeChild(element: HTMLElement): HTMLElement {
    if (this.child !== element) throw new Error('Element is not attached');
    this.child = null;
    (element as unknown as { parentElement: HTMLElement | null }).parentElement = null;
    return element;
  }
}

class FakeRenderer implements RendererPort {
  readonly domElement = { parentElement: null } as unknown as HTMLElement;
  readonly sizes: Array<[number, number, boolean | undefined]> = [];
  readonly renders: Array<[Scene, PerspectiveCamera]> = [];
  readonly info = {
    render: { calls: 17, triangles: 34 },
    memory: { geometries: 8, textures: 2 },
  };
  pixelRatio = 0;
  disposeCount = 0;

  setPixelRatio(ratio: number): void { this.pixelRatio = ratio; }
  setSize(width: number, height: number, updateStyle?: boolean): void { this.sizes.push([width, height, updateStyle]); }
  render(scene: Scene, camera: PerspectiveCamera): void { this.renders.push([scene, camera]); }
  dispose(): void { this.disposeCount += 1; }
}

class FakeResizeObserver implements ResizeObserverPort {
  observed: Element | null = null;
  disconnectCount = 0;
  constructor(private readonly callback: () => void) {}
  observe(target: Element): void { this.observed = target; }
  disconnect(): void { this.disconnectCount += 1; }
  resize(): void { this.callback(); }
}

describe('SceneView', () => {
  it('sets up a lit scene, sizes the camera, and updates dimensions on resize', () => {
    const container = new FakeContainer();
    const renderer = new FakeRenderer();
    let observer: FakeResizeObserver | undefined;
    const view = new SceneView({
      container: container as unknown as HTMLElement,
      pixelRatio: 3,
      createRenderer: () => renderer,
      createResizeObserver: (callback) => {
        observer = new FakeResizeObserver(callback);
        return observer;
      },
    });

    expect(renderer.pixelRatio).toBe(2);
    expect(container.child).toBe(renderer.domElement);
    expect(view.scene.children).toHaveLength(3);
    expect(view.scene.children).toContain(view.camera);
    expect(view.camera.aspect).toBeCloseTo(4 / 3);
    expect(renderer.sizes[0]).toEqual([800, 600, false]);
    expect(observer?.observed).toBe(container as unknown as Element);

    container.clientWidth = 1200;
    container.clientHeight = 400;
    observer?.resize();
    expect(view.camera.aspect).toBe(3);
    expect(renderer.sizes[1]).toEqual([1200, 400, false]);

    view.render(0.5);
    expect(renderer.renders).toHaveLength(1);
    expect(view.rendererPerformanceStats).toEqual({ drawCalls: 17, triangles: 34, geometries: 8, textures: 2 });
  });

  it('disconnects resize observation, removes its canvas, and disposes once', () => {
    const container = new FakeContainer();
    const renderer = new FakeRenderer();
    const observer = new FakeResizeObserver(() => undefined);
    const view = new SceneView({
      container: container as unknown as HTMLElement,
      createRenderer: () => renderer,
      createResizeObserver: () => observer,
    });
    const sizesBeforeDispose = renderer.sizes.length;

    view.dispose();
    view.dispose();
    view.resize();
    view.render(0);

    expect(observer.disconnectCount).toBe(1);
    expect(container.child).toBeNull();
    expect(renderer.disposeCount).toBe(1);
    expect(renderer.sizes).toHaveLength(sizesBeforeDispose);
    expect(renderer.renders).toHaveLength(0);
  });

  it('keeps a zero-sized host valid by clamping the drawing buffer dimensions', () => {
    const container = new FakeContainer();
    container.clientWidth = 0;
    container.clientHeight = 0;
    const renderer = new FakeRenderer();
    const view = new SceneView({
      container: container as unknown as HTMLElement,
      createRenderer: () => renderer,
      createResizeObserver: () => ({ observe: vi.fn(), disconnect: vi.fn() }),
    });

    expect(view.camera.aspect).toBe(1);
    expect(renderer.sizes[0]).toEqual([1, 1, false]);
    view.dispose();
  });
});
