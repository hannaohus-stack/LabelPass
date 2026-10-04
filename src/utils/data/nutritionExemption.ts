export const NUTRITION_EXEMPTION_CRITERIA = [
  {
    id: "E01",
    question: "연 매출이 1억원 미만인 사업자인가요?",
    regulation: "식품등의 표시기준 제5조 제1항"
  },
  {
    id: "E02",
    question: "종업원 수가 50인 미만인 사업장인가요?",
    regulation: "식품등의 표시기준 제5조 제1항"
  },
  {
    id: "E03",
    question: "영양성분 표시 의무 대상 식품(과자류, 빵류 등)에 해당하지 않나요?",
    regulation: "식품등의 표시기준 제5조 제2항 별표"
  }
];

export const NUTRITION_REQUIRED_ITEMS = [
  { id: "열량",    unit: "kcal" },
  { id: "탄수화물", unit: "g"    },
  { id: "당류",    unit: "g"    },
  { id: "단백질",  unit: "g"    },
  { id: "지방",    unit: "g"    },
  { id: "나트륨",  unit: "mg"   }
];
