import { COMPOSITE_INGREDIENTS } from './data/compositeIngredients';

export interface CompositeDetectionResult {
  ingredientName: string;
  matchedKeyword: string;
  hint: string;
}

/**
 * 단일 원재료명에서 복합원재료 키워드 감지
 */
export function detectComposite(ingredientName: string): CompositeDetectionResult | null {
  const lower = ingredientName.toLowerCase().trim();

  for (const item of COMPOSITE_INGREDIENTS) {
    if (lower.includes(item.keyword.toLowerCase())) {
      return {
        ingredientName,
        matchedKeyword: item.keyword,
        hint: item.hint
      };
    }
  }
  return null;
}

/**
 * 원재료 목록 전체에서 복합원재료 감지
 */
export function detectCompositesFromList(ingredients: string[]): CompositeDetectionResult[] {
  const results: CompositeDetectionResult[] = [];

  for (const ing of ingredients) {
    const result = detectComposite(ing);
    if (result) results.push(result);
  }

  return results;
}
