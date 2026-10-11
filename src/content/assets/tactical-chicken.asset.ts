import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createAssetRoot, type AssetDefinition } from './asset-types';

export type ChickenTeam = 'player' | 'friendly' | 'enemy';
export type ChickenDetail = 'close' | 'far';

export type ChickenModelRig = Readonly<{
  root: Group;
  body: Group;
  head: Group;
  leftWing: Group;
  rightWing: Group;
  leftLeg: Group;
  rightLeg: Group;
  teamMark: Mesh;
  featherMaterial: MeshStandardMaterial;
  ownedMaterials: readonly Material[];
}>;

export type ChickenArmsRig = Readonly<{
  root: Group;
  leftWing: Group;
  rightWing: Group;
  featherMaterial: MeshStandardMaterial;
  ownedMaterials: readonly Material[];
}>;

const TEAM_MARKINGS: Readonly<Record<ChickenTeam, string>> = Object.freeze({
  player: '#e2b54d',
  friendly: '#55b8a0',
  enemy: '#d96d64',
});

/** Builds the low-poly third-person chicken used by the viewer and combatants. */
export function createTacticalChickenModel(team: ChickenTeam = 'friendly', detail: ChickenDetail = 'close'): ChickenModelRig {
  if (detail === 'far') return createFarTacticalChickenModel(team);
  const close = detail === 'close';
  const root = createAssetRoot(`Tactical chicken — ${team} — ${detail} LOD`);
  const feather = material('#f5c765', 0.9);
  const wingFeather = material('#eab654', 0.92);
  const vest = material('#586b60', 0.9);
  const vestDark = material('#394b44', 0.92);
  const orange = material('#df9c48', 0.82);
  const combMaterial = material('#f06b50', 0.86);
  const beakMaterial = material('#e9ad54', 0.78);
  const eyeMaterial = material('#49302a', 0.38);
  const eyeGlintMaterial = material('#fff7df', 0.34);
  const teamMaterial = material(TEAM_MARKINGS[team], 0.74);
  eyeMaterial.flatShading = false;
  eyeGlintMaterial.flatShading = false;
  const ownedMaterials = [
    feather, wingFeather, vest, vestDark, orange,
    combMaterial, beakMaterial, eyeMaterial, eyeGlintMaterial, teamMaterial,
  ];
  const spheroid = (
    name: string,
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    finish: MeshStandardMaterial,
    target: Group,
    segments = close ? 8 : 5,
  ): Mesh => {
    const mesh = new Mesh(new SphereGeometry(1, segments, Math.max(3, segments - 2)), finish);
    mesh.name = name;
    mesh.scale.set(...size);
    mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  };
  const block = (
    name: string,
    size: readonly [number, number, number],
    at: readonly [number, number, number],
    finish: MeshStandardMaterial,
    target = root,
  ): Mesh => {
    const mesh = new Mesh(new BoxGeometry(...size), finish);
    mesh.name = name;
    mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    target.add(mesh);
    return mesh;
  };

  // Overlapping egg volumes avoid a narrow neck and leave the face/comb uncovered.
  const body = new Group();
  body.name = 'chicken body and tactical vest';
  body.position.set(0, 0.88, 0);
  root.add(body);
  const torso = new Mesh(createPearBody(12), feather);
  torso.name = 'feathered body';
  torso.position.y = -0.88;
  torso.castShadow = true;
  torso.receiveShadow = true;
  body.add(torso);
  spheroid('tactical vest', [0.32, 0.19, 0.16], [0, -0.12, -0.31], vest, body);
  block('left utility pouch', [0.17, 0.14, 0.07], [-0.25, -0.19, -0.35], vestDark, body);
  block('right utility pouch', [0.17, 0.14, 0.07], [0.25, -0.19, -0.35], vestDark, body);
  block('chest team marker', [0.18, 0.105, 0.035], [0, -0.08, 0.455], teamMaterial, body);
  block('field pack', [0.3, 0.32, 0.16], [0, -0.02, -0.36], vestDark, body);
  for (const side of [-1, 1]) {
    block('shoulder strap', [0.055, 0.3, 0.05], [side * 0.32, 0.03, -0.25], vestDark, body).rotation.z = side * 0.24;
  }
  for (const side of [-1, 0, 1]) {
    const tail = spheroid('tail feather', [0.12, 0.28, 0.1], [side * 0.14, 0.22, -0.44], wingFeather, body);
    tail.rotation.x = -0.6;
    tail.rotation.z = side * -0.35;
  }

  const head = new Group();
  head.name = 'chicken head';
  head.position.set(0, 1.35, 0.06);
  root.add(head);
  // Face remains on its animation pivot; the continuous torso supplies the head silhouette.
  for (const side of [-1, 1]) {
    spheroid('white eye', [0.117, 0.137, 0.067], [side * 0.176, 0.065, 0.305], eyeGlintMaterial, head, 10);
    spheroid('dark eye', [0.073, 0.086, 0.038], [side * 0.176 + 0.012, 0.064, 0.369], eyeMaterial, head, 9);
    spheroid('eye glint', [0.025, 0.028, 0.012], [side * 0.176 - 0.009, 0.102, 0.401], eyeGlintMaterial, head, 6);
    spheroid('rosy cheek', [0.072, 0.04, 0.018], [side * 0.26, -0.07, 0.325], combMaterial, head);

  }
  spheroid('smiling mouth', [0.15, 0.075, 0.065], [0, -0.115, 0.415], eyeMaterial, head);
  spheroid('orange beak', [0.17, 0.055, 0.13], [0, -0.045, 0.4], beakMaterial, head, 8);
  spheroid('lower beak', [0.13, 0.04, 0.1], [0, -0.18, 0.405], beakMaterial, head);
  const comb = new Mesh(createComb(), combMaterial);
  comb.name = 'red comb';
  comb.position.set(0, 0.27, -0.13);
  comb.castShadow = true;
  head.add(comb);
  // Raised goggles move to the pack; the expressive eyes remain unobstructed.
  block('goggle frame', [0.27, 0.08, 0.04], [0, 0.09, -0.45], vestDark, body);
  const lens = material('#8dbdb4', 0.28, 0.14);
  ownedMaterials.push(lens);
  block('goggle lens', [0.21, 0.04, 0.02], [0, 0.09, -0.48], lens, body);

  const leftWing = createWing('left chicken wing', -1, wingFeather, vest, close, root);
  const rightWing = createWing('right chicken wing', 1, wingFeather, vest, close, root);
  const leftLeg = createLeg('left leg', -1, orange, vestDark, root, close);
  const rightLeg = createLeg('right leg', 1, orange, vestDark, root, close);
  return { root, body, head, leftWing, rightWing, leftLeg, rightLeg, teamMark: root.getObjectByName('chest team marker') as Mesh, featherMaterial: feather, ownedMaterials };
}

