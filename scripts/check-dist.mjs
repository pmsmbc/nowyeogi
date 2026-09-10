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

// 마크다운이 닫히지 않아 본문에 별표가 그대로 남았는지 검사한다.
// 한국어에서는 `**굵게(괄호)**조사` 처럼 닫는 별표 뒤에 한글이 붙으면 CommonMark 가 닫지 않는다.
for (const [rel, slugs] of [['posts', ko], ['en/posts', en]]) {
  for (const slug of slugs) {
    const html = readFileSync(join(dist, rel, slug, 'index.html'), 'utf8');
    const body = html.split('<div class="prose body">')[1]?.split('</article>')[0] ?? '';
    if (body.includes('**')) errors.push(`본문에 닫히지 않은 ** 가 있습니다: ${rel}/${slug} (닫는 ** 뒤에 한글이 붙지 않게 고치세요)`);
    if (body.includes('[[line:')) errors.push(`알 수 없는 지하철 노선 키가 있습니다: ${rel}/${slug} (src/data/subway.json 에 추가하세요)`);
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
