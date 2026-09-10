import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import remarkGfm from 'remark-gfm';
import siteConfig from './src/site.config.json';
import { rehypeFigures } from './src/lib/markdown/rehypeFigures.mjs';
import { rehypeAdSlot } from './src/lib/markdown/rehypeAdSlot.mjs';
import { rehypeTransitBadges } from './src/lib/markdown/rehypeTransitBadges.mjs';

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
    // gfm 기본값 대신 remark-gfm 을 직접 넣는다. singleTilde:false 로 두어야
    // 한국어의 범위 표기(4~5월, 20~40%)가 취소선으로 잘못 해석되지 않는다.
    processor: unified({
      gfm: false,
      remarkPlugins: [[remarkGfm, { singleTilde: false }]],
      rehypePlugins: [
        rehypeTransitBadges,
        rehypeFigures,
        [rehypeAdSlot, { client: siteConfig.adsense.client, slot: siteConfig.adsense.slots.inArticle }],
      ],
    }),
  },
});
