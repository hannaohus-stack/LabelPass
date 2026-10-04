import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { AlertTriangle, ArrowUpDown, Check, CheckCircle2, ClipboardList, Plus, Trash2 } from 'lucide-react'
import { detectAllergens, detectAllergensFromList } from '../../utils/allergenChecker'
import { detectComposite, detectCompositesFromList } from '../../utils/compositeChecker'
import type { CreatorIngredient, StepProps } from './types'

import jamData from '../../utils/data/ingredients-jam.json'
import sauceData from '../../utils/data/ingredients-sauce.json'
import jangData from '../../utils/data/ingredients-jang.json'
import ricecakeData from '../../utils/data/ingredients-ricecake.json'
import dessertData from '../../utils/data/ingredients-dessert.json'
import beverageData from '../../utils/data/ingredients-beverage.json'
import healthyData from '../../utils/data/ingredients-healthy.json'

const PACKAGING_GROUPS = [
  {
    label: '플라스틱',
    items: ['페트(PET)', '고밀도 폴리에틸렌(HDPE)', '폴리염화비닐(PVC)', '저밀도 폴리에틸렌(LDPE)', '폴리프로필렌(PP)', '폴리스티렌(PS)', '기타 플라스틱'],
  },
  {
    label: '기타 재질',
    items: ['유리', '철', '알루미늄', '종이팩', '멸균팩', '골판지', '일반 종이', '비닐류', '스티로폼', '도포·첩합류(빨간)', '도포·첩합류(검정)'],
  },
] as const

const ALL_PACKAGING_OPTIONS = PACKAGING_GROUPS.flatMap(group => group.items)

const CATEGORY_INGREDIENTS: Record<string, string[]> = {
  '잼류': jamData,
  '소스류': sauceData,
  '장류': jangData,
  '떡류': ricecakeData,
  '디저트/베이커리': dessertData,
  '차/음료': beverageData,
  '건강식품(일반)': healthyData,
}

function getIngredientSuggestions(categories: string[]): string[] {
  const all = categories.flatMap(category => CATEGORY_INGREDIENTS[category] ?? [])
  return [...new Set(all)].sort((a, b) => a.localeCompare(b, 'ko'))
}

function newRow(): CreatorIngredient {
  return { id: crypto.randomUUID(), name: '', weight: '', origin: '', isAllergen: false, isComposite: false }
}

