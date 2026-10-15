import { BoxGeometry, Color, CylinderGeometry, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, type BufferGeometry, type Material } from 'three';
import { createTacticalChickenModel } from '../content/assets/tactical-chicken.asset';

/** A presentation-only title scene; it never contains or advances a gameplay world. */
export class MenuBackdrop {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(38, 1, 0.1, 100);
  private readonly hero = new Group();
  private disposed = false;
  private readonly characterMaterials: readonly Material[];

  constructor() {
    this.scene.name = 'Honkdown title showcase';
    this.scene.background = new Color('#192229');
    this.scene.fog = new Fog('#192229', 13, 28);
    this.scene.add(new HemisphereLight('#dfecf2', '#292b30', 2.2));
    const key = new DirectionalLight('#fff0ce', 4);
    key.position.set(-3, 7, 6);
    const rim = new DirectionalLight('#9cc9db', 3);
    rim.position.set(5, 4, -3);
    this.scene.add(key, rim);
    const chicken = createTacticalChickenModel('player', 'close', 'yellow');
    this.characterMaterials = chicken.ownedMaterials;
    chicken.root.scale.setScalar(2.2);
    chicken.root.rotation.y = -0.48;
    this.hero.add(chicken.root);
    const plinth = new Mesh(new CylinderGeometry(1.7, 1.85, 0.17, 48), new MeshStandardMaterial({ color: '#39454d', roughness: 0.9 }));
    plinth.position.y = -0.1;
    this.hero.add(plinth);
    const ring = new Mesh(new CylinderGeometry(1.86, 1.86, 0.035, 48), new MeshStandardMaterial({ color: '#e8c36a', roughness: 0.6 }));
    ring.position.y = -0.18;
    this.hero.add(ring);
    this.scene.add(this.hero);
    const floor = new Mesh(new BoxGeometry(80, 0.15, 60), new MeshStandardMaterial({ color: '#202b32', roughness: 1 }));
    floor.position.set(0, -0.3, -6);
    this.scene.add(floor);
    // Muted city silhouettes frame the character, without loading a match/map.
    const cityMaterial = new MeshStandardMaterial({ color: '#34434d', roughness: 1 });
    for (let index = 0; index < 15; index += 1) {
      const height = 2 + ((index * 7) % 5) * 0.8;
      const tower = new Mesh(new BoxGeometry(1.5, height, 1.8), cityMaterial);
      tower.position.set((index - 7) * 2.1, height / 2 - 0.3, -10 - index % 3);
      this.scene.add(tower);
    }
    this.camera.position.set(0, 3.4, 10.5);
    this.camera.lookAt(0, 1.7, 0);
  }

  frame(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.hero.position.x = aspect > 1.1 ? aspect * 1.7 : 1.35;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>(this.characterMaterials);
    this.scene.traverse((part) => {
      if (!(part instanceof Mesh)) return;
      geometries.add(part.geometry);
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) materials.add(material);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    this.scene.clear();
  }
}
