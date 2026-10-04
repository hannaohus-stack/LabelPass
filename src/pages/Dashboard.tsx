/**
 * 마이페이지 (시안 app_dashboard_v1.0) — 내 검사 · 결제 내역 · 계정
 * 기록: label_reviews (무료 결과 status=reviewed / 결제 status=paid, metadata.reviewId로 묶음)
 * 작성 중: 이 브라우저에 임시 저장된 입력(lp_creator_draft)
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AppHeader from '../components/lp/AppHeader'
import { supabase, getLabelReviews, type LabelReviewRow } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { getActiveRegulationUpdate } from '../utils/data/regulationUpdates'
import type { Ingredient } from '../utils/parsing'
import { analyzeRegulations, type Metadata } from './ReviewResult'
import type { CreatorData } from './creator/types'
import { countResults, fmtDate, won, type ReviewState, type ServiceType } from '../lib/review'

const DRAFT_KEY = 'lp_creator_draft'
const NOTICE_STORAGE_KEY = 'lp_regulation_notice'
const STEP_NAMES = ['제품 정보', '원재료 · 포장재', '영양성분', '입력 확인']

type Tab = 'all' | 'paid' | 'free' | 'draft'

interface Job {
  key: string
  kind: 'paid' | 'free' | 'draft'
  service?: ServiceType
  name: string
  sub: string
  date: string
  counts?: { need: number; warn: number; ok: number }
  state?: ReviewState
  test?: boolean
  draftStep?: number
}

function isIngredientList(value: unknown): value is Ingredient[] {
  return Array.isArray(value) && value.every(item =>
    item && typeof item === 'object' && typeof (item as Ingredient).id === 'string' && typeof (item as Ingredient).name === 'string')
}

const subLine = (m: Partial<Metadata>, cats: string[]) =>
  [(m.categories ?? cats).map(c => c.replace(/\//g, ' · ')).join(', '), m.totalWeight ? `${m.totalWeight}${m.unit ?? ''}` : ''].filter(Boolean).join(' · ')

function rowCounts(row: LabelReviewRow, state?: ReviewState) {
  const saved = (row.results ?? []) as { status?: string }[]
  if (saved.length > 0 && saved.every(r => typeof r.status === 'string')) return countResults(saved as { status: 'violation' | 'warn' | 'pass' }[])
  if (!state) return undefined
  try { return countResults(analyzeRegulations(state.ingredients, state.metadata)) } catch { return undefined }
}

function rowState(row: LabelReviewRow): ReviewState | undefined {
  const meta = (row.metadata ?? {}) as Partial<Metadata> & { reviewId?: string; reviewedAt?: string; creatorData?: CreatorData | null }
  if (!isIngredientList(row.ingredients) || row.ingredients.length === 0) return undefined
  const { reviewId, reviewedAt, creatorData, ...rest } = meta
  const metadata = {
    productName: row.product_name, totalWeight: '', unit: 'g', expiryDays: '', storage: '', manufacturer: '',
    categories: row.categories, ...rest,
  } as Metadata
  return { ingredients: row.ingredients, metadata, creatorData: creatorData ?? undefined, reviewId: reviewId ?? row.id, reviewedAt: reviewedAt ?? row.created_at }
}

function buildJobs(rows: LabelReviewRow[]): Job[] {
  const groups = new Map<string, LabelReviewRow[]>()
  for (const r of rows) {
    const id = ((r.metadata ?? {}) as { reviewId?: string }).reviewId ?? r.id
    groups.set(id, [...(groups.get(id) ?? []), r])
  }
  const jobs: Job[] = []
  groups.forEach((list, key) => {
    const paid = list.find(r => r.status === 'paid')
    const row = paid ?? list[0]
    const state = rowState(row)
    const meta = (row.metadata ?? {}) as Partial<Metadata> & { testMode?: boolean; paidAt?: string }
    jobs.push({
      key,
      kind: paid ? 'paid' : 'free',
      service: paid ? (paid.tier === 'tier1' ? 'basic' : 'pro') : undefined,
      name: row.product_name,
      sub: subLine(meta, row.categories),
      date: meta.paidAt ?? row.created_at,
      counts: rowCounts(row, state),
      state,
      test: Boolean(meta.testMode),
    })
  })
  return jobs.sort((a, b) => b.date.localeCompare(a.date))
}

function readDraftJob(): Job | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as { step?: number; data?: Partial<CreatorData> }
    if (!d.data?.productName?.trim()) return null
    const step = Math.min(Math.max(d.step ?? 1, 1), 4)
    return {
      key: 'draft',
      kind: 'draft',
      name: d.data.productName,
      sub: (d.data.categories ?? []).map(c => c.replace(/\//g, ' · ')).join(', '),
      date: new Date().toISOString(),
      draftStep: step,
    }
  } catch { return null }
}

function noticeHiddenFor(id?: string) {
  if (!id) return true
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTICE_STORAGE_KEY) ?? '{}') as Record<string, { dismissedAt?: string; snoozedUntil?: string }>
    const s = parsed[id]
    return Boolean(s?.dismissedAt || (s?.snoozedUntil && new Date(s.snoozedUntil).getTime() > Date.now()))
  } catch { return false }
}

const IC: Record<Job['kind'], { cls: string }> = { paid: { cls: 'ic-p' }, free: { cls: 'ic-f' }, draft: { cls: 'ic-f' } }

export default function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const user = session?.user
  const notice = getActiveRegulationUpdate()

  const [rows, setRows] = useState<LabelReviewRow[] | null>(null)
  const [draft] = useState(readDraftJob)
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const [noticeHidden, setNoticeHidden] = useState(() => noticeHiddenFor(notice?.id))
  const [noticeOpen, setNoticeOpen] = useState(false)

  useEffect(() => { getLabelReviews().then(setRows) }, [])
  useEffect(() => {
    if (!location.hash || rows === null) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, rows])

  const jobs = useMemo(() => buildJobs(rows ?? []), [rows])
  const paidRows = useMemo(() => (rows ?? []).filter(r => r.status === 'paid'), [rows])
  const all = draft ? [draft, ...jobs] : jobs
  const n = { all: all.length, paid: jobs.filter(j => j.kind === 'paid').length, free: jobs.filter(j => j.kind === 'free').length, draft: draft ? 1 : 0 }
  const now = new Date()
  const thisMonth = jobs.filter(j => { const d = new Date(j.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() }).length
  const shown = all.filter(j => (tab === 'all' || j.kind === tab) && (!q.trim() || j.name.includes(q.trim())))

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; nickname?: string }
  const email = user?.email ?? ''
  const displayName = meta.full_name || meta.name || meta.nickname || email.split('@')[0] || '고객'
  const provider = (user?.app_metadata?.provider as string | undefined) ?? 'email'
  const loading = rows === null
  const empty = !loading && all.length === 0
  const impacted = notice?.reviewRequired ? n.paid + n.free : 0

  const hideNotice = () => {
    if (!notice) return
    try {
      const parsed = JSON.parse(localStorage.getItem(NOTICE_STORAGE_KEY) ?? '{}')
      localStorage.setItem(NOTICE_STORAGE_KEY, JSON.stringify({ ...parsed, [notice.id]: { dismissedAt: new Date().toISOString() } }))
    } catch { /* 무시 */ }
    setNoticeHidden(true)
  }
  const logout = async () => {
    sessionStorage.removeItem(DRAFT_KEY)
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const openPaid = (j: Job) => j.state && navigate('/payment/complete', {
    state: { ...j.state, service: j.service, success: true, fromRecord: true, paidAt: j.date },
  })
  const openFree = (j: Job, pay = false) => j.state && navigate(pay ? '/review#svc' : '/review', { state: j.state })

  const active = location.hash === '#payments' ? 'payments' : location.hash === '#account' ? 'settings' : 'jobs'

  return (
    <div className="lp">
      <AppHeader mode="account" active={active} />
      <main className="lp-page lp-page-pb">
        <div className="lp-db-top">
          <div>
            <div className="lp-kicker">MY PAGE</div>
            <h1 className="lp-h1">{displayName}님, 안녕하세요</h1>
            <p className="lp-sub">검사한 제품과 결과 파일을 1년 동안 여기서 다시 받을 수 있어요.</p>
          </div>
          <Link className="lp-btn lp-btn-blue" to="/creator">+ 새 제품 무료 검사</Link>
        </div>

        {empty ? (
          <section className="lp-card"><div className="lp-db-empty">
            <div className="ic"><svg viewBox="0 0 24 24"><path d="M8 3h8l-1 4H9z" /><rect x="6" y="7" width="12" height="14" rx="3" /><path d="M9 13h6M9 16h4" /></svg></div>
            <h3>아직 검사한 제품이 없어요</h3>
            <p>제품 정보와 원재료를 넣으면 17개 항목 무료 검토 결과를 바로 볼 수 있어요.</p>
            <Link className="lp-btn lp-btn-blue" to="/creator">첫 제품 무료 검사 시작</Link>
            <div className="steps3">
              <div><b>1 입력</b>제품 정보 · 원재료 · 영양성분</div>
              <div><b>2 무료 결과</b>수정 필요 · 확인 권장 개수</div>
              <div><b>3 필요할 때 결제</b>항목별 결과 · 라벨 파일</div>
            </div>
          </div></section>
        ) : (
          <>
            {notice && !noticeHidden && (
              <div className="lp-db-law" role="status">
                <span className="b">법규 알림</span>
                <p>{notice.title}{impacted > 0 && <span> · 검사한 제품 {impacted}개를 다시 확인해 보세요</span>}</p>
                <button type="button" className="more" onClick={() => setNoticeOpen(true)}>자세히 보기 →</button>
                <button type="button" className="x" aria-label="알림 닫기" onClick={hideNotice}>×</button>
              </div>
            )}

            <div className="lp-db-grid">
              <div>
                <div className="lp-db-stats">
                  <div><span>전체 검사</span><b>{loading ? '–' : jobs.length}<small>건</small></b></div>
                  <div><span>결제 완료</span><b>{loading ? '–' : n.paid}<small>건</small></b></div>
                  <div><span>이번 달</span><b>{loading ? '–' : thisMonth}<small>건</small></b></div>
                </div>

                <section className="lp-card" aria-labelledby="db-jobs" id="jobs">
                  <div className="lp-card-h">
                    <h2 id="db-jobs">내 검사</h2>
                    <label className="lp-db-srch">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                      <input placeholder="제품명 검색" aria-label="제품명 검색" value={q} onChange={e => setQ(e.target.value)} />
                    </label>
                  </div>
                  <div className="lp-db-tabs" role="tablist">
                    {([['all', '전체'], ['paid', '결제 완료'], ['free', '무료 결과'], ['draft', '작성 중']] as [Tab, string][]).map(([k, label]) => (
                      <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                        {label}<em>{n[k]}</em>
                      </button>
                    ))}
                  </div>

                  {loading && <p className="lp-db-none">불러오는 중…</p>}
                  {!loading && shown.length === 0 && <p className="lp-db-none">해당하는 검사가 없어요.</p>}
                  {shown.map(j => (
                    <div key={j.key} className="lp-db-job">
                      <div className={`ic ${j.kind === 'paid' && j.service === 'basic' ? 'ic-b' : IC[j.kind].cls}`}>
                        {j.kind === 'paid' ? (j.service === 'basic' ? '기본' : '전문') : j.kind === 'free' ? '무료' : '작성중'}
                      </div>
                      <div>
                        <h3>
                          {j.name}
                          {j.kind === 'paid' && <span className={`lp-tag ${j.service === 'basic' ? 't-b' : 't-p'}`}>{j.service === 'basic' ? '기본' : '전문'}</span>}
                          {j.kind === 'free' && <span className="lp-tag t-f">무료 결과</span>}
                          {j.kind === 'draft' && <span className="lp-tag t-d">작성 중</span>}
                          {j.test && <span className="lp-tag t-f">테스트 결제</span>}
                        </h3>
                        <div className="m">
                          {j.sub && <span>{j.sub}</span>}
                          {j.kind === 'paid' && <><span>{fmtDate(j.date)} 결제</span><span>보관 {fmtDate(new Date(new Date(j.date).getTime() + 365 * 86_400_000).toISOString())}까지</span></>}
                          {j.kind === 'free' && <span>{fmtDate(j.date)} 검토</span>}
                          {j.kind === 'draft' && <span>STEP {j.draftStep} {STEP_NAMES[(j.draftStep ?? 1) - 1]}</span>}
                        </div>
                        {j.counts && (
                          <div className="pills">
                            <span className="p-r">수정 {j.counts.need}</span>
                            <span className="p-a">확인 {j.counts.warn}</span>
                            <span className="p-g">충족 {j.counts.ok}</span>
                          </div>
                        )}
                        {j.kind === 'draft' && <div className="prog" aria-label={`진행률 ${((j.draftStep ?? 1) / 4) * 100}%`}><i style={{ width: `${((j.draftStep ?? 1) / 4) * 100}%` }} /></div>}
                      </div>
                      <div className="acts">
                        {j.kind === 'paid' && (
                          <button type="button" className="lp-btn lp-btn-line lp-btn-sm" disabled={!j.state} onClick={() => openPaid(j)}>
                            {j.state ? '결과 · 파일' : '원본 없음'}
                          </button>
                        )}
                        {j.kind === 'free' && (
                          <>
                            <button type="button" className="lp-btn lp-btn-line lp-btn-sm" disabled={!j.state} onClick={() => openFree(j)}>결과 보기</button>
                            <button type="button" className="lp-btn lp-btn-blue lp-btn-sm" disabled={!j.state} onClick={() => openFree(j, true)}>결제하기</button>
                          </>
                        )}
                        {j.kind === 'draft' && <Link className="lp-btn lp-btn-blue lp-btn-sm" to="/creator">이어서 작성</Link>}
                      </div>
                    </div>
                  ))}
                </section>

                <section className="lp-card" aria-labelledby="db-pay" id="payments">
                  <div className="lp-card-h"><h2 id="db-pay">결제 내역</h2></div>
                  {paidRows.length === 0 ? (
                    <p className="lp-db-none">아직 결제 내역이 없어요.</p>
                  ) : (
                    <div className="lp-db-pays">
                      {paidRows.map(r => {
                        const m = (r.metadata ?? {}) as { reviewId?: string; paidAt?: string; testMode?: boolean }
                        return (
                          <div key={r.id}>
                            <span className="d">{fmtDate(m.paidAt ?? r.created_at)}</span>
                            <span className="p">{r.product_name}<small>{r.tier === 'tier1' ? '기본' : '전문'}{m.reviewId ? ` · ${m.reviewId}` : ''}{m.testMode ? ' · 테스트 결제' : ''}</small></span>
                            <b>{won(r.amount)}원</b>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>

              <aside className="lp-db-side">
                <section className="lp-card" aria-labelledby="db-acc" id="account">
                  <h2 id="db-acc">계정</h2>
                  <div className="acc">
                    <div className="av">{displayName.slice(0, 1)}</div>
                    <div>
                      <b>{email || displayName}</b>
                      <span>{provider === 'kakao' ? <span className="kk">카카오 연결됨</span> : '이메일 로그인'}</span>
                    </div>
                  </div>
                  <a className="lk" href="#payments">결제 내역<small>{n.paid}건 →</small></a>
                  {provider !== 'kakao' && <Link className="lk" to="/forgot-password">비밀번호 변경<small>→</small></Link>}
                  <a className="lk" href="/#refund">환불 안내<small>→</small></a>
                  <button type="button" className="lk" onClick={logout}>로그아웃<small>→</small></button>
                </section>
                <section className="lp-card lp-db-help" aria-labelledby="db-help">
                  <h2 id="db-help">라벨, 혼자 보기 어렵다면</h2>
                  <p>라벨 사진을 보내주시면 우리 제품에 맞는 검토 방법을 안내해 드려요.</p>
                  <a className="lp-btn lp-btn-line lp-btn-block" href="/contact">상담 문의하기</a>
                </section>
              </aside>
            </div>
          </>
        )}
      </main>

      {noticeOpen && notice && (
        <div className="lp-modal" role="dialog" aria-modal="true" aria-labelledby="nt-h" onClick={() => setNoticeOpen(false)}>
          <div onClick={e => e.stopPropagation()}>
            <h2 id="nt-h">{notice.title}</h2>
            <dl className="lp-kv">
              <dt>기준</dt><dd>{notice.sourceName}</dd>
              <dt>기준일</dt><dd>{notice.effectiveDate}</dd>
              <dt>관련 항목</dt><dd>{notice.impactedRules.join(', ')}</dd>
            </dl>
            <p>{notice.summary}</p>
            <button type="button" className="lp-btn lp-btn-blue lp-btn-sm" onClick={() => setNoticeOpen(false)}>확인</button>
          </div>
        </div>
      )}
    </div>
  )
}
