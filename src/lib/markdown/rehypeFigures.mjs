import { visit } from 'unist-util-visit';

/** p > img 만 있는 문단을 figure로 바꾸고 lazy/width/height를 붙인다. */
export function rehypeFigures() {
  return (tree, file) => {
    const images = file?.data?.astro?.frontmatter?.images ?? [];
    const dims = new Map(images.map((i) => [i.src, i]));
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || !parent || index === undefined) return;
      const kids = node.children.filter((c) => !(c.type === 'text' && c.value.trim() === ''));
      if (kids.length !== 1 || kids[0].tagName !== 'img') return;
      const img = kids[0];
      const meta = dims.get(img.properties.src);
      img.properties.loading = 'lazy';
      img.properties.decoding = 'async';
      if (meta?.width && meta?.height) {
        img.properties.width = meta.width;
        img.properties.height = meta.height;
      }
      const alt = String(img.properties.alt ?? '').trim();
      const children = [img];
      const cap = [];
      if (alt) cap.push({ type: 'text', value: alt });
      if (meta?.credit) {
        if (cap.length) cap.push({ type: 'text', value: ' · ' });
        const label = { type: 'text', value: `사진: ${meta.credit}` };
        cap.push(meta.creditUrl
          ? { type: 'element', tagName: 'a', properties: { href: meta.creditUrl, target: '_blank', rel: 'noopener noreferrer nofollow', className: ['credit'] }, children: [label] }
          : { type: 'element', tagName: 'span', properties: { className: ['credit'] }, children: [label] });
      }
      if (cap.length) children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: cap });
      parent.children[index] = { type: 'element', tagName: 'figure', properties: {}, children };
    });
  };
}
