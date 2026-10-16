import { describe, it, expect } from 'vitest';
import { buildRobotsTxt } from './robots.mjs';

// User-agent 줄들 다음에 오는 규칙 줄을 봇별로 모은다.
function rulesFor(txt, bot) {
  const groups = txt.split(/\n(?=# |Sitemap)/);
  for (const g of groups) {
    const lines = g.split('\n');
    if (lines.some((l) => l.toLowerCase() === `user-agent: ${bot.toLowerCase()}`)) {
      return lines.filter((l) => /^(Allow|Disallow):/.test(l));
    }
  }
  return null;
}

describe('buildRobotsTxt', () => {
  const txt = buildRobotsTxt('https://nowyeogi.com/');

  it('검색엔진·애드센스 봇은 막지 않는다', () => {
    for (const bot of ['Googlebot', 'Bingbot', 'Yeti', 'Daum', 'Mediapartners-Google', 'AdsBot-Google']) {
      expect(rulesFor(txt, bot)).toEqual(['Allow: /']);
    }
  });

  it('SEO 도구·AI 학습 봇은 막는다', () => {
    for (const bot of ['AhrefsBot', 'SemrushBot', 'GPTBot', 'CCBot', 'Bytespider']) {
      expect(rulesFor(txt, bot)).toEqual(['Disallow: /']);
    }
  });

  it('나머지 봇은 허용하고 사이트맵을 건다', () => {
    expect(rulesFor(txt, '*')).toEqual(['Allow: /']);
    expect(txt).toContain('Sitemap: https://nowyeogi.com/sitemap-index.xml');
  });

  it('같은 봇을 허용·차단에 동시에 넣으면 실패한다', () => {
    expect(() => buildRobotsTxt('https://x.com', { allowed: ['GPTBot'], blocked: ['gptbot'] })).toThrow();
  });
});
