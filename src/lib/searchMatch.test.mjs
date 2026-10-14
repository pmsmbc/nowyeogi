import { describe, it, expect } from 'vitest';
import { search, terms } from './searchMatch.mjs';

const items = [
  { t: '명동 맛집 정리: 칼국수, 돈가스 (2026)', d: '명동 골목 식당', g: ['명동', '맛집'], r: '서울', p: '2026-09-10' },
  { t: '구리 코스모스 축제 2026', d: '구리한강시민공원', g: ['구리', '코스모스'], r: '경기', p: '2026-10-02' },
  { t: '부산 여행 총정리', d: '동네 구분, 교통', g: ['부산'], r: '부산', p: '2026-09-01' },
];

describe('search', () => {
  it('부분 문자열로 찾고 제목 일치를 앞세운다', () => {
    expect(search(items, '명동').map((i) => i.t)[0]).toContain('명동');
    expect(search(items, '코스모').length).toBe(1);
  });
  it('조각이 모두 들어 있어야 한다', () => {
    expect(search(items, '명동 축제')).toHaveLength(0);
    expect(search(items, '구리 축제')).toHaveLength(1);
  });
  it('대소문자·전각·공백을 무시한다', () => {
    expect(terms('  Ｂusan  ')).toEqual(['busan']);
    expect(search(items, '부산  여행')).toHaveLength(1);
  });
  it('빈 검색어는 빈 결과', () => {
    expect(search(items, '   ')).toEqual([]);
  });
});
