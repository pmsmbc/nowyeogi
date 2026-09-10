import { describe, it, expect } from 'vitest';
import { rehypeFigures } from './rehypeFigures.mjs';

const img = (src, alt) => ({ type: 'element', tagName: 'img', properties: { src, alt }, children: [] });
const p = (...children) => ({ type: 'element', tagName: 'p', properties: {}, children });
const run = (tree, frontmatter = {}, path = '/x/src/content/posts/ko/a.md') => {
  rehypeFigures()(tree, { path, data: { astro: { frontmatter } } });
  return tree;
};

describe('rehypeFigures', () => {
  it('img만 있는 p를 figure로 바꾸고 alt를 캡션으로 쓴다', () => {
    const tree = { type: 'root', children: [p(img('/images/a/01.webp', '바다'))] };
    run(tree, { images: [{ src: '/images/a/01.webp', width: 1600, height: 1000 }] });
    const fig = tree.children[0];
    expect(fig.tagName).toBe('figure');
    expect(fig.children[0].tagName).toBe('img');
    expect(fig.children[0].properties).toMatchObject({ loading: 'lazy', decoding: 'async', width: 1600, height: 1000 });
    expect(fig.children[1].tagName).toBe('figcaption');
    // 설명은 img의 alt와 같으므로 화면에만 보이고 낭독은 alt 한 번으로 끝난다
    expect(fig.children[1].children[0].properties.ariaHidden).toBe('true');
    expect(fig.children[1].children[0].children[0].value).toBe('바다');
  });
  it('credit 이 있으면 캡션에 출처 링크를 붙인다', () => {
    const tree = { type: 'root', children: [p(img('/images/a/02.webp', '박물관 전경'))] };
    run(tree, { images: [{ src: '/images/a/02.webp', credit: 'Kim, CC BY-SA 4.0, via Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:x.jpg' }] });
    const cap = tree.children[0].children[1];
    expect(cap.tagName).toBe('figcaption');
    expect(cap.children[0].children[0].value).toBe('박물관 전경');
    expect(cap.children[2].tagName).toBe('a');
    expect(cap.children[2].properties.href).toBe('https://commons.wikimedia.org/wiki/File:x.jpg');
    expect(cap.children[2].children[0].value).toBe('사진: Kim, CC BY-SA 4.0, via Wikimedia Commons');
    // 새 창으로 열리는 링크임을 화면 낭독기에 알린다
    const notice = cap.children[2].children[1];
    expect(notice.properties.className).toContain('visually-hidden');
    expect(notice.children[0].value).toBe(' (새 창에서 열림)');
  });
  it('alt가 없으면 figcaption을 만들지 않는다', () => {
    const tree = { type: 'root', children: [p(img('/x.webp', ''))] };
    run(tree);
    expect(tree.children[0].children).toHaveLength(1);
  });
  it('영어 글이면 출처 라벨도 영어로 쓴다', () => {
    const tree = { type: 'root', children: [p(img('/images/a/03.webp', 'A museum'))] };
    run(tree, { images: [{ src: '/images/a/03.webp', credit: 'Kim, CC BY-SA 4.0', creditUrl: 'https://example.org/x' }] }, '/x/src/content/posts/en/a.md');
    const cap = tree.children[0].children[1];
    expect(cap.children[2].children[0].value).toBe('Photo: Kim, CC BY-SA 4.0');
    expect(cap.children[2].children[1].children[0].value).toBe(' (opens in a new window)');
  });
  it('텍스트가 섞인 p는 건드리지 않는다', () => {
    const tree = { type: 'root', children: [p({ type: 'text', value: '앞' }, img('/x.webp', 'a'))] };
    run(tree);
    expect(tree.children[0].tagName).toBe('p');
  });
});
