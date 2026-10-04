import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
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
  label,
}: {
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  label: string
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
    if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIdx(index => Math.min(index + 1, filtered.length - 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIdx(index => Math.max(index - 1, -1)) }
    if (event.key === 'Enter' && activeIdx >= 0) { event.preventDefault(); select(filtered[activeIdx]) }
    if (event.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="lp-in"
        aria-label={label}
        placeholder="예: 딸기"
        value={value}
        onChange={event => { onChange(event.target.value); setOpen(true); setActiveIdx(-1) }}
        onFocus={() => { if (value.trim()) setOpen(true) }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="lp-sugg" role="listbox">
          {filtered.map((item, index) => (
            <button key={item} type="button" role="option" aria-selected={index === activeIdx}
              className={index === activeIdx ? 'on' : ''}
              onMouseDown={event => { event.preventDefault(); select(item) }}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PK_SHORT: Record<string, string> = {
  '고밀도 폴리에틸렌(HDPE)': 'HDPE', '폴리염화비닐(PVC)': 'PVC', '저밀도 폴리에틸렌(LDPE)': 'LDPE',
  '폴리프로필렌(PP)': 'PP', '폴리스티렌(PS)': 'PS',
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

  const X = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>

  return (
    <div>
      <div className="lp-card">
        <h2>원재료</h2>
        <p className="lp-desc">배합량이 많은 순서대로 적어 주세요. 알레르기 · 복합원재료는 자동으로 찾아요.{suggestions.length > 0 && ' 선택한 카테고리에 맞는 원재료가 자동완성돼요.'}</p>
        <div className="lp-ing">
          <div className="lp-ing-h"><span>#</span><span>원재료명</span><span>배합량(g)</span><span>원산지</span><span /></div>
          {data.ingredients.length === 0 && (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 15, borderTop: 0 }}>아래 버튼으로 첫 원재료를 추가해 주세요.</div>
          )}
          {data.ingredients.map((ingredient, index) => (
            <div className="lp-ing-r" key={ingredient.id}>
              <span className="no">{index + 1}</span>
              <div className="nm">
                <AutocompleteInput label={`원재료 ${index + 1} 이름`} value={ingredient.name} onChange={value => update(ingredient.id, 'name', value)} suggestions={suggestions} />
                {ingredient.isAllergen ? <span className="badge lp-b-al">알레르기</span>
                  : ingredient.isComposite ? <span className="badge lp-b-cp">복합원재료?</span> : null}
              </div>
              <input className="lp-in" aria-label={`원재료 ${index + 1} 배합량(g)`} type="number" min="0" step="any" inputMode="decimal" placeholder="0"
                value={ingredient.weight} onChange={event => update(ingredient.id, 'weight', event.target.value)}
                title={ratio(ingredient.weight) !== '-' ? `비율 ${ratio(ingredient.weight)}` : undefined} />
              <input className="lp-in org" aria-label={`원재료 ${index + 1} 원산지`} placeholder="원산지 (예: 국산)"
                value={ingredient.origin ?? ''} onChange={event => update(ingredient.id, 'origin', event.target.value)} />
              <button type="button" className="lp-del" aria-label={`원재료 ${index + 1} 삭제`}
                onClick={() => pushUpdate(data.ingredients.filter(item => item.id !== ingredient.id))}>{X}</button>
            </div>
          ))}
          <button type="button" className="lp-add" onClick={() => pushUpdate([...data.ingredients, newRow()])}>＋ 원재료 추가</button>
        </div>

        {hasIngredients && productWeight > 0 && totalWeight > productWeight + 0.5 && (
          <div className="lp-callout red"><span>⚠</span><span>원재료 합계 <b>{totalWeight}g</b>이 제품 내용량 {productWeight}g보다 많아요.</span></div>
        )}
        {data.ingredients.length > 1 && !isOrdered && (
          <div className="lp-callout amber" style={{ alignItems: 'center' }}>
            <span>⚠</span><span style={{ flex: 1 }}><b>순서 확인</b> — 원재료는 배합량이 많은 순서대로 표시해야 해요.</span>
            <button type="button" className="lp-btn lp-btn-line lp-btn-sm" onClick={() => pushUpdate(sorted)}>자동 정렬</button>
          </div>
        )}

        {hasIngredients && (
          <div className="lp-det">
            {detectedAllergens.length > 0 ? (
              <div className="al"><b>알레르기 유발물질</b><strong>{detectedAllergens.map(item => item.name).join(' · ')}</strong> — 라벨에 따로 표시돼요</div>
            ) : (
              <div className="ok"><b>알레르기 유발물질</b>감지된 물질이 없어요</div>
            )}
            {detectedComposites.length > 0 ? (
              <div className="cp"><b>복합원재료 확인</b>{detectedComposites.map((item, i) => (
                <span key={i} style={{ display: 'block' }}><strong>{item.ingredientName}</strong> — 구성 원재료를 괄호로 적어 주세요{item.hint ? ` · 참고: ${item.hint}` : ''}</span>
              ))}</div>
            ) : (
              <div className="ok"><b>복합원재료</b>확인이 필요한 재료가 없어요</div>
            )}
          </div>
        )}
      </div>

      <div className="lp-card">
        <h2>포장재</h2>
        <p className="lp-desc">분리배출 마크를 정하는 데 쓰여요. 용기 · 뚜껑 · 라벨을 모두 골라 주세요.</p>
        {PACKAGING_GROUPS.map(group => (
          <div className="lp-pk-g" key={group.label}>
            <h3>{group.label}</h3>
            <div className="lp-chips">
              {group.items.map(option => {
                const selected = (data.packagingMaterials ?? []).includes(option)
                return (
                  <button key={option} type="button" aria-pressed={selected} className={`lp-chip${selected ? ' on' : ''}`} onClick={() => togglePackaging(option)}>
                    {PK_SHORT[option] ?? option}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {(data.packagingMaterials ?? []).length === 0 && (
          <div className="lp-callout amber"><span>⚠</span><span>포장재를 고르지 않으면 <b>분리배출 마크 검토</b>를 건너뛰어요.</span></div>
        )}
      </div>
    </div>
  )
}
