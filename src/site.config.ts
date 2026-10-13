import config from './site.config.json';

export type Lang = 'ko' | 'en' | 'ja';
export const LANGS: Lang[] = ['ko', 'en', 'ja'];
export const DEFAULT_LANG: Lang = 'ko';

export interface SiteConfig {
  url: string;
  name: Record<Lang, string>;
  homeTitle: Record<Lang, string>;
  description: Record<Lang, string>;
  tagline: Record<Lang, string>;
  /** 편집자 필명(언어별). About 소개와 글의 author 스키마에 쓴다 */
  author: Record<Lang, string>;
  email: string;
  postsPerPage: number;
  adsense: { client: string; slots: { top: string; inArticle: string; bottom: string; list: string } };
  verification: { google: string; bing: string; naver: string };
  gtm: { id: string };
}

const siteConfig: SiteConfig = config;
export default siteConfig;
