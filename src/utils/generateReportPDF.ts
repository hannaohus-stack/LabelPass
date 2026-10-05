/**
 * 신고 준비 가이드 — PDF (결과물 디자인 v2, 2026-10-05)
 *
 * 구성안 A: 사업자 유형별 절차 → 준비 서류 → 신고서 항목 순서의 입력표 → 신고 전 확인사항 → 관련 링크.
 * - 식품제조·가공업: 품목제조보고서(식품위생법 시행규칙 별지 제43호서식, 2024.7.3 개정) 항목 순서
 * - 즉석판매제조·가공업: 영업신고 준비 (식약처 안내 기준 품목제조보고 대상 아님)
 * - 입력한 값은 그대로 반영하고, 수집하지 않는 항목은 "직접 입력"으로 표시한다
 * - 법제처 원문으로 확인한 것은 서식 · 시행규칙 제45조 조문뿐이다. 나머지(서류 · 시설 · 판매 방식)는 기관 안내(2차 자료)라
 *   문서 안에 "기관 안내 기준"으로 적고 링크를 붙인다.
 * 파일명: LabelPass_신고준비가이드_{제품명}_{YYYYMMDD}.pdf (한국 시간)
 */
import type { CreatorData } from '../pages/creator/types'
import type { ServiceTier } from './tierUtils'
import { buildSheetModel, type SheetCtx } from './labelSheet'
import {
  C, PdfWriter, createPdfDoc, downloadPdfArtifact, kstDate, kstStamp, safePdfName, saveDocAsArtifact,
  type DownloadablePdfArtifact,
} from './pdfCore'

interface Link { label: string; url: string; note?: string }

const law = (path: string) => encodeURI(`https://www.law.go.kr/${path}`)

const LINKS = {
  gov24License: { label: '정부24 — 식품관련영업신고', url: 'https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A09006&CappBizCD=14600000021&tp_seq=02', note: '즉석판매제조·가공업 · 식품제조·가공업 영업신고 안내와 온라인 신청' },
  gov24Report: { label: '정부24 — 식품, 식품첨가물의 품목제조보고', url: 'https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A06003&CappBizCD=14710000004&tp_seq=', note: '품목제조보고 안내와 온라인 신청' },
  foodsafety: { label: '식품안전나라 — 품목제조보고(신고) 안내', url: 'https://www.foodsafetykorea.go.kr/portal/popup_HG.html', note: '식품 영업자는 통합민원창구에서 품목제조보고 등 전자민원을 처리할 수 있어요' },
  form43: { label: '법제처 — 품목제조보고서(별지 제43호서식)', url: 'https://law.go.kr/flDownload.do?gubun=&flSeq=148421523&bylClsCd=110202', note: '2024.7.3 개정 서식. 이 가이드의 입력표는 이 서식의 칸 순서를 따랐어요' },
  rule45: { label: '법제처 — 식품위생법 시행규칙 제45조(품목제조보고 등)', url: law('법령/식품위생법시행규칙/제45조'), note: '보고 시기와 첨부서류' },
  act37: { label: '법제처 — 식품위생법 제37조(영업허가 등)', url: law('법령/식품위생법/제37조') },
  delivery: { label: '정책브리핑 — 즉석판매제조·가공업, 택배·퀵서비스 가능해진다', url: 'https://www.korea.kr/briefing/policyBriefingView.do?newsId=148785601', note: '2014.10.13 시행된 규칙 개정 안내' },
  exempt: { label: '식품저널 — 즉석판매제조·가공업 품목제조보고 · 판매 방법', url: 'https://www.foodnews.co.kr/news/articleView.html?idxno=67914', note: '식약처 답변을 인용한 기사예요. 즉석판매제조·가공업은 품목제조보고 대상이 아니라는 내용' },
} satisfies Record<string, Link>

interface BizGuide {
  title: string
  law: string
  portal: string
  steps: string[]
  docs: string[]
  docsNote: string
  warn: string
  links: Link[]
}

