/** 글 파일 경로에서 언어를 알아낸다. content/posts/<lang>/... 구조를 전제한다. */
export const LANGS = ['ko', 'en', 'ja'];
export const DEFAULT_LANG = 'ko';

export function langFromPath(file) {
  const p = String(file?.path ?? file?.history?.[0] ?? '').replace(/\\/g, '/');
  for (const lang of LANGS) {
    if (lang !== DEFAULT_LANG && new RegExp(`/${lang}/`).test(p)) return lang;
  }
  return DEFAULT_LANG;
}
