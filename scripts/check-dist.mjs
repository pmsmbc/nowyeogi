import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 경로에 한글이 있으므로 URL.pathname(퍼센트 인코딩됨)을 쓰지 않는다.
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const errors = [];
const warnings = [];

const LANGS = ['ko', 'en', 'ja'];
const DEFAULT_LANG = 'ko';
const prefix = (lang) => (lang === DEFAULT_LANG ? '' : `${lang}/`);
const required = ['sitemap-index.xml', 'robots.txt', 'ads.txt', '404.html'];
for (const lang of LANGS) {
  const p = prefix(lang);
  required.push(`${p}index.html`, `${p}rss.xml`, `${p}about/index.html`, `${p}privacy/index.html`, `${p}contact/index.html`);
}
for (const f of required) if (!existsSync(join(dist, f))) errors.push(`없음: dist/${f}`);

function postDirs(rel) {
  const dir = join(dist, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory());
}
const bySlugs = Object.fromEntries(LANGS.map((l) => [l, postDirs(`${prefix(l)}posts`)]));
// 기본 언어에만 있는 글은 번역이 아직 없다는 뜻이라 경고로만 알린다
for (const slug of bySlugs[DEFAULT_LANG]) {
  const missing = LANGS.filter((l) => l !== DEFAULT_LANG && !bySlugs[l].includes(slug));
  if (missing.length) warnings.push(`${missing.join('/')} 번역 없음: ${slug}`);
}
for (const lang of LANGS) {
  if (lang === DEFAULT_LANG) continue;
  for (const slug of bySlugs[lang]) {
    if (!bySlugs[DEFAULT_LANG].includes(slug)) warnings.push(`한국어 원문 없음: ${lang}/${slug}`);
  }
}
const pairs = LANGS.map((l) => [`${prefix(l)}posts`, bySlugs[l]]);

for (const [rel, slugs] of pairs) {
  for (const slug of slugs) {
    const html = readFileSync(join(dist, rel, slug, 'index.html'), 'utf8');
    if (!html.includes('hreflang=')) errors.push(`hreflang 없음: ${rel}/${slug}`);
    if (!html.includes('application/ld+json')) errors.push(`JSON-LD 없음: ${rel}/${slug}`);
    if (!html.includes('rel="canonical"')) errors.push(`canonical 없음: ${rel}/${slug}`);
  }
}

// 마크다운이 닫히지 않아 본문에 별표가 그대로 남았는지 검사한다.
// 한국어에서는 `**굵게(괄호)**조사` 처럼 닫는 별표 뒤에 한글이 붙으면 CommonMark 가 닫지 않는다.
for (const [rel, slugs] of pairs) {
  for (const slug of slugs) {
    const html = readFileSync(join(dist, rel, slug, 'index.html'), 'utf8');
    // Astro 가 <div class="prose body" data-astro-cid-...> 처럼 속성을 붙이므로 정규식으로 찾는다.
    const body = html.split(/<div class="prose body"[^>]*>/)[1]?.split('</article>')[0] ?? '';
    if (body.includes('**')) errors.push(`본문에 닫히지 않은 ** 가 있습니다: ${rel}/${slug} (닫는 ** 뒤에 한글이 붙지 않게 고치세요)`);
    if (body.includes('[[line:')) errors.push(`알 수 없는 지하철 노선 키가 있습니다: ${rel}/${slug} (src/data/subway.json 에 추가하세요)`);
  }
}

// 글에서 참조한 이미지가 실제로 배포에 포함됐는지 검사한다.
for (const [rel, slugs] of pairs) {
  for (const slug of slugs) {
    const html = readFileSync(join(dist, rel, slug, 'index.html'), 'utf8');
    const refs = new Set();
    for (const m of html.matchAll(/(?:src|content)="((?:https:\/\/[^"]*)?\/(?:images|brand)\/[^"]+)"/g)) {
      refs.add(m[1].replace(/^https?:\/\/[^/]+/, ''));
    }
    for (const ref of refs) {
      if (!existsSync(join(dist, decodeURIComponent(ref).replace(/^\//, '')))) {
        errors.push(`이미지 파일이 없습니다: ${ref} (${rel}/${slug})`);
      }
    }
  }
}

// 글 사이 내부 링크가 실제로 존재하는 페이지를 가리키는지 검사한다.
const pageExists = (href) => {
  const clean = decodeURIComponent(href.split('#')[0].split('?')[0]);
  if (!clean.startsWith('/')) return true;
  const rel = clean.replace(/^\//, '').replace(/\/$/, '');
  return existsSync(join(dist, rel)) || existsSync(join(dist, rel, 'index.html')) || existsSync(join(dist, `${rel}.html`));
};
for (const [rel, slugs] of pairs) {
  for (const slug of slugs) {
    const html = readFileSync(join(dist, rel, slug, 'index.html'), 'utf8');
    const body = html.split(/<div class="prose body"[^>]*>/)[1]?.split('</article>')[0] ?? '';
    for (const m of body.matchAll(/href="(\/[^"]*)"/g)) {
      if (!pageExists(m[1])) errors.push(`내부 링크가 깨졌습니다: ${m[1]} (${rel}/${slug})`);
    }
  }
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (LANGS.every((l) => bySlugs[l].length === 0)) {
  console.warn('⚠ 발행된 글이 0편입니다 — draft: false 로 바꿨는지 확인하세요');
}
if (errors.length) {
  for (const e of errors) console.error(`✖ ${e}`);
  process.exit(1);
}
console.log(`check-dist: 통과 (${LANGS.map((l) => `${l} ${bySlugs[l].length}편`).join(', ')})`);
