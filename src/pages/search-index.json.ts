import { buildSearchIndex, searchIndexResponse } from '../lib/search';

export async function GET() {
  return searchIndexResponse(await buildSearchIndex('ko'));
}
