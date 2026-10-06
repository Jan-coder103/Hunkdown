import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { createAsset, getAssetDefinition } from '../../content/assets/registry';
import type { GeneratedAsset } from '../../content/assets/asset-types';
import { generateMap, worldPosition, type GeneratedMap, type SlopePlacement } from '../../game/world/map-generator';
import { getMapCell, type MapDocument } from '../../game/world/map-types';

export type PreviewSummary = Readonly<{
  buildings: number;
  decorations: number;
  slopes: number;
  navigationNodes: number;
  navigationLinks: number;
}>;

const CELL_COLORS: Readonly<Record<string, string>> = Object.freeze({
  street: '#c4cdbc',
  'solid-house': '#c9a8a0',
  'enterable-house': '#e8d18c',
  elevation: '#91b386',
});

export class MapPreview {
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-16, 16, 16, -16, 0.1, 250);
  private readonly renderer: WebGLRenderer;
  private readonly observer: ResizeObserver;
  private readonly ground = new Object3D();
  private readonly contents = new Object3D();
  private readonly generatedAssets: GeneratedAsset[] = [];
  private readonly ownedGeometries = new Set<BufferGeometry>();
  private readonly ownedMaterials = new Set<Material>();
  private animationFrame = 0;
  private disposed = false;
  private currentMap: MapDocument | null = null;

  constructor(private readonly host: HTMLElement) {
    this.scene.background = new Color('#a7c0b7');
    this.scene.add(new AmbientLight(0xfff4db, 2.05));
    const key = new DirectionalLight(0xffe7bf, 3.2);
    key.position.set(-20, 35, 16);
    this.scene.add(key);
    const fill = new DirectionalLight(0xc6e4dd, 1.2);
    fill.position.set(22, 18, -25);
    this.scene.add(fill);
    this.scene.add(this.ground, this.contents);
    this.renderer = new WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 1), 2));
    this.renderer.domElement.setAttribute('aria-label', 'Generated city preview, viewed from above');
    this.renderer.domElement.className = 'map-preview-canvas';
    this.host.appendChild(this.renderer.domElement);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.renderLoop();
  }

  build(map: MapDocument): Readonly<{ generated: GeneratedMap; summary: PreviewSummary }> {
    this.clearContents();
    this.currentMap = map;
    const generated = generateMap(map);
    this.buildGround(generated);
    this.buildElevations(generated);
    this.buildSlopes(generated);
    this.buildBuildings(generated);
    this.buildDecorations(generated);
    this.buildPaths(generated);
    this.fitCamera(map);
    return Object.freeze({
      generated,
      summary: Object.freeze({
        buildings: generated.buildings.length,
        decorations: generated.decorations.length,
        slopes: generated.slopes.length,
        navigationNodes: generated.navigationNodes.length,
        navigationLinks: generated.navigationLinks.length,
      }),
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.cancelAnimationFrame(this.animationFrame);
    this.observer.disconnect();
    this.clearContents();
    this.scene.remove(this.ground, this.contents);
    for (const geometry of this.ownedGeometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedGeometries.clear();
    this.ownedMaterials.clear();
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }

  private buildGround(generated: GeneratedMap): void {
    const { source } = generated;
    const base = new Mesh(
      this.ownGeometry(new PlaneGeometry(source.width * source.cellSize, source.height * source.cellSize)),
      this.ownMaterial(new MeshStandardMaterial({ color: '#b6c6b5', roughness: 0.95 })),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.08;
    base.receiveShadow = true;
    this.ground.add(base);

    const tileGeometry = this.ownGeometry(new PlaneGeometry(source.cellSize - 0.06, source.cellSize - 0.06));
    const materials = new Map<string, MeshStandardMaterial>();
    for (const cell of source.cells) {
      const color = CELL_COLORS[cell.kind] ?? CELL_COLORS.street ?? '#c4cdbc';
      let material = materials.get(color);
      if (!material) {
        material = this.ownMaterial(new MeshStandardMaterial({ color, roughness: 0.9 })) as MeshStandardMaterial;
        materials.set(color, material);
      }
      const position = worldPosition(source, cell);
      const tile = new Mesh(tileGeometry, material);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(position.x, 0.005, position.z);
      this.contents.add(tile);
    }
  }

  private buildElevations(generated: GeneratedMap): void {
    const { source } = generated;
    for (const item of generated.elevations) {
      const position = worldPosition(source, item.cell);
      const tile = new Mesh(
        this.ownGeometry(new BoxGeometry(source.cellSize - 0.06, item.height, source.cellSize - 0.06)),
        this.ownMaterial(new MeshStandardMaterial({ color: '#86a977', roughness: 0.9 })),
      );
      tile.position.set(position.x, item.height / 2, position.z);
      this.contents.add(tile);
      const contour = new Line(
        this.ownGeometry(createCellOutline(position.x, position.z, source.cellSize - 0.24, item.height + 0.015)),
        this.ownMaterial(new LineBasicMaterial({ color: '#e1edbd', transparent: true, opacity: 0.92 })),
      );
      this.contents.add(contour);
    }
  }

  private buildSlopes(generated: GeneratedMap): void {
    for (const slope of generated.slopes) {
      const mesh = new Mesh(
        this.ownGeometry(createSlopeGeometry(generated.source, slope)),
        this.ownMaterial(new MeshStandardMaterial({ color: '#c7d58f', roughness: 0.84, side: 2 })),
      );
      mesh.name = `slope ${slope.highCell.x},${slope.highCell.y} toward ${slope.direction}`;
      this.contents.add(mesh);
    }
  }

  private buildBuildings(generated: GeneratedMap): void {
    const size = generated.source.cellSize;
    for (const placement of generated.buildings) {
      const asset = createAsset(placement.assetId);
      this.generatedAssets.push(asset);
      const definition = getAssetDefinition(placement.assetId);
      const modelHeight = (definition.bounds.max[1] - definition.bounds.min[1]) * size / 2.8;
      const model = asset.lods.close;
      model.scale.set(size / (asset.bounds.max[0] - asset.bounds.min[0]), size / 2.8, size / (asset.bounds.max[2] - asset.bounds.min[2]));
      model.rotation.y = placement.quarterTurns * Math.PI / 2;
      model.position.set(placement.position.x, 0.025, placement.position.z);
      this.contents.add(model);
      if (!placement.enterable) continue;
      for (const side of placement.doors) {
        const mark = new Mesh(
          this.ownGeometry(new PlaneGeometry(1.5, 0.46)),
          this.ownMaterial(new MeshBasicMaterial({ color: '#fff1b3', side: 2 })),
        );
        const direction = side === 'north' ? -1 : side === 'south' ? 1 : side === 'west' ? -1 : 1;
        const isNorthSouth = side === 'north' || side === 'south';
        mark.rotation.x = -Math.PI / 2;
        mark.rotation.z = isNorthSouth ? 0 : Math.PI / 2;
        mark.position.set(
          placement.position.x + (isNorthSouth ? 0 : direction * size / 2),
          modelHeight + 0.08,
          placement.position.z + (isNorthSouth ? direction * size / 2 : 0),
        );
        this.contents.add(mark);
      }
    }
  }

  private buildDecorations(generated: GeneratedMap): void {
    for (const placement of generated.decorations) {
      const asset = createAsset(placement.assetId);
      this.generatedAssets.push(asset);
      const model = asset.lods.close;
      model.rotation.y = placement.rotation;
      model.scale.setScalar(Math.min(1, generated.source.cellSize / 4));
      model.position.set(placement.position.x, placement.position.y + 0.02, placement.position.z);
      this.contents.add(model);
    }
  }

  private buildPaths(generated: GeneratedMap): void {
    const size = generated.source.cellSize;
    for (const route of generated.source.paths) {
      if (route.cells.length < 2) continue;
      const points = route.cells.map((cell) => {
        const position = worldPosition(generated.source, cell);
        const mapCell = getMapCell(generated.source, cell.x, cell.y);
        const building = generated.buildings.find((item) => item.cell.x === cell.x && item.cell.y === cell.y);
        const buildingTop = building
          ? (getAssetDefinition(building.assetId).bounds.max[1] - getAssetDefinition(building.assetId).bounds.min[1]) * generated.source.cellSize / 2.8 + 0.2
          : 0;
        const y = mapCell?.kind === 'elevation' ? 1.5 : mapCell?.kind === 'enterable-house' ? buildingTop : 0.14;
        return new Vector3(position.x, y, position.z);
      });
      const line = new Line(
        this.ownGeometry(new BufferGeometry().setFromPoints(points)),
        this.ownMaterial(new LineBasicMaterial({ color: '#f5bb63', linewidth: Math.max(size / 4, 2) })),
      );
      line.name = `authored route: ${route.name}`;
      this.contents.add(line);
    }
  }

  private clearContents(): void {
    for (const child of [...this.ground.children, ...this.contents.children]) {
      child.removeFromParent();
      if (child instanceof Mesh || child instanceof Line) {
        if (child.geometry && !this.ownedGeometries.has(child.geometry)) child.geometry.dispose();
      }
    }
    for (const asset of this.generatedAssets.splice(0)) asset.dispose();
    for (const geometry of this.ownedGeometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedGeometries.clear();
    this.ownedMaterials.clear();
  }

  private fitCamera(map: MapDocument): void {
    const width = map.width * map.cellSize;
    const height = map.height * map.cellSize;
    const centerX = 0;
    const centerZ = 0;
    const aspect = Math.max(this.host.clientWidth, 1) / Math.max(this.host.clientHeight, 1);
    const verticalSize = Math.max(height, width / aspect) * 1.12;
    this.camera.left = -verticalSize * aspect / 2;
    this.camera.right = verticalSize * aspect / 2;
    this.camera.top = verticalSize / 2;
    this.camera.bottom = -verticalSize / 2;
    this.camera.position.set(centerX, Math.max(width, height) * 0.9 + 30, centerZ);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(centerX, 0, centerZ);
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    if (this.disposed) return;
    const width = Math.max(this.host.clientWidth, 1);
    const height = Math.max(this.host.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    if (this.currentMap) this.fitCamera(this.currentMap);
  }

  private renderLoop = (): void => {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = window.requestAnimationFrame(this.renderLoop);
  };

  private ownGeometry<T extends BufferGeometry>(geometry: T): T {
    this.ownedGeometries.add(geometry);
    return geometry;
  }

  private ownMaterial<T extends Material>(material: T): T {
    this.ownedMaterials.add(material);
    return material;
  }
}

function createCellOutline(x: number, z: number, size: number, y: number): BufferGeometry {
  const half = size / 2;
  return new BufferGeometry().setFromPoints([
    new Vector3(x - half, y, z - half),
    new Vector3(x + half, y, z - half),
    new Vector3(x + half, y, z + half),
    new Vector3(x - half, y, z + half),
    new Vector3(x - half, y, z - half),
  ]);
}

function createSlopeGeometry(map: MapDocument, slope: SlopePlacement): BufferGeometry {
  const high = worldPosition(map, slope.highCell);
  const low = worldPosition(map, slope.lowCell);
  const dx = Math.sign(low.x - high.x);
  const dz = Math.sign(low.z - high.z);
  const boundaryX = (high.x + low.x) / 2;
  const boundaryZ = (high.z + low.z) / 2;
  const halfRun = slope.run / 2;
  const halfWidth = Math.min(map.cellSize * 0.38, 2.8) / 2;
  const perpendicularX = -dz;
  const perpendicularZ = dx;
  const topX = boundaryX - dx * halfRun;
  const topZ = boundaryZ - dz * halfRun;
  const bottomX = boundaryX + dx * halfRun;
  const bottomZ = boundaryZ + dz * halfRun;
  const positions = [
    topX - perpendicularX * halfWidth, slope.height, topZ - perpendicularZ * halfWidth,
    topX + perpendicularX * halfWidth, slope.height, topZ + perpendicularZ * halfWidth,
    bottomX - perpendicularX * halfWidth, 0.025, bottomZ - perpendicularZ * halfWidth,
    bottomX + perpendicularX * halfWidth, 0.025, bottomZ + perpendicularZ * halfWidth,
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}
