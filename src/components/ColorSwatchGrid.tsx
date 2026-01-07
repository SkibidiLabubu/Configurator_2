import { useMemo } from 'react';
import { ColorFilter } from '../types/colors';
import { ColorSwatch, PartKey } from '../types/configurator';
import { filterColors } from '../utils/colors';

interface Props {
  activePart: PartKey;
  onPartChange: (part: PartKey) => void;
  selected: Record<PartKey, ColorSwatch>;
  onSelect: (part: PartKey, swatch: ColorSwatch) => void;
}

export default function ColorSwatchGrid({ activePart, onPartChange, selected, onSelect }: Props) {
  const filter = useMemo<ColorFilter>(() => ({ search: '', finish: 'all', part: activePart }), [activePart]);
  const options = useMemo(() => filterColors(filter), [filter]);
  const activeSwatch = selected[activePart];
  const label = activePart.charAt(0).toUpperCase() + activePart.slice(1);
  return (
    <div className="card">
      <div className="card-header">
        <div className="segmented">
          {(['shade', 'base', 'adapter', 'guard'] as PartKey[]).map((part) => (
            <button
              key={part}
              className={part === activePart ? 'segmented-button active' : 'segmented-button'}
              onClick={() => onPartChange(part)}
            >
              {part}
            </button>
          ))}
        </div>
      </div>
      <div className="current-color">
        {label} color: {activeSwatch?.name} ({activeSwatch?.finish})
      </div>
      <div className="swatch-grid">
        {options.map((swatch) => {
          const isActive = selected[activePart]?.id === swatch.id;
          return (
            <button
              key={swatch.id}
              className={`swatch-dot ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(activePart, swatch)}
              title={`${swatch.name} (${swatch.finish})`}
            >
              <span className="swatch-dot-inner" style={{ background: swatch.hex }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
