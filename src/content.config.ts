import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { regions } from './data/regions';

const image = z.object({
  src: z.string(),
  alt: z.string().default(''),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
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
