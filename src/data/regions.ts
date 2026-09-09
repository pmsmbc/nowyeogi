import data from './regions.json';

export type Scope = 'domestic' | 'overseas';
export interface Region {
  ko: string;
  en: string;
  scope: Scope;
  country: string;
  aliases: string[];
}

export const regions: Record<string, Region> = data as Record<string, Region>;
export const regionKeys = Object.keys(regions);
export function regionName(key: string, lang: 'ko' | 'en'): string {
  return regions[key]?.[lang] ?? key;
}
