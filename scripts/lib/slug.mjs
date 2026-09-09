const RULE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function validateSlug(slug) {
  if (typeof slug !== 'string' || !RULE.test(slug)) {
    return { ok: false, reason: '폴더 이름은 영문 소문자, 숫자, 하이픈만 쓸 수 있습니다. 예: jeju-aewol-2026-09' };
  }
  if (slug.length < 3 || slug.length > 80) {
    return { ok: false, reason: '폴더 이름은 3~80자여야 합니다.' };
  }
  return { ok: true };
}
