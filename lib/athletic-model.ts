import * as THREE from 'three';
import type { Muscle } from './exercise-guides';

export type AthleticPart = { geometry: THREE.BufferGeometry; muscle: Muscle | 'neutral'; color?: string };
type Point = [number, number, number];
type Surface = (around: number, along: number) => THREE.Vector3;
type Region = Muscle | 'neutral' | 'shorts' | 'hair' | 'eyes' | 'pupil';
const colors: Partial<Record<Region, string>> = { shorts: '#24282d', hair: '#343638', eyes: '#bfc0ba', pupil: '#353b3b' };
const point = (coordinates: Point) => new THREE.Vector3(...coordinates);
const bump = (value: number, center: number, spread: number) => Math.exp(-Math.pow((value - center) / spread, 2));

export function createMuscleDetail(muscle: Muscle): THREE.DataTexture {
  const size = 512;
  const data = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const around = column / size;
    const along = row / size;
    const fan = muscle === 'chest' || muscle === 'back';
    const phase = fan ? along * 42 + Math.cos(around * Math.PI * 2) * 4 + Math.sin(around * Math.PI * 4) * 2 : around * 58 + Math.sin(along * Math.PI) * 2.4;
    const groove = Math.exp(-Math.pow(Math.sin(phase * Math.PI * 2) / 0.19, 2));
    const variation = 0.65 + 0.35 * Math.sin(around * 37 + along * 23) ** 2;
    const tone = Math.round(249 - groove * variation * 52 - 4 * Math.sin(phase * Math.PI * 2));
    const offset = (row * size + column) * 4;
    data[offset] = tone; data[offset + 1] = tone; data[offset + 2] = tone; data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function createAthleticModel(): AthleticPart[] {
  const parts: AthleticPart[] = [];
  const surface = (evaluate: Surface, region: (around: number, along: number) => Region, rows = 64, columns = 64) => {
    const positions: number[] = [];
    const indices: number[] = [];
    const regions: Region[] = [];
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      positions.push(...evaluate(column / columns * Math.PI * 2, row / rows).toArray());
      regions.push(region(column / columns * Math.PI * 2, row / rows));
    }
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const first = row * (columns + 1) + column;
      indices.push(first, first + 1, first + columns + 1, first + 1, first + columns + 2, first + columns + 1);
    }
    const complete = new THREE.BufferGeometry();
    complete.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    complete.setIndex(indices);
    complete.computeVertexNormals();
    const normals = complete.getAttribute('normal');
    for (let row = 0; row <= rows; row++) {
      const first = row * (columns + 1);
      const last = first + columns;
      const normal = new THREE.Vector3().fromBufferAttribute(normals, first).add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
      normals.setXYZ(first, normal.x, normal.y, normal.z);
      normals.setXYZ(last, normal.x, normal.y, normal.z);
    }
    const groups = new Map<Region, { positions: number[]; normals: number[]; uv: number[]; coverage: number[] }>();
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      const name = region((column + 0.5) / columns * Math.PI * 2, (row + 0.5) / rows);
      const group = groups.get(name) ?? { positions: [], normals: [], uv: [], coverage: [] };
      groups.set(name, group);
      const offset = (row * columns + column) * 6;
      for (const index of indices.slice(offset, offset + 6)) {
        group.positions.push(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]);
        group.normals.push(normals.getX(index), normals.getY(index), normals.getZ(index));
        group.uv.push((index % (columns + 1)) / columns, Math.floor(index / (columns + 1)) / rows);
        const neighbors = [index, index - 1, index + 1, index - columns - 1, index + columns + 1];
        group.coverage.push(neighbors.every((neighbor) => regions[neighbor] === undefined || regions[neighbor] === name) ? 1 : 0);
      }
    }
    for (const [name, group] of groups) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(group.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(group.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(group.uv, 2));
      geometry.setAttribute('muscleCoverage', new THREE.Float32BufferAttribute(group.coverage, 1));
      parts.push({ geometry, muscle: colors[name] ? 'neutral' : name as Muscle | 'neutral', color: colors[name] });
    }
    complete.dispose();
  };
  const profile = (sections: Point[]) => new THREE.CatmullRomCurve3(sections.map(point), false, 'centripetal');
  const ellipsoid = (center: Point, radius: Point, region: Region, rotation = 0) => {
    const geometry = new THREE.SphereGeometry(1, 32, 24);
    geometry.scale(...radius).rotateZ(rotation).translate(...center);
    parts.push({ geometry, muscle: colors[region] ? 'neutral' : region as Muscle | 'neutral', color: colors[region] });
  };
  const cord = (coordinates: Point[], radius: number, region: Region) => {
    const geometry = new THREE.TubeGeometry(profile(coordinates), 24, radius, 8, false);
    parts.push({ geometry, muscle: colors[region] ? 'neutral' : region as Muscle | 'neutral', color: colors[region] });
  };
  const torso = profile([
    [0.12, 0.86, 0.085], [0.13, 0.96, 0.076], [0.117, 1.055, 0.077],
    [0.148, 1.16, 0.091], [0.186, 1.27, 0.102], [0.195, 1.34, 0.083],
    [0.151, 1.385, 0.067], [0.096, 1.414, 0.052], [0.057, 1.439, 0.045],
    [0.044, 1.475, 0.041], [0.046, 1.513, 0.039],
  ]);
  surface((around, along) => {
    const section = torso.getPoint(along);
    const horizontal = Math.sin(around) * section.x;
    const height = section.y;
    const front = Math.max(0, Math.cos(around));
    const back = Math.max(0, -Math.cos(around));
    const chest = 0.039 * Math.exp(-Math.pow((Math.abs(horizontal) - 0.089) / 0.073, 2) - Math.pow((height - 1.296 + Math.abs(horizontal) * 0.06) / 0.047, 4));
    const abs = [1.18, 1.12, 1.06, 1.005].reduce((sum, center) => sum + 0.019 * Math.exp(-Math.pow((Math.abs(horizontal) - 0.039) / 0.033, 2) - Math.pow((height - center) / 0.025, 4)), 0);
    const sternum = 0.007 * bump(horizontal, 0, 0.007) * bump(height, 1.18, 0.18);
    const obliques = 0.014 * bump(Math.abs(horizontal), 0.105, 0.023) * bump(height, 1.09, 0.095);
    const serratus = [1.185, 1.218, 1.25].reduce((sum, center) => sum + 0.007 * bump(height - Math.abs(horizontal) * 0.45, center - 0.064, 0.009) * bump(Math.abs(horizontal), 0.125, 0.033), 0);
    const lats = 0.025 * bump(Math.abs(horizontal), 0.095, 0.067) * bump(height, 1.265, 0.105);
    const spine = 0.006 * bump(horizontal, 0, 0.012) * bump(height, 1.23, 0.17);
    const clavicle = 0.006 * bump(height, 1.371 - Math.abs(horizontal) * 0.085, 0.008) * bump(Math.abs(horizontal), 0.095, 0.075);
    const shoulderBlade = 0.01 * bump(Math.abs(horizontal), 0.087, 0.037) * bump(height, 1.317, 0.055);
    const lowerBack = 0.006 * bump(Math.abs(horizontal), 0.029, 0.014) * bump(height, 1.123, 0.125);
    const neckBlend = THREE.MathUtils.smoothstep(height, 1.399, 1.49);
    const tendonPosition = 0.28 + (height - 1.4) * 4;
    const neckTendon = 0.004 * bump(Math.abs(Math.sin(around)), tendonPosition, 0.16) * bump(height, 1.455, 0.053);
    const throat = 0.003 * bump(Math.sin(around), 0, 0.2) * bump(height, 1.468, 0.012);
    return new THREE.Vector3(horizontal, height, -0.023 * (1 - neckBlend) + Math.cos(around) * (section.z + neckTendon + throat) + front ** 3 * (chest + abs + obliques + serratus + clavicle - sternum) - back ** 3 * (lats + shoulderBlade + lowerBack - spine));
  }, (around, along) => {
    const section = torso.getPoint(along);
    const height = section.y;
    const horizontal = Math.abs(Math.sin(around) * section.x);
    if (height > 1.38) return 'neutral';
    if (Math.cos(around) < -0.1) return height > 1.04 ? 'back' : 'core';
    if (height > 1.23) return Math.cos(around) > 0.4 && horizontal > 0.006 && Math.pow((horizontal - 0.089) / 0.088, 2) + Math.pow((height - 1.296 + horizontal * 0.06) / 0.057, 2) < 1 ? 'chest' : 'neutral';
    return 'core';
  }, 112, 112);

  const head = profile([
    [0.024, 1.482, 0.038], [0.042, 1.496, 0.058], [0.062, 1.522, 0.066],
    [0.06, 1.556, 0.066], [0.069, 1.589, 0.074], [0.067, 1.624, 0.076],
    [0.065, 1.659, 0.071], [0.052, 1.69, 0.056], [0.028, 1.711, 0.03], [0.0002, 1.719, 0.0002],
  ]);
  surface((around, along) => {
    const section = head.getPoint(along);
    const horizontal = Math.sin(around) * section.x;
    const height = section.y;
    const front = Math.max(0, Math.cos(around)) ** 8;
    const nose = 0.019 * bump(horizontal, 0, 0.009) * bump(height, 1.589, 0.033) + 0.018 * bump(horizontal, 0, 0.014) * bump(height, 1.568, 0.01);
    const brow = 0.005 * bump(Math.abs(horizontal), 0.029, 0.019) * bump(height, 1.622, 0.008);
    const sockets = 0.006 * bump(Math.abs(horizontal), 0.029, 0.015) * bump(height, 1.609, 0.008);
    const cheeks = 0.008 * bump(Math.abs(horizontal), 0.043, 0.014) * bump(height, 1.582, 0.015) - 0.004 * bump(Math.abs(horizontal), 0.04, 0.018) * bump(height, 1.552, 0.018);
    const lips = 0.004 * bump(horizontal, 0, 0.022) * (bump(height, 1.542, 0.004) + bump(height, 1.533, 0.004));
    return new THREE.Vector3(horizontal, height, 0.014 + Math.cos(around) * section.z + front * (nose + brow + cheeks + lips - sockets));
  }, (around, along) => head.getPoint(along).y > 1.659 - 0.026 * Math.max(0, -Math.cos(around)) - 0.008 * Math.pow(Math.sin(around), 2) ? 'hair' : 'neutral', 96, 96);
  cord([[-0.021, 1.538, 0.08], [0, 1.537, 0.084], [0.021, 1.538, 0.08]], 0.00075, 'hair');
  for (const side of [-1, 1]) {
    ellipsoid([side * 0.069, 1.585, 0.009], [0.012, 0.021, 0.011], 'neutral', side * -0.12);
    ellipsoid([side * 0.074, 1.584, 0.016], [0.004, 0.011, 0.003], 'neutral');
    ellipsoid([side * 0.028, 1.609, 0.081], [0.013, 0.0048, 0.004], 'eyes');
    ellipsoid([side * 0.028, 1.609, 0.085], [0.0034, 0.0034, 0.001], 'pupil');
    ellipsoid([side * 0.008, 1.562, 0.102], [0.003, 0.0012, 0.0015], 'hair');
    cord([[side * 0.016, 1.611, 0.082], [side * 0.028, 1.614, 0.083], [side * 0.04, 1.61, 0.077]], 0.0012, 'neutral');
    cord([[side * 0.016, 1.623, 0.083], [side * 0.03, 1.625, 0.083], [side * 0.043, 1.62, 0.074]], 0.0014, 'hair');

    const arm = profile([[0.188 * side, 1.412, -0.03], [0.214 * side, 1.30, -0.026], [0.239 * side, 1.095, -0.017], [0.263 * side, 0.96, -0.004], [0.275 * side, 0.842, 0.005]]);
    surface((around, along) => {
      const center = arm.getPoint(1 - along);
      const radius = center.y > 1.347 ? 0.07 * Math.sqrt(Math.max(0.00001, 1 - Math.pow((center.y - 1.347) / 0.065, 2))) : 0.023 + 0.043 * bump(center.y, 1.347, 0.064) + 0.027 * bump(center.y, 1.23, 0.081) + 0.015 * bump(center.y, 1.04, 0.085);
      const flexor = 0.017 * bump(center.y, 1.22, 0.061) * Math.max(0, Math.cos(around)) ** 3;
      const extensor = 0.008 * bump(center.y, 1.235, 0.072) * Math.max(0, -Math.cos(around)) ** 3;
      const brachialis = 0.004 * bump(center.y, 1.177, 0.041) * Math.pow(Math.sin(around), 2);
      const deltoidBorder = 0.003 * bump(center.y, 1.277 + 0.026 * Math.cos(around), 0.011);
      const forearm = 0.004 * bump(center.y, 1.007, 0.062) * Math.pow(Math.sin(around + side * 0.6), 2);
      const width = radius + brachialis + forearm - deltoidBorder;
      return new THREE.Vector3(center.x + Math.sin(around) * width, center.y, center.z + Math.cos(around) * (radius - deltoidBorder) + flexor - extensor);
    }, (around, along) => {
      const height = arm.getPoint(1 - along).y;
      return height > 1.3 ? 'shoulders' : height > 1.105 ? Math.cos(around) > 0 ? 'biceps' : 'triceps' : 'neutral';
    }, 80, 64);
    const palm = profile([[0.026, 0.777, 0.012], [0.033, 0.797, 0.016], [0.028, 0.825, 0.018], [0.022, 0.865, 0.02]]);
    surface((around, along) => {
      const section = palm.getPoint(along);
      const center = side * (0.275 + (0.865 - section.y) * 0.16);
      const pad = 0.003 * bump(section.y, 0.811, 0.023) * Math.max(0, Math.cos(around));
      return new THREE.Vector3(center + Math.sin(around) * section.x, section.y, 0.005 + Math.cos(around) * (section.z + pad));
    }, () => 'neutral', 40, 48);
    for (let finger = 0; finger < 4; finger++) {
      const horizontal = side * (0.267 + finger * 0.015);
      const length = [0.059, 0.066, 0.061, 0.048][finger];
      cord([[horizontal, 0.79, 0.012], [horizontal + side * 0.006, 0.768, 0.016], [horizontal + side * 0.005, 0.79 - length, 0.033]], 0.006, 'neutral');
      ellipsoid([horizontal + side * 0.005, 0.79 - length, 0.033], [0.006, 0.007, 0.006], 'neutral');
    }
    cord([[side * 0.26, 0.833, 0.012], [side * 0.249, 0.802, 0.025], [side * 0.248, 0.784, 0.038]], 0.009, 'neutral');

    const leg = profile([[side * 0.077, 0.044, -0.025], [side * 0.078, 0.255, -0.03], [side * 0.08, 0.433, -0.025], [side * 0.092, 0.65, -0.022], [side * 0.087, 0.875, -0.025]]);
    const legShape = profile([[0.026, 0, 0.029], [0.058, 0.24, 0.053], [0.044, 0.44, 0.039], [0.073, 0.7, 0.073], [0.084, 1, 0.077]]);
    surface((around, along) => {
      const center = leg.getPoint(along);
      const radius = legShape.getPoint(along);
      const front = Math.max(0, Math.cos(around));
      const across = Math.sin(around) * side;
      const rectus = 0.021 * bump(center.y, 0.648, 0.117) * bump(across, 0, 0.29);
      const outerQuad = 0.014 * bump(center.y, 0.64, 0.128) * bump(across, 0.64, 0.3);
      const innerQuad = 0.02 * bump(center.y, 0.505, 0.048) * bump(across, -0.48, 0.3);
      const quadGrooves = 0.003 * bump(center.y, 0.63, 0.105) * (bump(across, 0.31, 0.09) + bump(across, -0.32, 0.09));
      const patella = 0.009 * bump(center.y, 0.434, 0.026) * bump(across, 0, 0.42);
      const tibia = 0.003 * bump(center.y, 0.254, 0.14) * bump(across, -0.1, 0.12);
      const calf = (0.013 * bump(center.y, 0.3, 0.064) * bump(across, -0.38, 0.34) + 0.011 * bump(center.y, 0.281, 0.061) * bump(across, 0.42, 0.34)) * Math.max(0, -Math.cos(around));
      return new THREE.Vector3(center.x + Math.sin(around) * radius.x, center.y, center.z + Math.cos(around) * radius.z + (rectus + outerQuad + innerQuad - quadGrooves + patella + tibia) * front ** 2 - calf);
    }, (around, along) => {
      const height = leg.getPoint(along).y;
      if (height < 0.15 || Math.abs(height - 0.433) < 0.034) return 'neutral';
      if (height < 0.433) return Math.cos(around) < 0.4 ? 'calves' : 'neutral';
      return Math.cos(around) > -0.15 ? 'quads' : 'hamstrings';
    }, 96, 80);
    ellipsoid([side * 0.088, 0.863, -0.079], [0.08, 0.098, 0.07], 'glutes');
    ellipsoid([side * 0.077, 0.037, 0.044], [0.045, 0.033, 0.087], 'neutral');
    for (let toe = 0; toe < 5; toe++) ellipsoid([side * (0.05 + toe * 0.014), 0.024, 0.13 - toe * 0.008], [0.009 - toe * 0.0008, 0.014 - toe * 0.0008, 0.023 - toe * 0.002], 'neutral');
    const shortsLeg = profile([[0.074, 0.765, 0.076], [0.087, 0.825, 0.083], [0.088, 0.875, 0.085]]);
    surface((around, along) => {
      const section = shortsLeg.getPoint(along);
      return new THREE.Vector3(side * 0.088 + Math.sin(around) * section.x, section.y, -0.026 + Math.cos(around) * section.z);
    }, () => 'shorts', 24, 48);
  }
  const waistband = profile([[0.167, 0.825, 0.117], [0.177, 0.873, 0.116], [0.151, 0.914, 0.094], [0.134, 0.954, 0.081]]);
  surface((around, along) => {
    const section = waistband.getPoint(along);
    return new THREE.Vector3(Math.sin(around) * section.x, section.y, -0.028 + Math.cos(around) * section.z);
  }, () => 'shorts', 32, 64);
  return parts;
}