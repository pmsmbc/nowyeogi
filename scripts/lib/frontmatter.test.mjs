import { describe, it, expect } from 'vitest';
import { buildFrontmatter, serializePost, noteToComment } from './frontmatter.mjs';
import { parseNote } from './note.mjs';

const images = [
  { src: '/images/s/00.webp', alt: '', width: 1600, height: 1000, isCover: true },
  { src: '/images/s/01.webp', alt: '', width: 1200, height: 1600, isCover: false },
];

describe('buildFrontmatter', () => {
  it('note와 이미지로 초안을 만든다', () => {
    const note = parseNote('지역: 제주\n날짜: 2026-09-01\n종류: 맛집\n[장소]\n이름: A\n종류: 카페\n메뉴: 라떼 5000');
    const fm = buildFrontmatter({ note, regionKey: 'jeju', regionScope: 'domestic', images, today: '2026-09-09' });
    expect(fm).toMatchObject({ title: '', description: '', pubDate: '2026-09-01', scope: 'domestic', region: 'jeju', type: 'food', cover: '/images/s/00.webp', tags: [], draft: true });
    expect(fm.images).toEqual([{ src: '/images/s/00.webp', alt: '', width: 1600, height: 1000 }, { src: '/images/s/01.webp', alt: '', width: 1200, height: 1600 }]);
    expect(fm.places).toEqual([{ name: 'A', kind: 'cafe', menu: [{ name: '라떼', price: '5,000원' }] }]);
  });
  it('날짜가 없으면 today, 지역을 모르면 UNKNOWN, cover가 없으면 첫 이미지', () => {
    const note = parseNote('');
    const fm = buildFrontmatter({ note, regionKey: undefined, regionScope: undefined, images: [images[1]], today: '2026-09-09' });
    expect(fm.pubDate).toBe('2026-09-09');
    expect(fm.region).toBe('UNKNOWN');
    expect(fm.scope).toBe('domestic');
    expect(fm.cover).toBe('/images/s/01.webp');
    expect(fm.type).toBe('travel');
  });
  it('종류가 없고 장소가 전부 식당/카페면 food', () => {
    const note = parseNote('[장소]\n이름: A\n종류: 식당');
    expect(buildFrontmatter({ note, regionKey: 'jeju', regionScope: 'domestic', images, today: '2026-09-09' }).type).toBe('food');
  });
});

describe('serializePost / noteToComment', () => {
  it('YAML frontmatter와 본문을 합친다', () => {
    const out = serializePost({ title: '', draft: true, tags: [] }, '본문');
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toContain('draft: true');
    expect(out.trim().endsWith('본문')).toBe(true);
  });
  it('원문을 HTML 주석으로 감싸고 --> 를 무력화한다', () => {
    const c = noteToComment('a --> b');
    expect(c.startsWith('<!--')).toBe(true);
    expect(c.endsWith('-->')).toBe(true);
    expect(c.slice(4, -3)).not.toContain('-->');
  });
  it('연속된 --- 처럼 반복된 하이픈도 완전히 무력화한다', () => {
    const c = noteToComment('제주공항 ---> 애월');
    const inner = c.slice(4, -3);
    expect(inner).not.toContain('-->');
    expect(inner).not.toContain('--');
  });
});
