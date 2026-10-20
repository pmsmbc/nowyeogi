import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { regions } from './data/regions';

const image = z.object({
  src: z.string(),
  alt: z.string().default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  credit: z.string().optional(),
  creditUrl: z.string().url().optional(),
});

const place = z.object({
  name: z.string(),
  kind: z.enum(['restaurant', 'cafe', 'spot', 'stay']).default('spot'),
  address: z.string().optional(),
  menu: z.array(z.object({ name: z.string(), price: z.string() })).default([]),
  hours: z.string().optional(),
  rating: z.number().min(1).max(5).multipleOf(0.5).optional(),
  tip: z.string().optional(),
  mapUrl: z.string().url().optional(),
});

// 글 상단 "한눈에 보기" 표의 한 줄. value 는 본문에 이미 있는 사실만 요약한다(새 사실 금지).
const glanceRow = z.object({
  label: z.string(),
  value: z.string(),
  url: z.string().url().optional(),
});

// 축제·행사 글의 Event 구조화 데이터. 글 본문에 확인된 사실만 넣는다. 날짜는 ISO(YYYY-MM-DD 또는 YYYY-MM-DDTHH:MM+09:00).
const event = z.object({
  name: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  location: z.string(),
  address: z.string(),
  url: z.string().url().optional(),
  price: z.number().nonnegative().optional(),
  organizer: z.string().optional(),
  organizerUrl: z.string().url().optional(),
  performer: z.string().optional(),
  status: z.enum(['scheduled', 'cancelled', 'postponed', 'rescheduled']).default('scheduled'),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    scope: z.enum(['domestic', 'overseas']),
    region: z.string().refine((k) => k in regions, {
      message: 'src/data/regions.json에 없는 지역 키입니다. 사전에 먼저 추가하세요.',
    }),
    type: z.enum(['travel', 'food']).default('travel'),
    cover: z.string(),
    images: z.array(image).default([]),
    tags: z.array(z.string()).default([]),
    places: z.array(place).default([]),
    glance: z.array(glanceRow).default([]),
    events: z.array(event).default([]),
    sources: z.array(z.object({ title: z.string().optional(), url: z.string().url().optional() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { posts, pages };
