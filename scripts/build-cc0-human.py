import argparse
import hashlib
import json
import sys
import tempfile
import urllib.request
from collections import Counter
from pathlib import Path


REPOSITORY = 'makehumancommunity/makehuman'
REVISION = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
TARGETS = {
    'african-male-young.target': 1 / 3,
    'asian-male-young.target': 1 / 3,
    'caucasian-male-young.target': 1 / 3,
    'universal-male-young-maxmuscle-averageweight.target': 0.8,
    'universal-male-young-maxmuscle-minweight.target': 0.2,
}


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Formwell-asset-builder'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def source_assets(cache):
    cache.mkdir(parents=True, exist_ok=True)
    revision_file = cache / 'revision.txt'
    if not revision_file.exists():
        revision_file.write_text(REVISION)
    revision = revision_file.read_text().strip()
    assert revision == REVISION, 'Use an empty cache for this pinned source revision'
    base_url = f'https://raw.githubusercontent.com/{REPOSITORY}/{revision}'
    paths = ['LICENSE.ASSETS.md', 'makehuman/data/3dobjs/base.obj']
    paths.extend(f'makehuman/data/targets/macrodetails/{name}' for name in TARGETS)
    records = []
    for source in paths:
        destination = cache / Path(source).name
        if not destination.exists():
            destination.write_bytes(fetch(f'{base_url}/{source}'))
        records.append({'path': source, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest()})
    assert 'Creative Commons CC0 1.0 Universal' in (cache / 'LICENSE.ASSETS.md').read_text()
    return revision, records


def morphed_mesh(cache):
    lines = (cache / 'base.obj').read_text().splitlines()
    vertices = [list(map(float, line.split()[1:4])) for line in lines if line.startswith('v ')]
    for name, weight in TARGETS.items():
        for line in (cache / name).read_text().splitlines():
            if not line.strip() or line.startswith('#'):
                continue
            index, *delta = line.split()
            index = int(index)
            assert 0 <= index < len(vertices) and len(delta) == 3
            for axis in range(3):
                vertices[index][axis] += float(delta[axis]) * weight
    groups = Counter()
    group = 'default'
    for line in lines:
        if line.startswith('g '):
            group = line[2:]
        if line.startswith('f '):
            groups[group] += 1
    return lines, vertices, groups


