import { MapPreview } from './map-preview';
import './style.css';
import {
  appendPathPoint,
  clearPaths,
  createEmptyMap,
  doorSidesForLayout,
  getMapCell,
  loadMapFromStorage,
  paintMapCell,
  parseMapDocument,
  resizeMap,
  saveMapToStorage,
  serializeMapDocument,
  type CellKind,
  type DoorLayout,
  type GridPoint,
  type MapDocument,
} from '../../game/world/map-types';

type EditorElements = Readonly<{
  canvas: HTMLCanvasElement;
  previewHost: HTMLElement;
  gridSize: HTMLElement;
  mapName: HTMLInputElement;
  seed: HTMLInputElement;
  width: HTMLInputElement;
  height: HTMLInputElement;
  cellSize: HTMLInputElement;
  brush: HTMLSelectElement;
  doorLayout: HTMLSelectElement;
  status: HTMLElement;
  mapStats: HTMLElement;
  saveButton: HTMLButtonElement;
  loadButton: HTMLButtonElement;
  exportButton: HTMLButtonElement;
  importButton: HTMLButtonElement;
  fileInput: HTMLInputElement;
  resizeButton: HTMLButtonElement;
  routeButton: HTMLButtonElement;
  finishRouteButton: HTMLButtonElement;
  clearRoutesButton: HTMLButtonElement;
  newButton: HTMLButtonElement;
}>;

const host = document.querySelector<HTMLElement>('#map-editor-app');
if (!host) throw new Error('Map editor root is missing');

const elements = buildEditorShell(host);
let map = loadInitialMap();
let preview: MapPreview | null = null;
let activeRouteId: string | null = null;
let painting = false;
let previousPaintedCell = '';
let scheduledRender = 0;
let disposed = false;

syncFields();
updateBrushHint();
drawGrid();
try {
  preview = new MapPreview(elements.previewHost);
  regenerate();
} catch (error) {
  setStatus(`3D preview is unavailable: ${messageOf(error)}`, 'error');
}

elements.canvas.addEventListener('pointerdown', (event) => {
  const cell = pointerCell(event);
  if (!cell) return;
  painting = true;
  previousPaintedCell = '';
  elements.canvas.setPointerCapture(event.pointerId);
  applyAtCell(cell);
});
elements.canvas.addEventListener('pointermove', (event) => {
  if (!painting) return;
  const cell = pointerCell(event);
  if (!cell) return;
  applyAtCell(cell);
});
elements.canvas.addEventListener('pointerup', () => {
  painting = false;
  previousPaintedCell = '';
});
elements.canvas.addEventListener('pointercancel', () => {
  painting = false;
  previousPaintedCell = '';
});
window.addEventListener('resize', drawGrid);

elements.mapName.addEventListener('input', () => {
  map = Object.freeze({ ...map, name: elements.mapName.value });
  scheduleRender();
});
elements.seed.addEventListener('input', () => {
  const value = Number(elements.seed.value);
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff) {
    setStatus('Seed must be an unsigned 32-bit integer.', 'error');
    return;
  }
  map = Object.freeze({ ...map, seed: value });
  scheduleRender();
});
elements.brush.addEventListener('change', () => updateBrushHint());
elements.resizeButton.addEventListener('click', resizeGrid);
elements.routeButton.addEventListener('click', beginRoute);
elements.finishRouteButton.addEventListener('click', finishRoute);
elements.clearRoutesButton.addEventListener('click', () => {
  map = clearPaths(map);
  activeRouteId = null;
  elements.brush.value = 'street';
  updateBrushHint();
  refresh();
  setStatus('All authored routes cleared.', 'success');
});
elements.newButton.addEventListener('click', () => {
  map = createEmptyMap();
  activeRouteId = null;
  syncFields();
  refresh();
  setStatus('New 16 × 16 city draft created.', 'success');
});
elements.saveButton.addEventListener('click', () => {
  try {
    saveMapToStorage(window.localStorage, map);
    setStatus('Map saved in this browser.', 'success');
  } catch (error) {
    setStatus(`Could not save map: ${messageOf(error)}`, 'error');
  }
});
elements.loadButton.addEventListener('click', () => {
  try {
    const loaded = loadMapFromStorage(window.localStorage);
    if (!loaded) throw new Error('No saved map was found in this browser.');
    map = loaded;
    activeRouteId = null;
    syncFields();
    refresh();
    setStatus(`Loaded “${map.name}” from this browser.`, 'success');
  } catch (error) {
    setStatus(`Could not load map: ${messageOf(error)}`, 'error');
  }
});
elements.exportButton.addEventListener('click', exportMap);
elements.importButton.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', () => {
  const file = elements.fileInput.files?.[0];
  elements.fileInput.value = '';
  if (!file) return;
  void file.text().then((text) => {
    const loaded = parseMapDocument(text);
    map = loaded;
    activeRouteId = null;
    syncFields();
    refresh();
    setStatus(`Imported “${map.name}”.`, 'success');
  }).catch((error: unknown) => setStatus(`Could not import map: ${messageOf(error)}`, 'error'));
});

