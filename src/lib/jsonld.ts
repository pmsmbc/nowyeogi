import siteConfig, { type Lang } from '../site.config';
import { localePath } from './postUtils';

/**
 * 사이트 전체에서 같은 발행 주체를 가리키는 Organization 노드.
 * 글(author/publisher)과 홈(WebSite.publisher)이 같은 @id 를 참조해 한 실체로 묶인다.
 * 2026-10-13 SEO 감사: author 가 브랜드명 Person 이고 publisher 에 url/logo 가 없어 E-E-A-T 신호가 약했다.
 */
export const BASE = siteConfig.url.replace(/\/$/, '');
export const BCP47: Record<Lang, string> = { ko: 'ko-KR', en: 'en-US', ja: 'ja-JP' };
export const ORG_ID = `${BASE}/#organization`;

export function organizationJsonLd(lang: Lang) {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: siteConfig.name.ko,
    alternateName: [siteConfig.name.en, siteConfig.name.ja],
    url: `${BASE}${localePath(lang, '/about/')}`,
    logo: { '@type': 'ImageObject', url: `${BASE}/brand/logo-mark.png`, width: 512, height: 512 },
    email: siteConfig.email,
  };
}

/** 글 author/publisher 에 쓰는 짧은 참조. 같은 페이지의 Organization 노드를 가리킨다. */
export function organizationRef() {
  return { '@type': 'Organization', '@id': ORG_ID, name: siteConfig.name.ko };
}

/**
 * 편집자(필명 "수집하는 진") Person 노드. 글의 author 가 이 노드를 가리키고, url 은 About 의 편집자 소개로 간다.
 * 2026-10-13 사용자 결정: 실명 대신 필명을 쓴다.
 */
export const EDITOR_ID = `${BASE}/#editor`;

export function editorJsonLd(lang: Lang) {
  return {
    '@type': 'Person',
    '@id': EDITOR_ID,
    name: siteConfig.author[lang],
    alternateName: [siteConfig.author.ko, siteConfig.author.en, siteConfig.author.ja].filter((n) => n !== siteConfig.author[lang]),
    url: `${BASE}${localePath(lang, '/about/')}#editor`,
    jobTitle: lang === 'ko' ? '편집자' : lang === 'ja' ? '編集者' : 'Editor',
    worksFor: { '@id': ORG_ID },
  };
}

export function editorRef(lang: Lang) {
  return { '@type': 'Person', '@id': EDITOR_ID, name: siteConfig.author[lang], url: `${BASE}${localePath(lang, '/about/')}#editor` };
}

/** 축제·행사 글의 Event JSON-LD. 글의 frontmatter `events` 한 항목을 schema.org Event 로 바꾼다. */
export function eventJsonLd(
  ev: { name: string; startDate: string; endDate?: string; location: string; address: string; url?: string; price?: number; validFrom?: string; organizer?: string; organizerUrl?: string; performer?: string; status: string },
  opts: { lang: Lang; description: string; image: string; pageUrl: string; pubDate: string },
) {
  const STATUS: Record<string, string> = {
    scheduled: 'https://schema.org/EventScheduled',
    cancelled: 'https://schema.org/EventCancelled',
    postponed: 'https://schema.org/EventPostponed',
    rescheduled: 'https://schema.org/EventRescheduled',
  };
  // 주최측 홈페이지: 따로 적은 값이 없으면 행사 공식 페이지(ev.url)를 쓴다(대개 주최측 사이트다).
  const organizerUrl = ev.organizerUrl ?? ev.url;
  const organizer = ev.organizer && { '@type': 'Organization', name: ev.organizer, ...(organizerUrl && { url: organizerUrl }) };
  return {
    '@type': 'Event',
    name: ev.name,
    description: opts.description,
    image: opts.image,
    inLanguage: BCP47[opts.lang],
    startDate: ev.startDate,
    ...(ev.endDate && { endDate: ev.endDate }),
    eventStatus: STATUS[ev.status] ?? STATUS.scheduled,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: ev.location,
      address: { '@type': 'PostalAddress', streetAddress: ev.address, addressCountry: 'KR' },
    },
    url: ev.url ?? opts.pageUrl,
    ...(ev.price !== undefined && {
      offers: {
        '@type': 'Offer',
        price: ev.price,
        priceCurrency: 'KRW',
        url: ev.url ?? opts.pageUrl,
        availability: 'https://schema.org/InStock',
        // 서치콘솔이 권장하는 판매 시작일. 티켓 판매일을 따로 적지 않았으면 글 게시일(요금을 안내한 날)을 쓴다.
        validFrom: ev.validFrom ?? opts.pubDate,
      },
    }),
    ...(organizer && { organizer }),
    // 축제는 특정 출연자가 없는 경우가 많아, 출연자를 따로 적지 않았으면 주최측을 performer 로 쓴다.
    ...(ev.performer ? { performer: { '@type': 'PerformingGroup', name: ev.performer } } : organizer && { performer: organizer }),
  };
}
