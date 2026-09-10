#!/usr/bin/env node
// 한국관광공사 TourAPI 에서 장소 사진과 기본 정보를 받아 public/images/<slug>/ 에 WebP 로 저장한다.
// 공공누리 제1유형(Type1: 출처표시, 상업적 이용·변경 허용) 사진만 사용한다.
//
//   node scripts/fetch-tour-images.mjs <slug> "<장소 이름>" [--lang ko|en] [--index 1] [--credit ko|en] [--limit 4] [--start N] [--pick 1,3,5]
//
// --index  검색 결과 중 몇 번째 장소인지 (기본 1). 목록을 먼저 보려면 --list 만 붙여 실행한다.
// --credit 캡션에 쓸 출처 표기 언어 (기본은 --lang 과 같음). 영어 글에 한국어 서비스 사진을 쓸 때 --credit en.
//
// 인증키는 .env 의 TOUR_API_KEY (data.go.kr 일반 인증키 Encoding) 를 쓴다.
import { mkdirSync, existsSync, readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SERVICE = { ko: 'KorService2', en: 'EngService2', ja: 'JpnService2', zh: 'ChtService2' };
const CREDIT = { ko: '한국관광공사 (공공누리 제1유형)', en: 'Korea Tourism Organization (KOGL Type 1)' };
const CREDIT_URL = 'https://kto.visitkorea.or.kr/';

const env = existsSync(join(ROOT, '.env')) ? readFileSync(join(ROOT, '.env'), 'utf8') : '';
const KEY = (env.match(/^TOUR_API_KEY=(.+)$/m)?.[1] ?? process.env.TOUR_API_KEY ?? '').trim();
if (!KEY) {
  console.error('.env 에 TOUR_API_KEY 가 없습니다. data.go.kr 에서 받은 일반 인증키(Encoding)를 넣으세요.');
  process.exit(1);
}

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i === -1 ? def : argv[i + 1]; };
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { i += 1; continue; }
  positional.push(argv[i]);
}
const [slug, keyword] = positional;
const lang = opt('--lang', 'ko');
const limit = Number(opt('--limit', 4));
const pick = opt('--pick', '') ? String(opt('--pick')).split(',').map((n) => Number(n.trim())) : null;
const index = Number(opt('--index', 1));
const creditLang = opt('--credit', lang);
const listOnly = argv.includes('--list');
if (!slug || !keyword || !SERVICE[lang]) {
  console.error('사용법: node scripts/fetch-tour-images.mjs <slug> "<장소 이름>" [--lang ko|en] [--index 1] [--credit ko|en] [--limit 4] [--start N] [--pick 1,3] [--list]');
  process.exit(1);
}

const base = `https://apis.data.go.kr/B551011/${SERVICE[lang]}`;
const common = `serviceKey=${KEY}&MobileOS=ETC&MobileApp=nowyeogi&_type=json`;

