const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { stripTypeScriptTypes } = require('node:module');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const threeModuleUrl = pathToFileURL(require.resolve('three')).href.replace(/three\.cjs$/, 'three.module.js');

async function loadAthleticModel() {
  const source = stripTypeScriptTypes(readFileSync(`${__dirname}/athletic-model.ts`, 'utf8'), { mode: 'transform' })
    .replace("'three'", JSON.stringify(threeModuleUrl));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('CC0 human export has pinned provenance, complete muscle regions and no helper meshes', async () => {
  const bytes = readFileSync(`${__dirname}/../public/models/cc0-human.glb`);
  const provenance = JSON.parse(readFileSync(`${__dirname}/../public/models/cc0-human.json`, 'utf8'));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(provenance.license, 'CC0-1.0');
  assert.match(provenance.revision, /^[0-9a-f]{40}$/);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), provenance.sha256);
  assert.equal(provenance.bytes, bytes.length);
  assert.ok(bytes.length < 12000000);
  const manifest = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.equal(manifest.animations, undefined);
  assert.ok(manifest.skins.length > 0);
  for (const node of manifest.nodes) assert.doesNotMatch(node.name ?? '', /helper-|joint-/);
  const muscles = new Set(manifest.materials.map((material) => material.extras?.muscleGroup));
  const { exerciseGuides } = await loadGuides();
  for (const guide of exerciseGuides) for (const muscle of guide.muscles) assert.ok(muscles.has(muscle), muscle);
  assert.ok(manifest.nodes.some((node) => node.name === 'CC0 athletic human'));
  assert.ok(manifest.materials.some((material) => material.name === 'shorts' && material.extras.fixedColor === '#24282d'));
  assert.match(readFileSync(`${__dirname}/../public/models/MAKEHUMAN-CC0.txt`, 'utf8'), /Creative Commons CC0 1.0 Universal/);
});

