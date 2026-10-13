import siteConfig, { type Lang } from '../site.config';
import { localePath } from './postUtils';

/**
 * 사이트 전체에서 같은 발행 주체를 가리키는 Organization 노드.
 * 글(author/publisher)과 홈(WebSite.publisher)이 같은 @id 를 참조해 한 실체로 묶인다.
 * 2026-10-13 SEO 감사: author 가 브랜드명 Person 이고 publisher 에 url/logo 가 없어 E-E-A-T 신호가 약했다.
 */
export const BASE = siteConfig.url.replace(/\/$/, '');
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