const BUSINESS_GUIDE: Record<string, BizGuide> = {
  '식품제조가공업': {
    title:  '식품제조·가공업 — 영업등록(신고) 확인과 품목제조보고',
    law:    '식품위생법 제37조제6항, 같은 법 시행규칙 제45조제1항 (품목제조보고서: 별지 제43호서식)',
    portal: '품목제조보고: 식품안전나라(통합민원창구) 또는 정부24 · 영업등록·신고: 관할 시·군·구청 또는 정부24',
    steps: [
      '관할 시·군·구청에 식품제조·가공업 영업등록 또는 영업신고가 되어 있는지 확인해요. 보고서에 영업등록번호를 적어야 해요.',
      '제품 생산을 시작하기 전, 또는 생산을 시작한 뒤 7일 이내에 품목제조보고서를 제출해요. (시행규칙 제45조제1항)',
      '아래 "준비 서류"를 갖춰요. 제조방법설명서와 소비기한 설정사유서는 보고서에 첨부해요.',
      '"신고서 입력표"의 순서대로 신고 화면에 옮겨 적고 제출해요.',
      '"요청하는 품목제조보고번호"가 이미 부여된 번호와 겹치지 않는지 확인해요. (서식 유의사항)',
      '품목제조보고번호가 나오면 라벨의 품목보고번호 칸에 적어요.',
    ],
    docs: [
      '제조방법설명서 1부',
      '소비기한 설정사유서 1부 (식약처장이 고시한 방법으로 설정)',
      '식품등의 한시적 기준 및 규격 검토서 — 한시적 기준 및 규격 인정 대상 식품에 한해요',
    ],
    docsNote: '위 3가지는 서식에 적힌 첨부서류예요. 정부24 안내에는 사업자등록증 등 다른 서류도 적혀 있으니, 신고 화면의 구비서류 안내를 함께 확인해 주세요.',
    warn: '원재료·배합비·포장재 등 보고한 내용이 바뀌면 변경 보고가 필요해요. 변경 보고 절차는 정부24·식품안전나라 안내를 확인해 주세요.',
    links: [LINKS.foodsafety, LINKS.gov24Report, LINKS.form43, LINKS.rule45, LINKS.act37, LINKS.gov24License],
  },
  '즉판가공업': {
    title:  '즉석판매제조·가공업 — 영업신고 준비',
    law:    '식품위생법 제37조제4항, 같은 법 시행규칙 제42조 (영업신고서: 별지 제37호서식)',
    portal: '영업신고: 관할 시·군·구청(위생 담당 부서) 또는 정부24',
    steps: [
      '영업장 건축물 용도와 시설 기준을 관할 시·군·구청에 미리 확인해요.',
      '아래 "준비 서류"를 갖춰요.',
      '관할 시·군·구청을 방문하거나 정부24에서 온라인으로 영업신고서를 제출해요.',
      '신고 수수료와 처리 기간은 기관마다 다르게 안내돼요. 신고 화면의 안내를 따라 주세요.',
      '식약처 답변에 따르면 즉석판매제조·가공업은 품목제조보고 대상이 아니에요. 다만 관할 시·군·구청에서 별도로 요청하면 그 안내를 따라 주세요.',
    ],
    docs: [
      '식품 영업 신고서(별지 제37호서식)',
      '위생교육필증',
      '건강진단결과서(보건증)',
      '제조·가공하려는 식품의 종류 및 제조방법 설명서',
      '영업장 사용 증빙(임대차계약서 등)',
    ],
    docsNote: '서류 목록은 지자체 보건소·정부24 안내를 정리한 것이에요. 지하수나 LPG를 쓰면 추가 서류가 필요할 수 있고, 지자체마다 다를 수 있어요.',
    warn: '판매 방법: 영업장에서 최종소비자에게 직접 팔거나, 직접 배달·우편·택배로 최종소비자에게 보낼 수 있어요. 판매를 목적으로 하는 사람(재판매·유통업자)에게 파는 것은 할 수 없어요. 온라인 판매는 영업자 본인이 판매자일 때 가능하다고 안내돼요.',
    links: [LINKS.gov24License, LINKS.exempt, LINKS.delivery, LINKS.foodsafety],
  },
}

