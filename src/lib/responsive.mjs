import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 반응형 이미지(srcset) 도우미. 빌드 전에 scripts/lib/image-variants.mjs 가
 * public/images/**.webp 마다 -w480/-w800/-w1200 축소판을 만들어 두면, 여기서 실제로
 * 존재하는 축소판만 골라 srcset 을 만든다(개발 서버처럼 축소판이 없으면 원본만 쓴다).
 * 2026-10-14 모바일 LCP 대응: 1600px 원본(500KB 안팎)이 400px 화면에 그대로 내려가고 있었다.
 */
export const VARIANT_WIDTHS = [480, 800, 1200];
const PUBLIC_DIR = join(process.cwd(), 'public');

export function variantSrc(src, width) {
  return src.replace(/\.webp$/, `-w${width}.webp`);
}

/** @returns {{ src: string, srcset?: string, sizes?: string }} */
export function responsiveAttrs(src, { width, sizes } = {}) {
  if (!src || !src.endsWith('.webp') || !src.startsWith('/')) return { src };
  const candidates = [];
  for (const w of VARIANT_WIDTHS) {
    if (width && w >= width) continue; // 원본보다 큰 축소판은 만들지 않는다
    const v = variantSrc(src, w);
    if (existsSync(join(PUBLIC_DIR, v))) candidates.push(`${v} ${w}w`);
  }
  if (candidates.length === 0) return { src };
  if (width) candidates.push(`${src} ${width}w`);
  return { src, srcset: candidates.join(', '), sizes };
}

/** 글 본문·표지: 컨테이너 최대 1080px, 그 아래서는 화면 폭에서 좌우 여백을 뺀 값 */
export const SIZES_ARTICLE = '(min-width: 1112px) 1080px, calc(100vw - 2rem)';
/** 글 카드(목록·홈): 3열 → 2열 → 1열 */
export const SIZES_CARD = '(min-width: 980px) 344px, (min-width: 640px) calc(50vw - 2rem), calc(100vw - 2rem)';
