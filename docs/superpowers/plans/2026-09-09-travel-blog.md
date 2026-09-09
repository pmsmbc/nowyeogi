# 「지금 여기는」 여행·맛집 블로그 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Astro 7 정적 사이트로 한국어·영어 여행/맛집 블로그를 만들고, `input/<slug>/` 폴더의 사진과 메모를 글 뼈대로 바꾸는 준비 스크립트와 Claude Code용 `/newpost` 스킬을 갖춘다.

**Architecture:** 콘텐츠는 `src/content/posts/{ko,en}/<slug>.md`에 Markdown으로 저장하고 파일 경로에서 언어를 유도한다. 페이지는 `src/pages/`(한국어)와 `src/pages/en/`(영어)의 얇은 라우트 파일이 `src/views/`의 공용 뷰 컴포넌트를 호출한다. 사진 변환과 글 뼈대 생성은 `scripts/`의 순수 함수 + 얇은 CLI로 분리해 Vitest로 검증한다.

**Tech Stack:** Astro 7.3, `@astrojs/markdown-remark` (unified + rehype 플러그인), `@astrojs/sitemap`, `@astrojs/rss`, sharp, heic-convert, yaml, Vitest 5, 순수 CSS. 배포는 GitHub → Cloudflare Pages.

**Spec:** `docs/superpowers/specs/2026-09-09-travel-blog-design.md`

## Global Constraints

- Node `22.12.0` 이상 (Astro 7 요구). Cloudflare Pages 환경변수 `NODE_VERSION=22`.
- 패키지 매니저 npm. `package.json`은 `"type": "module"`.
- 언어: 한국어 기본(접두사 없음), 영어 `/en/`. `Lang = 'ko' | 'en'`.
- 사이트 이름 한국어 「지금 여기는」, 영어 "Now, Yeogi", URL `https://nowyeogi.com`.
- 팔레트: 배경 `#FBFAF7`, 주색 `#8EC5F0`, 진한 주색 `#5FA8E0`, 연한 주색 `#E6F2FB`, 강조 살구 `#FFC9B5`, 연분홍 `#FFD6E0`, 본문 글자 `#2B3A4A`, 흐린 글자 `#6B7A89`.
- 서체: 본문 Pretendard(jsdelivr), 제목 Noto Serif KR(Google Fonts).
- 글 URL: `/posts/<slug>/`, `/en/posts/<slug>/`. slug 규칙 `^[a-z0-9]+(-[a-z0-9]+)*$`, 3~80자.
- 이미지: 긴 변 1600px, WebP 품질 80, `public/images/<slug>/NN.webp` (cover는 `00.webp`).
- 광고: `src/site.config.json`의 `adsense.client`가 비어 있으면 어떤 광고 코드도 출력하지 않는다.
- npm 스크립트 이름에 `prepare`를 단독으로 쓰지 않는다(npm 설치 훅과 충돌). 준비 스크립트는 `npm run prepare-post`.
- 모든 커밋 메시지 끝에 다음 두 줄을 붙인다:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01JtwbWuj4NyDQaDqXfUjrgy
  ```
- 스펙과 다른 결정(스펙 15절에 기록됨): 언어는 frontmatter가 아니라 파일 경로에서 유도, 이미지에 `width`/`height` 추가, 설정 파일은 `src/site.config.json`, AdSense는 자동 광고 스크립트 + 선택적 수동 슬롯.

## File Structure

```
package.json, astro.config.mjs, tsconfig.json, vitest.config.ts, .gitignore, README.md
public/robots.txt, public/ads.txt          # prebuild 스크립트가 생성
public/images/sample/                       # 샘플 글용 플레이스홀더
scripts/prebuild.mjs                        # ads.txt, robots.txt 생성
scripts/check-dist.mjs                      # 빌드 산출물 검사
scripts/prepare.mjs                         # input → 이미지 + 글 뼈대 (CLI)
scripts/lib/slug.mjs                        # validateSlug
scripts/lib/note.mjs                        # parseNote, parseMenu, mapKind
scripts/lib/region.mjs                      # guessRegion
scripts/lib/frontmatter.mjs                 # buildFrontmatter, serializePost
scripts/lib/images.mjs                      # planImages, convertImage
scripts/lib/*.test.mjs                      # Vitest
src/site.config.json, src/site.config.ts    # 사이트 설정 (JSON이 원본)
src/data/regions.json, src/data/regions.ts  # 지역 사전
src/content.config.ts                       # posts, pages 컬렉션
src/content/posts/{ko,en}/*.md
src/content/pages/{ko,en}/{about,privacy,contact}.md
src/i18n/ui.ts                              # UI 문자열, t()
src/lib/postUtils.ts (+ .test.ts)           # 순수 함수
src/lib/posts.ts                            # astro:content 래퍼
src/lib/markdown/rehypeFigures.mjs          # img → figure, lazy, width/height
src/lib/markdown/rehypeAdSlot.mjs           # 두 번째 H2 앞 광고
src/styles/global.css
src/layouts/BaseLayout.astro
src/components/{Seo,Header,Footer,LangSwitch,AdSlot,PostCard,PlaceCard,Pagination,RegionChips}.astro
src/views/{HomeView,PostView,ListView,PageView}.astro
src/pages/index.astro, posts/[slug].astro, domestic/[...page].astro, overseas/[...page].astro,
          regions/[region]/[...page].astro, tags/[tag]/[...page].astro, [pageId].astro, rss.xml.ts, 404.astro
src/pages/en/  (위와 동일 구조)
.claude/skills/newpost/SKILL.md
```

---

### Task 1: 프로젝트 뼈대와 설정

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/site.config.json`, `src/site.config.ts`, `src/data/regions.json`, `src/data/regions.ts`, `src/styles/global.css`, `src/pages/index.astro`(임시), `src/lib/markdown/rehypeFigures.mjs`(빈 플러그인), `src/lib/markdown/rehypeAdSlot.mjs`(빈 플러그인)
- Modify: `.gitignore`

**Interfaces:**
- Produces: `siteConfig` (`src/site.config.ts` default export, 아래 JSON 형태), `regions: Record<string, Region>`와 `type Region = { ko: string; en: string; scope: 'domestic'|'overseas'; country: string; aliases: string[] }` (`src/data/regions.ts`), CSS 변수 이름(`--c-bg`, `--c-primary`, …).

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "nowyeogi",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "prebuild": "node scripts/prebuild.mjs",
    "build": "astro build && node scripts/check-dist.mjs",
    "preview": "astro preview",
    "prepare-post": "node scripts/prepare.mjs",
    "test": "vitest run",
    "check": "astro check"
  },
  "dependencies": {
    "@astrojs/markdown-remark": "^7.3.1",
    "@astrojs/rss": "^4.0.19",
    "@astrojs/sitemap": "^3.7.4",
    "astro": "^7.3.2",
    "heic-convert": "^2.1.0",
    "sharp": "^0.35.4",
    "unist-util-visit": "^5.1.0",
    "yaml": "^2.9.0"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "typescript": "^5.6.0",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: 설치**

Run: `npm install`
Expected: 오류 없이 완료. Node 버전 경고가 나오면 무시하되, 설치 자체가 실패하면 `node -v`가 22 이상인지 확인.

- [ ] **Step 3: 설정 파일 작성**

`src/site.config.json`:
```json
{
  "url": "https://nowyeogi.com",
  "name": { "ko": "지금 여기는", "en": "Now, Yeogi" },
  "tagline": {
    "ko": "지금 여기서 보내는 하루. 국내와 해외의 여행지, 카페, 맛집 이야기",
    "en": "A day spent right here. Travel spots, cafés and good food in Korea and abroad"
  },
  "author": "지금 여기는",
  "email": "hello@nowyeogi.com",
  "postsPerPage": 12,
  "adsense": {
    "client": "",
    "slots": { "top": "", "inArticle": "", "bottom": "", "list": "" }
  }
}
```

`src/site.config.ts`:
```ts
import config from './site.config.json';

export type Lang = 'ko' | 'en';
export const LANGS: Lang[] = ['ko', 'en'];

export interface SiteConfig {
  url: string;
  name: Record<Lang, string>;
  tagline: Record<Lang, string>;
  author: string;
  email: string;
  postsPerPage: number;
  adsense: { client: string; slots: { top: string; inArticle: string; bottom: string; list: string } };
}

const siteConfig: SiteConfig = config;
export default siteConfig;
```

`src/data/regions.json`:
```json
{
  "seoul": { "ko": "서울", "en": "Seoul", "scope": "domestic", "country": "KR", "aliases": [] },
  "busan": { "ko": "부산", "en": "Busan", "scope": "domestic", "country": "KR", "aliases": [] },
  "jeju": { "ko": "제주", "en": "Jeju", "scope": "domestic", "country": "KR", "aliases": ["제주도", "애월", "서귀포", "성산"] },
  "gangneung": { "ko": "강릉", "en": "Gangneung", "scope": "domestic", "country": "KR", "aliases": [] },
  "sokcho": { "ko": "속초", "en": "Sokcho", "scope": "domestic", "country": "KR", "aliases": [] },
  "gyeongju": { "ko": "경주", "en": "Gyeongju", "scope": "domestic", "country": "KR", "aliases": [] },
  "jeonju": { "ko": "전주", "en": "Jeonju", "scope": "domestic", "country": "KR", "aliases": [] },
  "yeosu": { "ko": "여수", "en": "Yeosu", "scope": "domestic", "country": "KR", "aliases": [] },
  "tongyeong": { "ko": "통영", "en": "Tongyeong", "scope": "domestic", "country": "KR", "aliases": [] },
  "incheon": { "ko": "인천", "en": "Incheon", "scope": "domestic", "country": "KR", "aliases": [] },
  "tokyo": { "ko": "도쿄", "en": "Tokyo", "scope": "overseas", "country": "JP", "aliases": ["동경"] },
  "osaka": { "ko": "오사카", "en": "Osaka", "scope": "overseas", "country": "JP", "aliases": [] },
  "kyoto": { "ko": "교토", "en": "Kyoto", "scope": "overseas", "country": "JP", "aliases": [] },
  "fukuoka": { "ko": "후쿠오카", "en": "Fukuoka", "scope": "overseas", "country": "JP", "aliases": [] },
  "sapporo": { "ko": "삿포로", "en": "Sapporo", "scope": "overseas", "country": "JP", "aliases": ["홋카이도"] },
  "okinawa": { "ko": "오키나와", "en": "Okinawa", "scope": "overseas", "country": "JP", "aliases": [] },
  "taipei": { "ko": "타이베이", "en": "Taipei", "scope": "overseas", "country": "TW", "aliases": ["대만", "타이페이"] },
  "bangkok": { "ko": "방콕", "en": "Bangkok", "scope": "overseas", "country": "TH", "aliases": [] },
  "chiangmai": { "ko": "치앙마이", "en": "Chiang Mai", "scope": "overseas", "country": "TH", "aliases": [] },
  "danang": { "ko": "다낭", "en": "Da Nang", "scope": "overseas", "country": "VN", "aliases": ["호이안"] },
  "hanoi": { "ko": "하노이", "en": "Hanoi", "scope": "overseas", "country": "VN", "aliases": [] },
  "singapore": { "ko": "싱가포르", "en": "Singapore", "scope": "overseas", "country": "SG", "aliases": [] },
  "hongkong": { "ko": "홍콩", "en": "Hong Kong", "scope": "overseas", "country": "HK", "aliases": [] },
  "bali": { "ko": "발리", "en": "Bali", "scope": "overseas", "country": "ID", "aliases": [] },
  "paris": { "ko": "파리", "en": "Paris", "scope": "overseas", "country": "FR", "aliases": [] },
  "london": { "ko": "런던", "en": "London", "scope": "overseas", "country": "GB", "aliases": [] },
  "rome": { "ko": "로마", "en": "Rome", "scope": "overseas", "country": "IT", "aliases": [] },
  "barcelona": { "ko": "바르셀로나", "en": "Barcelona", "scope": "overseas", "country": "ES", "aliases": [] },
  "newyork": { "ko": "뉴욕", "en": "New York", "scope": "overseas", "country": "US", "aliases": [] },
  "hawaii": { "ko": "하와이", "en": "Hawaii", "scope": "overseas", "country": "US", "aliases": [] },
  "guam": { "ko": "괌", "en": "Guam", "scope": "overseas", "country": "US", "aliases": [] },
  "sydney": { "ko": "시드니", "en": "Sydney", "scope": "overseas", "country": "AU", "aliases": [] }
}
```

`src/data/regions.ts`:
```ts
import data from './regions.json';

export type Scope = 'domestic' | 'overseas';
export interface Region {
  ko: string;
  en: string;
  scope: Scope;
  country: string;
  aliases: string[];
}

export const regions: Record<string, Region> = data as Record<string, Region>;
export const regionKeys = Object.keys(regions);
export function regionName(key: string, lang: 'ko' | 'en'): string {
  return regions[key]?.[lang] ?? key;
}
```

- [ ] **Step 4: astro.config.mjs, tsconfig.json, vitest.config.ts, 빈 플러그인**

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import siteConfig from './src/site.config.json';
import { rehypeFigures } from './src/lib/markdown/rehypeFigures.mjs';
import { rehypeAdSlot } from './src/lib/markdown/rehypeAdSlot.mjs';

export default defineConfig({
  site: siteConfig.url,
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({ i18n: { defaultLocale: 'ko', locales: { ko: 'ko-KR', en: 'en-US' } } }),
  ],
  markdown: {
    processor: unified({
      rehypePlugins: [
        rehypeFigures,
        [rehypeAdSlot, { client: siteConfig.adsense.client, slot: siteConfig.adsense.slots.inArticle }],
      ],
    }),
  },
});
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"],
  "compilerOptions": { "resolveJsonModule": true }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.mjs', 'src/**/*.test.ts'],
  },
});
```

`src/lib/markdown/rehypeFigures.mjs` (Task 4에서 구현):
```js
export function rehypeFigures() {
  return () => {};
}
```

`src/lib/markdown/rehypeAdSlot.mjs` (Task 4에서 구현):
```js
export function rehypeAdSlot() {
  return () => {};
}
```

- [ ] **Step 5: global.css**

`src/styles/global.css`:
```css
:root {
  --c-bg: #fbfaf7;
  --c-surface: #ffffff;
  --c-primary: #8ec5f0;
  --c-primary-deep: #5fa8e0;
  --c-primary-soft: #e6f2fb;
  --c-accent: #ffc9b5;
  --c-accent-2: #ffd6e0;
  --c-text: #2b3a4a;
  --c-muted: #6b7a89;
  --c-line: #e8eef4;
  --radius: 16px;
  --radius-sm: 10px;
  --shadow: 0 8px 24px rgba(94, 150, 200, 0.12);
  --shadow-sm: 0 2px 8px rgba(94, 150, 200, 0.1);
  --font-body: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Segoe UI', Roboto, sans-serif;
  --font-head: 'Noto Serif KR', 'Apple SD Gothic Neo', Georgia, serif;
  --max: 1080px;
  --measure: 720px;
}

* { box-sizing: border-box; }
html { color-scheme: light; scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--c-bg);
  color: var(--c-text);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
  word-break: keep-all;
  overflow-wrap: anywhere;
}
img { max-width: 100%; height: auto; display: block; }
a { color: var(--c-primary-deep); text-decoration: none; }
a:hover { text-decoration: underline; text-underline-offset: 3px; }
h1, h2, h3 { font-family: var(--font-head); font-weight: 600; line-height: 1.35; margin: 0 0 .5em; }
h1 { font-size: clamp(1.7rem, 4vw, 2.4rem); }
h2 { font-size: clamp(1.3rem, 3vw, 1.7rem); }
h3 { font-size: 1.15rem; }
p { margin: 0 0 1.2em; }
.container { width: min(100% - 2rem, var(--max)); margin-inline: auto; }
.prose { max-width: var(--measure); margin-inline: auto; }
.prose h2 { margin-top: 2.2em; padding-top: .3em; border-top: 2px solid var(--c-primary-soft); }
.prose h3 { margin-top: 1.6em; }
.prose figure { margin: 1.8em 0; }
.prose figure img { border-radius: var(--radius); box-shadow: var(--shadow); width: 100%; }
.prose figcaption { margin-top: .6em; font-size: .9rem; color: var(--c-muted); text-align: center; }
.prose blockquote { margin: 1.5em 0; padding: 1em 1.2em; background: var(--c-primary-soft); border-left: 4px solid var(--c-primary); border-radius: var(--radius-sm); }
.prose ul, .prose ol { padding-left: 1.4em; }
.prose table { width: 100%; border-collapse: collapse; font-size: .95rem; }
.prose th, .prose td { padding: .6em .8em; border-bottom: 1px solid var(--c-line); text-align: left; }
.prose th { background: var(--c-primary-soft); }
.prose .table-wrap { overflow-x: auto; }

