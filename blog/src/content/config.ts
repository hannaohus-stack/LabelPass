import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    num: z.string(),
    title: z.string(),
    summary: z.string(),
    // 표시 가이드 · 라벨 질문 · 라벨 체크 · 법규 소식
    cat: z.enum(['guide', 'question', 'check', 'law']),
    time: z.number(),
    src: z.array(z.string()),
    date: z.string(),
    featured: z.boolean().optional(),
    // 피드형 썸네일: 2줄 제목(\n 줄바꿈) + 원형 사진(1~5 = /site/svc_catN.jpg, 없으면 화살표)
    thumbTitle: z.string(),
    thumbImg: z.number().int().min(1).max(5).optional(),
    thumb: z.string().optional(), // 구 블로그 필드 (미사용)
    image: z.string().optional(), // 구 블로그 썸네일 (og 이미지로 사용)
    keywords: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
