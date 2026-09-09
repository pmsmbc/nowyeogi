import { describe, it, expect } from 'vitest';
import { planImages } from './images.mjs';

describe('planImages', () => {
  it('이미지만 골라 이름순으로 번호를 매기고 cover는 00', () => {
    const plan = planImages(['IMG_10.jpg', 'IMG_2.JPG', 'note.txt', 'cover.png', 'x.heic', 'skip.gif']);
    expect(plan).toEqual([
      { source: 'cover.png', target: '00.webp', isCover: true },
      { source: 'IMG_2.JPG', target: '01.webp', isCover: false },
      { source: 'IMG_10.jpg', target: '02.webp', isCover: false },
      { source: 'x.heic', target: '03.webp', isCover: false },
    ]);
  });
  it('cover가 없으면 01부터', () => {
    expect(planImages(['b.jpg', 'a.jpg']).map((p) => p.target)).toEqual(['01.webp', '02.webp']);
  });
  it('빈 목록', () => {
    expect(planImages([])).toEqual([]);
  });
});
