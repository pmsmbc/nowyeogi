# 「지금 여기는」 여행·맛집 블로그 설계

작성일: 2026-09-09

## 1. 목적

- 국내·해외 여행 후기와 맛집 소개 글을 올려 Google AdSense 광고 수익을 얻는 사이트.
- 운영자는 `input/<slug>/` 폴더에 사진과 메모 파일을 넣고 Claude Code에서 `/newpost`를 입력하는 것만으로 글이 한국어·영어로 작성되어 배포된다.
- 외부 API 키 없이 동작한다. 글 본문은 Claude Code 세션 안에서 작성한다.

## 2. 대상 독자와 디자인 방향

- 주 독자: 20~40대 여성. 국내·해외 여행지와 카페·식당 정보를 찾는 사람.
- 톤: 파스텔 블루 기반. 하늘색(`#8EC5F0` 계열) 주색, 살구·연분홍 강조색, 크림색 배경. 둥근 모서리, 부드러운 그림자, 큰 사진, 넉넉한 여백.
- 서체: 본문 Pretendard, 제목 Noto Serif KR. 영어 페이지는 같은 서체의 라틴 글리프를 사용한다.
- 모바일 우선. 다크 모드는 넣지 않는다.

## 3. 기술 스택

| 항목 | 선택 |
|---|---|
| 프레임워크 | Astro 5 (정적 출력) |
| 언어 | TypeScript, 순수 CSS(디자인 토큰은 CSS 변수) |
| 콘텐츠 | Astro Content Collections, Markdown |
| 다국어 | Astro 내장 i18n. `ko` 기본(접두사 없음), `en`은 `/en/` 접두사 |
| 이미지 처리 | sharp (준비 스크립트) |
| 통합 | `@astrojs/sitemap`, `@astrojs/rss` |
| 테스트 | Vitest (스크립트 단위 테스트), 빌드 산출물 검사 스크립트 |
| 배포 | GitHub → Cloudflare Pages 자동 배포 |

## 4. 디렉터리 구조

```
site3/
├── input/                      # 운영자가 사진과 메모를 넣는 곳 (git 제외)
│   └── <slug>/
│       ├── note.txt
│       └── *.jpg|png|heic
├── public/
│   ├── images/<slug>/NN.webp   # 준비 스크립트가 생성
│   ├── ads.txt
│   └── robots.txt
├── scripts/
│   ├── prepare.mjs             # input → 이미지 변환 + 글 뼈대 생성
│   ├── lib/                    # 순수 함수 (테스트 대상)
│   └── check-dist.mjs          # 빌드 산출물 검사
├── src/
│   ├── site.config.ts          # 사이트 이름, URL, 애드센스 ID 등 한 곳에서 관리
│   ├── data/regions.ts         # 지역 사전 (key → 한/영 이름, 국내/해외, 국가)
│   ├── content.config.ts       # 컬렉션 스키마
│   ├── content/posts/ko/<slug>.md
│   ├── content/posts/en/<slug>.md
│   ├── i18n/ui.ts              # UI 문자열 한/영
│   ├── layouts/BaseLayout.astro
│   ├── components/             # Header, Footer, PostCard, PlaceCard, Figure, AdSlot, Seo, LangSwitch
│   ├── styles/global.css
│   └── pages/                  # 아래 5절 참고
├── .claude/skills/newpost/SKILL.md
├── docs/superpowers/specs/
├── README.md                   # 운영 방법 (한국어)
└── astro.config.mjs
```

## 5. 페이지와 URL

한국어는 접두사 없이, 영어는 `/en/` 아래 같은 구조로 제공한다.

| 경로 | 내용 |
|---|---|
| `/` | 히어로 + 최신 글 그리드 + 지역 칩 |
| `/posts/<slug>/` | 글 상세 |
| `/domestic/`, `/overseas/` | 국내·해외 목록 |
| `/regions/<key>/` | 지역별 목록 (제주, 도쿄 등) |
| `/tags/<tag>/` | 태그별 목록 |
| `/about/`, `/privacy/`, `/contact/` | 애드센스 승인 필수 페이지 |
| `/rss.xml`, `/en/rss.xml` | 언어별 RSS |
| `/sitemap-index.xml`, `/robots.txt`, `/ads.txt` | 검색·광고 |
| `/404` | 두 언어 안내 |

