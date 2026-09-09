const TOP_KEYS = {
  region: ['지역', 'region'],
  date: ['날짜', 'date'],
  scope: ['구분', 'scope'],
  type: ['종류', 'type'],
  companions: ['동행', 'companions', 'with'],
  memo: ['메모', 'memo', 'note'],
};
const PLACE_KEYS = {
  name: ['이름', 'name'],
  kind: ['종류', 'kind', 'type'],
  address: ['위치', '주소', 'address', 'location'],
  menu: ['메뉴', 'menu'],
  hours: ['영업', '영업시간', 'hours'],
  rating: ['평점', 'rating'],
  tip: ['한줄평', '팁', 'tip', 'note'],
  mapUrl: ['지도', 'map', 'url'],
};

const keyOf = (table, k) => Object.keys(table).find((id) => table[id].includes(k.toLowerCase()));

export function mapKind(s) {
  const v = String(s ?? '').trim().toLowerCase();
  if (/식당|맛집|restaurant|food/.test(v)) return 'restaurant';
  if (/카페|cafe|café|coffee/.test(v)) return 'cafe';
  if (/숙소|호텔|stay|hotel/.test(v)) return 'stay';
  return 'spot';
}

function normalizePrice(p) {
  const m = p.match(/^([\d,]+)(.*)$/);
  if (!m) return p;
  const num = Number(m[1].replace(/,/g, ''));
  const unit = m[2].trim() || '원';
  return `${num.toLocaleString('en-US')}${unit}`;
}

export function parseMenu(s) {
  const text = String(s ?? '').trim();
  if (!text) return [];
  return text.split(/\s*[\/,]\s*/).filter(Boolean).map((item) => {
    const m = item.match(/^(.*?)\s+([\d,]+\s*\S*)$/);
    if (!m) return { name: item, price: '' };
    return { name: m[1].trim(), price: normalizePrice(m[2].trim()) };
  });
}

function mapScope(v) {
  if (/국내|domestic|korea/i.test(v)) return 'domestic';
  if (/해외|overseas|abroad/i.test(v)) return 'overseas';
  return undefined;
}
function mapType(v) {
  if (/맛집|food/i.test(v)) return 'food';
  if (/여행|travel/i.test(v)) return 'travel';
  return undefined;
}

export function parseNote(text) {
  const raw = String(text ?? '');
  const note = { places: [], memo: '', extra: {}, raw };
  const memoLines = [];
  let current = null;
  let lastTop = null; // 이어지는 줄을 붙일 곳: 'memo' | null

  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (/^\[(장소|place)\]$/i.test(t)) {
      current = { kind: 'spot', menu: [] };
      note.places.push(current);
      lastTop = null;
      continue;
    }
    const m = t.match(/^([^:：]+?)\s*[:：]\s*(.*)$/);
    if (!m) {
      if (lastTop === 'memo' || !current) memoLines.push(t);
      else current.tip = current.tip ? `${current.tip}\n${t}` : t;
      continue;
    }
    const [, k, v] = m;
    // 장소 블록 안에서도 메모/지역/날짜/구분/동행 키가 나오면 블록을 닫는다 (종류는 장소 안에서 kind 로 쓰이므로 제외)
    const topId = keyOf(TOP_KEYS, k.trim());
    if (current && topId && topId !== 'type') current = null;
    if (current) {
      const id = keyOf(PLACE_KEYS, k.trim());
      if (id === 'menu') current.menu = parseMenu(v);
      else if (id === 'kind') current.kind = mapKind(v);
      else if (id === 'rating') current.rating = Number.parseFloat(v) || undefined;
      else if (id) current[id] = v.trim();
      else current[k.trim()] = v.trim();
      continue;
    }
    const id = topId;
    lastTop = id === 'memo' ? 'memo' : null;
    if (id === 'memo') memoLines.push(v.trim());
    else if (id === 'scope') note.scope = mapScope(v);
    else if (id === 'type') note.type = mapType(v);
    else if (id) note[id] = v.trim();
    else note.extra[k.trim()] = v.trim();
  }
  note.memo = memoLines.join('\n');
  return note;
}
