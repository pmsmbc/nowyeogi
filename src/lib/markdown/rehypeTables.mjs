import { visit } from 'unist-util-visit';

const LABELS = {
  ko: '표, 좌우로 스크롤할 수 있습니다',
  en: 'Table, scrollable horizontally',
};

/**
 * 본문 표를 가로 스크롤 영역으로 감싸고(모바일 리플로), 머리글 칸에 scope를 붙인다.
 * tabindex를 주어 키보드로도 스크롤할 수 있게 한다.
 */
export function rehypeTables() {
  return (tree, file) => {
    const path = String(file?.path ?? file?.history?.[0] ?? '');
    const label = LABELS[/[\\/]en[\\/]/.test(path) ? 'en' : 'ko'];
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) return;
      if (parent.tagName === 'div' && (parent.properties?.className ?? []).includes('table-wrap')) return;
      visit(node, 'element', (cell) => {
        if (cell.tagName !== 'th') return;
        cell.properties = { ...cell.properties, scope: cell.properties?.scope ?? 'col' };
      });
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'], role: 'region', tabIndex: 0, ariaLabel: label },
        children: [node],
      };
      return index + 1;
    });
  };
}
