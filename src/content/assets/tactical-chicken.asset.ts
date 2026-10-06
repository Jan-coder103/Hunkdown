import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  type Material,
} from 'three';
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
  const close = detail === 'close';
  const root = createAssetRoot(`Tactical chicken — ${team} — ${detail} LOD`);
  const feather = material('#f4ead0', 0.9);
  const wingFeather = material('#e9ddc0', 0.92);
  const vest = material('#586b60', 0.9);
  const vestDark = material('#394b44', 0.92);
  const helmetMaterial = material('#718575', 0.86);
  const helmetTrim = material('#c8b982', 0.82);
  const orange = material('#df9c48', 0.82);
  const combMaterial = material('#cf6654', 0.86);
  const beakMaterial = material('#e9ad54', 0.78);
  const eyeMaterial = material('#31423b', 0.46);
  const eyeGlintMaterial = material('#fff7df', 0.34);
  const teamMaterial = material(TEAM_MARKINGS[team], 0.74);
  const ownedMaterials = [
    feather, wingFeather, vest, vestDark, helmetMaterial, helmetTrim, orange,
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

  // Plump feathered body, protective vest, and a compact field pack.
  const body = new Group();
  body.name = 'chicken body and tactical vest';
  body.position.set(0, 0.78, 0);
  root.add(body);
  spheroid('feathered body', [0.44, 0.54, 0.39], [0, 0, 0], feather, body);
  block('tactical vest', [0.62, 0.42, 0.43], [0, 0.02, 0.16], vest, body);
  block('vest center seam', [0.035, 0.38, 0.018], [0, 0.02, 0.382], vestDark, body);
  block('left utility pouch', [0.18, 0.16, 0.1], [-0.2, -0.11, 0.39], vestDark, body);
  block('right utility pouch', [0.18, 0.16, 0.1], [0.2, -0.11, 0.39], vestDark, body);
  block('left pouch flap', [0.16, 0.045, 0.014], [-0.2, -0.075, 0.447], helmetTrim, body);
  block('right pouch flap', [0.16, 0.045, 0.014], [0.2, -0.075, 0.447], helmetTrim, body);
  block('shoulder strap left', [0.105, 0.39, 0.09], [-0.22, 0.06, 0.27], vestDark, body).rotation.z = -0.18;
  block('shoulder strap right', [0.105, 0.39, 0.09], [0.22, 0.06, 0.27], vestDark, body).rotation.z = 0.18;
  block('team shoulder patch', [0.14, 0.14, 0.035], [-0.324, 0.12, 0.08], teamMaterial, body);
  block('chest team marker', [0.18, 0.105, 0.035], [0, 0.19, 0.397], teamMaterial, body);
  if (close) {
    block('field pack', [0.39, 0.43, 0.22], [0, 0.02, -0.3], vestDark, body);
    block('field pack flap', [0.3, 0.13, 0.035], [0, 0.18, -0.414], vest, body);
    block('radio aerial', [0.018, 0.34, 0.018], [-0.2, 0.29, -0.32], helmetTrim, body).rotation.z = -0.1;
  }

  const head = new Group();
  head.name = 'chicken head';
  head.position.set(0, 1.38, 0.08);
  root.add(head);
  spheroid('feathered head', [0.32, 0.31, 0.3], [0, 0, 0], feather, head);
  // Forward-facing eyes and beak keep the bird readable from either LOD.
  for (const side of [-1, 1]) {
    spheroid('dark eye', [0.055, 0.064, 0.034], [side * 0.178, 0.015, 0.255], eyeMaterial, head, close ? 7 : 5);
    if (close) {
      spheroid('eye glint', [0.016, 0.019, 0.012], [side * 0.183 - 0.01, 0.035, 0.283], eyeGlintMaterial, head, 5);
    }
  }
  const beak = new Mesh(new ConeGeometry(0.12, 0.22, close ? 5 : 4), beakMaterial);
  beak.name = 'orange beak';
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.065, 0.33);
  beak.castShadow = true;
  head.add(beak);
  spheroid('wattle', [0.065, 0.095, 0.055], [0, -0.22, 0.23], combMaterial, head, close ? 6 : 4);
  for (const [index, x] of [-0.105, 0, 0.105].entries()) {
    spheroid('red comb', [0.07, 0.11 - Math.abs(index - 1) * 0.018, 0.055], [x, 0.31, -0.015], combMaterial, head, close ? 6 : 4);
  }

  const helmet = new Mesh(
    new SphereGeometry(1, close ? 9 : 6, close ? 6 : 4, 0, Math.PI * 2, 0, Math.PI / 2),
    helmetMaterial,
  );
  helmet.name = 'low-profile field helmet';
  helmet.scale.set(0.35, 0.22, 0.32);
  helmet.position.set(0, 0.27, -0.02);
  helmet.castShadow = true;
  head.add(helmet);
  block('helmet brim', [0.69, 0.045, 0.42], [0, 0.205, 0.015], helmetMaterial, head);
  block('helmet team stripe', [0.32, 0.035, 0.03], [0, 0.31, 0.279], teamMaterial, head);
  if (close) {
    // Simple raised goggles sit on the helmet so they read in close orbit views.
    const goggleFrame = new Mesh(new BoxGeometry(0.36, 0.105, 0.065), vestDark);
    goggleFrame.name = 'goggle frame';
    goggleFrame.position.set(0, 0.23, 0.25);
    head.add(goggleFrame);
    const goggleLens = new Mesh(new BoxGeometry(0.28, 0.05, 0.025), material('#8dbdb4', 0.28, 0.14));
    goggleLens.name = 'goggle lens';
    goggleLens.position.set(0, 0.232, 0.293);
    head.add(goggleLens);
    ownedMaterials.push(goggleLens.material as MeshStandardMaterial);
  }

  const leftWing = createWing('left chicken wing', -1, wingFeather, vest, close, root);
  const rightWing = createWing('right chicken wing', 1, wingFeather, vest, close, root);
  const leftLeg = createLeg('left leg', -1, orange, vestDark, root, close);
  const rightLeg = createLeg('right leg', 1, orange, vestDark, root, close);
  return { root, body, head, leftWing, rightWing, leftLeg, rightLeg, teamMark: root.getObjectByName('chest team marker') as Mesh, featherMaterial: feather, ownedMaterials };
}