window.addEventListener('beforeunload', disposeEditor, { once: true });
if (import.meta.hot) import.meta.hot.dispose(disposeEditor);

function applyAtCell(cell: GridPoint): void {
  const key = `${cell.x},${cell.y}`;
  if (key === previousPaintedCell) return;
  previousPaintedCell = key;
  if (elements.brush.value === 'path') {
    if (!activeRouteId) beginRoute();
    if (!activeRouteId) return;
    const previous = map.paths.find((path) => path.id === activeRouteId)?.cells.at(-1);
    const route = previous ? orthogonalLine(previous, cell).slice(1) : [cell];
    try {
      for (const point of route) map = appendPathPoint(map, point, activeRouteId);
      refresh();
      setStatus(`Drawing route · ${map.paths.find((path) => path.id === activeRouteId)?.cells.length ?? 0} cells. Finish the route when done.`, 'success');
    } catch (error) {
      setStatus(messageOf(error), 'error');
    }
    return;
  }
  const kind = elements.brush.value as CellKind;
  try {
    map = paintMapCell(map, cell.x, cell.y, kind, elements.doorLayout.value as DoorLayout);
    refresh();
    setStatus(`${cellName(kind)} painted at column ${cell.x + 1}, row ${cell.y + 1}.`, 'success');
  } catch (error) {
    setStatus(messageOf(error), 'error');
  }
}

function beginRoute(): void {
  if (map.paths.length === 0) activeRouteId = 'main-route';
  else {
    let suffix = map.paths.length + 1;
    activeRouteId = `route-${suffix}`;
    while (map.paths.some((path) => path.id === activeRouteId)) {
      suffix += 1;
      activeRouteId = `route-${suffix}`;
    }
  }
  elements.brush.value = 'path';
  updateBrushHint();
  setStatus('Route tool active. Click or drag along adjacent street, elevation, or open door cells.', 'success');
}

function finishRoute(): void {
  if (!activeRouteId) {
    setStatus('No route is currently being drawn.', 'success');
    return;
  }
  const route = map.paths.find((path) => path.id === activeRouteId);
  activeRouteId = null;
  elements.brush.value = 'street';
  let statusMessage = 'Route finished.';
  let statusKind: 'success' | 'error' = 'success';
  if (route && route.cells.length === 1) {
    map = clearSinglePointRoute(map, route.id);
    statusMessage = 'A route needs at least two adjacent cells; the single point was removed.';
    statusKind = 'error';
  }
  updateBrushHint();
  refresh();
  setStatus(statusMessage, statusKind);
}

function resizeGrid(): void {
  try {
    const width = Number(elements.width.value);
    const height = Number(elements.height.value);
    const cellSize = Number(elements.cellSize.value);
    const resized = resizeMap(map, width, height);
    if (!Number.isFinite(cellSize) || cellSize < 4 || cellSize > 32) throw new Error('Cell size must be between 4 and 32 meters.');
    map = Object.freeze({ ...resized, cellSize });
    activeRouteId = null;
    syncFields();
    refresh();
    setStatus(`Grid resized to ${width} × ${height}. Cells outside the new bounds were removed.`, 'success');
  } catch (error) {
    setStatus(`Could not resize grid: ${messageOf(error)}`, 'error');
  }
}

function exportMap(): void {
  try {
    const json = serializeMapDocument(map);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${map.id}.honkmap.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Map JSON exported.', 'success');
  } catch (error) {
    setStatus(`Could not export map: ${messageOf(error)}`, 'error');
  }
}

function regenerate(): void {
  if (!preview) return;
  try {
    const { summary } = preview.build(map);
    elements.mapStats.textContent = `${summary.buildings} buildings · ${summary.decorations} props · ${summary.slopes} slopes · ${summary.navigationLinks} route links`;
    setStatus(`Generated “${map.name}” from seed ${map.seed}.`, 'success');
  } catch (error) {
    elements.mapStats.textContent = 'Preview needs a valid map';
    setStatus(`Could not generate map: ${messageOf(error)}`, 'error');
  }
}

