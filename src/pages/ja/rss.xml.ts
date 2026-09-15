import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import siteConfig from '../../site.config';
import { getPosts, postPath } from '../../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts('ja');
  return rss({
    title: siteConfig.name.ja,
    description: siteConfig.tagline.ja,
    site: new URL('/ja/', context.site ?? siteConfig.url).toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: postPath(post),
      categories: post.data.tags,
    })),
    customData: '<language>ja-JP</language>',
  });
}
