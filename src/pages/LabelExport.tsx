import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { FileDown, Loader2, ChevronLeft, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import type { Ingredient } from '../utils/parsing'
import { calculateRatios } from '../utils/parsing'
import type { Metadata } from './ReviewResult'
import { analyzeRegulations, type RegulationResult } from './ReviewResult'

// ─── HTML 템플릿 생성 ──────────────────────────────────────────────────────────

function generateHtml(
  ingredients: Ingredient[],
  metadata: Metadata,
  results: RegulationResult[],
): string {
  const date = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })

  const withRatios = calculateRatios(ingredients)
  const totalIngW  = withRatios.reduce((s, i) => s + i.weight, 0)

  const counts = {
    violation: results.filter(r => r.status === 'violation').length,
    warn:      results.filter(r => r.status === 'warn').length,
    pass:      results.filter(r => r.status === 'pass').length,
  }

  const maxPenalty = results
    .filter(r => r.status !== 'pass')
    .reduce((s, r) => {
      const n = r.penaltyRange.match(/\d+/g)?.map(Number) ?? []
      return s + (n.length ? Math.max(...n) : 0)
    }, 0)

  const statusCfg: Record<RegulationResult['status'], { bg: string; text: string; label: string }> = {
    violation: { bg: '#FFE6E6', text: '#B30000', label: '위반' },
    warn:      { bg: '#FFF3DC', text: '#8A5A00', label: '경고' },
    pass:      { bg: '#F0FDF4', text: '#15803D', label: '통과' },
  }

  const sevCfg: Record<RegulationResult['severity'], { bg: string; text: string; label: string }> = {
    red:    { bg: '#FFE6E6', text: '#B30000', label: 'HIGH' },
    yellow: { bg: '#FFF3DC', text: '#8A5A00', label: 'MID'  },
  }

  const chip = (s: RegulationResult['status']) => {
    const c = statusCfg[s]
    return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;background:${c.bg};color:${c.text};font-size:10px;font-weight:600;">${c.label}</span>`
  }

  const sevChip = (s: RegulationResult['severity']) => {
    const c = sevCfg[s]
    return `<span style="display:inline-block;padding:2px 6px;background:${c.bg};color:${c.text};font-size:9px;font-weight:700;letter-spacing:0.08em;">${c.label}</span>`
  }

  const borderLeft = (r: RegulationResult) =>
    r.status === 'violation' ? '3px solid #B30000'
    : r.status === 'warn'    ? '3px solid #F0A500'
    : '3px solid #15803D'

  const ingredientRows = withRatios.map((ing, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">
      <td style="padding:7px 10px;border:1px solid #e5e5e5;font-weight:500;">
        ${ing.name}${ing.rawName !== ing.name ? `<br><span style="font-size:9px;color:#999;">(${ing.rawName})</span>` : ''}
      </td>
      <td style="padding:7px 10px;border:1px solid #e5e5e5;text-align:center;">${ing.weight}</td>
      <td style="padding:7px 10px;border:1px solid #e5e5e5;text-align:center;">${ing.percentage}%</td>
      <td style="padding:7px 10px;border:1px solid #e5e5e5;text-align:center;">${ing.isAllergen ? '<span style="color:#B30000;font-weight:700;">●</span>' : '<span style="color:#bbb;">—</span>'}</td>
      <td style="padding:7px 10px;border:1px solid #e5e5e5;text-align:center;">${ing.isComposite ? '<span style="color:#8A5A00;font-weight:700;">●</span>' : '<span style="color:#bbb;">—</span>'}</td>
    </tr>`).join('')

  const regulationRows = results.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};border-left:${borderLeft(r)};">
      <td style="padding:7px 8px;border:1px solid #e5e5e5;text-align:center;color:#999;font-size:10px;">${r.id}</td>
      <td style="padding:7px 8px;border:1px solid #e5e5e5;text-align:center;">${sevChip(r.severity)}</td>
      <td style="padding:7px 8px;border:1px solid #e5e5e5;font-weight:500;">
        ${r.title}
        ${r.status !== 'pass' ? `<div style="font-size:9.5px;color:#666;margin-top:2px;line-height:1.4;">${r.detail}</div>` : ''}
      </td>
      <td style="padding:7px 8px;border:1px solid #e5e5e5;text-align:center;">${chip(r.status)}</td>
      <td style="padding:7px 8px;border:1px solid #e5e5e5;text-align:center;font-size:10px;color:${r.status === 'violation' ? '#B30000' : r.status === 'warn' ? '#8A5A00' : '#bbb'};">${r.status !== 'pass' ? r.penaltyRange : '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8"/>
  <title>KRK 법규 검토 보고서 — ${metadata.productName}</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/variable/pretendardvariable.css"/>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo',
                   'Noto Sans KR', sans-serif;
      font-size: 12px;
      color: #0A0A0B;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm 18mm;
      margin: 0 auto;
    }

    h2 {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(10,10,11,0.35);
      margin-bottom: 12px;
    }

    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th {
      padding: 7px 8px;
      background: #f4f4f5;
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 0.04em;
      color: rgba(10,10,11,0.55);
      border: 1px solid #e5e5e5;
    }

    .divider { border: none; border-top: 1px solid rgba(10,10,11,0.1); margin: 22px 0; }

    @media print {
      body { margin: 0; }
      .page { padding: 15mm 14mm; }
      .no-print { display: none; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

<!-- 인쇄 버튼 (화면 전용) -->
<div class="no-print" style="position:sticky;top:0;z-index:99;background:#002D72;padding:10px 24px;display:flex;align-items:center;justify-content:space-between;">
  <span style="color:#fff;font-size:13px;font-weight:600;letter-spacing:0.12em;">KRK 법규 검토 보고서</span>
  <button onclick="window.print()" style="background:#0CA4F9;color:#fff;border:none;padding:8px 20px;font-size:12px;font-weight:600;cursor:pointer;letter-spacing:0.04em;">
    PDF 저장
  </button>
</div>

<div class="page">

  <!-- 헤더 -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
    <div>
      <div style="font-size:15px;font-weight:800;letter-spacing:0.18em;margin-bottom:8px;">
        krk<span style="color:#0CA4F9;">.</span>team
      </div>
      <div style="font-size:22px;font-weight:500;letter-spacing:-0.02em;">법규 검토 보고서</div>
    </div>
    <div style="text-align:right;font-size:11px;color:rgba(10,10,11,0.45);line-height:1.7;">
      <div>검토일: ${date}</div>
      <div>기준: 식품등의 표시기준 (식약처)</div>
      <div>총 ${results.length}개 항목 검토</div>
    </div>
  </div>

  <hr class="divider" style="margin-top:0;">

  <!-- 제품 정보 -->
  <div style="margin-bottom:22px;">
    <h2>제품 정보</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 32px;font-size:12px;">
      <div><span style="color:rgba(10,10,11,0.4);margin-right:6px;">제품명</span><strong>${metadata.productName || '—'}</strong></div>
      <div><span style="color:rgba(10,10,11,0.4);margin-right:6px;">내용량</span><strong>${metadata.totalWeight ? metadata.totalWeight + metadata.unit : '—'}</strong></div>
      <div><span style="color:rgba(10,10,11,0.4);margin-right:6px;">소비기한</span><strong>${metadata.expiryDays ? metadata.expiryDays + '일' : '—'}</strong></div>
      <div><span style="color:rgba(10,10,11,0.4);margin-right:6px;">보관방법</span><strong>${metadata.storage || '—'}</strong></div>
      <div style="grid-column:1/-1;"><span style="color:rgba(10,10,11,0.4);margin-right:6px;">제조업소</span><strong>${metadata.manufacturer || '—'}</strong></div>
    </div>
  </div>

  <hr class="divider">

  <!-- 리스크 요약 -->
  <div style="margin-bottom:22px;">
    <h2>리스크 요약</h2>
    <div style="display:flex;gap:10px;margin-bottom:12px;">
      <div style="flex:1;padding:14px 16px;border:1px solid #B30000;background:#FFE6E6;">
        <div style="font-size:30px;font-weight:700;color:#B30000;line-height:1;">${counts.violation}</div>
        <div style="font-size:11px;color:rgba(10,10,11,0.55);margin-top:5px;">위반</div>
      </div>
      <div style="flex:1;padding:14px 16px;border:1px solid #F0A500;background:#FFF3DC;">
        <div style="font-size:30px;font-weight:700;color:#8A5A00;line-height:1;">${counts.warn}</div>
        <div style="font-size:11px;color:rgba(10,10,11,0.55);margin-top:5px;">경고</div>
      </div>
      <div style="flex:1;padding:14px 16px;border:1px solid #15803D;background:#F0FDF4;">
        <div style="font-size:30px;font-weight:700;color:#15803D;line-height:1;">${counts.pass}</div>
        <div style="font-size:11px;color:rgba(10,10,11,0.55);margin-top:5px;">통과</div>
      </div>
    </div>
    ${maxPenalty > 0 ? `
    <div style="padding:10px 14px;background:#FFF8F8;border:1px solid #B30000;border-left-width:4px;">
      <span style="font-weight:600;color:#B30000;">예상 최대 과태료 ${maxPenalty.toLocaleString()}만원</span>
      <span style="color:rgba(10,10,11,0.5);margin-left:8px;font-size:11px;">위반·경고 항목 과태료 최대값 합산 기준</span>
    </div>` : ''}
  </div>

  <hr class="divider">

  <!-- 원재료 목록 -->
  <div style="margin-bottom:22px;">
    <h2>원재료 목록 (${ingredients.length}개)</h2>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;">원재료명</th>
          <th style="text-align:center;width:70px;">중량(g)</th>
          <th style="text-align:center;width:65px;">비율(%)</th>
          <th style="text-align:center;width:70px;">알레르기</th>
          <th style="text-align:center;width:75px;">복합원재료</th>
        </tr>
      </thead>
      <tbody>${ingredientRows}</tbody>
      <tfoot>
        <tr style="background:#f4f4f5;">
          <td style="padding:7px 10px;border:1px solid #e5e5e5;font-weight:600;font-size:10px;color:rgba(10,10,11,0.55);">합계</td>
          <td style="padding:7px 10px;border:1px solid #e5e5e5;text-align:center;font-weight:600;">${totalIngW}</td>
          <td style="padding:7px 10px;border:1px solid #e5e5e5;text-align:center;">100%</td>
          <td colspan="2" style="border:1px solid #e5e5e5;"></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <hr class="divider">

  <!-- 법규 검토 결과 -->
  <div style="margin-bottom:22px;">
    <h2>법규 검토 결과 (18개 항목)</h2>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:32px;">No.</th>
          <th style="text-align:center;width:72px;">심각도</th>
          <th style="text-align:left;">항목 / 감지 내역</th>
          <th style="text-align:center;width:56px;">결과</th>
          <th style="text-align:center;width:90px;">과태료</th>
        </tr>
      </thead>
      <tbody>${regulationRows}</tbody>
    </table>
  </div>

  <!-- 면책 문구 -->
  <div style="border-top:1px solid rgba(10,10,11,0.1);padding-top:14px;font-size:9.5px;color:rgba(10,10,11,0.3);line-height:1.6;">
    이 보고서는 입력된 정보를 바탕으로 한 참고용 분석이며 법적 효력이 없습니다.
    정확한 법규 해석은 관할 지자체 또는 식품의약품안전처에 문의하세요.
    krk.team — Zero Risk, Pure Success.
  </div>

</div>
</body>
</html>`
}

// ─── 다운로드 (private — 외부 export 없음) ────────────────────────────────────

function exportToPDF(ingredients: Ingredient[], metadata: Metadata): void {
  const results  = analyzeRegulations(ingredients, metadata)
  const html     = generateHtml(ingredients, metadata, results)
  const blob     = new Blob([html], { type: 'text/html; charset=utf-8' })
  const url      = URL.createObjectURL(blob)
  const safeName = (metadata.productName || '제품').replace(/[\s/\\]/g, '_')
  const dateStr  = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const a = document.createElement('a')
  a.href = url
  a.download = `KRK_법규검토_${safeName}_${dateStr}.html`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

// ─── 내보내기 페이지 ───────────────────────────────────────────────────────────

export default function LabelExport() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)

  // 라우터 state 가드 — 직접 접근 시 홈으로
  const state = location.state as { ingredients: Ingredient[]; metadata: Metadata } | null
  if (!state?.ingredients || !state?.metadata) return <Navigate to="/" replace />

  const { ingredients, metadata } = state
  const results = analyzeRegulations(ingredients, metadata)

  const counts = {
    violation: results.filter(r => r.status === 'violation').length,
    warn:      results.filter(r => r.status === 'warn').length,
    pass:      results.filter(r => r.status === 'pass').length,
  }

  const maxPenalty = results
    .filter(r => r.status !== 'pass')
    .reduce((s, r) => {
      const n = r.penaltyRange.match(/\d+/g)?.map(Number) ?? []
      return s + (n.length ? Math.max(...n) : 0)
    }, 0)

  const handleDownload = () => {
    setLoading(true)
    exportToPDF(ingredients, metadata)
    setTimeout(() => setLoading(false), 500)
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── 네비게이션 ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-16 py-[18px] bg-white/80 backdrop-blur-[18px] border-b border-[rgba(10,10,11,0.08)]">
        <button
          onClick={() => navigate('/')}
          className="flex items-baseline gap-[5px] hover:opacity-70 transition-opacity"
        >
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} className="font-bold text-[15px] tracking-[0.04em] text-[#0A0A0B]">krk</span>
          <span className="font-en font-light text-[15px] tracking-[0.14em] text-[#0A0A0B]">check</span>
        </button>
        <div className="hidden md:flex items-center gap-0 font-en text-[11px] tracking-[0.1em] uppercase">
          {[
            { label: '원재료 입력', done: true },
            { label: '법규 검토',   done: true },
            { label: '내보내기',    done: false, active: true },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center">
              <div className={`flex items-center gap-2 ${s.active ? 'text-ink' : s.done ? 'text-breath-500' : 'text-[rgba(10,10,11,0.3)]'}`}>
                <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold border ${
                  s.done   ? 'bg-breath-500 border-breath-500 text-white' :
                  s.active ? 'bg-ink border-ink text-white' :
                  'border-[rgba(10,10,11,0.2)]'}`}>
                  {s.done ? '✓' : i + 1}
                </span>
                <span>{s.label}</span>
              </div>
              {i < arr.length - 1 && <span className="mx-4 text-[rgba(10,10,11,0.2)]">—</span>}
            </div>
          ))}
        </div>
        <div className="font-en text-[11px] text-[rgba(10,10,11,0.35)] tracking-[0.08em]">MVP v1</div>
      </nav>

      {/* ── 본문 ─────────────────────────────────────────────────────────────── */}
      <main className="pt-[72px] min-h-screen flex flex-col">
        <div className="flex-1 max-w-[760px] mx-auto w-full px-6 md:px-0 py-12 md:py-16">

          {/* 섹션 헤더 */}
          <div className="mb-10 pb-5 border-b border-[rgba(10,10,11,0.1)]">
            <div className="font-en text-[11px] font-semibold text-[rgba(10,10,11,0.35)] uppercase tracking-[0.16em] mb-2">
              03 — 내보내기
            </div>
            <h1 className="font-en font-medium text-[clamp(24px,3.5vw,36px)] tracking-[-0.02em] leading-[1.1]">
              보고서를<br />다운로드하세요.
            </h1>
          </div>

          <div className="flex flex-col gap-8">

            {/* 검토 결과 요약 카드 */}
            <div className="border border-[rgba(10,10,11,0.1)] p-6 flex flex-col gap-5">
              <div>
                <div className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.35)] uppercase tracking-[0.1em] mb-1">제품</div>
                <p className="font-kr font-semibold text-[16px] text-ink">{metadata.productName || '—'}</p>
                <p className="font-kr text-[12px] text-[rgba(10,10,11,0.45)] mt-0.5">
                  {metadata.totalWeight}{metadata.unit} · 소비기한 {metadata.expiryDays}일 · {metadata.storage}
                </p>
              </div>

              <div className="border-t border-[rgba(10,10,11,0.08)] pt-5 grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-[#B30000]" />
                    <span className="font-en text-[11px] font-semibold text-[#B30000] uppercase tracking-[0.06em]">위반</span>
                  </div>
                  <span className="font-en font-bold text-[28px] text-[#B30000] tabular-nums leading-none">{counts.violation}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={12} className="text-[#8A5A00]" />
                    <span className="font-en text-[11px] font-semibold text-[#8A5A00] uppercase tracking-[0.06em]">경고</span>
                  </div>
                  <span className="font-en font-bold text-[28px] text-[#8A5A00] tabular-nums leading-none">{counts.warn}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-[#15803D]" />
                    <span className="font-en text-[11px] font-semibold text-[#15803D] uppercase tracking-[0.06em]">통과</span>
                  </div>
                  <span className="font-en font-bold text-[28px] text-[#15803D] tabular-nums leading-none">{counts.pass}</span>
                </div>
              </div>

              {maxPenalty > 0 && (
                <div className="border-t border-[rgba(10,10,11,0.08)] pt-4">
                  <span className="font-en text-[12px] text-[rgba(10,10,11,0.45)]">예상 최대 과태료 </span>
                  <span className="font-en font-semibold text-[13px] text-[#B30000]">{maxPenalty.toLocaleString()}만원</span>
                </div>
              )}
            </div>

            {/* 다운로드 안내 */}
            <div className="bg-[rgba(10,10,11,0.02)] border border-[rgba(10,10,11,0.07)] px-5 py-4 flex flex-col gap-2">
              <div className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.35)] uppercase tracking-[0.1em]">다운로드 안내</div>
              <ol className="flex flex-col gap-1.5">
                {[
                  'HTML 보고서 파일이 자동으로 다운로드됩니다.',
                  '다운로드된 파일을 Chrome에서 열어주세요.',
                  '상단 "PDF 저장" 버튼을 클릭하면 프린트 다이얼로그가 열립니다.',
                  '"PDF로 저장"을 선택하여 저장하세요.',
                ].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 font-kr text-[12px] text-[rgba(10,10,11,0.6)]">
                    <span className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.3)] mt-0.5 flex-shrink-0">{i + 1}.</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>

            {/* 다운로드 버튼 */}
            <button
              onClick={handleDownload}
              disabled={loading}
              className="btn-heritage w-full flex items-center justify-center gap-3 h-14 text-[14px]"
            >
              {loading
                ? <Loader2 size={16} className="animate-spin" />
                : <FileDown size={16} />}
              {loading ? 'HTML 생성 중...' : 'HTML 보고서 다운로드'}
            </button>

            {/* 하단 버튼 */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => navigate('/review', { state })}
                className="btn-ghost flex items-center gap-2"
              >
                <ChevronLeft size={14} />
                검토 결과로 돌아가기
              </button>
              <button
                onClick={() => navigate('/', { replace: true })}
                className="font-en text-[12px] text-[rgba(10,10,11,0.4)] hover:text-ink transition-colors"
              >
                홈으로
              </button>
            </div>

          </div>
        </div>

        {/* 하단 면책 문구 */}
        <footer className="border-t border-[rgba(10,10,11,0.06)] px-6 py-5 text-center">
          <p className="font-en text-[11px] text-[rgba(10,10,11,0.3)] leading-[1.6]">
            krk.team이 제공하는 검토 결과 및 과태료 금액은 참고용 정보이며, 법적 효력이 없습니다.
            정확한 법규 해석은 관할 지자체 또는 식약처에 문의하세요.
          </p>
        </footer>
      </main>
    </div>
  )
}
