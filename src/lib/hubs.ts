import type { Lang } from '../site.config';
import hubsData from '../data/hubs.json';
import { postSlug, type Post } from './posts';

export interface Hub {
  key: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  source: 'events' | 'guides' | 'slugs';
  slugs?: string[];
  extraSlugs?: string[];
  regions?: string[];
  limit: number;
  more?: string;
}

export interface HubResolved { hub: Hub; posts: Post[] }

/** events 가 있는 글을 "진행 중·예정(시작일 빠른 순) → 지난 행사(종료일 늦은 순)" 로 정렬한다. */
function sortEventPosts(posts: Post[], now: Date): Post[] {
  const nowMs = now.getTime();
  const info = posts
    .filter((p) => p.data.events.length > 0)
    .map((p) => {
      const starts = p.data.events.map((e) => Date.parse(e.startDate));
      const ends = p.data.events.map((e) => Date.parse(e.endDate ?? e.startDate) + 86_400_000);
      const upcoming = Math.max(...ends) >= nowMs;
      return { p, upcoming, start: Math.min(...starts), end: Math.max(...ends) };
    });
  const live = info.filter((i) => i.upcoming).sort((a, b) => a.start - b.start);
  const past = info.filter((i) => !i.upcoming).sort((a, b) => b.end - a.end);
  return [...live, ...past].map((i) => i.p);
}

export function resolveHubs(lang: Lang, posts: Post[], now = new Date()): HubResolved[] {
  const bySlug = new Map(posts.map((p) => [postSlug(p), p]));
  return (hubsData.hubs as Hub[])
    .map((hub) => {
      let picked: Post[] = [];
      if (hub.source === 'events') picked = sortEventPosts(posts, now).slice(0, Math.max(2, hub.limit - (hub.extraSlugs?.length ?? 0)));
      else if (hub.source === 'guides') {
        const order = hub.regions ?? [];
        picked = posts
          .filter((p) => /-guide-\d{4}-\d{2}$/.test(postSlug(p)) && order.includes(p.data.region))
          .sort((a, b) => order.indexOf(a.data.region) - order.indexOf(b.data.region) || postSlug(a).localeCompare(postSlug(b)));
      } else picked = (hub.slugs ?? []).map((s) => bySlug.get(s)).filter((p): p is Post => !!p);
      for (const s of hub.extraSlugs ?? []) {
        const p = bySlug.get(s);
        if (p && !picked.includes(p)) picked.push(p);
      }
      // 같은 글이 두 번 나오지 않게 하고 limit 로 자른다
      const seen = new Set<string>();
      picked = picked.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, hub.limit);
      return { hub, posts: picked };
    })
    .filter((h) => h.posts.length >= 2);
}

/** 허브 링크 글자: "부산 여행 총정리: 동네 구분, 교통" → "부산 여행 총정리". 콜론 앞이 너무 짧으면 제목 전체. */
export function hubLabel(title: string): string {
  const head = title.split(/[:：]/)[0].trim();
  return head.length >= 6 ? head : title;
}
