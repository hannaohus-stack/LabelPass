// data.ts — KRK Checker Blog Content Data
import type { Article, Category } from './types';

export const CATEGORIES: Category[] = [
  { id: 'all',        ko: '전체',           en: 'All' },
  { id: 'label',      ko: '라벨 기준',       en: 'Labeling' },
  { id: 'ingredient', ko: '원재료·알레르기',  en: 'Ingredients' },
  { id: 'packaging',  ko: '분리배출·포장',    en: 'Packaging' },
  { id: 'filing',     ko: '품목제조보고',     en: 'Filing' },
  { id: 'cases',      ko: '브랜드 사례',      en: 'Cases' },
  { id: 'updates',    ko: 'KRK 업데이트',     en: 'Updates' },
];

export const ARTICLES: Article[] = [
  {
    id: 'a01', num: '01', cat: 'label',
    title: '2026년 식품 라벨 의무 표시사항 9가지 완전 정리',
    summary: '식품을 판매하려면 라벨에 반드시 표기해야 하는 항목이 있습니다. 빠뜨리면 출시 후 회수·폐기까지 이어질 수 있으며, 작은 브랜드일수록 사전에 확인하기 어렵습니다.',
    time: 5, src: ['식품표시광고법', '식약처 고시'],
    date: '2026.05.24', featured: true, thumb: 'grid',
  },
  {
    id: 'a02', num: '02', cat: 'ingredient',
    title: '원재료명은 왜 함량순으로 써야 할까?',
    summary: '함량 표시 순서를 잘못 적으면 의외로 흔하게 시정 명령 대상이 됩니다.',
    time: 4, src: ['식품표시광고법 시행규칙'],
    date: '2026.05.22', thumb: 'orbit',
  },
  {
    id: 'a03', num: '03', cat: 'ingredient',
    title: '알레르기 유발물질 22품목, 라벨에서 놓치기 쉬운 부분',
    summary: '유사 원재료, 가공보조제, 미량 사용된 경우. 22품목을 자율 점검하는 체크리스트.',
    time: 6, src: ['식약처 고시 2024-66호'],
    date: '2026.05.20', thumb: 'arc',
  },
  {
    id: 'a04', num: '04', cat: 'ingredient',
    title: '무가당이라고 쓰면 영양성분표가 필요할 수 있어요',
    summary: '강조 표시 하나로 영양표시 의무 대상이 됩니다. 작은 브랜드일수록 놓치기 쉬운 부분.',
    time: 3, src: ['식품표시광고법 시행규칙 별표4'],
    date: '2026.05.18', thumb: 'bars',
  },
  {
    id: 'a05', num: '05', cat: 'packaging',
    title: '분리배출 마크, 작은 브랜드도 표시해야 할까?',
    summary: '제조·수입 규모에 따른 표시 의무. 면제 기준과 자율 표시의 차이를 정리합니다.',
    time: 4, src: ['자원재활용법'],
    date: '2026.05.15', thumb: 'tri',
  },
  {
    id: 'a06', num: '06', cat: 'packaging',
    title: '복합 포장재 분리배출 표시, 어떻게 해야 할까?',
    summary: '재질이 다른 포장재가 결합된 경우. 통합 표시와 각각 표시 중 어느 쪽이 맞을까.',
    time: 5, src: ['환경부 고시'],
    date: '2026.05.12', thumb: 'split',
  },
  {
    id: 'a07', num: '07', cat: 'label',
    title: '주표시면과 일괄표시면 — 라벨 면적 기준 완전 정리',
    summary: '주표시면, 일괄표시면, 글자 크기와 굵기 기준을 한 페이지로 정리합니다.',
    time: 4, src: ['농수산물의 원산지 표시법'],
    date: '2026.05.08', thumb: 'frame',
  },
  {
    id: 'a08', num: '08', cat: 'filing',
    title: '품목제조보고 vs 식품위생법 신고 — 무엇이 다를까?',
    summary: '영업 종류에 따라 보고 양식과 검사 항목이 달라집니다. 작은 브랜드의 흔한 혼동.',
    time: 7, src: ['식품위생법'],
    date: '2026.05.04', thumb: 'dual',
  },
  {
    id: 'a09', num: '09', cat: 'cases',
    title: '입고 전 자율 점검 체크리스트 — 인쇄 전 최종 확인',
    summary: '입고 직전 자율 점검을 도와주는 짧은 체크리스트. 디자이너 협업 관점에서 정리.',
    time: 3, src: ['자율 점검'],
    date: '2026.05.01', thumb: 'doc',
  },
  {
    id: 'a10', num: '10', cat: 'updates',
    title: 'KRK Checker 검토 결과 페이지 구조 안내',
    summary: '검토 결과 페이지의 구조와 신뢰도 표기 방식. 결과는 자율 점검 참고용입니다.',
    time: 4, src: ['KRK Checker'],
    date: '2026.04.28', thumb: 'screen',
  },
  {
    id: 'zero-sugar-sweetener-label-2026', num: '11', cat: 'label',
    title: '2026 제로슈거·무가당 표시 기준 — 감미료 함유·열량까지 써야 합니다',
    summary: "'제로슈거', '무당', '무가당' 강조표시를 쓰는 식품은 2026년부터 감미료 함유와 열량 정보를 함께 라벨에 써야 합니다.",
    time: 5, src: ['식품등의 표시기준', '식약처 고시 2024.7.24 개정'],
    date: '2026.06.01', thumb: 'bars',
  },
];

export function catLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.ko ?? id;
}
