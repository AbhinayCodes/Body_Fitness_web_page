import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { jointBetween, samplePose, type ExerciseGuide, type Muscle } from './exercise-guides';
import type { AthleticPart } from './athletic-model';

export type ModelSource = 'anatomy' | 'athletic' | 'cc0';

type Joint = { name: string; parent: string | null; position: THREE.Vector3; palmNormal?: THREE.Vector3 };
const vector = (horizontal: number, height: number, depth: number) => new THREE.Vector3(horizontal, height, depth);
const joints: Joint[] = [
  { name: 'pelvis', parent: null, position: vector(0, 0.89, -0.025) },
  { name: 'spine', parent: 'pelvis', position: vector(0, 1.1, -0.03) },
  { name: 'chest', parent: 'spine', position: vector(0, 1.34, -0.03) },
  { name: 'neck', parent: 'chest', position: vector(0, 1.46, 0) },
  { name: 'head', parent: 'neck', position: vector(0, 1.59, 0.025) },
  ...([-1, 1] as const).flatMap((side): Joint[] => [
    { name: `arm${side}`, parent: 'chest', position: vector(side * 0.175, 1.37, -0.03) },
    { name: `elbow${side}`, parent: `arm${side}`, position: vector(side * 0.23, 1.095, -0.017) },
    { name: `wrist${side}`, parent: `elbow${side}`, position: vector(side * 0.275, 0.863, 0.005) },
    { name: `hand${side}`, parent: `wrist${side}`, position: vector(side * 0.298, 0.77, 0.01) },
    { name: `leg${side}`, parent: 'pelvis', position: vector(side * 0.087, 0.872, -0.025) },
    { name: `knee${side}`, parent: `leg${side}`, position: vector(side * 0.08, 0.433, -0.025) },
    { name: `ankle${side}`, parent: `knee${side}`, position: vector(side * 0.077, 0.087, -0.025) },
    { name: `foot${side}`, parent: `ankle${side}`, position: vector(side * 0.077, 0.035, 0.09) },
  ]),
];

const muscleBones: Record<Muscle, RegExp> = {
  quads: /^(pelvis|leg|knee)/,
  glutes: /^(pelvis|leg)/,
  hamstrings: /^(pelvis|leg|knee)/,
  chest: /^(spine|chest)$/,
  triceps: /^(arm|elbow)/,
  back: /^(pelvis|spine|chest|neck)$/,
  biceps: /^(arm|elbow)/,
  shoulders: /^(chest|arm)/,
  core: /^(pelvis|spine|chest)$/,
  calves: /^(knee|ankle)/,
};

export function skinGeometry(geometry: THREE.BufferGeometry, muscle: Muscle | 'neutral') {
  const position = geometry.getAttribute('position');
  const indices = new Uint16Array(position.count * 4);
  const weights = new Float32Array(position.count * 4);
  const segments = joints.map((joint, index) => {
    const child = joints.find((candidate) => candidate.parent === joint.name);
    return { index, joint, line: new THREE.Line3(joint.position, child?.position ?? joint.position.clone().add(vector(0, 0.07, 0))) };
  });
  const vertex = new THREE.Vector3();
  const closest = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index);
    const allowed = muscle === 'neutral' ? null : muscleBones[muscle];
    const candidates = segments.filter((segment) => {
      if (allowed) return allowed.test(segment.joint.name);
      if (vertex.y > 1.5) return segment.joint.name === 'head';
      if (vertex.y > 1.45) return /^(neck|head)$/.test(segment.joint.name);
      if (vertex.y > 0.94 && Math.abs(vertex.x) < 0.145) return /^(spine|chest|neck)$/.test(segment.joint.name);
      return true;
    }).map((segment) => {
      segment.line.closestPointToPoint(vertex, true, closest);
      let distance = closest.distanceTo(vertex);
      if (Math.abs(vertex.x) > 0.04 && Math.sign(vertex.x) !== Math.sign(segment.joint.position.x) && segment.joint.position.x !== 0) distance += 1;
      return { index: segment.index, weight: 1 / Math.pow(Math.max(0.015, distance), 5) };
    }).sort((first, second) => second.weight - first.weight).slice(0, 4);
    const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    candidates.forEach((candidate, influence) => { indices[index * 4 + influence] = candidate.index; weights[index * 4 + influence] = candidate.weight / total; });
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
}