목록 페이지는 페이지당 12개, 페이지네이션 적용. 상세 페이지 하단에 같은 지역 글 3개를 추천한다.

## 6. 콘텐츠 모델

`src/content.config.ts`의 `posts` 컬렉션 스키마:

```ts
{
  title: string
  description: string            // 120~160자, 메타 설명
  pubDate: Date
  updatedDate?: Date
  lang: 'ko' | 'en'              // 파일 경로에서 유도
  scope: 'domestic' | 'overseas'
  region: string                 // regions.ts 키. 사전에 없으면 빌드 실패
  type: 'travel' | 'food'        // 여행 후기 / 맛집
  cover: string                  // /images/<slug>/01.webp
  images: { src: string; alt: string }[]
  tags: string[]
  places: {
    name: string
    kind: 'restaurant' | 'cafe' | 'spot' | 'stay'
    address?: string
    menu?: { name: string; price: string }[]
    hours?: string
    rating?: number              // 1~5, 0.5 단위
    tip?: string
    mapUrl?: string
  }[]
  draft: boolean                 // true면 배포에서 제외
}
```

- 파일 이름(slug)이 한/영 글을 연결하는 키다. `ko/jeju-aewol-2026-09.md`와 `en/jeju-aewol-2026-09.md`는 같은 글이다.
- slug 규칙: 소문자 영문, 숫자, 하이픈. `<지역>-<주제>-<yyyy-mm>` 권장.
- `places`는 글 상단 요약 카드와 JSON-LD에 쓰인다. 본문에도 같은 정보를 산문으로 서술한다.

### 지역 사전 (`src/data/regions.ts`)

```ts
{ jeju: { ko: '제주', en: 'Jeju', scope: 'domestic', country: 'KR' }, ... }
```

새 지역이 필요하면 `/newpost` 과정에서 사전에 항목을 추가한다.

## 7. 입력 형식 (`input/<slug>/note.txt`)

자유 서식이지만 다음 항목을 권장한다. 없는 항목은 글에서 다루지 않는다.

```
지역: 제주 애월
날짜: 2026-09-01
구분: 국내
종류: 여행후기          # 또는 맛집
동행: 친구 2명
[장소]
이름: 봄날카페
종류: 카페
위치: 제주시 애월읍 애월북서길 25
메뉴: 아메리카노 6000 / 당근케이크 7500
영업: 09:00-21:00
평점: 4.5
한줄평: 창가 자리에서 보는 바다가 전부다
[장소]
...
메모: 주차는 카페 앞 공영주차장. 오후 3시 이후 웨이팅 30분.
```

사진 파일은 이름순으로 번호가 매겨진다. `cover.*`라는 파일이 있으면 그것이 대표 이미지가 된다.

## 8. 자동화 흐름

### 8.1 `scripts/prepare.mjs`

```
npm run prepare            # input/ 아래 미처리 폴더 전부
npm run prepare -- <slug>  # 한 폴더만
```

1. `input/<slug>/`를 읽는다. `src/content/posts/ko/<slug>.md`가 이미 있으면 건너뛴다(`--force`로 재생성).
2. slug 규칙을 검사한다. 위반 시 이유를 출력하고 중단한다.
3. 이미지를 긴 변 1600px, WebP 품질 80으로 변환해 `public/images/<slug>/01.webp …`로 저장한다. HEIC도 처리한다. `cover.*`는 `00.webp`로 저장하고 cover로 지정한다.
4. `note.txt`를 파싱해 frontmatter 초안(`pubDate`, `scope`, `region` 추정, `places`, `images`, `draft: true`)을 만든다.
5. `ko/<slug>.md`, `en/<slug>.md`를 생성한다. 본문에는 note 원문을 주석으로 넣어 두고 `title`, `description`, 본문은 비워 둔다.
6. 처리 결과(생성된 파일, 추정한 region, 사전에 없는 region 경고)를 출력한다.

