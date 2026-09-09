import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import siteConfig from '../../site.config';
import { getPosts, postPath } from '../../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts('en');
  return rss({
    title: siteConfig.name.en,
    description: siteConfig.tagline.en,
    site: new URL('/en/', context.site ?? siteConfig.url).toString(),
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: postPath(post),
      categories: post.data.tags,
    })),
    customData: '<language>en-US</language>',
  });
}