let modelData: Promise<ArrayBuffer> | undefined;
function loadModel() {
  modelData ??= fetch('/models/anatomy.glb').then((response) => {
    if (!response.ok) throw new Error('Anatomical model could not be loaded.');
    return response.arrayBuffer();
  }).catch((error: unknown) => { modelData = undefined; throw error; });
  return modelData;
}

let preparedModel: Promise<Array<{ geometry: THREE.BufferGeometry; muscle: Muscle }>> | undefined;
function prepareModel() {
  preparedModel ??= loadModel().then(async (buffer) => {
    const asset = await new GLTFLoader().parseAsync(buffer, '');
    const parts: Array<{ geometry: THREE.BufferGeometry; muscle: Muscle }> = [];
    asset.scene.updateMatrixWorld(true);
    asset.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      if (object.matrixWorld.determinant() < 0 && geometry.index) {
        const indices = geometry.index;
        for (let index = 0; index < indices.count; index += 3) {
          const first = indices.getX(index);
          indices.setX(index, indices.getX(index + 2));
          indices.setX(index + 2, first);
        }
      }
      skinGeometry(geometry, object.userData.muscleGroup as Muscle | 'neutral');
      parts.push({ geometry, muscle: object.userData.muscleGroup as Muscle });
      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => material.dispose());
    });
    return parts;
  }).catch((error: unknown) => { preparedModel = undefined; modelData = undefined; throw error; });
  return preparedModel;
}

let preparedAthlete: Promise<AthleticPart[]> | undefined;
export function skinAthleticModel(parts: AthleticPart[]) {
  parts.forEach((part) => skinGeometry(part.geometry, 'neutral'));
}

function prepareAthlete() {
  preparedAthlete ??= import('./athletic-model').then(({ createAthleticModel }) => {
    const parts = createAthleticModel();
    skinAthleticModel(parts);
    return parts;
  }).catch((error: unknown) => { preparedAthlete = undefined; throw error; });
  return preparedAthlete;
}

export async function prepareCc0Asset(buffer: ArrayBuffer) {
  const asset = await new GLTFLoader().parseAsync(buffer, '');
  const parts: AthleticPart[] = [];
  const rigJoints: Joint[] = [];
  asset.scene.updateMatrixWorld(true);
  asset.scene.traverse((object) => {
    if (!(object instanceof THREE.SkinnedMesh)) return;
    if (!rigJoints.length) {
      joints.forEach((joint) => {
        const bone = object.skeleton.bones.find((candidate) => candidate.name === joint.name);
        if (!bone) throw new Error(`CC0 rig is missing ${joint.name}`);
        rigJoints.push({ ...joint, position: bone.getWorldPosition(new THREE.Vector3()), palmNormal: bone.userData.palmNormal ? new THREE.Vector3().fromArray(bone.userData.palmNormal) : undefined });
      });
    }
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    const indices = geometry.getAttribute('skinIndex');
    const mapping = object.skeleton.bones.map((bone) => rigJoints.findIndex((joint) => joint.name === bone.name));
    for (let vertex = 0; vertex < indices.count; vertex++) {
      for (let influence = 0; influence < 4; influence++) {
        const mapped = mapping[indices.getComponent(vertex, influence)];
        if (mapped === undefined || mapped < 0) throw new Error('Unknown CC0 skin joint');
        indices.setComponent(vertex, influence, mapped);
      }
    }
    parts.push({ geometry, muscle: material.userData.muscleGroup ?? 'neutral', color: material.userData.fixedColor });
    object.geometry.dispose();
    material.dispose();
  });
  if (!parts.length || rigJoints.length !== joints.length) throw new Error('CC0 rig could not be loaded.');
  return { parts, joints: rigJoints };
}

let preparedCc0: ReturnType<typeof prepareCc0Asset> | undefined;
function prepareCc0() {
  preparedCc0 ??= fetch('/models/cc0-human.glb').then(async (response) => {
    if (!response.ok) throw new Error('CC0 model could not be loaded.');
    return prepareCc0Asset(await response.arrayBuffer());
  }).catch((error: unknown) => { preparedCc0 = undefined; throw error; });
  return preparedCc0;
}

