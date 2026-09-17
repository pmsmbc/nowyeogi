// 홈의 언어 자동 이동 스크립트가 크롤러를 보내지 않는지 확인한다.
//
// 2026-09-17: 이 조건이 없던 하루 동안 서치콘솔이 `/` 를 "리디렉션이 포함된 페이지"로
// 보고해 한국어 홈이 색인에서 빠질 뻔했다. 구글봇은 자바스크립트를 실행한다.
// 조건이 지워지면 이 테스트가 먼저 잡는다.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const src = readFileSync(resolve(ROOT, 'src/components/LangRedirect.astro'), 'utf8');

/**
 * .astro 파일에서 인라인 스크립트 본문을 꺼내, Astro 가 빌드 때 하는 일을 그대로 흉내 낸다.
 * 즉 `${...}` 치환을 채우고, 템플릿 리터럴 안이라 두 번 쓰여 있는 역슬래시를 하나로 되돌린다.
 * 치환이 실패하면 조용히 통과하지 않도록 여기서 바로 던진다.
 */
const raw = src.slice(src.indexOf('const script = `') + 'const script = `'.length, src.lastIndexOf('`;'));
const LANGS = ['ko', 'en', 'ja'];
const DEFAULT_LANG = 'ko';
const body = raw
  .replace('${JSON.stringify(LANGS)}', JSON.stringify(LANGS))
  .replace('${JSON.stringify(DEFAULT_LANG)}', JSON.stringify(DEFAULT_LANG))
  .replace(/\\\\/g, '\\');
if (body.includes('${')) throw new Error('LangRedirect.astro 의 템플릿 치환을 테스트가 따라가지 못했습니다');

/**
 * 스크립트를 가짜 window 위에서 실행하고, 이동한 주소를 돌려준다.
 * 이동하지 않았으면 null.
 */
function run({ pathname = '/', userAgent = '', languages = ['en-US'], referrer = '', webdriver = false, stored = null } = {}) {
  let replaced = null;
  const store = new Map(stored ? [['nowyeogi:lang', stored]] : []);
  const session = new Map();
  const sandbox = {
    location: { pathname, replace: (u) => { replaced = u; } },
    navigator: { userAgent, languages, language: languages[0] ?? '', webdriver },
    document: { referrer },
    localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
    sessionStorage: { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, v) },
  };
  const fn = new Function(
    'location', 'navigator', 'document', 'localStorage', 'sessionStorage',
    body,
  );
  fn(sandbox.location, sandbox.navigator, sandbox.document, sandbox.localStorage, sandbox.sessionStorage);
  return replaced;
}

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

describe('LangRedirect — 크롤러는 보내지 않는다', () => {
  const crawlers = {
    googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'googlebot smartphone': 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    bingbot: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'google inspection tool': 'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)',
    mediapartners: 'Mediapartners-Google',
    'naver yeti': 'Mozilla/5.0 (compatible; Yeti/1.1; +http://naver.me/spd)',
    'headless chrome': 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/140.0 Safari/537.36',
    facebook: 'facebookexternalhit/1.1',
  };

  for (const [name, ua] of Object.entries(crawlers)) {
    it(`${name} 는 이동시키지 않는다`, () => {
      expect(run({ userAgent: ua, languages: ['en-US'] })).toBeNull();
    });
  }

  it('navigator.webdriver 가 켜져 있으면 이동시키지 않는다', () => {
    expect(run({ userAgent: CHROME, webdriver: true })).toBeNull();
  });
});

describe('LangRedirect — 사람은 언어에 맞게 보낸다', () => {
  it('영어 브라우저는 /en/ 으로', () => {
    expect(run({ userAgent: CHROME, languages: ['en-US', 'en'] })).toBe('/en/');
  });

  it('일본어 브라우저는 /ja/ 로', () => {
    expect(run({ userAgent: CHROME, languages: ['ja-JP', 'ja'] })).toBe('/ja/');
  });

  it('한국어 브라우저는 그대로 둔다', () => {
    expect(run({ userAgent: CHROME, languages: ['ko-KR', 'ko'] })).toBeNull();
  });

  it('지원하지 않는 언어는 영어로 보낸다', () => {
    expect(run({ userAgent: CHROME, languages: ['fr-FR', 'fr'] })).toBe('/en/');
  });
});

describe('LangRedirect — 동작 범위', () => {
  it('홈이 아니면 아무것도 하지 않는다', () => {
    expect(run({ userAgent: CHROME, pathname: '/posts/chuseok-2026-09/' })).toBeNull();
  });

  it('검색엔진에서 온 방문은 보내지 않는다', () => {
    expect(run({ userAgent: CHROME, referrer: 'https://www.google.com/search?q=korea' })).toBeNull();
  });

  it('직접 고른 언어가 있으면 그 선택을 따른다', () => {
    expect(run({ userAgent: CHROME, languages: ['en-US'], stored: 'ko' })).toBeNull();
    expect(run({ userAgent: CHROME, languages: ['ko-KR'], stored: 'ja' })).toBe('/ja/');
  });
});