순수 함수(`scripts/lib/`)로 분리해 테스트하는 부분: slug 검증, note 파싱, region 추정, frontmatter 직렬화, 이미지 번호 매기기.

### 8.2 `/newpost` 스킬 (`.claude/skills/newpost/SKILL.md`)

Claude Code가 따르는 절차:

1. `npm run prepare` 실행, 출력 확인. region 경고가 있으면 `regions.ts`에 추가.
2. 각 미완성 글에 대해 `note.txt`와 이미지를 읽고 **한국어 본문**을 작성한다.
3. 같은 내용으로 **영어 본문**을 작성한다. 직역이 아니라 해외 독자 기준으로 다시 쓴다(원화 병기, 한국 지명 로마자, 현지 맥락 설명).
4. `title`, `description`, `tags`, 이미지 `alt`를 채우고 `draft: false`로 바꾼다.
5. `npm run build`로 검증한다. 실패하면 고친다.
6. 커밋하고 push한다. 커밋 메시지는 `post: <slug>`.
7. 사용자에게 배포될 URL과 글 요약을 보고한다.

작성 규칙(스킬 문서에 고정):

- 분량: 한국어 1,200~2,000자, 영어 700~1,200 단어.
- 구조: 도입(왜 갔는지, 한 줄 결론) → 장소별 H2 → 사진마다 캡션 → 실용 정보(교통, 주차, 예산) → 마무리(같은 지역 글 내부 링크 1~2개).
- 메모에 없는 사실을 지어내지 않는다. 가격·영업시간은 "방문 당시 기준"이라고 밝힌다.
- 과장 표현("인생 맛집", "무조건")을 쓰지 않는다. 구체적 감각 묘사로 대신한다.
- 같은 문장 구조를 반복하지 않는다. 글마다 도입 방식을 달리한다.
- 식당 정보는 `places` frontmatter와 본문에 모두 넣되 본문은 산문으로 쓴다.

## 9. 광고

- `src/site.config.ts`의 `adsense.client`에 `ca-pub-…`를 넣으면 활성화된다. 비어 있으면 광고 슬롯을 렌더링하지 않는다.
- 슬롯 위치: 글 상단(제목 아래), 본문 중간(두 번째 H2 앞, rehype 플러그인으로 삽입), 글 하단, 목록 페이지 6번째 카드 뒤.
- `public/ads.txt`는 `npm run build` 앞단(prebuild 스크립트)에서 `adsense.client` 값으로 생성한다. 값이 비어 있으면 빈 파일을 둔다.
- 약관 준수: 광고 슬롯에 "광고" 라벨을 붙인다. 개인정보처리방침에 Google 광고 쿠키 사용을 명시한다.

## 10. SEO

- `Seo` 컴포넌트: title, description, canonical, `hreflang`(ko, en, x-default), Open Graph, Twitter Card.
- JSON-LD: 글 페이지에 `BlogPosting` + `BreadcrumbList`. `places`에 식당·카페가 있으면 `FoodEstablishment` 항목을 `mentions`로 추가.
- 사이트맵은 언어별 대체 링크를 포함한다.
- 이미지는 `loading="lazy"`, `width`/`height` 명시로 레이아웃 이동을 막는다.

## 11. 오류 처리

| 상황 | 동작 |
|---|---|
| slug 규칙 위반 | 준비 스크립트가 이유를 출력하고 해당 폴더를 건너뜀 |
| 이미지 변환 실패 | 파일명과 오류를 출력하고 나머지 계속 처리 |
| `region`이 사전에 없음 | 준비 단계에서 경고, 빌드 단계에서 스키마 오류로 실패 |
| ko/en 중 한쪽만 존재 | 빌드 검사 스크립트가 경고. 배포는 진행되며 `hreflang`은 존재하는 언어만 출력 |
| `draft: true` | 개발 서버에서만 보이고 빌드에서 제외 |

