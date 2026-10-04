import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    num: z.string(),
    title: z.string(),
    summary: z.string(),
    cat: z.enum(['label', 'ingredient', 'packaging', 'filing', 'cases', 'updates']),
    time: z.number(),
    src: z.array(z.string()),
    date: z.string(),
    featured: z.boolean().optional(),
    thumb: z.string(),
    image: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