const FOOTER = '이 가이드는 입력한 내용을 신고 항목에 맞춰 정리한 참고 자료입니다. 신고 절차·서식·서류는 기관 안내가 우선하며, 법적 효력이 없습니다.'

const DIRECT = '직접 입력'

export async function createReportPDFArtifact(data: CreatorData, _tier: ServiceTier = 'tier2', ctx: SheetCtx = {}): Promise<DownloadablePdfArtifact> {
  const m = buildSheetModel(data, ctx)
  const filename = `LabelPass_신고준비가이드_${safePdfName(m.productName)}_${kstStamp()}.pdf`
  const guide = BUSINESS_GUIDE[data.businessType] ?? null
  const isMfg = data.businessType === '식품제조가공업'

  const sortedIng = [...data.ingredients].filter(i => i.name.trim()).sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const totalW = sortedIng.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0)
  const ingredientRows = sortedIng.map(i => {
    const wgt = parseFloat(i.weight) || 0
    return [i.name, i.origin || '미입력', wgt ? `${wgt}${data.unit}` : '미입력', totalW > 0 ? `${(wgt / totalW * 100).toFixed(1)}%` : '—']
  })

  const reportNo = data.reportNumber || ''
  const reportSub = data.reportNumber ? '이미 번호가 있다면 그대로 적어요'
    : data.reportNumberStatus === 'exists' ? '보유로 입력했지만 번호가 없어요. 신고증의 번호를 적어 주세요'
      : '신규 보고라면 원하는 번호를 적고, 이미 부여된 번호와 겹치는지 확인해요'

  const expiry = data.expiryDate ? data.expiryDate.replace(/-/g, '.') : ''
  const nut = m.nutrition
  const nutritionV = nut.exempt
    ? '영양성분 표시 생략(면제 선택)'
    : nut.rows.filter(r => !r.missing).map(r => `${r.k} ${r.v}`).join(', ')

  const doc = await createPdfDoc()
  const w = new PdfWriter(doc, {
    header: '신고 준비 가이드',
    headerRight: m.reviewId ? `검토번호 ${m.reviewId}` : undefined,
    footer: FOOTER,
  })

  w.title(guide ? `신고 준비 가이드 — ${isMfg ? '품목제조보고' : '영업신고'}` : '신고 준비 가이드',
    [m.productName, m.businessLabel, m.reviewId && `검토번호 ${m.reviewId}`, `작성 ${kstDate(m.reviewedAt)}`].filter(Boolean).join('  ·  '))

  w.note('라벨 검토에 입력한 내용을 신고에 쓸 수 있게 정리했어요. 절차 → 준비 서류 → 입력표 순서로 보시고, 신고 화면을 열어 둔 채 입력표를 보며 옮겨 적으면 돼요. "미입력"과 "직접 입력"은 신고 전에 채워야 하는 칸이에요.', {
    bg: C.infoBg, border: '#C9D6EE', color: C.info, size: 8.6,
  })

  // ── 절차 ──
  w.section('신고 절차', guide ? m.businessLabel : '사업자 유형 미입력')
  if (guide) {
    w.kv([
      { k: '해야 할 신고', v: guide.title },
      { k: '근거', v: guide.law },
      { k: '신고 창구', v: guide.portal },
    ], { labelW: 30 })
    w.steps(guide.steps)
    w.note(guide.warn, { title: '주의', bg: C.warnBg, border: '#E8D29A', color: C.warn, size: 8.6 })
  } else {
    w.text('사업자 유형을 입력하면 유형에 맞는 신고 절차가 표시돼요.', { size: 9, color: C.faint, after: 2 })
  }

  // ── 준비 서류 ──
  if (guide) {
    w.section('준비 서류', isMfg ? '품목제조보고 첨부' : '영업신고 구비')
    w.bullets(guide.docs, { size: 9 })
    w.text(guide.docsNote, { size: 8, color: C.faint, after: 1 })
  }

  // ── 입력표 ──
  if (isMfg) {
    w.section('품목제조보고서 입력표', '별지 제43호서식 칸 순서')
    w.kv([
      { k: '보고인', v: DIRECT, sub: '성명 · 생년월일(법인등록번호) · 주소 · 전화번호 · 휴대전화. 라벨 검토에서는 받지 않아요' },
      { k: '영업소 명칭(상호)', v: data.manufacturer },
      { k: '영업등록번호', v: DIRECT, sub: '영업등록증(신고증)에 적힌 번호예요' },
      { k: '영업소 소재지', v: data.manufacturerAddress, sub: '영업등록증(신고증)에 적힌 대로 똑같이 적어요' },
      { k: '식품의 유형', v: m.foodType },
      { k: '요청하는 품목제조보고번호', v: reportNo, sub: reportSub },
      { k: '제품명', v: m.productName },
      {
        k: '소비기한', v: DIRECT,
        sub: `"제조일부터 ○일(월·년)"처럼 기간으로 적어요.${expiry ? ` 라벨에 입력한 소비기한은 ${expiry}까지예요. 날짜가 아니라 제조일부터의 기간이에요.` : ''} 설정 근거는 소비기한 설정사유서로 첨부해요`,
      },
      { k: '원재료명 또는 성분명 및 배합비율', v: sortedIng.length ? `${sortedIng.length}개 — 아래 표 참고` : '', sub: '배합비율 칸에는 식품공전에 사용기준이 정해진 원재료·성분만 적어요(서식 유의사항)' },
      { k: '용도 · 용법', v: DIRECT, sub: '예: 그대로 섭취 / 가열 후 섭취 등 제품에 맞게 적어요' },
      { k: '보관방법 및 포장재질', v: [data.storage, m.materials.join(', ')].filter(Boolean).join(' / ') },
      { k: '포장방법 및 포장단위', v: DIRECT, sub: `내용량은 ${m.amount || '미입력'}이에요. 포장 방식(예: 유리병 밀봉)과 함께 적어요` },
      { k: '성상', v: DIRECT, sub: '제품의 모양·상태를 적어요(예: 반고형 등)' },
      { k: '위탁생산 여부', v: DIRECT, sub: '"예"라면 수탁 영업소의 명칭·소재지·영업의 종류와 위탁제조공정도 적어요' },
      { k: '품목의 특성', v: DIRECT, sub: '예·아니오로 체크해요: 고열량·저영양 식품 / 영유아용 표시 / 고령친화식품 표시 / 대체식품 표시 / 기능성표시식품 / 살균·멸균 제품 / 영양성분 표시의무 식품' },
    ], { labelW: 46 })

    w.section('영양성분', nut.exempt ? '표시 생략(면제 선택)' : '서식 뒤쪽 2번')
    if (nut.exempt) {
      w.text('영양성분 표시를 생략하는 것으로 입력했어요. 서식에서는 "영양성분 표시의무 식품에 해당하는지"에 "예"라고 체크한 경우에만 영양성분을 적어요.', { size: 9, color: C.faint, after: 2 })
    } else {
      w.text('서식에서는 "영양성분 표시의무 식품"에 "예"라고 체크한 경우에만 적어요. 내용량 기준은 총 내용량당 / 100(g 또는 mL)당 / 단위 내용량당 중 하나를 골라요. 입력한 1회 제공량 기준은 "단위 내용량당"에 맞아요.', { size: 8.4, color: C.faint, after: 1.5 })
      w.kv([
        { k: '내용량 방식', v: '단위 내용량당', sub: '이 방식은 총 내용량과 단위 내용량을 모두 적어요' },
        { k: '총 내용량', v: m.amount },
        { k: '단위 내용량', v: nut.serving ? nut.serving.replace('1회 제공량 ', '') : '' },
        { k: '영양성분', v: nutritionV },
      ], { labelW: 36 })
    }

    w.section('원재료명 및 배합비율', sortedIng.length ? `${sortedIng.length}개 · 배합비율 높은 순` : '')
    if (ingredientRows.length) {
      w.table(['원재료명', '원산지', '투입량', '배합비'], ingredientRows, [w.contentW - 40 - 30 - 24, 40, 30, 24], { align: ['left', 'left', 'right', 'right'] })
      w.text('배합비는 입력한 투입량으로 계산한 참고값이에요. 신고서에는 식품공전에 사용기준이 정해진 원재료·성분만 적고, 나머지 원재료의 기재 방법은 신고 화면의 안내를 따라 주세요.', { size: 8, color: C.faint, after: 1 })
    } else {
      w.text('입력된 원재료가 없어요.', { size: 9, color: C.faint, after: 2 })
    }
  } else if (guide) {
    w.section('영업신고에 쓸 정보', '입력한 내용 기준')
    w.kv([
      { k: '영업자 정보', v: DIRECT, sub: '성명 · 생년월일 · 주소 · 연락처. 라벨 검토에서는 받지 않아요' },
      { k: '영업소 명칭(상호)', v: data.manufacturer },
      { k: '영업소 소재지', v: data.manufacturerAddress },
      { k: '제조·가공할 식품의 종류', v: m.foodType, sub: `품목: ${m.productName || '미입력'}` },
      { k: '제조방법 설명서', v: DIRECT, sub: '원재료와 만드는 순서를 정리해 첨부해요. 아래 원재료 표를 참고하세요' },
      { k: '영업장 사용 증빙', v: DIRECT, sub: '임대차계약서 등' },
    ], { labelW: 40 })
    w.text('신고서의 칸 이름과 순서는 신고 화면(정부24 또는 시·군·구청 서식)을 기준으로 해 주세요. 이 표는 입력한 내용을 정리한 것이에요.', { size: 8, color: C.faint, after: 1 })

    w.section('제조방법 설명서 참고', sortedIng.length ? `${sortedIng.length}개 원재료 · 배합비율 높은 순` : '')
    if (ingredientRows.length) {
      w.table(['원재료명', '원산지', '투입량', '배합비'], ingredientRows, [w.contentW - 40 - 30 - 24, 40, 30, 24], { align: ['left', 'left', 'right', 'right'] })
    } else {
      w.text('입력된 원재료가 없어요.', { size: 9, color: C.faint, after: 2 })
    }
  }

  // ── 신고 전 확인 ──
  w.section('신고 전에 확인할 것', '')
  w.bullets([
    '영업소 명칭·소재지는 영업등록증(신고증)에 적힌 대로 똑같이 적어 주세요.',
    '원재료명은 식품공전 명칭으로, 복합원재료는 구성 원재료까지 적어야 할 수 있어요.',
    '이 가이드의 서류·판매 방식 안내 중 일부는 기관 안내와 기사를 정리한 거예요. 제출 전에 아래 링크의 최신 안내를 한 번 더 확인해 주세요.',
    '절차·서식·수수료는 바뀔 수 있어요. 신고 화면의 안내가 우선이에요.',
  ], { size: 8.6, color: C.faint })

  // ── 관련 링크 ──
  w.section('관련 링크', '눌러서 열 수 있어요')
  w.links(guide ? guide.links : [LINKS.gov24License, LINKS.gov24Report, LINKS.foodsafety])

  return saveDocAsArtifact(w.finish(), filename)
}

export async function generateReportPDF(data: CreatorData, tier: ServiceTier = 'tier2', ctx: SheetCtx = {}): Promise<void> {
  downloadPdfArtifact(await createReportPDFArtifact(data, tier, ctx))
}
