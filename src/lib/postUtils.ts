import type { Lang } from '../site.config';
import { LANGS, DEFAULT_LANG } from '../site.config';

export function splitId(id: string): { lang: Lang; slug: string } {
  const i = id.indexOf('/');
  const lang = i === -1 ? '' : id.slice(0, i);
  if (!LANGS.includes(lang as Lang)) {
    throw new Error(`글 id "${id}"에서 언어를 찾을 수 없습니다. ${LANGS.join("/")} 폴더 중 하나에 두세요.`);
  }
  return { lang: lang as Lang, slug: id.slice(i + 1) };
}

export function localePath(lang: Lang, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang === DEFAULT_LANG ? p : `/${lang}${p}`;
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

/**
 * 목록 페이지(지역·태그·국내·해외·고정 페이지)의 hreflang 대안 URL.
 * langs 에 든 언어만 넣는다. 세 언어 페이지가 서로를 빠짐없이 가리켜야 구글이 hreflang 을 인정한다
 * (2026-10-13 SEO 감사: ko·en 목록 페이지가 ja 를 빠뜨려 상호 참조가 깨져 있었다).
 */
export function listAlternates(basePath: string, suffix: string, langs: readonly Lang[] = LANGS): Partial<Record<Lang, string>> {
  const out: Partial<Record<Lang, string>> = {};
  for (const l of langs) out[l] = localePath(l, `${basePath}${suffix}`);
  return out;
}

/** 페이지네이션 접미사: 1페이지는 빈 문자열, 2페이지부터 "2/". */
export function pageSuffix(currentPage: number): string {
  return currentPage > 1 ? `${currentPage}/` : '';
}
