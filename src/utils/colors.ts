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

const bambuBasicSwatches: ColorSwatch[] = [
  { id: 'bambu_jade_white_10100', name: 'Jade White (10100)', hex: '#F4F3ED', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_brown_10800', name: 'Brown (10800)', hex: '#8B5A2B', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_beige_10201', name: 'Beige (10201)', hex: '#EAD8C0', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_gold_10401', name: 'Gold (10401)', hex: '#E0AD3A', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_pink_10203', name: 'Pink (10203)', hex: '#F48AB6', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_blue_10601', name: 'Blue (10601)', hex: '#2559B8', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_yellow_10400', name: 'Yellow (10400)', hex: '#FFD838', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_purple_10700', name: 'Purple (10700)', hex: '#6D3DBF', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_black_10101', name: 'Black (10101)', hex: '#111111', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_red_10200', name: 'Red (10200)', hex: '#E53935', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_sunflower_10402', name: 'Sunflower Yellow (10402)', hex: '#FFBA00', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_gray_10103', name: 'Gray (10103)', hex: '#8A8F9F', finish: 'satin', appliesTo: ['shade', 'base', 'adapter', 'guard'] }
];

const bambuMatteSwatches: ColorSwatch[] = [
  { id: 'bambu_matte_bone_white_11103', name: 'Matte Bone White (11103)', hex: '#F2ECE2', finish: 'matte', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_matte_plum_11204', name: 'Matte Plum (11204)', hex: '#6B214E', finish: 'matte', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_matte_apple_green_11502', name: 'Matte Apple Green (11502)', hex: '#B7E343', finish: 'matte', appliesTo: ['shade', 'base', 'adapter', 'guard'] },
  { id: 'bambu_matte_sky_blue_11603', name: 'Matte Sky Blue (11603)', hex: '#6AB7FF', finish: 'matte', appliesTo: ['shade', 'base', 'adapter', 'guard'] }
];

swatches.push(...bambuBasicSwatches, ...bambuMatteSwatches);

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
