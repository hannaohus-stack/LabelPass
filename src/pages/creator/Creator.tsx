import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppHeader from '../../components/lp/AppHeader'
import LabelPreview from './LabelPreview'
import { useAuth } from '../../lib/useAuth'
import { PENDING_REVIEW_KEY } from '../../lib/next'
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
  { id: 2, label: '원재료 · 포장재' },
  { id: 3, label: '영양성분' },
  { id: 4, label: '확인' },
]

const STEP_META = [
  { title: '제품 정보를 입력해 주세요', desc: '라벨에 들어갈 기본 정보예요. * 표시는 꼭 채워야 다음으로 넘어갈 수 있어요.', next: '원재료 · 포장재' },
  { title: '원재료와 포장재를 알려 주세요', desc: '원재료 순서 · 알레르기 · 분리배출 마크를 여기서 정해요.', next: '영양성분' },
  { title: '영양성분을 확인해요', desc: '면제 대상인지 먼저 확인하고, 필요하면 값을 입력해요.', next: '확인' },
  { title: '입력한 내용을 확인해 주세요', desc: '확인 후 17개 항목 무료 검토를 시작해요.', next: '' },
]

const CREATOR_DRAFT_KEY = 'lp_creator_draft'

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

const NUTR_KEYS = ['calories', 'totalCarbs', 'sugar', 'protein', 'totalFat', 'saturatedFat', 'transFat', 'cholesterol', 'sodium'] as const

function stepComplete(step: number, data: CreatorData): boolean {
  if (step === 1) return isStep1Complete(data)
  if (step === 2) return isStep2Complete(data)
  if (step === 3) return data.nutritionExempted || NUTR_KEYS.every(k => data[k].trim() !== '')
  if (step === 4) return !hasBlockingPreviewIssues(data)
  return true
}

