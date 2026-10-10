// Checks whether the DEPLOYED frontend bundle contains new nutrition-engine markers.
import { writeFileSync } from 'node:fs';
const FRONT = 'https://body-fitness-web-page.onrender.com/';
const NEW_MARKERS = ['Planned meals provide', 'kcal planned'];
const OLD_MARKERS = ['kcal / serving'];
const out = [];
const log = (...a) => out.push(a.join(' '));

const html = await (await fetch(FRONT, { cache: 'no-store' })).text();
const chunkPaths = [...html.matchAll(/\/_next\/static\/[^"']+?\.js/g)].map((m) => m[0]);
const unique = [...new Set(chunkPaths)];
log('HTML bytes:', html.length, 'JS chunks:', unique.length);

const found = { new: new Set(), old: new Set() };
for (const path of unique) {
  const url = new URL(path, FRONT).toString();
  let body = '';
  try { body = await (await fetch(url, { cache: 'no-store' })).text(); } catch { continue; }
  for (const m of NEW_MARKERS) if (body.includes(m)) found.new.add(m);
  for (const m of OLD_MARKERS) if (body.includes(m)) found.old.add(m);
}
log('NEW markers present:', JSON.stringify([...found.new]));
log('OLD markers present:', JSON.stringify([...found.old]));
log('VERDICT:', found.new.size > 0 && found.old.size === 0 ? 'FRONTEND=NEW' : found.old.size > 0 && found.new.size === 0 ? 'FRONTEND=OLD' : 'MIXED/UNKNOWN');
writeFileSync('validation/frontend-build-result.txt', out.join('\n'), 'utf8');
console.log(out.join('\n'));