def export_model(options, revision, records, lines, vertices):
    import bpy
    from mathutils import Vector

    destination = options.output
    destination.parent.mkdir(parents=True, exist_ok=True)
    vertex_index = 0
    output_lines = []
    for line in lines:
        if line.startswith('v '):
            line = 'v ' + ' '.join(f'{value:.8f}' for value in vertices[vertex_index])
            vertex_index += 1
        output_lines.append(line)
    morphed = options.cache / 'adult-muscular.obj'
    morphed.write_text('\n'.join(output_lines))
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.wm.obj_import(filepath=str(morphed), forward_axis='NEGATIVE_Z', up_axis='Y', use_split_objects=False, use_split_groups=True)
    objects = list(bpy.context.scene.objects)
    body = next(model for model in objects if model.name == 'body')
    for model in objects:
        bpy.context.view_layer.objects.active = model
        model.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        model.select_set(False)
    floor = min(vertex.co.z for vertex in body.data.vertices)
    scale = 1.72 / (max(vertex.co.z for vertex in body.data.vertices) - floor)
    pelvis = next(model for model in objects if model.name == 'joint-pelvis')
    depth_origin = sum(vertex.co.y for vertex in pelvis.data.vertices) / len(pelvis.data.vertices)
    for model in objects:
        for vertex in model.data.vertices:
            vertex.co = Vector((vertex.co.x * scale, (vertex.co.y - depth_origin) * scale, (vertex.co.z - floor) * scale))
    anchors = {model.name: sum((vertex.co for vertex in model.data.vertices), Vector()) / len(model.data.vertices) for model in objects if model.name.startswith('joint-')}
    for model in objects:
        if model != body:
            bpy.data.objects.remove(model, do_unlink=True)
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    subdivision = body.modifiers.new('Surface refinement', 'SUBSURF')
    subdivision.levels = 1
    bpy.ops.object.modifier_apply(modifier=subdivision.name)
    body.name = 'CC0 athletic human'
    body.data.materials.clear()
    hip = anchors['joint-pelvis'].z
    knee = anchors['joint-l-knee'].z
    shoulder = anchors['joint-l-shoulder'].z
    elbow = anchors['joint-l-elbow'].z
    neck = anchors['joint-neck'].z
    shoulder_width = abs(anchors['joint-l-shoulder'].x)
    regions = ['neutral', 'chest', 'core', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'calves', 'glutes', 'shorts', 'hair', 'eyes', 'iris']
    colors = {'shorts': '#24282d', 'glutes': '#24282d', 'hair': '#343638', 'eyes': '#cdd0cc', 'iris': '#39474a'}
    materials = {}
    for name in regions:
        material = bpy.data.materials.new(name)
        color = colors.get(name, '#c8c9c7')
        material.diffuse_color = tuple(int(color[index:index + 2], 16) / 255 for index in (1, 3, 5)) + (1,)
        material['muscleGroup'] = name if name not in ('shorts', 'hair', 'eyes', 'iris') else 'neutral'
        if name in colors:
            material['fixedColor'] = color
        body.data.materials.append(material)
        materials[name] = material

    def region_at(position):
        horizontal, height, front = abs(position.x), position.z, -position.y
        if height > 1.645 - (0.028 if front < 0 else 0):
            return 'hair'
        if height > neck - 0.03:
            return 'neutral'
        if hip - 0.16 < height < hip + 0.075 and horizontal < shoulder_width + 0.05:
            return 'glutes' if front < -0.015 else 'shorts'
        if height > hip + 0.045:
            arm_edge = shoulder_width * 0.96 + max(0, shoulder - height) * 0.45
            if horizontal > arm_edge:
                if height > shoulder - 0.115:
                    return 'shoulders'
                if height > elbow + 0.02:
                    return 'biceps' if front > -0.015 else 'triceps'
                return 'neutral'
            if front < -0.035:
                return 'back'
            if height > shoulder - 0.16 and front > 0.025 and horizontal > 0.008:
                return 'chest'
            return 'core' if height < shoulder - 0.15 else 'neutral'
        if height > knee + 0.05:
            return 'quads' if front > -0.025 else 'hamstrings'
        if 0.15 < height < knee - 0.04 and front < -0.015:
            return 'calves'
        return 'neutral'

    counts = Counter()
    for face in body.data.polygons:
        center = sum((body.data.vertices[index].co for index in face.vertices), Vector()) / len(face.vertices)
        name = region_at(center)
        face.material_index = regions.index(name)
        face.use_smooth = True
        counts[name] += 1
    required = set(regions[1:11])
    assert required.issubset(counts), f'Missing muscle regions: {required - counts.keys()}'
    for side in ('l', 'r'):
        center = anchors[f'joint-{side}-eye']
        for name, offset, radii in [('eyes', 0, (0.0115, 0.0115, 0.0115)), ('iris', -0.011, (0.004, 0.001, 0.004))]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=center + Vector((0, offset, 0)))
            eye = bpy.context.object
            eye.name = f'{name}-{side}'
            eye.scale = radii
            eye.data.materials.append(materials[name])
            for face in eye.data.polygons:
                face.use_smooth = True
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', export_extras=True, export_animations=False, export_cameras=False, export_lights=False, export_copyright='MakeHuman Community core assets: CC0-1.0')
    manifest = {
        'source': f'https://github.com/{REPOSITORY}', 'revision': revision,
        'license': 'CC0-1.0', 'licenseUrl': f'https://github.com/{REPOSITORY}/blob/{revision}/LICENSE.ASSETS.md',
        'targets': TARGETS, 'sourceFiles': records, 'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
        'bytes': destination.stat().st_size, 'heightMeters': 1.72, 'regions': counts,
        'modifications': ['Adult muscular morph blend', 'Helpers removed', 'One subdivision level', 'Approximate surface muscle regions', 'Compression-short and scalp materials', 'Generated eye surfaces'],
        'limitations': ['Not anatomical muscle meshes', 'Not a validated exercise rig'],
    }
    destination.with_suffix('.json').write_text(json.dumps(manifest, indent=2) + '\n')
    destination.with_name('MAKEHUMAN-CC0.txt').write_bytes((options.cache / 'LICENSE.ASSETS.md').read_bytes())
    assert destination.stat().st_size < 12000000, 'Model exceeds the preview asset budget'
    print(json.dumps({'output': str(destination), 'bytes': destination.stat().st_size, 'regions': counts, 'anchors': {name: list(anchors[name]) for name in ('joint-pelvis', 'joint-l-shoulder', 'joint-l-eye')}}), flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', type=Path, default=Path(tempfile.gettempdir()) / 'formwell-makehuman-cc0')
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'public/models/cc0-human.glb')
    arguments = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else (sys.argv[1:] if sys.argv[0].endswith('.py') else [])
    options = parser.parse_args(arguments)
    revision, records = source_assets(options.cache)
    lines, vertices, groups = morphed_mesh(options.cache)
    if options.inspect:
        print(json.dumps({'revision': revision, 'vertices': len(vertices), 'groups': groups}), flush=True)
    else:
        export_model(options, revision, records, lines, vertices)


if __name__ == '__main__':
    main()