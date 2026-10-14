import sharp from 'sharp';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { VARIANT_WIDTHS } from '../../src/lib/responsive.mjs';

const VARIANT_RE = /-w\d+\.webp$/;

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

/**
 * public/images/**.webp 와 public/brand/hero*.webp 의 축소판(-w480/-w800/-w1200)을 만든다.
 * 원본보다 작은 폭만, 그리고 원본이 축소판보다 새로울 때만 다시 만든다. 축소판은 git 에 넣지 않는다(.gitignore).
 */
export async function generateVariants(root, { log = console.log } = {}) {
  const sources = [
    ...[...walk(join(root, 'public', 'images'))].filter((f) => extname(f) === '.webp' && !VARIANT_RE.test(f)),
    ...[...walk(join(root, 'public', 'brand'))].filter((f) => /hero[^/]*\.webp$/.test(f) && !VARIANT_RE.test(f)),
  ];
  let made = 0, skipped = 0;
  for (const src of sources) {
    const srcStat = statSync(src);
    let meta = null;
    for (const w of VARIANT_WIDTHS) {
      const dest = src.replace(/\.webp$/, `-w${w}.webp`);
      // CI 에서는 actions/cache 가 원본 해시로 캐시를 무효화하므로 존재만 보면 된다(체크아웃이 mtime 을 새로 찍는다).
      if (existsSync(dest) && (process.env.CI || statSync(dest).mtimeMs >= srcStat.mtimeMs)) { skipped++; continue; }
      meta ??= await sharp(src).metadata();
      if (!meta.width || meta.width <= w) continue;
      await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: 78 }).toFile(dest);
      made++;
    }
  }
  log(`prebuild: 이미지 축소판 ${made}개 생성, ${skipped}개 유지 (원본 ${sources.length}장)`);
}
