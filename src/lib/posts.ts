import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../site.config';
import { splitId, localePath, sortByDateDesc, isPublished } from './postUtils';

export type Post = CollectionEntry<'posts'>;

export async function getPosts(lang: Lang): Promise<Post[]> {
  const all = await getCollection('posts', ({ id, data }) => splitId(id).lang === lang && isPublished(data, import.meta.env.DEV));
  return sortByDateDesc(all);
}

export async function getTranslation(post: Post): Promise<Post | undefined> {
  const { lang, slug } = splitId(post.id);
  const other: Lang = lang === 'ko' ? 'en' : 'ko';
  return (await getPosts(other)).find((p) => splitId(p.id).slug === slug);
}

export function postSlug(post: Post): string {
  return splitId(post.id).slug;
}

export function postPath(post: Post): string {
  const { lang, slug } = splitId(post.id);
  return localePath(lang, `/posts/${slug}/`);
}
