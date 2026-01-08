# Configurator

A front-end-only product configurator built with Vite, React, and TypeScript. It composes photorealistic previews in the browser from deterministic render assets located under `public/renders` (or a CDN) and posts Shopify cart line item properties via `/cart/add.js`.

## Getting started

```bash
npm install
npm run dev
```

The dev/build scripts copy the repository-level `renders/` folder into `public/renders/`. Make sure you place your render exports in `renders/` (see below) before running.

## Scripts
- `npm run dev` — start Vite dev server (also copies renders)
- `npm run build` — type-check + production build (copies renders, verifies dist assets)
- `npm run preview` — preview the production build

## Render assets

Expected structure under `renders/` (copied to `public/renders/`):
```
base_XX/shade_YY/CAM_0N/state/
  beauty.webp
  beauty_fg.webp
  beauty_512.webp
  mask_base.webp
  mask_shade.webp
  mask_adapter.webp
  mask_guard.webp
  ao.webp
  emission.webp
background/CAM_0N/bg.webp
```

Frame-suffixed exports are supported via `VITE_RENDER_FRAME_SUFFIX` (e.g. `0001`).

## Configuration

Key environment flags (set as `VITE_*` vars):
- `VITE_CDN_ROOT` — override render root (default `/renders`)
- `VITE_RENDER_FRAME_SUFFIX` — frame suffix used by render exports
- `VITE_VARIANT_ID` — Shopify variant id for add-to-cart
- `VITE_DISABLE_PNG_FALLBACK` — set to `true` to skip PNG probing
- `VITE_AVAIL_CONCURRENCY` — availability probe concurrency (default 8)

## Deployment

`netlify.toml` points to `npm run build` with `dist` output. Any static host can use the same build.