function barText(step: number, data: CreatorData) {
  if (step === 1) {
    const req = [data.productName.trim(), data.categories.length, data.businessType, data.facilityType,
      data.totalWeight.trim() && parseFloat(data.totalWeight) > 0, data.manufacturer.trim(), data.storage, data.expiryDate]
    return <>필수 항목 <b>{req.filter(Boolean).length} / {req.length}</b> 입력됨</>
  }
  if (step === 2) return <>원재료 <b>{data.ingredients.filter(i => i.name.trim()).length}개</b> · 포장재 <b>{(data.packagingMaterials ?? []).length}개</b></>
  if (step === 3) return data.nutritionExempted
    ? <><b>영양성분 표시 면제</b> 적용</>
    : <>영양성분 <b>{NUTR_KEYS.filter(k => data[k].trim() !== '').length} / 9</b> 입력됨</>
  return hasBlockingPreviewIssues(data)
    ? <>꼭 채워야 할 항목이 남아 있어요 · <b>수정</b>을 눌러 채워 주세요</>
    : <><b>입력 완료</b> · 17개 항목 무료 검토를 시작할 수 있어요</>
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function Creator() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const [showSheet, setShowSheet] = useState(false)

  // Checker → Creator 연결 시 사전 입력 데이터 적용
  const routeState = location.state as { prefill?: Partial<CreatorData>; startStep?: number } | null
  const prefill = routeState?.prefill
  const draft = prefill ? null : readCreatorDraft()

  // 검토 결과의 '입력 수정하기' → 입력 내용 확인(4단계)에서 바로 시작
  const [step, setStep] = useState(() => Math.min(Math.max(routeState?.startStep ?? 1, 1), STEPS.length))
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

  const goTo = (n: number) => { setStep(n); window.scrollTo(0, 0) }
  const goNext = () => {
    if (step === STEPS.length) {
      const reviewState = { ...convertToCheckerState(data), creatorData: data }
      // 로그인 후 결과 화면에서 다시 쓸 수 있게 보관 (결과 전 로그인)
      try { sessionStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(reviewState)) } catch { /* 무시 */ }
      if (session) navigate('/review', { state: reviewState })
      else navigate('/login?next=%2Freview&gate=1')
      return
    }
    goTo(Math.min(step + 1, STEPS.length))
  }
  const goPrev = () => { if (step > 1) goTo(step - 1) }
  /** 하단 단계 바: 앞 단계가 모두 채워진 단계까지만 이동 가능 */
  const canReach = (n: number) => Array.from({ length: n - 1 }, (_, i) => i + 1).every(k => stepComplete(k, data))
  useEffect(() => {
    if (showDraftPrompt) return
    try {
      sessionStorage.setItem(CREATOR_DRAFT_KEY, JSON.stringify({ step, data }))
    } catch {
      // 저장 실패는 입력 플로우를 막지 않습니다.
    }
  }, [step, data, showDraftPrompt])

  const canGoNext = stepComplete(step, data)

  const meta = STEP_META[step - 1]
  const nextLabel = step === STEPS.length
    ? (canGoNext ? '무료 검토 결과 보기 →' : '필수 항목을 채워 주세요')
    : canGoNext ? <>다음<span className="lp-nx-t"> : {meta.next}</span> →</> : step === 2 ? '원재료를 1개 이상 입력해 주세요' : '필수 항목을 채워 주세요'

  return (
    <div className="lp">
      <AppHeader mode="flow" current={1} />

      {showDraftPrompt && draft && (
        <div className="lp-draft" role="dialog" aria-label="이전 작업 이어서 하기">
          <div><b>이전에 입력하던 내용이 있어요</b><span>{draft.data.productName || '이름 없는 제품'} · STEP {draft.step}</span></div>
          <div className="acts">
            <button type="button" className="lp-btn lp-btn-line lp-btn-sm" onClick={discardDraft}>새로 시작</button>
            <button type="button" className="lp-btn lp-btn-blue lp-btn-sm" onClick={restoreDraft}>이어서 하기</button>
          </div>
        </div>
      )}

      <main className="lp-page" style={{ paddingBottom: 180 }}>
        <div className="lp-ph">
          <div>
            <div className="lp-kicker">무료 검사</div>
            <h1 className="lp-h1">{meta.title}</h1>
            <p className="lp-sub">{meta.desc}</p>
          </div>
          <div className="lp-saved"><i />이 기기에 자동 저장돼요</div>
        </div>

        <div className="lp-grid">
          <div>
            {step === 1 && <Step1_ProductInfo data={data} onChange={update} />}
            {step === 2 && <Step2_Ingredients data={data} onChange={update} />}
            {step === 3 && <Step3_Nutrition   data={data} onChange={update} />}
            {step === 4 && <Step4_Preview     data={data} onGoToStep={goTo} />}
          </div>
          <aside className="lp-pv lp-pv-col" aria-label="라벨 미리보기"><LabelPreview data={data} /></aside>
        </div>
      </main>

      <nav className="lp-stepbar" aria-label="입력 단계">
        {STEPS.map(st => (
          <button key={st.id} type="button" className={st.id === step ? 'on' : ''} aria-current={st.id === step ? 'step' : undefined}
            disabled={st.id !== step && !canReach(st.id)} onClick={() => goTo(st.id)}>
            STEP {st.id}<small>{st.label}</small>
          </button>
        ))}
      </nav>

      <div className="lp-bar">
        <div className="lp-bar-in">
          <span className="left">{barText(step, data)}</span>
          <button type="button" className="lp-btn lp-btn-line lp-m-only" onClick={() => setShowSheet(true)}>미리보기</button>
          {step > 1 && <button type="button" className="lp-btn lp-btn-line" onClick={goPrev}>이전</button>}
          <button type="button" className="lp-btn lp-btn-blue" onClick={goNext} disabled={!canGoNext}>{nextLabel}</button>
        </div>
      </div>

      {showSheet && (
        <div className="lp-sheet" role="dialog" aria-label="라벨 미리보기" onClick={e => { if (e.target === e.currentTarget) setShowSheet(false) }}>
          <div>
            <button type="button" className="close" onClick={() => setShowSheet(false)}>닫기 ✕</button>
            <LabelPreview data={data} />
          </div>
        </div>
      )}
    </div>
  )
}