function refresh(): void {
  drawGrid();
  syncFields(false);
  regenerate();
}

function scheduleRender(): void {
  if (scheduledRender) return;
  scheduledRender = window.requestAnimationFrame(() => {
    scheduledRender = 0;
    drawGrid();
    regenerate();
  });
}

function drawGrid(): void {
  const { canvas } = elements;
  const context = canvas.getContext('2d');
  if (!context) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.max(1, Math.round(rect.width * ratio));
  const pixelHeight = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
  context.fillStyle = '#eef0e3';
  context.fillRect(0, 0, rect.width, rect.height);
  const cellSize = Math.min((rect.width - 36) / map.width, (rect.height - 36) / map.height);
  if (!Number.isFinite(cellSize) || cellSize <= 0) return;
  const gridWidth = cellSize * map.width;
  const gridHeight = cellSize * map.height;
  const startX = (rect.width - gridWidth) / 2;
  const startY = (rect.height - gridHeight) / 2;
  const colors: Record<CellKind, string> = {
    street: '#d7ddd1',
    'solid-house': '#7a9ec1',
    'enterable-house': '#edca65',
    elevation: '#83ae75',
  };
  for (const cell of map.cells) {
    const x = startX + cell.x * cellSize;
    const y = startY + cell.y * cellSize;
    context.fillStyle = colors[cell.kind];
    context.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    if (cell.kind === 'solid-house' || cell.kind === 'enterable-house') drawHouseGlyph(context, cell, x, y, cellSize);
    if (cell.kind === 'elevation') drawElevationGlyph(context, x, y, cellSize);
  }
  context.strokeStyle = '#74887c';
  context.lineWidth = Math.max(0.65, Math.min(1, cellSize / 30));
  context.beginPath();
  for (let x = 0; x <= map.width; x += 1) {
    const px = startX + x * cellSize;
    context.moveTo(px, startY);
    context.lineTo(px, startY + gridHeight);
  }
  for (let y = 0; y <= map.height; y += 1) {
    const py = startY + y * cellSize;
    context.moveTo(startX, py);
    context.lineTo(startX + gridWidth, py);
  }
  context.stroke();
  drawAuthoredPaths(context, startX, startY, cellSize);
}

