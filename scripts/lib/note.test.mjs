import { describe, it, expect } from 'vitest';
import { parseNote, parseMenu, mapKind } from './note.mjs';

const sample = `지역: 제주 애월
날짜: 2026-09-01
구분: 국내
종류: 맛집
동행: 친구 2명
[장소]
이름: 봄날카페
종류: 카페
위치: 제주시 애월읍 애월북서길 25
메뉴: 아메리카노 6000 / 당근케이크 7500원
영업: 09:00-21:00
평점: 4.5
한줄평: 창가 자리에서 보는 바다가 전부다
지도: https://maps.example/1
[장소]
이름: 국수집
종류: 식당
메뉴: 고기국수 9,000원
메모: 주차는 공영주차장.
오후 3시 이후 웨이팅 30분.`;

describe('parseNote', () => {
  const note = parseNote(sample);
  it('상단 항목을 읽는다', () => {
    expect(note.region).toBe('제주 애월');
    expect(note.date).toBe('2026-09-01');
    expect(note.scope).toBe('domestic');
    expect(note.type).toBe('food');
    expect(note.companions).toBe('친구 2명');
  });
  it('장소 블록을 읽는다', () => {
    expect(note.places).toHaveLength(2);
    expect(note.places[0]).toMatchObject({ name: '봄날카페', kind: 'cafe', address: '제주시 애월읍 애월북서길 25', hours: '09:00-21:00', rating: 4.5, tip: '창가 자리에서 보는 바다가 전부다', mapUrl: 'https://maps.example/1' });
    expect(note.places[0].menu).toEqual([{ name: '아메리카노', price: '6,000원' }, { name: '당근케이크', price: '7,500원' }]);
    expect(note.places[1]).toMatchObject({ name: '국수집', kind: 'restaurant' });
  });
  it('메모와 이어지는 줄을 모은다', () => {
    expect(note.memo).toBe('주차는 공영주차장.\n오후 3시 이후 웨이팅 30분.');
  });
  it('raw를 보존하고 빈 입력도 처리한다', () => {
    expect(note.raw).toBe(sample);
    expect(parseNote('')).toMatchObject({ places: [], memo: '', extra: {} });
  });
  it('전각 콜론과 영어 키도 허용한다', () => {
    const n = parseNote('Region： Tokyo\n[place]\nname: Ramen\nkind: restaurant');
    expect(n.region).toBe('Tokyo');
    expect(n.places[0]).toMatchObject({ name: 'Ramen', kind: 'restaurant' });
  });
});

describe('parseMenu', () => {
  it('구분자 / 또는 , 로 나누고 가격을 정규화한다', () => {
    expect(parseMenu('아메리카노 6000 / 케이크 7500원')).toEqual([{ name: '아메리카노', price: '6,000원' }, { name: '케이크', price: '7,500원' }]);
    expect(parseMenu('쇼유 라멘 1100엔, 교자 500엔')).toEqual([{ name: '쇼유 라멘', price: '1,100엔' }, { name: '교자', price: '500엔' }]);
    expect(parseMenu('오마카세')).toEqual([{ name: '오마카세', price: '' }]);
    expect(parseMenu('')).toEqual([]);
  });
});

describe('mapKind', () => {
  it('한/영 표기를 kind로 바꾼다', () => {
    expect(mapKind('식당')).toBe('restaurant');
    expect(mapKind('맛집')).toBe('restaurant');
    expect(mapKind('카페')).toBe('cafe');
    expect(mapKind('숙소')).toBe('stay');
    expect(mapKind('호텔')).toBe('stay');
    expect(mapKind('명소')).toBe('spot');
    expect(mapKind('모름')).toBe('spot');
    expect(mapKind('Cafe')).toBe('cafe');
  });
});