export async function createAnatomyViewer(canvas: HTMLCanvasElement, guide: ExerciseGuide, signal: AbortSignal, source: ModelSource = 'anatomy') {
  const cc0 = source === 'cc0' ? await prepareCc0() : null;
  const rigJoints = cc0?.joints ?? joints;
  const parts: AthleticPart[] = cc0?.parts ?? await (source === 'athletic' ? prepareAthlete() : prepareModel());
  const athleticTools = source === 'athletic' ? await import('./athletic-model') : null;
  if (signal.aborted) return null;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor('#f5f6f5');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = source !== 'anatomy' ? 1 : 1.1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1.4, 1.4, 1.05, -1.05, 0.01, 30);
  scene.add(new THREE.HemisphereLight('#ffffff', '#777f87', source !== 'anatomy' ? 0.95 : 1.6));
  const keyLight = new THREE.DirectionalLight('#ffffff', source !== 'anatomy' ? 3.2 : 2.6); keyLight.position.set(-2, 4, 4); scene.add(keyLight);
  const edgeLight = new THREE.DirectionalLight('#d7e6ef', 1.5); edgeLight.position.set(3, 2, -3); scene.add(edgeLight);
  const body = new THREE.Group(); scene.add(body);
  const bones = new Map<string, THREE.Bone>();
  rigJoints.forEach((joint) => {
    const bone = new THREE.Bone(); bone.name = joint.name;
    const parent = rigJoints.find((candidate) => candidate.name === joint.parent);
    bone.position.copy(joint.position).sub(parent?.position ?? new THREE.Vector3());
    bones.set(joint.name, bone);
    if (joint.parent) bones.get(joint.parent)!.add(bone); else body.add(bone);
  });
  body.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([...bones.values()]);
  skeleton.calculateInverses();
  const details = new Map<Muscle, THREE.DataTexture>();
  const highlightMaterials: Array<{ material: THREE.MeshStandardMaterial; blended: boolean; neutralColor: string }> = [];
  parts.forEach((part) => {
    const geometry = part.geometry.clone();
    const highlighted = part.muscle !== 'neutral' && guide.muscles.includes(part.muscle);
    const neutralColor = part.color ?? (source !== 'anatomy' ? '#c8c9c7' : '#b6b9bd');
    const material = new THREE.MeshStandardMaterial({ color: highlighted ? '#cf2637' : neutralColor, roughness: part.color ? 0.86 : source !== 'anatomy' ? 0.54 : 0.78, metalness: 0 });
    const coverage = geometry.getAttribute('muscleCoverage');
    if (source === 'athletic' && highlighted && coverage && !part.color) {
      const neutral = new THREE.Color('#c8c9c7');
      const active = new THREE.Color('#cf2637');
      const color = new THREE.Color();
      const values = new Float32Array(coverage.count * 3);
      for (let index = 0; index < coverage.count; index++) {
        color.copy(neutral).lerp(active, coverage.getX(index));
        color.toArray(values, index * 3);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
      material.color.set('#ffffff');
      material.vertexColors = true;
    }
    if (athleticTools && part.muscle !== 'neutral' && !part.color) {
      let detail = details.get(part.muscle);
      if (!detail) {
        detail = athleticTools.createMuscleDetail(part.muscle);
        detail.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        details.set(part.muscle, detail);
      }
      material.map = detail;
      material.bumpMap = detail;
      material.bumpScale = 0.00035;
    }
    const mesh = new THREE.SkinnedMesh(geometry, material);
    if (highlighted) highlightMaterials.push({ material, blended: material.vertexColors, neutralColor });
    mesh.frustumCulled = false;
    if (mesh instanceof THREE.SkinnedMesh) mesh.bind(skeleton, new THREE.Matrix4());
    body.add(mesh);
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#eeefed', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; scene.add(floor);
  const equipment = new THREE.Group(); scene.add(equipment);
  const equipmentMaterial = new THREE.MeshStandardMaterial({ color: '#303d3b', metalness: 0.45, roughness: 0.42 });
  const barMaterial = new THREE.MeshStandardMaterial({ color: '#909999', metalness: 0.7, roughness: 0.25 });
  const box = (width: number, height: number, depth: number, position: THREE.Vector3) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), equipmentMaterial); mesh.position.copy(position); equipment.add(mesh); return mesh;
  };
  const benchHeight = guide.equipment === 'row' ? 0.46 : 0.44;
  if (guide.equipment === 'bench-bar' || guide.equipment === 'row') {
    box(0.42, 0.09, 0.98, vector(0, benchHeight, guide.equipment === 'row' ? 0.7 : -0.4));
    for (const depth of [-0.75, -0.06]) box(0.3, benchHeight, 0.06, vector(0, benchHeight / 2, guide.equipment === 'row' ? depth + 1.1 : depth));
  }
  if (guide.equipment === 'pulldown') { box(0.44, 0.08, 0.45, vector(0, 0.51, 0)); box(0.06, 1.95, 0.06, vector(0, 0.97, 0.55)); box(0.65, 0.06, 0.06, vector(0, 1.95, 0.55)); }
  const pressPelvis = vector(0, 0.43, -0.2);
  const pressLean = -35 * Math.PI / 180;
  const pressUp = vector(0, Math.cos(pressLean), Math.sin(pressLean));
  const pressNormal = vector(0, -Math.sin(pressLean), Math.cos(pressLean));
  const pressAxis = vector(0, Math.SQRT1_2, Math.SQRT1_2);
  if (guide.equipment === 'leg-press') {
    const backrest = box(0.38, 0.06, 0.78, pressPelvis.clone().addScaledVector(pressUp, 0.31).addScaledVector(pressNormal, -0.15));
    backrest.rotation.x = Math.PI / 2 + pressLean;
    box(0.42, 0.06, 0.32, pressPelvis.clone().add(vector(0, -0.16, 0.04)));
    for (const side of [-1, 1]) box(0.035, 0.035, 0.24, pressPelvis.clone().add(vector(side * 0.27, -0.08, 0.06)));
  }
  const weights: THREE.Group[] = [];
  const addWeight = (barbell: boolean) => {
    const weight = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, barbell ? 1.25 : 0.27, 12), barMaterial); bar.rotation.z = Math.PI / 2; weight.add(bar);
    if (guide.equipment !== 'pulldown') for (const side of [-1, 1]) { const plate = new THREE.Mesh(new THREE.CylinderGeometry(barbell ? 0.15 : 0.072, barbell ? 0.15 : 0.072, 0.06, 24), equipmentMaterial); plate.rotation.z = Math.PI / 2; plate.position.x = side * (barbell ? 0.47 : 0.105); weight.add(plate); }
    equipment.add(weight); weights.push(weight);
  };
  if (['bench-bar', 'squat-bar', 'pulldown'].includes(guide.equipment)) addWeight(true);
  else if (guide.equipment === 'goblet' || guide.equipment === 'row') addWeight(false);
  else if (guide.equipment === 'dumbbells') { addWeight(false); addWeight(false); }
  const bands = ['band-row', 'band-press', 'pulldown'].includes(guide.equipment) ? [-1, 1].map(() => {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([vector(0, 0, 0), vector(0, 0, 0)]), new THREE.LineBasicMaterial({ color: guide.equipment === 'pulldown' ? '#626a6a' : '#ba8130' })); equipment.add(line); return line;
  }) : [];
  const platform = guide.equipment === 'leg-press' ? box(0.56, 0.06, 0.38, vector(0, 0.8, 0.4)) : null;
  const world = (name: string) => bones.get(name)!.getWorldPosition(new THREE.Vector3());
  const direct = (name: string, childName: string, target: THREE.Vector3) => {
    const bone = bones.get(name)!;
    const direction = target.clone().sub(world(name)).normalize();
    const rest = rigJoints.find((joint) => joint.name === childName)!.position.clone().sub(rigJoints.find((joint) => joint.name === name)!.position).normalize();
    const desired = new THREE.Quaternion().setFromUnitVectors(rest, direction);
    const parentRotation = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parentRotation.invert().multiply(desired)); body.updateMatrixWorld(true);
  };
  let highlightsVisible = true;
  const boneLength = (name: string, child: string) => rigJoints.find((joint) => joint.name === name)!.position.distanceTo(rigJoints.find((joint) => joint.name === child)!.position);
  const update = (progress: number, mode: 'movement' | 'muscles', angle: number, highlightMuscles = true) => {
    if (highlightMuscles !== highlightsVisible) {
      highlightMaterials.forEach(({ material, blended, neutralColor }) => {
        material.color.set(highlightMuscles ? blended ? '#ffffff' : '#cf2637' : neutralColor);
        material.vertexColors = highlightMuscles && blended;
        material.needsUpdate = true;
      });
      highlightsVisible = highlightMuscles;
    }
    rigJoints.forEach((joint) => bones.get(joint.name)!.quaternion.identity());
    const pose = samplePose(guide, progress);
    const pelvis = bones.get('pelvis')!;
    equipment.visible = mode === 'movement';
    if (mode === 'muscles') pelvis.position.copy(rigJoints[0].position);
    else {
      pelvis.position.set(0, (316 - pose.hip[1]) * 0.0067, (pose.hip[0] - 228) * 0.0067);
      pelvis.rotation.x = pose.lean * Math.PI / 180;
      if (guide.equipment === 'leg-press') {
        pelvis.position.copy(pressPelvis);
        pelvis.rotation.x = pressLean;
      }
      if (guide.slug === 'dumbbell-shoulder-press') pelvis.position.y = 0.89;
      if (guide.slug === 'push-up') {
        const lowered = (1 - Math.cos(progress * Math.PI * 2)) / 2;
        const shoulderHeight = 0.54 - lowered * 0.26;
        pelvis.position.y = shoulderHeight - Math.cos(pelvis.rotation.x) * 0.48;
        pelvis.position.z = 0.36 - Math.sin(pelvis.rotation.x) * 0.48;
      }
      body.updateMatrixWorld(true);
      for (const [index, side] of ([-1, 1] as const).entries()) {
        const hip = world(`leg${side}`);
        const staggered = ['split-squat', 'brisk-walk-interval', 'dumbbell-row', 'band-chest-press'].includes(guide.slug);
        const footDepth = staggered ? pose.feet[index][0] : (pose.feet[0][0] + pose.feet[1][0]) / 2;
        const ankle = vector(side * 0.105, (310 - pose.feet[index][1]) * 0.0067 + 0.087, (footDepth - 228) * 0.0067);
        if (guide.equipment === 'leg-press') {
          const lowered = (1 - Math.cos(progress * Math.PI * 2)) / 2;
          ankle.copy(pressPelvis).addScaledVector(pressAxis, 0.72 - lowered * 0.24).setX(side * 0.105);
        }
        if (guide.slug === 'push-up') ankle.z = -0.84;
        const knee = jointBetween([hip.z, -hip.y], [ankle.z, -ankle.y], cc0 ? boneLength(`leg${side}`, `knee${side}`) : 0.439, cc0 ? boneLength(`knee${side}`, `ankle${side}`) : 0.346, pose.knees[index]);
        const straight = ['push-up', 'plank', 'dumbbell-shoulder-press'].includes(guide.slug);
        direct(`leg${side}`, `knee${side}`, straight ? hip.clone().lerp(ankle, 0.56) : vector(side * 0.08, -knee[1], knee[0]));
        direct(`knee${side}`, `ankle${side}`, ankle);
        bones.get(`ankle${side}`)!.quaternion.copy(bones.get(`ankle${side}`)!.parent!.getWorldQuaternion(new THREE.Quaternion()).invert());
        if (guide.equipment === 'leg-press') bones.get(`ankle${side}`)!.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(vector(1, 0, 0), -3 * Math.PI / 4));
        body.updateMatrixWorld(true);
        const shoulder = world(`arm${side}`);
        const frontal = guide.view === 'Front view';
        const wrist = frontal ? vector((pose.hands[index][0] - 228) * 0.0067, (316 - pose.hands[index][1]) * 0.0067, 0.1) : vector(side * (guide.equipment === 'goblet' ? 0.035 : 0.2), (316 - pose.hands[index][1]) * 0.0067, (pose.hands[index][0] - 228) * 0.0067);
        if (guide.equipment === 'leg-press') wrist.copy(pressPelvis).add(vector(side * 0.27, -0.01, 0.1));
        if (guide.slug === 'push-up') wrist.set(side * 0.2, 0.075, 0.18);
        if (guide.slug === 'plank') wrist.set(side * 0.2, 0.065, shoulder.z + 0.237);
        if (guide.slug === 'glute-bridge') wrist.set(side * 0.2, 0.065, shoulder.z + 0.49);
        const upperArm = cc0 ? boneLength(`arm${side}`, `elbow${side}`) : 0.28;
        const forearm = cc0 ? boneLength(`elbow${side}`, `wrist${side}`) : 0.237;
        const elbow = frontal ? jointBetween([shoulder.x, -shoulder.y], [wrist.x, -wrist.y], upperArm, forearm, pose.elbows[index]) : jointBetween([shoulder.z, -shoulder.y], [wrist.z, -wrist.y], upperArm, forearm, pose.elbows[index]);
        const elbowTarget = guide.slug === 'plank' ? vector(side * 0.2, 0.065, shoulder.z) : guide.slug === 'glute-bridge' ? vector(side * 0.2, 0.065, shoulder.z + 0.27) : frontal ? vector(elbow[0], -elbow[1], 0.06) : vector(side * 0.2, -elbow[1], elbow[0]);
        direct(`arm${side}`, `elbow${side}`, elbowTarget);
        direct(`elbow${side}`, `wrist${side}`, wrist);
        if (['push-up', 'plank', 'glute-bridge'].includes(guide.slug)) {
          const wristBone = bones.get(`wrist${side}`)!;
          const palmDown = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, Math.PI, 0));
          if (cc0) {
            const along = rigJoints.find((joint) => joint.name === `hand${side}`)!.position.clone().sub(rigJoints.find((joint) => joint.name === `wrist${side}`)!.position).normalize();
            const palmNormal = rigJoints.find((joint) => joint.name === `wrist${side}`)!.palmNormal!;
            const normal = palmNormal.clone().addScaledVector(along, -palmNormal.dot(along)).normalize();
            const across = along.clone().cross(normal).normalize();
            const rest = new THREE.Matrix4().makeBasis(across, along, normal);
            const target = new THREE.Matrix4().makeBasis(vector(-1, 0, 0), vector(0, 0, 1), vector(0, 1, 0));
            palmDown.setFromRotationMatrix(target.multiply(rest.invert()));
          }
          wristBone.quaternion.copy(wristBone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(palmDown));
        }
      }
      const left = world('wrist-1'); const right = world('wrist1');
      if (weights.length === 2) { weights[0].position.copy(left); weights[1].position.copy(right); }
      else if (weights.length) { weights[0].position.copy(guide.equipment === 'row' ? right : left.clone().lerp(right, 0.5)); if (guide.equipment === 'goblet') weights[0].rotation.z = Math.PI / 2; }
      bands.forEach((line, index) => {
        const anchor = guide.equipment === 'pulldown' ? vector(0, 1.95, 0.55) : vector(index === 0 ? -0.2 : 0.2, 1.36, guide.equipment === 'band-row' ? 1.15 : -1);
        line.geometry.setFromPoints([anchor, index === 0 ? left : right]);
      });
      if (platform) {
        platform.position.copy(world('ankle1')).setX(0).addScaledVector(pressAxis, 0.115).add(vector(0, 0.046, -0.046));
        platform.rotation.x = Math.PI / 4;
      }
    }
    body.updateMatrixWorld(true);
    const floorPose = ['push-up', 'plank', 'glute-bridge', 'dumbbell-floor-press', 'barbell-bench-press'].includes(guide.slug) && mode === 'movement';
    const legPress = guide.equipment === 'leg-press' && mode === 'movement';
    const target = vector(0, floorPose ? 0.46 : legPress ? 0.74 : 0.86, floorPose ? -0.15 : 0);
    const azimuth = angle * Math.PI / 180;
    camera.position.set(Math.sin(azimuth) * 4, target.y + 0.4, Math.cos(azimuth) * 4); camera.lookAt(target);
    const overhead = ['dumbbell-shoulder-press', 'lat-pulldown'].includes(guide.slug) && mode === 'movement';
    const height = mode === 'muscles' ? 1.95 : overhead ? 2.35 : floorPose ? 1.65 : legPress ? 1.5 : 2.05;
    const width = canvas.clientWidth || 600; const canvasHeight = canvas.clientHeight || 450;
    camera.top = height / 2; camera.bottom = -height / 2; camera.left = -height * width / canvasHeight / 2; camera.right = -camera.left; camera.updateProjectionMatrix();
    renderer.setSize(width, canvasHeight, false); renderer.render(scene, camera);
  };
  return {
    update,
    dispose: () => {
      skeleton.dispose();
      details.forEach((detail) => detail.dispose());
      scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); const list = Array.isArray(object.material) ? object.material : [object.material]; list.forEach((material) => material.dispose()); } });
      equipmentMaterial.dispose(); barMaterial.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}