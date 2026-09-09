import config from './site.config.json';

export type Lang = 'ko' | 'en';
export const LANGS: Lang[] = ['ko', 'en'];

export interface SiteConfig {
  url: string;
  name: Record<Lang, string>;
  homeTitle: Record<Lang, string>;
  description: Record<Lang, string>;
  tagline: Record<Lang, string>;
  author: string;
  email: string;
  postsPerPage: number;
  adsense: { client: string; slots: { top: string; inArticle: string; bottom: string; list: string } };
  verification: { google: string; bing: string };
}

const siteConfig: SiteConfig = config;
export default siteConfig;