function createWing(name: string, side: -1 | 1, feathers: MeshStandardMaterial, sleeve: MeshStandardMaterial, close: boolean, root: Group): Group {
  const wing = new Group();
  wing.name = name;
  wing.position.set(side * 0.31, 1.02, 0.015);
  root.add(wing);
  const primary = new Mesh(new SphereGeometry(1, close ? 8 : 5, close ? 6 : 4), feathers);
  primary.name = 'wing sleeve';
  primary.scale.set(0.22, 0.32, 0.19);
  primary.position.set(side * 0.11, -0.08, 0.01);
  primary.castShadow = true;
  wing.add(primary);
  const cuff = new Mesh(new CylinderGeometry(0.125, 0.15, 0.14, close ? 7 : 5), sleeve);
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

function createLeg(name: string, side: -1 | 1, orange: MeshStandardMaterial, boot: MeshStandardMaterial, root: Group, close: boolean): Group {
  const leg = new Group();
  leg.name = name;
  leg.position.set(side * 0.17, 0.42, 0.015);
  root.add(leg);
  const shin = new Mesh(new CylinderGeometry(0.045, 0.055, 0.28, close ? 6 : 4), orange);
  shin.name = 'orange shin';
  shin.position.y = -0.14;
  shin.castShadow = true;
  leg.add(shin);
  const foot = new Mesh(new BoxGeometry(0.18, 0.075, 0.29), orange);
  foot.name = 'webbed foot';
  foot.position.set(0, -0.29, 0.085);
  foot.castShadow = true;
  leg.add(foot);
  if (close) {
    const strap = new Mesh(new BoxGeometry(0.12, 0.045, 0.055), boot);
    strap.name = 'ankle strap';
    strap.position.set(0, -0.2, 0.015);
    leg.add(strap);
    for (const toeSide of [-1, 0, 1]) {
      const toe = new Mesh(new SphereGeometry(1, 5, 3), orange);
      toe.name = 'foot toe';
      toe.scale.set(0.055, 0.04, 0.09);
      toe.position.set(toeSide * 0.05, -0.3, 0.2);
      leg.add(toe);
    }
  }
  return leg;
}

/** Camera-mounted wing sleeves give the first-person view a matching chicken silhouette. */
export function createFirstPersonChickenArms(team: ChickenTeam = 'player'): ChickenArmsRig {
  const root = createAssetRoot(`First-person chicken arms — ${team}`);
  const feather = material('#f0e5cb', 0.91);
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

function material(color: string, roughness: number, metalness = 0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness });
}

export const tacticalChickenAsset: AssetDefinition = Object.freeze({
  id: 'tactical-chicken',
  displayName: 'Tactical chicken',
  category: 'bird',
  bounds: { min: [-0.72, 0, -0.55] as const, max: [0.72, 1.9, 0.62] as const },
  collision: [
    { id: 'body', center: [0, 0.8, 0] as const, size: [0.88, 1.08, 0.78] as const },
    { id: 'head', center: [0, 1.49, 0.08] as const, size: [0.72, 0.76, 0.9] as const },
  ],
  lodFactories: {
    close: () => createTacticalChickenModel('friendly', 'close').root,
    far: () => createTacticalChickenModel('friendly', 'far').root,
  },
});
