import { getCollection, type CollectionEntry } from 'astro:content';
import { LANGS, type Lang } from '../site.config';
import { splitId, localePath, sortByDateDesc, isPublished } from './postUtils';

export type Post = CollectionEntry<'posts'>;

export async function getPosts(lang: Lang): Promise<Post[]> {
  const all = await getCollection('posts', ({ id, data }) => splitId(id).lang === lang && isPublished(data, import.meta.env.DEV));
  return sortByDateDesc(all);
}

/** 같은 slug 의 다른 언어 글을 모두 찾는다. */
export async function getTranslations(post: Post): Promise<Partial<Record<Lang, Post>>> {
  const { lang, slug } = splitId(post.id);
  const out: Partial<Record<Lang, Post>> = {};
  for (const other of LANGS) {
    if (other === lang) continue;
    const found = (await getPosts(other)).find((p) => splitId(p.id).slug === slug);
    if (found) out[other] = found;
  }
  return out;
}

export function postSlug(post: Post): string {
  return splitId(post.id).slug;
}

export function postPath(post: Post): string {
  const { lang, slug } = splitId(post.id);
  return localePath(lang, `/posts/${slug}/`);
}
