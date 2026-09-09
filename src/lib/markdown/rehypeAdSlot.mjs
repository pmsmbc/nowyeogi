/** 두 번째 최상위 h2 앞에 AdSense 인아티클 광고를 삽입한다. */
export function rehypeAdSlot({ client = '', slot = '' } = {}) {
  return (tree, file) => {
    if (!client || !slot) return;
    const p = String(file?.path ?? file?.history?.[0] ?? '');
    const label = /[\\/]en[\\/]/.test(p) ? 'Advertisement' : '광고';
    let seen = 0;
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== 'element' || node.tagName !== 'h2') continue;
      seen++;
      if (seen < 2) continue;
      tree.children.splice(i, 0, adNode(client, slot, label));
      return;
    }
  };
}

function adNode(client, slot, label) {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['ad'], dataAd: 'in-article' },
    children: [
      { type: 'element', tagName: 'span', properties: { className: ['ad-label'] }, children: [{ type: 'text', value: label }] },
      {
        type: 'element',
        tagName: 'ins',
        properties: { className: ['adsbygoogle'], style: 'display:block; text-align:center;', dataAdLayout: 'in-article', dataAdFormat: 'fluid', dataAdClient: client, dataAdSlot: slot },
        children: [],
      },
      { type: 'element', tagName: 'script', properties: {}, children: [{ type: 'text', value: '(adsbygoogle = window.adsbygoogle || []).push({});' }] },
    ],
  };
}
