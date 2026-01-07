import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AvailabilityEntry,
  AvailabilityMap,
  ColorSwatch,
  Configuration,
  PartKey
} from '../types/configurator';
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
import { getRandomName } from '../utils/names';

function keys<T>(obj: Record<string, T>): string[] {
  return Object.keys(obj);
}

function isSameConfiguration(a: Configuration, b: Configuration) {
  return (
    a.base === b.base &&
    a.shade === b.shade &&
    a.camera === b.camera &&
    a.state === b.state
  );
}

function formatBaseId(id: string) {
  return `Base ${id.replace('base_', '').replace(/^0+/, '')}`;
}

function formatShadeId(id: string) {
  return `Shade ${id.replace('shade_', '').replace(/^0+/, '')}`;
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
  const [lampName, setLampName] = useState<string>(() => getRandomName());
  const debounceRef = useRef<number>();
  const configRef = useRef<Configuration>(configuration);

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
    configRef.current = configuration;
  }, [configuration]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const requestConfig = configuration;
    const timeoutId = window.setTimeout(() => {
      probeAvailability(requestConfig)
        .then((res) => {
          if (!isSameConfiguration(configRef.current, requestConfig)) return;
          setCurrentAsset(res);
          preloadAssetSet(res);
          setStatus(res.exists ? 'Assets ready' : 'Missing render assets');
        })
        .catch(() => {
          if (isSameConfiguration(configRef.current, requestConfig)) {
            setStatus('Probe failed');
          }
        });
    }, 200);
    debounceRef.current = timeoutId;
    return () => window.clearTimeout(timeoutId);
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
  const currentAvailability = availability[configuration.base]?.[configuration.shade]?.[configuration.camera]?.[configuration.state];

  function updateConfig(partial: Partial<Configuration>) {
    const next = coerceConfig({ ...configRef.current, ...partial }, availability);
    // Update the ref immediately so probes compare against the latest selection.
    // This prevents the first click from being ignored due to stale configRef values.
    configRef.current = next;
    setConfiguration(next);
    const nextAvailability = availability[next.base]?.[next.shade]?.[next.camera]?.[next.state];
    if (nextAvailability) {
      setCurrentAsset(nextAvailability);
      preloadAssetSet(nextAvailability);
      setStatus(nextAvailability.exists ? 'Assets ready' : 'Missing render assets');
    }
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
      LampName: lampName,
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

  function cycleBase(delta: number) {
    if (!bases.length) return;
    const index = bases.indexOf(configuration.base);
    const nextIndex = (index + delta + bases.length) % bases.length;
    updateConfig({ base: bases[nextIndex] });
  }

  function cycleShade(delta: number) {
    if (!shades.length) return;
    const index = shades.indexOf(configuration.shade);
    const nextIndex = (index + delta + shades.length) % shades.length;
    updateConfig({ shade: shades[nextIndex] });
  }

  return (
    <div className="configurator-grid">
      <div className="preview-card">
        <div className="preview-shell">
          {displayUrl && <img src={displayUrl} className="preview" alt="Preview" />}
          {isCompositing && <div className="skeleton" />}
          {!currentAvailability?.exists && <div className="overlay">Missing render assets…</div>}
          <div className="preview-controls top-right">
            <div className="preview-control-label">📷</div>
            <div className="preview-control-buttons">
              {cameras.map((camera, index) => (
                <button
                  key={camera}
                  className={`preview-control-button ${configuration.camera === camera ? 'active' : ''}`}
                  onClick={() => updateConfig({ camera })}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="preview-controls bottom-left">
            <button
              className={`preview-toggle ${configuration.state === 'on' ? 'active' : ''}`}
              onClick={() => updateConfig({ state: configuration.state === 'on' ? 'off' : 'on' })}
              title={`Lamp ${configuration.state === 'on' ? 'on' : 'off'}`}
            >
              {configuration.state === 'on' ? '💡' : '🔌'}
            </button>
          </div>
          <div className="preview-carousel base-carousel">
            <button className="carousel-button" onClick={() => cycleBase(-1)} aria-label="Previous base">
              ‹
            </button>
            <span className="carousel-label">{formatBaseId(configuration.base)}</span>
            <button className="carousel-button" onClick={() => cycleBase(1)} aria-label="Next base">
              ›
            </button>
          </div>
          <div className="preview-carousel shade-carousel">
            <button className="carousel-button" onClick={() => cycleShade(-1)} aria-label="Previous shade">
              ‹
            </button>
            <span className="carousel-label">{formatShadeId(configuration.shade)}</span>
            <button className="carousel-button" onClick={() => cycleShade(1)} aria-label="Next shade">
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="controls-column">
        <div className="card">
          <h3>Bases</h3>
          <div className="selector-grid">
            {bases.map((base) => (
              <button
                key={base}
                className={`tile ${configuration.base === base ? 'active' : ''}`}
                onClick={() => updateConfig({ base })}
              >
                <span className="tile-thumb">{formatBaseId(base)}</span>
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
                <span className="tile-thumb">{formatShadeId(shade)}</span>
              </button>
            ))}
          </div>
        </div>

        <ColorSwatchGrid
          activePart={activePart}
          onPartChange={(part) => {
            setActivePart(part);
          }}
          selected={configuration.colors}
          onSelect={handleColorSelect}
        />

        <div className="card">
          <h3>Lamp name</h3>
          <div className="filter-row">
            <label htmlFor="lamp-name">Lamp name</label>
            <div className="filter-row">
              <input
                id="lamp-name"
                type="text"
                value={lampName}
                onChange={(e) => setLampName(e.target.value)}
              />
              <button type="button" onClick={() => setLampName(getRandomName())}>
                🎲
              </button>
            </div>
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
              <h4>Lamp name</h4>
              <pre>{lampName}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
