import { visit } from 'unist-util-visit';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
const LINES = read('../../data/subway.json');
const BUSES = read('../../data/bus.json');
const PATTERN = /\[\[(line|bus):([a-z0-9-]+)(?::([a-z0-9-]+))?\]\]/gi;

/** 번호만 준 버스의 종류를 서울 버스 번호 체계로 추정한다. */
export function guessBusType(no) {
  if (/^6\d{3}$/.test(no)) return 'airport';   // 6000번대 공항버스
  if (/^9\d{3}$/.test(no)) return 'red';       // 9000번대 광역
  if (/^\d{4}$/.test(no)) return 'green';      // 네 자리 지선
  if (/^\d{3}$/.test(no)) return 'blue';       // 세 자리 간선
  if (/^\d{2}$/.test(no)) return 'yellow';     // 두 자리 순환
  return 'blue';
}

const BADGE_DARK = '#1a1a1a';
const srgb = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const channel = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = (hex) => { const [r, g, b] = srgb(hex).map(channel); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** 배지 배경색에 대해 WCAG 대비가 더 높은 글자색(흰색 또는 짙은 회색)을 고른다. */
export function badgeForeground(color) {
  return contrast(BADGE_DARK, color) > contrast('#ffffff', color) ? BADGE_DARK : '#ffffff';
}

function badge(color, label, title) {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['tline'], style: `--tline:${color};--tline-fg:${badgeForeground(color)}`, title },
    children: [{ type: 'text', value: label }],
  };
}

/**
 * 본문의 [[line:4]] 와 [[bus:6001]] / [[bus:blue:400]] 을 노선 색 배지로 바꾼다.
 * 라벨 언어는 파일 경로(/en/)로 정한다.
 */
export function rehypeTransitBadges() {
  return (tree, file) => {
    const p = String(file?.path ?? file?.history?.[0] ?? '');
    const lang = /[\\/]en[\\/]/.test(p) ? 'en' : 'ko';
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === undefined || !PATTERN.test(node.value)) return;
      PATTERN.lastIndex = 0;
      const out = [];
      let last = 0;
      for (const m of node.value.matchAll(PATTERN)) {
        const [full, kind, a, b] = m;
        if (m.index > last) out.push({ type: 'text', value: node.value.slice(last, m.index) });
        let node2 = null;
        if (kind.toLowerCase() === 'line') {
          const line = LINES[a.toLowerCase()];
          if (line) node2 = badge(line.color, line[lang], line[lang]);
        } else {
          const no = (b ?? a).trim();
          const typeKey = (b ? a : guessBusType(no)).toLowerCase();
          const type = BUSES[typeKey];
          if (type) {
            const label = lang === 'en' ? `Bus ${no}` : `${no}번`;
            node2 = badge(type.color, label, type[lang]);
          }
        }
        out.push(node2 ?? { type: 'text', value: full });
        last = m.index + full.length;
      }
      if (last < node.value.length) out.push({ type: 'text', value: node.value.slice(last) });
      // 인접한 text 노드는 합친다(모르는 키만 있으면 원래 노드 하나로 돌아간다)
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
