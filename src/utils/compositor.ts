import { AssetUrls, ColorSwatch, FetchLog } from '../types/configurator';

interface CompositeOptions {
  colorStrength?: number;
  aoIntensity?: number;
  emissionIntensity?: number;
}

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function loadImage(url: string, logs: FetchLog[]): Promise<ImageBitmap> {
  const res = await fetch(url);
  logs.push({ url, status: res.status, ok: res.ok });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

async function drawTintedMask(
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
  mask: ImageBitmap,
  base: ImageBitmap,
  color: ColorSwatch,
  colorStrength: number,
  aoBitmap?: ImageBitmap,
  aoIntensity?: number,
  emissionBitmap?: ImageBitmap,
  emissionIntensity?: number
) {
  const { width, height } = base;
  const temp = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : (document.createElement('canvas') as HTMLCanvasElement);
  temp.width = width;
  temp.height = height;
  const tctx = temp.getContext('2d');
  if (!tctx) return;
  tctx.drawImage(mask, 0, 0, width, height);
  const maskData = tctx.getImageData(0, 0, width, height);
  const baseCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : (document.createElement('canvas') as HTMLCanvasElement);
  baseCanvas.width = width;
  baseCanvas.height = height;
  const bctx = baseCanvas.getContext('2d');
  if (!bctx) return;
  bctx.drawImage(base, 0, 0, width, height);
  const baseData = bctx.getImageData(0, 0, width, height);
  let aoData: ImageData | undefined;
  if (aoBitmap) {
    const aoCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : (document.createElement('canvas') as HTMLCanvasElement);
    aoCanvas.width = width;
    aoCanvas.height = height;
    const aoCtx = aoCanvas.getContext('2d');
    aoCtx?.drawImage(aoBitmap, 0, 0, width, height);
    aoData = aoCtx?.getImageData(0, 0, width, height);
  }
  let emissionData: ImageData | undefined;
  if (emissionBitmap) {
    const eCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(width, height) : (document.createElement('canvas') as HTMLCanvasElement);
    eCanvas.width = width;
    eCanvas.height = height;
    const eCtx = eCanvas.getContext('2d');
    eCtx?.drawImage(emissionBitmap, 0, 0, width, height);
    emissionData = eCtx?.getImageData(0, 0, width, height);
  }

  const data = maskData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    if (alpha < 0.01) continue;
    const r = baseData.data[i];
    const g = baseData.data[i + 1];
    const b = baseData.data[i + 2];
    const lum = luminance(r, g, b) / 255;
    const tintR = colorStrength * (color.hex ? parseInt(color.hex.slice(1, 3), 16) : 0);
    const tintG = colorStrength * (color.hex ? parseInt(color.hex.slice(3, 5), 16) : 0);
    const tintB = colorStrength * (color.hex ? parseInt(color.hex.slice(5, 7), 16) : 0);
    baseData.data[i] = (r * (1 - alpha)) + (tintR * lum) * alpha;
    baseData.data[i + 1] = (g * (1 - alpha)) + (tintG * lum) * alpha;
    baseData.data[i + 2] = (b * (1 - alpha)) + (tintB * lum) * alpha;
    if (aoData && aoIntensity) {
      const ao = aoData.data[i] / 255;
      const aoFactor = 1 - aoIntensity * (1 - ao);
      baseData.data[i] *= aoFactor;
      baseData.data[i + 1] *= aoFactor;
      baseData.data[i + 2] *= aoFactor;
    }
    if (emissionData && emissionIntensity) {
      const er = emissionData.data[i];
      const eg = emissionData.data[i + 1];
      const eb = emissionData.data[i + 2];
      baseData.data[i] = baseData.data[i] + er * emissionIntensity;
      baseData.data[i + 1] = baseData.data[i + 1] + eg * emissionIntensity;
      baseData.data[i + 2] = baseData.data[i + 2] + eb * emissionIntensity;
    }
  }
  bctx.putImageData(baseData, 0, 0);
  ctx.drawImage(baseCanvas, 0, 0);
}

export async function compositeProduct(
  assets: AssetUrls,
  colors: Record<'shade' | 'base' | 'adapter' | 'guard', ColorSwatch>,
  options: CompositeOptions = {}
) {
  const logs: FetchLog[] = [];
  const colorStrength = options.colorStrength ?? 0.85;
  const aoIntensity = options.aoIntensity ?? 0.35;
  const emissionIntensity = options.emissionIntensity ?? 1;

  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(2048, 2048) : (document.createElement('canvas') as HTMLCanvasElement);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  const baseCandidate = assets.beautyFgUrl || assets.beautyUrl || assets.thumbUrl;
  if (!baseCandidate) throw new Error('No base asset available');

  const [baseBitmap, fallbackBitmap] = await Promise.all([
    loadImage(baseCandidate, logs),
    assets.beautyUrl && assets.beautyUrl !== baseCandidate ? loadImage(assets.beautyUrl, logs).catch(() => null) : Promise.resolve(null)
  ]);

  const width = baseBitmap.width;
  const height = baseBitmap.height;
  canvas.width = width;
  canvas.height = height;

  if (assets.backgroundUrl) {
    try {
      const bg = await loadImage(assets.backgroundUrl, logs);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch (err) {
      // ignore background failure
    }
  }
  ctx.drawImage(baseBitmap || (fallbackBitmap as ImageBitmap), 0, 0, width, height);

  const [maskShade, maskBase, maskAdapter, maskGuard, aoBitmap, emissionBitmap] = await Promise.all([
    assets.maskShadeUrl ? loadImage(assets.maskShadeUrl, logs).catch(() => null) : Promise.resolve(null),
    assets.maskBaseUrl ? loadImage(assets.maskBaseUrl, logs).catch(() => null) : Promise.resolve(null),
    assets.maskAdapterUrl ? loadImage(assets.maskAdapterUrl, logs).catch(() => null) : Promise.resolve(null),
    assets.maskGuardUrl ? loadImage(assets.maskGuardUrl, logs).catch(() => null) : Promise.resolve(null),
    assets.aoUrl ? loadImage(assets.aoUrl, logs).catch(() => null) : Promise.resolve(null),
    assets.emissionUrl ? loadImage(assets.emissionUrl, logs).catch(() => null) : Promise.resolve(null)
  ]);

  if (maskShade) await drawTintedMask(ctx, maskShade, baseBitmap, colors.shade, colorStrength, aoBitmap || undefined, aoIntensity, emissionBitmap || undefined, emissionIntensity);
  if (maskBase) await drawTintedMask(ctx, maskBase, baseBitmap, colors.base, colorStrength, aoBitmap || undefined, aoIntensity, emissionBitmap || undefined, emissionIntensity);
  if (maskAdapter) await drawTintedMask(ctx, maskAdapter, baseBitmap, colors.adapter, colorStrength, aoBitmap || undefined, aoIntensity, emissionBitmap || undefined, emissionIntensity);
  if (maskGuard) await drawTintedMask(ctx, maskGuard, baseBitmap, colors.guard, colorStrength, aoBitmap || undefined, aoIntensity, emissionBitmap || undefined, emissionIntensity);

  const blob = 'convertToBlob' in canvas
    ? await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/webp', quality: 0.95 })
    : await new Promise<Blob>((resolve) => (canvas as HTMLCanvasElement).toBlob((b) => resolve(b as Blob), 'image/webp', 0.95));
  const url = URL.createObjectURL(blob);
  return { url, logs, usedFallback: false };
}