test('CC0 rig has normalized skin weights, connected surfaces and deforming limbs', async () => {
  const { prepareCc0Asset } = await loadAnatomyViewer();
  const THREE = await import(threeModuleUrl);
  const bytes = readFileSync(`${__dirname}/../public/models/cc0-human.glb`);
  const { parts, joints } = await prepareCc0Asset(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.equal(joints.length, 21);
  for (const side of [-1, 1]) {
    const wrist = joints.find((joint) => joint.name === `wrist${side}`);
    assert.ok(wrist.palmNormal && Math.abs(wrist.palmNormal.length() - 1) < 0.001);
  }
  assert.equal(parts.length, 17, 'Body regions and four attached eye surfaces');
  const bones = joints.map((joint) => {
    const bone = new THREE.Bone();
    bone.name = joint.name;
    bone.position.copy(joint.position);
    const parent = joints.find((candidate) => candidate.name === joint.parent);
    if (parent) bone.position.sub(parent.position);
    return bone;
  });
  joints.forEach((joint, index) => { if (joint.parent) bones[joints.findIndex((parent) => parent.name === joint.parent)].add(bones[index]); });
  bones[0].updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  const shared = new Map();
  let duplicates = 0;
  let moved = 0;
  bones[joints.findIndex((joint) => joint.name === 'arm1')].rotation.z = 0.8;
  bones[0].updateMatrixWorld(true);
  skeleton.update();
  for (const part of parts) {
    const geometry = part.geometry;
    const position = geometry.getAttribute('position');
    const weights = geometry.getAttribute('skinWeight');
    const indices = geometry.getAttribute('skinIndex');
    const mesh = new THREE.SkinnedMesh(geometry);
    mesh.bind(skeleton, new THREE.Matrix4());
    for (let vertex = 0; vertex < position.count; vertex++) {
      let total = 0;
      const influences = [];
      for (let influence = 0; influence < 4; influence++) {
        const weight = weights.getComponent(vertex, influence);
        const joint = indices.getComponent(vertex, influence);
        assert.ok(Number.isFinite(weight) && weight >= 0 && joint < joints.length);
        total += weight;
        influences.push(`${joint}:${weight.toFixed(5)}`);
      }
      assert.ok(Math.abs(total - 1) < 0.0001);
      const rest = new THREE.Vector3().fromBufferAttribute(position, vertex);
      const key = rest.toArray().map((value) => value.toFixed(6)).join(',');
      const signature = influences.sort().join(',');
      if (shared.has(key)) { assert.equal(signature, shared.get(key)); duplicates++; }
      else shared.set(key, signature);
      const deformed = mesh.applyBoneTransform(vertex, rest.clone());
      assert.ok(deformed.toArray().every(Number.isFinite));
      if (deformed.distanceTo(rest) > 0.01) moved++;
    }
    geometry.dispose();
    mesh.material.dispose();
  }
  assert.ok(duplicates > 100, 'Material boundaries share weights');
  assert.ok(moved > 100, 'CC0 vertices move with the skeleton');
  skeleton.dispose();
});

test('Workout defaults to CC0 movement while the muscle preview remains selectable', async () => {
  const { loadBindings, transform } = require('next/dist/build/swc');
  await loadBindings();
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let { code: source } = await transform(readFileSync(`${__dirname}/../components/AnatomicalExerciseDemo.tsx`, 'utf8'), {
    filename: 'AnatomicalExerciseDemo.tsx',
    jsc: { parser: { syntax: 'typescript', tsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' },
    module: { type: 'es6' },
  });
  for (const dependency of ['react', 'react/jsx-runtime', 'lucide-react']) {
    source = source.replaceAll(`'${dependency}'`, JSON.stringify(pathToFileURL(require.resolve(dependency)).href))
      .replaceAll(`"${dependency}"`, JSON.stringify(pathToFileURL(require.resolve(dependency)).href));
  }
  const { WorkoutExerciseDemo, ExerciseDemo } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const { exerciseGuides } = await loadGuides();
  const guide = exerciseGuides.find((entry) => entry.slug === 'band-chest-press');
  const workout = renderToStaticMarkup(React.createElement(WorkoutExerciseDemo, { guide, instructions: ['Secure the band.'] }));
  assert.match(workout, /value="cc0" selected=""/);
  assert.match(workout, /aria-pressed="true">Movement/);
  assert.match(workout, /aria-label="Animation position"/);
  assert.match(workout, /MakeHuman Community/);
  assert.match(workout, /Secure the band\./);
  assert.doesNotMatch(workout, /Human body \(static\)/);
  const preview = renderToStaticMarkup(React.createElement(ExerciseDemo, { guide, instructions: [], modelSource: 'cc0', initialMode: 'muscles' }));
  assert.match(preview, /aria-pressed="true">Muscles/);
  assert.doesNotMatch(preview, /aria-label="Animation position"/);
});

test('original athletic model has finite surfaces and all ten muscle regions without downloaded assets', async () => {
  const { createAthleticModel } = await loadAthleticModel();
  const { exerciseGuides } = await loadGuides();
  const { skinAthleticModel } = await loadAnatomyViewer();
  const parts = createAthleticModel();
  skinAthleticModel(parts);
  const sharedWeights = new Map();
  let sharedVertices = 0;
  const muscles = new Set(parts.map((part) => part.muscle));
  for (const guide of exerciseGuides) for (const muscle of guide.muscles) assert.ok(muscles.has(muscle), muscle);
  let vertices = 0;
  for (const part of parts) {
    const positions = part.geometry.getAttribute('position');
    const normals = part.geometry.getAttribute('normal');
    const uv = part.geometry.getAttribute('uv');
    assert.equal(positions.count, normals.count);
    assert.equal(positions.count, uv.count);
    assert.ok(Array.from(uv.array).every(Number.isFinite));
    const coverage = part.geometry.getAttribute('muscleCoverage');
    if (coverage) {
      assert.equal(positions.count, coverage.count);
      assert.ok(Array.from(coverage.array).every((value) => value >= 0 && value <= 1));
    }
    assert.ok(Array.from(positions.array).every(Number.isFinite));
    assert.ok(Array.from(normals.array).every(Number.isFinite));
    const indices = part.geometry.getAttribute('skinIndex');
    const weights = part.geometry.getAttribute('skinWeight');
    for (let vertex = 0; vertex < positions.count; vertex++) {
      const key = `${positions.getX(vertex)},${positions.getY(vertex)},${positions.getZ(vertex)}`;
      const influences = `${indices.array.slice(vertex * 4, vertex * 4 + 4)}:${weights.array.slice(vertex * 4, vertex * 4 + 4)}`;
      if (sharedWeights.has(key)) {
        assert.equal(sharedWeights.get(key), influences, 'Shared surface vertices must not tear at muscle-color boundaries');
        sharedVertices++;
      } else sharedWeights.set(key, influences);
    }
    part.geometry.computeBoundingBox();
    assert.ok(part.geometry.boundingBox.min.y >= 0);
    assert.ok(part.geometry.boundingBox.max.y < 1.75);
    vertices += positions.count;
    part.geometry.dispose();
  }
  assert.ok(vertices < 500000, 'Keep procedural geometry within the preview budget');
  assert.ok(sharedVertices > 1000);
  assert.ok(parts.some((part) => part.color === '#24282d'), 'Includes shorts');
});

test('original muscle detail textures are deterministic and non-flat', async () => {
  const { createMuscleDetail } = await loadAthleticModel();
  const chest = createMuscleDetail('chest');
  const repeat = createMuscleDetail('chest');
  const biceps = createMuscleDetail('biceps');
  assert.equal(chest.image.width, 512);
  assert.equal(chest.image.height, 512);
  assert.deepEqual(chest.image.data, repeat.image.data);
  assert.notDeepEqual(chest.image.data, biceps.image.data);
  const tones = new Set(chest.image.data.filter((value, index) => index % 4 === 0));
  assert.ok(tones.size > 20);
  assert.ok(Math.min(...tones) > 150);
  chest.dispose(); repeat.dispose(); biceps.dispose();
});

async function loadAnatomyViewer() {
  const guides = stripTypeScriptTypes(readFileSync(`${__dirname}/exercise-guides.ts`, 'utf8'), { mode: 'transform' });
  const source = stripTypeScriptTypes(readFileSync(`${__dirname}/anatomy-viewer.ts`, 'utf8'), { mode: 'transform' })
    .replace("'./exercise-guides'", JSON.stringify(`data:text/javascript;base64,${Buffer.from(guides).toString('base64')}`))
    .replace("'three'", JSON.stringify(threeModuleUrl))
    .replace("'three/addons/loaders/GLTFLoader.js'", JSON.stringify(pathToFileURL(require.resolve('three/addons/loaders/GLTFLoader.js')).href));
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('muscle skinning does not let arm bones pull the chest or distort the skull', async () => {
  const THREE = await import(threeModuleUrl);
  const { skinGeometry } = await loadAnatomyViewer();
  for (const [muscle, positions, allowed] of [
    ['chest', [0.17, 1.3, 0.05, -0.17, 1.3, 0.05], [1, 2]],
    ['core', [0.12, 1, 0.05, -0.12, 1, 0.05], [0, 1, 2]],
    ['neutral', [0.06, 1.58, 0.1, -0.06, 1.58, 0.1], [4]],
  ]) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    skinGeometry(geometry, muscle);
    const indices = geometry.getAttribute('skinIndex');
    const weights = geometry.getAttribute('skinWeight');
    for (let vertex = 0; vertex < indices.count; vertex++) {
      let total = 0;
      for (let influence = 0; influence < 4; influence++) {
        const weight = weights.array[vertex * 4 + influence];
        total += weight;
        if (weight > 0) assert.ok(allowed.includes(indices.array[vertex * 4 + influence]), `${muscle} has an unrelated bone influence`);
      }
      assert.ok(Math.abs(total - 1) < 0.00001);
    }
    geometry.dispose();
  }
});

async function loadGuides() {
  const source = stripTypeScriptTypes(readFileSync(`${__dirname}/exercise-guides.ts`, 'utf8'), { mode: 'transform' });
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('every seeded exercise has an explicit guide and its target muscles', async () => {
  const { exerciseGuides, findExerciseGuide } = await loadGuides();
  const source = stripTypeScriptTypes(readFileSync(`${__dirname}/../backend/prisma/exercise-catalog.seed.ts`, 'utf8'), { mode: 'transform' });
  const catalog = new Function('ExerciseDifficulty', `${source.slice(source.indexOf('const exercises'), source.indexOf('export async function'))}; return exercises;`)({});
  assert.equal(exerciseGuides.length, catalog.length);
  assert.equal(new Set(exerciseGuides.map((guide) => guide.slug)).size, catalog.length);
  for (const exercise of catalog) {
    const guide = findExerciseGuide(exercise.name);
    assert.equal(guide?.slug, exercise.slug);
    if (!exercise.muscleGroups.includes('conditioning')) assert.deepEqual(guide.muscles, exercise.muscleGroups);
  }
  assert.equal(findExerciseGuide('An unknown squat'), undefined);
  assert.equal(findExerciseGuide(' PUSH-UP ').slug, 'push-up');
});

test('movement loops return to the start, reach the end, and hold planks still', async () => {
  const { exerciseGuides, samplePose } = await loadGuides();
  for (const guide of exerciseGuides) {
    assert.deepEqual(samplePose(guide, 0), guide.start);
    assert.deepEqual(samplePose(guide, 1), guide.start);
    assert.deepEqual(samplePose(guide, 0.5), guide.end);
    if (!guide.hold) assert.notDeepEqual(guide.start, guide.end);
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      const current = samplePose(guide, progress);
      for (const [horizontal, vertical] of [current.hip, ...current.hands, ...current.feet]) {
        assert.ok(horizontal > 0 && horizontal < 480 && vertical > 0 && vertical < 360, guide.slug);
      }
    }
  }
});

test('limb solver preserves bone lengths for reachable endpoints', async () => {
  const { jointBetween } = await loadGuides();
  for (const bend of [-1, 1]) {
    const joint = jointBetween([100, 100], [160, 150], 48, 44, bend);
    assert.ok(Math.abs(Math.hypot(joint[0] - 100, joint[1] - 100) - 48) < 0.001);
    assert.ok(Math.abs(Math.hypot(joint[0] - 160, joint[1] - 150) - 44) < 0.001);
  }
});

test('walking lifts the swing foot while floor exercises keep their feet planted', async () => {
  const { findExerciseGuide, samplePose } = await loadGuides();
  const walk = findExerciseGuide('Brisk Walk Intervals');
  assert.ok(samplePose(walk, 0.25).feet[0][1] < 310);
  assert.equal(samplePose(walk, 0.25).feet[1][1], 310);
  assert.ok(samplePose(walk, 0.75).feet[1][1] < 310);
  for (const name of ['Glute Bridge', 'Push-up', 'Plank', 'Split Squat']) {
    const guide = findExerciseGuide(name);
    assert.deepEqual(samplePose(guide, 0.25).feet, guide.start.feet);
    assert.deepEqual(samplePose(guide, 0.75).feet, guide.start.feet);
  }
});

test('licensed anatomical asset includes every target muscle group and source credits', async () => {
  const { exerciseGuides } = await loadGuides();
  const bytes = readFileSync(`${__dirname}/../public/models/anatomy.glb`);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.ok(bytes.length < 25000000, 'Keep the model within the 25 MB asset budget');
  const manifest = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const groups = new Set(manifest.nodes.map((node) => node.extras?.muscleGroup).filter(Boolean));
  assert.equal(manifest.meshes.length, 11);
  for (const guide of exerciseGuides) for (const muscle of guide.muscles) assert.ok(groups.has(muscle), `${guide.slug}: ${muscle}`);
  const credits = readFileSync(`${__dirname}/../public/models/README.md`, 'utf8');
  assert.match(credits, /Z-Anatomy/);
  assert.match(credits, /BodyParts3D/);
  assert.match(credits, /Attribution-ShareAlike 4.0/);
});