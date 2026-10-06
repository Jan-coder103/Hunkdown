import {
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { ASSET_DEFINITIONS } from '../../content/assets/registry';
import { ASSET_LOD_TIERS, type AssetLodTier } from '../../content/assets/asset-types';
import { AssetPreview } from './asset-preview';
import { OrbitController } from './orbit-controller';
import './style.css';

type ViewerElements = Readonly<{
  canvasHost: HTMLElement;
  assetSelect: HTMLSelectElement;
  lodSelect: HTMLSelectElement;
  boundsToggle: HTMLInputElement;
  status: HTMLElement;
  summary: HTMLElement;
}>;

const root = document.querySelector<HTMLElement>('#asset-viewer-app');
if (!root) throw new Error('Asset viewer root element is missing');

const elements = buildViewerShell(root);
const scene = new Scene();
scene.background = new Color('#9fbbb2');
scene.add(new HemisphereLight(0xf6f0db, 0x61756d, 2.25));
const keyLight = new DirectionalLight(0xffe9c8, 3.1);
keyLight.position.set(-4, 8, 5);
scene.add(keyLight);
const fillLight = new DirectionalLight(0xc8e3dc, 1.2);
fillLight.position.set(5, 3, -4);
scene.add(fillLight);
const ground = new Mesh(new PlaneGeometry(20, 20), new MeshStandardMaterial({ color: '#b9cbb9', roughness: 0.92 }));
ground.name = 'viewer ground';
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.025;
scene.add(ground);
scene.add(new GridHelper(12, 12, '#788e82', '#a4b8aa'));

const camera = new PerspectiveCamera(42, 1, 0.1, 100);
const preview = new AssetPreview(scene);
let renderer: WebGLRenderer | null = null;
let orbit: OrbitController | null = null;
let resizeObserver: ResizeObserver | null = null;
let animationFrame = 0;
let disposed = false;

function selectAsset(id: string): void {
  const result = preview.load(id);
  if (!result.ok) {
    elements.status.textContent = `Could not load asset: ${result.error}`;
    elements.status.dataset.kind = 'error';
    elements.summary.textContent = 'Metadata or factory validation failed. Correct the asset definition and reload the viewer.';
    return;
  }
  const asset = result.asset;
  orbit?.frameBounds(asset.bounds);
  const width = asset.bounds.max[0] - asset.bounds.min[0];
  const height = asset.bounds.max[1] - asset.bounds.min[1];
  const depth = asset.bounds.max[2] - asset.bounds.min[2];
  elements.status.textContent = `${asset.displayName} loaded · ${asset.category} · ${asset.collision.length} collision shape${asset.collision.length === 1 ? '' : 's'}`;
  elements.status.dataset.kind = 'success';
  elements.summary.textContent = `Bounds ${width.toFixed(2)} × ${height.toFixed(2)} × ${depth.toFixed(2)} m. Drag to orbit; scroll to zoom.`;
}

function setLod(value: string): void {
  if (!ASSET_LOD_TIERS.includes(value as AssetLodTier)) return;
  preview.selectLod(value as AssetLodTier);
}

elements.assetSelect.addEventListener('change', () => selectAsset(elements.assetSelect.value));
elements.lodSelect.addEventListener('change', () => setLod(elements.lodSelect.value));
elements.boundsToggle.addEventListener('change', () => preview.setBoundsVisible(elements.boundsToggle.checked));

try {
  renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1), 2));
  renderer.domElement.setAttribute('aria-label', 'Asset preview. Drag to orbit and use the wheel to zoom.');
  elements.canvasHost.appendChild(renderer.domElement);
  orbit = new OrbitController(renderer.domElement, camera);
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(elements.canvasHost);
  resize();
  selectAsset(elements.assetSelect.value);
  renderLoop();
} catch (error) {
  elements.status.textContent = `3D preview is unavailable: ${error instanceof Error ? error.message : String(error)}`;
  elements.status.dataset.kind = 'error';
}

