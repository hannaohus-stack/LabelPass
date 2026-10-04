import { useState } from 'react'
import type React from 'react'
import { AlertTriangle, Check } from 'lucide-react'
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

function SectionLabel({
  children,
  required,
  error,
}: {
  children: React.ReactNode
  required?: boolean
  error?: boolean
}) {
  return (
    <label className={`inline-flex items-center gap-1.5 font-en text-[11px] font-semibold uppercase tracking-[0.08em] ${
      error ? 'text-[#B30000]' : 'text-[rgba(10,10,11,0.45)]'
    }`}>
      {children}
      {required && <span className={error ? 'text-[#B30000]' : 'text-heritage-500'}>*</span>}
    </label>
  )
}

function CategoryCard({
  name,
  selected,
  onToggle,
}: {
  name: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={`relative flex min-h-[52px] w-full items-center border px-3 py-3 pl-9 text-left font-kr text-[14px] font-medium transition-colors ${
        selected
          ? 'border-ink bg-ink text-white'
          : 'border-[rgba(10,10,11,0.15)] bg-white text-ink hover:bg-[rgba(10,10,11,0.04)]'
      }`}
    >
      <span className={`absolute left-3 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center border ${
        selected ? 'border-white bg-white' : 'border-[rgba(10,10,11,0.3)]'
      }`}>
        {selected && <Check size={11} className="text-ink" strokeWidth={3} />}
      </span>
      {name}
    </button>
  )
}

function SegmentGroup({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: typeof BUSINESS_TYPES[number]) => void
  error?: boolean
}) {
  return (
    <div className={`grid grid-cols-2 border bg-white ${error ? 'border-[#B30000]' : 'border-[rgba(10,10,11,0.15)]'}`}>
      {BUSINESS_TYPES.map((item, index) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`min-h-[42px] border-l border-[rgba(10,10,11,0.08)] first:border-l-0 font-kr text-[13px] transition-colors ${
            value === item
              ? 'bg-ink text-white font-semibold'
              : 'bg-white text-ink hover:bg-[rgba(10,10,11,0.04)]'
          }`}
        >
          {index === 1 ? (
            <span className="inline-flex items-center gap-1">
              즉판가공업
              <span className="font-en text-[10px] opacity-55">ⓘ</span>
            </span>
          ) : item}
        </button>
      ))}
    </div>
  )
}

function FacilityGroup({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: typeof FACILITY_TYPES[number]) => void
  error?: boolean
}) {
  return (
    <div className={`grid grid-cols-2 border bg-white ${error ? 'border-[#B30000]' : 'border-[rgba(10,10,11,0.15)]'}`}>
      {FACILITY_TYPES.map(item => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`min-h-[42px] border-l border-[rgba(10,10,11,0.08)] first:border-l-0 font-kr text-[13px] transition-colors ${
            value === item
              ? 'bg-ink text-white font-semibold'
              : 'bg-white text-ink hover:bg-[rgba(10,10,11,0.04)]'
          }`}
        >
          {item === '단독' ? '단독 주방' : '공유 주방'}
        </button>
      ))}
    </div>
  )
}

