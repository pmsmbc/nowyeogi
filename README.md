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
| `npm run check` | 타입/템플릿 검사, 배포 전 실행 |

미리보기가 예전 내용을 보여 주면 `rm -rf .astro` 후 다시 `npm run dev`.

## 설정

- `src/site.config.json`: 사이트 이름, 주소, 이메일, 애드센스 ID.
- `src/data/regions.json`: 지역 사전. 새 지역은 여기에 먼저 추가.
- `src/content/pages/`: 소개, 개인정보처리방침, 연락처 본문.

## 배포 (GitHub Pages)

`main` 브랜치에 push 하면 GitHub Actions(`.github/workflows/deploy.yml`)가 빌드해서 GitHub Pages 에 올립니다. 1~2분 뒤 https://nowyeogi.com 에 반영됩니다.

- 저장소: https://github.com/pmsmbc/nowyeogi
- 도메인: `public/CNAME` 에 `nowyeogi.com` 이 들어 있어 자동으로 연결됩니다.
- 가비아 DNS 설정(한 번만): A 레코드 4개 `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (호스트 `@`), CNAME 레코드 `www` → `pmsmbc.github.io`.
- 배포 상태는 저장소의 Actions 탭에서 확인합니다.

## 애드센스

1. 글 20~30편, 소개·개인정보처리방침·연락처 페이지가 준비되면 https://adsense.google.com 에서 사이트 등록.
2. 승인되면 `src/site.config.json` 의 `adsense.client` 에 `ca-pub-…` 를 넣는다. 자동 광고가 켜진다.
3. 광고 단위를 따로 만들었으면 `slots` 에 슬롯 ID 를 넣는다(top: 글 상단, inArticle: 본문 중간, bottom: 글 하단, list: 목록).
4. push 하면 `ads.txt` 가 자동 생성된다.

## 문제가 생기면

- `npm run build` 실패 시 오류 메시지의 파일과 필드를 확인 (대부분 frontmatter 오타).
- 사진 변환 실패 시 파일이 손상되지 않았는지 확인하고 jpg 로 다시 저장.
- 지역을 못 찾으면 `src/data/regions.json` 에 추가.
- `region: UNKNOWN` 인 글이 있으면 `npm run build` 와 `npm run dev` 가 모두 막힌다. `src/data/regions.json` 에 지역을 추가하고 frontmatter 의 `region` 을 채워야 풀린다.

## 브랜드 이미지

원본은 `이미지/` 폴더(git 제외)에 두고 `node scripts/brand-assets.mjs` 로 `public/brand/` 를 다시 만든다.
