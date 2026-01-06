import { ColorSwatch, PartKey } from '../types/configurator';
import { ColorFilter } from '../types/colors';

const swatches: ColorSwatch[] = [
  { id: 'blk_matte', name: 'Black', hex: '#0f1115', finish: 'matte', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'wht_matte', name: 'White', hex: '#f3f4f6', finish: 'matte', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'brass_sat', name: 'Brass Satin', hex: '#c19753', finish: 'satin', appliesTo: ['base', 'adapter', 'guard'] },
  { id: 'nickel_gloss', name: 'Nickel Gloss', hex: '#cfd4d9', finish: 'glossy', appliesTo: ['base', 'adapter', 'guard'] },
  { id: 'forest_matte', name: 'Forest', hex: '#0f3b2e', finish: 'matte', appliesTo: ['shade', 'guard'] },
  { id: 'sand_matte', name: 'Sand', hex: '#d7c8ad', finish: 'matte', appliesTo: ['shade'] },
  { id: 'blue_sat', name: 'Pacific', hex: '#2a4d8f', finish: 'satin', appliesTo: ['shade'] },
  { id: 'clear_gloss', name: 'Clear Gloss', hex: '#f6f7fb', finish: 'glossy', appliesTo: ['shade'] }
];

export function getDefaultColor(part: PartKey): ColorSwatch {
  return swatches.find((s) => s.appliesTo.includes(part)) || swatches[0];
}

export function filterColors(filter: ColorFilter): ColorSwatch[] {
  const normalizedSearch = filter.search.trim().toLowerCase();
  return swatches.filter((swatch) => {
    if (!swatch.appliesTo.includes(filter.part)) return false;
    if (filter.finish !== 'all' && swatch.finish !== filter.finish) return false;
    if (!normalizedSearch) return true;
    return swatch.name.toLowerCase().includes(normalizedSearch) || swatch.id.toLowerCase().includes(normalizedSearch);
  });
}

export function allFinishes(): ColorFilter['finish'][] {
  return ['all', 'matte', 'satin', 'glossy', 'metallic', 'other'];
}

export default swatches;
