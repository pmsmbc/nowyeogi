// 이미지/ 폴더의 원본을 웹용 브랜드 자산으로 변환한다. 한 번 실행해 public/brand 를 커밋한다.
//
// 주의: 브리핑에 적힌 원본 파일명(Gemini_Generated_Image_rwf583rwf583rwf5-Photoroom.png,
// 로고.png, 상단 이미지.png)이 실제 이미지/ 폴더에는 존재하지 않았다. 폴더 안의 파일들을
// 육안으로 확인해 내용(투명 핀 마크 / 핀+커플+비행기 / 핀+"지금 여기는" 워드마크)으로
// 대응되는 실제 파일명을 아래처럼 매핑했다:
//   mark -> 파비콘.png (핀만, 투명 배경; 사용자가 지정한 파비콘 원본, 2400x1309)
//   hero -> 상단 이미지-Photoroom.png (핀 + "지금 여기는" 워드마크, 투명 배경)
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, '이미지');
const OUT = join(ROOT, 'public', 'brand');
mkdirSync(OUT, { recursive: true });

const mark = join(SRC, '파비콘.png');
const hero = join(SRC, '상단 이미지-Photoroom.png');
const heroEn = join(SRC, '상단이미지_영문.png');

// 투명 여백을 잘라낸 뒤 크기를 맞춘다
// compressionLevel:9, effort:10 — 기본값으로는 logo-mark.png가 300KB를 넘어(약 349KB) 최대 압축을 지정한다.
await sharp(mark).trim().resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, effort: 10 }).toFile(join(OUT, 'logo-mark.png'));
await sharp(mark).trim().resize({ width: 192, height: 192, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, effort: 10 }).toFile(join(OUT, 'logo-mark-192.png'));
await sharp(mark).trim().resize({ width: 64, height: 64, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, effort: 10 }).toFile(join(ROOT, 'public', 'favicon.png'));
// 히어로(한/영): 원본은 큰 캔버스 안에 그림이 작게 그려져 있어 투명 여백을 잘라낸 뒤
// 공통 캔버스에 다시 배치한다. 캔버스는 투명이어야 한다 — 이전에는 extend() 로
// 아이보리(#fbfaf7) 여백을 붙였는데, 상단 배경 그라데이션 위에서 흰 박스 라인처럼 보였다.
// 한/영 캔버스와 내용물 비율을 동일하게 맞춰 언어를 바꿔도 크기가 변하지 않는다.
const HERO_W = 1200;
const HERO_H = 1314; // 기존 1600x1751 과 같은 비율(0.914)
const HERO_ART_RATIO = 0.834; // 내용물이 캔버스 폭에서 차지하는 비율

async function buildHero(src, outName) {
  // trim()+extend()/resize() 를 한 파이프라인에 이어 붙이면 libvips 가 목표 크기를 잘못
  // 계산하는 문제가 있어(sharp 0.35.4 확인) 단계마다 버퍼로 구체화한다.
  const trimmed = await sharp(src).trim({ threshold: 20 }).png().toBuffer();
  const art = await sharp(trimmed)
    .resize({ width: Math.round(HERO_W * HERO_ART_RATIO) })
    .png()
    .toBuffer();
  await sharp({
    create: { width: HERO_W, height: HERO_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .webp({ quality: 88, alphaQuality: 90 })
    .toFile(join(OUT, outName));
}

await buildHero(hero, 'hero.webp');
await buildHero(heroEn, 'hero-en.webp');

// 기본 OG 이미지: 사용자가 만든 이미지/og-img.jpeg (2848x1504) 를 1200x630 으로 가운데 크롭.
const ogSource = join(SRC, 'og-img.jpeg');
await sharp(ogSource)
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(join(OUT, 'og-default.jpg'));

for (const f of ['logo-mark.png', 'logo-mark-192.png', 'hero.webp', 'hero-en.webp', 'og-default.jpg']) {
  const m = await sharp(join(OUT, f)).metadata();
  console.log(`${f}: ${m.width}x${m.height}`);
}
