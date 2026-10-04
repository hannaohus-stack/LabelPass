import { useState } from 'react'
import type React from 'react'
import type { StepProps } from './types'
import { ALL_CATEGORIES } from '../../utils/tierUtils'

const BUSINESS_TYPES = ['식품제조가공업', '즉판가공업'] as const
const FACILITY_TYPES = ['단독', '공유'] as const
const REPORT_NUMBER_STATUSES = [
  { value: 'none_or_needed', label: '없음 · 신청 필요' },
  { value: 'exists', label: '있음' },
] as const
const STORAGE_OPTIONS = [
  '실온 보관 (1~35℃)',
  '냉장 보관 (0~10℃)',
  '냉동 보관 (-18℃ 이하)',
  '서늘하고 건조한 곳 보관',
  '직사광선을 피하여 보관',
]
const TODAY = new Date().toISOString().slice(0, 10)

function Lb({ children, required, error, htmlFor, extra }: {
  children: React.ReactNode; required?: boolean; error?: boolean; htmlFor?: string; extra?: React.ReactNode
}) {
  const Tag = htmlFor ? 'label' : 'div'
  return (
    <Tag className={`lp-lb${error ? ' bad' : ''}`} {...(htmlFor ? { htmlFor } : {})}>
      {children}{required && <span className="lp-req">*</span>}{extra}
    </Tag>
  )
}