/** One vertex-colored silhouette plus a team patch keeps the far tier at two draw calls. */
function createFarTacticalChickenModel(team: ChickenTeam): ChickenModelRig {
  const root = createAssetRoot(`Tactical chicken — ${team} — far LOD`);
  const parts: BufferGeometry[] = [];
  const addPart = (
    geometry: BufferGeometry,
    color: string,
    position: readonly [number, number, number],
    scale: readonly [number, number, number] = [1, 1, 1],
    rotation: readonly [number, number, number] = [0, 0, 0],
  ): void => {
    if (geometry.index) {
      const original = geometry;
      geometry = original.toNonIndexed();
      original.dispose();
    }
    geometry.scale(...scale);
    geometry.rotateX(rotation[0]);
    geometry.rotateY(rotation[1]);
    geometry.rotateZ(rotation[2]);
    geometry.translate(...position);
    const colorValue = new Color(color);
    const count = geometry.getAttribute('position').count;
    const values = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) colorValue.toArray(values, index * 3);
    geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
    parts.push(geometry);
  };

  addPart(createPearBody(8), '#f5c765', [0, 0, 0]);
  addPart(new SphereGeometry(1, 6, 4), '#586b60', [0, 0.76, -0.31], [0.32, 0.19, 0.16]);
  addPart(new SphereGeometry(1, 6, 4), '#49302a', [0, 1.235, 0.475], [0.15, 0.075, 0.065]);
  addPart(new SphereGeometry(1, 6, 4), '#e9ad54', [0, 1.305, 0.46], [0.17, 0.055, 0.13]);
  addPart(new SphereGeometry(1, 5, 3), '#e9ad54', [0, 1.17, 0.465], [0.13, 0.04, 0.1]);
  addPart(createComb(), '#f06b50', [0, 1.62, -0.07]);
  for (const side of [-1, 1]) {
    addPart(new SphereGeometry(1, 5, 4), '#eab654', [side * 0.41, 0.97, 0.025], [0.22, 0.34, 0.19]);
    addPart(new CylinderGeometry(0.045, 0.055, 0.28, 4), '#df9c48', [side * 0.17, 0.28, 0.015]);
    for (const toe of [-1, 0, 1]) {
      addPart(new SphereGeometry(1, 4, 3), '#df9c48', [side * 0.17 + toe * 0.065, 0.055, 0.105], [0.035, 0.035, 0.14], [0, toe * 0.48, 0]);
    }
    addPart(new SphereGeometry(1, 5, 4), '#fff7df', [side * 0.176, 1.415, 0.365], [0.117, 0.137, 0.067]);
    addPart(new SphereGeometry(1, 5, 4), '#49302a', [side * 0.176 + 0.012, 1.414, 0.429], [0.073, 0.086, 0.038]);
    addPart(new SphereGeometry(1, 4, 3), '#fff7df', [side * 0.176 - 0.009, 1.452, 0.461], [0.025, 0.028, 0.012]);
    addPart(new SphereGeometry(1, 4, 3), '#f06b50', [side * 0.26, 1.28, 0.385], [0.072, 0.04, 0.018]);
  }
  for (const side of [-1, 0, 1]) {
    addPart(new SphereGeometry(1, 4, 3), '#eab654', [side * 0.14, 1.1, -0.44], [0.12, 0.28, 0.1], [-0.6, 0, side * -0.35]);
  }

  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error('Could not combine far chicken geometry');
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const featherMaterial = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.9, flatShading: true });
  const silhouette = new Mesh(geometry, featherMaterial);
  silhouette.name = 'far low-poly chicken silhouette';
  silhouette.castShadow = false;
  silhouette.receiveShadow = false;
  root.add(silhouette);

  const teamMaterial = material(TEAM_MARKINGS[team], 0.74);
  const teamMark = new Mesh(new BoxGeometry(0.18, 0.1, 0.04), teamMaterial);
  teamMark.name = 'chest team marker';
  teamMark.position.set(0, 0.8, 0.455);
  root.add(teamMark);

  const body = new Group();
  const head = new Group();
  const leftWing = new Group();
  const rightWing = new Group();
  const leftLeg = new Group();
  const rightLeg = new Group();
  return {
    root,
    body,
    head,
    leftWing,
    rightWing,
    leftLeg,
    rightLeg,
    teamMark,
    featherMaterial,
    ownedMaterials: [featherMaterial, teamMaterial],
  };
}

