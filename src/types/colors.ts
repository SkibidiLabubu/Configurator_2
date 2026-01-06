import { ColorSwatch, PartKey } from './configurator';

export type Finish = ColorSwatch['finish'];

export interface ColorFilter {
  search: string;
  finish: Finish | 'all';
  part: PartKey;
}
