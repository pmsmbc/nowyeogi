# site3 (nowyeogi.com) 작업 규칙

여행 정보 블로그. Astro 정적 사이트, 한국어(기본)/영어/일본어 3개 국어, GitHub Pages 배포.
새 글은 `/newpost` 스킬(`.claude/skills/newpost/SKILL.md`)을 따른다.

## 태그 규칙 (2026-10-12, 서치콘솔 색인 문제 대응)

태그 하나가 언어별 태그 페이지 URL(`/tags/<태그>/`) 하나다. 태그를 바꾸면 URL 이 사라져 404 가 되고, 표기만 달라도 페이지가 둘로 갈라진다.

- **기존 글을 수정·재작성할 때 태그는 유지하고 추가만 한다.** 삭제하거나 표기를 바꾸지 않는다. 꼭 바꿔야 하면 사용자에게 먼저 말한다.
- **새 태그를 붙이기 전에 같은 언어의 기존 태그를 검색해 표기를 맞춘다** (`grep -h '^tags:' src/content/posts/<lang>/*.md`). 대소문자·띄어쓰기가 다른 변형을 새로 만들지 않는다. 대소문자만 다른 태그가 있으면 `npm run build` 의 prebuild 단계가 실패한다.
- 글 2편 미만인 태그 페이지는 자동으로 `noindex` 가 붙고 사이트맵에서 빠진다(`scripts/lib/thin-tags.mjs`). 태그는 다른 글과 공유될 만한 것 위주로 3~6개만 붙인다.
- 사이트맵 `lastmod` 는 글의 `updatedDate ?? pubDate` 에서 나온다(`scripts/lib/posts-meta.mjs`). 기존 글의 내용을 크게 고쳤으면 frontmatter 에 `updatedDate` 를 넣는다.
