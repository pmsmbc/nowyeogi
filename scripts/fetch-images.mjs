#!/usr/bin/env node
// 위키미디어 공용(Wikimedia Commons)에서 자유 라이선스 사진을 검색해 public/images/<slug>/ 에 WebP 로 저장하고,
// frontmatter 에 붙여 넣을 images 항목(출처 표기 포함)을 출력한다.
//
//   node scripts/fetch-images.mjs <slug> "<검색어>" [--limit 4] [--min 1200] [--start 1]
//
// 허용 라이선스: CC0, Public domain, CC BY, CC BY-SA (버전 무관). 그 외는 건너뛴다.
import { mkdirSync, existsSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const UA = 'nowyeogi-blog/1.0 (https://nowyeogi.com; nowyeogi@gmail.com)';
const ALLOWED = /^(cc0|public domain|pd|cc by(-sa)?( \d(\.\d)?)?)$/i;

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i === -1 ? def : args[i + 1]; };
const [slug, query] = args.filter((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--')));
const limit = Number(opt('--limit', 4));
const minWidth = Number(opt('--min', 1200));
if (!slug || !query) {
  console.error('사용법: node scripts/fetch-images.mjs <slug> "<검색어>" [--limit 4] [--min 1200] [--start N]');
  process.exit(1);
}

const outDir = join(ROOT, 'public', 'images', slug);
mkdirSync(outDir, { recursive: true });
const existing = existsSync(outDir) ? readdirSync(outDir).filter((f) => /^\d+\.webp$/.test(f)).map((f) => Number(f.slice(0, -5))) : [];
let next = Number(opt('--start', existing.length ? Math.max(...existing) + 1 : 1));

const stripHtml = (s) => String(s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function search(q) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrsearch: q, gsrnamespace: '6', gsrlimit: '30',
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1600',
  }).toString();
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const data = await res.json();
  const pages = Object.values(data.query?.pages ?? {});
  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii) return null;
      const m = ii.extmetadata ?? {};
      return {
        title: p.title,
        pageUrl: ii.descriptionurl,
        thumb: ii.thumburl ?? ii.url,
        width: ii.width, height: ii.height, mime: ii.mime,
        license: stripHtml(m.LicenseShortName?.value),
        licenseUrl: m.LicenseUrl?.value,
        artist: stripHtml(m.Artist?.value),
        description: stripHtml(m.ImageDescription?.value).slice(0, 160),
        index: p.index,
      };
    })
    .filter(Boolean)
    .filter((x) => /^image\/(jpeg|png)$/.test(x.mime) && x.width >= minWidth && ALLOWED.test(x.license))
    .sort((a, b) => a.index - b.index);
}

const candidates = await search(query);
if (candidates.length === 0) {
  console.log(`"${query}" 로 허용 라이선스 사진을 찾지 못했습니다. 영어 검색어나 더 일반적인 단어로 다시 시도하세요.`);
  process.exit(0);
}

const picked = candidates.slice(0, limit);
const entries = [];
for (const c of picked) {
  const res = await fetch(c.thumb, { headers: { 'User-Agent': UA } });
  if (!res.ok) { console.warn(`⚠ 다운로드 실패: ${c.title} (${res.status})`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const target = `${String(next).padStart(2, '0')}.webp`;
  const info = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(outDir, target));
  const credit = `${c.artist || 'Wikimedia Commons'}, ${c.license}, via Wikimedia Commons`;
  entries.push({ src: `/images/${slug}/${target}`, alt: '', width: info.width, height: info.height, credit, creditUrl: c.pageUrl, description: c.description });
  console.log(`✔ ${target}  ${info.width}x${info.height}  ${c.license}  ${c.artist}  — ${c.description}`);
  next += 1;
}

const creditsPath = join(outDir, 'credits.json');
const previous = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : [];
writeFileSync(creditsPath, JSON.stringify([...previous, ...entries], null, 2));
console.log('\n--- frontmatter images 에 붙여 넣기 (alt 는 직접 채우세요) ---');
for (const e of entries) {
  console.log(`  - src: ${e.src}\n    alt: ""\n    width: ${e.width}\n    height: ${e.height}\n    credit: "${e.credit.replace(/"/g, '\\"')}"\n    creditUrl: "${e.creditUrl}"`);
}
console.log('\n--- 본문에 넣기 ---');
for (const e of entries) console.log(`![캡션](${e.src})`);
