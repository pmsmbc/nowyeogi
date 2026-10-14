import type { Lang } from '../site.config';
import { getPosts, postPath } from './posts';
import { regionName } from '../data/regions';
import { thumbSrc } from './responsive.mjs';
import { t, formatDate, type UiKey } from '../i18n/ui';

/** 검색 페이지가 받는 색인 한 줄. 키를 짧게 둬서 파일을 작게 유지한다. */
export interface SearchItem {
  u: string; // 글 주소
  t: string; // 제목
  d: string; // 설명
  g: string[]; // 태그
  r: string; // 지역 이름(언어별)
  p: string; // 발행일 YYYY-MM-DD (정렬용)
  dt: string; // 발행일 표시 문자열(언어별)
  k: string; // 글 종류 라벨(여행/맛집)
  f: boolean; // 맛집 글이면 true (배지 색)
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
      dt: formatDate(lang, post.data.pubDate),
      k: t(lang, `type.${post.data.type}` as UiKey),
      f: post.data.type === 'food',
      c: thumbSrc(post.data.cover),
      ...(cover?.width && cover?.height ? { w: cover.width, h: cover.height } : {}),
    };
  });
}

export function searchIndexResponse(items: SearchItem[]): Response {
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
