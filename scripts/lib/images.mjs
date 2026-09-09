import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

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

export const MAX_EDGE = 1600;
export const WEBP_QUALITY = 80;

async function loadInput(srcPath) {
  const e = ext(srcPath);
  if (e === '.heic' || e === '.heif') {
    const { default: heicConvert } = await import('heic-convert');
    const buffer = await readFile(srcPath);
    return Buffer.from(await heicConvert({ buffer, format: 'JPEG', quality: 0.92 }));
  }
  return srcPath;
}

export async function convertImage(srcPath, destPath) {
  const input = await loadInput(srcPath);
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toFile(destPath);
  return { width: info.width, height: info.height };
}
