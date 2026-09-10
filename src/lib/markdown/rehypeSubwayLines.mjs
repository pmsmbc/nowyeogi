import { visit } from 'unist-util-visit';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LINES = JSON.parse(readFileSync(fileURLToPath(new URL('../../data/subway.json', import.meta.url)), 'utf8'));
const PATTERN = /\[\[line:([a-z0-9-]+)\]\]/gi;

/** 본문의 [[line:4]] 를 노선 색 배지(<span class="tline">)로 바꾼다. 라벨 언어는 파일 경로(/en/)로 정한다. */
export function rehypeSubwayLines() {
  return (tree, file) => {
    const p = String(file?.path ?? file?.history?.[0] ?? '');
    const lang = /[\\/]en[\\/]/.test(p) ? 'en' : 'ko';
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined || !PATTERN.test(node.value)) return;
      PATTERN.lastIndex = 0;
      const out = [];
      let last = 0;
      for (const m of node.value.matchAll(PATTERN)) {
        const key = m[1].toLowerCase();
        const line = LINES[key];
        if (m.index > last) out.push({ type: 'text', value: node.value.slice(last, m.index) });
        if (line) {
          out.push({
            type: 'element',
            tagName: 'span',
            properties: { className: ['tline'], style: `--tline:${line.color}`, title: line[lang] },
            children: [{ type: 'text', value: line[lang] }],
          });
        } else {
          out.push({ type: 'text', value: m[0] });
        }
        last = m.index + m[0].length;
      }
      if (last < node.value.length) out.push({ type: 'text', value: node.value.slice(last) });
      // 인접한 text 노드는 합친다(모르는 노선만 있으면 원래 노드 하나로 돌아간다)
      const merged = [];
      for (const n of out) {
        const prev = merged[merged.length - 1];
        if (n.type === 'text' && prev?.type === 'text') prev.value += n.value;
        else merged.push(n);
      }
      parent.children.splice(index, 1, ...merged);
      return index + merged.length;
    });
  };
}
