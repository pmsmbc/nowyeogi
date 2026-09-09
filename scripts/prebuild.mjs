import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../src/site.config.json', import.meta.url), 'utf8'));
mkdirSync(new URL('../public', import.meta.url), { recursive: true });

const client = config.adsense.client?.trim();
const adsTxt = client
  ? `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
  : '';
writeFileSync(new URL('../public/ads.txt', import.meta.url), adsTxt);

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${config.url.replace(/\/$/, '')}/sitemap-index.xml\n`;
writeFileSync(new URL('../public/robots.txt', import.meta.url), robots);

console.log(`prebuild: ads.txt ${client ? '생성' : '(비어 있음)'}, robots.txt 생성`);
