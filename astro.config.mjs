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
