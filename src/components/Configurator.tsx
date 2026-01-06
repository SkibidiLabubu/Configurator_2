import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AvailabilityEntry,
  AvailabilityMap,
  ColorSwatch,
  Configuration,
  PartKey,
  StateId
} from '../types/configurator';
import { ColorFilter } from '../types/colors';
import ColorSwatchGrid from './ColorSwatchGrid';
import {
  buildAvailabilityMap,
  buildStaticManifest,
  coerceConfig,
  pickFirstAvailableConfiguration,
  probeAvailability
} from '../utils/assetResolver';
import { preloadAssetSet } from '../utils/preload';
import { compositeProduct } from '../utils/compositor';
import constants from '../utils/config';

function keys<T>(obj: Record<string, T>): string[] {
  return Object.keys(obj);
}

export default function Configurator() {
  const [availability, setAvailability] = useState<AvailabilityMap>(() => buildStaticManifest());
  const [configuration, setConfiguration] = useState<Configuration>(() => pickFirstAvailableConfiguration(buildStaticManifest()));
  const [currentAsset, setCurrentAsset] = useState<AvailabilityEntry | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const [debugOpen, setDebugOpen] = useState(false);
  const [isCompositing, setIsCompositing] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [fetchLogs, setFetchLogs] = useState<any[]>([]);
  const [activePart, setActivePart] = useState<PartKey>('shade');
  const [colorFilter, setColorFilter] = useState<ColorFilter>({ search: '', finish: 'all', part: 'shade' });
  const debounceRef = useRef<number>();

  useEffect(() => {
    let mounted = true;
    buildAvailabilityMap({ states: constants.states }).then((map) => {
      if (!mounted) return;
      const coerced = coerceConfig(configuration, map);
      setAvailability(map);
      setConfiguration(coerced);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      probeAvailability(configuration)
        .then((res) => {
          setCurrentAsset(res);
          preloadAssetSet(res);
          setStatus(res.exists ? 'Assets ready' : 'Missing render assets');
        })
        .catch(() => {
          setStatus('Probe failed');
        });
    }, 200);
  }, [configuration]);

  useEffect(() => {
    const run = async () => {
      if (!currentAsset) return;
      setIsCompositing(true);
      try {
        const result = await compositeProduct(currentAsset, configuration.colors);
        setNextUrl(result.url);
        setFetchLogs(result.logs);
      } catch (err) {
        setStatus('Compositing failed, using fallback');
        const fallback = currentAsset.beautyFgUrl || currentAsset.beautyUrl || currentAsset.thumbUrl;
        setNextUrl(fallback || null);
      } finally {
        setIsCompositing(false);
      }
    };
    run();
  }, [currentAsset, configuration.colors]);

  useEffect(() => {
    if (!nextUrl) return;
    const img = new Image();
    img.src = nextUrl;
    img.onload = () => {
      if (displayUrl && displayUrl.startsWith('blob:')) URL.revokeObjectURL(displayUrl);
      setDisplayUrl(nextUrl);
      setNextUrl(null);
    };
  }, [nextUrl]);

  const bases = useMemo(() => keys(availability), [availability]);
  const shades = useMemo(() => keys(availability[configuration.base] || {}), [availability, configuration.base]);
  const cameras = useMemo(() => keys(availability[configuration.base]?.[configuration.shade] || {}), [availability, configuration.base, configuration.shade]);
  const states = useMemo(() => keys(availability[configuration.base]?.[configuration.shade]?.[configuration.camera] || {}), [availability, configuration.base, configuration.shade, configuration.camera]);

  const currentAvailability = availability[configuration.base]?.[configuration.shade]?.[configuration.camera]?.[configuration.state];

  function updateConfig(partial: Partial<Configuration>) {
    setConfiguration((prev) => coerceConfig({ ...prev, ...partial }, availability));
  }

  function handleColorSelect(part: PartKey, swatch: ColorSwatch) {
    updateConfig({ colors: { ...configuration.colors, [part]: swatch } });
  }

  function handleAddToCart() {
    if (!constants.shopifyVariantId) {
      setStatus('Shopify variant not configured');
      return;
    }
    const allowedHost = /(?:myshopify\.com|shopify\.com)$/;
    if (!allowedHost.test(window.location.hostname)) {
      setStatus('Add to cart available only on Shopify host');
      return;
    }
    const props = {
      Base: configuration.base,
      Shade: configuration.shade,
      Camera: configuration.camera,
      State: configuration.state,
      ShadeColor: JSON.stringify(configuration.colors.shade),
      BaseColor: JSON.stringify(configuration.colors.base),
      AdapterColor: JSON.stringify(configuration.colors.adapter),
      GuardColor: JSON.stringify(configuration.colors.guard),
      PreviewUrl: currentAsset?.beautyUrl || '',
      ConfiguratorVersion: constants.version
    };
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: constants.shopifyVariantId, properties: props })
    })
      .then((res) => res.json())
      .then(() => setStatus('Toegevoegd aan winkelwagen'))
      .catch(() => setStatus('Cart request failed'));
  }

  return (
    <div className="configurator-grid">
      <div className="sidebar">
        <div className="card">
          <h3>Bases</h3>
          <div className="selector-grid">
            {bases.map((base) => (
              <button
                key={base}
                className={`tile ${configuration.base === base ? 'active' : ''}`}
                onClick={() => updateConfig({ base })}
              >
                <span className="tile-thumb">{base}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Shades</h3>
          <div className="selector-grid">
            {shades.map((shade) => (
              <button
                key={shade}
                className={`tile ${configuration.shade === shade ? 'active' : ''}`}
                onClick={() => updateConfig({ shade })}
              >
                <span className="tile-thumb">{shade}</span>
              </button>
            ))}
          </div>
        </div>

        <ColorSwatchGrid
          activePart={activePart}
          onPartChange={(part) => {
            setActivePart(part);
            setColorFilter((f) => ({ ...f, part }));
          }}
          filter={colorFilter}
          onFilterChange={(filter) => setColorFilter(filter)}
          selected={configuration.colors}
          onSelect={handleColorSelect}
        />

        <div className="card">
          <h3>Camera</h3>
          <div className="segmented">
            {cameras.map((camera) => (
              <button
                key={camera}
                className={`segmented-button ${configuration.camera === camera ? 'active' : ''}`}
                onClick={() => updateConfig({ camera })}
              >
                {camera}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>State</h3>
          <div className="segmented">
            {states.map((state) => (
              <button
                key={state}
                className={`segmented-button ${configuration.state === state ? 'active' : ''}`}
                disabled={!availability[configuration.base]?.[configuration.shade]?.[configuration.camera]?.[state as StateId]}
                onClick={() => updateConfig({ state: state as StateId })}
              >
                {state}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <button className="primary" onClick={handleAddToCart}>Add to cart</button>
          <div className="status">{status}</div>
        </div>

        <div className="card">
          <button className="link" onClick={() => setDebugOpen((v) => !v)}>
            {debugOpen ? 'Hide diagnostics' : 'Show diagnostics'}
          </button>
          {debugOpen && (
            <div className="debug">
              <h4>Resolved URLs</h4>
              <pre>{JSON.stringify(currentAsset, null, 2)}</pre>
              <h4>Fetch logs</h4>
              <pre>{JSON.stringify(fetchLogs, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="preview-card">
        <div className="preview-shell">
          {displayUrl && <img src={displayUrl} className="preview" alt="Preview" />}
          {isCompositing && <div className="skeleton" />}
          {!currentAvailability?.exists && <div className="overlay">Missing render assets…</div>}
        </div>
      </div>
    </div>
  );
}
