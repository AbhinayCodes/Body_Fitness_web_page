export type Muscle = 'quads' | 'glutes' | 'hamstrings' | 'chest' | 'triceps' | 'back' | 'biceps' | 'shoulders' | 'core' | 'calves';
export type Point = [number, number];
export type Pose = { hip: Point; lean: number; hands: [Point, Point]; feet: [Point, Point]; elbows: [number, number]; knees: [number, number] };
export type ExerciseGuide = {
  slug: string;
  name: string;
  muscles: Muscle[];
  phases: [string, string];
  cue: string;
  equipment: 'none' | 'dumbbells' | 'goblet' | 'squat-bar' | 'bench-bar' | 'pulldown' | 'leg-press' | 'band-row' | 'band-press' | 'row';
  view: 'Side view' | 'Front view';
  start: Pose;
  end: Pose;
  hold?: boolean;
};

const standing: Pose = { hip: [228, 192], lean: 0, hands: [[240, 188], [240, 188]], feet: [[215, 310], [247, 310]], elbows: [1, 1], knees: [-1, -1] };
const pose = (changes: Partial<Pose>): Pose => ({ ...standing, ...changes });
const squatStart = pose({ hands: [[280, 100], [280, 100]] });
const squatEnd = pose({ hip: [189, 244], lean: 22, hands: [[298, 161], [298, 161]] });
const floorStart = pose({ hip: [221, 290], lean: -90, hands: [[137, 197], [137, 197]], feet: [[290, 310], [308, 310]], knees: [-1, -1], elbows: [1, 1] });
const floorEnd = { ...floorStart, hands: [[183, 255], [183, 255]] as [Point, Point] };
const pressStart = pose({ hands: [[171, 79], [285, 79]], elbows: [-1, 1] });
const pressEnd = pose({ hands: [[203, 19], [253, 19]], elbows: [-1, 1] });

