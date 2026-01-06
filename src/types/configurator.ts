export type BaseId = string;
export type ShadeId = string;
export type CameraId = 'CAM_01' | 'CAM_02' | 'CAM_03' | string;
export type StateId = 'on' | 'off';

export type PartKey = 'shade' | 'base' | 'adapter' | 'guard';

export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  finish: 'matte' | 'glossy' | 'satin' | 'metallic' | 'other';
  appliesTo: PartKey[];
}

export interface Configuration {
  base: BaseId;
  shade: ShadeId;
  camera: CameraId;
  state: StateId;
  colors: Record<PartKey, ColorSwatch>;
}

export interface AssetUrls {
  basePath: string;
  beautyUrl?: string;
  beautyFgUrl?: string;
  thumbUrl?: string;
  maskBaseUrl?: string;
  maskShadeUrl?: string;
  maskAdapterUrl?: string;
  maskGuardUrl?: string;
  aoUrl?: string;
  emissionUrl?: string;
  backgroundUrl?: string;
}

export interface ProbeAttempt {
  url: string;
  status: number | null;
  ok: boolean;
  type: 'head' | 'range' | 'get';
}

export interface AssetProbeResult {
  key: keyof AssetUrls;
  exists: boolean;
  usedUrl?: string;
  frameOnly?: boolean;
  attempts: ProbeAttempt[];
}

export interface AvailabilityEntry extends AssetUrls {
  exists: boolean;
  probes: AssetProbeResult[];
  missingFiles: string[];
  frameOnlyFiles: string[];
}

export type AvailabilityMap = Record<
  BaseId,
  Record<ShadeId, Record<CameraId, Record<StateId, AvailabilityEntry>>>
>;

export interface BuildAvailabilityOptions {
  bases?: BaseId[];
  shades?: ShadeId[];
  cameras?: CameraId[];
  states: StateId[];
}

export interface FetchLog {
  url: string;
  status: number | null;
  ok: boolean;
}

export interface CompositeResult {
  url: string;
  logs: FetchLog[];
  usedFallback: boolean;
}
