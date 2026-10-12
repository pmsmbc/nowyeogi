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
  const sitemapFilter = (url) => {
    let path;
    try { path = decodeURIComponent(new URL(url).pathname); } catch { return true; }
    return !thin.has(path);
  };
  return Object.assign(thin, { sitemapFilter });
}