function resize(): void {
  if (!renderer) return;
  const width = Math.max(elements.canvasHost.clientWidth, 1);
  const height = Math.max(elements.canvasHost.clientHeight, 1);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function renderLoop(): void {
  if (disposed || !renderer) return;
  renderer.render(scene, camera);
  animationFrame = window.requestAnimationFrame(renderLoop);
}

function disposeViewer(): void {
  if (disposed) return;
  disposed = true;
  window.cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  orbit?.dispose();
  preview.dispose();
  scene.remove(ground);
  ground.geometry.dispose();
  if (Array.isArray(ground.material)) ground.material.forEach((material) => material.dispose());
  else ground.material.dispose();
  for (const child of scene.children) {
    if (child instanceof GridHelper) {
      scene.remove(child);
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) material.dispose();
    }
  }
  if (renderer) {
    renderer.domElement.remove();
    renderer.dispose();
    renderer = null;
  }
}

if (import.meta.hot) import.meta.hot.dispose(disposeViewer);

function buildViewerShell(container: HTMLElement): ViewerElements {
  container.innerHTML = `
    <header class="viewer-header">
      <div class="viewer-brand">
        <a class="back-link" href="/" aria-label="Back to combat range">← Combat range</a>
        <div>
          <p class="eyebrow">Operation Honkdown · Content tools</p>
          <h1>Asset viewer</h1>
        </div>
      </div>
      <p class="viewer-tagline">Generated models, collision shapes, and visual detail at a glance.</p>
    </header>
    <main class="viewer-layout">
      <section class="viewer-stage" aria-label="3D asset preview">
        <div class="canvas-host"></div>
        <div class="stage-hint">Drag to orbit <span>·</span> Scroll to zoom</div>
      </section>
      <aside class="viewer-panel">
        <section class="panel-section">
          <p class="eyebrow">Inspect</p>
          <label class="field-label" for="asset-choice">Asset</label>
          <select id="asset-choice" class="viewer-select"></select>
          <label class="field-label" for="lod-choice">Visual detail</label>
          <select id="lod-choice" class="viewer-select">
            <option value="close">Close — detailed</option>
            <option value="far">Far — simplified</option>
          </select>
          <label class="check-row"><input id="bounds-choice" type="checkbox" checked /> Show bounds and collision</label>
        </section>
        <section class="panel-section asset-report">
          <p class="eyebrow">Asset report</p>
          <p id="viewer-status" class="viewer-status" role="status" aria-live="polite"></p>
          <p id="viewer-summary" class="viewer-summary"></p>
        </section>
        <section class="panel-section report-key">
          <div><span class="key-swatch key-bounds"></span><span>Declared bounds</span></div>
          <div><span class="key-swatch key-collision"></span><span>Collision metadata</span></div>
          <p>Both LODs use the same collision metadata. LOD selection only changes the rendered model.</p>
        </section>
      </aside>
    </main>
    <footer class="viewer-footer"><span>Phase 7 · Asset revision candidates</span><span>Close and far LODs</span></footer>
  `;
  const assetSelect = required<HTMLSelectElement>(container, '#asset-choice');
  for (const asset of ASSET_DEFINITIONS) {
    const option = document.createElement('option');
    option.value = asset.id;
    option.textContent = `${asset.displayName} · ${asset.category}`;
    assetSelect.appendChild(option);
  }
  return {
    canvasHost: required(container, '.canvas-host'),
    assetSelect,
    lodSelect: required<HTMLSelectElement>(container, '#lod-choice'),
    boundsToggle: required<HTMLInputElement>(container, '#bounds-choice'),
    status: required(container, '#viewer-status'),
    summary: required(container, '#viewer-summary'),
  };
}

function required<T extends HTMLElement>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Asset viewer is missing ${selector}`);
  return element;
}