function drawElevationGlyph(context: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  context.strokeStyle = '#d6e5bb';
  context.lineWidth = Math.max(1, size * 0.035);
  for (const fraction of [0.28, 0.48, 0.68]) {
    context.beginPath();
    context.ellipse(x + size / 2, y + size / 2, size * fraction, size * fraction * 0.72, 0, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawAuthoredPaths(context: CanvasRenderingContext2D, startX: number, startY: number, cellSize: number): void {
  for (const route of map.paths) {
    if (route.cells.length === 0) continue;
    context.save();
    context.strokeStyle = '#bf5f35';
    context.fillStyle = '#fff2c5';
    context.lineWidth = Math.max(2.5, cellSize * 0.19);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    route.cells.forEach((cell, index) => {
      const x = startX + (cell.x + 0.5) * cellSize;
      const y = startY + (cell.y + 0.5) * cellSize;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    route.cells.forEach((cell) => {
      const x = startX + (cell.x + 0.5) * cellSize;
      const y = startY + (cell.y + 0.5) * cellSize;
      context.beginPath();
      context.arc(x, y, Math.max(1.8, cellSize * 0.12), 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
  }
}

function pointerCell(event: PointerEvent): GridPoint | null {
  const rect = elements.canvas.getBoundingClientRect();
  const cellSize = Math.min((rect.width - 36) / map.width, (rect.height - 36) / map.height);
  const startX = (rect.width - cellSize * map.width) / 2;
  const startY = (rect.height - cellSize * map.height) / 2;
  const x = Math.floor((event.clientX - rect.left - startX) / cellSize);
  const y = Math.floor((event.clientY - rect.top - startY) / cellSize);
  return getMapCell(map, x, y) ? { x, y } : null;
}

function syncFields(includeDimensions = true): void {
  elements.mapName.value = map.name;
  elements.seed.value = String(map.seed);
  elements.gridSize.textContent = `${map.width} × ${map.height}`;
  if (includeDimensions) {
    elements.width.value = String(map.width);
    elements.height.value = String(map.height);
    elements.cellSize.value = String(map.cellSize);
  }
}

function updateBrushHint(): void {
  const routeMode = elements.brush.value === 'path';
  elements.routeButton.setAttribute('aria-pressed', String(routeMode));
  elements.finishRouteButton.disabled = !activeRouteId;
  elements.doorLayout.disabled = elements.brush.value !== 'enterable-house';
}

function setStatus(message: string, kind: 'success' | 'error'): void {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

function loadInitialMap(): MapDocument {
  try {
    return loadMapFromStorage(window.localStorage) ?? createEmptyMap();
  } catch {
    return createEmptyMap();
  }
}

function disposeEditor(): void {
  if (disposed) return;
  disposed = true;
  if (scheduledRender) window.cancelAnimationFrame(scheduledRender);
  preview?.dispose();
  preview = null;
  window.removeEventListener('resize', drawGrid);
}

function buildEditorShell(container: HTMLElement): EditorElements {
  container.innerHTML = `
    <header class="map-header">
      <div class="map-brand">
        <a class="map-back" href="/" aria-label="Back to combat range">← Combat range</a>
        <div><p class="map-eyebrow">Operation Honkdown · World tools</p><h1>City map editor</h1></div>
      </div>
      <p class="map-tagline">Paint a street grid, open doors and high ground. The seeded preview fills the city around your routes.</p>
    </header>
    <main class="map-layout">
      <section class="map-workspace" aria-label="Map editing and preview">
        <article class="map-card grid-card">
          <header class="card-heading"><div><p class="map-eyebrow">01 · Paint</p><h2>Top-down grid</h2></div><span class="map-grid-size"></span></header>
          <canvas id="map-painter" aria-label="Map grid painter. Click or drag to paint cells." tabindex="0"></canvas>
          <p class="canvas-hint">Click or drag to paint cells. Use Route to draw an authored lane.</p>
        </article>
        <article class="map-card preview-card">
          <header class="card-heading"><div><p class="map-eyebrow">02 · Generate</p><h2>City preview</h2></div><span class="map-preview-badge">Seeded · top-down</span></header>
          <div class="preview-host"></div>
          <p class="preview-caption">Buildings, props, elevations, and ramps are generated from the same cell data used for navigation.</p>
        </article>
      </section>
      <aside class="map-panel">
        <section class="tool-section">
          <p class="map-eyebrow">Map details</p>
          <label class="tool-label" for="map-name">Map name</label><input id="map-name" class="tool-input" maxlength="80" value="Untitled City" />
          <div class="field-pair"><label class="tool-field"><span>Seed</span><input id="map-seed" class="tool-input" type="number" min="0" max="4294967295" step="1" /></label><label class="tool-field"><span>Cell size · m</span><input id="map-cell-size" class="tool-input" type="number" min="4" max="32" step="1" /></label></div>
          <div class="field-pair"><label class="tool-field"><span>Columns</span><input id="map-width" class="tool-input" type="number" min="2" max="64" step="1" /></label><label class="tool-field"><span>Rows</span><input id="map-height" class="tool-input" type="number" min="2" max="64" step="1" /></label></div>
          <button id="resize-grid" class="button button-secondary button-wide">Apply grid size</button>
        </section>
        <section class="tool-section">
          <p class="map-eyebrow">Cell brush</p>
          <label class="tool-label" for="cell-brush">Paint type</label>
          <select id="cell-brush" class="tool-input">
            <option value="street">Street / open ground</option>
            <option value="solid-house">Solid house · blue</option>
            <option value="enterable-house">Enterable house · yellow</option>
            <option value="elevation">Elevation · green</option>
            <option value="path">Authored route</option>
          </select>
          <label class="tool-label" for="door-layout">Enterable house doors</label>
          <select id="door-layout" class="tool-input">
            <option value="north-south">North and south</option>
            <option value="west-east">West and east</option>
            <option value="all-sides">All sides</option>
          </select>
          <p class="tool-copy">Elevation cells rise 1.25 m. Ramp tiles appear automatically at open boundaries.</p>
          <div class="route-buttons"><button id="draw-route" class="button button-secondary" aria-pressed="false">Route</button><button id="finish-route" class="button button-secondary" disabled>Finish</button></div>
          <button id="clear-routes" class="button button-text button-wide">Clear authored routes</button>
        </section>
        <section class="tool-section map-save-section">
          <p class="map-eyebrow">Save and load</p>
          <div class="button-grid"><button id="save-map" class="button button-primary">Save here</button><button id="load-map" class="button button-secondary">Load saved</button><button id="export-map" class="button button-secondary">Export JSON</button><button id="import-map" class="button button-secondary">Import JSON</button></div>
          <input id="map-file" type="file" accept="application/json,.json" hidden />
          <button id="new-map" class="button button-text button-wide">New blank map</button>
        </section>
        <section class="tool-report">
          <p class="map-eyebrow">Generation report</p>
          <p id="map-stats" class="map-stats">Generating preview…</p>
          <p id="map-status" class="map-status" role="status" aria-live="polite"></p>
        </section>
      </aside>
    </main>
    <footer class="map-footer"><span>Phase 6 · Versioned map data</span><span>Map files use .honkmap.json</span></footer>
  `;
  const query = <T extends Element>(selector: string): T => {
    const element = container.querySelector<T>(selector);
    if (!element) throw new Error(`Map editor control is missing: ${selector}`);
    return element;
  };
  return Object.freeze({
    canvas: query<HTMLCanvasElement>('#map-painter'),
    previewHost: query<HTMLElement>('.preview-host'),
    gridSize: query<HTMLElement>('.map-grid-size'),
    mapName: query<HTMLInputElement>('#map-name'),
    seed: query<HTMLInputElement>('#map-seed'),
    width: query<HTMLInputElement>('#map-width'),
    height: query<HTMLInputElement>('#map-height'),
    cellSize: query<HTMLInputElement>('#map-cell-size'),
    brush: query<HTMLSelectElement>('#cell-brush'),
    doorLayout: query<HTMLSelectElement>('#door-layout'),
    status: query<HTMLElement>('#map-status'),
    mapStats: query<HTMLElement>('#map-stats'),
    saveButton: query<HTMLButtonElement>('#save-map'),
    loadButton: query<HTMLButtonElement>('#load-map'),
    exportButton: query<HTMLButtonElement>('#export-map'),
    importButton: query<HTMLButtonElement>('#import-map'),
    fileInput: query<HTMLInputElement>('#map-file'),
    resizeButton: query<HTMLButtonElement>('#resize-grid'),
    routeButton: query<HTMLButtonElement>('#draw-route'),
    finishRouteButton: query<HTMLButtonElement>('#finish-route'),
    clearRoutesButton: query<HTMLButtonElement>('#clear-routes'),
    newButton: query<HTMLButtonElement>('#new-map'),
  });
}

function drawHouseGlyph(context: CanvasRenderingContext2D, cell: NonNullable<ReturnType<typeof getMapCell>>, x: number, y: number, size: number): void {
  const inset = size * 0.18;
  context.save();
  context.strokeStyle = cell.kind === 'enterable-house' ? '#84662b' : '#3a5269';
  context.lineWidth = Math.max(1, size * 0.06);
  context.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  if (cell.kind === 'enterable-house') {
    context.fillStyle = '#f7edc2';
    const doorSize = size * 0.2;
    for (const side of doorSidesForLayout(cell.doorLayout)) {
      if (side === 'north') context.fillRect(x + size / 2 - doorSize / 2, y + 1, doorSize, 4);
      if (side === 'south') context.fillRect(x + size / 2 - doorSize / 2, y + size - 5, doorSize, 4);
      if (side === 'west') context.fillRect(x + 1, y + size / 2 - doorSize / 2, 4, doorSize);
      if (side === 'east') context.fillRect(x + size - 5, y + size / 2 - doorSize / 2, 4, doorSize);
    }
  }
  context.restore();
}

function clearSinglePointRoute(source: MapDocument, routeId: string): MapDocument {
  return Object.freeze({ ...source, paths: Object.freeze(source.paths.filter((path) => path.id !== routeId)) });
}

function orthogonalLine(from: GridPoint, to: GridPoint): GridPoint[] {
  const points: GridPoint[] = [{ x: from.x, y: from.y }];
  let x = from.x;
  let y = from.y;
  while (x !== to.x) {
    x += Math.sign(to.x - x);
    points.push({ x, y });
  }
  while (y !== to.y) {
    y += Math.sign(to.y - y);
    points.push({ x, y });
  }
  return points;
}

function cellName(kind: CellKind): string {
  if (kind === 'solid-house') return 'Solid house';
  if (kind === 'enterable-house') return 'Enterable house';
  if (kind === 'elevation') return 'Elevation';
  return 'Street';
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
