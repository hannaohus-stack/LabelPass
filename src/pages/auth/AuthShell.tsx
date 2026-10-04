/**
 * AuthShell — 인증 화면 공통 레이아웃 (시안 app_auth_v1.0)
 * PC: 왼쪽 브랜드 패널 + 오른쪽 폼 / 모바일: 폼만
 */
import type React from 'react'

const Check = () => (
  <i><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></i>
)

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp lp-white">
      <div className="lp-auth">
        <aside className="lp-auth-side" aria-hidden="true">
          <div className="bg" /><div className="ov" />
          <a className="logo" href="/" tabIndex={-1}>
            <img src="/site/LabelPass_Logo_Primary_White_v1.0.svg" alt="" />
          </a>
          <div>
            <h2>내 라벨, 법에 맞는지<br />10분 만에 확인하세요</h2>
            <p>제품 정보와 원재료를 입력하면<br />17개 표시 항목을 근거 법령과 함께 검토합니다.</p>
            <ul className="lp-pts">
              <li><Check />무료 검토 결과 먼저 확인</li>
              <li><Check />제품별 1회 결제 · 구독 없음</li>
              <li><Check />결과는 마이페이지에 1년 보관</li>
            </ul>
          </div>
          <div className="foot">검토 결과는 입력 정보를 바탕으로 한 검토 도구의 결과이며, 법적 적합성을 보증하지 않습니다.</div>
        </aside>

        <div className="lp-auth-main">
          <header className="lp-auth-top">
            <a className="m-logo" href="/" aria-label="라벨패스 홈">
              <img src="/site/LabelPass_Logo_Primary_Blue_v1.0.svg" alt="LabelPass 라벨패스" />
            </a>
            <a className="back" href="/">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              홈으로
            </a>
          </header>
          <div className="lp-auth-wrap">
            <section className="lp-auth-card">{children}</section>
          </div>
        </div>
      </div>
    </div>
  )
}
