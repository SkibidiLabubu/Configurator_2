import constants from './config';
import {
  AssetProbeResult,
  AssetUrls,
  AvailabilityEntry,
  AvailabilityMap,
  BuildAvailabilityOptions,
  CameraId,
  Configuration,
  ProbeAttempt,
  StateId
} from '../types/configurator';
import { getDefaultColor } from './colors';

function withFrameSuffix(file: string, suffix?: string) {
  if (!suffix) return [file];
  const dot = file.lastIndexOf('.');
  if (dot === -1) return [file + suffix];
  const base = file.slice(0, dot);
  const ext = file.slice(dot);
  return [file, `${base}${ext}${suffix}${ext}`];
}

function candidateFiles(base: string, file: string, suffix?: string, disablePngFallback = false) {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const names = withFrameSuffix(file, suffix);
  const extensions = disablePngFallback ? ['webp'] : ['webp', 'png'];
  const results: string[] = [];
  for (const name of names) {
    for (const ext of extensions) {
      if (name.endsWith('.webp') || name.endsWith('.png')) {
        const without = name.replace(/\.(webp|png)$/i, '');
        results.push(`${normalizedBase}${without}.${ext}`);
      } else {
        results.push(`${normalizedBase}${name}.${ext}`);
      }
    }
  }
  return Array.from(new Set(results));
}

function assetPath(base: string, file: string) {
  return `${base}/${file}`;
}

export function resolveAssetUrls(config: Configuration): AssetUrls {
  const basePath = `${constants.cdnRoot}/${config.base}/${config.shade}/${config.camera}/${config.state}`;
  return {
    basePath,
    beautyUrl: assetPath(basePath, 'beauty.webp'),
    beautyFgUrl: assetPath(basePath, 'beauty_fg.webp'),
    thumbUrl: assetPath(basePath, 'beauty_512.webp'),
    maskBaseUrl: assetPath(basePath, 'mask_base.webp'),
    maskShadeUrl: assetPath(basePath, 'mask_shade.webp'),
    maskAdapterUrl: assetPath(basePath, 'mask_adapter.webp'),
    maskGuardUrl: assetPath(basePath, 'mask_guard.webp'),
    aoUrl: assetPath(basePath, 'ao.webp'),
    emissionUrl: assetPath(basePath, 'emission.webp'),
    backgroundUrl: `${constants.cdnRoot}/background/${config.camera}/bg.webp`
  };
}

const probeCache = new Map<string, AssetProbeResult>();

async function probeSingle(url: string): Promise<ProbeAttempt> {
  const attempts: ProbeAttempt = { url, status: null, ok: false, type: 'head' };
  try {
    const head = await fetch(url, { method: 'HEAD' });
    attempts.status = head.status;
    attempts.ok = head.ok;
    if (head.ok) return attempts;
  } catch (err) {
    attempts.status = null;
    attempts.ok = false;
  }
  try {
    const range = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    attempts.status = range.status;
    attempts.ok = range.ok;
    attempts.type = 'range';
    if (range.ok) return attempts;
  } catch (err) {
    attempts.status = null;
    attempts.ok = false;
  }
  try {
    const get = await fetch(url);
    attempts.status = get.status;
    attempts.ok = get.ok;
    attempts.type = 'get';
  } catch (err) {
    attempts.status = null;
    attempts.ok = false;
  }
  return attempts;
}

async function probeAsset(base: string, key: keyof AssetUrls): Promise<AssetProbeResult> {
  const cacheKey = `${base}:${key}`;
  if (probeCache.has(cacheKey)) return probeCache.get(cacheKey)!;

  const fileMap: Record<keyof AssetUrls, string> = {
    basePath: '',
    beautyUrl: 'beauty.webp',
    beautyFgUrl: 'beauty_fg.webp',
    thumbUrl: 'beauty_512.webp',
    maskBaseUrl: 'mask_base.webp',
    maskShadeUrl: 'mask_shade.webp',
    maskAdapterUrl: 'mask_adapter.webp',
    maskGuardUrl: 'mask_guard.webp',
    aoUrl: 'ao.webp',
    emissionUrl: 'emission.webp',
    backgroundUrl: ''
  };

  const basePath = key === 'backgroundUrl' ? base : base;
  const file = key === 'backgroundUrl' ? 'bg.webp' : fileMap[key];

  const candidates = key === 'backgroundUrl'
    ? candidateFiles(base, file, constants.renderFrameSuffix, constants.disablePngFallback)
    : candidateFiles(base, file, constants.renderFrameSuffix, constants.disablePngFallback);

  const attempts: ProbeAttempt[] = [];
  let exists = false;
  let usedUrl: string | undefined;
  let frameOnly = false;
  const suffix = constants.renderFrameSuffix;

  for (const candidate of candidates) {
    const attempt = await probeSingle(candidate);
    attempts.push(attempt);
    if (attempt.ok) {
      exists = true;
      usedUrl = candidate;
      if (suffix && candidate.includes(suffix)) frameOnly = true;
      break;
    }
  }

  const result: AssetProbeResult = { key, exists, usedUrl, attempts, frameOnly };
  probeCache.set(cacheKey, result);
  return result;
}

