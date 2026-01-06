import { useMemo } from 'react';
import { ColorFilter } from '../types/colors';
import { ColorSwatch, PartKey } from '../types/configurator';
import { allFinishes, filterColors } from '../utils/colors';

interface Props {
  activePart: PartKey;
  onPartChange: (part: PartKey) => void;
  filter: ColorFilter;
  onFilterChange: (filter: ColorFilter) => void;
  selected: Record<PartKey, ColorSwatch>;
  onSelect: (part: PartKey, swatch: ColorSwatch) => void;
}

export default function ColorSwatchGrid({ activePart, onPartChange, filter, onFilterChange, selected, onSelect }: Props) {
  const options = useMemo(() => filterColors(filter), [filter]);
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
        <div className="filter-row">
          <input
            type="search"
            placeholder="Search colors"
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          />
          <select
            value={filter.finish}
            onChange={(e) => onFilterChange({ ...filter, finish: e.target.value as ColorFilter['finish'] })}
          >
            {allFinishes().map((finish) => (
              <option key={finish} value={finish}>
                {finish}
              </option>
            ))}
          </select>
          <button onClick={() => onFilterChange({ ...filter, search: '', finish: 'all' })}>Clear</button>
        </div>
      </div>
      <div className="swatch-grid">
        {options.map((swatch) => {
          const isActive = selected[activePart]?.id === swatch.id;
          return (
            <button
              key={swatch.id}
              className={`swatch ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(activePart, swatch)}
              title={`${swatch.name} (${swatch.finish})`}
            >
              <span className="swatch-chip" style={{ background: swatch.hex }} />
              <span className="swatch-meta">
                <span className="swatch-name">{swatch.name}</span>
                <span className="swatch-finish">{swatch.finish}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
