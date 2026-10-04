/**
 * ReviewModal.tsx — 법규 검토 상세 모달
 * Step5_Export에서 "상세 검토 결과 보기" 클릭 시 오버레이로 표시
 *
 * Props:
 *   results     — analyzeRegulations() 결과
 *   productName — 제품명 (헤더 표시용)
 *   onClose     — X 버튼 → 모달 닫기
 *   onEdit      — 수정하기 버튼 → 모달 닫기 + 이전 스텝으로 이동
 */
import { useState } from 'react'
import {
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'
import type { RegulationResult } from '../ReviewResult'

type FilterType = 'all' | 'violation' | 'warn' | 'pass'

interface Props {
  results:     RegulationResult[]
  productName: string
  onClose:     () => void
  onEdit:      () => void
}

// ─── 상태별 스타일 맵 ──────────────────────────────────────────────────────────

const STATUS_CFG = {
  violation: {
    label:  '필수 확인',
    color:  'text-[#B30000]',
    bg:     'bg-[#FFF0F0]',
    border: 'border-[#B30000]',
    numColor: 'text-[#B30000]',
    Icon:   AlertTriangle,
  },
  warn: {
    label:  '보완 권장',
    color:  'text-[#C07A00]',
    bg:     'bg-[#FFF8E0]',
    border: 'border-[#C07A00]',
    numColor: 'text-[#C07A00]',
    Icon:   AlertCircle,
  },
  pass: {
    label:  '기준 충족',
    color:  'text-heritage-500',
    bg:     'bg-[rgba(0,45,114,0.06)]',
    border: 'border-heritage-500',
    numColor: 'text-heritage-500',
    Icon:   CheckCircle2,
  },
} as const

function DetailBlock({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value?: string
  tone?: 'default' | 'guide' | 'alert'
}) {
  if (!value) return null

  const toneClass = tone === 'guide'
    ? 'border-heritage-500/20 bg-[#F5F8FC]'
    : tone === 'alert'
    ? 'border-[#B30000]/20 bg-[#FFF8F8]'
    : 'border-[rgba(10,10,11,0.1)] bg-white'

  return (
    <div className={`border px-3 py-2.5 ${toneClass}`}>
      <p className="mb-1 font-en text-[9px] font-bold uppercase tracking-[0.1em] text-[rgba(10,10,11,0.35)]">
        {label}
      </p>
      <p className="whitespace-pre-line font-kr text-[12px] leading-[1.65] text-[rgba(10,10,11,0.72)]">
        {value}
      </p>
    </div>
  )
}

function ActionItems({ items }: { items?: string[] }) {
  if (!items?.length) return null

  return (
    <div className="border border-heritage-500/20 bg-white px-3 py-2.5">
      <p className="mb-1.5 font-en text-[9px] font-bold uppercase tracking-[0.1em] text-[rgba(10,10,11,0.35)]">
        다음 액션
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-2 font-kr text-[12px] leading-[1.55] text-[rgba(10,10,11,0.72)]">
            <span className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full bg-heritage-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ReviewModal({ results, productName, onClose, onEdit }: Props) {

  const [filter,   setFilter]   = useState<FilterType>('all')
  const [expanded, setExpanded] = useState<Set<string>>(
    // 필수 확인·보완 권장은 기본 펼침
    () => new Set(results.filter(r => r.status !== 'pass').map(r => r.id))
  )

  const counts = {
    violation: results.filter(r => r.status === 'violation').length,
    warn:      results.filter(r => r.status === 'warn').length,
    pass:      results.filter(r => r.status === 'pass').length,
  }

  const filtered = filter === 'all'
    ? results
    : results.filter(r => r.status === filter)

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center">

      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 패널 */}
      <div className="relative flex flex-col w-full max-w-[760px] h-full bg-white shadow-2xl overflow-hidden">

        {/* ── 스티키 헤더 ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[rgba(10,10,11,0.1)] bg-white">
          <div>
            <p className="font-en text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.4)]">
              항목 상세 확인
            </p>
            <p className="font-kr text-[14px] font-semibold text-ink mt-0.5 leading-tight">
              {productName || '(제품명 미입력)'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-[rgba(10,10,11,0.4)] hover:text-ink hover:bg-[rgba(10,10,11,0.05)] transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 카운트 요약 ──────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 grid grid-cols-3 divide-x divide-[rgba(10,10,11,0.08)] border-b border-[rgba(10,10,11,0.08)]">
          {(['violation', 'warn', 'pass'] as const).map(key => {
            const cfg = STATUS_CFG[key]
            return (
              <div key={key} className="flex flex-col items-center py-4 gap-1.5">
                <span className={`font-en text-[28px] font-semibold tabular-nums leading-none ${cfg.numColor}`}>
                  {counts[key]}
                </span>
                <span className="font-kr text-[11px] text-[rgba(10,10,11,0.45)] flex items-center gap-1">
                  <cfg.Icon size={10} className={cfg.color} />
                  {cfg.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* ── 필터 탭 ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex border-b border-[rgba(10,10,11,0.08)]">
          {([
            ['all',       '전체',    null],
            ['violation', '필수 확인', counts.violation],
            ['warn',      '보완 권장', counts.warn],
            ['pass',      '기준 충족', counts.pass],
          ] as [FilterType, string, number | null][]).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-2.5 font-kr text-[12px] font-medium transition-colors border-b-2 -mb-px
                ${filter === key
                  ? 'border-ink text-ink'
                  : 'border-transparent text-[rgba(10,10,11,0.4)] hover:text-[rgba(10,10,11,0.7)]'}`}
            >
              {label}
              {count !== null && (
                <span className="ml-1 font-en text-[11px] opacity-70">({count})</span>
              )}
            </button>
          ))}
        </div>

        {/* ── 아코디언 결과 목록 (스크롤) ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto divide-y divide-[rgba(10,10,11,0.06)]">

          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <p className="font-kr text-[13px] text-[rgba(10,10,11,0.4)]">
                해당하는 항목이 없습니다.
              </p>
            </div>
          )}

          {filtered.map(r => {
            const cfg    = STATUS_CFG[r.status]
            const isOpen = expanded.has(r.id)

            return (
              <div key={r.id}>

                {/* 행 헤더 — 클릭으로 토글 */}
                <button
                  onClick={() => toggle(r.id)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[rgba(10,10,11,0.015)] transition-colors"
                >
                  {/* 상태 배지 */}
                  <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold font-en border mt-0.5
                    ${cfg.color} ${cfg.bg} ${cfg.border}`}
                  >
                    <cfg.Icon size={10} />
                    {cfg.label}
                  </span>

                  {/* 제목 + 조건 */}
                  <div className="flex-1 min-w-0">
                    <p className="font-kr text-[13px] font-medium text-ink leading-tight">
                      {r.title}
                    </p>
                    <p className="font-kr text-[11px] text-[rgba(10,10,11,0.5)] mt-0.5 leading-tight line-clamp-2">
                      {r.condition}
                    </p>
                  </div>

                  {/* 토글 화살표 */}
                  <ChevronDown
                    size={14}
                    className={`flex-shrink-0 text-[rgba(10,10,11,0.3)] mt-0.5 transition-transform duration-200
                      ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* 펼쳐진 상세 */}
                {isOpen && (
                  <div className="px-5 pb-4 flex flex-col gap-3 bg-[rgba(10,10,11,0.02)]">

                    <DetailBlock label="현재 입력값" value={r.currentValue} />
                    <DetailBlock label="감지 내역" value={r.detail} />
                    <DetailBlock label="왜 문제인가" value={r.issueReason} tone={r.status === 'violation' ? 'alert' : 'default'} />
                    <DetailBlock label="수정 방법" value={r.fixInstruction || r.suggestion} tone="guide" />
                    <DetailBlock label="라벨 권장 문구" value={r.recommendedLabelText} tone="guide" />
                    <ActionItems items={r.actionItems} />

                    {(r.penaltyRange || r.legalBasis || r.regulation) && (
                      <div className="flex flex-col gap-1">
                        {r.penaltyRange && (
                          <p className="font-kr text-[11px] text-[rgba(10,10,11,0.5)]">
                            <span className="font-semibold text-[rgba(10,10,11,0.6)]">과태료</span>
                            {' '}
                            {r.penaltyRange}
                          </p>
                        )}
                        {(r.legalBasis || r.regulation) && (
                          <p className="font-kr text-[11px] text-[rgba(10,10,11,0.45)]">
                            <span className="font-semibold text-[rgba(10,10,11,0.5)]">근거 법령</span>
                            {' '}
                            {r.legalBasis || r.regulation}
                          </p>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── 스티키 하단 버튼 ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-[rgba(10,10,11,0.1)] px-5 py-4 bg-white">
          <button
            onClick={onEdit}
            className="w-full h-12 bg-ink text-white font-kr font-semibold text-[14px] hover:bg-[rgba(10,10,11,0.85)] transition-colors"
          >
            수정하기
          </button>
        </div>

      </div>
    </div>
  )
}
