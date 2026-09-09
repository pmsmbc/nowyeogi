import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import siteConfig from '../site.config';
import { getPosts, postPath } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts('ko');
  return rss({
    title: siteConfig.name.ko,
    description: siteConfig.tagline.ko,
    site: context.site ?? siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: postPath(post),
      categories: post.data.tags,
    })),
    customData: '<language>ko-KR</language>',
  });
}