.badge { display: inline-block; padding: .15em .7em; border-radius: 999px; font-size: .8rem; font-weight: 600; background: var(--c-primary-soft); color: var(--c-primary-deep); }
.badge.accent { background: var(--c-accent-2); color: #b04a63; }
.chip { display: inline-block; padding: .35em 1em; border-radius: 999px; background: var(--c-surface); border: 1px solid var(--c-line); color: var(--c-text); font-size: .9rem; box-shadow: var(--shadow-sm); }
.chip:hover { border-color: var(--c-primary); text-decoration: none; }
.btn { display: inline-block; padding: .6em 1.4em; border-radius: 999px; background: var(--c-primary); color: #fff; font-weight: 600; box-shadow: var(--shadow-sm); }
.btn:hover { background: var(--c-primary-deep); text-decoration: none; }
.muted { color: var(--c-muted); }
.small { font-size: .9rem; }

.grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.section { padding: 2.5rem 0; }
.section-title { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1.2rem; }
.section-title h2 { margin: 0; }

.ad { margin: 2rem auto; text-align: center; }
.ad-label { display: block; font-size: .7rem; letter-spacing: .1em; color: var(--c-muted); margin-bottom: .3em; }

@media (max-width: 640px) {
  body { font-size: 16px; }
  .grid { gap: 1.1rem; }
}
```

- [ ] **Step 6: 임시 index.astro와 .gitignore**

`src/pages/index.astro`:
```astro
---
import '../styles/global.css';
import siteConfig from '../site.config';
---
<html lang="ko">
  <head><meta charset="utf-8" /><title>{siteConfig.name.ko}</title></head>
  <body><main class="container"><h1>{siteConfig.name.ko}</h1></main></body>
</html>
```

`.gitignore`에 추가:
```
node_modules/
dist/
.astro/
input/
.env
.DS_Store
.idea/
public/ads.txt
public/robots.txt
```

- [ ] **Step 7: 빌드 확인**

Run: `npm run build 2>&1 | tail -20`
Expected: `scripts/prebuild.mjs`가 없어서 prebuild 실패. 다음 두 파일을 만든다.

`scripts/prebuild.mjs`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../src/site.config.json', import.meta.url), 'utf8'));
mkdirSync(new URL('../public', import.meta.url), { recursive: true });

const client = config.adsense.client?.trim();
const adsTxt = client
  ? `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
  : '';
writeFileSync(new URL('../public/ads.txt', import.meta.url), adsTxt);

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${config.url.replace(/\/$/, '')}/sitemap-index.xml\n`;
writeFileSync(new URL('../public/robots.txt', import.meta.url), robots);

console.log(`prebuild: ads.txt ${client ? '생성' : '(비어 있음)'}, robots.txt 생성`);
```

`scripts/check-dist.mjs` (임시, Task 7에서 완성):
```js
console.log('check-dist: (아직 검사 없음)');
```

Run: `npm run build 2>&1 | tail -20`
Expected: `dist/index.html` 생성, 종료 코드 0. sitemap 경고가 있으면 `site` 설정을 확인.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "chore: Astro 7 프로젝트 뼈대, 사이트 설정, 지역 사전, 디자인 토큰"
```

---

### Task 2: 콘텐츠 스키마, 샘플 글, i18n 문자열, 순수 유틸

**Files:**
- Create: `src/content.config.ts`, `src/content/posts/ko/jeju-aewol-cafe-2026-09.md`, `src/content/posts/en/jeju-aewol-cafe-2026-09.md`, `src/content/posts/ko/tokyo-shibuya-2026-08.md`, `src/content/posts/en/tokyo-shibuya-2026-08.md`, `src/content/pages/{ko,en}/{about,privacy,contact}.md`, `src/i18n/ui.ts`, `src/lib/postUtils.ts`, `src/lib/postUtils.test.ts`, `src/lib/posts.ts`, `public/images/sample/00.webp`, `public/images/sample/01.webp`, `public/images/sample/02.webp`

**Interfaces:**
- Consumes: `regions`, `Lang`, `siteConfig`.
- Produces:
  - `splitId(id: string): { lang: Lang; slug: string }`
  - `localePath(lang: Lang, path: string): string`
  - `sortByDateDesc<T extends { data: { pubDate: Date } }>(items: T[]): T[]`
  - `pickRelated<T extends { id: string; data: { region: string; tags: string[] } }>(all: T[], current: T, n?: number): T[]`
  - `collectTags<T extends { data: { tags: string[] } }>(items: T[]): { tag: string; count: number }[]`
  - `isPublished(data: { draft: boolean }, isDev: boolean): boolean`
  - `getPosts(lang: Lang): Promise<Post[]>`, `getTranslation(post: Post): Promise<Post | undefined>`, `postPath(post: Post): string`, `type Post = CollectionEntry<'posts'>`
  - `t(lang: Lang, key: UiKey): string`, `ui`
  - 컬렉션 `posts`, `pages`

- [ ] **Step 1: postUtils 실패 테스트 작성**

`src/lib/postUtils.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { splitId, localePath, sortByDateDesc, pickRelated, collectTags, isPublished } from './postUtils';

describe('splitId', () => {
  it('언어와 slug를 분리한다', () => {
    expect(splitId('ko/jeju-aewol-cafe-2026-09')).toEqual({ lang: 'ko', slug: 'jeju-aewol-cafe-2026-09' });
    expect(splitId('en/tokyo')).toEqual({ lang: 'en', slug: 'tokyo' });
  });
  it('알 수 없는 언어면 throw', () => {
    expect(() => splitId('fr/x')).toThrow(/언어/);
    expect(() => splitId('nolang')).toThrow(/언어/);
  });
});

describe('localePath', () => {
  it('ko는 그대로, en은 /en 접두사', () => {
    expect(localePath('ko', '/posts/a/')).toBe('/posts/a/');
    expect(localePath('en', '/posts/a/')).toBe('/en/posts/a/');
    expect(localePath('en', '/')).toBe('/en/');
  });
});

describe('sortByDateDesc', () => {
  it('최신순으로 정렬하고 원본을 바꾸지 않는다', () => {
    const a = { data: { pubDate: new Date('2026-01-01') } };
    const b = { data: { pubDate: new Date('2026-03-01') } };
    const input = [a, b];
    expect(sortByDateDesc(input)).toEqual([b, a]);
    expect(input).toEqual([a, b]);
  });
});

describe('pickRelated', () => {
  const mk = (id: string, region: string, tags: string[]) => ({ id, data: { region, tags } });
  const cur = mk('ko/cur', 'jeju', ['카페', '바다']);
  const all = [
    cur,
    mk('ko/a', 'jeju', []),
    mk('ko/b', 'tokyo', ['카페']),
    mk('ko/c', 'busan', []),
    mk('ko/d', 'jeju', ['바다']),
  ];
  it('자기 자신을 제외하고 같은 지역, 태그 겹침 순으로 고른다', () => {
    expect(pickRelated(all, cur, 3).map((p) => p.id)).toEqual(['ko/d', 'ko/a', 'ko/b']);
  });
  it('n개를 넘지 않는다', () => {
    expect(pickRelated(all, cur, 1)).toHaveLength(1);
  });
});

describe('collectTags', () => {
  it('빈도 내림차순, 같으면 이름순', () => {
    const items = [{ data: { tags: ['b', 'a'] } }, { data: { tags: ['a'] } }, { data: { tags: ['c'] } }];
    expect(collectTags(items)).toEqual([
      { tag: 'a', count: 2 },
      { tag: 'b', count: 1 },
      { tag: 'c', count: 1 },
    ]);
  });
});

describe('isPublished', () => {
  it('draft는 dev에서만 보인다', () => {
    expect(isPublished({ draft: true }, true)).toBe(true);
    expect(isPublished({ draft: true }, false)).toBe(false);
    expect(isPublished({ draft: false }, false)).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/postUtils.test.ts`
Expected: FAIL, `Cannot find module './postUtils'`

- [ ] **Step 3: postUtils 구현**

`src/lib/postUtils.ts`:
```ts
import type { Lang } from '../site.config';
import { LANGS } from '../site.config';

export function splitId(id: string): { lang: Lang; slug: string } {
  const i = id.indexOf('/');
  const lang = i === -1 ? '' : id.slice(0, i);
  if (!LANGS.includes(lang as Lang)) {
    throw new Error(`글 id "${id}"에서 언어를 찾을 수 없습니다. ko/ 또는 en/ 폴더에 두세요.`);
  }
  return { lang: lang as Lang, slug: id.slice(i + 1) };
}

export function localePath(lang: Lang, path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return lang === 'ko' ? p : `/en${p}`;
}

export function sortByDateDesc<T extends { data: { pubDate: Date } }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function pickRelated<T extends { id: string; data: { region: string; tags: string[] } }>(
  all: T[],
  current: T,
  n = 3,
): T[] {
  const score = (p: T) => {
    const region = p.data.region === current.data.region ? 10 : 0;
    const shared = p.data.tags.filter((t) => current.data.tags.includes(t)).length;
    return region + shared;
  };
  return all
    .filter((p) => p.id !== current.id)
    .map((p, i) => ({ p, s: score(p), i }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.p);
}

export function collectTags<T extends { data: { tags: string[] } }>(items: T[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) for (const tag of item.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function isPublished(data: { draft: boolean }, isDev: boolean): boolean {
  return isDev || !data.draft;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/postUtils.test.ts`
Expected: 8 passed

- [ ] **Step 5: 컬렉션 스키마**

`src/content.config.ts`:
```ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { regions } from './data/regions';

const image = z.object({
  src: z.string(),
  alt: z.string().default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const place = z.object({
  name: z.string(),
  kind: z.enum(['restaurant', 'cafe', 'spot', 'stay']).default('spot'),
  address: z.string().optional(),
  menu: z.array(z.object({ name: z.string(), price: z.string() })).default([]),
  hours: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  tip: z.string().optional(),
  mapUrl: z.string().optional(),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    scope: z.enum(['domestic', 'overseas']),
    region: z.string().refine((k) => k in regions, {
      message: 'src/data/regions.json에 없는 지역 키입니다. 사전에 먼저 추가하세요.',
    }),
    type: z.enum(['travel', 'food']).default('travel'),
    cover: z.string(),
    images: z.array(image).default([]),
    tags: z.array(z.string()).default([]),
    places: z.array(place).default([]),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { posts, pages };
```

- [ ] **Step 6: 샘플 이미지 생성**

Run:
```bash
mkdir -p public/images/sample && node -e "
const sharp = require('sharp');
const colors = ['#8ec5f0', '#ffc9b5', '#ffd6e0'];
Promise.all(colors.map((background, i) =>
  sharp({ create: { width: 1600, height: 1000, channels: 3, background } }).webp({ quality: 60 }).toFile('public/images/sample/0' + i + '.webp')
)).then(() => console.log('ok'));
"
```
Expected: `ok`, 파일 3개 생성(각 수 KB).

- [ ] **Step 7: 샘플 글 4편 (draft: true)**

`src/content/posts/ko/jeju-aewol-cafe-2026-09.md`:
```md
---
title: "제주 애월 카페 거리, 바다 보며 쉬어 가기 좋은 세 곳"
description: "애월 해안도로를 따라 걷다 들른 카페 세 곳. 창가 자리, 주차, 대기 시간까지 방문 당시 기준으로 정리했어요."
pubDate: 2026-09-01
scope: domestic
region: jeju
type: food
cover: /images/sample/00.webp
images:
  - src: /images/sample/00.webp
    alt: "애월 해안도로에서 바라본 바다"
    width: 1600
    height: 1000
  - src: /images/sample/01.webp
    alt: "봄날카페 창가 자리"
    width: 1600
    height: 1000
tags: ["카페", "바다뷰", "애월"]
places:
  - name: "봄날카페"
    kind: cafe
    address: "제주시 애월읍 애월북서길 25"
    menu:
      - { name: "아메리카노", price: "6,000원" }
      - { name: "당근케이크", price: "7,500원" }
    hours: "09:00–21:00"
    rating: 4.5
    tip: "오후 3시 이후에는 30분쯤 기다렸어요. 창가 자리는 오전이 여유롭습니다."
draft: true
---

애월 해안도로는 걷는 것만으로도 충분히 좋았는데, 중간중간 들른 카페가 하루를 더 느긋하게 만들어 줬어요. 이 글은 샘플입니다. 실제 글은 `/newpost`로 만듭니다.

![애월 해안도로에서 바라본 바다](/images/sample/00.webp)

## 봄날카페

창가 자리에 앉으면 바다가 눈높이에 걸립니다. 아메리카노는 산미가 적고 부드러운 편이었어요.

![봄날카페 창가 자리](/images/sample/01.webp)

## 실용 정보

- 주차: 카페 앞 공영주차장, 방문 당시 무료
- 대기: 오후 3시 이후 약 30분

## 마무리

바다를 보며 쉬어 갈 곳이 필요하다면 오전에 들르는 걸 추천해요.
```

`src/content/posts/en/jeju-aewol-cafe-2026-09.md`:
```md
---
title: "Three Sea-View Cafés on Jeju's Aewol Coast"
description: "Three cafés along the Aewol coastal road on Jeju Island, with window seats, parking and waiting times as of our visit."
pubDate: 2026-09-01
scope: domestic
region: jeju
type: food
cover: /images/sample/00.webp
images:
  - src: /images/sample/00.webp
    alt: "The sea seen from the Aewol coastal road"
    width: 1600
    height: 1000
  - src: /images/sample/01.webp
    alt: "Window seat at Bomnal Café"
    width: 1600
    height: 1000
tags: ["cafe", "sea view", "Aewol"]
places:
  - name: "Bomnal Café"
    kind: cafe
    address: "25 Aewolbukseo-gil, Aewol-eup, Jeju-si"
    menu:
      - { name: "Americano", price: "₩6,000 (about $4.50)" }
      - { name: "Carrot cake", price: "₩7,500" }
    hours: "09:00–21:00"
    rating: 4.5
    tip: "Expect a 30-minute wait after 3 pm. Mornings are quieter for window seats."
draft: true
---

The Aewol coastal road on Jeju is worth walking for its own sake, and the cafés along the way turned a walk into a slow afternoon. This is a sample post.

![The sea seen from the Aewol coastal road](/images/sample/00.webp)

## Bomnal Café

Sit by the window and the sea sits at eye level. The americano was mild with little acidity.

![Window seat at Bomnal Café](/images/sample/01.webp)

## Practical notes

- Parking: public lot in front of the café, free at the time of our visit
- Waiting: about 30 minutes after 3 pm

## Wrapping up

If you need somewhere to rest with a sea view, go in the morning.
```

`src/content/posts/ko/tokyo-shibuya-2026-08.md`:
```md
---
title: "도쿄 시부야 하루 코스, 걷다가 먹다가"
description: "시부야 스크램블에서 시작해 골목 라멘집까지. 교통, 예산, 동선을 방문 당시 기준으로 정리한 하루 코스입니다."
pubDate: 2026-08-15
scope: overseas
region: tokyo
type: travel
cover: /images/sample/02.webp
images:
  - src: /images/sample/02.webp
    alt: "시부야 골목"
    width: 1600
    height: 1000
tags: ["도쿄", "라멘", "하루코스"]
places:
  - name: "골목 라멘집"
    kind: restaurant
    address: "도쿄 시부야구"
    menu:
      - { name: "쇼유 라멘", price: "1,100엔" }
    rating: 4
draft: true
---

시부야는 사람이 많다는 말을 듣고 갔는데, 골목으로 한 블록만 들어가도 다른 동네가 됩니다. 샘플 글입니다.

![시부야 골목](/images/sample/02.webp)

## 골목 라멘집

쇼유 라멘은 국물이 맑고 짜지 않았어요.

## 실용 정보

- 교통: JR 야마노테선 시부야역
- 예산: 점심 1,100엔

## 마무리

반나절이면 충분한 코스였어요.
```

`src/content/posts/en/tokyo-shibuya-2026-08.md`:
```md
---
title: "A Day in Shibuya, Tokyo: Walk, Eat, Repeat"
description: "From the Shibuya Scramble to a back-alley ramen shop. Transport, budget and route as of our visit."
pubDate: 2026-08-15
scope: overseas
region: tokyo
type: travel
cover: /images/sample/02.webp
images:
  - src: /images/sample/02.webp
    alt: "A Shibuya back street"
    width: 1600
    height: 1000
tags: ["Tokyo", "ramen", "day trip"]
places:
  - name: "Back-alley ramen shop"
    kind: restaurant
    address: "Shibuya, Tokyo"
    menu:
      - { name: "Shoyu ramen", price: "¥1,100" }
    rating: 4
draft: true
---

Everyone says Shibuya is crowded, and it is, but one block into the side streets it becomes a different neighborhood. This is a sample post.

![A Shibuya back street](/images/sample/02.webp)

## Back-alley ramen shop

The shoyu ramen had a clear broth that was not too salty.

## Practical notes

- Transport: JR Yamanote Line, Shibuya Station
- Budget: ¥1,100 for lunch

## Wrapping up

Half a day was enough for this route.
```

- [ ] **Step 8: 정적 페이지 6개**

`src/content/pages/ko/about.md`:
```md
---
title: "소개"
description: "지금 여기는 국내와 해외의 여행지, 카페, 맛집을 직접 다녀온 기록으로 소개하는 블로그입니다."
---

「지금 여기는」은 지금 있는 곳에서 보낸 하루를 기록하는 여행 블로그입니다.

- 직접 다녀온 곳만 씁니다.
- 가격과 영업시간은 방문 당시 기준이며, 바뀔 수 있습니다.
- 광고와 제휴 링크가 포함될 수 있으며, 글의 내용에는 영향을 주지 않습니다.

문의는 [연락처](/contact/) 페이지를 이용해 주세요.
```

`src/content/pages/en/about.md`:
```md
---
title: "About"
description: "Now, Yeogi is a travel blog about places, cafés and restaurants in Korea and abroad, written from first-hand visits."
---

"Now, Yeogi" (지금 여기는, "right here, right now") records a day spent wherever we happen to be.

- We only write about places we visited.
- Prices and opening hours are as of our visit and may change.
- Posts may include ads and affiliate links. They do not influence what we write.

Reach us through the [contact](/en/contact/) page.
```

`src/content/pages/ko/privacy.md`:
```md
---
title: "개인정보처리방침"
description: "지금 여기는 사이트의 개인정보 수집 항목, 쿠키와 광고 사용, 문의처를 안내합니다."
---

「지금 여기는」(이하 "사이트")은 방문자의 개인정보를 소중히 다룹니다.

## 수집하는 정보

사이트는 회원가입을 받지 않으며, 방문자가 직접 입력하는 개인정보를 수집하지 않습니다. 연락처 페이지를 통해 이메일을 보내는 경우, 답장을 위해 이메일 주소와 내용이 보관됩니다.

## 쿠키와 광고

사이트는 Google AdSense 광고를 게재합니다. Google을 비롯한 제3자 광고 사업자는 쿠키를 사용해 방문자의 이전 방문 기록을 바탕으로 광고를 게재할 수 있습니다. 방문자는 [Google 광고 설정](https://www.google.com/settings/ads)에서 맞춤 광고를 해제할 수 있습니다.

## 방문 통계

사이트는 페이지 조회 수 등 익명화된 통계를 수집할 수 있습니다. 이 정보로 개인을 식별하지 않습니다.

## 문의

개인정보 관련 문의는 [연락처](/contact/) 페이지를 통해 보내 주세요.

시행일: 2026년 9월 9일
```

`src/content/pages/en/privacy.md`:
```md
---
title: "Privacy Policy"
description: "How Now, Yeogi handles personal data, cookies and advertising."
---

"Now, Yeogi" (the "Site") respects your privacy.

## Information we collect

The Site has no user accounts and does not ask you to enter personal data. If you email us through the contact page, we keep your email address and message so we can reply.

## Cookies and advertising

The Site displays Google AdSense advertisements. Google and other third-party vendors use cookies to serve ads based on your prior visits. You can opt out of personalized advertising at [Google Ads Settings](https://www.google.com/settings/ads).

## Analytics

The Site may collect anonymized statistics such as page views. This data does not identify you.

## Contact

For privacy questions, use the [contact](/en/contact/) page.

Effective: 9 September 2026
```

`src/content/pages/ko/contact.md`:
```md
---
title: "연락처"
description: "지금 여기는 사이트에 대한 문의, 제보, 제휴 제안을 보내는 방법을 안내합니다."
---

글에 대한 문의, 잘못된 정보 제보, 제휴 제안은 아래 이메일로 보내 주세요.

**이메일:** hello@nowyeogi.com

보통 3일 안에 답장드립니다.
```

`src/content/pages/en/contact.md`:
```md
---
title: "Contact"
description: "How to reach Now, Yeogi with questions, corrections or partnership proposals."
---

For questions, corrections or partnership proposals, email us.

**Email:** hello@nowyeogi.com

We usually reply within three days.
```

- [ ] **Step 9: UI 문자열**

`src/i18n/ui.ts`:
```ts
import type { Lang } from '../site.config';

export const ui = {
  ko: {
    'nav.home': '홈',
    'nav.domestic': '국내',
    'nav.overseas': '해외',
    'nav.about': '소개',
    'nav.contact': '연락처',
    'nav.privacy': '개인정보처리방침',
    'home.latest': '최신 글',
    'home.regions': '지역별로 보기',
    'home.more': '더 보기',
    'post.places': '이 글에 나온 장소',
    'post.related': '함께 보면 좋은 글',
    'post.updated': '수정',
    'post.tags': '태그',
    'list.page': '페이지',
    'list.prev': '이전',
    'list.next': '다음',
    'list.empty': '아직 글이 없어요. 곧 채워질 거예요.',
    'ad.label': '광고',
    'lang.switch': 'English',
    'lang.switchTitle': '영어로 보기',
    'place.address': '위치',
    'place.menu': '메뉴',
    'place.hours': '영업시간',
    'place.tip': '팁',
    'place.map': '지도 보기',
    'place.kind.restaurant': '식당',
    'place.kind.cafe': '카페',
    'place.kind.spot': '명소',
    'place.kind.stay': '숙소',
    'scope.domestic': '국내',
    'scope.overseas': '해외',
    'type.travel': '여행 후기',
    'type.food': '맛집',
    'notfound.title': '페이지를 찾을 수 없어요',
    'notfound.body': '주소가 바뀌었거나 삭제된 글일 수 있어요.',
    'notfound.home': '홈으로',
    'footer.note': '가격과 영업시간은 방문 당시 기준입니다.',
    'region.title': '{region} 여행과 맛집',
    'tag.title': '#{tag}',
  },
  en: {
    'nav.home': 'Home',
    'nav.domestic': 'Korea',
    'nav.overseas': 'Abroad',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.privacy': 'Privacy',
    'home.latest': 'Latest posts',
    'home.regions': 'Browse by region',
    'home.more': 'See more',
    'post.places': 'Places in this post',
    'post.related': 'You might also like',
    'post.updated': 'Updated',
    'post.tags': 'Tags',
    'list.page': 'Page',
    'list.prev': 'Previous',
    'list.next': 'Next',
    'list.empty': 'No posts yet. Check back soon.',
    'ad.label': 'Advertisement',
    'lang.switch': '한국어',
    'lang.switchTitle': 'Read in Korean',
    'place.address': 'Address',
    'place.menu': 'Menu',
    'place.hours': 'Hours',
    'place.tip': 'Tip',
    'place.map': 'Open map',
    'place.kind.restaurant': 'Restaurant',
    'place.kind.cafe': 'Café',
    'place.kind.spot': 'Spot',
    'place.kind.stay': 'Stay',
    'scope.domestic': 'Korea',
    'scope.overseas': 'Abroad',
    'type.travel': 'Travel',
    'type.food': 'Food',
    'notfound.title': 'Page not found',
    'notfound.body': 'The address may have changed or the post was removed.',
    'notfound.home': 'Back to home',
    'footer.note': 'Prices and hours are as of our visit.',
    'region.title': 'Travel and food in {region}',
    'tag.title': '#{tag}',
  },
} as const;

export type UiKey = keyof (typeof ui)['ko'];

export function t(lang: Lang, key: UiKey, vars: Record<string, string> = {}): string {
  let s: string = ui[lang][key] ?? ui.ko[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

export function formatDate(lang: Lang, d: Date): string {
  return new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
```

- [ ] **Step 10: posts.ts (astro:content 래퍼)**

`src/lib/posts.ts`:
```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../site.config';
import { splitId, localePath, sortByDateDesc, isPublished } from './postUtils';

export type Post = CollectionEntry<'posts'>;

export async function getPosts(lang: Lang): Promise<Post[]> {
  const all = await getCollection('posts', ({ id, data }) => splitId(id).lang === lang && isPublished(data, import.meta.env.DEV));
  return sortByDateDesc(all);
}

export async function getTranslation(post: Post): Promise<Post | undefined> {
  const { lang, slug } = splitId(post.id);
  const other: Lang = lang === 'ko' ? 'en' : 'ko';
  return (await getPosts(other)).find((p) => splitId(p.id).slug === slug);
}

export function postSlug(post: Post): string {
  return splitId(post.id).slug;
}

export function postPath(post: Post): string {
  const { lang, slug } = splitId(post.id);
  return localePath(lang, `/posts/${slug}/`);
}
```

- [ ] **Step 11: 빌드와 테스트**

Run: `npm test && npm run build 2>&1 | tail -15`
Expected: vitest 8 passed. 빌드 성공(컬렉션은 아직 어느 페이지에서도 쓰지 않으므로 스키마 검증은 dev/빌드 시 로딩 단계에서만 일어남). 스키마 오류가 나면 메시지의 파일 이름을 보고 frontmatter를 고친다.

Run: `npx astro check 2>&1 | tail -5`
Expected: 오류 0. (`.astro/types.d.ts`가 없으면 `npx astro sync` 먼저.)

- [ ] **Step 12: 커밋**

```bash
git add -A
git commit -m "feat: 콘텐츠 스키마, 샘플 글, UI 문자열, 글 유틸"
```

---

### Task 3: 레이아웃, 공용 컴포넌트, 홈

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Seo.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/LangSwitch.astro`, `src/components/AdSlot.astro`, `src/components/PostCard.astro`, `src/components/RegionChips.astro`, `src/views/HomeView.astro`, `src/pages/en/index.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `siteConfig`, `t`, `formatDate`, `getPosts`, `postPath`, `regions`, `regionName`, `localePath`.
- Produces:
  - `BaseLayout` props: `{ lang: Lang; title: string; description: string; path: string; alternates?: Partial<Record<Lang, string>>; image?: string; type?: 'website' | 'article'; jsonLd?: object[]; publishedTime?: Date; modifiedTime?: Date }`
  - `AdSlot` props: `{ lang: Lang; slot: 'top' | 'bottom' | 'list' }`
  - `PostCard` props: `{ post: Post; lang: Lang; eager?: boolean }`
  - `RegionChips` props: `{ lang: Lang; keys: string[] }`

- [ ] **Step 1: Seo.astro**

```astro
---
import siteConfig, { type Lang } from '../site.config';

interface Props {
  lang: Lang;
  title: string;
  description: string;
  path: string;
  alternates?: Partial<Record<Lang, string>>;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: object[];
  publishedTime?: Date;
  modifiedTime?: Date;
}
const { lang, title, description, path, alternates = {}, image, type = 'website', jsonLd = [], publishedTime, modifiedTime } = Astro.props;
const base = siteConfig.url.replace(/\/$/, '');
const abs = (p: string) => (p.startsWith('http') ? p : `${base}${p}`);
const canonical = abs(path);
const fullTitle = title === siteConfig.name[lang] ? title : `${title} | ${siteConfig.name[lang]}`;
const ogImage = abs(image ?? '/images/sample/00.webp');
const alt = { [lang]: path, ...alternates } as Partial<Record<Lang, string>>;
const xDefault = alt.ko ?? path;
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
{Object.entries(alt).map(([l, p]) => <link rel="alternate" hreflang={l} href={abs(p!)} />)}
<link rel="alternate" hreflang="x-default" href={abs(xDefault)} />
<meta property="og:site_name" content={siteConfig.name[lang]} />
<meta property="og:type" content={type} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={ogImage} />
<meta property="og:locale" content={lang === 'ko' ? 'ko_KR' : 'en_US'} />
{publishedTime && <meta property="article:published_time" content={publishedTime.toISOString()} />}
{modifiedTime && <meta property="article:modified_time" content={modifiedTime.toISOString()} />}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage} />
{jsonLd.map((obj) => <script type="application/ld+json" set:html={JSON.stringify(obj)} />)}
```

- [ ] **Step 2: AdSlot.astro**

```astro
---
import siteConfig, { type Lang } from '../site.config';
import { t } from '../i18n/ui';

interface Props { lang: Lang; slot: 'top' | 'bottom' | 'list' }
const { lang, slot } = Astro.props;
const client = siteConfig.adsense.client.trim();
const slotId = siteConfig.adsense.slots[slot]?.trim();
const enabled = Boolean(client && slotId);
---
{enabled && (
  <div class="ad" data-ad={slot}>
    <span class="ad-label">{t(lang, 'ad.label')}</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client={client} data-ad-slot={slotId} data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script is:inline>(adsbygoogle = window.adsbygoogle || []).push({});</script>
  </div>
)}
```

- [ ] **Step 3: LangSwitch, Header, Footer**

`src/components/LangSwitch.astro`:
```astro
---
import type { Lang } from '../site.config';
import { t } from '../i18n/ui';
import { localePath } from '../lib/postUtils';

interface Props { lang: Lang; alternates?: Partial<Record<Lang, string>> }
const { lang, alternates = {} } = Astro.props;
const other: Lang = lang === 'ko' ? 'en' : 'ko';
const href = alternates[other] ?? localePath(other, '/');
---
<a class="lang-switch chip" href={href} hreflang={other} lang={other} title={t(lang, 'lang.switchTitle')}>{t(lang, 'lang.switch')}</a>
```

`src/components/Header.astro`:
```astro
---
import siteConfig, { type Lang } from '../site.config';
import { t } from '../i18n/ui';
import { localePath } from '../lib/postUtils';
import LangSwitch from './LangSwitch.astro';

interface Props { lang: Lang; alternates?: Partial<Record<Lang, string>> }
const { lang, alternates } = Astro.props;
const nav = [
  { href: localePath(lang, '/domestic/'), label: t(lang, 'nav.domestic') },
  { href: localePath(lang, '/overseas/'), label: t(lang, 'nav.overseas') },
  { href: localePath(lang, '/about/'), label: t(lang, 'nav.about') },
];
---
<header class="site-header">
  <div class="container row">
    <a class="logo" href={localePath(lang, '/')}>
      <span class="logo-dot"></span>{siteConfig.name[lang]}
    </a>
    <nav aria-label="main">
      {nav.map((n) => <a href={n.href}>{n.label}</a>)}
      <LangSwitch lang={lang} alternates={alternates} />
    </nav>
  </div>
</header>
<style>
  .site-header { position: sticky; top: 0; z-index: 10; background: rgba(251, 250, 247, .85); backdrop-filter: blur(10px); border-bottom: 1px solid var(--c-line); }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; height: 64px; }
  .logo { font-family: var(--font-head); font-weight: 700; font-size: 1.25rem; color: var(--c-text); display: flex; align-items: center; gap: .5rem; }
  .logo:hover { text-decoration: none; }
  .logo-dot { width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, var(--c-primary), var(--c-accent-2)); box-shadow: var(--shadow-sm); }
  nav { display: flex; align-items: center; gap: 1.1rem; }
  nav a { color: var(--c-text); font-weight: 500; }
  @media (max-width: 640px) { nav { gap: .7rem; font-size: .92rem; } .logo { font-size: 1.05rem; } }
</style>
```

`src/components/Footer.astro`:
```astro
---
import siteConfig, { type Lang } from '../site.config';
import { t } from '../i18n/ui';
import { localePath } from '../lib/postUtils';

interface Props { lang: Lang }
const { lang } = Astro.props;
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="container">
    <nav>
      <a href={localePath(lang, '/about/')}>{t(lang, 'nav.about')}</a>
      <a href={localePath(lang, '/privacy/')}>{t(lang, 'nav.privacy')}</a>
      <a href={localePath(lang, '/contact/')}>{t(lang, 'nav.contact')}</a>
      <a href={localePath(lang, '/rss.xml')}>RSS</a>
    </nav>
    <p class="small muted">{t(lang, 'footer.note')}</p>
    <p class="small muted">© {year} {siteConfig.name[lang]}</p>
  </div>
</footer>
<style>
  .site-footer { margin-top: 4rem; padding: 2.5rem 0; border-top: 1px solid var(--c-line); background: var(--c-primary-soft); }
  nav { display: flex; flex-wrap: wrap; gap: 1.2rem; margin-bottom: 1rem; }
  nav a { color: var(--c-text); }
  p { margin: .2em 0; }
</style>
```

- [ ] **Step 4: BaseLayout.astro**

```astro
---
import '../styles/global.css';
import siteConfig, { type Lang } from '../site.config';
import Seo from '../components/Seo.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  lang: Lang;
  title: string;
  description: string;
  path: string;
  alternates?: Partial<Record<Lang, string>>;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: object[];
  publishedTime?: Date;
  modifiedTime?: Date;
}
const { lang, alternates, ...seo } = Astro.props;
const client = siteConfig.adsense.client.trim();
---
<!doctype html>
<html lang={lang === 'ko' ? 'ko' : 'en'}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;600;700&display=swap" />
    <link rel="alternate" type="application/rss+xml" title={siteConfig.name[lang]} href={lang === 'ko' ? '/rss.xml' : '/en/rss.xml'} />
    <Seo lang={lang} alternates={alternates} {...seo} />
    {client && <script is:inline async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`} crossorigin="anonymous"></script>}
  </head>
  <body>
    <Header lang={lang} alternates={alternates} />
    <main>
      <slot />
    </main>
    <Footer lang={lang} />
  </body>
</html>
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ec5f0"/><stop offset="1" stop-color="#ffd6e0"/></linearGradient></defs><circle cx="32" cy="32" r="28" fill="url(#g)"/><circle cx="32" cy="28" r="9" fill="#fff"/><path d="M32 60 20 40h24z" fill="#fff" opacity=".9"/></svg>
```

- [ ] **Step 5: PostCard, RegionChips**

`src/components/PostCard.astro`:
```astro
---
import type { Lang } from '../site.config';
import type { Post } from '../lib/posts';
import { postPath } from '../lib/posts';
import { t, formatDate, type UiKey } from '../i18n/ui';
import { regionName } from '../data/regions';

interface Props { post: Post; lang: Lang; eager?: boolean }
const { post, lang, eager = false } = Astro.props;
const cover = post.data.images.find((i) => i.src === post.data.cover);
---
<article class="card">
  <a href={postPath(post)} class="cover">
    <img src={post.data.cover} alt={cover?.alt ?? ''} width={cover?.width ?? 1600} height={cover?.height ?? 1000} loading={eager ? 'eager' : 'lazy'} decoding="async" />
  </a>
  <div class="body">
    <div class="meta">
      <span class="badge">{regionName(post.data.region, lang)}</span>
      <span class={`badge ${post.data.type === 'food' ? 'accent' : ''}`}>{t(lang, `type.${post.data.type}` as UiKey)}</span>
    </div>
    <h3><a href={postPath(post)}>{post.data.title}</a></h3>
    <p class="small muted">{post.data.description}</p>
    <time class="small muted" datetime={post.data.pubDate.toISOString()}>{formatDate(lang, post.data.pubDate)}</time>
  </div>
</article>
<style>
  .card { background: var(--c-surface); border-radius: var(--radius); box-shadow: var(--shadow-sm); overflow: hidden; display: flex; flex-direction: column; transition: transform .2s, box-shadow .2s; }
  .card:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
  .cover img { aspect-ratio: 16 / 10; object-fit: cover; width: 100%; }
  .body { padding: 1.1rem 1.2rem 1.3rem; display: flex; flex-direction: column; gap: .5rem; }
  .meta { display: flex; gap: .4rem; }
  h3 { margin: 0; font-size: 1.1rem; }
  h3 a { color: var(--c-text); }
  p { margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
```

`src/components/RegionChips.astro`:
```astro
---
import type { Lang } from '../site.config';
import { regionName } from '../data/regions';
import { localePath } from '../lib/postUtils';

interface Props { lang: Lang; keys: string[] }
const { lang, keys } = Astro.props;
---
<div class="chips">
  {keys.map((k) => <a class="chip" href={localePath(lang, `/regions/${k}/`)}>{regionName(k, lang)}</a>)}
</div>
<style>
  .chips { display: flex; flex-wrap: wrap; gap: .6rem; }
</style>
```

- [ ] **Step 6: HomeView와 홈 라우트**

`src/views/HomeView.astro`:
```astro
---
import siteConfig, { type Lang } from '../site.config';
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import RegionChips from '../components/RegionChips.astro';
import AdSlot from '../components/AdSlot.astro';
import { getPosts } from '../lib/posts';
import { t } from '../i18n/ui';
import { localePath } from '../lib/postUtils';

interface Props { lang: Lang }
const { lang } = Astro.props;
const posts = await getPosts(lang);
const latest = posts.slice(0, 9);
const regionKeys = [...new Set(posts.map((p) => p.data.region))];
---
<BaseLayout lang={lang} title={siteConfig.name[lang]} description={siteConfig.tagline[lang]} path={localePath(lang, '/')} alternates={{ ko: '/', en: '/en/' }}>
  <section class="hero">
    <div class="container">
      <p class="eyebrow">{t(lang, 'scope.domestic')} · {t(lang, 'scope.overseas')}</p>
      <h1>{siteConfig.name[lang]}</h1>
      <p class="tagline">{siteConfig.tagline[lang]}</p>
    </div>
  </section>

  <section class="section container">
    <div class="section-title">
      <h2>{t(lang, 'home.latest')}</h2>
      <a class="small" href={localePath(lang, '/domestic/')}>{t(lang, 'home.more')} →</a>
    </div>
    {latest.length === 0 ? (
      <p class="muted">{t(lang, 'list.empty')}</p>
    ) : (
      <div class="grid">
        {latest.map((post, i) => (
          <>
            <PostCard post={post} lang={lang} eager={i < 3} />
            {i === 5 && <div class="span-all"><AdSlot lang={lang} slot="list" /></div>}
          </>
        ))}
      </div>
    )}
  </section>

  {regionKeys.length > 0 && (
    <section class="section container">
      <div class="section-title"><h2>{t(lang, 'home.regions')}</h2></div>
      <RegionChips lang={lang} keys={regionKeys} />
    </section>
  )}
</BaseLayout>
<style>
  .hero { padding: 4rem 0 3rem; background: radial-gradient(ellipse at 20% 0%, var(--c-primary-soft), transparent 60%), radial-gradient(ellipse at 90% 20%, var(--c-accent-2), transparent 50%); }
  .eyebrow { color: var(--c-primary-deep); font-weight: 600; letter-spacing: .08em; font-size: .85rem; margin-bottom: .6em; }
  .hero h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: .3em; }
  .tagline { max-width: 40ch; color: var(--c-muted); font-size: 1.1rem; margin: 0; }
  .span-all { grid-column: 1 / -1; }
</style>
```

`src/pages/index.astro` (교체):
```astro
---
import HomeView from '../views/HomeView.astro';
---
<HomeView lang="ko" />
```

`src/pages/en/index.astro`:
```astro
---
import HomeView from '../../views/HomeView.astro';
---
<HomeView lang="en" />
```

- [ ] **Step 7: 개발 서버로 확인**

Run: `npm run dev -- --port 4321 &` 후 `sleep 4 && curl -s http://localhost:4321/ | grep -o '<title>[^<]*' && curl -s http://localhost:4321/en/ | grep -o 'hreflang="[a-z-]*"' | sort -u; kill %1`
Expected: `<title>지금 여기는`, hreflang에 `en`, `ko`, `x-default`. 샘플 글(draft)이 dev에서 카드로 보여야 한다. 브라우저로 `http://localhost:4321/`을 열어 파스텔 히어로, 카드 3개 이상, 지역 칩을 눈으로 확인한다.

- [ ] **Step 8: 빌드 및 커밋**

Run: `npm run build 2>&1 | tail -8`
Expected: 성공. `dist/index.html`, `dist/en/index.html` 존재. draft라서 카드는 없고 "아직 글이 없어요" 문구가 있어야 한다.

```bash
git add -A
git commit -m "feat: 레이아웃, 헤더/푸터, SEO, 광고 슬롯, 홈 페이지(한/영)"
```

---

### Task 4: 글 상세 페이지와 Markdown 플러그인

**Files:**
- Create: `src/components/PlaceCard.astro`, `src/views/PostView.astro`, `src/pages/posts/[slug].astro`, `src/pages/en/posts/[slug].astro`, `src/lib/markdown/rehypeFigures.test.mjs`, `src/lib/markdown/rehypeAdSlot.test.mjs`
- Modify: `src/lib/markdown/rehypeFigures.mjs`, `src/lib/markdown/rehypeAdSlot.mjs`, `vitest.config.ts`(include에 `src/**/*.test.mjs` 추가)

**Interfaces:**
- Consumes: `BaseLayout`, `AdSlot`, `PostCard`, `getPosts`, `getTranslation`, `postPath`, `postSlug`, `pickRelated`, `regionName`, `t`, `formatDate`.
- Produces: `rehypeFigures()` (unified 플러그인, `file.data.astro.frontmatter.images`에서 width/height 조회), `rehypeAdSlot({ client, slot })`, `PlaceCard` props `{ place: Post['data']['places'][number]; lang: Lang }`.

- [ ] **Step 1: 플러그인 실패 테스트**

`vitest.config.ts`의 include를 `['scripts/**/*.test.mjs', 'src/**/*.test.ts', 'src/**/*.test.mjs']`로 바꾼다.

`src/lib/markdown/rehypeFigures.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { rehypeFigures } from './rehypeFigures.mjs';

const img = (src, alt) => ({ type: 'element', tagName: 'img', properties: { src, alt }, children: [] });
const p = (...children) => ({ type: 'element', tagName: 'p', properties: {}, children });
const run = (tree, frontmatter = {}) => {
  rehypeFigures()(tree, { data: { astro: { frontmatter } } });
  return tree;
};

describe('rehypeFigures', () => {
  it('img만 있는 p를 figure로 바꾸고 alt를 캡션으로 쓴다', () => {
    const tree = { type: 'root', children: [p(img('/images/a/01.webp', '바다'))] };
    run(tree, { images: [{ src: '/images/a/01.webp', width: 1600, height: 1000 }] });
    const fig = tree.children[0];
    expect(fig.tagName).toBe('figure');
    expect(fig.children[0].tagName).toBe('img');
    expect(fig.children[0].properties).toMatchObject({ loading: 'lazy', decoding: 'async', width: 1600, height: 1000 });
    expect(fig.children[1].tagName).toBe('figcaption');
    expect(fig.children[1].children[0].value).toBe('바다');
  });
  it('alt가 없으면 figcaption을 만들지 않는다', () => {
    const tree = { type: 'root', children: [p(img('/x.webp', ''))] };
    run(tree);
    expect(tree.children[0].children).toHaveLength(1);
  });
  it('텍스트가 섞인 p는 건드리지 않는다', () => {
    const tree = { type: 'root', children: [p({ type: 'text', value: '앞' }, img('/x.webp', 'a'))] };
    run(tree);
    expect(tree.children[0].tagName).toBe('p');
  });
});
```

`src/lib/markdown/rehypeAdSlot.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { rehypeAdSlot } from './rehypeAdSlot.mjs';

const h2 = (text) => ({ type: 'element', tagName: 'h2', properties: {}, children: [{ type: 'text', value: text }] });
const p = () => ({ type: 'element', tagName: 'p', properties: {}, children: [] });
const tags = (tree) => tree.children.map((c) => c.tagName);

describe('rehypeAdSlot', () => {
  it('client와 slot이 있으면 두 번째 h2 앞에 광고를 넣는다', () => {
    const tree = { type: 'root', children: [p(), h2('a'), p(), h2('b'), p()] };
    rehypeAdSlot({ client: 'ca-pub-1', slot: '123' })(tree);
    expect(tags(tree)).toEqual(['p', 'h2', 'p', 'div', 'h2', 'p']);
    const ad = tree.children[3];
    expect(ad.properties.className).toContain('ad');
    const ins = ad.children.find((c) => c.tagName === 'ins');
    expect(ins.properties).toMatchObject({ dataAdClient: 'ca-pub-1', dataAdSlot: '123' });
  });
  it('h2가 하나뿐이면 넣지 않는다', () => {
    const tree = { type: 'root', children: [p(), h2('a'), p()] };
    rehypeAdSlot({ client: 'ca-pub-1', slot: '123' })(tree);
    expect(tags(tree)).toEqual(['p', 'h2', 'p']);
  });
  it('client가 비어 있으면 아무것도 하지 않는다', () => {
    const tree = { type: 'root', children: [h2('a'), h2('b')] };
    rehypeAdSlot({ client: '', slot: '123' })(tree);
    expect(tags(tree)).toEqual(['h2', 'h2']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/markdown`
Expected: FAIL (빈 플러그인이라 assertion 실패)

- [ ] **Step 3: 플러그인 구현**

`src/lib/markdown/rehypeFigures.mjs`:
```js
import { visit } from 'unist-util-visit';

/** p > img 만 있는 문단을 figure로 바꾸고 lazy/width/height를 붙인다. */
export function rehypeFigures() {
  return (tree, file) => {
    const images = file?.data?.astro?.frontmatter?.images ?? [];
    const dims = new Map(images.map((i) => [i.src, i]));
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || !parent || index === undefined) return;
      const kids = node.children.filter((c) => !(c.type === 'text' && c.value.trim() === ''));
      if (kids.length !== 1 || kids[0].tagName !== 'img') return;
      const img = kids[0];
      const meta = dims.get(img.properties.src);
      img.properties.loading = 'lazy';
      img.properties.decoding = 'async';
      if (meta?.width && meta?.height) {
        img.properties.width = meta.width;
        img.properties.height = meta.height;
      }
      const alt = String(img.properties.alt ?? '').trim();
      const children = [img];
      if (alt) children.push({ type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: alt }] });
      parent.children[index] = { type: 'element', tagName: 'figure', properties: {}, children };
    });
  };
}
```

`src/lib/markdown/rehypeAdSlot.mjs`:
```js
/** 두 번째 최상위 h2 앞에 AdSense 인아티클 광고를 삽입한다. */
export function rehypeAdSlot({ client = '', slot = '' } = {}) {
  return (tree) => {
    if (!client || !slot) return;
    let seen = 0;
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== 'element' || node.tagName !== 'h2') continue;
      seen++;
      if (seen < 2) continue;
      tree.children.splice(i, 0, adNode(client, slot));
      return;
    }
  };
}

function adNode(client, slot) {
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['ad'], dataAd: 'in-article' },
    children: [
      { type: 'element', tagName: 'span', properties: { className: ['ad-label'] }, children: [{ type: 'text', value: 'AD' }] },
      {
        type: 'element',
        tagName: 'ins',
        properties: { className: ['adsbygoogle'], style: 'display:block; text-align:center;', dataAdLayout: 'in-article', dataAdFormat: 'fluid', dataAdClient: client, dataAdSlot: slot },
        children: [],
      },
      { type: 'element', tagName: 'script', properties: {}, children: [{ type: 'text', value: '(adsbygoogle = window.adsbygoogle || []).push({});' }] },
    ],
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/markdown`
Expected: 6 passed

- [ ] **Step 5: PlaceCard.astro**

```astro
---
import type { Lang } from '../site.config';
import type { Post } from '../lib/posts';
import { t, type UiKey } from '../i18n/ui';

type Place = Post['data']['places'][number];
interface Props { place: Place; lang: Lang }
const { place, lang } = Astro.props;
const stars = place.rating ? '★'.repeat(Math.floor(place.rating)) + (place.rating % 1 ? '☆' : '') : '';
---
<div class="place">
  <div class="head">
    <span class="badge">{t(lang, `place.kind.${place.kind}` as UiKey)}</span>
    <strong>{place.name}</strong>
    {stars && <span class="stars" aria-label={`${place.rating}/5`}>{stars} <span class="small muted">{place.rating}</span></span>}
  </div>
  <dl>
    {place.address && <><dt>{t(lang, 'place.address')}</dt><dd>{place.address}</dd></>}
    {place.hours && <><dt>{t(lang, 'place.hours')}</dt><dd>{place.hours}</dd></>}
    {place.menu.length > 0 && <><dt>{t(lang, 'place.menu')}</dt><dd>{place.menu.map((m) => `${m.name} ${m.price}`).join(' · ')}</dd></>}
    {place.tip && <><dt>{t(lang, 'place.tip')}</dt><dd>{place.tip}</dd></>}
  </dl>
  {place.mapUrl && <a class="small" href={place.mapUrl} target="_blank" rel="noopener">{t(lang, 'place.map')} ↗</a>}
</div>
<style>
  .place { background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--radius); padding: 1rem 1.2rem; box-shadow: var(--shadow-sm); }
  .head { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-bottom: .5rem; }
  .stars { color: #f0b34e; font-size: .95rem; }
  dl { display: grid; grid-template-columns: max-content 1fr; gap: .25rem .9rem; margin: 0; font-size: .95rem; }
  dt { color: var(--c-muted); }
  dd { margin: 0; }
</style>
```

- [ ] **Step 6: PostView.astro**

```astro
---
import siteConfig, { type Lang } from '../site.config';
import BaseLayout from '../layouts/BaseLayout.astro';
import AdSlot from '../components/AdSlot.astro';
import PostCard from '../components/PostCard.astro';
import PlaceCard from '../components/PlaceCard.astro';
import { render } from 'astro:content';
import { getPosts, getTranslation, postPath, type Post } from '../lib/posts';
import { pickRelated, localePath } from '../lib/postUtils';
import { regionName } from '../data/regions';
import { t, formatDate, type UiKey } from '../i18n/ui';

interface Props { lang: Lang; post: Post }
const { lang, post } = Astro.props;
const { Content } = await render(post);
const translation = await getTranslation(post);
const alternates: Partial<Record<Lang, string>> = { [lang]: postPath(post) };
if (translation) alternates[lang === 'ko' ? 'en' : 'ko'] = postPath(translation);
const related = pickRelated(await getPosts(lang), post, 3);
const cover = post.data.images.find((i) => i.src === post.data.cover);
const base = siteConfig.url.replace(/\/$/, '');
const foodPlaces = post.data.places.filter((p) => p.kind === 'restaurant' || p.kind === 'cafe');

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.data.title,
    description: post.data.description,
    image: `${base}${post.data.cover}`,
    datePublished: post.data.pubDate.toISOString(),
    dateModified: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
    inLanguage: lang === 'ko' ? 'ko-KR' : 'en-US',
    author: { '@type': 'Person', name: siteConfig.author },
    publisher: { '@type': 'Organization', name: siteConfig.name[lang] },
    mainEntityOfPage: `${base}${postPath(post)}`,
    keywords: post.data.tags.join(', '),
    ...(foodPlaces.length > 0 && {
      mentions: foodPlaces.map((p) => ({
        '@type': p.kind === 'cafe' ? 'CafeOrCoffeeShop' : 'Restaurant',
        name: p.name,
        ...(p.address && { address: p.address }),
      })),
    }),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteConfig.name[lang], item: `${base}${localePath(lang, '/')}` },
      { '@type': 'ListItem', position: 2, name: regionName(post.data.region, lang), item: `${base}${localePath(lang, `/regions/${post.data.region}/`)}` },
      { '@type': 'ListItem', position: 3, name: post.data.title, item: `${base}${postPath(post)}` },
    ],
  },
];
---
<BaseLayout lang={lang} title={post.data.title} description={post.data.description} path={postPath(post)} alternates={alternates} image={post.data.cover} type="article" jsonLd={jsonLd} publishedTime={post.data.pubDate} modifiedTime={post.data.updatedDate}>
  <article class="container">
    <header class="post-head prose">
      <div class="meta">
        <a class="badge" href={localePath(lang, `/regions/${post.data.region}/`)}>{regionName(post.data.region, lang)}</a>
        <span class={`badge ${post.data.type === 'food' ? 'accent' : ''}`}>{t(lang, `type.${post.data.type}` as UiKey)}</span>
        <time class="small muted" datetime={post.data.pubDate.toISOString()}>{formatDate(lang, post.data.pubDate)}</time>
        {post.data.updatedDate && <span class="small muted">({t(lang, 'post.updated')} {formatDate(lang, post.data.updatedDate)})</span>}
      </div>
      <h1>{post.data.title}</h1>
      <p class="lead muted">{post.data.description}</p>
    </header>

    <figure class="cover">
      <img src={post.data.cover} alt={cover?.alt ?? ''} width={cover?.width ?? 1600} height={cover?.height ?? 1000} loading="eager" fetchpriority="high" />
    </figure>

    <div class="prose"><AdSlot lang={lang} slot="top" /></div>

    {post.data.places.length > 0 && (
      <section class="places prose">
        <h2 class="places-title">{t(lang, 'post.places')}</h2>
        <div class="place-list">{post.data.places.map((p) => <PlaceCard place={p} lang={lang} />)}</div>
      </section>
    )}

    <div class="prose body"><Content /></div>

    {post.data.tags.length > 0 && (
      <div class="prose tags">
        {post.data.tags.map((tag) => <a class="chip" href={localePath(lang, `/tags/${encodeURIComponent(tag)}/`)}>#{tag}</a>)}
      </div>
    )}

    <div class="prose"><AdSlot lang={lang} slot="bottom" /></div>
  </article>

  {related.length > 0 && (
    <section class="section container">
      <div class="section-title"><h2>{t(lang, 'post.related')}</h2></div>
      <div class="grid">{related.map((p) => <PostCard post={p} lang={lang} />)}</div>
    </section>
  )}
</BaseLayout>
<style>
  .post-head { padding-top: 2.5rem; }
  .meta { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; margin-bottom: .8rem; }
  .lead { font-size: 1.05rem; }
  .cover { margin: 1.5rem auto 2rem; max-width: var(--max); }
  .cover img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: var(--radius); box-shadow: var(--shadow); }
  .places-title { border: 0; margin-top: 0; font-size: 1.2rem; }
  .place-list { display: grid; gap: .8rem; margin-bottom: 2rem; }
  .tags { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 2rem; }
</style>
```

- [ ] **Step 7: 라우트 파일**

`src/pages/posts/[slug].astro`:
```astro
---
import PostView from '../../views/PostView.astro';
import { getPosts, postSlug } from '../../lib/posts';

export async function getStaticPaths() {
  const posts = await getPosts('ko');
  return posts.map((post) => ({ params: { slug: postSlug(post) }, props: { post } }));
}
const { post } = Astro.props;
---
<PostView lang="ko" post={post} />
```

`src/pages/en/posts/[slug].astro`:
```astro
---
import PostView from '../../../views/PostView.astro';
import { getPosts, postSlug } from '../../../lib/posts';

export async function getStaticPaths() {
  const posts = await getPosts('en');
  return posts.map((post) => ({ params: { slug: postSlug(post) }, props: { post } }));
}
const { post } = Astro.props;
---
<PostView lang="en" post={post} />
```

- [ ] **Step 8: 확인**

Run: `npm run dev -- --port 4321 & sleep 4; curl -s http://localhost:4321/posts/jeju-aewol-cafe-2026-09/ > /tmp/p.html; grep -c '<figure' /tmp/p.html; grep -o 'hreflang="[a-z-]*"' /tmp/p.html | sort -u; grep -c 'application/ld+json' /tmp/p.html; kill %1`
Expected: figure 개수 3 이상(커버 1 + 본문 2), hreflang en/ko/x-default, ld+json 2. 브라우저에서 글 페이지를 열어 장소 카드, 본문 이미지 캡션, 관련 글을 눈으로 확인한다.

- [ ] **Step 9: 빌드 및 커밋**

Run: `npm test && npm run build 2>&1 | tail -5`
Expected: 14 passed, 빌드 성공.

```bash
git add -A
git commit -m "feat: 글 상세 페이지, 장소 카드, figure/광고 rehype 플러그인"
```

---

### Task 5: 목록 페이지 (국내/해외/지역/태그)와 페이지네이션

**Files:**
- Create: `src/components/Pagination.astro`, `src/views/ListView.astro`, `src/pages/domestic/[...page].astro`, `src/pages/overseas/[...page].astro`, `src/pages/regions/[region]/[...page].astro`, `src/pages/tags/[tag]/[...page].astro`, 그리고 `src/pages/en/` 아래 같은 네 파일

**Interfaces:**
- Consumes: `getPosts`, `collectTags`, `regions`, `regionName`, `t`, `BaseLayout`, `PostCard`, `AdSlot`, `siteConfig.postsPerPage`.
- Produces: `ListView` props `{ lang: Lang; title: string; description: string; page: Page<Post>; basePath: string }` (basePath는 `/domestic/`처럼 로케일 접두사 없는 경로).

- [ ] **Step 1: Pagination.astro**

```astro
---
import type { Page } from 'astro';
import type { Lang } from '../site.config';
import { t } from '../i18n/ui';

interface Props { page: Page<any>; lang: Lang }
const { page, lang } = Astro.props;
---
{page.lastPage > 1 && (
  <nav class="pagination" aria-label="pagination">
    {page.url.prev ? <a class="chip" href={page.url.prev}>← {t(lang, 'list.prev')}</a> : <span />}
    <span class="small muted">{t(lang, 'list.page')} {page.currentPage} / {page.lastPage}</span>
    {page.url.next ? <a class="chip" href={page.url.next}>{t(lang, 'list.next')} →</a> : <span />}
  </nav>
)}
<style>
  .pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 2.5rem; }
</style>
```

- [ ] **Step 2: ListView.astro**

```astro
---
import type { Page } from 'astro';
import type { Lang } from '../site.config';
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';
import AdSlot from '../components/AdSlot.astro';
import Pagination from '../components/Pagination.astro';
import type { Post } from '../lib/posts';
import { t } from '../i18n/ui';
import { localePath } from '../lib/postUtils';

interface Props { lang: Lang; title: string; description: string; page: Page<Post>; basePath: string }
const { lang, title, description, page, basePath } = Astro.props;
const suffix = page.currentPage > 1 ? `${page.currentPage}/` : '';
const path = localePath(lang, `${basePath}${suffix}`);
const alternates = { ko: localePath('ko', `${basePath}${suffix}`), en: localePath('en', `${basePath}${suffix}`) };
---
<BaseLayout lang={lang} title={title} description={description} path={path} alternates={alternates}>
  <section class="section container">
    <header class="list-head">
      <h1>{title}</h1>
      <p class="muted">{description}</p>
    </header>
    {page.data.length === 0 ? (
      <p class="muted">{t(lang, 'list.empty')}</p>
    ) : (
      <div class="grid">
        {page.data.map((post, i) => (
          <>
            <PostCard post={post} lang={lang} eager={i < 3} />
            {i === 5 && <div class="span-all"><AdSlot lang={lang} slot="list" /></div>}
          </>
        ))}
      </div>
    )}
    <Pagination page={page} lang={lang} />
  </section>
</BaseLayout>
<style>
  .list-head { margin-bottom: 1.5rem; }
  .list-head p { margin: 0; }
  .span-all { grid-column: 1 / -1; }
</style>
```

- [ ] **Step 3: 국내/해외 라우트 (ko)**

`src/pages/domestic/[...page].astro`:
```astro
---
import type { GetStaticPaths } from 'astro';
import ListView from '../../views/ListView.astro';
import siteConfig from '../../site.config';
import { getPosts } from '../../lib/posts';
import { t } from '../../i18n/ui';

export const getStaticPaths = (async ({ paginate }) => {
  const posts = (await getPosts('ko')).filter((p) => p.data.scope === 'domestic');
  return paginate(posts, { pageSize: siteConfig.postsPerPage });
}) satisfies GetStaticPaths;

const { page } = Astro.props;
---
<ListView lang="ko" title={t('ko', 'scope.domestic')} description="국내 여행지와 맛집 이야기" page={page} basePath="/domestic/" />
```

`src/pages/overseas/[...page].astro`: 위와 같되 `scope === 'overseas'`, title `t('ko', 'scope.overseas')`, description `"해외 여행지와 맛집 이야기"`, basePath `/overseas/`.

- [ ] **Step 4: 지역/태그 라우트 (ko)**

`src/pages/regions/[region]/[...page].astro`:
```astro
---
import type { GetStaticPaths } from 'astro';
import ListView from '../../../views/ListView.astro';
import siteConfig from '../../../site.config';
import { getPosts } from '../../../lib/posts';
import { regionName } from '../../../data/regions';
import { t } from '../../../i18n/ui';

export const getStaticPaths = (async ({ paginate }) => {
  const posts = await getPosts('ko');
  const keys = [...new Set(posts.map((p) => p.data.region))];
  return keys.flatMap((region) =>
    paginate(posts.filter((p) => p.data.region === region), { params: { region }, pageSize: siteConfig.postsPerPage }),
  );
}) satisfies GetStaticPaths;

const { page } = Astro.props;
const { region } = Astro.params;
const name = regionName(region!, 'ko');
---
<ListView lang="ko" title={t('ko', 'region.title', { region: name })} description={`${name}에서 다녀온 여행지, 카페, 맛집을 모았어요.`} page={page} basePath={`/regions/${region}/`} />
```

`src/pages/tags/[tag]/[...page].astro`:
```astro
---
import type { GetStaticPaths } from 'astro';
import ListView from '../../../views/ListView.astro';
import siteConfig from '../../../site.config';
import { getPosts } from '../../../lib/posts';
import { collectTags } from '../../../lib/postUtils';
import { t } from '../../../i18n/ui';

export const getStaticPaths = (async ({ paginate }) => {
  const posts = await getPosts('ko');
  return collectTags(posts).flatMap(({ tag }) =>
    paginate(posts.filter((p) => p.data.tags.includes(tag)), { params: { tag }, pageSize: siteConfig.postsPerPage }),
  );
}) satisfies GetStaticPaths;

const { page } = Astro.props;
const { tag } = Astro.params;
---
<ListView lang="ko" title={t('ko', 'tag.title', { tag: tag! })} description={`'${tag}' 태그가 붙은 글`} page={page} basePath={`/tags/${encodeURIComponent(tag!)}/`} />
```

- [ ] **Step 5: 영어 라우트 4개**

`src/pages/en/domestic/[...page].astro`, `src/pages/en/overseas/[...page].astro`, `src/pages/en/regions/[region]/[...page].astro`, `src/pages/en/tags/[tag]/[...page].astro`: 한국어 파일을 복사해 `getPosts('en')`, `lang="en"`, `t('en', …)`, import 경로에 `../` 하나 추가. 영어 설명 문구:
- domestic: `"Travel spots and food finds across Korea"`
- overseas: `"Travel spots and food finds abroad"`
- region: `` `Places, cafés and restaurants we visited in ${name}.` `` (name은 `regionName(region!, 'en')`)
- tag: `` `Posts tagged '${tag}'` ``

- [ ] **Step 6: 확인**

Run: `npm run dev -- --port 4321 & sleep 4; for u in /domestic/ /overseas/ /regions/jeju/ /tags/카페/ /en/domestic/ /en/regions/tokyo/; do printf '%s ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:4321$u"; done; kill %1`
Expected: 모두 200. 브라우저로 `/regions/jeju/`를 열어 제목 "제주 여행과 맛집"과 카드 1개를 확인.

- [ ] **Step 7: 빌드 및 커밋**

Run: `npm run build 2>&1 | tail -5`
Expected: 성공. draft만 있으므로 `dist/domestic/index.html`은 빈 목록 문구를 포함.

```bash
git add -A
git commit -m "feat: 국내/해외/지역/태그 목록 페이지와 페이지네이션"
```

---

### Task 6: 정적 페이지와 404

**Files:**
- Create: `src/views/PageView.astro`, `src/pages/[pageId].astro`, `src/pages/en/[pageId].astro`, `src/pages/404.astro`

**Interfaces:**
- Consumes: `pages` 컬렉션, `BaseLayout`, `localePath`, `t`.
- Produces: `PageView` props `{ lang: Lang; entry: CollectionEntry<'pages'> }`.

- [ ] **Step 1: PageView.astro**

```astro
---
import type { CollectionEntry } from 'astro:content';
import { render } from 'astro:content';
import type { Lang } from '../site.config';
import BaseLayout from '../layouts/BaseLayout.astro';
import { localePath } from '../lib/postUtils';

interface Props { lang: Lang; entry: CollectionEntry<'pages'> }
const { lang, entry } = Astro.props;
const { Content } = await render(entry);
const pageId = entry.id.split('/')[1];
const alternates = { ko: localePath('ko', `/${pageId}/`), en: localePath('en', `/${pageId}/`) };
---
<BaseLayout lang={lang} title={entry.data.title} description={entry.data.description} path={localePath(lang, `/${pageId}/`)} alternates={alternates}>
  <article class="container prose page">
    <h1>{entry.data.title}</h1>
    <Content />
  </article>
</BaseLayout>
<style>
  .page { padding-top: 2.5rem; }
</style>
```

- [ ] **Step 2: 라우트**

`src/pages/[pageId].astro`:
```astro
---
import { getCollection } from 'astro:content';
import PageView from '../views/PageView.astro';

export async function getStaticPaths() {
  const entries = await getCollection('pages', ({ id }) => id.startsWith('ko/'));
  return entries.map((entry) => ({ params: { pageId: entry.id.split('/')[1] }, props: { entry } }));
}
const { entry } = Astro.props;
---
<PageView lang="ko" entry={entry} />
```

`src/pages/en/[pageId].astro`: 같은 내용에 `id.startsWith('en/')`, `lang="en"`, import 경로 `../../views/PageView.astro`.

- [ ] **Step 3: 404.astro**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { t } from '../i18n/ui';
---
<BaseLayout lang="ko" title={t('ko', 'notfound.title')} description={t('ko', 'notfound.body')} path="/404/">
  <section class="container notfound">
    <p class="code">404</p>
    <h1>{t('ko', 'notfound.title')}</h1>
    <p class="muted">{t('ko', 'notfound.body')}</p>
    <p class="muted">{t('en', 'notfound.title')}. {t('en', 'notfound.body')}</p>
    <p><a class="btn" href="/">{t('ko', 'notfound.home')}</a> <a class="chip" href="/en/">{t('en', 'notfound.home')}</a></p>
  </section>
</BaseLayout>
<style>
  .notfound { text-align: center; padding: 5rem 0; }
  .code { font-family: var(--font-head); font-size: 4rem; color: var(--c-primary); margin: 0; }
</style>
```

- [ ] **Step 4: 확인, 빌드, 커밋**

Run: `npm run build 2>&1 | tail -5 && ls dist/about dist/privacy dist/contact dist/en/about dist/404.html`
Expected: 모두 존재.

```bash
git add -A
git commit -m "feat: 소개/개인정보처리방침/연락처 페이지와 404"
```

---

### Task 7: RSS, 사이트맵, 빌드 검사

**Files:**
- Create: `src/pages/rss.xml.ts`, `src/pages/en/rss.xml.ts`
- Modify: `scripts/check-dist.mjs`

**Interfaces:**
- Consumes: `getPosts`, `postPath`, `siteConfig`.
- Produces: `dist/rss.xml`, `dist/en/rss.xml`; `check-dist.mjs`는 실패 시 종료 코드 1.

- [ ] **Step 1: RSS 엔드포인트**

`src/pages/rss.xml.ts`:
```ts
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import siteConfig from '../site.config';
import { getPosts, postPath } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts('ko');
  return rss({
    title: siteConfig.name.ko,
    description: siteConfig.tagline.ko,
    site: context.site ?? siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: postPath(post),
      categories: post.data.tags,
    })),
    customData: '<language>ko-KR</language>',
  });
}
```

`src/pages/en/rss.xml.ts`: `getPosts('en')`, `siteConfig.name.en`, `siteConfig.tagline.en`, `<language>en-US</language>`, import 경로 `../../`.

- [ ] **Step 2: check-dist.mjs**

```js
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
if (errors.length) {
  for (const e of errors) console.error(`✖ ${e}`);
  process.exit(1);
}
console.log(`check-dist: 통과 (한국어 글 ${ko.length}, 영어 글 ${en.length})`);
```

- [ ] **Step 3: 빌드로 검증**

Run: `npm run build 2>&1 | tail -6 && head -c 400 dist/rss.xml && grep -c '<url>' dist/sitemap-0.xml`
Expected: `check-dist: 통과 (한국어 글 0, 영어 글 0)`, RSS에 `<language>ko-KR</language>`, sitemap URL 수 10 이상.

- [ ] **Step 4: 검사 실패 경로 확인**

Run: `rm dist/ads.txt && node scripts/check-dist.mjs; echo "exit=$?"`
Expected: `✖ 없음: dist/ads.txt`, `exit=1`. 이후 `npm run build`로 복구.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: RSS 피드, 빌드 산출물 검사 스크립트"
```

---

### Task 8: 준비 스크립트 순수 함수 (TDD)

**Files:**
- Create: `scripts/lib/slug.mjs`, `scripts/lib/slug.test.mjs`, `scripts/lib/note.mjs`, `scripts/lib/note.test.mjs`, `scripts/lib/region.mjs`, `scripts/lib/region.test.mjs`, `scripts/lib/frontmatter.mjs`, `scripts/lib/frontmatter.test.mjs`, `scripts/lib/images.mjs`(planImages만), `scripts/lib/images.test.mjs`

**Interfaces:**
- Produces:
  - `validateSlug(slug: string): { ok: true } | { ok: false; reason: string }`
  - `parseNote(text: string): Note` — `Note = { region?: string; date?: string; scope?: 'domestic'|'overseas'; type?: 'travel'|'food'; companions?: string; places: Place[]; memo: string; extra: Record<string,string>; raw: string }`, `Place = { name?: string; kind: 'restaurant'|'cafe'|'spot'|'stay'; address?: string; menu: {name:string; price:string}[]; hours?: string; rating?: number; tip?: string; mapUrl?: string }`
  - `parseMenu(s: string): {name:string; price:string}[]`, `mapKind(s: string): Place['kind']`
  - `guessRegion(text: string, regions: Record<string, {ko:string; en:string; aliases:string[]}>): string | undefined`
  - `buildFrontmatter({ note, regionKey, images, today }): object` (images = `{src, alt, width, height, isCover}[]`, today = `'YYYY-MM-DD'`)
  - `serializePost(frontmatter: object, body: string): string`
  - `noteToComment(raw: string): string`
  - `planImages(filenames: string[]): { source: string; target: string; isCover: boolean }[]`

- [ ] **Step 1: 실패 테스트 5개 파일**

`scripts/lib/slug.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { validateSlug } from './slug.mjs';

describe('validateSlug', () => {
  it('규칙에 맞으면 ok', () => {
    expect(validateSlug('jeju-aewol-2026-09')).toEqual({ ok: true });
    expect(validateSlug('abc')).toEqual({ ok: true });
  });
  it('대문자, 한글, 공백, 연속 하이픈, 길이 위반을 거부한다', () => {
    expect(validateSlug('Jeju').ok).toBe(false);
    expect(validateSlug('제주').ok).toBe(false);
    expect(validateSlug('a b').ok).toBe(false);
    expect(validateSlug('a--b').ok).toBe(false);
    expect(validateSlug('-ab').ok).toBe(false);
    expect(validateSlug('ab').ok).toBe(false);
    expect(validateSlug('a'.repeat(81)).ok).toBe(false);
  });
  it('이유를 한국어로 돌려준다', () => {
    expect(validateSlug('제주').reason).toMatch(/영문 소문자/);
  });
});
```

`scripts/lib/note.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { parseNote, parseMenu, mapKind } from './note.mjs';

const sample = `지역: 제주 애월
날짜: 2026-09-01
구분: 국내
종류: 맛집
동행: 친구 2명
[장소]
이름: 봄날카페
종류: 카페
위치: 제주시 애월읍 애월북서길 25
메뉴: 아메리카노 6000 / 당근케이크 7500원
영업: 09:00-21:00
평점: 4.5
한줄평: 창가 자리에서 보는 바다가 전부다
지도: https://maps.example/1
[장소]
이름: 국수집
종류: 식당
메뉴: 고기국수 9,000원
메모: 주차는 공영주차장.
오후 3시 이후 웨이팅 30분.`;

describe('parseNote', () => {
  const note = parseNote(sample);
  it('상단 항목을 읽는다', () => {
    expect(note.region).toBe('제주 애월');
    expect(note.date).toBe('2026-09-01');
    expect(note.scope).toBe('domestic');
    expect(note.type).toBe('food');
    expect(note.companions).toBe('친구 2명');
  });
  it('장소 블록을 읽는다', () => {
    expect(note.places).toHaveLength(2);
    expect(note.places[0]).toMatchObject({ name: '봄날카페', kind: 'cafe', address: '제주시 애월읍 애월북서길 25', hours: '09:00-21:00', rating: 4.5, tip: '창가 자리에서 보는 바다가 전부다', mapUrl: 'https://maps.example/1' });
    expect(note.places[0].menu).toEqual([{ name: '아메리카노', price: '6,000원' }, { name: '당근케이크', price: '7,500원' }]);
    expect(note.places[1]).toMatchObject({ name: '국수집', kind: 'restaurant' });
  });
  it('메모와 이어지는 줄을 모은다', () => {
    expect(note.memo).toBe('주차는 공영주차장.\n오후 3시 이후 웨이팅 30분.');
  });
  it('raw를 보존하고 빈 입력도 처리한다', () => {
    expect(note.raw).toBe(sample);
    expect(parseNote('')).toMatchObject({ places: [], memo: '', extra: {} });
  });
  it('전각 콜론과 영어 키도 허용한다', () => {
    const n = parseNote('Region： Tokyo\n[place]\nname: Ramen\nkind: restaurant');
    expect(n.region).toBe('Tokyo');
    expect(n.places[0]).toMatchObject({ name: 'Ramen', kind: 'restaurant' });
  });
});

describe('parseMenu', () => {
  it('구분자 / 또는 , 로 나누고 가격을 정규화한다', () => {
    expect(parseMenu('아메리카노 6000 / 케이크 7500원')).toEqual([{ name: '아메리카노', price: '6,000원' }, { name: '케이크', price: '7,500원' }]);
    expect(parseMenu('쇼유 라멘 1100엔, 교자 500엔')).toEqual([{ name: '쇼유 라멘', price: '1,100엔' }, { name: '교자', price: '500엔' }]);
    expect(parseMenu('오마카세')).toEqual([{ name: '오마카세', price: '' }]);
    expect(parseMenu('')).toEqual([]);
  });
});

describe('mapKind', () => {
  it('한/영 표기를 kind로 바꾼다', () => {
    expect(mapKind('식당')).toBe('restaurant');
    expect(mapKind('맛집')).toBe('restaurant');
    expect(mapKind('카페')).toBe('cafe');
    expect(mapKind('숙소')).toBe('stay');
    expect(mapKind('호텔')).toBe('stay');
    expect(mapKind('명소')).toBe('spot');
    expect(mapKind('모름')).toBe('spot');
    expect(mapKind('Cafe')).toBe('cafe');
  });
});
```

`scripts/lib/region.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { guessRegion } from './region.mjs';

const regions = {
  jeju: { ko: '제주', en: 'Jeju', aliases: ['애월', '서귀포'] },
  seoul: { ko: '서울', en: 'Seoul', aliases: [] },
  tokyo: { ko: '도쿄', en: 'Tokyo', aliases: ['동경'] },
};

describe('guessRegion', () => {
  it('한글 이름, 별칭, 영어 이름을 찾는다', () => {
    expect(guessRegion('제주 애월', regions)).toBe('jeju');
    expect(guessRegion('서귀포 올레', regions)).toBe('jeju');
    expect(guessRegion('Tokyo Shibuya', regions)).toBe('tokyo');
    expect(guessRegion('동경 여행', regions)).toBe('tokyo');
  });
  it('여러 개가 걸리면 먼저 나오는 것을 고른다', () => {
    expect(guessRegion('서울에서 제주로', regions)).toBe('seoul');
  });
  it('없으면 undefined', () => {
    expect(guessRegion('화성', regions)).toBeUndefined();
    expect(guessRegion('', regions)).toBeUndefined();
  });
});
```

`scripts/lib/frontmatter.test.mjs`:
```js
import { describe, it, expect } from 'vitest';
import { buildFrontmatter, serializePost, noteToComment } from './frontmatter.mjs';
import { parseNote } from './note.mjs';

const images = [
  { src: '/images/s/00.webp', alt: '', width: 1600, height: 1000, isCover: true },
  { src: '/images/s/01.webp', alt: '', width: 1200, height: 1600, isCover: false },
];

describe('buildFrontmatter', () => {
  it('note와 이미지로 초안을 만든다', () => {
    const note = parseNote('지역: 제주\n날짜: 2026-09-01\n종류: 맛집\n[장소]\n이름: A\n종류: 카페\n메뉴: 라떼 5000');
    const fm = buildFrontmatter({ note, regionKey: 'jeju', regionScope: 'domestic', images, today: '2026-09-09' });
    expect(fm).toMatchObject({ title: '', description: '', pubDate: '2026-09-01', scope: 'domestic', region: 'jeju', type: 'food', cover: '/images/s/00.webp', tags: [], draft: true });
    expect(fm.images).toEqual([{ src: '/images/s/00.webp', alt: '', width: 1600, height: 1000 }, { src: '/images/s/01.webp', alt: '', width: 1200, height: 1600 }]);
    expect(fm.places).toEqual([{ name: 'A', kind: 'cafe', menu: [{ name: '라떼', price: '5,000원' }] }]);
  });
  it('날짜가 없으면 today, 지역을 모르면 UNKNOWN, cover가 없으면 첫 이미지', () => {
    const note = parseNote('');
    const fm = buildFrontmatter({ note, regionKey: undefined, regionScope: undefined, images: [images[1]], today: '2026-09-09' });
    expect(fm.pubDate).toBe('2026-09-09');
    expect(fm.region).toBe('UNKNOWN');
    expect(fm.scope).toBe('domestic');
    expect(fm.cover).toBe('/images/s/01.webp');
    expect(fm.type).toBe('travel');
  });
  it('종류가 없고 장소가 전부 식당/카페면 food', () => {
    const note = parseNote('[장소]\n이름: A\n종류: 식당');
    expect(buildFrontmatter({ note, regionKey: 'jeju', regionScope: 'domestic', images, today: '2026-09-09' }).type).toBe('food');
  });
});

describe('serializePost / noteToComment', () => {
  it('YAML frontmatter와 본문을 합친다', () => {
    const out = serializePost({ title: '', draft: true, tags: [] }, '본문');
    expect(out.startsWith('---\n')).toBe(true);
    expect(out).toContain('draft: true');
    expect(out.trim().endsWith('본문')).toBe(true);
  });
  it('원문을 HTML 주석으로 감싸고 --> 를 무력화한다', () => {
    const c = noteToComment('a --> b');
    expect(c.startsWith('<!--')).toBe(true);
    expect(c.endsWith('-->')).toBe(true);
    expect(c.slice(4, -3)).not.toContain('-->');
  });
});
```

`scripts/lib/images.test.mjs` (planImages 부분만; convertImage 테스트는 Task 9):
```js
import { describe, it, expect } from 'vitest';
import { planImages } from './images.mjs';

describe('planImages', () => {
  it('이미지만 골라 이름순으로 번호를 매기고 cover는 00', () => {
    const plan = planImages(['IMG_10.jpg', 'IMG_2.JPG', 'note.txt', 'cover.png', 'x.heic', 'skip.gif']);
    expect(plan).toEqual([
      { source: 'cover.png', target: '00.webp', isCover: true },
      { source: 'IMG_2.JPG', target: '01.webp', isCover: false },
      { source: 'IMG_10.jpg', target: '02.webp', isCover: false },
      { source: 'x.heic', target: '03.webp', isCover: false },
    ]);
  });
  it('cover가 없으면 01부터', () => {
    expect(planImages(['b.jpg', 'a.jpg']).map((p) => p.target)).toEqual(['01.webp', '02.webp']);
  });
  it('빈 목록', () => {
    expect(planImages([])).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run scripts/lib`
Expected: 5개 파일 모두 모듈 없음으로 FAIL.

- [ ] **Step 3: 구현**

`scripts/lib/slug.mjs`:
```js
const RULE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateSlug(slug) {
  if (typeof slug !== 'string' || slug.length < 3 || slug.length > 80) {
    return { ok: false, reason: '폴더 이름은 3~80자여야 합니다.' };
  }
  if (!RULE.test(slug)) {
    return { ok: false, reason: '폴더 이름은 영문 소문자, 숫자, 하이픈만 쓸 수 있습니다. 예: jeju-aewol-2026-09' };
  }
  return { ok: true };
}
```

`scripts/lib/note.mjs`:
```js
const TOP_KEYS = {
  region: ['지역', 'region'],
  date: ['날짜', 'date'],
  scope: ['구분', 'scope'],
  type: ['종류', 'type'],
  companions: ['동행', 'companions', 'with'],
  memo: ['메모', 'memo', 'note'],
};
const PLACE_KEYS = {
  name: ['이름', 'name'],
  kind: ['종류', 'kind', 'type'],
  address: ['위치', '주소', 'address', 'location'],
  menu: ['메뉴', 'menu'],
  hours: ['영업', '영업시간', 'hours'],
  rating: ['평점', 'rating'],
  tip: ['한줄평', '팁', 'tip', 'note'],
  mapUrl: ['지도', 'map', 'url'],
};

const keyOf = (table, k) => Object.keys(table).find((id) => table[id].includes(k.toLowerCase()));

export function mapKind(s) {
  const v = String(s ?? '').trim().toLowerCase();
  if (/식당|맛집|restaurant|food/.test(v)) return 'restaurant';
  if (/카페|cafe|café|coffee/.test(v)) return 'cafe';
  if (/숙소|호텔|stay|hotel/.test(v)) return 'stay';
  return 'spot';
}

function normalizePrice(p) {
  const m = p.match(/^([\d,]+)(.*)$/);
  if (!m) return p;
  const num = Number(m[1].replace(/,/g, ''));
  const unit = m[2].trim() || '원';
  return `${num.toLocaleString('en-US')}${unit}`;
}

export function parseMenu(s) {
  const text = String(s ?? '').trim();
  if (!text) return [];
  return text.split(/\s*[\/,]\s*/).filter(Boolean).map((item) => {
    const m = item.match(/^(.*?)\s+([\d,]+\s*\S*)$/);
    if (!m) return { name: item, price: '' };
    return { name: m[1].trim(), price: normalizePrice(m[2].trim()) };
  });
}

function mapScope(v) {
  if (/국내|domestic|korea/i.test(v)) return 'domestic';
  if (/해외|overseas|abroad/i.test(v)) return 'overseas';
  return undefined;
}
function mapType(v) {
  if (/맛집|food/i.test(v)) return 'food';
  if (/여행|travel/i.test(v)) return 'travel';
  return undefined;
}

export function parseNote(text) {
  const raw = String(text ?? '');
  const note = { places: [], memo: '', extra: {}, raw };
  const memoLines = [];
  let current = null;
  let lastTop = null; // 이어지는 줄을 붙일 곳: 'memo' | null

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/^\[(장소|place)\]$/i.test(t)) {
      current = { kind: 'spot', menu: [] };
      note.places.push(current);
      lastTop = null;
      continue;
    }
    const m = t.match(/^([^:：]+?)\s*[:：]\s*(.*)$/);
    if (!m) {
      if (lastTop === 'memo' || !current) memoLines.push(t);
      else current.tip = current.tip ? `${current.tip}\n${t}` : t;
      continue;
    }
    const [, k, v] = m;
    // 장소 블록 안에서도 메모/지역/날짜/구분/동행 키가 나오면 블록을 닫는다 (종류는 장소 안에서 kind 로 쓰이므로 제외)
    const topId = keyOf(TOP_KEYS, k.trim());
    if (current && topId && topId !== 'type') current = null;
    if (current) {
      const id = keyOf(PLACE_KEYS, k.trim());
      if (id === 'menu') current.menu = parseMenu(v);
      else if (id === 'kind') current.kind = mapKind(v);
      else if (id === 'rating') current.rating = Number.parseFloat(v) || undefined;
      else if (id) current[id] = v.trim();
      else current[k.trim()] = v.trim();
      continue;
    }
    const id = topId;
    lastTop = id === 'memo' ? 'memo' : null;
    if (id === 'memo') memoLines.push(v.trim());
    else if (id === 'scope') note.scope = mapScope(v);
    else if (id === 'type') note.type = mapType(v);
    else if (id) note[id] = v.trim();
    else note.extra[k.trim()] = v.trim();
  }
  note.memo = memoLines.join('\n');
  return note;
}
```

`scripts/lib/region.mjs`:
```js
/** text 안에서 가장 먼저 등장하는 지역 키를 돌려준다. */
export function guessRegion(text, regions) {
  const hay = String(text ?? '');
  if (!hay) return undefined;
  const lower = hay.toLowerCase();
  let best;
  for (const [key, r] of Object.entries(regions)) {
    const names = [r.ko, r.en, ...(r.aliases ?? [])].filter(Boolean);
    for (const name of names) {
      const idx = lower.indexOf(name.toLowerCase());
      if (idx === -1) continue;
      if (!best || idx < best.idx) best = { key, idx };
    }
  }
  return best?.key;
}
```

`scripts/lib/frontmatter.mjs`:
```js
import { stringify } from 'yaml';

export function buildFrontmatter({ note, regionKey, regionScope, images, today }) {
  const cover = images.find((i) => i.isCover) ?? images[0];
  const allFood = note.places.length > 0 && note.places.every((p) => p.kind === 'restaurant' || p.kind === 'cafe');
  const places = note.places.map((p) => {
    const out = { name: p.name ?? '', kind: p.kind ?? 'spot' };
    if (p.address) out.address = p.address;
    if (p.menu?.length) out.menu = p.menu;
    if (p.hours) out.hours = p.hours;
    if (p.rating) out.rating = p.rating;
    if (p.tip) out.tip = p.tip;
    if (p.mapUrl) out.mapUrl = p.mapUrl;
    return out;
  });
  return {
    title: '',
    description: '',
    pubDate: note.date || today,
    scope: note.scope ?? regionScope ?? 'domestic',
    region: regionKey ?? 'UNKNOWN',
    type: note.type ?? (allFood ? 'food' : 'travel'),
    cover: cover?.src ?? '',
    images: images.map(({ src, alt, width, height }) => ({ src, alt: alt ?? '', width, height })),
    tags: [],
    places,
    draft: true,
  };
}

export function noteToComment(raw) {
  const safe = String(raw ?? '').replace(/--/g, '- -');
  return `<!--\nnote.txt 원문 (글을 다 쓰면 이 주석은 지워도 됩니다)\n\n${safe}\n-->`;
}

export function serializePost(frontmatter, body) {
  return `---\n${stringify(frontmatter, { lineWidth: 0 })}---\n\n${body}\n`;
}
```

`scripts/lib/images.mjs` (planImages; convertImage는 Task 9에서 추가):
```js
const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.tif', '.tiff']);

const ext = (f) => f.slice(f.lastIndexOf('.')).toLowerCase();
const isImage = (f) => EXTS.has(ext(f));
const isCover = (f) => /^cover\./i.test(f);
const naturalCompare = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

export function planImages(filenames) {
  const images = filenames.filter(isImage);
  const cover = images.find(isCover);
  const rest = images.filter((f) => !isCover(f)).sort(naturalCompare);
  const plan = [];
  if (cover) plan.push({ source: cover, target: '00.webp', isCover: true });
  rest.forEach((source, i) => plan.push({ source, target: `${String(i + 1).padStart(2, '0')}.webp`, isCover: false }));
  return plan;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run scripts/lib`
Expected: 모두 통과 (약 20개). 실패하면 테스트의 기대값이 아니라 구현을 고친다. 특히 `parseMenu('아메리카노 6000 / 당근케이크 7500원')`의 정규식이 "7500원"을 `[\d,]+\s*\S*`로 잡는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "feat: 준비 스크립트 순수 함수(slug, note 파서, 지역 추정, frontmatter, 이미지 계획)"
```

---

### Task 9: 준비 스크립트 CLI와 이미지 변환

**Files:**
- Modify: `scripts/lib/images.mjs` (convertImage 추가), `scripts/lib/images.test.mjs` (convertImage 테스트 추가)
- Create: `scripts/prepare.mjs`

**Interfaces:**
- Consumes: Task 8의 함수 전부, `src/data/regions.json`.
- Produces: `convertImage(srcPath: string, destPath: string): Promise<{ width: number; height: number }>`; CLI `node scripts/prepare.mjs [slug] [--force]`.

- [ ] **Step 1: convertImage 실패 테스트**

`scripts/lib/images.test.mjs`에 추가:
```js
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { convertImage } from './images.mjs';

describe('convertImage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'img-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('긴 변을 1600으로 줄이고 webp로 저장한다', async () => {
    const src = join(dir, 'big.jpg');
    await sharp({ create: { width: 3200, height: 2000, channels: 3, background: '#8ec5f0' } }).jpeg().toFile(src);
    const out = join(dir, '01.webp');
    const info = await convertImage(src, out);
    expect(info).toEqual({ width: 1600, height: 1000 });
    expect(existsSync(out)).toBe(true);
    expect((await sharp(out).metadata()).format).toBe('webp');
  });
  it('작은 이미지는 키우지 않는다', async () => {
    const src = join(dir, 'small.png');
    await sharp({ create: { width: 800, height: 600, channels: 3, background: '#fff' } }).png().toFile(src);
    expect(await convertImage(src, join(dir, '02.webp'))).toEqual({ width: 800, height: 600 });
  });
});
```
파일 상단 import에 `afterAll`을 추가한다: `import { describe, it, expect, afterAll } from 'vitest';`

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run scripts/lib/images.test.mjs`
Expected: `convertImage is not a function` 류로 FAIL.

- [ ] **Step 3: convertImage 구현**

`scripts/lib/images.mjs`에 추가:
```js
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

export const MAX_EDGE = 1600;
export const WEBP_QUALITY = 80;

async function loadInput(srcPath) {
  const e = ext(srcPath);
  if (e === '.heic' || e === '.heif') {
    const { default: heicConvert } = await import('heic-convert');
    const buffer = await readFile(srcPath);
    return Buffer.from(await heicConvert({ buffer, format: 'JPEG', quality: 0.92 }));
  }
  return srcPath;
}

export async function convertImage(srcPath, destPath) {
  const input = await loadInput(srcPath);
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(destPath);
  return { width: info.width, height: info.height };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run scripts/lib/images.test.mjs`
Expected: 5 passed

- [ ] **Step 5: prepare.mjs**

```js
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
  const v = validateSlug(slug);
  if (!v.ok) { summary.skipped.push(`${slug}: ${v.reason}`); continue; }

  const koPath = join(POSTS, 'ko', `${slug}.md`);
  const enPath = join(POSTS, 'en', `${slug}.md`);
  if (existsSync(koPath) && !force) { summary.skipped.push(`${slug}: 이미 처리됨 (--force 로 다시 생성)`); continue; }

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
}

for (const s of summary.done) console.log(`✔ ${s}`);
for (const s of summary.skipped) console.log(`– ${s}`);
for (const s of summary.warnings) console.warn(`⚠ ${s}`);
if (summary.done.length === 0 && summary.skipped.length === 0) console.log('처리할 폴더가 없습니다.');
console.log(`\n다음: src/content/posts/ko/<slug>.md 와 en/<slug>.md 의 title, description, alt, 본문을 채우고 draft: false 로 바꾸세요.`);
```

- [ ] **Step 6: 실제 실행으로 확인**

Run:
```bash
mkdir -p input/test-run-2026-09 && node -e "
const sharp=require('sharp');
Promise.all([['cover.jpg','#8ec5f0'],['IMG_1.jpg','#ffc9b5'],['IMG_2.png','#ffd6e0']].map(([f,c])=>sharp({create:{width:2400,height:1600,channels:3,background:c}}).toFormat(f.endsWith('png')?'png':'jpeg').toFile('input/test-run-2026-09/'+f))).then(()=>console.log('ok'))" && printf '지역: 제주 애월\n날짜: 2026-09-01\n종류: 맛집\n[장소]\n이름: 봄날카페\n종류: 카페\n메뉴: 아메리카노 6000\n평점: 4.5\n메모: 주차 무료\n' > input/test-run-2026-09/note.txt && npm run prepare-post && head -30 src/content/posts/ko/test-run-2026-09.md && ls public/images/test-run-2026-09
```
Expected: `✔ test-run-2026-09: 이미지 3장, 장소 1곳, 지역 jeju`, frontmatter에 `region: jeju`, `cover: /images/test-run-2026-09/00.webp`, `draft: true`, 이미지 `00.webp 01.webp 02.webp`.

Run: `npm run prepare-post`
Expected: `– test-run-2026-09: 이미지 처리됨 (--force 로 다시 생성)`.

Run: `npm run build 2>&1 | tail -4`
Expected: 빌드 성공 (draft라 배포에서 제외).

정리: `rm -rf input/test-run-2026-09 src/content/posts/ko/test-run-2026-09.md src/content/posts/en/test-run-2026-09.md public/images/test-run-2026-09`

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "feat: input 폴더를 이미지와 글 뼈대로 바꾸는 prepare 스크립트"
```

---

### Task 10: `/newpost` 스킬, README, 최종 검증

**Files:**
- Create: `.claude/skills/newpost/SKILL.md`, `README.md`, `input/.gitkeep`(gitignore 예외로 폴더 유지)

**Interfaces:**
- Consumes: `npm run prepare-post`, `npm run build`, 콘텐츠 스키마.

- [ ] **Step 1: 스킬 문서**

`.claude/skills/newpost/SKILL.md`:
```md
---
name: newpost
description: input/<slug>/ 폴더의 사진과 note.txt로 한국어·영어 여행/맛집 글을 작성해 배포한다. 사용자가 /newpost 라고 입력하거나 "새 글 올려줘"라고 하면 사용.
---

# /newpost — 새 글 작성과 배포

## 절차

1. `npm run prepare-post` 를 실행하고 출력을 읽는다.
   - `⚠ 지역을 찾지 못했습니다` 가 있으면 `src/data/regions.json` 에 항목을 추가하고(키는 영문 소문자, `ko`/`en`/`scope`/`country`/`aliases`), 해당 글의 `region` 을 채운다.
   - `⚠ 이미지 변환 실패` 는 사용자에게 파일 이름과 함께 알린다.
2. `src/content/posts/ko/<slug>.md` 를 연다. 주석 안의 note 원문과 `places`, 그리고 `public/images/<slug>/` 의 사진들을 Read 도구로 직접 본다(사진 내용을 글에 반영하기 위해).
3. **한국어 글**을 쓴다. 아래 작성 규칙을 따른다. `title`, `description`, 각 이미지의 `alt`, `tags`(3~6개) 를 채운다. 본문 안에서 사진은 `![캡션](/images/<slug>/NN.webp)` 로 넣는다. 다 쓰면 note 주석을 지우고 `draft: false` 로 바꾼다.
4. **영어 글**(`en/<slug>.md`)을 쓴다. 한국어 글의 직역이 아니라 해외 독자용으로 다시 쓴다. 규칙은 아래 "영어 글" 참고.
5. `npm run build` 를 실행한다. 실패하면 오류 메시지의 파일과 필드를 고친다. `⚠ 영어 글 없음` 경고가 있으면 4번을 마쳤는지 확인한다.
6. 커밋하고 push 한다: `git add -A && git commit -m "post: <slug>" && git push`.
7. 사용자에게 보고한다: 글 제목(한/영), 배포 후 URL(`https://nowyeogi.com/posts/<slug>/`, `/en/posts/<slug>/`), 확인이 필요한 항목(지역 추가, 변환 실패 사진, note 에 없어서 비워 둔 정보).

## 작성 규칙 (한국어)

- 분량 1,200~2,000자. 도입 2~3문장 → 장소별 `##` 섹션 → `## 실용 정보`(교통, 주차, 예산, 대기) → `## 마무리`.
- 도입은 "왜 갔는지"와 한 줄 결론으로 시작한다. 글마다 도입 방식을 바꾼다(질문, 장면, 결론 먼저 등).
- 사진은 관련 문단 바로 아래에 한 장씩. 캡션은 사진에 보이는 것을 구체적으로.
- note 에 없는 사실(가격, 영업시간, 메뉴, 역사)을 지어내지 않는다. 가격·영업시간은 "방문 당시 기준" 이라고 한 번 밝힌다. 모르는 정보는 쓰지 않는다.
- 과장 표현 금지: "인생 맛집", "무조건", "최고", "강추". 대신 맛·향·식감·풍경을 구체적으로 묘사한다.
- 같은 문장 구조를 세 번 이상 반복하지 않는다. "~했어요/~였어요" 체를 기본으로, 정보 부분은 명사형으로 짧게.
- `places` 의 정보는 본문에서도 산문으로 한 번 언급한다(카드와 본문이 서로 보완).
- `description` 은 120~160자, 지역명과 핵심 장소 이름을 포함. `title` 은 25~40자, 지역명을 앞쪽에.
- 마무리에 같은 지역의 기존 글이 있으면 1~2개를 `[제목](/posts/<slug>/)` 로 링크한다. `src/content/posts/ko/` 를 보고 고른다.

## 영어 글

- 700~1,200 단어. 구조는 한국어와 같되 섹션 제목은 영어로(`## Practical notes`, `## Wrapping up`).
- 한국 지명은 국립국어원 로마자 표기(예: Aewol, Seogwipo). 처음 나올 때 한글을 괄호로 병기해도 된다.
- 가격은 원화 그대로 쓰고 첫 등장에만 대략의 달러를 괄호로 (`₩6,000 (about $4.50)`). 환율은 1,000원≈$0.75 로 어림.
- 한국 문화 맥락(카페 웨이팅 문화, 공영주차장, 올레길 등)은 한 문장으로 설명을 덧붙인다.
- `tags` 는 영어로. `title`/`description` 도 영어 독자 검색어 기준으로 새로 쓴다.

## 하지 않는 것

- 사용자가 준 note 와 사진 밖의 장소를 추가하지 않는다.
- `draft: true` 인 글을 임의로 발행하지 않는다(사용자가 "올려줘" 라고 한 폴더만).
- 기존 글을 수정하지 않는다. 수정 요청은 별도로 받는다.
```

- [ ] **Step 2: README.md**

```md
# 지금 여기는 (nowyeogi.com)

국내·해외 여행 후기와 맛집을 한국어·영어로 올리는 블로그. Astro 7 정적 사이트, Cloudflare Pages 배포.

## 한 번만 하는 준비

1. Node 22 이상 설치 (`node -v` 로 확인).
2. `npm install`
3. 로컬 미리보기: `npm run dev` 후 http://localhost:4321

## 글 올리는 법

1. `input/` 아래에 폴더를 만든다. 이름은 영문 소문자·숫자·하이픈만. 예: `input/jeju-aewol-2026-09/`
2. 그 폴더에 사진(jpg, png, heic)과 `note.txt` 를 넣는다. 대표 사진은 `cover.jpg` 로 이름 짓는다.
3. `note.txt` 예시:

   ```
   지역: 제주 애월
   날짜: 2026-09-01
   종류: 맛집          ← 또는 여행후기
   동행: 친구 2명
   [장소]
   이름: 봄날카페
   종류: 카페           ← 식당 / 카페 / 명소 / 숙소
   위치: 제주시 애월읍 애월북서길 25
   메뉴: 아메리카노 6000 / 당근케이크 7500
   영업: 09:00-21:00
   평점: 4.5
   한줄평: 창가 자리에서 보는 바다가 전부다
   [장소]
   이름: ...
   메모: 주차는 카페 앞 공영주차장. 오후 3시 이후 웨이팅 30분.
   ```

4. Claude Code 에서 `/newpost` 를 입력한다. 사진 변환, 한국어·영어 글 작성, 빌드, 커밋, push 까지 진행된다.
5. 1~2분 뒤 Cloudflare Pages 가 자동 배포한다.

직접 뼈대만 만들려면 `npm run prepare-post` (특정 폴더만: `npm run prepare-post -- <slug>`).

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 로컬 미리보기 (draft 글도 보임) |
| `npm run build` | 배포용 빌드 + 산출물 검사 |
| `npm run prepare-post` | input → 이미지 변환 + 글 뼈대 |
| `npm test` | 스크립트 테스트 |

## 설정

- `src/site.config.json`: 사이트 이름, 주소, 이메일, 애드센스 ID.
- `src/data/regions.json`: 지역 사전. 새 지역은 여기에 먼저 추가.
- `src/content/pages/`: 소개, 개인정보처리방침, 연락처 본문.

## 배포 (Cloudflare Pages)

1. GitHub 에 저장소를 만들고 push.
2. Cloudflare 대시보드 → Workers & Pages → Create → Pages → Connect to Git → 저장소 선택.
3. 빌드 설정: Framework preset `Astro`, Build command `npm run build`, Output directory `dist`.
4. 환경 변수: `NODE_VERSION` = `22`.
5. 도메인 구매 후 Custom domains 에서 `nowyeogi.com` 연결.

## 애드센스

1. 글 20~30편, 소개·개인정보처리방침·연락처 페이지가 준비되면 https://adsense.google.com 에서 사이트 등록.
2. 승인되면 `src/site.config.json` 의 `adsense.client` 에 `ca-pub-…` 를 넣는다. 자동 광고가 켜진다.
3. 광고 단위를 따로 만들었으면 `slots` 에 슬롯 ID 를 넣는다(top: 글 상단, inArticle: 본문 중간, bottom: 글 하단, list: 목록).
4. push 하면 `ads.txt` 가 자동 생성된다.
```

- [ ] **Step 3: input 폴더 유지**

`.gitignore`의 `input/` 줄을 다음으로 바꾼다:
```
input/*
!input/.gitkeep
```
Run: `mkdir -p input && touch input/.gitkeep`

- [ ] **Step 4: 최종 검증**

Run: `npm test 2>&1 | tail -5 && npm run build 2>&1 | tail -6 && npx astro check 2>&1 | tail -3`
Expected: 테스트 전부 통과, `check-dist: 통과`, astro check 오류 0.

Run: `npm run dev -- --port 4321 & sleep 4; for u in / /en/ /posts/jeju-aewol-cafe-2026-09/ /en/posts/tokyo-shibuya-2026-08/ /domestic/ /regions/jeju/ /about/ /privacy/ /en/contact/ /rss.xml; do printf '%-45s ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:4321$u"; done; kill %1`
Expected: 모두 200.

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "docs: /newpost 스킬, README 운영 안내"
```

---

### Task 11: 브랜드 이미지 적용 (로고, 파비콘, 홈 히어로)

**Files:**
- Create: `scripts/brand-assets.mjs`, `public/brand/logo-mark.png`, `public/brand/logo-mark-192.png`, `public/brand/logo-full.webp`, `public/brand/hero.webp`, `public/favicon.png`
- Modify: `src/components/Header.astro`, `src/layouts/BaseLayout.astro`, `src/components/Seo.astro`, `src/views/HomeView.astro`
- Delete: `public/favicon.svg`

**Interfaces:**
- Consumes: 사용자가 `이미지/` 폴더(git 제외)에 넣은 원본 3장: `이미지/Gemini_Generated_Image_rwf583rwf583rwf5-Photoroom.png` (투명 배경 핀 마크, 2400×1309), `이미지/로고.png` (핀+커플+비행기 마크, 투명, 2400×1309), `이미지/상단 이미지.png` (마크 + "지금 여기는" 워드마크, 2816×1536).
- Produces: `public/brand/*` 정적 파일. 스크립트는 한 번 실행해 산출물을 커밋한다(원본은 커밋하지 않음).

- [ ] **Step 1: 변환 스크립트**

`scripts/brand-assets.mjs`:
```js
// 이미지/ 폴더의 원본을 웹용 브랜드 자산으로 변환한다. 한 번 실행해 public/brand 를 커밋한다.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, '이미지');
const OUT = join(ROOT, 'public', 'brand');
mkdirSync(OUT, { recursive: true });

const mark = join(SRC, 'Gemini_Generated_Image_rwf583rwf583rwf5-Photoroom.png');
const full = join(SRC, '로고.png');
const hero = join(SRC, '상단 이미지.png');

// 투명 여백을 잘라낸 뒤 크기를 맞춘다
await sharp(mark).trim().resize({ width: 512, height: 512, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(join(OUT, 'logo-mark.png'));
await sharp(mark).trim().resize({ width: 192, height: 192, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(join(OUT, 'logo-mark-192.png'));
await sharp(mark).trim().resize({ width: 64, height: 64, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(join(ROOT, 'public', 'favicon.png'));
await sharp(full).trim().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 85 }).toFile(join(OUT, 'logo-full.webp'));
// 히어로는 워드마크가 포함된 이미지. 여백을 조금 남기고 잘라 1600px 로.
await sharp(hero).trim({ threshold: 20 }).extend({ top: 60, bottom: 60, left: 80, right: 80, background: '#fbfaf7' }).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toFile(join(OUT, 'hero.webp'));

for (const f of ['logo-mark.png', 'logo-mark-192.png', 'logo-full.webp', 'hero.webp']) {
  const m = await sharp(join(OUT, f)).metadata();
  console.log(`${f}: ${m.width}x${m.height}`);
}
```

Run: `node scripts/brand-assets.mjs && ls -la public/brand public/favicon.png`
Expected: 4개 파일 크기 출력, `hero.webp` 폭 1600, 각 파일 300KB 이하.

- [ ] **Step 2: 헤더 로고와 파비콘**

`src/components/Header.astro`의 로고 부분을 다음으로 바꾼다 (`.logo-dot` span과 그 CSS는 삭제):
```astro
    <a class="logo" href={localePath(lang, '/')}>
      <img src="/brand/logo-mark-192.png" alt="" width="36" height="36" />
      {siteConfig.name[lang]}
    </a>
```
CSS: `.logo img { width: 36px; height: 36px; }` 를 추가하고 `.logo-dot` 규칙을 지운다.

`src/layouts/BaseLayout.astro`의 favicon 링크를 다음 두 줄로 바꾼다:
```astro
    <link rel="icon" href="/favicon.png" type="image/png" sizes="64x64" />
    <link rel="apple-touch-icon" href="/brand/logo-mark-192.png" />
```
`public/favicon.svg`를 삭제한다.

`src/components/Seo.astro`의 기본 OG 이미지를 `/brand/hero.webp`로 바꾼다:
```ts
const ogImage = abs(image ?? '/brand/hero.webp');
```

- [ ] **Step 3: 홈 히어로**

`src/views/HomeView.astro`의 `<section class="hero">`를 다음으로 바꾼다:
```astro
  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-text">
        <p class="eyebrow">{t(lang, 'scope.domestic')} · {t(lang, 'scope.overseas')}</p>
        <h1>{siteConfig.name[lang]}</h1>
        <p class="tagline">{siteConfig.tagline[lang]}</p>
      </div>
      <img class="hero-art" src="/brand/hero.webp" alt={siteConfig.name.ko} width="1600" height="880" loading="eager" fetchpriority="high" />
    </div>
  </section>
```
(`height`는 Step 1 출력의 실제 hero.webp 높이로 바꾼다.)

스타일에 추가:
```css
  .hero-inner { display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; gap: 2rem; }
  .hero-art { width: 100%; height: auto; border-radius: var(--radius); }
  @media (max-width: 760px) { .hero-inner { grid-template-columns: 1fr; } .hero-art { max-width: 420px; margin-inline: auto; } }
```

- [ ] **Step 4: 확인, 커밋**

Run: `npm run build 2>&1 | tail -4 && grep -c 'brand/logo-mark-192' dist/index.html && grep -c 'brand/hero.webp' dist/index.html && npx astro check 2>&1 | tail -2`
Expected: 빌드 통과, 두 grep 모두 1 이상, astro check 오류 0.

```bash
git add scripts/brand-assets.mjs public/brand public/favicon.png src/components/Header.astro src/layouts/BaseLayout.astro src/components/Seo.astro src/views/HomeView.astro
git rm -q public/favicon.svg
git commit -m "feat: 로고, 파비콘, 홈 히어로 브랜드 이미지 적용"
```

---

## Self-Review

**Spec coverage**
- 1 목적, 8.2 스킬 → Task 10. 2 디자인 → Task 1(토큰), 3(레이아웃/홈), 4(글). 3 스택 → Task 1. 4 구조 → 전체. 5 페이지 → Task 3(홈), 4(글), 5(목록), 6(정적/404), 7(RSS/사이트맵/robots/ads). 6 콘텐츠 모델 → Task 2. 7 입력 형식 → Task 8. 8.1 준비 스크립트 → Task 8, 9. 9 광고 → Task 3(AdSlot, 자동 광고 스크립트), 4(인아티클), 1/7(ads.txt). 10 SEO → Task 3(Seo), 4(JSON-LD), 7. 11 오류 처리 → Task 9(slug/이미지/지역), Task 2(스키마 refine), Task 7(ko/en 불일치 경고). 12 테스트 → Task 2, 4, 7, 8, 9. 13 배포 → Task 10 README.
- 스펙 5절 "글 하단 같은 지역 글 3개 추천" → Task 4 `pickRelated`. 스펙 9절 "목록 6번째 카드 뒤" → Task 3, 5의 `i === 5`.

**Placeholder scan**: "TBD/TODO" 없음. Task 5 Step 5의 영어 라우트는 "복사해 바꾼다"로 서술했지만 바뀌는 값 4개를 명시했다.

**Type consistency**: `Lang`은 `src/site.config.ts`에서만 정의하고 모두 거기서 import. `postPath`/`postSlug`/`getPosts`/`getTranslation` 이름은 Task 2에서 정의한 것을 4, 5, 7이 그대로 사용. `AdSlot`의 slot 값 `'top'|'bottom'|'list'`와 `site.config.json`의 `slots` 키 일치(`inArticle`은 rehype 플러그인 전용). `buildFrontmatter`의 `regionScope` 인자는 Task 8 테스트와 Task 9 호출 모두에 있음.