function createWing(name: string, side: -1 | 1, feathers: MeshStandardMaterial, sleeve: MeshStandardMaterial, close: boolean, root: Group): Group {
  const wing = new Group();
  wing.name = name;
  wing.position.set(side * 0.30, 1.05, 0.015);
  root.add(wing);
  const primary = new Mesh(new SphereGeometry(1, close ? 8 : 5, close ? 6 : 4), feathers);
  primary.name = 'wing sleeve';
  primary.scale.set(0.22, 0.34, 0.19);
  primary.position.set(side * 0.11, -0.08, 0.01);
  primary.castShadow = true;
  wing.add(primary);
  const cuff = new Mesh(new CylinderGeometry(0.085, 0.09, 0.07, close ? 7 : 5), sleeve);
  cuff.name = 'tactical wing cuff';
  cuff.rotation.z = Math.PI / 2;
  cuff.position.set(side * 0.2, -0.22, 0.015);
  cuff.castShadow = true;
  wing.add(cuff);
  if (close) {
    for (let index = 0; index < 3; index += 1) {
      const featherTip = new Mesh(new SphereGeometry(1, 6, 4), feathers);
      featherTip.name = 'wing feather tip';
      featherTip.scale.set(0.095, 0.13, 0.13);
      featherTip.position.set(side * (0.18 + index * 0.055), -0.31, 0.045 + index * 0.045);
      featherTip.rotation.z = side * -0.3;
      wing.add(featherTip);
    }
  }
  return wing;
}

function createLeg(name: string, side: -1 | 1, orange: MeshStandardMaterial, _boot: MeshStandardMaterial, root: Group, close: boolean): Group {
  const leg = new Group();
  leg.name = name;
  leg.position.set(side * 0.17, 0.42, 0.015);
  root.add(leg);
  const shin = new Mesh(new CylinderGeometry(0.045, 0.055, 0.28, close ? 6 : 4), orange);
  shin.name = 'orange shin';
  shin.position.y = -0.14;
  shin.castShadow = true;
  leg.add(shin);
  for (const toeSide of [-1, 0, 1]) {
    const toe = new Mesh(new SphereGeometry(1, 6, 4), orange);
    toe.name = 'foot toe';
    toe.scale.set(0.035, 0.035, 0.14);
    toe.position.set(toeSide * 0.065, -0.365, 0.09);
    toe.rotation.y = toeSide * 0.48;
    toe.castShadow = true;
    leg.add(toe);
  }
  return leg;
}

