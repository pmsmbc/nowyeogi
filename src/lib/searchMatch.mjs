/**
 * 검색 일치 로직. 브라우저(검색 페이지)와 테스트에서 같이 쓴다.
 * 조사·띄어쓰기 변형이 많은 한국어에 맞춰 형태소 분석 없이 "부분 문자열" 로 찾는다.
 * 검색어를 공백으로 나눈 조각이 모두 들어 있어야 한다(AND). 점수: 제목 > 태그·지역 > 설명.
 */
export function normalize(s) {
  return String(s ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function terms(query) {
  return normalize(query).split(' ').filter((w) => w.length > 0);
}

/** @param {{t:string,d:string,g:string[],r:string,p:string}} item */
export function score(item, ws) {
  const title = normalize(item.t), desc = normalize(item.d), tags = normalize((item.g ?? []).join(' ')), region = normalize(item.r);
  let total = 0;
  for (const w of ws) {
    let s = 0;
    if (title.includes(w)) s += 3;
    if (tags.includes(w)) s += 2;
    if (region.includes(w)) s += 2;
    if (desc.includes(w)) s += 1;
    if (s === 0) return 0; // 조각 하나라도 없으면 탈락
    total += s;
  }
  return total;
}

export function search(items, query, limit = 50) {
  const ws = terms(query);
  if (ws.length === 0) return [];
  return items
    .map((item) => ({ item, s: score(item, ws) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.item.p > a.item.p ? 1 : b.item.p < a.item.p ? -1 : 0))
    .slice(0, limit)
    .map((x) => x.item);
}
