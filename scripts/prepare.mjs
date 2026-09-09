#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSlug } from './lib/slug.mjs';
import { parseNote } from './lib/note.mjs';
import { guessRegion } from './lib/region.mjs';
import { buildFrontmatter, serializePost, noteToComment } from './lib/frontmatter.mjs';
import { planImages, convertImage } from './lib/images.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url))); // 한글 경로 대응
const INPUT = join(ROOT, 'input');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const PUBLIC_IMAGES = join(ROOT, 'public', 'images');
const regions = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'regions.json'), 'utf8'));

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.find((a) => !a.startsWith('--'));
const today = new Date().toISOString().slice(0, 10);

if (!existsSync(INPUT)) {
  console.log(`input/ 폴더가 없습니다. ${INPUT} 를 만들고 그 안에 <slug>/note.txt 와 사진을 넣으세요.`);
  process.exit(0);
}

const dirs = readdirSync(INPUT).filter((d) => statSync(join(INPUT, d)).isDirectory() && !d.startsWith('.'));
const targets = only ? dirs.filter((d) => d === only) : dirs;
if (only && targets.length === 0) {
  console.error(`input/${only} 폴더가 없습니다.`);
  process.exit(1);
}

const summary = { done: [], skipped: [], warnings: [] };

for (const slug of targets) {
  try {
    const v = validateSlug(slug);
    if (!v.ok) { summary.skipped.push(`${slug}: ${v.reason}`); continue; }

    const koPath = join(POSTS, 'ko', `${slug}.md`);
    const enPath = join(POSTS, 'en', `${slug}.md`);
    if (existsSync(koPath) && !force) { summary.skipped.push(`${slug}: 이미 처리됨 (--force 로 다시 생성)`); continue; }
    if (force && (existsSync(koPath) || existsSync(enPath))) {
      summary.warnings.push(`${slug}: --force 로 기존 글을 덮어씁니다`);
    }

    const dir = join(INPUT, slug);
    const files = readdirSync(dir);
    const notePath = join(dir, 'note.txt');
    const noteText = existsSync(notePath) ? readFileSync(notePath, 'utf8') : '';
    if (!noteText) summary.warnings.push(`${slug}: note.txt 가 없거나 비어 있습니다. 사진만으로 뼈대를 만듭니다.`);
    const note = parseNote(noteText);

    const outDir = join(PUBLIC_IMAGES, slug);
    mkdirSync(outDir, { recursive: true });
    const images = [];
    for (const item of planImages(files)) {
      try {
        const { width, height } = await convertImage(join(dir, item.source), join(outDir, item.target));
        images.push({ src: `/images/${slug}/${item.target}`, alt: '', width, height, isCover: item.isCover });
      } catch (err) {
        summary.warnings.push(`${slug}: 이미지 변환 실패 ${item.source} (${err.message})`);
      }
    }
    if (images.length === 0) summary.warnings.push(`${slug}: 변환된 이미지가 없습니다. cover 가 비어 있으니 직접 채워야 합니다.`);

    const regionKey = guessRegion(note.region ?? '', regions);
    if (!regionKey) summary.warnings.push(`${slug}: 지역을 찾지 못했습니다 ("${note.region ?? ''}"). src/data/regions.json 에 추가한 뒤 frontmatter 의 region 을 채우세요.`);

    const fm = buildFrontmatter({ note, regionKey, regionScope: regionKey ? regions[regionKey].scope : undefined, images, today });
    const body = `${noteToComment(note.raw)}\n\n(본문을 여기에 작성)`;
    mkdirSync(join(POSTS, 'ko'), { recursive: true });
    mkdirSync(join(POSTS, 'en'), { recursive: true });
    writeFileSync(koPath, serializePost(fm, body));
    writeFileSync(enPath, serializePost(fm, body));
    summary.done.push(`${slug}: 이미지 ${images.length}장, 장소 ${note.places.length}곳, 지역 ${regionKey ?? 'UNKNOWN'}`);
  } catch (err) {
    summary.warnings.push(`${slug}: 처리 중 오류 (${err.message})`);
    continue;
  }
}

for (const s of summary.done) console.log(`✔ ${s}`);
for (const s of summary.skipped) console.log(`– ${s}`);
for (const s of summary.warnings) console.warn(`⚠ ${s}`);
if (summary.done.length === 0 && summary.skipped.length === 0) console.log('처리할 폴더가 없습니다.');
console.log(`\n다음: src/content/posts/ko/<slug>.md 와 en/<slug>.md 의 title, description, alt, 본문을 채우고 draft: false 로 바꾸세요.`);