/** Camera-mounted wing sleeves give the first-person view a matching chicken silhouette. */
export function createFirstPersonChickenArms(team: ChickenTeam = 'player'): ChickenArmsRig {
  const root = createAssetRoot(`First-person chicken arms — ${team}`);
  const feather = material('#f5c765', 0.91);
  const cuff = material('#586b60', 0.9);
  const trim = material(TEAM_MARKINGS[team], 0.76);
  const eye = material('#df9c48', 0.82);
  const makeWing = (name: string, side: -1 | 1, at: readonly [number, number, number]) => {
    const wing = new Group();
    wing.name = name;
    wing.position.set(...at);
    root.add(wing);
    const sleeve = new Mesh(new SphereGeometry(1, 7, 5), feather);
    sleeve.name = 'first-person feathered sleeve';
    sleeve.scale.set(0.1, 0.11, 0.3);
    sleeve.position.set(side * -0.12, 0, -0.12);
    sleeve.castShadow = true;
    wing.add(sleeve);
    const wrist = new Mesh(new CylinderGeometry(0.12, 0.14, 0.16, 6), cuff);
    wrist.name = 'first-person tactical cuff';
    wrist.rotation.z = Math.PI / 2;
    wrist.scale.setScalar(0.66);
    wrist.position.set(side * -0.22, -0.015, -0.39);
    wrist.castShadow = true;
    wing.add(wrist);
    const teamBand = new Mesh(new BoxGeometry(0.035, 0.12, 0.105), trim);
    teamBand.name = 'first-person team band';
    teamBand.position.set(side * -0.22, 0.005, -0.4);
    wing.add(teamBand);
    const tip = new Mesh(new SphereGeometry(1, 6, 4), feather);
    tip.name = 'first-person wing tip';
    tip.scale.set(0.09, 0.08, 0.11);
    tip.position.set(side * -0.27, -0.06, -0.48);
    tip.castShadow = true;
    wing.add(tip);
    const toe = new Mesh(new SphereGeometry(1, 5, 3), eye);
    toe.name = 'first-person orange grip detail';
    toe.scale.set(0.028, 0.032, 0.038);
    toe.position.set(side * -0.31, -0.08, -0.51);
    wing.add(toe);
    return wing;
  };
  const leftWing = makeWing('first-person left chicken wing', -1, [-0.4, -0.62, -0.72]);
  const rightWing = makeWing('first-person right chicken wing', 1, [0.5, -0.69, -0.66]);
  return { root, leftWing, rightWing, featherMaterial: feather, ownedMaterials: [feather, cuff, trim, eye] };
}

/** Broad belly tapering directly into the crown, without a neck or overlapping shells. */
function createPearBody(segments: number): BufferGeometry {
  const profile = [
    [0, 0.34], [0.26, 0.36], [0.43, 0.5], [0.52, 0.72],
    [0.53, 0.94], [0.47, 1.17], [0.39, 1.4], [0.28, 1.61], [0, 1.7],
  ];
  const geometry = new LatheGeometry(profile.map(([radius, height]) => new Vector2(radius!, height!)), segments);
  geometry.scale(1, 1, 0.88);
  return geometry;
}

/** Thick scalloped crest in the bird's sagittal plane, visible from both sides. */
function createComb(): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-0.2, 0);
  for (const [z, y] of [
    [-0.25, 0.09], [-0.24, 0.16], [-0.17, 0.17], [-0.19, 0.26],
    [-0.15, 0.31], [-0.07, 0.31], [-0.04, 0.25], [-0.03, 0.35],
    [0.03, 0.38], [0.11, 0.38], [0.17, 0.32], [0.19, 0.2], [0.16, 0],
  ]) shape.lineTo(z!, y!);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 });
  geometry.translate(0, 0, -0.06);
  geometry.rotateY(Math.PI / 2);
  return geometry;
}

function material(color: string, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

export const tacticalChickenAsset: AssetDefinition = Object.freeze({
  id: 'tactical-chicken',
  displayName: 'Tactical chicken',
  category: 'bird',
  bounds: { min: [-0.72, 0, -0.68] as const, max: [0.72, 2.05, 0.62] as const },
  collision: [
    { id: 'body', center: [0, 0.8, 0] as const, size: [0.88, 1.08, 0.78] as const },
    { id: 'head', center: [0, 1.49, 0.08] as const, size: [0.72, 0.76, 0.9] as const },
  ],
  lodFactories: {
    close: () => createTacticalChickenModel('friendly', 'close').root,
    far: () => createTacticalChickenModel('friendly', 'far').root,
  },
});
