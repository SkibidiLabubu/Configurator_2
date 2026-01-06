import { AssetUrls } from '../types/configurator';

export function preloadAsset(url?: string) {
  if (!url) return;
  const img = new Image();
  img.src = url;
}

export function preloadAssetSet(assets: AssetUrls) {
  preloadAsset(assets.thumbUrl);
  preloadAsset(assets.beautyUrl);
  preloadAsset(assets.beautyFgUrl);
  preloadAsset(assets.backgroundUrl);
}
