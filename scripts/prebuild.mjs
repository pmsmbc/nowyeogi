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

// 콘텐츠 렌더 캐시는 마크다운 내용만 보고 재사용된다. 그래서 rehype 플러그인이나
// 노선·버스 색 데이터를 고쳐도 예전 HTML 이 그대로 남는다. 관련 파일이 캐시보다
// 새로우면 캐시를 지워 다시 렌더하게 한다.
import { rmSync, statSync, readdirSync, existsSync as exists } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const caches = ['.astro', join('node_modules', '.astro')].map((d) => join(root, d));
const watched = [join(root, 'src', 'lib', 'markdown'), join(root, 'src', 'data')];

function newestMtime(dir) {
  if (!exists(dir)) return 0;
  let newest = 0;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    newest = Math.max(newest, st.isDirectory() ? newestMtime(full) : st.mtimeMs);
  }
  return newest;
}

const sourceMtime = Math.max(...watched.map(newestMtime));
for (const cache of caches) {
  const store = join(cache, 'data-store.json');
  if (exists(store) && statSync(store).mtimeMs < sourceMtime) {
    rmSync(cache, { recursive: true, force: true });
    console.log(`prebuild: 렌더 캐시 삭제 (${cache.replace(root + '/', '')}) — 플러그인/데이터가 변경됨`);
  }
}
