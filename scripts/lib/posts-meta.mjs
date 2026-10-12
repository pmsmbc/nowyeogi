import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/**
 * src/content/posts 의 frontmatter 만 빠르게 읽는다. Astro 콘텐츠 컬렉션이 뜨기 전인
 * astro.config / prebuild 단계에서 사이트맵·태그 정책을 계산하는 데 쓴다.
 * 발행된 글(draft 아님)만 돌려준다.
 */
export const LANGS = ['ko', 'en', 'ja'];
export const DEFAULT_LANG = 'ko';

const toDay = (v) => {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

function readFrontmatter(file) {
  const m = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  try { return parse(m[1]) ?? {}; } catch { return {}; }
}

export function readPostsMeta(postsRoot) {
  const out = [];
  for (const lang of LANGS) {
    const dir = join(postsRoot, lang);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md')) continue;
      const fm = readFrontmatter(join(dir, name));
      if (fm.draft === true) continue;
      out.push({
        lang,
        slug: name.replace(/\.md$/, ''),
        tags: Array.isArray(fm.tags) ? fm.tags.map(String) : [],
        region: fm.region ? String(fm.region) : undefined,
        scope: fm.scope ? String(fm.scope) : undefined,
        pubDate: toDay(fm.pubDate),
        updatedDate: toDay(fm.updatedDate),
      });
    }
  }
  return out;
}

/** 같은 언어 안에서 대소문자만 다른 태그 묶음. 태그 URL 이 두 개로 갈라지므로 빌드 전에 막는다. */
export function findTagCaseConflicts(postsRoot) {
  const conflicts = [];
  for (const lang of LANGS) {
    const byLower = new Map();
    for (const p of readPostsMeta(postsRoot).filter((p) => p.lang === lang)) {
      for (const tag of p.tags) {
        const k = tag.toLowerCase();
        if (!byLower.has(k)) byLower.set(k, new Set());
        byLower.get(k).add(tag);
      }
    }
    for (const variants of byLower.values()) {
      if (variants.size > 1) conflicts.push({ lang, variants: [...variants].sort() });
    }
  }
  return conflicts;
}

/**
 * 사이트맵 URL → lastmod(YYYY-MM-DD). 글은 updatedDate ?? pubDate, 목록 페이지는 포함된 글 중 최신 날짜.
 * 고정 페이지(about 등)나 모르는 URL 은 undefined 를 돌려준다(lastmod 생략).
 */
export function sitemapLastmod(postsRoot) {
  const posts = readPostsMeta(postsRoot);
  const dateOf = (p) => p.updatedDate ?? p.pubDate;
  const newest = (list) => list.map(dateOf).filter(Boolean).sort().at(-1);
  return (url) => {
    let path;
    try { path = decodeURIComponent(new URL(url).pathname); } catch { return undefined; }
    let lang = DEFAULT_LANG;
    const m = path.match(/^\/(en|ja)(\/|$)/);
    if (m) { lang = m[1]; path = path.slice(m[1].length + 1) || '/'; }
    const mine = posts.filter((p) => p.lang === lang);
    const seg = path.split('/').filter(Boolean);
    if (seg.length === 0) return newest(mine);
    if (seg[0] === 'posts' && seg[1]) return newest(mine.filter((p) => p.slug === seg[1]));
    if (seg[0] === 'tags' && seg[1]) return newest(mine.filter((p) => p.tags.includes(seg[1])));
    if (seg[0] === 'regions' && seg[1]) return newest(mine.filter((p) => p.region === seg[1]));
    if (seg[0] === 'domestic' || seg[0] === 'overseas') return newest(mine.filter((p) => p.scope === seg[0]));
    return undefined;
  };
}
