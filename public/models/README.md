# Anatomical Model Attribution

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