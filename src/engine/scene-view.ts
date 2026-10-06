import {
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

export interface RendererPort {
  readonly domElement: HTMLElement;
  setPixelRatio(ratio: number): void;
  setSize(width: number, height: number, updateStyle?: boolean): void;
  render(scene: Scene, camera: PerspectiveCamera): void;
  dispose(): void;
}

export interface ResizeObserverPort {
  observe(target: Element): void;
  disconnect(): void;
}

export type RendererPerformanceStats = Readonly<{
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}>;

type RendererWithInfo = RendererPort & {
  readonly info?: Readonly<{
    render: Readonly<{ calls: number; triangles: number }>;
    memory: Readonly<{ geometries: number; textures: number }>;
  }>;
};

export type SceneViewOptions = Readonly<{
  container: HTMLElement;
  pixelRatio?: number;
  createRenderer?: () => RendererPort;
  createResizeObserver?: (callback: () => void) => ResizeObserverPort;
}>;

function createBrowserRenderer(): RendererPort {
  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.outputColorSpace = SRGBColorSpace;
  return renderer;
}

function createBrowserResizeObserver(callback: () => void): ResizeObserverPort {
  return new ResizeObserver(callback);
}

/** Owns the blank scene, camera, lighting, canvas, resize observer, and renderer. */
export class SceneView {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(65, 1, 0.1, 500);
  readonly renderer: RendererPort;
  private readonly resizeObserver: ResizeObserverPort;
  private disposed = false;

  constructor(private readonly options: SceneViewOptions) {
    this.renderer = (options.createRenderer ?? createBrowserRenderer)();
    this.scene.background = new Color('#c6ded5');
    this.camera.position.set(0, 1.6, 7);
    this.camera.lookAt(0, 1, 0);
    // Camera children (such as the Phase 4 first-person weapon) must be traversed with the scene.
    this.scene.add(this.camera);
    this.scene.add(new HemisphereLight(0xf2f6e9, 0x526e64, 2.1));
    const keyLight = new DirectionalLight(0xfff1d4, 2.4);
    keyLight.position.set(-4, 7, 5);
    this.scene.add(keyLight);

    const pixelRatio = options.pixelRatio ?? (typeof window === 'undefined' ? 1 : window.devicePixelRatio);
    this.renderer.setPixelRatio(Math.min(Math.max(pixelRatio, 1), 2));
    options.container.appendChild(this.renderer.domElement);
    this.resizeObserver = (options.createResizeObserver ?? createBrowserResizeObserver)(() => this.resize());
    this.resizeObserver.observe(options.container);
    this.resize();
  }

  get rendererPerformanceStats(): RendererPerformanceStats | null {
    const info = (this.renderer as RendererWithInfo).info;
    if (!info) return null;
    return Object.freeze({
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    });
  }

  render(_interpolationAlpha: number): void {
    if (!this.disposed) this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.options.container.clientWidth);
    const height = Math.max(1, this.options.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.scene.clear();
    this.scene.background = null;
    if (this.renderer.domElement.parentElement === this.options.container) {
      this.options.container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