## 12. 테스트

- Vitest: `scripts/lib/` 순수 함수 전부. 이미지 변환은 sharp로 생성한 작은 테스트 이미지로 검증.
- `npm run build`: 샘플 글(한/영 각 2편, `draft: true`)로 모든 페이지 종류가 렌더링되는지 확인. 샘플은 `npm run dev`에서만 보인다.
- `scripts/check-dist.mjs`: 빌드 후 `dist/`에 sitemap, robots, ads.txt, 한/영 홈이 있고 각 글 페이지에 `hreflang`과 JSON-LD가 있는지 검사. `npm run build` 뒤에 자동 실행.
- Cloudflare Pages 빌드 명령은 `npm run build`, 출력 디렉터리 `dist`.

## 13. 배포 절차 (README에 기록)

1. GitHub에 저장소를 만들고 push.
2. Cloudflare Pages에서 저장소 연결. 빌드 명령 `npm run build`, 출력 `dist`, Node 22.
3. 도메인을 구매했으면 Cloudflare에 연결. `site.config.ts`의 `url`을 바꾼다.
4. 글 20~30편 이상, 소개·개인정보처리방침·연락처 페이지가 갖춰지면 AdSense 신청. 승인되면 `adsense.client`를 넣고 push.

## 14. 범위 밖 (이번 작업에서 하지 않음)

- 댓글, 검색, 다크 모드, 뉴스레터.
- 웹 관리 화면.
- Claude API를 통한 글 자동 생성(사용자가 세션 내 생성을 선택함).
- 네이버 블로그 연동.

## 15. 계획 단계에서 확정된 변경 (2026-09-09)

- Astro 7.3 사용. Node 22 이상 필요. Markdown 플러그인은 `@astrojs/markdown-remark`의 `unified()` 프로세서로 실행.
- 글의 언어는 frontmatter `lang` 대신 파일 경로(`ko/`, `en/`)에서 유도한다.
- 이미지 항목에 `width`, `height`를 추가해 레이아웃 이동을 막는다.
- 설정 원본은 `src/site.config.json`(스크립트와 Astro가 함께 읽음). `src/site.config.ts`는 타입 래퍼.
- AdSense는 `adsense.client`가 있으면 자동 광고 스크립트를 넣고, `slots`에 슬롯 ID가 있는 위치에만 수동 광고 단위를 추가한다.
- 준비 스크립트 명령은 `npm run prepare-post` (npm의 `prepare` 훅과 충돌 방지).
- 사이트 이름 「지금 여기는」 / "Now, Yeogi", 도메인 `nowyeogi.com`.

## 16. 최종 검토에서 확정된 해석 (2026-09-09)

- §12의 "빌드로 모든 페이지 종류 렌더링 확인"과 "샘플 글은 draft"는 동시에 만족할 수 없다. 해석: `npm run build`의 산출물 검사는 **발행된 글**만 검사하며, 발행 글이 0편이면 경고를 출력한다. 페이지 종류 전체 렌더링은 샘플 글의 draft를 false로 바꾼 임시 복사본 빌드로 검증한다.
- §8.1 2단계의 "slug 규칙 위반 시 중단"은 §11의 "해당 폴더를 건너뜀"으로 통일한다. 구현은 건너뛰고 나머지 폴더를 계속 처리한다.
- 목록 페이지(지역·태그)의 hreflang은 상대 언어에 같은 페이지가 실제로 존재할 때만 출력한다(§10 보완).
- 기본 OG 이미지는 1200×630 JPEG(`/brand/og-default.jpg`). 히어로 WebP는 OG로 쓰지 않는다.
- 본문 중간 광고 라벨은 글 언어에 따라 "광고"/"Advertisement"로 출력한다(§9 보완).
- 서체는 본문·제목 모두 Pretendard로 통일(사용자 요청, 2026-09-09). Noto Serif KR 제거.
