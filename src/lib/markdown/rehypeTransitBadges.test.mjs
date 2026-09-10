import { describe, it, expect } from 'vitest';
import { rehypeTransitBadges, guessBusType } from './rehypeTransitBadges.mjs';

const p = (text) => ({ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: text }] });
const run = (text, path = '/x/src/content/posts/ko/a.md') => {
  const tree = { type: 'root', children: [p(text)] };
  rehypeTransitBadges()(tree, { path });
  return tree.children[0].children;
};

describe('rehypeTransitBadges — 지하철', () => {
  it('[[line:4]] 를 한국어 배지로 바꾼다', () => {
    const kids = run('이촌역은 [[line:4]] 이에요');
    expect(kids.map((k) => k.type)).toEqual(['text', 'element', 'text']);
    expect(kids[1].properties.className).toContain('tline');
    expect(kids[1].properties.style).toBe('--tline:#00A5DE');
    expect(kids[1].children[0].value).toBe('4호선');
  });
  it('영어 경로면 영어 라벨', () => {
    const kids = run('Take [[line:gyeongui]] or [[line:ARex]]', '/x/src/content/posts/en/a.md');
    expect(kids[1].children[0].value).toBe('Gyeongui-Jungang Line');
    expect(kids[3].children[0].value).toBe('AREX');
  });
  it('모르는 노선은 그대로 둔다', () => {
    const kids = run('[[line:moon]] 없음');
    expect(kids).toHaveLength(1);
    expect(kids[0].value).toBe('[[line:moon]] 없음');
  });
  it('배지가 없는 문단은 건드리지 않는다', () => {
    expect(run('그냥 문장')).toHaveLength(1);
  });
});

describe('guessBusType', () => {
  it('서울 버스 번호 체계로 종류를 추정한다', () => {
    expect(guessBusType('6001')).toBe('airport');
    expect(guessBusType('9401')).toBe('red');
    expect(guessBusType('7011')).toBe('green');
    expect(guessBusType('400')).toBe('blue');
    expect(guessBusType('01')).toBe('yellow');
  });
});

describe('rehypeTransitBadges — 버스', () => {
  it('[[bus:6001]] 을 공항버스 색 배지로 바꾼다', () => {
    const kids = run('공항에서 [[bus:6001]] 을 타요');
    expect(kids[1].properties.style).toBe('--tline:#1B3A6B');
    expect(kids[1].properties.title).toBe('공항버스');
    expect(kids[1].children[0].value).toBe('6001번');
  });
  it('종류를 직접 지정할 수 있다', () => {
    const kids = run('[[bus:green:6002]] 확인');
    expect(kids[0].properties.style).toBe('--tline:#53B332');
    expect(kids[0].children[0].value).toBe('6002번');
  });
  it('영어 경로면 Bus 번호 형식', () => {
    const kids = run('Take [[bus:400]] there', '/x/src/content/posts/en/a.md');
    expect(kids[1].children[0].value).toBe('Bus 400');
    expect(kids[1].properties.title).toBe('Trunk bus');
    expect(kids[1].properties.style).toBe('--tline:#3D5BAB');
  });
  it('모르는 종류는 그대로 둔다', () => {
    expect(run('[[bus:purple:1]] 끝')[0].value).toBe('[[bus:purple:1]] 끝');
  });
  it('지하철과 버스를 한 문단에서 함께 처리한다', () => {
    const kids = run('[[line:2]] 또는 [[bus:6002]]');
    expect(kids[0].children[0].value).toBe('2호선');
    expect(kids[2].children[0].value).toBe('6002번');
  });
});
