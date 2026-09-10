# 지금 여기는 (nowyeogi.com)

국내·해외 여행 후기와 맛집을 한국어·영어로 올리는 블로그. Astro 7 정적 사이트, Cloudflare Pages 배포.

## 한 번만 하는 준비

1. Node 22 이상 설치 (`node -v` 로 확인).
2. `npm install`
3. 로컬 미리보기: `npm run dev` 후 http://localhost:4321

## 글 올리는 법

이 블로그의 글은 직접 방문 후기가 아니라, 공개된 정보(유튜브 영상, 공식 사이트, 후기)를 정리한 **여행 정보 글**입니다. 글마다 그 사실과 참고 자료가 자동으로 표시됩니다.

1. `input/` 아래에 폴더를 만든다. 이름은 영문 소문자·숫자·하이픈만. 예: `input/jeju-aewol-2026-09/`
2. 그 폴더에 `note.txt` 를 넣는다. 사진(jpg, png, heic)은 **직접 찍었거나 사용 권한이 있는 것만** 넣는다. 대표 사진은 `cover.jpg` 로 이름 짓는다. 사진이 없어도 된다.
3. `note.txt` 예시 (유튜브를 보고 정리하거나, 장소 이름만 적어도 된다):

   ```
   지역: 제주 애월
   종류: 맛집          ← 또는 여행후기
   출처: 제주 카페 브이로그 https://youtu.be/xxxx
   출처: 봄날카페 공식 인스타그램 https://instagram.com/xxxx
   [장소]
   이름: 봄날카페
   종류: 카페           ← 식당 / 카페 / 명소 / 숙소
   위치: 제주시 애월읍 애월북서길 25
   메뉴: 아메리카노 6000 / 당근케이크 7500
   영업: 09:00-21:00
   한줄평: 영상에서는 창가 자리 바다 뷰를 가장 많이 언급
   [장소]
   이름: ...
   메모: 주차는 카페 앞 공영주차장. 오후 3시 이후 웨이팅이 길다는 후기가 많음.
   ```

4. Claude Code 에서 `/newpost` 를 입력한다. 장소 정보 확인(검색), 사진 변환, 한국어·영어 글 작성, 빌드, 커밋, push 까지 진행된다.
5. 1~2분 뒤 GitHub Pages 가 자동 배포한다.

직접 뼈대만 만들려면 `npm run prepare-post` (특정 폴더만: `npm run prepare-post -- <slug>`).

## 본문에서 쓰는 표기

- 지하철: `[[line:4]]`, `[[line:arex]]` → 노선 색 배지로 표시 (색·이름은 `src/data/subway.json`)
- 버스: `[[bus:6001]]`, `[[bus:400]]` → 종류별 색 배지로 표시. 종류를 직접 정하려면 `[[bus:green:6002]]` (`src/data/bus.json`)

## 콘텐츠 원칙 (법적 문제를 피하기 위한 규칙)

- **직접 방문한 것처럼 쓰지 않는다.** "다녀왔어요", "먹어 봤어요" 대신 "~로 알려져 있어요", "후기에 따르면" 으로 쓴다. 허위 체험 후기는 표시광고법 위반 소지가 있다.
- **출처를 남긴다.** 참고한 영상·사이트를 `출처:` 에 적으면 글 아래 "참고 자료" 로 표시된다.
- **베끼지 않는다.** 영상 자막이나 다른 블로그 문장을 그대로 옮기지 않고, 사실만 가져와 새로 쓴다. 영상 화면 캡처, 남의 사진, 지도 캡처는 쓰지 않는다.
- **사진은 자유 라이선스만.** 직접 찍은 사진, `npm run fetch-tour` 로 받은 한국관광공사 사진(공공누리 제1유형), `npm run fetch-images` 로 받은 위키미디어 공용 사진(CC0·CC BY·CC BY-SA)만 쓴다. 출처는 사진 아래에 자동으로 표시된다.
- **협찬은 표시한다.** 무료 제공이나 원고료를 받았으면 `note.txt` 에 `협찬: ○○` 를 적는다. 글 첫 줄에 표시된다.
- **가격·영업시간은 작성 시점 기준**이라는 안내가 모든 글에 자동으로 붙는다.

## 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 로컬 미리보기 (draft 글도 보임) |
| `npm run build` | 배포용 빌드 + 산출물 검사 |
| `npm run prepare-post` | input → 이미지 변환 + 글 뼈대 |
| `npm test` | 스크립트 테스트 |
| `npm run fetch-tour -- <slug> "<장소 이름>" --list` | 한국관광공사에서 장소 후보 보기 |
| `npm run fetch-tour -- <slug> "<장소 이름>" --index 1 --limit 4` | 관광공사 사진(공공누리 1유형)과 주소·영업시간 받기 |
| `npm run fetch-images -- <slug> "<영어 검색어>"` | 위키미디어 공용에서 자유 라이선스 사진 받기 |
| `npm run check` | 타입/템플릿 검사, 배포 전 실행 |

미리보기가 예전 내용을 보여 주면 `rm -rf .astro node_modules/.astro` 후 다시 `npm run dev`.

## 설정

- `src/site.config.json`: 사이트 이름, 주소, 이메일, 애드센스 ID.
- `src/data/regions.json`: 지역 사전. 새 지역은 여기에 먼저 추가.
- `src/content/pages/`: 소개, 개인정보처리방침, 연락처 본문.
- `.env`: 한국관광공사 TourAPI 인증키(`TOUR_API_KEY`). git 에 올라가지 않으므로 다른 컴퓨터에서는 다시 만들어야 한다. 키는 [공공데이터포털](https://www.data.go.kr) 에서 "한국관광공사_국문 관광정보 서비스_GW" 활용신청 후 발급.

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