async function api(path, params) {
  const res = await fetch(`${base}/${path}?${common}&${params}`);
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trimStart().startsWith('{')) throw new Error(`${path} 응답이 JSON 이 아닙니다 (인증키를 확인하세요):\n${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const header = data.response?.header;
  if (header && header.resultCode !== '0000') throw new Error(`${path} ${header.resultCode} ${header.resultMsg}`);
  const items = data.response?.body?.items;
  if (!items || items === '') return [];
  return Array.isArray(items.item) ? items.item : [items.item];
}

const found = await api('searchKeyword2', `numOfRows=10&pageNo=1&keyword=${encodeURIComponent(keyword)}`);
if (found.length === 0) {
  console.log(`"${keyword}" 로 관광공사에서 장소를 찾지 못했습니다. 정식 명칭으로 다시 시도하세요.`);
  process.exit(0);
}
console.log('검색 결과:');
found.forEach((f, n) => console.log(`  ${n + 1}. ${f.title}  —  ${f.addr1 ?? ''}`));
if (listOnly) process.exit(0);
const place = found[index - 1];
if (!place) { console.error(`--index ${index} 에 해당하는 결과가 없습니다.`); process.exit(1); }
console.log(`\n선택: ${index}. ${place.title} (contentId ${place.contentid})`);
if (found.length > 1 && index === 1) console.log('원하는 장소가 아니면 --index 번호 로 다시 실행하세요.');

const detail = (await api('detailCommon2', `contentId=${place.contentid}`))[0] ?? {};
const intro = (await api('detailIntro2', `contentId=${place.contentid}&contentTypeId=${place.contenttypeid}`))[0] ?? {};
const strip = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const info = {
  title: place.title,
  address: place.addr1,
  tel: place.tel || intro.infocenter || intro.infocenterculture || '',
  homepage: strip(detail.homepage).match(/https?:\/\/\S+/)?.[0] ?? '',
  hours: strip(intro.usetime || intro.opentimefood || intro.opentime || ''),
  closed: strip(intro.restdate || intro.restdateculture || intro.restdatefood || ''),
  fee: strip(intro.usefee || ''),
  parking: strip(intro.parking || intro.parkingculture || intro.parkingfood || ''),
  overview: strip(detail.overview).slice(0, 400),
};
console.log('\n--- 관광공사 정보 (사실 확인용, 그대로 베끼지 말 것) ---');
for (const [k, v] of Object.entries(info)) if (v) console.log(`${k}: ${v}`);

const all = await api('detailImage2', `contentId=${place.contentid}&imageYN=Y&numOfRows=30`);
const usable = all.filter((i) => i.cpyrhtDivCd === 'Type1' && i.originimgurl);
console.log(`\n사진 ${all.length}장 중 공공누리 1유형 ${usable.length}장 사용 가능`);
if (usable.length === 0) {
  console.log('이 장소에는 상업적 이용이 가능한 사진이 없습니다. 위키미디어(npm run fetch-images)를 쓰세요.');
  process.exit(0);
}
usable.forEach((i, n) => console.log(`  ${n + 1}. ${i.imgname || '(이름 없음)'}`));

const chosen = pick ? pick.map((n) => usable[n - 1]).filter(Boolean) : usable.slice(0, limit);
const outDir = join(ROOT, 'public', 'images', slug);
mkdirSync(outDir, { recursive: true });
const existing = readdirSync(outDir).filter((f) => /^\d+\.webp$/.test(f)).map((f) => Number(f.slice(0, -5)));
let next = Number(opt('--start', existing.length ? Math.max(...existing) + 1 : 1));

const entries = [];
for (const img of chosen) {
  const res = await fetch(img.originimgurl);
  if (!res.ok) { console.warn(`⚠ 다운로드 실패: ${img.imgname} (${res.status})`); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const target = `${String(next).padStart(2, '0')}.webp`;
  const meta = await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(outDir, target));
  entries.push({ src: `/images/${slug}/${target}`, alt: '', width: meta.width, height: meta.height, credit: CREDIT[creditLang] ?? CREDIT.ko, creditUrl: CREDIT_URL, name: img.imgname });
  console.log(`✔ ${target}  ${meta.width}x${meta.height}  ${img.imgname || ''}`);
  next += 1;
}

const creditsPath = join(outDir, 'credits.json');
const previous = existsSync(creditsPath) ? JSON.parse(readFileSync(creditsPath, 'utf8')) : [];
writeFileSync(creditsPath, JSON.stringify([...previous, ...entries], null, 2));

console.log('\n--- frontmatter images 에 붙여 넣기 (alt 는 직접 채우세요) ---');
for (const e of entries) {
  console.log(`  - src: ${e.src}\n    alt: ""\n    width: ${e.width}\n    height: ${e.height}\n    credit: "${e.credit}"\n    creditUrl: "${e.creditUrl}"`);
}
console.log('\n--- 본문에 넣기 ---');
for (const e of entries) console.log(`![캡션](${e.src})`);
