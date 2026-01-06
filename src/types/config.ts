import { BaseId, CameraId, ShadeId } from './configurator';

export interface ConfigConstants {
  cdnRoot: string;
  renderFrameSuffix?: string;
  bases: BaseId[];
  shades: ShadeId[];
  cameras: CameraId[];
  states: ('on' | 'off')[];
  shopifyVariantId?: string;
  availabilityConcurrency: number;
  disablePngFallback: boolean;
  version: string;
}
