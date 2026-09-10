import { describe, it, expect } from 'vitest';
import { rehypeFigures } from './rehypeFigures.mjs';

const img = (src, alt) => ({ type: 'element', tagName: 'img', properties: { src, alt }, children: [] });
const p = (...children) => ({ type: 'element', tagName: 'p', properties: {}, children });
const run = (tree, frontmatter = {}) => {
  rehypeFigures()(tree, { data: { astro: { frontmatter } } });
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
    expect(fig.children[1].children[0].value).toBe('바다');
  });
  it('credit 이 있으면 캡션에 출처 링크를 붙인다', () => {
    const tree = { type: 'root', children: [p(img('/images/a/02.webp', '박물관 전경'))] };
    run(tree, { images: [{ src: '/images/a/02.webp', credit: 'Kim, CC BY-SA 4.0, via Wikimedia Commons', creditUrl: 'https://commons.wikimedia.org/wiki/File:x.jpg' }] });
    const cap = tree.children[0].children[1];
    expect(cap.tagName).toBe('figcaption');
    expect(cap.children[0].value).toBe('박물관 전경');
    expect(cap.children[2].tagName).toBe('a');
    expect(cap.children[2].properties.href).toBe('https://commons.wikimedia.org/wiki/File:x.jpg');
    expect(cap.children[2].children[0].value).toBe('사진: Kim, CC BY-SA 4.0, via Wikimedia Commons');
  });
  it('alt가 없으면 figcaption을 만들지 않는다', () => {
    const tree = { type: 'root', children: [p(img('/x.webp', ''))] };
    run(tree);
    expect(tree.children[0].children).toHaveLength(1);
  });
  it('텍스트가 섞인 p는 건드리지 않는다', () => {
    const tree = { type: 'root', children: [p({ type: 'text', value: '앞' }, img('/x.webp', 'a'))] };
    run(tree);
    expect(tree.children[0].tagName).toBe('p');
  });
});
