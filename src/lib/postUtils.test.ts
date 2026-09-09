import { describe, it, expect } from 'vitest';
import { splitId, localePath, sortByDateDesc, pickRelated, collectTags, isPublished } from './postUtils';

describe('splitId', () => {
  it('언어와 slug를 분리한다', () => {
    expect(splitId('ko/jeju-aewol-cafe-2026-09')).toEqual({ lang: 'ko', slug: 'jeju-aewol-cafe-2026-09' });
    expect(splitId('en/tokyo')).toEqual({ lang: 'en', slug: 'tokyo' });
  });
  it('알 수 없는 언어면 throw', () => {
    expect(() => splitId('fr/x')).toThrow(/언어/);
    expect(() => splitId('nolang')).toThrow(/언어/);
  });
});

describe('localePath', () => {
  it('ko는 그대로, en은 /en 접두사', () => {
    expect(localePath('ko', '/posts/a/')).toBe('/posts/a/');
    expect(localePath('en', '/posts/a/')).toBe('/en/posts/a/');
    expect(localePath('en', '/')).toBe('/en/');
  });
});

describe('sortByDateDesc', () => {
  it('최신순으로 정렬하고 원본을 바꾸지 않는다', () => {
    const a = { data: { pubDate: new Date('2026-01-01') } };
    const b = { data: { pubDate: new Date('2026-03-01') } };
    const input = [a, b];
    expect(sortByDateDesc(input)).toEqual([b, a]);
    expect(input).toEqual([a, b]);
  });
});

describe('pickRelated', () => {
  const mk = (id: string, region: string, tags: string[]) => ({ id, data: { region, tags } });
  const cur = mk('ko/cur', 'jeju', ['카페', '바다']);
  const all = [
    cur,
    mk('ko/a', 'jeju', []),
    mk('ko/b', 'tokyo', ['카페']),
    mk('ko/c', 'busan', []),
    mk('ko/d', 'jeju', ['바다']),
  ];
  it('자기 자신을 제외하고 같은 지역, 태그 겹침 순으로 고른다', () => {
    expect(pickRelated(all, cur, 3).map((p) => p.id)).toEqual(['ko/d', 'ko/a', 'ko/b']);
  });
  it('n개를 넘지 않는다', () => {
    expect(pickRelated(all, cur, 1)).toHaveLength(1);
  });
});

describe('collectTags', () => {
  it('빈도 내림차순, 같으면 이름순', () => {
    const items = [{ data: { tags: ['b', 'a'] } }, { data: { tags: ['a'] } }, { data: { tags: ['c'] } }];
    expect(collectTags(items)).toEqual([
      { tag: 'a', count: 2 },
      { tag: 'b', count: 1 },
      { tag: 'c', count: 1 },
    ]);
  });
});

describe('isPublished', () => {
  it('draft는 dev에서만 보인다', () => {
    expect(isPublished({ draft: true }, true)).toBe(true);
    expect(isPublished({ draft: true }, false)).toBe(false);
    expect(isPublished({ draft: false }, false)).toBe(true);
  });
});
