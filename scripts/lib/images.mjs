const EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.tif', '.tiff']);

const ext = (f) => f.slice(f.lastIndexOf('.')).toLowerCase();
const isImage = (f) => EXTS.has(ext(f));
const isCover = (f) => /^cover\./i.test(f);
const naturalCompare = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

export function planImages(filenames) {
  const images = filenames.filter(isImage);
  const cover = images.find(isCover);
  const rest = images.filter((f) => !isCover(f)).sort(naturalCompare);
  const plan = [];
  if (cover) plan.push({ source: cover, target: '00.webp', isCover: true });
  rest.forEach((source, i) => plan.push({ source, target: `${String(i + 1).padStart(2, '0')}.webp`, isCover: false }));
  return plan;
}
