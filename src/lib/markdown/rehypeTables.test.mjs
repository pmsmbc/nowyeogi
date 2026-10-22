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

  const cell = (tag, text) => el(tag, [{ type: 'text', value: text }]);
  const wide = () =>
    el('table', [
      el('thead', [el('tr', [cell('th', '날짜'), cell('th', '시간'), cell('th', '장소'), cell('th', '출연')])]),
      el('tbody', [
        el('tr', [cell('td', '10월 17일(토)'), cell('td', '19:30~20:30'), cell('td', '정릉 정자각'), cell('td', '나윤선, 보얀 지 & 첼로가야금')]),
        el('tr', [cell('td', '聖水1街2洞の1階月額換算賃料（2026年第2四半期）'), cell('td', '3.5%'), cell('td', '서울'), cell('td', '설명')]),
      ]),
    ]);

  it('3열 이상 표에서 짧은 첫 칸과 시간 칸은 줄바꿈하지 않는다', () => {
    const tree = { type: 'root', children: [wide()] };
    run(tree);
    const body = tree.children[0].children[0].children[1];
    const [date, time, place, cast] = body.children[0].children;
    expect(date.properties.className).toContain('nowrap');
    expect(time.properties.className).toContain('nowrap');
    expect(place.properties.className ?? []).not.toContain('nowrap');
    expect(cast.properties.className ?? []).not.toContain('nowrap');
  });

  it('긴 첫 칸은 그대로 두고, 숫자만 있는 칸은 어느 열이든 줄바꿈하지 않는다', () => {
    const tree = { type: 'root', children: [wide()] };
    run(tree);
    const [long, pct] = tree.children[0].children[0].children[1].children[1].children;
    expect(long.properties.className ?? []).not.toContain('nowrap');
    expect(pct.properties.className).toContain('nowrap');
  });

  it('4열 이상 표에는 data-cols 를 붙이고, 3열 표는 첫 칸만 묶는다', () => {
    const wideTree = { type: 'root', children: [wide()] };
    run(wideTree);
    expect(wideTree.children[0].children[0].properties.dataCols).toBe('4');
    const three = el('table', [
      el('thead', [el('tr', [cell('th', '구분'), cell('th', '시간'), cell('th', '비고')])]),
      el('tbody', [el('tr', [cell('td', '평일'), cell('td', '19:30~20:30'), cell('td', '설명이 긴 칸')])]),
    ]);
    const tree = { type: 'root', children: [three] };
    run(tree);
    const t = tree.children[0].children[0];
    expect(t.properties.dataCols).toBeUndefined();
    const [first, time] = t.children[1].children[0].children;
    expect(first.properties.className).toContain('nowrap');
    expect(time.properties.className ?? []).not.toContain('nowrap');
  });

  it('2열 표에는 nowrap 을 붙이지 않는다', () => {
    const tree = { type: 'root', children: [table()] };
    run(tree);
    const td = tree.children[0].children[0].children[1].children[0].children[0];
    expect(td.properties.className ?? []).not.toContain('nowrap');
  });

  it('표가 없는 문서는 건드리지 않는다', () => {
    const tree = { type: 'root', children: [el('p', [{ type: 'text', value: '그냥 문장' }])] };
    run(tree);
    expect(tree.children[0].tagName).toBe('p');
  });
});
