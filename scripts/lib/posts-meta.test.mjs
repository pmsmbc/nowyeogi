import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPostsMeta, findTagCaseConflicts, sitemapLastmod } from './posts-meta.mjs';

function makePosts(spec) {
  const root = mkdtempSync(join(tmpdir(), 'posts-meta-'));
  for (const [lang, posts] of Object.entries(spec)) {
    mkdirSync(join(root, lang), { recursive: true });
    for (const [slug, p] of Object.entries(posts)) {
      const lines = ['---', `title: "${slug}"`, `pubDate: ${p.pubDate ?? '2026-09-01'}`];
      if (p.updatedDate) lines.push(`updatedDate: ${p.updatedDate}`);
      lines.push(`scope: ${p.scope ?? 'domestic'}`, `region: ${p.region ?? 'seoul'}`);
      lines.push(`tags: [${(p.tags ?? []).map((t) => JSON.stringify(t)).join(', ')}]`, p.draft ? 'draft: true' : 'draft: false', '---', '', '본문');
      writeFileSync(join(root, lang, `${slug}.md`), lines.join('\n'));
    }
  }
  return root;
}

describe('readPostsMeta', () => {
  it('언어·slug·태그·날짜를 읽고 draft 를 뺀다', () => {
    const root = makePosts({ ko: { a: { tags: ['x'], pubDate: '2026-10-01' }, b: { draft: true } }, en: { a: {} } });
    const meta = readPostsMeta(root);
    expect(meta.map((m) => `${m.lang}/${m.slug}`).sort()).toEqual(['en/a', 'ko/a']);
    const a = meta.find((m) => m.lang === 'ko');
    expect(a.tags).toEqual(['x']);
    expect(a.pubDate).toBe('2026-10-01');
  });
});

describe('findTagCaseConflicts', () => {
  it('같은 언어 안에서 대소문자만 다른 태그를 찾는다', () => {
    const root = makePosts({
      en: { a: { tags: ['Nogari Alley'] }, b: { tags: ['Nogari alley', 'Jeju'] }, c: { tags: ['Jeju'] } },
      ko: { a: { tags: ['BIFF'] } },
    });
    expect(findTagCaseConflicts(root)).toEqual([{ lang: 'en', variants: ['Nogari Alley', 'Nogari alley'] }]);
  });
  it('없으면 빈 배열', () => {
    expect(findTagCaseConflicts(makePosts({ ko: { a: { tags: ['x'] } } }))).toEqual([]);
  });
});

describe('sitemapLastmod', () => {
  const root = makePosts({
    ko: {
      old: { tags: ['제주'], pubDate: '2026-09-01', region: 'jeju' },
      mid: { tags: ['제주', '카페'], pubDate: '2026-09-20', updatedDate: '2026-10-05', region: 'jeju' },
      new: { tags: ['서울'], pubDate: '2026-10-10', region: 'seoul', scope: 'domestic' },
      abroad: { tags: ['도쿄'], pubDate: '2026-09-15', region: 'tokyo', scope: 'overseas' },
    },
    en: { old: { tags: ['Jeju'], pubDate: '2026-09-02', region: 'jeju' } },
  });
  const lastmod = sitemapLastmod(root);
  const u = (p) => `https://nowyeogi.com${p}`;
  it('글은 updatedDate 가 있으면 그것, 없으면 pubDate', () => {
    expect(lastmod(u('/posts/mid/'))).toBe('2026-10-05');
    expect(lastmod(u('/posts/old/'))).toBe('2026-09-01');
    expect(lastmod(u('/en/posts/old/'))).toBe('2026-09-02');
  });
  it('태그·지역·구분 목록은 포함된 글 중 가장 최근 날짜', () => {
    expect(lastmod(u('/tags/%EC%A0%9C%EC%A3%BC/'))).toBe('2026-10-05');
    expect(lastmod(u('/regions/jeju/'))).toBe('2026-10-05');
    expect(lastmod(u('/regions/jeju/2/'))).toBe('2026-10-05');
    expect(lastmod(u('/domestic/'))).toBe('2026-10-10');
    expect(lastmod(u('/overseas/'))).toBe('2026-09-15');
    expect(lastmod(u('/en/regions/jeju/'))).toBe('2026-09-02');
  });
  it('홈은 그 언어의 가장 최근 글, 고정 페이지는 없음', () => {
    expect(lastmod(u('/'))).toBe('2026-10-10');
    expect(lastmod(u('/en/'))).toBe('2026-09-02');
    expect(lastmod(u('/about/'))).toBeUndefined();
    expect(lastmod(u('/posts/none/'))).toBeUndefined();
  });
});