export function buildStaticManifest(): AvailabilityMap {
  const manifestBases = ['base_01', 'base_05', 'base_10'];
  const manifestShades = ['shade_01', 'shade_10', 'shade_20'];
  const map: AvailabilityMap = {};
  for (const base of manifestBases) {
    map[base] = {} as any;
    for (const shade of manifestShades) {
      map[base][shade] = {} as any;
      for (const camera of constants.cameras) {
        map[base][shade][camera] = {} as any;
        for (const state of constants.states) {
          const config: Configuration = {
            base,
            shade,
            camera,
            state: state as StateId,
            colors: {
              shade: getDefaultColor('shade'),
              base: getDefaultColor('base'),
              adapter: getDefaultColor('adapter'),
              guard: getDefaultColor('guard')
            }
          };
          map[base][shade][camera][state] = {
            ...resolveAssetUrls(config),
            exists: true,
            probes: [],
            missingFiles: [],
            frameOnlyFiles: []
          };
        }
      }
    }
  }
  return map;
}

export function pickFirstAvailableConfiguration(map: AvailabilityMap): Configuration {
  const firstBase = Object.keys(map)[0];
  const firstShade = Object.keys(map[firstBase])[0];
  const firstCamera = Object.keys(map[firstBase][firstShade])[0] as CameraId;
  const firstState = Object.keys(map[firstBase][firstShade][firstCamera])[0] as StateId;
  return {
    base: firstBase,
    shade: firstShade,
    camera: firstCamera,
    state: firstState,
    colors: {
      shade: getDefaultColor('shade'),
      base: getDefaultColor('base'),
      adapter: getDefaultColor('adapter'),
      guard: getDefaultColor('guard')
    }
  };
}

export function coerceConfig(config: Configuration, availability: AvailabilityMap): Configuration {
  const bases = Object.keys(availability);
  const base = bases.includes(config.base) ? config.base : bases[0];
  const shades = Object.keys(availability[base]);
  const shade = shades.includes(config.shade) ? config.shade : shades[0];
  const cameras = Object.keys(availability[base][shade]);
  const camera = cameras.includes(config.camera) ? config.camera : (cameras[0] as CameraId);
  const states = Object.keys(availability[base][shade][camera]);
  const state = states.includes(config.state) ? config.state : (states[0] as StateId);
  const coercedColors = { ...config.colors };
  return { ...config, base, shade, camera, state, colors: coercedColors };
}

export async function probeAvailability(config: Configuration): Promise<AvailabilityEntry> {
  const assets = resolveAssetUrls(config);
  const keys = [
    'beautyFgUrl',
    'beautyUrl',
    'thumbUrl',
    'backgroundUrl',
    'maskBaseUrl',
    'maskShadeUrl',
    'maskAdapterUrl',
    'maskGuardUrl',
    'aoUrl',
    'emissionUrl'
  ] as (keyof AssetUrls)[];

  const probes: AssetProbeResult[] = [];
  for (const key of keys) {
    const basePath = key === 'backgroundUrl' ? `${constants.cdnRoot}/background/${config.camera}` : assets.basePath;
    probes.push(await probeAsset(basePath, key));
  }

  const missingFiles = probes
    .filter((p) => !p.exists)
    .map((p) => p.key.replace('Url', '').replace(/([A-Z])/g, '_$1').toLowerCase());
  const frameOnlyFiles = probes.filter((p) => p.frameOnly).map((p) => p.key);
  const exists = probes.some((p) => p.key === 'beautyFgUrl' ? p.exists : false) || probes.some((p) => p.key === 'beautyUrl' && p.exists);

  return {
    ...assets,
    exists,
    probes,
    missingFiles,
    frameOnlyFiles
  };
}

export async function buildAvailabilityMap(options: BuildAvailabilityOptions): Promise<AvailabilityMap> {
  const map: AvailabilityMap = {};
  const bases = options.bases || constants.bases;
  const shades = options.shades || constants.shades;
  const cameras = options.cameras || constants.cameras;
  const states = options.states;
  const tasks: { base: string; shade: string; camera: string; state: StateId }[] = [];

  for (const base of bases) {
    for (const shade of shades) {
      for (const camera of cameras) {
        for (const state of states) {
          tasks.push({ base, shade, camera, state });
        }
      }
    }
  }

  const concurrency = Math.max(1, constants.availabilityConcurrency || 8);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const current = tasks[index++];
      const config: Configuration = {
        base: current.base,
        shade: current.shade,
        camera: current.camera,
        state: current.state,
        colors: {
          shade: getDefaultColor('shade'),
          base: getDefaultColor('base'),
          adapter: getDefaultColor('adapter'),
          guard: getDefaultColor('guard')
        }
      };
      const result = await probeAvailability(config);
      if (!result.exists) continue;
      map[current.base] = map[current.base] || ({} as any);
      map[current.base][current.shade] = map[current.base][current.shade] || ({} as any);
      map[current.base][current.shade][current.camera] = map[current.base][current.shade][current.camera] || ({} as any);
      map[current.base][current.shade][current.camera][current.state] = result;
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return map;
}
