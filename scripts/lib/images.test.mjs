import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { planImages, convertImage } from './images.mjs';

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

describe('convertImage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'img-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('긴 변을 1600으로 줄이고 webp로 저장한다', async () => {
    const src = join(dir, 'big.jpg');
    await sharp({ create: { width: 3200, height: 2000, channels: 3, background: '#8ec5f0' } }).jpeg().toFile(src);
    const out = join(dir, '01.webp');
    const info = await convertImage(src, out);
    expect(info).toEqual({ width: 1600, height: 1000 });
    expect(existsSync(out)).toBe(true);
    expect((await sharp(out).metadata()).format).toBe('webp');
  });
  it('작은 이미지는 키우지 않는다', async () => {
    const src = join(dir, 'small.png');
    await sharp({ create: { width: 800, height: 600, channels: 3, background: '#fff' } }).png().toFile(src);
    expect(await convertImage(src, join(dir, '02.webp'))).toEqual({ width: 800, height: 600 });
  });
});
