import { AssetUrls, ColorSwatch, FetchLog } from '../types/configurator';

interface CompositeOptions {
  colorStrength?: number;
  aoIntensity?: number;
  emissionIntensity?: number;
}

// Alle 2D-contexten die we willen ondersteunen
type Rendering2DContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function get2DContext(
  canvas: OffscreenCanvas | HTMLCanvasElement
): Rendering2DContext {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D context not available');
  }
  return ctx as Rendering2DContext;
}

async function loadImage(url: string, logs: FetchLog[]): Promise<ImageBitmap> {
  const res = await fetch(url);
  logs.push({ url, status: res.status, ok: res.ok });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

async function drawTintedMask(
  ctx: Rendering2DContext,
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

  // Mask canvas
  const temp =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (document.createElement('canvas') as HTMLCanvasElement);
  temp.width = width;
  temp.height = height;
  const tctx = get2DContext(temp);
  tctx.drawImage(mask, 0, 0, width, height);
  const maskData = tctx.getImageData(0, 0, width, height);

  // Base canvas
  const baseCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (document.createElement('canvas') as HTMLCanvasElement);
  baseCanvas.width = width;
  baseCanvas.height = height;
  const bctx = get2DContext(baseCanvas);
  bctx.drawImage(base, 0, 0, width, height);
  const baseData = bctx.getImageData(0, 0, width, height);

  // AO canvas (optioneel)
  let aoData: ImageData | undefined;
  if (aoBitmap) {
    const aoCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : (document.createElement('canvas') as HTMLCanvasElement);
    aoCanvas.width = width;
    aoCanvas.height = height;
    const aoCtx = get2DContext(aoCanvas);
    aoCtx.drawImage(aoBitmap, 0, 0, width, height);
    aoData = aoCtx.getImageData(0, 0, width, height);
  }

  // Emission canvas (optioneel)
  let emissionData: ImageData | undefined;
  if (emissionBitmap) {
    const eCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : (document.createElement('canvas') as HTMLCanvasElement);
    eCanvas.width = width;
    eCanvas.height = height;
    const eCtx = get2DContext(eCanvas);
    eCtx.drawImage(emissionBitmap, 0, 0, width, height);
    emissionData = eCtx.getImageData(0, 0, width, height);
  }

  const data = maskData.data;
  let alphaMin = 1;
  let alphaMax = 0;
  let lumSum = 0;
  let alphaCoverage = 0;
  let lumCoverage = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    alphaMin = Math.min(alphaMin, alpha);
    alphaMax = Math.max(alphaMax, alpha);
    if (alpha > 0.5) alphaCoverage += 1;
    const lum = luminance(data[i], data[i + 1], data[i + 2]) / 255;
    lumSum += lum;
    if (lum > 0.5) lumCoverage += 1;
  }

  const totalPixels = data.length / 4;
  const alphaRange = alphaMax - alphaMin;
  const alphaCoverageRatio = alphaCoverage / totalPixels;
  const lumCoverageRatio = lumCoverage / totalPixels;
  const useLuminanceOnly =
    alphaRange < 0.01 || alphaCoverageRatio > 0.75 || alphaCoverageRatio < 0.25;
  const lumMean = lumSum / totalPixels;
  const invertLuminance =
    useLuminanceOnly && (lumMean > 0.5 || lumCoverageRatio > 0.5);

  for (let i = 0; i < data.length; i += 4) {
    const maskAlphaChannel = data[i + 3] / 255;
    const maskLum = luminance(data[i], data[i + 1], data[i + 2]) / 255;
    let alpha = maskAlphaChannel;
    if (useLuminanceOnly || maskAlphaChannel < 0.01) {
      alpha = invertLuminance ? 1 - maskLum : maskLum;
    }
    if (alpha < 0.01) {
      baseData.data[i + 3] = 0;
      continue;
    }

    const r = baseData.data[i];
    const g = baseData.data[i + 1];
    const b = baseData.data[i + 2];
    const lum = luminance(r, g, b) / 255;

    const tintR =
      colorStrength * (color.hex ? parseInt(color.hex.slice(1, 3), 16) : 0);
    const tintG =
      colorStrength * (color.hex ? parseInt(color.hex.slice(3, 5), 16) : 0);
    const tintB =
      colorStrength * (color.hex ? parseInt(color.hex.slice(5, 7), 16) : 0);

    baseData.data[i] = r * (1 - alpha) + tintR * lum * alpha;
    baseData.data[i + 1] = g * (1 - alpha) + tintG * lum * alpha;
    baseData.data[i + 2] = b * (1 - alpha) + tintB * lum * alpha;

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
      baseData.data[i] += er * emissionIntensity;
      baseData.data[i + 1] += eg * emissionIntensity;
      baseData.data[i + 2] += eb * emissionIntensity;
    }

    baseData.data[i + 3] = Math.min(255, alpha * 255);
  }

  bctx.putImageData(baseData, 0, 0);
  ctx.drawImage(baseCanvas, 0, 0);
}

