/**
 * LabelPreview — 입력하는 대로 바뀌는 라벨 미리보기 (시안 app_creator_v1.0 오른쪽 패널)
 * 상태 개수는 '입력 확인' 기준이며, 17개 항목 검토는 다음 단계(검토 결과)에서 진행된다.
 */
import type { CreatorData } from './types'
import { buildIssues } from './Step4_Preview'

const NUTR_KEYS = ['calories', 'totalCarbs', 'sugar', 'protein', 'totalFat', 'saturatedFat', 'transFat', 'cholesterol', 'sodium'] as const

export default function LabelPreview({ data }: { data: CreatorData }) {
  const sorted = [...data.ingredients]
    .filter(i => i.name.trim())
    .sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const total = sorted.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0)
  const allergens = data.detectedAllergens?.length ? data.detectedAllergens.map(a => a.name) : sorted.filter(i => i.isAllergen).map(i => i.name)
  const issues = buildIssues(data)
  const err = issues.filter(i => i.kind === 'error').length
  const warn = issues.filter(i => i.kind !== 'error').length
  const nutrFilled = NUTR_KEYS.filter(k => data[k] && data[k].trim() !== '').length
  const empty = (t: string) => <span className="empty">{t}</span>

  const ingText = sorted.length
    ? sorted.map((i, idx) => {
        const inName = data.productName && data.productName.includes(i.name)
        const pct = inName && total > 0 ? ` ${(((parseFloat(i.weight) || 0) / total) * 100).toFixed(1)}%` : ''
        return <span key={i.id}>{idx > 0 && ', '}{i.name}{i.origin ? `(${i.origin})` : ''}{pct}</span>
      })
    : empty('원재료 입력 필요')

  return (
    <>
      <div className="lp-pv-card">
        <div className="lp-pv-h">라벨 미리보기<span>입력하는 대로 바뀌어요</span></div>
        <div className="lp-lab" aria-label="라벨 미리보기">
          <div className="t">{data.productName || '제품명'}</div>
          <div className="r"><span>식품유형</span><span>{data.categories.length ? data.categories.join(', ') : empty('카테고리 선택 필요')}</span></div>
          <div className="r"><span>내용량</span><span>{data.totalWeight ? `${data.totalWeight}${data.unit}` : empty('입력 필요')}</span></div>
          <div className="r"><span>원재료명</span><span>{ingText}</span></div>
          <div className="r"><span>알레르기</span><span>{allergens.length ? <b className="al">{allergens.join(', ')} 함유</b> : sorted.length ? '해당 없음' : empty('원재료 입력 후 확인')}</span></div>
          <div className="r"><span>소비기한</span><span>{data.expiryDate ? `${data.expiryDate.replace(/-/g, '.')}까지` : empty('입력 필요')}</span></div>
          <div className="r"><span>보관방법</span><span>{data.storage || empty('선택 필요')}</span></div>
          <div className="r"><span>제조원</span><span>{data.manufacturer || empty('입력 필요')}{data.manufacturer && (data.manufacturerAddress ? ` · ${data.manufacturerAddress}` : <> · {empty('소재지 입력 필요')}</>)}</span></div>
          <div className="r"><span>영양성분</span><span>{data.nutritionExempted ? '표시 면제 적용' : nutrFilled ? `${nutrFilled} / 9 항목 입력` : empty('3단계에서 확인')}</span></div>
          <div className="r"><span>분리배출</span><span>{(data.packagingMaterials ?? []).length ? data.packagingMaterials.join(' · ') : empty('포장재 선택 필요')}</span></div>
        </div>
        <div className="lp-pv-st">
          <div className="lp-s-r"><b>{err}</b>입력 필요</div>
          <div className="lp-s-a"><b>{warn}</b>확인 권장</div>
          <div className="lp-s-g"><b>{err === 0 ? '✓' : '–'}</b>{err === 0 ? '검토 가능' : '검토 전'}</div>
        </div>
      </div>
      <p className="lp-pv-note">입력 상태만 미리 본 거예요. 17개 항목 검토는 다음 단계에서 진행돼요.</p>
    </>
  )
}
