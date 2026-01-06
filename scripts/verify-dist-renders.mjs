import { readdir, stat } from 'fs/promises';
import path from 'path';

const distDir = path.resolve('dist/renders');
const minFileThreshold = 20;
const sampleFile = path.join(distDir, 'base_01/shade_01/CAM_01/on/beauty_fg.webp');

async function directoryFileCount(dir) {
  let count = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await directoryFileCount(full);
    } else {
      count += 1;
    }
  }
  return count;
}

async function main() {
  try {
    await stat(sampleFile);
  } catch (err) {
    throw new Error(`Missing sample render in dist: ${sampleFile}`);
  }
  const count = await directoryFileCount(distDir);
  if (count < minFileThreshold) {
    throw new Error(`dist/renders too small (${count} files). Expected at least ${minFileThreshold}.`);
  }
  console.log('dist renders verified');
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
