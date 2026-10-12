import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { thinTagPaths, isThinTag, TAG_INDEX_MIN_POSTS } from './thin-tags.mjs';

function makePosts(spec) {
  const root = mkdtempSync(join(tmpdir(), 'thin-tags-'));
  for (const [lang, posts] of Object.entries(spec)) {
    mkdirSync(join(root, lang), { recursive: true });
    for (const [slug, { tags, draft }] of Object.entries(posts)) {
      const fm = ['---', `title: "${slug}"`, `tags: [${tags.map((t) => JSON.stringify(t)).join(', ')}]`, draft ? 'draft: true' : 'draft: false', '---', '', '본문'].join('\n');
      writeFileSync(join(root, lang, `${slug}.md`), fm);
    }
  }
  return root;
}

describe('isThinTag', () => {
  it('기준 미만이면 얇은 태그', () => {
    expect(TAG_INDEX_MIN_POSTS).toBe(2);
    expect(isThinTag(1)).toBe(true);
    expect(isThinTag(2)).toBe(false);
  });
});

describe('thinTagPaths', () => {
  it('언어별로 글 1편짜리 태그의 경로만 돌려준다', () => {
    const root = makePosts({
      ko: { a: { tags: ['제주', '카페'] }, b: { tags: ['제주'] } },
      en: { a: { tags: ['Jeju', '3 days in Seoul'] }, b: { tags: ['Jeju'] } },
      ja: { a: { tags: ['済州'] } },
    });
    const thin = thinTagPaths(root);
    expect(thin.has('/tags/카페/')).toBe(true);
    expect(thin.has('/tags/제주/')).toBe(false);
    expect(thin.has('/en/tags/3 days in Seoul/')).toBe(true);
    expect(thin.has('/en/tags/Jeju/')).toBe(false);
    expect(thin.has('/ja/tags/済州/')).toBe(true);
    expect(thin.size).toBe(3);
  });
  it('draft 글은 세지 않는다', () => {
    const root = makePosts({ ko: { a: { tags: ['x'] }, b: { tags: ['x'], draft: true } } });
    expect(thinTagPaths(root).has('/tags/x/')).toBe(true);
  });
  it('sitemap URL 을 디코드해서 비교하는 filter 를 만든다', () => {
    const root = makePosts({ ko: { a: { tags: ['카페'] } }, en: { a: { tags: ['3 days in Seoul', 'Jeju'] }, b: { tags: ['Jeju'] } } });
    const { sitemapFilter } = thinTagPaths(root, { withFilter: true });
    expect(sitemapFilter('https://nowyeogi.com/tags/%EC%B9%B4%ED%8E%98/')).toBe(false);
    expect(sitemapFilter('https://nowyeogi.com/en/tags/3%20days%20in%20Seoul/')).toBe(false);
    expect(sitemapFilter('https://nowyeogi.com/en/tags/Jeju/')).toBe(true);
    expect(sitemapFilter('https://nowyeogi.com/posts/a/')).toBe(true);
  });
});
