import { describe, it, expect } from 'vitest';
import { validateSlug } from './slug.mjs';

describe('validateSlug', () => {
  it('규칙에 맞으면 ok', () => {
    expect(validateSlug('jeju-aewol-2026-09')).toEqual({ ok: true });
    expect(validateSlug('abc')).toEqual({ ok: true });
  });
  it('대문자, 한글, 공백, 연속 하이픈, 길이 위반을 거부한다', () => {
    expect(validateSlug('Jeju').ok).toBe(false);
    expect(validateSlug('제주').ok).toBe(false);
    expect(validateSlug('a b').ok).toBe(false);
    expect(validateSlug('a--b').ok).toBe(false);
    expect(validateSlug('-ab').ok).toBe(false);
    expect(validateSlug('ab').ok).toBe(false);
    expect(validateSlug('a'.repeat(81)).ok).toBe(false);
  });
  it('이유를 한국어로 돌려준다', () => {
    expect(validateSlug('제주').reason).toMatch(/영문 소문자/);
  });
});