export const exerciseGuides: ExerciseGuide[] = [
  { slug: 'bodyweight-squat', name: 'Bodyweight Squat', muscles: ['quads', 'glutes'], phases: ['Stand tall', 'Lower with control'], cue: 'Keep heels grounded and knees tracking in the direction of your toes.', equipment: 'none', view: 'Side view', start: squatStart, end: squatEnd },
  { slug: 'push-up', name: 'Push-up', muscles: ['chest', 'triceps'], phases: ['Press away', 'Lower your chest'], cue: 'Keep head, hips and heels aligned. Use an elevated surface if needed.', equipment: 'none', view: 'Side view', start: pose({ hip: [199, 243], lean: 74, hands: [[293, 310], [293, 310]], feet: [[88, 310], [88, 310]], elbows: [1, 1], knees: [1, 1] }), end: pose({ hip: [205, 277], lean: 83, hands: [[293, 310], [293, 310]], feet: [[88, 310], [88, 310]], elbows: [1, 1], knees: [1, 1] }) },
  { slug: 'split-squat', name: 'Split Squat', muscles: ['quads', 'glutes'], phases: ['Rise in place', 'Lower back knee'], cue: 'Keep your stance stable. Complete the prescribed repetitions on both sides.', equipment: 'none', view: 'Side view', start: pose({ hip: [230, 208], feet: [[173, 310], [292, 310]], hands: [[265, 154], [265, 154]] }), end: pose({ hip: [225, 244], feet: [[173, 310], [292, 310]], hands: [[260, 190], [260, 190]] }) },
  { slug: 'glute-bridge', name: 'Glute Bridge', muscles: ['glutes', 'hamstrings'], phases: ['Hips lowered', 'Squeeze and lift'], cue: 'Finish with shoulders, hips and knees in line; do not arch your lower back.', equipment: 'none', view: 'Side view', start: pose({ hip: [225, 289], lean: -90, hands: [[214, 308], [214, 308]], feet: [[305, 310], [305, 310]], knees: [-1, -1] }), end: pose({ hip: [218, 268], lean: -104, hands: [[214, 308], [214, 308]], feet: [[305, 310], [305, 310]], knees: [-1, -1] }) },
  { slug: 'plank', name: 'Plank', muscles: ['core'], phases: ['Hold and breathe', 'Hold and breathe'], cue: 'Keep elbows below shoulders and a straight line through your body. Follow the hold time in your plan.', equipment: 'none', view: 'Side view', hold: true, start: pose({ hip: [197, 278], lean: 80, hands: [[326, 310], [336, 310]], feet: [[76, 310], [76, 310]], elbows: [1, 1], knees: [1, 1] }), end: pose({ hip: [197, 278], lean: 80, hands: [[326, 310], [336, 310]], feet: [[76, 310], [76, 310]], elbows: [1, 1], knees: [1, 1] }) },
  { slug: 'dumbbell-goblet-squat', name: 'Dumbbell Goblet Squat', muscles: ['quads', 'glutes'], phases: ['Stand tall', 'Sit between hips'], cue: 'Keep the dumbbell close to your chest and your whole foot on the floor.', equipment: 'goblet', view: 'Side view', start: pose({ hands: [[256, 122], [256, 122]] }), end: pose({ ...squatEnd, hands: [[251, 178], [251, 178]] }) },
  { slug: 'dumbbell-floor-press', name: 'Dumbbell Floor Press', muscles: ['chest', 'triceps'], phases: ['Press over chest', 'Upper arms to floor'], cue: 'Touch upper arms down gently. Keep wrists stacked over elbows.', equipment: 'dumbbells', view: 'Side view', start: floorStart, end: floorEnd },
  { slug: 'dumbbell-row', name: 'Dumbbell Row', muscles: ['back', 'biceps'], phases: ['Lower the weight', 'Elbow toward hip'], cue: 'Support one hand on a stable bench. Keep hips square and repeat on both sides.', equipment: 'row', view: 'Side view', start: pose({ hip: [190, 205], lean: 60, hands: [[293, 243], [264, 248]], feet: [[147, 310], [244, 310]], elbows: [1, 1] }), end: pose({ hip: [190, 205], lean: 60, hands: [[293, 243], [224, 202]], feet: [[147, 310], [244, 310]], elbows: [1, 1] }) },
  { slug: 'dumbbell-rdl', name: 'Dumbbell Romanian Deadlift', muscles: ['hamstrings', 'glutes'], phases: ['Stand tall', 'Hinge at hips'], cue: 'Keep a soft knee bend and weights close to your legs. Stop before your back rounds.', equipment: 'dumbbells', view: 'Side view', start: standing, end: pose({ hip: [186, 203], lean: 64, hands: [[259, 251], [259, 251]], feet: [[215, 310], [247, 310]] }) },
  { slug: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', muscles: ['shoulders', 'triceps'], phases: ['Weights at shoulders', 'Press overhead'], cue: 'Brace your abdomen and avoid leaning back as you press.', equipment: 'dumbbells', view: 'Front view', start: pressStart, end: pressEnd },
  { slug: 'barbell-back-squat', name: 'Barbell Back Squat', muscles: ['quads', 'glutes'], phases: ['Stand and brace', 'Lower with control'], cue: 'Rest the bar on the upper back, not the neck. Use rack safeties and learn the setup with a trainer.', equipment: 'squat-bar', view: 'Side view', start: pose({ hands: [[220, 110], [220, 110]], elbows: [-1, -1] }), end: pose({ ...squatEnd, hands: [[213, 163], [213, 163]], elbows: [-1, -1] }) },
  { slug: 'barbell-bench-press', name: 'Barbell Bench Press', muscles: ['chest', 'triceps'], phases: ['Press over chest', 'Lower toward chest'], cue: 'Keep feet planted and shoulders on the bench. Use a spotter or correctly set safeties.', equipment: 'bench-bar', view: 'Side view', start: pose({ hip: [221, 224], lean: -90, hands: [[138, 132], [138, 132]], feet: [[300, 310], [300, 310]], knees: [-1, -1] }), end: pose({ hip: [221, 224], lean: -90, hands: [[145, 207], [145, 207]], feet: [[300, 310], [300, 310]], knees: [-1, -1] }) },
  { slug: 'lat-pulldown', name: 'Lat Pulldown', muscles: ['back', 'biceps'], phases: ['Reach overhead', 'Pull to upper chest'], cue: 'Pull in front of your head without swinging or shrugging. Keep thighs secured under the pad.', equipment: 'pulldown', view: 'Front view', start: pose({ hip: [228, 211], hands: [[174, 40], [282, 40]], feet: [[175, 310], [281, 310]], elbows: [-1, 1], knees: [1, -1] }), end: pose({ hip: [228, 211], hands: [[160, 131], [296, 131]], feet: [[175, 310], [281, 310]], elbows: [-1, 1], knees: [1, -1] }) },
  { slug: 'leg-press', name: 'Leg Press', muscles: ['quads', 'glutes'], phases: ['Press; knees soft', 'Lower the platform'], cue: 'Keep your back and pelvis against the pad. Do not lock your knees or lower until your hips curl up.', equipment: 'leg-press', view: 'Side view', start: pose({ hip: [205, 270], lean: -35, hands: [[184, 267], [184, 267]], feet: [[311, 212], [311, 212]], knees: [-1, -1] }), end: pose({ hip: [205, 270], lean: -35, hands: [[184, 267], [184, 267]], feet: [[285, 255], [285, 255]], knees: [-1, -1] }) },
  { slug: 'band-row', name: 'Resistance Band Row', muscles: ['back', 'biceps'], phases: ['Reach forward', 'Pull elbows back'], cue: 'Secure the anchor at chest height. Stay tall and avoid shrugging.', equipment: 'band-row', view: 'Side view', start: pose({ hands: [[314, 110], [314, 110]] }), end: pose({ hands: [[251, 145], [251, 145]] }) },
  { slug: 'band-chest-press', name: 'Resistance Band Chest Press', muscles: ['chest', 'triceps'], phases: ['Hands near chest', 'Press forward'], cue: 'Secure the anchor behind you. Keep ribs down and wrists straight.', equipment: 'band-press', view: 'Side view', start: pose({ hands: [[251, 132], [251, 132]], feet: [[198, 310], [276, 310]] }), end: pose({ hands: [[314, 110], [314, 110]], feet: [[198, 310], [276, 310]] }) },
  { slug: 'brisk-walk-interval', name: 'Brisk Walk Intervals', muscles: ['quads', 'glutes', 'hamstrings', 'calves'], phases: ['Left stride', 'Right stride'], cue: 'Alternate easy and brisk intervals as prescribed. Keep a pace that allows controlled breathing.', equipment: 'none', view: 'Side view', start: pose({ hip: [228, 207], hands: [[276, 174], [180, 174]], feet: [[169, 310], [287, 310]], elbows: [-1, 1], knees: [-1, -1] }), end: pose({ hip: [228, 207], hands: [[180, 174], [276, 174]], feet: [[287, 310], [169, 310]], elbows: [-1, 1], knees: [-1, -1] }) },
];

export function findExerciseGuide(name: string): ExerciseGuide | undefined {
  return exerciseGuides.find((guide) => guide.name.toLowerCase() === name.trim().toLowerCase());
}

export function samplePose(guide: ExerciseGuide, progress: number): Pose {
  const position = Math.max(0, Math.min(1, progress));
  const amount = guide.hold ? 0 : (1 - Math.cos(position * Math.PI * 2)) / 2;
  const mix = (start: number, end: number) => start + (end - start) * amount;
  const point = (start: Point, end: Point): Point => [mix(start[0], end[0]), mix(start[1], end[1])];
  const feet: [Point, Point] = [point(guide.start.feet[0], guide.end.feet[0]), point(guide.start.feet[1], guide.end.feet[1])];
  if (guide.slug === 'brisk-walk-interval') {
    const stride = Math.sin(position * Math.PI * 2);
    feet[0][1] -= Math.max(0, stride) * 22;
    feet[1][1] -= Math.max(0, -stride) * 22;
  }
  return { hip: point(guide.start.hip, guide.end.hip), lean: mix(guide.start.lean, guide.end.lean), hands: [point(guide.start.hands[0], guide.end.hands[0]), point(guide.start.hands[1], guide.end.hands[1])], feet, elbows: guide.start.elbows, knees: guide.start.knees };
}

export function jointBetween(root: Point, target: Point, upper: number, lower: number, bend: number): Point {
  const delta: Point = [target[0] - root[0], target[1] - root[1]];
  const distance = Math.max(0.001, Math.hypot(...delta));
  const reach = Math.min(upper + lower - 0.001, Math.max(Math.abs(upper - lower) + 0.001, distance));
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const across = Math.sqrt(Math.max(0, upper * upper - along * along)) * bend;
  return [root[0] + (delta[0] * along - delta[1] * across) / distance, root[1] + (delta[1] * along + delta[0] * across) / distance];
}