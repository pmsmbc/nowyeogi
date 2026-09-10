import { describe, it, expect } from 'vitest';
import { rehypeSubwayLines } from './rehypeSubwayLines.mjs';

const p = (text) => ({ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: text }] });
const run = (text, path = '/x/src/content/posts/ko/a.md') => {
  const tree = { type: 'root', children: [p(text)] };
  rehypeSubwayLines()(tree, { path });
  return tree.children[0].children;
};

describe('rehypeSubwayLines', () => {
  it('[[line:4]] 를 한국어 배지로 바꾼다', () => {
    const kids = run('이촌역은 [[line:4]] 이에요');
    expect(kids.map((k) => k.type)).toEqual(['text', 'element', 'text']);
    expect(kids[1].tagName).toBe('span');
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
