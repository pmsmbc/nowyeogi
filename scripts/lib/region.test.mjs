import { describe, it, expect } from 'vitest';
import { guessRegion } from './region.mjs';

const regions = {
  jeju: { ko: '제주', en: 'Jeju', aliases: ['애월', '서귀포'] },
  seoul: { ko: '서울', en: 'Seoul', aliases: [] },
  tokyo: { ko: '도쿄', en: 'Tokyo', aliases: ['동경'] },
};

describe('guessRegion', () => {
  it('한글 이름, 별칭, 영어 이름을 찾는다', () => {
    expect(guessRegion('제주 애월', regions)).toBe('jeju');
    expect(guessRegion('서귀포 올레', regions)).toBe('jeju');
    expect(guessRegion('Tokyo Shibuya', regions)).toBe('tokyo');
    expect(guessRegion('동경 여행', regions)).toBe('tokyo');
  });
  it('여러 개가 걸리면 먼저 나오는 것을 고른다', () => {
    expect(guessRegion('서울에서 제주로', regions)).toBe('seoul');
  });
  it('없으면 undefined', () => {
    expect(guessRegion('화성', regions)).toBeUndefined();
    expect(guessRegion('', regions)).toBeUndefined();
  });
});
