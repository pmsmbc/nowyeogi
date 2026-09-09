import { stringify } from 'yaml';

export function buildFrontmatter({ note, regionKey, regionScope, images, today }) {
  const cover = images.find((i) => i.isCover) ?? images[0];
  const allFood = note.places.length > 0 && note.places.every((p) => p.kind === 'restaurant' || p.kind === 'cafe');
  const places = note.places.map((p) => {
    const out = { name: p.name ?? '', kind: p.kind ?? 'spot' };
    if (p.address) out.address = p.address;
    if (p.menu?.length) out.menu = p.menu;
    if (p.hours) out.hours = p.hours;
    if (p.rating) out.rating = p.rating;
    if (p.tip) out.tip = p.tip;
    if (p.mapUrl) out.mapUrl = p.mapUrl;
    return out;
  });
  return {
    title: '',
    description: '',
    pubDate: note.date || today,
    scope: note.scope ?? regionScope ?? 'domestic',
    region: regionKey ?? 'UNKNOWN',
    type: note.type ?? (allFood ? 'food' : 'travel'),
    cover: cover?.src ?? '',
    images: images.map(({ src, alt, width, height }) => ({ src, alt: alt ?? '', width, height })),
    tags: [],
    places,
    draft: true,
  };
}

export function noteToComment(raw) {
  const safe = String(raw ?? '').replace(/--/g, '- -');
  return `<!--\nnote.txt 원문 (글을 다 쓰면 이 주석은 지워도 됩니다)\n\n${safe}\n-->`;
}

export function serializePost(frontmatter, body) {
  return `---\n${stringify(frontmatter, { lineWidth: 0 })}---\n\n${body}\n`;
}
