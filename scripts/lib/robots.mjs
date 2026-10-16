// robots.txt 정책. GitHub Pages 는 서버에서 봇을 막을 수 없으므로 robots.txt 로만 제어한다.
// robots.txt 는 권고일 뿐이라 이를 무시하는 악성 봇은 막지 못한다.
//
// 방식: 기본(`*`)은 허용하고, 검색 유입·수익과 무관한 봇만 이름으로 막는다.
// 화이트리스트(`*` 차단)로 하면 카카오톡·X 링크 미리보기처럼 목록에 없는 정상 봇까지 막히기 때문이다.

// 검색 색인·애드센스·AI 검색 인용에 필요한 봇. 명시적으로 전체 허용한다.
export const ALLOWED_BOTS = [
  // 검색엔진
  'Googlebot',
  'Googlebot-Image',
  'Bingbot',
  'Yeti', // 네이버
  'Daum', // 다음(Daumoa)
  'Yandex',
  'DuckDuckBot',
  'Applebot', // Spotlight·Siri 검색
  // 애드센스: 막으면 광고가 안 뜨거나 수익이 준다
  'Mediapartners-Google',
  'AdsBot-Google',
  'AdsBot-Google-Mobile',
  // AI 검색(답변에 출처 링크로 인용): 유입이 생기므로 허용
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
];

// 유입이 없고 크롤링만 하는 봇. 전체 차단한다.
export const BLOCKED_BOTS = [
  // SEO 분석 도구(경쟁사 분석용 수집)
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'serpstatbot',
  'SeekportBot',
  // 대상 시장이 아닌 검색엔진(중국어 판 없음)
  'Baiduspider',
  'PetalBot',
  'Sogou web spider',
  // AI 학습용 수집(검색 인용·유입과 무관). Google-Extended 는 구글 검색 순위와 무관하다.
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'meta-externalagent',
  'cohere-training-data-crawler',
  'Diffbot',
  'omgili',
  'ImagesiftBot',
];

export function buildRobotsTxt(siteUrl, { allowed = ALLOWED_BOTS, blocked = BLOCKED_BOTS } = {}) {
  const overlap = allowed.filter((b) => blocked.some((x) => x.toLowerCase() === b.toLowerCase()));
  if (overlap.length) throw new Error(`robots: 허용·차단 목록에 동시에 있음: ${overlap.join(', ')}`);

  const group = (bots, rule) => bots.map((b) => `User-agent: ${b}`).join('\n') + `\n${rule}\n`;
  return [
    '# 검색·광고·AI 검색 봇: 허용',
    group(allowed, 'Allow: /'),
    '# 유입 없는 수집 봇: 차단',
    group(blocked, 'Disallow: /'),
    '# 그 밖의 봇: 허용',
    group(['*'], 'Allow: /'),
    `Sitemap: ${siteUrl.replace(/\/$/, '')}/sitemap-index.xml`,
    '',
  ].join('\n');
}
