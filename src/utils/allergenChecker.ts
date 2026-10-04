import { ALLERGEN_LIST } from './data/allergens';

/**
 * 원재료 문자열에서 알레르기 유발 물질 감지
 * @param ingredientName - 원재료명 (단일 문자열)
 * @returns 감지된 알레르겐 배열
 */
export function detectAllergens(ingredientName: string) {
  const lower = ingredientName.toLowerCase().trim();
  const detected: typeof ALLERGEN_LIST = [];

  for (const allergen of ALLERGEN_LIST) {
    const allTerms = [allergen.name, ...allergen.aliases].map(t => t.toLowerCase());
    const isMatch = allTerms.some(term => lower.includes(term));
    if (isMatch) detected.push(allergen);
  }

  return detected;
}

/**
 * 원재료 목록 전체에서 알레르겐 감지 (중복 제거)
 * @param ingredients - 원재료명 배열
 * @returns 감지된 고유 알레르겐 배열
 */
export function detectAllergensFromList(ingredients: string[]) {
  const detectedMap = new Map<string, typeof ALLERGEN_LIST[number]>();

  for (const ing of ingredients) {
    const results = detectAllergens(ing);
    for (const allergen of results) {
      detectedMap.set(allergen.id, allergen);
    }
  }

  return Array.from(detectedMap.values());
}
