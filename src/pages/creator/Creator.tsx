import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import LogoLockup from '../../components/LogoLockup'
import { INITIAL_DATA, isStep1Complete, isStep2Complete, type CreatorData } from './types'
import type { Ingredient } from '../../utils/parsing'
import type { Metadata } from '../ReviewResult'
import Step1_ProductInfo from './Step1_ProductInfo'
import Step2_Ingredients from './Step2_Ingredients'
import Step3_Nutrition   from './Step3_Nutrition'
import Step4_Preview, { hasBlockingPreviewIssues } from './Step4_Preview'

// ─── 스텝 정의 ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: '제품 정보' },
  { id: 2, label: '원재료'   },
  { id: 3, label: '영양성분' },
  { id: 4, label: '미리보기' },
]

const STEP_META = [
  {
    label: '제품 정보',
    title: '제품 정보를 입력해 주세요',
    desc: '검토할 제품의 기본 정보와 식품 카테고리를 선택해 주세요. 카테고리는 복수 선택 가능합니다.',
    next: '다음 — 원재료 정보',
  },
  {
    label: '원재료 정보',
    title: '원재료를 입력해 주세요',
    desc: '라벨에 표시될 원재료명과 중량을 입력하면 알레르기와 복합원재료를 자동으로 감지합니다.',
    next: '다음 — 영양성분',
  },
  {
    label: '영양성분',
    title: '영양성분 정보를 입력해 주세요',
    desc: '소규모 제조업 면제 가능성을 확인하거나 분석 수치를 직접 입력하세요.',
    next: '다음 — 라벨 미리보기',
  },
  {
    label: '라벨 미리보기',
    title: '라벨을 미리 확인해 주세요',
    desc: '입력한 정보가 실제 라벨 구조에 어떻게 배치되는지 확인합니다.',
    next: '확인하고 검토 결과 보기',
  },
]

const CREATOR_DRAFT_KEY = 'krk_creator_draft_v1'

interface CreatorDraft {
  step: number
  data: CreatorData
}

