import type { Lang } from '../site.config';
import { getPosts, postPath } from './posts';
import { regionName } from '../data/regions';
import { thumbSrc } from './responsive.mjs';

/** 검색 페이지가 받는 색인 한 줄. 키를 짧게 둬서 파일을 작게 유지한다. */
export interface SearchItem {
  u: string; // 글 주소
  t: string; // 제목
  d: string; // 설명
  g: string[]; // 태그
  r: string; // 지역 이름(언어별)
  p: string; // 발행일 YYYY-MM-DD
  c: string; // 썸네일
  w?: number; h?: number; // 썸네일 원본 비율
}

export async function buildSearchIndex(lang: Lang): Promise<SearchItem[]> {
  const posts = await getPosts(lang);
  return posts.map((post) => {
    const cover = post.data.images.find((i) => i.src === post.data.cover);
    return {
      u: postPath(post),
      t: post.data.title,
      d: post.data.description,
      g: post.data.tags,
      r: regionName(post.data.region, lang),
      p: post.data.pubDate.toISOString().slice(0, 10),
      c: thumbSrc(post.data.cover),
      ...(cover?.width && cover?.height ? { w: cover.width, h: cover.height } : {}),
    };
  });
}

export function searchIndexResponse(items: SearchItem[]): Response {
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
