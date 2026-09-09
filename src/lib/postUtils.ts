import type { Lang } from '../site.config';
import { LANGS } from '../site.config';

export function splitId(id: string): { lang: Lang; slug: string } {
  const i = id.indexOf('/');
  const lang = i === -1 ? '' : id.slice(0, i);
  if (!LANGS.includes(lang as Lang)) {
    throw new Error(`글 id "${id}"에서 언어를 찾을 수 없습니다. ko/ 또는 en/ 폴더에 두세요.`);
  }
  return { lang: lang as Lang, slug: id.slice(i + 1) };
}

export function localePath(lang: Lang, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang === 'ko' ? p : `/en${p}`;
}

export function sortByDateDesc<T extends { data: { pubDate: Date } }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function pickRelated<T extends { id: string; data: { region: string; tags: string[] } }>(
  all: T[],
  current: T,
  n = 3,
): T[] {
  const score = (p: T) => {
    const region = p.data.region === current.data.region ? 10 : 0;
    const shared = p.data.tags.filter((t) => current.data.tags.includes(t)).length;
    return region + shared;
  };
  return all
    .filter((p) => p.id !== current.id)
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.p);
}

export function collectTags<T extends { data: { tags: string[] } }>(items: T[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) for (const tag of item.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function isPublished(data: { draft: boolean }, isDev: boolean): boolean {
  return isDev || !data.draft;
}
