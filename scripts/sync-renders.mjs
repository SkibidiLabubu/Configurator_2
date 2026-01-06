import { cp, mkdir, readdir, stat } from 'fs/promises';
import path from 'path';

const sourceDir = path.resolve('renders');
const targetDir = path.resolve('public/renders');
const minFileThreshold = 20;
const sampleFile = path.join(sourceDir, 'base_01/shade_01/CAM_01/on/beauty_fg.webp');

async function ensureScaffold(dir) {
  await mkdir(dir, { recursive: true });
}

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

async function sanityCheck() {
  try {
    await stat(sampleFile);
  } catch (err) {
    throw new Error(`Sample render missing: ${sampleFile}. Place renders before running dev/build.`);
  }
  const count = await directoryFileCount(sourceDir);
  if (count < minFileThreshold) {
    throw new Error(`Render package too small (${count} files). Expected at least ${minFileThreshold}.`);
  }
}

async function copyRenders() {
  await ensureScaffold(targetDir);
  await cp(sourceDir, targetDir, { recursive: true, force: true });
  console.log(`Copied renders from ${sourceDir} to ${targetDir}`);
}

async function main() {
  await ensureScaffold(sourceDir);
  await ensureScaffold(targetDir);
  await sanityCheck();
  await copyRenders();
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