function Seg<T extends string>({ options, value, onChange, error, small, labels }: {
  options: readonly T[]; value: string; onChange: (v: T) => void; error?: boolean; small?: boolean; labels?: Partial<Record<T, string>>
}) {
  return (
    <div className={`lp-seg${small ? ' sm' : ''}${error ? ' bad' : ''}`} role="radiogroup">
      {options.map(o => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? 'on' : ''} onClick={() => onChange(o)}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  )
}

const BIZ_LABEL = { '식품제조가공업': '식품제조 · 가공업', '즉판가공업': '즉석판매제조 · 가공업' } as const
const FAC_LABEL = { '단독': '단독 주방', '공유': '공유 주방' } as const
const catLabel = (c: string) => c.replace('/', ' · ')

export default function Step1_ProductInfo({ data, onChange }: StepProps) {
  type TouchedField =
    | 'productName'
    | 'categories'
    | 'businessType'
    | 'facilityType'
    | 'totalWeight'
    | 'manufacturer'
    | 'storage'
    | 'expiryDate'

  const [touched, setTouched] = useState<Record<TouchedField, boolean>>({
    productName: false,
    categories: false,
    businessType: false,
    facilityType: false,
    totalWeight: false,
    manufacturer: false,
    storage: false,
    expiryDate: false,
  })

  const markTouched = (field: TouchedField) => {
    setTouched(prev => prev[field] ? prev : { ...prev, [field]: true })
  }

  const errors = {
    productName: touched.productName && !data.productName.trim(),
    categories: touched.categories && data.categories.length === 0,
    businessType: touched.businessType && data.businessType === '',
    facilityType: touched.facilityType && data.facilityType === '',
    totalWeight: touched.totalWeight && (!data.totalWeight.trim() || parseFloat(data.totalWeight) <= 0),
    manufacturer: touched.manufacturer && !data.manufacturer.trim(),
    storage: touched.storage && !data.storage,
    expiryDate: touched.expiryDate && !data.expiryDate,
  }

  const toggleCategory = (name: string) => {
    markTouched('categories')
    const next = data.categories.includes(name)
      ? data.categories.filter(category => category !== name)
      : [...data.categories, name]
    onChange({ categories: next })
  }

  const setProductName = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ productName: event.target.value })
  }

  const set = (key: keyof typeof data) =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ [key]: event.target.value })

  return (
    <div>
      <div className="lp-card">
        <h2>기본 정보</h2>
        <p className="lp-desc">제품명과 카테고리로 검토 기준이 정해져요.</p>
        <div className="lp-fl">
          <Lb required error={errors.productName} htmlFor="c-pn">제품명</Lb>
          <input id="c-pn" className={`lp-in${errors.productName ? ' bad' : ''}`} placeholder="예: 수제 딸기잼"
            value={data.productName} onChange={setProductName} onBlur={() => markTouched('productName')} />
          {errors.productName && <p className="lp-err">제품명을 입력해 주세요.</p>}
        </div>
        <div className="lp-fl">
          <Lb required error={errors.categories} extra={<span className="lp-tip">{data.categories.length > 0 ? `${data.categories.length}개 선택됨` : '여러 개 선택 가능'}</span>}>식품 카테고리</Lb>
          <div className={`lp-chips${errors.categories ? ' bad' : ''}`}
            onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) markTouched('categories') }}>
            {ALL_CATEGORIES.map(category => {
              const on = data.categories.includes(category)
              return (
                <button key={category} type="button" aria-pressed={on} className={`lp-chip${on ? ' on' : ''}`} onClick={() => toggleCategory(category)}>
                  {catLabel(category)}
                </button>
              )
            })}
          </div>
          {errors.categories && <p className="lp-err">카테고리를 하나 이상 골라 주세요.</p>}
        </div>
        <div className="lp-fl">
          <Lb required error={errors.totalWeight} htmlFor="c-tw">내용량</Lb>
          <div className="lp-unit">
            <input id="c-tw" className={`lp-in${errors.totalWeight ? ' bad' : ''}`} type="number" min="0" step="any" inputMode="decimal" placeholder="예: 240"
              value={data.totalWeight} onChange={set('totalWeight')} onBlur={() => markTouched('totalWeight')} />
            <Seg small options={['g', 'mL'] as const} value={data.unit} onChange={unit => onChange({ unit })} />
          </div>
          {errors.totalWeight && <p className="lp-err">내용량을 0보다 크게 입력해 주세요.</p>}
        </div>
      </div>

      <div className="lp-card">
        <h2>영업 정보</h2>
        <p className="lp-desc">영업 종류에 따라 표시해야 할 항목이 달라져요.</p>
        <div className="lp-fl">
          <Lb required error={errors.businessType}>영업 종류</Lb>
          <Seg options={BUSINESS_TYPES} labels={BIZ_LABEL} value={data.businessType} error={errors.businessType}
            onChange={value => {
              markTouched('businessType')
              onChange({ businessType: value, ...(!data.facilityType ? { facilityType: '단독' as const } : {}) })
            }} />
        </div>
        <div className="lp-fl">
          <Lb required error={errors.facilityType}>영업 시설</Lb>
          <Seg options={FACILITY_TYPES} labels={FAC_LABEL} value={data.facilityType} error={errors.facilityType}
            onChange={facilityType => { markTouched('facilityType'); onChange({ facilityType }) }} />
          {data.facilityType === '공유' && (
            <div className="lp-callout"><span>💡</span><span><b>공유 주방</b>이면 다른 제품의 알레르기 원료 혼입 가능성 표시까지 함께 확인해요.</span></div>
          )}
        </div>
        <div className="lp-two">
          <div className="lp-fl">
            <Lb required error={errors.manufacturer} htmlFor="c-mf">제조원</Lb>
            <input id="c-mf" className={`lp-in${errors.manufacturer ? ' bad' : ''}`} placeholder="예: 주식회사 ○○식품"
              value={data.manufacturer} onChange={set('manufacturer')} onBlur={() => markTouched('manufacturer')} />
            {errors.manufacturer && <p className="lp-err">제조원을 입력해 주세요.</p>}
          </div>
          <div className="lp-fl">
            <Lb htmlFor="c-ma">제조원 소재지</Lb>
            <input id="c-ma" className="lp-in" placeholder="도로명 주소" value={data.manufacturerAddress} onChange={set('manufacturerAddress')} />
          </div>
        </div>
        <div className="lp-fl">
          <Lb>품목제조보고번호</Lb>
          <div className="lp-unit">
            <Seg small options={REPORT_NUMBER_STATUSES.map(r => r.value)} labels={{ none_or_needed: '없음 · 신청 필요', exists: '있음' }}
              value={data.reportNumberStatus}
              onChange={reportNumberStatus => onChange({ reportNumberStatus, ...(reportNumberStatus === 'none_or_needed' ? { reportNumber: '' } : {}) })} />
            {data.reportNumberStatus === 'exists' && (
              <input className="lp-in" aria-label="품목제조보고번호" placeholder="예: 20260123456-001" value={data.reportNumber} onChange={set('reportNumber')} />
            )}
          </div>
          {data.reportNumberStatus !== 'exists' && (
            <p className="lp-help">{data.reportNumberStatus === 'none_or_needed'
              ? '출시 전이라면 품목제조보고 후 받은 번호를 최종 라벨에 넣어 주세요.'
              : '번호가 있는지 골라 주세요.'}</p>
          )}
        </div>
      </div>

      <div className="lp-card">
        <h2>표시 정보</h2>
        <p className="lp-desc">보관방법과 소비기한은 라벨 필수 항목이에요.</p>
        <div className="lp-two">
          <div className="lp-fl">
            <Lb required error={errors.storage} htmlFor="c-st">보관방법</Lb>
            <select id="c-st" className={`lp-in${errors.storage ? ' bad' : ''}`} value={data.storage}
              onChange={e => { markTouched('storage'); onChange({ storage: e.target.value }) }}>
              <option value="" disabled>보관방법을 골라 주세요</option>
              {STORAGE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="lp-fl">
            <Lb required error={errors.expiryDate} htmlFor="c-ex">소비기한</Lb>
            <input id="c-ex" className={`lp-in${errors.expiryDate ? ' bad' : ''}`} type="date" min={TODAY}
              value={data.expiryDate} onChange={set('expiryDate')} onBlur={() => markTouched('expiryDate')} />
          </div>
        </div>
        <div className="lp-fl">
          <Lb htmlFor="c-cl" extra={<span className="lp-opt">선택</span>}>라벨 · 상세페이지 강조 문구</Lb>
          <textarea id="c-cl" className="lp-in" rows={3} placeholder="예: 무가당, 국내산 딸기 100%, 수제"
            value={data.labelClaim} onChange={e => onChange({ labelClaim: e.target.value })} />
          <p className="lp-help">'무가당' · '100%' 같은 표현은 추가로 지켜야 할 기준이 있어 함께 검토해요.</p>
        </div>
      </div>
    </div>
  )
}
