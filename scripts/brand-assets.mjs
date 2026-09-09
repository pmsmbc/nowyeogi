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

// 투명 여백을 잘라낸 뒤 크기를 맞춘다
// compressionLevel:9, effort:10 — 기본값으로는 logo-mark.png가 300KB를 넘어(약 349KB) 최대 압축을 지정한다.
await sharp(mark).trim().resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, effort: 10 }).toFile(join(OUT, 'logo-mark.png'));
await sharp(mark).trim().resize({ width: 192, height: 192, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, effort: 10 }).toFile(join(OUT, 'logo-mark-192.png'));
await sharp(mark).trim().resize({ width: 64, height: 64, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, effort: 10 }).toFile(join(ROOT, 'public', 'favicon.png'));
// 히어로는 워드마크가 포함된 이미지. 여백을 조금 남기고 잘라 1600px 로.
// 실제 원본(상단 이미지-Photoroom.png)은 2400x1309 캔버스 안에 796x926 크기로만 그려져 있어
// trim 후 확대가 필요하다. width가 1600에 도달하도록 withoutEnlargement를 주지 않는다.
// trim()+extend()를 resize()와 한 파이프라인에 이어 붙이면 libvips가 resize 목표 크기를
// 잘못 계산하는 문제가 있어(sharp 0.35.4 확인), extend까지 먼저 버퍼로 구체화한 뒤
// 새 sharp 인스턴스에서 resize를 적용한다.
const heroExtended = await sharp(hero)
  .trim({ threshold: 20 })
  .extend({ top: 60, bottom: 60, left: 80, right: 80, background: '#fbfaf7' })
  .png()
  .toBuffer();
await sharp(heroExtended).resize({ width: 1600 }).webp({ quality: 85 }).toFile(join(OUT, 'hero.webp'));

// 기본 OG 이미지: 1200x630 크림색 배경 위에 히어로 아트워크를 1000x560 안에 맞춰 가운데 배치.
const ogArtwork = await sharp(hero)
  .trim({ threshold: 20 })
  .resize({ width: 1000, height: 560, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 4, background: '#fbfaf7' } })
  .composite([{ input: ogArtwork, gravity: 'centre' }])
  .jpeg({ quality: 85 })
  .toFile(join(OUT, 'og-default.jpg'));

for (const f of ['logo-mark.png', 'logo-mark-192.png', 'hero.webp', 'og-default.jpg']) {
  const m = await sharp(join(OUT, f)).metadata();
  console.log(`${f}: ${m.width}x${m.height}`);
}
