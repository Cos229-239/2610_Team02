import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const begin = '// TF_TIER4_ATMOSPHERE_V1_BEGIN';
const end = '// TF_TIER4_ATMOSPHERE_V1_END';

export function patchRoom(source, module) {
  if (!source.includes('THREE') || !source.includes('scene') || !source.includes('renderer'))
    throw new Error('Incompatible room: expected existing Three.js scene and renderer');
  if (!module.trim().startsWith(begin) || !module.trim().endsWith(end))
    throw new Error('Atmosphere module markers invalid');
  const a = source.indexOf(begin), b = source.indexOf(end);
  if ((a < 0) !== (b < 0)) throw new Error('Partial installation: refusing changes');
  if (a >= 0) {
    if (b < a || source.indexOf(begin, a + 1) !== -1 || source.indexOf(end, b + 1) !== -1)
      throw new Error('Duplicate or malformed installation');
    return source.slice(0, a) + module.trim() + source.slice(b + end.length);
  }
  return source.trimEnd() + '\n\n' + module.trim() + '\n';
}

async function main() {
  const [mode, flag, target] = process.argv.slice(2);
  if (!['--dry-run','--apply'].includes(mode) || flag !== '--room' || !target)
    throw new Error('Usage: node tools/install-tier4-atmosphere.mjs --dry-run|--apply --room PATH_TO_room.js');
  const file = resolve(target);
  const original = await readFile(file, 'utf8');
  const module = await readFile(join(root, 'integrations/frontier/tier4-atmosphere.js'), 'utf8');
  const patched = patchRoom(original, module);
  const digest = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
  console.log(mode, file, 'BEFORE', digest(original), 'AFTER', digest(patched), patched === original ? 'UNCHANGED' : 'ATMOSPHERE MODULE ONLY');
  if (mode === '--apply' && patched !== original) await writeFile(file, patched, 'utf8');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
