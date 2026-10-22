import { visit } from 'unist-util-visit';
import { langFromPath } from './lang.mjs';

const LABELS = {
  ko: '표, 좌우로 스크롤할 수 있습니다',
  en: 'Table, scrollable horizontally',
  ja: '表、左右にスクロールできます',
};

/**
 * 본문 표를 가로 스크롤 영역으로 감싸고(모바일 리플로), 머리글 칸에 scope를 붙인다.
 * tabindex를 주어 키보드로도 스크롤할 수 있게 한다.
 */
const textOf = (n) => (n.type === 'text' ? n.value : (n.children ?? []).map(textOf).join(''));
const isCell = (n) => n.type === 'element' && (n.tagName === 'td' || n.tagName === 'th');
const NOWRAP_FIRST_MAX = 10; // 첫 칸이 이 글자 수 이하면("10월 17일(토)") 줄바꿈하지 않는다
const NUMERIC = /^[₩$]?[\d\s:~\-–.,]+(%|원|円|km|m|분|分|시간)?$/; // 시간·숫자(단위 하나까지)만 있는 칸("19:30~20:30", "1,000원", "3.5%")

/**
 * 3열 이상인 표에서 짧은 첫 칸과 시간·숫자 칸에 nowrap 클래스를 붙인다.
 * 좁은 화면에서 날짜가 세 줄로 꺾이던 문제 대응(2026-10-22). 긴 첫 칸(가게 이름 등)은 그대로 둔다.
 */
function markNowrapCells(table) {
  const rows = [];
  visit(table, 'element', (n) => { if (n.tagName === 'tr') rows.push(n); });
  const cols = Math.max(0, ...rows.map((r) => r.children.filter(isCell).length));
  // 4열 이상이면 좁은 화면에서 min-width 를 주어 가로 스크롤로 보여 준다(global.css 의 table[data-cols]). 칸을 억지로 좁히면 한 줄에 두세 글자만 남는다.
  if (cols >= 4) table.properties = { ...table.properties, dataCols: String(Math.min(cols, 6)) };
  if (cols < 3) return;
  for (const row of rows) {
    row.children.filter(isCell).forEach((cell, i) => {
      const text = textOf(cell).trim();
      if (!text) return;
      const short = i === 0 && text.length <= NOWRAP_FIRST_MAX;
      // 시간·숫자 칸은 표가 가로 스크롤되는(4열 이상) 경우에만 묶는다. 3열 표에서는 남은 칸이 너무 좁아진다.
      const numeric = cols >= 4 && text.length <= 14 && NUMERIC.test(text);
      if (!short && !numeric) return;
      const className = [...(cell.properties?.className ?? [])];
      if (!className.includes('nowrap')) className.push('nowrap');
      cell.properties = { ...cell.properties, className };
    });
  }
}

export function rehypeTables() {
  return (tree, file) => {
    const label = LABELS[langFromPath(file)];
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === undefined) return;
      if (parent.tagName === 'div' && (parent.properties?.className ?? []).includes('table-wrap')) return;
      visit(node, 'element', (cell) => {
        if (cell.tagName !== 'th') return;
        cell.properties = { ...cell.properties, scope: cell.properties?.scope ?? 'col' };
      });
      markNowrapCells(node);
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