function ReportNumberStatusGroup({
  value,
  onChange,
}: {
  value: string
  onChange: (value: typeof REPORT_NUMBER_STATUSES[number]['value']) => void
}) {
  return (
    <div className="grid grid-cols-2 border border-[rgba(10,10,11,0.15)] bg-white">
      {REPORT_NUMBER_STATUSES.map(item => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`min-h-[40px] border-l border-[rgba(10,10,11,0.08)] px-3 font-kr text-[13px] first:border-l-0 transition-colors ${
            value === item.value
              ? 'bg-ink font-semibold text-white'
              : 'bg-white text-ink hover:bg-[rgba(10,10,11,0.04)]'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function StorageGroup({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (value: string) => void
  error?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`mt-2 h-[40px] w-full appearance-none border bg-white bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230a0a0b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")] bg-[right_14px_center] bg-no-repeat px-[14px] pr-[36px] font-kr text-[13px] outline-none transition-colors focus:border-breath-500 ${
        error ? 'border-[#B30000]' : 'border-[rgba(10,10,11,0.15)]'
      } ${value ? 'text-ink' : 'text-[rgba(10,10,11,0.35)]'}`}
    >
      <option value="" disabled>보관방법을 선택해주세요</option>
      {STORAGE_OPTIONS.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  )
}

function TextField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  type = 'text',
  min,
}: {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  placeholder?: string
  error?: boolean
  type?: string
  min?: string
}) {
  return (
    <div>
      <SectionLabel required error={error}>{label}</SectionLabel>
      <input
        className={`mt-2 h-[40px] w-full border bg-white px-[14px] font-kr text-[13px] outline-none transition-colors placeholder:text-[rgba(10,10,11,0.35)] focus:border-breath-500 ${
          error ? 'border-[#B30000]' : 'border-[rgba(10,10,11,0.15)]'
        }`}
        type={type}
        min={min}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
    </div>
  )
}

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
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel required error={errors.productName}>Product Name · 제품명</SectionLabel>
        <input
          className={`mt-2 h-[40px] w-full border bg-white px-[14px] font-kr text-[13px] outline-none transition-colors placeholder:text-[rgba(10,10,11,0.35)] focus:border-breath-500 ${
            errors.productName ? 'border-[#B30000]' : 'border-breath-500'
          }`}
          placeholder="제품명을 입력해주세요 (예: 수제 딸기잼)"
          value={data.productName}
          onChange={setProductName}
          onBlur={() => markTouched('productName')}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <SectionLabel required error={errors.categories}>Food Category · 식품 카테고리</SectionLabel>
          <span className="font-kr text-[11px] text-[rgba(10,10,11,0.4)]">
            {data.categories.length > 0 ? `${data.categories.length}개 선택됨` : '복수 선택 가능'}
          </span>
        </div>

        <div
          className={`grid grid-cols-2 gap-2 md:grid-cols-4 ${errors.categories ? 'outline outline-1 outline-[#B30000]' : ''}`}
          onBlurCapture={event => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              markTouched('categories')
            }
          }}
        >
          {ALL_CATEGORIES.map(category => (
            <CategoryCard
              key={category}
              name={category}
              selected={data.categories.includes(category)}
              onToggle={() => toggleCategory(category)}
            />
          ))}
        </div>

        {data.categories.length > 0 && (
          <p className="mt-3 font-kr text-[12px] text-[rgba(10,10,11,0.6)]">
            <span className="font-semibold text-ink">선택</span>
            {'  '}
            {data.categories.join(', ')}
          </p>
        )}
      </div>

      <div>
        <div className="mb-2">
          <SectionLabel required error={errors.businessType}>Business Type · 사업자 유형</SectionLabel>
        </div>
        <SegmentGroup
          value={data.businessType}
          onChange={value => {
            markTouched('businessType')
            onChange({
              businessType: value,
              ...(!data.facilityType ? { facilityType: '단독' as const } : {}),
            })
          }}
          error={errors.businessType}
        />
      </div>

      <div className="border-t border-[rgba(10,10,11,0.08)] pt-8">
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 font-en text-[10.5px] font-semibold uppercase tracking-[0.16em] text-heritage-500">
            <span className="h-px w-[18px] bg-heritage-500" />
            <span className="font-kr tracking-[0.04em] text-ink">라벨 기본정보</span>
          </div>
          <p className="mt-2 font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.5)]">
            아래 정보는 라벨 미리보기와 다운로드 파일에 그대로 반영됩니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <SectionLabel required error={errors.facilityType}>Facility Type · 영업 시설</SectionLabel>
            <div className="mt-2">
              <FacilityGroup
                value={data.facilityType}
                onChange={facilityType => {
                  markTouched('facilityType')
                  onChange({ facilityType })
                }}
                error={errors.facilityType}
              />
            </div>
            {data.facilityType === '공유' && (
              <div className="mt-2 flex items-start gap-2 border border-[#F0A500] bg-[#FFF3DC] px-3 py-2.5">
                <AlertTriangle size={13} className="mt-[1px] flex-shrink-0 text-[#8A5A00]" />
                <p className="font-kr text-[12px] leading-[1.6] text-[#8A5A00]">
                  공유주방 사용 시 타 제품 알레르기 원료 혼입 가능성 표시를 권장합니다.
                </p>
              </div>
            )}
          </div>

          <div>
            <SectionLabel required error={errors.totalWeight}>Net Quantity · 내용량</SectionLabel>
            <div className="mt-2 flex">
              <input
                className={`h-[40px] min-w-0 flex-1 border bg-white px-[14px] text-right font-en text-[13px] outline-none transition-colors focus:border-breath-500 ${
                  errors.totalWeight ? 'border-[#B30000]' : 'border-[rgba(10,10,11,0.15)]'
                }`}
                type="number"
                min="0"
                step="any"
                placeholder="200"
                value={data.totalWeight}
                onChange={set('totalWeight')}
                onBlur={() => markTouched('totalWeight')}
              />
              {(['g', 'mL'] as const).map(unit => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => onChange({ unit })}
                  className={`h-[40px] w-12 border-y border-r border-[rgba(10,10,11,0.15)] font-en text-[12px] transition-colors ${
                    data.unit === unit ? 'bg-ink text-white font-semibold' : 'bg-white text-ink hover:bg-[rgba(10,10,11,0.04)]'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="Manufacturer · 제조원"
            value={data.manufacturer}
            onChange={set('manufacturer')}
            onBlur={() => markTouched('manufacturer')}
            placeholder="예: 주식회사 ○○식품"
            error={errors.manufacturer}
          />

          <TextField
            label="제조원 소재지"
            value={data.manufacturerAddress}
            onChange={set('manufacturerAddress')}
            placeholder="예: 서울특별시 강남구 테헤란로 123"
          />

          <div>
            <div className="mb-2">
              <SectionLabel>품목보고번호</SectionLabel>
            </div>
            <ReportNumberStatusGroup
              value={data.reportNumberStatus}
              onChange={reportNumberStatus => onChange({
                reportNumberStatus,
                ...(reportNumberStatus === 'none_or_needed' ? { reportNumber: '' } : {}),
              })}
            />
            {data.reportNumberStatus === 'exists' ? (
              <input
                className="mt-2 h-[40px] w-full border border-[rgba(10,10,11,0.15)] bg-white px-[14px] font-en text-[13px] outline-none transition-colors placeholder:text-[rgba(10,10,11,0.35)] focus:border-breath-500"
                placeholder="예: 1234567890123"
                value={data.reportNumber}
                onChange={set('reportNumber')}
              />
            ) : (
              <p className="mt-2 font-kr text-[11px] leading-[1.55] text-[rgba(10,10,11,0.48)]">
                {data.reportNumberStatus === 'none_or_needed'
                  ? '출시 전이라면 품목제조보고 후 발급 번호를 최종 라벨에 반영해야 합니다.'
                  : '품목제조보고 상태를 선택해주세요.'}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <SectionLabel>Label Claims · 표시/광고 문구</SectionLabel>
              <span className="border border-[rgba(10,10,11,0.12)] px-2 py-0.5 font-kr text-[10px] text-[rgba(10,10,11,0.45)]">
                선택
              </span>
            </div>
            <textarea
              className="input-field w-full resize-none"
              rows={3}
              placeholder="예: 무가당, 100% 국산 재료, 저칼로리"
              value={data.labelClaim}
              onChange={e => onChange({ labelClaim: e.target.value })}
            />
            <p className="mt-1.5 font-kr text-[11px] leading-[1.5] text-[rgba(10,10,11,0.4)]">
              입력한 문구는 부당 표시·광고(R12)와 영양강조표시(R20) 검토에 반영됩니다.
            </p>
          </div>

          <div>
            <SectionLabel required error={errors.storage}>Storage · 보관방법</SectionLabel>
            <StorageGroup
              value={data.storage}
              onChange={storage => {
                markTouched('storage')
                onChange({ storage })
              }}
              error={errors.storage}
            />
          </div>

          <TextField
            label="Use-by Date · 소비기한"
            type="date"
            min={TODAY}
            value={data.expiryDate}
            onChange={set('expiryDate')}
            onBlur={() => markTouched('expiryDate')}
            error={errors.expiryDate}
          />
        </div>
      </div>
    </div>
  )
}
