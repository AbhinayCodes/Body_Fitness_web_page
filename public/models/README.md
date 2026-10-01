# Anatomical Model Attribution

## CC0 Human Base

The default `/model-preview` option loads `cc0-human.glb`, adapted from the
MakeHuman Community core base mesh and adult male muscular targets. The source
art assets are **CC0 1.0 Universal**, not the software's AGPL license.

- Official asset-license explanation: https://static.makehumancommunity.org/about/license.html
- Pinned source: https://github.com/makehumancommunity/makehuman/tree/a8bc2d54ff0ac92e78ff71431b1023eda42bf482
- Full asset license: `MAKEHUMAN-CC0.txt`
- Exact source file hashes, morph weights and export checksum: `cc0-human.json`
- Build source: `scripts/build-cc0-human.py`; VS Code task: `Build CC0 human`

The export is approximately 2.6 MB. It blends the core adult male shape targets
and muscular body targets, excludes helper meshes, adds one subdivision level,
and uses locally generated eyes and simple scalp/compression-short shading.
No MakeHuman application code is shipped in the website. The portable Blender
installation is only needed when rebuilding the asset, not to run the website.

The displayed muscle regions are approximate surface selections, not separate
anatomical muscles or a clinical muscle atlas. This is a neutral-pose model
study, not an exercise animation or the GymVisual reference character. It needs
further muscle detailing and a fitted rig before animated exercise use. The
workout page still uses the existing atlas. The procedural prototype remains
available in the preview's Model selector for comparison.

Rebuild with Blender 4.5 and network access on the first run:

```sh
blender --background --factory-startup --disable-autoexec --python scripts/build-cc0-human.py
```

## Original Athletic Prototype

The procedural option on `/model-preview` uses original geometry from
`lib/athletic-model.ts`, not `anatomy.glb`. Its body surfaces, muscle contours,
face, hair, hands, feet and shorts are generated in this project. No downloaded
character mesh, image, texture or animation is used in that prototype. Three.js
remains an open-source software dependency under its existing license.

The current refinement adds a broader shoulder/chest silhouette, sculpted
abdominal and side-rib relief, refined jaw and eye contours, UV coordinates,
original directional muscle-fiber color/bump textures, and blended muscle
highlight boundaries. The grayscale textures are generated deterministically
in code, not sampled from the reference images. Prototype-only lighting and
materials leave the atlas viewer unchanged.

The neutral-body pass connects the neck and torso into one surface, adds
clavicle/back relief, distinguishes thigh/knee/calf contours, tapers the
forearms, and replaces oval palms with shaped wrist-to-palm surfaces. A
prototype-only Muscle highlights checkbox switches between neutral shading
and target-muscle colors without rebuilding geometry or resetting the camera.

This is a stylized prototype, not the GymVisual character and not an exact
reconstruction of the supplied references. It does not meet the requested
reference fidelity. The preview exposes standing muscle views and camera
rotation only. Trial rigging showed garment/body intersections in deep hip
flexion, so exercise playback is not exposed for this model. Further sculpting,
topology and garment weighting are required before using it in exercise guides.
The existing workout viewer is unchanged pending visual approval.

Ellim identifies its reference exercise GIFs as commercially licensed GymVisual
content at https://www.ellim.app/licenses. Those GIFs are not bundled here.

## Existing Atlas Model

`anatomy.glb` is a reduced musculoskeletal adaptation of **Z-Anatomy - The libre
3D atlas of anatomy**, by Gauthier Kervyn, based on **BodyParts3D - The Database
Center for Life Science**, original model by Kousaku Okubo.

- Z-Anatomy source: https://github.com/Z-Anatomy/Models-of-human-anatomy
- Download: `Z-Anatomy.zip` (retrieved 2026-10-02)
- Source archive SHA-256: `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`
- Adapted model SHA-256: `998c724c39181acd6b5b1e22a6e35010f28b4f303850403ce2756f0fdbecdcc6`
- Source license: https://github.com/Z-Anatomy/Models-of-human-anatomy/blob/master/License.txt
- Adapted model license: **Creative Commons Attribution-ShareAlike 4.0 International**
- License text: https://creativecommons.org/licenses/by-sa/4.0/legalcode.en
- Original BodyParts3D attribution: BodyParts3D, Copyright 2008 The Database Center
  for Life Science, licensed under CC Attribution-ShareAlike 2.1 Japan, as credited
  by Z-Anatomy. https://creativecommons.org/licenses/by-sa/2.1/jp/
- The original database now separately offers CC BY 4.0:
  https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html

Modifications: only muscle and skeletal collections were exported, geometric
landmarks and fascia omitted, polygon counts reduced, and meshes grouped by
muscle target. Grey/red materials and an illustrative exercise rig are added by
the application. These adaptations of the model are offered under CC BY-SA 4.0.
The app's unrelated code is not derived from Z-Anatomy's application code.

No kidney, inner-ear, brain, nerve, or visceral-organ assets are included. The
source's separately credited noncommercial kidney and inner-ear models are not
part of this export. No source scripts or definitions are included or executed.

The exercise motions are illustrative adaptations, not recordings or simulations
validated by the model's authors. No endorsement or form certification is implied.

Reproduce the export with Blender 4.5:

```sh
blender --background --factory-startup --disable-autoexec --python scripts/export-anatomy.py -- --source /path/to/Z-Anatomy/Startup.blend --output public/models/anatomy.glb
```