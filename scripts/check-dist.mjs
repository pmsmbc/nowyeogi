import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 경로에 한글이 있으므로 URL.pathname(퍼센트 인코딩됨)을 쓰지 않는다.
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const errors = [];
const warnings = [];

const required = ['index.html', 'en/index.html', 'sitemap-index.xml', 'robots.txt', 'ads.txt', 'rss.xml', 'en/rss.xml', '404.html', 'about/index.html', 'privacy/index.html', 'contact/index.html', 'en/about/index.html', 'en/privacy/index.html', 'en/contact/index.html'];
for (const f of required) if (!existsSync(join(dist, f))) errors.push(`없음: dist/${f}`);

function postDirs(rel) {
  const dir = join(dist, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory());
}
const ko = postDirs('posts');
const en = postDirs('en/posts');
for (const slug of ko) if (!en.includes(slug)) warnings.push(`영어 글 없음: ${slug}`);
for (const slug of en) if (!ko.includes(slug)) warnings.push(`한국어 글 없음: ${slug}`);

for (const [rel, slugs] of [['posts', ko], ['en/posts', en]]) {
  for (const slug of slugs) {
    const html = readFileSync(join(dist, rel, slug, 'index.html'), 'utf8');
    if (!html.includes('hreflang=')) errors.push(`hreflang 없음: ${rel}/${slug}`);
    if (!html.includes('application/ld+json')) errors.push(`JSON-LD 없음: ${rel}/${slug}`);
    if (!html.includes('rel="canonical"')) errors.push(`canonical 없음: ${rel}/${slug}`);
  }
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (ko.length === 0 && en.length === 0) {
  console.warn('⚠ 발행된 글이 0편입니다 — draft: false 로 바꿨는지 확인하세요');
}
if (errors.length) {
  for (const e of errors) console.error(`✖ ${e}`);
  process.exit(1);
}
console.log(`check-dist: 통과 (한국어 글 ${ko.length}, 영어 글 ${en.length})`);
