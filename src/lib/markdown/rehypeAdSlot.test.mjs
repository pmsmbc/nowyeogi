import { describe, it, expect } from 'vitest';
import { rehypeAdSlot } from './rehypeAdSlot.mjs';

const h2 = (text) => ({ type: 'element', tagName: 'h2', properties: {}, children: [{ type: 'text', value: text }] });
const p = () => ({ type: 'element', tagName: 'p', properties: {}, children: [] });
const tags = (tree) => tree.children.map((c) => c.tagName);

describe('rehypeAdSlot', () => {
  it('client와 slot이 있으면 두 번째 h2 앞에 광고를 넣는다', () => {
    const tree = { type: 'root', children: [p(), h2('a'), p(), h2('b'), p()] };
    rehypeAdSlot({ client: 'ca-pub-1', slot: '123' })(tree);
    expect(tags(tree)).toEqual(['p', 'h2', 'p', 'div', 'h2', 'p']);
    const ad = tree.children[3];
    expect(ad.properties.className).toContain('ad');
    const ins = ad.children.find((c) => c.tagName === 'ins');
    expect(ins.properties).toMatchObject({ dataAdClient: 'ca-pub-1', dataAdSlot: '123' });
  });
  it('h2가 하나뿐이면 넣지 않는다', () => {
    const tree = { type: 'root', children: [p(), h2('a'), p()] };
    rehypeAdSlot({ client: 'ca-pub-1', slot: '123' })(tree);
    expect(tags(tree)).toEqual(['p', 'h2', 'p']);
  });
  it('client가 비어 있으면 아무것도 하지 않는다', () => {
    const tree = { type: 'root', children: [h2('a'), h2('b')] };
    rehypeAdSlot({ client: '', slot: '123' })(tree);
    expect(tags(tree)).toEqual(['h2', 'h2']);
  });
});
