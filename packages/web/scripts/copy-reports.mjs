import { cp, mkdir, access, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(SCRIPT_DIR, '..');
const SOURCE = resolve(WEB_ROOT, '..', '..', 'reports');
const TARGET = resolve(WEB_ROOT, 'reports');

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(SOURCE))) {
    console.error(`[copy-reports] Source not found: ${SOURCE}`);
    process.exit(1);
  }

  if (await exists(TARGET)) {
    await rm(TARGET, { recursive: true, force: true });
  }

  await mkdir(dirname(TARGET), { recursive: true });
  await cp(SOURCE, TARGET, { recursive: true });
  console.log(`[copy-reports] Copied ${SOURCE} -> ${TARGET}`);
}

main().catch(err => {
  console.error('[copy-reports] Failed:', err);
  process.exit(1);
});
