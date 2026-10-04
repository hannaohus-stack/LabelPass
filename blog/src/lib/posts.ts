import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;
export const CATS = [
  { k: 'guide', name: '표시 가이드' },
  { k: 'question', name: '라벨 질문' },
  { k: 'check', name: '라벨 체크' },
  { k: 'law', name: '법규 소식' },
] as const;
export type CatKey = (typeof CATS)[number]['k'];
export const catName = (k: string) => CATS.find((c) => c.k === k)?.name ?? '';

const key = (p: Post) => p.data.date.replace(/\./g, '') + p.data.num.padStart(3, '0');

/** 최신순 정렬된 전체 글 */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('blog');
  return posts.sort((a, b) => key(b).localeCompare(key(a)));
}

/** 카테고리 안에서 오래된 순으로 매긴 번호 (#01, #02 …) */
export function catNumbers(posts: Post[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of CATS) {
    posts
      .filter((p) => p.data.cat === c.k)
      .sort((a, b) => key(a).localeCompare(key(b)))
      .forEach((p, i) => m.set(p.slug, String(i + 1).padStart(2, '0')));
  }
  return m;
}
