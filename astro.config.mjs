import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import siteConfig from './src/site.config.json';
import { rehypeFigures } from './src/lib/markdown/rehypeFigures.mjs';
import { rehypeTables } from './src/lib/markdown/rehypeTables.mjs';
import { rehypeAdSlot } from './src/lib/markdown/rehypeAdSlot.mjs';
import { rehypeTransitBadges } from './src/lib/markdown/rehypeTransitBadges.mjs';
import { fileURLToPath } from 'node:url';
import { thinTagPaths } from './scripts/lib/thin-tags.mjs';
import { sitemapLastmod } from './scripts/lib/posts-meta.mjs';

// 글이 적은 태그 페이지는 사이트맵에서 뺀다(페이지 쪽 noindex 와 같은 기준). 서치콘솔 색인 제외 대응.
const postsRoot = fileURLToPath(new URL('./src/content/posts', import.meta.url));
const { sitemapFilter } = thinTagPaths(postsRoot, { withFilter: true });
// 사이트맵 lastmod: 글은 updatedDate ?? pubDate, 목록 페이지는 포함된 글 중 최신. 바뀐 글부터 다시 크롤하라는 신호.
const lastmodFor = sitemapLastmod(postsRoot);

export default defineConfig({
  site: siteConfig.url,
  // CSS(글꼴 선언 포함 ~17KB gzip)를 HTML 에 넣어 렌더링을 막는 요청 하나를 없앤다(2026-10-14 모바일 FCP 대응).
  // GitHub Pages 캐시가 10분이라 외부 CSS 캐시 이점이 거의 없다.
  build: { inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko', 'en', 'ja'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: sitemapFilter,
      serialize: (item) => { const lm = lastmodFor(item.url); if (lm) item.lastmod = lm; return item; },
      // HTML 의 hreflang(ko/en/ja)과 같은 표기를 쓴다
      i18n: { defaultLocale: 'ko', locales: { ko: 'ko', en: 'en', ja: 'ja' } },
    }),
  ],
  markdown: {
    // gfm 기본값 대신 remark-gfm 을 직접 넣는다. singleTilde:false 로 두어야
    // 한국어의 범위 표기(4~5월, 20~40%)가 취소선으로 잘못 해석되지 않는다.
    processor: unified({
      gfm: false,
      remarkPlugins: [[remarkGfm, { singleTilde: false }]],
      rehypePlugins: [
        rehypeTransitBadges,
        rehypeFigures,
        rehypeTables,
        [rehypeAdSlot, { client: siteConfig.adsense.client, slot: siteConfig.adsense.slots.inArticle }],
      ],
    }),
  },
});
