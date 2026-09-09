/** text 안에서 가장 먼저 등장하는 지역 키를 돌려준다. */
export function guessRegion(text, regions) {
  const hay = String(text ?? '');
  if (!hay) return undefined;
  const lower = hay.toLowerCase();
  let best;
  for (const [key, r] of Object.entries(regions)) {
    const names = [r.ko, r.en, ...(r.aliases ?? [])].filter(Boolean);
    for (const name of names) {
      const idx = lower.indexOf(name.toLowerCase());
      if (idx === -1) continue;
      if (!best || idx < best.idx) best = { key, idx };
    }
  }
  return best?.key;
}