function readCreatorDraft(): CreatorDraft | null {
  try {
    const raw = sessionStorage.getItem(CREATOR_DRAFT_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<CreatorDraft>
    const safeStep = typeof parsed.step === 'number'
      ? Math.min(Math.max(Math.round(parsed.step), 1), STEPS.length)
      : 1

    return {
      step: safeStep,
      data: {
        ...INITIAL_DATA,
        ...(parsed.data ?? {}),
      },
    }
  } catch {
    return null
  }
}

function convertToCheckerState(data: CreatorData): { ingredients: Ingredient[]; metadata: Metadata } {
  let expiryDays = ''
  if (data.expiryDate) {
    const diffMs = new Date(data.expiryDate).getTime() - Date.now()
    expiryDays = String(Math.max(1, Math.ceil(diffMs / 86_400_000)))
  }

  return {
    ingredients: data.ingredients.map(ing => ({
      id: ing.id,
      name: ing.name,
      rawName: ing.name,
      weight: parseFloat(ing.weight) || 0,
      origin: ing.origin ?? '',
      suggestedName: ing.name,
      isComposite: ing.isComposite,
      isAllergen: ing.isAllergen,
      matchConfidence: 1.0,
    })),
    metadata: {
      productName: data.productName,
      totalWeight: data.totalWeight,
      unit: data.unit,
      expiryDays,
      storage: data.storage,
      manufacturer: data.manufacturer,
      manufacturerAddress: data.manufacturerAddress || undefined,
      reportNumberStatus: data.reportNumberStatus || undefined,
      reportNumber: data.reportNumber || undefined,
      labelClaim: data.labelClaim || undefined,
      hasNutritionClaim: data.hasNutritionClaim || undefined,
      packagingMaterials: data.packagingMaterials,
      categories: data.categories,
      businessType: data.businessType || undefined,
      facilityType: data.facilityType || undefined,
    },
  }
}

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current} of ${STEPS.length}`}>
      {STEPS.map(stepItem => {
        const active = stepItem.id === current
        const done = stepItem.id < current
        return (
          <span
            key={stepItem.id}
            className={`h-[3px] transition-all duration-200 ${active ? 'w-7' : 'w-3.5'} ${
              active || done ? 'bg-heritage-500' : 'bg-[rgba(10,10,11,0.12)]'
            }`}
          />
        )
      })}
    </div>
  )
}

function StepCrumb({ current }: { current: number }) {
  const meta = STEP_META[current - 1]
  return (
    <div className="inline-flex items-center gap-2.5 font-en text-[10.5px] font-medium uppercase tracking-[0.16em] text-heritage-500">
      <span className="h-px w-[18px] bg-heritage-500" />
      <span className="font-kr font-semibold tracking-[0.04em] text-ink">{meta.label}</span>
    </div>
  )
}

function CreatorHeader({ current, onHome }: { current: number; onHome: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[rgba(10,10,11,0.08)] bg-white/75 px-5 py-[18px] backdrop-blur-[18px] md:px-14">
      <button onClick={onHome} className="hover:opacity-70 transition-opacity">
        <LogoLockup />
      </button>
      <StepProgress current={current} />
      <div className="hidden font-en text-[11px] uppercase tracking-[0.14em] text-[rgba(10,10,11,0.4)] md:block">
        krk.team/new — Step {current} / 4
      </div>
      <div className="md:hidden font-en text-[11px] uppercase tracking-[0.14em] text-[rgba(10,10,11,0.4)]">
        {current}/4
      </div>
    </header>
  )
}

function CreatorFooter({
  current,
  canGoNext,
  onPrev,
  onNext,
}: {
  current: number
  canGoNext: boolean
  onPrev: () => void
  onNext: () => void
}) {
  const nextLabel = !canGoNext
    ? current === 2
      ? '원재료 1개 이상 필요'
      : current === 4
      ? '필수 항목 수정 필요'
      : STEP_META[current - 1].next
    : STEP_META[current - 1].next
  return (
    <footer className="sticky bottom-0 z-30 border-t border-[rgba(10,10,11,0.08)] bg-white px-5 py-4 md:px-14">
      <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
        <button
          onClick={onPrev}
          className="inline-flex h-11 items-center justify-center gap-2 border border-[rgba(10,10,11,0.15)] px-5 font-kr text-[13px] font-medium text-ink transition-colors hover:bg-ink hover:text-white md:w-auto"
        >
          <ChevronLeft size={14} />
          {current === 1 ? '홈으로' : '이전 단계'}
        </button>
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="inline-flex h-12 items-center justify-center gap-2 bg-breath-500 px-6 font-kr text-[13px] font-semibold text-white transition-colors hover:bg-breath-600 disabled:cursor-not-allowed disabled:bg-[rgba(10,10,11,0.18)] md:w-auto"
        >
          {nextLabel}
          <ChevronRight size={14} />
        </button>
      </div>
    </footer>
  )
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function Creator() {
  const navigate = useNavigate()
  const location = useLocation()

  // Checker → Creator 연결 시 사전 입력 데이터 적용
  const prefill = (location.state as { prefill?: Partial<CreatorData> } | null)?.prefill
  const draft = prefill ? null : readCreatorDraft()

  const [step, setStep] = useState(1)
  const [data, setData] = useState<CreatorData>(() => ({
    ...INITIAL_DATA,
    ...(prefill ?? {}),
  }))
  const [showDraftPrompt, setShowDraftPrompt] = useState(Boolean(draft))

  const update = (partial: Partial<CreatorData>) =>
    setData(prev => ({ ...prev, ...partial }))

  const restoreDraft = () => {
    if (!draft) return
    setStep(draft.step)
    setData(draft.data)
    setShowDraftPrompt(false)
  }

  const discardDraft = () => {
    sessionStorage.removeItem(CREATOR_DRAFT_KEY)
    setStep(1)
    setData(INITIAL_DATA)
    setShowDraftPrompt(false)
  }

  const goNext = () => {
    if (step === STEPS.length) {
      navigate('/review', { state: { ...convertToCheckerState(data), creatorData: data } })
      return
    }
    setStep(s => Math.min(s + 1, STEPS.length))
  }
  const goPrev = () => {
    if (step === 1) {
      sessionStorage.removeItem(CREATOR_DRAFT_KEY)
      navigate('/dashboard')
    } else setStep(s => s - 1)
  }
  useEffect(() => {
    if (showDraftPrompt) return
    try {
      sessionStorage.setItem(CREATOR_DRAFT_KEY, JSON.stringify({ step, data }))
    } catch {
      // 저장 실패는 입력 플로우를 막지 않습니다.
    }
  }, [step, data, showDraftPrompt])

  // Step별 validation
  const canGoNext = (() => {
    if (step === 1) return isStep1Complete(data)
    if (step === 2) return isStep2Complete(data)
    if (step === 3) {
      // 면제 적용 시 통과
      if (data.nutritionExempted) return true
      // 의무 9개 항목 모두 입력 필요 (식품등의 표시기준 2024년 개정)
      const nutrKeys = ['calories','totalCarbs','sugar','protein','totalFat','saturatedFat','transFat','cholesterol','sodium'] as const
      return nutrKeys.every(k => data[k].trim() !== '')
    }
    if (step === 4) return !hasBlockingPreviewIssues(data)
    return true
  })()

  return (
    <div className="min-h-screen bg-[#F4F4F5] font-kr text-ink">
      <CreatorHeader current={step} onHome={() => navigate('/dashboard')} />
      {showDraftPrompt && draft && (
        <div className="fixed left-1/2 top-[82px] z-50 w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 border border-heritage-500 bg-white p-4 shadow-[0_18px_60px_rgba(10,10,11,0.16)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-kr text-[13px] font-semibold text-ink">이전 작업을 이어서 하시겠습니까?</p>
              <p className="mt-0.5 font-kr text-[12px] text-[rgba(10,10,11,0.52)]">
                {draft.data.productName || '이름 없는 제품'} · Step {draft.step}/4
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={discardDraft} className="h-9 border border-[rgba(10,10,11,0.15)] px-3 font-kr text-[12px] text-ink">
                새로 시작
              </button>
              <button onClick={restoreDraft} className="h-9 bg-heritage-500 px-3 font-kr text-[12px] font-semibold text-white">
                이어서 하기
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="min-h-[calc(100vh-145px)]">
        <div className="mx-auto w-full max-w-[920px] px-5 py-8 md:px-0 md:py-10">
          <div className="mb-8">
            <StepCrumb current={step} />
            <h1 className="mt-4 font-kr text-[24px] font-semibold leading-[1.22] tracking-normal text-ink md:text-[28px]">
              {STEP_META[step - 1].title}
            </h1>
            <p className="mt-2 font-kr text-[13px] leading-[1.65] text-[rgba(10,10,11,0.52)]">
              {STEP_META[step - 1].desc}
            </p>
          </div>

          <div>
            {step === 1 && <Step1_ProductInfo data={data} onChange={update} />}
            {step === 2 && <Step2_Ingredients data={data} onChange={update} />}
            {step === 3 && <Step3_Nutrition   data={data} onChange={update} />}
            {step === 4 && <Step4_Preview     data={data} onGoToStep={setStep} />}
          </div>
        </div>
      </main>

      <CreatorFooter current={step} canGoNext={canGoNext} onPrev={goPrev} onNext={goNext} />
    </div>
  )
}
