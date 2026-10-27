import { readPostsMeta, LANGS, DEFAULT_LANG } from './posts-meta.mjs';

/**
 * 태그 페이지를 검색엔진 색인에 올리는 최소 글 수.
 * 글 1편짜리 태그 페이지는 그 글의 카드 하나만 있는 얇은 페이지라
 * 서치콘솔에서 "크롤링됨 - 현재 색인이 생성되지 않음"으로 쌓인다(2026-10-12 확인).
 * 이 기준 미만인 태그 페이지는 noindex 를 붙이고 사이트맵에서 뺀다.
 */
export const TAG_INDEX_MIN_POSTS = 2;
export const isThinTag = (count) => count < TAG_INDEX_MIN_POSTS;

/**
 * 발행된 글의 태그를 언어별로 세어, 기준 미만인 태그 페이지의 경로를 돌려준다.
 * 경로는 디코드된 형태(`/en/tags/3 days in Seoul/`)다. 사이트맵 URL 과 비교할 때는 decodeURIComponent 를 거친다.
 * @param {string} postsRoot src/content/posts 경로
 * @param {{ withFilter?: boolean }} [opts]
 */
export function thinTagPaths(postsRoot, opts = {}) {
  const thin = new Set();
  const posts = readPostsMeta(postsRoot);
  for (const lang of LANGS) {
    const counts = new Map();
    for (const p of posts.filter((p) => p.lang === lang)) for (const tag of p.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
    for (const [tag, count] of counts) if (isThinTag(count)) thin.add(`${prefix}/tags/${tag}/`);
  }
  if (!opts.withFilter) return thin;
  return Object.assign(thin, { sitemapFilter: filterOut(thin) });
}

/** 사이트맵 URL 을 디코드한 경로가 `excluded` 에 없을 때만 통과시키는 @astrojs/sitemap 용 filter. */
const filterOut = (excluded) => (url) => {
  let path;
  try { path = decodeURIComponent(new URL(url).pathname); } catch { return true; }
  return !excluded.has(path);
};

/** 범위 목록 페이지(/domestic/, /overseas/)의 범위 키. 글 frontmatter 의 `scope` 와 같다. */
export const SCOPES = ['domestic', 'overseas'];

/**
 * 발행된 글이 0편인 범위 목록 페이지의 경로(언어별). 글이 없는 목록 페이지는 "아직 글이 없어요" 한 줄뿐이라
 * 서치콘솔이 Soft 404 로 판정한다(2026-10-27 /en/overseas/ 확인). 페이지 쪽(ListView)은 글이 0편이면
 * 스스로 noindex 를 붙이고, 사이트맵에서는 여기서 뺀다. 글이 생기면 자동으로 색인 대상으로 돌아간다.
 * @param {string} postsRoot src/content/posts 경로
 */
export function emptyScopePaths(postsRoot) {
  const empty = new Set();
  const posts = readPostsMeta(postsRoot);
  for (const lang of LANGS) {
    const prefix = lang === DEFAULT_LANG ? '' : `/${lang}`;
    for (const scope of SCOPES) {
      if (!posts.some((p) => p.lang === lang && p.scope === scope)) empty.add(`${prefix}/${scope}/`);
    }
  }
  return empty;
}

/**
 * 사이트맵에서 뺄 경로 전체(얇은 태그 페이지 + 빈 범위 목록 페이지). 페이지 쪽 noindex 와 같은 기준이어야 한다.
 * 돌려주는 Set 에 `sitemapFilter` 가 붙어 있다(astro.config 의 sitemap({ filter }) 에 그대로 쓴다).
 * @param {string} postsRoot src/content/posts 경로
 */
export function sitemapExcludedPaths(postsRoot) {
  const excluded = new Set([...thinTagPaths(postsRoot), ...emptyScopePaths(postsRoot)]);
  return Object.assign(excluded, { sitemapFilter: filterOut(excluded) });
}
