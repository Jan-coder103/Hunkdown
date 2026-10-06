import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  Scene,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
import { createSeededRandom } from '../../engine/seeded-random';
import { getWeaponDefinition } from '../../content/weapons/registry';
import { createAsset } from '../../content/assets/registry';
import type { GeneratedAsset } from '../../content/assets/asset-types';
import { ChickenCharacterView } from '../player/chicken-character-view';
import { generateMap, worldPosition, type GeneratedMap } from '../world/map-generator';
import { createEnterableBuilding, createSlopeGeometry } from '../../tools/map-editor/map-geometry';
import { BotSkirmishSimulation, type BotShot, type BotSide, type BotSimulationOptions, type BotSimulationStep, type BotSnapshot } from './bot-simulation';
import { BotSkirmishMatch, type BotCorpseSnapshot, type BotSkirmishMatchRules } from '../match/bot-skirmish-match';

const CELL_COLORS: Readonly<Record<string, string>> = Object.freeze({
  street: '#c4cdbc',
  'solid-house': '#c9a8a0',
  'enterable-house': '#e8d18c',
  elevation: '#91b386',
});

type Tracer = { line: Line<BufferGeometry, LineBasicMaterial>; remaining: number; duration: number };
type DebrisParticle = {
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  velocity: Vector3;
  spin: Vector3;
  groundY: number;
  remaining: number;
};
const MAX_DEBRIS_PARTICLES = 32;

export type BotSkirmishViewOptions = Readonly<{
  friendlyCount?: number;
  enemyCount?: number;
  seed?: number;
  countdownSeconds?: number;
  simulation?: BotSimulationOptions;
  rules?: Partial<BotSkirmishMatchRules>;
}>;

/** Scene presentation for the deterministic bot-only match preview. */
export class BotSkirmishView {
  readonly simulation: BotSkirmishSimulation;
  readonly match: BotSkirmishMatch;
  readonly map: GeneratedMap;
  private readonly root = new Group();
  private readonly characters = new Map<string, ChickenCharacterView>();
  private readonly corpseViews = new Map<string, ChickenCharacterView>();
  private readonly previousPositions = new Map<string, Vector3>();
  private readonly previousHealth = new Map<string, number>();
  private readonly generatedAssets: GeneratedAsset[] = [];
  private readonly ownedGeometries = new Set<BufferGeometry>();
  private readonly ownedMaterials = new Set<Material>();
  private readonly tracers: Tracer[] = [];
  private readonly decorationViews = new Map<string, Object3D>();
  private readonly buildingPartViews = new Map<string, Object3D>();
  private readonly debris: DebrisParticle[] = [];
  private debrisRandom: () => number;
  private disposed = false;
  private kills = 0;
  private readonly weaponRange: number;

  constructor(
    private readonly scene: Scene,
    map: GeneratedMap,
    options: BotSkirmishViewOptions = {},
  ) {
    this.map = map;
    const seed = options.seed ?? map.source.seed;
    this.debrisRandom = createSeededRandom((seed ^ 0xd3b215) >>> 0);
    this.weaponRange = getWeaponDefinition(options.simulation?.weaponId ?? 'honk-47').range;
    this.match = new BotSkirmishMatch(map, {
      friendlyCount: options.friendlyCount ?? 8,
      enemyCount: options.enemyCount ?? 8,
      seed,
    }, { ...options.simulation, seed }, options.countdownSeconds, options.rules);
    this.simulation = this.match.simulation;
    this.root.name = 'live bot skirmish';
    this.scene.add(this.root);
    this.buildCity();
    this.buildDebrisPool();
    this.addCharacters();
  }

  get snapshots(): readonly BotSnapshot[] {
    return this.simulation.snapshots;
  }

  get totalKills(): number {
    return this.kills;
  }

  get tracerCount(): number {
    return this.tracers.length;
  }

  get debrisCount(): number {
    return this.debris.reduce((count, particle) => count + Number(particle.mesh.visible), 0);
  }

  step(deltaSeconds: number): BotSimulationStep {
    if (this.disposed) return Object.freeze({ shots: Object.freeze([]), killedIds: Object.freeze([]), destroyedObstacleIds: Object.freeze([]) });
    this.updateTracers(deltaSeconds);
    this.updateDebris(deltaSeconds);
    const before = this.simulation.snapshots;
    for (const bot of before) this.previousPositions.set(bot.id, new Vector3(bot.position.x, bot.position.y, bot.position.z));

    const result = this.match.step(deltaSeconds);
    this.kills += result.killedIds.length;
    this.showDestruction(result.destroyedObstacleIds);
    const after = this.simulation.snapshots;
    const byId = new Map(after.map((bot) => [bot.id, bot]));
    for (const bot of after) this.syncCharacter(bot, byId, deltaSeconds);
    this.syncCorpses(this.match.corpseSnapshots, deltaSeconds);
    for (const shot of result.shots) this.addTracer(shot, byId);
    return result;
  }

