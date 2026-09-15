import data from './regions.json';
import { DEFAULT_LANG, type Lang } from '../site.config';

export type Scope = 'domestic' | 'overseas';
export interface Region {
  ko: string;
  en: string;
  ja?: string;
  scope: Scope;
  country: string;
  aliases: string[];
}

export const regions: Record<string, Region> = data as Record<string, Region>;
export const regionKeys = Object.keys(regions);
/** 해당 언어 이름이 없으면 영어, 그것도 없으면 기본 언어로 떨어진다. */
export function regionName(key: string, lang: Lang): string {
  const r = regions[key];
  if (!r) return key;
  return r[lang] ?? r.en ?? r[DEFAULT_LANG] ?? key;
}
