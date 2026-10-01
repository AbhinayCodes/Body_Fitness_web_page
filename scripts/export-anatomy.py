import argparse
import json
import re
import sys
from pathlib import Path

import bpy
from mathutils import Vector


parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--output', required=True)
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
bpy.ops.wm.open_mainfile(filepath=options.source, use_scripts=False)

muscles = bpy.data.collections['4: Muscular system']
bones = bpy.data.collections['1: Skeletal system']
selected = []
for source in set(muscles.all_objects) | set(bones.all_objects):
    if source.type != 'MESH' or len(source.data.vertices) < 100:
        continue
    suffix = source.name.rsplit('.', 1)[-1] if '.' in source.name else ''
    if suffix and suffix not in ('l', 'r'):
        continue
    if any(word in source.name.lower() for word in ('insertion', 'fascia', 'marrow', 'cavity')):
        continue
    selected.append(source)

assert len(selected) > 100, 'Musculoskeletal selection is unexpectedly empty'
scene = bpy.data.scenes.new('Formwell anatomy')
bpy.context.window.scene = scene
points = []
groups = {}
patterns = {
    'quads': r'rectus femoris|vastus',
    'glutes': r'gluteus',
    'hamstrings': r'biceps femoris|semitendinosus|semimembranosus',
    'chest': r'pectoralis major',
    'triceps': r'triceps brachii',
    'back': r'latissimus|trapezius|rhomboid|iliocostalis|longissimus|spinalis',
    'biceps': r'biceps brachii|brachialis',
    'shoulders': r'deltoid',
    'core': r'rectus abdominis|oblique muscle of abdomen|transversus abdominis',
    'calves': r'gastrocnemius|soleus',
}
for source in selected:
    model = bpy.data.objects.new(source.name, source.data.copy())
    model.matrix_world = source.matrix_world.copy()
    model.data.materials.clear()
    for polygon in model.data.polygons:
        polygon.use_smooth = True
    scene.collection.objects.link(model)
    points.extend(model.matrix_world @ Vector(corner) for corner in model.bound_box)
    group = next((name for name, pattern in patterns.items() if re.search(pattern, source.name, re.I)), 'neutral')
    groups.setdefault(group, []).append(model)

for group, models in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for model in models:
        model.select_set(True)
    bpy.context.view_layer.objects.active = models[0]
    bpy.ops.object.join()
    combined = bpy.context.object
    combined.name = 'anatomy_' + group
    combined['muscleGroup'] = group
    modifier = combined.modifiers.new('Web geometry', 'DECIMATE')
    modifier.ratio = 0.25
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    print('GROUP', group, len(combined.data.vertices), flush=True)

assert set(patterns).issubset(groups), 'A target muscle group is missing'

minimum = [min(point[axis] for point in points) for axis in range(3)]
maximum = [max(point[axis] for point in points) for axis in range(3)]
print('ANATOMY', json.dumps({'meshes': len(selected), 'min': minimum, 'max': maximum, 'examples': [source.name for source in selected if any(term in source.name.lower() for term in ('femur', 'humerus', 'tibia', 'radius', 'rectus abdominis'))]}))
destination = Path(options.output)
destination.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_active_scene=True, export_animations=False, export_extras=True, export_cameras=False, export_lights=False)
assert destination.stat().st_size > 100000, 'Export contains too little geometry'