function AutocompleteInput({
  value,
  onChange,
  suggestions,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
}) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!value.trim()) return []
    const query = value.trim().toLowerCase()
    return suggestions.filter(item => item.toLowerCase().includes(query) && item !== value).slice(0, 8)
  }, [value, suggestions])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (item: string) => {
    onChange(item)
    setOpen(false)
    setActiveIdx(-1)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIdx(index => Math.min(index + 1, filtered.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIdx(index => Math.max(index - 1, -1))
    }
    if (event.key === 'Enter' && activeIdx >= 0) {
      event.preventDefault()
      select(filtered[activeIdx])
    }
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        className="input-field"
        placeholder="예: 딸기, 설탕, 레몬즙"
        value={value}
        onChange={event => {
          onChange(event.target.value)
          setOpen(true)
          setActiveIdx(-1)
        }}
        onFocus={() => { if (value.trim()) setOpen(true) }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 max-h-48 overflow-y-auto border border-[rgba(10,10,11,0.15)] bg-white shadow-md">
          {filtered.map((item, index) => (
            <li key={item}>
              <button
                type="button"
                onMouseDown={event => {
                  event.preventDefault()
                  select(item)
                }}
                className={`w-full px-3 py-2 text-left font-kr text-[12px] transition-colors ${
                  index === activeIdx ? 'bg-ink text-white' : 'text-ink hover:bg-[rgba(10,10,11,0.04)]'
                }`}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AutoTag({ tone, children }: { tone: 'red' | 'blue'; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-1 font-kr text-[11px] font-semibold"
      style={{
        color: tone === 'red' ? '#B30000' : '#002D72',
        borderColor: tone === 'red' ? 'rgba(179,0,0,0.24)' : 'rgba(0,45,114,0.24)',
        background: tone === 'red' ? '#FFF8F8' : '#EAF6FE',
      }}
    >
      <span className="font-en text-[9px] uppercase tracking-[0.08em] opacity-60">AUTO</span>
      {children}
    </span>
  )
}

export default function Step2_Ingredients({ data, onChange }: StepProps) {
  const suggestions = useMemo(() => getIngredientSuggestions(data.categories), [data.categories])
  const totalWeight = data.ingredients.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
  const productWeight = parseFloat(data.totalWeight)
  const sorted = [...data.ingredients].sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const isOrdered = data.ingredients.every((item, index) => item.id === sorted[index]?.id)
  const hasIngredients = data.ingredients.length > 0

  const detectedAllergens = useMemo(() => {
    const names = data.ingredients.map(item => item.name).filter(Boolean)
    return detectAllergensFromList(names)
  }, [data.ingredients])

  const detectedComposites = useMemo(() => {
    const names = data.ingredients.map(item => item.name).filter(Boolean)
    return detectCompositesFromList(names)
  }, [data.ingredients])

  const pushUpdate = (next: CreatorIngredient[]) => {
    const names = next.map(item => item.name).filter(Boolean)
    onChange({
      ingredients: next,
      detectedAllergens: detectAllergensFromList(names).map(item => ({ id: item.id, name: item.name })),
      detectedComposites: detectCompositesFromList(names),
    })
  }

  const update = (id: string, field: keyof CreatorIngredient, value: string | boolean) => {
    const next = data.ingredients.map(item => {
      if (item.id !== id) return item
      const updated = { ...item, [field]: value }
      if (field === 'name' && typeof value === 'string') {
        updated.isAllergen = detectAllergens(value).length > 0
        updated.isComposite = detectComposite(value) !== null
      }
      return updated
    })
    pushUpdate(next)
  }

  const togglePackaging = (option: typeof ALL_PACKAGING_OPTIONS[number]) => {
    const current = data.packagingMaterials ?? []
    const next = current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option]
    onChange({ packagingMaterials: next })
  }

  const ratio = (weight: string) => {
    const value = parseFloat(weight)
    if (!value || !totalWeight) return '-'
    return `${((value / totalWeight) * 100).toFixed(1)}%`
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="border border-[rgba(10,10,11,0.1)] bg-white p-4">
        <div className="flex flex-col gap-1">
          <p className="font-kr text-[14px] font-semibold text-ink">포장재 재질</p>
          <p className="font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.48)]">
            분리배출 마크 제공을 위해 용기와 뚜껑 재질을 모두 선택하세요.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {PACKAGING_GROUPS.map(group => (
            <div key={group.label} className="flex flex-col gap-2">
              <span className="font-en text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgba(10,10,11,0.36)]">{group.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map(option => {
                  const selected = (data.packagingMaterials ?? []).includes(option)
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => togglePackaging(option)}
                      className="flex min-h-8 items-center gap-1.5 border px-2.5 font-kr text-[11px] transition-colors"
                      style={{
                        background: selected ? 'rgba(0,45,114,0.06)' : 'rgba(10,10,11,0.02)',
                        borderColor: selected ? '#002D72' : 'rgba(10,10,11,0.13)',
                        color: selected ? '#002D72' : 'rgba(10,10,11,0.55)',
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      {selected && <Check size={11} />}
                      {option}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-[rgba(10,10,11,0.08)] pt-3">
          {(data.packagingMaterials ?? []).length > 0 ? (
            <p className="font-kr text-[11.5px] leading-[1.5] text-heritage-500">
              선택됨: <span className="font-semibold">{(data.packagingMaterials ?? []).join(', ')}</span>
            </p>
          ) : (
            <div className="flex items-start gap-2">
              <AlertTriangle size={13} className="mt-[1px] flex-shrink-0 text-[#B07A1A]" />
              <p className="font-kr text-[11.5px] leading-[1.5] text-[#B07A1A]">
                포장재를 선택하지 않으면 R15 분리배출 마크 검토 <span className="font-semibold">(과태료 최대 300만원)</span>를 건너뜁니다.
              </p>
            </div>
          )}
        </div>
      </section>

      {suggestions.length > 0 && (
        <div className="border border-[rgba(10,10,11,0.07)] bg-[rgba(10,10,11,0.02)] px-3 py-2 font-kr text-[12px] text-[rgba(10,10,11,0.5)]">
          선택 카테고리 기반 원재료 자동완성이 적용됩니다.
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="font-en text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(10,10,11,0.45)]">
            원재료 · Ingredients ({String(data.ingredients.length).padStart(2, '0')})
          </div>
          <span className="font-kr text-[11px] text-[rgba(10,10,11,0.45)]">
            내용량 <span className="font-en font-semibold text-ink tabular-nums">{data.totalWeight || '-'}{data.unit}</span> 기준
          </span>
        </div>
        {data.ingredients.length === 0 ? (
          <div className="flex min-h-[180px] items-center justify-center border border-dashed border-[rgba(10,10,11,0.18)] bg-white">
            <p className="font-kr text-[13px] text-[rgba(10,10,11,0.35)]">원재료 카드를 추가하세요.</p>
          </div>
        ) : (
          data.ingredients.map((ingredient, index) => (
            <article key={ingredient.id} className="border border-[rgba(10,10,11,0.1)] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="font-en text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.38)]">
                  Ingredient {String(index + 1).padStart(2, '0')}
                </div>
                <button
                  onClick={() => pushUpdate(data.ingredients.filter(item => item.id !== ingredient.id))}
                  className="flex h-8 w-8 items-center justify-center text-[rgba(10,10,11,0.35)] transition-colors hover:text-[#B30000]"
                  aria-label="원재료 삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_128px_82px]">
                <div>
                  <label className="mb-1.5 block font-en text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(10,10,11,0.38)]">원재료명</label>
                  <AutocompleteInput
                    value={ingredient.name}
                    onChange={value => update(ingredient.id, 'name', value)}
                    suggestions={suggestions}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-en text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(10,10,11,0.38)]">중량</label>
                  <div className="flex">
                    <input
                      className="input-field text-right tabular-nums"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={ingredient.weight}
                      onChange={event => update(ingredient.id, 'weight', event.target.value)}
                    />
                    <span className="flex h-10 w-10 items-center justify-center border-y border-r border-[rgba(10,10,11,0.22)] font-en text-[12px] text-[rgba(10,10,11,0.45)]">g</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-en text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(10,10,11,0.38)]">비율</label>
                  <div className="flex h-10 items-center justify-center border border-[rgba(10,10,11,0.12)] bg-[rgba(10,10,11,0.02)] font-en text-[13px] text-[rgba(10,10,11,0.5)] tabular-nums">
                    {ratio(ingredient.weight)}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="mb-1.5 flex items-center gap-1.5 font-en text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgba(10,10,11,0.38)]">
                  원산지
                  <span className="rounded bg-[rgba(179,0,0,0.08)] px-1.5 py-0.5 font-kr text-[10px] font-medium normal-case tracking-normal text-[#B30000]">R19 의무</span>
                </label>
                <input
                  className="input-field w-full"
                  type="text"
                  placeholder="예: 국산, 미국산, 칠레산"
                  value={ingredient.origin ?? ''}
                  onChange={event => update(ingredient.id, 'origin', event.target.value)}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {ingredient.isAllergen && <AutoTag tone="red">알레르기</AutoTag>}
                {ingredient.isComposite && <AutoTag tone="blue">복합원재료</AutoTag>}
                {!ingredient.isAllergen && !ingredient.isComposite && ingredient.name && (
                  <span className="inline-flex items-center rounded-full bg-[rgba(10,10,11,0.04)] px-2 py-1 font-kr text-[11px] text-[rgba(10,10,11,0.45)]">자동 감지 항목 없음</span>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <button onClick={() => pushUpdate([...data.ingredients, newRow()])} className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-dashed border-[rgba(10,10,11,0.15)] bg-transparent px-4 font-kr text-[13px] font-medium text-heritage-500 transition-colors hover:border-heritage-500 hover:bg-[rgba(0,45,114,0.03)]">
        <Plus size={14} />
        원재료 추가
      </button>

      {hasIngredients && productWeight > 0 && totalWeight > productWeight + 0.5 && (
        <div className="flex items-start gap-3 border border-[#B30000] bg-[#FFE6E6] px-3 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[#B30000]" />
          <p className="font-kr text-[12px] leading-[1.6] text-[#B30000]">
            원재료 합계 {totalWeight}g이 제품 내용량 {productWeight}g을 초과합니다.
          </p>
        </div>
      )}

      {data.ingredients.length > 1 && !isOrdered && (
        <div className="flex items-center gap-3 border border-[#F0A500] bg-[#FFF3DC] px-3 py-2.5">
          <AlertTriangle size={14} className="flex-shrink-0 text-[#8A5A00]" />
          <p className="flex-1 font-kr text-[12px] text-[#8A5A00]">원재료는 함량이 많은 순서대로 표기해야 합니다.</p>
          <button onClick={() => pushUpdate(sorted)} className="flex items-center gap-1 font-kr text-[12px] font-semibold text-[#8A5A00] underline">
            <ArrowUpDown size={12} />
            자동 정렬
          </button>
        </div>
      )}

      {hasIngredients && (
        <section className="grid grid-cols-3 gap-3 border border-[rgba(10,10,11,0.08)] bg-[rgba(10,10,11,0.02)] px-5 py-4">
          <div>
            <div className="mb-1 font-en text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(10,10,11,0.35)]">총 중량</div>
            <div className="font-en text-[20px] font-bold leading-none text-ink tabular-nums">{totalWeight > 0 ? `${totalWeight}g` : '-'}</div>
          </div>
          <div>
            <div className="mb-1 font-en text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(10,10,11,0.35)]">알레르기</div>
            <div className={`font-kr text-[20px] font-bold leading-none tabular-nums ${detectedAllergens.length > 0 ? 'text-[#B30000]' : 'text-[rgba(10,10,11,0.3)]'}`}>{detectedAllergens.length > 0 ? `${detectedAllergens.length}개` : '없음'}</div>
          </div>
          <div>
            <div className="mb-1 font-en text-[10px] font-semibold uppercase tracking-[0.08em] text-[rgba(10,10,11,0.35)]">복합원재료</div>
            <div className={`font-kr text-[20px] font-bold leading-none tabular-nums ${detectedComposites.length > 0 ? 'text-[#B07A1A]' : 'text-[rgba(10,10,11,0.3)]'}`}>{detectedComposites.length > 0 ? `${detectedComposites.length}개` : '없음'}</div>
          </div>
        </section>
      )}

      {hasIngredients && (
        detectedAllergens.length > 0 ? (
          <div className="border border-[#B30000] bg-[#FFF8F8] px-4 py-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#B30000]" />
              <span className="font-kr text-[13px] font-semibold text-[#B30000]">알레르기 유발 물질 감지됨</span>
            </div>
            <p className="mt-1 pl-[22px] font-kr text-[13px] font-bold text-[#B30000]">{detectedAllergens.map(item => item.name).join(' · ')}</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 border border-[#15803d]/20 bg-[#f0fdf4] px-4 py-3">
            <CheckCircle2 size={14} className="text-[#15803d]" />
            <span className="font-kr text-[13px] text-[#15803d]">알레르기 유발 물질 없음</span>
          </div>
        )
      )}

      {hasIngredients && detectedComposites.length > 0 && (
        <div className="border border-[rgba(0,45,114,0.25)] bg-[rgba(0,45,114,0.03)] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-heritage-500" />
            <span className="font-kr text-[13px] font-semibold text-heritage-500">복합원재료 표시 필요</span>
          </div>
          <div className="mt-2 flex flex-col gap-2 pl-[22px]">
            {detectedComposites.map((item, index) => (
              <p key={index} className="font-kr text-[12px] leading-[1.6] text-heritage-500">
                {item.ingredientName} → 구성 원재료를 괄호로 표시하세요.
                <span className="ml-1 text-heritage-500/60">힌트: {item.hint}</span>
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
