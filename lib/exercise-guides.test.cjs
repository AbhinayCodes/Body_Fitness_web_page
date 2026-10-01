const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { stripTypeScriptTypes } = require('node:module');

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