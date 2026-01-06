import { ConfigConstants } from '../types/config';
import { BaseId, CameraId, ShadeId } from '../types/configurator';

const defaultBases: BaseId[] = Array.from({ length: 38 }, (_, i) => `base_${String(i + 1).padStart(2, '0')}`);
const defaultShades: ShadeId[] = Array.from({ length: 42 }, (_, i) => `shade_${String(i + 1).padStart(2, '0')}`);
const defaultCameras: CameraId[] = ['CAM_01', 'CAM_02', 'CAM_03'];
const defaultStates: ('on' | 'off')[] = ['on', 'off'];

const constants: ConfigConstants = {
  cdnRoot: import.meta.env.VITE_CDN_ROOT || '/renders',
  renderFrameSuffix: import.meta.env.VITE_RENDER_FRAME_SUFFIX,
  bases: defaultBases,
  shades: defaultShades,
  cameras: defaultCameras,
  states: defaultStates,
  shopifyVariantId: import.meta.env.VITE_VARIANT_ID,
  availabilityConcurrency: Number(import.meta.env.VITE_AVAIL_CONCURRENCY || 8),
  disablePngFallback: (import.meta.env.VITE_DISABLE_PNG_FALLBACK || '').toString() === 'true',
  version: '1.0.0'
};

export default constants;