  /** Hides broken props or wall segments and emits a fixed-budget debris burst. */
  showDestruction(ids: readonly string[]): void {
    if (this.disposed) return;
    for (const id of new Set(ids)) {
      const model = this.decorationViews.get(id) ?? this.buildingPartViews.get(id);
      if (!model?.visible) continue;
      model.visible = false;
      const placement = this.map.decorations.find((candidate) => candidate.id === id);
      const collider = this.map.collisions.find((candidate) => candidate.id === id);
      if (!placement && !collider) continue;
      const position = placement?.position ?? collider!.center;
      const groundY = placement?.position.y ?? Math.max(0, collider!.center.y - collider!.size.y / 2);
      const originY = placement ? groundY + 0.55 : collider!.center.y;
      for (let index = 0; index < 4; index += 1) {
        const particle = this.debris.find((candidate) => !candidate.mesh.visible);
        if (!particle) break;
        const angle = this.debrisRandom() * Math.PI * 2;
        const speed = 1.4 + this.debrisRandom() * 2.6;
        particle.mesh.visible = true;
        particle.mesh.position.set(
          position.x + Math.cos(angle) * 0.18,
          originY + this.debrisRandom() * 0.25,
          position.z + Math.sin(angle) * 0.18,
        );
        particle.mesh.rotation.set(this.debrisRandom() * Math.PI, this.debrisRandom() * Math.PI, this.debrisRandom() * Math.PI);
        particle.velocity.set(Math.cos(angle) * speed, 1.8 + this.debrisRandom() * 2.8, Math.sin(angle) * speed);
        particle.spin.set((this.debrisRandom() - 0.5) * 9, (this.debrisRandom() - 0.5) * 9, (this.debrisRandom() - 0.5) * 9);
        particle.groundY = groundY;
        particle.remaining = 1.35;
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const character of this.characters.values()) character.dispose();
    this.characters.clear();
    for (const corpse of this.corpseViews.values()) corpse.dispose();
    this.corpseViews.clear();
    for (const tracer of this.tracers) this.disposeTracer(tracer);
    this.tracers.length = 0;
    this.decorationViews.clear();
    this.buildingPartViews.clear();
    this.scene.remove(this.root);
    for (const asset of this.generatedAssets) asset.dispose();
    this.generatedAssets.length = 0;
    for (const geometry of this.ownedGeometries) geometry.dispose();
    for (const material of this.ownedMaterials) material.dispose();
    this.ownedGeometries.clear();
    this.ownedMaterials.clear();
  }

  private buildCity(): void {
    const { source } = this.map;
    const base = new Mesh(
      this.ownGeometry(new PlaneGeometry(source.width * source.cellSize, source.height * source.cellSize)),
      this.ownMaterial(new MeshStandardMaterial({ color: '#b6c6b5', roughness: 0.95 })),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.08;
    this.root.add(base);

    const tileGeometry = this.ownGeometry(new PlaneGeometry(source.cellSize - 0.06, source.cellSize - 0.06));
    const tileMaterials = new Map<string, MeshStandardMaterial>();
    for (const cell of source.cells) {
      const color = CELL_COLORS[cell.kind] ?? CELL_COLORS.street ?? '#c4cdbc';
      let material = tileMaterials.get(color);
      if (!material) {
        material = this.ownMaterial(new MeshStandardMaterial({ color, roughness: 0.9 })) as MeshStandardMaterial;
        tileMaterials.set(color, material);
      }
      const position = worldPosition(source, cell);
      const tile = new Mesh(tileGeometry, material);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(position.x, 0.005, position.z);
      this.root.add(tile);
    }

    const raisedTileGeometry = this.ownGeometry(new BoxGeometry(source.cellSize - 0.06, 1.25, source.cellSize - 0.06));
    const raisedTileMaterial = this.ownMaterial(new MeshStandardMaterial({ color: '#86a977', roughness: 0.9 }));
    for (const elevation of this.map.elevations) {
      const position = worldPosition(source, elevation.cell);
      const tile = new Mesh(raisedTileGeometry, raisedTileMaterial);
      tile.position.set(position.x, elevation.height / 2, position.z);
      this.root.add(tile);
    }

    for (const slope of this.map.slopes) {
      const ramp = new Mesh(
        this.ownGeometry(createSlopeGeometry(source, slope)),
        this.ownMaterial(new MeshStandardMaterial({ color: '#c7d58f', roughness: 0.84, side: 2 })),
      );
      ramp.name = `skirmish ramp ${slope.direction}`;
      this.root.add(ramp);
    }

    this.buildBuildings();
    this.buildDecorations();
    this.buildCenterMarker();
  }

  private buildBuildings(): void {
    const size = this.map.source.cellSize;
    for (const placement of this.map.buildings) {
      if (placement.enterable) {
        const model = createEnterableBuilding(this.map, placement.cell);
        for (const collision of this.map.collisions) {
          if (collision.role !== 'enterable-wall' || collision.cell.x !== placement.cell.x || collision.cell.y !== placement.cell.y || !collision.id) continue;
          const part = model.getObjectByName(`destructible building part ${collision.id}`);
          if (part) this.buildingPartViews.set(collision.id, part);
        }
        this.trackObjectResources(model);
        this.root.add(model);
        continue;
      }
      const asset = createAsset(placement.assetId);
      this.generatedAssets.push(asset);
      const model = asset.lods.close;
      const bounds = asset.bounds;
      model.scale.set(
        size / (bounds.max[0] - bounds.min[0]),
        size / 2.8,
        size / (bounds.max[2] - bounds.min[2]),
      );
      model.rotation.y = placement.quarterTurns * Math.PI / 2;
      model.position.set(placement.position.x, 0.025, placement.position.z);
      this.root.add(model);
    }
  }

  private buildDecorations(): void {
    for (const placement of this.map.decorations) {
      const asset = createAsset(placement.assetId);
      this.generatedAssets.push(asset);
      const model = asset.lods.close;
      model.name = `destructible prop ${placement.id}`;
      model.rotation.y = placement.rotation;
      model.scale.setScalar(Math.min(1, this.map.source.cellSize / 4));
      model.position.set(placement.position.x, placement.position.y + 0.02, placement.position.z);
      this.decorationViews.set(placement.id, model);
      this.root.add(model);
    }
  }

  private buildDebrisPool(): void {
    const geometry = this.ownGeometry(new BoxGeometry(0.16, 0.16, 0.16));
    const palette = ['#b88a66', '#d5bc8e', '#819783', '#bf785c', '#a8aa8e']
      .map((color) => this.ownMaterial(new MeshStandardMaterial({ color, roughness: 0.88 })) as MeshStandardMaterial);
    for (let index = 0; index < MAX_DEBRIS_PARTICLES; index += 1) {
      const mesh = new Mesh(geometry, palette[index % palette.length]!);
      mesh.name = 'reusable destruction debris';
      mesh.visible = false;
      this.root.add(mesh);
      this.debris.push({ mesh, velocity: new Vector3(), spin: new Vector3(), groundY: 0, remaining: 0 });
    }
  }

  private updateDebris(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const step = Math.min(deltaSeconds, 0.1);
    for (const particle of this.debris) {
      if (!particle.mesh.visible) continue;
      particle.remaining -= deltaSeconds;
      particle.velocity.y -= 9.8 * step;
      particle.mesh.position.addScaledVector(particle.velocity, step);
      particle.mesh.rotation.x += particle.spin.x * step;
      particle.mesh.rotation.y += particle.spin.y * step;
      particle.mesh.rotation.z += particle.spin.z * step;
      if (particle.mesh.position.y <= particle.groundY + 0.08) {
        particle.mesh.position.y = particle.groundY + 0.08;
        particle.velocity.y = Math.max(0, -particle.velocity.y * 0.2);
        particle.velocity.x *= 0.66;
        particle.velocity.z *= 0.66;
        if (particle.velocity.y < 0.55) particle.velocity.y = 0;
      }
      if (particle.remaining <= 0) particle.mesh.visible = false;
    }
  }

  private buildCenterMarker(): void {
    const marker = new Group();
    marker.name = 'central skirmish meeting point';
    const ring = new Mesh(
      this.ownGeometry(new RingGeometry(this.map.source.cellSize * 0.36, this.map.source.cellSize * 0.4, 48)),
      this.ownMaterial(new MeshBasicMaterial({ color: '#f2b84b', transparent: true, opacity: 0.92, side: 2 })),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    const hub = new Mesh(
      this.ownGeometry(new CylinderGeometry(0.18, 0.24, 0.55, 7)),
      this.ownMaterial(new MeshStandardMaterial({ color: '#db9d42', roughness: 0.62 })),
    );
    hub.position.y = 0.275;
    marker.add(ring, hub);
    this.root.add(marker);
  }

  private addCharacters(): void {
    for (const bot of this.simulation.snapshots) {
      const team: BotSide = bot.team;
      const character = new ChickenCharacterView(this.scene, team, 'third-person');
      character.object.name = `skirmish ${bot.team} bot ${bot.id}`;
      character.object.position.set(bot.position.x, bot.position.y, bot.position.z);
      this.characters.set(bot.id, character);
      this.previousPositions.set(bot.id, new Vector3(bot.position.x, bot.position.y, bot.position.z));
      this.previousHealth.set(bot.id, bot.health);
    }
  }

  private syncCharacter(bot: BotSnapshot, allBots: ReadonlyMap<string, BotSnapshot>, deltaSeconds: number): void {
    const character = this.characters.get(bot.id);
    if (!character) return;
    character.object.visible = bot.status === 'alive';
    const previous = this.previousPositions.get(bot.id);
    const movementSpeed = previous && deltaSeconds > 0
      ? Math.hypot(bot.position.x - previous.x, bot.position.z - previous.z) / deltaSeconds
      : 0;
    const priorHealth = this.previousHealth.get(bot.id) ?? bot.health;
    if (bot.health < priorHealth) character.triggerDamage();
    this.previousHealth.set(bot.id, bot.health);
    character.object.position.set(bot.position.x, bot.position.y, bot.position.z);

    const target = bot.targetId ? allBots.get(bot.targetId) : undefined;
    const directionX = target
      ? target.position.x - bot.position.x
      : bot.position.x - (previous?.x ?? bot.position.x);
    const directionZ = target
      ? target.position.z - bot.position.z
      : bot.position.z - (previous?.z ?? bot.position.z);
    if (Math.hypot(directionX, directionZ) > 0.001) character.object.rotation.y = Math.atan2(directionX, directionZ);
    character.setPose({
      movementSpeed,
      sprinting: movementSpeed > 5.8,
      grounded: true,
      aiming: bot.shouldFire,
      dead: false,
    });
    character.update(deltaSeconds);
  }

  private syncCorpses(snapshots: readonly BotCorpseSnapshot[], deltaSeconds: number): void {
    const present = new Set(snapshots.map((corpse) => corpse.id));
    for (const [id, view] of this.corpseViews) {
      if (present.has(id)) continue;
      view.dispose();
      this.corpseViews.delete(id);
    }
    for (const corpse of snapshots) {
      let view = this.corpseViews.get(corpse.id);
      if (!view) {
        view = new ChickenCharacterView(this.scene, corpse.team, 'third-person');
        view.object.name = `skirmish corpse ${corpse.id}`;
        view.object.position.set(corpse.position.x, corpse.position.y, corpse.position.z);
        view.setPose({ grounded: true, dead: true, deathImpulse: corpse.deathImpulse });
        this.corpseViews.set(corpse.id, view);
      }
      view.update(deltaSeconds);
    }
  }

  private addTracer(shot: BotShot, snapshots: ReadonlyMap<string, BotSnapshot>): void {
    const shooter = snapshots.get(shot.shooterId);
    if (!shooter) return;
    const start = new Vector3(shooter.position.x, shooter.position.y + 1.08, shooter.position.z);
    const distance = shot.result.distance ?? this.weaponRange;
    const end = start.clone().addScaledVector(shot.result.direction, distance);
    const geometry = new BufferGeometry().setFromPoints([start, end]);
    const teamColor = shooter.team === 'friendly' ? '#5ee0c7' : '#ff9168';
    const material = new LineBasicMaterial({ color: teamColor, transparent: true, opacity: 0.86, depthWrite: false });
    const line = new Line(geometry, material);
    line.name = `${shooter.team} bot shot tracer`;
    this.scene.add(line);
    const tracer = { line, remaining: 0.095, duration: 0.095 };
    this.tracers.push(tracer);
    while (this.tracers.length > 48) {
      const oldest = this.tracers.shift();
      if (oldest) this.disposeTracer(oldest);
    }
  }

  private updateTracers(deltaSeconds: number): void {
    for (let index = this.tracers.length - 1; index >= 0; index -= 1) {
      const tracer = this.tracers[index];
      if (!tracer) continue;
      tracer.remaining -= deltaSeconds;
      tracer.line.material.opacity = Math.max(0, tracer.remaining / tracer.duration) * 0.86;
      if (tracer.remaining <= 0) {
        this.tracers.splice(index, 1);
        this.disposeTracer(tracer);
      }
    }
  }

  private disposeTracer(tracer: Tracer): void {
    this.scene.remove(tracer.line);
    tracer.line.geometry.dispose();
    tracer.line.material.dispose();
  }

  private trackObjectResources(object: Object3D): void {
    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      this.ownGeometry(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) this.ownMaterial(material);
    });
  }

  private ownGeometry<T extends BufferGeometry>(geometry: T): T {
    this.ownedGeometries.add(geometry);
    return geometry;
  }

  private ownMaterial<T extends Material>(material: T): T {
    this.ownedMaterials.add(material);
    return material;
  }
}
