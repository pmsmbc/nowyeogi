import { describe, it, expect } from 'vitest';
import { rehypeTables } from './rehypeTables.mjs';

const el = (tagName, children = [], properties = {}) => ({ type: 'element', tagName, properties, children });
const table = () =>
  el('table', [
    el('thead', [el('tr', [el('th', [{ type: 'text', value: '구분' }]), el('th', [{ type: 'text', value: '요금' }])])]),
    el('tbody', [el('tr', [el('td', [{ type: 'text', value: '지하철' }]), el('td', [{ type: 'text', value: '1,400원' }])])]),
  ]);
const run = (tree, path = '/x/src/content/posts/ko/a.md') => {
  rehypeTables()(tree, { path });
  return tree;
};

describe('rehypeTables', () => {
  it('표를 가로 스크롤 영역으로 감싼다', () => {
    const tree = { type: 'root', children: [table()] };
    run(tree);
    const wrap = tree.children[0];
    expect(wrap.tagName).toBe('div');
    expect(wrap.properties.className).toContain('table-wrap');
    expect(wrap.children[0].tagName).toBe('table');
  });

  it('키보드로 스크롤할 수 있게 이름과 tabindex를 준다', () => {
    const tree = { type: 'root', children: [table()] };
    run(tree);
    const wrap = tree.children[0];
    expect(wrap.properties.role).toBe('region');
    expect(wrap.properties.tabIndex).toBe(0);
    expect(wrap.properties.ariaLabel).toBe('표, 좌우로 스크롤할 수 있습니다');
  });

  it('영어 글이면 영어 이름을 쓴다', () => {
    const tree = { type: 'root', children: [table()] };
    run(tree, '/x/src/content/posts/en/a.md');
    expect(tree.children[0].properties.ariaLabel).toBe('Table, scrollable horizontally');
  });

  it('머리글 칸에 scope="col"을 붙인다', () => {
    const tree = { type: 'root', children: [table()] };
    run(tree);
    const headers = tree.children[0].children[0].children[0].children[0].children;
    expect(headers).toHaveLength(2);
    for (const th of headers) expect(th.properties.scope).toBe('col');
  });

  it('이미 있는 scope는 덮어쓰지 않는다', () => {
    const t = table();
    t.children[0].children[0].children[0].properties.scope = 'row';
    const tree = { type: 'root', children: [t] };
    run(tree);
    expect(tree.children[0].children[0].children[0].children[0].children[0].properties.scope).toBe('row');
  });

  it('표가 없는 문서는 건드리지 않는다', () => {
    const tree = { type: 'root', children: [el('p', [{ type: 'text', value: '그냥 문장' }])] };
    run(tree);
    expect(tree.children[0].tagName).toBe('p');
  });
});