async function isMaskEmpty(mask: ImageBitmap) {
  const { width, height } = mask;
  const temp =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (document.createElement('canvas') as HTMLCanvasElement);
  temp.width = width;
  temp.height = height;
  const tctx = get2DContext(temp);
  tctx.drawImage(mask, 0, 0, width, height);
  const data = tctx.getImageData(0, 0, width, height).data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    const lum = luminance(data[i], data[i + 1], data[i + 2]) / 255;
    if (alpha > 0.01 || lum > 0.01) return false;
  }
  return true;
}

async function buildShadeMaskFallback(
  base: ImageBitmap,
  background: ImageBitmap,
  subtractMasks: Array<ImageBitmap | null>
): Promise<ImageBitmap> {
  const { width, height } = base;
  const baseCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (document.createElement('canvas') as HTMLCanvasElement);
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = get2DContext(baseCanvas);
  baseCtx.drawImage(base, 0, 0, width, height);
  const baseData = baseCtx.getImageData(0, 0, width, height);

  const bgCanvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (document.createElement('canvas') as HTMLCanvasElement);
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = get2DContext(bgCanvas);
  bgCtx.drawImage(background, 0, 0, width, height);
  const bgData = bgCtx.getImageData(0, 0, width, height);

  const maskDatas = subtractMasks.map((mask) => {
    if (!mask) return null;
    const maskCanvas =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : (document.createElement('canvas') as HTMLCanvasElement);
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = get2DContext(maskCanvas);
    maskCtx.drawImage(mask, 0, 0, width, height);
    return maskCtx.getImageData(0, 0, width, height).data;
  });
  let shadeClampY = height;
  for (const maskData of maskDatas) {
    if (!maskData) continue;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const maskAlphaChannel = maskData[idx + 3] / 255;
        const maskLum =
          luminance(maskData[idx], maskData[idx + 1], maskData[idx + 2]) / 255;
        const maskAlpha = maskAlphaChannel > 0.01 ? maskAlphaChannel : maskLum;
        if (maskAlpha > 0.1) {
          shadeClampY = Math.min(shadeClampY, y + 2);
          break;
        }
      }
      if (shadeClampY <= y + 2) break;
    }
  }

  const output =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : (document.createElement('canvas') as HTMLCanvasElement);
  output.width = width;
  output.height = height;
  const octx = get2DContext(output);
  const outData = octx.createImageData(width, height);

  const data = baseData.data;
  const bg = bgData.data;
  const out = outData.data;
  const totalPixels = data.length / 4;
  let hardMask = new Uint8Array(totalPixels);
  const softMask = new Uint8Array(totalPixels);
  for (let i = 0; i < data.length; i += 4) {
    const diff =
      (Math.abs(data[i] - bg[i]) +
        Math.abs(data[i + 1] - bg[i + 1]) +
        Math.abs(data[i + 2] - bg[i + 2])) /
      (3 * 255);
    const index = i / 4;
    if (diff > 0.015) hardMask[index] = 1;
    if (diff > 0.002) softMask[index] = 1;
  }

  for (let pass = 0; pass < 2; pass += 1) {
    const expanded = new Uint8Array(hardMask);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (hardMask[index] || !softMask[index]) continue;
        const left = x > 0 ? hardMask[index - 1] : 0;
        const right = x < width - 1 ? hardMask[index + 1] : 0;
        const up = y > 0 ? hardMask[index - width] : 0;
        const down = y < height - 1 ? hardMask[index + width] : 0;
        if (left || right || up || down) expanded[index] = 1;
      }
    }
    hardMask = expanded;
  }
  const cleanedMask = new Uint8Array(totalPixels);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!hardMask[index]) continue;
      const left = x > 0 ? hardMask[index - 1] : 0;
      const right = x < width - 1 ? hardMask[index + 1] : 0;
      const up = y > 0 ? hardMask[index - width] : 0;
      const down = y < height - 1 ? hardMask[index + width] : 0;
      if (left + right + up + down >= 1) {
        cleanedMask[index] = 1;
      }
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    const index = i / 4;
    const y = Math.floor(index / width);
    if (y >= shadeClampY) {
      continue;
    }
    let alpha = cleanedMask[index] ? 1 : 0;
    if (alpha > 0) {
      for (const maskData of maskDatas) {
        if (!maskData) continue;
        const maskAlphaChannel = maskData[i + 3] / 255;
        const maskLum =
          luminance(maskData[i], maskData[i + 1], maskData[i + 2]) / 255;
        const maskAlpha = maskAlphaChannel > 0.01 ? maskAlphaChannel : maskLum;
        if (maskAlpha > 0.1) {
          alpha = 0;
          break;
        }
      }
    }

    if (alpha > 0) {
      out[i] = 255;
      out[i + 1] = 255;
      out[i + 2] = 255;
      out[i + 3] = 255;
    }
  }

  octx.putImageData(outData, 0, 0);
  return await createImageBitmap(output as unknown as CanvasImageSource);
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

  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(2048, 2048)
      : (document.createElement('canvas') as HTMLCanvasElement);

  const ctx = get2DContext(canvas);

  const baseCandidate = assets.beautyFgUrl || assets.beautyUrl || assets.thumbUrl;
  if (!baseCandidate) throw new Error('No base asset available');

  const [baseBitmap, fallbackBitmap] = await Promise.all([
    loadImage(baseCandidate, logs),
    assets.beautyUrl && assets.beautyUrl !== baseCandidate
      ? loadImage(assets.beautyUrl, logs).catch(() => null)
      : Promise.resolve(null)
  ]);

  const width = baseBitmap.width;
  const height = baseBitmap.height;
  canvas.width = width;
  canvas.height = height;

  let backgroundBitmap: ImageBitmap | null = null;
  if (assets.backgroundUrl) {
    try {
      backgroundBitmap = await loadImage(assets.backgroundUrl, logs);
      ctx.drawImage(backgroundBitmap, 0, 0, width, height);
    } catch {
      // ignore background failure
    }
  }

  ctx.drawImage(baseBitmap || (fallbackBitmap as ImageBitmap), 0, 0, width, height);

  let [maskShade, maskBase, maskAdapter, maskGuard, aoBitmap, emissionBitmap] =
    await Promise.all([
      assets.maskShadeUrl
        ? loadImage(assets.maskShadeUrl, logs).catch(() => null)
        : Promise.resolve(null),
      assets.maskBaseUrl
        ? loadImage(assets.maskBaseUrl, logs).catch(() => null)
        : Promise.resolve(null),
      assets.maskAdapterUrl
        ? loadImage(assets.maskAdapterUrl, logs).catch(() => null)
        : Promise.resolve(null),
      assets.maskGuardUrl
        ? loadImage(assets.maskGuardUrl, logs).catch(() => null)
        : Promise.resolve(null),
      assets.aoUrl
        ? loadImage(assets.aoUrl, logs).catch(() => null)
        : Promise.resolve(null),
      assets.emissionUrl
        ? loadImage(assets.emissionUrl, logs).catch(() => null)
        : Promise.resolve(null)
    ]);

  if (backgroundBitmap) {
    const shadeMaskMissing = !maskShade || (await isMaskEmpty(maskShade));
    if (shadeMaskMissing) {
      maskShade = await buildShadeMaskFallback(baseBitmap, backgroundBitmap, [
        maskBase,
        maskAdapter,
        maskGuard
      ]);
    }
  }

  if (maskBase) {
    await drawTintedMask(
      ctx,
      maskBase,
      baseBitmap,
      colors.base,
      colorStrength,
      aoBitmap || undefined,
      aoIntensity,
      emissionBitmap || undefined,
      emissionIntensity
    );
  }
  if (maskAdapter) {
    await drawTintedMask(
      ctx,
      maskAdapter,
      baseBitmap,
      colors.adapter,
      colorStrength,
      aoBitmap || undefined,
      aoIntensity,
      emissionBitmap || undefined,
      emissionIntensity
    );
  }
  if (maskGuard) {
    await drawTintedMask(
      ctx,
      maskGuard,
      baseBitmap,
      colors.guard,
      colorStrength,
      aoBitmap || undefined,
      aoIntensity,
      emissionBitmap || undefined,
      emissionIntensity
    );
  }
  if (maskShade) {
    await drawTintedMask(
      ctx,
      maskShade,
      baseBitmap,
      colors.shade,
      colorStrength,
      aoBitmap || undefined,
      aoIntensity,
      emissionBitmap || undefined,
      emissionIntensity
    );
  }

  const blob =
    'convertToBlob' in canvas
      ? await (canvas as OffscreenCanvas).convertToBlob({
          type: 'image/webp',
          quality: 0.95
        })
      : await new Promise<Blob>((resolve) =>
          (canvas as HTMLCanvasElement).toBlob(
            (b) => resolve(b as Blob),
            'image/webp',
            0.95
          )
        );

  const url = URL.createObjectURL(blob);
  return { url, logs, usedFallback: false };
}
